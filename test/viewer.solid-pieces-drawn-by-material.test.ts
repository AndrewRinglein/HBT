// viewer.solid-pieces-drawn-by-material (engine backlog; split out of viewer.scene-drawn-in-few-calls by the home chat 2026-10-05;
// engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: the speed first; …'). Expect: "The frame-cost tool's two-way
// compare finds 0 differing pixels on each of the six 3D battles against the page before this item (the shimmer already
// recorded as blendedPiecesShimmer excepted and measured the same way before and after); the Orphanage's draw calls with
// bodies idling fall well below the 1,139 measured before (the worker's estimate is about 700 - say the number reached); a
// piece hiding a character still fades see-through by itself at the same 32 of 32 views; a held frame still issues 0 draw
// calls; the six battles' page verifies pass unchanged; the report gives each battle's added load time."
// The sources' half — which pieces go into which batch, the numbers a batch hands the graphics card, the order it draws in,
// the shader's text, what each pass draws — is ../viewer/tools/solid-pieces-drawn-by-material.test.mjs (run here). The page's
// half is the frame-cost tool in real Chrome on the sandbox page built from these sources (one run for every frame test:
// test/frame-cost-page.ts): at every view of a round the frame is drawn with the solid pieces batched, then with each piece
// by itself as first written, and every pixel of both canvases compared. COUNTS ONLY are asserted here — draw calls, pieces,
// pixels that differ — never a time (viewer.frame-time-tests-hold-under-load). The six battles' own numbers are in the
// landing note (the tool run by hand on all of them); the run here is on the four the frame tests share. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { frameCostOnThePage, rowOf, FRAME_COST_BATTLES, FRAME_COST_WAIT_MS } from './frame-cost-page.js'

type Pass = { all: number; shadow: number; scene: number; bodies: number; many?: number; inMany?: number }
type Measure = { frames: number; draws: Pass; triangles: Pass }
type Row = { battle: string; flat?: boolean; note?: string; still: { withCheck: Measure; withoutCheck: Measure }; scrolling: { withCheck: Measure; withoutCheck: Measure }; held: Measure
  eachByItself?: Measure; batches?: { batches: number; pieces: number; solid: number; ms: number }
  seeThrough?: { views: number; same: number; withSomethingHiding: number; fadedAlone?: number; withAPieceOut?: number; mostOut?: number }
  shadow?: { views: number; pixels: number; differing: number; worst: number; sameWay: number; blendedNoise: number
    batched?: { views: number; same: number; differing: number; worst: number; withAPieceOut: number; draws: number; firstPair: number; unsteady: number; unsteadyBy: number; otherUnsteady: number; otherUnsteadyBy: number } }; pageErrors?: string[] }

describe('viewer.solid-pieces-drawn-by-material', () => {
  it('the sources: which pieces share a batch; the numbers and the order a batch draws with are three\'s own for each piece; a faded piece leaves its batch; what each pass draws', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/solid-pieces-drawn-by-material.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 8/); expect(out).toMatch(/# fail 0/)
  }, 170000)

  it('the built page: on every battle the solid pieces are drawn from batches — fewer calls, the same triangles — and the picture is the same, pixel for pixel, as with each piece drawn by itself', () => {
    const got = frameCostOnThePage<Row>()
    for (const battle of FRAME_COST_BATTLES) {
      const r = rowOf(got, battle), at = battle.replace(/^encounter\.(opening\.)?/, '')
      expect(r.flat, r.note).toBeFalsy(); expect(r.pageErrors ?? [], at).toEqual([])
      /* the batches: most of the scene's solid pieces, in far fewer batches than pieces */
      expect(r.batches, at + ': the page says how its solid pieces are drawn').toBeTruthy()
      const b = r.batches!
      expect(b.batches, at).toBeGreaterThan(0); expect(b.pieces, at + ': pieces in batches').toBeGreaterThan(b.batches * 2)
      expect(b.pieces, at).toBeLessThanOrEqual(b.solid); expect(b.pieces, at + ': most of the solid pieces are in a batch').toBeGreaterThan(b.solid * .8)
      /* a frame with the bodies idling: each batch in sight is one call that draws many, and the scene's pass makes that many fewer calls */
      for (const m of [r.still.withoutCheck, r.still.withCheck, r.scrolling.withoutCheck]) {
        expect(m.draws.many, at + ': calls that draw many').toBeGreaterThan(0); expect(m.draws.many!, at).toBeLessThanOrEqual(b.batches)
        expect(m.draws.inMany!, at + ': the pieces those calls draw').toBeGreaterThan(m.draws.many!)
      }
      /* the same still frames with every piece drawn by itself, as first written, in the same run on the same view: in the
         scene's own pass the calls saved are exactly the pieces drawn in the many-in-one calls less those calls themselves,
         and the triangles drawn are the very same (a piece out of sight is drawn from its batch no more than by itself).
         (The bodies' own passes are not compared to the call: an idling body's part crosses the screen's edge now and then.) */
      const still = r.still.withoutCheck, each = r.eachByItself!
      expect(each, at + ': the tool measured the frame with each piece by itself').toBeTruthy()
      expect(each.draws.many ?? 0, at + ': drawn piece by piece there is no call that draws many').toBe(0)
      expect(each.draws.scene - still.draws.scene, at + ': draw calls the batches save in the scene\'s pass').toBe(still.draws.inMany! - still.draws.many!)
      expect(still.triangles.scene, at + ': the scene\'s pass draws the same triangles').toBe(each.triangles.scene)
      expect(still.draws.all, at + ': a frame\'s draw calls, the bodies idling').toBeLessThan(each.draws.all - (still.draws.inMany! - still.draws.many!) / 2)
      /* the picture: at every view of the round the frame drawn from the batches is the frame drawn piece by piece — every
         pixel of the scene's canvas and of the bodies'.
         viewer.pixel-compare-tests-hold-against-frame-noise (2026-10-06; it failed a gate that had not touched it three runs
         in four, by 6, 2 and 5 pixels): this read "(A frame is now and then a few pixels of one shade off its own repeat, the
         pieces batched or not — viewer SWITCHES frameNoiseOneShade — so a view whose two ways differ is drawn again by the
         tool, three times at the most: what is the batches' doing differs every time. Held: at every view the two ways were
         the same picture at one of those drawings, and no drawing was ever more than a few dozen pixels off — a batch drawn
         wrong moves whole pieces.)" and held `expect(p.most, at + ': the most any one drawing differed by (a frame\'s own
         noise: a handful of pixels)').toBeLessThanOrEqual(40)`. The handful is this machine's graphics card's own: handed the
         very same calls it gives a still frame one of a few pictures. The tool no longer draws anything again until it
         matches: at every view each way is drawn ten times, turn about, and a pixel differs only if NO batched drawing shows
         a colour that a drawing of the pieces by themselves shows there (tools/pixel-agree.mjs) — held at 0, exactly, with
         no number of pixels let through. Held with it: the drawings are as many as the tool fixes; the batched drawings of a
         view are as steady among themselves as a frame is (one shade; 2 is what the shadow's compare always allowed) — a
         fault that came and went would show there; and the card's noise is a few pixels of the picture, not a part of it. */
      expect(r.shadow?.batched, at + ': the tool drew the views both ways').toBeTruthy()
      const p = r.shadow!.batched!
      expect(p.views, at).toBeGreaterThanOrEqual(8)
      expect(p.differing, at + ': pixels that differ between the batched picture and the pieces drawn alone').toBe(0)
      expect(p.same, at).toBe(p.views)
      expect(p.worst, at).toBe(0)
      expect(p.draws, at + ': how often each way was drawn at a view').toBeGreaterThanOrEqual(10)
      expect(p.otherUnsteadyBy, at + ': the most two batched drawings of one view are apart in a pixel, of 255').toBeLessThanOrEqual(Math.max(2, p.unsteadyBy))
      expect((p.unsteady + p.otherUnsteady) * 1000, at + ': pixels the card does not colour the same every time, against the picture\'s').toBeLessThan(r.shadow!.pixels)
      /* the see-through rule: the same pieces found both ways at every view, as before; and every faded piece is out of its batch, drawn by itself */
      expect(r.seeThrough!.same, at + ': the see-through check\'s answer at every view').toBe(r.seeThrough!.views)
      expect(r.seeThrough!.views, at).toBeGreaterThanOrEqual(32)
      expect(r.seeThrough!.fadedAlone, at + ': views in which every faded piece is out of its batch and drawn by itself').toBe(r.seeThrough!.views)
    }
    /* the Orphanage: "well below the 1,139 measured before" — 700 was reached; held under 800 */
    const o = rowOf(got, 'encounter.opening.orphanage')
    expect(o.still.withoutCheck.draws.all, 'the Orphanage, bodies idling: draw calls a frame (1,139 before; 700 measured)').toBeLessThan(800)
    expect(o.batches!.pieces, 'the Orphanage: solid pieces in batches (796 of 800 measured)').toBeGreaterThan(700)
    /* a piece was in fact faded out of its batch in some view of the round, somewhere (the rule is exercised, not only stated) */
    expect(FRAME_COST_BATTLES.some((id) => (rowOf(got, id).seeThrough!.withAPieceOut ?? 0) > 0), 'a view with a piece out of its batch').toBe(true)
    expect(FRAME_COST_BATTLES.some((id) => (rowOf(got, id).shadow!.batched!.withAPieceOut ?? 0) > 0), 'and one such view compared pixel for pixel').toBe(true)
  }, FRAME_COST_WAIT_MS)

  it('the built page: a held frame still issues no draw call — nothing live, nothing drawn', () => {
    const got = frameCostOnThePage<Row>()
    for (const battle of ['encounter.opening.orphanage', 'encounter.opening.lumberjack', 'encounter.opening.bridge']) {
      const r = rowOf(got, battle)
      expect(r.held.frames).toBeGreaterThanOrEqual(30)
      expect(r.held.draws.all, battle + ': draw calls with the clock held').toBe(0)
    }
  }, FRAME_COST_WAIT_MS)

  it('no time is asserted here: the proof is counts', () => {
    /* every assertion above this test: what it is made of (the first argument of each expect) reads no time the tool measured */
    const all = readFileSync('test/viewer.solid-pieces-drawn-by-material.test.ts', 'utf8'), above = all.slice(0, all.indexOf('it(\'no time is asserted here'))
    const src = above.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
    const subjects = [...src.matchAll(/expect\(\s*([^,)]+)/g)].map((m) => m[1]!)
    expect(subjects.length).toBeGreaterThan(20)
    const aTime = new RegExp('\\bm' + 's\\b|M' + 's\\b|loadM')
    for (const s of subjects) expect(aTime.test(s), 'a time in an assertion: ' + s).toBe(false)
  })
})
