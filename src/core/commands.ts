// The session boundary owns whose input is accepted. Resolution stays in the
// same attack, power and movement functions used by automatic battles.
import type { Ctx, MoveDef } from './types.js'
import { actionReady, isAttack, isMove } from './action.js'
import { canAttack, performAttack } from './pipeline.js'
import { canUsePower, usePower } from './ability.js'
import { executeFlight, executeMove, executeSidestep, flightLandings, occupancy, pathTo, reachable, stepRangeOf } from './movement.js'
import { isPassable } from '../content/maps.js'
import { forcedTargetOf, isBlocked, isRooted } from './status.js'
import { settle } from './settle.js'
import { completeActionCycle } from './battle.js'

/** Trusted host configuration, supplied separately from client command data. */
export type ControlPolicy = { readonly humanUnitUids: readonly number[] }
export type ActionRequest = { actor: number; actionId: string } & ({ target: number } | { destination: number })
export type BattleCommand = (ActionRequest & { kind: 'action'; expectedSeq: number }) | { kind: 'end-cycle'; actor: number; expectedSeq: number }
export type CommandResult = { ok: true } | { ok: false; reason: string }
type Rejection = Extract<CommandResult, { ok: false }>
type Plan = { kind: 'attack'; actor: number; actionId: string; target: number }
  | { kind: 'power'; actor: number; actionId: string; target: number }
  | { kind: 'move'; actor: number; power: MoveDef; destination: number; path: number[] }
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

/** Allegiance/rules side never decides ownership; a positive status can override it. */
export function controllerOf(ctx: Ctx, actor: number, policy: ControlPolicy): 'human' | 'ai' {
  const u = ctx.state.units[actor]
  if (!u) throw new Error(`unknown controller actor ${actor}`)
  if (u.statuses.some(s => s.value > 0 && ctx.statuses[s.id]?.aiControlled)) return 'ai'
  return policy.humanUnitUids.includes(u.uid) ? 'human' : 'ai'
}

function planAction(ctx: Ctx, request: unknown): Plan | Rejection {
  if (!record(request)) return reject('malformed-action')
  const aimed = Object.hasOwn(request, 'target')
  if (!keys(request, ['actor', 'actionId', aimed ? 'target' : 'destination'])) return reject('malformed-action')
  const { actor, actionId } = request
  if (!integer(actor) || !ctx.state.units[actor] || typeof actionId !== 'string') return reject('malformed-action')
  const u = ctx.state.units[actor]
  if (ctx.state.outcome) return reject('battle-complete')
  if (ctx.cfg.switches.actionSlots !== 'byProfile') return reject('unsupported-action-slots')
  if (u.lifeState !== 'standing' || isBlocked(ctx, u)) return reject('actor-cannot-act')
  const a = Object.hasOwn(ctx.actions, actionId) ? ctx.actions[actionId] : undefined
  if (!a || !actionReady(ctx, u, a)) return reject('action-not-ready')
  if (isMove(a)) {
    if (aimed || !integer(request.destination) || request.destination >= ctx.state.terrain.length) return reject('malformed-destination')
    if ((!a.free && u.moveUsed) || u.primaryUsed) return reject('movement-slot-closed')
    const destination = request.destination
    const plan: Plan = { kind: 'move', actor, power: a, destination, path: [] }
    if (a.move.shape === 'sidestep' && stepRangeOf(a) === 0) {
      return destination === u.hex ? plan : reject('unreachable-destination')
    }
    if (isRooted(ctx, u)) return reject('actor-rooted')
    if (!isPassable(ctx.state.terrain[destination]!) || occupancy(ctx).has(destination)) return reject('unreachable-destination')
    if (a.move.shape === 'sidestep') return ctx.geo.distance(u.hex, destination) === stepRangeOf(a) ? plan : reject('unreachable-destination')
    if (a.move.shape === 'flight') return flightLandings(ctx, u, a).includes(destination) ? plan : reject('unreachable-destination')
    if (a.move.shape !== 'path') return reject('unsupported-movement-shape')
    // Legacy executeMove consumes raw points; positive path modifiers currently
    // widen reachable() without giving the executor those points. Constrain this
    // neutral boundary to executable paths until that separate correction lands.
    const reach = reachable(ctx, u, Math.min(0, a.move.budgetMod))
    if (!reach.has(destination)) return reject('unreachable-destination')
    plan.path = pathTo(reach, u.hex, destination)
    // Impassability is categorical, including budgets above its sentinel cost.
    if (plan.path.some(hex => !isPassable(ctx.state.terrain[hex]!))) return reject('unreachable-destination')
    return plan
  }
  if (!aimed || !integer(request.target) || !ctx.state.units[request.target]) return reject('malformed-target')
  const target = request.target
  const forced = forcedTargetOf(ctx, u)
  if (ctx.state.units[target]!.side !== u.side && forced !== null && target !== forced) return reject('forced-target')
  if (isAttack(a)) return canAttack(ctx, actor, target, actionId) ? { kind: 'attack', actor, target, actionId } : reject('illegal-target-or-action')
  return canUsePower(ctx, actor, target, actionId) ? { kind: 'power', actor, target, actionId } : reject('illegal-target-or-action')
}

/** Pure legality for internal callers. No cursor or controller policy is required. */
export function validateAction(ctx: Ctx, request: unknown): CommandResult {
  const plan = planAction(ctx, request)
  return 'ok' in plan ? plan : { ok: true }
}
function resolvePlan(ctx: Ctx, plan: Plan): void {
  if (plan.kind === 'attack') { performAttack(ctx, plan.actor, plan.target, plan.actionId); settle(ctx, plan.actionId) }
  else if (plan.kind === 'power') { usePower(ctx, plan.actor, plan.target, plan.actionId); settle(ctx, plan.actionId) }
  else if (plan.power.move.shape === 'path') executeMove(ctx, plan.actor, plan.path, plan.power)
  else if (plan.power.move.shape === 'sidestep') executeSidestep(ctx, plan.actor, plan.destination, plan.power)
  else executeFlight(ctx, plan.actor, plan.destination, plan.power)
}
/** Revalidates immediately before resolution. Rejections emit nothing and draw nothing. */
export function executeAction(ctx: Ctx, request: unknown): CommandResult {
  const plan = planAction(ctx, request)
  if ('ok' in plan) return plan
  resolvePlan(ctx, plan)
  return { ok: true }
}

type SessionPlan = Plan | { kind: 'end-cycle'; actor: number }
function planCommand(ctx: Ctx, policy: ControlPolicy, command: unknown): SessionPlan | Rejection {
  if (!record(command)) return reject('malformed-command')
  // Reject accessors before reading input, as well as unknown command fields.
  const descriptors = Object.getOwnPropertyDescriptors(command)
  if (Reflect.ownKeys(descriptors).some(k => typeof k !== 'string' || !('value' in descriptors[k]!))) return reject('malformed-command')
  const { kind, actor, expectedSeq } = command
  if (kind !== 'action' && kind !== 'end-cycle') return reject('malformed-command')
  const fields = kind === 'end-cycle' ? ['kind', 'actor', 'expectedSeq'] : ['kind', 'actor', 'expectedSeq', 'actionId', Object.hasOwn(command, 'target') ? 'target' : 'destination']
  if (!keys(command, fields) || !integer(actor) || !ctx.state.units[actor] || !integer(expectedSeq)) return reject('malformed-command')
  if (ctx.state.outcome) return reject('battle-complete')
  if (ctx.battleCursor?.at !== 'acting') return reject('not-acting')
  if (ctx.battleCursor.actor !== actor) return reject('not-current-actor')
  if (expectedSeq !== ctx.state.seq) return reject('stale-sequence')
  if (controllerOf(ctx, actor, policy) !== 'human') return reject('not-human-controlled')
  if (ctx.cfg.switches.actionSlots !== 'byProfile') return reject('unsupported-action-slots')
  if (kind === 'end-cycle') return { kind, actor }
  return planAction(ctx, { actor, actionId: command.actionId, ...(Object.hasOwn(command, 'target') ? { target: command.target } : { destination: command.destination }) })
}

/** A public UI may ask legality, then use pipeline previews for numbers; no future roll is exposed. */
export function validateBattleCommand(ctx: Ctx, policy: ControlPolicy, command: unknown): CommandResult {
  const plan = planCommand(ctx, policy, command)
  return 'ok' in plan ? plan : { ok: true }
}
export function executeBattleCommand(ctx: Ctx, policy: ControlPolicy, command: unknown): CommandResult {
  const plan = planCommand(ctx, policy, command)
  if ('ok' in plan) return plan
  if (plan.kind === 'end-cycle') completeActionCycle(ctx)
  else {
    resolvePlan(ctx, plan)
    // Winning or falling to a reaction leaves no further human action to ask
    // for. Close the cycle now so advanceBattle can finish its lifecycle.
    if (ctx.state.outcome || ctx.state.units[plan.actor]!.lifeState !== 'standing') completeActionCycle(ctx)
  }
  return { ok: true }
}
