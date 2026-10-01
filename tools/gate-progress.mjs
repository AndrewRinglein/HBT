// The gate's memory across calls (tool.gate-fits-cowork, Andrew 2026-09-26: 'Add it').
//
// Cowork kills every shell call at ~178 s and a backgrounded process dies with its
// call, so neither a gate check nor a quarter of the suite reliably fits in one call
// there. Two records make the work resumable, both keyed by the exact working tree:
//
//   .state/gate-progress.<area>.json  (one per area, tools/backlog.mjs) each gate check's result for one item on one tree.
//                              A re-run on the same tree replays what passed; a
//                              changed tree (or item, or what the checks read from
//                              .state) discards it. --land commits only when every
//                              check has passed on the current tree, recorded or fresh.
//   .state/shards.json         which `--shard k/N` passed on the tree, for any N.
//                              Any complete set is the full suite.
//
// Everything here is pure except treeHash, which asks git. gate.mjs owns the I/O.
import { execSync } from 'node:child_process'
import { copyFileSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * The tree the gate is judging: everything `git add -A` would commit, minus the
 * gate's own .state/ and the generated Game Builder. Built in a throwaway index,
 * so the real one is never touched. (Moved here from gate.mjs unchanged.)
 */
export function treeHash(cwd = process.cwd()) {
  const idx = join(tmpdir(), `gate-index-${process.pid}-${Date.now()}`)
  try { copyFileSync(resolve(cwd, execSync('git rev-parse --git-path index', { cwd, encoding: 'utf8' }).trim()), idx) } catch {}
  const env = { ...process.env, GIT_INDEX_FILE: idx }
  try {
    execSync('git add -A -- . ":!.state" ":!GAME-BUILDER.html"', { cwd, env, stdio: 'pipe' })
    return execSync('git write-tree', { cwd, env, encoding: 'utf8' }).trim()
  } finally { try { rmSync(idx, { force: true }) } catch {} }
}

// ── the check record ────────────────────────────────────────────────────────

/** Fields a check may carry that a replay must see again: what it printed, and its effects. */
const KEPT = ['ok', 'warn', 'note', 'skipPrint', 'golden', 'review', 'invented']

/**
 * What the checks read from outside the tree: the item's own backlog row (less the
 * gate's bookkeeping), the status of everything it needs, and the blessed control
 * battles. Any of those moving discards the record, exactly as an edit does.
 */
export function contextHash(item, backlog, golden) {
  const { attempts, status, failedAt, reason, sha, ...row } = item
  const needs = (item.needs ?? []).map((n) => [n, backlog.find((b) => b.id === n)?.status ?? null])
  return createHash('sha1').update(JSON.stringify({ row, needs, golden: golden ?? null })).digest('hex')
}

/** The record for `key` ({id, tree, ctx}). Durations survive any change of key. */
export function openProgress(raw, key) {
  const same = !!raw && raw.id === key.id && raw.tree === key.tree && raw.ctx === key.ctx
  const had = !!raw && raw.results && Object.keys(raw.results).length > 0
  return {
    id: key.id, tree: key.tree, ctx: key.ctx,
    results: same ? { ...(raw.results ?? {}) } : {},
    durations: { ...((raw && raw.durations) ?? {}) },
    discarded: !same && had,
  }
}

/** A recorded result, or null. Only results that did not FAIL are ever recorded. */
export function recall(progress, name) { return progress.results[name] ?? null }

/**
 * Record one check's result and how long it took. A failed hard check is not
 * kept — the tree has to change to fix it, and a change discards the record anyway.
 * A flag that warned is kept: a warning never blocks, and re-running cannot change it.
 */
export function record(progress, name, result, ms) {
  const next = { ...progress, results: { ...progress.results }, durations: { ...progress.durations } }
  if (typeof ms === 'number') next.durations[name] = ms
  if (result.ok || result.warn) {
    const kept = {}
    for (const k of KEPT) if (result[k] !== undefined) kept[k] = result[k]
    next.results[name] = kept
  }
  return next
}

export function clearResults(progress) { return { ...progress, results: {}, discarded: false } }

/** What is written to disk: the record less the per-call `discarded` marker. */
export function serialize(progress) {
  const { discarded, ...rest } = progress
  return JSON.stringify(rest, null, 1) + '\n'
}

// ── the time budget ─────────────────────────────────────────────────────────

/**
 * Stop before the next check? Never before this call has run one fresh check, so
 * every call makes progress. Otherwise stop when elapsed time is already past the
 * budget, or when the check's last measured duration would carry it past.
 */
export function stopBefore({ elapsedMs, budgetMs, estimateMs, ranFresh }) {
  if (ranFresh === 0 || budgetMs === Infinity) return false
  return elapsedMs + (estimateMs ?? 0) > budgetMs
}

/** Cowork's sandbox: its binaries live under /opt/cowork, its sessions under /sessions. */
export function isCowork(env = process.env, cwd = process.cwd()) {
  return String(env.PATH ?? '').split(/[:;]/).some((p) => p.startsWith('/opt/cowork')) || String(cwd).startsWith('/sessions/')
}

export const COWORK_BUDGET_S = 150

/**
 * tool.cowork-test-timeout (Andrew 2026-09-26): vitest's default per-test timeout.
 * In Cowork, load from outside the chat pushes 1-4 s tests past vitest's 5 s default,
 * so it is 30 s there; a terminal returns undefined and keeps vitest's own default.
 * A timeout is not an assertion; explicit per-test timeouts still win.
 */
export const COWORK_TEST_TIMEOUT_MS = 30_000
export function testTimeoutFor(env = process.env, cwd = process.cwd()) {
  return isCowork(env, cwd) ? COWORK_TEST_TIMEOUT_MS : undefined
}

/**
 * The budget in ms. `--budget <s>` wins (0 = none). Without it: 150 s in Cowork,
 * which leaves ~28 s under the ~178 s kill for a check nobody has timed yet; in a
 * terminal, none — a terminal run behaves exactly as it always did.
 */
export function budgetFrom(argv, env = process.env, cwd = process.cwd()) {
  const i = argv.indexOf('--budget')
  if (i !== -1) {
    const s = Number(argv[i + 1])
    if (!Number.isFinite(s) || s < 0 || String(argv[i + 1] ?? '').trim() === '') throw new Error(`--budget takes seconds (0 = no budget), not '${argv[i + 1] ?? ''}'`)
    return s === 0 ? Infinity : s * 1000
  }
  return isCowork(env, cwd) ? COWORK_BUDGET_S * 1000 : Infinity
}

// ── shards ──────────────────────────────────────────────────────────────────

/** `k/N` → {k, n} for 1 <= k <= N, else null. */
export function parseShard(arg) {
  const m = String(arg ?? '').match(/^(\d+)\/(\d+)$/)
  if (!m) return null
  const k = Number(m[1]), n = Number(m[2])
  return n >= 1 && k >= 1 && k <= n ? { k, n } : null
}

/**
 * The shard record for `tree`: `{tree, sets: {N: [k...]}}`. Another tree's record
 * is discarded. The one-set file written before 2026-09-26 ({tree, total, passed})
 * still reads.
 */
export function normalizeShards(raw, tree) {
  if (!raw || raw.tree !== tree) return { tree, sets: {} }
  const sets = {}
  for (const [n, ks] of Object.entries(raw.sets ?? {})) sets[n] = [...ks]
  if (raw.total && Array.isArray(raw.passed) && !sets[raw.total]) sets[raw.total] = [...raw.passed]
  return { tree, sets }
}

export function recordShard(raw, tree, k, n, ok) {
  const s = normalizeShards(raw, tree)
  const ks = (s.sets[n] ?? []).filter((x) => x !== k)
  if (ok) ks.push(k)
  s.sets[n] = ks.sort((a, b) => a - b)
  return s
}

/**
 * Green when any N has all of 1..N passed on this tree. Otherwise the set to name
 * is the one furthest along (by fraction; ties to `defaultN`, then the smaller N),
 * and `todo` is what it still needs.
 */
export function shardStatus(raw, tree, defaultN) {
  const s = normalizeShards(raw, tree)
  const rows = Object.entries(s.sets).map(([n, ks]) => {
    const N = Number(n)
    const passed = ks.filter((k) => k >= 1 && k <= N)
    return { n: N, passed, todo: Array.from({ length: N }, (_, i) => i + 1).filter((k) => !passed.includes(k)) }
  })
  const done = rows.filter((r) => r.todo.length === 0).sort((a, b) => (a.n === defaultN ? -1 : b.n === defaultN ? 1 : a.n - b.n))
  if (done.length) return { green: true, ...done[0] }
  const partial = rows.filter((r) => r.passed.length > 0)
    .sort((a, b) => b.passed.length / b.n - a.passed.length / a.n || (a.n === defaultN ? -1 : b.n === defaultN ? 1 : a.n - b.n))
  if (partial.length) return { green: false, ...partial[0] }
  return { green: false, n: defaultN, passed: [], todo: Array.from({ length: defaultN }, (_, i) => i + 1) }
}

// ── which test files (the fast process, Andrew 2026-09-30) ──────────────────
/** The test files in `git status --porcelain --untracked-files=all` output. */
export function testFilesIn(porcelain) {
  return String(porcelain ?? '').split('\n').filter(Boolean)
    .map((l) => l.slice(3).replace(/^.* -> /, '')).filter((f) => f.startsWith('test/') && /\.test\.ts$/.test(f))
}
/**
 * The kill switch's files. `full`: every touched test file, as before 2026-09-30. Fast: the
 * files the item ADDED (untracked `??` or staged new `A`), its own verify scenario — an existing
 * battle file it edited is not re-run with the content off; every touched file when it added none.
 */
export function killSwitchFiles(porcelain, full = false) {
  const touched = testFilesIn(porcelain)
  if (full) return touched
  const added = testFilesIn(String(porcelain ?? '').split('\n').filter((l) => /^(\?\?|A.) /.test(l)).join('\n'))
  return added.length ? added : touched
}
