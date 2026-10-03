// viewer.camera-no-void (engine backlog; engine DECISIONS.md 2026-10-03 'the camera never shows white space; pointing at an edge
// scrolls'). Andrew: "I've got giant amounts of white space, and I can't seem to scroll the map by pointing. There's no reason to
// ever scroll into white space." The engine's side: the Orphanage — the battle Andrew played — is a 20 by 14 board. The viewer's
// half (../viewer/tools/camera-no-void.test.mjs) asks the page: at load, at every wheel step and every quarter turn the battle
// area shows only board; at the standard zoom there is board beyond it on both axes; pointing at each of the four edges scrolls
// until the board's edge meets the battle area's, and no further. The tuning's own page tests (xcom-camera.test.mjs,
// true-3d-camera.test.mjs) now assert the clamp instead of "any point of the board can be centred". Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { MAPS } from '../../engine/src/content/maps.js'

const run = (file: string) => execFileSync(process.execPath, ['--test', '--test-reporter=tap', file], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })

describe('the camera never shows white space', () => {
  it('the Orphanage is a 20 by 14 board', () => {
    const m = MAPS.find((x) => x.id === 'map.opening.orphanage') as any
    expect([m?.width ?? m?.board?.width, m?.height ?? m?.board?.height]).toEqual([20, 14])
  })
  it('the viewer page: only board in the battle area at load, every wheel step and turn; every edge scrolls to the board\'s edge and stops', () => {
    const out = run('tools/camera-no-void.test.mjs')
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
