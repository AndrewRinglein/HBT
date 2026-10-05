// Thorns — a magnitude, not a tick. v2.thorns (V2 R5, 2026-09-24).
//
// COMBAT-V2-DESIGN-2026-09-07.md §9.4 (ruled 2026-09-07): "Thorns is a magnitude,
// not a tick. A unit with Thorns N:
//   - deals N true damage to any melee attacker that hits it — on the hit, whether
//     or not armor absorbed the damage; never on a miss, a block, a ranged attack
//     or a burst;
//   - adds N to its collision value (§9.3);
//   - does nothing when it attacks.
// The v1 Thorns tick (true damage per activation) is a mistake and is removed."
//
// DECISIONS.md 2026-08-27: "Thorns damage that is dealt is true damage." Protection
// absorbs it, Armor and the resists do not — the collision precedent (SWITCHES.md
// knockbackProtectionAbsorbs; V2 Thorns thornsProtectionAbsorbs).
//
// Thorns is the `thorns` STAT: 0 on a bare body, folded at fielding from items,
// badges and specialties (unit.equipped / unit.badged name them), and open to
// stored and derived modifiers like any other stat. Core never names a source.
//
// The reflected damage fires NO hooks — it is not a hit — so two thorned units
// cannot ping-pong, and a thorned attacker is never answered by its own spikes
// (§9.4 "nothing when it attacks"). One event: `thorns.reflected`, then the
// damage's own `damage.applied` (thorns: true). Both name their cause as the
// melee attack whose hit set the spikes off (Law 12).

import type { AttackDef, Ctx, Unit } from './types.js'
import { effective } from './stats.js'
import { dealDirectDamage } from './status.js'
import { emit, unit } from './mutate.js'

/** A unit's Thorns magnitude — never negative. */
export function thornsOf(ctx: Ctx, u: Unit): number {
  return Math.max(0, effective(ctx, u, 'thorns').value)
}

/**
 * The Thorns a hit with this attack would reflect onto its attacker: a melee attack, made from the next hex.
 * rule.counterattack-replaced-and-lost (2026-10-04; DECISIONS.md 2026-09-28, the Armory Ledger's rules: Thorns needs a hit
 * from an ADJACENT melee attacker): a melee attack with reach, made from two hexes away, is out of the spikes' reach. Read
 * where the two stand now — the preview's number and, taken as the hit lands, the one reflectThorns deals (Law 1).
 */
export function thornsOnHit(ctx: Ctx, target: Unit, a: AttackDef, attacker: Unit): number {
  return a.attack.kind === 'melee' && ctx.geo.distance(attacker.hex, target.hex) <= 1 ? thornsOf(ctx, target) : 0
}

/**
 * One connecting melee hit on a thorned unit. Called from resolveHitOn after
 * the hit's damage and its triggers — armor-zero included, since a connecting
 * hit is a hit whatever it applied. A struck unit the hit killed still
 * reflects (SWITCHES.md thornsOnKillingBlow); an attacker already down takes
 * nothing.
 */
export function reflectThorns(ctx: Ctx, attackerId: number, targetId: number, a: AttackDef, n: number): void {
  // `n` is thornsOnHit as the hit landed (pipeline.ts resolveHitOn): what the hit then did — a knockback — cannot change it
  if (n <= 0) return
  const at = unit(ctx, attackerId)
  if (at.lifeState !== 'standing' || at.hp <= 0) return
  const causeId = a.id
  dealDirectDamage(ctx, attackerId, n, 'true', causeId, { actor: targetId, damageType: 'true', thorns: true, attackId: a.id },
    (damage) => emit(ctx, 'thorns.reflected', causeId, {
      actor: targetId, target: attackerId, attackId: a.id, thorns: n,
      amount: damage.value, ...(damage.absorbed ? { absorbed: damage.absorbed } : {}),
    }))
}
