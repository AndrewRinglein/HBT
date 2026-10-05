// capability.free-attack-accuracy (2026-10-04). Ruled 2026-09-28 (the Armory Ledger's rules, approved that day; DECISIONS.md
// 'counterattack, special free attacks, the opening six, shields, custom weapons'): "'+10 counterattack' on a weapon is +10
// Accuracy on your counterattacks." / "Bonuses 'to special attacks' and 'Dodge against special attacks' apply to all three."
// Not built until now (the weapon audit, 2026-10-04; SWITCHES.md counterattackRowsAndGaps: "the stats exist; item rows do
// not carry them yet … no stat for every free attack at once yet").
//
// Two stats, second instances of the engine's stat shape (SWITCHES.md freeAttack*):
//   freeAttackAccuracy — added to the roll of every special free attack its holder makes: a counterattack, a fend and an
//                        attack of opportunity. (A row that says "counterattack" only is the kind's own stat,
//                        counterattackAccuracy, which an item row can carry now — the swords' "+10 counterattack".)
//   freeAttackDodge    — added to its holder's Dodge against any of the three, and against nothing else.
// Each is one named row of the accuracy ladder, and the preview reads the same function the roll does (Law 1).
import { describe, expect, it } from 'vitest'
import { usePower } from '../src/core/ability.js'
import { attackOfOpportunity, executeKnockback } from '../src/core/movement.js'
import { beginActivation, grantBadge } from '../src/core/mutate.js'
import { performAttack, preview } from '../src/core/pipeline.js'
import { createBattle } from '../src/core/setup.js'
import { effective, isStatName } from '../src/core/stats.js'
import { ABILITIES, BADGES, ITEMS } from '../src/content/index.js'
import type { Ctx, Unit } from '../src/core/types.js'
import { hexId } from './board16.js'

const LONG = 'item.longsword', GREAT = 'item.greatsword'
const LONG_POWER = 'power.longsword.counterattack', GREAT_POWER = 'power.greatsword.counterattack', FEND = 'power.test-fend'
const AIM = 'test.badge.free-attack-aim', SLIP = 'test.badge.free-attack-slip'
const PALADIN = 'hero.base.paladin-hunk', BARBARIAN = 'hero.base.warrior-barbarian', ZOMBIE = 'unit.zombie'
const stat = (ctx: Ctx, u: Unit, name: string) => effective(ctx, u, name as never).value
type Row = { station: string; name?: string; effectId: string; delta: number }
/** The accuracy ladder's rows of one name, as the preview gives them. */
const rows = (p: { accLedger: readonly unknown[] }, name: string) => (p.accLedger as { name: string; effectId: string; delta: number }[]).filter((r) => r.name === name)
/** A hero with `items` at (5,5), a zombie beside him at (5,6). No crits: a crit's chart can throw a unit a hex away. */
function rig(hero = PALADIN, items?: string[]) {
  const ctx = createBattle({ scenarioId: 'probe.free-attack-accuracy', replicate: 1, mapId: 'map.open', heroes: [hero], heroHexes: [hexId(5, 5)], ...(items ? { heroItems: [items] } : {}),
    enemies: [ZOMBIE], enemyHexes: [hexId(5, 6)], enemyCount: 1, cfg: { switches: { critEnabled: false } as never } })
  const h = ctx.state.units.find((u) => u.typeId === hero)!, z = ctx.state.units.find((u) => u.typeId === ZOMBIE)!
  h.stamina = h.maxStamina = 20
  return { ctx, h, z }
}
const basic = (ctx: Ctx, u: Unit) => u.actions.find((a) => ctx.actions[a]?.attack?.kind === 'melee')!
const use = (ctx: Ctx, h: Unit, power: string) => { if (!h.actions.includes(power)) h.actions.push(power); beginActivation(ctx, h.id, 'test'); usePower(ctx, h.id, h.id, power) }

describe('the stats and the rows', () => {
  it('free-attack Accuracy and Dodge against special free attacks are stats of the engine, beside each kind\'s own Accuracy', () => {
    for (const name of ['freeAttackAccuracy', 'freeAttackDodge', 'counterattackAccuracy', 'fendAccuracy']) expect(isStatName(name), name).toBe(true)
  })

  it('the Longsword and the Great Sword say "+10 counterattack" while held: +10 Counterattack Accuracy on the row, beside their Block, and no gap for it', () => {
    for (const sword of [LONG, GREAT]) {
      expect(ITEMS[sword]!.statModifiers, sword).toEqual({ block: 5, counterattackAccuracy: 10 })
      expect(((ITEMS[sword] as { gaps?: readonly string[] }).gaps ?? []).filter((g) => /counterattack/i.test(g)), sword).toEqual([])
    }
  })

  it('every row made from either sword carries it too', () => {
    const made = Object.values(ITEMS).filter((i) => [LONG, GREAT].includes((i as { base?: string }).base ?? ''))
    expect(made.length).toBeGreaterThan(10)
    for (const i of made) expect((i.statModifiers as Record<string, number>)['counterattackAccuracy'], i.id).toBe(10)
  })

  it('the two test badges are the general stats\' instances, pure data', () => {
    expect(BADGES[AIM]!.statModifiers).toEqual({ freeAttackAccuracy: 15 })
    expect(BADGES[SLIP]!.statModifiers).toEqual({ freeAttackDodge: 20 })
  })
})

describe('"+10 counterattack" on a weapon is +10 Accuracy on your counterattacks', () => {
  it('a hero holding the Longsword has +10 Counterattack Accuracy from the weapon, power or no power; one who holds none has 0', () => {
    const armed = rig(), bare = rig(PALADIN, [])
    expect(stat(armed.ctx, armed.h, 'counterattackAccuracy')).toBe(10)
    expect(stat(bare.ctx, bare.h, 'counterattackAccuracy')).toBe(0)
    expect(stat(armed.ctx, armed.h, 'counterattack'), 'the weapon gives the Accuracy, not the counterattack itself').toBe(0)
  })

  it('the Great Sword\'s holder, with its power up (which has no Accuracy of its own), answers at −20 +10 — the weapon\'s', () => {
    const { ctx, h, z } = rig(BARBARIAN, [GREAT])
    use(ctx, h, GREAT_POWER)
    expect(ABILITIES[GREAT_POWER]!.effects!.map((e) => (e as { stat?: string }).stat)).not.toContain('counterattackAccuracy')
    const own = preview(ctx, h.id, z.id, basic(ctx, h))
    beginActivation(ctx, z.id, 'test')
    performAttack(ctx, z.id, h.id, basic(ctx, z))
    const swing = ctx.events.find((e) => e.type === 'attack.declared' && e.actor === h.id && e['as'] === 'counterattack')!
    expect(swing).toBeDefined()
    expect(swing['hitChance']).toBe(Math.max(0, Math.min(100, own.accuracy - 20 + 10)))
    const ledger = swing['accLedger'] as Row[]
    expect(ledger.find((r) => r.station === 'FREE_ATTACK')!.delta).toBe(-20)
    expect(ledger.find((r) => r.station === 'FREE_ATTACK_BONUS')!.delta).toBe(10)
  })

  it('the Longsword\'s holder with the Longsword\'s power up: +10 from the weapon and +10 more from the power — they stack', () => {
    const { ctx, h, z } = rig()
    use(ctx, h, LONG_POWER)
    expect(stat(ctx, h, 'counterattackAccuracy')).toBe(20)
    const own = preview(ctx, h.id, z.id, basic(ctx, h))
    const asCounter = preview(ctx, h.id, z.id, basic(ctx, h), 'reaction', 'counterattack')
    expect(asCounter.accuracy).toBe(own.accuracy - 20 + 20)
    expect(rows(asCounter, 'FREE_ATTACK_BONUS').map((r) => r.delta)).toEqual([20])
  })

  it('it is the counterattack\'s only: his attack of opportunity and his fend do not carry the sword\'s +10', () => {
    const { ctx, h, z } = rig()
    const own = preview(ctx, h.id, z.id, basic(ctx, h))
    const aoo = preview(ctx, h.id, z.id, basic(ctx, h), 'reaction')
    expect(aoo.accuracy).toBe(own.accuracy - 20)
    expect(rows(aoo, 'FREE_ATTACK_BONUS')).toEqual([])
    const fend = preview(ctx, h.id, z.id, basic(ctx, h), 'reaction', 'fend')
    expect(fend.accuracy).toBe(own.accuracy - 20)
  })

  it('a knock takes the power\'s +10 and leaves the weapon\'s: what the sword gives is not something he has up', () => {
    const { ctx, h, z } = rig()
    use(ctx, h, LONG_POWER)
    executeKnockback(ctx, z.id, h.id, 1, 'test.shove')
    expect(stat(ctx, h, 'counterattack')).toBe(0)
    expect(stat(ctx, h, 'counterattackAccuracy')).toBe(10)
  })
})

describe('free-attack Accuracy — "bonuses to special attacks apply to all three"', () => {
  it('+15 on the counterattack, the fend and the attack of opportunity, each as its own named row; nothing on an ordinary attack', () => {
    const plain = rig(PALADIN, []), { ctx, h, z } = rig(PALADIN, [])
    expect(grantBadge(ctx, h.id, AIM, 'test')).toBe(true)
    expect(stat(ctx, h, 'freeAttackAccuracy')).toBe(15)
    const punch = basic(ctx, h)
    expect(preview(ctx, h.id, z.id, punch).accuracy, 'an ordinary attack').toBe(preview(plain.ctx, plain.h.id, plain.z.id, punch).accuracy)
    for (const as of [undefined, 'counterattack', 'fend'] as const) {
      const was = preview(plain.ctx, plain.h.id, plain.z.id, punch, 'reaction', as), now = preview(ctx, h.id, z.id, punch, 'reaction', as)
      expect(now.accuracy, String(as)).toBe(was.accuracy + 15)
      expect(rows(now, 'FREE_ATTACK_ACCURACY').map((r) => [r.effectId, r.delta]), String(as)).toEqual([['rule.free-attack', 15]])
      expect(rows(was, 'FREE_ATTACK_ACCURACY'), String(as)).toEqual([])
    }
  })

  it('the swing itself rolls it: an attack of opportunity drawn in a battle declares the same chance the preview gave', () => {
    const { ctx, h, z } = rig(PALADIN, [])
    grantBadge(ctx, h.id, AIM, 'test')
    const said = preview(ctx, h.id, z.id, basic(ctx, h), 'reaction')
    attackOfOpportunity(ctx, h.id, z.id)
    const swing = ctx.events.find((e) => e.type === 'attack.declared' && e.actor === h.id)!
    expect(swing).toMatchObject({ free: true, hitChance: Math.max(0, Math.min(100, said.accuracy)) })
    expect((swing['accLedger'] as Row[]).find((r) => r.station === 'FREE_ATTACK_ACCURACY')!.delta).toBe(15)
  })

  it('it stacks with a kind\'s own Accuracy: the Longsword\'s holder with the badge and the power up answers at −20 +20 +15', () => {
    const { ctx, h, z } = rig()
    grantBadge(ctx, h.id, AIM, 'test')
    use(ctx, h, LONG_POWER)
    const own = preview(ctx, h.id, z.id, basic(ctx, h))
    expect(preview(ctx, h.id, z.id, basic(ctx, h), 'reaction', 'counterattack').accuracy).toBe(own.accuracy - 20 + 20 + 15)
  })
})

describe('Dodge against special free attacks — harder to hit with any of the three, no harder with an ordinary attack', () => {
  it('+20: a counterattack, a fend and an attack of opportunity against him are each 20 lower, by a row that names him; an ordinary attack is not', () => {
    const plain = rig(PALADIN, []), { ctx, h, z } = rig(PALADIN, [])
    expect(grantBadge(ctx, h.id, SLIP, 'test')).toBe(true)
    expect(stat(ctx, h, 'freeAttackDodge')).toBe(20)
    expect(stat(ctx, h, 'dodge'), 'his Dodge is what it was').toBe(stat(plain.ctx, plain.h, 'dodge'))
    const bite = basic(ctx, z)
    expect(preview(ctx, z.id, h.id, bite).accuracy, 'an ordinary attack').toBe(preview(plain.ctx, plain.z.id, plain.h.id, bite).accuracy)
    for (const as of [undefined, 'counterattack', 'fend'] as const) {
      const was = preview(plain.ctx, plain.z.id, plain.h.id, bite, 'reaction', as), now = preview(ctx, z.id, h.id, bite, 'reaction', as)
      expect(now.accuracy, String(as)).toBe(was.accuracy - 20)
      expect(rows(now, 'FREE_ATTACK_DODGE').map((r) => [r.effectId, r.delta]), String(as)).toEqual([[`unit.${PALADIN}`, -20]])
    }
  })

  it('in a battle: the zombie\'s attack of opportunity on him declares the lower chance', () => {
    const { ctx, h, z } = rig(PALADIN, [])
    grantBadge(ctx, h.id, SLIP, 'test')
    const said = preview(ctx, z.id, h.id, basic(ctx, z), 'reaction')
    attackOfOpportunity(ctx, z.id, h.id)
    const swing = ctx.events.find((e) => e.type === 'attack.declared' && e.actor === z.id)!
    expect(swing['hitChance']).toBe(Math.max(0, Math.min(100, said.accuracy)))
    expect((swing['accLedger'] as Row[]).find((r) => r.station === 'FREE_ATTACK_DODGE')!.delta).toBe(-20)
  })
})
