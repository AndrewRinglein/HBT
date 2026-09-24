// Accuracy and damage stations, and the per-hit attack sequence.
//
// Ordering is a property of the STATION, never of the effect (COMBAT-SEQUENCE.md).
// Numbers are spaced so a station can be inserted later without renumbering anything.
// Integers only, one rounding rule: truncating integer division (Law 7).

import { absorbDamage, flatDamage } from './mitigation.js'
import type { Geometry, HexId } from './hex.js'
import { roll100 } from './rng.js'
import type { AttackDef, Ctx, Unit } from './types.js'
import { fireTriggers, HOOKS } from './trigger.js'
import { applyStatus, decayOnKill, incomingAbsorb, incomingPhysicalBonus, outgoingBonus, outgoingPenalty, proneRulesOf, spendAbsorb } from './status.js'
import { rollCritEffect } from './crit.js'
import { effective, stat } from './stats.js'
import { accelerateBleedOut, applyAttackPackets, emit, unit, recordBlock } from './mutate.js'
import { actionReady, isAttack, spendAction , resolveActionSlot } from './action.js'
import { settle } from './settle.js'
import { canSee } from './vision.js'
import { attackLineClear } from './los.js'
import { hasLowCover } from './cover.js'
import { kdbChanceOf, kdbTarget, resolveKdb } from './kdb.js'
import { reflectThorns, thornsOnHit } from './thorns.js'
import { rulesSideOf } from './side.js'
import { attackPacketFields } from './attack-profile.js'

export const ACC = {
  BASE: 100,
  RANGE: 200,
  ADJACENT: 300,
  TERRAIN: 400,
  CONDITION: 500,
  /** v2.prone (§10): +N against a prone target, −N for a prone attacker. */
  PRONE: 550,
  COVER: 575,
  TARGET_DODGE: 600,
  SITUATIONAL: 700,
  FINAL: 900,
} as const

export const DMG = {
  DECLARE: 100,
  SOURCE_STAT: 200,
  /** capability.power-pool (2026-09-03): the enemy side's Power, by the attack's share. */
  POWER: 225,
  SOURCE_STATUS: 250,
  TERRAIN: 300,
  POSITIONAL: 350,
  CRIT: 450,
  /** v2.prone (§10): flat ±N after the crit multiplier, like cover (SWITCHES.md proneStationOrder). */
  PRONE: 500,
  COVER: 525,
  /** capability.frost (2026-09-03): Frost on the target, physical hits only, before Armor. */
  FROST: 540,
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
  return a.attack.kind === 'ranged' ? a.range + stat(ctx, u, 'reach') : a.range
}

/**
 * The accuracy pipeline. NOTE: the value is deliberately NOT clamped —
 * Crit reads (final − 100) ÷ 4, so clamping here would silently delete crit surplus.
 * Only the roll comparison clamps.
 */
export function resolveAccuracy(ctx: Ctx, attacker: Unit, target: Unit, a: AttackDef): Resolved {
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
  // CONDITION — the target's state. Downed: +20 (GAME-DESIGN §9, ruled;
  // fix.downed-targetable 2026-09-03). The row names the attack as its cause.
  if (target.lifeState === 'downed') v = step(ledger, ACC.CONDITION, 'TARGET_DOWNED', a.id, v, v + 20)
  // PRONE (550) — v2.prone, COMBAT-V2-DESIGN §10: the numbers are the status row's.
  for (const { statusId, rule } of proneRulesOf(ctx, attacker)) v = step(ledger, ACC.PRONE, 'ATTACKER_PRONE', statusId, v, v + rule.accuracy)
  for (const { statusId, rule } of proneRulesOf(ctx, target)) v = step(ledger, ACC.PRONE, 'TARGET_PRONE', statusId, v, v + rule.accuracyAgainst)
  // SITUATIONAL — the attack's own modifier (station.accuracy-field, 2026-09-03).
  if (a.attack.accuracy) v = step(ledger, ACC.SITUATIONAL, 'SITUATIONAL', a.id, v, v + a.attack.accuracy)
  if (a.attack.kind === 'ranged' && hasLowCover(ctx,attacker.hex,target.hex)) v = step(ledger,ACC.COVER,'COVER','cover',v,v-20)
  const dodge = effective(ctx, target, 'dodge')
  v = step(ledger, ACC.TARGET_DODGE, 'TARGET_DODGE', `unit.${target.typeId}`, v, v - dodge.value)
  return { value: v, ledger, absorbed: 0 }
}

/**
 * What the damage pipeline actually reads. AttackDef and AbilityDef both satisfy
 * it — which is the mechanism behind Law 1: powers do not get a second pipeline,
 * they get this one with crit forced false (Design Law 23: no roll, no crit).
 */
export type DamageSource = { readonly id: string; readonly bonus: number; readonly stat?: 'strength' | 'precision' | 'magic' | 'spirit'; readonly damageType: import('./types.js').DamageType; readonly powerScale?: number; readonly attackKind?: 'melee' | 'ranged'; readonly armorPenetration?: number }
/** An attack as the one damage function reads it — the profile with the action's id. */
export function damageSourceOfAttack(a: AttackDef): DamageSource {
  return { attackKind:a.attack.kind, id: a.id, bonus: a.attack.bonus, stat: a.attack.stat, damageType: a.attack.damageType, ...(a.attack.powerScale !== undefined ? { powerScale: a.attack.powerScale } : {}), ...(a.attack.armorPenetration!==undefined?{armorPenetration:a.attack.armorPenetration}:{}) }
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

  if (a.stat) {
    const src = effective(ctx, attacker, a.stat)
    v = step(ledger, DMG.SOURCE_STAT, 'SOURCE_STAT', `unit.${attacker.typeId}`, v, v + src.value)
  }
  // POWER (225): the enemy side's pool, by this attack's share — capability.
  // power-pool (2026-09-03). Nearest, 0.5 up (Law 7). Zero pool, zero row.
  if (a.powerScale && rulesSideOf(ctx, attacker) === 'enemy') {   // proving.mirror-row-rules: the pool is a RULE of the enemy side
    const share = powerShare(ctx.state.power ?? 0, a.powerScale)
    if (share) v = step(ledger, DMG.POWER, 'POWER', 'power', v, v + share)
  }
  // SOURCE_STATUS (250): what the attacker's statuses do to the number — Weak
  // takes, Karma gives half its value rounded down (capability.karma 2026-09-03).
  const outBonus = outgoingBonus(ctx, attacker)
  if (outPenalty || outBonus) v = step(ledger, DMG.SOURCE_STATUS, 'SOURCE_STATUS', 'status', v, v - outPenalty + outBonus)

  return { value: v, ledger }
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
  return finishDamage(ctx,target,a,ledger,v,absorbAvailable,a.damageType==='physical'?incomingPhysicalBonus(ctx,target):0)
}

type ResolvedDamage = Resolved & { raw:number; defense:number; mitigationDelta:number; floorAdjustment:number; resisted:number }

/** Common tail. Secondary packets enter here, never through stat/Power/crit/cover stations. */
export function finishDamage(ctx:Ctx,target:Unit,a:Pick<DamageSource,'damageType'|'armorPenetration'>,ledger:LedgerRow[],v:number,absorbAvailable:number,frost:number):ResolvedDamage {
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

  const mit = flatDamage(ctx, target, v, a.damageType,0,a.armorPenetration??0)
  if (a.damageType !== 'true') {
    v = step(ledger, DMG.MITIGATION, 'MITIGATION', `unit.${target.typeId}`, v, mit.beforeFloor)
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

/** No hooks, dice or mutations. Confirmed crit is separate from damage-head count. */
export function planAttackDamage(ctx:Ctx,at:Unit,tg:Unit,a:AttackDef,heads:number,critical:boolean):AttackDamagePlan {
  const metadata=attackPacketFields(a.attack),packets:DamagePacket[]=[]
  let available=incomingAbsorb(ctx,tg),physicalSeen=a.attack.damageType==='physical'
  const add=(id:string,type:import('./types.js').DamageType,d:ResolvedDamage)=>{
    if(d.ledger.reduce((n,r)=>n+r.delta,0)!==d.value||d.raw-d.absorbed+d.mitigationDelta+d.floorAdjustment!==d.value)throw Error('packet damage ledger does not reconcile')
    packets.push({id,source:a.id,damageType:type,raw:d.raw,absorbed:d.absorbed,defense:d.defense,mitigationDelta:d.mitigationDelta,floorAdjustment:d.floorAdjustment,resisted:d.resisted,resolved:d.value,ledger:d.ledger})
    available-=d.absorbed
  }
  add('base',a.attack.damageType,resolveDamage(ctx,at,tg,damageSourceOfAttack(a),heads,outgoingPenalty(ctx,at),available))
  for(const row of metadata.secondaryDamage??[]){
    if(row.when==='crit'&&!critical)continue
    const frost=row.damageType==='physical'&&!physicalSeen?incomingPhysicalBonus(ctx,tg):0
    if(row.damageType==='physical')physicalSeen=true
    const ledger:LedgerRow[]=[{station:DMG.DECLARE,name:'DECLARE',effectId:a.id,before:0,after:row.amount,delta:row.amount}]
    add(row.id,row.damageType,finishDamage(ctx,tg,{damageType:row.damageType,armorPenetration:metadata.armorPenetration??0},ledger,row.amount,available,frost))
  }
  return {packets,value:packets.reduce((n,p)=>n+p.resolved,0),absorbed:packets.reduce((n,p)=>n+p.absorbed,0)}
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
 * `mode` — fix.aoo-pays-stamina (2026-09-04): `'reaction'` is the attack of
 * opportunity, made outside the attacker's Activation. The primary slot is not
 * consulted (a unit that has acted this Turn still reacts, and may react more
 * than once — COMBAT-DESIGN "one enemy can make multiple attacks of opportunity
 * per round"); every other gate — stamina, cooldown, uses, reach, sight — is the
 * same one, because the ruling says legal "means what it always means".
 */
export type AttackMode = 'movement' | 'primary' | 'reaction'

export function canAttack(ctx: Ctx, attackerId: number, targetId: number, attackId: string, mode?: AttackMode): boolean {
  const at = unit(ctx, attackerId)
  const tg = unit(ctx, targetId)
  const a = ctx.actions[attackId]
  if (!a || !isAttack(a)) return false
  attackPacketFields(a.attack)
  if (at.lifeState !== 'standing') return false
  // fix.downed-targetable (2026-09-03): a DOWNED unit can be attacked — GAME-
  // DESIGN §9, "enemies roll at +20 against downed heroes". Only the dead are
  // beyond reach. What a hit on the downed does is decided in performAttack.
  if (tg.lifeState === 'dead') return false
  if (at.side === tg.side) return false
  // capability.vision (2026-09-03): you cannot target what you cannot see (SWITCHES.md targetUnseen)
  if (!ctx.cfg.switches.targetUnseen && !canSee(ctx, at, tg)) return false
  if (mode !== 'reaction' && resolveActionSlot(ctx, at, a, mode) === null) return false
  // refactor.one-action-type: THE ONE LIMITS CHECK — granted, stamina, cooldown/warmup, uses
  if (!actionReady(ctx, at, a)) return false
  const d = ctx.geo.distance(at.hex, tg.hex)
  // "You cannot use a ranged attack on something adjacent." (Angela, 2026-08-15;
  // GAME-DESIGN.md §4.) A legality rule, so it is answered here rather than as a
  // penalty the shooter can eat — the shot does not exist.
  if (a.attack.kind === 'ranged' && d <= 1) return false
  return d <= reachOf(ctx, at, a) && attackLineClear(ctx, at.hex, tg.hex)
}

/** Pure first-cup facts. Incapacity is an explicit status capability, not its ID. */
export function resolveBlock(ctx: Ctx, target: Unit, kind: 'melee' | 'ranged') {
  const statName = kind === 'ranged' ? 'rangedBlock' : 'block'
  const resolved = effective(ctx, target, statName)
  const suppressed = target.statuses.some(s => s.value > 0 && ctx.statuses[s.id]?.blocksBlock)
  return {stat: statName, value: resolved.value, ledger: resolved.ledger,
    chance: suppressed ? 0 : Math.max(0, Math.min(100, resolved.value)), suppressed}
}

/** Preview: the same pipeline, run without applying. Law 1 — never a second formula. */
export function preview(ctx: Ctx, attackerId: number, targetId: number, attackId: string) {
  const at = unit(ctx, attackerId)
  const tg = unit(ctx, targetId)
  const a = attackDef(ctx, attackId)
  const acc = resolveAccuracy(ctx, at, tg, a)
  const hitChance = Math.max(0, Math.min(100, acc.value))
  const block = resolveBlock(ctx, tg, a.attack.kind)
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
    thornsOnHit:thornsOnHit(ctx,tg,a),
  }
}

/**
 * Crit chance — station.crit (2026-08-27), COMBAT-DESIGN "Critical hits —
 * where surplus Accuracy goes": 3 base for everyone, plus the unit's own Crit
 * ("Base Crit varies by enemy"), plus the weapon's crit field ("Crit from
 * gear"), plus surplus final accuracy over 100 at 1 per 4 — minus the
 * TARGET's Luck ("your resistance to taking one"). Floor 0.
 */
function critChanceOf(ctx: Ctx, attacker: Unit, target: Unit, finalAcc: number, a?: AttackDef): number {
  if (!ctx.cfg.switches.critEnabled) return 0
  const surplus = finalAcc > 100 ? Math.trunc((finalAcc - 100) / 4) : 0
  const gear = a?.attack.crit ?? 0
  return Math.max(0, 3 + effective(ctx, attacker, 'crit').value + gear + surplus
    - effective(ctx, target, 'luck').value)
}

/** Each hit completes its shared lifecycle; aggregate hit means any connection. */
export function performAttack(ctx: Ctx, attackerId: number, targetId: number, attackId: string, mode?: AttackMode): AttackResult {
  const a0 = attackDef(ctx, attackId)
  const hits = Math.max(1, a0.attack.hits ?? 1)
  // v2.kdb: ONE KDB check per connecting attack, after its damage and its crit
  // chart (SWITCHES.md kdbOrder); a multi-hit attack sums its hits' physical
  // damage (kdbMultiPacket).
  const kdb: KdbTally = { connected: false, physical: 0, eligible: false }
  if (hits === 1) {
    const result = performHit(ctx, attackerId, targetId, attackId, 1, 1, mode, kdb)
    kdbAfterAttack(ctx, attackerId, targetId, a0, kdb)
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
    last = performHit(ctx, attackerId, targetId, attackId, h, hits, mode, kdb)
    results.push(last)
    damage += last.damage
    settle(ctx, attackId)
  }
  if (!ctx.state.outcome) kdbAfterAttack(ctx, attackerId, targetId, a0, kdb)
  return { ...(last as AttackResult), hit:results.some(r=>r.hit), blocked:results.every(r=>r.blocked), hits:results, damage, killed: unit(ctx, targetId).hp === 0 }
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
function performHit(ctx: Ctx, attackerId: number, targetId: number, attackId: string, hitNo: number, of: number, mode: AttackMode | undefined, kdb?: KdbTally): AttackResult {
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
  const pv = preview(ctx, attackerId, targetId, attackId)

  // refactor.one-action-type: THE ONE SPEND — stamina, the primary, the cooldown, a use
  if (hitNo === 1) spendAction(ctx, attackerId, a, mode === 'reaction' ? mode : resolveActionSlot(ctx, at, a, mode)!)

  emit(ctx, 'attack.declared', a.id, {
    actor: attackerId, target: targetId, attackId, ordinal: ord, ...(of > 1 ? { hit: hitNo, of } : {}),
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
    const dodgeBand = pv.accLedger.filter(r=>r.name==='TARGET_DODGE').reduce((n,r)=>n-r.delta,0)
    const coverMiss = covered && roll<=Math.min(100,pv.accuracy+20) && roll<=100-Math.max(0,dodgeBand)
    emit(ctx, 'attack.miss', a.id, { actor: attackerId, target: targetId, roll, hitChance: pv.hitChance, ...(covered?{cover:coverMiss,coverPenalty:20,missCause:roll>100-Math.max(0,dodgeBand)?'dodge':coverMiss?'cover':'accuracy'}:{}) })
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
  // goes below 1 by a hit — the kill belongs to the bleed-out rung alone.
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
  reflectThorns(ctx, attackerId, targetId, a)

  // The legacy `applies` rider — a hardcoded 100% onHit trigger with no chance and
  // no hook. Kept working until its content moves to a real trigger, then deleted.
  if (a.attack.applies && tg.lifeState === 'standing') {
    applyStatus(ctx, targetId, a.attack.applies.statusId, a.attack.applies.value, a.id)
  }

  return { applied, physicalApplied, physicalPacket: dmg.packets.some((p) => p.damageType === 'physical') }
}
