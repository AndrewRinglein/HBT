// viewer.true-3d-camera (engine DECISIONS.md 2026-09-30 "a true 3D battle: an orbit camera, every Orphanage unit its own
// model, no flash of another map"). Andrew: "When I maneuver the map, it stretches the 3D assets." · "The battle screen
// is sort of 2D, but if I rotate it one direction, it just stretches" — answered "True 3D orbit" · "A different map loads
// for a blink of an eye, and then this map. That other map should not be loading." Expect: "In
// BATTLE-SANDBOX.html?play=encounter.opening.orphanage the board turns a full circle and tilts with the 3D scene and the
// bodies keeping their proportions at every angle (no stretch); a hex clicked at any angle is the hex under the pointer;
// the ground marks, the arrow and the bars stay on their hexes and units while turning; no other map appears before the
// Orphanage's scene." The engine's side is the board projection the camera stands on: its rows are not a regular hex's
// (96 px where 110.85 would be), so a scene squeezed onto the board stretches when turned — the viewer draws the scene
// true and the board through its one camera; the start tilt is the engine's (Reset). The viewer's half
// (../viewer/tools/true-3d-camera.test.mjs) runs against the committed viewer page; the kingdom's
// (../kingdom/tools/sandbox-3d-camera.verify.mjs) boots the COMMITTED sandbox with ?play=. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { ENCOUNTERS } from '../../engine/src/content/index.js'
import { SCENARIOS } from '../../engine/src/content/scenarios.js'
import { presentationField } from '../../engine/src/view/field.js'

const run = (cwd: string, args: string[]) => execFileSync(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: '' } })

describe('a true 3D battle: one real camera, the board drawn through it, no other map first', () => {
  it("battle 1 is encounter.opening.orphanage on map.opening.orphanage; the engine's board rows are not a regular hex's, and its tilt is the start", () => {
    expect((ENCOUNTERS as Record<string, any>)['encounter.opening.orphanage']).toBeDefined()
    const sc = (SCENARIOS as Record<string, any>)['test.opening-orphanage']
    expect([sc.mapId, sc.encounterId]).toEqual(['map.opening.orphanage', 'encounter.opening.orphanage'])
    const f = presentationField({ width: 2, height: 2, terrain: [0, 0, 0, 0], props: [] } as any)
    /* a regular pointy hex of this column step would put rows colStep·√3/2 apart: the board's are shorter */
    expect(f.rowStep).toBeLessThan(f.colStep * Math.sqrt(3) / 2 - 10)
    expect(f.tilt).toBe(49.3)
  })
  it('the viewer page: one perspective camera, rigid, the board drawn through it at every angle; nothing stretches; the ray picks the hex or body under the pointer; no flat board before the scene', () => {
    const out = run('../viewer', ['--test', 'tools/true-3d-camera.test.mjs'])
    // Law 10, viewer.tactical-camera (2026-10-01; DECISIONS.md 2026-10-01 "the camera redesigned on the caravan preview"): the
    // viewer's camera file gained the tactical policy's eight tests; every one still passes. was: expect(out).toMatch(/# pass 6/)
    expect(Number(/# pass (\d+)/.exec(out)?.[1])).toBeGreaterThanOrEqual(14)
    expect(out).toMatch(/# fail 0/)
  }, 120000)
  it('the sandbox page opened with ?play=encounter.opening.orphanage stands on the Orphanage scene with that camera, and shows no flat board in its place', () => {
    const out = run('../kingdom', ['tools/sandbox-3d-camera.verify.mjs', 'BATTLE-SANDBOX.html'])
    expect(out).toMatch(/sandbox 3d camera: .*passed/)
  }, 60000)
})
