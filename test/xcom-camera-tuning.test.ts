// viewer.xcom-camera-tuning (engine backlog; DECISIONS.md 2026-10-01 'the first look at the XCOM camera, the weapons and the
// bodies', Andrew: "the zoom-in and zoom-out should go a little bit further than the 0.75 and 1.4" · "The pointing-to-scroll on
// the map does not work very well. If you point to the edge, you sometimes get some movement."). The engine's side: the
// Orphanage — the battle Andrew played — is a board the view can roam (20 by 14, smaller than the view at the standard zoom,
// which is what pinned the pan). The viewer's half (../viewer/tools/xcom-camera.test.mjs: the wheel's reach, the board's and
// the screen's edges; ../viewer/tools/true-3d-camera.test.mjs: the pan's clamp) runs against the page. Since viewer.camera-no-void
// (engine DECISIONS.md 2026-10-03 'the camera never shows white space') the page asserts the clamp — the pan stops where the
// board's edge meets the view's — instead of "any point of the board can be centred" (viewer SWITCHES xcomRoam, overturned).
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { MAPS } from '../../engine/src/content/maps.js'

const run = (file: string) => execFileSync(process.execPath, ['--test', '--test-reporter=tap', file], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })

describe('the XCOM camera, tuned', () => {
  it('the Orphanage is a 20 by 14 board', () => {
    const m = MAPS.find((x) => x.id === 'map.opening.orphanage') as any
    expect([m?.width ?? m?.board?.width, m?.height ?? m?.board?.height]).toEqual([20, 14])
  })
  /* (viewer.zoom-stays, 2026-10-05: this read "the wheel goes further and springs back" — the zoom now stays where it is left,
     engine DECISIONS.md 'the battle screen must feel smooth: …'; the page's own test is rewritten, tools/xcom-camera.test.mjs) */
  it('the viewer page: the wheel goes further and stays where it is left; every edge scrolls; the pan stops at the board\'s edge', () => {
    expect(run('tools/xcom-camera.test.mjs')).toMatch(/# fail 0/)
    expect(run('tools/true-3d-camera.test.mjs')).toMatch(/# fail 0/)
  }, 170000)
})
