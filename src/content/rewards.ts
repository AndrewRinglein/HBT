// The reward pool — what the draft after a won battle draws from. 7-KINGDOM-
// SETTLED.md: "3 → 4 → 5 drawn, keep 1… Buildings stock the deck the Charter
// draws from." No building rows exist yet, so the deck is the slice's items
// (THIN-SLICE-REVIEW.md §G2: "the weapons/items the heroes already use as
// starting gear, plus some tier-1 armors") — item rows from the Codex
// (content/hbt-content.json), named here so the kingdom never reads the 6 MB
// book at runtime. Prices are not here: gear is unpriced (blocker 4).

import { omitDisabled } from './disable.js'

export type RewardRow = { readonly id: string; readonly name: string; readonly tier: number; readonly slot: 'weapon' | 'armor' | 'off-hand' | 'trinket' }

const RAW_REWARDS: readonly RewardRow[] = [
  { id: 'item.halberd', name: 'Halberd', tier: 1, slot: 'weapon' },
  { id: 'item.javelin', name: 'Javelin', tier: 1, slot: 'weapon' },
  { id: 'item.dagger', name: 'Dagger', tier: 0, slot: 'weapon' },
  { id: 'item.shortbow', name: 'Shortbow', tier: 1, slot: 'weapon' },
  { id: 'item.lightning-staff', name: 'Lightning Staff', tier: 1, slot: 'weapon' },
  { id: 'item.holy-symbol', name: 'Holy Symbol', tier: 1, slot: 'trinket' },
  { id: 'item.longsword', name: 'Longsword', tier: 1, slot: 'weapon' },
  { id: 'item.knight-shield', name: 'Knight Shield', tier: 1, slot: 'off-hand' },
  { id: 'item.basic-armor', name: 'Basic Armor', tier: 0, slot: 'armor' },
  { id: 'item.thick-hide', name: 'Thick Hide', tier: 0, slot: 'armor' },
  { id: 'item.silkweave-armor', name: 'Silkweave Armor', tier: 1, slot: 'armor' },
  { id: 'item.guardians-mail', name: "Guardian's Mail", tier: 1, slot: 'armor' },
]

export const REWARDS: readonly RewardRow[] = omitDisabled(RAW_REWARDS)

export function rewardOf(id: string): RewardRow {
  const row = REWARDS.find((r) => r.id === id)
  if (!row) throw new Error(`unknown reward '${id}' — the pool is an explicit registry: ${REWARDS.map((r) => r.id).join(', ')}`)
  return row
}

/** "3 → 4 → 5 drawn, keep 1" — three until the Spoils Provisions widen it. */
export const REWARD_DRAW = 3
