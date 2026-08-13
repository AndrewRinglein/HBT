// Statuses. Four shapes cover every one in the design doc (COMBAT-FRAMEWORK.md):
//
//   counter   ticks down and does something each tick   poison, burn, regen, stun
//   pool      spent when something consumes it          protection, shields
//   modifier  a number that changes something           weakness
//   flag      on or off                                 stealthed, dazed
//
// A status is DATA on the unit plus a small code module here. Adding one is a
// row in the registry and, if it needs behaviour, one function.

import type { Ctx, Side, Unit } from './types.js'
import { applyDamage, emit, unit } from './mutate.js'

/**
 * `shape` is DOCUMENTATION and a checklist — not a branch.
 * A status is a number plus the set of hooks that read and write it; the shapes
 * are just the common hook bundles, and naming them helps us talk about content.
 *
 *   counter   onPhaseEnd + decay        poison, burn, regen, stun
 *   pool      reducesIncomingDamage     protection, shields
 *   modifier  reducesOutgoingDamage     weakness
 *   flag      blocksAction / a flag     stunned, dazed, stealthed
 *
 * A pool was, until this refactor, a counter with no onPhaseEnd running down a
 * duplicate code path. The only thing that genuinely differs is WHICH HOOKS it
 * touches — and a pool is the only kind read and written mid-damage-resolution.
 */
export type StatusShape = 'counter' | 'pool' | 'modifier' | 'flag'
export type Stacking = 'add' | 'highest' | 'refresh'

export type StatusDef = {
  readonly id: string
  readonly name: string
  readonly shape: StatusShape
  readonly stacking: Stacking

  // ── hooks: what reads and writes this status ──────────────────────────────
  /** End of Phase, before decay. */
  readonly onPhaseEnd?: (ctx: Ctx, unitId: number, value: number) => void
  /** How much it loses at End of Phase. Default 1; 0 = lasts until removed. */
  readonly decayPerPhase?: number
  /** Read at damage station PROTECTION (550): absorbs damage and is spent by it. */
  readonly reducesIncomingDamage?: boolean
  /** Read at damage station SOURCE_STATUS (250): lowers damage this unit deals. */
  readonly reducesOutgoingDamage?: boolean
  /** Read by the turn loop: the unit cannot move or act. */
  readonly blocksAction?: boolean
  /** Read by heal(): healing received is halved. */
  readonly halvesHealing?: boolean
}

export function valueOf(u: Unit, id: string): number {
  return u.statuses.find((s) => s.id === id)?.value ?? 0
}
export function hasStatus(u: Unit, id: string): boolean {
  return valueOf(u, id) > 0
}

export function applyStatus(ctx: Ctx, unitId: number, id: string, value: number, causeId: string): void {
  const def = ctx.statuses[id]
  if (!def) throw new Error(`unknown status '${id}' — statuses are an explicit registry, check content/statuses.ts`)
  const u = unit(ctx, unitId)
  const existing = u.statuses.find((s) => s.id === id)
  const before = existing?.value ?? 0
  const after = def.stacking === 'add' ? before + value
    : def.stacking === 'highest' ? Math.max(before, value)
    : value
  if (existing) existing.value = after
  else {
    u.statuses.push({ id, value: after })
    // Sorted, so iteration is never insertion order (Law 6).
    u.statuses.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  }
  emit(ctx, 'status.applied', causeId, { target: unitId, statusId: id, amount: value, before, after })
}

export function reduceStatus(ctx: Ctx, unitId: number, id: string, by: number, causeId: string): number {
  const u = unit(ctx, unitId)
  const s = u.statuses.find((x) => x.id === id)
  if (!s) return 0
  const before = s.value
  s.value = Math.max(0, s.value - by)
  const spent = before - s.value
  emit(ctx, 'status.reduced', causeId, { target: unitId, statusId: id, by: spent, before, after: s.value })
  if (s.value === 0) removeStatus(ctx, unitId, id, causeId)
  return spent
}

export function removeStatus(ctx: Ctx, unitId: number, id: string, causeId: string): void {
  const u = unit(ctx, unitId)
  const i = u.statuses.findIndex((s) => s.id === id)
  if (i < 0) return
  u.statuses.splice(i, 1)
  emit(ctx, 'status.expired', causeId, { target: unitId, statusId: id })
}

/** Damage this unit deals is reduced by the total of any outgoing-damage statuses. */
export function outgoingPenalty(ctx: Ctx, u: Unit): number {
  let p = 0
  for (const s of u.statuses) if (ctx.statuses[s.id]?.reducesOutgoingDamage) p += s.value
  return p
}

export function isBlocked(ctx: Ctx, u: Unit): boolean {
  return u.statuses.some((s) => ctx.statuses[s.id]?.blocksAction && s.value > 0)
}

export function healingHalved(ctx: Ctx, u: Unit): boolean {
  return u.statuses.some((s) => ctx.statuses[s.id]?.halvesHealing && s.value > 0)
}

/** Heal, honouring anything that halves it. Integer division, truncated (Law 7). */
export function heal(ctx: Ctx, unitId: number, amount: number, causeId: string): number {
  const u = unit(ctx, unitId)
  const halved = healingHalved(ctx, u)
  const eff = halved ? Math.trunc(amount / 2) : amount
  const before = u.hp
  u.hp = Math.min(u.maxHp, u.hp + eff)
  const healed = u.hp - before
  emit(ctx, 'heal.applied', causeId, { target: unitId, requested: amount, halved, amount: healed, hpBefore: before, hpAfter: u.hp })
  return healed
}

/** Damage from a status, not an attack. Same mutator, different cause. */
export function statusDamage(ctx: Ctx, unitId: number, amount: number, causeId: string): void {
  applyDamage(ctx, unitId, amount, causeId, { actor: null, statusId: causeId, damageType: 'true' })
}

/** Total of everything on this unit that absorbs incoming damage. */
export function incomingAbsorb(ctx: Ctx, u: Unit): number {
  let a = 0
  for (const s of u.statuses) if (ctx.statuses[s.id]?.reducesIncomingDamage) a += s.value
  return a
}

/**
 * Spend absorbing statuses for `amount`, cheapest-expiring first — here, id order,
 * which is stable and stated rather than emergent. Returns what each one paid.
 */
export function spendAbsorb(ctx: Ctx, unitId: number, amount: number, causeId: string): { id: string; spent: number }[] {
  const u = unit(ctx, unitId)
  const out: { id: string; spent: number }[] = []
  let left = amount
  for (const s of [...u.statuses].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (left <= 0) break
    if (!ctx.statuses[s.id]?.reducesIncomingDamage) continue
    const spent = reduceStatus(ctx, unitId, s.id, Math.min(left, s.value), causeId)
    if (spent > 0) { out.push({ id: s.id, spent }); left -= spent }
  }
  return out
}

/**
 * The End of Phase status pass, for one side. ONE loop, not two.
 * Every status acts if it has an onPhaseEnd, then loses `decayPerPhase` (default 1).
 * Order is unit id then status id — never insertion order — so results never
 * depend on the order things happened to be applied.
 */
export function tickStatuses(ctx: Ctx, side: Side): void {
  const ids = ctx.state.units
    .filter((u) => u.side === side && u.lifeState === 'standing' && u.statuses.length > 0)
    .map((u) => u.id).sort((a, b) => a - b)

  for (const id of ids) {
    const u = unit(ctx, id)
    for (const s of [...u.statuses].sort((a, b) => (a.id < b.id ? -1 : 1))) {
      const def = ctx.statuses[s.id]
      if (!def) continue
      if (u.lifeState !== 'standing') break
      def.onPhaseEnd?.(ctx, id, s.value)
      const decay = def.decayPerPhase ?? 1
      if (decay > 0) reduceStatus(ctx, id, s.id, decay, s.id)
    }
  }
}
