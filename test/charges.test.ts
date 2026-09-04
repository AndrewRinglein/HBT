// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// capability.charges (2026-09-03) — GEAR-DESIGN §4, GEAR-IMPLEMENTATION §1:
// one-use-per-battle items. An AbilityDef carries `uses`; a spent use counts
// down and at zero the power leaves the unit's list for the rest of the
// Battle — "they should vanish from the list of things available to a hero
// in the powers list, because there's no cooldown" (Andrew 2026-09-02); the
// BattleResult reports what was spent so the kingdom can restock. Every
// active item compiles by exact sentence or names its gap on the row.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { canUsePower, usePower } from '../src/core/ability.js'
import { beginActivation } from '../src/core/mutate.js'
import { ABILITIES, ITEMS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from './board16.js'

const POTION = 'power.healing-potion.use'

describe('a use is spent', () => {
  it('the Healing Potion: free, heal 3, one use — used once, gone from the list, refused after, and reported', () => {
    const p = ABILITIES[POTION]!
    expect(p.uses).toBe(1); expect(p.free).toBe(true)
    expect(ITEMS['item.healing-potion']!.abilities).toContain(POTION)
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(15, 15) }])
    const w = ctx.state.units[0]!
    w.actions.push(POTION); w.usesLeft[POTION] = 1
    w.hp = 1
    beginActivation(ctx, w.id, 'test')
    expect(canUsePower(ctx, w.id, w.id, POTION)).toBe(true)
    usePower(ctx, w.id, w.id, POTION)
    expect(w.hp).toBe(4)
    expect(w.primaryUsed).toBe(false)   // free
    expect(w.actions).not.toContain(POTION)
    expect(canUsePower(ctx, w.id, w.id, POTION)).toBe(false)
    expect(ctx.events.some((e) => e.type === 'charge.spent' && e['left'] === 0)).toBe(true)
    expect(ctx.events.some((e) => e.type === 'power.exhausted')).toBe(true)
    const r = runBattle(ctx)
    expect(r.usesSpent).toEqual([{ unit: w.id, power: POTION, spent: 1 }])
  })

  it('a fielded hero gets its uses from the item at fielding; the next Battle it is whole', () => {
    const a = createBattle(scenarioOptions(scenarioDef('showcase.waystation')))
    const w = a.state.units[0]!
    expect(w.usesLeft[POTION]).toBe(1)
    runBattle(a)
    const b = createBattle(scenarioOptions(scenarioDef('showcase.waystation')))
    expect(b.state.units[0]!.usesLeft[POTION]).toBe(1)
    expect(b.state.units[0]!.actions).toContain(POTION)
  })

  it('Rations regain Stamina and cost the primary; the Strength Potion is a battle-long stance', () => {
    expect(ABILITIES['power.rations.use']!.free).toBeFalsy()
    expect(ABILITIES['power.rations.use']!.effects![0]!.kind).toBe('stamina.gain')
    expect(ABILITIES['power.strength-potion.use']!.effects!.some((e) => e.kind === 'statMod' && e.until === 'battle' && e.value > 0)).toBe(true)
  })

  it('in the Waystation fielding the party drinks — potions, rations and the strength potion are all spent across seeds', () => {
    const spent = new Set<string>()
    for (let r = 0; r < 6; r++) { const ctx = createBattle({ ...scenarioOptions(scenarioDef('showcase.waystation')), replicate: r }); const o = runBattle(ctx); for (const u of o.usesSpent) spent.add(u.power) }
    expect(spent.has(POTION)).toBe(true)
    expect(spent.has('power.rations.use')).toBe(true)
    expect(spent.has('power.strength-potion.use')).toBe(true)
  })
})
