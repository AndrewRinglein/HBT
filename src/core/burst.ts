// Bursts own placement, frozen travel geometry and defender reactions. Damage
// source/mitigation and HP mutation remain the same functions used by attacks.
import type { BurstDef, Ctx, Prop, Unit } from './types.js'
import { actionReady, isBurst, resolveActionSlot, spendAction } from './action.js'
import { validateBurstAction } from './burst-profile.js'
import { eligible } from './target.js'
import { attackLineClear, segmentCrossesCell } from './los.js'
import { centerPoint, segmentCrossesPolygon } from './geometry.js'
import { canSeeHex } from './vision.js'
import { incomingAbsorb, incomingPhysicalBonus, isBlocked, outgoingPenalty, spendAbsorb } from './status.js'
import { applyAttackPackets, applyHealing, beginBurst, damageProp, emit, unit } from './mutate.js'
import { propsTouching } from './props.js'
import { DMG, finishDamage, resolveSourceDamage, type DamagePacket, type LedgerRow } from './pipeline.js'
import { fireTriggers, HOOKS, type BurstAdjustment } from './trigger.js'
import { settle } from './settle.js'
import { kdbForecast, resolveKdb } from './kdb.js'

/**
 * v2.kdb (SWITCHES.md kdbBursts): physical burst damage can cause KDB, per
 * recipient, with the burst's own Impact (absent = 0). null: no physical
 * packet reached this recipient's plan, so no check.
 */
function burstKdbChance(ctx: Ctx, target: Unit, a: BurstDef, result: { packets: readonly { damageType: string }[]; physicalApplied: number }): number | null {
  return result.packets.some(p => p.damageType === 'physical') ? kdbForecast(ctx, target, result.physicalApplied, a.burst.impact ?? 0).chance : null
}

export function burstHexes(ctx: Ctx, origin: number, centre: number, a: BurstDef): number[] {
  return a.burst.shape.kind === 'arc'
    ? [centre, ...ctx.geo.neighboursOf(centre).filter(h => ctx.geo.distance(origin, h) === 1)].sort((x, y) => x - y)
    : Array.from({ length: ctx.geo.hexCount }, (_, h) => h).filter(h => ctx.geo.distance(centre, h) <= (a.burst.shape as { radius: number }).radius)
}

/** A point has no travelled line. Other rays include both endpoint footprints. */
export function burstCrossings(ctx: Ctx, centre: number, target: number, height: Prop['height']): string[] {
  if (centre === target) return []
  const a = centerPoint(ctx.state.board, centre), b = centerPoint(ctx.state.board, target)
  return ctx.state.props.filter(p => p.height === height && (p.footprint.kind === 'hex'
    ? p.footprint.hexes.some(h => segmentCrossesCell(ctx.state.board, centre, target, h))
    : segmentCrossesPolygon(a, b, p.footprint.vertices))).map(p => p.id).sort()
}

export function canUseBurst(ctx: Ctx, actorId: number, centre: number, actionId: string, slot?: import('./types.js').ActionSlot): boolean {
  const actor = ctx.state.units[actorId], a = ctx.actions[actionId]
  if (!actor || !a || !isBurst(a)) return false
  validateBurstAction(a)
  if (!Number.isSafeInteger(centre) || centre < 0 || centre >= ctx.geo.hexCount || ctx.state.floor?.[centre] === false) return false
  if (actor.lifeState !== 'standing' || isBlocked(ctx, actor) || !actionReady(ctx, actor, a) || resolveActionSlot(ctx, actor, a, slot) === null) return false
  if (actor.statuses.some(s => s.value > 0 && ctx.statuses[s.id]?.locksPowers)) return false
  const distance = ctx.geo.distance(actor.hex, centre)
  if (distance > a.range || (a.burst.shape.kind === 'arc' && distance !== 1)) return false
  return (ctx.cfg.switches.targetUnseen || canSeeHex(ctx, actor, centre)) && attackLineClear(ctx, actor.hex, centre)
}

/** Cheap legality enumeration: no forecasts, hooks, forks or dice. */
export function burstCentres(ctx: Ctx, actor: number, actionId: string, slot?: import('./types.js').ActionSlot): number[] {
  return Array.from({ length: ctx.geo.hexCount }, (_, h) => h).filter(h => canUseBurst(ctx, actor, h, actionId, slot))
}

function prepare(ctx: Ctx, actor: Unit, centre: number, a: BurstDef) {
  const hexes = burstHexes(ctx, actor.hex, centre, a), cells = new Set(hexes)
  const targeting = { select: 'area' as const, side: a.burst.side, ...(a.burst.requireTags ? { requireTags: a.burst.requireTags } : {}) }
  const targets = ctx.state.units.filter(u => u.lifeState === 'standing' && cells.has(u.hex) && eligible(actor, u, targeting))
    .sort((x, y) => x.uid - y.uid).map(u => ({ id: u.id, uid: u.uid, hex: u.hex,
      shielded: burstCrossings(ctx, centre, u.hex, 'high'), low: burstCrossings(ctx, centre, u.hex, 'low') }))
  const payload = a.burst.packets.map(p => ({ id: p.id, damageType: p.damageType,
    ...resolveSourceDamage(ctx, actor, { id: a.id, ...(p.stat ? { stat: p.stat } : {}), bonus: p.amount, damageType: p.damageType, ...(p.powerScale !== undefined ? { powerScale: p.powerScale } : {}) }, outgoingPenalty(ctx, actor)) }))
  return { hexes, targets, payload, heal: a.burst.heal ?? 0 }
}

function append(ledger: LedgerRow[], station: number, name: string, effectId: string, before: number, after: number): number {
  ledger.push({ station, name, effectId, before, after, delta: after - before })
  return after
}

function planDamage(ctx: Ctx, target: Unit, a: BurstDef, prepared: ReturnType<typeof prepare>, low: readonly string[], adjustments: readonly BurstAdjustment[]) {
  let coverBudget = low.length * 2, available = incomingAbsorb(ctx, target), physicalSeen = false
  const packets: DamagePacket[] = []
  for (const p of prepared.payload) {
    const ledger = p.ledger.map(r => ({ ...r }))
    let value = p.value
    const coverLoss = Math.min(coverBudget, Math.max(0, value))
    coverBudget -= coverLoss
    if (coverLoss) value = append(ledger, DMG.COVER, 'BURST_COVER', low.join(','), value, value - coverLoss)
    const frost = p.damageType === 'physical' && !physicalSeen ? incomingPhysicalBonus(ctx, target) : 0
    if (p.damageType === 'physical') physicalSeen = true
    for (const adjustment of adjustments) value = append(ledger, 545, 'BURST_SAVE', adjustment.id, value, Math.floor(value * adjustment.percent / 100))
    const d = finishDamage(ctx, target, { damageType: p.damageType }, ledger, value, available, frost)
    available -= d.absorbed
    if (d.ledger.reduce((n, r) => n + r.delta, 0) !== d.value || d.raw - d.absorbed + d.mitigationDelta + d.floorAdjustment !== d.value) throw Error('burst packet conservation failed')
    packets.push({ id: p.id, source: a.id, damageType: p.damageType, raw: d.raw, absorbed: d.absorbed, defense: d.defense,
      mitigationDelta: d.mitigationDelta, floorAdjustment: d.floorAdjustment, resisted: d.resisted, resolved: d.value, ledger: d.ledger })
  }
  return { coverDamage: low.length * 2 - coverBudget, packets, value: packets.reduce((n, p) => n + p.resolved, 0), absorbed: packets.reduce((n, p) => n + p.absorbed, 0) }
}

function applyPlan(ctx: Ctx, actor: number, target: number, a: BurstDef, plan: ReturnType<typeof planDamage>) {
  if (!plan.packets.length) return { packets: [], applied: 0, physicalApplied: 0 }
  if (plan.absorbed) spendAbsorb(ctx, target, plan.absorbed, a.id)
  return applyAttackPackets(ctx, target, plan.packets, a.id, { actor, abilityId: a.id, burst: true })
}

/** Current-state forecast only; deliberately does not run any future onBurst hooks. */
export function previewBurst(ctx: Ctx, actorId: number, centre: number, actionId: string) {
  const a = ctx.actions[actionId]
  if (!a || !isBurst(a)) throw Error('not a burst')
  validateBurstAction(a)
  const prepared = prepare(ctx, unit(ctx, actorId), centre, a)
  const targets = prepared.targets.map(t => {
    const target = unit(ctx, t.id)
    if (t.shielded.length) return { ...t, damage: 0, applied: 0, heal: 0, packets: [], conditional: false, kdbChance: null }
    const plan = planDamage(ctx, target, a, prepared, t.low, [])
    const units = [...ctx.state.units]; units[t.id] = structuredClone(target)
    const fork: Ctx = { ...ctx, state: { ...ctx.state, units }, events: [] }
    const result = applyPlan(fork, actorId, t.id, a, plan)
    const hp = units[t.id]!.hp
    applyHealing(fork, t.id, prepared.heal, a.id)
    return { ...t, damage: plan.value, applied: result.applied, heal: units[t.id]!.hp - hp,
      packets: result.packets, conditional: target.triggers.some(x => x.hook === 'onBurst'), kdbChance: burstKdbChance(ctx, target, a, result) }
  })
  return { centre, hexes: prepared.hexes, targets, damage: targets.reduce((n, t) => n + t.damage, 0), heal: targets.reduce((n, t) => n + t.heal, 0) }
}

export function useBurst(ctx: Ctx, actorId: number, centre: number, actionId: string, slot?: import('./types.js').ActionSlot): void {
  if (!canUseBurst(ctx, actorId, centre, actionId, slot)) throw Error('illegal burst')
  const actor = unit(ctx, actorId), a = ctx.actions[actionId] as BurstDef
  const prepared = prepare(ctx, actor, centre, a)
  spendAction(ctx, actorId, a, resolveActionSlot(ctx, actor, a, slot)!)
  const ordinal = beginBurst(ctx, actorId, actionId, { centre, origin: actor.hex, shape: a.burst.shape, hexes: prepared.hexes,
    targets: prepared.targets.map(t => ({uid: t.uid, id: t.id, hex: t.hex})), side: a.burst.side, tags: a.burst.requireTags ?? [], packets: prepared.payload, heal: prepared.heal,
    ...(a.burst.destroy ? { destroy: a.burst.destroy } : {}) })
  for (const t of prepared.targets) {
    const target = unit(ctx, t.id)
    if (target.uid !== t.uid || target.lifeState !== 'standing' || target.hp <= 0) continue
    if (t.shielded.length) { emit(ctx, 'burst.shielded', a.id, { actor: actorId, target: t.id, hex: t.hex, props: t.shielded }); continue }
    const exposed = prepared.payload.reduce((n, p) => n + Math.max(0, p.value), 0) > t.low.length * 2
    const adjustments = exposed ? fireTriggers(ctx, 'onBurst', { ownerId: t.id, targetId: actorId, causeId: a.id, ordinal, keyTag: HOOKS.indexOf('onBurst') }) : []
    if (target.lifeState !== 'standing' || target.hp <= 0) continue
    const plan = planDamage(ctx, target, a, prepared, t.low, adjustments)
    const units = [...ctx.state.units]; units[t.id] = structuredClone(target)
    const fork: Ctx = { ...ctx, state: { ...ctx.state, units }, events: [] }
    const expected = applyPlan(fork, actorId, t.id, a, plan)
    const result = applyPlan(ctx, actorId, t.id, a, plan)
    if (JSON.stringify(result) !== JSON.stringify(expected) || target.hp !== units[t.id]!.hp) throw Error('burst preview/applied mismatch')
    const beforeHeal = target.hp
    applyHealing(ctx, t.id, prepared.heal, a.id)
    emit(ctx, 'burst.struck', a.id, { actor: actorId, target: t.id, hex: t.hex, lowCover: t.low, coverDamage: plan.coverDamage,
      damage: plan.value, applied: result.applied, packets: result.packets, heal: target.hp - beforeHeal })
    // v2.kdb: this recipient's KDB check — keyed by its uid, the caster's uid
    // and the caster's burst ordinal, kind 1 (never a turn).
    if (burstKdbChance(ctx, target, a, result) !== null) resolveKdb(ctx, actorId, t.id, a.id, result.physicalApplied, a.burst.impact ?? 0, [target.uid, actor.uid, ordinal, 1], { burst: true })
  }
  // v2.prop-destroy (COMBAT-V2 §12.2, §12.4): Destroy reaches every prop in or
  // touching the shape — shielded or not, a unit there or not — once, at the end
  // of the burst's resolution, so its own low-cover crossings were already paid.
  if ((a.burst.destroy ?? 0) > 0 && !ctx.state.outcome) for (const p of propsTouching(ctx, prepared.hexes)) damageProp(ctx, p.id, a.burst.destroy!, a.id, actorId)
  settle(ctx, a.id)
}
