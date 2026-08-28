// Movement. Reachability by flood fill, then the path is walked ONE STEP AT A TIME
// (COMBAT-SEQUENCE.md) so that anything which happens mid-move — attacks of
// opportunity, traps, terrain status — has a place to happen and can interrupt.

import { distance, neighboursOf, stepAwayFrom } from './hex.js'
import type { HexId } from './hex.js'
import type { Ctx, MoveDef, Unit } from './types.js'
import { appliesOnEnterOf, isPassable, moveCostOf, stripsOnEnterOf, terrainIdOf } from '../content/maps.js'
import { addStatMod, emit, gainStamina, knockUnit, loseMaxStamina, markMoveUsed, moveUnit, spendStamina, unit } from './mutate.js'
import { applyStatus, reduceStatus } from './status.js'

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
export function moveStaminaCost(u: Unit, power: MoveDef): number {
  return u.maxStamina > 0 ? power.staminaCost : 0
}

/**
 * The movement powers this unit can use right now, in the unit's declared
 * preference order: granted, affordable, and off cooldown. A granted id whose
 * row is missing from the registry is skipped — indistinguishable from the
 * content never having been authored (the kill-switch seam relies on exactly
 * this).
 */
export function usableMoves(ctx: Ctx, u: Unit): MoveDef[] {
  const out: MoveDef[] = []
  for (const id of u.moves) {
    const m = ctx.moves[id]
    if (!m) continue
    if (u.stamina < moveStaminaCost(u, m)) continue
    // Cooldown gate — same map and comparison abilities use. Codex counts
    // Turns DOWN, so a used power wrote turn + cooldown + 1 (see below).
    if (ctx.state.turn < (u.cooldowns[id] ?? 0)) continue
    out.push(m)
  }
  return out
}

/** After a power with a cooldown is used, mark when it is ready again. */
function setMoveCooldown(ctx: Ctx, unitId: number, power: MoveDef): void {
  if (power.cooldown === 0) return
  const u = unit(ctx, unitId)
  // Codex semantics: "usable every other Turn" (cooldown 1) = down for one
  // full Turn = ready on turn + 2 under the `turn >= readyOn` gate.
  const readyAgain = ctx.state.turn + power.cooldown + 1
  u.cooldowns[power.id] = readyAgain
  emit(ctx, 'cooldown.set', power.id, { actor: unitId, abilityId: power.id, readyOnTurn: readyAgain })
}

/** First affordable granted power of a shape, or null. Order is the unit's data (Law 6: no re-sorting). */
export function movePowerOf(ctx: Ctx, u: Unit, shape: MoveDef['shape']): MoveDef | null {
  for (const m of usableMoves(ctx, u)) if (m.shape === shape) return m
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
export function stepCost(ctx: Ctx, to: HexId): number {
  return moveCostOf(ctx.state.terrain[to] ?? 0)
}

/**
 * Every hex this unit can reach, with the cheapest path to each.
 * Dijkstra over integer movement points — hills cost 2, open ground 1.
 * Ties break on lower HexId so paths are reproducible (Law 6).
 */
export function reachable(ctx: Ctx, u: Unit, budgetMod = 0): Reach {
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
      for (const n of neighboursOf(h)) {
        if (occ.has(n)) continue
        const nc = c + stepCost(ctx, n)
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

/**
 * Walk a path with a chosen `path`-shaped movement power. Returns the number
 * of hexes actually moved.
 * `onStep` returns false to interrupt (a unit dropped mid-move, for example).
 * Every move event names the POWER as its cause (Law 12) — the log says not
 * just that the unit moved, but which choice moved it.
 */
export function executeMove(ctx: Ctx, unitId: number, path: HexId[], power: MoveDef, onStep?: StepHook): number {
  if (path.length === 0) return 0
  const u = unit(ctx, unitId)
  if (u.stamina < moveStaminaCost(u, power)) {
    emit(ctx, 'move.refused', power.id, { actor: unitId, reason: 'stamina' })
    return 0
  }

  spendStamina(ctx, unitId, moveStaminaCost(u, power), power.id)
  markMoveUsed(ctx, unitId)
  setMoveCooldown(ctx, unitId, power)
  emit(ctx, 'move.begin', power.id, { actor: unitId, from: u.hex, to: path[path.length - 1], hexes: path.length })

  let moved = 0
  for (const hex of path) {
    // 1. movement points — hills cost 2
    const cost = stepCost(ctx, hex)
    if (u.movePointsLeft < cost) break
    // 2. attacks of opportunity — not in the baseline
    // 3. enter and spend
    const terrainHere = ctx.state.terrain[hex] ?? 0
    moveUnit(ctx, unitId, hex, cost, power.id, terrainIdOf(terrainHere))
    moved++
    // 4. traps — none in the baseline
    // 5. terrain status ON ENTRY — water strips 1 Burn as you splash through
    //    (GAME-DESIGN §4: "running through water strips 1 Burn"). Flight, when it
    //    lands, skips this by construction: a flight move contains zero Steps.
    for (const sid of stripsOnEnterOf(terrainHere)) {
      reduceStatus(ctx, unitId, sid, 1, terrainIdOf(terrainHere))
    }
    // 5b. terrain status ON ENTRY, the inverse — burning ground sears as you
    //     cross ("running through costs 1 stack", GAME-DESIGN §4). Same beat as
    //     the strips, so flight skips both by construction (zero Steps).
    for (const [sid, n] of appliesOnEnterOf(terrainHere)) {
      applyStatus(ctx, unitId, sid, n, terrainIdOf(terrainHere))
    }
    // 6. vision — none in the baseline
    if (onStep && !onStep(ctx, unitId, hex)) break
    if (u.lifeState !== 'standing') break
  }
  return moved
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
  return power.stepRange ?? 1
}

/**
 * Apply a bonus move's riders, after the step resolved. Plain rows through the
 * mutators — the mechanism knows the kinds, content supplies the values.
 * `endOfTurn` = expiresAtTurn turn+1, matching modsFor's `turn < expiresAtTurn`.
 */
function applyMoveEffects(ctx: Ctx, unitId: number, power: MoveDef): void {
  for (const ef of power.effects ?? []) {
    if (ef.kind === 'gainStamina') gainStamina(ctx, unitId, ef.value, power.id)
    else if (ef.kind === 'loseMaxStamina') loseMaxStamina(ctx, unitId, ef.value, power.id)
    else if (ef.kind === 'statMod') {
      addStatMod(ctx, unitId, {
        stat: ef.stat, op: 'add', value: ef.value, source: power.id, scope: 'unit',
        ...(ef.until === 'endOfTurn' ? { expiresAtTurn: ctx.state.turn + 1 } : {}),
      }, power.id)
    }
  }
}

export function executeSidestep(ctx: Ctx, unitId: number, to: HexId, power: MoveDef): boolean {
  const u = unit(ctx, unitId)
  if (u.stamina < moveStaminaCost(u, power)) {
    emit(ctx, 'move.refused', power.id, { actor: unitId, reason: 'stamina' })
    return false
  }
  const range = stepRangeOf(power)
  if (range === 0) {
    // "It moves you zero hexes on purpose" (Focus / Devotion). Still a bonus
    // move: pays, spends the move slot, cooldowns, fires its riders. No Step
    // occurs, so no ground entry beat — you never left your hex.
    spendStamina(ctx, unitId, moveStaminaCost(u, power), power.id)
    markMoveUsed(ctx, unitId)
    setMoveCooldown(ctx, unitId, power)
    emit(ctx, 'move.begin', power.id, { actor: unitId, from: u.hex, to: u.hex, hexes: 0 })
    applyMoveEffects(ctx, unitId, power)
    return true
  }
  if (distance(u.hex, to) !== range) {
    throw new Error(`${power.id} must move exactly ${range} hex(es) (${u.hex} -> ${to})`)
  }
  const terrainHere = ctx.state.terrain[to] ?? 0
  if (!isPassable(terrainHere) || occupancy(ctx).has(to)) {
    throw new Error(`sidestep destination ${to} is not open`)
  }
  spendStamina(ctx, unitId, moveStaminaCost(u, power), power.id)
  markMoveUsed(ctx, unitId)
  setMoveCooldown(ctx, unitId, power)
  emit(ctx, 'move.begin', power.id, { actor: unitId, from: u.hex, to, hexes: 1 })
  moveUnit(ctx, unitId, to, 0, power.id, terrainIdOf(terrainHere))
  for (const sid of stripsOnEnterOf(terrainHere)) reduceStatus(ctx, unitId, sid, 1, terrainIdOf(terrainHere))
  for (const [sid, n] of appliesOnEnterOf(terrainHere)) applyStatus(ctx, unitId, sid, n, terrainIdOf(terrainHere))
  applyMoveEffects(ctx, unitId, power)
  return true
}

/**
 * How far a flight-shaped power can jump right now: the activation's movement
 * points plus the power's modifier (the ladder: labored -1, standard +0,
 * swift +1), 1 Movement per hex. Slow already bit at beginActivation.
 */
export function flightRange(u: Unit, power: MoveDef): number {
  return Math.max(0, u.movePointsLeft + power.budgetMod)
}

/**
 * Every hex a flight-shaped power could land on: within range, passable, and
 * free. "Only the destination needs to be viable" (GAME-DESIGN §Movement
 * keywords) — what lies between is never consulted. Sorted ascending so
 * callers iterate reproducibly (Law 6).
 */
export function flightLandings(ctx: Ctx, u: Unit, power: MoveDef): HexId[] {
  const occ = occupancy(ctx)
  const range = flightRange(u, power)
  const out: HexId[] = []
  for (let h = 0; h < ctx.state.terrain.length; h++) {
    if (h === u.hex || distance(u.hex, h) > range) continue
    if (!isPassable(ctx.state.terrain[h] ?? 0) || occ.has(h)) continue
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
export function executeFlight(ctx: Ctx, unitId: number, to: HexId, power: MoveDef): boolean {
  const u = unit(ctx, unitId)
  if (u.stamina < moveStaminaCost(u, power)) {
    emit(ctx, 'move.refused', power.id, { actor: unitId, reason: 'stamina' })
    return false
  }
  const d = distance(u.hex, to)
  if (d < 1 || d > flightRange(u, power)) throw new Error(`flight to ${to} is out of range (${d} > ${flightRange(u, power)})`)
  const terrainThere = ctx.state.terrain[to] ?? 0
  if (!isPassable(terrainThere) || occupancy(ctx).has(to)) {
    throw new Error(`flight landing ${to} is not open`)
  }
  spendStamina(ctx, unitId, moveStaminaCost(u, power), power.id)
  markMoveUsed(ctx, unitId)
  setMoveCooldown(ctx, unitId, power)
  emit(ctx, 'move.begin', power.id, { actor: unitId, from: u.hex, to, hexes: d })
  // Points drawn from the unit's own store; the power's modifier covers the
  // rest (swift can jump one hex past the store without sending it negative).
  const paid = u.movePointsLeft - Math.max(0, u.movePointsLeft + power.budgetMod - d)
  moveUnit(ctx, unitId, to, paid, power.id, terrainIdOf(terrainThere))
  return true
}

/** Nearest living enemy. Ties break on lower unit id (Law 6). */
export function nearestEnemy(ctx: Ctx, u: Unit): Unit | null {
  let best: Unit | null = null
  let bestD = Infinity
  for (const o of ctx.state.units) {
    if (o.side === u.side || o.lifeState !== 'standing') continue
    const d = distance(u.hex, o.hex)
    if (d < bestD || (d === bestD && best && o.id < best.id)) {
      best = o
      bestD = d
    }
  }
  return best
}

export function livingEnemies(ctx: Ctx, u: Unit): Unit[] {
  return ctx.state.units.filter((o) => o.side !== u.side && o.lifeState === 'standing')
}

/**
 * Knockback — capability.knockback (2026-08-27). Authored on the halberd's
 * Hack: "push the target 1 hex directly away from you." CODEX §12 bans every
 * other forced movement ("no pulls, pushes or swaps" beyond Knockback), so
 * this is the whole of it.
 *
 * The line is pusher -> target, continued (stepAwayFrom); it is defined only
 * from adjacency, which every melee push satisfies. Each hex is checked in
 * turn: off the board, impassable, or occupied STOPS the push there — the
 * knockbackBlocked switch question, defaulted to fizzle-in-place, recorded in
 * SWITCHES.md. A stopped push with zero hexes taken logs knockback.blocked
 * with its reason (Law 9: never silent). Ground statuses need no special
 * case: the pushed unit STANDS on the new hex, and end-of-activation terrain
 * strips/applies read where a unit stands, not how it got there.
 */
export function executeKnockback(ctx: Ctx, pusherId: number, targetId: number, hexes: number, causeId: string): number {
  const pusher = unit(ctx, pusherId)
  const tg = unit(ctx, targetId)
  let at = tg.hex
  let prev = pusher.hex
  let taken = 0
  let reason = ''
  for (let i = 0; i < hexes; i++) {
    const next = stepAwayFrom(prev, at)
    if (next === null) { reason = prev === at ? 'no line' : distance(prev, at) !== 1 ? 'no straight line — pusher not adjacent' : 'edge of the board'; break }
    if (!isPassable(ctx.state.terrain[next] ?? 0)) { reason = `impassable ${terrainIdOf(ctx.state.terrain[next] ?? 0)}`; break }
    if (occupancy(ctx).has(next)) { reason = 'occupied'; break }
    prev = at
    at = next
    taken++
  }
  if (taken === 0) {
    emit(ctx, 'knockback.blocked', causeId, { actor: pusherId, target: targetId, at: tg.hex, reason: reason || 'nowhere to go' })
    return 0
  }
  knockUnit(ctx, targetId, at, pusherId, causeId)
  return taken
}
