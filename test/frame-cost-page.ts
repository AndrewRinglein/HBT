// ONE run of tools/frame-cost.mjs in real Chrome for every test file that reads it (2026-10-05, found landing
// viewer.map-drag-and-keys: four test files each built a sandbox page of their own and each opened real Chrome on it — the
// frame-cost tool's own test, the see-through check's, the kept shadow's and the still frame's — and the gate's checks run
// its test files side by side, so four page builds and four browsers measured frame times at once: the Bridge's run passed
// its 280 s limit twice running). The first file to ask builds one sandbox page from the sources and runs the tool once on
// the battles any of them reads, 60 frames a number; the others wait for that run's result and read it. What each file
// asserts of its rows is unchanged.
// Not a test file. Used by test/viewer.frame-cost-measured.test.ts, test/viewer.see-through-only-when-moved.test.ts,
// test/viewer.scenery-shadow-drawn-once.test.ts, test/viewer.still-frame-draws-nothing.test.ts,
// test/viewer.solid-pieces-drawn-by-material.test.ts and test/viewer.foliage-drawn-once.test.ts.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'

const DIR = '.build', OUT = `${DIR}/frame-cost-page.json`, LOCK = `${DIR}/frame-cost-page.lock`
/** the page the run is made on: a sandbox built from these sources (the kingdom's committed page is rebuilt only after the viewer's gate) */
export const FRAME_COST_PAGE = 'kingdom/scratch/frame-cost-page.html'
/** the battles any of the files reads: two foliage scenes, the lightest scene, and the one whose fog and fires move */
export const FRAME_COST_BATTLES = ['encounter.opening.orphanage', 'encounter.opening.lumberjack', 'encounter.opening.bridge', 'encounter.caravan-aftermath']
/** how long a file may wait for the run (its own, or another file's): the limit to give a test or a beforeAll that asks */
export const FRAME_COST_WAIT_MS = 1_500_000
export type FrameCost<Row> = { page: string; window: { w: number; h: number }; frames: number; software: boolean; rows: Row[] }

const sleep = (ms: number) => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms) }
/* every file of one vitest run is a child of the same process: that is the run a result belongs to */
const RUN = String(process.ppid)

/** the tool's result on the page built from these sources — made once a run, whichever file asks first */
export function frameCostOnThePage<Row>(): FrameCost<Row> {
  mkdirSync(DIR, { recursive: true })
  const have = (): FrameCost<Row> | null => { try { const j = JSON.parse(readFileSync(OUT, 'utf8')) as { run: string; at: number; result: FrameCost<Row> }
    return j.run === RUN && Date.now() - j.at < 3_600_000 ? j.result : null } catch { return null } }
  for (let waited = 0; waited < FRAME_COST_WAIT_MS - 60_000; waited += 2000) {
    const got = have(); if (got) return got
    let mine = false
    try { mkdirSync(LOCK); mine = true } catch {
      /* another file of this run is making it — or a run that died left its lock behind */
      try { if (Date.now() - statSync(LOCK).mtimeMs > 25 * 60_000) rmSync(LOCK, { recursive: true, force: true }) } catch { /* gone already */ } }
    if (!mine) { sleep(2000); continue }
    try {
      const again = have(); if (again) return again
      mkdirSync('../kingdom/scratch', { recursive: true })
      execFileSync(process.execPath, ['tools/build-sandbox.mjs', FRAME_COST_PAGE.replace(/^kingdom\//, '')], { cwd: '../kingdom', stdio: 'pipe' })
      /* (viewer.pixel-compare-tests-hold-against-frame-noise, 2026-10-06: the tool leaves with a failure when a battle could not be
         measured, and says which and why in what it printed — until now that was thrown away and a red read only "Command failed") */
      let out: string
      try { out = execFileSync(process.execPath, ['tools/frame-cost.mjs', ...FRAME_COST_BATTLES, '--frames', '60', '--json', '--page', '../' + FRAME_COST_PAGE], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 26, timeout: 1_200_000 }) }
      catch (e) { const said = String((e as { stdout?: unknown }).stdout ?? ''), err = String((e as { stderr?: unknown }).stderr ?? '').trim()
        const notes = [...said.matchAll(/"battle": "([^"]+)",\s*"flat": true,\s*"note": "((?:[^"\\]|\\.)*)"/g)].map((m) => m[1] + ' — ' + m[2])
        throw new Error('frame-cost on the page: the tool did not measure every battle: ' + (notes.join(' · ') || String((e as Error).message).split('\n')[0]) + (err ? ' [' + err.slice(-400) + ']' : '')) }
      const result = JSON.parse(out) as FrameCost<Row>
      writeFileSync(OUT, JSON.stringify({ run: RUN, at: Date.now(), result }))
      return result
    } finally { rmSync(LOCK, { recursive: true, force: true }) }
  }
  throw new Error('frame-cost on the page: no result within ' + Math.round(FRAME_COST_WAIT_MS / 60_000) + ' minutes')
}
/** one battle's row of a result, by its encounter id */
export function rowOf<Row extends { battle: string }>(got: FrameCost<Row>, battle: string): Row {
  const r = got.rows.find((x) => x.battle === battle); if (!r) throw new Error('frame-cost on the page: no row for ' + battle); return r
}
