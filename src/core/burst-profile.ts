// Strict plain-data burst transport, shared by loaders, commands and snapshots.
import { isDamageType, type ActionDef, type BurstProfile } from './types.js'
import { TARGET_SIDES } from './target.js'

const LIMIT = 1_000_000
function record(value: unknown, allowed: readonly string[]): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw Error('burst: expected plain record')
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key) || !('value' in Object.getOwnPropertyDescriptor(value, key)!)) throw Error('burst: unknown field or accessor')
  }
}
function dense(value: unknown, max: number): asserts value is any[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max
    || Reflect.ownKeys(value).length !== value.length + 1) throw Error('burst: expected bounded dense array')
  for (let i = 0; i < value.length; i++) if (!Object.getOwnPropertyDescriptor(value, i)?.hasOwnProperty('value')) throw Error('burst: invalid array element')
}
const integer = (v: unknown, min = 0, max = LIMIT): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max

export function burstProfile(value: unknown): BurstProfile {
  record(value, ['shape', 'side', 'requireTags', 'packets', 'heal', 'impact', 'destroy'])
  record(value.shape, ['kind', 'radius'])
  if (value.shape.kind === 'arc') {
    if (Object.hasOwn(value.shape, 'radius')) throw Error('burst: arc has no radius')
  } else if (value.shape.kind !== 'radius' || !integer(value.shape.radius, 0, 100)) throw Error('burst: invalid shape')
  if (!TARGET_SIDES.includes(value.side)) throw Error('burst: explicit side required')
  if (value.requireTags !== undefined) {
    dense(value.requireTags, 32)
    if (value.requireTags.some(t => typeof t !== 'string' || !t.length) || new Set(value.requireTags).size !== value.requireTags.length) throw Error('burst: invalid tags')
  }
  dense(value.packets, 32)
  const ids = new Set<string>()
  for (const p of value.packets) {
    record(p, ['id', 'damageType', 'amount', 'stat', 'powerScale'])
    if (typeof p.id !== 'string' || !/^[a-z][a-z0-9.-]*$/.test(p.id) || ids.has(p.id)) throw Error('burst: invalid packet ID')
    ids.add(p.id)
    if (!isDamageType(p.damageType) || !integer(p.amount, -LIMIT)) throw Error('burst: invalid packet damage')
    if (p.stat !== undefined && !['strength', 'precision', 'magic', 'spirit'].includes(p.stat)) throw Error('burst: invalid scaling stat')
    if (p.powerScale !== undefined && (typeof p.powerScale !== 'number' || !Number.isFinite(p.powerScale) || p.powerScale < 0 || p.powerScale > 1)) throw Error('burst: invalid Power share')
  }
  if (value.heal !== undefined && !integer(value.heal)) throw Error('burst: healing must be a bounded nonnegative integer')
  if (value.impact !== undefined && !integer(value.impact, 0, 1000)) throw Error('burst: Impact must be a bounded nonnegative integer')
  // v2.prop-destroy (COMBAT-V2 §12.2): steps to every prop touching the shape.
  if (value.destroy !== undefined && !integer(value.destroy, 0, 1000)) throw Error('burst: Destroy must be a bounded nonnegative integer')
  if (!value.packets.length && value.heal === undefined) throw Error('burst: no payload')
  return value as BurstProfile
}

export function validateBurstAction(a: ActionDef): void {
  if (Object.hasOwn(a, 'area')) throw Error('burst: legacy area attacks are retired')
  if (a.burst === undefined) return
  burstProfile(a.burst)
  if (['attack', 'move', 'target', 'effects', 'effect', 'stat', 'bonus', 'damageType', 'heal', 'guard'].some(k => Object.hasOwn(a, k))) throw Error('burst: mixed action profiles')
  if (!integer(a.range, 0, 100) || (a.burst.shape.kind === 'arc' && a.range !== 1)) throw Error('burst: invalid placement range')
}
