#!/usr/bin/env node
// The four suites, what a change runs, and the record of what passed — tool.tests-follow-what-changed
// (Andrew, 2026-10-04, DECISIONS.md 'combat is tested only when the engine changed; a visual change
// does not re-run the fights' and 'the same for content and kingdom changes: each kind of change runs
// its own tests'; the defaults are GBH SWITCHES tests.followWhatChanged).
//
// THE RULE. A package's tests run when that package's own code changed, and not otherwise: engine code
// → the engine suite and the control battles; content → content's suite; viewer code → the viewer's
// gate; kingdom code → kingdom's suite. 'This package's code' is tools/code-stamp.mjs PACKAGE_CODE and
// nothing else. A regenerated file, a document, a ruling, .state/ and a log start no suite.
//
// THE RECORD. Each suite that passes appends one line to its OWN package's .state/passes.jsonl
// (merge=union, so two workers' lines both survive a merge):
//   {"suite":"kingdom","stamp":"<kingdom's code>","with":{engine,content,viewer,kingdom},"at":…,"by":…}
// `stamp` is the code it ran on; `with` is the four packages' code as they stood while it ran; `in` is
// the copy of the folder it ran in. A worker's passes are recorded in the WORKER's copy and reach the
// shared folder only through the merge, so combine reads them there (it runs this tool in that copy), and
// prints, for each suite it skips, the pass it relied on: the stamp, when, by what, in which copy. A stamp
// that has a line is not run again — in a landing, at wrap, or in combine. A record without a stamp (an
// older tool's) is no pass. A run that FAILS is recorded too ({…,"failed":true}): a pass counts only
// while it is the latest run of that suite on that code, so an older pass is never relied on after a
// failure on the same code. The engine's control battles are recorded the same way, suite "control",
// with the content pack and the golden they were true for.
//
// SKIPPED IS NOT PASSED (Law 9). A suite that is not run is printed and logged SKIPPED with its reason.
//
// THE FULL RUN. Everything together still runs once per chat (2026-09-23, 2026-09-30): `wrap` refuses
// until all four suites have a pass on the code as it stands, each recorded WITH the other three as
// they stand — `node tools/suites.mjs --run all --full` here, or `node tools/combine.mjs <worker
// folder> --full` from the shared folder. The piecewise commands count too (the engine's and kingdom's
// --shard sets, the viewer's parts, --run content) as long as no package's code moved between them.
//
// WHAT IT COSTS, as ruled: the packages' tests read each other's files (kingdom's tests import the
// engine and play the viewer's page; the viewer's gate plays kingdom's built BATTLE-SANDBOX.html; an
// engine test reads the viewer's character models). A pass is keyed on its own package's code alone,
// so a change in one package that breaks another's test is found at the once-per-chat full run, not at
// the change.
//
//   node tools/suites.mjs --plan [--full] [--json]   what would run, what is skipped and why; changes nothing
//   node tools/suites.mjs --run all [--full]         run what the plan says (--full: all four), record each pass
//   node tools/suites.mjs --run <suite>              run that one suite whatever is recorded (content|kingdom|engine|viewer)
//   node tools/suites.mjs --full-green               exit 0 only when all four passed together on the code as it stands
//   node tools/suites.mjs --commit-records "<why>"   commit each package's changed pass records, and nothing else
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PACKAGES, ROOT_DIR, allStamps, stampOf } from './code-stamp.mjs'
import { commitOnly } from './commit-only.mjs'

export const PASSES_FILE = '.state/passes.jsonl'
const GOLDEN_FILE = '.state/baseline.hash'
const PACK_FILE = 'src/content/generated/pack.ts'

// kingdom's suite runs as four quarters, as its own gate does (kingdom/tools/gate.mjs --shard k/4):
// run whole on a busy PC, its tests that spawn a child process pass their 5 s limit on any tree
// (GBH SWITCHES combine.kingdomQuarters, 2026-10-03). Every test still runs.
// Each quarter runs on four vitest workers unless the environment says otherwise (GBH SWITCHES
// vitest.kingdomShardWorkers and suites.kingdomWorkers, 2026-10-04): kingdom has no vitest config of
// its own, so vitest takes one worker per CPU — sixteen here — and beside other workers' suites its
// child-process tests pass their 5 s limit. The engine's own config has capped its workers at four
// for the same reason. The same files, the same assertions, the same 5 s.
export const KINGDOM_QUARTERS = 4
export const KINGDOM_WORKERS = '4'
/** The four suites, cheapest first — the one list; combine and wrap read it, neither keeps a copy. */
export const SUITES = [
  { suite: 'content', why: "content's suite", cmds: [['node', '--test', 'test/*.test.mjs']] },
  { suite: 'kingdom', why: "kingdom's suite", cmds: Array.from({ length: KINGDOM_QUARTERS }, (_, i) =>
    ['node', '../engine/node_modules/vitest/vitest.mjs', 'run', '--reporter=dot', `--shard=${i + 1}/${KINGDOM_QUARTERS}`]),
    env: { VITEST_MAX_WORKERS: KINGDOM_WORKERS } },
  { suite: 'engine', why: "the engine's whole suite", cmds: [['node', 'tools/gate.mjs', '--shard', '1/1']] },
  { suite: 'viewer', why: "the viewer's whole gate", cmds: [['node', 'tools/gate.mjs']] },
]

// ── the record: pure ────────────────────────────────────────────────────────
const isStamp = (s) => typeof s === 'string' && /^[0-9a-f]{10}$/.test(s)

/** The pass lines in a passes.jsonl text. A line that is not JSON, or names no stamp, is no pass. */
export function parsePasses(text) {
  const out = []
  for (const l of String(text ?? '').split('\n')) {
    if (!l.trim()) continue
    let row = null
    try { row = JSON.parse(l) } catch { continue }
    if (row && typeof row.suite === 'string' && isStamp(row.stamp) && typeof row.at === 'string') out.push(row)
  }
  return out
}

/** Every recorded run of `suite` on the code `stamp`, oldest first by when it ran (a merge may have interleaved the lines). */
export function runsOn(passes, suite, stamp) {
  if (!isStamp(stamp)) return []
  return (passes ?? []).filter((p) => p.suite === suite && p.stamp === stamp)
    .map((p, i) => [p, i]).sort((a, b) => (a[0].at < b[0].at ? -1 : a[0].at > b[0].at ? 1 : a[1] - b[1])).map(([p]) => p)
}
/** The runs since the last failure — the passes that still stand. */
const standing = (runs) => runs.slice(runs.findLastIndex((p) => p.failed) + 1)

/**
 * The recorded pass of `suite` on the code `stamp` that a skip may rely on, or null: the latest run
 * of that suite on that code, and only if it passed. 'unknown' never matches.
 */
export function hasPass(passes, suite, stamp) {
  const last = runsOn(passes, suite, stamp).at(-1)
  return last && !last.failed ? last : null
}

/** Did the pass run with the four packages' code exactly as `stamps` has it? */
const ranWith = (pass, stamps) => !!pass.with && PACKAGES.every((p) => isStamp(stamps[p]) && pass.with[p] === stamps[p])
/** A recorded pass, said so a reader can find it: when it ran, by what command, and in which copy of the folder. */
const when = (pass) => `${String(pass.at).slice(0, 16).replace('T', ' ')}${pass.by ? `, ${pass.by}` : ''}${pass.in ? `, in ${pass.in}` : ''}`
/** The copy of the folder a pass is being recorded in — its folder name (HBT-worker-engine, …). */
export const copyName = (root) => basename(resolve(root))
export const stampsLine = (stamps) => PACKAGES.map((p) => `${p} ${stamps[p]}`).join(' · ')

/**
 * What a change runs. `stamps`: each package's code now. `passes`: each package's own recorded
 * passes. `full`: the once-per-chat run — all four, whatever is recorded.
 */
export function planSuites({ stamps, passes, full = false }) {
  return SUITES.map(({ suite, why }) => {
    const stamp = stamps[suite]
    if (full) return { suite, why, stamp, run: true, reason: 'the full run: all four suites together, whatever is recorded' }
    const pass = hasPass(passes[suite], suite, stamp)
    const last = runsOn(passes[suite], suite, stamp).at(-1)
    if (last && last.failed) return { suite, why, stamp, run: true, reason: `${suite}'s last run on its code ${stamp} FAILED (${when(last)}): it runs` }
    return pass
      ? { suite, why, stamp, run: false, pass, reason: `${suite} code ${stamp} unchanged since its suite passed (${when(pass)}; ${suite}/${PASSES_FILE})` }
      : { suite, why, stamp, run: true, reason: isStamp(stamp) ? `${suite} code changed: no pass is recorded on ${stamp}` : `${suite} code could not be read (git): it runs` }
  })
}

/** Wrap's check: every suite has a pass on its code as it stands, recorded with the other three as they stand. */
export function fullGreen({ stamps, passes }) {
  const missing = []
  for (const { suite } of SUITES) {
    const runs = runsOn(passes[suite], suite, stamps[suite]), own = standing(runs)
    if (own.some((p) => ranWith(p, stamps))) continue
    missing.push({ suite, why: own.length
      ? `${suite}: passed on its own code ${stamps[suite]}, but not together with the other three as they are now`
      : runs.length ? `${suite}: its last run on its code ${stamps[suite]} FAILED (${when(runs.at(-1))})`
        : `${suite}: no pass is recorded on its code ${stamps[suite]}` })
  }
  return { green: missing.length === 0, missing }
}

/**
 * The control battles, for engine code `stamp`, the content pack `pack` and the golden `golden`
 * (both as packSha/goldenSha give them): 'skip' — they passed on exactly these; 're-record' — the
 * engine's code is the code they last passed on and only the pack moved; 'run' — the engine's code
 * changed (or nothing is recorded), so they run and are judged as they always were.
 */
export function controlAction({ stamp, pack, golden, passes }) {
  const lines = (passes ?? []).filter((p) => p.suite === 'control' && p.stamp === stamp && isStamp(stamp))
  const exact = [...lines].reverse().find((p) => p.pack === pack && p.golden === golden)
  if (exact) return { action: 'skip', line: exact, reason: `engine code ${stamp} and the content pack are the ones the control battles last passed on (${when(exact)})` }
  if (lines.length && !lines.some((p) => p.pack === pack)) return { action: 're-record', line: lines.at(-1), reason: `the content pack changed and the engine's code (${stamp}) did not since the control battles last passed (${when(lines.at(-1))})` }
  return { action: 'run', reason: lines.length ? `the golden is not the one recorded for engine code ${stamp}` : `no control-battle pass is recorded on engine code ${stamp}` }
}

/** The engine's shard record for the code `stamp`, in the shape tools/gate-progress.mjs reads; null for any other code, or an older tool's record (a tree and no stamp). */
export function shardsFor(raw, stamp) {
  if (!raw || !isStamp(stamp) || raw.stamp !== stamp) return null
  return { tree: stamp, sets: raw.sets ?? {} }
}

/** One check, as a run-log line: a skipped check is never ok. */
export function logCheck(c) {
  return { name: c.name, ok: c.skipped ? false : !!c.ok, warn: !!c.warn, ...(c.skipped ? { skipped: true } : {}), note: c.note || undefined }
}

// ── the record: on disk ─────────────────────────────────────────────────────
export function readPasses(dir) {
  try { return parsePasses(readFileSync(join(dir, PASSES_FILE), 'utf8')) } catch { return [] }
}

/** Append one pass line to `dir`'s record; a line that says the same thing is not written twice. Returns whether it wrote. */
export function appendPass(dir, pass) {
  if (!isStamp(pass.stamp)) return false
  const same = (p) => p.suite === pass.suite && p.stamp === pass.stamp && JSON.stringify(p.with ?? null) === JSON.stringify(pass.with ?? null)
    && (p.pack ?? null) === (pass.pack ?? null) && (p.golden ?? null) === (pass.golden ?? null)
  // the control battles: any line that says the same. A suite: only a pass that still stands (none since the last failure).
  const had = readPasses(dir)
  if ((pass.suite === 'control' ? had : standing(runsOn(had, pass.suite, pass.stamp))).some(same)) return false
  return writeLine(dir, pass)
}

/** Record that a run of `suite` on the code `stamp` FAILED, so no older pass on that code is relied on. One line per run of failures. */
export function appendFail(dir, { suite, stamp, by, in: where }) {
  if (!isStamp(stamp)) return false
  if (runsOn(readPasses(dir), suite, stamp).at(-1)?.failed) return false
  return writeLine(dir, { suite, stamp, failed: true, at: new Date().toISOString(), by, in: where })
}

function writeLine(dir, pass) {
  const file = join(dir, PASSES_FILE)
  mkdirSync(join(dir, '.state'), { recursive: true })
  const lead = existsSync(file) && !readFileSync(file, 'utf8').endsWith('\n') && readFileSync(file, 'utf8').length ? '\n' : ''
  appendFileSync(file, lead + JSON.stringify({ ...pass, at: pass.at ?? new Date().toISOString() }) + '\n')
  return true
}

const everyPasses = (root) => Object.fromEntries(PACKAGES.map((p) => [p, readPasses(join(root, p))]))

/** Record that `suite` passed on the code it ran on. `before`: the four stamps read before it ran. Nothing is recorded when its own code moved meanwhile. */
export function recordSuitePass(root, suite, before, by, extra = {}) {
  const after = allStamps(root)
  if (!isStamp(before[suite]) || after[suite] !== before[suite]) return { recorded: false, why: `${suite}'s code changed while its suite ran (${before[suite]} → ${after[suite]}) — no pass recorded` }
  const together = PACKAGES.every((p) => isStamp(before[p]) && after[p] === before[p])
  appendPass(join(root, suite), { suite, stamp: before[suite], with: together ? before : null, at: new Date().toISOString(), by, in: copyName(root), ...extra })
  return { recorded: true }
}
/** Record that `suite` FAILED on the code it started on (when that is still its code). */
export function recordSuiteFail(root, suite, before, by) {
  if (isStamp(before[suite]) && stampOf(suite, join(root, suite)) === before[suite]) appendFail(join(root, suite), { suite, stamp: before[suite], by, in: copyName(root) })
}

// ── the control battles ─────────────────────────────────────────────────────
const sha10 = (text) => createHash('sha1').update(text).digest('hex').slice(0, 10)
export function packSha(engineDir) {
  try { return execFileSync('git', ['-C', engineDir, 'hash-object', '--', PACK_FILE], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().slice(0, 10) || 'none' } catch { return 'none' }
}
const goldenText = (engineDir) => { try { return readFileSync(join(engineDir, GOLDEN_FILE), 'utf8').trim() || null } catch { return null } }
export const goldenSha = (engineDir) => { const g = goldenText(engineDir); return g ? sha10(g) : 'none' }
const controlNow = (engineDir) => {
  const stamp = stampOf('engine', engineDir), pack = packSha(engineDir), golden = goldenText(engineDir)
  return { stamp, pack, golden, ...controlAction({ stamp, pack, golden: golden ? sha10(golden) : 'none', passes: readPasses(engineDir) }) }
}
const hashLines = (out) => String(out ?? '').trim().split('\n').filter((l) => / [0-9a-f]{8}$/.test(l)).join('\n')
/** Which control battles differ between two goldens — naming WHICH maps moved is the point. '' when none. */
function movedBetween(golden, now) {
  const was = new Map(golden.split('\n').map((l) => l.split(' ')))
  const is = new Map(now.split('\n').map((l) => l.split(' ')))
  return [
    ...[...is.keys()].filter((k) => was.get(k) !== is.get(k)).map((k) => `${k} ${(was.get(k) ?? '?').slice(0, 8)}->${is.get(k).slice(0, 8)}`),
    ...[...is.keys()].filter((k) => !was.has(k)).map((k) => `${k} NEW`), ...[...was.keys()].filter((k) => !is.has(k)).map((k) => `${k} GONE`),
  ].join(', ')
}

/** Record that the control battles are true — the golden on disk — for the engine's code and the content pack as they stand. */
export function recordControl(engineDir, { by, moved = null }) {
  return appendPass(engineDir, { suite: 'control', stamp: stampOf('engine', engineDir), pack: packSha(engineDir), golden: goldenSha(engineDir), at: new Date().toISOString(), by, in: copyName(join(engineDir, '..')), moved })
}

/**
 * The landing's check 'control battles unchanged'. `baseline()` runs them and returns their
 * `<mapId> <hash>` lines (it throws when the probe errors). Engine code changed → they run, and every
 * verdict is what it always was (the consequence clause, the deferred bless, "Something leaked").
 * Nothing a battle is made of changed → SKIPPED, with the reason. Only the content pack changed →
 * they run to say whether the fights moved, and the golden is re-recorded at the commit instead of
 * failing the item (2026-10-04: otherwise the next engine item fails on a difference it did not make).
 */
export function controlCheck({ engineDir, item, baseline }) {
  const c = controlNow(engineDir)
  if (c.action === 'skip') {
    if (!item.changesBaseline) return { skipped: true, note: `${c.reason} — not run` }
    if (c.line.moved) return { skipped: true, note: `declared changesBaseline — the golden was re-recorded when this content pack shipped, and the fights moved: ${c.line.moved} (${when(c.line)}) — not run again` }
  }
  let now
  try { now = hashLines(baseline()) } catch { return { ok: false, note: 'baseline probe errored' } }
  if (!now) return { ok: false, note: 'baseline probe produced no hashes' }
  const golden = c.golden
  if (!golden) return { ok: true, golden: now + '\n', note: 'will bless at commit (first run)' }
  if (golden === now) {
    // THE CONSEQUENCE CLAUSE (2026-08-20). An item that DECLARES it changes the control battles and
    // then changes nothing has not done its job — "the aura should have some consequence."
    if (item.changesBaseline) {
      return { ok: false, note: 'declared changesBaseline — but every control battle is byte-identical. The mechanic had no consequence. Wire it into a control map, or remove the declaration and explain why it is neutral.' }
    }
    return { ok: true, note: c.action === 're-record' ? `${c.reason} — the fights did not move` : '' }
  }
  const detail = movedBetween(golden, now)
  // DEFERRED BLESS (2026-08-20): the golden is written only when the commit is — a later failed check
  // must not leave a polluted golden behind.
  if (item.changesBaseline) return { ok: true, golden: now + '\n', moved: detail, note: `will re-bless at commit — this item DECLARED it changes the control battles: ${detail}` }
  if (c.action === 're-record') return { ok: true, golden: now + '\n', moved: detail, note: `${c.reason} — golden re-recorded at commit; the fights moved: ${detail}` }
  return { ok: false, note: `CHANGED: ${detail}. Something leaked. If intended, set "changesBaseline": true on the backlog item.` }
}

/**
 * Shipping a new content pack: re-record the golden and say whether the fights moved (`gate.mjs
 * --pack-golden`; content's ship.mjs and `--run all` call it). It re-records ONLY when the engine's
 * code is the code the control battles last passed on — then the pack is the one thing that moved.
 * It never fails the content item.
 */
export function packGolden({ engineDir, baseline }) {
  const c = controlNow(engineDir)
  if (c.action === 'skip') return { action: 'skip', said: `SKIPPED  the control-battle golden — already true for this content pack: ${c.reason}` }
  if (c.action === 'run') return { action: 'run', said: `NOT RE-RECORDED  the control-battle golden — ${c.reason}, so a new pack and an engine change cannot be told apart here: the next engine landing judges the control battles (declare changesBaseline there if the fights are meant to move)` }
  let now
  try { now = hashLines(baseline()) } catch (e) { return { action: 'error', said: `NOT RE-RECORDED  the control-battle golden — the baseline probe errored (${String(e.message ?? e).split('\n')[0]})` } }
  if (!now) return { action: 'error', said: 'NOT RE-RECORDED  the control-battle golden — the baseline probe produced no hashes' }
  const moved = c.golden ? movedBetween(c.golden, now) || null : null
  writeFileSync(join(engineDir, GOLDEN_FILE), now + '\n')
  recordControl(engineDir, { by: 'gate --pack-golden', moved })
  return { action: 're-record', moved, said: `RE-RECORDED  the control-battle golden for the new content pack — ${moved ? `the fights moved: ${moved}` : 'the fights did not move'}` }
}

// ── the plan and the run, for a folder ──────────────────────────────────────
export function planNow(root = ROOT_DIR, { full = false } = {}) {
  const stamps = allStamps(root)
  const { action, reason } = controlNow(join(root, 'engine'))
  return { stamps, suites: planSuites({ stamps, passes: everyPasses(root), full }), golden: { action, reason } }
}

export function fullGreenNow(root = ROOT_DIR) {
  const stamps = allStamps(root)
  const r = fullGreen({ stamps, passes: everyPasses(root) })
  return { ...r, stamps, said: r.green ? `all four suites passed together on ${stampsLine(stamps)}` : r.missing.map((m) => m.why).join('\n') }
}

/** Run one suite's commands in its package, in order, stopping at the first that fails. */
function runCommands(root, s) {
  for (const cmd of s.cmds) {
    console.log(`\n── ${s.why}: ${cmd.join(' ')}  (in ${s.suite}/)`)
    const run = spawnSync(cmd[0] === 'node' ? process.execPath : cmd[0], cmd.slice(1), { cwd: join(root, s.suite), stdio: 'inherit', env: { ...(s.env ?? {}), ...process.env, VIEWER_PAGE: '' } })   // a suite's own defaults; what the caller's environment sets wins
    if (run.status !== 0) return false
  }
  return true
}

/**
 * Run what the plan says (`only`: that one suite, whatever is recorded), record each pass, print one
 * line per suite — PASS, FAIL or SKIPPED with its reason — and return whether nothing failed.
 */
export function runSuites(root = ROOT_DIR, { full = false, only = null } = {}) {
  const plan = planNow(root, { full })
  const rows = []
  for (const row of plan.suites) {
    if (only && row.suite !== only) continue
    if (!only && !row.run) { rows.push({ ...row, state: 'SKIPPED' }); continue }
    const s = SUITES.find((x) => x.suite === row.suite)
    const t0 = Date.now(), before = allStamps(root)
    const ok = runCommands(root, s)
    const secs = Math.round((Date.now() - t0) / 1000)
    console.log(`── ${s.why}: ${ok ? 'passed' : 'FAILED'} (${secs} s)`)
    let note = ''
    if (ok) { const rec = recordSuitePass(root, row.suite, before, `suites --run${full ? ' --full' : ''}`); if (!rec.recorded) note = ` — ${rec.why}` }
    else recordSuiteFail(root, row.suite, before, `suites --run${full ? ' --full' : ''}`)
    rows.push({ ...row, state: ok ? 'PASS' : 'FAIL', secs, note })
  }
  // a new content pack on unchanged engine code: the golden follows it, and says whether the fights moved
  let golden = null
  if (!only && plan.golden.action === 're-record') {
    console.log(`\n── the control-battle golden: node tools/gate.mjs --pack-golden  (in engine/) — ${plan.golden.reason}`)
    const run = spawnSync(process.execPath, ['tools/gate.mjs', '--pack-golden'], { cwd: join(root, 'engine'), stdio: 'inherit' })
    golden = run.status === 0 ? 'the control-battle golden — re-recorded for the new content pack (see above for whether the fights moved)' : 'the control-battle golden — NOT re-recorded: gate.mjs --pack-golden failed'
  }
  console.log('')
  for (const r of rows) console.log(r.state === 'SKIPPED' ? `  SKIPPED  ${r.why} — ${r.reason}` : `  ${r.state}  ${r.why} (${r.secs} s)${r.note}`)
  if (golden) console.log(`  GOLDEN  ${golden}`)
  return { ok: !rows.some((r) => r.state === 'FAIL'), rows }
}

/** Commit each package's changed pass records — passes.jsonl, and the engine's golden — and nothing else. Returns the packages committed. */
export function commitRecords(root = ROOT_DIR, message = 'passes: recorded in this copy') {
  const done = []
  for (const p of PACKAGES) {
    const dir = join(root, p)
    const files = [PASSES_FILE, ...(p === 'engine' ? [GOLDEN_FILE] : [])]
    let changed = ''
    try { changed = execFileSync('git', ['-C', dir, 'status', '--porcelain', '--untracked-files=all', '--', ...files], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { continue }
    if (!changed) continue
    commitOnly(files, { message: `${message} (${p} code ${stampOf(p, dir)})`, cwd: dir })
    done.push(p)
  }
  return done
}

// ── the command line ────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2)
  const full = argv.includes('--full')
  const at = (flag) => { const i = argv.indexOf(flag); return i === -1 ? null : argv[i + 1] ?? '' }
  if (argv.includes('--plan')) {
    const plan = planNow(ROOT_DIR, { full })
    if (argv.includes('--json')) console.log(JSON.stringify(plan, null, 1))
    else {
      console.log(`code: ${stampsLine(plan.stamps)}\n`)
      for (const r of plan.suites) console.log(`  ${r.run ? 'RUN    ' : 'SKIPPED'}  ${r.why} — ${r.reason}`)
      console.log(`  ${{ skip: 'SKIPPED', 're-record': 'RE-RECORD', run: 'AT THE NEXT ENGINE LANDING' }[plan.golden.action]}  the control battles — ${plan.golden.reason}`)
    }
    process.exit(0)
  }
  if (argv.includes('--full-green')) {
    const r = fullGreenNow()
    console.log(r.said)
    if (!r.green) console.log('run all four together: node tools/suites.mjs --run all --full   (or, from the shared folder: node tools/combine.mjs <worker folder> --full)')
    process.exit(r.green ? 0 : 1)
  }
  if (argv.includes('--commit-records')) {
    const done = commitRecords(ROOT_DIR, at('--commit-records') || undefined)
    console.log(done.length ? `pass records committed in ${done.join(', ')}` : 'no pass record to commit')
    process.exit(0)
  }
  const which = at('--run')
  if (which === 'all' || SUITES.some((s) => s.suite === which)) {
    const r = runSuites(ROOT_DIR, { full, only: which === 'all' ? null : which })
    process.exit(r.ok ? 0 : 1)
  }
  console.error('usage: node tools/suites.mjs --plan [--full] [--json] | --run all [--full] | --run content|kingdom|engine|viewer | --full-green | --commit-records "<why>"')
  process.exit(2)
}
