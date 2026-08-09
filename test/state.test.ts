import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { rowOf } from '../src/core/hex.js'

describe('state and setup', () => {
  it('creates 4 heroes and 4 zombies on the right rows', () => {
    const ctx = createBattle({ replicate: 0 })
    const heroes = ctx.state.units.filter(u => u.side === 'hero')
    const enemies = ctx.state.units.filter(u => u.side === 'enemy')
    expect(heroes.length).toBe(4)
    expect(enemies.length).toBe(4)
    for (const h of heroes) expect(rowOf(h.hex)).toBe(11)
    for (const e of enemies) expect(rowOf(e.hex)).toBe(0)
  })

  it('gives the specified stat blocks', () => {
    const ctx = createBattle({ replicate: 0 })
    const w = ctx.state.units.find(u => u.typeId === 'warrior')!
    const r = ctx.state.units.find(u => u.typeId === 'ranger')!
    const z = ctx.state.units.find(u => u.typeId === 'zombie')!
    expect([w.maxHp, w.armor, w.accuracy, w.strength, w.precision, w.movement, w.maxStamina]).toEqual([10,1,80,5,3,5,5])
    expect([r.maxHp, r.armor, r.accuracy, r.strength, r.precision, r.movement, r.maxStamina]).toEqual([7,0,90,3,4,5,5])
    expect([z.maxHp, z.armor, z.accuracy, z.strength, z.movement, z.maxStamina]).toEqual([10,0,65,4,4,0])
    expect(z.attributes).toContain('undead')
  })

  it('places units on distinct hexes', () => {
    for (let r = 0; r < 50; r++) {
      const ctx = createBattle({ replicate: r })
      const hexes = ctx.state.units.map(u => u.hex)
      expect(new Set(hexes).size).toBe(hexes.length)
    }
  })

  it('state is plain data — survives a JSON round trip unchanged (Law 5b)', () => {
    const ctx = createBattle({ replicate: 3 })
    const json = JSON.stringify(ctx.state)
    expect(JSON.parse(json)).toEqual(ctx.state)
    expect(json).not.toContain('function')
  })

  it('same replicate = same placement; different replicate = different', () => {
    const a = createBattle({ replicate: 7 }).state.units.map(u => u.hex)
    const b = createBattle({ replicate: 7 }).state.units.map(u => u.hex)
    const c = createBattle({ replicate: 8 }).state.units.map(u => u.hex)
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })

  it('every unit entering is logged with its cause', () => {
    const ctx = createBattle({ replicate: 1 })
    const enters = ctx.events.filter(e => e.type === 'unit.enter')
    expect(enters.length).toBe(8)
    for (const e of enters) expect(e.causeId).toMatch(/^unit\./)
  })
})
