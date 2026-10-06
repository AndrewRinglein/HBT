// rule.player-moves-summons (2026-10-06). Ruled 2026-10-05 (Andrew, DECISIONS.md 'a prone unit only stands; …; the player moves a
// summon; …'): asked whether the player should move the summoned Wolf, or the computer as built - "Then the view Wolf's spine
// player should move to someone's wolf." (dictation; the chat's reading, said to him: the player moves a summoned unit), and
// 2026-10-06 'the computer avoids its own traps; …; the player moves the summoned Wolf; …'.
//
// The rule, in the engine's one answer to "whose is this unit" (core/control.ts controllerOf): a unit summoned by a unit the
// session's player controls is the player's too. So in the Hero Phase after it is called it is offered to the player like a
// hero - it is never activated by the computer - and takes the player's orders. A unit summoned by anything else is the
// computer's, and with no player in the session (a battle the computer plays out) every unit is the computer's, as before.
import { describe, expect, it } from 'vitest'
import { advanceBattle, completeActionCycle, runBattle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { createBattle } from '../src/core/setup.js'
import { executeBattleCommand, legalActions, type ControlPolicy } from '../src/core/commands.js'
import { activationChoices, controllerOf } from '../src/core/control.js'
import { isAttack, isMove } from '../src/core/action.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx } from '../src/core/types.js'

const CALL = 'power.staff-of-summoning.call-the-wolf', WOLF = 'unit.wolf'
const fielding = () => createBattle(scenarioOptions(SCENARIOS['test.call-the-wolf']!))
/** Advance until the battle waits on the player (a selection), acts for a player's unit, or is over. */
const wait = (ctx: Ctx, policy: ControlPolicy) => advanceBattle(ctx, policy)
const ok = (r: { ok: boolean; reason?: string }, what: string) => { expect(r, what).toEqual({ ok: true }) }
/** The mage, played by the session's player, calls the Wolf on Turn 1 and the Hero Phase is ended. Returns the Wolf's unit. */
function called(policyOf: (mageUid: number) => ControlPolicy = (uid) => ({ humanUnitUids: [uid] })) {
  const ctx = fielding(), mage = ctx.state.units.find((u) => u.side === 'hero')!, policy = policyOf(mage.uid), player = { humanUnitUids: [mage.uid] }
  expect(wait(ctx, player).kind).toBe('selecting')
  ok(executeBattleCommand(ctx, player, { kind: 'select-activation', unitUid: mage.uid, expectedSeq: ctx.state.seq }), 'the mage is chosen')
  expect(wait(ctx, player)).toEqual({ kind: 'acting', actor: mage.id })
  const call = legalActions(ctx, mage.id).find((r) => r.actionId === CALL)!
  expect(call, 'Call the Wolf is on the mage\'s list').toBeDefined()
  ok(executeBattleCommand(ctx, player, { kind: 'action', ...call, expectedSeq: ctx.state.seq }), 'the Wolf is called')
  const wolf = ctx.state.units.at(-1)!
  expect([wolf.typeId, wolf.summoned, wolf.summonedBy]).toEqual([WOLF, true, mage.id])
  return { ctx, mage, wolf, policy, player }
}
/** From the call, play on under `policy` until the battle next waits on the player in a LATER Turn's Hero Phase. */
function nextHeroPhase(ctx: Ctx, policy: ControlPolicy, mageId: number) {
  const from = ctx.state.turn
  for (let n = 0; n < 2000; n++) {
    const r = wait(ctx, policy)
    if (r.kind === 'complete') return r
    if (r.kind === 'selecting' && ctx.state.turn > from) return r
    if (r.kind === 'selecting') ok(executeBattleCommand(ctx, policy, { kind: 'end-player-phase', expectedSeq: ctx.state.seq }), 'the Hero Phase is ended')
    else if (r.kind === 'acting' && controllerOf(ctx, r.actor, policy) === 'human') ok(executeBattleCommand(ctx, policy, { kind: 'end-cycle', actor: r.actor, expectedSeq: ctx.state.seq }), `unit ${r.actor}'s cycle is ended (${mageId})`)
    else if (r.kind === 'acting') { runActivation(ctx, r.actor); completeActionCycle(ctx) }   // the computer's unit: its driver plays it, as the session's does
  }
  throw new Error('the next Hero Phase never came')
}

describe('whose is a summoned unit', () => {
  it('summoned by a unit the player controls, it is the player\'s; by any other, the computer\'s; with no player in the session, the computer\'s', () => {
    const { ctx, mage, wolf } = called()
    expect(controllerOf(ctx, wolf.id, { humanUnitUids: [mage.uid] }), 'the mage is the player\'s, so its Wolf is').toBe('human')
    expect(controllerOf(ctx, wolf.id, { humanUnitUids: [] }), 'a battle the computer plays: every unit is the computer\'s').toBe('ai')
    expect(controllerOf(ctx, wolf.id, { humanUnitUids: [987654] }), 'another player\'s session').toBe('ai')
    const zombie = ctx.state.units.find((u) => u.side === 'enemy')!
    wolf.summonedBy = zombie.id
    expect(controllerOf(ctx, wolf.id, { humanUnitUids: [mage.uid] }), 'summoned by an enemy: the computer\'s').toBe('ai')
    expect(controllerOf(ctx, zombie.id, { humanUnitUids: [mage.uid] })).toBe('ai')
  })
})

describe('the Turn after it is called, the Wolf is the player\'s to play', () => {
  it('it is offered at the Hero Phase\'s selection beside the mage, the computer has not activated it, and it takes the player\'s orders - a walk and an attack', () => {
    const { ctx, mage, wolf, policy } = called()
    const called_at = ctx.state.turn
    expect(nextHeroPhase(ctx, policy, mage.id).kind).toBe('selecting')
    expect(ctx.state.turn).toBe(called_at + 1)
    expect(ctx.events.filter((e) => e.type === 'activation.begin' && e.actor === wolf.id), 'the computer has not begun the Wolf\'s Activation').toEqual([])
    expect(ctx.events.some((e) => e.type === 'ai.mode' && e.actor === wolf.id), 'nor chosen for it').toBe(false)
    expect(activationChoices(ctx, policy).sort(), 'the mage and the Wolf are the player\'s to choose').toEqual([mage.uid, wolf.uid].sort())
    ok(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: wolf.uid, expectedSeq: ctx.state.seq }), 'the Wolf is chosen')
    expect(wait(ctx, policy)).toMatchObject({ kind: 'acting', actor: wolf.id })
    const list = legalActions(ctx, wolf.id)
    const walk = list.find((r) => isMove(ctx.actions[r.actionId]!) && 'destination' in r)!
    expect(walk, 'the Wolf has a move to make').toBeDefined()
    const at = wolf.hex
    ok(executeBattleCommand(ctx, policy, { kind: 'action', ...walk, expectedSeq: ctx.state.seq }), 'the Wolf walks where the player says')
    expect(wolf.hex).not.toBe(at)
    expect(ctx.events.some((e) => e.type === 'ai.mode' && e.actor === wolf.id), 'still no choice of the computer\'s').toBe(false)
    expect(list.some((r) => isAttack(ctx.actions[r.actionId]!)) || ctx.state.units[wolf.id]!.actions.some((id) => isAttack(ctx.actions[id]!)), 'and it has an attack of its own').toBe(true)
  })
  it('a battle the computer plays out is what it was: the Wolf is activated by its own AI in the Hero Phase', () => {
    const ctx = fielding()
    runBattle(ctx)
    const summon = ctx.events.find((e) => e.type === 'unit.summoned')!
    const wolf = summon['summoned'] as number
    expect(ctx.events.some((e) => e.type === 'ai.mode' && e.actor === wolf)).toBe(true)
    expect(ctx.events.filter((e) => e.type === 'activation.begin' && e.actor === wolf).length).toBeGreaterThan(0)
  })
})
