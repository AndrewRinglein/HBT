// Three AI modes, written as rules rather than scores.
// Utility scoring comes later; these need to be inspectable by eye so that when a
// battle looks wrong we can tell the engine from the AI.

import { distance } from './../core/hex.js'
import type { HexId } from './../core/hex.js'
import { executeFlight, executeMove, executeSidestep, flightLandings, livingEnemies, movePowerOf, moveStaminaCost, nearestEnemy, occupancy, pathTo, reachable, usableMoves } from './../core/movement.js'
import type { Reach } from './../core/movement.js'
import type { MoveDef } from './../core/types.js'
import { isPassable } from './../content/maps.js'
import { neighboursOf } from './../core/hex.js'
import { canAttack, performAttack, reachOf } from './../core/pipeline.js'
import { canUsePower, previewPower, usePower } from './../core/ability.js'
import { reachBonusOf } from './../content/maps.js'
import { TERRAIN } from './../core/types.js'
import { emit, unit } from './../core/mutate.js'
import { settle } from './../core/settle.js'
import type { Ctx, Unit } from './../core/types.js'

/** Lowest current health, ties on lower unit id (Law 6). */
function lowestHealth(us: Unit[]): Unit | null {
  let best: Unit | null = null
  for (const u of us) {
    if (!best || u.hp < best.hp || (u.hp === best.hp && u.id < best.id)) best = u
  }
  return best
}

/**
 * Hexes a melee enemy could reach and strike from, next turn.
 * Every AI can read every unit's role, so "melee enemy" is a data question.
 */
function meleeThreatens(ctx: Ctx, u: Unit, hex: HexId): boolean {
  return livingEnemies(ctx, u).some(
    (e) => e.role === 'melee' && distance(hex, e.hex) <= e.movement + 1,
  )
}

function adjacentEnemies(ctx: Ctx, u: Unit): Unit[] {
  return livingEnemies(ctx, u).filter((e) => distance(u.hex, e.hex) === 1)
}

/**
 * Enemies this unit can legally attack RIGHT NOW, by THE legality function
 * (Law 2 — canAttack, never a reimplemented distance check). For every reach-1
 * unit this is exactly adjacentEnemies; it exists because the Green Drake
 * (2026-08-20) hisses at reach 5, and an adjacency-only swing check meant a
 * reach unit closed politely and then never attacked at all.
 */
function enemiesInAttackReach(ctx: Ctx, u: Unit): Unit[] {
  return livingEnemies(ctx, u).filter((e) => u.attacks.some((id) => canAttack(ctx, u.id, e.id, id)))
}

/** The farthest this unit can strike with any of its attacks, for honest idle text. */
function maxAttackReach(ctx: Ctx, u: Unit): number {
  let r = 1
  for (const id of u.attacks) { const a = ctx.attacks[id]; if (a) r = Math.max(r, reachOf(ctx, u, a)) }
  return r
}

/** First affordable attack, in the unit's declared preference order. */
function bestAttack(ctx: Ctx, attackerId: number, targetId: number): string | null {
  for (const id of unit(ctx, attackerId).attacks) {
    if (canAttack(ctx, attackerId, targetId, id)) return id
  }
  return null
}

/**
 * The fallback when the walk power is unaffordable: a granted sidestep-shaped
 * power moves one hex toward `dest` — Angela 2026-08-21, movement is a CHOICE
 * among granted powers, and the free one is what a stamina-starved unit still
 * has. Only steps if it strictly shortens the distance (a sideways shuffle is
 * noise, not progress). Ties break on lower HexId (Law 6).
 */
function sidestepToward(ctx: Ctx, u: Unit, dest: HexId): boolean {
  const power = movePowerOf(ctx, u, 'sidestep')
  if (!power) return false
  const occ = occupancy(ctx)
  const d0 = distance(u.hex, dest)
  let best: HexId | null = null
  let bestD = d0
  for (const n of [...neighboursOf(u.hex)].sort((a, b) => a - b)) {
    if (occ.has(n) || !isPassable(ctx.state.terrain[n] ?? 0)) continue
    const d = distance(n, dest)
    if (d < bestD) { bestD = d; best = n }
  }
  if (best === null) return false
  return executeSidestep(ctx, u.id, best, power)
}

function idle(ctx: Ctx, u: Unit, reason: string): void {
  emit(ctx, 'activation.idle', `ai.${u.ai}`, { actor: u.id, reason })
}

function attackIfPossible(ctx: Ctx, u: Unit, candidates: Unit[]): boolean {
  const target = lowestHealth(candidates)
  if (!target) return false
  const attackId = bestAttack(ctx, u.id, target.id)
  if (!attackId) return false
  // Did stamina force a worse attack than the unit would have preferred?
  const preferred = u.attacks[0]
  if (preferred && preferred !== attackId) {
    const want = ctx.attacks[preferred]
    if (want && u.stamina < want.staminaCost) {
      emit(ctx, 'ai.denied', `ai.${u.ai}`, {
        actor: u.id, wanted: preferred, took: attackId, reason: 'stamina', stamina: u.stamina,
      })
    }
  }
  performAttack(ctx, u.id, target.id, attackId)
  settle(ctx, attackId)
  return true
}

// ── dumb-melee ───────────────────────────────────────────────────────────────
// Steps toward the nearest hero with no regard for anything, then hits whatever
// is adjacent. No self-preservation, no target switching.
function dumbMelee(ctx: Ctx, u: Unit): void {
  const target = nearestEnemy(ctx, u)
  if (!target) return

  if (distance(u.hex, target.hex) > 1) {
    // The movement CHOICE (2026-08-21): first affordable path-shaped power in
    // the unit's declared order; a stamina-starved unit falls back to its free
    // sidestep rather than standing refused.
    const walk = movePowerOf(ctx, u, 'path')
    if (walk) {
      const reach = reachable(ctx, u, walk.budgetMod)
      let bestHex: HexId | null = null
      let bestD = distance(u.hex, target.hex)
      for (const [hex] of [...reach].sort((a, b) => a[0] - b[0])) {
        const d = distance(hex, target.hex)
        if (d < bestD) { bestD = d; bestHex = hex }
      }
      if (bestHex !== null) executeMove(ctx, u.id, pathTo(reach, u.hex, bestHex), walk)
    } else {
      sidestepToward(ctx, u, target.hex)
    }
  }
  if (u.lifeState !== 'standing') return
  // Swing at whatever is IN REACH, not merely adjacent (found landing
  // unit.green-drake, 2026-08-20). For reach-1 units — every zombie — the
  // candidate set and the idle text are both byte-identical to the old
  // adjacency check, which is what keeps this landing proven-neutral on the
  // control battles.
  if (!attackIfPossible(ctx, u, enemiesInAttackReach(ctx, u))) {
    idle(ctx, u, maxAttackReach(ctx, u) > 1 ? 'no enemy in reach' : 'nothing adjacent')
  }
}

// ── melee-aggressive ─────────────────────────────────────────────────────────
// Closes on the reachable enemy with the lowest health; falls back to closing on
// the nearest. Hits with the biggest attack it can afford.
function meleeAggressive(ctx: Ctx, u: Unit): void {
  const enemies = livingEnemies(ctx, u)
  if (enemies.length === 0) return

  if (adjacentEnemies(ctx, u).length === 0) {
    const walk = movePowerOf(ctx, u, 'path')
    if (!walk) {
      // No affordable walk — the free sidestep (if granted) closes one hex.
      const nearest = nearestEnemy(ctx, u)
      if (nearest) sidestepToward(ctx, u, nearest.hex)
      if (u.lifeState !== 'standing') return
      if (!attackIfPossible(ctx, u, adjacentEnemies(ctx, u))) idle(ctx, u, 'could not reach an enemy')
      return
    }
    const reach = reachable(ctx, u, walk.budgetMod)
    const hexes = [...reach.keys()].sort((a, b) => a - b)

    // Prefer ending adjacent to the weakest enemy we can actually reach.
    const reachableTargets = enemies
      .filter((e) => hexes.some((h) => distance(h, e.hex) === 1))
      .sort((a, b) => a.hp - b.hp || a.id - b.id)

    let bestHex: HexId | null = null
    if (reachableTargets[0]) {
      const t = reachableTargets[0]
      for (const h of hexes) {
        if (distance(h, t.hex) === 1) { bestHex = h; break }
      }
    } else {
      const nearest = nearestEnemy(ctx, u)!
      let bestD = distance(u.hex, nearest.hex)
      for (const h of hexes) {
        const d = distance(h, nearest.hex)
        if (d < bestD) { bestD = d; bestHex = h }
      }
    }
    if (bestHex !== null) executeMove(ctx, u.id, pathTo(reach, u.hex, bestHex), walk)
  }
  if (u.lifeState !== 'standing') return
  if (!attackIfPossible(ctx, u, adjacentEnemies(ctx, u))) idle(ctx, u, 'could not reach an enemy')
}

// ── ranged-kite ──────────────────────────────────────────────────────────────
// Holds at maximum reach and shoots the weakest thing it can see.
// Reserves the stamina for the shot, because the shot is the point.
function rangedKite(ctx: Ctx, u: Unit): void {
  const enemies = livingEnemies(ctx, u)
  if (enemies.length === 0) return

  const bow = ctx.attacks[u.attacks[0]!]!
  const RESERVE = 1 // keep one stamina for the shot — the shot is the point

  // Reach if this unit were standing there. A shadow copy runs the real reachOf()
  // rather than the AI re-deriving terrain itself — Law 1, and it means a new
  // Reach modifier is visible to the AI the day it exists.
  const reachAt = (hex: HexId) => reachOf(ctx, { ...u, hex }, bow)

  // What a hex is worth, in strict priority order. Lexicographic so the rules
  // stay readable: safety first, then a shot, then height, then ideal spacing.
  const scoreOf = (hex: HexId): number[] => {
    const terr = ctx.state.terrain[hex] ?? 0
    const reachHere = reachAt(hex)
    const nearestD = Math.min(...enemies.map((e) => distance(hex, e.hex)))
    const canShoot = enemies.some((e) => distance(hex, e.hex) <= reachHere) ? 1 : 0
    const safe = meleeThreatens(ctx, u, hex) ? 0 : 1
    const onHill = terr === TERRAIN.HILLS ? 1 : 0
    // Hills are only worth taking if they buy a shot; never worth walking into reach.
    return [safe, canShoot, safe && canShoot ? onHill : 0, -Math.abs(nearestD - reachHere)]
  }
  const better = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i]! !== b[i]!) return a[i]! > b[i]!
    return false
  }

  const here = scoreOf(u.hex)
  // The movement CHOICE (2026-08-21): a kiter walks when it can afford the
  // walk AND the shot (the shot is the point); when it cannot, the free
  // sidestep still buys one hex of safety or line — which is exactly what the
  // old `ai.denied reason: stamina` line was wishing it had.
  // Every affordable full-move power competes on the same score — path powers
  // offer their walk-reach, flight powers their landing set (the drake's
  // wings, 2026-08-21). Powers are tried in the unit's DECLARED order and a
  // later candidate must strictly beat the standing best (Law 6: ties go to
  // the earlier grant), so a unit granted only the walk behaves exactly as
  // before this existed.
  const movers = usableMoves(ctx, u).filter(
    (m) => (m.shape === 'path' || m.shape === 'flight') && u.stamina >= moveStaminaCost(u, m) + RESERVE,
  )
  if (movers.length > 0) {
    let plan: { power: MoveDef; hex: HexId; reach?: Reach } | null = null
    let best = here
    for (const m of movers) {
      if (m.shape === 'path') {
        const reach = reachable(ctx, u, m.budgetMod)
        for (const h of [...reach.keys()].sort((a, b) => a - b)) {
          const sc = scoreOf(h)
          if (better(sc, best)) { best = sc; plan = { power: m, hex: h, reach } }
        }
      } else {
        for (const h of flightLandings(ctx, u, m)) {
          const sc = scoreOf(h)
          if (better(sc, best)) { best = sc; plan = { power: m, hex: h } }
        }
      }
    }
    if (plan) {
      const terr = ctx.state.terrain[plan.hex] ?? 0
      if (terr === TERRAIN.HILLS) emit(ctx, 'ai.tookHighGround', `ai.${u.ai}`, { actor: u.id, hex: plan.hex })
      if (plan.reach) executeMove(ctx, u.id, pathTo(plan.reach, u.hex, plan.hex), plan.power)
      else executeFlight(ctx, u.id, plan.hex, plan.power)
    }
  } else {
    const power = movePowerOf(ctx, u, 'sidestep')
    let stepped = false
    if (power) {
      const occ = occupancy(ctx)
      let bestHex: HexId | null = null
      let best = here
      for (const n of [...neighboursOf(u.hex)].sort((a, b) => a - b)) {
        if (occ.has(n) || !isPassable(ctx.state.terrain[n] ?? 0)) continue
        const sc = scoreOf(n)
        if (better(sc, best)) { best = sc; bestHex = n }
      }
      if (bestHex !== null) stepped = executeSidestep(ctx, u.id, bestHex, power)
    }
    if (!stepped && (here[0] === 0 || here[1] === 0)) {
      emit(ctx, 'ai.denied', `ai.${u.ai}`, {
        actor: u.id, wanted: 'reposition', reason: 'stamina', stamina: u.stamina,
      })
    }
  }
  if (u.lifeState !== 'standing') return

  // A power beats a staff shot whenever it is available and hits harder.
  const power = u.abilities.find((id) => enemies.some((e) => canUsePower(ctx, u.id, e.id, id)))
  if (power) {
    const targets = enemies.filter((e) => canUsePower(ctx, u.id, e.id, power))
    const t = lowestHealth(targets)
    if (t) {
      const staff = bestAttack(ctx, u.id, t.id)
      const staffDmg = staff ? ctx.attacks[staff]!.bonus +
        (ctx.attacks[staff]!.stat === 'magic' ? u.magic : ctx.attacks[staff]!.stat === 'strength' ? u.strength : u.precision) : 0
      if (previewPower(ctx, u.id, t.id, power).damage >= staffDmg) {
        usePower(ctx, u.id, t.id, power)
        settle(ctx, power)
        return
      }
    }
  }

  const reachNow = reachAt(u.hex)
  const inRange = enemies.filter((e) => distance(u.hex, e.hex) <= reachNow)
  if (!attackIfPossible(ctx, u, inRange)) {
    if (!attackIfPossible(ctx, u, adjacentEnemies(ctx, u))) {
      idle(ctx, u, u.stamina < 1 ? 'out of stamina' : 'no target in range')
    }
  }
}

const MODES: Record<string, (ctx: Ctx, u: Unit) => void> = {
  'dumb-melee': dumbMelee,
  'melee-aggressive': meleeAggressive,
  'ranged-kite': rangedKite,
}

export function runActivation(ctx: Ctx, unitId: number): void {
  const u = unit(ctx, unitId)
  const mode = MODES[u.ai]
  if (!mode) throw new Error(`unknown AI mode '${u.ai}'`)
  emit(ctx, 'ai.mode', `ai.${u.ai}`, { actor: unitId, mode: u.ai })
  mode(ctx, u)
}

export const AI_MODES = Object.keys(MODES)
