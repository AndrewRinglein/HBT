// Movement. Reachability by flood fill, then the path is walked ONE STEP AT A TIME
// (COMBAT-SEQUENCE.md) so that anything which happens mid-move — attacks of
// opportunity, traps, terrain status — has a place to happen and can interrupt.

import { distance, neighboursOf } from './hex.js'
import type { HexId } from './hex.js'
import type { Ctx, Unit } from './types.js'
import { appliesOnEnterOf, moveCostOf, stripsOnEnterOf, terrainIdOf } from '../content/maps.js'
import { emit, markMoveUsed, moveUnit, spendStamina, unit } from './mutate.js'
import { applyStatus, reduceStatus } from './status.js'

export const MOVE_STAMINA_COST = 1

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
export function reachable(ctx: Ctx, u: Unit): Reach {
  const occ = occupancy(ctx)
  const budget = u.movePointsLeft
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
 * Walk a path. Returns the number of hexes actually moved.
 * `onStep` returns false to interrupt (a unit dropped mid-move, for example).
 */
export function executeMove(ctx: Ctx, unitId: number, path: HexId[], onStep?: StepHook): number {
  if (path.length === 0) return 0
  const u = unit(ctx, unitId)
  if (u.stamina < MOVE_STAMINA_COST && u.maxStamina > 0) {
    emit(ctx, 'move.refused', 'engine', { actor: unitId, reason: 'stamina' })
    return 0
  }

  spendStamina(ctx, unitId, u.maxStamina > 0 ? MOVE_STAMINA_COST : 0, 'move')
  markMoveUsed(ctx, unitId)
  emit(ctx, 'move.begin', 'move', { actor: unitId, from: u.hex, to: path[path.length - 1], hexes: path.length })

  let moved = 0
  for (const hex of path) {
    // 1. movement points — hills cost 2
    const cost = stepCost(ctx, hex)
    if (u.movePointsLeft < cost) break
    // 2. attacks of opportunity — not in the baseline
    // 3. enter and spend
    const terrainHere = ctx.state.terrain[hex] ?? 0
    moveUnit(ctx, unitId, hex, cost, 'move', terrainIdOf(terrainHere))
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
