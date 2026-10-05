// viewer.see-through-only-when-moved (engine backlog; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: the
// speed first; …' — Andrew: "I want this to feel smooth like a AAA game."). The rule that draws see-through whatever hides a
// character (2026-10-01: "Anything blocking the view of a character is highly translucent" — kept exactly as it looks) was the
// largest cost on the battle screen: about 100 ms a run on the Orphanage, every 120 ms for the whole battle whether or not
// anything moved. Expect: "On the Orphanage with nothing moving, frame-cost's script ms with the see-through check and without
// it read the same, and a test counting the check's runs over 60 still frames reads none after the first; while the view
// scrolls one run is under 4 ms on every opening battle; a test holds a fixed camera and bodies on the Orphanage and on the
// Lumberjack House and reads the same set of faded pieces before the change and after".
// The sources' half — the runs counted frame by frame over 60 still frames, the structure against three's own raycast over
// 300 made scenes — is ../viewer/tools/see-through-only-when-moved.test.mjs (run here). The page's half is the frame-cost
// tool in real Chrome on a sandbox page built here from these sources (as test/viewer.no-hex-focus-border.test.ts builds its
// own: the kingdom's committed page is rebuilt only after the viewer's gate): the Orphanage and the Lumberjack House, their
// real scenes and bodies.
// Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { frameCostOnThePage, rowOf, FRAME_COST_WAIT_MS } from './frame-cost-page.js'

type Ms = { median: number; min: number; max: number }
type Measure = { frames: number; ms: Ms; checks?: number }
type Row = { battle: string; flat?: boolean; note?: string; still: { withCheck: Measure; withoutCheck: Measure }; scrolling: { withCheck: Measure; withoutCheck: Measure }
  seeThrough?: { views: number; same: number; withSomethingHiding: number; ms: { median: number; max: number }; plainMs: { median: number; max: number } }; pageErrors?: string[] }

describe('viewer.see-through-only-when-moved', () => {
  it('the sources: the check runs only when the camera or a standing body changed; the structure names the pieces three\'s raycast over every triangle names', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/see-through-only-when-moved.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 6/); expect(out).toMatch(/# fail 0/)
  }, 170000)

  it('the built page, the Orphanage and the Lumberjack House: no check over 60 still frames; a still frame costs the same with the check due as without; one check under 4 ms; the same pieces as every triangle finds, at every view of a round', () => {
    // LAW 10 — 2026-10-05 (found landing viewer.map-drag-and-keys; test/frame-cost-page.ts says why): this file ran the tool by
    // itself —
    //   mkdirSync('../kingdom/scratch', { recursive: true })
    //   execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/see-through-only-when-moved.html'], { cwd: '../kingdom', stdio: 'pipe' })
    //   const out = execFileSync(process.execPath, ['tools/frame-cost.mjs', 'orphanage', 'lumberjack', '--frames', '60', '--json', '--page', …], { …, timeout: 560000 })
    //   const rows = (JSON.parse(out) as { rows: Row[] }).rows
    // — as three other test files did, each on a page of its own, all at once in the gate's checks. The tool is now run ONCE
    // a test run, on one sandbox page built from the sources, for every file that reads it; this file reads its rows of
    // that result. Every assertion on those rows below stands as written.
    const got = frameCostOnThePage<Row>(), rows = [rowOf(got, 'encounter.opening.orphanage'), rowOf(got, 'encounter.opening.lumberjack')]
    expect(rows.map((r) => r.battle)).toEqual(['encounter.opening.orphanage', 'encounter.opening.lumberjack'])
    for (const r of rows) {
      const at = r.battle
      expect(r.flat, `${at}: ${r.note}`).toBeFalsy(); expect(r.pageErrors ?? [], at).toEqual([])
      // (1) nothing moving: the check does not run — 60 frames, each long enough after the last for it to fall due
      expect(r.still.withCheck.frames, at).toBeGreaterThanOrEqual(60)
      expect(r.still.withCheck.checks, `${at}: the check's runs over 60 still frames`).toBe(0)
      expect(r.still.withoutCheck.checks, at).toBe(0)
      // so a still frame costs the same whether or not the check was due (the same within the run-to-run spread of one frame)
      const a = r.still.withCheck.ms.median, b = r.still.withoutCheck.ms.median
      expect(Math.abs(a - b), `${at}: a still frame with the check due ${a} ms, without ${b} ms`).toBeLessThanOrEqual(Math.max(4, .5 * Math.max(a, b)))
      // LAW 10 — 2026-10-05 (found landing viewer.still-frame-draws-nothing): this read
      //   expect(a, `${at}: and nowhere near the 54–90 ms it was`).toBeLessThan(45)
      // — a number of milliseconds, which measures the machine as much as the page: beside three other real-browser tests in
      // the gate's checks the Lumberjack House's still frame read 60.8 ms with the check NOT running (0 runs counted, and the
      // frame without the check as slow). The claim is that the still frame no longer carries the check's cost, and it is
      // held against that cost as measured in the same run, under the same load (one check the old way: every triangle of
      // every tall piece): what the frame costs with the check due, over what it costs without, is a small part of it.
      expect(a - b, `${at}: a still frame with the check due costs ${a} ms, without ${b} ms — the old check alone was ${r.seeThrough!.plainMs.median} ms`).toBeLessThan(Math.max(4, r.seeThrough!.plainMs.median / 2))
      // while the view scrolls the check does run — the camera moves on every frame
      expect(r.scrolling.withCheck.checks!, `${at}: while scrolling`).toBeGreaterThan(30)
      // (2) one run costs under 4 ms
      expect(r.seeThrough, `${at}: the page says what a check finds`).toBeTruthy()
      expect(r.seeThrough!.ms.median, `${at}: one check, ms`).toBeLessThan(4)
      // (3) what is drawn see-through is unchanged: at every view of the round — four quarters, scrolled at each — the pieces
      // hiding a body are the pieces the rule as first written finds (every triangle of every tall piece)
      expect(r.seeThrough!.views, at).toBeGreaterThanOrEqual(30)
      expect(r.seeThrough!.same, `${at}: views where both name the same pieces`).toBe(r.seeThrough!.views)
      expect(r.seeThrough!.withSomethingHiding, `${at}: and many of those views have a piece in the way — the two are not agreeing about nothing`).toBeGreaterThanOrEqual(r.seeThrough!.views / 4)
    }
  }, FRAME_COST_WAIT_MS)
})
