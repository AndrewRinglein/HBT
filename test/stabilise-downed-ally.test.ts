// capability.stabilise-downed-ally (2026-10-05). Ruled 2026-10-04 (DECISIONS.md 'every dead line on his items is a feature that
// is needed; his items stay in rewards'): "All of those deadlines need to be added in as features that we need. So all of
// these are in." His Bandages are in the game - "Free, 0 Stamina: stabilize a downed ally — their bleed-out counter stops" -
// and the use did nothing.
//
// What the engine had (the rulings: DECISIONS.md 2026-10-01 'bleed-out is a stat on every player unit'; the engine-scope answer
// "a downed hero still bleeding at battle end is wounded"; COMBAT-DESIGN: "Stabilise-in-place is the standard save — an action
// taken by an adjacent unit"): a hero at 0 Health who falls is DOWNED with a count that the End of Hero Phase rung advances,
// and dead when it runs out. This item builds only the Bandages' part on top: a free use on a downed ally within 1 hex stops
// the count - the ally stays down, cannot act, and does not die of the count for the rest of the Battle.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { advanceBleedOuts, settle } from '../src/core/settle.js'
import { canUsePower, usePower } from '../src/core/ability.js'
import { legalActions } from '../src/core/commands.js'
import { beginActivation, setBleedOut, setLifeState, stopBleedOut } from '../src/core/mutate.js'
import { validateTrigger, type Trigger } from '../src/core/trigger.js'
import { validateTargeting } from '../src/core/target.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { stabilisePower } from '../src/content/pack.js'
import { ABILITIES, ITEMS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Unit } from '../src/core/types.js'

const USE = 'power.bandages.use'
/** The fielding's healer carrying Bandages and its ally, stood where the test says (side by side unless told), one zombie far away. */
function field(heroHexes: [number, number] = [85, 86]): { ctx: Ctx; medic: Unit; ally: Unit; foe: Unit } {
  const ctx = createBattle({ ...scenarioOptions(SCENARIOS['test.bandages']!), heroHexes, enemies: ['unit.zombie'], enemyHexes: [95], enemyCount: 1 })
  const medic = ctx.state.units.find((u) => u.side === 'hero' && u.actions.includes(USE))!
  const ally = ctx.state.units.find((u) => u.side === 'hero' && u.id !== medic.id)!
  beginActivation(ctx, medic.id, 'test')
  return { ctx, medic, ally, foe: ctx.state.units.find((u) => u.side === 'enemy')! }
}
/** the ally falls: downed, its count set */
function down(ctx: Ctx, u: Unit, count = 3): void {
  u.hp = 0
  setLifeState(ctx, u.id, 'downed', 'test', { reason: 'hp0' })
  setBleedOut(ctx, u.id, count, 'test')
}
const types = (ctx: Ctx, t: string) => ctx.events.filter((e) => e.type === t)

describe('the row', () => {
  it('Bandages: free, 0 Stamina, one use, on one downed ally within 1 hex - their bleed-out count stops', () => {
    const a = ABILITIES[USE]!
    expect(a).toBeDefined()
    expect([a.staminaCost, a.uses, a.free, a.range, a.target]).toEqual([0, 1, true, 1, { select: 'unit', side: 'ally', life: 'downed' }])
    expect(a.effects).toEqual([{ kind: 'bleedout.stop' }])
    expect(ITEMS['item.bandages']!.abilities).toEqual([USE])
    expect(ITEMS['item.bandages']!.gaps ?? []).toEqual([])
  })
})

describe('stopping the count', () => {
  it('used on a downed ally within 1 hex: the count stops where it stands, one line says so, and the use costs no Stamina and is spent', () => {
    const { ctx, medic, ally } = field()
    down(ctx, ally, 3)
    const stamina = medic.stamina
    expect(canUsePower(ctx, medic.id, ally.id, USE)).toBe(true)
    usePower(ctx, medic.id, ally.id, USE)
    expect(ally.bleedStopped).toBe(true)
    expect([ally.lifeState, ally.bleedOut]).toEqual(['downed', 3])
    expect(medic.stamina).toBe(stamina)
    expect(medic.usesLeft[USE]).toBe(0)
    expect(medic.primaryUsed).toBe(false)   // free: it does not take the hero's action
    expect(types(ctx, 'bleedout.stopped').map((e) => [e.causeId, e.actor, e['target'], e['bleedOut']])).toEqual([[USE, medic.id, ally.id, 3]])
    expect(canUsePower(ctx, medic.id, ally.id, USE)).toBe(false)   // spent
  })

  it('the ally is not counted down any more: Hero Phase after Hero Phase it stays down, at the count it stopped on, and is not dead', () => {
    const { ctx, medic, ally } = field()
    down(ctx, ally, 2)
    usePower(ctx, medic.id, ally.id, USE)
    const ticks = types(ctx, 'bleedout.tick').length
    for (let i = 0; i < 6; i++) advanceBleedOuts(ctx)
    expect([ally.lifeState, ally.bleedOut]).toEqual(['downed', 2])
    expect(types(ctx, 'bleedout.tick').length).toBe(ticks)
    expect((ctx.state.corpses ?? []).some((c) => c.uid === ally.uid)).toBe(false)
  })

  it('a downed ally nobody bandages runs its count as before, and dies when it runs out', () => {
    const { ctx, ally } = field()
    down(ctx, ally, 2)
    advanceBleedOuts(ctx)
    expect([ally.lifeState, ally.bleedOut]).toEqual(['downed', 1])
    advanceBleedOuts(ctx)
    expect(ally.lifeState).toBe('dead')
  })

  it('it cannot be used on a standing ally, on one 2 hexes away, on itself, or on a downed enemy; the action list offers only the downed ally beside it', () => {
    const { ctx, medic, ally, foe } = field([85, 86])
    expect(canUsePower(ctx, medic.id, ally.id, USE)).toBe(false)   // standing
    expect(canUsePower(ctx, medic.id, medic.id, USE)).toBe(false)
    expect(legalActions(ctx, medic.id).filter((r) => r.actionId === USE)).toEqual([])
    down(ctx, ally)
    expect(legalActions(ctx, medic.id).filter((r) => r.actionId === USE)).toEqual([{ actor: medic.id, actionId: USE, target: ally.id }])
    ally.hex = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).find((h) => ctx.geo.distance(h, medic.hex) === 2 && !ctx.state.units.some((u) => u.hex === h))!
    expect(canUsePower(ctx, medic.id, ally.id, USE)).toBe(false)   // 2 hexes away
    // a downed unit of the other side, beside the healer
    foe.hex = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).find((h) => ctx.geo.distance(h, medic.hex) === 1 && !ctx.state.units.some((u) => u.hex === h))!
    foe.lifeState = 'downed'
    expect(canUsePower(ctx, medic.id, foe.id, USE)).toBe(false)
  })

  // Law 10, 2026-10-05 - fix.bandaged-hero-dies-at-zero (DECISIONS.md 2026-10-05 'a bandaged hero's count has no floor: bandaging
  // stops the count, a hit still takes one, and at 0 the hero dies': "I don't get why the count would start and stop at 1. No,
  // it goes to 0 when they die. Bandaging is supposed to completely stop the bleed-out counter, and they're just stable."): this
  // test held that hits could not take a stabilised hero's count below 1. Overturned: a hit takes one with no floor, and at 0
  // the hero dies (test/bandaged-hero-dies-at-zero.test.ts holds the hits). What stands, and is held here: the count does not
  // run by itself however low it is, and the stop goes when the unit is no longer down.
  // was: it('a hit on a stabilised ally still moves its count, never below 1 - it does not die of it; standing up again takes the stop away', () => {
  it('a stabilised ally whose count hits have brought to 1 is still not counted down by itself; standing up again takes the stop away', () => {
    const { ctx, medic, ally } = field()
    down(ctx, ally, 3)
    usePower(ctx, medic.id, ally.id, USE)
    // was: setBleedOut(ctx, ally.id, 1, 'test')   // as far as hits can push it (fix.downed-targetable: never below 1)
    setBleedOut(ctx, ally.id, 1, 'test')   // one hit from death
    for (let i = 0; i < 3; i++) advanceBleedOuts(ctx)
    settle(ctx, 'test')
    expect([ally.lifeState, ally.bleedOut, ally.bleedStopped]).toEqual(['downed', 1, true])
    setLifeState(ctx, ally.id, 'standing', 'test')
    expect(ally.bleedStopped).toBeUndefined()
  })

  it('stopping is said once: a unit that is not downed, or is stopped already, is left as it is', () => {
    const { ctx, medic, ally } = field()
    stopBleedOut(ctx, ally.id, 'test', medic.id)
    expect(ally.bleedStopped).toBeUndefined()
    down(ctx, ally)
    stopBleedOut(ctx, ally.id, 'test', medic.id); stopBleedOut(ctx, ally.id, 'test', medic.id)
    expect(types(ctx, 'bleedout.stopped').length).toBe(1)
  })
})

describe('a second row, pure data', () => {
  const DRESS = 'power.test-osric.field-dressing'
  it('Field Dressing (a test row): the same stop within 2 hexes, for 1 Stamina, on a cooldown, with no limit of uses', () => {
    const a = ABILITIES[DRESS]!
    expect([a.staminaCost, a.uses, a.cooldown, a.free, a.range, a.target]).toEqual([1, undefined, 2, true, 2, { select: 'unit', side: 'ally', life: 'downed' }])
    expect(a.effects).toEqual([{ kind: 'bleedout.stop' }])
  })
  it('in its own fielding the brawler falls and the test unit beside it stops his count: he is down, not dead, when the Battle is won', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.field-dressing']!))
    runBattle(ctx)
    const stopped = types(ctx, 'bleedout.stopped')
    expect(stopped.map((e) => e.causeId)).toEqual([DRESS])
    const dresser = ctx.state.units.find((u) => u.typeId === 'test-dresser')!, saved = ctx.state.units[stopped[0]!['target'] as number]!
    expect(stopped[0]!.actor).toBe(dresser.id)
    expect([ctx.state.outcome, saved.lifeState, saved.bleedStopped]).toEqual(['heroClear', 'downed', true])
    expect(ctx.events.filter((e) => e.type === 'stamina.spent' && e.causeId === DRESS).map((e) => e['amount'])).toEqual([1])
  })
})

describe('the engine holds the row to its shape', () => {
  it('aimed at one downed unit, by a power; never by a trigger, never on another targeting', () => {
    expect(() => validateTargeting({ select: 'unit', side: 'ally', life: 'downed' }, 'test')).not.toThrow()
    expect(() => validateTargeting({ select: 'area', side: 'ally', radius: 1, life: 'downed' }, 'test')).toThrow(/on select:'unit' only/)
    expect(() => validateTargeting({ select: 'unit', side: 'ally', life: 'standing' as never }, 'test')).toThrow(/life is 'downed'/)
    expect(() => stabilisePower({ target: { select: 'unit' }, effects: [{ kind: 'bleedout.stop' }] }, 'a power')).toThrow(/one downed unit/)
    expect(() => stabilisePower({ target: { select: 'unit', life: 'downed' }, effects: [{ kind: 'bleedout.stop' }] }, 'a power')).not.toThrow()
    const t: Trigger = { id: 'trigger.test.stop', hook: 'onHit', chance: 100, select: 'target', effect: { kind: 'bleedout.stop' }, source: 'test' }
    expect(() => validateTrigger(t)).toThrow(/belongs to a power aimed at one downed unit/)
  })

  it('a battle saved with an ally stabilised restores as it was', () => {
    const { ctx, medic, ally } = field()
    down(ctx, ally)
    usePower(ctx, medic.id, ally.id, USE)
    const saved = saveBattle(ctx)
    expect(JSON.parse(saved).state.units[ally.id].bleedStopped).toBe(true)
    expect(saveBattle(restoreBattle(saved, ctx))).toEqual(saved)
  })
})

describe('in a real battle', () => {
  it('a hero falls, the one carrying Bandages reaches it and stops its count: it is still down when the Battle ends, and not dead', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.bandages']!))
    runBattle(ctx)
    const stopped = types(ctx, 'bleedout.stopped')
    expect(stopped.map((e) => e.causeId)).toEqual([USE])
    const saved = ctx.state.units[stopped[0]!['target'] as number]!
    expect(ctx.state.outcome).toBe('heroClear')   // the battle went on to its end with him down
    expect(saved.lifeState).toBe('downed')
    expect(saved.bleedStopped).toBe(true)
    const at = ctx.events.indexOf(stopped[0]!)
    expect(ctx.events.slice(at).some((e) => e.type === 'bleedout.tick' && e['target'] === saved.id)).toBe(false)
  })
})
