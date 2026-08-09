// Class powers. The first primary action that is not an attack.
//
// A power spends the primary action, costs stamina, and goes on cooldown.
// It does not roll to hit — Design Law 23: if it rolls, it can crit; if it
// doesn't roll, it can't. `powerRollsToHit` is a switch if that should change.

import { distance } from './hex.js'
import type { AbilityDef, Ctx, Unit } from './types.js'
import { applyDamage, emit, markPrimaryUsed, spendStamina, unit } from './mutate.js'
import { DMG } from './pipeline.js'
import type { LedgerRow } from './pipeline.js'
import { effective } from './stats.js'

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

/** Same stations as an attack, minus the ones that don't apply. Never a second formula (Law 1). */
export function resolvePowerDamage(ctx: Ctx, user: Unit, target: Unit, a: AbilityDef): { value: number; ledger: LedgerRow[] } {
  const ledger: LedgerRow[] = []
  let v = a.bonus
  ledger.push({ station: DMG.DECLARE, name: 'DECLARE', effectId: a.id, before: 0, after: v, delta: v })

  const statVal = effective(ctx, user, a.stat).value
  const before = v
  v = v + statVal
  ledger.push({ station: DMG.SOURCE_STAT, name: 'SOURCE_STAT', effectId: `unit.${user.typeId}`, before, after: v, delta: statVal })

  if (a.damageType !== 'true') {
    const mit = effective(ctx, target, a.damageType === 'physical' ? 'armor' : 'resist').value
    if (mit !== 0) {
      ledger.push({ station: DMG.MITIGATION, name: 'MITIGATION', effectId: `unit.${target.typeId}`, before: v, after: v - mit, delta: -mit })
      v -= mit
    }
  }
  if (v < 0) { ledger.push({ station: DMG.FLOOR, name: 'FLOOR', effectId: 'engine', before: v, after: 0, delta: -v }); v = 0 }
  return { value: v, ledger }
}

export function previewPower(ctx: Ctx, userId: number, targetId: number, abilityId: string) {
  const a = abilityDef(ctx, abilityId)
  return { damage: resolvePowerDamage(ctx, unit(ctx, userId), unit(ctx, targetId), a).value, hitChance: 100 }
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

  const dmg = resolvePowerDamage(ctx, u, tg, a)
  const summed = dmg.ledger.reduce((s, r) => s + r.delta, 0)
  if (summed !== dmg.value) throw new Error(`power ledger does not reconcile: ${summed} vs ${dmg.value}`)
  const pv = previewPower(ctx, userId, targetId, abilityId)
  if (pv.damage !== dmg.value) throw new Error(`power preview/applied mismatch: ${pv.damage} vs ${dmg.value}`)

  emit(ctx, 'power.used', a.id, {
    actor: userId, target: targetId, abilityId, name: a.name,
    distance: distance(u.hex, tg.hex),
    ledger: dmg.ledger.map((r) => ({ station: r.name, effectId: r.effectId, delta: r.delta })),
  })

  applyDamage(ctx, targetId, dmg.value, a.id, { actor: userId, abilityId })

  const readyAgain = ctx.state.turn + a.cooldown
  u.cooldowns[abilityId] = readyAgain
  emit(ctx, 'cooldown.set', a.id, { actor: userId, abilityId, readyOnTurn: readyAgain })
  return { damage: dmg.value }
}
