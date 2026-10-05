// content.greatsword-war-axe-reauthored (2026-10-04). Ruled 2026-09-28 (the Armory Ledger approved that day —
// CONTENT-DRAFTS/2026-09-28-armory-ledger/ledger-rows.json, keys greatsword and war-axe; DECISIONS.md 'counterattack, special
// free attacks, the opening six, shields, custom weapons') and never landed (the weapon audit, 2026-10-04):
//   Great Sword — "+5 Block · +10 counterattack"; Basic attack "Strength +2, 1 Stamina"; the power Counterattack,
//                 "Counterattack and +2 Strength until the end of your next turn. 2 Stamina"
//                 (was "Hew (Str+2, 2 sta) · Great Cleave (Str+1, 3 sta, −5 Acc) · +10 Block")
//   War Axe     — Basic attack "Strength +1, −10 Accuracy, 1 Stamina. On block: the target loses 20 Block"; Heavy chop
//                 "Strength +3, −15 Accuracy, 2 Stamina. On block: the target loses 20 Block"
//                 (was "Chop (Str+1, 1 sta) · Hack (Str+2, 2 sta, −5 Acc) · on block −20 Block")
// The attacks that are the same thing keep their ids (attack.greatsword.hew, attack.war-axe.chop, attack.war-axe.hack — shown
// as Heavy Chop); attack.greatsword.great-cleave is gone and power.greatsword.counterattack is new. The Great Sword's "+10
// counterattack" while equipped is capability.free-attack-accuracy's stat and stays a named gap here. What the rows leave
// unstated is decided and recorded (SWITCHES.md greatsword*, warAxe*).
import { describe, expect, it } from 'vitest'
import { usePower } from '../src/core/ability.js'
import { attackIdsOf, powerIdsOf } from '../src/core/action.js'
import { basicAttackOf } from '../src/core/free-attack.js'
import { applyItems } from '../src/core/items.js'
import { beginActivation, expireTurnMods } from '../src/core/mutate.js'
import { performAttack } from '../src/core/pipeline.js'
import { createBattle, fieldedDef } from '../src/core/setup.js'
import { effective } from '../src/core/stats.js'
import { ABILITIES, ACTIONS, ATTACKS, ITEMS, UNITS } from '../src/content/index.js'
import type { Ctx, Unit } from '../src/core/types.js'
import { hexId } from './board16.js'

const SWORD = 'item.greatsword', HEW = 'attack.greatsword.hew', COUNTER = 'power.greatsword.counterattack'
const AXE = 'item.war-axe', CHOP = 'attack.war-axe.chop', HEAVY = 'attack.war-axe.hack'
const CLEAVE = /^attack\.greatsword\.great-cleave(\.|$)/
const BARBARIAN = 'hero.base.warrior-barbarian', ZOMBIE = 'unit.zombie'
const stat = (ctx: Ctx, u: Unit, name: string) => effective(ctx, u, name as never).value
const made = (base: string) => Object.values(ITEMS).filter((i) => (i as { base?: string }).base === base)
/** A warrior handed `item` and nothing else at (5,5), a zombie beside him. No crits: a crit's chart can throw a unit a hex away. */
function rig(item: string, replicate = 1) {
  const ctx = createBattle({ scenarioId: 'probe.greatsword-war-axe', replicate, mapId: 'map.open', heroes: [BARBARIAN], heroHexes: [hexId(5, 5)], heroItems: [[item]],
    enemies: [ZOMBIE], enemyHexes: [hexId(5, 6)], enemyCount: 1, cfg: { switches: { critEnabled: false } as never } })
  return { ctx, h: ctx.state.units.find((u) => u.typeId === BARBARIAN)!, z: ctx.state.units.find((u) => u.typeId === ZOMBIE)! }
}

describe('the Great Sword, as the Ledger row reads', () => {
  it('+5 Block; one attack — Strength +2 for 1 Stamina — and the power Counterattack', () => {
    const bare = UNITS[BARBARIAN]!, w = applyItems(bare, [SWORD], ITEMS, ACTIONS, 'test').def
    expect((w.block ?? 0) - (bare.block ?? 0)).toBe(5)
    expect(ITEMS[SWORD]!.statModifiers).toEqual({ block: 5 })
    expect(ITEMS[SWORD]!.grants).toEqual([HEW])
    expect(ITEMS[SWORD]!.abilities).toEqual([COUNTER])
    expect(ATTACKS[HEW]).toMatchObject({ name: 'Hew', staminaCost: 1, attack: { kind: 'melee', stat: 'strength', bonus: 2 } })
    expect(ATTACKS[HEW]!.attack!.accuracy ?? 0).toBe(0)
  })

  it('Counterattack: 2 Stamina, Counterattack and +2 Strength until the end of the next Turn', () => {
    expect(ABILITIES[COUNTER]).toMatchObject({
      staminaCost: 2, cooldown: 0, target: { select: 'self' },
      effects: [
        { kind: 'statMod', stat: 'counterattack', value: 1, until: 'endOfNextTurn', who: 'self' },
        { kind: 'statMod', stat: 'strength', value: 2, until: 'endOfNextTurn', who: 'self' },
      ],
    })
    expect(ABILITIES[COUNTER]!.gaps ?? []).toEqual([])
  })

  it('a hero holding it: the one attack is his basic attack, the power is on his sheet, and nothing of the Great Cleave', () => {
    const { ctx, h } = rig(SWORD)
    expect(attackIdsOf(ctx, h)).toEqual([HEW, 'attack.punch'])
    expect(powerIdsOf(ctx, h)).toContain(COUNTER)
    expect(basicAttackOf(ctx, h)?.id).toBe(HEW)
  })

  it('used in a battle: 2 Stamina spent, +2 Strength and Counterattack on him; an adjacent enemy that swings gets the basic attack back; both end with his next Turn', () => {
    const { ctx, h, z } = rig(SWORD)
    const strength = stat(ctx, h, 'strength'), stamina = h.stamina
    beginActivation(ctx, h.id, 'test'); usePower(ctx, h.id, h.id, COUNTER)
    expect(h.stamina).toBe(stamina - 2)
    expect(stat(ctx, h, 'strength')).toBe(strength + 2)
    expect(stat(ctx, h, 'counterattack')).toBe(1)
    const bite = z.actions.find((a) => ctx.actions[a]?.attack?.kind === 'melee')!
    const before = ctx.events.length
    performAttack(ctx, z.id, h.id, bite)
    const answered = ctx.events.slice(before).filter((e) => e.type === 'aoo.provoked' && e['as'] === 'counterattack')
    expect(answered).toHaveLength(1)
    expect(ctx.events.slice(before).some((e) => e.actor === h.id && e.causeId === HEW), 'the answer is the Great Sword\'s own attack').toBe(true)
    // "until the end of your next turn": this Turn's end leaves it, the next Turn's end takes it
    expireTurnMods(ctx, 'test'); expect(stat(ctx, h, 'strength')).toBe(strength + 2)
    ctx.state.turn += 1; expireTurnMods(ctx, 'test')
    expect(stat(ctx, h, 'strength')).toBe(strength); expect(stat(ctx, h, 'counterattack')).toBe(0)
  })

  it('no attack row of the pack is the Great Cleave or a copy of it; no item grants one and no unit fields with one', () => {
    expect(Object.keys(ATTACKS).filter((id) => CLEAVE.test(id))).toEqual([])
    expect(Object.values(ITEMS).filter((i) => i.grants.some((g) => CLEAVE.test(g))).map((i) => i.id)).toEqual([])
    expect(Object.keys(UNITS).filter((id) => fieldedDef(id).attacks.some((a) => CLEAVE.test(typeof a === 'string' ? a : (a as { id: string }).id)))).toEqual([])
  })

  it.each(made(SWORD).map((i) => [i.id, i] as const))('%s follows its base: one attack — the Great Sword\'s, or its own copy of it — and the Counterattack', (_id, i) => {
    expect(i.grants).toHaveLength(1)
    expect(i.grants[0] === HEW || i.grants[0]!.startsWith(HEW + '.')).toBe(true)
    // a Forge attribute rides its own COPY of the attack and may add to it; the cost is the base's, and it never hits for less
    expect(ATTACKS[i.grants[0]!]).toMatchObject({ staminaCost: 1, attack: { stat: 'strength' } })
    expect(ATTACKS[i.grants[0]!]!.attack!.bonus).toBeGreaterThanOrEqual(2)
    if (i.grants[0] === HEW) expect(ATTACKS[i.grants[0]!]).toBe(ATTACKS[HEW])
    expect(i.abilities).toEqual([COUNTER])
    expect(i.statModifiers.block).toBe(5)
  })

  it('rows are made from it — the Masterwork among them', () => {
    expect(made(SWORD).map((i) => i.id)).toContain('item.greatsword.masterwork')
  })
})

describe('the War Axe, as the Ledger row reads', () => {
  it('the basic attack: Strength +1, −10 Accuracy, 1 Stamina; Heavy Chop: Strength +3, −15 Accuracy, 2 Stamina', () => {
    expect(ITEMS[AXE]!.grants).toEqual([CHOP, HEAVY])
    expect(ATTACKS[CHOP]).toMatchObject({ name: 'Chop', staminaCost: 1, attack: { kind: 'melee', accuracy: -10, stat: 'strength', bonus: 1 } })
    expect(ATTACKS[HEAVY]).toMatchObject({ name: 'Heavy Chop', staminaCost: 2, attack: { kind: 'melee', accuracy: -15, stat: 'strength', bonus: 3 } })
  })

  it('Heavy Chop is the Ledger\'s whole line: no Bleed and no Crit of its own — the row\'s only riders are the two on-block ones', () => {
    expect(ATTACKS[HEAVY]!.attack!.crit ?? 0).toBe(0)
    const riders = ITEMS[AXE]!.triggers.map((t) => [t.hook, t.onlyWithAttack, t.effect.kind])
    expect(riders.filter(([hook]) => hook !== 'onBlock')).toEqual([])
    expect(new Set(ITEMS[AXE]!.triggers.map((t) => t.onlyWithAttack))).toEqual(new Set([CHOP, HEAVY]))
  })

  it('on a block, with either attack, the target loses 20 Block for the rest of the Battle', () => {
    for (const attack of [CHOP, HEAVY]) {
      const { ctx, h, z } = rig(AXE)
      z.triggers = []; z.hp = z.maxHp = 100
      z.mods.push({ stat: 'block', op: 'add', value: 100, source: 'test.certain', scope: 'unit' })     // certain to block (as test/trigger-ids-and-scopes.test.ts makes it)
      const block = stat(ctx, z, 'block')
      beginActivation(ctx, h.id, 'test')
      expect(performAttack(ctx, h.id, z.id, attack).blocked, attack + ' was blocked').toBe(true)
      expect(stat(ctx, z, 'block'), attack).toBe(block - 20)
    }
  })

  it.each(made(AXE).map((i) => [i.id, i] as const))('%s follows its base: the two attacks, or its own copies of them, at the Ledger\'s numbers', (_id, i) => {
    expect(i.grants).toHaveLength(2)
    expect(i.grants[0] === CHOP || i.grants[0]!.startsWith(CHOP + '.')).toBe(true)
    expect(i.grants[1] === HEAVY || i.grants[1]!.startsWith(HEAVY + '.')).toBe(true)
    // a Forge attribute rides its own COPIES and may add to them; the costs are the base's, and neither hits for less
    expect(ATTACKS[i.grants[0]!]).toMatchObject({ staminaCost: 1, attack: { stat: 'strength' } }); expect(ATTACKS[i.grants[0]!]!.attack!.bonus).toBeGreaterThanOrEqual(1)
    expect(ATTACKS[i.grants[1]!]).toMatchObject({ staminaCost: 2, attack: { stat: 'strength' } }); expect(ATTACKS[i.grants[1]!]!.attack!.bonus).toBeGreaterThanOrEqual(3)
    if (i.grants[0] === CHOP) { expect(ATTACKS[i.grants[0]!]!.attack!.accuracy).toBe(-10); expect(ATTACKS[i.grants[1]!]!.attack!.accuracy).toBe(-15) }
    // every on-block rider of the row rides one of the row's own two attacks
    const onBlock = i.triggers.filter((t) => t.hook === 'onBlock')
    expect(onBlock.length).toBeGreaterThanOrEqual(2)
    expect(new Set(onBlock.map((t) => t.onlyWithAttack))).toEqual(new Set(i.grants))
  })
})

describe('the heroes who carry them keep them', () => {
  it('the Great Sword and the War Axe are in base heroes\' kits, and each such hero fields with the row\'s attacks', () => {
    const carriers = (item: string) => Object.keys(UNITS).filter((id) => id.startsWith('hero.base.') && (UNITS[id]!.defaultItems ?? []).includes(item))
    expect(carriers(SWORD).length).toBeGreaterThan(0); expect(carriers(AXE).length).toBeGreaterThan(0)
    for (const id of carriers(SWORD)) expect(fieldedDef(id).attacks.map((a) => typeof a === 'string' ? a : (a as { id: string }).id), id).toContain(HEW)
    for (const id of carriers(AXE)) expect(fieldedDef(id).attacks.map((a) => typeof a === 'string' ? a : (a as { id: string }).id), id).toEqual(expect.arrayContaining([CHOP, HEAVY]))
  })
})
