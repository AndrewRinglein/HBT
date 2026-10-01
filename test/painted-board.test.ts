// viewer.painted-board (PLAYABLE-OPENING-PLAN.md item 4; DECISIONS.md 2026-09-29 "the playable battle screen":
// "The painted 3D scenes are the battle board, turned into hex maps"). The viewer draws map.opening.orphanage,
// .lumberjack and .bridge on their painted scenes with one scene-metre -> board-pixel map per scene, built by
// ../viewer/tools/painted-scenes.mjs from the scenes' measured hexes. This asks the ENGINE's own board
// projection (src/view/field.ts, the one the viewer's fields.json is dumped from) whether every one of its
// hexes lands on its scene hex under that map — so a scene or a board that moves shows up here, not only in
// the viewer. Reads files; imports no viewer code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { decodeMap, mapDef } from '../src/content/maps.js'
import { presentationField } from '../src/view/field.js'

type Painted = { kind: string, mapId: string, scene: string, cols: number, rows: number, radius: number,
  toBoard: { sx: number, sy: number, x0: number, z0: number, px0: number, py0: number }, heights: number[] }
type Cell = { id: number, col: number, row: number, center: number[], stand: number[] }
const pack = (): Record<string, Painted> => JSON.parse(execFileSync(process.execPath, ['../viewer/tools/painted-scenes.mjs', '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 }))

describe('the painted scenes stand on the engine board', () => {
  const painted = pack()
  // Law 10, viewer.caravan-scene (2026-10-01): the pack binds the three maps the plan names AND every map compiled from a
  // painted scene's measured navigation (content/gen/painted-maps.json — map.caravan-aftermath, DECISIONS.md 2026-10-01).
  // was: expect(Object.keys(painted).sort()).toEqual(['map.opening.bridge', 'map.opening.lumberjack', 'map.opening.orphanage'])
  const compiled: string[] = JSON.parse(readFileSync('../content/gen/painted-maps.json', 'utf8')).maps.map((m: { id: string }) => m.id)
  it('binds exactly the three maps the plan names and the maps compiled from painted scenes', () => {
    expect(compiled).toEqual(['map.caravan-aftermath'])
    expect(Object.keys(painted).sort()).toEqual(['map.opening.bridge', 'map.opening.lumberjack', 'map.opening.orphanage', ...compiled].sort())
  })
  it.each(['map.opening.orphanage', 'map.opening.lumberjack', 'map.opening.bridge', 'map.caravan-aftermath'])('%s: every engine hex lands on its scene hex', (id) => {
    const b = painted[id]!, d = decodeMap(mapDef(id)), field = presentationField({ ...d.board, terrain: d.terrain, props: d.props }, mapDef(id).rows)
    expect([b.kind, b.mapId, b.cols, b.rows]).toEqual(['painted', id, field.width, field.height])
    const cells: Cell[] = JSON.parse(readFileSync(`../assets/terrain-3d/${b.scene}/navigation.json`, 'utf8')).cells
    expect(cells.length).toBe(field.hexes.length)
    const t = b.toBoard
    for (const p of field.hexes) {
      const cell = cells[p.r * field.width + p.c]!
      expect([cell.col, cell.row]).toEqual([p.c, p.r])
      expect(Math.abs(t.px0 + (cell.center[0]! - t.x0) * t.sx - p.px)).toBeLessThan(1e-6)
      expect(Math.abs(t.py0 + (cell.center[2]! - t.z0) * t.sy - p.py)).toBeLessThan(1e-6)
      expect(b.heights[p.r * field.width + p.c]).toBeCloseTo(cell.stand[1]! * t.sx, 9)
    }
  })
})
