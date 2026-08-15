// Accuracy and damage stations, and the per-hit attack sequence.
//
// Ordering is a property of the STATION, never of the effect (COMBAT-SEQUENCE.md).
// Numbers are spaced so a station can be inserted later without renumbering anything.
// Integers only, one rounding rule: truncating integer division (Law 7).

import { distance } from './hex.js'
import { roll100 } from './rng.js'
import type { AttackDef, Ctx, Unit } from './types.js'
import { fireTriggers } from './trigger.js'
import { applyStatus, incomingAbsorb, outgoingPenalty, spendAbsorb } from './status.js'
import { effective, stat } from './stats.js'
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

export type Resolved = {
  value: number
  ledger: LedgerRow[]
  /** How much absorbing statuses WOULD pay. Preview must never spend it. */
  absorbed: number
}

function step(ledger: LedgerRow[], station: number, name: string, effectId: string, before: number, after: number): number {
  if (before !== after) ledger.push({ station, name, effectId, before, after, delta: after - before })
  return after
}

/**
 * Effective reach. The Reach stat carries everything that adds to it — the hero's
 * own Reach, high ground, and later gear — so this no longer knows about terrain.
 */
export function reachOf(ctx: Ctx, u: Unit, a: AttackDef): number {
  return a.kind === 'ranged' ? a.reach + stat(ctx, u, 'reach') : a.reach
}

/**
 * The accuracy pipeline. NOTE: the value is deliberately NOT clamped —
 * Crit reads (final − 100) ÷ 4, so clamping here would silently delete crit surplus.
 * Only the roll comparison clamps.
 */
export function resolveAccuracy(ctx: Ctx, attacker: Unit, target: Unit, a: AttackDef): Resolved {
  const ledger: LedgerRow[] = []
  const d = distance(attacker.hex, target.hex)

  // BASE is now the resolved Accuracy stat. Terrain, gear and badges all arrive
  // through the stat pipeline, so this station stopped knowing about any of them —
  // and the sub-ledger keeps the provenance that the old TERRAIN station carried.
  const acc = effective(ctx, attacker, 'accuracy')
  let v = acc.base
  ledger.push({ station: ACC.BASE, name: 'BASE', effectId: `unit.${attacker.typeId}`, before: 0, after: v, delta: v })
  for (const row of acc.ledger) {
    ledger.push({ station: ACC.BASE, name: 'BASE_MOD', effectId: row.source, before: row.from, after: row.to, delta: row.delta })
  }
  v = acc.value

  if (a.kind === 'ranged' && d > 1) v = step(ledger, ACC.RANGE, 'RANGE', a.id, v, v - (d - 1) * 5)
  if (a.kind === 'ranged' && d === 1) v = step(ledger, ACC.ADJACENT, 'ADJACENT', a.id, v, v - 20)
  // CONDITION, SITUATIONAL: nothing live yet.
  const dodge = effective(ctx, target, 'dodge')
  v = step(ledger, ACC.TARGET_DODGE, 'TARGET_DODGE', `unit.${target.typeId}`, v, v - dodge.value)
  return { value: v, ledger, absorbed: 0 }
}

export function resolveDamage(
  ctx: Ctx, attacker: Unit, target: Unit, a: AttackDef, crit: boolean,
  outPenalty = 0, absorbAvailable = 0,
): Resolved {
  const ledger: LedgerRow[] = []
  let v = a.bonus
  ledger.push({ station: DMG.DECLARE, name: 'DECLARE', effectId: a.id, before: 0, after: v, delta: v })

  const src = effective(ctx, attacker, a.stat)
  v = step(ledger, DMG.SOURCE_STAT, 'SOURCE_STAT', `unit.${attacker.typeId}`, v, v + src.value)
  if (outPenalty) v = step(ledger, DMG.SOURCE_STATUS, 'SOURCE_STATUS', 'status', v, v - outPenalty)

  if (crit) {
    // +50%, before all mitigation. One rounding rule: truncating integer division.
    v = step(ledger, DMG.CRIT, 'CRIT', 'crit', v, Math.trunc((v * 3) / 2))
  }

  // PROTECTION (550): absorbs, and is spent by what it absorbs. Pure here —
  // the spending happens in performAttack, so preview cannot consume anything.
  let absorbed = 0
  if (absorbAvailable > 0 && v > 0) {
    absorbed = Math.min(absorbAvailable, v)
    v = step(ledger, DMG.PROTECTION, 'PROTECTION', 'status.absorb', v, v - absorbed)
  }

  if (a.damageType !== 'true') {
    const mit = effective(ctx, target, a.damageType === 'physical' ? 'armor' : 'resist')
    v = step(ledger, DMG.MITIGATION, 'MITIGATION', `unit.${target.typeId}`, v, v - mit.value)
  }

  if (v < 0) v = step(ledger, DMG.FLOOR, 'FLOOR', 'engine', v, 0)
  return { value: v, ledger, absorbed }
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
  return distance(at.hex, tg.hex) <= reachOf(ctx, at, a)
}

/** Preview: the same pipeline, run without applying. Law 1 — never a second formula. */
export function preview(ctx: Ctx, attackerId: number, targetId: number, attackId: string) {
  const at = unit(ctx, attackerId)
  const tg = unit(ctx, targetId)
  const a = ctx.attacks[attackId]!
  const acc = resolveAccuracy(ctx, at, tg, a)
  const hitChance = Math.max(0, Math.min(100, acc.value))
  return {
    hitChance,
    accuracy: acc.value,
    damageOnHit: resolveDamage(ctx, at, tg, a, false, outgoingPenalty(ctx, at), incomingAbsorb(ctx, tg)).value,
    damageOnCrit: resolveDamage(ctx, at, tg, a, true, outgoingPenalty(ctx, at), incomingAbsorb(ctx, tg)).value,
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
    // kind and damageType are on the event, not looked up from ATTACKS, so a
    // renderer can pick an animation without importing game content.
    kind: a.kind, damageType: a.damageType,
    distance: distance(at.hex, tg.hex), hitChance: pv.hitChance, damageOnHit: pv.damageOnHit,
  })

  // GAME-DESIGN §5: "onAttack always. Then onMiss or onHit. Then onDamage only if
  // damage landed." Every swing, hit or miss — this is where a Mage's burn-on-attack
  // fires, and it is deliberately NOT the same hook as a flaming bow's onHit.
  const fc = { ownerId: attackerId, targetId, causeId: a.id, ordinal: ord }
  fireTriggers(ctx, 'onAttack', fc)

  const roll = roll100(ctx.rng, 'to-hit', at.uid, ord)
  const hit = roll <= pv.hitChance

  if (!hit) {
    emit(ctx, 'attack.miss', a.id, { actor: attackerId, target: targetId, roll, hitChance: pv.hitChance })
    // The CALLER settles after performAttack (see ai/modes.ts) — including after a
    // miss, so an onMiss trigger that deals damage is picked up there. Settling here
    // too would nest a settle inside the caller's, which the reentrancy guard turns
    // into a silent no-op rather than an error.
    fireTriggers(ctx, 'onMiss', fc)
    return { hit: false, crit: false, accuracy: pv.accuracy, roll, damage: 0, killed: false }
  }

  let crit = false
  if (ctx.cfg.switches.critEnabled && pv.critChance > 0) {
    crit = roll100(ctx.rng, 'crit', at.uid, ord) <= pv.critChance
  }

  const dmg = resolveDamage(ctx, at, tg, a, crit, outgoingPenalty(ctx, at), incomingAbsorb(ctx, tg))

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

  // "The attack connected — even if armor absorbed all of it."
  fireTriggers(ctx, 'onHit', fc)

  // Spend what the pipeline said would be absorbed, before the damage lands.
  if (dmg.absorbed > 0) spendAbsorb(ctx, targetId, dmg.absorbed, a.id)

  const hpBefore = tg.hp
  applyDamage(ctx, targetId, dmg.value, a.id,
    dmg.absorbed > 0
      ? { actor: attackerId, attackId, crit, damageType: a.damageType, absorbed: dmg.absorbed }
      : { actor: attackerId, attackId, crit, damageType: a.damageType })

  // "At least 1 damage got through mitigation." applyDamage already computed
  // applied = min(amount, hpBefore), so absorbed-to-zero distinguishes itself.
  // Angela 2026-08-15, the canonical tail:
  //   "If damage is applied on damage triggers, then on taking damage triggers,
  //    then on kill triggers if there's a kill."
  const applied = Math.min(dmg.value, hpBefore)
  if (applied > 0) {
    fireTriggers(ctx, 'onDamage', fc)
    // onTakingDamage belongs to the VICTIM, so the owner flips. From the victim's
    // side the "target" is whoever hit it — which is what a thorns or a retaliation
    // trigger needs to aim at.
    fireTriggers(ctx, 'onTakingDamage',
      { ownerId: targetId, targetId: attackerId, causeId: a.id, ordinal: ord })
  }
  if (tg.hp === 0 && applied > 0) fireTriggers(ctx, 'onKill', fc)

  // The legacy `applies` rider — a hardcoded 100% onHit trigger with no chance and
  // no hook. Kept working until its content moves to a real trigger, then deleted.
  if (a.applies && tg.lifeState === 'standing') {
    applyStatus(ctx, targetId, a.applies.statusId, a.applies.value, a.id)
  }

  return {
    hit: true, crit, accuracy: pv.accuracy, roll,
    damage: Math.min(dmg.value, hpBefore),
    killed: tg.hp === 0,
  }
}
