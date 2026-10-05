// viewer.zoom-stays (engine backlog; ruled 2026-10-05, Andrew, engine DECISIONS.md 'the battle screen must feel smooth: …' — asked
// "Should the wheel zoom stay where you leave it, far enough out to see the whole board (this overturns 'snaps back')?":
// "2 yes"). Overturns 2026-10-01 "The mouse wheel zooms a limited amount and snaps back to standard when you stop" and, at the
// widest zoom only, 2026-10-03 "the camera never shows white space", by as much as showing the whole board takes and no more.
// Expect: "On the Orphanage at 1920x1080: three notches out and the view is still there ten seconds later; at the farthest
// notch all 280 hexes are whole in the battle area; zooming in with the pointer on a hex keeps that hex under the pointer
// within a few px at every step; ten notches in one second end at their zoom within 200 ms of the last; a new battle opens at
// the standard zoom; the page tests that asserted the spring back and the fill floor are changed to assert these, citing the
// ruling."
// The engine's side — nothing is asked of it: the zoom is no command. The viewer's half is ../viewer/tools/zoom-stays.test.mjs,
// on the page (VIEWER_PAGE) as the gate runs it. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

describe('the wheel\'s zoom stays where it is left, out to the whole board', () => {
  it('the numbers are the camera\'s policy: the nearest is 1.8 of the standard as before; a notch eases over 120 ms; the far factor and the rest timer are gone', () => {
    const src = readFileSync('src/camera-policy.js', 'utf8')
    const n = (name: string) => Number(src.match(new RegExp('\\n\\s*' + name + ':\\s*([\\d.]+)'))?.[1])
    expect(n('ZOOM_NEAR')).toBe(1.8); expect(n('ZOOM_EASE_MS')).toBe(120)
    expect(n('ZOOM_FAR'), 'no farthest factor: the far end is the whole board\'s fit').toBeNaN()
    expect(n('ZOOM_REST_MS'), 'no rest timer: the zoom stays').toBeNaN()
    expect(readFileSync('src/board.js', 'utf8'), 'no timer springs the zoom back').not.toMatch(/zoomRest/)
  })
  it('the viewer page, the Orphanage: it stays ten seconds on; the whole board at the farthest notch; about the pointer; the 120 ms ease that keeps its speed; a new battle at the standard zoom; the wheel\'s button; the HUD line', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/zoom-stays.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 7/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the tests that asserted the spring back and the fill floor now assert the zoom that stays, each citing the ruling', () => {
    for (const f of ['tools/xcom-camera.test.mjs', 'tools/camera-no-void.test.mjs', 'tools/characters-stand-out.test.mjs', 'tools/view-stays-where-put.test.mjs', '../kingdom/tools/view-stays-where-put.verify.mjs']) {
      const src = readFileSync(f, 'utf8')
      expect(src, `${f}: its dated note`).toMatch(/Law 10, 2026-10-05 \(viewer\.zoom-stays/)
      expect(src, `${f}: the ruling's own word`).toMatch(/"2 yes"/)
    }
  })
})
