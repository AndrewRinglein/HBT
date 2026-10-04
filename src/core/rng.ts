// Kingdom randomness — Law 4. Every roll comes from a named cup and is
// addressed by WHAT the roll is, never by when it happened: no counters, no
// Math.random, no clock. A cup's root lives in campaign.cups (plain data); a
// roll is a hash of that root and the structural keys the caller names.
//
// The hash is the engine's own (src/core/rng.ts fnv1a, read through the door — kingdom.reads-engine, review
// finding K12: this file kept a copy of it). The dice stay separate: a Campaign roll hashes a campaign cup's root
// and the kingdom's own keys, never a battle's stream, so a Campaign roll never shifts a Battle's. The engine
// finishes its battle rolls with a splitmix32 finaliser; the kingdom's rolls are the bare hash, as they always
// were, so no Campaign draw moves (kingdom SWITCHES.md kingdomHashFinaliser).

import type { CampaignState } from './campaign.js'
import { fnv1a } from '../engine.js'

function codes(key: string | number): number[] {
  if (typeof key === 'number') return [key | 0]
  const out: number[] = [key.length]
  for (let i = 0; i < key.length; i++) out.push(key.charCodeAt(i))
  return out
}

/** A stable 32-bit hash of keys — for a view's choice (the recap's quote), never a rule: no cup, so no Campaign draw. */
export function hashOf(keys: readonly (string | number)[]): number {
  return fnv1a(keys.flatMap(codes))
}

/** A 32-bit roll for `keys` on `cup`. The same keys always give the same roll. */
export function rollOf(campaign: CampaignState, cup: string, keys: readonly (string | number)[]): number {
  const root = campaign.cups[cup]
  if (root === undefined) throw new Error(`no cup '${cup}' on this Campaign — cups are named at makeCampaign: ${Object.keys(campaign.cups).join(', ')}`)
  return fnv1a([root, ...keys.flatMap(codes)])
}

/**
 * 0..n-1 for `keys` on `cup`, read from the roll's HIGH bits (roll × n ÷ 2^32) — kingdom.opening-draft-modifiers. The
 * bare hash's lowest bit is only the parity of what was hashed (FNV-1a: xor, then times an odd prime), so `rollOf % n`
 * on an even n splits by the parity of the keys — a draft's offer 1 and offer 2 would always roll opposite halves of a
 * table. The high bits carry no such pattern. `pickOf` keeps its `%`, as it always was, so no earlier draw moves
 * (kingdom SWITCHES.md openingDraftRollBits).
 */
export function rollBelowOf(campaign: CampaignState, cup: string, keys: readonly (string | number)[], n: number): number {
  if (!Number.isSafeInteger(n) || n < 1 || n > 1048576) throw new Error(`rollBelowOf refused: n must be an integer from 1 to 1048576, got ${n}`)
  return Math.floor((rollOf(campaign, cup, keys) * n) / 4294967296)
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
