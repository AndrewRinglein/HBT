// The reward pool and its odds — GEAR-DESIGN.md §7, 7-KINGDOM-SETTLED.md 2026-09-02
// (rewards): "three face-down cards, reveal all three, keep one, at fixed odds
// 25% weapon · 25% armor · 20% trinket · 10% idol · 10% Bloodrune · 10% relic";
// weapons and armor come at tier 3, everything else at tier 1. The odds are a
// TABLE the draw reads (REWARD_ODDS) and the pool is a FILTER over the generated
// rows (G2) — never a second list. Prices are not here: gear is unpriced.

import { ITEMS, itemOf, isShield, type ItemRow } from './items.js'
import { SWITCHES } from './switches.js'

export type RewardRow = { readonly id: string; readonly name: string; readonly tier: number; readonly slot: 'weapon' | 'armor' | 'off-hand' | 'trinket' }

/** Where a row goes on a hero, read from the codex's class and tags — never typed per item. */
export function slotOf(r: ItemRow): RewardRow['slot'] {
  if (isShield(r)) return 'off-hand'
  if (r.itemClass === 'weapon') return 'weapon'
  if (r.itemClass === 'armor') return 'armor'
  return 'trinket'
}

/** One card's class odds, in whole percent, and the tier that class is drawn at. Sums to 100. */
export type RewardOdds = { readonly itemClass: ItemRow['itemClass']; readonly pct: number; readonly tier: number }
export const REWARD_ODDS: readonly RewardOdds[] = [
  { itemClass: 'weapon', pct: 25, tier: 3 },
  { itemClass: 'armor', pct: 25, tier: 3 },
  { itemClass: 'trinket', pct: 20, tier: 1 },
  { itemClass: 'idol', pct: 10, tier: 1 },
  { itemClass: 'bloodrune', pct: 10, tier: 1 },
  { itemClass: 'relic', pct: 10, tier: 1 },
]

/** Is this row in the pool: a class the odds name, at that class's tier; the Waystation's catalog rows per the switch. */
export const isRewardRow = (r: ItemRow): boolean => {
  const o = REWARD_ODDS.find((x) => x.itemClass === r.itemClass)
  if (!o || r.tier !== o.tier) return false
  if (r.waystationBand !== null && !SWITCHES.rewardsIncludeWaystation) return false
  return true
}

/** The pool — a filter over the generated rows, sorted by id (Law 6). */
export const REWARDS: readonly RewardRow[] = ITEMS.filter(isRewardRow).map((r) => ({ id: r.id, name: r.name, tier: r.tier, slot: slotOf(r) })).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

export function rewardOf(id: string): RewardRow {
  const row = REWARDS.find((r) => r.id === id)
  if (!row) { itemOf(id); throw new Error(`'${id}' is an item but not in the reward pool (${REWARDS.length} rows: the odds table's classes at their tiers)`) }
  return row
}

/** "3 → 4 → 5 drawn, keep 1" — three until the Spoils Provisions widen it. */
export const REWARD_DRAW = 3
