// capability.raise-lower-magic (2026-10-05). Ruled 2026-10-04 (DECISIONS.md 'his 28 reward weapons read back: … the mechanics his
// own items need are wanted'): "we need to lower and raise magic." His Staff of the Magi's Vortex - "Deal magic damage equal to
// Magic x 3 to every unit in the blast. … Using it lowers the party's Magic by 1 AND the enemy side's Power by 1 for the rest of
// the Battle" - did not act: the power itself was not in the game.
//
// Wanted, with no content name in core: an effect can raise or lower a side's party stat - the heroes' Magic or Spirit, the
// enemy side's Power - by an amount, for the rest of the Battle or for a number of Turns, never below 0; everything that reads
// the stat reads the changed value from then on; the change is an event.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { executeAction, legalActions } from '../src/core/commands.js'
import { beginActivation, changeSideStat, expireTurnMods, powerOf, sideModOf } from '../src/core/mutate.js'
import { applyEffect, partySum, valueOf } from '../src/core/trigger.js'
import { effective } from '../src/core/stats.js'
import { previewBurst } from '../src/core/burst.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { ACTIONS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Unit } from '../src/core/types.js'

const VORTEX = 'power.staff-of-the-magi.vortex', SWELL = 'power.test-mage.swell'
const fielding = () => createBattle(scenarioOptions(SCENARIOS['test.vortex']!))
function atMage(): { ctx: Ctx; mage: Unit } {
  const ctx = fielding()
  const mage = ctx.state.units.find((u) => u.side === 'hero' && u.actions.includes(VORTEX))!
  beginActivation(ctx, mage.id, 'test')
  return { ctx, mage }
}
const types = (ctx: Ctx, t: string) => ctx.events.filter((e) => e.type === t)
const centreOn = (ctx: Ctx, mage: Unit, foe: Unit) => legalActions(ctx, mage.id).filter((r) => r.actionId === VORTEX && 'centre' in r).map((r) => (r as { centre: number }).centre).find((c) => previewBurst(ctx, mage.id, c, VORTEX).targets.some((t) => t.id === foe.id))!

describe('the rows', () => {
  it('Vortex is a burst of Magic x 3 as magic damage on a hex within 5 and every hex beside it, and using it lowers the party\'s Magic by 1 and the enemy side\'s Power by 1 for the rest of the Battle', () => {
    const a = ACTIONS[VORTEX]!
    expect(a).toBeDefined()
    expect([a.staminaCost, a.range, a.cooldown ?? 0]).toEqual([3, 5, 0])
    expect(a.burst).toEqual({ shape: { kind: 'radius', radius: 1 }, side: 'any',
      packets: [{ id: 'base', damageType: 'magic', amount: 0, stat: 'magic', statMult: 3 }],
      sideStats: [{ stat: 'magic', side: 'own', value: -1, until: 'battle' }, { stat: 'power', value: -1, until: 'battle' }] })
    expect((a.gaps ?? []).filter((g) => /Magic|Power/.test(g))).toEqual([])
    // the test row: raise the party's Magic by 2 for two Turns
    expect(ACTIONS[SWELL]!.effects).toEqual([{ kind: 'side.stat', stat: 'magic', side: 'own', value: 2, until: 'endOfNextTurn' }])
  })
})

describe('Vortex', () => {
  it('after one Vortex the party\'s Magic is 1 lower and the enemy side\'s Power 1 lower, for the rest of the Battle; one line each says so and why', () => {
    const { ctx, mage } = atMage()
    ctx.state.power = 3
    const foe = ctx.state.units.find((u) => u.side === 'enemy')!
    const magic = partySum(ctx, 'hero', 'magic'), own = effective(ctx, mage, 'magic').value
    const dealt = previewBurst(ctx, mage.id, centreOn(ctx, mage, foe), VORTEX).targets.find((t) => t.id === foe.id)!.damage
    expect(dealt).toBe(own * 3)   // this Vortex is dealt on the Magic as it stood
    expect(executeAction(ctx, { actor: mage.id, actionId: VORTEX, centre: centreOn(ctx, mage, foe) })).toEqual({ ok: true })
    expect(partySum(ctx, 'hero', 'magic')).toBe(magic - 1)
    expect(powerOf(ctx)).toBe(2)
    expect(ctx.state.power).toBe(3)   // the pool is as it was; the lowering is a change laid over it, named and removable
    const lines = types(ctx, 'side.stat.changed')
    expect(lines.map((e) => [e.causeId, e.actor, e['side'], e['stat'], e['by'], e['before'], e['after'], e['until']])).toEqual([
      [VORTEX, mage.id, 'hero', 'magic', -1, magic, magic - 1, 'battle'],
      [VORTEX, mage.id, 'enemy', 'power', -1, 3, 2, 'battle'],
    ])
    // for the rest of the Battle: Turns ending change nothing
    for (let i = 0; i < 4; i++) { expireTurnMods(ctx, 'test'); ctx.state.turn++ }
    expect([partySum(ctx, 'hero', 'magic'), powerOf(ctx)]).toEqual([magic - 1, 2])
    expect(types(ctx, 'side.stat.restored')).toEqual([])
  })
  it('everything that reads the stat reads the changed value: a second Vortex deals Magic x 3 on the lowered Magic; a value that scales on the party\'s Magic and one that scales on Power are smaller too', () => {
    const { ctx, mage } = atMage()
    ctx.state.power = 4
    const foe = ctx.state.units.find((u) => u.side === 'enemy')!
    foe.hp = foe.maxHp = 500
    const own = effective(ctx, mage, 'magic').value, party = partySum(ctx, 'hero', 'magic')
    const first = previewBurst(ctx, mage.id, centreOn(ctx, mage, foe), VORTEX).targets.find((t) => t.id === foe.id)!.damage
    executeAction(ctx, { actor: mage.id, actionId: VORTEX, centre: centreOn(ctx, mage, foe) })
    mage.primaryUsed = false; mage.stamina = mage.maxStamina
    const second = previewBurst(ctx, mage.id, centreOn(ctx, mage, foe), VORTEX).targets.find((t) => t.id === foe.id)!.damage
    expect([first, second]).toEqual([own * 3, (own - 1) * 3])
    expect(effective(ctx, mage, 'magic').value).toBe(own - 1)
    expect(effective(ctx, mage, 'magic').ledger.at(-1)).toMatchObject({ source: VORTEX, delta: -1 })   // the stat's ledger says why (Law 12)
    expect(valueOf(ctx, mage, { scale: 'partyMagic', mult: 2 })).toBe((party - 1) * 2)
    expect(valueOf(ctx, foe, { scale: 'power', mult: 1 })).toBe(3)
    // the other side's Magic is its own: untouched
    expect(effective(ctx, foe, 'magic').ledger.some((r) => r.source === VORTEX)).toBe(false)
  })
  it('never below 0: a party with no Magic left loses none, and an enemy side with no Power loses none - no line for a change of nothing', () => {
    const { ctx, mage } = atMage()
    for (const u of ctx.state.units) if (u.side === 'hero') u.magic = 0
    expect([partySum(ctx, 'hero', 'magic'), powerOf(ctx)]).toEqual([0, 0])
    changeSideStat(ctx, 'hero', { stat: 'magic', side: 'own', value: -1, until: 'battle' }, 'test.cause', mage.id)
    changeSideStat(ctx, 'hero', { stat: 'power', value: -1, until: 'battle' }, 'test.cause', mage.id)
    expect([partySum(ctx, 'hero', 'magic'), powerOf(ctx), effective(ctx, mage, 'magic').value]).toEqual([0, 0, 0])
    expect(types(ctx, 'side.stat.changed')).toEqual([])
    // a lowering larger than what is there takes what is there, and says so
    mage.magic = 2
    changeSideStat(ctx, 'hero', { stat: 'magic', side: 'own', value: -5, until: 'battle' }, 'test.cause', mage.id)
    expect(partySum(ctx, 'hero', 'magic')).toBe(0)
    expect(types(ctx, 'side.stat.changed').map((e) => [e['by'], e['asked'], e['before'], e['after']])).toEqual([[-2, -5, 2, 0]])
  })
})

describe('raised for a number of Turns', () => {
  it('the test row raises the party\'s Magic by 2 for two Turns - this one and the next - and it returns after, with a line that says so', () => {
    const { ctx, mage } = atMage()
    const party = partySum(ctx, 'hero', 'magic'), own = effective(ctx, mage, 'magic').value, turn = ctx.state.turn
    applyEffect(ctx, ACTIONS[SWELL]!.effects![0]!, { causeId: SWELL, actor: mage.id, by: mage.id, abilityId: SWELL }, mage.id)
    expect([partySum(ctx, 'hero', 'magic'), effective(ctx, mage, 'magic').value]).toEqual([party + 2, own + 2])
    expect(types(ctx, 'side.stat.changed').at(-1)).toMatchObject({ causeId: SWELL, side: 'hero', stat: 'magic', by: 2, before: party, after: party + 2, until: 'endOfNextTurn', expiresAtTurn: turn + 2 })
    expireTurnMods(ctx, 'test'); ctx.state.turn++   // the Turn it was raised in ends: still raised through the next
    expect(partySum(ctx, 'hero', 'magic')).toBe(party + 2)
    expireTurnMods(ctx, 'test'); ctx.state.turn++   // the next Turn ends: it returns
    expect([partySum(ctx, 'hero', 'magic'), effective(ctx, mage, 'magic').value]).toEqual([party, own])
    expect(types(ctx, 'side.stat.restored').map((e) => [e.causeId, e['side'], e['stat'], e['by'], e['before'], e['after'], e['source']])).toEqual([['test', 'hero', 'magic', -2, party + 2, party, SWELL]])
    expect(sideModOf(ctx, 'hero', 'magic')).toBe(0)
  })
  it('a battle with a change standing saves and restores; a battle in which nothing changes a party stat carries no such state and says no such line', () => {
    const { ctx, mage } = atMage()
    changeSideStat(ctx, 'hero', { stat: 'spirit', side: 'own', value: 3, until: 'endOfTurn' }, 'test.cause', mage.id)
    const back = restoreBattle(saveBattle(ctx), ctx)
    expect(JSON.stringify(back.state)).toBe(JSON.stringify(ctx.state))
    expect(partySum(back, 'hero', 'spirit')).toBe(partySum(ctx, 'hero', 'spirit'))
    const plain = createBattle(scenarioOptions(SCENARIOS['test.force-blast']!)); runBattle(plain)
    expect(plain.state.sideMods).toBeUndefined()
    expect(plain.events.some((e) => e.type.startsWith('side.stat.'))).toBe(false)
  })
})

describe('in a real battle, fought by the computer', () => {
  it('the mage uses Vortex, and from then on the party\'s Magic is lower: the log says it once for each use', () => {
    const ctx = fielding()
    runBattle(ctx)
    const used = ctx.events.filter((e) => e.type === 'burst.declared' && e.causeId === VORTEX)
    expect(used.length, 'the computer uses Vortex').toBeGreaterThan(0)
    const lowered = types(ctx, 'side.stat.changed').filter((e) => e.causeId === VORTEX && e['stat'] === 'magic')
    expect(lowered.length).toBeGreaterThan(0)
    expect(lowered.length).toBeLessThanOrEqual(used.length)
    for (const e of lowered) expect([e['side'], e['by']]).toEqual(['hero', -1])
  })
})
