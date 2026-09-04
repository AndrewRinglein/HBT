// capability.surge (2026-09-03) — COMBAT-SEQUENCE "Surge check", ruled
// 2026-08-21: `Surge Chance += Surge`, roll; a hit grants 1 + Stamina Regen,
// zeroes the chance and loops back to movement INSIDE the same Activation;
// the End of Activation ladder runs once. Heroes only. "Surge always EQUALS
// the character level" (the Codex), plus specialty and gear.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createBattle, createCustomBattle, fieldedDef } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { ITEMS, SPECIALTIES } from '../src/content/index.js'
import { rosterOptionsOf, type Schedule } from '../src/sim/progression.js'
import { hexId } from './board16.js'

const schedule = JSON.parse(readFileSync(join(__dirname, '..', '..', 'progression', 'PROGRESSION-SCHEDULE.json'), 'utf8')) as Schedule

describe('the stat', () => {
  it('equals the level, plus the specialty\'s grant — the Iron Dwarf at level 3 with Bloodrage (+1) has Surge 4', () => {
    const d = fieldedDef('hero.base.warrior-iron', undefined, { level: 3, specialtyId: 'specialty.bloodrage' })
    expect(d.surge).toBe(3 + (SPECIALTIES['specialty.bloodrage']!.statModifiers['surge'] ?? 0))
    expect(fieldedDef('hero.base.warrior-iron').surge ?? 0).toBe(0)   // the bare row: no level, no surge
  })
})

describe('the check', () => {
  it('a hero with Surge 100 surges every activation: a second move and action, stamina back, one End of Activation', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 11) }])
    const w = ctx.state.units[0]!
    w.surge = 100
    runBattle(ctx)
    const checks = ctx.events.filter((e) => e.type === 'surge.checked' && e['actor'] === w.id)
    const hits = ctx.events.filter((e) => e.type === 'surge.hit' && e['actor'] === w.id)
    expect(hits.length).toBeGreaterThan(0)
    expect(checks[0]!['hit']).toBe(true)
    // the ladder ran once per activation, however many links
    const ends = ctx.events.filter((e) => e.type === 'activation.end' && e['actor'] === w.id).length
    const begins = ctx.events.filter((e) => e.type === 'activation.begin' && e['actor'] === w.id).length
    expect(ends).toBe(begins)
    expect(ctx.events.some((e) => e.type === 'stamina.gained' && e.causeId === 'surge')).toBe(true)
  })

  it('the chance accumulates across misses and zeroes on a hit', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 11) }])
    const w = ctx.state.units[0]!
    w.surge = 10
    runBattle(ctx)
    const checks = ctx.events.filter((e) => e.type === 'surge.checked' && e['actor'] === w.id)
    let expected = 0
    for (const c of checks) { expected += 10; expect(c['chance']).toBe(expected); if (c['hit']) expected = 0 }
  })

  it('enemies never surge', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 11) }])
    ctx.state.units[1]!.surge = 100
    runBattle(ctx)
    expect(ctx.events.some((e) => e.type === 'surge.checked' && e['actor'] === 1)).toBe(false)
  })

  it('the progression party surges in a real battle', () => {
    const opts = rosterOptionsOf(schedule, 20, ITEMS)
    let hits = 0
    for (let r = 0; r < 3; r++) { const ctx = createBattle({ ...opts, replicate: r, enemyCount: 12, mapId: 'map.open' }); runBattle(ctx); hits += ctx.events.filter((e) => e.type === 'surge.hit').length }
    expect(hits).toBeGreaterThan(0)
  })
})
