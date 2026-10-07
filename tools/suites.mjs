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
// LANDING ON THE QUICK CHECK (tool.landing-on-the-quick-check; DECISIONS.md 2026-10-06 'the one plan: land on the
// quick check, run the whole suites twice a day, four streams and one lander', decided by the home chat on Andrew's
// word: "Decide what keeps the checks that matter and removes the things that don't."). It REPLACES 'the full run,
// once per chat' above for what a landing, a merge-back and a wrap demand; the plan, the record and `--full-green`
// stand as they were, and are still what `--run all` and `combine --full` use.
//   · THE QUICK CHECKS (`--quick`; the root's tools/combine.mjs runs them at every merge-back): the typecheck of
//     each package whose code — or the engine's, which kingdom and the viewer import — has no typecheck recorded,
//     and the control battles when the engine's code or the content pack changed. No whole suite is started: each of
//     the four is printed SKIPPED with the date of the last scheduled run and what it found, never PASS (Law 9).
//   · THE SCHEDULED RUN is `--run all --full`, by the lander, alone on the machine, twice a day. Every line it
//     writes to a package's .state/passes.jsonl carries `"scheduled": "<when the run started>"`, and a failure
//     carries `"failing": [{ "name", "timedOut" }]` — the tests the suite's own output names. Its FAIL line names the
//     failing tests and the items landed (the engine's gate log) since that suite's last scheduled pass, so a fault
//     can be traced among them.
//   · NOTHING ELSE REFUSES FOR WANT OF A WHOLE-SUITE PASS: the engine's gate, kingdom's gate and `wrap` print when
//     the last scheduled run was and what it found, and refuse only when no complete scheduled run is recorded in
//     the last SCHEDULED_MAX_AGE_HOURS (a day).
//   · A TEST THAT TIMES OUT TWICE in the runs this tool records goes on the named list, engine/TIMEOUTS_FILE: it is
//     fixed as an item, not run a third time (`--timeouts` prints the list).
// What it costs is in the DECISIONS entry: the main folder can be broken for up to half a day.
//
//   node tools/suites.mjs --plan [--full] [--json]   what would run, what is skipped and why; changes nothing
//   node tools/suites.mjs --quick                    the quick checks of a merge-back; the four suites printed SKIPPED
//   node tools/suites.mjs --run all [--full]         run what the plan says (--full: all four — THE SCHEDULED RUN), record each
//   node tools/suites.mjs --run <suite>              run that one suite whatever is recorded (content|kingdom|engine|viewer)
//   node tools/suites.mjs --scheduled                when the last scheduled run was and what it found; exit 1 when none in the last day
//   node tools/suites.mjs --timeouts                 the tests that timed out twice (fix each as an item)
//   node tools/suites.mjs --timeout-fixed <suite> "<test>" <item id>   take a fixed test off that list
//   node tools/suites.mjs --full-green               exit 0 only when all four passed together on the code as it stands
//   node tools/suites.mjs --commit-records "<why>"   commit each package's changed pass records, and nothing else
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PACKAGES, ROOT_DIR, allStamps, stampOf } from './code-stamp.mjs'
import { commitOnly } from './commit-only.mjs'
import { readBacklog } from './backlog.mjs'

export const PASSES_FILE = '.state/passes.jsonl'
const GOLDEN_FILE = '.state/baseline.hash'
const PACK_FILE = 'src/content/generated/pack.ts'

// kingdom's suite runs as four quarters, as its own gate does (kingdom/tools/gate.mjs --shard k/4):
// run whole on a busy PC, its tests that spawn a child process pass their 5 s limit on any tree
// (GBH SWITCHES combine.kingdomQuarters, 2026-10-03). Every test still runs.
// Each quarter runs on the workers kingdom/vitest.config.ts names — four, the engine's own cap
// (tools/gate-progress.mjs vitestWorkersFor) — unless the environment says otherwise. This runner
// set VITEST_MAX_WORKERS=4 itself while kingdom had no config (GBH SWITCHES suites.kingdomWorkers);
// since tool.kingdom-vitest-workers (2026-10-04, GBH SWITCHES vitest.kingdomConfig) the config is
// the one place, and nothing is set here. The same files, the same assertions, the same 5 s.
export const KINGDOM_QUARTERS = 4
/** The four suites, cheapest first — the one list; combine and wrap read it, neither keeps a copy. */
export const SUITES = [
  { suite: 'content', why: "content's suite", cmds: [['node', '--test', 'test/*.test.mjs']] },
  { suite: 'kingdom', why: "kingdom's suite", cmds: Array.from({ length: KINGDOM_QUARTERS }, (_, i) =>
    ['node', '../engine/node_modules/vitest/vitest.mjs', 'run', '--reporter=dot', `--shard=${i + 1}/${KINGDOM_QUARTERS}`]) },
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

// ── the scheduled run, and what a failure names: pure (tool.landing-on-the-quick-check, 2026-10-06) ──
/** A landing and a wrap refuse only when no complete scheduled run is this recent. */
export const SCHEDULED_MAX_AGE_HOURS = 24
/** The named list of the tests that timed out twice — one file, in engine/ (GBH SWITCHES landing.timedOutTwiceList). */
export const TIMEOUTS_FILE = '.state/timed-out-twice.jsonl'
export const SCHEDULED_COMMAND = 'node tools/suites.mjs --run all --full'
const GATE_LOG = '.state/gauntlet-log.jsonl'
const minute = (iso) => String(iso).slice(0, 16).replace('T', ' ')

const TIMED_OUT = /timed out|Timeout (?:of )?\d+ ?ms|ETIMEDOUT/i
/**
 * The failing tests a suite's output names, in the order they are first named, each with whether the lines under its
 * name (to the next name) say it ran out of time. Read from what the runners print themselves:
 *   vitest          ` FAIL  test/a.test.ts > a group > a test`  (the engine's and kingdom's suites, the viewer's test/)
 *   node --test     `✖ a test (12.3ms)`  or  `not ok 3 - a test`  (content's suite, the viewer's page tests)
 *   the viewer gate `part verify 2/4: FAIL — verify failed`
 * A time-out is not an assertion, so the two are kept apart: `timedOut` is what the time-out list counts.
 */
export function failingTests(output) {
  const found = new Map()
  let open = null
  for (const raw of String(output ?? '').replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/)) {
    const l = raw.trim()
    const part = l.match(/^part (.+?): FAIL(?: — (.*))?$/)
    const m = part ? [l, `part ${part[1]}`]
      : l.match(/^FAIL\s+(\S.*)$/) ?? l.match(/^not ok \d+ - (.+?)(?:\s+#.*)?$/) ?? (l === '✖ failing tests:' ? null : l.match(/^✖\s+(.+?)(?:\s+\([\d.]+\s*m?s\))?$/))
    if (m) {
      open = m[1].trim()
      if (!found.has(open)) found.set(open, false)
      if (part && TIMED_OUT.test(part[2] ?? '')) found.set(open, true)
      continue
    }
    if (open && TIMED_OUT.test(l)) found.set(open, true)
  }
  return [...found].map(([name, timedOut]) => ({ name, timedOut }))
}
/** A failure's tests, said in one piece: `a > b [timed out]; c > d` (the first `most`, then how many more). */
export function failingSaid(failing, most = 8) {
  const list = failing ?? []
  if (!list.length) return 'its output names no failing test — read the run above'
  return list.slice(0, most).map((f) => `${f.name}${f.timedOut ? ' [timed out]' : ''}`).join('; ') + (list.length > most ? `; and ${list.length - most} more` : '')
}

/**
 * Every scheduled run the four packages' records hold, oldest first: `{ id, at, in, rows, complete, ok }`. `id` is when
 * the run started (the `scheduled` field of each line it wrote); `rows[suite]` is that suite's line in it, or absent
 * when the run never recorded that suite (it was stopped, or the suite's code moved under it). `complete`: all four
 * suites are in it. `ok`: complete, and none failed.
 */
export function scheduledRuns(passes) {
  const byId = new Map()
  for (const { suite } of SUITES) for (const p of passes?.[suite] ?? []) {
    if (p.suite !== suite || typeof p.scheduled !== 'string' || Number.isNaN(Date.parse(p.scheduled))) continue
    const run = byId.get(p.scheduled) ?? { id: p.scheduled, at: p.scheduled, in: p.in ?? null, rows: {} }
    if (!run.rows[suite] || run.rows[suite].at <= p.at) run.rows[suite] = p
    byId.set(p.scheduled, run)
  }
  return [...byId.values()].sort((a, b) => Date.parse(a.id) - Date.parse(b.id)).map((run) => {
    const complete = SUITES.every((s) => run.rows[s.suite])
    return { ...run, complete, ok: complete && SUITES.every((s) => !run.rows[s.suite].failed) }
  })
}
/** One suite of a scheduled run, said: `PASS`, `FAIL (a > b; …)`, or `not run`. */
const suiteFound = (row) => (!row ? 'not run' : row.failed ? `FAIL (${failingSaid(row.failing, 3)})` : 'PASS')
/** A scheduled run in one line: when, in which copy, and what it found in each of the four. */
export function scheduledRunSaid(run) {
  return `${minute(run.at)}${run.in ? `, in ${run.in}` : ''} — ${SUITES.map((s) => `${s.suite} ${suiteFound(run.rows[s.suite])}`).join(' · ')}${run.complete ? '' : ' (NOT COMPLETE: not all four were run)'}`
}
/**
 * What a landing, a merge-back and a wrap say about the whole suites, and whether a landing or a wrap must refuse.
 * `run`: the latest COMPLETE scheduled run (all four suites run, passed or failed), or null. `due`: there is none in
 * the last SCHEDULED_MAX_AGE_HOURS before `now` — the one case that refuses. A failed scheduled run does not refuse:
 * what it found is said, and the fault goes back to the builder (the DECISIONS entry: the main folder can be broken for
 * up to half a day). A run that is not complete is no run; it is named, so nobody takes it for one.
 */
export function scheduledStatus(passes, now = Date.now()) {
  const runs = scheduledRuns(passes)
  const run = runs.findLast((r) => r.complete) ?? null
  const newer = runs.at(-1) && runs.at(-1) !== run ? runs.at(-1) : null
  const ageHours = run ? (now - Date.parse(run.at)) / 3_600_000 : Infinity
  const due = !(ageHours <= SCHEDULED_MAX_AGE_HOURS)
  const said = (run
    ? `the last scheduled run of the whole suites: ${scheduledRunSaid(run)}${due ? ` — ${Math.floor(ageHours)} hours ago, over ${SCHEDULED_MAX_AGE_HOURS}` : ''}`
    : 'no scheduled run of the whole suites is recorded')
    + (newer ? `; a later one is not complete (${scheduledRunSaid(newer)})` : '')
  return { run, newer, due, ageHours, said }
}
/** One suite's part of that, for the line that says it was not run now (suiteLastScheduledNow reads the folder's records for it). */
export function suiteLastScheduled(passes, suite, now = Date.now()) {
  const { run } = scheduledStatus(passes, now)
  return run ? `the last scheduled run (${minute(run.at)}${run.in ? `, in ${run.in}` : ''}) found it ${suiteFound(run.rows[suite])}` : 'no scheduled run is recorded'
}

/** The items the engine's gate log says landed after `since` (an ISO time; null: every landing in the log), oldest first, one row an item. */
export function landedSince(logText, since = null) {
  const rows = new Map()
  for (const l of String(logText ?? '').split('\n')) {
    if (!l.trim()) continue
    let e = null
    try { e = JSON.parse(l) } catch { continue }
    if (!e || e.disposition !== 'landed' || typeof e.id !== 'string' || typeof e.at !== 'string') continue
    if (since && !(e.at > since)) continue
    rows.set(e.id, { id: e.id, sha: e.sha ?? null, at: e.at })
  }
  return [...rows.values()].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
}
/**
 * For a suite that failed: the pass to trace from — its last scheduled pass before `before`, else (no scheduled pass is
 * recorded yet) its last recorded pass of any kind — and what the answer is called.
 */
export function lastPassBefore(passes, suite, before) {
  const mine = (passes ?? []).filter((p) => p.suite === suite && !p.failed && typeof p.at === 'string' && (!before || p.at < before))
  const latest = (list) => list.reduce((best, p) => (!best || p.at > best.at ? p : best), null)
  const scheduled = latest(mine.filter((p) => typeof p.scheduled === 'string'))
  if (scheduled) return { pass: scheduled, called: `its last scheduled pass (${minute(scheduled.at)})` }
  const any = latest(mine)
  return any ? { pass: any, called: `its last recorded pass (${minute(any.at)}${any.by ? `, ${any.by}` : ''}; no scheduled pass is recorded yet)` } : { pass: null, called: 'the start of the gate log (no pass of this suite is recorded)' }
}
/** The landed items, said: `rule.x (abc1234), viewer.y (def5678)` — the last `most` when there are more. */
export function landedSaid(items, most = 12) {
  if (!items.length) return 'none'
  const said = (i) => `${i.id}${i.sha ? ` (${i.sha})` : ''}`
  return items.length > most ? `${items.length} items, the latest ${most}: ${items.slice(-most).map(said).join(', ')}` : items.map(said).join(', ')
}

/**
 * The time-out list's lines → the tests on it now: `{ suite, test, times, at }` for each test whose latest line is a
 * listing and not a `fixed` one.
 */
export function timeoutsListed(text) {
  const last = new Map()
  for (const l of String(text ?? '').split('\n')) {
    if (!l.trim()) continue
    let row = null
    try { row = JSON.parse(l) } catch { continue }
    if (row && typeof row.suite === 'string' && typeof row.test === 'string') last.set(`${row.suite}\n${row.test}`, row)
  }
  return [...last.values()].filter((r) => !r.fixed)
}
/**
 * Which of a failed run's time-outs are a SECOND time. `failing`: this run's failing tests. `passes`: the suite's
 * recorded runs BEFORE this one. `listText`: the list as it stands. A test counts once per earlier recorded failure in
 * which it timed out, since the list last said it was fixed. Returns `{ first, twice, listed }`: the tests that timed
 * out for the first time (re-run once), those that have now done so twice (to be written to the list — each with the
 * times), and those already on it (not to be run again).
 */
export function timeoutsOf({ suite, failing, passes, listText, at }) {
  const rows = String(listText ?? '').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const on = new Set(timeoutsListed(listText).filter((r) => r.suite === suite).map((r) => r.test))
  const first = [], twice = [], listed = []
  for (const f of (failing ?? []).filter((x) => x.timedOut)) {
    if (on.has(f.name)) { listed.push(f.name); continue }
    const fixedAt = rows.filter((r) => r.suite === suite && r.test === f.name && r.fixed).map((r) => r.at).sort().at(-1) ?? ''
    const before = (passes ?? []).filter((p) => p.suite === suite && p.failed && p.at > fixedAt && (p.failing ?? []).some((x) => x.name === f.name && x.timedOut)).map((p) => p.at)
    if (before.length) twice.push({ suite, test: f.name, times: [...before, at] }); else first.push(f.name)
  }
  return { first, twice, listed }
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
  // …and a SCHEDULED run's line is always written: the run is dated by it (2026-10-06).
  const had = readPasses(dir)
  if (!pass.scheduled && (pass.suite === 'control' ? had : standing(runsOn(had, pass.suite, pass.stamp))).some(same)) return false
  return writeLine(dir, pass)
}

/**
 * Record that a run of `suite` on the code `stamp` FAILED, so no older pass on that code is relied on. One line per run of
 * failures — except a run by this tool, which names what failed (`failing`) and, when it is the scheduled run, its date
 * (`scheduled`): every one of those is written, because the scheduled run is read back by its date and the time-out list
 * counts a test's time-outs run by run (2026-10-06).
 */
export function appendFail(dir, { suite, stamp, by, in: where, scheduled, failing, with: beside, at }) {
  if (!isStamp(stamp)) return false
  if (!scheduled && !failing && runsOn(readPasses(dir), suite, stamp).at(-1)?.failed) return false
  return writeLine(dir, { suite, stamp, failed: true, at: at ?? new Date().toISOString(), by, in: where, ...(beside ? { with: beside } : {}), ...(scheduled ? { scheduled } : {}), ...(failing ? { failing } : {}) })
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
/** Record that `suite` FAILED on the code it started on (when that is still its code). `extra`: `scheduled`, `failing`, `at`. Returns whether it wrote. */
export function recordSuiteFail(root, suite, before, by, extra = {}) {
  if (!(isStamp(before[suite]) && stampOf(suite, join(root, suite)) === before[suite])) return false
  return appendFail(join(root, suite), { suite, stamp: before[suite], by, in: copyName(root), ...extra })
}

// ── the scheduled run and the time-out list: on disk ────────────────────────
/** What a landing, a merge-back and a wrap say about the whole suites in the folder `root`, and whether a landing or a wrap must refuse (scheduledStatus). */
export function scheduledNow(root = ROOT_DIR, now = Date.now()) {
  return scheduledStatus(everyPasses(root), now)
}
/** What the last scheduled run found in `suite`, said for a line that reports the suite as not run — in the folder `root`. */
export function suiteLastScheduledNow(root, suite, now = Date.now()) {
  return suiteLastScheduled(everyPasses(root), suite, now)
}
const readText = (file) => { try { return readFileSync(file, 'utf8') } catch { return '' } }
/** The tests on the time-out list of the folder `root` (its engine/TIMEOUTS_FILE). */
export function timeoutsNow(root = ROOT_DIR) {
  return timeoutsListed(readText(join(root, 'engine', TIMEOUTS_FILE)))
}
function writeTimeoutLine(root, row) {
  const file = join(root, 'engine', TIMEOUTS_FILE)
  mkdirSync(join(root, 'engine', '.state'), { recursive: true })
  const had = readText(file)
  appendFileSync(file, (had && !had.endsWith('\n') ? '\n' : '') + JSON.stringify(row) + '\n')
}
/** Take a fixed test off the time-out list: one `fixed` line naming the item that fixed it. Throws when it is not on the list. */
export function timeoutFixed(root, suite, test, item) {
  if (!timeoutsNow(root).some((r) => r.suite === suite && r.test === test)) throw new Error(`'${test}' of the ${suite} suite is not on the time-out list (engine/${TIMEOUTS_FILE})`)
  writeTimeoutLine(root, { suite, test, fixed: item, at: new Date().toISOString() })
}

// ── the control battles ─────────────────────────────────────────────────────
const sha10 = (text) => createHash('sha1').update(text).digest('hex').slice(0, 10)
export function packSha(engineDir) {
  try { return execFileSync('git', ['-C', engineDir, 'hash-object', '--', PACK_FILE], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().slice(0, 10) || 'none' } catch { return 'none' }
}
// The golden's lines, whatever line endings this copy was checked out with (2026-10-06, found by the fixture of
// test/landing-on-the-quick-check.test.ts, whose worker copy is a clone with git's own autocrlf): read with CRLF, a golden
// that was the battles' own line for line compared unequal — 'CHANGED: bridge aaaaaaaa->aaaaaaaa' — and its sha was another
// copy's. The same golden is now the same text, and the same sha, in any copy.
const goldenText = (engineDir) => { try { return readFileSync(join(engineDir, GOLDEN_FILE), 'utf8').replace(/\r\n/g, '\n').trim() || null } catch { return null } }
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

/** Run one command, its output shown as it comes AND kept, so that a failure's tests can be named from it. */
function runKept(cmd, args, options) {
  return new Promise((done) => {
    const kept = []
    const child = spawn(cmd, args, { ...options, stdio: ['inherit', 'pipe', 'pipe'] })
    child.stdout.on('data', (d) => { process.stdout.write(d); kept.push(d) })
    child.stderr.on('data', (d) => { process.stderr.write(d); kept.push(d) })
    child.on('error', (e) => done({ status: 1, out: Buffer.concat(kept).toString('utf8') + `\n${e.message}` }))
    child.on('close', (status) => done({ status, out: Buffer.concat(kept).toString('utf8') }))
  })
}

/** Run one suite's commands in its package, in order, stopping at the first that fails. `{ ok, out }`: `out` is everything they printed. */
async function runCommands(root, s) {
  let out = ''
  for (const cmd of s.cmds) {
    console.log(`\n── ${s.why}: ${cmd.join(' ')}  (in ${s.suite}/)`)
    const run = await runKept(cmd[0] === 'node' ? process.execPath : cmd[0], cmd.slice(1), { cwd: join(root, s.suite), env: { ...(s.env ?? {}), ...process.env, VIEWER_PAGE: '' } })   // a suite's own defaults; what the caller's environment sets wins
    out += run.out
    if (run.status !== 0) return { ok: false, out }
  }
  return { ok: true, out }
}

/**
 * A suite failed: what its FAIL line says after the time — the failing tests its output names, and the items the
 * engine's gate log says landed since that suite's last scheduled pass (a fault is traced among them) — and what its
 * time-outs come to (timeoutsOf): a second time-out is written to the named list here. `had`: the suite's recorded runs
 * before this one.
 */
function failureOf(root, suite, { failing, had, at }) {
  const from = lastPassBefore(had, suite, at)
  const landed = landedSince(readText(join(root, 'engine', GATE_LOG)), from.pass ? from.pass.at : null)
  const t = timeoutsOf({ suite, failing, passes: had, listText: readText(join(root, 'engine', TIMEOUTS_FILE)), at })
  for (const row of t.twice) writeTimeoutLine(root, { ...row, at, in: copyName(root) })
  const lines = [
    ...t.first.map((name) => `  TIMED OUT, A FIRST TIME  ${suite}: ${name} — a time-out is re-run once: node tools/suites.mjs --run ${suite}`),
    ...t.twice.map((row) => `  TIMED OUT TWICE  ${suite}: ${row.test} (${row.times.map(minute).join(', ')}) — written to engine/${TIMEOUTS_FILE}: fix it as an item; it is not run a third time`),
    ...t.listed.map((name) => `  ON THE TIME-OUT LIST  ${suite}: ${name} — it timed out again; it is an item to fix, not a run to repeat (node tools/suites.mjs --timeouts)`),
  ]
  return { note: ` — failing: ${failingSaid(failing)}; landed since ${from.called}: ${landedSaid(landed)}`, lines }
}

/**
 * Run what the plan says (`only`: that one suite, whatever is recorded), record each pass and each failure, print one
 * line per suite — PASS, FAIL or SKIPPED with its reason — and return whether nothing failed. `full` with no `only` is
 * THE SCHEDULED RUN: every line it records carries the time the run started, and it ends by saying what it found.
 */
export async function runSuites(root = ROOT_DIR, { full = false, only = null } = {}) {
  const plan = planNow(root, { full })
  const scheduled = full && !only ? new Date().toISOString() : null
  const by = `suites --run${full ? ' --full' : ''}`
  const rows = []
  for (const row of plan.suites) {
    if (only && row.suite !== only) continue
    if (!only && !row.run) { rows.push({ ...row, state: 'SKIPPED' }); continue }
    const s = SUITES.find((x) => x.suite === row.suite)
    const t0 = Date.now(), before = allStamps(root)
    const { ok, out } = await runCommands(root, s)
    const secs = Math.round((Date.now() - t0) / 1000)
    console.log(`── ${s.why}: ${ok ? 'passed' : 'FAILED'} (${secs} s)`)
    let note = '', lines = []
    if (ok) { const rec = recordSuitePass(root, row.suite, before, by, scheduled ? { scheduled } : {}); if (!rec.recorded) note = ` — ${rec.why}` }
    else {
      const at = new Date().toISOString(), failing = failingTests(out), had = readPasses(join(root, row.suite))
      const together = PACKAGES.every((p) => isStamp(before[p]))
      const wrote = recordSuiteFail(root, row.suite, before, by, { at, failing, ...(together ? { with: before } : {}), ...(scheduled ? { scheduled } : {}) })
      ;({ note, lines } = failureOf(root, row.suite, { failing, had, at }))
      if (!wrote) note += ` — NOT RECORDED: ${row.suite}'s code changed while its suite ran`
    }
    rows.push({ ...row, state: ok ? 'PASS' : 'FAIL', secs, note, lines })
  }
  // a new content pack on unchanged engine code: the golden follows it, and says whether the fights moved
  let golden = null
  if (!only && plan.golden.action === 're-record') {
    console.log(`\n── the control-battle golden: node tools/gate.mjs --pack-golden  (in engine/) — ${plan.golden.reason}`)
    const run = spawnSync(process.execPath, ['tools/gate.mjs', '--pack-golden'], { cwd: join(root, 'engine'), stdio: 'inherit' })
    golden = run.status === 0 ? 'the control-battle golden — re-recorded for the new content pack (see above for whether the fights moved)' : 'the control-battle golden — NOT re-recorded: gate.mjs --pack-golden failed'
  }
  console.log('')
  for (const r of rows) {
    console.log(r.state === 'SKIPPED' ? `  SKIPPED  ${r.why} — ${r.reason}` : `  ${r.state}  ${r.why} (${r.secs} s)${r.note}`)
    for (const l of r.lines ?? []) console.log(l)
  }
  if (golden) console.log(`  GOLDEN  ${golden}`)
  if (scheduled) {
    const run = scheduledRuns(everyPasses(root)).find((r) => r.id === scheduled)
    console.log(`\nTHE SCHEDULED RUN — ${run ? scheduledRunSaid(run) : `${minute(scheduled)}: nothing was recorded (every package's code changed while it ran)`}`)
    console.log(`  its records are in each package's ${PASSES_FILE}; commit them and nothing else:  node tools/suites.mjs --commit-records "passes: the scheduled run of ${minute(scheduled)}"`)
  }
  return { ok: !rows.some((r) => r.state === 'FAIL'), rows, scheduled }
}

// ── the quick checks of a merge-back (tool.landing-on-the-quick-check, 2026-10-06) ──
/**
 * The packages that have a compiler config, how each is typechecked (its own `npm run typecheck`, without the link step),
 * and whose code its typecheck reads besides its own: kingdom and the viewer import the engine through their one door,
 * so an engine change types them again (GBH SWITCHES landing.typecheckReadsTheEngine). content has no compiler config.
 */
export const TYPECHECKS = [
  { pkg: 'engine', cmd: ['node', 'node_modules/typescript/bin/tsc', '--noEmit'], reads: [] },
  { pkg: 'kingdom', cmd: ['node', '../engine/node_modules/typescript/bin/tsc', '--noEmit'], reads: ['engine'] },
  { pkg: 'viewer', cmd: ['node', '../engine/node_modules/typescript/bin/tsc', '--noEmit'], reads: ['engine'] },
]
/** The control battles as the engine's gate runs them (`npx tsx tools/baseline.mts`), without npx. */
const QUICK_BASELINE = ['node', 'node_modules/tsx/dist/cli.mjs', 'tools/baseline.mts']
const typecheckKey = (check, stamps) => (check.reads.length ? Object.fromEntries(check.reads.map((p) => [p, stamps[p]])) : null)
/** The recorded typecheck of `check.pkg` on its code and the code it reads as `stamps` has them — the latest such run, and only if it passed. */
export function typecheckPass(passes, check, stamps) {
  const key = JSON.stringify(typecheckKey(check, stamps))
  const last = runsOn(passes, 'typecheck', stamps[check.pkg]).filter((p) => JSON.stringify(p.with ?? null) === key).at(-1)
  return last && !last.failed ? last : null
}
/**
 * The control battles at a merge-back, when the engine's code changed: run, and compared with the golden. The same →
 * PASS. Moved, and a pending item DECLARES it changes them → MOVED, said and not judged: that item's landing at the
 * engine's gate judges the fights and re-blesses the golden (a builder commits and does not land; the lander lands
 * after the merge). Moved, and nothing pending declares it → FAIL: something leaked.
 */
export function quickControl({ golden, baseline, declared = [] }) {
  let now
  try { now = hashLines(baseline()) } catch (e) { return { state: 'FAIL', said: `the baseline probe errored (${String(e.message ?? e).split('\n')[0]})` } }
  if (!now) return { state: 'FAIL', said: 'the baseline probe produced no hashes' }
  if (!golden) return { state: 'SKIPPED', said: 'no golden is recorded here: the first engine landing blesses one — not judged at a merge-back' }
  if (golden === now) return { state: 'PASS', said: '' }
  const detail = movedBetween(golden, now)
  if (declared.length) return { state: 'MOVED', said: `${detail} — NOT JUDGED HERE: ${declared.join(', ')} declare${declared.length === 1 ? 's' : ''} changesBaseline, and that landing at the engine's gate judges the fights and re-blesses the golden` }
  return { state: 'FAIL', said: `CHANGED: ${detail}. Something leaked — no pending item declares changesBaseline. If the fights are meant to move, the item that moves them says so ("changesBaseline": true)` }
}

/**
 * The quick checks, on the folder `root` as it stands: the typecheck of each package whose code (or the engine's, for
 * the two that import it) has none recorded, and the control battles when the engine's code or the content pack
 * changed. Each passes, fails, or is SKIPPED with the record it relied on. NO WHOLE SUITE IS STARTED: the four are
 * printed SKIPPED with the last scheduled run and what it found in each — never PASS (Law 9). Returns whether nothing
 * failed.
 */
export function runQuick(root = ROOT_DIR) {
  const stamps = allStamps(root), rows = [], by = 'suites --quick'
  for (const check of TYPECHECKS) {
    const dir = join(root, check.pkg), stamp = stamps[check.pkg], key = typecheckKey(check, stamps)
    const beside = check.reads.map((p) => ` and ${p} code ${stamps[p]}`).join('')
    const had = typecheckPass(readPasses(dir), check, stamps)
    if (had) { rows.push({ state: 'SKIPPED', what: `typecheck — ${check.pkg}`, why: `${check.pkg} code ${stamp}${beside} unchanged since it passed (${when(had)}; ${check.pkg}/${PASSES_FILE})` }); continue }
    console.log(`\n── typecheck — ${check.pkg}: ${check.cmd.join(' ')}  (in ${check.pkg}/)`)
    const t0 = Date.now()
    const ok = spawnSync(process.execPath, check.cmd.slice(1), { cwd: dir, stdio: 'inherit' }).status === 0
    const after = allStamps(root)
    const still = isStamp(stamp) && after[check.pkg] === stamp && check.reads.every((p) => isStamp(stamps[p]) && after[p] === stamps[p])
    if (still && ok) appendPass(dir, { suite: 'typecheck', stamp, with: key, at: new Date().toISOString(), by, in: copyName(root) })
    if (still && !ok) appendFail(dir, { suite: 'typecheck', stamp, by, in: copyName(root), ...(key ? { with: key } : {}) })
    rows.push({ state: ok ? 'PASS' : 'FAIL', what: `typecheck — ${check.pkg}`, secs: Math.round((Date.now() - t0) / 1000), why: ok && !still ? 'NOT RECORDED: the code changed while it ran' : '' })
  }
  rows.push({ state: 'SKIPPED', what: 'typecheck — content', why: 'content has no compiler config: nothing to typecheck' })
  // the control battles: nothing a battle is made of changed → SKIPPED; only the pack → the golden follows it; the engine's code → they run
  const engineDir = join(root, 'engine'), c = controlNow(engineDir)
  if (c.action === 'skip') rows.push({ state: 'SKIPPED', what: 'the control battles', why: c.reason })
  else if (c.action === 're-record') {
    console.log(`\n── the control-battle golden: node tools/gate.mjs --pack-golden  (in engine/) — ${c.reason}`)
    const ok = spawnSync(process.execPath, ['tools/gate.mjs', '--pack-golden'], { cwd: engineDir, stdio: 'inherit' }).status === 0
    rows.push(ok ? { state: 'GOLDEN', what: 'the control battles', why: 're-recorded for the new content pack (see above for whether the fights moved)' } : { state: 'FAIL', what: 'the control battles', why: 'the golden was NOT re-recorded: gate.mjs --pack-golden failed' })
  } else {
    console.log(`\n── the control battles: ${QUICK_BASELINE.join(' ')}  (in engine/) — ${c.reason}`)
    const t0 = Date.now()
    let declared = []
    try { declared = readBacklog(join(engineDir, '.state')).filter((x) => !x.status && x.changesBaseline).map((x) => x.id) } catch { /* no backlog here: nothing declares anything */ }
    const r = quickControl({ golden: c.golden, declared, baseline: () => execFileSync(process.execPath, QUICK_BASELINE.slice(1), { cwd: engineDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 26 }) })
    if (r.state === 'PASS' && stampOf('engine', engineDir) === c.stamp) recordControl(engineDir, { by, moved: null })
    rows.push({ state: r.state, what: 'the control battles', secs: Math.round((Date.now() - t0) / 1000), why: r.said })
  }
  const passes = everyPasses(root)
  for (const s of SUITES) rows.push({ state: 'SKIPPED', what: s.why, why: `not run at a merge-back: the whole suites run twice a day (${SCHEDULED_COMMAND}); ${suiteLastScheduled(passes, s.suite)}` })
  console.log('')
  for (const r of rows) console.log(`  ${r.state}  ${r.what}${r.secs !== undefined ? ` (${r.secs} s)` : ''}${r.why ? ` — ${r.why}` : ''}`)
  const status = scheduledStatus(passes)
  console.log(`\n${status.said}${status.due ? ` — NONE IN THE LAST ${SCHEDULED_MAX_AGE_HOURS} HOURS: a landing and a wrap refuse until the lander has run it (${SCHEDULED_COMMAND}, from engine/, alone on the machine)` : ''}`)
  return { ok: !rows.some((r) => r.state === 'FAIL'), rows }
}

/** Commit each package's changed pass records — passes.jsonl, and the engine's golden and time-out list — and nothing else. Returns the packages committed. */
export function commitRecords(root = ROOT_DIR, message = 'passes: recorded in this copy') {
  const done = []
  for (const p of PACKAGES) {
    const dir = join(root, p)
    const files = [PASSES_FILE, ...(p === 'engine' ? [GOLDEN_FILE, TIMEOUTS_FILE] : [])]
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
  if (argv.includes('--quick')) process.exit(runQuick(ROOT_DIR).ok ? 0 : 1)
  if (argv.includes('--scheduled')) {
    const st = scheduledNow()
    console.log(st.said)
    if (st.due) console.log(`none in the last ${SCHEDULED_MAX_AGE_HOURS} hours — the lander runs it, alone on the machine, from engine/: ${SCHEDULED_COMMAND}`)
    process.exit(st.due ? 1 : 0)
  }
  if (argv.includes('--timeouts')) {
    const list = timeoutsNow()
    console.log(list.length ? `${list.length} test(s) timed out twice (engine/${TIMEOUTS_FILE}) — each is an item to fix, not a run to repeat:` : `no test is on the time-out list (engine/${TIMEOUTS_FILE})`)
    for (const r of list) console.log(`  ${r.suite}: ${r.test} — ${(r.times ?? []).map(minute).join(', ')}`)
    process.exit(0)
  }
  if (argv.includes('--timeout-fixed')) {
    const i = argv.indexOf('--timeout-fixed'), [suite, test, item] = argv.slice(i + 1, i + 4)
    if (!suite || !test || !item || [suite, test, item].some((a) => a.startsWith('--'))) { console.error('usage: node tools/suites.mjs --timeout-fixed <suite> "<test>" <item id>'); process.exit(2) }
    try { timeoutFixed(ROOT_DIR, suite, test, item) } catch (e) { console.error(`suites: ${e.message}`); process.exit(1) }
    console.log(`off the time-out list: ${suite}: ${test} — fixed by ${item}`)
    process.exit(0)
  }
  const which = at('--run')
  if (which === 'all' || SUITES.some((s) => s.suite === which)) {
    const r = await runSuites(ROOT_DIR, { full, only: which === 'all' ? null : which })
    process.exit(r.ok ? 0 : 1)
  }
  console.error('usage: node tools/suites.mjs --plan [--full] [--json] | --quick | --run all [--full] | --run content|kingdom|engine|viewer | --scheduled | --timeouts | --timeout-fixed <suite> "<test>" <item id> | --full-green | --commit-records "<why>"')
  process.exit(2)
}
