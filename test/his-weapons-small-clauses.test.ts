// capability.his-weapons-small-clauses (2026-10-05). Ruled 2026-10-04 (DECISIONS.md 'his 28 reward weapons read back: … the
// mechanics his own items need are wanted'): "Everything else in here seems like something we need." Two clauses on his
// reward weapons that did not act:
//   (1) the Staff of the Destroyer's Ruin and Sundering, and the artifact attribute Destroying - "On kill: the corpse is
//       destroyed": the killed unit leaves no corpse - nothing can raise, eat or consume it;
//   (2) the Benevolent Rod's Mending Light - "… and remove Weak equal to your Spirit": a power removes points of a named
//       status by a flat amount or by a stat's amount.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { settle } from '../src/core/settle.js'
import { performAttack } from '../src/core/pipeline.js'
import { canUsePower, usePower } from '../src/core/ability.js'
import { applyStatus, valueOf as statusValue } from '../src/core/status.js'
import { beginActivation, changeSideStat, markCorpseDestroyed, setBleedOut } from '../src/core/mutate.js'
import { applyEffect, fireTriggers, partySum, validateTrigger, type Trigger } from '../src/core/trigger.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { noCorpseDestroy } from '../src/content/pack.js'
import { ABILITIES, ACTIONS, ITEMS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Unit } from '../src/core/types.js'

const RUIN = 'attack.staff-of-the-destroyer.ruin', SUNDERING = 'attack.staff-of-the-destroyer.sundering'
const SLASH = 'attack.longsword.slash.destroying'
const RUIN_TRIGGER = 'trigger.staff-of-the-destroyer.ruin.corpse-destroyed'
const MENDING = 'power.benevolent-rod.restoration'
const WEAK = 'status.weak'

/** A mage holding the Staff of the Destroyer and a warrior holding a Longsword of Destroying, and whatever stands against them. */
function field(enemies: string[], enemyHexes: number[]): { ctx: Ctx; mage: Unit; warrior: Unit; foes: Unit[] } {
  const ctx = createBattle({ ...scenarioOptions(SCENARIOS['test.corpse-destroyed']!), enemies, enemyHexes, enemyCount: enemies.length })
  const mage = ctx.state.units.find((u) => u.actions.includes(RUIN))!
  const warrior = ctx.state.units.find((u) => u.actions.includes(SLASH))!
  return { ctx, mage, warrior, foes: ctx.state.units.filter((u) => u.side === 'enemy') }
}
/** One legal swing: a fresh Activation with its Stamina back and the attack off its cooldown - the attack is what is under test. */
function swing(ctx: Ctx, by: Unit, target: Unit, attackId: string): void {
  beginActivation(ctx, by.id, 'test')
  by.stamina = by.maxStamina
  delete by.cooldowns[attackId]
  performAttack(ctx, by.id, target.id, attackId)
  settle(ctx, attackId)   // as the command does after the attack it resolves (commands.ts)
}
/** Strike until the attack lands on a unit left at 1 Health - the roll is the battle's own; nothing here chooses a seed. */
function kill(ctx: Ctx, by: Unit, target: Unit, attackId: string): void {
  for (let i = 0; i < 60 && target.lifeState === 'standing'; i++) { target.hp = 1; swing(ctx, by, target, attackId) }
  expect(target.lifeState).toBe('dead')
}
const types = (ctx: Ctx, t: string) => ctx.events.filter((e) => e.type === t)

describe('the rows', () => {
  it('Ruin and Sundering each carry "On kill: the corpse is destroyed" on their own attack, and so does a weapon of Destroying; none is a named gap', () => {
    const staff = ITEMS['item.staff-of-the-destroyer']!
    const own = (staff.triggers ?? []).filter((t) => t.effect.kind === 'corpse.destroy')
    expect(own.map((t) => [t.id, t.hook, t.select, t.chance, t.onlyWithAttack])).toEqual([
      [RUIN_TRIGGER, 'onKill', 'target', 100, RUIN],
      ['trigger.staff-of-the-destroyer.sundering.corpse-destroyed', 'onKill', 'target', 100, SUNDERING]])
    expect((staff.gaps ?? []).filter((g) => /corpse/.test(g))).toEqual([])
    const sword = ITEMS['item.longsword.destroying']!
    expect((sword.triggers ?? []).filter((t) => t.effect.kind === 'corpse.destroy').map((t) => [t.hook, t.select, t.onlyWithAttack])).toEqual([['onKill', 'target', SLASH]])
    expect((sword.gaps ?? []).filter((g) => /corpse/.test(g))).toEqual([])
    // every weapon the attribute is on, not the one sword
    for (const id of ['item.greatsword.destroying', 'item.war-hammer.destroying', 'item.halberd.destroying']) {
      const it = ITEMS[id]!
      expect((it.triggers ?? []).filter((t) => t.effect.kind === 'corpse.destroy').map((t) => t.onlyWithAttack).sort(), id).toEqual([...it.grants].filter((g) => g.startsWith('attack.')).sort())
      expect((it.gaps ?? []).filter((g) => /corpse/.test(g)), id).toEqual([])
    }
  })

  it('Mending Light heals (Spirit x 2) + 2, gives Protection equal to Spirit and removes Weak equal to Spirit, on one ally within 4', () => {
    const a = ABILITIES[MENDING]!
    expect(a).toBeDefined()
    expect([a.staminaCost, a.cooldown, a.range, a.target]).toEqual([2, 2, 4, { select: 'unit', side: 'ally' }])
    expect(a.effects).toEqual([
      { kind: 'heal', amount: { scale: 'partySpirit', base: 2, mult: 2 } },
      { kind: 'status.apply', statusId: 'status.protection', value: { scale: 'partySpirit', base: 0, mult: 1 } },
      { kind: 'status.remove', statusId: WEAK, value: { scale: 'partySpirit', base: 0, mult: 1 } }])
    expect(ITEMS['item.benevolent-rod']!.abilities).toContain(MENDING)
    expect((ITEMS['item.benevolent-rod']!.gaps ?? []).filter((g) => g.includes(MENDING))).toEqual([])
  })
})

describe('the corpse is destroyed', () => {
  it('a unit killed by Ruin leaves no corpse on the board: the body is made where it fell and destroyed at once, and the log says by whom and by what', () => {
    const { ctx, mage, foes } = field(['unit.zombie', 'unit.zombie'], [89, 105])
    const z = foes[0]!
    const from = ctx.events.length
    kill(ctx, mage, z, RUIN)
    expect(ctx.state.corpses ?? []).toEqual([])
    const after = ctx.events.slice(from)
    const made = after.filter((e) => e.type === 'corpse.created'), gone = after.filter((e) => e.type === 'corpse.removed')
    expect(made.map((e) => [e['of'], e['hex']])).toEqual([[z.id, z.hex]])
    expect(gone.map((e) => [e.causeId, e['corpse'], e['hex'], e['how'], e['actor'], e['typeId']])).toEqual([[RUIN_TRIGGER, made[0]!['corpse'], z.hex, 'destroyed', mage.id, 'unit.zombie']])
    expect(after.indexOf(gone[0]!)).toBe(after.indexOf(made[0]!) + 1)   // nothing happens between the two
    // the trigger's own line, on the kill
    expect(after.filter((e) => e.type === 'trigger.fired' && e.causeId === RUIN_TRIGGER).map((e) => [e.actor, e['target'], e['effect']])).toEqual([[mage.id, z.id, 'corpse.destroy']])
    expect(ctx.state.units.every((u) => u.corpseDestroyed === undefined)).toBe(true)   // the mark lasted that settling
  })

  it('a power that needs a corpse cannot use that hex: the Ghoul beside it cannot eat and the Necromancer raises nothing', () => {
    const { ctx, mage, foes } = field(['unit.ghoul', 'unit.zombie', 'unit.necromancer'], [89, 90, 88])
    const [ghoul, z, necro] = foes as [Unit, Unit, Unit]
    expect(ctx.geo.distance(ghoul.hex, z.hex)).toBe(1)
    kill(ctx, mage, z, RUIN)
    beginActivation(ctx, ghoul.id, 'test')
    expect(canUsePower(ctx, ghoul.id, ghoul.id, 'power.ghoul.eat-corpse')).toBe(false)
    const units = ctx.state.units.length
    fireTriggers(ctx, 'onActivationEnd', { ownerId: necro.id, targetId: null, causeId: 'test', ordinal: 1 })
    expect(ctx.state.units.length).toBe(units)
    expect(types(ctx, 'unit.raised')).toEqual([])
  })

  it('a unit killed by any other attack leaves one as before - a corpse the Ghoul can eat', () => {
    const { ctx, foes } = field(['unit.ghoul', 'unit.zombie'], [89, 90])
    const [ghoul, z] = foes as [Unit, Unit]
    z.hp = 0; settle(ctx, 'test')   // dead of anything else - a tick, a fall, another's blow
    expect(z.lifeState).toBe('dead')
    expect((ctx.state.corpses ?? []).map((c) => [c.hex, c.typeId])).toEqual([[z.hex, 'unit.zombie']])
    expect(types(ctx, 'corpse.removed')).toEqual([])
    beginActivation(ctx, ghoul.id, 'test')
    expect(canUsePower(ctx, ghoul.id, ghoul.id, 'power.ghoul.eat-corpse')).toBe(true)
  })

  it('Sundering destroys the corpse too, and so does a Slash with a Longsword of Destroying - the attribute rides the weapon it is on and no other attack', () => {
    const { ctx, mage, warrior, foes } = field(['unit.zombie', 'unit.zombie', 'unit.zombie'], [89, 102, 100])   // the last two beside the warrior
    const [a, b, c] = foes as [Unit, Unit, Unit]
    kill(ctx, mage, a, SUNDERING)
    kill(ctx, warrior, b, SLASH)
    expect(ctx.state.corpses ?? []).toEqual([])
    expect(types(ctx, 'corpse.removed').map((e) => [e.causeId, e['how'], e.actor])).toEqual([
      ['trigger.staff-of-the-destroyer.sundering.corpse-destroyed', 'destroyed', mage.id],
      ['trigger.longsword.destroying.corpse-destroyed', 'destroyed', warrior.id]])
    // the same warrior's bare hands: an attack the sword does not grant leaves the body
    const punch = warrior.actions.find((id) => ACTIONS[id]?.attack && !ITEMS['item.longsword.destroying']!.grants.includes(id))
    if (punch) {
      kill(ctx, warrior, c, punch)
      expect((ctx.state.corpses ?? []).map((x) => x.hex)).toEqual([c.hex])
    }
  })

  it('a hit that does not kill destroys nothing, and neither does the death of a summon, which leaves no body to destroy', () => {
    const { ctx, mage, foes } = field(['unit.zombie', 'unit.zombie'], [89, 105])
    const [a, b] = foes as [Unit, Unit]
    for (let i = 0; i < 60 && types(ctx, 'attack.hit').length === 0; i++) { a.hp = a.maxHp = 500; swing(ctx, mage, a, RUIN) }
    expect(a.lifeState).toBe('standing')
    expect(types(ctx, 'trigger.fired').filter((e) => e['effect'] === 'corpse.destroy')).toEqual([])
    b.summoned = true
    kill(ctx, mage, b, RUIN)
    expect(types(ctx, 'corpse.created')).toEqual([])
    expect(types(ctx, 'corpse.removed')).toEqual([])
  })

  it('the mark lasts the settling of that attack: a hero it brings down who bleeds out later leaves a corpse', () => {
    // the mage is a hero (the Hero badge): at 0 Health it stands on its Deathbed roll or goes down bleeding - it does not die there
    const { ctx, mage, warrior } = field(['unit.zombie'], [89])
    markCorpseDestroyed(ctx, mage.id, warrior.id, RUIN_TRIGGER)
    mage.hp = 0; settle(ctx, 'test')
    expect(mage.lifeState).not.toBe('dead')
    expect(mage.corpseDestroyed).toBeUndefined()
    // … and when it does die - brought to 0 again until it falls, then the count run out - its body stays
    for (let i = 0; i < 6 && mage.lifeState === 'standing'; i++) { mage.hp = 0; settle(ctx, 'test') }
    if (mage.lifeState === 'downed') { setBleedOut(ctx, mage.id, 0, 'test'); settle(ctx, 'test') }
    expect(mage.lifeState).toBe('dead')
    expect((ctx.state.corpses ?? []).map((c) => c.typeId)).toEqual([mage.typeId])
    expect(types(ctx, 'corpse.removed')).toEqual([])
  })

  it('the effect belongs to an attack\'s on-kill trigger aimed at the target: any other trigger, and any power, is refused at load', () => {
    const t = (over: Partial<Trigger>): Trigger => ({ id: 'trigger.test.corpse-destroyed', hook: 'onKill', chance: 100, select: 'target', effect: { kind: 'corpse.destroy' }, source: 'test', ...over }) as Trigger
    expect(() => validateTrigger(t({}))).not.toThrow()
    expect(() => validateTrigger(t({ hook: 'onHit' }))).toThrow(/onKill/)
    expect(() => validateTrigger(t({ select: 'self' }))).toThrow(/onKill trigger aimed at the target/)
    expect(() => noCorpseDestroy([{ kind: 'corpse.destroy' }], 'a power')).toThrow(/on-?[kK]ill/)
    expect(() => noCorpseDestroy([{ kind: 'heal', amount: 1 }], 'a power')).not.toThrow()
  })

  it('a battle saved after such a kill restores as it was', () => {
    const { ctx, mage, foes } = field(['unit.zombie', 'unit.zombie'], [89, 105])
    kill(ctx, mage, foes[0]!, RUIN)
    const saved = saveBattle(ctx)
    expect(saveBattle(restoreBattle(saved, ctx))).toEqual(saved)
  })
})

describe('Mending Light', () => {
  /** The priest holding the Benevolent Rod, its ally, and the party's Spirit set to `spirit` by the engine's own side change. */
  function atPriest(spirit: number): { ctx: Ctx; priest: Unit; ally: Unit } {
    // the fielding's own heroes, stood side by side (in the fielding the priest starts far behind)
    const ctx = createBattle({ ...scenarioOptions(SCENARIOS['test.mending-light']!), heroHexes: [80, 81] })
    const priest = ctx.state.units.find((u) => u.side === 'hero' && u.actions.includes(MENDING))!
    const ally = ctx.state.units.find((u) => u.side === 'hero' && u.id !== priest.id)!
    const now = partySum(ctx, 'hero', 'spirit')
    if (now !== spirit) changeSideStat(ctx, 'hero', { stat: 'spirit', side: 'own', value: spirit - now, until: 'battle' }, 'test', priest.id)
    expect(partySum(ctx, 'hero', 'spirit')).toBe(spirit)
    beginActivation(ctx, priest.id, 'test')
    return { ctx, priest, ally }
  }

  it('on an ally with 5 Weak, cast by a priest with party Spirit 3, leaves it with 2 Weak; the heal is (3 x 2) + 2 and the Protection 3', () => {
    const { ctx, priest, ally } = atPriest(3)
    applyStatus(ctx, ally.id, WEAK, 5, 'test')
    ally.hp = 1
    const from = ctx.events.length
    usePower(ctx, priest.id, ally.id, MENDING)
    expect(statusValue(ally, WEAK)).toBe(2)
    expect(ally.hp).toBe(Math.min(ally.maxHp, 1 + 8))
    expect(statusValue(ally, 'status.protection')).toBe(3)
    const reduced = ctx.events.slice(from).filter((e) => e.type === 'status.reduced')
    expect(reduced.map((e) => [e.causeId, e['target'], e['statusId'], e['by'], e['before'], e['after']])).toEqual([[MENDING, ally.id, WEAK, 3, 5, 2]])
  })

  it('on an ally with 2 Weak it leaves none', () => {
    const { ctx, priest, ally } = atPriest(3)
    applyStatus(ctx, ally.id, WEAK, 2, 'test')
    usePower(ctx, priest.id, ally.id, MENDING)
    expect(statusValue(ally, WEAK)).toBe(0)
    expect(ally.statuses.some((s) => s.id === WEAK)).toBe(false)
  })

  it('the amount is the Spirit as it stands: at Spirit 0 it removes nothing, at Spirit 1 one point', () => {
    for (const [spirit, left] of [[0, 4], [1, 3]] as const) {
      const { ctx, priest, ally } = atPriest(spirit)
      applyStatus(ctx, ally.id, WEAK, 4, 'test')
      usePower(ctx, priest.id, ally.id, MENDING)
      expect(statusValue(ally, WEAK), `Spirit ${spirit}`).toBe(left)
    }
  })

  it('a flat amount removes that many, as it always did, and no amount removes every point', () => {
    const { ctx, priest, ally } = atPriest(3)
    applyStatus(ctx, ally.id, WEAK, 5, 'test')
    applyEffect(ctx, { kind: 'status.remove', statusId: WEAK, value: 1 }, { causeId: 'test', actor: priest.id }, ally.id)
    expect(statusValue(ally, WEAK)).toBe(4)
    applyEffect(ctx, { kind: 'status.remove', statusId: WEAK }, { causeId: 'test', actor: priest.id }, ally.id)
    expect(statusValue(ally, WEAK)).toBe(0)
  })
})

describe('in a real battle', () => {
  it('the Staff of the Destroyer and the Longsword of Destroying leave no corpse behind what they kill', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.corpse-destroyed']!))
    runBattle(ctx)
    const destroyed = types(ctx, 'corpse.removed').filter((e) => e['how'] === 'destroyed')
    // both instances of the one effect: the attack's own on-kill (the staff) and the artifact attribute's (the sword)
    const by = new Set(destroyed.map((e) => e.causeId))
    expect(by.has(RUIN_TRIGGER) || by.has('trigger.staff-of-the-destroyer.sundering.corpse-destroyed')).toBe(true)
    expect(by.has('trigger.longsword.destroying.corpse-destroyed')).toBe(true)
    // every corpse still on the board is one neither weapon made
    const kills = new Map(types(ctx, 'trigger.fired').filter((e) => e['effect'] === 'corpse.destroy').map((e) => [e['target'] as number, e.causeId]))
    for (const c of ctx.state.corpses ?? []) expect(kills.has(ctx.state.units.find((u) => u.uid === c.uid)!.id), `corpse at ${c.hex}`).toBe(false)
  })

  it('the priest casts Mending Light and it takes Weak off the one the Wolves bit', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.mending-light']!))
    runBattle(ctx)
    expect(ctx.events.some((e) => e.type === 'status.reduced' && e.causeId === MENDING && e['statusId'] === WEAK && (e['by'] as number) > 0)).toBe(true)
  })
})
