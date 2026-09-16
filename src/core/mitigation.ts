// V2 section 8: one flat type-to-defense mapping for every HP damage path.
import type { Ctx, Unit, DamageType } from './types.js'
import { isDamageType } from './types.js'
import { effective } from './stats.js'

/** Pure. Signed effective defenses preserve the existing attack vulnerability rule. */
export function flatDamage(ctx: Ctx, target: Unit, amount: number, type: DamageType) {
  if (!isDamageType(type)) throw new Error('Unknown damage type: ' + String(type))
  const stat = ({
    physical: 'armor', magic: 'resist', fire: 'fireResist',
    poison: 'poisonResist', shadow: 'shadowResist', true: null,
  } as const)[type]
  const defense = stat ? effective(ctx, target, stat).value : 0
  const beforeFloor = amount - defense
  return {
    value: Math.max(0, beforeFloor), beforeFloor,
    resisted: Math.min(Math.max(0, amount), Math.max(0, defense)),
  }
}
