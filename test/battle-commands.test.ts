import { setHigh } from './prop-fixtures.js'
import { describe, expect, it } from 'vitest'
import { controllerOf, executeAction, executeBattleCommand, validateAction, validateBattleCommand } from '../src/core/commands.js'
import { advanceBattle, completeActionCycle } from '../src/core/battle.js'
import { createCustomBattle } from '../src/core/setup.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { forkBattle } from '../src/core/fork.js'
import { attacksOf } from '../src/core/action.js'
import { performAttack } from '../src/core/pipeline.js'
import { usePower } from '../src/core/ability.js'
import { executeFlight, executeMove, executeSidestep, movementOptions, pathTo, reachable } from '../src/core/movement.js'
import { applyStatus } from '../src/core/status.js'
import { settle } from '../src/core/settle.js'
import { beginActivation } from '../src/core/mutate.js'
import { TERRAIN, type ActionDef, type Ctx, type MoveDef } from '../src/core/types.js'

const policy = { humanUnitUids: [100] }
function fixture(enemyHex = 86) {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: enemyHex }], { strict: true })
  // Deliberately durable opponents keep command-order tests inside one activation.
  ctx.state.units[1]!.hp = ctx.state.units[1]!.maxHp = 1000
  expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
  return ctx
}
const attack = (ctx: Ctx) => attacksOf(ctx, ctx.state.units[0]!)[0]!.id
const action = (ctx: Ctx, request: object) => ({ kind: 'action', actor: 0, expectedSeq: ctx.state.seq, ...request })
const end = (ctx: Ctx) => ({ kind: 'end-cycle', actor: 0, expectedSeq: ctx.state.seq })
function fullFork(ctx: Ctx): Ctx {
  const copy = forkBattle(ctx)
  // Lookahead forks intentionally clear their event prefix; canonical parity
  // compares complete logs, so restore the copied prefix in this test helper.
  copy.events = structuredClone(ctx.events)
  return copy
}
function grant(ctx: Ctx, id: string, changes?: Partial<ActionDef>) {
  if (changes) ctx.actions = { ...ctx.actions, [id]: { ...ctx.actions[id]!, ...changes, id } }
  if (!ctx.state.units[0]!.actions.includes(id)) ctx.state.units[0]!.actions.push(id)
}
function rejected(ctx: Ctx, command: unknown, reason?: string) {
  const before = saveBattle(ctx)
  const result = executeBattleCommand(ctx, policy, command)
  expect(result.ok).toBe(false)
  if (reason) expect(result).toMatchObject({ reason })
  expect(saveBattle(ctx)).toBe(before)
}

describe('plumbing.battle-commands', () => {
  it('uses the attack resolver and settle, then rejects both stale and freshly repeated primary requests', () => {
    const ctx = fixture(), direct = fullFork(ctx), id = attack(ctx)
    const command = action(ctx, { actionId: id, target: 1 })
    const before = saveBattle(ctx)
    expect(validateBattleCommand(ctx, policy, command)).toEqual({ ok: true })
    expect(saveBattle(ctx)).toBe(before)
    performAttack(direct, 0, 1, id); settle(direct, id)
    completeActionCycle(direct) // V2: a public paid primary closes the driver cycle.
    expect(executeBattleCommand(ctx, policy, command)).toEqual({ ok: true })
    expect(saveBattle(ctx)).toBe(saveBattle(direct))
    rejected(ctx, command, 'not-acting')
    rejected(ctx, action(ctx, { actionId: id, target: 1 }), 'not-acting')
  })

  it('uses the same power effects, costs and settle', () => {
    const ctx = fixture()
    const id = 'power.test-command-heal'
    ctx.actions = { ...ctx.actions, [id]: { id, name: 'Command healing fixture', staminaCost: 1, cooldown: 1, range: 0, target: { select: 'unit', side: 'ally' }, effects: [{ kind: 'heal', amount: 4 }] } }   // Law 10, fix.one-effect-vocabulary (2026-10-01): the fixture power is an effects list — the legacy power shape it used is retired; same power, same assertions.
    grant(ctx, id); ctx.state.units[0]!.hp -= 6
    const direct = fullFork(ctx)
    usePower(direct, 0, 0, id); settle(direct, id)
    completeActionCycle(direct) // Driver-neutral usePower does not advance the cursor.
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: id, target: 0 }))).toEqual({ ok: true })
    expect(saveBattle(ctx)).toBe(saveBattle(direct))
    expect(ctx.state.units[0]!.hp).toBe(ctx.state.units[0]!.maxHp - 2)
  })

  it.each(['power.move', 'power.sidestep', 'power.flight'])('%s uses existing movement resolution exactly', id => {
    const ctx = fixture(150); grant(ctx, id)
    const direct = fullFork(ctx), power = ctx.actions[id]! as MoveDef
    const destination = 86
    if (power.move.shape === 'path') executeMove(direct, 0, pathTo(reachable(direct, direct.state.units[0]!, power.move.budgetMod), 85, destination), power)
    else if (power.move.shape === 'sidestep') executeSidestep(direct, 0, destination, power)
    else executeFlight(direct, 0, destination, power)
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: id, destination }))).toEqual({ ok: true })
    expect(ctx.state.units[0]!.hex).toBe(destination)
    expect(saveBattle(ctx)).toBe(saveBattle(direct))
    // Law 10, 2026-10-06 — rule.one-move-action-one-primary-action (Andrew, DECISIONS.md 'an Activation is one move action and one
    // primary action, in that order; …'; the item: "a walk begun and cut short may still be finished … since that is the same
    // move action"): a second request in the movement slot is refused for a movement that is
    // not the unit's walk, as before; for its walk it is the rest of that walk — taken when movement is left, in the same move
    // action, and never the primary action. The lines were:
    //   // V2 profiles no longer imply restrictions: this reuses the SAME slot.
    //   rejected(ctx, action(ctx, { actionId: id, destination: 87, slot: 'movement' }))
    const me = ctx.state.units[0]!, rest = power.move.shape === 'path' && me.walked === true && movementOptions(ctx, 0, id).some((p) => p.destination === 87)
    if (!rest) rejected(ctx, action(ctx, { actionId: id, destination: 87, slot: 'movement' }))
    else {
      rejected(ctx, action(ctx, { actionId: id, destination: 87, slot: 'primary' }))
      expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: id, destination: 87, slot: 'movement' }))).toEqual({ ok: true })
      expect([me.hex, me.moveUsed, me.primaryUsed]).toEqual([87, true, false])
    }
  })

  it('validates the full walk and permits flight across an impassable barrier', () => {
    const ctx = fixture(150); grant(ctx, 'power.flight')
    for (let i = 0; i < ctx.state.terrain.length; i++) if (i % ctx.state.board.width === 6) setHigh(ctx, i)
    rejected(ctx, action(ctx, { actionId: 'power.move', destination: 87 }), 'unreachable-destination')
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: 'power.flight', destination: 87 }))).toEqual({ ok: true })
    expect(ctx.state.units[0]!.hex).toBe(87)
  })

  it('rejects impassable paths even when a huge movement budget would reach them', () => {
    const ctx = fixture(150); ctx.state.units[0]!.movePointsLeft = 2000
    setHigh(ctx, 86)
    rejected(ctx, action(ctx, { actionId: 'power.move', destination: 86 }))
  })

  it.each(['power.move', 'power.sidestep', 'power.flight'])('%s rejects offboard, occupied and impassable destinations before spending', id => {
    const ctx = fixture(); grant(ctx, id)
    for (const destination of [-1, ctx.state.terrain.length, 1.5, 86]) rejected(ctx, action(ctx, { actionId: id, destination }))
    setHigh(ctx, 84)
    rejected(ctx, action(ctx, { actionId: id, destination: 84 }))
  })

  it('enforces exact sidestep range, including a zero-step rider', () => {
    const ctx = fixture(150); grant(ctx, 'power.sidestep')
    rejected(ctx, action(ctx, { actionId: 'power.sidestep', destination: 87 }))
    grant(ctx, 'power.sidestep', { move: { shape: 'sidestep', budgetMod: 0, stepRange: 0 } })
    rejected(ctx, action(ctx, { actionId: 'power.sidestep', destination: 86 }))
    ctx.state.units[0]!.movePointsLeft = 0
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: 'power.sidestep', destination: 85 }))).toEqual({ ok: true })
    expect(ctx.state.units[0]!.hex).toBe(85)
    expect(ctx.state.units[0]!.moveUsed).toBe(true)
  })

  it('closes movement after a primary, and allows an attack after movement', () => {
    const ctx = fixture(87)
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: 'power.move', destination: 86 }))).toEqual({ ok: true })
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: attack(ctx), target: 1 }))).toEqual({ ok: true })
    const other = fixture()
    expect(executeBattleCommand(other, policy, action(other, { actionId: attack(other), target: 1 }))).toEqual({ ok: true })
    rejected(other, action(other, { actionId: 'power.move', destination: 84 }), 'not-acting')
  })

  it('does not close slots for a free attack', () => {
    const ctx = fixture()
    const id = attack(ctx); grant(ctx, id, { free: true })
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: id, target: 1 }))).toEqual({ ok: true })
    expect(ctx.state.units[0]!.primaryUsed).toBe(false)
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: 'power.move', destination: 84 }))).toEqual({ ok: true })
  })

  // fix.movement-plans replaces the deliberate legacy clamp with verified bonus spending.
  it('spends the positive walk modifier that the planner offers', () => {
    const ctx = fixture(150)
    grant(ctx, 'power.move', { move: { shape: 'path', budgetMod: 3 } })
    ctx.state.units[0]!.movePointsLeft = 1
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: 'power.move', destination: 89 }))).toEqual({ ok: true })
    expect(ctx.state.units[0]!.hex).toBe(89)
    expect(ctx.state.units[0]!.movePointsLeft).toBe(0)
  })

  it.each([null, [], {}, { kind: 'reaction' }, { kind: 'action', actor: 0, actionId: 'x', target: 1 },
    { kind: 'end-cycle', actor: -1, expectedSeq: 0 }])('rejects malformed input %j', value => rejected(fixture(), value))

  it.each([
    { controller: 'human' }, { mode: 'reaction' }, { path: [86] }, { action: {} }, { target: 1, destination: 86 },
    { actor: 1 }, { actor: 999 }, { actor: 0.5 }, { actionId: '__proto__' }, { target: -1 }, { target: 999 },
  ])('rejects unauthorized or malformed action fields %j', fields => {
    const ctx = fixture()
    rejected(ctx, action(ctx, { actionId: attack(ctx), target: 1, ...fields }))
  })

  it('rejects ungranted, unaffordable, cooling and exhausted actions and blocked actors', () => {
    for (const alter of [
      (ctx: Ctx, id: string) => { ctx.state.units[0]!.actions = ctx.state.units[0]!.actions.filter(x => x !== id) },
      (ctx: Ctx, id: string) => { grant(ctx, id, { staminaCost: 1000 }) },
      (ctx: Ctx, id: string) => { ctx.state.units[0]!.cooldowns[id] = ctx.state.turn + 1 },
      (ctx: Ctx, id: string) => { grant(ctx, id, { uses: 1 }); ctx.state.units[0]!.usesLeft[id] = 0 },
      (ctx: Ctx) => { const id = Object.keys(ctx.statuses).find(id => ctx.statuses[id]!.blocksAction)!; applyStatus(ctx, 0, id, 1, 'test') },
    ]) { const ctx = fixture(), id = attack(ctx); alter(ctx, id); rejected(ctx, action(ctx, { actionId: id, target: 1 })) }
  })

  it('uses trusted UIDs and positive generic aiControlled statuses for controller arbitration', () => {
    const ctx = fixture()
    expect(controllerOf(ctx, 0, policy)).toBe('human')
    expect(controllerOf(ctx, 1, policy)).toBe('ai')
    expect(controllerOf(ctx, 0, { humanUnitUids: [0] })).toBe('ai')
    const id = Object.keys(ctx.statuses).find(id => ctx.statuses[id]!.aiControlled)!
    expect(id).toBeTruthy(); applyStatus(ctx, 0, id, 1, 'test')
    expect(controllerOf(ctx, 0, policy)).toBe('ai')
    rejected(ctx, action(ctx, { actionId: attack(ctx), target: 1 }), 'not-human-controlled')
    rejected(ctx, end(ctx), 'not-human-controlled')
    ctx.state.units[0]!.statuses.find(s => s.id === id)!.value = 0
    expect(controllerOf(ctx, 0, policy)).toBe('human')
    // A second data instance proves this is a property reader, not a named-status rule.
    ctx.statuses = { ...ctx.statuses, 'status.test-command-control': { ...ctx.statuses[id]!, id: 'status.test-command-control' } }
    applyStatus(ctx, 0, 'status.test-command-control', 1, 'test')
    expect(controllerOf(ctx, 0, policy)).toBe('ai')
  })

  it('ends once, resumes Surge, and rejects a pre-Surge click', () => {
    const ctx = fixture(); ctx.state.units[0]!.surge = 100
    const old = end(ctx)
    expect(executeBattleCommand(ctx, policy, old)).toEqual({ ok: true })
    rejected(ctx, old, 'not-acting')
    expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
    expect(ctx.battleCursor!.surgeLink).toBe(1)
    rejected(ctx, old, 'stale-sequence')
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: attack(ctx), target: 1 }))).toEqual({ ok: true })
  })

  it('accepts a fresh command after snapshot reload and rejects its predecessor', () => {
    const ctx = fixture(87)
    const old = action(ctx, { actionId: 'power.move', destination: 86 })
    expect(executeBattleCommand(ctx, policy, old)).toEqual({ ok: true })
    const resumed = restoreBattle(saveBattle(ctx), ctx)
    rejected(resumed, old, 'stale-sequence')
    const next = action(resumed, { actionId: attack(resumed), target: 1 })
    expect(executeBattleCommand(ctx, policy, next)).toEqual({ ok: true })
    expect(executeBattleCommand(resumed, policy, next)).toEqual({ ok: true })
    expect(saveBattle(resumed)).toBe(saveBattle(ctx))
  })

  it('rejects complete/unstarted sessions and accepts the implemented any slot policy', () => {
    const unstarted = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    rejected(unstarted, end(unstarted), 'not-acting')
    const ctx = fixture(); ctx.state.outcome = 'heroClear'
    rejected(ctx, end(ctx), 'battle-complete')
    ctx.state.outcome = null; ctx.cfg.switches.actionSlots = 'any'
    // capability.authored-slots replaces the explicit not-yet-built rejection.
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: attack(ctx), target: 1 }))).toEqual({ ok: true })
    expect(ctx.state.units[0]!.moveUsed).toBe(true)
    expect(ctx.state.units[0]!.primaryUsed).toBe(false)
  })

  it('keeps the internal validated action path usable without a session cursor', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    beginActivation(ctx, 0, 'test')
    const request = { actor: 0, actionId: attack(ctx), target: 1 }
    expect(validateAction(ctx, request)).toEqual({ ok: true })
    expect(executeAction(ctx, request)).toEqual({ ok: true })
    expect(ctx.state.units[0]!.primaryUsed).toBe(true)
    expect(ctx.battleCursor).toBeUndefined()
  })

  it.each(['attack', 'power'])('a winning %s closes its cycle and advances to complete', kind => {
    const ctx = fixture(); ctx.state.units[1]!.hp = 1
    let id = attack(ctx)
    if (kind === 'power') {
      id = 'power.test-command-damage'
      ctx.actions = { ...ctx.actions, [id]: { id, name: 'Finishing fixture', staminaCost: 0, cooldown: 0, range: 1, target: { select: 'unit', side: 'enemy' }, effects: [{ kind: 'statDamage', stat: 'strength', bonus: 0, damageType: 'physical' }] } }   // Law 10, fix.one-effect-vocabulary (2026-10-01): the fixture power is an effects list — the legacy power shape it used is retired; same power, same assertions.
      grant(ctx, id)
    }
    const direct = fullFork(ctx)
    if (kind === 'attack') performAttack(direct, 0, 1, id)
    else usePower(direct, 0, 1, id)
    settle(direct, id); completeActionCycle(direct)
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: id, target: 1 }))).toEqual({ ok: true })
    expect(ctx.state.outcome).toBe('heroClear')
    expect(advanceBattle(ctx).kind).toBe('complete')
    expect(saveBattle(ctx)).toBe(saveBattle(direct))
    rejected(ctx, end(ctx), 'battle-complete')
  })

  it('a lethal reaction during movement closes the cycle without leaving a stranded human actor', () => {
    const ctx = fixture()
    const hero = ctx.state.units[0]!, enemy = ctx.state.units[1]!
    hero.hp = 1; hero.toughness = -100; hero.triggers = []
    enemy.accuracy = 100; enemy.triggers = []
    const direct = fullFork(ctx), power = ctx.actions['power.move']! as MoveDef
    executeMove(direct, 0, pathTo(reachable(direct, direct.state.units[0]!), 85, 84), power)
    completeActionCycle(direct)
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: power.id, destination: 84 }))).toEqual({ ok: true })
    expect(hero.lifeState).not.toBe('standing')
    expect(ctx.events.some(e => e.type === 'aoo.provoked')).toBe(true)
    expect(ctx.battleCursor!.at).not.toBe('acting')
    expect(saveBattle(ctx)).toBe(saveBattle(direct))
    expect(advanceBattle(ctx).kind).toBe('complete')
  })

  it('rejects accessor fields without evaluating them', () => {
    const ctx = fixture()
    const request = action(ctx, { actionId: attack(ctx), target: 1 })
    Object.defineProperty(request, 'target', { get() { throw new Error('getter must not execute') } })
    rejected(ctx, request, 'malformed-command')
  })

  it.each(['power.move', 'power.sidestep', 'power.flight-swift'])('Root acquired during the action cycle blocks %s displacement', id => {
    const ctx = fixture(150); grant(ctx, id)
    const root = Object.keys(ctx.statuses).find(id => ctx.statuses[id]!.blocksMovement)!
    applyStatus(ctx, 0, root, 1, 'test')
    // Existing activation points are positive: checking only the budget misses this.
    expect(ctx.state.units[0]!.movePointsLeft).toBeGreaterThan(0)
    rejected(ctx, action(ctx, { actionId: id, destination: 86 }), 'actor-rooted')
    expect(validateAction(ctx, { actor: 0, actionId: id, destination: 86 })).toEqual({ ok: false, reason: 'actor-rooted' })
  })

  it('Root does not block a zero-step movement rider', () => {
    const ctx = fixture(150)
    grant(ctx, 'power.sidestep', { move: { shape: 'sidestep', budgetMod: 0, stepRange: 0 } })
    const root = Object.keys(ctx.statuses).find(id => ctx.statuses[id]!.blocksMovement)!
    applyStatus(ctx, 0, root, 1, 'test')
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: 'power.sidestep', destination: 85 }))).toEqual({ ok: true })
    expect(ctx.state.units[0]!.hex).toBe(85)
  })

  it.each(['attack', 'power'])('forced targeting restricts hostile %s commands to the living grantor', kind => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }, { type: 'test-zombie', hex: 84 }], { strict: true })
    for (const u of ctx.state.units.slice(1)) u.hp = u.maxHp = 1000
    advanceBattle(ctx)
    let id = attack(ctx)
    if (kind === 'power') {
      id = 'power.test-command-target'
      ctx.actions = { ...ctx.actions, [id]: { id, name: 'Target fixture', staminaCost: 0, cooldown: 0, range: 1, target: { select: 'unit', side: 'enemy' }, effects: [{ kind: 'statDamage', stat: 'strength', bonus: 0, damageType: 'physical' }] } }   // Law 10, fix.one-effect-vocabulary (2026-10-01): the fixture power is an effects list — the legacy power shape it used is retired; same power, same assertions.
      grant(ctx, id)
    }
    const taunt = Object.keys(ctx.statuses).find(id => ctx.statuses[id]!.forcesTarget)!
    applyStatus(ctx, 0, taunt, 1, 'test', 1)
    rejected(ctx, action(ctx, { actionId: id, target: 2 }), 'forced-target')
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: id, target: 1 }))).toEqual({ ok: true })
  })

  it('forced targeting permits self powers and expires when its grantor no longer stands', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }, { type: 'test-zombie', hex: 84 }])
    advanceBattle(ctx)
    const taunt = Object.keys(ctx.statuses).find(id => ctx.statuses[id]!.forcesTarget)!
    applyStatus(ctx, 0, taunt, 1, 'test', 1)
    const id = 'power.test-command-self'
    ctx.actions = { ...ctx.actions, [id]: { id, name: 'Self fixture', staminaCost: 0, cooldown: 0, range: 0, free: true, target: { select: 'unit', side: 'ally' }, effects: [{ kind: 'heal', amount: 1 }] } }   // Law 10, fix.one-effect-vocabulary (2026-10-01): the fixture power is an effects list — the legacy power shape it used is retired; same power, same assertions.
    grant(ctx, id)
    expect(executeBattleCommand(ctx, policy, action(ctx, { actionId: id, target: 0 }))).toEqual({ ok: true })
    ctx.state.units[1]!.lifeState = 'downed'
    expect(validateBattleCommand(ctx, policy, action(ctx, { actionId: attack(ctx), target: 2 }))).toEqual({ ok: true })
  })
})
