// board.variable-size (2026-09-04). Ruled 2026-09-03 (DECISIONS.md "board
// formats"): four formats, the board is the map's, hex ids row × width + col
// per board. These tests field the three non-standard TESTING maps and read
// the board back out of the state and the log — never out of a constant.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { boardOf, deployOf, terrainOf, MAP_PANEL, DEFAULT_DEPLOY } from '../src/content/maps.js'
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
      const loaded = ctx.events.find((e) => e.type === 'map.loaded') as unknown as { width: number; height: number; mapId: string; deploy: { hero: string; enemy: string } }
      expect(loaded.mapId).toBe(mapId)
      expect(loaded.width).toBe(board.width)
      expect(loaded.height).toBe(board.height)
      // board.deploy-edges: the log names the edges, and every side stands on its own
      const deploy = deployOf(mapId)
      expect(loaded.deploy).toEqual(deploy)
      const onEdge = (hex: number, edge: string) => ctx.geo.edgeLine(edge as 'north', 0).includes(hex) || ctx.geo.edgeLine(edge as 'north', 1).includes(hex)
      for (const u of ctx.state.units) {
        expect(u.hex).toBeGreaterThanOrEqual(0)
        expect(u.hex).toBeLessThan(board.width * board.height)
        // heroes on their edge line, enemies on theirs (or the line behind it when the edge is full)
        if (u.side === 'hero') expect(ctx.geo.edgeLine(deploy.hero, 0), `${u.name} on the ${deploy.hero} edge`).toContain(u.hex)
        else expect(onEdge(u.hex, deploy.enemy), `${u.name} within one line of the ${deploy.enemy} edge`).toBe(true)
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

  it('the edges: the duel map takes the ruled default (heroes west, enemies east); the dungeon says so; the horde is south/north', () => {
    expect(deployOf('test.map.duel-8')).toEqual(DEFAULT_DEPLOY)
    expect(DEFAULT_DEPLOY).toEqual({ hero: 'west', enemy: 'east' })
    expect(deployOf('test.map.dungeon-16x8')).toEqual({ hero: 'west', enemy: 'east' })
    expect(deployOf('test.map.horde-24')).toEqual({ hero: 'south', enemy: 'north' })
    const duel = createBattle({ replicate: 0, enemyCount: 8, mapId: 'test.map.duel-8' })
    for (const u of duel.state.units) expect(duel.geo.colOf(u.hex)).toBe(u.side === 'hero' ? 0 : 7)
    const dungeon = createBattle({ replicate: 0, enemyCount: 8, mapId: 'test.map.dungeon-16x8' })
    for (const u of dungeon.state.units) expect(dungeon.geo.colOf(u.hex)).toBe(u.side === 'hero' ? 0 : 15)
  })

  it('more enemies than the edge holds spill one line inward, rolled per line; the edge alone draws what it always drew', () => {
    const eight = createBattle({ replicate: 0, enemyCount: 8, mapId: 'test.map.duel-8' })
    const nine = createBattle({ replicate: 0, enemyCount: 9, mapId: 'test.map.duel-8' })
    const col = (ctx: typeof nine, u: { hex: number }) => ctx.geo.colOf(u.hex)
    expect(new Set(eight.state.units.filter((u) => u.side === 'enemy').map((u) => col(eight, u)))).toEqual(new Set([7]))
    expect(new Set(nine.state.units.filter((u) => u.side === 'enemy').map((u) => col(nine, u)))).toEqual(new Set([7, 6]))
    // the first eight of nine stand exactly where the eight stood — the spill added a draw, it did not perturb one
    const first8 = nine.state.units.filter((u) => u.side === 'enemy').slice(0, 8).map((u) => u.hex)
    expect(first8).toEqual(eight.state.units.filter((u) => u.side === 'enemy').map((u) => u.hex))
    // the horde board, south/north: sixteen enemies on a 24-wide edge, no spill
    const horde = createBattle({ replicate: 0, enemyCount: 16, mapId: 'test.map.horde-24' })
    expect(new Set(horde.state.units.filter((u) => u.side === 'enemy').map((u) => horde.geo.rowOf(u.hex)))).toEqual(new Set([0]))
    expect(() => createBattle({ replicate: 0, enemyCount: 65, mapId: 'test.map.duel-8' })).toThrow(/cannot hold 65 enemies/)
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
