// viewer.foliage-drawn-once (engine backlog; the chat's call 2026-10-05, engine DECISIONS.md 2026-10-05 'the computer avoids its
// own traps; W moves the view up; the Wolf's numbers stand; the player moves the summoned Wolf; the foliage is tried the smallest
// way'). Expect: "With the switch on, each two-sided blended foliage piece issues one draw call where it issued two (the
// Orphanage's foliage calls halve); with the switch off the page is pixel for pixel what it was (0 differing pixels on all six
// battles); the report gives, per battle, draw calls and same-run frame-time ratio before and after and the count and size of
// the pixel difference; the nine before-and-after pairs exist in both folders; a hidden character's foliage still fades
// see-through at 32 of 32 views; a held frame still issues 0 draw calls."
// The sources' half — which pieces are the foliage, that nothing else is touched, the one word of the switch, that switched
// off no material differs from what three made, that a faded piece follows the switch — is
// ../viewer/tools/foliage-drawn-once.test.mjs (run here). The page's half is the frame-cost tool in real Chrome on the sandbox
// page built from these sources (one run for every frame test: test/frame-cost-page.ts): the same still view measured with the
// foliage drawn once and drawn twice as before, frames of the two ways taken turn about, and at every view of a round both
// ways drawn and every pixel compared. COUNTS AND SAME-RUN RATIOS ONLY are asserted here — draw calls, pieces, pixels, the
// ratio of two medians taken turn about — never a time (viewer.frame-time-tests-hold-under-load). The six battles' own numbers
// and the nine pairs of pictures are in the landing note (the tools run by hand); the run here is on the four battles the
// frame tests share. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { frameCostOnThePage, rowOf, FRAME_COST_BATTLES, FRAME_COST_WAIT_MS } from './frame-cost-page.js'

type Pass = { all: number; shadow: number; scene: number; bodies: number; many?: number; inMany?: number }
type Measure = { frames: number; draws: Pass; triangles: Pass }
type Row = { battle: string; flat?: boolean; note?: string; still: { withCheck: Measure; withoutCheck: Measure }; held: Measure
  foliage?: { pieces: number; materials: number; once: boolean; inSight: number }
  foliageWays?: { once: Measure; twice: Measure; paired: { pairs: number; ratio: number } }
  seeThrough?: { views: number; same: number; withSomethingHiding: number; fadedAlone?: number }
  shadow?: { views: number; pixels: number; differing: number; worst: number; sameWay: number; blendedNoise: number
    foliage?: { views: number; inSight: number; differing: number; least: number; worst: number; over16: number; onceAgain: number; onceAgainWorst: number; onceAgainOver16: number; twiceAgain: number; twiceAgainWorst: number; twiceAgainOver16: number } }; pageErrors?: string[] }
/** the battles of the shared run whose scenes are mostly foliage */
const LEAFY = ['encounter.opening.orphanage', 'encounter.opening.lumberjack', 'encounter.caravan-aftermath']

describe('viewer.foliage-drawn-once', () => {
  it('the sources: which pieces are the foliage and that nothing else is touched; the switch is one word, on for the try; switched off no material differs from what it was; a faded piece still fades alone and follows the switch', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/foliage-drawn-once.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)

  it('the built page: with the switch on each foliage piece in sight issues ONE draw call where it issued two — the scene\'s pass makes exactly that many fewer, the Orphanage\'s foliage calls halve', () => {
    const got = frameCostOnThePage<Row>()
    for (const battle of FRAME_COST_BATTLES) {
      const r = rowOf(got, battle), at = battle.replace(/^encounter\.(opening\.)?/, '')
      expect(r.flat, r.note).toBeFalsy(); expect(r.pageErrors ?? [], at).toEqual([])
      expect(r.foliage, at + ': the page says how its foliage is drawn').toBeTruthy()
      const f = r.foliage!, w = r.foliageWays!
      expect(f.once, at + ': the switch is on for the try').toBe(true)
      expect(f.inSight, at).toBeLessThanOrEqual(f.pieces)
      expect(w, at + ': the tool measured the still view both ways').toBeTruthy()
      /* the same still view, the same run: drawn twice, every foliage piece in sight is two calls of the scene's pass; drawn
         once, one — so the pass makes exactly as many fewer calls as there are foliage pieces in sight (the page counts them
         by three's own rule for what a pass draws). Nothing else in the frame changes: the shadow's pass is the same. */
      expect(w.twice.draws.scene - w.once.draws.scene, at + ': draw calls saved in the scene\'s pass, against the foliage pieces in sight').toBe(f.inSight)
      expect(w.once.draws.shadow, at + ': the shadow\'s pass is not touched').toBe(w.twice.draws.shadow)
      /* and the frames the tool measures first — the page as it opens, the switch as built — are "once" frames, not "twice" ones */
      if (f.inSight > 0) expect(r.still.withoutCheck.draws.scene, at + ': the page as built draws its foliage once').toBeLessThan(w.twice.draws.scene)
      /* drawn twice the card was handed every foliage triangle twice (once to draw its back faces, once its front) */
      if (f.inSight > 0) expect(w.twice.triangles.scene, at + ': triangles handed over').toBeGreaterThan(w.once.triangles.scene)
      else expect(w.twice.triangles.scene, at).toBe(w.once.triangles.scene)
    }
    for (const battle of LEAFY) { const r = rowOf(got, battle), f = r.foliage!, w = r.foliageWays!
      expect(f.pieces, battle + ': foliage pieces').toBeGreaterThan(500); expect(f.inSight, battle + ': in the opening view\'s sight').toBeGreaterThan(50)
      /* the foliage's own calls halve: what the scene's pass draws besides is the same both ways, so twice the pieces in sight became once */
      expect((w.twice.draws.scene - w.once.draws.scene) * 2, battle + ': the foliage\'s calls drawn twice').toBe(f.inSight * 2)
      expect(w.once.draws.all, battle + ': a frame\'s draw calls, the bodies idling').toBeLessThan(w.twice.draws.all - f.inSight / 2) }
    /* the Orphanage: 857 foliage pieces (viewer SWITCHES fewCallsFoliage); 700 draw calls a frame before this item */
    const o = rowOf(got, 'encounter.opening.orphanage')
    expect(o.foliage!.pieces, 'the Orphanage: two-sided blended pieces').toBeGreaterThanOrEqual(857)
    expect(o.still.withoutCheck.draws.all, 'the Orphanage, bodies idling: draw calls a frame (700 before)').toBeLessThan(600)
  }, FRAME_COST_WAIT_MS)

  it('the built page: the two ways drawn at every view of a round and every pixel compared — the tool gives the count and the size of the difference, beside what two frames drawn the same way differ by', () => {
    const got = frameCostOnThePage<Row>()
    for (const battle of FRAME_COST_BATTLES) {
      const r = rowOf(got, battle), at = battle.replace(/^encounter\.(opening\.)?/, '')
      expect(r.shadow?.foliage, at + ': the tool drew the views both ways').toBeTruthy()
      const p = r.shadow!.foliage!
      expect(p.views, at).toBeGreaterThanOrEqual(8)
      for (const k of ['differing', 'least', 'worst', 'over16', 'onceAgain', 'twiceAgain'] as const) { expect(Number.isInteger(p[k]), at + ': ' + k).toBe(true); expect(p[k], at + ': ' + k).toBeGreaterThanOrEqual(0) }
      expect(p.differing, at).toBeLessThanOrEqual(r.shadow!.pixels); expect(p.least, at).toBeLessThanOrEqual(p.differing); expect(p.over16, at).toBeLessThanOrEqual(p.differing); expect(p.worst, at).toBeLessThanOrEqual(255)
      /* a scene with no foliage: nothing is drawn another way, so nothing differs beyond what two frames of one way do (a frame's
         own noise is by one shade, a blended piece's shimmer by two — viewer SWITCHES frameNoiseOneShade, blendedPiecesShimmer) */
      if (r.foliage!.pieces === 0) { expect(p.inSight, at).toBe(0); expect(p.over16, at + ': no foliage, no difference the eye can find').toBe(0); expect(p.worst, at).toBeLessThanOrEqual(2) }
    }
    /* where there is foliage the switch does change pixels — only where a piece's own leaves overlap each other: a part of the picture, never most of it */
    for (const battle of LEAFY) { const r = rowOf(got, battle), p = r.shadow!.foliage!
      expect(p.differing, battle + ': pixels the two ways differ by').toBeGreaterThan(0)
      expect(p.differing, battle + ': never most of the picture').toBeLessThan(r.shadow!.pixels / 2) }
  }, FRAME_COST_WAIT_MS)

  it('the built page: a piece hiding a character still fades see-through by itself at every view, and a held frame still issues no draw call', () => {
    const got = frameCostOnThePage<Row>()
    for (const battle of FRAME_COST_BATTLES) {
      const r = rowOf(got, battle), at = battle.replace(/^encounter\.(opening\.)?/, '')
      expect(r.seeThrough!.views, at).toBeGreaterThanOrEqual(32)
      expect(r.seeThrough!.same, at + ': the see-through check\'s answer at every view').toBe(r.seeThrough!.views)
      expect(r.seeThrough!.fadedAlone, at + ': views in which every faded piece is drawn by itself').toBe(r.seeThrough!.views)
    }
    expect(FRAME_COST_BATTLES.some((id) => rowOf(got, id).seeThrough!.withSomethingHiding > 0), 'a view with a piece in the way of a character').toBe(true)
    for (const battle of ['encounter.opening.orphanage', 'encounter.opening.lumberjack', 'encounter.opening.bridge']) {
      const r = rowOf(got, battle)
      expect(r.held.frames).toBeGreaterThanOrEqual(30)
      expect(r.held.draws.all, battle + ': draw calls with the clock held').toBe(0)
    }
  }, FRAME_COST_WAIT_MS)

  it('the built page: frames of the two ways taken turn about in the same run — drawn once a frame\'s script costs less than drawn twice', () => {
    const got = frameCostOnThePage<Row>()
    for (const battle of LEAFY) { const p = rowOf(got, battle).foliageWays!.paired
      expect(p.pairs, battle).toBeGreaterThanOrEqual(30)
      /* a ratio of two medians of the same run, the frames turn about: load moves both alike (measured: .45 the Orphanage,
         .33 the Lumberjack House, .62 the Caravan Aftermath) */
      expect(p.ratio, battle + ': script time drawn once, as a part of drawn twice').toBeLessThan(.9) }
  }, FRAME_COST_WAIT_MS)

  it('no time is asserted here: the proof is counts, and one ratio of the same run', () => {
    /* every assertion above this test: what it is made of (the first argument of each expect) reads no time the tool measured */
    const all = readFileSync('test/viewer.foliage-drawn-once.test.ts', 'utf8'), above = all.slice(0, all.indexOf('it(\'no time is asserted here'))
    const src = above.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
    const subjects = [...src.matchAll(/expect\(\s*([^,)]+)/g)].map((m) => m[1]!)
    expect(subjects.length).toBeGreaterThan(20)
    const aTime = new RegExp('\\bm' + 's\\b|M' + 's\\b|loadM')
    for (const s of subjects) expect(aTime.test(s), 'a time in an assertion: ' + s).toBe(false)
  })
})
