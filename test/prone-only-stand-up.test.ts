// rule.prone-only-stand-up (2026-10-05). Ruled 2026-10-05 (Andrew, DECISIONS.md 'a prone unit only stands; Stand Up is its
// one move; ...'): asked whether a downed unit should be refused attacks and powers until it stands - "yes, it cannot use
// attacks or powers until it stands."; asked whether it may walk after Stand Up - "No, you only perform one move action."
//
// The rule, in the engine's one legality check (core/action.ts actionReady) with no content name in core:
//   1. a unit holding a prone status is refused EVERY action but the stand that status grants - the command check's reason
//      is its own code, 'actor-prone' (the host words it: "Knocked down: Stand Up first.");
//   2. standing is the unit's one move action: after it stands, every other movement is refused with the reason the
//      walked-unit rule uses ('movement-slot-closed'); its attacks and powers open;
//   3. the computer follows the same rule - a prone unit it plays stands before anything else;
//   4. a prone unit makes no special free attack either (SWITCHES.md proneMakesNoReaction);
//   5. a unit that is standing and has not stood this Activation is unchanged.
import { levelTwo } from './level-two.js'
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { executeAction, legalActions, validateAction } from '../src/core/commands.js'
import { actionReady, attacksOf, grantedActionIds, isBurst, isCharge, isMove, movesOf, standsUp } from '../src/core/action.js'
import { movementOptions } from '../src/core/movement.js'
import { beginActivation, endActivation, reopenSurgeCycle } from '../src/core/mutate.js'
import { applyStatus, isProne } from '../src/core/status.js'
import { saveBattle, restoreBattle } from '../src/core/snapshot.js'
import { runActivation } from '../src/ai/modes.js'
import type { ActionDef, Ctx, Unit } from '../src/core/types.js'
import { hexId } from './board16.js'

const PRONE = { ok: false, reason: 'actor-prone' }
const CLOSED = { ok: false, reason: 'movement-slot-closed' }
const WARRIOR = 'hero.base.warrior-iron', RANGER = 'hero.base.ranger-ranger', PALADIN = 'hero.base.paladin-shiney', MAGE = 'hero.base.mage-fire'
const HOME = hexId(5, 5)

/** One hero in the open with a zombie beside it, the hero's Activation begun, Stamina for anything. Unit 0 the hero, 1 the zombie. */
function rig(hero: string): { ctx: Ctx; u: Unit; foe: Unit } {
  const probe = createBattle({ replicate: 0, mapId: 'map.open', heroes: [hero], heroHexes: [HOME], enemies: ['test-zombie'], enemyHexes: [hexId(14, 13)], enemyCount: 1, strict: true })
  const beside = probe.geo.neighboursOf(HOME)[0]!
  // Restated 2026-10-06 (rule.special-moves-unlock-at-level-two; ruled 2026-10-06, DECISIONS.md 'a hero's special moves unlock
  // at level 2 …'): the hero is fielded at level 2, where it has the special move this file refuses and reopens; the rule held
  // here - a prone unit only stands, and standing is its one move - is unchanged. The line was the same without heroProgress.
  const ctx = createBattle({ replicate: 0, mapId: 'map.open', heroes: [hero], heroHexes: [HOME], enemies: ['test-zombie'], enemyHexes: [beside], enemyCount: 1, strict: true, heroProgress: [levelTwo(hero)] })
  const u = ctx.state.units[0]!, foe = ctx.state.units[1]!
  foe.hp = foe.maxHp = 500
  beginActivation(ctx, 0, 'test')
  u.stamina = u.maxStamina = 20
  return { ctx, u, foe }
}
const down = (ctx: Ctx, id: number) => applyStatus(ctx, id, 'status.prone', 1, 'test')
const standOf = (ctx: Ctx, u: Unit) => grantedActionIds(ctx, u).map((id) => ctx.actions[id]!).find(standsUp)!
/** A command for this action, shaped as its kind asks: a movement to a hex, a burst to a centre, anything else at a unit. */
const order = (ctx: Ctx, u: Unit, a: ActionDef, slot?: 'movement' | 'primary') => ({
  actor: u.id, actionId: a.id,
  ...(isMove(a) && !isCharge(a) ? { destination: standsUp(a) ? u.hex : ctx.geo.neighboursOf(u.hex).find((h) => !ctx.state.units.some((o) => o.hex === h))! } : isBurst(a) ? { centre: ctx.state.units[1]!.hex } : { target: a.target?.side === 'ally' || a.target?.select === 'self' ? u.id : 1 }),
  ...(slot ? { slot } : {}),
})
const every = (ctx: Ctx, u: Unit) => grantedActionIds(ctx, u).map((id) => ctx.actions[id]!).filter(Boolean)
const listedIds = (ctx: Ctx, pick: (a: ActionDef) => boolean) => [...new Set(legalActions(ctx, 0).map((r) => r.actionId))].filter((id) => pick(ctx.actions[id]!)).sort()

describe('a prone unit is refused everything but its stand', () => {
  it.each([['Warrior', WARRIOR], ['Ranger', RANGER], ['Paladin', PALADIN], ['Mage', MAGE]])('%s: standing it has attacks, powers and moves; knocked down, every one is refused with the engine\'s own reason and only the stand is listed', (_n, hero) => {
    const fresh = rig(hero)
    const openBefore = listedIds(fresh.ctx, () => true)
    expect(openBefore.some((id) => fresh.ctx.actions[id]!.attack !== undefined), 'standing: an attack is open on the zombie beside it').toBe(true)
    expect(openBefore.some((id) => isMove(fresh.ctx.actions[id]!)), 'standing: a movement is open').toBe(true)

    const { ctx, u } = rig(hero)
    down(ctx, 0)
    const stand = standOf(ctx, u)
    const rest = every(ctx, u).filter((a) => a.id !== stand.id)
    expect(rest.length, 'the hero holds more than its stand').toBeGreaterThan(2)
    expect(rest.some((a) => a.attack !== undefined)).toBe(true)
    const before = ctx.events.length, stamina = u.stamina
    for (const a of rest) {
      expect(actionReady(ctx, u, a), `${a.id}: the one limits check refuses it`).toBe(false)
      expect(validateAction(ctx, order(ctx, u, a)), `${a.id}: refused, and the reason says why`).toEqual(PRONE)
      expect(executeAction(ctx, order(ctx, u, a)), `${a.id}: the order is not carried out`).toEqual(PRONE)
      if (isMove(a) && !isCharge(a)) expect(movementOptions(ctx, 0, a.id), `${a.id}: nowhere to go`).toEqual([])
    }
    // a refusal emits nothing and spends nothing; the unit is still down
    expect([ctx.events.length, u.stamina, isProne(ctx, u)]).toEqual([before, stamina, true])
    expect(listedIds(ctx, () => true), 'the list of legal actions is the stand alone').toEqual([stand.id])
    expect(actionReady(ctx, u, stand)).toBe(true)
    expect(validateAction(ctx, order(ctx, u, stand))).toEqual({ ok: true })
  })
  it('the reason is the prone one only for an action the unit holds: an action it was never granted is not ready, as before', () => {
    const { ctx } = rig(WARRIOR)
    down(ctx, 0)
    expect(validateAction(ctx, { actor: 0, actionId: 'power.back-flip', destination: HOME })).toEqual({ ok: false, reason: 'action-not-ready' })
  })
})

describe('the rule is the status row\'s, never a name: any status that carries the prone rule', () => {
  it.each(['status.prone', 'test.status.floored'])('%s: the holder is refused all but the stand that row grants; standing, it has moved', (statusId) => {
    const { ctx, u } = rig(WARRIOR)
    applyStatus(ctx, 0, statusId, 1, 'test')
    const stand = ctx.actions[ctx.statuses[statusId]!.prone!.standAction]!
    expect(listedIds(ctx, () => true)).toEqual([stand.id])
    for (const a of every(ctx, u).filter((x) => x.id !== stand.id)) expect(validateAction(ctx, order(ctx, u, a)), a.id).toEqual(PRONE)
    expect(executeAction(ctx, order(ctx, u, stand))).toEqual({ ok: true })
    expect(isProne(ctx, u)).toBe(false)
    for (const m of movesOf(ctx, u)) expect(validateAction(ctx, order(ctx, u, m, 'primary')), m.id).toEqual(CLOSED)
    expect(listedIds(ctx, (a) => a.attack !== undefined).length, 'its attacks are open').toBeGreaterThan(0)
  })
})

describe('standing is the unit\'s one move action', () => {
  it.each([['Warrior', WARRIOR], ['Ranger', RANGER], ['Paladin', PALADIN], ['Mage', MAGE]])('%s: after Stand Up every other movement is refused in either slot with the walked-unit reason; attacks and powers open', (_n, hero) => {
    const fresh = rig(hero)
    const notMoves = (a: ActionDef) => !isMove(a) || isCharge(a)
    const openStanding = listedIds(fresh.ctx, notMoves)

    const { ctx, u } = rig(hero)
    down(ctx, 0)
    const stand = standOf(ctx, u)
    expect(executeAction(ctx, order(ctx, u, stand))).toEqual({ ok: true })
    expect([isProne(ctx, u), u.moveUsed, u.primaryUsed]).toEqual([false, true, false])
    const moves = movesOf(ctx, u)
    expect(moves.length, 'it holds movements beside the stand').toBeGreaterThan(0)
    const before = ctx.events.length, at = u.hex, stamina = u.stamina
    for (const m of moves) {
      for (const slot of [undefined, 'primary'] as const) {
        expect(validateAction(ctx, order(ctx, u, m, slot)), `${m.id} (${slot ?? 'any slot'})`).toEqual(CLOSED)
        expect(executeAction(ctx, order(ctx, u, m, slot)), `${m.id} (${slot ?? 'any slot'})`).toEqual(CLOSED)
      }
      expect(movementOptions(ctx, 0, m.id), `${m.id}: nowhere to go`).toEqual([])
    }
    expect([ctx.events.length, u.hex, u.stamina]).toEqual([before, at, stamina])
    expect(listedIds(ctx, (a) => isMove(a) && !isCharge(a)), 'no movement is on the list').toEqual([])
    // what it could do standing, bar its movements, it can do now
    expect(listedIds(ctx, notMoves)).toEqual(openStanding)
    const attack = attacksOf(ctx, u).find((a) => legalActions(ctx, 0).some((r) => r.actionId === a.id && 'target' in r && r.target === 1))!
    expect(executeAction(ctx, { actor: 0, actionId: attack.id, target: 1 })).toEqual({ ok: true })
  })
  it('a Surge - a second action cycle - reopens the movements the stand had closed, as it does a walk\'s', () => {
    const { ctx, u } = rig(WARRIOR)
    down(ctx, 0)
    executeAction(ctx, order(ctx, u, standOf(ctx, u)))
    expect(movementOptions(ctx, 0, 'power.move')).toEqual([])
    reopenSurgeCycle(ctx, 0, u.movement, ctx.events.length - 1)
    expect(movementOptions(ctx, 0, 'power.move').length).toBeGreaterThan(0)
  })
  it('the fact is the Activation\'s: the next Activation of a unit that stood moves freely', () => {
    const { ctx, u } = rig(WARRIOR)
    down(ctx, 0)
    executeAction(ctx, order(ctx, u, standOf(ctx, u)))
    endActivation(ctx, 0, 'test')
    beginActivation(ctx, 0, 'test')
    expect(movementOptions(ctx, 0, 'power.move').length).toBeGreaterThan(0)
    expect(movementOptions(ctx, 0, 'power.leap').length).toBeGreaterThan(0)
  })
  it('knocked down again after it stood, the same Activation: it cannot stand a second time - its move is done', () => {
    const { ctx, u } = rig(WARRIOR)
    down(ctx, 0)
    const stand = standOf(ctx, u)
    executeAction(ctx, order(ctx, u, stand))
    down(ctx, 0)
    expect(validateAction(ctx, order(ctx, u, stand)).ok).toBe(false)
    expect(listedIds(ctx, () => true)).toEqual([])
  })
  it('a save taken after the stand restores a unit whose movements are still closed', () => {
    const { ctx, u } = rig(WARRIOR)
    down(ctx, 0)
    executeAction(ctx, order(ctx, u, standOf(ctx, u)))
    const restored = restoreBattle(saveBattle(ctx), ctx)
    expect(restored.state).toEqual(ctx.state)
    expect(validateAction(restored, order(restored, restored.state.units[0]!, restored.actions['power.leap']!))).toEqual(CLOSED)
  })
})

describe('the computer follows the same rule', () => {
  it('a prone unit it plays stands before anything else, then acts', () => {
    const { ctx, u } = rig(WARRIOR)
    down(ctx, 0)
    const from = ctx.events.length
    runActivation(ctx, 0)
    const spent = ctx.events.slice(from).filter((e) => e.type === 'action.spent')
    expect(spent[0]).toMatchObject({ actionId: standOf(ctx, { ...u, statuses: [{ id: 'status.prone', value: 1 }] } as Unit).id, slot: 'movement' })
    const stood = ctx.events.findIndex((e, i) => i >= from && e.type === 'unit.stood')
    expect(ctx.events.slice(from, stood).some((e) => e.type === 'attack.declared' || e.type === 'unit.moved'), 'nothing before the stand').toBe(false)
    expect(spent.slice(1).some((e) => isMove(ctx.actions[String(e['actionId'])]!) && !isCharge(ctx.actions[String(e['actionId'])]!)), 'no second movement after it').toBe(false)
    expect(spent.some((e) => e['slot'] === 'primary'), 'it then takes its primary').toBe(true)
  })
  it('a prone unit that cannot stand (its movement action is already spent) does nothing: no attack from the floor', () => {
    const { ctx, u } = rig(WARRIOR)
    u.moveUsed = true
    down(ctx, 0)
    const from = ctx.events.length
    runActivation(ctx, 0)
    expect(ctx.events.slice(from).filter((e) => e.type === 'action.spent')).toEqual([])
    expect(isProne(ctx, u)).toBe(true)
  })
})

describe('a prone unit makes no special free attack', () => {
  it('a counterattack on its own row: standing it answers a melee attack; knocked down it makes none', () => {
    const answer = (prone: boolean) => {
      const { ctx, u, foe } = rig(WARRIOR)
      foe.counterattack = 1
      if (prone) down(ctx, 1)
      const attack = attacksOf(ctx, u).find((a) => a.attack.kind === 'melee')!
      expect(executeAction(ctx, { actor: 0, actionId: attack.id, target: 1 })).toEqual({ ok: true })
      return ctx.events.filter((e) => e.type === 'aoo.provoked' && e['as'] === 'counterattack' && e['actor'] === 1).length
    }
    expect(answer(false)).toBe(1)
    expect(answer(true)).toBe(0)
  })
})

describe('a unit that is standing is unchanged', () => {
  // Law 10, 2026-10-06 — OVERTURNED by a ruling, not loosened: rule.one-move-action-one-primary-action (Andrew, DECISIONS.md 'an
  // Activation is one move action and one primary action, in that order; …': "All the player units get two actions: a move action
  // and a primary action, in that order, every time they get activated. … That's fundamentally how this was built.") A walk
  // after a Leap was the engine's fault, not a case to keep: the primary action never takes a move-class action. This case stood here as the control ("a unit that is standing is unchanged"), and that
  // control is what the ruling found wrong. The test was:
  //   it('a movement used before any walk still closes nothing: a Leap, then the walk in the primary slot', () => {
  //     … const walkTo = movementOptions(ctx, 0, 'power.move')[0]?.destination
  //     expect(walkTo, 'the walk is still offered').toBeDefined()
  //     expect(validateAction(ctx, { actor: 0, actionId: 'power.move', destination: walkTo! })).toEqual({ ok: true })
  //     expect(u.primaryUsed).toBe(false) })
  it('a standing unit too has one move action: a Leap, and the walk is then closed with the reason a stood unit\'s is', () => {
    const { ctx, u } = rig(WARRIOR)
    const leapTo = movementOptions(ctx, 0, 'power.leap')[0]!.destination
    expect(executeAction(ctx, { actor: 0, actionId: 'power.leap', destination: leapTo })).toEqual({ ok: true })
    expect(movementOptions(ctx, 0, 'power.move'), 'the walk is no longer offered').toEqual([])
    expect(validateAction(ctx, order(ctx, u, ctx.actions['power.move']!))).toEqual(CLOSED)
    expect(u.primaryUsed).toBe(false)
  })
  it('the stand is refused to a unit that is not down, as before', () => {
    const { ctx, u } = rig(WARRIOR)
    expect(validateAction(ctx, { actor: 0, actionId: 'power.stand-up', destination: u.hex }).ok).toBe(false)
  })
})
