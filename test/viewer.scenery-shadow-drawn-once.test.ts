// viewer.scenery-shadow-drawn-once (engine backlog; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: the
// speed first; …'). The sun's shadow map (4096x4096) was drawn again, whole, on every drawn frame: on the Orphanage 916 draw
// calls and 3.06 million triangles a frame, though the scenery never moves and only the bodies do. Ruled 2026-10-03 'shadows
// are kept' — kept. Expect: "frame-cost's shadow-pass column on the Orphanage reads only the bodies' draw calls on a frame
// where a body animates, and none on a still frame, where it read 916; the shadows look reads as before …; a body walked
// under the Orphanage's tree is shaded as before".
// The sources' half — which objects cast in each pass, what the map is started from, when no pass is made — is
// ../viewer/tools/scenery-shadow-drawn-once.test.mjs (run here). The page's half is the frame-cost tool in real Chrome on a
// sandbox page built here from these sources: the Orphanage's real scene and bodies, and the same frame drawn both ways —
// the scenery's shadow kept, then the shadow whole as it was first written — with every pixel of both canvases compared.
// Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { frameCostOnThePage, rowOf, FRAME_COST_WAIT_MS } from './frame-cost-page.js'

type Pass = { all: number; shadow: number; scene: number; bodies: number }
type Measure = { frames: number; draws: Pass; triangles: Pass }
type Row = { battle: string; flat?: boolean; note?: string; still: { withCheck: Measure; withoutCheck: Measure }; scrolling: { withCheck: Measure; withoutCheck: Measure }; held: Measure
  shadow?: { views: number; same: number; pixels: number; drawn: number; bodies: number; differing: number; worst: number; sameWay: number; blendedNoise: number; sceneryShadowDrawn: number }; pageErrors?: string[] }

describe('viewer.scenery-shadow-drawn-once', () => {
  it('the sources: the scenery\'s shadow is drawn once and kept, the bodies\' over it when a body moved, none when nothing moved', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/scenery-shadow-drawn-once.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)

  it('the built page, the Orphanage: the shadow pass draws only the bodies on a frame where a body animates and nothing on a still frame, where it drew 916; the picture is the same, pixel for pixel, as with the shadow whole', () => {
    // LAW 10 — 2026-10-05 (found landing viewer.map-drag-and-keys; test/frame-cost-page.ts says why): this file ran the tool by
    // itself —
    //   mkdirSync('../kingdom/scratch', { recursive: true })
    //   execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/scenery-shadow-drawn-once.html'], { cwd: '../kingdom', stdio: 'pipe' })
    //   const out = execFileSync(process.execPath, ['tools/frame-cost.mjs', 'orphanage', '--json', '--page', …], { …, timeout: 400000 })
    //   const r = (JSON.parse(out) as { rows: Row[] }).rows[0]!
    // — as three other test files did, each on a page of its own, all at once in the gate's checks. The tool is now run ONCE
    // a test run, on one sandbox page built from the sources, for every file that reads it; this file reads its rows of
    // that result. Every assertion on those rows below stands as written.
    const r = rowOf(frameCostOnThePage<Row>(), 'encounter.opening.orphanage')
    expect(r.battle).toBe('encounter.opening.orphanage')
    expect(r.flat, r.note).toBeFalsy(); expect(r.pageErrors ?? []).toEqual([])
    // a frame where a body animates (the bodies idle where they stand): the bodies' shadows, and only theirs. The scenery's
    // shadow was 916 draw calls of every such frame; the bodies' own canvas draws the bodies in under 60.
    for (const m of [r.still.withCheck, r.still.withoutCheck, r.scrolling.withoutCheck]) {
      expect(m.draws.shadow, 'the shadow pass, bodies animating').toBeGreaterThan(0)
      expect(m.draws.shadow, 'the shadow pass, bodies animating: the bodies alone').toBeLessThan(120)
      expect(m.triangles.shadow, 'and their triangles (about a million: the bodies are fine models), not the scenery\'s 3 million more').toBeLessThan(1800000)
    }
    // a still frame — the clock held, nothing animating: no shadow drawn at all
    expect(r.held.frames).toBeGreaterThanOrEqual(30)
    expect(r.held.draws.shadow, 'the shadow pass on a still frame').toBe(0)
    expect(r.held.triangles.shadow).toBe(0)
    // the picture: at every view of a round (four quarters, scrolled at each) the frame drawn with the shadow kept is the
    // frame drawn with the shadow whole — every pixel of the scene's canvas and of the bodies'
    expect(r.shadow, 'the page says how the shadow is kept').toBeTruthy()
    expect(r.shadow!.views).toBeGreaterThanOrEqual(8)
    expect(r.shadow!.drawn, 'the pictures compared are drawn ones').toBeGreaterThan(r.shadow!.pixels / 10)
    expect(r.shadow!.bodies, 'bodies, and so their shadows, are in every view compared').toBeGreaterThan(1000)
    // "The same": of the two million pixels at most a handful differ, and by one shade of 255 — no more than differ between
    // two frames drawn the SAME way (the tool draws those too: a dozen pixels by one shade, with the scene's blended pieces
    // left out of the picture; with them in, thousands — viewer SWITCHES blendedPiecesShimmer). A shadow drawn wrong moves
    // whole edges by tens of shades.
    expect(r.shadow!.worst, 'the most any pixel differs, of 255').toBeLessThanOrEqual(2)
    expect(r.shadow!.differing, `pixels that differ at the worst view, of ${r.shadow!.pixels} (two frames drawn the same way: ${r.shadow!.sameWay})`).toBeLessThanOrEqual(Math.max(40, 3 * r.shadow!.sameWay))
    expect(r.shadow!.same, 'and some views are the same in every pixel').toBeGreaterThan(0)
  }, FRAME_COST_WAIT_MS)
})
