// capability.planted-banners (2026-10-05). Ruled 2026-10-04 (DECISIONS.md 'every dead line on his items is a feature that is
// needed; his items stay in rewards'): "All of those deadlines need to be added in as features that we need. So all of these
// are in." His five Banners are in the game and their powers did nothing: nothing in the engine planted anything.
//
// Wanted, with no content name in core: a power, once per Battle, plants an object on its user's hex that stays for the rest
// of the Battle and reaches a radius from THAT HEX; the units of the planter's side inside it have what its row lists - a stat
// while inside, points of a named status that do not land while inside, a gain at the End of their Activation.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { settle } from '../src/core/settle.js'
import { canUsePower, usePower } from '../src/core/ability.js'
import { applyStatus, valueOf as statusValue } from '../src/core/status.js'
import { beginActivation, gainSurgeChance, plantedOver } from '../src/core/mutate.js'
import { fireTriggers, partySum, validateEffect, validateTrigger, type Trigger } from '../src/core/trigger.js'
import { effective } from '../src/core/stats.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { plantedPower } from '../src/content/pack.js'
import { ABILITIES, ITEMS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Effect, Unit } from '../src/core/types.js'

const COURAGE = 'power.banner-courage.plant', WEAK = 'status.weak'
const KIT = ['item.destroyed-mail', 'item.war-axe']
/** The fielding's warrior with the Banner of Courage and its ally, stood where the test says; one zombie far away. */
function field(heroHexes: [number, number] = [85, 86], banner = 'item.banner-courage', heroes: [string, string] = ['hero.base.warrior-iron', 'hero.base.priest-robes'], kit: string[] = KIT): { ctx: Ctx; planter: Unit; ally: Unit; foe: Unit } {
  const ctx = createBattle({ ...scenarioOptions(SCENARIOS['test.banner-courage']!), heroes, heroHexes, heroItems: [[...kit, banner], undefined], enemies: ['unit.zombie'], enemyHexes: [95], enemyCount: 1 })
  const [planter, ally] = ctx.state.units.filter((u) => u.side === 'hero') as [Unit, Unit]
  return { ctx, planter, ally, foe: ctx.state.units.find((u) => u.side === 'enemy')! }
}
function plant(ctx: Ctx, planter: Unit, power = COURAGE): void {
  beginActivation(ctx, planter.id, 'test')
  usePower(ctx, planter.id, planter.id, power)
  settle(ctx, power)
}
const types = (ctx: Ctx, t: string) => ctx.events.filter((e) => e.type === t)
const endOfActivation = (ctx: Ctx, u: Unit) => fireTriggers(ctx, 'onActivationEnd', { ownerId: u.id, targetId: null, causeId: 'activation.end', ordinal: u.activationOrdinal })

describe('the rows', () => {
  it('Plant the Courage Banner: 3 Stamina, one use a Battle, on its user - an object of radius 2 that lends +1 Resist, wards 2 Weak and gives 10 Surge Chance at the End of Activation', () => {
    const a = ABILITIES[COURAGE]!
    expect(a).toBeDefined()
    expect([a.staminaCost, a.uses, a.cooldown ?? 0, a.target]).toEqual([3, 1, 0, { select: 'self', side: 'any' }])
    expect(a.effects).toEqual([{ kind: 'plant', radius: 2, mods: { resist: 1 }, wards: { [WEAK]: 2 },
      lends: [{ id: 'trigger.banner-courage.plant.surge', hook: 'onActivationEnd', chance: 100, select: 'self', effect: { kind: 'surge.gain', value: 10 }, source: COURAGE }] }])
    expect(a.gaps ?? []).toEqual([])
    const item = ITEMS['item.banner-courage']!
    expect(item.abilities).toEqual([COURAGE])
    expect(item.classRestriction).toBe('class.warrior')
    expect(item.gaps ?? []).toEqual([])
  })

  it('each of the other Banners gives what its own line says, where the engine can say it; what it cannot is named', () => {
    const fx = (id: string) => ABILITIES[id]?.effects?.[0] as Extract<Effect, { kind: 'plant' }> | undefined
    // the Assassin's: radius 1, +20 Crit, and a crit by a unit inside gives it 1 Stamina
    const assassin = ABILITIES['power.banner-assassin.plant']!
    expect([assassin.staminaCost, assassin.uses]).toEqual([2, 1])
    expect(fx(assassin.id)).toEqual({ kind: 'plant', radius: 1, mods: { crit: 20 },
      lends: [{ id: 'trigger.banner-assassin.plant.stamina', hook: 'onCrit', chance: 100, select: 'self', effect: { kind: 'stamina.gain', value: 1 }, source: assassin.id }] })
    expect(assassin.gaps ?? []).toEqual([])
    // the Vigil's: radius 1, an ally inside heals the PARTY's Spirit at the End of its Activation
    // Restated 2026-10-06 (content.resistance-to-weak-and-vigil-party-spirit; ruled 2026-10-05, "2 by the party spirit" -
    // SWITCHES vigilHealsItsOwnSpirit overturned). The amount was: { scale: 'stat', stat: 'spirit', base: 0, mult: 1 }
    const vigil = ABILITIES['power.banner-vigil.plant']!
    expect([vigil.staminaCost, vigil.uses]).toEqual([2, 1])
    expect(fx(vigil.id)).toEqual({ kind: 'plant', radius: 1,
      lends: [{ id: 'trigger.banner-vigil.plant.heal', hook: 'onActivationEnd', chance: 100, select: 'self', effect: { kind: 'heal', amount: { scale: 'partySpirit', base: 0, mult: 1 } }, source: vigil.id }] })
    expect(vigil.gaps ?? []).toEqual([])
    // the Heroic: radius 3, +2 Strength and +2 Precision, heal 5 at the End of Activation; its on-miss clause is a named gap
    const heroic = ABILITIES['power.banner-heroism.plant']!
    expect([heroic.staminaCost, heroic.uses]).toEqual([4, 1])
    expect(fx(heroic.id)).toEqual({ kind: 'plant', radius: 3, mods: { strength: 2, precision: 2 },
      lends: [{ id: 'trigger.banner-heroism.plant.heal', hook: 'onActivationEnd', chance: 100, select: 'self', effect: { kind: 'heal', amount: 5 }, source: heroic.id }] })
    expect(heroic.gaps).toEqual(['onMiss by any ally in the aura: EVERY ally in the aura gains 30 Surge Chance — planted object: clause unparsed'])
    // the Mystic: neither of its clauses is one the engine has - it is not planted as an object that does nothing
    expect(ABILITIES['power.banner-mystic-power.plant']).toBeUndefined()
    expect((ITEMS['item.banner-mystic-power']!.gaps ?? []).some((g) => g.includes('power.banner-mystic-power.plant'))).toBe(true)
  })
})

describe('planting', () => {
  it('a warrior plants the Banner of Courage for 3 Stamina: an object on his hex, on his side, and one line says so', () => {
    const { ctx, planter } = field()
    expect(ctx.state.planted).toBeUndefined()
    beginActivation(ctx, planter.id, 'test')
    const stamina = planter.stamina
    expect(canUsePower(ctx, planter.id, planter.id, COURAGE)).toBe(true)
    usePower(ctx, planter.id, planter.id, COURAGE)
    expect(planter.stamina).toBe(stamina - 3)
    expect(ctx.state.planted!.map((p) => [p.id, p.hex, p.side, p.by, p.source, p.radius, p.mods, p.wards, (p.lends ?? []).map((t) => t.id)])).toEqual([
      [1, planter.hex, 'hero', planter.id, COURAGE, 2, { resist: 1 }, { [WEAK]: 2 }, ['trigger.banner-courage.plant.surge']]])
    expect(types(ctx, 'object.planted').map((e) => [e.causeId, e.actor, e['object'], e['hex'], e['side'], e['radius'], e['mods'], e['wards'], e['lends']])).toEqual([
      [COURAGE, planter.id, 1, planter.hex, 'hero', 2, { resist: 1 }, { [WEAK]: 2 }, ['trigger.banner-courage.plant.surge']]])
  })

  it('a second use in the Battle is refused', () => {
    const { ctx, planter } = field()
    plant(ctx, planter)
    beginActivation(ctx, planter.id, 'test')
    planter.stamina = planter.maxStamina
    expect(planter.usesLeft[COURAGE]).toBe(0)
    expect(canUsePower(ctx, planter.id, planter.id, COURAGE)).toBe(false)
    expect(() => usePower(ctx, planter.id, planter.id, COURAGE)).toThrow(/illegal power/)
    expect(ctx.state.planted!.length).toBe(1)
  })

  it('a hero of another class is refused, with the reason', () => {
    expect(() => field([85, 86], 'item.banner-courage', ['hero.base.priest-robes', 'hero.base.warrior-iron'], ['item.holy-symbol', 'item.peddlers-vest'])).toThrow(/cannot wield 'item\.banner-courage', a class\.warrior item/)
  })

  it('it does not block its hex, and it stays when its planter walks away or dies', () => {
    const { ctx, planter, ally } = field()
    const resist = effective(ctx, ally, 'resist').value
    plant(ctx, planter)
    const at = planter.hex
    planter.hex = 0   // walked away
    expect(ctx.state.planted![0]!.hex).toBe(at)
    expect(ctx.state.units.some((u) => u.hex === at)).toBe(false)   // the hex is free to stand on
    ally.hex = at
    expect(plantedOver(ctx, ally).map((p) => p.id)).toEqual([1])
    planter.hp = 0; settle(ctx, 'test'); planter.lifeState = 'dead'
    expect(ctx.state.planted!.length).toBe(1)
    expect(effective(ctx, ally, 'resist').value).toBe(resist + 1)
  })
})

describe('inside its reach', () => {
  it('allies within 2 hexes of the hex have +1 Resist, under the power\'s name, and lose it on leaving; the reach is the hex\'s, not the planter\'s', () => {
    const { ctx, planter, ally, foe } = field([85, 86])
    const base = effective(ctx, ally, 'resist').value, own = effective(ctx, planter, 'resist').value, theirs = effective(ctx, foe, 'resist').value
    plant(ctx, planter)
    const at = planter.hex
    expect(effective(ctx, planter, 'resist').value).toBe(own + 1)   // the planter is inside its own
    expect(effective(ctx, ally, 'resist').value).toBe(base + 1)
    expect(effective(ctx, ally, 'resist').ledger.filter((r) => r.source === COURAGE).map((r) => r.delta)).toEqual([1])   // the stat's ledger says why (Law 12)
    // two hexes from the hex: inside; three: outside
    const two = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).find((h) => ctx.geo.distance(h, at) === 2)!
    const three = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).find((h) => ctx.geo.distance(h, at) === 3)!
    ally.hex = two
    expect(effective(ctx, ally, 'resist').value).toBe(base + 1)
    ally.hex = three
    expect(effective(ctx, ally, 'resist').value).toBe(base)
    // the planter walks away: it has left its banner's reach, and the ally who stays has not
    ally.hex = two
    planter.hex = three
    expect(effective(ctx, planter, 'resist').value).toBe(own)
    expect(effective(ctx, ally, 'resist').value).toBe(base + 1)
    // an enemy standing on the banner's own hex gets nothing
    foe.hex = at
    expect(effective(ctx, foe, 'resist').value).toBe(theirs)
  })

  it('an ally inside takes no Weak of 2 or less: 2 points of each application do not land, and a line says so; outside, and on an enemy, Weak lands whole', () => {
    const { ctx, planter, ally, foe } = field([85, 86])
    plant(ctx, planter)
    const at = planter.hex
    applyStatus(ctx, ally.id, WEAK, 2, 'test')
    expect(statusValue(ally, WEAK)).toBe(0)
    applyStatus(ctx, ally.id, WEAK, 1, 'test')
    expect(statusValue(ally, WEAK)).toBe(0)
    expect(types(ctx, 'status.warded').map((e) => [e.causeId, e['target'], e['statusId'], e['amount'], e['of'], e['from']])).toEqual([
      [COURAGE, ally.id, WEAK, 2, 2, 'test'], [COURAGE, ally.id, WEAK, 1, 1, 'test']])
    expect(types(ctx, 'status.applied').filter((e) => e['statusId'] === WEAK)).toEqual([])
    // more than the ward: what is over it lands
    applyStatus(ctx, ally.id, WEAK, 5, 'test')
    expect(statusValue(ally, WEAK)).toBe(3)
    // another status is not warded
    applyStatus(ctx, ally.id, 'status.root', 1, 'test')
    expect(statusValue(ally, 'status.root')).toBe(1)
    // on leaving: no ward (what it already holds is its own)
    ally.hex = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).find((h) => ctx.geo.distance(h, at) === 3)!
    applyStatus(ctx, ally.id, WEAK, 2, 'test')
    expect(statusValue(ally, WEAK)).toBe(5)
    // an enemy on the banner's hex is not warded
    foe.hex = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).find((h) => ctx.geo.distance(h, at) === 1 && !ctx.state.units.some((u) => u.hex === h))!
    applyStatus(ctx, foe.id, WEAK, 2, 'test')
    expect(statusValue(foe, WEAK)).toBe(2)
  })

  it('an ally that ends its Activation inside adds 10 Surge Chance to its pool - once, and never to its Surge stat; outside it adds none', () => {
    const { ctx, planter, ally } = field([85, 86])
    plant(ctx, planter)
    const at = planter.hex
    const surge = ally.surge, pool = ally.surgeChance
    endOfActivation(ctx, ally)
    expect(ally.surgeChance).toBe(pool + 10)
    expect(ally.surge).toBe(surge)
    expect(types(ctx, 'surge.gained').map((e) => [e.causeId, e['target'], e['amount'], e['before'], e['after']])).toEqual([['trigger.banner-courage.plant.surge', ally.id, 10, pool, pool + 10]])
    endOfActivation(ctx, ally)
    expect(ally.surgeChance).toBe(pool + 20)
    ally.hex = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).find((h) => ctx.geo.distance(h, at) === 3)!
    endOfActivation(ctx, ally)
    expect(ally.surgeChance).toBe(pool + 20)
  })

  it('two banners over one unit: the stats add, the larger ward holds, each lent trigger fires', () => {
    const { ctx, planter, ally } = field([85, 86])
    plant(ctx, planter)
    // a second object of the same row, planted by the ally one hex over (the engine's own mutator: no second banner item is needed)
    const row = ABILITIES[COURAGE]!.effects![0] as Extract<Effect, { kind: 'plant' }>
    beginActivation(ctx, ally.id, 'test')
    const base = effective(ctx, ally, 'resist').value
    ctx.state.planted!.push({ ...structuredClone(row) as object, id: 2, hex: ally.hex, side: 'hero', by: ally.id, source: 'power.test.second', wards: { [WEAK]: 1 } } as never)
    expect(effective(ctx, ally, 'resist').value).toBe(base + 1)
    applyStatus(ctx, ally.id, WEAK, 3, 'test')
    expect(statusValue(ally, WEAK)).toBe(1)   // warded by 2, not by 3
    const pool = ally.surgeChance
    endOfActivation(ctx, ally)
    expect(ally.surgeChance).toBe(pool + 20)
  })
})

describe('the other banners, as their lines say', () => {
  // Restated 2026-10-06 (content.resistance-to-weak-and-vigil-party-spirit; ruled 2026-10-05: asked whether the Vigil heals each
  // ally by that ally's own Spirit or the party's, "2 by the party spirit"). It was "the Vigil's: an ally inside heals its own
  // Spirit at the End of its Activation", and its last lines held that the warrior, with no Spirit of its own, healed nothing:
  //   // the warrior beside it has no Spirit of its own: it heals nothing
  //   const own = effective(ctx, ally, 'spirit').value
  //   ally.hp = 1
  //   endOfActivation(ctx, ally)
  //   expect(ally.hp).toBe(1 + own)
  it('the Vigil\'s: an ally inside heals the party\'s Spirit at the End of its Activation', () => {
    const { ctx, planter, ally } = field([85, 86], 'item.banner-vigil', ['hero.base.priest-robes', 'hero.base.warrior-iron'], ['item.holy-symbol', 'item.peddlers-vest'])
    plant(ctx, planter, 'power.banner-vigil.plant')
    const spirit = effective(ctx, planter, 'spirit').value
    expect(spirit).toBeGreaterThan(0)
    planter.hp = 1
    endOfActivation(ctx, planter)
    expect(planter.hp).toBe(Math.min(planter.maxHp, 1 + spirit))
    // the warrior beside it has no Spirit of its own: it heals by the party's all the same
    expect(ctx.geo.distance(ally.hex, ctx.state.planted![0]!.hex)).toBe(1)
    expect(effective(ctx, ally, 'spirit').value).toBe(0)
    ally.hp = 1
    endOfActivation(ctx, ally)
    expect(ally.hp).toBe(Math.min(ally.maxHp, 1 + partySum(ctx, 'hero', 'spirit')))
  })

  it('the Assassin\'s: +20 Crit inside, and a crit by a unit inside gives it 1 Stamina', () => {
    const { ctx, planter, foe } = field([85, 86], 'item.banner-assassin', ['hero.base.rogue-raven', 'hero.base.warrior-iron'], ['item.hand-crossbow', 'item.longsword', 'item.peddlers-vest'])
    const crit = effective(ctx, planter, 'crit').value
    plant(ctx, planter, 'power.banner-assassin.plant')
    expect(effective(ctx, planter, 'crit').value).toBe(crit + 20)
    planter.stamina = 1
    fireTriggers(ctx, 'onCrit', { ownerId: planter.id, targetId: foe.id, causeId: 'attack.punch', ordinal: 1 })
    expect(planter.stamina).toBe(2)
  })

  it('the Heroic: +2 Strength and +2 Precision inside, and 5 healed at the End of Activation', () => {
    const { ctx, planter } = field([85, 86], 'item.banner-heroism', ['hero.base.paladin-shiney', 'hero.base.warrior-iron'], ['item.longsword', 'item.kite-shield', 'item.basic-armor'])
    const str = effective(ctx, planter, 'strength').value, pre = effective(ctx, planter, 'precision').value
    plant(ctx, planter, 'power.banner-heroism.plant')
    expect([effective(ctx, planter, 'strength').value, effective(ctx, planter, 'precision').value]).toEqual([str + 2, pre + 2])
    planter.hp = 1
    endOfActivation(ctx, planter)
    expect(planter.hp).toBe(Math.min(planter.maxHp, 6))
  })
})

describe('the engine holds the row to its shape', () => {
  it('a planted object: a whole radius, stats the engine has, wards of 1 or more, lent triggers aimed at the unit itself; planted by a power aimed at its user, never by a trigger', () => {
    const lent: Trigger = { id: 'trigger.test.lent', hook: 'onActivationEnd', chance: 100, select: 'self', effect: { kind: 'surge.gain', value: 5 }, source: 'power.test' }
    const ok: Effect = { kind: 'plant', radius: 2, mods: { resist: 1 }, wards: { [WEAK]: 2 }, lends: [lent] }
    expect(() => validateEffect(ok, 'test')).not.toThrow()
    expect(() => validateEffect({ ...ok, radius: -1 }, 'test')).toThrow(/radius/)
    expect(() => validateEffect({ ...ok, mods: { nonsense: 1 } as never }, 'test')).toThrow(/a stat the engine has/)
    expect(() => validateEffect({ ...ok, wards: { [WEAK]: 0 } }, 'test')).toThrow(/by 1 or more/)
    expect(() => validateEffect({ ...ok, lends: [{ ...lent, select: 'target' }] }, 'test')).toThrow(/aimed at the unit itself/)
    expect(() => validateEffect({ kind: 'surge.gain', value: 0 }, 'test')).toThrow(/1 or more/)
    expect(() => validateTrigger({ ...lent, effect: ok })).toThrow(/belongs to a power aimed at its own user/)
    expect(() => plantedPower({ target: { select: 'unit' }, effects: [ok] }, 'a power')).toThrow(/not aimed at its own user/)
    expect(() => plantedPower({ target: { select: 'self' }, effects: [ok] }, 'a power')).not.toThrow()
  })

  it('a unit with no Surge of its own rolls its Surge check while it holds Surge Chance it was given', () => {
    // 100 given: the check is automatic (fix.surge-spend: 100 surges without a roll) - on a hero whose Surge is 0
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.banner-courage']!))
    const hero = ctx.state.units.find((u) => u.side === 'hero' && u.surge === 0)!
    expect(hero).toBeDefined()
    gainSurgeChance(ctx, hero.id, 100, 'test')
    runBattle(ctx)
    const checks = types(ctx, 'surge.checked').filter((e) => e.actor === hero.id)
    expect(checks.length).toBeGreaterThan(0)
    expect([checks[0]!['surge'], checks[0]!['chance'], checks[0]!['hit'], checks[0]!['automatic']]).toEqual([0, 100, true, true])
  })

  it('a battle saved with a banner planted restores as it was; a battle with none carries no such state', () => {
    const { ctx, planter } = field()
    expect(JSON.parse(saveBattle(ctx)).state.planted).toBeUndefined()
    plant(ctx, planter)
    const saved = saveBattle(ctx)
    expect(saveBattle(restoreBattle(saved, ctx))).toEqual(saved)
    const bad = JSON.parse(saved)
    bad.state.planted[0].radius = -1
    expect(() => restoreBattle(JSON.stringify(bad), ctx)).toThrow()
  })
})

describe('in a real battle', () => {
  it('the warrior plants his banner, his side stands in it, and it wards the Weak the Necromancer\'s bolt would leave', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.banner-courage']!))
    runBattle(ctx)
    const planted = types(ctx, 'object.planted')
    expect(planted.map((e) => e.causeId)).toEqual([COURAGE])
    expect(types(ctx, 'power.used').filter((e) => e['abilityId'] === COURAGE).length).toBe(1)   // once in the Battle
    expect(types(ctx, 'surge.gained').some((e) => e.causeId === 'trigger.banner-courage.plant.surge')).toBe(true)
    expect(types(ctx, 'status.warded').some((e) => e.causeId === COURAGE && e['statusId'] === WEAK)).toBe(true)
  })
})
