// Accuracy and damage stations, and the per-hit attack sequence.
//
// Ordering is a property of the STATION, never of the effect (COMBAT-SEQUENCE.md).
// Numbers are spaced so a station can be inserted later without renumbering anything.
// Integers only, one rounding rule: truncating integer division (Law 7).

import { absorbDamage, flatDamage } from './mitigation.js'
import type { Geometry, HexId } from './hex.js'
import { roll100 } from './rng.js'
import type { AttackDef, Ctx, Unit, VsTargetRule } from './types.js'
import { fireTriggers, HOOKS, partySum } from './trigger.js'
import { applyStatus, decayOnKill, incomingAbsorb, incomingPhysicalBonus, outgoingBonus, outgoingPenalty, proneRulesOf, spendAbsorb, untargetableBy, countDownByAttack } from './status.js'
import { rollCritEffect } from './crit.js'
import { effective, stat } from './stats.js'
import { SPECIAL_FREE_ATTACKS } from './special-free-attacks.js'
import { accelerateBleedOut, applyAttackPackets, breakStatuses, damageProp, emit, powerOf, unit, recordBlock } from './mutate.js'
import { propsTouching } from './props.js'
import { actionReady, isAttack, spendAction, resolveActionSlot , carriesTag } from './action.js'
import { settle } from './settle.js'
import { canSee } from './vision.js'
import { attackLineClear } from './los.js'
import { hasLowCover } from './cover.js'
import { accuracyAgainstOf, rangedAccuracyOf, terrainIdOf, THIN_OBSTRUCTION } from '../content/maps.js'
import { thinObstructionsOnLine } from './obstruction.js'
import { kdbChanceOf, kdbTarget, resolveKdb } from './kdb.js'
import { reflectThorns, thornsOnHit } from './thorns.js'
import { rulesSideOf } from './side.js'
import { attackPacketFields } from './attack-profile.js'
import { structureGuard, structureReachOf } from './structure.js'
import { freeAttackChoice } from './free-attack.js'

export const ACC = {
  BASE: 100,
  RANGE: 200,
  ADJACENT: 300,
  /** v2.ground-table (§3.2): the ground the TARGET stands in, by attack kind — concealment. Revived; v1's occupied-hex rung was retired into BASE_MOD. */
  TERRAIN: 400,
  /** v2.structures: the target's wall, tower or house against an enemy not in the same kind — −20 / −25 / −10. */
  STRUCTURE: 425,
  /** v2.thin-obstruction: −5 per thin-obstruction hex a RANGED shot enters (through, and the target's own; never the shooter's). One row per hex. */
  OBSTRUCTION: 450,
  CONDITION: 500,
  /** v2.prone (§10): +N against a prone target, −N for a prone attacker. */
  PRONE: 550,
  COVER: 575,
  TARGET_DODGE: 600,
  SITUATIONAL: 700,
  /** NOT YET — the clamp happens in `preview()` and writes no ledger row (COMBAT-SEQUENCE). See UNWIRED_STATIONS. */
  FINAL: 900,
} as const

export const DMG = {
  DECLARE: 100,
  SOURCE_STAT: 200,
  /** capability.power-pool (2026-09-03): the enemy side's Power, by the attack's share. */
  POWER: 225,
  SOURCE_STATUS: 250,
  /**
   * RETIRED — do not rebuild. Terrain moved into the stat pipeline (an occupied hex's
   * mods arrive as stat modifiers, then V2 concealment at ACC.TERRAIN); nothing writes
   * a damage row here. Kept so the number is never reused. See UNWIRED_STATIONS.
   */
  TERRAIN: 300,
  /** NOT YET — flank: nothing computes facing or flanking (COMBAT-SEQUENCE). See UNWIRED_STATIONS. */
  POSITIONAL: 350,
  /**
   * station.vs-target (2026-09-25): damage by what the target IS (a tag) or CARRIES (a
   * status). Before CRIT so a crit multiplies it — "the bonus is crit-amplified", the
   * 2026-08-20 ruling and its amendment both; COMBAT-SEQUENCE's 500 is DMG.PRONE's now
   * (SWITCHES.md 'station.vs-target', vsTargetStation).
   */
  VS_TARGET: 400,
  /** V2 bursts: an onBurst/self save scales the burst's damage by a percent, after cover and before Protection (fix.one-effect-vocabulary: was the literal 545 in burst.ts). */
  BURST_SAVE: 545,
  CRIT: 450,
  /** v2.prone (§10): flat ±N after the crit multiplier, like cover (SWITCHES.md proneStationOrder). */
  PRONE: 500,
  COVER: 525,
  /** capability.frost (2026-09-03): Frost on the target, physical hits only, before Armor. */
  FROST: 540,
  PROTECTION: 550,
  MITIGATION: 600,
  FLOOR: 700,
  /** NOT YET as a row — `applyDamage` is a mutator, not a ledger step (COMBAT-SEQUENCE). See UNWIRED_STATIONS. */
  APPLY: 850,
} as const

/**
 * fix.retired-stations (2026-09-25): the stations nothing writes, and why. `retired`
 * — it once had a writer and must not be "fixed" back; `notYet` — a reserved slot the
 * design still owes. Every other station has a live writer. `test/station-tables.test.ts`
 * holds this list to the code in both directions.
 */
export const UNWIRED_STATIONS: {
  acc: Partial<Record<keyof typeof ACC, 'retired' | 'notYet'>>
  dmg: Partial<Record<keyof typeof DMG, 'retired' | 'notYet'>>
} = {
  acc: { FINAL: 'notYet' },
  dmg: { TERRAIN: 'retired', POSITIONAL: 'notYet', APPLY: 'notYet' },
}

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
 * Is a living enemy standing next to this unit?
 *
 * This is the condition on the ranged adjacency penalty, and it is about the
 * SHOOTER's surroundings, not about where the target is. GAME-DESIGN.md §4:
 *
 *   "− 20 if you are adjacent to an enemy   (ranged only)"
 *   "Ranged cannot target an adjacent enemy at all. You may shoot PAST it at
 *    something distant, at −20."
 *
 * Angela, 2026-08-15: "You cannot use a ranged attack on something adjacent. You
 * can use a ranged attack on something not adjacent at -20."
 *
 * Until 2026-08-15 the engine had this inside out — it charged −20 for shooting the
 * adjacent enemy (which is now illegal) and charged nothing for shooting past one
 * (which is the case the rule exists for). Both halves were wrong at once, so no
 * test caught it: the penalty was always being paid by somebody.
 */
export function inMelee(ctx: Ctx, u: Unit): boolean {
  for (const o of ctx.state.units) {
    if (o.side === u.side || o.lifeState !== 'standing') continue
    if (ctx.geo.distance(u.hex, o.hex) === 1) return true
  }
  return false
}

/**
 * Effective reach. The Reach stat carries everything that adds to it — the hero's
 * own Reach, high ground, and later gear — so this no longer knows about terrain.
 */
export function reachOf(ctx: Ctx, u: Unit, a: AttackDef): number {
  // v2.structures: a wall's +1 and a tower's +2 are for EVERY attack (Andrew 2026-09-24:
  // "Wall and tower do not apply to range attacks only") — the Reach stat stays ranged-only.
  return (a.attack.kind === 'ranged' ? a.range + stat(ctx, u, 'reach') : a.range) + structureReachOf(ctx, u)
}

/**
 * The accuracy pipeline. NOTE: the value is deliberately NOT clamped —
 * Crit reads (final − 100) ÷ 4, so clamping here would silently delete crit surplus.
 * Only the roll comparison clamps.
 */
export function resolveAccuracy(ctx: Ctx, attacker: Unit, target: Unit, a: AttackDef, mode?: AttackMode, as?: FreeAttackKind): Resolved {
  const ledger: LedgerRow[] = []
  const d = ctx.geo.distance(attacker.hex, target.hex)

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

  // RULED 2026-08-26: "no ranged penalty up to 3 tiles away, and the range
  // penalty starts at the 4th tile" — 4th is −5, 5th is −10, 6th is −15.
  // Was −5 per hex past the FIRST; the grace window is now three tiles.
  if (a.attack.kind === 'ranged' && d > 3) v = step(ledger, ACC.RANGE, 'RANGE', a.id, v, v - (d - 3) * 5)
  // The shooter's own surroundings, not the target's distance. See inMelee().
  if (a.attack.kind === 'ranged' && inMelee(ctx, attacker)) {
    v = step(ledger, ACC.ADJACENT, 'ADJACENT', a.id, v, v - 20)
  }
  // TERRAIN (400) — V2 concealment (v2.ground-table, COMBAT-V2 §3.2): grass, wheat
  // and bush hide their occupant from ranged attacks, woodland from both. It reads
  // the TARGET's ground, whoever shoots; independent of cover, and stacks with it.
  // ELEVATION, same rung — the SHOOTER's ground: hills give +10 to ranged attacks only
  // (v2.retire-forest-hills, Andrew 2026-09-24: "It's only 10 ranged accuracy").
  if (a.attack.kind === 'ranged') {
    const from = ctx.state.terrain[attacker.hex] ?? 0
    const high = rangedAccuracyOf(from)
    if (high) v = step(ledger, ACC.TERRAIN, 'ELEVATION', terrainIdOf(from), v, v + high)
  }
  const hiddenIn = ctx.state.terrain[target.hex] ?? 0
  const concealment = accuracyAgainstOf(hiddenIn, a.attack.kind)
  if (concealment) v = step(ledger, ACC.TERRAIN, 'TERRAIN', terrainIdOf(hiddenIn), v, v + concealment)
  // STRUCTURE (425) — v2.structures (Andrew 2026-09-24): the target's wall, tower or house,
  // against an enemy attacker not in the same kind: −20 / −25 flat / −10. Every attack kind.
  const guard = structureGuard(ctx, attacker, target)
  if (guard?.accuracyAgainst) v = step(ledger, ACC.STRUCTURE, 'STRUCTURE', guard.id, v, v + guard.accuracyAgainst)
  // OBSTRUCTION (450) — v2.thin-obstruction (Andrew 2026-09-24): "If you shoot through a tile
  // that is woodland, you get -5"; "A thin obstruction in your own hex does not count against
  // your own shot, only against those who are shooting you or people who are shooting through
  // the hex." Ranged only. One row per hex, each naming what obstructed it (Law 12).
  if (a.attack.kind === 'ranged') {
    for (const o of thinObstructionsOnLine(ctx, attacker.hex, target.hex, true)) v = step(ledger, ACC.OBSTRUCTION, 'THIN_OBSTRUCTION', o.id, v, v + THIN_OBSTRUCTION.rangedAccuracy)
  }
  // CONDITION — the target's state. Downed: +20 (GAME-DESIGN §9, ruled;
  // fix.downed-targetable 2026-09-03). The row names the attack as its cause.
  if (target.lifeState === 'downed') v = step(ledger, ACC.CONDITION, 'TARGET_DOWNED', a.id, v, v + 20)
  // PRONE (550) — v2.prone, COMBAT-V2-DESIGN §10: the numbers are the status row's.
  for (const { statusId, rule } of proneRulesOf(ctx, attacker)) v = step(ledger, ACC.PRONE, 'ATTACKER_PRONE', statusId, v, v + rule.accuracy)
  for (const { statusId, rule } of proneRulesOf(ctx, target)) v = step(ledger, ACC.PRONE, 'TARGET_PRONE', statusId, v, v + rule.accuracyAgainst)
  // SITUATIONAL — the attack's own modifier (station.accuracy-field, 2026-09-03).
  if (a.attack.accuracy) v = step(ledger, ACC.SITUATIONAL, 'SITUATIONAL', a.id, v, v + a.attack.accuracy)
  // capability.summons (2026-10-05): the attack's Accuracy against a kind of target — the flag `summon` (a summoned unit) or
  // a unit tag — one row for the kinds the target is, in the row's own order (Law 6).
  if (a.attack.accuracyVs) {
    const vs = Object.entries(a.attack.accuracyVs).reduce((n, [kind, add]) => n + ((kind === 'summon' ? target.summoned : target.tags.includes(kind)) ? add : 0), 0)
    if (vs) v = step(ledger, ACC.SITUATIONAL, 'ACCURACY_VS', a.id, v, v + vs)
  }
  // rule.free-attack-is-basic-attack: a special free attack (the attack of opportunity) swings at the ruled penalty — its own named row
  if (mode === 'reaction') v = step(ledger, ACC.SITUATIONAL, 'FREE_ATTACK', FREE_ATTACK_CAUSE, v, v + FREE_ATTACK_ACCURACY)
  // capability.counterattack-and-fend: a counterattack and a fend add their own Accuracy stat ("counterattack with +10 Accuracy")
  if (mode === 'reaction' && as !== undefined) {
    const bonus = effective(ctx, attacker, FREE_ATTACK_STATS[as].accuracy).value
    if (bonus) v = step(ledger, ACC.SITUATIONAL, 'FREE_ATTACK_BONUS', FREE_ATTACK_STATS[as].cause, v, v + bonus)
  }
  // capability.free-attack-accuracy (2026-10-04; "Bonuses 'to special attacks' … apply to all three"): the attacker's
  // Accuracy on EVERY special free attack — the counterattack, the fend and the attack of opportunity — its own named row
  if (mode === 'reaction') {
    const all = effective(ctx, attacker, 'freeAttackAccuracy').value
    if (all) v = step(ledger, ACC.SITUATIONAL, 'FREE_ATTACK_ACCURACY', FREE_ATTACK_CAUSE, v, v + all)
  }
  if (a.attack.kind === 'ranged' && hasLowCover(ctx,attacker.hex,target.hex)) v = step(ledger,ACC.COVER,'COVER','cover',v,v-LOW_COVER_ACCURACY)
  const dodge = effective(ctx, target, 'dodge')
  v = step(ledger, ACC.TARGET_DODGE, 'TARGET_DODGE', `unit.${target.typeId}`, v, v - dodge.value)
  // the house's +5 Dodge against that enemy — its own row, naming the house (Law 12)
  if (guard?.dodge) v = step(ledger, ACC.TARGET_DODGE, 'TARGET_DODGE', guard.id, v, v - guard.dodge)
  // capability.free-attack-accuracy (2026-10-04; "'Dodge against special attacks' applies to all three"): the target's
  // Dodge against a special free attack, and against nothing else — its own row, naming the unit that has it
  if (mode === 'reaction') {
    const slip = effective(ctx, target, 'freeAttackDodge').value
    if (slip) v = step(ledger, ACC.TARGET_DODGE, 'FREE_ATTACK_DODGE', `unit.${target.typeId}`, v, v - slip)
  }
  return { value: v, ledger, absorbed: 0 }
}

/**
 * What the damage pipeline actually reads. AttackDef and AbilityDef both satisfy
 * it — which is the mechanism behind Law 1: powers do not get a second pipeline,
 * they get this one with crit forced false (Design Law 23: no roll, no crit).
 */
export type DamageSource = { readonly id: string; readonly bonus: number; readonly stat?: 'strength' | 'precision' | 'magic' | 'spirit'; readonly statMult?: number; readonly addsStats?: readonly { readonly stat: import('./stats.js').StatName; readonly mult: number; readonly div?: number }[]; readonly damageType: import('./types.js').DamageType; readonly powerScale?: number; readonly attackKind?: 'melee' | 'ranged'; readonly armorPenetration?: number }
/** An attack as the one damage function reads it — the profile with the action's id. */
export function damageSourceOfAttack(a: AttackDef): DamageSource {
  return { attackKind:a.attack.kind, id: a.id, bonus: a.attack.bonus, stat: a.attack.stat, damageType: a.attack.damageType, ...(a.attack.statMult !== undefined ? { statMult: a.attack.statMult } : {}), ...(a.attack.addsStats ? { addsStats: a.attack.addsStats } : {}), ...(a.attack.powerScale !== undefined ? { powerScale: a.attack.powerScale } : {}), ...(a.attack.armorPenetration!==undefined?{armorPenetration:a.attack.armorPenetration}:{}) }
}

/** Power × share, rounded nearest with 0.5 up — the ruled rounding (ENEMY-REVIEW P1). Integers only (Law 7). */
export function powerShare(pool: number, scale: number): number {
  return Math.floor(pool * scale + 0.5)
}

/** Shared source rung: bursts freeze this before any defender hooks. */
export function resolveSourceDamage(ctx: Ctx, attacker: Unit, a: DamageSource, outPenalty = 0) {
  const ledger: LedgerRow[] = []
  let v = a.bonus
  ledger.push({ station: DMG.DECLARE, name: 'DECLARE', effectId: a.id, before: 0, after: v, delta: v })
  // WEAPON_BONUS (at DECLARE) — seam.unit-mods (2026-09-25): +damage the fielding handed to
  // one weapon (a set bonus, "+1 Damage on this weapon", GEAR-DESIGN.md §5). The weapon's own
  // damage, so it sits with the declared number, before the stat and before the crit.
  // Attacks only; the item must grant this attack and be in hand; one row per bonus,
  // naming its source (Law 12). SWITCHES.md unitModsWeaponStation.
  if (a.attackKind) {
    for (const b of attacker.weaponBonuses ?? []) {
      if (!(attacker.loadout?.hands ?? []).some((h) => h.itemId === b.itemId)) continue
      if (!(ctx.items[b.itemId]?.grants ?? []).includes(a.id)) continue
      v = step(ledger, DMG.DECLARE, 'WEAPON_BONUS', b.source, v, v + b.damage)
    }
  }

  if (a.stat) {
    const src = effective(ctx, attacker, a.stat)
    // capability.damage-from-two-stats: the attack's own stat, counted as many times as the row says ("twice your Precision")
    v = step(ledger, DMG.SOURCE_STAT, 'SOURCE_STAT', `unit.${attacker.typeId}`, v, v + src.value * (a.statMult ?? 1))
  }
  // capability.damage-from-two-stats (2026-10-05): each added term, at the same station — a stat times its multiple over its
  // divisor, nearest with 0.5 up (Law 7: an integer, one stated rounding). Magic and Spirit are the side's total (partySum,
  // the number every "the party's Magic" reads); any other stat is the attacker's own, resolved. Its own row, named for whose
  // number it is (Law 12); a term that comes to 0 writes none.
  for (const t of a.addsStats ?? []) {
    const party = t.stat === 'magic' || t.stat === 'spirit'
    const raw = party ? partySum(ctx, attacker.side, t.stat as 'magic' | 'spirit') : effective(ctx, attacker, t.stat).value
    v = step(ledger, DMG.SOURCE_STAT, 'SOURCE_STAT_ADDED', party ? `party.${t.stat}` : `unit.${attacker.typeId}`, v, v + Math.floor((raw * t.mult) / (t.div ?? 1) + 0.5))
  }
  // POWER (225): the enemy side's pool, by this attack's share — capability.
  // power-pool (2026-09-03). Nearest, 0.5 up (Law 7). Zero pool, zero row.
  if (a.powerScale && rulesSideOf(ctx, attacker) === 'enemy') {   // proving.mirror-row-rules: the pool is a RULE of the enemy side
    const share = powerShare(powerOf(ctx), a.powerScale)   // capability.raise-lower-magic: the pool as it stands
    if (share) v = step(ledger, DMG.POWER, 'POWER', 'power', v, v + share)
  }
  // SOURCE_STATUS (250): what the attacker's statuses do to the number — Weak
  // takes, Karma gives half its value rounded down (capability.karma 2026-09-03).
  const outBonus = outgoingBonus(ctx, attacker)
  if (outPenalty || outBonus) v = step(ledger, DMG.SOURCE_STATUS, 'SOURCE_STATUS', 'status', v, v - outPenalty + outBonus)

  return { value: v, ledger }
}

/**
 * station.vs-target — the rules that reach this attacker's damage against this target,
 * in a fixed order (Law 6): the attacker's badges in the order it carries them, then the
 * items in its hands, then the items it wears, each rule in its row's order. A badge's
 * rules reach every damage through this function; a held item's reach only the actions
 * that item grants, and an item held twice counts once; a worn item's (a bloodrune's
 * slayer) reach every damage, like a badge's, one row per worn instance
 * (SWITCHES.md 'station.vs-target'). Pure — preview reads it too.
 */
export function vsTargetRules(ctx: Ctx, attacker: Unit, target: Unit, sourceId: string): { id: string; rule: VsTargetRule }[] {
  const out: { id: string; rule: VsTargetRule }[] = []
  const matches = (r: VsTargetRule): boolean => r.tag !== undefined
    ? target.tags.includes(r.tag)
    : r.status !== undefined && target.statuses.some((s) => s.id === r.status && s.value > 0)
  for (const b of attacker.badges) for (const rule of ctx.badges[b]?.vsTarget ?? []) if (matches(rule)) out.push({ id: b, rule })
  const seen = new Set<string>()
  for (const h of attacker.loadout?.hands ?? []) {
    const it = ctx.items[h.itemId]
    if (!it?.vsTarget || seen.has(it.id) || !it.grants.includes(sourceId)) continue
    seen.add(it.id)
    for (const rule of it.vsTarget) if (matches(rule)) out.push({ id: it.id, rule })
  }
  // fix.vs-target-worn-and-flat: "Bloodrune Slayer bonus happens" — every attack and power
  // (Andrew 2026-09-25, DECISIONS.md), so no grants check; each worn instance counts
  for (const w of attacker.loadout?.worn ?? []) {
    for (const rule of ctx.items[w.itemId]?.vsTarget ?? []) if (matches(rule)) out.push({ id: w.itemId, rule })
  }
  return out
}

export function resolveDamage(
  ctx: Ctx, attacker: Unit, target: Unit, a: DamageSource, critHeads: number | boolean,
  outPenalty = 0, absorbAvailable = 0,
): ResolvedDamage {
  // station.crit-count (2026-08-27): the CRIT station takes a HEADS COUNT —
  // +50% each, stacking, before mitigation. `true` still reads as one heads
  // so every existing caller and test keeps its meaning.
  const heads = critHeads === true ? 1 : critHeads === false ? 0 : critHeads
  const source = resolveSourceDamage(ctx, attacker, a, outPenalty)
  const ledger = source.ledger
  let v = source.value

  // VS_TARGET (400): one row per matching rule, naming the badge or item that carries it
  // (Law 12). A flat add — no percentages (Andrew 2026-09-25, DECISIONS.md).
  for (const { id, rule } of vsTargetRules(ctx, attacker, target, a.id)) {
    v = step(ledger, DMG.VS_TARGET, 'VS_TARGET', id, v, v + rule.add)
  }

  if (heads > 0) {
    // +50% PER HEADS-CRITICAL, before all mitigation — "do two criticals"
    // with two heads is +100%. One rounding rule: truncating integer division.
    v = step(ledger, DMG.CRIT, 'CRIT', 'crit', v, Math.trunc((v * (2 + heads)) / 2))
  }
  // PRONE (500) — v2.prone, §10: attacks only (a.attackKind), flat, after the crit multiplier.
  if (a.attackKind) {
    for (const { statusId, rule } of proneRulesOf(ctx, attacker)) v = step(ledger, DMG.PRONE, 'ATTACKER_PRONE', statusId, v, v + rule.damage)
    for (const { statusId, rule } of proneRulesOf(ctx, target)) v = step(ledger, DMG.PRONE, 'TARGET_PRONE', statusId, v, v + rule.damageAgainst)
  }
  // V2 flat cover subtraction is after critical multiplication, before absorption.
  if(a.attackKind && hasLowCover(ctx,attacker.hex,target.hex)) v=step(ledger,DMG.COVER,'COVER','cover',v,v-1)
  return finishDamage(ctx,target,a,ledger,v,absorbAvailable,a.damageType==='physical'?incomingPhysicalBonus(ctx,target):0,armorGuard(ctx,attacker,target))
}

/** v2.structures: the tower's +1 Armor against an enemy not also in a tower — what finishDamage reads. */
export type ArmorGuard = { readonly armor: number; readonly id: string }
function armorGuard(ctx: Ctx, attacker: Unit, target: Unit): ArmorGuard | undefined {
  const g = structureGuard(ctx, attacker, target)
  return g?.armor ? { armor: g.armor, id: g.id } : undefined
}

type ResolvedDamage = Resolved & { raw:number; defense:number; mitigationDelta:number; floorAdjustment:number; resisted:number }

/** Common tail. Secondary packets enter here, never through stat/Power/crit/cover stations. */
export function finishDamage(ctx:Ctx,target:Unit,a:Pick<DamageSource,'damageType'|'armorPenetration'>,ledger:LedgerRow[],v:number,absorbAvailable:number,frost:number,guard?:ArmorGuard):ResolvedDamage {
  // PROTECTION (550): absorbs, and is spent by what it absorbs. Pure here —
  // the spending happens in performAttack, so preview cannot consume anything.
  // FROST (540): the target's Frost adds to every PHYSICAL hit, per hit —
  // capability.frost (2026-09-03), before Armor (ruled) and, by the switch,
  // before Protection. Reads the target's statuses through one helper.
  const raw = v + frost
  if (frost && ctx.cfg.switches.frostBeforeProtection) v = step(ledger, DMG.FROST, 'FROST', 'status', v, v + frost)
  const { absorbed, remaining } = absorbDamage(v, absorbAvailable)
  if (absorbed > 0) v = step(ledger, DMG.PROTECTION, 'PROTECTION', 'status.absorb', v, remaining)
  if (frost && !ctx.cfg.switches.frostBeforeProtection) v = step(ledger, DMG.FROST, 'FROST', 'status', v, v + frost)

  const mit = flatDamage(ctx, target, v, a.damageType,0,a.armorPenetration??0,guard?.armor??0)
  if (a.damageType !== 'true') {
    // v2.structures: the structure's Armor is Armor (penetration reaches it too), written as
    // its own MITIGATION row naming the structure — the unit's own row is the rest.
    const own = guard ? flatDamage(ctx, target, v, a.damageType,0,a.armorPenetration??0).beforeFloor : mit.beforeFloor
    v = step(ledger, DMG.MITIGATION, 'MITIGATION', `unit.${target.typeId}`, v, own)
    if (guard) v = step(ledger, DMG.MITIGATION, 'STRUCTURE_ARMOR', guard.id, v, mit.beforeFloor)
  }

  const floorAdjustment=Math.max(0,-v)
  if (v < 0) v = step(ledger, DMG.FLOOR, 'FLOOR', 'engine', v, 0)
  return { value: v, ledger, absorbed, raw, defense:mit.defense, mitigationDelta:mit.defense===0?0:-mit.defense, floorAdjustment, resisted:mit.resisted }
}

export type DamagePacket = {
  readonly id:string; readonly source:string; readonly damageType:import('./types.js').DamageType
  readonly raw:number; readonly absorbed:number; readonly defense:number; readonly mitigationDelta:number
  readonly floorAdjustment:number; readonly resisted:number; readonly resolved:number; readonly ledger:readonly LedgerRow[]
}
export type AttackDamagePlan = {readonly packets:readonly DamagePacket[];readonly value:number;readonly absorbed:number}

/**
 * The cited low-cover accuracy (COMBAT-V2-DESIGN §5: "−20 accuracy and −1 damage for ranged ... from low props
 * between attacker and target"). The ledger's COVER row carries it; the miss event reads it back from there.
 */
export const LOW_COVER_ACCURACY = 20

/** One packet a planner resolves: its id and type, and how it finishes against the Protection still unspent and the first physical packet's Frost. */
export type PacketRow = { readonly id: string; readonly damageType: import('./types.js').DamageType; readonly finish: (available: number, frost: number) => ResolvedDamage }

/**
 * THE ONE PACKET PLANNER — fix.one-effect-vocabulary (2026-10-01; the duplication review: the attack's and the
 * burst's planners were ~80% the same). Packets in order against one running Protection pool; Frost on the
 * first physical packet only; every packet's ledger and conservation checked; the one DamagePacket shape. What
 * differs — an attack's base and secondary rows, a burst's cover budget and saves — is each row's `finish`.
 * No hooks, dice or mutations.
 */
export function planPackets(ctx: Ctx, tg: Unit, source: string, rows: readonly PacketRow[]): AttackDamagePlan {
  const packets: DamagePacket[] = []
  let available = incomingAbsorb(ctx, tg), physicalSeen = false
  for (const row of rows) {
    const frost = row.damageType === 'physical' && !physicalSeen ? incomingPhysicalBonus(ctx, tg) : 0
    if (row.damageType === 'physical') physicalSeen = true
    const d = row.finish(available, frost)
    if (d.ledger.reduce((n, r) => n + r.delta, 0) !== d.value || d.raw - d.absorbed + d.mitigationDelta + d.floorAdjustment !== d.value) throw Error(`packet damage ledger does not reconcile (${source} ${row.id})`)
    packets.push({ id: row.id, source, damageType: row.damageType, raw: d.raw, absorbed: d.absorbed, defense: d.defense, mitigationDelta: d.mitigationDelta, floorAdjustment: d.floorAdjustment, resisted: d.resisted, resolved: d.value, ledger: d.ledger })
    available -= d.absorbed
  }
  return { packets, value: packets.reduce((n, p) => n + p.resolved, 0), absorbed: packets.reduce((n, p) => n + p.absorbed, 0) }
}

/** No hooks, dice or mutations. Confirmed crit is separate from damage-head count. */
export function planAttackDamage(ctx:Ctx,at:Unit,tg:Unit,a:AttackDef,heads:number,critical:boolean):AttackDamagePlan {
  const metadata=attackPacketFields(a.attack)
  // the base packet resolves its own Frost inside resolveDamage (the frost argument is unused for it)
  const rows:PacketRow[]=[{id:'base',damageType:a.attack.damageType,finish:(available)=>resolveDamage(ctx,at,tg,damageSourceOfAttack(a),heads,outgoingPenalty(ctx,at),available)}]
  for(const row of metadata.secondaryDamage??[]){
    if(row.when==='crit'&&!critical)continue
    rows.push({id:row.id,damageType:row.damageType,finish:(available,frost)=>{
      const ledger:LedgerRow[]=[{station:DMG.DECLARE,name:'DECLARE',effectId:a.id,before:0,after:row.amount,delta:row.amount}]
      return finishDamage(ctx,tg,{damageType:row.damageType,armorPenetration:metadata.armorPenetration??0},ledger,row.amount,available,frost,armorGuard(ctx,at,tg))
    }})
  }
  return planPackets(ctx,tg,a.id,rows)
}

/** Reserve at the damage rung; onHit sees only the unreserved pool. */
function reserveAttackDamage(ctx:Ctx,targetId:number,a:AttackDef,plan:AttackDamagePlan):void {
  if(plan.absorbed>0)spendAbsorb(ctx,targetId,plan.absorbed,a.id)
}

/** Same plan and mutator as live resolution; never peek at randomized hooks. */
function previewAttackDamage(ctx:Ctx,attackerId:number,targetId:number,a:AttackDef,heads:number,critical:boolean){
  const plan=planAttackDamage(ctx,unit(ctx,attackerId),unit(ctx,targetId),a,heads,critical)
  // PRIVATE application-only fork: reserveAttackDamage/applyAttackPackets mutate
  // only target HP/statuses and seq/events. Never run hooks, RNG, settlement or
  // geometry preparation here. Full-fork parity/frozen-live probes guard this
  // boundary. Unrelated units/config/RNG stay readonly; this is not an action fork.
  const units=[...ctx.state.units];units[targetId]=structuredClone(unit(ctx,targetId))
  const fork:Ctx={...ctx,state:{...ctx.state,units},events:[]}
  reserveAttackDamage(fork,targetId,a,plan)
  const facts=applyAttackPackets(fork,targetId,plan.packets,a.id,{actor:attackerId,attackId:a.id})
  return {value:plan.value,packets:facts.packets,applied:facts.applied,physicalApplied:facts.physicalApplied}
}

export type AttackResult = {
  hit: boolean
  crit: boolean
  accuracy: number
  roll: number | null
  blocked?: boolean
  hits?: readonly AttackResult[]
  damage: number
  killed: boolean
}

/** The attack row, loudly — an id that is not an attack is a caller's error, not a fizzle. */
export function attackDef(ctx: Ctx, attackId: string): AttackDef {
  const a = ctx.actions[attackId]
  if (!a) throw new Error(`unknown attack ${attackId}`)
  if (!isAttack(a)) throw new Error(`'${attackId}' is not an attack — it carries no attack profile`)
  attackPacketFields(a.attack)
  return a
}

/** Can this attack be made right now? The one legality answer (Law 2). */
/**
 * `mode` — `'reaction'` is a SPECIAL FREE ATTACK (the attack of opportunity), made outside
 * the attacker's Activation. The primary slot is not consulted (a unit that has acted this
 * Turn still reacts, and may react more than once — COMBAT-DESIGN "one enemy can make
 * multiple attacks of opportunity per round").
 *
 * rule.free-attack-is-basic-attack (2026-10-04; DECISIONS.md 2026-09-28 'counterattack,
 * special free attacks …': "Special free attacks — counterattack, fend, the attack of
 * opportunity — are one rule: the basic attack, no stamina, −20 Accuracy"; 2026-10-04 'the
 * basic attack is a weapon's first attack …': "It has a stamina cost, but that stamina cost
 * is not triggered by special free attacks"). A reaction asks for no Stamina and spends none
 * — its cost is zero, never paid and refunded (Law 3) — and rolls at FREE_ATTACK_ACCURACY.
 * Every other gate — granted, cooldown, uses, reach, sight — is the same one. This replaces
 * fix.aoo-pays-stamina (2026-09-04), which paid Stamina by the 2026-08-20 ruling.
 */
export type AttackMode = 'movement' | 'primary' | 'reaction'

/** The ruled Accuracy penalty of a special free attack (DECISIONS.md 2026-09-28: "the basic attack, no stamina, −20 Accuracy"). */
export const FREE_ATTACK_ACCURACY = -20
/** What the free attack's accuracy row names as its cause (Law 12). */
export const FREE_ATTACK_CAUSE = 'rule.free-attack'
/**
 * capability.counterattack-and-fend (2026-10-04): the special free attacks a unit makes only while it has them up — the
 * stat that says so (above 0), the stat added to that swing's Accuracy, and the cause its lines name. The attack of
 * opportunity is the third special free attack; every unit with a zone of control makes it, so it has no row here.
 */
export type FreeAttackKind = import('./special-free-attacks.js').FreeAttackKind
/** special-free-attacks.ts SPECIAL_FREE_ATTACKS — one table (it moved there so the mutators can read it: rule.counterattack-replaced-and-lost). */
export const FREE_ATTACK_STATS = SPECIAL_FREE_ATTACKS

export function canAttack(ctx: Ctx, attackerId: number, targetId: number, attackId: string, mode?: AttackMode): boolean {
  const at = unit(ctx, attackerId)
  const tg = unit(ctx, targetId)
  const a = ctx.actions[attackId]
  if (!a || !isAttack(a)) return false
  attackPacketFields(a.attack)
  // capability.charge (2026-09-27): a charge walks before it strikes; a reaction
  // does not walk, so a charge is never an attack of opportunity (SWITCHES.md chargeNoReaction)
  if (mode === 'reaction' && a.move !== undefined) return false
  if (at.lifeState !== 'standing') return false
  // fix.downed-targetable (2026-09-03): a DOWNED unit can be attacked — GAME-
  // DESIGN §9, "enemies roll at +20 against downed heroes". Only the dead are
  // beyond reach. What a hit on the downed does is decided in performAttack.
  if (tg.lifeState === 'dead') return false
  if (at.side === tg.side) return false
  // capability.stealth (2026-09-28): "cannot be targeted by an attack" — a reaction
  // included, so a hidden unit leaving a zone draws nothing (SWITCHES.md stealthReaction)
  if (untargetableBy(ctx, at, tg)) return false
  // capability.vision (2026-09-03): you cannot target what you cannot see (SWITCHES.md targetUnseen)
  if (!ctx.cfg.switches.targetUnseen && !canSee(ctx, at, tg)) return false
  if (mode !== 'reaction' && resolveActionSlot(ctx, at, a, mode) === null) return false
  // refactor.one-action-type: THE ONE LIMITS CHECK — granted, stamina, cooldown/warmup, uses.
  // A special free attack asks for no Stamina (rule.free-attack-is-basic-attack).
  if (!actionReady(ctx, at, a, mode === 'reaction')) return false
  // "You cannot use a ranged attack on something adjacent." (Angela, 2026-08-15;
  // GAME-DESIGN.md §4.) A legality rule, so it is answered here rather than as a
  // penalty the shooter can eat — the shot does not exist.
  return attackReachesHex(ctx, at, a, tg.hex)
}

/**
 * The attack's geometry from where the attacker stands: the ranged-adjacent ban,
 * reach and the line — canAttack's tail, split out (preview.from-planned-hex) so
 * the enemy reach query (forecast.ts threatOf) asks the one legality function's
 * own question of a hex nobody stands on yet (Law 2).
 */
export function attackReachesHex(ctx: Ctx, at: Unit, a: AttackDef, hex: HexId): boolean {
  const d = ctx.geo.distance(at.hex, hex)
  if (a.attack.kind === 'ranged' && d <= 1) return false
  return d <= reachOf(ctx, at, a) && attackLineClear(ctx, at.hex, hex)
}

/** What preview() answers — the type a forecast carries (preview.from-planned-hex). */
export type AttackPreview = ReturnType<typeof preview>

/** Pure first-cup facts. Incapacity is an explicit status capability, not its ID. */
export function resolveBlock(ctx: Ctx, target: Unit, kind: 'melee' | 'ranged', attacker?: Unit) {
  const statName = kind === 'ranged' ? 'rangedBlock' : 'block'
  const resolved = effective(ctx, target, statName)
  // v2.structures: a wall's +10 and a tower's +15 Block — to BOTH Block and Ranged Block —
  // against an enemy not in the same kind of structure (Andrew 2026-09-24: "The wall adds to
  // both"). One more ledger row, naming the structure; the Block roll reads the sum.
  const guard = attacker ? structureGuard(ctx, attacker, target) : null
  const add = guard ? (kind === 'ranged' ? guard.rangedBlock : guard.block) : 0
  const value = resolved.value + add
  const ledger = add ? [...resolved.ledger, { source: guard!.id, op: 'add' as const, delta: add, from: resolved.value, to: value }] : resolved.ledger
  const suppressed = target.statuses.some(s => s.value > 0 && ctx.statuses[s.id]?.blocksBlock)
  return {stat: statName, value, ledger,
    chance: suppressed ? 0 : Math.max(0, Math.min(100, value)), suppressed}
}

/** Preview: the same pipeline, run without applying. Law 1 — never a second formula. */
export function preview(ctx: Ctx, attackerId: number, targetId: number, attackId: string, mode?: AttackMode, as?: FreeAttackKind) {
  const at = unit(ctx, attackerId)
  const tg = unit(ctx, targetId)
  const a = attackDef(ctx, attackId)
  const acc = resolveAccuracy(ctx, at, tg, a, mode, as)
  const hitChance = Math.max(0, Math.min(100, acc.value))
  const block = resolveBlock(ctx, tg, a.attack.kind, at)
  // hitChance remains the accuracy cup conditioned on passing Block. Bps is
  // integer precision: 10,000 means certainty, with no probability rounding.
  const blockFacts = {blockChance:block.chance, connectionChanceBps:(100-block.chance)*hitChance, blockSuppressed:block.suppressed}
  // A hit on the DOWNED deals no damage and cannot crit — it accelerates the
  // bleed-out counter (fix.downed-targetable, 2026-09-03). The preview says so.
  if (tg.lifeState === 'downed') {
    return { ...blockFacts, hitChance, accuracy: acc.value, accLedger: acc.ledger, damageOnHit: 0, damageOnCrit: 0, damageOnCritChart:0, packetsOnHit:[],packetsOnCrit:[],packetsOnCritChart:[],critChance: 0, kdbChanceOnHit: null, kdbChanceOnCrit: null, kdbChanceOnCritChart: null, thornsOnHit: 0, downed: true as const }
  }
  const hit=previewAttackDamage(ctx,attackerId,targetId,a,0,false)
  const critical=previewAttackDamage(ctx,attackerId,targetId,a,1,true)
  const chart=previewAttackDamage(ctx,attackerId,targetId,a,0,true)
  // v2.kdb (COMBAT-V2 §9.1): the KDB chance each branch would roll — the same
  // forecast the resolution reads (Law 1). null: the branch carries no
  // physical packet, so it cannot cause KDB. A single hit's chance; a multi-hit
  // attack sums its hits' physical damage before the one check.
  const impact=attackPacketFields(a.attack).impact??0
  const physicalBranch=(b:{packets:readonly {damageType:string}[]})=>b.packets.some(p=>p.damageType==='physical')
  const kdbSide=physicalBranch(hit)||physicalBranch(critical)||physicalBranch(chart)?kdbTarget(ctx,tg):null
  const kdbOf=(b:{packets:readonly {damageType:string}[];physicalApplied:number})=>kdbSide&&physicalBranch(b)?kdbChanceOf(kdbSide,b.physicalApplied,impact).chance:null
  return {
    ...blockFacts,
    hitChance,
    accuracy: acc.value,
    accLedger: acc.ledger,
    damageOnHit:hit.value,damageOnCrit:critical.value,damageOnCritChart:chart.value,
    packetsOnHit:hit.packets,packetsOnCrit:critical.packets,packetsOnCritChart:chart.packets,
    critChance: critChanceOf(ctx, at, tg, acc.value, a),
    kdbChanceOnHit:kdbOf(hit),kdbChanceOnCrit:kdbOf(critical),kdbChanceOnCritChart:kdbOf(chart),
    // v2.thorns: the true damage each connecting hit costs the attacker (melee only;
    // its own Protection may absorb some). The number reflectThorns reads (Law 1).
    thornsOnHit:thornsOnHit(ctx,tg,a,at),
  }
}

/**
 * Crit chance — station.crit (2026-08-27), COMBAT-DESIGN "Critical hits —
 * where surplus Accuracy goes": 3 base for everyone, plus the unit's own Crit
 * ("Base Crit varies by enemy"), plus the weapon's crit field ("Crit from
 * gear"), plus surplus final accuracy over 100 at 1 per 4 — minus the
 * TARGET's Luck ("your resistance to taking one"). Floor 0.
 *
 * fix.codex-numbers (2026-10-01; DECISIONS.md 2026-09-28 "the duplication review, ruled",
 * finding C1, Andrew: "Crit base 3 should be counted once."): the 3 is the rule and lives
 * here only. A row's `crit` is the unit's own addition to it; the Codex authors totals (a
 * warrior 3, a rogue 5) and the converter publishes total − CRIT_BASE, read from the
 * engine's vocabulary export (ruleBases), so the base is never counted twice.
 */
export const CRIT_BASE = 3
/** The attacker's own Crit with an attack, before any target: the rule's base, the unit's Crit, the attack's. ONE sum, read by
 *  the chance below and by the figure a row of the bar shows (attackFigures). */
const critOwn = (ctx: Ctx, attacker: Unit, a?: AttackDef): number => CRIT_BASE + effective(ctx, attacker, 'crit').value + (a?.attack.crit ?? 0)
function critChanceOf(ctx: Ctx, attacker: Unit, target: Unit, finalAcc: number, a?: AttackDef): number {
  if (!ctx.cfg.switches.critEnabled) return 0
  const surplus = finalAcc > 100 ? Math.trunc((finalAcc - 100) / 4) : 0
  return Math.max(0, critOwn(ctx, attacker, a) + surplus
    - effective(ctx, target, 'luck').value)
}
/**
 * viewer.attack-row-shows-totals (2026-10-06; DECISIONS.md 2026-10-06 'an attack shows its total Accuracy and Crit, not the
 * weapon's plus': "The dagger doesn't show +5 critical. What happens is the attack shows the total critical. The same thing is
 * true of accuracy."): the ATTACKER'S SIDE of an attack's two figures, before a target is chosen — what a row of the action bar
 * shows. Accuracy: every row of resolveAccuracy that reads neither the target nor the way to it — the unit's resolved Accuracy
 * stat (gear, badges, statuses, auras, a set, the ground: the stat pipeline), a ranged attack's own ground (ELEVATION) and
 * surroundings (ADJACENT), the unit's own prone rows, the attack's own modifier. Crit: critOwn above. What a target adds or
 * takes (its Dodge, its ground, cover, the range to it, its Luck, the surplus of the final Accuracy) is the forecast's
 * (preview). Read-only and pure: no state, no dice, no line. test: viewer/test/viewer.attack-row-shows-totals.test.ts holds
 * it to preview() against a plain target for every attack of the opening roster.
 */
export function attackFigures(ctx: Ctx, attacker: Unit, a: AttackDef): { accuracy: number; crit: number } {
  let accuracy = effective(ctx, attacker, 'accuracy').value
  if (a.attack.kind === 'ranged') {
    if (inMelee(ctx, attacker)) accuracy -= 20
    accuracy += rangedAccuracyOf(ctx.state.terrain[attacker.hex] ?? 0)
  }
  for (const { rule } of proneRulesOf(ctx, attacker)) accuracy += rule.accuracy
  accuracy += a.attack.accuracy ?? 0
  return { accuracy, crit: ctx.cfg.switches.critEnabled ? Math.max(0, critOwn(ctx, attacker, a)) : 0 }
}

/**
 * An attack, whole: every hit of it, then — capability.counterattack-and-fend (2026-10-04; DECISIONS.md 2026-09-28: "You can
 * counterattack once per enemy action, so if that enemy action is three attacks, all three of their attacks will resolve,
 * and then you will get your one counterattack") — the target's counterattack, if it has one up. `as` names which special
 * free attack a reaction is (a counterattack, a fend); absent, a reaction is the attack of opportunity.
 */
export function performAttack(ctx: Ctx, attackerId: number, targetId: number, attackId: string, mode?: AttackMode, as?: FreeAttackKind): AttackResult {
  const result = resolveAttack(ctx, attackerId, targetId, attackId, mode, as)
  // capability.effect-lasts-activations (2026-10-05): the attack is made — every hit of it resolved, so each carried what a
  // counted status lent — and the statuses its maker holds that last "your next N attacks" lose one (a tag-limited one only
  // when this attack carries the tag)
  if (unit(ctx, attackerId).lifeState !== 'dead') countDownByAttack(ctx, attackerId, (tag) => carriesTag(ctx.actions[attackId], tag))
  // a special free attack is never answered (no chains): only an attack made on the attacker's own Activation is
  if (mode !== 'reaction') counterattackAfter(ctx, attackerId, targetId, attackDef(ctx, attackId))
  return result
}

/**
 * The counterattack — "set off by being attacked, not by being hit, blocked, or dodged", by an adjacent melee attacker,
 * after every hit of that attack has resolved. The unit attacked, still standing with its Counterattack above 0 and the
 * attacker still standing beside it, makes its free attack on the attacker (free-attack.ts freeAttackChoice: the basic
 * attack, else its own melee attack) as a reaction — no Stamina, the ruled penalty, plus its Counterattack Accuracy — then
 * settle. Skipped, with a line, when it has no melee attack it can legally make.
 */
function counterattackAfter(ctx: Ctx, attackerId: number, targetId: number, a: AttackDef): void {
  if (ctx.state.outcome || a.attack.kind !== 'melee') return
  const at = unit(ctx, attackerId), tg = unit(ctx, targetId)
  if (at.lifeState !== 'standing' || tg.lifeState !== 'standing' || at.side === tg.side) return
  if (ctx.geo.distance(at.hex, tg.hex) !== 1) return
  const kind = FREE_ATTACK_STATS.counterattack
  if (effective(ctx, tg, kind.up).value <= 0) return
  // "all three of their attacks will resolve, and then you will get your one counterattack": the attack's own consequences
  // settle first — a unit the blow took to 0 Health is down before it could answer. (The caller settles the attack after
  // this returns, as it always did; with nothing left to settle that is a no-op.)
  settle(ctx, a.id)
  if (ctx.state.outcome || at.lifeState !== 'standing' || tg.lifeState !== 'standing' || ctx.geo.distance(at.hex, tg.hex) !== 1) return
  const choice = freeAttackChoice(ctx, targetId, attackerId)
  if (!('attack' in choice)) { emit(ctx, 'aoo.skipped', kind.cause, { actor: targetId, target: attackerId, reason: choice.skipped, as: 'counterattack' }); return }
  emit(ctx, 'aoo.provoked', kind.cause, { actor: targetId, target: attackerId, attackId: choice.attack.id, as: 'counterattack' })
  resolveAttack(ctx, targetId, attackerId, choice.attack.id, 'reaction', 'counterattack')
  settle(ctx, kind.cause)
}

/** Each hit completes its shared lifecycle; aggregate hit means any connection. */
function resolveAttack(ctx: Ctx, attackerId: number, targetId: number, attackId: string, mode?: AttackMode, as?: FreeAttackKind): AttackResult {
  const a0 = attackDef(ctx, attackId)
  // capability.stealth (2026-09-28): "It breaks the moment you use an attack" — as
  // it is declared, before the roll, whatever its mode; a multi-hit attack breaks
  // it once (SWITCHES.md stealthBreakMoment)
  breakStatuses(ctx, attackerId, 'attack', attackId)
  const hits = Math.max(1, a0.attack.hits ?? 1)
  // v2.kdb: ONE KDB check per connecting attack, after its damage and its crit
  // chart (SWITCHES.md kdbOrder); a multi-hit attack sums its hits' physical
  // damage (kdbMultiPacket).
  const kdb: KdbTally = { connected: false, physical: 0, eligible: false }
  // v2.prop-destroy (COMBAT-V2 §12.2): the hex the attack strikes is the target's
  // hex as the attack is declared — a KDB push after it does not move the blow.
  const struck = unit(ctx, targetId).hex
  if (hits === 1) {
    const result = performHit(ctx, attackerId, targetId, attackId, 1, 1, mode, kdb, as)
    kdbAfterAttack(ctx, attackerId, targetId, a0, kdb)
    destroyAfterAttack(ctx, attackerId, struck, a0, result.hit)
    return result
  }
  // attack.multihit (2026-09-03): each hit runs the whole cycle — damage,
  // triggers, settle — before the next; no retargeting; cancelled the moment
  // the target stops standing. The FIRST hit pays the stamina and the primary.
  let last: AttackResult | null = null
  let damage = 0
  const results: AttackResult[] = []
  for (let h = 1; h <= hits; h++) {
    if (ctx.state.outcome) break
    const tg = unit(ctx, targetId)
    if (h > 1 && tg.lifeState !== 'standing') { emit(ctx, 'attack.cancelled', attackId, { actor: attackerId, target: targetId, hit: h, of: hits, reason: 'target fell' }); break }
    if (h > 1 && unit(ctx, attackerId).lifeState !== 'standing') break
    last = performHit(ctx, attackerId, targetId, attackId, h, hits, mode, kdb, as)
    results.push(last)
    damage += last.damage
    settle(ctx, attackId)
  }
  if (!ctx.state.outcome) kdbAfterAttack(ctx, attackerId, targetId, a0, kdb)
  destroyAfterAttack(ctx, attackerId, struck, a0, results.some(r => r.hit))
  return { ...(last as AttackResult), hit:results.some(r=>r.hit), blocked:results.every(r=>r.blocked), hits:results, damage, killed: unit(ctx, targetId).hp === 0 }
}

/**
 * v2.prop-destroy (COMBAT-V2 §12.2, §12.4): an attack with Destroy N applies N
 * steps to every prop in the hex it struck — once per attack, however many of its
 * hits connected (SWITCHES.md propDestroyPerAttack) — at the end of the attack's
 * resolution, after its KDB, so the attack's own cover was already applied.
 * "Misses do not destroy": a miss or a Block, on every hit, strikes nothing.
 */
function destroyAfterAttack(ctx: Ctx, attackerId: number, struck: number, a: AttackDef, connected: boolean): void {
  const destroy = attackPacketFields(a.attack).destroy ?? 0
  if (!connected || destroy < 1 || ctx.state.outcome) return
  for (const p of propsTouching(ctx, [struck])) damageProp(ctx, p.id, destroy, a.id, attackerId)
}

/** v2.kdb: what one attack's hits add up to for its single KDB check. */
type KdbTally = { connected: boolean; physical: number; eligible: boolean }

/**
 * v2.kdb (COMBAT-V2 §9): the attack's one KDB check. Only an attack that
 * connected with a physical packet rolls ("Physical damage only"); the key is
 * the target's uid and its incoming-attack ordinal (the attack's last hit),
 * kind 0 — never a turn (§15.4).
 */
function kdbAfterAttack(ctx: Ctx, attackerId: number, targetId: number, a: AttackDef, t: KdbTally): void {
  if (!t.connected || !t.eligible) return
  const tg = unit(ctx, targetId)
  resolveKdb(ctx, attackerId, targetId, a.id, t.physical, attackPacketFields(a.attack).impact ?? 0,
    [tg.uid, tg.incomingAttackOrdinal ?? 0, 0], { attackId: a.id })
}

/** One hit of an attack — the whole of performAttack before multihit. `hit`/`of` name the swing in the log. */
function performHit(ctx: Ctx, attackerId: number, targetId: number, attackId: string, hitNo: number, of: number, mode: AttackMode | undefined, kdb?: KdbTally, as?: FreeAttackKind): AttackResult {
  const at = unit(ctx, attackerId)
  const tg = unit(ctx, targetId)
  const a = attackDef(ctx, attackId)
  // the first hit is the legal one; later hits of the same swing skip the
  // primary/stamina gates (already paid) but still need a standing target in reach
  if (hitNo === 1 && !canAttack(ctx, attackerId, targetId, attackId, mode)) {
    throw new Error(`illegal attack: ${at.name} -> ${tg.name} with ${attackId}`)
  }
  if (hitNo > 1 && (tg.lifeState !== 'standing' || ctx.geo.distance(at.hex, tg.hex) > reachOf(ctx, at, a))) {
    emit(ctx, 'attack.cancelled', attackId, { actor: attackerId, target: targetId, hit: hitNo, of, reason: 'no longer legal' })
    return { hit: false, crit: false, accuracy: 0, roll: 0, damage: 0, killed: false }
  }

  const incomingOrdinal = (tg.incomingAttackOrdinal ?? 0) + 1
  // RNG key words are unsigned32; refuse overflow before any payment/mutation.
  if (!Number.isSafeInteger(incomingOrdinal) || incomingOrdinal < 1 || incomingOrdinal > 0xffffffff) throw Error('incoming attack ordinal overflow')
  const ord = ++at.attackOrdinal
  const pv = preview(ctx, attackerId, targetId, attackId, mode, as)

  // refactor.one-action-type: THE ONE SPEND — stamina, the primary, the cooldown, a use
  if (hitNo === 1) spendAction(ctx, attackerId, a, mode === 'reaction' ? mode : resolveActionSlot(ctx, at, a, mode)!)

  emit(ctx, 'attack.declared', a.id, {
    actor: attackerId, target: targetId, attackId, ordinal: ord, ...(of > 1 ? { hit: hitNo, of } : {}),
    // rule.free-attack-is-basic-attack: a special free attack says so on its own line (Law 12) — the reader need not find the provoke
    ...(mode === 'reaction' ? { free: true, ...(as !== undefined ? { as } : {}) } : {}),
    // kind and damageType are on the event, not looked up from ATTACKS, so a
    // renderer can pick an animation without importing game content.
    kind: a.attack.kind, damageType: a.attack.damageType,
    distance: ctx.geo.distance(at.hex, tg.hex), blockChance:pv.blockChance, connectionChanceBps:pv.connectionChanceBps, hitChance: pv.hitChance, damageOnHit: pv.damageOnHit,
    // COMBAT-SEQUENCE: "The accuracy roll carries the same [ledger]." It did — and
    // nothing emitted it, so until 2026-08-15 no log could say WHY a hit chance was
    // what it was. Found by gate 1: the ADJACENT station could not be probed for,
    // because a station nobody logs is indistinguishable from a station nobody runs.
    accLedger: pv.accLedger.map((r) => ({ station: r.name, effectId: r.effectId, delta: r.delta })),
  })

  // V2 first cup: freeze before any hook. Zero/suppressed checks still have
  // an incoming ordinal/event, but never consume a random draw.
  const blockRoll = pv.blockChance > 0 ? roll100(ctx.rng, 'block', tg.uid, incomingOrdinal) : null
  const blocked = blockRoll !== null && blockRoll <= pv.blockChance
  recordBlock(ctx, targetId, a.id, {attacker:attackerId,kind:a.attack.kind,chance:pv.blockChance,
    roll:blockRoll,blocked,suppressed:pv.blockSuppressed})

  // GAME-DESIGN §5: "onAttack always. Then onMiss or onHit. Then onDamage only if
  // damage landed." Every swing, hit or miss — this is where a Mage's burn-on-attack
  // fires, and it is deliberately NOT the same hook as a flaming bow's onHit.
  const fc = { ownerId: attackerId, targetId, causeId: a.id, ordinal: ord }
  fireTriggers(ctx, 'onAttack', fc)
  if (blocked) {
    const keyTag = HOOKS.indexOf('onBlock')
    fireTriggers(ctx, 'onBlock', {ownerId:targetId,targetId:attackerId,causeId:a.id,ordinal:incomingOrdinal,keyTag,keyRole:0})
    fireTriggers(ctx, 'onBlock', {...fc,keyTag,keyRole:1})
    fireTriggers(ctx, 'onMiss', fc)
    return {hit:false,crit:false,accuracy:pv.accuracy,roll:null,blocked:true,damage:0,killed:false}
  }

  const roll = roll100(ctx.rng, 'to-hit', at.uid, ord)
  const hit = roll <= pv.hitChance

  if (!hit) {
    const covered = pv.accLedger.some(r=>r.name==='COVER')
    // fix.one-effect-vocabulary: the cover penalty is the ledger's own COVER row (LOW_COVER_ACCURACY), never a retyped 20
    const coverPenalty = -pv.accLedger.filter(r=>r.name==='COVER').reduce((n,r)=>n+r.delta,0)
    const dodgeBand = pv.accLedger.filter(r=>r.name==='TARGET_DODGE').reduce((n,r)=>n-r.delta,0)
    const coverMiss = covered && roll<=Math.min(100,pv.accuracy+coverPenalty) && roll<=100-Math.max(0,dodgeBand)
    emit(ctx, 'attack.miss', a.id, { actor: attackerId, target: targetId, roll, hitChance: pv.hitChance, ...(covered?{cover:coverMiss,coverPenalty,missCause:roll>100-Math.max(0,dodgeBand)?'dodge':coverMiss?'cover':'accuracy'}:{}) })
    // The CALLER settles after performAttack (see ai/modes.ts) — including after a
    // miss, so an onMiss trigger that deals damage is picked up there. Settling here
    // too would nest a settle inside the caller's, which the reentrancy guard turns
    // into a silent no-op rather than an error.
    fireTriggers(ctx, 'onMiss', fc)
    return { hit: false, crit: false, accuracy: pv.accuracy, roll, damage: 0, killed: false }
  }

  // THE DOWNED (fix.downed-targetable, 2026-09-03). GAME-DESIGN §9: "a hit
  // only accelerates the bleed-out counter. It never kills." No damage, no
  // crit, no onDamage; onHit still fires (it connected). The counter never
  // goes below 1 by a hit — the kill belongs to the bleed-out rung alone. (A count the Bandages stopped has no rung: a hit
  // takes it to 0 and the caller's settling makes the unit dead — fix.bandaged-hero-dies-at-zero, mutate.ts accelerateBleedOut.)
  if (tg.lifeState === 'downed') {
    emit(ctx, 'attack.hit', a.id, { actor: attackerId, target: targetId, roll, hitChance: pv.hitChance, downed: true, damage: 0 })
    fireTriggers(ctx, 'onHit', fc)
    accelerateBleedOut(ctx, targetId, ctx.cfg.switches.downedHitBleedTicks, a.id, attackerId)
    return { hit: true, crit: false, accuracy: pv.accuracy, roll, damage: 0, killed: false }
  }

  let crit = false
  if (ctx.cfg.switches.critEnabled && pv.critChance > 0) {
    crit = roll100(ctx.rng, 'crit', at.uid, ord) <= pv.critChance
  }
  // Angela 2026-08-15. Fires the instant the crit is confirmed, before the damage
  // stations run — a crit is a thing that happened, not a size of number.
  if (crit) fireTriggers(ctx, 'onCrit', fc)

  // THE BRANCH FLIP — station.crit (2026-08-27, dictated): "The attack's
  // normal damage always lands first. Then the branch flip: on heads, an
  // additional +50% damage applied before Armor, Resist, and Protection
  // [= the DMG.CRIT station]; on tails, roll evenly among the ten injuries —
  // normal damage still lands, plus the effect." The coin is weighted per
  // victim side: critChartSplit, ANSWERED by Angela 2026-08-22 — "crits to
  // heroes 75% 25%, Enemies 50/50". Its own named stream (cup.crit-branch),
  // keyed by the crit, never by turn (Law 4).
  // Each CRITICAL flips its own branch — station.crit-count (2026-08-27):
  // "there is also an ability to have more than one critical happen at once."
  // critCount is 1 unless the attack row says otherwise. The FIRST critical
  // keeps the original key (single-crit battles stay byte-identical); each
  // further critical salts the key with its index.
  let heads = 0
  const chartCriticals: number[] = []
  if (crit) {
    const count = Math.max(1, a.attack.critCount ?? 1)
    const chartShare = rulesSideOf(ctx, tg) === 'hero'   // proving.mirror-row-rules: "vs heroes" means hero-RULED
      ? ctx.cfg.switches.critChartShareVsHeroes
      : ctx.cfg.switches.critChartShareVsEnemies
    for (let c = 0; c < count; c++) {
      // Keyed by attacker uid, TARGET uid and ordinal (widened 2026-08-27,
      // fix.crit-branch-even): under (uid, ord) alone the 25-replicate panel
      // reused so few draws that whole chart rows were unreachable in play.
      const branchRoll = c === 0
        ? roll100(ctx.rng, 'crit-branch', at.uid, tg.uid, ord)
        : roll100(ctx.rng, 'crit-branch', at.uid, tg.uid, ord, c)
      const chartArm = branchRoll <= chartShare
      emit(ctx, 'crit.branch', a.id, {
        actor: attackerId, target: targetId, roll: branchRoll, chartShare,
        arm: chartArm ? 'chart' : 'damage',
        // The numbering rides only on genuine multi-criticals: a single crit's
        // event keeps its exact station.crit shape, byte for byte — the
        // control baselines hash event JSON, and "1 of 1" says nothing.
        ...(count > 1 ? { critical: c + 1, of: count } : {}),
      })
      if (chartArm) chartCriticals.push(c)
      else heads++
    }
  }

  // The public forecast precedes randomized onAttack/onCrit hooks. Internal
  // conservation must observe their actual effects at the damage rung, for
  // every critical branch, without changing the already-declared hit roll.
  const expected = previewAttackDamage(ctx,attackerId,targetId,a,heads,crit).value
  const landed = resolveHitOn(ctx, attackerId, targetId, a, heads, ord, {
    expected,
    critical:crit,
    rollInfo: { roll, hitChance: pv.hitChance },
  })
  const damage = landed.applied
  if (kdb) { kdb.connected = true; kdb.physical += landed.physicalApplied; if (landed.physicalPacket) kdb.eligible = true }

  // The chart arm(s): normal damage has landed; now the even roll per tails
  // critical (rollCritEffect, GLOSSARY-fixed name). Skipped once the target
  // falls — a corpse cannot be Dazed, and a cup drawn for a dead unit would
  // burn a draw.
  const rolled = new Set<string>()
  for (const c of chartCriticals) {
    if (unit(ctx, targetId).lifeState !== 'standing') break
    rolled.add(rollCritEffect(ctx, attackerId, targetId, ord, a.id, c,
      ctx.cfg.switches.multiCritWithReplacement ? undefined : rolled))
  }

  return {
    hit: true, crit, accuracy: pv.accuracy, roll,
    damage,
    killed: unit(ctx, targetId).hp === 0,
  }
}

/**
 * One ordinary hit. Its expected state is a fork at the damage rung after
 * actual onAttack/onCrit effects, never a prediction of their future dice.
 * V2 bursts have a separate lifecycle and share only source/defense stations.
 */
function resolveHitOn(
  ctx: Ctx, attackerId: number, targetId: number, a: AttackDef, crit: number | boolean, ord: number,
  opts: { expected?: number; critical?:boolean; rollInfo?: { roll: number; hitChance: number } } = {},
): { applied: number; physicalApplied: number; physicalPacket: boolean } {
  // station.crit-count (2026-08-27): a heads COUNT — booleans keep meaning.
  const heads = crit === true ? 1 : crit === false ? 0 : crit
  const at = unit(ctx, attackerId)
  const tg = unit(ctx, targetId)
  const fc = { ownerId: attackerId, targetId, causeId: a.id, ordinal: ord }

  // rule.counterattack-replaced-and-lost (2026-10-04): Thorns answers an ADJACENT melee attacker — read where the two stand
  // as the hit lands, before anything the hit does can move either of them (the number the preview gave: Law 1).
  const thorns = thornsOnHit(ctx, tg, a, at)
  const expected = opts.expected ?? preview(ctx, attackerId, targetId, a.id).damageOnHit
  const critical=opts.critical??heads>0
  const dmg = planAttackDamage(ctx,at,tg,a,heads,critical)

  // Conservation: the ledger must fully explain the number (Law 1's sibling).
  const summed = dmg.packets.reduce((s,p)=>s+p.ledger.reduce((n,r)=>n+r.delta,0),0)
  if (summed !== dmg.value) {
    throw new Error(`damage ledger does not reconcile: ledger ${summed} vs value ${dmg.value}`)
  }
  if (dmg.value !== expected) {
    throw new Error(`preview/applied mismatch: preview ${expected}, applied ${dmg.value}`)
  }

  emit(ctx, 'attack.hit', a.id, {
    actor: attackerId, target: targetId,
    ...(opts.rollInfo ? { roll: opts.rollInfo.roll, hitChance: opts.rollInfo.hitChance } : { auto: true }),
    crit: critical, ...(critical ? { critHeads: heads } : {}),
    ledger: dmg.packets[0]!.ledger.map((r) => ({ station: r.name, effectId: r.effectId, delta: r.delta })),
    packets: structuredClone(dmg.packets),
  })

  reserveAttackDamage(ctx,targetId,a,dmg)
  // "The attack connected — even if armor absorbed all of it."
  fireTriggers(ctx, 'onHit', fc)

  const {applied,physicalApplied}=applyAttackPackets(ctx,targetId,dmg.packets,a.id,{actor:attackerId,attackId:a.id,crit:critical,damageType:a.attack.damageType,
    ...(dmg.absorbed>0?{absorbed:dmg.absorbed}:{})})

  // "At least 1 damage got through mitigation." applyDamage already computed
  // applied = min(amount, hpBefore), so absorbed-to-zero distinguishes itself.
  // Angela 2026-08-15, the canonical tail:
  //   "If damage is applied on damage triggers, then on taking damage triggers,
  //    then on kill triggers if there's a kill."
  if (applied > 0) {
    fireTriggers(ctx, 'onDamage', fc)
    // onTakingDamage belongs to the VICTIM, so the owner flips. From the victim's
    // side the "target" is whoever hit it — which is what a thorns or a retaliation
    // trigger needs to aim at.
    fireTriggers(ctx, 'onTakingDamage',
      { ownerId: targetId, targetId: attackerId, causeId: a.id, ordinal: ord })
  }
  if (tg.hp === 0 && applied > 0) { fireTriggers(ctx, 'onKill', fc); decayOnKill(ctx, attackerId, a.id) }   // Karma: -1 on a kill
  // v2.thorns (COMBAT-V2 §9.4): a connecting MELEE hit on a thorned unit — armor-
  // zero included, so it is not gated on `applied` — costs the attacker N true.
  reflectThorns(ctx, attackerId, targetId, a, thorns)

  // The legacy `applies` rider — a hardcoded 100% onHit trigger with no chance and
  // no hook. Kept working until its content moves to a real trigger, then deleted.
  if (a.attack.applies && tg.lifeState === 'standing') {
    applyStatus(ctx, targetId, a.attack.applies.statusId, a.attack.applies.value, a.id)
  }

  return { applied, physicalApplied, physicalPacket: dmg.packets.some((p) => p.damageType === 'physical') }
}
