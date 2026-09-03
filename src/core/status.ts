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
import { applyDamage, applyHealing, emit, reduceStatus, removeStatus, unit } from './mutate.js'
import { effective } from './stats.js'

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
  /**
   * What KIND of damage this status ticks — RULED 2026-08-27: "Status damage
   * from poison and burn is magic damage... It gets reduced by resist. Bleed
   * damage is true damage." The type IS the mitigation rule, exactly as it is
   * for attacks: magic is resist-reduced, physical would be armor-reduced,
   * true (and absent) is flat. Replaces the 2026-08-20 tickMitigatedByResist
   * flag — same arithmetic for burn/poison/bleed, one vocabulary instead of
   * a bespoke boolean.
   */
  readonly tickDamageType?: import('./types.js').DamageType

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
  /**
   * Read ONCE at beginActivation: this Activation's movement points are the
   * unit's Movement minus the summed value of every such status (floor 0 — the
   * unit still acts from where it stands). Applied mid-activation it bites the
   * NEXT activation, never the current one (SWITCHES.md slowReadAtActivationStart).
   */
  readonly reducesMovement?: boolean
  /** Read by heal(): healing received is halved. */
  readonly halvesHealing?: boolean
  /**
   * Read by canUsePower — station.crit (2026-08-27), the chart's Dazed row:
   * "loses access to class powers, 3 turns". Attacks and movement stay.
   */
  readonly locksPowers?: boolean
  /**
   * Read by applyHealing — fix.bleed-magnitude (2026-09-02), Codex S41/S43
   * ("healing should cure bleed", "half the applied amount comes off Bleed"):
   * every heal this unit receives reduces the status by HALF the healing,
   * rounded nearest with 0.5 up. Lives in the one heal mutator so no heal
   * source — a power, a Regeneration tick — can forget it.
   */
  readonly shedByHealing?: 'half'
  /**
   * Codex S51: "Takes the unit out of its owner's control and hands it to the
   * AI." Read by NOTHING in the engine — every unit here is AI-driven — and
   * carried so the log, the viewer and the kingdom can see who is Dazed.
   */
  readonly aiControlled?: boolean
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

// reduceStatus / removeStatus moved into mutate.ts (fix.bleed-magnitude,
// 2026-09-02) so the one heal mutator can shed Bleed without importing this
// module back (status.ts already imports mutate.ts). Same bodies, same events;
// re-exported here so every existing caller keeps its import.
export { reduceStatus, removeStatus }

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

/**
 * Heal, honouring anything that halves it. NOW A DELEGATE (2026-08-20): this was
 * a slot with its own halving math, which became a SECOND healing path the moment
 * `applyHealing` gained the Burn gate — the exact preview/resolution drift §5's
 * "do not port" list warns about. One mutator, one gate; this survives only as a
 * convenience that returns how much landed.
 */
export function heal(ctx: Ctx, unitId: number, amount: number, causeId: string): number {
  const u = unit(ctx, unitId)
  const before = u.hp
  applyHealing(ctx, unitId, amount, causeId)
  return u.hp - before
}

/**
 * Damage from a status, not an attack. Same mutator, different cause.
 *
 * RULED, Angela 2026-08-20: Resist mitigates Burn and Poison per tick — never
 * Bleed. Per-tick damage = max(0, value − Resist), and Resist never touches the
 * status VALUE, which decays on its own clock: 5 Poison vs 2 Resist deals
 * 3, 2, 1, 0, 0 as the value walks 5→4→3→2→1→0. A resisted status runs its full
 * duration; Resist shortens the pain, never the clock. The per-status flag is
 * `tickMitigatedByResist` — bleed, when it lands, simply does not set it.
 */
export function statusDamage(ctx: Ctx, unitId: number, amount: number, causeId: string): void {
  const def = ctx.statuses[causeId]
  const damageType = def?.tickDamageType ?? 'true'
  let resisted = 0
  if (damageType === 'magic' || damageType === 'physical') {
    const stat = damageType === 'magic' ? 'resist' as const : 'armor' as const
    const mit = effective(ctx, unit(ctx, unitId), stat).value
    resisted = Math.min(amount, Math.max(0, mit))
    amount -= resisted
  }
  applyDamage(ctx, unitId, amount, causeId,
    resisted > 0
      ? { actor: null, statusId: causeId, damageType, resisted }
      : { actor: null, statusId: causeId, damageType })
}

/** Healing from a status, not an action. Same mutator, different cause. */
export function statusHeal(ctx: Ctx, unitId: number, amount: number, causeId: string): void {
  applyHealing(ctx, unitId, amount, causeId)
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
 * ONE unit's status pass — damage, healing, decay, expiry, in status-id order
 * (Law 6: never insertion order).
 *
 * RULED 2026-08-26 (DECISIONS.md): this runs at the END OF THE UNIT'S OWN
 * ACTIVATION, not at End of Phase. Seen in a replay: zombies crossed embers
 * and every burn queued up to fire one at a time at phase end — "statuses are
 * supposed to resolve at the end of each unit's activation... a unit can die
 * at the end of its activation." The hooks keep their historical names
 * (onPhaseEnd / decayPerPhase) for now — renaming the StatusDef surface is a
 * follow-up, not smuggled into a timing fix.
 */
export function tickUnitStatuses(ctx: Ctx, unitId: number): void {
  const u = unit(ctx, unitId)
  if (u.lifeState !== 'standing' || u.statuses.length === 0) return
  for (const s of [...u.statuses].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const def = ctx.statuses[s.id]
    if (!def) continue
    if (u.lifeState !== 'standing') break
    def.onPhaseEnd?.(ctx, unitId, s.value)
    const decay = def.decayPerPhase ?? 1
    if (decay > 0) reduceStatus(ctx, unitId, s.id, decay, s.id)
  }
}

/**
 * The old per-side End of Phase pass, kept ONLY as a helper over the per-unit
 * tick (tests use it to advance a clock). The battle loop no longer calls it —
 * the tick lives on the End of Activation ladder (ruled 2026-08-26).
 */
export function tickStatuses(ctx: Ctx, side: Side): void {
  const ids = ctx.state.units
    .filter((u) => u.side === side && u.lifeState === 'standing' && u.statuses.length > 0)
    .map((u) => u.id).sort((a, b) => a - b)
  for (const id of ids) tickUnitStatuses(ctx, id)
}
