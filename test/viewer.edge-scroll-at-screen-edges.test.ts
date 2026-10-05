// viewer.edge-scroll-at-screen-edges (engine backlog; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: …
// Scrolling'). Andrew: "It just feels awkward to click on things … and scroll the screen around." Ruled 2026-10-01 'When you
// mouse or point past the edge of a map, the map just scrolls' — kept. Expect: "On the Orphanage at 1920x1080: the pointer
// resting on a hex in the board's bottom row, or travelling from the board to the ability bar, the panel or a hero's card,
// moves the map by nothing; the pointer held at each of the four screen edges scrolls that way until the bound; a page test
// drives the scroll with frames 16 ms apart and 150 ms apart and reads the same distance covered in a second, within a
// tenth; the replay page's board-edge scroll test passes unchanged."
// The engine's side — nothing is asked of it: scrolling the map is no command. The viewer's half is
// ../viewer/tools/edge-scroll-at-screen-edges.test.mjs, on the page (VIEWER_PAGE) as the gate runs it. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

describe('the map scrolls at the screen\'s own edges, at one speed whatever the frame rate', () => {
  it('the numbers are the camera\'s policy: the screen\'s band, the speed, the time it takes to come up to it, and the longest step', () => {
    const src = readFileSync('src/camera-policy.js', 'utf8')
    const n = (name: string) => Number(src.match(new RegExp(name + ':\\s*([\\d.]+)'))?.[1])
    expect(n('EDGE_WINDOW_PX')).toBe(14); expect(n('EDGE_SCROLL_SPEED')).toBe(700)
    expect(n('EDGE_SCROLL_RAMP_MS'), 'about 150 ms').toBe(150)
    expect(n('EDGE_STEP_MAX_MS'), 'a quarter second').toBe(250)
  })
  it('the viewer page, the Orphanage: the board\'s own edges scroll nothing in the battle screen; each screen edge scrolls until the bound; a replay page keeps its board-edge band; 16 ms and 150 ms frames cover the same ground; it comes up to speed', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/edge-scroll-at-screen-edges.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
