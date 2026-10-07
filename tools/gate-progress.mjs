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
import { execFileSync, execSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { availableParallelism, tmpdir } from 'node:os'
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
const KEPT = ['ok', 'warn', 'note', 'skipPrint', 'golden', 'review', 'invented', 'skipped', 'moved']

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
  // a SKIPPED check (tool.tests-follow-what-changed, 2026-10-04) is kept too: it blocks nothing, and it replays as SKIPPED, never as a pass
  if (result.ok || result.warn || result.skipped) {
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
 * vitest's default per-test time limit: 30 s, on every machine — the one number the engine's, kingdom's and the viewer's
 * vitest configs all read (each `testTimeout: testTimeoutFor()`); none holds a number of its own.
 *
 * tool.cowork-test-timeout (Andrew 2026-09-26): in Cowork, load from outside the chat pushed 1-4 s tests past vitest's
 * 5 s default, so it was 30 s there and a terminal kept vitest's own 5 s. A timeout is not an assertion.
 * tool.thirty-second-test-limit-on-the-pc (Andrew 2026-10-06, DECISIONS.md 'building is split from testing: three
 * builders and one lander; two tool items from the review of the testing', his item 1): "give tests the 30-second limit on
 * my PC that Cowork already has ... Make all three packages use 30 s on the PC too. 19 of the 42 busy-machine incidents
 * were a 5-second time-out." So it is 30 s everywhere, and the constant keeps the name it was given in Cowork.
 *
 * The environment may still override it: HOBAT_TEST_TIMEOUT, a whole number of milliseconds above zero (the name GBH
 * SWITCHES vitest.budgetEnv gave the override on 2026-09-19; vitest reads no environment variable for this itself). A
 * value that is not one is refused loudly, never read as the default (Law 9). An explicit per-test limit still wins.
 */
export const COWORK_TEST_TIMEOUT_MS = 30_000
export function testTimeoutFor(env = process.env, cwd = process.cwd()) {   // cwd: kept for the callers that pass it; the machine no longer decides
  const asked = String(env.HOBAT_TEST_TIMEOUT ?? '').trim()
  if (!asked) return COWORK_TEST_TIMEOUT_MS
  if (!/^[1-9]\d*$/.test(asked)) throw new Error(`HOBAT_TEST_TIMEOUT is a whole number of milliseconds above zero, not '${asked}' — unset it for the default ${COWORK_TEST_TIMEOUT_MS} ms`)
  return Number(asked)
}

/**
 * How many vitest file workers a package's suite runs on: four, and never more than the
 * machine has CPUs. The one cap - engine/vitest.config.ts, kingdom/vitest.config.ts and
 * viewer/vitest.config.ts all read it (tool.kingdom-vitest-workers, tool.viewer-vitest-workers,
 * 2026-10-04), and VITEST_MAX_WORKERS still overrides any of them (vitest reads the
 * environment after the config).
 *
 * Measured during the shared-AI migration: unrestricted file workers caused six 5-second
 * timeouts; four workers reduced that to the two expensive cases that also exceed 5 seconds
 * in isolation. 2026-09-22: never more workers than CPUs - on a 2-vCPU Cowork sandbox four
 * workers fought over two cores and "kiting works" (3.4 s alone) passed 5 s. 2026-10-04:
 * kingdom, with no config, took one worker per CPU (sixteen on Andrew's PC) and beside other
 * workers' suites its child-process tests passed their 5 s or 60 s limit on any tree; the
 * viewer, with no config, ran its gate's page tests (vitest run --dir test) the same way.
 */
export const VITEST_WORKERS = 4
export function vitestWorkersFor(cpus = availableParallelism()) {
  return Math.max(1, Math.min(VITEST_WORKERS, cpus))
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
// ── WHAT AN ITEM COMMITTED (gate.committedItemTestsCount, tool.gate-flags-read-committed-edits; 2026-10-06) ──────────────
// Since the group rule (DECISIONS.md 2026-10-06 'engine items too are built in groups of up to four, with one set of heavy
// checks for the group') an item is its own commit BEFORE its gate runs, so every check that learns what the item touched
// from the working tree's uncommitted state reads the item's commits as well: the commits of a repository whose message
// names the item. The id is matched as written and WHOLE — `rule.x` does not claim a commit that names `rule.x-more` or
// `rule.x.more`. A commit that names two items is both items'.
const gitIn = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 })
const linesOf = (text) => String(text ?? '').split(/\r?\n/).filter(Boolean)
/** Does `text` name the item `id` as a whole id? */
export function namesItem(text, id) {
  const s = String(text ?? '')
  for (let at = s.indexOf(id); at >= 0; at = s.indexOf(id, at + 1)) {
    const before = s[at - 1] ?? ' ', after = s[at + id.length] ?? ' ', next = s[at + id.length + 1] ?? ' '
    if (/[A-Za-z0-9.-]/.test(before)) continue
    if (/[A-Za-z0-9-]/.test(after) || (after === '.' && /[A-Za-z0-9]/.test(next))) continue
    return true
  }
  return false
}
/** The commits in `cwd`'s repository whose message names the item, oldest first (full hashes). [] where there is none, or no repository. */
export function itemCommits(id, cwd = process.cwd()) {
  const COMMIT = String.fromCharCode(1), BODY = String.fromCharCode(2)   // the separators git prints for %x01 and %x02
  let log = ''
  try { log = gitIn(cwd, ['log', '--format=%x01%H%x02%B', '-F', `--grep=${id}`]) } catch { return [] }
  return log.split(COMMIT).filter(Boolean).map((c) => c.split(BODY)).filter(([, body]) => namesItem(body, id)).map(([sha]) => sha.trim()).reverse()
}
/** name-status rows of one commit under `paths` (a merge is read against its first parent). */
const statusRows = (cwd, sha, paths) => linesOf(gitIn(cwd, ['show', '--first-parent', '--format=', '--name-status', sha, '--', ...paths]))
  .map((line) => { const [st, ...rest] = line.split(/\t/); return { st, file: rest[rest.length - 1] } }).filter((r) => r.file)
/**
 * An item's COMMITTED tests, in `git status --porcelain` form (`A ` a file one of its commits added, ` M` one it only
 * edited): the test/ files of its commits (itemCommits). A package lands its sources in its own commit before the engine
 * gate runs (GBH SWITCHES gate.testsHome), and an ENGINE item is its own commit too — so the gate counts these beside what
 * is uncommitted, in every home. A file a commit deleted is not a test to run. '' when no commit names the item.
 */
export function committedItemTests(id, cwd = process.cwd()) {
  const state = new Map()   // file -> 'A ' | ' M', an addition by any of the item's commits wins
  for (const sha of itemCommits(id, cwd)) {
    for (const { st, file } of statusRows(cwd, sha, ['test/'])) {
      if (st.startsWith('D')) { state.delete(file); continue }
      if (st.startsWith('A')) state.set(file, 'A ')
      else if (!state.has(file)) state.set(file, ' M')
    }
  }
  return [...state].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([file, st]) => `${st} ${file}`).join(String.fromCharCode(10))
}
/** The files an item's commits ADDED to `cwd`'s repository (and did not delete again), sorted. */
export function committedNewFiles(id, cwd = process.cwd()) {
  const added = new Set()
  for (const sha of itemCommits(id, cwd)) for (const { st, file } of statusRows(cwd, sha, ['.'])) {
    if (st.startsWith('A')) added.add(file); else if (st.startsWith('D')) added.delete(file)
  }
  return [...added].sort()
}
/** The lines an item's commits added under `path` (each with its leading '+', as `git diff -U0` prints them), oldest commit first. */
export function committedAddedLines(id, cwd = process.cwd(), path = '.') {
  const out = []
  for (const sha of itemCommits(id, cwd)) {
    for (const l of gitIn(cwd, ['show', '--first-parent', '--format=', '-U0', sha, '--', path]).split(/\r?\n/)) if (l.startsWith('+') && !l.startsWith('+++')) out.push(l)
  }
  return out
}

// ── LOOK ITEMS (tool.look-items-land-on-a-picture, 2026-10-06) ──────────────────────────────────────────────────────────
// DECISIONS.md 2026-10-06 'the one plan: land on the quick check, run the whole suites twice a day, four streams and one
// lander': "Dropped: … a new page test for every look-and-feel item - that kind of item is checked by a screenshot for
// Andrew's eye, and rules and numbers keep their tests." A viewer or kingdom item whose row says `"look": true` brings, in
// place of a test, a PICTURE of the real built page showing the change:
//   <root>/CONTENT-DRAFTS/<yyyy-mm-dd>-<item id>/<any name>.png|jpg|jpeg|webp|gif
// — the folder Andrew's pictures already go in, one folder an item — added by a commit of the ROOT repository that names
// the item (the root ignores pictures, so `git add -f`; committed, it travels with the merge to the folder he looks in).
// The gate reads three things of it here: it is there, it IS a picture, and it was committed after the item's last
// commit in the package it changed. And one thing of the item: its commits touch no engine source, no kingdom rule and no
// content row — an item that does is not a look item, whatever its row says.
/** The kinds an item may be a look item of. */
export const LOOK_KINDS = ['viewer', 'kingdom']
/** The folder at the root, beside the packages, that holds one folder of pictures an item (GBH SWITCHES look.pictureFolder). */
export const LOOK_FOLDER = 'CONTENT-DRAFTS'
/** The folder a look item's pictures go in, on the day `date` (yyyy-mm-dd). */
export const lookFolderOf = (id, date) => `${LOOK_FOLDER}/${date}-${id}`
const LOOK_PICTURE = /\.(png|jpe?g|webp|gif)$/i
/** Is the file a picture — by what it holds, not by what it is called: the first bytes of a PNG, a JPEG, a GIF or a WebP. */
export function isPicture(file) {
  let head
  try { head = readFileSync(file).subarray(0, 12) } catch { return false }
  const starts = (...bytes) => bytes.every((b, i) => head[i] === b)
  return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) || starts(0xff, 0xd8, 0xff) || head.subarray(0, 4).toString('latin1') === 'GIF8'
    || (head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP')
}
/** When a commit was made (its committer time, seconds), or 0. */
const commitTime = (cwd, sha) => { try { return Number(gitIn(cwd, ['show', '-s', '--format=%ct', sha]).trim()) || 0 } catch { return 0 } }
/** The files an item's commits touched — added, changed or deleted — under `paths` of `cwd`'s repository, sorted. */
export function committedFiles(id, cwd = process.cwd(), paths = ['.']) {
  const files = new Set()
  for (const sha of itemCommits(id, cwd)) for (const { file } of statusRows(cwd, sha, paths)) files.add(file)
  return [...files].sort()
}
/**
 * What makes an item NOT a look item, as the files it changed: engine source (its commits in the engine, and what is
 * uncommitted there — a landing commits it), kingdom's rules (src/core) and content's authored rows (gen/, settled.json).
 * Each is named from the root: 'engine/src/core/battle.ts'. [] for an item that changes only how something looks.
 */
export function notOnlyALook(id, root) {
  const out = []
  const engine = join(root, 'engine')
  let uncommitted = []
  try { uncommitted = linesOf(gitIn(engine, ['status', '--porcelain', '--untracked-files=all', '--', 'src'])).map((l) => l.slice(3).replace(/^.* -> /, '')) } catch { /* no engine repository here */ }
  for (const f of new Set([...committedFiles(id, engine, ['src']), ...uncommitted])) out.push(`engine/${f}`)
  for (const f of committedFiles(id, join(root, 'kingdom'), ['src/core'])) out.push(`kingdom/${f}`)
  for (const f of committedFiles(id, join(root, 'content'), ['gen', 'settled.json'])) out.push(`content/${f}`)
  return out.sort()
}
/**
 * A look item's picture. `{ ok: true, picture, pictures }` — `picture` the newest, by its path from the root — when a commit
 * of the root repository that names the item added a picture under LOOK_FOLDER/<yyyy-mm-dd>-<id>/, the file is there and
 * is a picture, and that commit is not older than the item's last commit in viewer/ or kingdom/. Otherwise `{ ok: false,
 * why }`, saying which of those failed and what to do.
 */
export function lookPicture(id, root) {
  const literally = String(id).replace(/[^A-Za-z0-9-]/g, (c) => `\\${c}`)   // an id's dots, read as dots
  const folder = new RegExp('^' + LOOK_FOLDER + '/\\d{4}-\\d\\d-\\d\\d-' + literally + '/[^/]+$')
  const how = `make one of the real built page (the kingdom's tools/*.shot.mjs take a page and a folder), put it in ${lookFolderOf(id, '<yyyy-mm-dd>')}/ at the root, and commit it there naming the item: git add -f <the picture>; git commit -m "${id}: its picture"`
  // the pictures the item's root commits added or changed, each with the time of the last commit that did
  const at = new Map()
  for (const sha of itemCommits(id, root)) for (const { st, file } of statusRows(root, sha, [LOOK_FOLDER])) {
    if (!folder.test(file)) continue
    if (st.startsWith('D')) at.delete(file); else at.set(file, commitTime(root, sha))
  }
  const committed = [...at].filter(([file]) => existsSync(join(root, file)))
  if (!committed.length) {
    let onDisk = []
    try { onDisk = readdirSync(join(root, LOOK_FOLDER), { withFileTypes: true }).filter((d) => d.isDirectory() && folder.test(`${LOOK_FOLDER}/${d.name}/x`)).flatMap((d) => readdirSync(join(root, LOOK_FOLDER, d.name)).map((f) => `${LOOK_FOLDER}/${d.name}/${f}`)) } catch { /* no folder of pictures here */ }
    return { ok: false, why: onDisk.length
      ? `${onDisk[0]} is on disk, but no commit of the root repository that names the item adds it — commit it there: git add -f ${onDisk[0]}; git commit -m "${id}: its picture"`
      : `a look item lands on a picture, and this one has none — ${how}` }
  }
  const named = committed.filter(([file]) => LOOK_PICTURE.test(file))
  const pictures = named.filter(([file]) => isPicture(join(root, file)))
  if (!pictures.length) return { ok: false, why: `${committed[0][0]} is not a picture (a .png, .jpg, .jpeg, .webp or .gif file that holds one) — ${how}` }
  // newer than its source: the item's last commit in the package it changed
  const sources = ['viewer', 'kingdom'].flatMap((p) => itemCommits(id, join(root, p)).map((sha) => ({ p, sha, at: commitTime(join(root, p), sha) })))
  if (!sources.length) return { ok: false, why: `no commit in viewer/ or kingdom/ names the item, so its picture shows no change of it — commit the change there naming the item, then make the picture` }
  const last = sources.reduce((a, b) => (b.at > a.at ? b : a))
  const fresh = pictures.filter(([, t]) => t >= last.at).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  if (!fresh.length) return { ok: false, why: `${pictures[0][0]} was committed before the item's last change (${last.p} ${last.sha.slice(0, 7)}): it does not show that change — make it again from the page as it is now, and commit it` }
  return { ok: true, picture: fresh[0][0], pictures: fresh.map(([file]) => file) }
}

/** A test FILE of a package the item's home is not: its test/ and tools/ tests and verifiers — never regenerated data (dumps, fixtures, recordings). */
const OTHER_PACKAGE_TEST =/^(test|tools)\/.*\.(test|verify)\.(ts|mts|mjs)$/
/** The folder's own name: 'viewer' of '…/HBT/viewer'. */
const packageName = (dir) => resolve(String(dir)).split(/[\\/]/).filter(Boolean).pop()
const numstatRows = (text) => linesOf(text).map((l) => { const [add, del, ...rest] = l.split(/\t/); return { file: rest[rest.length - 1], add: Number(add) || 0, del: Number(del) || 0 } }).filter((r) => r.file)
/**
 * 'existing tests untouched', whole: the STANDING test files the item changed with lines deleted — a new mechanic may add
 * tests; editing tests that already passed is how a failure is laundered into a pass, so it lands flagged for review (Law 10).
 *   - in the item's `home` (the engine, or a viewer or kingdom item's own package): every file under test/ that is changed
 *     and uncommitted, as before, AND every file under test/ that one of the item's commits changed — unless one of its own
 *     commits added that file (its own test, edited again, is not a standing test). In a viewer or kingdom home its tools'
 *     tests and verifiers count too.
 *   - in each of `others` (the other packages' folders): the test files — test/ and tools/, *.test.* and *.verify.* — that
 *     the item's commits there changed, under the package's name ('viewer/tools/bar.test.mjs').
 * Rows `{ file, add, del }` with del > 0, one a file, sorted by file. Nothing here blocks: the gate flags.
 */
export function editedTests(id, { home = process.cwd(), others = [] } = {}) {
  const sum = new Map()
  const count = (file, add, del) => { const had = sum.get(file) ?? { add: 0, del: 0 }; sum.set(file, { add: had.add + add, del: had.del + del }) }
  const committed = (cwd, label, keep) => {
    const shas = itemCommits(id, cwd)
    const own = new Set()
    for (const sha of shas) for (const { st, file } of statusRows(cwd, sha, ['.'])) if (st.startsWith('A')) own.add(file)
    for (const sha of shas) for (const r of numstatRows(gitIn(cwd, ['show', '--first-parent', '--format=', '--numstat', sha, '--', 'test/', 'tools/']))) {
      if (own.has(r.file) || !keep(r.file)) continue
      count(label + r.file, r.add, r.del)
    }
  }
  const homeIsEngine = !['viewer', 'kingdom', 'content'].includes(packageName(home))
  const inHome = (file) => file.startsWith('test/') || (!homeIsEngine && OTHER_PACKAGE_TEST.test(file))
  let uncommitted = ''
  try { uncommitted = gitIn(home, ['diff', '--numstat', '--', 'test/', 'tools/']) } catch { uncommitted = '' }
  for (const r of numstatRows(uncommitted)) if (inHome(r.file)) count(r.file, r.add, r.del)
  committed(home, '', inHome)
  for (const dir of others) committed(dir, `${packageName(dir)}/`, (file) => OTHER_PACKAGE_TEST.test(file))
  return [...sum].filter(([, v]) => v.del > 0).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([file, v]) => ({ file, add: v.add, del: v.del }))
}
/**
 * What a reviewer reads for an item whose standing tests were edited: `needsReview`, the rows of editedTests, and the diff
 * of exactly those files — uncommitted in the home, and from the item's commits in every package. The gate's landing writes
 * it into the ledger; `gate.mjs <id> --reflag` reads it again for an item that is already landed.
 */
export function reviewOf(id, { home = process.cwd(), others = [] } = {}) {
  const edited = editedTests(id, { home, others })
  if (!edited.length) return { needsReview: false, edited: [], diff: '' }
  let diff = ''
  try { diff += gitIn(home, ['diff', '-U2', '--', 'test/']) } catch { /* no repository: nothing uncommitted */ }
  const labels = others.map((dir) => `${packageName(dir)}/`)
  const from = (cwd, files) => {
    if (!files.length) return
    for (const sha of itemCommits(id, cwd)) {
      const text = gitIn(cwd, ['show', '--first-parent', `--format=${packageName(cwd)} %h %s`, '-U2', sha, '--', ...files])
      if (/^diff --git/m.test(text)) diff += text
    }
  }
  from(home, edited.filter((w) => !labels.some((l) => w.file.startsWith(l))).map((w) => w.file))
  others.forEach((dir, i) => from(dir, edited.filter((w) => w.file.startsWith(labels[i])).map((w) => w.file.slice(labels[i].length))))
  return { needsReview: true, edited, diff }
}
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

/**
 * The id kinds the added lines mint - the word before the first dot of every quoted dotted name - for the gate's check
 * 'naming - new content ids use declared kinds'. Two things a line may quote are not ids and are not read:
 *   - board row art: a quoted run of 12 or more letters and dots holding '..' (map.showcase 2026-08-20, map.opening-six 2026-09-28);
 *   - the engine's own EFFECT KINDS, exactly as its vocabulary export lists them (`engineWords`: generated/vocabulary.json
 *     effectKinds - read, never copied). 2026-10-06, GBH SWITCHES gate.namingSkipsEngineEffectKinds: since the gate's checks read
 *     an item's committed lines too (gate.flagsReadCommittedEdits) the generated content pack's lines reach this check, and a
 *     lent trigger's effect kind "surge.gain" was read as an id of the undeclared kind 'surge'. Only the exact word is skipped:
 *     "surge.anything-else" is still an id of kind 'surge', and still blocks.
 */
export function mintedKinds(lines, engineWords = new Set()) {
  const kinds = new Set()
  for (const l of lines) {
    const stripped = l.replace(/['"][a-zA-Z.]{12,}['"]/g, (s) => (s.includes('..') ? "''" : s))
    for (const m of stripped.matchAll(/['"`](([a-z]+)\.[a-z0-9][a-z0-9.-]*)['"`]/g)) if (!engineWords.has(m[1])) kinds.add(m[2])
  }
  return [...kinds]
}
