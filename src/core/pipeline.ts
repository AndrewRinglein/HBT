// Accuracy and damage stations, and the per-hit attack sequence.
//
// Ordering is a property of the STATION, never of the effect (COMBAT-SEQUENCE.md).
// Numbers are spaced so a station can be inserted later without renumbering anything.
// Integers only, one rounding rule: truncating integer division (Law 7).

import { distance } from './hex.js'
import { roll100 } from './rng.js'
import type { AttackDef, Ctx, Unit } from './types.js'
import { accuracyBonusOf, reachBonusOf } from '../content/maps.js'
import { applyStatus, outgoingPenalty } from './status.js'
import { applyDamage, emit, markPrimaryUsed, spendStamina, unit } from './mutate.js'

export const ACC = {
  BASE: 100,
  RANGE: 200,
  ADJACENT: 300,
  TERRAIN: 400,
  CONDITION: 500,
  TARGET_DODGE: 600,
  SITUATIONAL: 700,
  FINAL: 900,
} as const

export const DMG = {
  DECLARE: 100,
  SOURCE_STAT: 200,
  SOURCE_STATUS: 250,
  TERRAIN: 300,
  POSITIONAL: 350,
  CRIT: 450,
  PROTECTION: 550,
  MITIGATION: 600,
  FLOOR: 700,
  APPLY: 850,
} as const

export type LedgerRow = {
  station: number
  name: string
  effectId: string
  before: number
  after: number
  delta: number
}

export type Resolved = { value: number; ledger: LedgerRow[] }

function step(ledger: LedgerRow[], station: number, name: string, effectId: string, before: number, after: number): number {
  if (before !== after) ledger.push({ station, name, effectId, before, after, delta: after - before })
  return after
}

/** Effective reach: hero Reach and high ground add to ranged weapons only. */
export function reachOf(u: Unit, a: AttackDef, terrain = 0): number {
  return a.kind === 'ranged' ? a.reach + u.reach + reachBonusOf(terrain) : a.reach
}
export function reachIn(ctx: Ctx, u: Unit, a: AttackDef): number {
  return reachOf(u, a, ctx.state.terrain[u.hex] ?? 0)
}

/**
 * The accuracy pipeline. NOTE: the value is deliberately NOT clamped —
 * Crit reads (final − 100) ÷ 4, so clamping here would silently delete crit surplus.
 * Only the roll comparison clamps.
 */
export function resolveAccuracy(attacker: Unit, target: Unit, a: AttackDef, terrain = 0): Resolved {
  const ledger: LedgerRow[] = []
  const d = distance(attacker.hex, target.hex)
  let v = attacker.accuracy
  ledger.push({ station: ACC.BASE, name: 'BASE', effectId: `unit.${attacker.typeId}`, before: 0, after: v, delta: v })

  if (a.kind === 'ranged' && d > 1) {
    v = step(ledger, ACC.RANGE, 'RANGE', a.id, v, v - (d - 1) * 5)
  }
  if (a.kind === 'ranged' && d === 1) {
    v = step(ledger, ACC.ADJACENT, 'ADJACENT', a.id, v, v - 20)
  }
  v = step(ledger, ACC.TERRAIN, 'TERRAIN', 'terrain.hills', v, v + accuracyBonusOf(terrain))
  // CONDITION, SITUATIONAL: nothing live yet.
  v = step(ledger, ACC.TARGET_DODGE, 'TARGET_DODGE', `unit.${target.typeId}`, v, v - 0)
  return { value: v, ledger }
}

export function resolveDamage(attacker: Unit, target: Unit, a: AttackDef, crit: boolean, outPenalty = 0): Resolved {
  const ledger: LedgerRow[] = []
  let v = a.bonus
  ledger.push({ station: DMG.DECLARE, name: 'DECLARE', effectId: a.id, before: 0, after: v, delta: v })

  const statVal = a.stat === 'strength' ? attacker.strength
    : a.stat === 'magic' ? attacker.magic : attacker.precision
  v = step(ledger, DMG.SOURCE_STAT, 'SOURCE_STAT', `unit.${attacker.typeId}`, v, v + statVal)
  if (outPenalty) v = step(ledger, DMG.SOURCE_STATUS, 'SOURCE_STATUS', 'status', v, v - outPenalty)

  if (crit) {
    // +50%, before all mitigation. One rounding rule: truncating integer division.
    v = step(ledger, DMG.CRIT, 'CRIT', 'crit', v, Math.trunc((v * 3) / 2))
  }

  if (a.damageType !== 'true') {
    const mit = a.damageType === 'physical' ? target.armor : target.resist
    v = step(ledger, DMG.MITIGATION, 'MITIGATION', `unit.${target.typeId}`, v, v - mit)
  }

  if (v < 0) v = step(ledger, DMG.FLOOR, 'FLOOR', 'engine', v, 0)
  return { value: v, ledger }
}

export type AttackResult = {
  hit: boolean
  crit: boolean
  accuracy: number
  roll: number
  damage: number
  killed: boolean
}

/** Can this attack be made right now? The one legality answer (Law 2). */
export function canAttack(ctx: Ctx, attackerId: number, targetId: number, attackId: string): boolean {
  const at = unit(ctx, attackerId)
  const tg = unit(ctx, targetId)
  const a = ctx.attacks[attackId]
  if (!a) return false
  if (at.lifeState !== 'standing' || tg.lifeState !== 'standing') return false
  if (at.side === tg.side) return false
  if (at.primaryUsed) return false
  if (at.stamina < a.staminaCost) return false
  return distance(at.hex, tg.hex) <= reachIn(ctx, at, a)
}

/** Preview: the same pipeline, run without applying. Law 1 — never a second formula. */
export function preview(ctx: Ctx, attackerId: number, targetId: number, attackId: string) {
  const at = unit(ctx, attackerId)
  const tg = unit(ctx, targetId)
  const a = ctx.attacks[attackId]!
  const acc = resolveAccuracy(at, tg, a, ctx.state.terrain[at.hex] ?? 0)
  const hitChance = Math.max(0, Math.min(100, acc.value))
  return {
    hitChance,
    accuracy: acc.value,
    damageOnHit: resolveDamage(at, tg, a, false, outgoingPenalty(ctx, at)).value,
    damageOnCrit: resolveDamage(at, tg, a, true, outgoingPenalty(ctx, at)).value,
    critChance: critChanceOf(ctx, at, tg, acc.value),
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function critChanceOf(ctx: Ctx, attacker: Unit, target: Unit, finalAcc: number): number {
  if (!ctx.cfg.switches.critEnabled) return 0
  const surplus = finalAcc > 100 ? Math.trunc((finalAcc - 100) / 4) : 0
  return Math.max(0, 3 + surplus)
}

/** One Hit. Damage resolves completely; triggers would fire after (none yet). */
export function performAttack(ctx: Ctx, attackerId: number, targetId: number, attackId: string): AttackResult {
  const at = unit(ctx, attackerId)
  const tg = unit(ctx, targetId)
  const a = ctx.attacks[attackId]
  if (!a) throw new Error(`unknown attack ${attackId}`)
  if (!canAttack(ctx, attackerId, targetId, attackId)) {
    throw new Error(`illegal attack: ${at.name} -> ${tg.name} with ${attackId}`)
  }

  const ord = ++at.attackOrdinal
  const pv = preview(ctx, attackerId, targetId, attackId)

  spendStamina(ctx, attackerId, a.staminaCost, a.id)
  markPrimaryUsed(ctx, attackerId)

  emit(ctx, 'attack.declared', a.id, {
    actor: attackerId, target: targetId, attackId, ordinal: ord,
    distance: distance(at.hex, tg.hex), hitChance: pv.hitChance, damageOnHit: pv.damageOnHit,
  })

  const roll = roll100(ctx.rng, 'to-hit', at.uid, ord)
  const hit = roll <= pv.hitChance

  if (!hit) {
    emit(ctx, 'attack.miss', a.id, { actor: attackerId, target: targetId, roll, hitChance: pv.hitChance })
    return { hit: false, crit: false, accuracy: pv.accuracy, roll, damage: 0, killed: false }
  }

  let crit = false
  if (ctx.cfg.switches.critEnabled && pv.critChance > 0) {
    crit = roll100(ctx.rng, 'crit', at.uid, ord) <= pv.critChance
  }

  const dmg = resolveDamage(at, tg, a, crit, outgoingPenalty(ctx, at))

  // Conservation: the ledger must fully explain the number (Law 1's sibling).
  const summed = dmg.ledger.reduce((s, r) => s + r.delta, 0)
  if (summed !== dmg.value) {
    throw new Error(`damage ledger does not reconcile: ledger ${summed} vs value ${dmg.value}`)
  }
  const expected = crit ? pv.damageOnCrit : pv.damageOnHit
  if (dmg.value !== expected) {
    throw new Error(`preview/applied mismatch: preview ${expected}, applied ${dmg.value}`)
  }

  emit(ctx, 'attack.hit', a.id, {
    actor: attackerId, target: targetId, roll, hitChance: pv.hitChance, crit,
    ledger: dmg.ledger.map((r) => ({ station: r.name, effectId: r.effectId, delta: r.delta })),
  })

  const hpBefore = tg.hp
  applyDamage(ctx, targetId, dmg.value, a.id, { actor: attackerId, attackId, crit })

  // Riders are triggers, not stations: damage resolves completely, then they fire.
  if (a.applies && tg.lifeState === 'standing') {
    applyStatus(ctx, targetId, a.applies.statusId, a.applies.value, a.id)
  }

  return {
    hit: true, crit, accuracy: pv.accuracy, roll,
    damage: Math.min(dmg.value, hpBefore),
    killed: tg.hp === 0,
  }
}
