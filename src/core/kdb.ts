// KDB — knock down and back. v2.kdb (V2 R4 part 2, 2026-09-23).
//
// COMBAT-V2-DESIGN-2026-09-07.md §9.1, §9.2, §9.5 and §15.4 (ruled 2026-09-07):
//
//   margin = (physical damage dealt + Impact) − target's Strength
//   chance = margin × 15%          (no cap)
//
// "Physical damage only. Magic, true and elemental damage never cause KDB."
// "Damage dealt" is post-armor and post-Protection — the physical packets'
// APPLIED HP. "Impact counts even when damage is 0." Once KDB fires: 40% back,
// 40% down, 20% both. "KDB has no effect on a unit that is already prone."
// Stand Firm: cannot be knocked back or down at all; Agile: cannot be knocked
// down (can still be knocked back); Giant carries Stand Firm. The badges are
// content (their `flags`); core reads the flags, never a badge id.
//
// Two named streams, keyed (persistent unit id, per-unit ordinal, kind) —
// never a turn or a phase: `kdb-occurs` and `kdb-type` (§15.4).
//
// "Down" applies the ONE status content flags `kdbDown` (the prone row), which
// emits unit.proned (v2.prone). "Back" is the V2 knockback (v2.knockback-
// collisions): away from the attacker, collisions apply. "Both" resolves back
// first, then down (SWITCHES.md kdbBothOrder).
//
// One event per check: `kdb.rolled` — margin, chance, roll, fired, kdbType and
// what was applied. The state changes are the existing mutators' own events.

import type { Ctx, Unit } from './types.js'
import { roll100 } from './rng.js'
import { effective } from './stats.js'
import { emit, unit } from './mutate.js'
import { applyStatus, isProne } from './status.js'
import { executeKnockback } from './movement.js'

/** §9.1: "chance = margin × 15%". */
export const KDB_CHANCE_PER_POINT = 15
/** §9.2: "40% back · 40% down · 20% both" — a d100 on kdb-type: 1–40 back, 41–80 down, 81–100 both. */
export const KDB_TYPE_BACK_UPTO = 40
export const KDB_TYPE_DOWN_UPTO = 80
/** How far a KDB "back" pushes. §9 rules no distance: 1 hex (SWITCHES.md kdbBackDistance). */
export const KDB_BACK_HEXES = 1

export type KdbType = 'back' | 'down' | 'both'
export type KdbApplied = KdbType | 'none'

/** Which knock a unit's badges forbid, and which badges say so (id order, Law 6). */
export function knockImmunity(ctx: Ctx, u: Unit): { back: string[]; down: string[] } {
  const back: string[] = [], down: string[] = []
  for (const id of [...u.badges].sort()) {
    const f = ctx.badges[id]?.flags
    if (f?.cannotBeKnockedBack) back.push(id)
    if (f?.cannotBeKnockedDown) down.push(id)
  }
  return { back, down }
}

export type KdbForecast = {
  physical: number
  impact: number
  strength: number
  margin: number
  chance: number
  /** Why no roll is possible: the target is already prone, or can be knocked neither back nor down. */
  immune?: 'prone' | 'standFirm'
  /** The badges that make it Stand Firm (Law 12: the line names its cause). */
  immuneBy?: string[]
}

/**
 * The KDB numbers for a target that took `physical` applied physical damage
 * from something carrying `impact`. Pure: the preview and the resolution both
 * read it (Law 1). Chance 0 when the margin is 0 or less, or the target is immune.
 */
export function kdbForecast(ctx: Ctx, target: Unit, physical: number, impact: number): KdbForecast {
  return kdbChanceOf(kdbTarget(ctx, target), physical, impact)
}

/** The target's side of the comparison — Strength and immunity — read once. */
export type KdbTarget = { strength: number; immune?: 'prone' | 'standFirm'; immuneBy?: string[] }
export function kdbTarget(ctx: Ctx, target: Unit): KdbTarget {
  const strength = effective(ctx, target, 'strength').value
  if (isProne(ctx, target)) return { strength, immune: 'prone' }
  const imm = knockImmunity(ctx, target)
  if (imm.back.length > 0 && imm.down.length > 0) return { strength, immune: 'standFirm', immuneBy: [...new Set([...imm.back, ...imm.down])].sort() }
  return { strength }
}
/**
 * The arithmetic, given the target's side. The preview reads the target once
 * for its three branches (Law 0, measured 2026-09-23: three full Strength
 * resolutions per preview made the 575-battle panel ~15% slower).
 */
export function kdbChanceOf(t: KdbTarget, physical: number, impact: number): KdbForecast {
  const margin = physical + impact - t.strength
  const base = { physical, impact, strength: t.strength, margin }
  if (t.immune) return { ...base, chance: 0, immune: t.immune, ...(t.immuneBy ? { immuneBy: t.immuneBy } : {}) }
  return { ...base, chance: margin > 0 ? margin * KDB_CHANCE_PER_POINT : 0 }
}

/** The status a KDB "down" applies: the content row flagged kdbDown (lowest id if several). */
export function kdbDownStatus(ctx: Ctx): string | null {
  const ids = Object.keys(ctx.statuses).filter((id) => ctx.statuses[id]!.kdbDown && ctx.statuses[id]!.prone).sort()
  return ids[0] ?? null
}

/**
 * Resolve one KDB check. `keys` are the roll's address — the target's uid, a
 * per-unit ordinal and a kind tag (attack 0, burst 1); never a turn. A target
 * that is no longer standing, or at 0 Health, is past knocking: no check.
 * Returns what was applied.
 */
export function resolveKdb(
  ctx: Ctx, attackerId: number, targetId: number, causeId: string,
  physical: number, impact: number, keys: readonly number[], extra: Record<string, unknown> = {},
): KdbApplied | null {
  const tg = unit(ctx, targetId)
  if (tg.lifeState !== 'standing' || tg.hp <= 0) return null
  const f = kdbForecast(ctx, tg, physical, impact)
  const roll = f.chance > 0 ? roll100(ctx.rng, 'kdb-occurs', ...keys) : null
  const fired = roll !== null && roll <= f.chance
  let typeRoll: number | null = null
  let type: KdbType | null = null
  let applied: KdbApplied | null = null
  const suppressedBy: string[] = []
  let gap: string | undefined
  const downStatus = kdbDownStatus(ctx)
  if (fired) {
    typeRoll = roll100(ctx.rng, 'kdb-type', ...keys)
    type = typeRoll <= KDB_TYPE_BACK_UPTO ? 'back' : typeRoll <= KDB_TYPE_DOWN_UPTO ? 'down' : 'both'
    const imm = knockImmunity(ctx, tg)
    let back = type !== 'down', down = type !== 'back'
    if (back && imm.back.length) { back = false; suppressedBy.push(...imm.back) }
    if (down && imm.down.length) { down = false; suppressedBy.push(...imm.down) }
    if (down && downStatus === null) { down = false; gap = 'no status flagged kdbDown in the registry — down not applied' }
    applied = back && down ? 'both' : back ? 'back' : down ? 'down' : 'none'
  }
  emit(ctx, 'kdb.rolled', causeId, {
    actor: attackerId, target: targetId, ...extra,
    physical: f.physical, impact: f.impact, strength: f.strength, margin: f.margin, chance: f.chance,
    roll, fired, typeRoll, kdbType: type, applied,   // `type` is the event's own name — never a field
    ...(f.immune ? { immune: f.immune } : {}), ...(f.immuneBy ? { immuneBy: f.immuneBy } : {}),
    ...(suppressedBy.length ? { suppressedBy: [...new Set(suppressedBy)] } : {}),
    ...(gap ? { gap } : {}),
  })
  if (applied === 'back' || applied === 'both') executeKnockback(ctx, attackerId, targetId, KDB_BACK_HEXES, causeId)
  if ((applied === 'down' || applied === 'both') && downStatus !== null) {
    // "both": back first, then down — a push's collision can take the unit to 0
    // Health; a body is not knocked down (settle decides what it is).
    const now = unit(ctx, targetId)
    if (now.lifeState === 'standing' && now.hp > 0) applyStatus(ctx, targetId, downStatus, 1, causeId)
  }
  return applied
}
