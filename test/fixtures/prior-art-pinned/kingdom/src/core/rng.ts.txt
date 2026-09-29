// Kingdom randomness — Law 4. Every roll comes from a named cup and is
// addressed by WHAT the roll is, never by when it happened: no counters, no
// Math.random, no clock. A cup's root lives in campaign.cups (plain data); a
// roll is a hash of that root and the structural keys the caller names.
//
// Same construction as the engine's src/core/rng.ts (FNV-1a over integers),
// kept separate because the two altitudes must not share dice: a Campaign
// roll must never shift a Battle's.

import type { CampaignState } from './campaign.js'

function fnv1a(values: readonly number[]): number {
  let h = 0x811c9dc5
  for (const v of values) {
    for (let b = 0; b < 4; b++) {
      h ^= (v >>> (b * 8)) & 0xff
      h = Math.imul(h, 0x01000193) >>> 0
    }
  }
  return h >>> 0
}

function codes(key: string | number): number[] {
  if (typeof key === 'number') return [key | 0]
  const out: number[] = [key.length]
  for (let i = 0; i < key.length; i++) out.push(key.charCodeAt(i))
  return out
}

/** A 32-bit roll for `keys` on `cup`. The same keys always give the same roll. */
export function rollOf(campaign: CampaignState, cup: string, keys: readonly (string | number)[]): number {
  const root = campaign.cups[cup]
  if (root === undefined) throw new Error(`no cup '${cup}' on this Campaign — cups are named at makeCampaign: ${Object.keys(campaign.cups).join(', ')}`)
  return fnv1a([root, ...keys.flatMap(codes)])
}

/**
 * `n` distinct picks from `pool`, in a rolled order, keyed by `keys` plus the
 * pick's ordinal — structural, so adding a fourth pick never moves the first
 * three. The pool is sorted first: registry order is never a tiebreak (Law 6).
 */
export function pickOf<T extends { id: string }>(campaign: CampaignState, cup: string, keys: readonly (string | number)[], pool: readonly T[], n: number): T[] {
  const remaining = [...pool].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const out: T[] = []
  for (let i = 0; i < n && remaining.length > 0; i++) {
    const at = rollOf(campaign, cup, [...keys, 'pick', i]) % remaining.length
    out.push(remaining.splice(at, 1)[0]!)
  }
  return out
}
