// Three AI modes, written as rules rather than scores.
// Utility scoring comes later; these need to be inspectable by eye so that when a
// battle looks wrong we can tell the engine from the AI.

import { distance } from './../core/hex.js'
import type { HexId } from './../core/hex.js'
import { executeMove, livingEnemies, nearestEnemy, pathTo, reachable } from './../core/movement.js'
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

/** First affordable attack, in the unit's declared preference order. */
function bestAttack(ctx: Ctx, attackerId: number, targetId: number): string | null {
  for (const id of unit(ctx, attackerId).attacks) {
    if (canAttack(ctx, attackerId, targetId, id)) return id
  }
  return null
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
    const reach = reachable(ctx, u)
    let bestHex: HexId | null = null
    let bestD = distance(u.hex, target.hex)
    for (const [hex] of [...reach].sort((a, b) => a[0] - b[0])) {
      const d = distance(hex, target.hex)
      if (d < bestD) { bestD = d; bestHex = hex }
    }
    if (bestHex !== null) executeMove(ctx, u.id, pathTo(reach, u.hex, bestHex))
  }
  if (u.lifeState !== 'standing') return
  if (!attackIfPossible(ctx, u, adjacentEnemies(ctx, u))) idle(ctx, u, 'nothing adjacent')
}

// ── melee-aggressive ─────────────────────────────────────────────────────────
// Closes on the reachable enemy with the lowest health; falls back to closing on
// the nearest. Hits with the biggest attack it can afford.
function meleeAggressive(ctx: Ctx, u: Unit): void {
  const enemies = livingEnemies(ctx, u)
  if (enemies.length === 0) return

  if (adjacentEnemies(ctx, u).length === 0) {
    const reach = reachable(ctx, u)
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
    if (bestHex !== null) executeMove(ctx, u.id, pathTo(reach, u.hex, bestHex))
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
  const baseReach = reachOf(u, bow)
  const RESERVE = 1 // keep one stamina for the shot — the shot is the point

  // What a hex is worth, in strict priority order. Lexicographic so the rules
  // stay readable: safety first, then a shot, then height, then ideal spacing.
  const scoreOf = (hex: HexId): number[] => {
    const terr = ctx.state.terrain[hex] ?? 0
    const reachHere = baseReach + reachBonusOf(terr)
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
  if (u.stamina > RESERVE) {
    const reach = reachable(ctx, u)
    let bestHex: HexId | null = null
    let best = here
    for (const h of [...reach.keys()].sort((a, b) => a - b)) {
      const sc = scoreOf(h)
      if (better(sc, best)) { best = sc; bestHex = h }
    }
    if (bestHex !== null) {
      const terr = ctx.state.terrain[bestHex] ?? 0
      if (terr === TERRAIN.HILLS) emit(ctx, 'ai.tookHighGround', `ai.${u.ai}`, { actor: u.id, hex: bestHex })
      executeMove(ctx, u.id, pathTo(reach, u.hex, bestHex))
    }
  } else if (here[0] === 0 || here[1] === 0) {
    emit(ctx, 'ai.denied', `ai.${u.ai}`, {
      actor: u.id, wanted: 'reposition', reason: 'stamina', stamina: u.stamina,
    })
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

  const terrNow = ctx.state.terrain[u.hex] ?? 0
  const reachNow = baseReach + reachBonusOf(terrNow)
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
