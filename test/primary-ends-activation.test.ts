// rule.primary-ends-activation — ruled 2026-09-29 (Andrew, DECISIONS.md "the playable
// battle screen ... the activation that ends itself"): "When you perform your primary
// action and it is not a free primary action, after that action resolves, there's no
// button to end activation." PLAYABLE-OPENING-PLAN.md item 1.
//
// Under the human command path (core/commands.ts executeBattleCommand) a resolved
// non-free primary action closes the action cycle itself: no `end-cycle` command is
// needed, the Surge check still runs where advanceBattle runs it, and the next choice
// is offered. A free primary action leaves the activation open. A non-free action
// spent in the MOVEMENT slot is the movement action, not the primary, and leaves it
// open too (SWITCHES.md primaryEndsBySlot).
//
// AI path: runActivation stops once primaryUsed is set, and resolveActionSlot refuses
// every action (free ones included) after it — so both drivers end the activation at
// the same moment; the last test holds that, through legalActions, for both.
import { describe, expect, it } from 'vitest'
import { advanceBattle } from '../src/core/battle.js'
import { createCustomBattle } from '../src/core/setup.js'
import { executeBattleCommand, legalActions, type ControlPolicy } from '../src/core/commands.js'
import { attacksOf } from '../src/core/action.js'
import { runActivation } from '../src/ai/modes.js'
import type { ActionDef, Ctx } from '../src/core/types.js'

const both: ControlPolicy = { humanUnitUids: [100, 101] }
function field(policy: ControlPolicy = both): Ctx {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }, { type: 'test-warrior', hex: 84 }], [{ type: 'test-zombie', hex: 86 }],
    { strict: true, heroUids: [100, 101], enemyUids: [900] })
  // A durable opponent keeps every assertion inside the Battle; no Surge unless a test gives it.
  ctx.state.units[2]!.hp = ctx.state.units[2]!.maxHp = 1000
  for (const u of ctx.state.units) { u.surge = 0; u.surgeChance = 0 }
  return ctx
}
function begin(ctx: Ctx, policy: ControlPolicy = both) {
  expect(advanceBattle(ctx, policy)).toEqual({ kind: 'selecting', unitUids: [100, 101] })
  expect(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: 100, expectedSeq: ctx.state.seq })).toEqual({ ok: true })
  expect(advanceBattle(ctx, policy)).toEqual({ kind: 'acting', actor: 0 })
}
const attackId = (ctx: Ctx) => attacksOf(ctx, ctx.state.units[0]!)[0]!.id
function regrant(ctx: Ctx, id: string, changes: Partial<ActionDef>) { ctx.actions = { ...ctx.actions, [id]: { ...ctx.actions[id]!, ...changes, id } } }
const act = (ctx: Ctx, request: object) => executeBattleCommand(ctx, both, { kind: 'action', actor: 0, expectedSeq: ctx.state.seq, ...request })
const endCycle = (ctx: Ctx) => executeBattleCommand(ctx, both, { kind: 'end-cycle', actor: 0, expectedSeq: ctx.state.seq })
const ends = (ctx: Ctx, actor = 0) => ctx.events.filter(e => e.type === 'activation.end' && e.actor === actor).length

describe('rule.primary-ends-activation', () => {
  it('a human hero that attacks (non-free) needs no end-cycle — its activation ends and the next choice is offered', () => {
    const ctx = field(); begin(ctx)
    expect(act(ctx, { actionId: attackId(ctx), target: 2 })).toEqual({ ok: true })
    expect(ctx.state.units[0]!.primaryUsed).toBe(true)
    expect(ctx.battleCursor!.at).not.toBe('acting')
    expect(endCycle(ctx)).toMatchObject({ ok: false, reason: 'not-acting' })   // there is nothing left to end
    expect(advanceBattle(ctx, both)).toEqual({ kind: 'selecting', unitUids: [101] })
    expect(ends(ctx)).toBe(1)   // the End of Activation ladder ran once
  })

  it('a free primary action leaves the activation open until the hero ends it', () => {
    const ctx = field(); begin(ctx)
    const id = attackId(ctx); regrant(ctx, id, { free: true })
    expect(act(ctx, { actionId: id, target: 2, slot: 'primary' })).toEqual({ ok: true })
    expect(ctx.state.units[0]!.primaryUsed).toBe(false)
    expect(ctx.battleCursor).toMatchObject({ at: 'acting', actor: 0 })
    expect(advanceBattle(ctx, both)).toEqual({ kind: 'acting', actor: 0 })   // a pure read: still this hero's
    expect(ends(ctx)).toBe(0)
    expect(endCycle(ctx)).toEqual({ ok: true })
    expect(advanceBattle(ctx, both)).toEqual({ kind: 'selecting', unitUids: [101] })
    expect(ends(ctx)).toBe(1)
  })

  it('a non-free action in the movement slot is the movement action — the activation stays open; the primary after it ends it', () => {
    const ctx = field(); begin(ctx)
    const id = attackId(ctx); regrant(ctx, id, { slot: 'either', free: false })
    expect(act(ctx, { actionId: id, target: 2, slot: 'movement' })).toEqual({ ok: true })
    expect(ctx.state.units[0]!).toMatchObject({ moveUsed: true, primaryUsed: false })
    expect(ctx.battleCursor).toMatchObject({ at: 'acting', actor: 0 })
    expect(act(ctx, { actionId: id, target: 2, slot: 'primary' })).toEqual({ ok: true })
    expect(ctx.battleCursor!.at).not.toBe('acting')
    expect(advanceBattle(ctx, both)).toEqual({ kind: 'selecting', unitUids: [101] })
    expect(ends(ctx)).toBe(1)
  })

  it('the Surge check still runs: a surging hero acts again inside the same activation', () => {
    const ctx = field(); begin(ctx)
    const u = ctx.state.units[0]!
    u.surge = 20; u.surgeChance = 130   // the check reads 150: an automatic Surge
    expect(act(ctx, { actionId: attackId(ctx), target: 2 })).toEqual({ ok: true })
    expect(ctx.battleCursor!.at).toBe('surge-check')
    expect(advanceBattle(ctx, both)).toEqual({ kind: 'acting', actor: 0 })
    expect(ctx.events.filter(e => e.type === 'surge.checked' && e.actor === 0)).toHaveLength(1)
    expect(u.primaryUsed).toBe(false)   // the Surge reopened the primary
    expect(ctx.events.filter(e => e.type === 'activation.begin' && e.actor === 0)).toHaveLength(1)
    expect(ends(ctx)).toBe(0)
  })

  it('both drivers agree: after a paid primary nothing is legal, so closing the cycle loses no action', () => {
    const human = field(); begin(human)
    const id = attackId(human)
    expect(legalActions(human, 0).length).toBeGreaterThan(0)
    // a free action stays on the list before the primary, and is refused after it
    regrant(human, 'power.move', { free: true })
    expect(act(human, { actionId: id, target: 2 })).toEqual({ ok: true })
    expect(legalActions(human, 0)).toEqual([])
    const ai = field({ humanUnitUids: [] })
    expect(advanceBattle(ai)).toEqual({ kind: 'acting', actor: 0 })
    runActivation(ai, 0)
    expect(ai.state.units[0]!.primaryUsed).toBe(true)
    expect(legalActions(ai, 0)).toEqual([])
  })
})
