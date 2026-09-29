// V2 section 8: one flat type-to-defense mapping for every HP damage path.
import type { Ctx, Unit, DamageType } from './types.js'
import { isDamageType } from './types.js'
import { effective } from './stats.js'

/** Pure pool subtraction, shared by attack station 550 and other typed damage. */
export function absorbDamage(amount: number, available: number) {
  const absorbed = Math.min(Math.max(0, available), Math.max(0, amount))
  return { absorbed, remaining: amount - absorbed }
}

/**
 * rule.badge-immunity (2026-09-29): the first badge the unit carries (carry order, Law 6) that makes it immune
 * to this status or this damage type — the source every immune line names (Law 12). Undefined: not immune.
 */
export function immunityOf(ctx: Pick<Ctx, 'badges'>, u: { readonly badges: readonly string[] }, what: { readonly status: string } | { readonly damage: DamageType }): string | undefined {
  return u.badges.find((b) => {
    const im = ctx.badges[b]?.immuneTo
    return 'status' in what ? (im?.statuses ?? []).includes(what.status) : (im?.damage ?? []).includes(what.damage)
  })
}

/** Pure. Signed effective defenses preserve the existing attack vulnerability rule. */
export function flatDamage(ctx: Ctx, target: Unit, amount: number, type: DamageType, absorbAvailable = 0, armorPenetration = 0, bonusArmor = 0) {
  if (!isDamageType(type)) throw new Error('Unknown damage type: ' + String(type))
  const { absorbed, remaining } = absorbDamage(amount, absorbAvailable)
  // rule.badge-immunity: an immune target takes none of it — every point past Protection is resisted, and the badge is named
  const immuneBy = type === 'true' ? undefined : immunityOf(ctx, target, { damage: type })
  if (immuneBy) return { value: 0, beforeFloor: Math.min(0, remaining), absorbed, defense: Math.max(0, remaining), resisted: Math.max(0, remaining), immuneBy }
  const stat = ({
    physical: 'armor', magic: 'resist', fire: 'fireResist',
    poison: 'poisonResist', shadow: 'shadowResist', true: null,
  } as const)[type]
  // bonusArmor: Armor the attack's circumstances add (v2.structures: a tower's +1 against an enemy outside one)
  const beforePenetration = stat ? effective(ctx, target, stat).value + (type === 'physical' ? bonusArmor : 0) : 0
  const defense = beforePenetration - (type === 'physical' ? Math.min(armorPenetration, Math.max(0, beforePenetration)) : 0)
  const beforeFloor = remaining - defense
  return {
    value: Math.max(0, beforeFloor), beforeFloor, absorbed, defense,
    resisted: Math.min(Math.max(0, remaining), Math.max(0, defense)),
  }
}
