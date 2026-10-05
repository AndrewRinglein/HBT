// viewer.map-drag-and-keys (engine backlog; ruled 2026-10-05, Andrew, engine DECISIONS.md 'the battle screen must feel smooth: …
// the map drags and moves on W/A/S/D; …' — asked "Should the map also move by dragging it and by W/A/S/D, alongside edge
// scroll (this overturns 'no grab-drag')?": "Yes"). Overturns 2026-10-01 'the XCOM-style camera' "no grab-drag": the edge scroll
// stays, the drag and the keys are added. Expect: "On the Orphanage: a press dragged 300 px left moves the board 300 px left
// under the pointer and it stays there on release; a click with 3 px of travel still selects its hex; a right press that
// drags does not step the plan back and a right click still does; holding D scrolls right until the bound and W with D goes
// diagonally; the left arrow turns a quarter in about 300 ms; a page test reads each; the tests that asserted 'no grab-drag'
// are changed to assert these, citing the ruling."
// The engine's side — nothing is asked of it: moving the map is no command, and a drag sends none. The viewer's half is
// ../viewer/tools/map-drag-and-keys.test.mjs, on the page (VIEWER_PAGE) as the gate runs it. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

describe('the map moves by dragging it and on W, A, S and D, beside the edge scroll', () => {
  it('the numbers are the camera\'s policy: 6 px of travel makes a press a drag; a quarter turn takes 300 ms', () => {
    const src = readFileSync('src/camera-policy.js', 'utf8')
    const n = (name: string) => Number(src.match(new RegExp(name + ':\\s*([\\d.]+)'))?.[1])
    expect(n('MAP_DRAG_PX')).toBe(6); expect(n('TURN_MS')).toBe(300)
    expect(n('EDGE_SCROLL_SPEED'), 'the keys move the map at the edge scroll\'s speed').toBe(700)
  })
  it('the viewer page, the Orphanage: the drag, the click that travels less than 6 px, the right button, W A S D, the 300 ms quarter turn, the HUD line', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/map-drag-and-keys.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 6/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the tests that asserted "no grab-drag" now assert the drag, each citing the ruling', () => {
    // (tools/true-3d-camera.test.mjs names "no grab-drag" too, in a note: what it asserts — no drag tilts the camera or leaves
    // Overhead, a click that ends a drag is no click — is still the rule and passes unchanged)
    for (const f of ['tools/targeting.test.mjs', 'tools/painted-board.test.mjs']) {
      const src = readFileSync(f, 'utf8')
      expect(src, `${f}: its dated note`).toMatch(/2026-10-05, viewer\.map-drag-and-keys/)
      expect(src, `${f}: the ruling's own word`).toMatch(/"Yes"/)
    }
  })
})
