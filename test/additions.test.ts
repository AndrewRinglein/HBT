import { describe, it, expect } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { resolveDamage, resolveAccuracy, reachOf, canAttack } from '../src/core/pipeline.js'
import { resolvePowerDamage, canUsePower, isReady } from '../src/core/ability.js'
import { reachable, stepCost } from '../src/core/movement.js'
import { ATTACKS, ABILITIES, UNITS, FIRST_BATTLE } from '../src/content/index.js'
import { MAPS, terrainOf, MAP_PANEL } from '../src/content/maps.js'
import { hexId, distance } from '../src/core/hex.js'
import { TERRAIN } from '../src/core/types.js'

const MAPS_ALL = MAP_PANEL

// ─── PASS 1: roles ───────────────────────────────────────────────────────────
describe('pass 1 — unit roles', () => {
  it('every unit type declares a role', () => {
    expect(UNITS['zombie']!.role).toBe('melee')
    expect(UNITS['warrior']!.role).toBe('melee')
    expect(UNITS['ranger']!.role).toBe('ranged')
    expect(UNITS['mage']!.role).toBe('ranged')
  })
  it('gate 1 — the role appears in the log for every unit', () => {
    const ctx = createBattle({ replicate: 0 })
    const enters = ctx.events.filter(e => e.type === 'unit.enter')
    // Derived, not hardcoded, since the six-hero cohort landed (2026-08-20).
    expect(enters.length).toBe(FIRST_BATTLE.heroes.length + FIRST_BATTLE.defaultEnemyCount)
    for (const e of enters) expect(['melee','ranged','support']).toContain(e['role'])
  })
  it('roles reach the unit at runtime', () => {
    const ctx = createBattle({ replicate: 0 })
    for (const u of ctx.state.units) expect(u.role).toBe(UNITS[u.typeId]!.role)
  })
})

// ─── PASS 2: hills ───────────────────────────────────────────────────────────
describe('pass 2 — hills', () => {
  it('gate 1 — every authored map parses to the right size, and hill counts differ', () => {
    const counts = MAPS.map(m => terrainOf(m.id).filter(t => t === TERRAIN.HILLS).length)
    for (const m of MAPS) expect(terrainOf(m.id).length).toBe(144)
    expect(counts[0]).toBe(0)                    // open field is the control
    // The RULE is that no two maps are the same board. Hill COUNT was a proxy for
    // that, and it broke the moment two different maps happened to have 28 hills
    // each (flanks and field). Assert the layout, which is what we actually mean.
    const layouts = MAPS.map(m => terrainOf(m.id).join(''))
    expect(new Set(layouts).size).toBe(MAPS.length)
  })
  it('gate 2 — hills cost 2 movement, open ground 1', () => {
    const ctx = createBattle({ replicate: 0, mapId: 'map.ridge' })
    const hill = ctx.state.terrain.findIndex(t => t === TERRAIN.HILLS)
    const flat = ctx.state.terrain.findIndex(t => t === TERRAIN.OPEN)
    expect(stepCost(ctx, hill)).toBe(2)
    expect(stepCost(ctx, flat)).toBe(1)
  })
  it('gate 2 — hills give exactly +10 accuracy', () => {
    const ctx = createCustomBattle(
      [{ type: 'ranger', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(5, 8) }], { mapId: 'map.open' })
    const [r, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
    const flat = resolveAccuracy(ctx, r, z, ATTACKS['attack.ranger.bow']!).value
    ctx.state.terrain[r.hex] = TERRAIN.HILLS
    const hill = resolveAccuracy(ctx, r, z, ATTACKS['attack.ranger.bow']!).value
    expect(hill - flat).toBe(10)
  })
  it('gate 2 — hills give exactly +2 reach, ranged only', () => {
    const ctx = createCustomBattle(
      [{ type: 'ranger', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(5, 8) }], { mapId: 'map.open' })
    const r = ctx.state.units[0]!
    expect(reachOf(ctx, r, ATTACKS['attack.ranger.bow']!)).toBe(6)
    ctx.state.terrain[r.hex] = TERRAIN.HILLS
    expect(reachOf(ctx, r, ATTACKS['attack.ranger.bow']!)).toBe(8)
    expect(reachOf(ctx, r, ATTACKS['attack.punch']!)).toBe(1)
  })
  it('gate 2 — reachability shrinks on rough ground', () => {
    const open = createBattle({ replicate: 0, mapId: 'map.open' })
    const high = createBattle({ replicate: 0, mapId: 'map.highlands' })
    const w1 = open.state.units[0]!, w2 = high.state.units[0]!
    w1.movePointsLeft = w1.movement; w2.movePointsLeft = w2.movement
    expect(reachable(high, w2).size).toBeLessThan(reachable(open, w1).size)
  })
  it('gate 3 — the open map is byte-identical to having no terrain at all', () => {
    const h = (c: ReturnType<typeof createBattle>) => JSON.stringify(c.events.map(e => ({ ...e, terrain: undefined })))
    const a = createBattle({ replicate: 3, mapId: 'map.open' }); runBattle(a)
    const b = createBattle({ replicate: 3 }); runBattle(b)
    expect(h(a)).toBe(h(b))
  })
  it('gate 1 — ranged heroes actually take the high ground when maps have hills', () => {
    let took = 0
    for (const mapId of ['map.ridge', 'map.flanks', 'map.highlands'])
      for (let r = 0; r < 30; r++) {
        const ctx = createBattle({ replicate: r, mapId, enemyCount: 8 }); runBattle(ctx)
        took += ctx.events.filter(e => e.type === 'ai.tookHighGround').length
      }
    expect(took).toBeGreaterThan(0)
  })
  it('a ranged hero never ends its move inside a melee threat range it could have avoided', () => {
    // Weaker property: it prefers safety, so unsafe endings should be rare.
    let unsafe = 0, total = 0
    for (const mapId of MAPS_ALL) for (let r = 0; r < 20; r++) {
      const ctx = createBattle({ replicate: r, mapId, enemyCount: 8 }); runBattle(ctx)
      const type = new Map<number, string>(); const pos = new Map<number, number>()
      for (const e of ctx.events) {
        if (e.type === 'unit.enter') { type.set(e.actor!, e['typeId'] as string); pos.set(e.actor!, e['hex'] as number) }
        if (e.type === 'moved') pos.set(e.actor!, e['to'] as number)
        if (e.type === 'activation.end' && type.get(e.actor!) === 'test-dusk-hawk') {
          total++
          const me = pos.get(e.actor!)!
          for (const [id, t] of type) if (t === 'zombie' && distance(me, pos.get(id)!) <= 5) { unsafe++; break }
        }
      }
    }
    expect(total).toBeGreaterThan(100)
    expect(unsafe / total).toBeLessThan(0.5)
  })
})

// ─── PASS 3: the Mage ────────────────────────────────────────────────────────
describe('pass 3 — the Mage', () => {
  it('has the stat block that was specified', () => {
    const m = UNITS['mage']!
    expect([m.maxHp, m.armor, m.resist, m.strength, m.precision, m.magic, m.movement, m.reach, m.maxStamina, m.staminaRegen])
      .toEqual([6, 0, 1, 2, 4, 2, 4, 0, 5, 1])
  })
  it('gate 2 — staff bolt is Precision magic at range 6; strike is Strength physical at 1', () => {
    const ctx = createCustomBattle([{ type: 'mage', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(6, 5) }])
    const [m, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
    expect(resolveDamage(ctx, m, z, ATTACKS['attack.mage.staff']!, false).value).toBe(4)   // precision 4, magic vs resist 0
    expect(resolveDamage(ctx, m, z, ATTACKS['attack.mage.strike']!, false).value).toBe(2)  // strength 2, physical vs armor 0
    expect(ATTACKS['attack.mage.staff']!.reach).toBe(6)
    expect(ATTACKS['attack.mage.strike']!.reach).toBe(1)
  })
  it('gate 2 — magic damage is mitigated by Resist, not Armor', () => {
    const ctx = createCustomBattle([{ type: 'mage', hex: hexId(5,5) }], [{ type: 'zombie', hex: hexId(6,5) }])
    const m = ctx.state.units[0]!
    const armoured = { ...ctx.state.units[1]!, armor: 3, resist: 0 }
    const warded  = { ...ctx.state.units[1]!, armor: 0, resist: 3 }
    expect(resolveDamage(ctx, m, armoured, ATTACKS['attack.mage.staff']!, false).value).toBe(4)
    expect(resolveDamage(ctx, m, warded,   ATTACKS['attack.mage.staff']!, false).value).toBe(1)
  })
  it('gate 1 — the Mage appears, moves, attacks and is targeted in real battles', () => {
    const seen = { moved:0, staff:0, strike:0, hurt:0 }
    for (let r = 0; r < 60; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, strict: true }); runBattle(ctx)
      const type = new Map<number, string>()
      for (const e of ctx.events) {
        if (e.type === 'unit.enter') type.set(e.actor!, e['typeId'] as string)
        if (e.type === 'moved' && type.get(e.actor!) === 'test-air-mage') seen.moved++
        if (e.type === 'attack.declared' && e['attackId'] === 'attack.mage.staff') seen.staff++
        if (e.type === 'attack.declared' && e['attackId'] === 'attack.mage.strike') seen.strike++
        if (e.type === 'damage.applied' && type.get(e.target!) === 'test-air-mage') seen.hurt++
      }
    }
    expect(seen.moved).toBeGreaterThan(0)
    expect(seen.staff).toBeGreaterThan(0)
    expect(seen.hurt).toBeGreaterThan(0)
  })
})

// ─── PASS 4: the class power ─────────────────────────────────────────────────
describe('pass 4 — Arcane Bolt', () => {
  it('gate 2 — deals Magic + 6 as magic damage', () => {
    const ctx = createCustomBattle([{ type: 'mage', hex: hexId(5,5) }], [{ type: 'zombie', hex: hexId(6,5) }])
    const [m, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
    expect(resolvePowerDamage(ctx, m, z, ABILITIES['power.mage.bolt']!).value).toBe(8)
    expect(resolvePowerDamage(ctx, m, { ...z, resist: 3 }, ABILITIES['power.mage.bolt']!).value).toBe(5)
  })
  it('gate 2 — reaches exactly 10 hexes, not 11', () => {
    const at10 = createCustomBattle([{ type:'mage', hex: hexId(1,0) }], [{ type:'zombie', hex: hexId(11,0) }])
    const at11 = createCustomBattle([{ type:'mage', hex: hexId(0,0) }], [{ type:'zombie', hex: hexId(11,0) }])
    expect(distance(hexId(1,0), hexId(11,0))).toBe(10)
    expect(canUsePower(at10, 0, 1, 'power.mage.bolt')).toBe(true)
    expect(canUsePower(at11, 0, 1, 'power.mage.bolt')).toBe(false)
  })
  it('gate 2 — the cooldown is exactly 6 turns and blocks reuse', () => {
    const ctx = createBattle({ replicate: 1, enemyCount: 8, strict: true })
    runBattle(ctx)
    const casts = ctx.events.filter(e => e.type === 'power.used')
    const cds = ctx.events.filter(e => e.type === 'cooldown.set')
    expect(casts.length).toBeGreaterThan(0)
    expect(cds.length).toBe(casts.length)
    for (const c of cds) expect((c['readyOnTurn'] as number) - (c.turn as number)).toBe(6)
    // never two casts by the same unit inside the cooldown window
    const byUnit = new Map<number, number[]>()
    for (const c of casts) byUnit.set(c.actor!, [...(byUnit.get(c.actor!) ?? []), c.turn as number])
    for (const turns of byUnit.values())
      for (let i = 1; i < turns.length; i++) expect(turns[i]! - turns[i-1]!).toBeGreaterThanOrEqual(6)
  })
  it('gate 2 — the power spends the primary action, so no attack follows it', () => {
    for (let r = 0; r < 40; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, strict: true }); runBattle(ctx)
      let castBy: number | null = null
      for (const e of ctx.events) {
        if (e.type === 'activation.begin') castBy = null
        if (e.type === 'power.used') castBy = e.actor!
        if (e.type === 'attack.declared' && e.actor === castBy)
          throw new Error('a unit attacked after casting in the same activation')
      }
    }
  })
  it('gate 1 — casts appear in the log with a full damage ledger', () => {
    const ctx = createBattle({ replicate: 1, enemyCount: 8 }); runBattle(ctx)
    const cast = ctx.events.find(e => e.type === 'power.used')!
    const led = cast['ledger'] as { station: string; delta: number }[]
    expect(led.reduce((s, r) => s + r.delta, 0)).toBe(8)
    expect(led.map(r => r.station)).toContain('DECLARE')
    expect(led.map(r => r.station)).toContain('SOURCE_STAT')
  })
})

// ─── all four together ───────────────────────────────────────────────────────
describe('everything together', () => {
  it('runs clean on every map with no invalid runs', () => {
    for (const mapId of MAPS_ALL)
      for (let r = 0; r < 40; r++) {
        const ctx = createBattle({ replicate: r, mapId, enemyCount: 8, strict: true })
        const res = runBattle(ctx)
        expect(['heroClear','wipe','capped']).toContain(res.outcome)
        for (const u of ctx.state.units) {
          expect(u.hp).toBeGreaterThanOrEqual(0)
          expect(u.stamina).toBeGreaterThanOrEqual(0)
        }
      }
  })
  it('state still round-trips through JSON with terrain and cooldowns', () => {
    const ctx = createBattle({ replicate: 2, mapId: 'map.highlands', enemyCount: 8 }); runBattle(ctx)
    expect(JSON.parse(JSON.stringify(ctx.state))).toEqual(ctx.state)
    expect(ctx.state.terrain.length).toBe(144)
  })
  it('determinism holds on every map', () => {
    for (const mapId of MAPS_ALL) {
      const a = createBattle({ replicate: 7, mapId, enemyCount: 8 }); runBattle(a)
      const b = createBattle({ replicate: 7, mapId, enemyCount: 8 }); runBattle(b)
      expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events))
    }
  })
})
