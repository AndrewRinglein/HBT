import { lowEdgeCost, preparedLowEdgeCost } from './cover.js'
// Movement. Reachability by flood fill, then the path is walked ONE STEP AT A TIME
// (COMBAT-SEQUENCE.md) so that anything which happens mid-move — attacks of
// opportunity, traps, terrain status — has a place to happen and can interrupt.

import type { HexId } from './hex.js'
import type { AttackDef, Ctx, MoveDef, Unit } from './types.js'
import { moveCostOf, terrainIdOf } from '../content/maps.js'
import { blockingPropAt, passableHexes, type Passable } from './props.js'
import { flatDamage } from './mitigation.js'
import { addStatMod, applyCollisionDamage, emit, gainStamina, knockUnit, layerAt, loseMaxStamina, markWalked, moveUnit, standUp, unit } from './mutate.js'
import { actionReady, closedByWalk, refusedProne, resolveActionSlot, isMove, movesOf, spendAction, staminaCostOf, walkOf } from './action.js'
import { forcedTargetOf, hiddenFrom, incomingAbsorb, isBlocked, isProne, isRooted, spendAbsorb } from './status.js'
import { FREE_ATTACK_STATS, performAttack, preview, type FreeAttackKind } from './pipeline.js'
import { effective } from './stats.js'
import { freeAttackChoice } from './free-attack.js'
import { knockImmunity } from './kdb.js'
import { thornsOf } from './thorns.js'
import { applyEffect } from './trigger.js'
import { settle } from './settle.js'
import { enterGround } from './ground.js'
import { anyStructure, passableFor, structureAt, structureStepCost } from './structure.js'

// MOVE_STAMINA_COST is gone (2026-08-21) — Angela: "It shouldn't be
// hard-coded. It should be content-driven." The cost of moving is a field on
// the CHOSEN movement power (ctx.moves), and which powers a unit may choose
// from is unit data (unit.moves). Core reads rows; it names none.

/**
 * What this unit pays to use a movement power. Stamina is the HERO throttle
 * (GAME-DESIGN §Stamina); the enemy side does not run it — Angela 2026-08-21:
 * "I don't know if we want to follow the same model on the enemy side, since
 * we don't have stamina." A unit with no stamina pool pays nothing and can
 * never be refused for lack of it. A stat read, not a content name.
 */
/** Kept as a name the tests know; the one rule is action.ts staminaCostOf. */
export function moveStaminaCost(u: Unit, power: MoveDef): number {
  return staminaCostOf(u, power)
}

/**
 * The movement powers this unit can use right now, in the unit's declared
 * preference order: granted, affordable, and off cooldown. A granted id whose
 * row is missing from the registry is skipped — indistinguishable from the
 * content never having been authored (the kill-switch seam relies on exactly
 * this).
 */
export function usableMoves(ctx: Ctx, u: Unit): MoveDef[] {
  // refactor.one-action-type: the movements are a view over the unit's one
  // list, and THE ONE LIMITS CHECK (stamina, cooldown/warmup, uses) gates them
  return movesOf(ctx, u).filter((m) => actionReady(ctx, u, m))
}

/** First affordable granted power of a shape, or null. Order is the unit's data (Law 6: no re-sorting). */
export function movePowerOf(ctx: Ctx, u: Unit, shape: MoveDef['move']['shape']): MoveDef | null {
  for (const m of usableMoves(ctx, u)) if (m.move.shape === shape) return m
  return null
}

/** Standing and downed bodies both occupy their hex; the dead do not. */
export function occupancy(ctx: Ctx): Map<HexId, number> {
  const m = new Map<HexId, number>()
  for (const u of ctx.state.units) if (u.lifeState !== 'dead') m.set(u.hex, u.id)
  return m
}

export type Reach = Map<HexId, { cost: number; prev: HexId }>

/** Movement points to enter a given hex on this board. */
export function stepCost(ctx: Ctx, to: HexId, from?: HexId): number {
  // v2.structures: a wall's stairs cost 1 extra (structureStepCost)
  return moveCostOf(ctx.state.terrain[to] ?? 0) + (from===undefined?0:lowEdgeCost(ctx,from,to)+structureStepCost(ctx,from,to))
}

/**
 * Every hex this unit can reach, with the cheapest path to each.
 * Dijkstra over integer movement points — hills cost 2, open ground 1.
 * Ties break on lower HexId so paths are reproducible (Law 6).
 */
export function reachable(ctx: Ctx, u: Unit, budgetMod = 0): Reach {
  const props=ctx.state.props,passable=passableFor(ctx,u,props),edgeCost=preparedLowEdgeCost(ctx,props),structured=anyStructure(ctx)
  const occ = occupancy(ctx)
  // The power's modifier widens or narrows THIS move's budget (Sprint would be
  // +3); the activation budget itself was set at beginActivation (Slow reads
  // there, once — SWITCHES.md slowReadAtActivationStart).
  const budget = Math.max(0, u.movePointsLeft + budgetMod)
  const out: Reach = new Map()
  out.set(u.hex, { cost: 0, prev: u.hex })
  // Bucket queue: costs are small integers, so this is exact and order-stable.
  const buckets: HexId[][] = Array.from({ length: budget + 1 }, () => [])
  buckets[0]!.push(u.hex)

  for (let c = 0; c <= budget; c++) {
    const bucket = buckets[c]!
    bucket.sort((a, b) => a - b)
    for (const h of bucket) {
      const node = out.get(h)!
      if (node.cost !== c) continue // stale entry, a cheaper path was found
      for (const n of ctx.geo.neighboursOf(h)) {
        if (occ.has(n) || !passable(n,h)) continue
        const nc = c + moveCostOf(ctx.state.terrain[n] ?? 0) + edgeCost(h,n) + (structured ? structureStepCost(ctx,h,n) : 0)
        if (nc > budget) continue
        const prior = out.get(n)
        if (!prior || nc < prior.cost) {
          out.set(n, { cost: nc, prev: h })
          buckets[nc]!.push(n)
        }
      }
    }
  }
  out.delete(u.hex)
  return out
}

export function pathTo(reach: Reach, from: HexId, dest: HexId): HexId[] {
  const path: HexId[] = []
  let cur = dest
  let guard = 0
  while (cur !== from) {
    path.push(cur)
    const node = reach.get(cur)
    if (!node) throw new Error(`no path to ${dest}`)
    cur = node.prev
    if (++guard > 1000) throw new Error('path reconstruction ran away')
  }
  return path.reverse()
}

export type StepHook = (ctx: Ctx, unitId: number, entered: HexId) => boolean

export type MovementPlan = { kind: 'move'; actor: number; power: MoveDef; destination: number; path: number[]; /** Movement points for this path; zero for non-path shapes. */ pathCost: number; slot: import('./types.js').ActionSlot }
type MovementRejection = { ok: false; reason: string }
const refused = (reason: string): MovementRejection => ({ ok: false, reason })

function movementReason(ctx: Ctx, u: Unit, power: MoveDef, slot?: import('./types.js').ActionSlot): string | null {
  if (ctx.state.outcome) return 'battle-complete'
  if (u.lifeState !== 'standing' || isBlocked(ctx, u)) return 'actor-cannot-act'
  if (refusedProne(ctx, u, power)) return 'actor-prone'   // rule.prone-only-stand-up: knocked down — only its stand
  if (!actionReady(ctx, u, power)) return 'action-not-ready'
  if (resolveActionSlot(ctx, u, power, slot) === null) return 'movement-slot-closed'
  // rule.walked-unit-has-moved (2026-10-04): a unit that has walked takes no OTHER movement this action cycle — the same
  // refusal a spent movement slot gives, because that is what it is: its move is done (the rest of the walk is not closed).
  // rule.prone-only-stand-up (2026-10-05): and a unit that has stood up takes no movement at all — standing was its move
  if (closedByWalk(ctx, u, power)) return 'movement-slot-closed'
  return null
}

/** One pure destination planner for controls and AI; never spends or predicts RNG. */
export function planMovement(ctx: Ctx, actor: number, actionId: string, destination: number, slot?: import('./types.js').ActionSlot): MovementPlan | MovementRejection {
  return planMovementWithView(ctx, actor, actionId, destination, passableFor(ctx, ctx.state.units[actor]), slot)
}
function planMovementWithView(ctx: Ctx, actor: number, actionId: string, destination: number, passable: Passable, slot?: import('./types.js').ActionSlot): MovementPlan | MovementRejection {
  const u = ctx.state.units[actor]
  const power = ctx.actions[actionId]
  if (!u || !Number.isSafeInteger(actor) || !power || !isMove(power)) return refused('action-not-ready')
  const reason = movementReason(ctx, u, power, slot)
  if (reason) return refused(reason)
  if (!Number.isSafeInteger(destination) || destination < 0 || destination >= ctx.state.terrain.length) return refused('malformed-destination')
  const plan: MovementPlan = { kind: 'move', actor, power, destination, path: [], pathCost: 0, slot: resolveActionSlot(ctx, u, power, slot)! }
  if (power.move.shape === 'sidestep' && stepRangeOf(power) === 0) return destination === u.hex ? plan : refused('unreachable-destination')
  if (isRooted(ctx, u)) return refused('actor-rooted')
  if (!passable(destination) || occupancy(ctx).has(destination)) return refused('unreachable-destination')
  if (power.move.shape === 'sidestep') return ctx.geo.distance(u.hex, destination) === stepRangeOf(power) && passable(destination,u.hex) ? plan : refused('unreachable-destination')
  if (power.move.shape === 'flight') return flightLandings(ctx, u, power).includes(destination) ? plan : refused('unreachable-destination')
  const reach = reachable(ctx, u, power.move.budgetMod)
  if (!reach.has(destination)) return refused('unreachable-destination')
  plan.path = pathTo(reach, u.hex, destination)
  plan.pathCost = reach.get(destination)!.cost
  return plan
}

/** Stable destination order. Callers keep their own scoring and tie breakers. */
export function movementOptions(ctx: Ctx, actor: number, actionId: string, slot?: import('./types.js').ActionSlot): MovementPlan[] {
  const u = ctx.state.units[actor], power = ctx.actions[actionId]
  if (!u || !power || !isMove(power) || movementReason(ctx, u, power, slot)) return []
  if (power.move.shape === 'sidestep' && stepRangeOf(power) === 0) return [{ kind: 'move', actor, power, destination: u.hex, path: [], pathCost: 0, slot: resolveActionSlot(ctx, u, power, slot)! }]
  if (isRooted(ctx, u)) return []
  if (power.move.shape === 'path') {
    const reach = reachable(ctx, u, power.move.budgetMod)
    return [...reach.keys()].sort((a, b) => a - b).map(destination => ({ kind: 'move', actor, power, destination, path: pathTo(reach, u.hex, destination), pathCost: reach.get(destination)!.cost, slot: resolveActionSlot(ctx, u, power, slot)! }))
  }
  if (power.move.shape === 'flight') return flightLandings(ctx, u, power).map(destination => ({ kind: 'move', actor, power, destination, path: [], pathCost: 0, slot: resolveActionSlot(ctx, u, power, slot)! }))
  const out: MovementPlan[] = []
  const passable = passableFor(ctx, u)
  for (let destination = 0; destination < ctx.state.terrain.length; destination++) {
    const plan = planMovementWithView(ctx, actor, actionId, destination, passable, slot)
    if (!('ok' in plan)) out.push(plan)
  }
  return out
}

/**
 * Walk a path with a chosen `path`-shaped movement power. Returns the number
 * of hexes actually moved.
 * `onStep` returns false to interrupt (a unit dropped mid-move, for example).
 * Every move event names the POWER as its cause (Law 12) — the log says not
 * just that the unit moved, but which choice moved it.
 */
export function executeMove(ctx: Ctx, unitId: number, path: HexId[], power: MoveDef, onStep?: StepHook, slot?: import('./types.js').ActionSlot): number {
  if (path.length === 0) return 0
  const u = unit(ctx, unitId)
  const props=ctx.state.props,passable=passableFor(ctx,u,props),edgeCost=preparedLowEdgeCost(ctx,props)
  if (power.move.shape !== 'path' || movementReason(ctx, u, power, slot) || isRooted(ctx, u)) return 0
  const allowance = Math.max(0, u.movePointsLeft + power.move.budgetMod)
  const occupied = occupancy(ctx)
  let from = u.hex, asked = 0
  for (const hex of path) {
    if (!Number.isSafeInteger(hex) || hex < 0 || hex >= ctx.state.terrain.length || ctx.geo.distance(from, hex) !== 1 || occupied.has(hex) || !passable(hex,from)) return 0
    asked += moveCostOf(ctx.state.terrain[hex] ?? 0) + edgeCost(from,hex) + structureStepCost(ctx,from,hex)
    from = hex
  }
  if (asked > allowance) return 0

  spendAction(ctx, unitId, power, resolveActionSlot(ctx, u, power, slot)!)   // THE ONE SPEND (refactor.one-action-type)
  emit(ctx, 'move.begin', power.id, { actor: unitId, from: u.hex, to: path[path.length - 1], hexes: path.length })
  return walkSteps(ctx, unitId, path, power.id, allowance, Math.max(0, power.move.budgetMod), onStep)
}

/**
 * THE STEP LOOP — the one walk every path-shaped movement takes, one hex at a
 * time (COMBAT-SEQUENCE.md): points, attacks of opportunity, enter and spend,
 * the ground's entry beat, the step hook. Split out of executeMove for
 * capability.charge (2026-09-27), whose walk is the same walk; the caller has
 * already validated the path and paid for the action. `causeId` names the
 * action on every move event (Law 12). Returns the hexes actually moved.
 */
export function walkSteps(ctx: Ctx, unitId: number, path: HexId[], causeId: string, allowance: number, bonusLeft: number, onStep?: StepHook): number {
  const u = unit(ctx, unitId)
  let moved = 0
  const provoked = new Set<number>()   // once per enemy per activation
  const fended = new Set<number>()     // capability.counterattack-and-fend: once per fender per walk
  // capability.move-ignores-zoc (2026-09-28): the ACTION walking says whether it
  // provokes — MoveProfile.ignoresZoc, the Codex row's own property (the hounds:
  // "the move-WITHOUT-provoking machinery, as a property of their movement",
  // ENEMY-REVIEW.md:276-278). `causeId` is that action's id (executeMove, charge.ts).
  const ignoresZoc = ctx.actions[causeId]?.move?.ignoresZoc === true
  for (const hex of path) {
    // 1. movement points — hills cost 2
    const cost = stepCost(ctx, hex, u.hex)
    if (ctx.state.outcome || isRooted(ctx, u) || isBlocked(ctx, u) || allowance < cost || u.movePointsLeft + bonusLeft < cost) break
    // 2. attacks of opportunity — movement.attack-of-opportunity (2026-09-03):
    //    leaving a hex inside an enemy's ZoC provokes ONE attack from that
    //    enemy — its special free attack (rule.free-attack-is-basic-attack,
    //    2026-10-04: the basic attack, no Stamina, −20 Accuracy), through
    //    performAttack; once per enemy per activation; the primary slot untouched.
    //    The AI is blind to it by ruling (Angela 2026-08-13) and walks into these.
    //    fix.zoc-threat-not-stop (2026-09-04): "Zone of control is only a
    //    threat. If you do not stop moving, you are going to get whacked" — a
    //    HIT is what ends movement ("you get hit, and you lose movement, and
    //    you can no longer move"); a miss costs nothing. There is no held.
    if (ctx.cfg.switches.zoneOfControl) {
      let struck = false
      for (const e of zocHoldersAt(ctx, u, u.hex)) {
        if (provoked.has(e.id)) continue
        provoked.add(e.id)
        // the zone is still there — the walk ignores it, and the log says which walk (Law 12)
        if (ignoresZoc) { emit(ctx, 'zoc.ignored', causeId, { actor: unitId, holder: e.id, hex: u.hex }); continue }
        // preview.from-planned-hex: a forecast walk (core/forecast.ts, on a fork) records the
        // provoke — the holder's own choice of swing and its preview() — and walks on as if it
        // missed; a real swing would roll a named stream (SWITCHES.md plannedHexProvokes)
        if (ctx.dryWalk) { const c = aooChoice(ctx, e.id, unitId); ctx.dryWalk.provokes.push({ at: u.hex, from: e.id, ...('attack' in c ? { attackId: c.attack.id, preview: preview(ctx, e.id, unitId, c.attack.id, 'reaction') } : { attackId: null, skipped: c.skipped, preview: null }) }); continue }
        if (attackOfOpportunity(ctx, e.id, unitId)) struck = true
        if (u.lifeState !== 'standing') return moved
      }
      if (struck) {
        u.movePointsLeft = 0   // "you lose movement" — the rest of this activation's steps are gone
        emit(ctx, 'move.stopped', causeId, { actor: unitId, hex: u.hex, reason: 'hit' })
        break
      }
    }
    // 3. enter and spend
    const terrainHere = ctx.state.terrain[hex] ?? 0
    const bonusPaid = Math.min(bonusLeft, cost)
    bonusLeft -= bonusPaid
    allowance -= cost
    const cameFrom = u.hex
    moveUnit(ctx, unitId, hex, cost, causeId, terrainIdOf(terrainHere), bonusPaid)
    moved++
    // rule.walked-unit-has-moved (2026-10-04): a hex entered with the unit's own walk — it has walked
    if (causeId === walkOf(ctx, u)?.id) markWalked(ctx, unitId)
    // 4. traps — none in the baseline
    // 5. the ground's entry beat — one funnel for every way into a hex (core/ground.ts):
    //    water strips, burning ground sears, the painted layer, and the V2 hazard
    //    (lava, v2.ground-table). Flight skips all of it by construction: zero Steps.
    //    A hazard that landed HP damage settles here, so a mover the lava kills stops.
    if (enterGround(ctx, unitId, hex)) settle(ctx, terrainIdOf(terrainHere))
    // 5b. fend — capability.counterattack-and-fend (2026-10-04; DECISIONS.md 2026-09-28: Fend "is triggered by an
    //     enemy moving into your zone of control. Its damage works as the attack of opportunity's does: it can stop
    //     the mover"): a step from OUTSIDE a standing enemy's zone to inside it, while that enemy has Fend up, draws
    //     its special free attack — once per fender per walk. A walk that ignores zones of control ignores this too.
    //     A hit ends the movement, as an attack of opportunity's does.
    if (ctx.cfg.switches.zoneOfControl && !ignoresZoc && u.lifeState === 'standing' && !ctx.state.outcome) {
      let struck = false
      for (const e of zocHoldersAt(ctx, u, hex)) {
        if (fended.has(e.id) || ctx.geo.distance(e.hex, cameFrom) === 1) continue
        if (effective(ctx, e, FREE_ATTACK_STATS.fend.up).value <= 0) continue
        fended.add(e.id)
        if (ctx.dryWalk) { const c = freeAttackChoice(ctx, e.id, unitId); ctx.dryWalk.provokes.push({ at: hex, from: e.id, as: 'fend', ...('attack' in c ? { attackId: c.attack.id, preview: preview(ctx, e.id, unitId, c.attack.id, 'reaction', 'fend') } : { attackId: null, skipped: c.skipped, preview: null }) }); continue }
        if (specialFreeAttack(ctx, e.id, unitId, 'fend')) struck = true
        if (u.lifeState !== 'standing') return moved
      }
      if (struck) {
        u.movePointsLeft = 0
        emit(ctx, 'move.stopped', causeId, { actor: unitId, hex: u.hex, reason: 'hit' })
        break
      }
    }
    // 6. vision — none in the baseline
    if (onStep && !onStep(ctx, unitId, hex)) break
    if (u.lifeState !== 'standing') break
    // 7. (was: the ZoC hard stop — movement.zone-of-control, 2026-09-03.
    //    REVERSED by fix.zoc-threat-not-stop, 2026-09-04: entering a hex inside
    //    an enemy's ZoC ends nothing. The threat is step 2, on the way out.)
  }
  return moved
}

/**
 * The standing enemies whose ZoC (their six adjacent hexes) covers `hex`. Sorted by id (Law 6).
 * v2.prone (§10): a prone unit has no zone of control, and therefore makes no attack of opportunity.
 */
export function zocHoldersAt(ctx: Ctx, u: Unit, hex: HexId): Unit[] {
  return ctx.state.units
    .filter((o) => o.side !== u.side && o.lifeState === 'standing' && ctx.geo.distance(o.hex, hex) === 1 && !isProne(ctx, o))
    .sort((a, b) => a.id - b.id)
}

/**
 * The provoked swing — movement.attack-of-opportunity, a SPECIAL FREE ATTACK since
 * rule.free-attack-is-basic-attack (2026-10-04): the holder's free attack (free-attack.ts
 * freeAttackChoice — its basic attack; else its own unarmed one), resolved through THE attack
 * function as a reaction — no Stamina asked for and none spent, the ruled Accuracy penalty, the
 * primary slot not consulted — then settle. Skipped, with a line, when the holder has no melee
 * attack of its own or none it can legally make.
 * Returns whether the swing HIT — the mover's movement ends on a hit
 * (fix.zoc-threat-not-stop, 2026-09-04) and on nothing else.
 */
/**
 * The holder's choice of swing, or why there is none. Split out of attackOfOpportunity for
 * preview.from-planned-hex: the swing and the forecast of it choose by this one rule. Pure.
 */
export function aooChoice(ctx: Ctx, holderId: number, moverId: number): { attack: AttackDef } | { skipped: 'no melee attack' | 'not legal' } {
  return freeAttackChoice(ctx, holderId, moverId)
}

/**
 * A counterattack-style special free attack made from the board — the fend (capability.counterattack-and-fend): the
 * holder's free attack on `targetId` (freeAttackChoice), as a reaction named for its kind, then settle. Returns whether
 * it hit. Skipped, with a line, when the holder has no melee attack it can legally make.
 */
export function specialFreeAttack(ctx: Ctx, holderId: number, targetId: number, as: FreeAttackKind): boolean {
  const cause = FREE_ATTACK_STATS[as].cause
  const choice = freeAttackChoice(ctx, holderId, targetId)
  if (!('attack' in choice)) { emit(ctx, 'aoo.skipped', cause, { actor: holderId, target: targetId, reason: choice.skipped, as }); return false }
  emit(ctx, 'aoo.provoked', cause, { actor: holderId, target: targetId, attackId: choice.attack.id, as })
  const result = performAttack(ctx, holderId, targetId, choice.attack.id, 'reaction', as)
  settle(ctx, cause)
  return result.hit
}

export function attackOfOpportunity(ctx: Ctx, holderId: number, moverId: number): boolean {
  // The choice is the one rule (freeAttackChoice): the basic attack — the first action of the weapon
  // in hand, when that is a melee attack — else the unit's own melee attack (Punch), each only if legal
  // as a reaction. The 2026-08-20 rule this replaces took the cheapest legal melee attack and paid for
  // it, so an armed unit punched a passer-by (DECISIONS.md 2026-10-04).
  const choice = aooChoice(ctx, holderId, moverId)
  if (!('attack' in choice)) { emit(ctx, 'aoo.skipped', 'movement.aoo', { actor: holderId, target: moverId, reason: choice.skipped }); return false }
  const legal = choice.attack
  emit(ctx, 'aoo.provoked', 'movement.aoo', { actor: holderId, target: moverId, attackId: legal.id })
  const result = performAttack(ctx, holderId, moverId, legal.id, 'reaction')
  settle(ctx, 'movement.aoo')
  return result.hit
}

/**
 * Sidestep: exactly one hex, any direction, with a `sidestep`-shaped power.
 * GAME-DESIGN §4 (ruled 2026-08-17): free, never provokes, and the
 * destination's terrain COST is irrelevant — so no movement points are spent
 * and the point budget is never consulted (SWITCHES.md sidestepUnderFullSlow:
 * a fully-Slowed unit can still sidestep; the slot, not the points, is the
 * price). It is still a Step, so ground effects on entry fire — Flight is the
 * only move with zero Steps.
 * Returns true if the unit moved.
 */
/**
 * A power's step range. Sidestep-shaped defaults to 1; Leap declares 2;
 * Focus and Devotion declare 0 (2026-08-25, movement.bonus-actions).
 */
export function stepRangeOf(power: MoveDef): number {
  return power.move.stepRange ?? 1
}

/**
 * Apply a bonus move's riders, after the step resolved — the mover's own, through THE one effect
 * interpreter (fix.one-effect-vocabulary, 2026-10-01; this was a third interpreter of its own).
 */
function applyMoveEffects(ctx: Ctx, unitId: number, power: MoveDef): void {
  for (const ef of power.effects ?? []) applyEffect(ctx, ef, { causeId: power.id, actor: unitId }, unitId)
}

export function executeSidestep(ctx: Ctx, unitId: number, to: HexId, power: MoveDef, slot?: import('./types.js').ActionSlot): boolean {
  const u = unit(ctx, unitId)
  if (movementReason(ctx, u, power, slot) || (isRooted(ctx, u) && stepRangeOf(power) !== 0)) return false
  const range = stepRangeOf(power)
  if (range === 0) {
    // "It moves you zero hexes on purpose" (Focus / Devotion). Still a bonus
    // move: pays, spends the move slot, cooldowns, fires its riders. No Step
    // occurs, so no ground entry beat — you never left your hex.
    spendAction(ctx, unitId, power, resolveActionSlot(ctx, u, power, slot)!)   // THE ONE SPEND
    emit(ctx, 'move.begin', power.id, { actor: unitId, from: u.hex, to: u.hex, hexes: 0 })
    applyMoveEffects(ctx, unitId, power)
    return true
  }
  if (ctx.geo.distance(u.hex, to) !== range) {
    throw new Error(`${power.id} must move exactly ${range} hex(es) (${u.hex} -> ${to})`)
  }
  const terrainHere = ctx.state.terrain[to] ?? 0
  if (!passableFor(ctx, u)(to,u.hex) || occupancy(ctx).has(to)) {
    throw new Error(`sidestep destination ${to} is not open`)
  }
  spendAction(ctx, unitId, power, resolveActionSlot(ctx, u, power, slot)!)   // THE ONE SPEND (refactor.one-action-type)
  emit(ctx, 'move.begin', power.id, { actor: unitId, from: u.hex, to, hexes: 1 })
  moveUnit(ctx, unitId, to, 0, power.id, terrainIdOf(terrainHere))
  // A sidestep is a Step: the one entry funnel, the painted layer's beat included (fix.ground-one-funnel,
  // 2026-09-28, review E1 — it once inlined its own copy and skipped the layer, so a sidestep onto
  // cursed ground gave no Weak until End of Activation).
  if (enterGround(ctx, unitId, to)) settle(ctx, terrainIdOf(terrainHere))
  if (u.lifeState !== 'standing') return true
  applyMoveEffects(ctx, unitId, power)
  return true
}

/**
 * How far a flight-shaped power can jump right now: the activation's movement
 * points plus the power's modifier (the ladder: labored -1, standard +0,
 * swift +1), 1 Movement per hex. Slow already bit at beginActivation.
 */
export function flightRange(u: Unit, power: MoveDef): number {
  return Math.max(0, u.movePointsLeft + power.move.budgetMod)
}

/**
 * Every hex a flight-shaped power could land on: within range, passable, and
 * free. "Only the destination needs to be viable" (GAME-DESIGN §Movement
 * keywords) — what lies between is never consulted. Sorted ascending so
 * callers iterate reproducibly (Law 6).
 */
export function flightLandings(ctx: Ctx, u: Unit, power: MoveDef): HexId[] {
  const passable = passableFor(ctx, u)
  const occ = occupancy(ctx)
  const range = flightRange(u, power)
  const out: HexId[] = []
  for (let h = 0; h < ctx.state.terrain.length; h++) {
    if (h === u.hex || ctx.geo.distance(u.hex, h) > range) continue
    if (!passable(h) || occ.has(h)) continue
    out.push(h)
  }
  return out
}

/**
 * Flight: a targeted, ATOMIC jump (GAME-DESIGN §Movement keywords, rewritten
 * 2026-08-20). One motion, zero Steps: units, obstructions, terrain cost and
 * every on-entry ground beat in between are skipped by construction — the
 * strips/applies loops simply never run because there is no step loop. The
 * landing hex is a hex like any other: its End-of-Activation ladder fires
 * normally later in the turn, and that is the ONLY ground the flier touches.
 * Returns true if the unit flew.
 */
export function executeFlight(ctx: Ctx, unitId: number, to: HexId, power: MoveDef, slot?: import('./types.js').ActionSlot): boolean {
  const u = unit(ctx, unitId)
  if (movementReason(ctx, u, power, slot) || isRooted(ctx, u)) return false
  const d = ctx.geo.distance(u.hex, to)
  if (d < 1 || d > flightRange(u, power)) throw new Error(`flight to ${to} is out of range (${d} > ${flightRange(u, power)})`)
  const terrainThere = ctx.state.terrain[to] ?? 0
  if (!passableFor(ctx, u)(to) || occupancy(ctx).has(to)) {
    throw new Error(`flight landing ${to} is not open`)
  }
  spendAction(ctx, unitId, power, resolveActionSlot(ctx, u, power, slot)!)   // THE ONE SPEND (refactor.one-action-type)
  emit(ctx, 'move.begin', power.id, { actor: unitId, from: u.hex, to, hexes: d })
  // Points drawn from the unit's own store; the power's modifier covers the
  // rest (swift can jump one hex past the store without sending it negative).
  const paid = Math.max(0, d - power.move.budgetMod)
  moveUnit(ctx, unitId, to, paid, power.id, terrainIdOf(terrainThere))
  return true
}

/** Nearest living enemy. Ties break on lower unit id (Law 6). */
export function nearestEnemy(ctx: Ctx, u: Unit): Unit | null {
  let best: Unit | null = null
  let bestD = Infinity
  for (const o of ctx.state.units) {
    if (o.side === u.side || o.lifeState !== 'standing') continue
    if (hiddenFrom(ctx, u, o)) continue   // ai.sight: a hidden foe is not the nearest anything
    const d = ctx.geo.distance(u.hex, o.hex)
    if (d < bestD || (d === bestD && best && o.id < best.id)) {
      best = o
      bestD = d
    }
  }
  return best
}

export function livingEnemies(ctx: Ctx, u: Unit): Unit[] {
  // capability.taunt (2026-09-03): "Forces the taunted unit to target whoever
  // taunted it" — while a live Taunt names a standing enemy, that enemy is
  // the whole candidate list. The unit keeps its own AI mode (Angela: "It can
  // keep its same AI, like melee or ranged"); only the list narrows.
  // ai.sight (2026-09-27): this is the AI's view of its enemies, and a foe a
  // status hides (hidesFromFoes) is not in it — not a target, not a threat, not
  // a score. A taunter that is hidden leaves the list EMPTY: the unit must target
  // it and cannot see it (SWITCHES.md aiSightTauntHidden).
  const forced = forcedTargetOf(ctx, u)
  if (forced !== null) { const t = ctx.state.units[forced]!; return hiddenFrom(ctx, u, t) ? [] : [t] }
  return ctx.state.units.filter((o) => o.side !== u.side && o.lifeState === 'standing' && !hiddenFrom(ctx, u, o))
}

/**
 * Knockback — capability.knockback (2026-08-27), collisions re-ruled for V2
 * (v2.knockback-collisions, 2026-09-23; COMBAT-V2-DESIGN-2026-09-07 §9.3, ruled
 * 2026-09-07). The rules apply to "all knockback from any source".
 *
 * The line is pusher -> target, continued (stepAwayFrom) — from any distance:
 * a ranged or reach push goes straight on from the pusher's hex through the
 * target's (the vertex tiebreak is stepAwayFrom's). Each hex is checked in turn;
 * off the board, a high prop, a missing floor or a body (standing or downed)
 * STOPS the push there, and a stopped push is a COLLISION:
 *
 *   true damage to the mover = blocker's collision value × remaining points
 *
 * A unit is 1 + its Thorns (COLLISION_UNIT_BASE + the `thorns` stat, v2.thorns;
 * SWITCHES.md knockbackThornsZero is answered), a prop its authored
 * `collisionValue`, and a basic obstruction, the map edge or a missing floor
 * COLLISION_OBSTRUCTION. Only the mover is hurt; the struck unit or prop takes
 * nothing and is not moved (no chaining). Protection absorbs it; Armor and the
 * resists do not (true damage). A push that lands on lava is an entry, not a
 * collision — terrain never stops a push. A `consumes` prop takes a unit its
 * collision kills (applyCollisionDamage marks it; settle decides the death).
 *
 * Events: `knocked` when the mover travelled, `knockback.blocked` when it
 * could not take one hex — either way naming the collision (collidedWith,
 * blocker, collisionValue, remaining) — then the collision's damage.applied
 * (causeId = the push's cause, collision: true, damageType 'true'). The V1
 * fizzle-in-place (SWITCHES.md knockbackBlocked) is retired.
 */
/** COMBAT-V2 §9.3 table (ruled 2026-09-07): "A unit — 1 base, + its Thorns value". */
export const COLLISION_UNIT_BASE = 1
/** COMBAT-V2 §9.3 table: "A basic obstruction — a big rock, a wall, the map edge — 2". */
export const COLLISION_OBSTRUCTION = 2

type Collision = { collidedWith: 'unit' | 'prop' | 'edge' | 'floor' | 'structure'; blocker: string | number | null; collisionValue: number; consumes: string | null }

/** A unit's collision value: 1 + Thorns (§9.3 "Thorns 2 → 3"; v2.thorns fills in the magnitude). */
function unitCollisionValue(ctx: Ctx, u: Unit): number {
  return COLLISION_UNIT_BASE + thornsOf(ctx, u)
}

export function executeKnockback(ctx: Ctx, pusherId: number, targetId: number, hexes: number, causeId: string): number {
  const pusher = unit(ctx, pusherId)
  const tg = unit(ctx, targetId)
  const board = passableHexes(ctx), passable = passableFor(ctx, tg)
  let at = tg.hex
  // v2.kdb (COMBAT-V2 §9.5): Stand Firm "cannot be knocked back ... at all" —
  // no push from any source moves it (SWITCHES.md standFirmAnyPush). Read off
  // the badges' flags, never an id; the line names the badges (Law 12).
  const firm = knockImmunity(ctx, tg).back
  if (firm.length) {
    emit(ctx, 'knockback.blocked', causeId, { actor: pusherId, target: targetId, at: tg.hex, reason: 'cannot be knocked back', asked: hexes, by: firm })
    return 0
  }
  let prev = pusher.hex
  let taken = 0
  let reason = ''
  let hit: Collision | null = null
  const occ = occupancy(ctx)
  for (let i = 0; i < hexes; i++) {
    if (prev === at) { reason = 'no line'; break }   // a unit cannot push itself; nothing is struck
    const next = ctx.geo.stepAwayFrom(prev, at)
    if (next === null) {
      reason = 'edge of the board'
      hit = { collidedWith: 'edge', blocker: null, collisionValue: COLLISION_OBSTRUCTION, consumes: null }
      break
    }
    if (!passable(next, at)) {
      const prop = blockingPropAt(ctx, next, at)
      // v2.structures: the board let the step through and a structure refused it — a wall's
      // face, a house wall, a tower that is not the mover's — "a wall — 2" (§9.3), the struck
      // side's structure named (SWITCHES.md structureCollision)
      const wall = board(next, at) ? structureAt(ctx, next) ?? structureAt(ctx, at) : null
      if (wall) {
        reason = 'structure'
        hit = { collidedWith: 'structure', blocker: wall.id, collisionValue: COLLISION_OBSTRUCTION, consumes: null }
      } else if (prop) {
        reason = 'impassable prop'
        hit = { collidedWith: 'prop', blocker: prop.id, collisionValue: prop.collisionValue ?? COLLISION_OBSTRUCTION, consumes: prop.consumes ? prop.id : null }
      } else {
        reason = ctx.state.floor?.[next] === false ? 'missing floor' : 'impassable'
        hit = { collidedWith: 'floor', blocker: null, collisionValue: COLLISION_OBSTRUCTION, consumes: null }
      }
      break
    }
    const body = occ.get(next)
    if (body !== undefined && body !== targetId) {
      reason = 'occupied'
      hit = { collidedWith: 'unit', blocker: body, collisionValue: unitCollisionValue(ctx, unit(ctx, body)), consumes: null }
      break
    }
    prev = at
    at = next
    taken++
  }
  const remaining = hexes - taken
  const facts = hit ? { collidedWith: hit.collidedWith, ...(hit.blocker !== null ? { blocker: hit.blocker } : {}), collisionValue: hit.collisionValue, remaining } : {}
  if (taken === 0) {
    emit(ctx, 'knockback.blocked', causeId, { actor: pusherId, target: targetId, at: tg.hex, reason: reason || 'nowhere to go', asked: hexes, ...facts })
  } else {
    knockUnit(ctx, targetId, at, pusherId, causeId, { asked: hexes, taken, ...(taken < hexes && reason ? { stoppedBy: reason } : {}) }, facts)
    // §3.2: "Being knocked into lava is *entering* it, not a collision" — and every ground beat
    // runs, not the hazard only (Andrew, 2026-09-28: "A push does apply ground statuses."; SWITCHES
    // pushEntersGround retired). The hex the push leaves the mover in, before any collision cost
    // (SWITCHES pushGroundLandingHex). The push's caller settles.
    enterGround(ctx, targetId, at)
  }
  // The collision's cost: the mover only, and only a standing mover still on
  // its feet — a body the push's own hit already emptied has nothing to lose.
  if (hit && remaining > 0 && tg.lifeState === 'standing' && tg.hp > 0) {
    const asked = hit.collisionValue * remaining
    const damage = flatDamage(ctx, tg, asked, 'true', incomingAbsorb(ctx, tg))
    if (damage.absorbed > 0) spendAbsorb(ctx, targetId, damage.absorbed, causeId)
    applyCollisionDamage(ctx, targetId, damage.value, causeId, {
      actor: pusherId, damageType: 'true', collision: true, collidedWith: hit.collidedWith,
      ...(hit.blocker !== null ? { blocker: hit.blocker } : {}), collisionValue: hit.collisionValue, remaining,
      ...(damage.absorbed ? { absorbed: damage.absorbed } : {}),
    }, hit.consumes)
  }
  return taken
}
