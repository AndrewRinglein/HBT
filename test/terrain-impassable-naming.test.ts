// naming.terrain-impassable — Andrew, 2026-09-24: the terrain no unit can enter is
// `terrain.impassable` (GLOSSARY.md "Settled, 2026-09-24"). `terrain.obstacle` is retired.
import { describe, it, expect } from 'vitest'
import { TERRAIN } from '../src/core/types.js'
import { GLYPH, terrainIdOf, isPassable } from '../src/content/terrain.js'

describe('naming.terrain-impassable', () => {
  it('the impassable kind answers to terrain.impassable', () => {
    expect(terrainIdOf(TERRAIN.IMPASSABLE)).toBe('terrain.impassable')
  })
  it("MAP-01's glyph x decodes to it, and it cannot be entered", () => {
    expect(GLYPH['x']).toBe(TERRAIN.IMPASSABLE)
    expect(isPassable(TERRAIN.IMPASSABLE)).toBe(false)
  })
  it('no terrain kind answers to the retired name', () => {
    for (const t of Object.values(TERRAIN)) expect(terrainIdOf(t)).not.toBe('terrain.' + 'obstacle')
  })
})
