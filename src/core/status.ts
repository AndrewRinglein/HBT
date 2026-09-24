// Statuses. Four shapes cover every one in the design doc (COMBAT-FRAMEWORK.md):
//
//   counter   ticks down and does something each tick   poison, burn, regen, stun
//   pool      spent when something consumes it          protection, shields
//   modifier  a number that changes something           weakness
//   flag      on or off                                 stealthed, dazed
//
// A status is DATA on the unit plus a small code module here. Adding one is a
// row in the registry and, if it needs behaviour, one function.

import { flatDamage } from './mitigation.js'
import type { Ctx, Side, Unit } from './types.js'
import { applyDamage, applyHealing, emit, reduceStatus, removeStatus, setLifeState, unit } from './mutate.js'
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
  /** V2: every damaging status declares its type; Burn is fire, Poison poison, Bleed true. */
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
  /** Removes Block/Ranged Block while positive; independent from activation locking. */
  readonly blocksBlock?: boolean
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
   * capability.frost (2026-09-03), the Codex row: "Adds its value to every
   * physical hit the unit receives, per hit." Read at damage station FROST
   * (540) — BEFORE Armor (ruled 2026-09-03: "Frost is added BEFORE Armor, so
   * a hit is Strength + Frost − Armor"), and before Protection by default
   * (SWITCHES.md frostBeforeProtection).
   */
  readonly addsIncomingPhysical?: boolean
  /**
   * capability.root (2026-09-03), the Codex row: "Stops the unit moving at
   * all." Read at beginActivation: movement points are 0 while it is held;
   * the unit still acts from where it stands.
   */
  readonly blocksMovement?: boolean
  /**
   * capability.taunt (2026-09-03), the Codex row: "Forces the taunted unit to
   * target whoever taunted it." Angela, 2026-09-03: "Taunt makes the hero
   * target that unit. It can keep its same AI, like melee or ranged." The
   * taunter is the status's `by` on the unit; the AI's candidate list is
   * narrowed to it while it lives.
   */
  readonly forcesTarget?: boolean
  /**
   * Applied onto a unit holding `cancels`, the two annihilate one for one
   * (rule.burn-frost-cancel: "Burn and Frost annihilate one for one on
   * application — a unit never carries both").
   */
  readonly cancels?: string
  /**
   * capability.karma (2026-09-03), the Codex row: "Increases every heal the
   * unit receives by its value, and every point of damage it deals by half
   * its value." Read by applyHealing (whole value) and at DMG.SOURCE_STATUS
   * (half, rounded down — "rounded down", the longEffect). "No clock: -1 on a
   * kill, and nothing else" — `decayOnKill`, read where onKill fires.
   */
  readonly boostsHealingReceived?: boolean
  readonly boostsOutgoingHalf?: boolean
  readonly decayOnKill?: boolean
  /**
   * capability.shadow (2026-09-03), the Codex row: "Obliterates the unit —
   * killed, removed, no corpse — once it reaches the unit's Max Health." "It
   * GROWS: +1 per Turn, first of everything in Settling. It never decays."
   * `grows` = the per-tick growth; the tick compares it to Max Health.
   */
  readonly grows?: number
  readonly obliteratesAtMaxHp?: boolean
  /**
   * capability.confusion (2026-09-03), the Codex row: "Swaps the affected
   * unit's AI strategy for a different one." Read by runActivation: the next
   * mode in the registry's order stands in while it lasts.
   */
  readonly swapsAi?: boolean
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
  /**
   * v2.prone (COMBAT-V2-DESIGN-2026-09-07.md §10, ruled). Holding a positive
   * status that carries this rule makes the unit PRONE — a status flag, never
   * a LifeState: it still acts, keeps its Block and fills its hex. The rule's
   * numbers are content (the Codex row): attacks against the holder gain
   * `accuracyAgainst` (ACC.PRONE) and `damageAgainst` (DMG.PRONE); the holder's
   * Dodge takes `dodge` (a derived stat mod, effective()); the holder's own
   * attacks take `accuracy` and `damage`. What the rule means without numbers
   * is the board's: no zone of control (so no attacks of opportunity), no
   * movement action but standing, Airwalk suspended. `standAction` is the
   * movement power the status grants while held — "a movement-action power
   * every unit has and that only appears while prone"; using it removes every
   * prone status (MoveEffect `stand`).
   */
  readonly prone?: ProneRule
}

export type ProneRule = {
  readonly accuracyAgainst: number
  readonly dodge: number
  readonly damageAgainst: number
  readonly accuracy: number
  readonly damage: number
  readonly standAction: string
}

/** v2.prone: every prone rule this unit holds, in status-id order (Law 6). */
export function proneRulesOf(ctx: Ctx, u: Unit): { statusId: string; rule: ProneRule }[] {
  const out: { statusId: string; rule: ProneRule }[] = []
  if (u.statuses.length === 0) return out
  for (const s of u.statuses) { const r = ctx.statuses[s.id]?.prone; if (r && s.value > 0) out.push({ statusId: s.id, rule: r }) }
  return out.length > 1 ? out.sort((a, b) => (a.statusId < b.statusId ? -1 : a.statusId > b.statusId ? 1 : 0)) : out
}
/** v2.prone: is this unit knocked down? */
export function isProne(ctx: Ctx, u: Unit): boolean {
  return proneRulesOf(ctx, u).length > 0
}
/**
 * v2.prone, §10: "Airwalk — suspended: a knocked-down unit triggers the traps
 * and ground effects of its hex." Airwalk itself is not implemented in the
 * engine yet (SWITCHES.md proneAirwalkFact); this is the fact its
 * implementation must read.
 */
export function airwalkSuspended(ctx: Ctx, u: Unit): boolean {
  return isProne(ctx, u)
}

export function valueOf(u: Unit, id: string): number {
  return u.statuses.find((s) => s.id === id)?.value ?? 0
}
export function hasStatus(u: Unit, id: string): boolean {
  return valueOf(u, id) > 0
}

export function applyStatus(ctx: Ctx, unitId: number, id: string, value: number, causeId: string, by?: number): void {
  const def = ctx.statuses[id]
  if (!def) throw new Error(`unknown status '${id}' — statuses are an explicit registry, check content/statuses.ts`)
  const u = unit(ctx, unitId)
  // rule.burn-frost-cancel (capability.frost, 2026-09-03): one for one on application
  if (def.cancels) {
    const other = u.statuses.find((s) => s.id === def.cancels)
    if (other && other.value > 0 && value > 0) {
      const cancelled = Math.min(other.value, value)
      emit(ctx, 'status.cancelled', causeId, { target: unitId, statusId: id, against: def.cancels, amount: cancelled })
      reduceStatus(ctx, unitId, def.cancels, cancelled, causeId)
      value -= cancelled
      if (value <= 0) return
    }
  }
  const existing = u.statuses.find((s) => s.id === id)
  const before = existing?.value ?? 0
  const after = def.stacking === 'add' ? before + value
    : def.stacking === 'highest' ? Math.max(before, value)
    : value
  if (existing) { existing.value = after; if (by !== undefined) existing.by = by }
  else {
    u.statuses.push({ id, value: after, ...(by !== undefined ? { by } : {}) })
    // Sorted, so iteration is never insertion order (Law 6).
    u.statuses.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  }
  emit(ctx, 'status.applied', causeId, { target: unitId, statusId: id, amount: value, before, after, ...(by !== undefined ? { by } : {}) })
  // v2.prone: the moment a unit goes down is its own line for the viewer (Law 3)
  if (def.prone && before <= 0 && after > 0) emit(ctx, 'unit.proned', causeId, { target: unitId, statusId: id, hex: u.hex })
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

/** Typed HP damage. Resistance changes damage only, never the status clock (V2 section 8). */
export function statusDamage(ctx: Ctx, unitId: number, amount: number, causeId: string): void {
  const def = ctx.statuses[causeId]
  if (!def?.tickDamageType) throw new Error(`Damaging status '${causeId}' must declare its damage type`)
  const damageType = def.tickDamageType
  const target = unit(ctx, unitId)
  const result = flatDamage(ctx, target, amount, damageType, incomingAbsorb(ctx, target))
  if (result.absorbed > 0) spendAbsorb(ctx, unitId, result.absorbed, causeId)
  applyDamage(ctx, unitId, result.value, causeId, {
    actor: null, statusId: causeId, damageType,
    ...(result.resisted ? { resisted: result.resisted } : {}),
    ...(result.absorbed ? { absorbed: result.absorbed } : {}),
  })
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
    // capability.shadow: it grows first, then is compared to Max Health
    if (def.grows) {
      applyStatus(ctx, unitId, s.id, def.grows, s.id)
      const now = u.statuses.find((x) => x.id === s.id)?.value ?? 0
      if (def.obliteratesAtMaxHp && now >= u.maxHp) {
        emit(ctx, 'unit.obliterated', s.id, { target: unitId, shadow: now, maxHp: u.maxHp })
        u.hp = 0
        setLifeState(ctx, unitId, 'dead', s.id, { reason: 'obliterated', corpse: false })
        break
      }
    }
    def.onPhaseEnd?.(ctx, unitId, s.value)
    const decay = def.decayPerPhase ?? 1
    if (decay > 0) reduceStatus(ctx, unitId, s.id, decay, s.id)
  }
}

/** capability.karma: the heal bonus this unit's statuses grant to healing it receives. */
export function healingBonus(ctx: Ctx, u: Unit): number {
  let n = 0
  for (const s of u.statuses) if (ctx.statuses[s.id]?.boostsHealingReceived) n += s.value
  return n
}
/** capability.karma: half the value, rounded down, of every status that boosts this unit's outgoing damage. */
export function outgoingBonus(ctx: Ctx, u: Unit): number {
  let n = 0
  for (const s of u.statuses) if (ctx.statuses[s.id]?.boostsOutgoingHalf) n += Math.floor(s.value / 2)
  return n
}
/** capability.karma: "-1 on a kill, and nothing else" — every decayOnKill status the killer holds loses 1. */
export function decayOnKill(ctx: Ctx, killerId: number, causeId: string): void {
  const u = unit(ctx, killerId)
  for (const s of [...u.statuses]) if (ctx.statuses[s.id]?.decayOnKill && s.value > 0) reduceStatus(ctx, killerId, s.id, 1, causeId)
}
/** capability.confusion: is this unit's AI swapped out? */
export function isConfused(ctx: Ctx, u: Unit): boolean {
  return u.statuses.some((s) => ctx.statuses[s.id]?.swapsAi && s.value > 0)
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

/** capability.frost: the sum of every status that adds to incoming physical hits. */
export function incomingPhysicalBonus(ctx: Ctx, u: Unit): number {
  let n = 0
  for (const s of u.statuses) if (ctx.statuses[s.id]?.addsIncomingPhysical) n += s.value
  return n
}
/** capability.root: is this unit held in place? */
export function isRooted(ctx: Ctx, u: Unit): boolean {
  return u.statuses.some((s) => ctx.statuses[s.id]?.blocksMovement && s.value > 0)
}
/** capability.taunt: the unit this one must target, if a live taunt names one that still stands. */
export function forcedTargetOf(ctx: Ctx, u: Unit): number | null {
  for (const s of u.statuses) {
    if (!ctx.statuses[s.id]?.forcesTarget || s.value <= 0 || s.by === undefined) continue
    const t = ctx.state.units[s.by]
    if (t && t.lifeState === 'standing' && t.side !== u.side) return t.id
  }
  return null
}
