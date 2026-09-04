// Targeting — who an ability or a trigger is allowed to land on.
//
// ONE vocabulary, two callers. Abilities and triggers were heading for separate
// target languages, which is how "target" comes to mean two things in two files.
//
// SPEC: Angela, 2026-08-15 — abilities must be able to target
//   · an area                      · all allies in an area
//   · all enemies in an area       · an ally or an enemy
//   · self
// and must be able to restrict legality by TYPE: "target undead" may only be used
// on an undead; "heal all rangers" reaches allies of that type and no others.
//
// GAME-DESIGN.md §5 sets the hard requirement on the failure mode:
//   "Silent target fallback. An unrecognized or mistyped target keyword silently
//    resolves to the trigger's owner instead of erroring ... The new engine errors
//    loudly on unknown targets."
// So every field below is validated at load, and an unknown value throws.

import type { Ctx, Unit } from './types.js'

export type TargetSide = 'ally' | 'enemy' | 'any'
export const TARGET_SIDES: readonly TargetSide[] = ['ally', 'enemy', 'any'] as const

export type TargetSelect = 'self' | 'unit' | 'area'
export const TARGET_SELECTS: readonly TargetSelect[] = ['self', 'unit', 'area'] as const

export type Targeting = {
  /** `self` · one `unit` · everything in an `area`. */
  readonly select: TargetSelect
  /** Which side is eligible. Ignored when select is 'self'. */
  readonly side: TargetSide
  /**
   * Area only. Hexes from the origin, inclusive. 0 = the origin hex alone.
   * Omitted on an area means the whole side, unbounded — "heal all rangers".
   */
  readonly radius?: number
  /**
   * Legality filter, not a preference. "Target undead" may only be USED on an
   * undead; an ability whose tags match nothing is not castable, and `canUsePower`
   * says so rather than fizzling on resolution.
   */
  readonly requireTags?: readonly string[]
  /**
   * Area only — what the radius is measured FROM.
   *
   * `self` (default): a whirlwind, an aura, an explosion where you died.
   * `target`: a cleave — everything near the thing you just hit.
   *
   * Both are real, so it is stated rather than inferred from the hook. This is
   * TRIGGER-NOTES.md Q2, answered by making it explicit instead of picking.
   */
  readonly origin?: 'self' | 'target'
}

export function validateTargeting(t: Targeting, where: string): void {
  if (!TARGET_SELECTS.includes(t.select)) throw new Error(`${where}: unknown target select '${t.select}'`)
  if (!TARGET_SIDES.includes(t.side)) throw new Error(`${where}: unknown target side '${t.side}'`)
  if (t.radius !== undefined) {
    if (t.select !== 'area') throw new Error(`${where}: radius only means something for select:'area'`)
    if (!Number.isInteger(t.radius) || t.radius < 0) {
      throw new Error(`${where}: radius must be a non-negative integer, got ${t.radius}`)
    }
  }
  if (t.select === 'self' && t.side !== 'any' && t.side !== 'ally') {
    throw new Error(`${where}: select:'self' cannot have side:'${t.side}'`)
  }
  if (t.origin !== undefined) {
    if (t.select !== 'area') throw new Error(`${where}: origin only means something for select:'area'`)
    if (t.origin !== 'self' && t.origin !== 'target') throw new Error(`${where}: unknown origin '${t.origin}'`)
  }
  if (t.requireTags?.some((x) => !x)) throw new Error(`${where}: an empty tag is not a tag`)
}

/**
 * Does this unit satisfy the side and type filters?
 *
 * THE ACTOR IS ALWAYS ONE OF ITS OWN ALLIES. There is no opt-out, by ruling.
 *
 * Angela, 2026-08-15: "I don't think we're ever gonna use exclude self. Because
 * it's already either including or excluding heroes or things by target, but I
 * don't think self will ever be one of those."
 *
 * `excludeSelf` existed here as a flag and was deleted. The reasoning is worth
 * keeping: side and `requireTags` are the two axes an effect actually discriminates
 * on, and "everyone but me" is not a third one — it is a shape nobody authors. A
 * flag that no content ever sets is a branch that is never exercised, and this file
 * already carries four of those in the shape of unfired hooks.
 */
export function eligible(actor: Unit, u: Unit, t: Targeting): boolean {
  if (u.lifeState === 'dead') return false
  const isAlly = u.side === actor.side
  if (t.side === 'ally' && !isAlly) return false
  if (t.side === 'enemy' && isAlly) return false
  // ALL required tags must be present — "undead demon" means both, not either.
  if (t.requireTags) for (const tag of t.requireTags) if (!u.tags.includes(tag)) return false
  return true
}

/**
 * Everyone an ability actually lands on, given the unit or hex it was aimed at.
 * Always sorted by unit id — Law 6, and it keeps the log reproducible.
 */
export function resolveTargets(ctx: Ctx, actor: Unit, t: Targeting, aimedAt: number): number[] {
  switch (t.select) {
    case 'self':
      return [actor.id]

    case 'unit': {
      const u = ctx.state.units[aimedAt]
      return u && eligible(actor, u, t) ? [u.id] : []
    }

    case 'area': {
      const centre = ctx.state.units[aimedAt]
      // An area is aimed at a unit today. Aiming at an empty HEX is a separate
      // capability (a targeting cursor) and is not pretended at here.
      if (!centre) return []
      const out: number[] = []
      for (const u of ctx.state.units) {
        if (!eligible(actor, u, t)) continue
        if (t.radius !== undefined && ctx.geo.distance(centre.hex, u.hex) > t.radius) continue
        out.push(u.id)
      }
      return out.sort((a, b) => a - b)
    }

    default:
      throw new Error(`unknown target select '${String(t.select)}'`)
  }
}

/**
 * Is there anything this could legally be aimed at right now?
 *
 * "Target undead" on a board with no undead is NOT castable — that is a legality
 * question, answered before the stamina is spent, not a fizzle discovered after.
 */
export function hasAnyTarget(ctx: Ctx, actor: Unit, t: Targeting, range: number): boolean {
  if (t.select === 'self') return true
  for (const u of ctx.state.units) {
    if (!eligible(actor, u, t)) continue
    if (ctx.geo.distance(actor.hex, u.hex) <= range) return true
  }
  return false
}
