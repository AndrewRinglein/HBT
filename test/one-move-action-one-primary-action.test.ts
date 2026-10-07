// rule.one-move-action-one-primary-action (2026-10-06). Ruled 2026-10-06 (Andrew, DECISIONS.md 'an Activation is one move action
// and one primary action, in that order; a used-up power stays on the bar, greyed'): "All the player units get two actions: a
// move action and a primary action, in that order, every time they get activated. You shouldn't need to additionally author
// something of 'Oh, there's only one move action.' … That's fundamentally how this was built: there's a move action and a
// primary action."
//
// The rule, in the engine's one slot resolution (core/action.ts resolveActionSlot), for every unit:
//   1. a move-class action (a unit's Move, every special move, the stand - a movement that is not a charge) is only ever
//      taken as the MOVE action; once the move action is spent no other move-class action is legal in that action cycle,
//      refused with 'movement-slot-closed' - except the walk that IS the move action, cut short: its rest may be walked, and
//      that is the same move action (it spends no primary action);
//   2. the primary action never takes a move-class action - not a walk, not a movement power 'as its primary';
//   3. the move action comes before the primary action: the primary action ends the action cycle, as it did, and after it
//      nothing is legal; a unit may skip either;
//   4. a Surge reopens the cycle as before.
// It subsumes rule.walked-unit-has-moved's closing and rule.prone-only-stand-up's (test/walked-unit-has-moved.test.ts and
// test/prone-only-stand-up.test.ts still hold, unchanged in what they ask).
import { levelTwo } from './level-two.js'
import { describe, expect, it } from 'vitest'
import { runBattle } from '../src/core/battle.js'
import { createBattle } from '../src/core/setup.js'
import { executeAction, legalActions, validateAction } from '../src/core/commands.js'
import { attacksOf, isCharge, isMove, movesOf, resolveActionSlot } from '../src/core/action.js'
import { movementOptions } from '../src/core/movement.js'
import { beginActivation, reopenSurgeCycle } from '../src/core/mutate.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Unit } from '../src/core/types.js'
import { hexId } from './board16.js'

const CLOSED = { ok: false, reason: 'movement-slot-closed' }
const WARRIOR = 'hero.base.warrior-iron', RANGER = 'hero.base.ranger-ranger', PALADIN = 'hero.base.paladin-shiney'
const HOME = hexId(5, 5), FAR = hexId(14, 13)

/** One hero in the open, its Activation begun, Stamina for anything; a zombie beside it (`near`) or far away. Unit 0 the hero. */
function rig(hero: string, near = false): { ctx: Ctx; u: Unit } {
  // Restated 2026-10-06 at the merge of this rule with rule.special-moves-unlock-at-level-two (ruled the same day, DECISIONS.md
  // 'a hero's special moves unlock at level 2, ruled: all of them, every hero …'): a hero has its Leap, Side Roll or Sidestep
  // from level 2, and this file is about what a second movement may and may not do - so its hero is fielded at level 2
  // (test/level-two.ts), where it has one. Both rulings stand; what is held of the one move action is unchanged. The two
  // lines were the same without `heroProgress: [levelTwo(hero)]`.
  const probe = createBattle({ replicate: 0, mapId: 'map.open', heroes: [hero], heroHexes: [HOME], enemies: ['test-zombie'], enemyHexes: [FAR], enemyCount: 1, strict: true, heroProgress: [levelTwo(hero)] })
  const ctx = near ? createBattle({ replicate: 0, mapId: 'map.open', heroes: [hero], heroHexes: [HOME], enemies: ['test-zombie'], enemyHexes: [probe.geo.neighboursOf(HOME)[0]!], enemyCount: 1, strict: true, heroProgress: [levelTwo(hero)] }) : probe
  const u = ctx.state.units[0]!
  ctx.state.units[1]!.hp = ctx.state.units[1]!.maxHp = 500
  beginActivation(ctx, 0, 'test')
  u.stamina = u.maxStamina = 20
  return { ctx, u }
}
const walkOf = (ctx: Ctx, u: Unit) => movesOf(ctx, u).find((a) => a.move.shape === 'path')!
const destinations = (ctx: Ctx, actionId: string) => movementOptions(ctx, 0, actionId).map((p) => p.destination)
const listed = (ctx: Ctx, pick: (id: string) => boolean) => [...new Set(legalActions(ctx, 0).map((r) => r.actionId))].filter(pick)
const moveClass = (ctx: Ctx, id: string) => { const a = ctx.actions[id]!; return isMove(a) && !isCharge(a) }
/** Some open hex one step from the unit. */
const beside = (ctx: Ctx, u: Unit) => ctx.geo.neighboursOf(u.hex).find((h) => !ctx.state.units.some((o) => o.hex === h))!

describe('one move action: after any move-class action no other is legal', () => {
  it.each([['Leap', WARRIOR, 'power.leap'], ['Side Roll', RANGER, 'power.side-roll'], ['Sidestep', PALADIN, 'power.sidestep']])('%s first: the walk is then refused in either slot with the movement-slot reason, and is off the action list; the attacks stay', (_n, hero, power) => {
    const { ctx, u } = rig(hero, true)
    const walk = walkOf(ctx, u).id
    expect(destinations(ctx, walk).length, 'before: the walk has somewhere to go').toBeGreaterThan(0)
    expect(executeAction(ctx, { actor: 0, actionId: power, destination: destinations(ctx, power)[0]! })).toEqual({ ok: true })
    expect([u.moveUsed, u.primaryUsed]).toEqual([true, false])
    const to = beside(ctx, u), before = ctx.events.length, at = u.hex
    for (const slot of [undefined, 'movement', 'primary'] as const) {
      expect(validateAction(ctx, { actor: 0, actionId: walk, destination: to, ...(slot ? { slot } : {}) }), `the walk (${slot ?? 'any slot'})`).toEqual(CLOSED)
      expect(executeAction(ctx, { actor: 0, actionId: walk, destination: to, ...(slot ? { slot } : {}) }), `the walk (${slot ?? 'any slot'})`).toEqual(CLOSED)
      expect(validateAction(ctx, { actor: 0, actionId: power, destination: to, ...(slot ? { slot } : {}) }).ok, `${power} again (${slot ?? 'any slot'})`).toBe(false)
    }
    expect([ctx.events.length, u.hex]).toEqual([before, at])
    expect(destinations(ctx, walk)).toEqual([])
    expect(listed(ctx, (id) => moveClass(ctx, id)), 'no movement is on the action list').toEqual([])
    expect(resolveActionSlot(ctx, u, ctx.actions[walk]!)).toBeNull()
    expect(u.primaryUsed, 'its primary action is still its own').toBe(false)
    expect(listed(ctx, (id) => ctx.actions[id]!.attack !== undefined).length, 'its attacks are open').toBeGreaterThanOrEqual(0)
  })
  it('the walk first: every other movement is refused, as the walked rule had it', () => {
    const { ctx, u } = rig(WARRIOR)
    const walk = walkOf(ctx, u).id
    expect(executeAction(ctx, { actor: 0, actionId: walk, destination: beside(ctx, u) })).toEqual({ ok: true })
    for (const m of movesOf(ctx, u).filter((a) => a.id !== walk)) expect(validateAction(ctx, { actor: 0, actionId: m.id, destination: beside(ctx, u) }), m.id).toEqual(CLOSED)
  })
})

describe('the primary action never takes a move-class action', () => {
  it.each([['Warrior', WARRIOR], ['Ranger', RANGER], ['Paladin', PALADIN]])('%s, fresh: every movement asked for as the primary action is refused with the movement-slot reason, and resolves to the move action when no slot is named', (_n, hero) => {
    const { ctx, u } = rig(hero)
    const moves = movesOf(ctx, u); expect(moves.length).toBeGreaterThan(1)
    for (const m of moves) {
      const to = m.move.shape === 'sidestep' && (m.move.stepRange ?? 1) === 0 ? u.hex : destinations(ctx, m.id)[0]!
      expect(to, `${m.id} has somewhere to go as the move action`).toBeDefined()
      expect(validateAction(ctx, { actor: 0, actionId: m.id, destination: to, slot: 'primary' }), `${m.id} as the primary action`).toEqual(CLOSED)
      expect(resolveActionSlot(ctx, u, m, 'primary'), m.id).toBeNull()
      expect(resolveActionSlot(ctx, u, m), m.id).toBe('movement')
      expect(validateAction(ctx, { actor: 0, actionId: m.id, destination: to }), `${m.id} as the move action`).toEqual({ ok: true })
    }
  })
  it('a walk taken by a fresh unit spends the move action and never the primary', () => {
    const { ctx, u } = rig(WARRIOR)
    expect(executeAction(ctx, { actor: 0, actionId: walkOf(ctx, u).id, destination: beside(ctx, u) })).toEqual({ ok: true })
    expect([u.moveUsed, u.primaryUsed]).toEqual([true, false])
    expect(ctx.events.filter((e) => e.type === 'action.spent').map((e) => e['slot'])).toEqual(['movement'])
  })
})

describe('a walk cut short may still be finished: it is the same move action', () => {
  it('one hex walked of several: the rest may be walked, in the move action - no primary action is spent, the Activation goes on, and an attack may follow', () => {
    const { ctx, u } = rig(WARRIOR)
    const walk = walkOf(ctx, u).id
    expect(executeAction(ctx, { actor: 0, actionId: walk, destination: beside(ctx, u) })).toEqual({ ok: true })
    const left = u.movePointsLeft; expect(left, 'movement is left').toBeGreaterThan(0)
    const next = destinations(ctx, walk); expect(next.length, 'the rest of the walk is offered').toBeGreaterThan(0)
    expect(validateAction(ctx, { actor: 0, actionId: walk, destination: next[0]!, slot: 'primary' }), 'never as the primary action').toEqual(CLOSED)
    expect(executeAction(ctx, { actor: 0, actionId: walk, destination: next[0]! })).toEqual({ ok: true })
    expect(u.movePointsLeft).toBeLessThan(left)
    expect([u.moveUsed, u.primaryUsed], 'the rest of the walk was the move action still').toEqual([true, false])
    expect(ctx.events.filter((e) => e.type === 'action.spent' && e['actionId'] === walk).map((e) => e['slot'])).toEqual(['movement', 'movement'])
    expect(validateAction(ctx, { actor: 0, actionId: 'power.leap', destination: beside(ctx, u) }), 'another movement is still refused').toEqual(CLOSED)
    expect(resolveActionSlot(ctx, u, attacksOf(ctx, u)[0]!), 'and its primary action is still open').toBe('primary')
  })
  it('walked out: with no movement left the walk has nowhere to go', () => {
    const { ctx, u } = rig(WARRIOR)
    const walk = walkOf(ctx, u).id
    const far = movementOptions(ctx, 0, walk).reduce((a, b) => (b.pathCost > a.pathCost ? b : a))
    expect(executeAction(ctx, { actor: 0, actionId: walk, destination: far.destination })).toEqual({ ok: true })
    expect(u.movePointsLeft).toBe(0)
    expect(destinations(ctx, walk)).toEqual([])
  })
})

describe('in that order: the primary action ends the action cycle', () => {
  it('the primary action taken first: no movement is legal after it, and nothing else', () => {
    const { ctx, u } = rig(WARRIOR, true)
    const attack = attacksOf(ctx, u).find((a) => legalActions(ctx, 0).some((r) => r.actionId === a.id))!
    expect(executeAction(ctx, { actor: 0, actionId: attack.id, target: 1 })).toEqual({ ok: true })
    expect([u.moveUsed, u.primaryUsed]).toEqual([false, true])
    for (const m of movesOf(ctx, u)) expect(validateAction(ctx, { actor: 0, actionId: m.id, destination: beside(ctx, u) }).ok, m.id).toBe(false)
    expect(legalActions(ctx, 0)).toEqual([])
  })
  it('a Surge - a second action cycle - reopens the move action, as before', () => {
    const { ctx, u } = rig(WARRIOR)
    executeAction(ctx, { actor: 0, actionId: 'power.leap', destination: destinations(ctx, 'power.leap')[0]! })
    expect(destinations(ctx, 'power.move')).toEqual([])
    reopenSurgeCycle(ctx, 0, u.movement, ctx.events.length - 1)
    expect(destinations(ctx, 'power.move').length).toBeGreaterThan(0)
    expect(destinations(ctx, 'power.leap').length).toBeGreaterThan(0)
  })
})

describe('the computer plays by the same rule', () => {
  it.each(['test.prone-a', 'test.prone-b', 'test.opening-orphanage', 'test.opening-gates'])('%s, played out: no unit of either side ever spends a primary action on a movement, and none takes two different movements in one action cycle', (id) => {
    const ctx = createBattle(scenarioOptions(SCENARIOS[id]!))
    runBattle(ctx)
    const cycle = new Map<number, string[]>()
    let moves = 0
    for (const e of ctx.events) {
      if (e.type === 'activation.begin' || e.type === 'surge.hit') cycle.set(Number(e.actor), [])
      if (e.type !== 'action.spent' || !moveClass(ctx, String(e['actionId']))) continue
      moves++
      expect(e['slot'], `${id}: unit ${e.actor} took ${e['actionId']} at event ${e.seq}`).toBe('movement')
      const mine = cycle.get(Number(e.actor)) ?? []
      expect(mine.filter((x) => x !== e['actionId']), `${id}: unit ${e.actor} had already moved with another movement this cycle`).toEqual([])
      mine.push(String(e['actionId'])); cycle.set(Number(e.actor), mine)
    }
    expect(moves).toBeGreaterThan(0)
  })
})
