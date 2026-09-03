import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { rowOf } from '../src/core/hex.js'
import { UNITS } from '../src/content/index.js'

describe('state and setup', () => {
  it('creates the standard SIX heroes and 4 zombies on the right rows (Angela 2026-08-20)', () => {
    const ctx = createBattle({ replicate: 0 })
    const heroes = ctx.state.units.filter(u => u.side === 'hero')
    const enemies = ctx.state.units.filter(u => u.side === 'enemy')
    expect(heroes.length).toBe(6)
    expect(enemies.length).toBe(4)
    for (const h of heroes) expect(rowOf(h.hex)).toBe(15)
    for (const e of enemies) expect(rowOf(e.hex)).toBe(0)
  })

  it('gives the CODEX stat blocks — the party reads from the pack, not from typed rows (2026-08-20)', () => {
    // LAW 10 — 2026-09-02 (content.alpha-flip): the standard party is the Alpha
    // Team, whose stat bodies are the SAME Codex rows (S31: "same stat bodies
    // as the test cohort", resolved through copyOf). The numbers below are
    // unchanged; only the ids are. The "(TEST)" differentiation ruling is
    // asserted on the test cohort's pack row, where it still holds.
    const ctx = createBattle({ replicate: 0 })
    const w = ctx.state.units.find(u => u.typeId === 'alpha-oathblade')!
    const r = ctx.state.units.find(u => u.typeId === 'alpha-dusk-hawk')!
    // content.enemy-flip (2026-09-02): the horde is the AUTHORED Zombie —
    // enemies-authored.json's row (health 5, strength 3, precision 1), not
    // the 2026-08-14 placeholder's 10/4 the test clone copied.
    const z = ctx.state.units.find(u => u.typeId === 'unit.zombie')!
    // Oathblade I, hero.shadows.oathblade.v1: the Codex row verbatim
    expect([w.maxHp, w.armor, w.accuracy, w.strength, w.precision, w.movement, w.maxStamina]).toEqual([15,0,75,5,3,5,5])
    // Dusk Hawk I, hero.shadows.dusk-hawk.v1
    expect([r.maxHp, r.armor, r.accuracy, r.strength, r.precision, r.movement, r.maxStamina]).toEqual([5,0,80,3,4,5,5])
    expect(r.dodge).toBe(5)
    expect([z.maxHp, z.armor, z.accuracy, z.strength, z.movement, z.maxStamina]).toEqual([5,0,65,3,4,0])
    expect(z.tags).toContain('undead')   // fix.unit-tags 2026-09-03: one field
    expect(w.name).not.toContain('(TEST)')                      // the Alpha Team is real content
    expect(UNITS['test-oathblade']!.name).toContain('(TEST)')   // clearly differentiated text, per the ruling
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
    expect(enters.length).toBe(10)   // six-hero cohort + four undead (2026-08-20)
    for (const e of enters) expect(e.causeId).toMatch(/^unit\./)
  })
})
