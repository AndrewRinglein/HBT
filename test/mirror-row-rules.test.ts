// proving.mirror-row-rules (2026-09-04) — the `row` arm of SWITCHES.md
// mirrorSideRules. Angela, via session 9 (DECISIONS 2026-09-04 "The Proving's
// first pass"): "I want to measure initiative. If there's deathbed fighting,
// that will change the hero side, and the hero side has the limitation of
// stamina. So, can we just field enemies against enemies?" Under `fielded` a
// zombie among the heroes rolls Deathbed Fighting; under `row` it stays a
// zombie — dies at 0, feeds the Power pool — wherever it stands. Allegiance
// (who it fights, whose phase, who has to die) is the fielded side either way.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { rulesSideOf } from '../src/core/side.js'
import { applyDamage } from '../src/core/mutate.js'
import { settle } from '../src/core/settle.js'
import { UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Config } from '../src/core/types.js'
import { hexId } from './board16.js'

const ROW: Partial<Config> = { switches: { mirrorSideRules: 'row' } as Config['switches'] }
const mirror = (replicate: number, cfg?: Partial<Config>) =>
  createBattle({ ...scenarioOptions(SCENARIOS['showcase.mirror-zombies']!), replicate, ...(cfg ? { cfg } : {}) })

describe('rowSide is on the unit; rulesSideOf reads the switch', () => {
  it('every unit carries rowSide — the row\'s side; equal to side unless byList moved it', () => {
    const ctx = mirror(0)
    for (const u of ctx.state.units) expect(u.rowSide).toBe(UNITS[u.typeId]!.side)
    expect(ctx.state.units.filter((u) => u.side === 'hero').every((u) => u.rowSide === 'enemy')).toBe(true)
    // fielded (default): the rules side IS the fielded side
    for (const u of ctx.state.units) expect(rulesSideOf(ctx, u)).toBe(u.side)
    // row: the rules side is the row's
    const r = mirror(0, ROW)
    for (const u of r.state.units) expect(rulesSideOf(r, u)).toBe('enemy')
  })
})

describe('under row, a zombie among the heroes is still a zombie', () => {
  it('at 0 it DIES — no Deathbed roll, no bleed-out, a corpse — exactly like the zombies across from it', () => {
    const ctx = mirror(0, ROW)
    const z = ctx.state.units.find((u) => u.side === 'hero')!
    applyDamage(ctx, z.id, z.hp, 'test', { damageType: 'true' })
    settle(ctx, 'test')
    expect(z.lifeState).toBe('dead')
    expect(ctx.events.some((e) => e.type.startsWith('deathbed.'))).toBe(false)
    expect(ctx.events.some((e) => e.type === 'life.dead' && e['target'] === z.id && e['reason'] === 'hp0')).toBe(true)
    expect(ctx.events.some((e) => e.type === 'corpse.created' && e['of'] === z.id)).toBe(true)
  })

  it('under fielded (the default) the same zombie rolls Deathbed Fighting — the two arms differ on exactly this', () => {
    const ctx = mirror(0)
    const z = ctx.state.units.find((u) => u.side === 'hero')!
    applyDamage(ctx, z.id, z.hp, 'test', { damageType: 'true' })
    settle(ctx, 'test')
    expect(ctx.events.some((e) => e.type === 'deathbed.stood' || e.type === 'deathbed.fell')).toBe(true)
  })

  it('a whole mirror battle under row has NO Deathbed line on either side, and every death is hp0', () => {
    for (let r = 0; r < 5; r++) {
      const ctx = mirror(r, ROW)
      runBattle(ctx)
      expect(ctx.events.some((e) => e.type.startsWith('deathbed.') || e.type.startsWith('bleedout.'))).toBe(false)
      for (const e of ctx.events.filter((e) => e.type === 'life.dead')) expect(e['reason']).toBe('hp0')
    }
  })

  it('allegiance is untouched: the hero-side zombies attack the enemy side, never their own, and clearing the enemy side is heroClear', () => {
    const ctx = mirror(0, ROW)
    const res = runBattle(ctx)
    const sideOf = (id: number) => ctx.state.units[id]!.side
    for (const e of ctx.events.filter((e) => e.type === 'attack.declared')) expect(sideOf(e['actor'] as number)).not.toBe(sideOf(e['target'] as number))
    expect(['heroClear', 'wipe']).toContain(res.outcome)
    if (res.outcome === 'heroClear') expect(ctx.state.units.filter((u) => u.side === 'enemy').every((u) => u.lifeState !== 'standing')).toBe(true)
  })
})

describe('under row, a hero among the enemies is still a hero', () => {
  it('at 0 it rolls Deathbed Fighting and, with badge.hero, bleeds out instead of dying', () => {
    const ctx = createBattle({ replicate: 0, mapId: 'map.open', sides: 'byList', cfg: ROW,
      heroes: ['unit.zombie'], heroHexes: [hexId(0, 5)],
      enemies: ['hero.base.warrior-iron', 'unit.zombie'], enemyHexes: [hexId(15, 5), hexId(15, 6)], enemyCount: 2 })
    const w = ctx.state.units.find((u) => u.typeId === 'hero.base.warrior-iron')!
    expect(w.side).toBe('enemy')
    expect(w.rowSide).toBe('hero')
    expect(w.badges).toContain('badge.hero')
    w.toughness = -4   // 20 + 5×(−4) = 0: the roll cannot stand, so the fall is deterministic
    applyDamage(ctx, w.id, w.hp, 'test', { damageType: 'true' })
    settle(ctx, 'test')
    expect(ctx.events.some((e) => e.type === 'deathbed.fell' && e['target'] === w.id && e['bleedsOut'] === true)).toBe(true)
    expect(w.lifeState).toBe('downed')
  })
})

describe('the Power pool is a rule of the enemy ROW under row', () => {
  it('a power.gain rider fired by an enemy-row unit fielded hero-side feeds the pool under row, and not under fielded', () => {
    // unit.lieutenant-demon carries a power.gain trigger; find what fires it by running the same seeds under both arms
    const run = (cfg?: Partial<Config>) => {
      let gained = 0
      for (let r = 0; r < 6; r++) {
        const ctx = createBattle({ replicate: r, mapId: 'map.open', sides: 'byList', ...(cfg ? { cfg } : {}),
          heroes: ['unit.lieutenant-demon', 'unit.zombie'], heroHexes: [hexId(0, 5), hexId(0, 6)],
          enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie'], enemyHexes: [hexId(15, 5), hexId(15, 6), hexId(15, 7)], enemyCount: 3 })
        const d = ctx.state.units.find((u) => u.typeId === 'unit.lieutenant-demon')!
        runBattle(ctx)
        gained += ctx.events.filter((e) => e.type === 'power.gained' && e['actor'] === d.id).length
      }
      return gained
    }
    expect(run()).toBe(0)
    expect(run(ROW)).toBeGreaterThan(0)
  })
})
