import { describe, it, expect } from 'vitest'
import { MAPS, terrainOf, GLYPH, terrainIdOf, moveCostOf, MOVE_COST, IMPASSABLE } from '../src/content/maps.js'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { effective, terrainMods } from '../src/core/stats.js'
import { stepCost, reachable } from '../src/core/movement.js'
import { hexId } from '../src/core/hex.js'
import { TERRAIN } from '../src/core/types.js'
import type { StatName } from '../src/core/stats.js'

const NEW_KINDS = [TERRAIN.FOREST, TERRAIN.ROCKY, TERRAIN.ROCKY_HILLS, TERRAIN.WATER, TERRAIN.OBSTACLE]
const ALL_KINDS = [TERRAIN.OPEN, TERRAIN.HILLS, ...NEW_KINDS]

function warriorOn(terrain: number) {
  const ctx = createCustomBattle(
    [{ type: 'warrior', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(5, 8) }], { mapId: 'map.open' })
  ctx.state.terrain[ctx.state.units[0]!.hex] = terrain
  return { ctx, u: ctx.state.units[0]! }
}

describe('terrain.kinds — the seven are recognised', () => {
  it('every kind has a glyph and an id, and no glyph means two things', () => {
    const glyphs = Object.entries(GLYPH)
    expect(glyphs.length).toBe(7)
    expect(new Set(glyphs.map(([, v]) => v)).size).toBe(7)   // no two glyphs share a kind
    for (const t of ALL_KINDS) expect(terrainIdOf(t)).toMatch(/^terrain\.[a-z-]+$/)
    expect(new Set(ALL_KINDS.map(terrainIdOf)).size).toBe(7)
  })

  it('hills are `h` and only `h` — the old `^` is gone, not aliased', () => {
    expect(GLYPH['h']).toBe(TERRAIN.HILLS)
    expect(GLYPH['^']).toBeUndefined()
    for (const m of MAPS) for (const row of m.rows) expect(row).not.toContain('^')
  })

  it('every authored map still parses to a full board', () => {
    for (const m of MAPS) expect(terrainOf(m.id).length).toBe(144)
  })

  it('map.field carries real MAP-01 terrain, not a collapse to open/hills', () => {
    const kinds = new Set(terrainOf('map.field'))
    expect(kinds.size).toBeGreaterThan(2)
    for (const k of [TERRAIN.FOREST, TERRAIN.ROCKY, TERRAIN.WATER]) expect(kinds.has(k)).toBe(true)
  })

  it('an unknown glyph is still a loud failure, not a silent open hex', () => {
    const bad = { id: 'map.bad', name: 'x', note: '', rows: Array(12).fill('Q'.repeat(12)) }
    ;(MAPS as unknown as object[]).push(bad)
    expect(() => terrainOf('map.bad')).toThrow(/unknown glyph/)
    ;(MAPS as unknown as object[]).pop()
  })
})

// ─── the point of this item: it is PLUMBING. Nothing plays differently. ──────
describe('terrain.kinds — the new kinds carry no rules yet', () => {
  const STATS: StatName[] = ['accuracy', 'dodge', 'armor', 'resist', 'reach', 'movement']

  // RETIRED by terrain.movecost, deliberately. While terrain.kinds was the only
  // item landed, every new kind cost the same as open ground — that was the whole
  // claim. terrain.movecost is the item that changes it, so the assertion is now
  // historical rather than wrong. What survives is the part movecost does NOT
  // touch: the new kinds still grant no STAT modifiers. (Law 10: written reason.)
  it('the new kinds still grant no stat modifiers — movecost changed cost, not stats', () => {
    for (const t of NEW_KINDS) {
      const { ctx, u } = warriorOn(t)
      expect(terrainMods(ctx, u).filter(m => m.stat !== 'movement')).toEqual([])
    }
  })

  it('every new kind grants exactly the modifiers open ground grants — none', () => {
    const { ctx: openCtx, u: openU } = warriorOn(TERRAIN.OPEN)
    expect(terrainMods(openCtx, openU)).toEqual([])
    for (const t of NEW_KINDS) {
      const { ctx, u } = warriorOn(t)
      expect(terrainMods(ctx, u), `terrain ${terrainIdOf(t)} should grant nothing yet`).toEqual([])
      for (const s of STATS) {
        expect(effective(ctx, u, s).value, `${terrainIdOf(t)} changed ${s}`)
          .toBe(effective(openCtx, openU, s).value)
      }
    }
  })

  it('hills still do what they always did — the conversion changed the glyph, not the rule', () => {
    const { ctx: o, u: ou } = warriorOn(TERRAIN.OPEN)
    const { ctx: h, u: hu } = warriorOn(TERRAIN.HILLS)
    expect(effective(h, hu, 'accuracy').value - effective(o, ou, 'accuracy').value).toBe(10)
    expect(effective(h, hu, 'reach').value - effective(o, ou, 'reach').value).toBe(2)
    expect(moveCostOf(TERRAIN.HILLS)).toBe(2)
  })

  it('nothing is impassable yet — that is terrain.passable, a separate item', () => {
    for (const t of ALL_KINDS) {
      const { ctx } = warriorOn(t)
      expect(Number.isFinite(stepCost(ctx, hexId(5, 5)))).toBe(true)
    }
  })
})

// ─── terrain.movecost ────────────────────────────────────────────────────────
describe('terrain.movecost — rough ground costs more', () => {
  it('every terrain kind has an explicit cost, none fall through to a default', () => {
    for (const t of ALL_KINDS) expect(MOVE_COST[t]).toBeDefined()
  })

  it('rough ground costs 2, open costs 1, water costs more than both', () => {
    expect(moveCostOf(TERRAIN.OPEN)).toBe(1)
    for (const t of [TERRAIN.HILLS, TERRAIN.FOREST, TERRAIN.ROCKY, TERRAIN.ROCKY_HILLS])
      expect(moveCostOf(t)).toBe(2)
    expect(moveCostOf(TERRAIN.WATER)).toBeGreaterThan(2)
  })

  it('the same unit reaches strictly fewer hexes on map.field than on open ground', () => {
    const open = createCustomBattle([{ type: 'warrior', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(0, 0) }], { mapId: 'map.open' })
    const field = createCustomBattle([{ type: 'warrior', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(0, 0) }], { mapId: 'map.field' })
    for (const c of [open, field]) c.state.units[0]!.movePointsLeft = c.state.units[0]!.movement
    expect(reachable(field, field.state.units[0]!).size)
      .toBeLessThan(reachable(open, open.state.units[0]!).size)
  })

  // I first asserted "a slower unit loses proportionally more to rough ground".
  // That is an intuition, and the engine says it is FALSE: at move 4 the loss is
  // 48%, at move 6 it is 53%. A bigger budget reaches further into the outer ring,
  // and on this map the rough ground is out there — so the fast unit loses more of
  // what it would otherwise have gained. Asserting it would have been a finding
  // wearing a rule's clothes, the same mistake as expect(rangerDamage).toBe(0).
  //
  // The RULE that is actually true, and is what cost means: reaching any given hex
  // never becomes cheaper on rough ground.
  it('rough ground never makes a hex cheaper to reach than open ground does', () => {
    const mk = (mapId: string) => {
      const c = createCustomBattle([{ type: 'warrior', hex: hexId(5, 5) }],
        [{ type: 'zombie', hex: hexId(0, 0) }], { mapId })
      c.state.units[0]!.movePointsLeft = 12
      return reachable(c, c.state.units[0]!)
    }
    const open = mk('map.open'), field = mk('map.field')
    let compared = 0
    for (const [hex, node] of field) {
      const o = open.get(hex)
      if (!o) continue
      expect(node.cost).toBeGreaterThanOrEqual(o.cost)
      compared++
    }
    expect(compared).toBeGreaterThan(40)
  })

  it('nothing is impassable yet — IMPASSABLE exists but no terrain uses it', () => {
    expect(IMPASSABLE).toBeGreaterThan(50)
    for (const t of ALL_KINDS) expect(moveCostOf(t)).toBeLessThan(IMPASSABLE)
  })
})

describe('terrain.movecost — the log says what was paid for', () => {
  it('every moved event names the terrain entered, not just a number', () => {
    const ctx = createBattle({ replicate: 4, enemyCount: 8, mapId: 'map.field' })
    runBattle(ctx)
    const moves = ctx.events.filter(e => e.type === 'moved')
    expect(moves.length).toBeGreaterThan(20)
    for (const m of moves) {
      expect(m['terrain'], 'a move with no terrain is a cost nobody can check').toMatch(/^terrain\./)
      expect(m['cost']).toBe(moveCostOf(ctx.state.terrain[m['to'] as number]!))
    }
  })

  it('rough hexes really are being entered — the map is not decorative', () => {
    const ctx = createBattle({ replicate: 4, enemyCount: 8, mapId: 'map.field' })
    runBattle(ctx)
    const kinds = new Set(ctx.events.filter(e => e.type === 'moved').map(e => e['terrain']))
    expect(kinds.size).toBeGreaterThan(1)
    expect([...kinds].some(k => k !== 'terrain.open')).toBe(true)
  })
})
