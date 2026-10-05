// The reward pool and its odds — GEAR-DESIGN.md §7, 7-KINGDOM-SETTLED.md 2026-09-02
// (rewards): "three face-down cards, reveal all three, keep one, at fixed odds
// 25% weapon · 25% armor · 20% trinket · 10% idol · 10% Bloodrune · 10% relic";
// weapons and armor come at tier 3, everything else at tier 1. The odds are a
// TABLE the draw reads (REWARD_ODDS) and the pool is a FILTER over the generated
// rows (G2) — never a second list. Prices are not here: gear is unpriced.
//
// kingdom.rewards-only-authored (2026-10-04). Ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'reported on the Item Ledger:
// items that do things the game has no mechanic for, authored by a chat and not by him': "I guess we could just ignore all
// the items not authored by me to start with." — and, asked whether the set-aside items should also stop appearing as
// battle rewards, "One yes. Stop appearing as battle rewards."). The pool is ALSO filtered by the list of the rows he
// authored (src/content/authored-items.ts): a row that is not on it is set aside — never drawn, so never on a reward card.
// Only the pool reads the list. Kits, enemies, the Forge, the Waystation, the items themselves and a save's own items do not.
// A class of the odds table the list leaves with no row is the draw's to handle (src/core/rewards.ts rewardClassOf).

import { ITEMS, itemOf, isShield, type ItemRow } from './items.js'
import { SWITCHES } from './switches.js'
import { AUTHORED_ITEMS, AUTHORSHIP_UNDECIDED } from './authored-items.js'

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

/**
 * Which rows beyond the list's own ids the pool takes — the two switches (kingdom SWITCHES.md rewards.hellTcgRowsOffered,
 * rewards.derivedRowsOffered), as values, so the other side of each is a pool the same code builds.
 */
export type RewardListOptions = { readonly undecided: boolean; readonly derived: boolean }
const LIST_AS_SWITCHED: RewardListOptions = { undecided: SWITCHES.rewardsHellTcgRowsOffered, derived: SWITCHES.rewardsDerivedRowsOffered }

const AUTHORED: ReadonlySet<string> = new Set(AUTHORED_ITEMS.map((r) => r.id))
const UNDECIDED: ReadonlySet<string> = new Set(AUTHORSHIP_UNDECIDED.map((r) => r.id))

/**
 * Is this row one the reward draw may deal by who authored it: its id is on the list. With `undecided`, the rows the
 * review could not class count too; with `derived`, so does a row MADE of listed rows — a listed base, and the attribute
 * it carries (if it carries one) listed too.
 */
export const isOnRewardList = (r: ItemRow, o: RewardListOptions = LIST_AS_SWITCHED): boolean => {
  const listed = (id: string): boolean => AUTHORED.has(id) || (o.undecided && UNDECIDED.has(id))
  if (listed(r.id)) return true
  return o.derived && r.base !== null && listed(r.base) && (r.enchant === null || listed(r.enchant))
}

/** Is this row of the pool's SHAPE: a class the odds name, at that class's tier; the Waystation's catalog rows per the switch. */
const isOfRewardShape = (r: ItemRow): boolean => {
  const o = REWARD_ODDS.find((x) => x.itemClass === r.itemClass)
  if (!o || r.tier !== o.tier) return false
  if (r.waystationBand !== null && !SWITCHES.rewardsIncludeWaystation) return false
  return true
}

/** Is this row in the pool: of the pool's shape, and on the list of the rows Andrew authored (2026-10-04 — until then, the shape alone). */
export const isRewardRow = (r: ItemRow): boolean => isOfRewardShape(r) && isOnRewardList(r)

/** The pool for a reading of the list — a filter over the generated rows, sorted by id (Law 6). */
export function rewardPoolOf(o: RewardListOptions): RewardRow[] {
  return ITEMS.filter((r) => isOfRewardShape(r) && isOnRewardList(r, o)).map((r) => ({ id: r.id, name: r.name, tier: r.tier, slot: slotOf(r) })).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/** The pool — the list as the switches stand today. */
export const REWARDS: readonly RewardRow[] = rewardPoolOf(LIST_AS_SWITCHED)

export function rewardOf(id: string): RewardRow {
  const row = REWARDS.find((r) => r.id === id)
  if (!row) { itemOf(id); throw new Error(`'${id}' is an item but not in the reward pool (${REWARDS.length} rows: the odds table's classes at their tiers, of the rows on src/content/authored-items.ts)`) }
  return row
}

/** "3 → 4 → 5 drawn, keep 1" — three until the Spoils Provisions widen it. */
export const REWARD_DRAW = 3
