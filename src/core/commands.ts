// The session boundary owns whose input is accepted. Resolution stays in the
// same attack, power and movement functions used by automatic battles.
import type { Ctx } from './types.js'
import { actionReady, isAttack, isBurst, isMove, resolveActionSlot } from './action.js'
import { canAttack, performAttack } from './pipeline.js'
import { canUseBurst, useBurst } from './burst.js'
import { canUsePower, usePower } from './ability.js'
import { executeFlight, executeMove, executeSidestep, planMovement, type MovementPlan } from './movement.js'
import { forcedTargetOf, isBlocked } from './status.js'
import { settle } from './settle.js'
import { completeActionCycle } from './battle.js'
import { activationChoices, controllerOf, type ControlPolicy } from './control.js'
import { selectActivation } from './mutate.js'
import { isUnitUid } from './identity.js'
import { canSwap, performSwap } from './swap.js'
import { attackProp, canAttackHex } from './prop-attack.js'
export { activationChoices, controllerOf, type ControlPolicy } from './control.js'

/** Shared action input; session ownership is supplied separately from client data. */
export type ActionRequest = { actor: number; actionId: string; slot?: import('./types.js').ActionSlot } & ({ target: number } | { destination: number } | { centre: number }
  /** v2.prop-attack (COMBAT-V2 §12.2): an attack with Destroy aimed at a hex holding a prop. */
  | { hex: number })
export type BattleCommand = { kind: 'select-activation'; unitUid: number; expectedSeq: number } | (ActionRequest & { kind: 'action'; expectedSeq: number }) | { kind: 'end-cycle'; actor: number; expectedSeq: number }
  /** v2.swap (COMBAT-V2 §11.2): hold these instances; everything else carried is stowed. */
  | { kind: 'swap'; actor: number; hands: string[]; expectedSeq: number }
export type CommandResult = { ok: true } | { ok: false; reason: string }
type Rejection = Extract<CommandResult, { ok: false }>
type Plan = { kind: 'attack'; actor: number; actionId: string; target: number; slot: import('./types.js').ActionSlot }
  | { kind: 'power'; actor: number; actionId: string; target: number; slot: import('./types.js').ActionSlot }
  | { kind: 'burst'; actor: number; actionId: string; centre: number; slot: import('./types.js').ActionSlot }
  | { kind: 'prop-attack'; actor: number; actionId: string; hex: number; slot: import('./types.js').ActionSlot }
  | MovementPlan
const reject = (reason: string): Rejection => ({ ok: false, reason })
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
function record(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
}
function keys(v: Record<string, unknown>, expected: string[]): boolean {
  const own = Reflect.ownKeys(v)
  return own.length === expected.length && expected.every(k => Object.getOwnPropertyDescriptor(v, k)?.value !== undefined)
    && own.every(k => typeof k === 'string' && expected.includes(k))
}

function planAction(ctx: Ctx, request: unknown): Plan | Rejection {
  if (!record(request)) return reject('malformed-action')
  const aimed = Object.hasOwn(request, 'target')
  const centred = Object.hasOwn(request, 'centre')
  const hexed = Object.hasOwn(request, 'hex')
  if (!keys(request, ['actor', 'actionId', centred ? 'centre' : aimed ? 'target' : hexed ? 'hex' : 'destination', ...(Object.hasOwn(request, 'slot') ? ['slot'] : [])])) return reject('malformed-action')
  if (request.slot !== undefined && request.slot !== 'movement' && request.slot !== 'primary') return reject('malformed-action')
  const { actor, actionId } = request
  if (!integer(actor) || !ctx.state.units[actor] || typeof actionId !== 'string') return reject('malformed-action')
  const u = ctx.state.units[actor]
  if (ctx.state.outcome) return reject('battle-complete')
  if (u.lifeState !== 'standing' || isBlocked(ctx, u)) return reject('actor-cannot-act')
  const a = Object.hasOwn(ctx.actions, actionId) ? ctx.actions[actionId] : undefined
  if (!a || !actionReady(ctx, u, a)) return reject('action-not-ready')
  const slot = resolveActionSlot(ctx, u, a, request.slot)
  if (slot === null) return reject('action-slot-closed')
  if (isBurst(a)) {
    if (!centred || !integer(request.centre)) return reject('malformed-centre')
    return canUseBurst(ctx, actor, request.centre, actionId, slot) ? { kind: 'burst', actor, centre: request.centre, actionId, slot } : reject('illegal-centre-or-action')
  }
  if (centred) return reject('malformed-target')
  if (hexed) {
    if (!isAttack(a) || !integer(request.hex) || request.hex >= ctx.state.terrain.length) return reject('malformed-hex')
    if (forcedTargetOf(ctx, u) !== null) return reject('forced-target')
    return canAttackHex(ctx, actor, request.hex, actionId, slot) ? { kind: 'prop-attack', actor, hex: request.hex, actionId, slot } : reject('illegal-hex-or-action')
  }
  if (isMove(a)) {
    if (aimed || !integer(request.destination) || request.destination >= ctx.state.terrain.length) return reject('malformed-destination')
    return planMovement(ctx, actor, actionId, request.destination, slot)
  }
  if (!aimed || !integer(request.target) || !ctx.state.units[request.target]) return reject('malformed-target')
  const target = request.target
  const forced = forcedTargetOf(ctx, u)
  if (ctx.state.units[target]!.side !== u.side && forced !== null && target !== forced) return reject('forced-target')
  if (isAttack(a)) return canAttack(ctx, actor, target, actionId, slot) ? { kind: 'attack', actor, target, actionId, slot } : reject('illegal-target-or-action')
  return canUsePower(ctx, actor, target, actionId, slot) ? { kind: 'power', actor, target, actionId, slot } : reject('illegal-target-or-action')
}

/** Pure legality for internal callers. No cursor or controller policy is required. */
export function validateAction(ctx: Ctx, request: unknown): CommandResult {
  const plan = planAction(ctx, request)
  return 'ok' in plan ? plan : { ok: true }
}
function resolvePlan(ctx: Ctx, plan: Plan): void {
  if (plan.kind === 'burst') useBurst(ctx, plan.actor, plan.centre, plan.actionId, plan.slot)
  else if (plan.kind === 'prop-attack') { attackProp(ctx, plan.actor, plan.hex, plan.actionId, plan.slot); settle(ctx, plan.actionId) }
  else if (plan.kind === 'attack') { performAttack(ctx, plan.actor, plan.target, plan.actionId, plan.slot); settle(ctx, plan.actionId) }
  else if (plan.kind === 'power') { usePower(ctx, plan.actor, plan.target, plan.actionId, plan.slot); settle(ctx, plan.actionId) }
  else if (plan.power.move.shape === 'path') executeMove(ctx, plan.actor, plan.path, plan.power, undefined, plan.slot)
  else if (plan.power.move.shape === 'sidestep') executeSidestep(ctx, plan.actor, plan.destination, plan.power, plan.slot)
  else executeFlight(ctx, plan.actor, plan.destination, plan.power, plan.slot)
}
/** Revalidates immediately before resolution. Rejections emit nothing and draw nothing. */
export function executeAction(ctx: Ctx, request: unknown): CommandResult {
  const plan = planAction(ctx, request)
  if ('ok' in plan) return plan
  resolvePlan(ctx, plan)
  return { ok: true }
}

type SessionPlan = Plan | { kind: 'select-activation'; actor: number } | { kind: 'end-cycle'; actor: number } | { kind: 'swap'; actor: number; hands: string[] }
function planCommand(ctx: Ctx, policy: ControlPolicy, command: unknown): SessionPlan | Rejection {
  if (!record(command)) return reject('malformed-command')
  // Reject accessors before reading input, as well as unknown command fields.
  const descriptors = Object.getOwnPropertyDescriptors(command)
  if (Reflect.ownKeys(descriptors).some(k => typeof k !== 'string' || !('value' in descriptors[k]!))) return reject('malformed-command')
  const { kind, actor, expectedSeq } = command
  if (kind === 'select-activation') {
    if (!keys(command, ['kind','unitUid','expectedSeq']) || !isUnitUid(command.unitUid) || !integer(expectedSeq)) return reject('malformed-command')
    if (ctx.state.outcome) return reject('battle-complete')
    if (expectedSeq !== ctx.state.seq) return reject('stale-sequence')
    if (!activationChoices(ctx,policy).includes(command.unitUid)) return reject('activation-not-selectable')
    return {kind,actor:ctx.state.units.find(u=>u.uid===command.unitUid)!.id}
  }
  if (kind !== 'action' && kind !== 'end-cycle' && kind !== 'swap') return reject('malformed-command')
  const fields = kind === 'end-cycle' ? ['kind', 'actor', 'expectedSeq'] : kind === 'swap' ? ['kind', 'actor', 'expectedSeq', 'hands'] : ['kind', 'actor', 'expectedSeq', 'actionId', Object.hasOwn(command, 'centre') ? 'centre' : Object.hasOwn(command, 'target') ? 'target' : Object.hasOwn(command, 'hex') ? 'hex' : 'destination']
  if (kind === 'action' && Object.hasOwn(command, 'slot')) fields.push('slot')
  if (!keys(command, fields) || !integer(actor) || !ctx.state.units[actor] || !integer(expectedSeq)) return reject('malformed-command')
  if (ctx.state.outcome) return reject('battle-complete')
  if (ctx.battleCursor?.at !== 'acting') return reject('not-acting')
  if (ctx.battleCursor.actor !== actor) return reject('not-current-actor')
  if (expectedSeq !== ctx.state.seq) return reject('stale-sequence')
  if (controllerOf(ctx, actor, policy) !== 'human') return reject('not-human-controlled')
  if (kind === 'end-cycle') return { kind, actor }
  if (kind === 'swap') {
    const hands = command.hands
    if (!Array.isArray(hands) || Object.getPrototypeOf(hands) !== Array.prototype || hands.some((h) => typeof h !== 'string')) return reject('malformed-command')
    const why = canSwap(ctx, actor, hands)
    return why ? reject(`illegal-swap: ${why}`) : { kind, actor, hands: [...hands] }
  }
  return planAction(ctx, { actor, actionId: command.actionId, ...(Object.hasOwn(command, 'centre') ? { centre: command.centre } : Object.hasOwn(command, 'target') ? { target: command.target } : Object.hasOwn(command, 'hex') ? { hex: command.hex } : { destination: command.destination }), ...(Object.hasOwn(command, 'slot') ? { slot: command.slot } : {}) })
}

/** A public UI may ask legality, then use pipeline previews for numbers; no future roll is exposed. */
export function validateBattleCommand(ctx: Ctx, policy: ControlPolicy, command: unknown): CommandResult {
  const plan = planCommand(ctx, policy, command)
  return 'ok' in plan ? plan : { ok: true }
}
export function executeBattleCommand(ctx: Ctx, policy: ControlPolicy, command: unknown): CommandResult {
  const plan = planCommand(ctx, policy, command)
  if ('ok' in plan) return plan
  if (plan.kind === 'select-activation') selectActivation(ctx,plan.actor,'engine')
  else if (plan.kind === 'end-cycle') completeActionCycle(ctx)
  else if (plan.kind === 'swap') performSwap(ctx, plan.actor, plan.hands)
  else {
    resolvePlan(ctx, plan)
    // A paid primary, victory or falling leaves no further human action.
    // The driver closes the cycle so advanceBattle can finish its lifecycle.
    if (ctx.state.outcome || ctx.state.units[plan.actor]!.lifeState !== 'standing' || ctx.state.units[plan.actor]!.primaryUsed) completeActionCycle(ctx)
  }
  return { ok: true }
}
