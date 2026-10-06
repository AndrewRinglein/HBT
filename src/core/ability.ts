// Class and item powers. A primary action that is not an attack.
//
// A power spends the primary action, costs stamina, and goes on cooldown.
// It does not roll to hit — Design Law 23: if it rolls, it can crit; if it
// doesn't roll, it can't. `powerRollsToHit` is a switch if that should change.
//
// What a power DOES is its effects list (ability.effects, 2026-09-03), applied in row order to its
// resolved targets by THE one effect interpreter (trigger.ts applyEffect). fix.one-effect-vocabulary
// (2026-10-01) retired the three legacy shapes this file once spoke (capability.item-powers,
// 2026-08-27 — damage, heal, selfGuard): the Holy Symbol's Heal and the TEST Arcane Bolt are effects
// lists now, and Block's Protection is its row's status.apply.

import type { AbilityDef, Ctx, Unit } from './types.js'
import { breakStatuses, corpsesNear, emit, loseFreeAttack, unit, placeTrap, setAiming } from './mutate.js'
import { freeAttackKindOf } from './special-free-attacks.js'
import { actionReady, isPower, spendAction , resolveActionSlot } from './action.js'
export { readyOn, isReady } from './action.js'
import { resolveTargets, hasAnyTarget } from './target.js'
import { resolveDamage } from './pipeline.js'
import type { DamageSource } from './pipeline.js'
import { incomingAbsorb, outgoingPenalty, untargetableBy } from './status.js'
import { applyEffect } from './trigger.js'
import { canSee } from './vision.js'
import { forkBattle } from './fork.js'
import { passableHexes } from './props.js'

export function abilityDef(ctx: Ctx, id: string): AbilityDef {
  const a = ctx.actions[id]
  if (!a) throw new Error(`unknown ability '${id}' — abilities are an explicit registry, check content/index.ts`)
  if (!isPower(a)) throw new Error(`'${id}' is not a power — it carries an attack or movement profile`)
  return a
}

/**
 * A power's one stat-damage effect as THE pipeline's DamageSource — loud when it has none.
 * fix.one-effect-vocabulary (2026-10-01): read off the effects list; the legacy stat/bonus/damageType
 * fields it read before are retired.
 */
function damageSourceOf(a: AbilityDef): DamageSource {
  const e = a.effects?.find((x) => x.kind === 'statDamage')
  if (!e || e.kind !== 'statDamage') throw new Error(`ability '${a.id}' is not a damage power — its effects carry no statDamage`)
  return { id: a.id, stat: e.stat, bonus: e.bonus, damageType: e.damageType }
}

/** The one legality answer for powers (Law 2). Legality is the ONE targeting vocabulary. */
export function canUsePower(ctx: Ctx, userId: number, targetId: number, abilityId: string, slot?: import('./types.js').ActionSlot): boolean {
  const u = unit(ctx, userId)
  const tg = unit(ctx, targetId)
  const a = ctx.actions[abilityId]
  if (!a || !isPower(a)) return false
  // capability.stabilise-downed-ally (2026-10-05): a power aimed at "one downed ally" lands on a downed unit and on no other;
  // every other power lands on the standing only, as it always did
  const onTheDowned = a.target?.select === 'unit' && a.target.life === 'downed'
  if (u.lifeState !== 'standing' || tg.lifeState !== (onTheDowned ? 'downed' : 'standing')) return false
  // Dazed — station.crit (2026-08-27): "loses access to class powers".
  // A status FLAG, not a hardcoded name: any status declaring locksPowers.
  for (const s of u.statuses) {
    if (s.value > 0 && ctx.statuses[s.id]?.locksPowers) return false
  }
  // capability.vision: an enemy you cannot see is not a target
  if (tg.side !== u.side && !ctx.cfg.switches.targetUnseen && !canSee(ctx, u, tg)) return false
  // capability.stealth (2026-09-28): a power AIMED at a foe — one unit, or an area centred on it — may
  // not name an untargetable one. An area from the caster is aimed at nobody, and still reaches it
  // (SWITCHES.md stealthPowerAim).
  const aimedAt = a.target?.select === 'unit' || (a.target?.select === 'area' && a.target.origin === 'target')
  if (aimedAt && untargetableBy(ctx, u, tg)) return false
  // refactor.one-action-type: THE ONE LIMITS CHECK — granted, stamina, cooldown/warmup, uses
  if (!actionReady(ctx, u, a)) return false
  const effects = a.effects ?? []
  // capability.corpses: a power that eats needs a body in reach — legality, not a fizzle
  for (const e of effects) if (e.kind === 'corpse.eat' && corpsesNear(ctx, u.hex, e.radius).length === 0) return false
  // ability.effects (2026-09-03): legality is the ONE targeting vocabulary.
  const t = a.target ?? { select: 'self', side: 'any' as const }
  if (t.select === 'hex') return false   // capability.summons: a hex-aimed power is used on a hex (canUsePowerAt), never on a unit
  if (t.select === 'self') { if (targetId !== userId) return false }
  else if (t.select === 'unit') {
    if (t.side === 'ally' && u.side !== tg.side) return false
    if (t.side === 'enemy' && u.side === tg.side) return false
    // healIncludesSelf (SWITCHES.md, 2026-08-27): "one ally" includes the caster unless the switch says no —
    // kept when the Holy Symbol's Heal moved from the retired 'heal' shape to its effects list
    if (targetId === userId && !ctx.cfg.switches.healIncludesSelf && effects.some((e) => e.kind === 'heal')) return false
    if (!hasAnyTarget(ctx, u, t, a.range) || resolveTargets(ctx, u, t, targetId).length === 0) return false
  } else {
    // an area measures from its origin — self needs nobody aimed at; target does
    if ((t.origin ?? 'self') === 'target') {
      if (t.side === 'ally' && u.side !== tg.side) return false
      if (t.side === 'enemy' && u.side === tg.side) return false
    }
    const aim = (t.origin ?? 'self') === 'target' ? targetId : userId
    if (resolveTargets(ctx, u, t, aim).length === 0) return false
  }
  if (resolveActionSlot(ctx, u, a, slot) === null) return false
  return (t.select === 'self' || (t.select === 'area' && (t.origin ?? 'self') === 'self')) ? true : ctx.geo.distance(u.hex, tg.hex) <= a.range
}

/**
 * LAW 1, RESTORED (2026-08-20). This WAS a second damage pipeline — DECLARE →
 * SOURCE_STAT → MITIGATION → FLOOR, hand-rolled, skipping SOURCE_STATUS, CRIT and
 * PROTECTION. Now it is a call into THE pipeline with crit forced false (Design
 * Law 23: powers do not roll, so they cannot crit), for the power's statDamage effect.
 */
export function resolvePowerDamage(
  ctx: Ctx, user: Unit, target: Unit, a: AbilityDef, outPenalty = 0, absorbAvailable = 0,
) {
  return resolveDamage(ctx, user, target, damageSourceOf(a), false, outPenalty, absorbAvailable)
}

export function previewPower(ctx: Ctx, userId: number, targetId: number, abilityId: string) {
  const a = abilityDef(ctx, abilityId)
  // Law 0, measured (fix.one-effect-vocabulary, 2026-10-01): a power whose one effect is a statDamage on the
  // unit it is aimed at needs no fork — the fork would make exactly this one pipeline call (Law 1), and cloning
  // the battle for it cost the TEST cohort's battles 30% (771 → 1006 ms for 20; the AI previews it per candidate).
  const only = a.effects?.length === 1 ? a.effects[0]! : undefined
  if (only?.kind === 'statDamage' && only.who !== 'self' && a.target?.select === 'unit') {
    const u = unit(ctx, userId), tg = unit(ctx, targetId)
    const lands = tg.lifeState === 'standing' && powerTargetsOf(ctx, userId, targetId, a).includes(targetId)
      && !(tg.side === u.side && (only.allies ?? 'always') === 'never')
    const damage = lands ? resolvePowerDamage(ctx, u, tg, a, outgoingPenalty(ctx, u), incomingAbsorb(ctx, tg)).value : 0
    return { damage, heal: 0, healingApplied: 0, selfDamage: 0, selfDamageApplied: 0, hitChance: 100 }
  }
  // Law 1: run the ordered effects, including all resolved area targets.
  // The fork consumes its own pools and applies preceding status/stat changes;
  // neither its events nor any lookahead rolls escape into the live battle.
  // Law 0, measured (fix.one-effect-vocabulary): a heal-only power aimed at one unit changes only that unit, so it
  // runs on the attack preview's private target-only fork (pipeline.ts previewAttackDamage) — the same effects,
  // without cloning the battle the AI previews it in every activation (the audit's battles: 22.5 s → 26 s with the clone).
  const healOnly = a.target?.select === 'unit' && !!a.effects?.length && a.effects.every((e) => e.kind === 'heal' && e.who !== 'self')
  let dry: Ctx
  if (healOnly) {
    const units = [...ctx.state.units]; units[targetId] = structuredClone(unit(ctx, targetId))
    dry = { ...ctx, state: { ...ctx.state, units }, events: [] }
  } else dry = forkBattle(ctx)
  performEffects(dry, userId, targetId, a)
  let damage = 0, heal = 0, healingApplied = 0, selfDamage = 0, selfDamageApplied = 0
  for (const e of dry.events) {
    if (e.type === 'damage.applied' && e.target === userId && e.causeId === a.id) {
      selfDamageApplied += e['amount'] as number
      selfDamage += (e['amount'] as number) + (e['overkill'] as number)
    }
    if (e.target !== targetId || e.causeId !== a.id) continue
    if (e.type === 'power.hit') {
      damage += (e['ledger'] as { delta: number }[]).reduce((sum, r) => sum + r.delta, 0)
    } else if (e.type === 'heal.applied') {
      heal += e['asked'] as number
      healingApplied += e['amount'] as number
    }
  }
  return { damage, heal, healingApplied, selfDamage, selfDamageApplied, hitChance: 100 }
}

export function usePower(ctx: Ctx, userId: number, targetId: number, abilityId: string, slot?: import('./types.js').ActionSlot): { damage: number } {
  const u = unit(ctx, userId)
  const tg = unit(ctx, targetId)
  const a = abilityDef(ctx, abilityId)
  if (!canUsePower(ctx, userId, targetId, abilityId, slot)) {
    throw new Error(`illegal power: ${u.name} -> ${tg.name} with ${abilityId}`)
  }
  // refactor.one-action-type: THE ONE SPEND — stamina, the primary (unless free), the cooldown, a use.
  spendAction(ctx, userId, a, resolveActionSlot(ctx, u, a, slot)!)
  // capability.stealth (2026-09-28): "It breaks the moment you use ... a power" —
  // before the power's effects, so a power that grants stealth grants it afresh
  // (Vanish in Shadow: "another power"). A movement is not a power (movement.ts
  // never calls this): SWITCHES.md stealthMovement.
  breakStatuses(ctx, userId, 'power', a.id)
  return { damage: performEffects(ctx, userId, targetId, a) }
}

// ── ability.effects (2026-09-03) ────────────────────────────────────────────
// The effect list, applied in row order to the power's resolved targets. Every
// number comes from the same functions the rest of the engine uses: damage
// through resolveDamage (Law 1), healing through applyHealing, statuses through
// applyStatus/reduceStatus, stat modifiers through addStatMod with a stated
// lifetime. `who: 'self'` lands an effect on the caster whatever the targeting
// says (Fortify: "every ally within 3 gains +1 Armor; YOU gain +3 Health").

// ── capability.summons (2026-10-05): a power aimed at an empty HEX ──────────
// `target: { select: 'hex' }`: the power is used ON a hex within its range that nobody stands on, and what it does there is
// its effect list's (a summon: one unit of a named row arrives on that hex, on the caster's side). The same limits check,
// spend and status breaks as every power; no unit is aimed at.

/** Passable, in range of the caster, and nobody standing or downed on it. */
function emptyHexInRange(ctx: Ctx, u: Unit, hex: number, range: number): boolean {
  if (!Number.isSafeInteger(hex) || hex < 0 || hex >= ctx.geo.hexCount) return false
  const d = ctx.geo.distance(u.hex, hex)
  if (d < 1 || d > range) return false
  if (!passableHexes(ctx)(hex)) return false
  return !ctx.state.units.some((o) => o.lifeState !== 'dead' && o.hex === hex)
}
export function canUsePowerAt(ctx: Ctx, userId: number, hex: number, abilityId: string, slot?: import('./types.js').ActionSlot): boolean {
  const u = unit(ctx, userId)
  const a = ctx.actions[abilityId]
  if (!a || !isPower(a) || a.target?.select !== 'hex') return false
  if (u.lifeState !== 'standing') return false
  for (const s of u.statuses) if (s.value > 0 && ctx.statuses[s.id]?.locksPowers) return false
  // capability.placed-traps (2026-10-05): a use aimed at several hexes (`hexes: N`) — after the first, each further hex is
  // the SAME use: the Stamina, the action and the use are spent already, so only the hex is asked about
  const more = u.aiming?.actionId === a.id && u.aiming.left > 0
  if (!more) {
    if (!actionReady(ctx, u, a)) return false
    if (resolveActionSlot(ctx, u, a, slot) === null) return false
  }
  for (const e of a.effects ?? []) {
    if (e.kind === 'summon' && (!ctx.units?.[e.unit] || !ctx.arrive)) return false
    if (e.kind === 'trap.place' && (ctx.state.traps ?? []).some((t) => t.hex === hex)) return false   // one trap to a hex
  }
  return emptyHexInRange(ctx, u, hex, a.range)
}
/** Every hex this power may be used on right now, ascending (Law 6). */
export function powerHexesOf(ctx: Ctx, userId: number, abilityId: string): number[] {
  const u = unit(ctx, userId)
  const a = ctx.actions[abilityId]
  if (!a || a.target?.select !== 'hex') return []
  const out: number[] = []
  for (let h = 0; h < ctx.geo.hexCount; h++) if (ctx.geo.distance(u.hex, h) <= a.range && canUsePowerAt(ctx, userId, h, abilityId)) out.push(h)
  return out
}
export function usePowerAt(ctx: Ctx, userId: number, hex: number, abilityId: string, slot?: import('./types.js').ActionSlot): void {
  const u = unit(ctx, userId)
  const a = abilityDef(ctx, abilityId)
  if (!canUsePowerAt(ctx, userId, hex, abilityId, slot)) throw new Error(`illegal power: ${u.name} -> hex ${hex} with ${abilityId}`)
  // capability.placed-traps: the first hex of a use is the use — spend, break, one power.used line saying how many hexes it
  // is aimed at; each further hex of the same use spends nothing and says no second power.used
  const more = u.aiming?.actionId === a.id && u.aiming.left > 0
  if (more) setAiming(ctx, userId, { actionId: a.id, left: u.aiming!.left - 1 })
  else {
    spendAction(ctx, userId, a, resolveActionSlot(ctx, u, a, slot)!)
    breakStatuses(ctx, userId, 'power', a.id)
    emit(ctx, 'power.used', a.id, { actor: userId, target: null, hex, abilityId: a.id, name: a.name, distance: ctx.geo.distance(u.hex, hex), targets: [], ...(a.free ? { free: true } : {}), ...((a.hexes ?? 1) > 1 ? { hexes: a.hexes } : {}) })
    setAiming(ctx, userId, (a.hexes ?? 1) > 1 ? { actionId: a.id, left: a.hexes! - 1 } : null)
  }
  for (const e of a.effects ?? []) {
    if (e.kind === 'trap.place') { placeTrap(ctx, userId, hex, e, a.id); continue }
    if (e.kind === 'summon') {
      const row = ctx.units![e.unit]!
      // on the caster's side, whatever side its row is written for (as a form that changes sides keeps its row's side: rowSide)
      const arrived = ctx.arrive!(ctx, row.side === u.side ? row : { ...row, side: u.side, rowSide: row.rowSide ?? row.side }, hex, a.id)
      arrived.summoned = true
      arrived.summonedBy = userId
      emit(ctx, 'unit.summoned', a.id, { actor: userId, summoned: arrived.id, typeId: arrived.typeId, hex: arrived.hex, side: arrived.side })
      continue
    }
    // the kinds that are the caster's own land on the caster; a kind that needs a unit aimed at has none here (pack.ts refuses the row)
    if ('who' in e && e.who === 'self') applyEffect(ctx, e, { causeId: a.id, actor: userId, by: userId, abilityId: a.id }, userId)
  }
}

/** The units a power's targeting resolves to, given what it was aimed at. */
export function powerTargetsOf(ctx: Ctx, userId: number, targetId: number, a: AbilityDef): number[] {
  const u = unit(ctx, userId)
  const t = a.target ?? { select: 'self', side: 'any' as const }
  const aim = t.select === 'area' && (t.origin ?? 'self') === 'self' ? userId : targetId
  return resolveTargets(ctx, u, t, aim)
}

function performEffects(ctx: Ctx, userId: number, targetId: number, a: AbilityDef): number {
  const u = unit(ctx, userId)
  const targets = powerTargetsOf(ctx, userId, targetId, a)
  emit(ctx, 'power.used', a.id, {
    actor: userId, target: targetId, abilityId: a.id, name: a.name,
    distance: ctx.geo.distance(u.hex, unit(ctx, targetId).hex), targets, ...(a.free ? { free: true } : {}),
  })
  // rule.counterattack-replaced-and-lost (2026-10-04; "A new counterattack replaces the old one"): a power that grants a
  // special free attack first takes away the one its receiver has up — before any of this power's own effects, so the
  // order of its effect list does not matter and nothing it is about to place is taken for the older one's.
  for (const e of a.effects!) {
    const kind = e.kind === 'statMod' && e.value > 0 ? freeAttackKindOf(e.stat) : undefined
    if (!kind) continue
    for (const id of e.who === 'self' ? [userId] : targets) if (unit(ctx, id).lifeState === 'standing') loseFreeAttack(ctx, id, kind, 'replaced', a.id, true)
  }
  let total = 0
  for (const e of a.effects!) {
    // `who: 'self'` and the kinds that are only ever the one acting's own (a move's riders, on a power too)
    const ids = e.who === 'self' || e.kind === 'loseMaxStamina' || e.kind === 'stand' ? [userId] : targets
    for (const id of ids) {
      // … on the standing only — but a power aimed at a downed unit lands on the one it was aimed at (capability.stabilise-downed-ally)
      const life = unit(ctx, id).lifeState
      if (life !== 'standing' && !(life === 'downed' && a.target?.select === 'unit' && a.target.life === 'downed' && id !== userId)) continue
      total += applyEffect(ctx, e, { causeId: a.id, actor: userId, by: userId, abilityId: a.id }, id)
    }
  }
  return total
}
