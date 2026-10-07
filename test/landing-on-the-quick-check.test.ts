// tool.landing-on-the-quick-check (DECISIONS.md 2026-10-06 'the one plan: land on the quick check, run the whole suites
// twice a day, four streams and one lander', decided by the home chat on Andrew's word: "Decide what keeps the checks
// that matter and removes the things that don't."). Measured there: workers spent 56% of their time on whole-suite runs
// and landing chains; those runs failed 119 times in 417 and 15 of 90 incidents were real faults; the single-item gate
// takes seconds and failed for a real reason about ten times in 279 runs.
//
// The rule, in five parts:
//   1. a merge-back (the root's tools/combine.mjs) runs what is quick — the typecheck of each package whose code changed
//      and the control battles when the engine's code or the pack changed — and starts no whole suite; each of the four is
//      printed SKIPPED with the date of the last scheduled run, never PASS (Law 9); `--full` still runs all four;
//   2. the viewer's page landing asks for the page built and the verify parts (viewer/test/gate-follows-code.test.ts);
//   3. the scheduled run is `node tools/suites.mjs --run all --full`: it records each suite's pass or failure with the
//      failing tests' names, and its FAIL line names the items landed since that suite's last scheduled pass;
//   4. the engine's gate, kingdom's gate (kingdom/test/gate-follows-code.test.ts) and wrap say when the last scheduled
//      run was and what it found, and refuse only when none is recorded in the last day;
//   5. a test that times out twice goes on a named list instead of being run a third time.
//
// Every folder here is a scratch one (test/scratch-folder.ts): the real tools, stand-ins for the compilers, the test
// runners and the battles. Nothing here runs a tool on the real folder.
import { beforeAll, describe, expect, it } from 'vitest'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GOLDEN, LONG, ROOT_TOOLS, TOOLS, clearRan, cloneScratch, commitAll, git, makeScratch, node, passLines, put, ranLines, ranNames, recordScheduled, suites, type Scratch } from './scratch-folder.js'
import {
  SCHEDULED_MAX_AGE_HOURS, TIMEOUTS_FILE, failingSaid, failingTests, landedSaid, landedSince, lastPassBefore, quickControl, scheduledRuns, scheduledStatus,
  timeoutsListed, timeoutsOf, typecheckPass, type Pass,
} from '../tools/suites.mjs'

const HOUR = 3_600_000
const iso = (ms: number) => new Date(ms).toISOString()
const SUITE_NAMES = ["content's suite", "kingdom's suite", "the engine's whole suite", "the viewer's whole gate"]
/** The whole suites, by the name each stand-in writes down when it runs. */
const WHOLE = ['content', 'engine', 'kingdom', 'viewer']
const wholeSuitesRun = (f: Scratch) => ranNames(f).filter((n) => WHOLE.includes(n))

// ── what a failed suite names ───────────────────────────────────────────────
describe('a failed suite names its failing tests, and a time-out apart from an assertion', () => {
  it("vitest's failed tests — the engine's and kingdom's suites", () => {
    const out = [
      ' \x1b[31m❯\x1b[39m test/a.test.ts (3 tests | 2 failed) 31000ms', '', '⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯', '',
      ' \x1b[41m FAIL \x1b[49m test/a.test.ts > a group > sleeps too long', 'Error: Test timed out in 30000ms.', 'If this is a long-running test, pass a timeout value as the last argument.', '',
      ' FAIL  test/b.test.ts > counts', 'AssertionError: expected 2 to be 3 // Object.is equality', ' ❯ test/b.test.ts:4:20', '',
      ' Test Files  2 failed | 1 passed (3)', '      Tests  2 failed | 5 passed (7)',
    ].join('\n')
    expect(failingTests(out)).toEqual([
      { name: 'test/a.test.ts > a group > sleeps too long', timedOut: true },
      { name: 'test/b.test.ts > counts', timedOut: false },
    ])
  })
  it("node --test's failing tests — content's suite and the viewer's page tests — named once though printed twice", () => {
    const out = ['▶ rows', '  ✖ a content row (1.2ms)', '  ✖ a slow page (30012.4ms)', 'ℹ tests 2', 'ℹ fail 2', '', '✖ failing tests:', '', 'test at test/a.test.mjs:4:1', '✖ a content row (1.2ms)', '  AssertionError [ERR_ASSERTION]: no',
      '', 'test at test/a.test.mjs:9:1', '✖ a slow page (30012.4ms)', "  'test timed out after 30000ms'"].join('\n')
    expect(failingTests(out)).toEqual([{ name: 'a content row', timedOut: false }, { name: 'a slow page', timedOut: true }])
    expect(failingTests('not ok 3 - a content row\n  ---\n  duration_ms: 1\n')).toEqual([{ name: 'a content row', timedOut: false }])
  })
  it("the viewer gate's failed parts", () => {
    expect(failingTests('\npart checks: PASS (40 s) · tree 0123456789\n\npart verify 2/4: FAIL — verify failed (12 s) · tree 0123456789\n')).toEqual([{ name: 'part verify 2/4', timedOut: false }])
  })
  it('a line that only reports a run is not a test, and output that names none says so', () => {
    expect(failingTests("shard 1/1: FAIL — 2 failed, 5 passed — Error: x\n── the engine's whole suite: FAILED (3 s)\n")).toEqual([])
    expect(failingSaid([])).toBe('its output names no failing test — read the run above')
    expect(failingSaid([{ name: 'a > b', timedOut: true }, { name: 'c', timedOut: false }])).toBe('a > b [timed out]; c')
    expect(failingSaid(Array.from({ length: 10 }, (_, i) => ({ name: `t${i}`, timedOut: false })), 8)).toMatch(/^t0; t1; .*t7; and 2 more$/)
  })
})

// ── the scheduled run, read back ────────────────────────────────────────────
describe('the last scheduled run: when it was, what it found, and whether a landing must refuse', () => {
  const STAMP = '0123456789'
  const line = (suite: string, scheduled: string, extra: Partial<Pass> = {}): Pass => ({ suite, stamp: STAMP, at: scheduled, by: 'suites --run --full', in: 'main', scheduled, ...extra })
  const run = (scheduled: string, over: Record<string, Partial<Pass>> = {}, only = WHOLE) => Object.fromEntries(WHOLE.map((s) => [s, only.includes(s) ? [line(s, scheduled, over[s])] : []]))
  const merge = (...runs: Array<Record<string, Pass[]>>) => Object.fromEntries(WHOLE.map((s) => [s, runs.flatMap((r) => r[s] ?? [])]))
  const NOW = Date.parse('2026-10-06T20:00:00.000Z')
  const T1 = iso(NOW - 30 * HOUR), T2 = iso(NOW - 2 * HOUR), T3 = iso(NOW - HOUR)

  it('a run is the lines that carry one start time; it is complete when all four suites are in it', () => {
    const passes = merge(run(T1), run(T2, { engine: { failed: true, failing: [{ name: 'test/a.test.ts > x', timedOut: false }] } }), run(T3, {}, ['content']))
    const runs = scheduledRuns(passes)
    expect(runs.map((r) => [r.id, r.complete, r.ok])).toEqual([[T1, true, true], [T2, true, false], [T3, false, false]])
    // a line with no `scheduled` — a landing's shard, a merge-back's typecheck — belongs to no scheduled run
    expect(scheduledRuns({ ...passes, engine: [...passes.engine!, { suite: 'engine', stamp: STAMP, at: T3, by: 'gate --shard (1 of 1)' }] })).toHaveLength(3)
  })

  it('none recorded: it says so, and a landing or a wrap is due one', () => {
    const st = scheduledStatus(merge(), NOW)
    expect(st.run).toBeNull()
    expect(st.due).toBe(true)
    expect(st.said).toBe('no scheduled run of the whole suites is recorded')
  })

  it('under a day old: not due — even when it FAILED, and what it found is said', () => {
    const passes = merge(run(T1), run(T2, { engine: { failed: true, failing: [{ name: 'test/a.test.ts > x', timedOut: false }] } }))
    const st = scheduledStatus(passes, NOW)
    expect(st.run?.id).toBe(T2)
    expect(st.due).toBe(false)
    expect(st.said).toBe('the last scheduled run of the whole suites: 2026-10-06 18:00, in main — content PASS · kingdom PASS · engine FAIL (test/a.test.ts > x) · viewer PASS')
  })

  it('over a day old: due, and the run is still named', () => {
    const st = scheduledStatus(merge(run(T1)), NOW)
    expect(SCHEDULED_MAX_AGE_HOURS).toBe(24)
    expect(st.due).toBe(true)
    expect(st.said).toBe('the last scheduled run of the whole suites: 2026-10-05 14:00, in main — content PASS · kingdom PASS · engine PASS · viewer PASS — 30 hours ago, over 24')
    expect(scheduledStatus(merge(run(iso(NOW - 23.9 * HOUR))), NOW).due).toBe(false)
  })

  it('a run that was stopped before all four ran is no run: the complete one before it counts, and the stopped one is named', () => {
    const st = scheduledStatus(merge(run(T1), run(T3, {}, ['content', 'kingdom'])), NOW)
    expect(st.run?.id).toBe(T1)
    expect(st.due).toBe(true)
    expect(st.said).toMatch(/; a later one is not complete \(2026-10-06 19:00, in main — content PASS · kingdom PASS · engine not run · viewer not run \(NOT COMPLETE: not all four were run\)\)$/)
  })
})

describe('what landed since the last pass, from the gate log', () => {
  const LOG = [
    { at: '2026-10-05T08:00:00.000Z', id: 'rule.old', mode: 'land', disposition: 'landed', sha: 'aaa1111' },
    { at: '2026-10-06T09:00:00.000Z', id: 'rule.new', mode: 'check', disposition: 'check-passed' },
    { at: '2026-10-06T09:05:00.000Z', id: 'rule.new', mode: 'land', disposition: 'landed', sha: 'bbb2222' },
    { at: '2026-10-06T09:30:00.000Z', id: 'viewer.bar', mode: 'land', disposition: 'failed-checks' },
    { at: '2026-10-06T10:00:00.000Z', id: 'viewer.bar', mode: 'land', disposition: 'landed', sha: 'ccc3333' },
  ].map((l) => JSON.stringify(l)).join('\n') + '\nnot a line\n'
  it('only landings, only after the time asked, oldest first', () => {
    expect(landedSince(LOG, '2026-10-06T00:00:00.000Z')).toEqual([{ id: 'rule.new', sha: 'bbb2222', at: '2026-10-06T09:05:00.000Z' }, { id: 'viewer.bar', sha: 'ccc3333', at: '2026-10-06T10:00:00.000Z' }])
    expect(landedSince(LOG, null).map((l) => l.id)).toEqual(['rule.old', 'rule.new', 'viewer.bar'])
    expect(landedSaid(landedSince(LOG, '2026-10-06T00:00:00.000Z'))).toBe('rule.new (bbb2222), viewer.bar (ccc3333)')
    expect(landedSaid([])).toBe('none')
  })
  it("a failure is traced from that suite's last scheduled pass; before any is recorded, from its last recorded pass", () => {
    const S = '0123456789'
    const passes: Pass[] = [
      { suite: 'engine', stamp: S, at: '2026-10-05T07:00:00.000Z', by: 'gate --shard (1 of 1)' },
      { suite: 'engine', stamp: S, at: '2026-10-05T20:00:00.000Z', by: 'suites --run --full', scheduled: '2026-10-05T19:40:00.000Z' },
      { suite: 'engine', stamp: S, at: '2026-10-06T07:00:00.000Z', by: 'suites --run --full', scheduled: '2026-10-06T06:40:00.000Z', failed: true },
      { suite: 'engine', stamp: S, at: '2026-10-06T08:00:00.000Z', by: 'gate --shard (1 of 1)' },
    ]
    const from = lastPassBefore(passes, 'engine', '2026-10-06T19:00:00.000Z')
    expect(from.pass?.at).toBe('2026-10-05T20:00:00.000Z')
    expect(from.called).toBe('its last scheduled pass (2026-10-05 20:00)')
    const early = lastPassBefore(passes.slice(0, 1), 'engine', '2026-10-06T19:00:00.000Z')
    expect(early.called).toBe('its last recorded pass (2026-10-05 07:00, gate --shard (1 of 1); no scheduled pass is recorded yet)')
    expect(lastPassBefore([], 'engine', '2026-10-06T19:00:00.000Z')).toEqual({ pass: null, called: 'the start of the gate log (no pass of this suite is recorded)' })
  })
})

describe('a test that times out twice goes on the list instead of being run a third time', () => {
  const S = '0123456789', SLOW = { name: 'test/k.test.ts > slow', timedOut: true }, WRONG = { name: 'test/k.test.ts > wrong', timedOut: false }
  const failedRun = (at: string, failing = [SLOW]): Pass => ({ suite: 'kingdom', stamp: S, at, failed: true, failing, by: 'suites --run --full' })
  it('a first time-out is a first time; an assertion is never a time-out', () => {
    expect(timeoutsOf({ suite: 'kingdom', failing: [SLOW, WRONG], passes: [], listText: '', at: '2026-10-06T08:00:00.000Z' })).toEqual({ first: ['test/k.test.ts > slow'], twice: [], listed: [] })
  })
  it('a second one, in any earlier recorded run of that suite, is twice — with both times', () => {
    const r = timeoutsOf({ suite: 'kingdom', failing: [SLOW], passes: [failedRun('2026-10-06T08:00:00.000Z'), failedRun('2026-10-06T08:10:00.000Z', [WRONG])], listText: '', at: '2026-10-06T08:20:00.000Z' })
    expect(r).toEqual({ first: [], twice: [{ suite: 'kingdom', test: 'test/k.test.ts > slow', times: ['2026-10-06T08:00:00.000Z', '2026-10-06T08:20:00.000Z'] }], listed: [] })
    // another suite's time-out of the same name does not count
    expect(timeoutsOf({ suite: 'engine', failing: [SLOW], passes: [failedRun('2026-10-06T08:00:00.000Z')], listText: '', at: '2026-10-06T08:20:00.000Z' }).first).toEqual(['test/k.test.ts > slow'])
  })
  it('once on the list it is not listed again; once fixed, it starts from nothing', () => {
    const listed = JSON.stringify({ suite: 'kingdom', test: 'test/k.test.ts > slow', times: ['a', 'b'], at: '2026-10-06T08:20:00.000Z' }) + '\n'
    expect(timeoutsListed(listed).map((r) => r.test)).toEqual(['test/k.test.ts > slow'])
    expect(timeoutsOf({ suite: 'kingdom', failing: [SLOW], passes: [failedRun('2026-10-06T08:00:00.000Z')], listText: listed, at: '2026-10-06T09:00:00.000Z' })).toEqual({ first: [], twice: [], listed: ['test/k.test.ts > slow'] })
    const fixed = listed + JSON.stringify({ suite: 'kingdom', test: 'test/k.test.ts > slow', fixed: 'fix.slow-test', at: '2026-10-06T10:00:00.000Z' }) + '\n'
    expect(timeoutsListed(fixed)).toEqual([])
    // the two time-outs before the fix no longer count; one after it is a first time again
    expect(timeoutsOf({ suite: 'kingdom', failing: [SLOW], passes: [failedRun('2026-10-06T08:00:00.000Z'), failedRun('2026-10-06T08:20:00.000Z')], listText: fixed, at: '2026-10-06T11:00:00.000Z' }).first).toEqual(['test/k.test.ts > slow'])
  })
})

describe('the quick checks, decided', () => {
  const S = { engine: 'aaaaaaaaaa', content: 'bbbbbbbbbb', viewer: 'cccccccccc', kingdom: 'dddddddddd' }
  const KINGDOM = { pkg: 'kingdom', reads: ['engine'] }, ENGINE = { pkg: 'engine', reads: [] as string[] }
  it("a typecheck is recorded on its package's code and on the engine's, for the two that import it", () => {
    const had: Pass[] = [{ suite: 'typecheck', stamp: S.kingdom, with: { engine: S.engine }, at: '2026-10-06T08:00:00.000Z', by: 'suites --quick' }]
    expect(typecheckPass(had, KINGDOM, S)?.at).toBe('2026-10-06T08:00:00.000Z')
    expect(typecheckPass(had, KINGDOM, { ...S, engine: 'eeeeeeeeee' })).toBeNull()      // the engine moved: kingdom is typed again
    expect(typecheckPass(had, KINGDOM, { ...S, kingdom: 'eeeeeeeeee' })).toBeNull()     // kingdom moved
    expect(typecheckPass(had, KINGDOM, { ...S, viewer: 'eeeeeeeeee' })?.at).toBeTruthy() // the viewer is not what kingdom's typecheck reads
    expect(typecheckPass([{ suite: 'typecheck', stamp: S.engine, with: null, at: '2026-10-06T08:00:00.000Z' }], ENGINE, { ...S, kingdom: 'eeeeeeeeee' })?.at).toBeTruthy()
    // a later failure on the same code takes the pass away; a suite's pass is not a typecheck
    expect(typecheckPass([...had, { suite: 'typecheck', stamp: S.kingdom, with: { engine: S.engine }, at: '2026-10-06T09:00:00.000Z', failed: true }], KINGDOM, S)).toBeNull()
    expect(typecheckPass([{ suite: 'kingdom', stamp: S.kingdom, with: S, at: '2026-10-06T08:00:00.000Z' }], KINGDOM, S)).toBeNull()
  })
  it('the control battles at a merge-back: the same passes; moved with nothing declaring it fails; moved with a pending item declaring it is said and left to that landing', () => {
    const moved = 'bridge cccccccc\nfield bbbbbbbb'
    expect(quickControl({ golden: GOLDEN, baseline: () => GOLDEN + '\n' })).toEqual({ state: 'PASS', said: '' })
    const leak = quickControl({ golden: GOLDEN, baseline: () => moved })
    expect(leak.state).toBe('FAIL')
    expect(leak.said).toMatch(/^CHANGED: bridge aaaaaaaa->cccccccc\. Something leaked — no pending item declares changesBaseline/)
    const declared = quickControl({ golden: GOLDEN, baseline: () => moved, declared: ['rule.a-thing'] })
    expect(declared.state).toBe('MOVED')
    expect(declared.said).toMatch(/^bridge aaaaaaaa->cccccccc — NOT JUDGED HERE: rule\.a-thing declares changesBaseline/)
    expect(quickControl({ golden: GOLDEN, baseline: () => { throw new Error('no engine') } }).state).toBe('FAIL')
    expect(quickControl({ golden: GOLDEN, baseline: () => 'nothing like a hash' }).state).toBe('FAIL')
    expect(quickControl({ golden: null, baseline: () => GOLDEN }).state).toBe('SKIPPED')
  })
})

// ── 1. a merge-back runs the quick checks and no whole suite ─────────────────
describe('combine merges a copy without running a whole suite', () => {
  let f: Scratch, worker: string
  const combine = (env: Record<string, string> = {}, ...args: string[]) => node(f, f.main, env, 'tools/combine.mjs', worker, ...args)
  const head = (root: string, pkg: string) => git(join(root, pkg), 'rev-parse', 'HEAD')
  beforeAll(async () => {
    f = makeScratch()
    await recordScheduled(f.main, { hoursAgo: 2 })
    // the folder as a lander keeps it: the quick checks have passed on it once, and their records are committed
    const quick = suites(f, ['--quick'])
    expect(quick.status, quick.stdout + quick.stderr).toBe(0)
    expect(ranNames(f)).toEqual(['baseline', 'typecheck-engine', 'typecheck-kingdom', 'typecheck-viewer'])
    expect(suites(f, ['--commit-records', 'the records the folder starts with']).status).toBe(0)
    clearRan(f)
    worker = cloneScratch(f, 'worker')
  }, LONG)

  it('a copy whose kingdom and viewer code changed: their two typechecks, no whole suite, and each suite said NOT RUN with the last scheduled run', () => {
    appendFileSync(join(worker, 'kingdom', 'src', 'core', 'week.ts'), 'export const more = 2\n')
    commitAll(join(worker, 'kingdom'), 'kingdom.an-item: a kingdom change')
    appendFileSync(join(worker, 'viewer', 'src', 'fold.js'), 'export const more = 2\n')
    commitAll(join(worker, 'viewer'), 'viewer.an-item: a viewer change')
    const r = combine()
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(wholeSuitesRun(f)).toEqual([])
    expect(ranNames(f)).toEqual(['typecheck-kingdom', 'typecheck-viewer'])
    for (const s of SUITE_NAMES) {
      expect(r.stdout, s).toMatch(new RegExp(`SKIPPED  ${s} — not run at a merge-back: the whole suites run twice a day \\(node tools/suites\\.mjs --run all --full\\); the last scheduled run \\(\\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d, in main\\) found it PASS`))
      expect(r.stdout, s).not.toMatch(new RegExp(`PASS  ${s}`))
    }
    expect(r.stdout).toMatch(/PASS  typecheck — kingdom \(\d+ s\)/)
    expect(r.stdout).toMatch(/PASS  typecheck — viewer \(\d+ s\)/)
    expect(r.stdout).toMatch(/SKIPPED  typecheck — engine — engine code [0-9a-f]{10} unchanged since it passed \(\d{4}-\d\d-\d\d \d\d:\d\d, suites --quick, in main; engine\/\.state\/passes\.jsonl\)/)
    expect(r.stdout).toMatch(/SKIPPED  typecheck — content — content has no compiler config/)
    expect(r.stdout).toMatch(/SKIPPED  the control battles — engine code [0-9a-f]{10} and the content pack are the ones the control battles last passed on/)
    expect(r.stdout).toMatch(/COMBINED — viewer, kingdom updated to the commits the checks above ran on\. THE WHOLE SUITES WERE NOT RUN/)
    // this folder holds the worker's commits, and the record of the quick check each was merged on — made in the worker's copy
    for (const p of ['kingdom', 'viewer']) {
      expect(head(f.main, p)).toBe(head(worker, p))
      expect(git(join(f.main, p), 'status', '--porcelain')).toBe('')
      expect(passLines(f.main, p).at(-1)).toMatchObject({ suite: 'typecheck', by: 'suites --quick', in: 'worker' })
    }
    clearRan(f)
  }, LONG)

  it("an engine change types the engine and the two packages that import it, and runs the control battles — still no whole suite", () => {
    appendFileSync(join(worker, 'engine', 'src', 'core', 'battle.ts'), 'export const b = 2\n')
    commitAll(join(worker, 'engine'), 'rule.an-item: an engine change')
    const r = combine()
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(ranNames(f)).toEqual(['baseline', 'typecheck-engine', 'typecheck-kingdom', 'typecheck-viewer'])
    expect(r.stdout).toMatch(/PASS  the control battles \(\d+ s\)/)
    expect(head(f.main, 'engine')).toBe(head(worker, 'engine'))
    clearRan(f)
    // merged again with nothing new: nothing to do, and nothing runs
    const again = combine()
    expect(again.stdout).toMatch(/Nothing to combine/)
    expect(ranLines(f)).toEqual([])
  }, LONG)

  it('a failing quick check stops the merge-back, and this folder is not changed', () => {
    appendFileSync(join(worker, 'kingdom', 'src', 'core', 'week.ts'), 'export const broken: number = "no"\n')
    commitAll(join(worker, 'kingdom'), 'kingdom.a-bad-item: it does not type')
    const before = head(f.main, 'kingdom')
    const r = combine({ FIXTURE_FAIL: 'typecheck-kingdom' })
    expect(r.status).toBe(1)
    expect(r.stdout).toMatch(/FAIL  typecheck — kingdom/)
    expect(r.stderr).toMatch(/the combined game fails a quick check/)
    expect(r.stderr).toMatch(/This folder was not changed/)
    expect(head(f.main, 'kingdom')).toBe(before)
    expect(wholeSuitesRun(f)).toEqual([])
    // fixed (here: the stand-in passes), it merges
    const fixed = combine()
    expect(fixed.status, fixed.stdout + fixed.stderr).toBe(0)
    expect(head(f.main, 'kingdom')).toBe(head(worker, 'kingdom'))
    clearRan(f)
  }, LONG)

  it('control battles that moved: a leak stops the merge-back; a pending item that declares it does not, and is named', () => {
    const MOVED = { FIXTURE_BASELINE: 'bridge cccccccc\nfield bbbbbbbb' }
    appendFileSync(join(worker, 'engine', 'src', 'core', 'battle.ts'), 'export const c = 3\n')
    commitAll(join(worker, 'engine'), 'rule.moves-the-fights: an engine change that moves the bridge')
    const before = head(f.main, 'engine')
    const leak = combine(MOVED)
    expect(leak.status).toBe(1)
    expect(leak.stdout).toMatch(/FAIL  the control battles \(\d+ s\) — CHANGED: bridge aaaaaaaa->cccccccc\. Something leaked/)
    expect(head(f.main, 'engine')).toBe(before)
    put(join(worker, 'engine', '.state', 'backlog.engine.json'), JSON.stringify([{ id: 'rule.moves-the-fights', kind: 'engine', shape: 'rule', spec: 'It moves the bridge.', expect: 'The bridge moves.', changesBaseline: true }], null, 1) + '\n')
    commitAll(join(worker, 'engine'), 'the queue: rule.moves-the-fights is filed, and declares what it moves')
    const declared = combine(MOVED)
    expect(declared.status, declared.stdout + declared.stderr).toBe(0)
    expect(declared.stdout).toMatch(/MOVED  the control battles \(\d+ s\) — bridge aaaaaaaa->cccccccc — NOT JUDGED HERE: rule\.moves-the-fights declares changesBaseline/)
    expect(declared.stdout).not.toMatch(/PASS  the control battles/)
    expect(head(f.main, 'engine')).toBe(head(worker, 'engine'))
    clearRan(f)
  }, LONG)

  it('--full still runs all four, and records them as one scheduled run', () => {
    const r = combine({}, '--full')
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(wholeSuitesRun(f)).toEqual(WHOLE)
    for (const s of SUITE_NAMES) expect(r.stdout, s).toMatch(new RegExp(`PASS  ${s} \\(\\d+ s\\)`))
    expect(r.stdout).toMatch(/THE SCHEDULED RUN — \d{4}-\d\d-\d\d \d\d:\d\d, in worker — content PASS · kingdom PASS · engine PASS · viewer PASS/)
    expect(r.stdout).toMatch(/\(the scheduled run: all four whole suites passed together on them\)/)
    const ids = WHOLE.map((p) => passLines(f.main, p).filter((l) => l.suite === p).at(-1)!.scheduled)
    expect(new Set(ids).size).toBe(1)
    expect(ids[0]).toMatch(/^\d{4}-\d\d-\d\dT/)
    expect(suites(f, ['--full-green']).status).toBe(0)
    clearRan(f)
  }, LONG)

  it("the root's combine asks for the quick checks, and for the whole suites only with --full", () => {
    const src = readFileSync(join(ROOT_TOOLS, 'combine.mjs'), 'utf8')
    expect(src).toMatch(/if \(!suites\('--quick'\)\) stop\(/)
    expect(src).toMatch(/if \(FULL\) \{\s*\/\/[^\n]*\n\s*if \(!suites\('--run', 'all', '--full'\)\) stop\(/)
    expect(src.match(/suites\('--run'/g)).toHaveLength(1)
  })
})

// ── 3. the scheduled run ────────────────────────────────────────────────────
describe('the scheduled run records what it found, and a failure names what landed since the last pass', () => {
  let f: Scratch
  const VITEST_FAILED = (name: string, why: string) => `\n⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯\n\n FAIL  ${name}\n${why}\n\n Test Files  1 failed (1)\n      Tests  1 failed | 2 passed (3)\n`
  beforeAll(() => { f = makeScratch() }, LONG)

  it('--run all --full runs all four and writes one dated line each; --scheduled reads it back', () => {
    expect(suites(f, ['--scheduled']).status).toBe(1)
    const r = suites(f, ['--run', 'all', '--full'])
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(wholeSuitesRun(f)).toEqual(WHOLE)
    const lines = WHOLE.map((p) => passLines(f.main, p).filter((l) => l.suite === p).at(-1)!)
    expect(new Set(lines.map((l) => l.scheduled)).size).toBe(1)
    for (const l of lines) expect(l).toMatchObject({ by: 'suites --run --full', in: 'main' })
    expect(r.stdout).toMatch(/THE SCHEDULED RUN — \d{4}-\d\d-\d\d \d\d:\d\d, in main — content PASS · kingdom PASS · engine PASS · viewer PASS/)
    expect(r.stdout).toMatch(/node tools\/suites\.mjs --commit-records "passes: the scheduled run of /)
    const said = suites(f, ['--scheduled'])
    expect(said.status, said.stdout).toBe(0)
    expect(said.stdout).toMatch(/^the last scheduled run of the whole suites: \d{4}-\d\d-\d\d \d\d:\d\d, in main — content PASS · kingdom PASS · engine PASS · viewer PASS\n$/)
    // a second scheduled run on the same code is a second dated line: the run is read by its date
    expect(suites(f, ['--run', 'all', '--full']).status).toBe(0)
    expect(passLines(f.main, 'content').filter((l) => l.scheduled)).toHaveLength(2)
    // …while a run that is not the scheduled one writes no date
    expect(suites(f, ['--run', 'content']).status).toBe(0)
    expect(passLines(f.main, 'content').filter((l) => l.scheduled)).toHaveLength(2)
    clearRan(f)
  }, LONG)

  it("a failed suite: its line names the failing test and the items landed since that suite's last scheduled pass", () => {
    const log = [
      { at: '2020-01-01T00:00:00.000Z', id: 'rule.long-ago', mode: 'land', disposition: 'landed', sha: 'aaa1111' },
      { at: new Date().toISOString(), id: 'rule.new-thing', mode: 'land', disposition: 'landed', sha: 'bbb2222' },
      { at: new Date().toISOString(), id: 'viewer.only-checked', mode: 'check', disposition: 'check-passed' },
    ]
    put(join(f.main, 'engine', '.state', 'gauntlet-log.jsonl'), log.map((l) => JSON.stringify(l)).join('\n') + '\n')
    const r = suites(f, ['--run', 'all', '--full'], { FIXTURE_FAIL: 'kingdom', FIXTURE_FAILING: VITEST_FAILED('test/k.test.ts > the week turns', 'AssertionError: expected 1 to be 2 // Object.is equality') })
    expect(r.status).toBe(1)
    expect(r.stdout).toMatch(/FAIL  kingdom's suite \(\d+ s\) — failing: test\/k\.test\.ts > the week turns; landed since its last scheduled pass \(\d{4}-\d\d-\d\d \d\d:\d\d\): rule\.new-thing \(bbb2222\)\n/)
    expect(r.stdout).not.toMatch(/rule\.long-ago|viewer\.only-checked/)
    // the other three ran and passed: the run is complete, and it found one failing
    expect(wholeSuitesRun(f)).toEqual(WHOLE)
    expect(r.stdout).toMatch(/THE SCHEDULED RUN — .* — content PASS · kingdom FAIL \(test\/k\.test\.ts > the week turns\) · engine PASS · viewer PASS/)
    expect(passLines(f.main, 'kingdom').at(-1)).toMatchObject({ suite: 'kingdom', failed: true, failing: [{ name: 'test/k.test.ts > the week turns', timedOut: false }], by: 'suites --run --full' })
    expect(passLines(f.main, 'kingdom').at(-1)!.scheduled).toBe(passLines(f.main, 'content').filter((l) => l.suite === 'content').at(-1)!.scheduled)
    // a scheduled run that found a failure is still a scheduled run: nothing is due
    const said = suites(f, ['--scheduled'])
    expect(said.status).toBe(0)
    expect(said.stdout).toMatch(/kingdom FAIL \(test\/k\.test\.ts > the week turns\)/)
    clearRan(f)
  }, LONG)

  it("the engine's suite names its failing tests too — its gate prints them, where it printed one excerpt", () => {
    const r = suites(f, ['--run', 'engine'], { FIXTURE_FAIL: 'engine', FIXTURE_FAILING: VITEST_FAILED('test/a.test.ts > a battle > ends', 'AssertionError: expected 3 to be 4 // Object.is equality') })
    expect(r.status).toBe(1)
    expect(r.stdout).toMatch(/^ FAIL  test\/a\.test\.ts > a battle > ends$/m)
    expect(r.stdout).toMatch(/FAIL  the engine's whole suite \(\d+ s\) — failing: test\/a\.test\.ts > a battle > ends; landed since /)
    expect(passLines(f.main, 'engine').at(-1)).toMatchObject({ suite: 'engine', failed: true, failing: [{ name: 'test/a.test.ts > a battle > ends', timedOut: false }] })
    clearRan(f)
  }, LONG)

  it('a time-out: said to be re-run once the first time; written to the list the second; not asked for a third', () => {
    const list = join(f.main, 'engine', TIMEOUTS_FILE)
    const SLOW = { FIXTURE_FAIL: 'kingdom', FIXTURE_FAILING: VITEST_FAILED('test/k.test.ts > slow', 'Error: Test timed out in 30000ms.') }
    const first = suites(f, ['--run', 'kingdom'], SLOW)
    expect(first.status).toBe(1)
    expect(first.stdout).toMatch(/failing: test\/k\.test\.ts > slow \[timed out\]/)
    expect(first.stdout).toMatch(/TIMED OUT, A FIRST TIME  kingdom: test\/k\.test\.ts > slow — a time-out is re-run once: node tools\/suites\.mjs --run kingdom/)
    expect(existsSync(list)).toBe(false)
    const second = suites(f, ['--run', 'kingdom'], SLOW)
    expect(second.status).toBe(1)
    expect(second.stdout).toMatch(/TIMED OUT TWICE  kingdom: test\/k\.test\.ts > slow \(\d{4}-\d\d-\d\d \d\d:\d\d, \d{4}-\d\d-\d\d \d\d:\d\d\) — written to engine\/\.state\/timed-out-twice\.jsonl: fix it as an item; it is not run a third time/)
    const rows = readFileSync(list, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { suite: string; test: string; times: string[] })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ suite: 'kingdom', test: 'test/k.test.ts > slow' })
    expect(rows[0]!.times).toHaveLength(2)
    const third = suites(f, ['--run', 'kingdom'], SLOW)
    expect(third.stdout).toMatch(/ON THE TIME-OUT LIST  kingdom: test\/k\.test\.ts > slow — it timed out again; it is an item to fix, not a run to repeat/)
    expect(readFileSync(list, 'utf8').trim().split('\n')).toHaveLength(1)
    expect(suites(f, ['--timeouts']).stdout).toMatch(/1 test\(s\) timed out twice[^\n]*\n  kingdom: test\/k\.test\.ts > slow — /)
    // the list is the lander's record: it is committed with the pass records, and nothing else is
    expect(suites(f, ['--commit-records', 'the records of the runs above']).status).toBe(0)
    expect(git(join(f.main, 'engine'), 'status', '--porcelain', '--', TIMEOUTS_FILE)).toBe('')
    expect(git(join(f.main, 'engine'), 'log', '-1', '--name-only', '--format=')).toContain('.state/timed-out-twice.jsonl')
    // fixed by an item, it leaves the list
    const fixed = suites(f, ['--timeout-fixed', 'kingdom', 'test/k.test.ts > slow', 'fix.the-slow-test'])
    expect(fixed.status, fixed.stdout + fixed.stderr).toBe(0)
    expect(suites(f, ['--timeouts']).stdout).toMatch(/no test is on the time-out list/)
    expect(suites(f, ['--timeout-fixed', 'kingdom', 'test/k.test.ts > never-listed', 'fix.x']).status).toBe(1)
    clearRan(f)
  }, LONG)
})

// ── 4. a wrap and a landing refuse only when no scheduled run is recorded in the last day ──
describe('wrap says what the last scheduled run found, and refuses only when there is none in the last day', () => {
  const WRAP = ['tools/wrap.mjs', 'an item — an epic. Tried: it. Next: the next.', '--next', 'New chat with Heroes of Blight and Tragic — engine: the next item', 'start engine']
  const wrap = (f: Scratch) => node(f, join(f.main, 'engine'), {}, ...WRAP)
  const NOW = (f: Scratch) => join(f.main, 'engine', '.state', 'now.json')

  it('none recorded: refused, naming the run to make; nothing is written', () => {
    const f = makeScratch()
    const r = wrap(f)
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/wrap: no scheduled run of the whole suites is recorded — none in the last 24 hours\./)
    expect(r.stderr).toMatch(/from engine\/, node tools\/suites\.mjs --run all --full/)
    expect(existsSync(NOW(f))).toBe(false)
  }, LONG)

  it('one over a day old: refused, and the old run is named', async () => {
    const f = makeScratch()
    await recordScheduled(f.main, { hoursAgo: 30 })
    const r = wrap(f)
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/wrap: the last scheduled run of the whole suites: \d{4}-\d\d-\d\d \d\d:\d\d, in main — content PASS · kingdom PASS · engine PASS · viewer PASS — 30 hours ago, over 24 — none in the last 24 hours\./)
    expect(existsSync(NOW(f))).toBe(false)
  }, LONG)

  it('one under a day old: not refused — though code changed since, no suite passed on this exact code, and the run found a failure', async () => {
    const f = makeScratch()
    await recordScheduled(f.main, { hoursAgo: 5, failed: { viewer: [{ name: 'part verify 2/4', timedOut: false }] } })
    appendFileSync(join(f.main, 'kingdom', 'src', 'core', 'week.ts'), 'export const later = 3\n')   // code no suite has run on
    expect(suites(f, ['--full-green']).status).toBe(1)                                                 // what wrap asked for until 2026-10-06
    const r = wrap(f)
    expect(r.stderr).not.toMatch(/scheduled run/)
    expect(r.stdout).toMatch(/^suites  the last scheduled run of the whole suites: \d{4}-\d\d-\d\d \d\d:\d\d, in main — content PASS · kingdom PASS · engine PASS · viewer FAIL \(part verify 2\/4\) — not run at a wrap$/m)
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(JSON.parse(readFileSync(NOW(f), 'utf8'))).toMatchObject({ by: 'wrap', committed: true })
    expect(wholeSuitesRun(f)).toEqual([])
  }, LONG)

  it('wrap asks that and nothing about the exact code', () => {
    const src = readFileSync(join(TOOLS, 'wrap.mjs'), 'utf8')
    expect(src).toMatch(/const whole = scheduledNow\(\)/)
    expect(src).toMatch(/if \(whole\.due\) fail\(/)
    expect(src).not.toMatch(/fullGreenNow\(|--shards-green/)
  })
})

describe("the engine's gate lands an item without a whole-suite pass, and refuses only when no scheduled run is recorded in the last day", () => {
  let f: Scratch, engine: string
  const gate = (...args: string[]) => node(f, engine, {}, 'tools/gate.mjs', ...args)
  const item = () => (JSON.parse(readFileSync(join(engine, '.state', 'backlog.engine.json'), 'utf8')) as Array<Record<string, unknown>>).find((x) => x.id === 'tool.a-thing')!
  beforeAll(() => {
    f = makeScratch()
    engine = join(f.main, 'engine')
    put(join(f.base, 'spec.json'), JSON.stringify({ id: 'tool.a-thing', kind: 'engine', shape: 'plumbing', spec: 'A thing the tools do.', expect: 'It does it.' }))
    const added = node(f, engine, {}, 'tools/add-item.mjs', join(f.base, 'spec.json'))
    expect(added.status, added.stdout + added.stderr).toBe(0)
    commitAll(engine, 'the queue: tool.a-thing is filed')
    // the item's work, uncommitted: a tool and its own test
    put(join(engine, 'tools', 'a-thing.mjs'), 'export const thing = 1\n')
    put(join(engine, 'test', 'a-thing.test.ts'), '// its own test\n')
  }, LONG)

  it('checked with no scheduled run recorded: every gate passes, and the line says a landing will refuse — SKIPPED, never PASS', () => {
    const r = gate('tool.a-thing')
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(r.stdout).toMatch(/All gates pass/)
    expect(r.stdout).toMatch(/SKIPPED  the whole suites — a scheduled run in the last day  — NOT RUN HERE, and no scheduled run of the whole suites is recorded — none in the last 24 hours: a landing \(--land\) refuses until the lander has run it/)
    expect(r.stdout).not.toMatch(/PASS  the whole suites/)
  }, LONG)

  it('landed with none recorded: refused, naming it; nothing is committed and no attempt is counted', () => {
    const before = git(engine, 'rev-parse', 'HEAD')
    const r = gate('tool.a-thing', '--land')
    expect(r.status).toBe(1)
    expect(r.stdout).toMatch(/NOT LANDED: no scheduled run of the whole suites is recorded — none in the last 24 hours\. The lander runs the whole suites, alone on the machine, from engine\/:  node tools\/suites\.mjs --run all --full/)
    expect(git(engine, 'rev-parse', 'HEAD')).toBe(before)
    expect(item().status).toBeUndefined()
    expect(item().attempts).toBeUndefined()
  }, LONG)

  it('landed with one under a day old: it lands on the quick check — typecheck, its own test, the control battles — and no whole suite runs', async () => {
    await recordScheduled(f.main, { hoursAgo: 3 })
    const r = gate('tool.a-thing', '--land')
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(r.stdout).toMatch(/LANDED as [0-9a-f]{7}/)
    // (the checks themselves ran at the first call above, on this same tree, and are replayed from the gate's record)
    expect(r.stdout).toMatch(/PASS \(recorded\)  typecheck/)
    expect(r.stdout).toMatch(/SKIPPED  the whole suites — a scheduled run in the last day  — not run at a landing — the last scheduled run of the whole suites: \d{4}-\d\d-\d\d \d\d:\d\d, in main — content PASS · kingdom PASS · engine PASS · viewer PASS/)
    expect(item().status).toBe('done')
    // everything that ran for this item, over the three calls: the quick check, and no whole suite
    expect(wholeSuitesRun(f)).toEqual([])
    expect(ranNames(f)).toEqual(['baseline', 'tests-engine', 'typecheck-engine'])
    // the landing's record says the suites were not run, and when they last were
    expect(readFileSync(join(engine, '.state', 'ledger.md'), 'utf8')).toMatch(/SKIPPED  the whole suites — a scheduled run in the last day — not run at a landing — the last scheduled run of the whole suites: /)
    const logged = readFileSync(join(engine, '.state', 'gauntlet-log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { disposition: string; checks: Array<{ name: string; ok: boolean; skipped?: boolean }> })
    expect(logged.map((l) => l.disposition)).toEqual(['check-passed', 'refused-no-scheduled-run', 'landed'])
    expect(logged.at(-1)!.checks.find((c) => c.name === 'the whole suites — a scheduled run in the last day')).toMatchObject({ ok: false, skipped: true })
  }, LONG)
})
