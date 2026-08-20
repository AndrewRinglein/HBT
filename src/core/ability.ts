// Class powers. The first primary action that is not an attack.
//
// A power spends the primary action, costs stamina, and goes on cooldown.
// It does not roll to hit — Design Law 23: if it rolls, it can crit; if it
// doesn't roll, it can't. `powerRollsToHit` is a switch if that should change.

import { distance } from './hex.js'
import type { AbilityDef, Ctx, Unit } from './types.js'
import { applyDamage, emit, markPrimaryUsed, spendStamina, unit } from './mutate.js'
import { resolveDamage } from './pipeline.js'
import { incomingAbsorb, outgoingPenalty, spendAbsorb } from './status.js'

export function abilityDef(ctx: Ctx, id: string): AbilityDef {
  const a = ctx.abilities[id]
  if (!a) throw new Error(`unknown ability '${id}' — abilities are an explicit registry, check content/index.ts`)
  return a
}

/** Turn on which this ability becomes usable again. Absent = ready. */
export function readyOn(u: Unit, id: string): number {
  return u.cooldowns[id] ?? 0
}

export function isReady(ctx: Ctx, u: Unit, id: string): boolean {
  return ctx.state.turn >= readyOn(u, id)
}

/** The one legality answer for powers (Law 2). */
export function canUsePower(ctx: Ctx, userId: number, targetId: number, abilityId: string): boolean {
  const u = unit(ctx, userId)
  const tg = unit(ctx, targetId)
  const a = ctx.abilities[abilityId]
  if (!a) return false
  if (!u.abilities.includes(abilityId)) return false
  if (u.lifeState !== 'standing' || tg.lifeState !== 'standing') return false
  if (u.side === tg.side) return false
  if (u.primaryUsed) return false
  if (u.stamina < a.staminaCost) return false
  if (!isReady(ctx, u, abilityId)) return false
  return distance(u.hex, tg.hex) <= a.range
}

/**
 * LAW 1, RESTORED (2026-08-20). This WAS a second damage pipeline — DECLARE →
 * SOURCE_STAT → MITIGATION → FLOOR, hand-rolled, skipping SOURCE_STATUS, CRIT and
 * PROTECTION. So Weakness would not have reduced a power and Protection would not
 * have absorbed one, and the two pipelines would have drifted the first time a
 * station changed. Now it is a call into THE pipeline with crit forced false
 * (Design Law 23: powers do not roll, so they cannot crit).
 */
export function resolvePowerDamage(
  ctx: Ctx, user: Unit, target: Unit, a: AbilityDef, outPenalty = 0, absorbAvailable = 0,
) {
  return resolveDamage(ctx, user, target, a, false, outPenalty, absorbAvailable)
}

export function previewPower(ctx: Ctx, userId: number, targetId: number, abilityId: string) {
  const a = abilityDef(ctx, abilityId)
  const u = unit(ctx, userId)
  const tg = unit(ctx, targetId)
  // Law 1's sibling: the preview runs the identical pipeline, penalties and all.
  return {
    damage: resolvePowerDamage(ctx, u, tg, a, outgoingPenalty(ctx, u), incomingAbsorb(ctx, tg)).value,
    hitChance: 100,
  }
}

export function usePower(ctx: Ctx, userId: number, targetId: number, abilityId: string): { damage: number } {
  const u = unit(ctx, userId)
  const tg = unit(ctx, targetId)
  const a = abilityDef(ctx, abilityId)
  if (!canUsePower(ctx, userId, targetId, abilityId)) {
    throw new Error(`illegal power: ${u.name} -> ${tg.name} with ${abilityId}`)
  }

  spendStamina(ctx, userId, a.staminaCost, a.id)
  markPrimaryUsed(ctx, userId)

  const dmg = resolvePowerDamage(ctx, u, tg, a, outgoingPenalty(ctx, u), incomingAbsorb(ctx, tg))
  const summed = dmg.ledger.reduce((s, r) => s + r.delta, 0)
  if (summed !== dmg.value) throw new Error(`power ledger does not reconcile: ${summed} vs ${dmg.value}`)
  const pv = previewPower(ctx, userId, targetId, abilityId)
  if (pv.damage !== dmg.value) throw new Error(`power preview/applied mismatch: ${pv.damage} vs ${dmg.value}`)

  emit(ctx, 'power.used', a.id, {
    actor: userId, target: targetId, abilityId, name: a.name,
    distance: distance(u.hex, tg.hex),
    ledger: dmg.ledger.map((r) => ({ station: r.name, effectId: r.effectId, delta: r.delta })),
  })

  // Spend what the pipeline said Protection would absorb — same order as attacks.
  if (dmg.absorbed > 0) spendAbsorb(ctx, targetId, dmg.absorbed, a.id)
  applyDamage(ctx, targetId, dmg.value, a.id,
    dmg.absorbed > 0
      ? { actor: userId, abilityId, damageType: a.damageType, absorbed: dmg.absorbed }
      : { actor: userId, abilityId, damageType: a.damageType })

  const readyAgain = ctx.state.turn + a.cooldown
  u.cooldowns[abilityId] = readyAgain
  emit(ctx, 'cooldown.set', a.id, { actor: userId, abilityId, readyOnTurn: readyAgain })
  return { damage: dmg.value }
}
