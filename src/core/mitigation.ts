// V2 section 8: one flat type-to-defense mapping for every HP damage path.
import type { Ctx, Unit, DamageType } from './types.js'
import { isDamageType } from './types.js'
import { effective } from './stats.js'

/** Pure pool subtraction, shared by attack station 550 and other typed damage. */
export function absorbDamage(amount: number, available: number) {
  const absorbed = Math.min(Math.max(0, available), Math.max(0, amount))
  return { absorbed, remaining: amount - absorbed }
}

/** Pure. Signed effective defenses preserve the existing attack vulnerability rule. */
export function flatDamage(ctx: Ctx, target: Unit, amount: number, type: DamageType, absorbAvailable = 0, armorPenetration = 0) {
  if (!isDamageType(type)) throw new Error('Unknown damage type: ' + String(type))
  const { absorbed, remaining } = absorbDamage(amount, absorbAvailable)
  const stat = ({
    physical: 'armor', magic: 'resist', fire: 'fireResist',
    poison: 'poisonResist', shadow: 'shadowResist', true: null,
  } as const)[type]
  const beforePenetration = stat ? effective(ctx, target, stat).value : 0
  const defense = beforePenetration - (type === 'physical' ? Math.min(armorPenetration, Math.max(0, beforePenetration)) : 0)
  const beforeFloor = remaining - defense
  return {
    value: Math.max(0, beforeFloor), beforeFloor, absorbed, defense,
    resisted: Math.min(Math.max(0, remaining), Math.max(0, defense)),
  }
}
