import { describe, it, expect } from 'vitest'
import { MAPS, terrainOf, GLYPH, terrainIdOf, moveCostOf } from '../src/content/maps.js'
import { createCustomBattle } from '../src/core/setup.js'
import { effective, terrainMods } from '../src/core/stats.js'
import { stepCost } from '../src/core/movement.js'
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

  it('every new kind costs the same to enter as open ground', () => {
    for (const t of NEW_KINDS) expect(moveCostOf(t)).toBe(moveCostOf(TERRAIN.OPEN))
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
