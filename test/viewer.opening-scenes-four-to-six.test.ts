// viewer.opening-scenes-four-to-six (engine backlog; engine DECISIONS.md 2026-10-03 'everything in the viewer and in play is the 3D
// maps and the 3D characters'). Andrew: "I want everything in the viewer to be our three-dimensional maps and our
// three-dimensional characters. Everything in the play is to be that." The engine's side: the opening's maps are its own, each
// at its own size, and the scene a battle is drawn on is the one its map was compiled from - so the viewer's pack
// (../viewer/tools/painted-scenes.mjs) may bind map.opening.cavern-trail and map.opening.cathedral only if the scene's measured
// grid is the engine board's, hex for hex. The Gates' map was compiled from an Atlas map, not a scene: it is not in the pack
// (viewer SWITCHES gatesGround). The viewer's half (../viewer/tools/opening-scenes.test.mjs): each bound battle opens on its
// scene in the page. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { ENCOUNTERS } from '../../engine/src/content/index.js'
import { SCENARIOS } from '../../engine/src/content/scenarios.js'

const pack: Record<string, any> = JSON.parse(execFileSync(process.execPath, ['../viewer/tools/painted-scenes.mjs', '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 }))
const proposal = JSON.parse(readFileSync('../assets/battle-atlas/opening-ground-proposal-2026-09-28.json', 'utf8'))
const fields = JSON.parse(readFileSync('../viewer/generated/fields.json', 'utf8'))
const opening = Object.values(SCENARIOS as Record<string, any>).filter((s) => s.openingPosition).sort((a, b) => a.openingPosition - b.openingPosition)
const ground = (s: any) => proposal.maps.find((m: any) => m.name === (ENCOUNTERS as Record<string, any>)[s.encounterId].name).file as string

describe('the opening battles are drawn on their 3D scenes', () => {
  it('every opening map compiled from a 3D scene is bound to that scene, its grid the engine board', () => {
    const fromScene = opening.filter((s) => ground(s).startsWith('assets/terrain-3d/'))
    expect(fromScene.map((s) => s.openingPosition)).toEqual([1, 2, 3, 4, 6])
    for (const s of fromScene) {
      const bound = pack[s.mapId]
      expect(bound, s.mapId).toBeDefined()
      expect('assets/terrain-3d/' + bound.scene, s.mapId).toBe(ground(s))
      expect([bound.cols, bound.rows], s.mapId).toEqual([fields[s.mapId].width, fields[s.mapId].height])
      expect(bound.heights.length, s.mapId).toBe(fields[s.mapId].hexes.length)
    }
  })
  it('the Gates, compiled from an Atlas map and not a scene, is not bound to one', () => {
    const gates = opening.find((s) => s.openingPosition === 5)!
    expect(ground(gates).startsWith('assets/battle-atlas/maps/')).toBe(true)
    expect(pack[gates.mapId]).toBeUndefined()
  })
  it('the viewer page: each bound battle opens on its scene', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/opening-scenes.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 6/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
