// Class and item powers. A primary action that is not an attack.
//
// A power spends the primary action, costs stamina, and goes on cooldown.
// It does not roll to hit — Design Law 23: if it rolls, it can crit; if it
// doesn't roll, it can't. `powerRollsToHit` is a switch if that should change.
//
// capability.item-powers (2026-08-27): AbilityDef speaks three shapes now,
// copied from the authored S31 item powers and never invented —
//   damage      the original Arcane-Bolt shape; with `area: 'blast1'` it is
//               the Lightning Staff's Storm ("Deal magic damage equal to your
//               Magic + 1 to every unit in the blast. It does not roll to
//               hit, so it cannot crit.")
//   heal        the Holy Symbol's Heal ("Heal the target for 1 + 2 x Spirit"
//               — a ValueSpec, so Spirit uses the party-wide sum per
//               GAME-DESIGN §5's scaling law)
//   selfGuard   the Knight Shield's Block ("Gain Protection equal to 4 + your
//               Armor, and lose 5 Dodge for the rest of the Battle. Every use
//               costs another 5 Dodge")

import { distance } from './hex.js'
import type { AbilityDef, Ctx, Unit } from './types.js'
import { addStatMod, applyDamage, applyHealing, emit, markPrimaryUsed, spendStamina, unit } from './mutate.js'
import { areaHexesOf, resolveDamage } from './pipeline.js'
import type { DamageSource } from './pipeline.js'
import { applyStatus, incomingAbsorb, outgoingPenalty, spendAbsorb } from './status.js'
import { valueOf } from './trigger.js'
import { effective } from './stats.js'

export function abilityDef(ctx: Ctx, id: string): AbilityDef {
  const a = ctx.abilities[id]
  if (!a) throw new Error(`unknown ability '${id}' — abilities are an explicit registry, check content/index.ts`)
  return a
}

/** The power's effect kind. Absent = 'damage', so every pre-existing row is unchanged. */
export function effectOf(a: AbilityDef): 'damage' | 'heal' | 'selfGuard' {
  return a.effect ?? 'damage'
}

/** A damage power's DamageSource — loud when a non-damage power is asked for one. */
function damageSourceOf(a: AbilityDef): DamageSource {
  if (effectOf(a) !== 'damage' || a.stat === undefined || a.bonus === undefined || a.damageType === undefined) {
    throw new Error(`ability '${a.id}' is not a damage power — its row carries no stat/bonus/damageType`)
  }
  return { id: a.id, stat: a.stat, bonus: a.bonus, damageType: a.damageType }
}

/** Turn on which this ability becomes usable again. Absent = ready. */
export function readyOn(u: Unit, id: string): number {
  return u.cooldowns[id] ?? 0
}

export function isReady(ctx: Ctx, u: Unit, id: string): boolean {
  return ctx.state.turn >= readyOn(u, id)
}

/** The one legality answer for powers (Law 2). Target side depends on the effect kind. */
export function canUsePower(ctx: Ctx, userId: number, targetId: number, abilityId: string): boolean {
  const u = unit(ctx, userId)
  const tg = unit(ctx, targetId)
  const a = ctx.abilities[abilityId]
  if (!a) return false
  if (!u.abilities.includes(abilityId)) return false
  if (u.lifeState !== 'standing' || tg.lifeState !== 'standing') return false
  // Dazed — station.crit (2026-08-27): "loses access to class powers".
  // A status FLAG, not a hardcoded name: any status declaring locksPowers.
  for (const s of u.statuses) {
    if (s.value > 0 && ctx.statuses[s.id]?.locksPowers) return false
  }
  switch (effectOf(a)) {
    case 'damage':
      if (u.side === tg.side) return false
      break
    case 'heal':
      // "one ally within 6 hexes" — an ally, and whether that includes the
      // caster is the healIncludesSelf switch (default yes).
      if (u.side !== tg.side) return false
      if (targetId === userId && !ctx.cfg.switches.healIncludesSelf) return false
      break
    case 'selfGuard':
      if (targetId !== userId) return false
      break
  }
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
  return resolveDamage(ctx, user, target, damageSourceOf(a), false, outPenalty, absorbAvailable)
}

/** The heal amount, resolved. One place, so the preview and the use agree (Law 1). */
export function resolveHealAmount(ctx: Ctx, user: Unit, a: AbilityDef): number {
  if (a.heal === undefined) throw new Error(`ability '${a.id}' has effect 'heal' but no heal spec — regenerate the pack`)
  return valueOf(ctx, user, a.heal)
}

/** Block's protection: base + perArmor x effective Armor ("4 + your Armor"). */
export function resolveGuardAmount(ctx: Ctx, user: Unit, a: AbilityDef): number {
  if (a.guard === undefined) throw new Error(`ability '${a.id}' has effect 'selfGuard' but no guard spec — regenerate the pack`)
  return a.guard.protectionBase + a.guard.protectionPerArmor * effective(ctx, user, 'armor').value
}

/** Every standing unit a blast1 power centred on the target's hex would strike. */
export function powerBlastIdsOf(ctx: Ctx, userId: number, targetId: number, abilityId: string): number[] {
  const a = abilityDef(ctx, abilityId)
  if (!a.area) return [targetId]
  const u = unit(ctx, userId)
  const hexes = new Set(areaHexesOf(u.hex, unit(ctx, targetId).hex, a.area))
  const out: number[] = []
  for (const o of ctx.state.units) {
    if (o.lifeState !== 'standing' || !hexes.has(o.hex)) continue
    // "to EVERY unit in the blast" — the caster included, if he stood in it.
    // With areaHitsAllies off only enemies are struck, caster's side spared.
    if (!ctx.cfg.switches.areaHitsAllies && o.side === u.side) continue
    out.push(o.id)
  }
  return out.sort((x, y) => (x === targetId ? -1 : y === targetId ? 1 : x - y))
}

export function previewPower(ctx: Ctx, userId: number, targetId: number, abilityId: string) {
  const a = abilityDef(ctx, abilityId)
  const u = unit(ctx, userId)
  const tg = unit(ctx, targetId)
  switch (effectOf(a)) {
    case 'heal':
      return { damage: 0, heal: resolveHealAmount(ctx, u, a), hitChance: 100 }
    case 'selfGuard':
      return { damage: 0, protection: resolveGuardAmount(ctx, u, a), hitChance: 100 }
    default:
      // Law 1's sibling: the preview runs the identical pipeline, penalties and all.
      return {
        damage: resolvePowerDamage(ctx, u, tg, a, outgoingPenalty(ctx, u), incomingAbsorb(ctx, tg)).value,
        hitChance: 100,
      }
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

  let total = 0
  switch (effectOf(a)) {
    case 'heal': {
      const amount = resolveHealAmount(ctx, u, a)
      emit(ctx, 'power.used', a.id, {
        actor: userId, target: targetId, abilityId, name: a.name,
        distance: distance(u.hex, tg.hex), heal: amount,
      })
      applyHealing(ctx, targetId, amount, a.id)
      break
    }
    case 'selfGuard': {
      const protection = resolveGuardAmount(ctx, u, a)
      emit(ctx, 'power.used', a.id, {
        actor: userId, target: targetId, abilityId, name: a.name,
        protection, dodgeLoss: a.guard!.dodgeLoss,
      })
      applyStatus(ctx, userId, 'status.protection', protection, a.id)
      // "lose 5 Dodge for the rest of the Battle. Every use costs another 5"
      // — a permanent (battle-length) stat mod, one more each use, no cap:
      // the authored escalation needs no counter, it simply applies again.
      addStatMod(ctx, userId,
        { stat: 'dodge', op: 'add', value: -a.guard!.dodgeLoss, source: a.id, scope: 'unit' }, a.id)
      break
    }
    default: {
      if (!a.area) {
        // The original bolt path, byte-for-byte: one power.used event carrying
        // the ledger. The control baselines and the replay viewer both speak
        // this shape, and a single-target power gained nothing from the loop.
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
        total = dmg.value
        break
      }
      const struck = powerBlastIdsOf(ctx, userId, targetId, abilityId)
      emit(ctx, 'power.used', a.id, {
        actor: userId, target: targetId, abilityId, name: a.name,
        distance: distance(u.hex, tg.hex), area: a.area, struck,
      })
      for (const id of struck) {
        const victim = unit(ctx, id)
        if (victim.lifeState !== 'standing') continue
        const dmg = resolvePowerDamage(ctx, u, victim, a, outgoingPenalty(ctx, u), incomingAbsorb(ctx, victim))
        const summed = dmg.ledger.reduce((s, r) => s + r.delta, 0)
        if (summed !== dmg.value) throw new Error(`power ledger does not reconcile: ${summed} vs ${dmg.value}`)
        emit(ctx, 'power.hit', a.id, {
          actor: userId, target: id,
          ledger: dmg.ledger.map((r) => ({ station: r.name, effectId: r.effectId, delta: r.delta })),
        })
        // Spend what the pipeline said Protection would absorb — same order as attacks.
        if (dmg.absorbed > 0) spendAbsorb(ctx, id, dmg.absorbed, a.id)
        applyDamage(ctx, id, dmg.value, a.id,
          dmg.absorbed > 0
            ? { actor: userId, abilityId, damageType: a.damageType, absorbed: dmg.absorbed }
            : { actor: userId, abilityId, damageType: a.damageType })
        total += dmg.value
      }
      break
    }
  }

  const readyAgain = ctx.state.turn + a.cooldown
  u.cooldowns[abilityId] = readyAgain
  emit(ctx, 'cooldown.set', a.id, { actor: userId, abilityId, readyOnTurn: readyAgain })
  return { damage: total }
}
