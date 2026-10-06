// viewer.screenshot-time-out-under-load (engine backlog; found twice on 2026-10-04/05 by the engine worker: in a full four-suite
// run the viewer's gate failed on `page.screenshot` timing out at 30 s in test/viewer.bar-card-and-log.test.ts, and passed when
// run alone on the same tree).
//
// The cause, measured (viewer SWITCHES.md shotStallCause): the battle screen's 3D scene draws a frame every frame, software GL
// takes seconds a frame, and the shot waits behind the frames under way and every new one. The fix is in the harness the shot
// tools now share — kingdom tools/still-shot.mjs HOLDS the page's frame loop, WAITS until the page stands still (its own
// signal: frames come back quickly once nothing is being drawn), takes the picture, and gives the loop back — with no
// assertion weakened and no limit lengthened. Held here, without opening a browser (the tools themselves run in their own
// tests, and this machine's gates take turns):
//   · the helper does what it says, on a page made by hand: frames asked for while held are kept and not run, a cancelled one
//     stays cancelled; the picture is not taken while frames are still slow, and is taken once two come back quickly; every
//     kept frame is asked for again in order afterwards; the loop is given back even when the shot fails; a page that never
//     stands still is shot at the limit and said so;
//   · EVERY screenshot the kingdom's and the viewer's tools take goes through it — none is taken directly;
//   · tools/bar-card-and-log.verify.mjs asserts everything it asserted before this item (each assertion of the commit before
//     it, kingdom ccb2dc4, is still in the tool, word for word), and no time limit in it was lengthened.
// The item's own expect — three full runs in a row — is NOT held here and was not run: it is owed to a quiet machine (ruled by
// the home chat 2026-10-05 after the PC froze under three workers' gates; viewer SWITCHES.md shotThreeFullRunsOwed).
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type Win = { requestAnimationFrame: (cb: () => void) => number; cancelAnimationFrame: (id: number) => void; __heldFrames?: unknown }
type Helper = { stillShot: (page: unknown, target: unknown, options?: unknown) => Promise<number>; holdFrames: (page: unknown) => Promise<void>; letGo: (page: unknown) => Promise<void>
  settle: (page: unknown, quick?: number, limit?: number) => Promise<{ settleMs: number; frames: number; still: boolean }>; lastStill: { settleMs: number; frames: number; still: boolean; shotMs: number }; QUICK_MS: number }
/** a page made by hand: `evaluate` runs the function against this window, as a browser would against its own; the browser's
 *  own frames come back after `gap()` ms each — slow while the frames under way are being drawn, quick once they are done */
function fakePage(gaps: number[] = []) {
  const handed: (() => void)[] = [], cancelled: number[] = []; let id = 100, served = 0
  const win: Win = { requestAnimationFrame: (cb) => { handed.push(cb); setTimeout(cb, gaps[served++] ?? 1); return ++id }, cancelAnimationFrame: (n) => { cancelled.push(n) } }
  const g = globalThis as unknown as { window?: Win }
  const page = { async evaluate<T, A>(fn: (arg: A) => T | Promise<T>, arg?: A): Promise<T> { const had = g.window; g.window = win; try { return await fn(arg as A) } finally { g.window = had } } }
  return { page, win, handed, cancelled, served: () => served }
}
/* the kingdom's tool, loaded by its place on disk (the tests run from viewer/): it lies outside this package's own tree */
const helper = async () => { const at = pathToFileURL(resolve('../kingdom/tools/still-shot.mjs')).href; return await import(/* @vite-ignore */ at) as Helper }
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms))

describe('a screenshot is taken of a still page: the frame loop is held, the page is waited on until it stands still, and the loop is given back', () => {
  it('while held, the page\'s frames are kept and not handed to the browser; a cancelled one stays cancelled; the picture is taken while held; afterwards every kept frame is asked for again, in order', async () => {
    const { stillShot } = await helper(), { page, win, handed, cancelled } = fakePage()
    const real = win.requestAnimationFrame, realCancel = win.cancelAnimationFrame
    const ran: string[] = [], mine = { a: () => { ran.push('a') }, b: () => { ran.push('b') }, c: () => { ran.push('c') } }; let during: { heldLoop: boolean; pageFramesHanded: number } | null = null
    const target = { async screenshot(options: unknown) {
      /* the page goes on asking for frames while the picture is being taken — its 3D board never stops */
      const a = win.requestAnimationFrame(mine.a), b = win.requestAnimationFrame(mine.b); win.requestAnimationFrame(mine.c)
      win.cancelAnimationFrame(b); win.cancelAnimationFrame(7)   // one of the kept ones, and one the browser was already asked for
      await tick()
      during = { heldLoop: win.requestAnimationFrame !== real, pageFramesHanded: handed.filter((cb) => Object.values(mine).includes(cb)).length }
      expect(a).toBeLessThan(0); expect(options).toEqual({ path: 'x.png' }); expect(ran).toEqual([])
    } }
    const ms = await stillShot(page, target, { path: 'x.png' })
    expect(typeof ms).toBe('number'); expect(ms).toBeGreaterThanOrEqual(0)
    expect(during, 'the picture was taken with the loop held and none of the page\'s frames handed on').toEqual({ heldLoop: true, pageFramesHanded: 0 })
    expect(cancelled, 'a cancel of a frame the browser already had goes to the browser').toEqual([7])
    expect(win.requestAnimationFrame, 'the loop is the page\'s own again, the very function').toBe(real); expect(win.cancelAnimationFrame).toBe(realCancel); expect(win.__heldFrames).toBeUndefined()
    expect(handed.filter((cb) => Object.values(mine).includes(cb)), 'the two kept frames are asked of the browser in order; the cancelled one is not').toEqual([mine.a, mine.c])
    await tick(); expect(ran).toEqual(['a', 'c'])
  })
  it('the picture waits for the page to stand still: while the browser\'s frames come back slowly it is not taken; after two quick ones in a row it is', async () => {
    const { stillShot, lastStill, QUICK_MS } = await helper()
    /* three frames still being drawn (each slower than a quick one), then quick ones */
    const slow = QUICK_MS + 60, { page, served } = fakePage([slow, slow, slow, 1, 1, 1, 1])
    let framesBeforeShot = -1
    const t0 = Date.now(), target = { async screenshot() { framesBeforeShot = served() } }
    await stillShot(page, target)
    expect(framesBeforeShot, 'the three slow frames ran out, then two quick ones, before the shot').toBe(5)
    expect(Date.now() - t0).toBeGreaterThanOrEqual(3 * slow - 30)
    expect(lastStill.still).toBe(true); expect(lastStill.frames).toBe(5); expect(lastStill.settleMs).toBeGreaterThanOrEqual(3 * slow - 30)
    /* a page that is already still: two quick frames and the shot */
    const quiet = fakePage(); let n = -1
    await stillShot(quiet.page, { async screenshot() { n = quiet.served() } }); expect(n).toBe(2); expect(lastStill.still).toBe(true)
  })
  it('a page that never stands still is shot at the limit, as it is, and the helper says it was not still', async () => {
    const { holdFrames, settle, letGo } = await helper(), { page } = fakePage(Array(200).fill(40))
    await holdFrames(page)
    const got = await settle(page, 5, 150)   // frames 40 ms apart are never "quick" at 5 ms; the wait is given 150 ms
    expect(got.still).toBe(false); expect(got.settleMs).toBeGreaterThan(150); expect(got.frames).toBeGreaterThan(2)
    await letGo(page)
  })
  it('the loop is given back when the shot fails, and the failure is the shot\'s own', async () => {
    const { stillShot } = await helper(), { page, win, handed } = fakePage(), real = win.requestAnimationFrame
    const kept = () => {}
    const target = { async screenshot() { win.requestAnimationFrame(kept); throw new Error('Timeout 30000ms exceeded') } }
    await expect(stillShot(page, target)).rejects.toThrow('Timeout 30000ms exceeded')
    expect(win.requestAnimationFrame).toBe(real); expect(win.__heldFrames).toBeUndefined(); expect(handed.filter((cb) => cb === kept).length).toBe(1)
  })
  it('held twice is held once, and let go without a hold is nothing', async () => {
    const { holdFrames, letGo } = await helper(), { page, win, handed } = fakePage(), real = win.requestAnimationFrame
    await letGo(page); expect(win.requestAnimationFrame).toBe(real); expect(handed.length, 'a page that was not held is asked for nothing').toBe(0)
    await holdFrames(page); const held = win.requestAnimationFrame; await holdFrames(page); expect(win.requestAnimationFrame).toBe(held)
    const kept = () => {}
    win.requestAnimationFrame(kept); expect(handed.length).toBe(0)
    await letGo(page); expect(win.requestAnimationFrame).toBe(real); expect(handed.filter((cb) => cb === kept).length).toBe(1)
    /* the page is handed back drawing: the helper waited for one frame of the page's own after giving the loop back */
    expect(handed.length, 'the kept frame, and the one frame the helper waited on').toBe(2)
  })
  it('every screenshot the kingdom\'s and the viewer\'s tools take goes through the helper: none is taken directly', () => {
    const direct: string[] = [], through: string[] = []
    for (const dir of ['../kingdom/tools', 'tools']) for (const f of readdirSync(dir).filter((x) => /\.m[jt]s$/.test(x))) {
      const src = readFileSync(`${dir}/${f}`, 'utf8')
      if (f === 'still-shot.mjs') continue
      if (/\.screenshot\(/.test(src)) direct.push(`${dir}/${f}`)
      if (/\bstillShot\(/.test(src)) { through.push(f); expect(src, f).toMatch(/import \{stillShot(,lastStill)?\} from '\.\/still-shot\.mjs'/) }
    }
    expect(direct, 'tools that take a screenshot directly').toEqual([])
    expect(through.sort()).toEqual(['affliction-pop-up.verify.mjs', 'area-trigger-burst.shot.mjs', 'bar-card-and-log.verify.mjs', 'bar-moves-grey-when-done.shot.mjs', 'camera-shows-edge-units.shot.mjs',
      /* viewer.foliage-drawn-once (2026-10-05): one more tool takes its pictures through the helper — the foliage's before-and-after pairs; until then the list read
         … 'characters-stand-out.verify.mjs', 'hit-slash.shot.mjs', … with no 'foliage-drawn-once.shot.mjs' between them */
      'characters-stand-out.verify.mjs', 'foliage-drawn-once.shot.mjs', 'hit-slash.shot.mjs', 'no-target-ring.shot.mjs', 'notices-gold-low-no-backdrop.verify.mjs', 'plates-banners-tooltip-gold-look.verify.mjs', 'tutorial-overlays.shot.mjs'])
  })
  it('viewer.bar-card-and-log asserts everything it asserted before: each assertion of the tool as it stood (kingdom ccb2dc4) is still in it, and no time limit in it is longer', () => {
    const now = readFileSync('../kingdom/tools/bar-card-and-log.verify.mjs', 'utf8')
    const was = execFileSync('git', ['-C', '../kingdom', 'show', 'ccb2dc4:tools/bar-card-and-log.verify.mjs'], { encoding: 'utf8', maxBuffer: 1 << 22 })
    const asserts = (s: string) => s.match(/assert\.[A-Za-z]+\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g) ?? []
    const before = asserts(was); expect(before.length).toBeGreaterThanOrEqual(19)
    for (const a of before) expect(now.includes(a), a.slice(0, 120)).toBe(true)
    expect(asserts(now).length).toBe(before.length)
    const limits = (s: string) => (s.match(/timeout:\s*\d+/g) ?? []).map((t) => Number(t.replace(/\D/g, ''))).sort((x, y) => x - y)
    expect(limits(now), 'the time limits in the tool').toEqual(limits(was))
    expect(now).toMatch(/const shotMs=await stillShot\(page,page,\{path:/)
    expect(now).toMatch(/the screenshot then took \$\{shotMs\} ms/)
  })
})
