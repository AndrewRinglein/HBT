// board.variable-size (2026-09-04). Ruled 2026-09-03 (DECISIONS.md "board
// formats"): four formats, the board is the map's, hex ids row × width + col
// per board. These tests field the three non-standard TESTING maps and read
// the board back out of the state and the log — never out of a constant.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { boardOf, terrainOf, MAP_PANEL } from '../src/content/maps.js'
import { FORMATS, formatOf, geometryOf } from '../src/core/hex.js'

const TEST_MAPS = { 'test.map.duel-8': FORMATS.duel, 'test.map.dungeon-16x8': FORMATS.dungeon, 'test.map.horde-24': FORMATS.horde }

describe('the maps declare their boards', () => {
  it('every map on the panel is one of the four formats, and terrain is width × height long', () => {
    expect(MAP_PANEL.length).toBeGreaterThanOrEqual(11)
    for (const id of MAP_PANEL) {
      const b = boardOf(id)
      expect(formatOf(b), id).not.toBeNull()
      expect(terrainOf(id).length, id).toBe(b.width * b.height)
    }
  })
  it('the three test maps are the three non-standard formats', () => {
    for (const [id, b] of Object.entries(TEST_MAPS)) expect(boardOf(id), id).toEqual(b)
  })
})

describe('a battle on each format', () => {
  for (const [mapId, board] of Object.entries(TEST_MAPS)) {
    it(`${mapId}: the state carries the board, every unit stands on it, map.loaded says its size, and the battle runs to an outcome`, () => {
      const ctx = createBattle({ replicate: 0, enemyCount: 8, mapId })
      expect(ctx.state.board).toEqual(board)
      expect(ctx.geo).toBe(geometryOf(board))
      expect(ctx.state.terrain.length).toBe(board.width * board.height)
      const loaded = ctx.events.find((e) => e.type === 'map.loaded') as unknown as { width: number; height: number; mapId: string }
      expect(loaded.mapId).toBe(mapId)
      expect(loaded.width).toBe(board.width)
      expect(loaded.height).toBe(board.height)
      for (const u of ctx.state.units) {
        expect(u.hex).toBeGreaterThanOrEqual(0)
        expect(u.hex).toBeLessThan(board.width * board.height)
        // heroes on the last row, enemies on the first (and the row behind it when the first is full)
        if (u.side === 'hero') expect(ctx.geo.rowOf(u.hex)).toBe(board.height - 1)
        else expect(ctx.geo.rowOf(u.hex)).toBeLessThanOrEqual(1)
      }
      // no two units share a hex
      expect(new Set(ctx.state.units.map((u) => u.hex)).size).toBe(ctx.state.units.length)
      const res = runBattle(ctx)
      expect(['heroClear', 'wipe', 'capped', 'retreat']).toContain(res.outcome)
      // every move in the log landed on the board, and every walked STEP
      // (power.move) was to a neighbour ON THIS board — a Leap may cross two
      let steps = 0
      for (const e of ctx.events) {
        if (e.type !== 'moved') continue
        const m = e as unknown as { from: number; to: number; causeId: string }
        expect(m.to).toBeLessThan(board.width * board.height)
        if (m.causeId !== 'power.move') continue
        expect(ctx.geo.distance(m.from, m.to), `${m.causeId} ${m.from}->${m.to}`).toBe(1)
        steps++
      }
      expect(steps).toBeGreaterThan(0)
    })
  }

  it('the duel board spills a full enemy row onto the second row; the dungeon board does not', () => {
    const duel = createBattle({ replicate: 0, enemyCount: 8, mapId: 'test.map.duel-8' })
    const rows = new Set(duel.state.units.filter((u) => u.side === 'enemy').map((u) => duel.geo.rowOf(u.hex)))
    expect(rows).toEqual(new Set([0]))   // eight on an eight-wide open row
    const nine = createBattle({ replicate: 0, enemyCount: 9, mapId: 'test.map.duel-8' })
    expect(new Set(nine.state.units.filter((u) => u.side === 'enemy').map((u) => nine.geo.rowOf(u.hex)))).toEqual(new Set([0, 1]))
    const dungeon = createBattle({ replicate: 0, enemyCount: 9, mapId: 'test.map.dungeon-16x8' })
    expect(new Set(dungeon.state.units.filter((u) => u.side === 'enemy').map((u) => dungeon.geo.rowOf(u.hex)))).toEqual(new Set([0]))
  })

  it('the same seed on two boards is two different battles — the board is part of what happened', () => {
    const a = createBattle({ replicate: 3, enemyCount: 6, mapId: 'test.map.duel-8' }); runBattle(a)
    const b = createBattle({ replicate: 3, enemyCount: 6, mapId: 'test.map.horde-24' }); runBattle(b)
    expect(a.events.length).not.toBe(b.events.length)
  })

  it('a hex id means what its own board says: the 16-wide map and the 8-wide map disagree about hex 20', () => {
    const d = createBattle({ replicate: 0, mapId: 'test.map.duel-8' })
    const s = createBattle({ replicate: 0, mapId: 'map.open' })
    expect(d.geo.rowOf(20)).toBe(2)
    expect(s.geo.rowOf(20)).toBe(1)
  })
})
