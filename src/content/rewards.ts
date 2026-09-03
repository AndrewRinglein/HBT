// The reward pool — what the draft after a won battle draws from. 7-KINGDOM-
// SETTLED.md: "3 → 4 → 5 drawn, keep 1… Buildings stock the deck the Charter
// draws from." No building rows exist yet, so the deck is the slice's items
// (THIN-SLICE-REVIEW.md §G2: "the weapons/items the heroes already use as
// starting gear, plus some tier-1 armors") — item rows from the Codex
// (content/hbt-content.json), named here so the kingdom never reads the 6 MB
// book at runtime. Prices are not here: gear is unpriced (blocker 4).

import { ITEMS, itemOf, isShield, type ItemRow } from './items.js'

export type RewardRow = { readonly id: string; readonly name: string; readonly tier: number; readonly slot: 'weapon' | 'armor' | 'off-hand' | 'trinket' }

/** Where a row goes on a hero, read from the codex's class and tags — never typed per item. */
export function slotOf(r: ItemRow): RewardRow['slot'] {
  if (isShield(r)) return 'off-hand'
  if (r.itemClass === 'weapon') return 'weapon'
  if (r.itemClass === 'armor') return 'armor'
  return 'trinket'
}

/**
 * The slice's pool — a FILTER over the generated rows, not a second list. Until
 * G10 (rewards.tiered) the pool is the twelve ids the slice has drawn from since
 * M8, so nothing about the draw changes here; the rows behind them are now the
 * codex's, so the Holy Symbol is the weapon the codex says it is, not the
 * trinket the hand-typed row said (corrected 2026-09-02).
 */
const SLICE_POOL = [
  'item.halberd', 'item.javelin', 'item.dagger', 'item.shortbow', 'item.lightning-staff', 'item.holy-symbol',
  'item.longsword', 'item.knight-shield', 'item.basic-armor', 'item.thick-hide', 'item.silkweave-armor', 'item.guardians-mail',
]

export const REWARDS: readonly RewardRow[] = ITEMS.filter((r) => SLICE_POOL.includes(r.id)).map((r) => ({ id: r.id, name: r.name, tier: r.tier, slot: slotOf(r) }))

export function rewardOf(id: string): RewardRow {
  const row = REWARDS.find((r) => r.id === id)
  if (!row) { itemOf(id); throw new Error(`'${id}' is an item but not in the reward pool: ${REWARDS.map((r) => r.id).join(', ')}`) }
  return row
}

/** "3 → 4 → 5 drawn, keep 1" — three until the Spoils Provisions widen it. */
export const REWARD_DRAW = 3
