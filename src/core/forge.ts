// The Forge — its band, its shelf, its prices, its trade-in. GEAR-DESIGN.md §3,
// ruled 2026-09-02. The Forge is a building row (src/content/buildings.ts) whose
// `bands` and `shelf` say what each level sells; this file counts and rolls and
// names no item, no node and no level — the rows do.
//
//   forgeLevelOf      the band reached: 0 a ruin, then the row's bands in order
//   resolveShelf      the Week's shelf — base items, masterworks, enchanted — drawn on
//                     cup.forge keyed by the Week (Law 4), minus what was sold
//   costOfItem        a base item's Supplies, rolled once per item; a masterwork ×1.5;
//                     an enchanted the base plus the same Mana
//   whyNotTradeIn     three of one category and one tier → one, a tier up, at the band
//                     whose shelf row opens the trade-in

import type { CampaignState } from './campaign.js'
import { type Ctx, applyTradeIn } from './mutate.js'
import { pickOf, rollOf } from './rng.js'
import type { Cost } from './purse.js'
import { listBuildings, type BuildingView } from './build.js'
import { ITEMS, itemOf, isShield, type ItemRow } from '../content/items.js'
import { CUP_IDS } from '../content/cups.js'
import { CURRENCY_IDS } from '../content/currencies.js'
import { SWITCHES } from '../content/switches.js'

/** The held building that sells gear — the one whose row carries a shelf. Null when none stands on ground you hold. */
export function forgeOf(campaign: CampaignState): BuildingView | null {
  return listBuildings(campaign).find((b) => b.held && b.row.shelf && b.row.stands === 'territory') ?? null
}

/** The band a building has reached: 0 for a ruin or nothing built; else the highest band any of whose `at` nodes is built. */
export function bandOf(view: BuildingView): number {
  const bands = view.row.bands
  if (!bands) return view.building.nodes.length
  let reached = 0
  bands.forEach((band, i) => { if (band.at.some((k) => view.building.nodes.includes(k))) reached = i + 1 })
  return reached
}

export const forgeLevelOf = (campaign: CampaignState): number => { const f = forgeOf(campaign); return f ? bandOf(f) : 0 }
export const forgeBandName = (campaign: CampaignState): string | null => { const f = forgeOf(campaign); const n = f ? bandOf(f) : 0; return n ? f!.row.bands?.[n - 1]?.name ?? null : null }

/** What the shelf holds at a band, cumulative over the rows at or below it. */
export function shelfSpecOf(campaign: CampaignState): { base: number; masterwork: number; enchanted: number; tradeIn: boolean } {
  const f = forgeOf(campaign)
  const spec = { base: 0, masterwork: 0, enchanted: 0, tradeIn: false }
  if (!f?.row.shelf) return spec
  const band = bandOf(f)
  for (const s of f.row.shelf) {
    if (s.band > band) continue
    if (s.base !== undefined) spec.base = s.base
    if (s.masterwork !== undefined) spec.masterwork += s.masterwork
    if (s.enchanted !== undefined) spec.enchanted += s.enchanted
    if (s.tradeIn) spec.tradeIn = true
  }
  return spec
}

const sellable = (r: ItemRow) => (r.itemClass === 'weapon' || r.itemClass === 'armor')

/**
 * The Week's shelf. Base items are tier-1 weapons and armor from the codex; masterworks
 * and enchanted are the generated rows over them. Each part is its own draw so a wider
 * band never moves a narrower band's picks. What was sold this Week is gone.
 */
export function resolveShelf(campaign: CampaignState): string[] {
  const spec = shelfSpecOf(campaign)
  const week = campaign.week
  const base = ITEMS.filter((r) => r.source === 'codex' && r.tier === 1 && sellable(r))
  const master = ITEMS.filter((r) => r.source === 'masterwork')
  const ench = ITEMS.filter((r) => r.source === 'enchanted')
  const drawn = [
    ...pickOf(campaign, CUP_IDS.forge, ['shelf', week, 'base'], base, spec.base),
    ...pickOf(campaign, CUP_IDS.forge, ['shelf', week, 'masterwork'], master, spec.masterwork),
    ...pickOf(campaign, CUP_IDS.forge, ['shelf', week, 'enchanted'], ench, spec.enchanted),
  ].map((r) => r.id)
  return drawn.filter((id) => !campaign.cursor.sold.includes(id))
}

/** A base item's Supplies: rolled once per item on cup.forge, inside the switches' range; stable across Weeks. */
function baseSuppliesOf(campaign: CampaignState, itemId: string): number {
  const span = SWITCHES.shopSuppliesMax - SWITCHES.shopSuppliesMin + 1
  return SWITCHES.shopSuppliesMin + (rollOf(campaign, CUP_IDS.forge, ['price', itemId]) % span)
}

/** What an item on the shelf costs — the ruled arithmetic over the base's price. Integers only (Law 7). */
export function costOfItem(campaign: CampaignState, itemId: string): Cost {
  const row = itemOf(itemId)
  if (row.source === 'masterwork') return { [CURRENCY_IDS.supplies]: Math.floor((baseSuppliesOf(campaign, row.base!) * 3) / 2) }
  if (row.source === 'enchanted') { const s = baseSuppliesOf(campaign, row.base!); return { [CURRENCY_IDS.supplies]: s, [CURRENCY_IDS.mana]: s } }
  return { [CURRENCY_IDS.supplies]: baseSuppliesOf(campaign, itemId) }
}

// ── the trade-in ────────────────────────────────────────────────────────────

/** The category a row trades in: weapons and shields together, else its class. */
export const tradeCategoryOf = (r: ItemRow): string => (isShield(r) ? 'weapon' : r.itemClass)
/** Where a category's ladder starts: weapons and armor from tier 3; everything else from tier 1. */
export const tradeFloorOf = (category: string): number => (category === 'weapon' || category === 'armor' ? 3 : 1)

export function whyNotTradeIn(campaign: CampaignState, burned: readonly string[]): string | null {
  if (!shelfSpecOf(campaign).tradeIn) return `the trade-in opens at the Forge's Enchanted band — it is at ${forgeBandName(campaign) ?? 'a ruin'}`
  if (burned.length !== 3) return `the trade-in takes exactly three — ${burned.length} given`
  if (new Set(burned).size !== burned.length && burned.some((id) => burned.filter((x) => x === id).length > campaign.stash.filter((x) => x === id).length)) return 'the stash does not hold those three'
  for (const id of burned) if (!campaign.stash.includes(id)) return `'${id}' is not in the stash`
  const rows = burned.map(itemOf)
  const cats = new Set(rows.map(tradeCategoryOf))
  if (cats.size !== 1) return `the three must be one category — these are ${[...cats].join(', ')}`
  const category = [...cats][0]!
  const tiers = new Set(rows.map((r) => r.tier))
  if (SWITCHES.tradeInSameTier && tiers.size !== 1) return `the three must be one tier — these are ${[...tiers].sort().join(', ')}`
  const from = Math.max(...tiers)
  if (from < tradeFloorOf(category)) return `${category}s climb from tier ${tradeFloorOf(category)}; these are tier ${from}`
  if (poolOf(category, from + 1).length === 0) return `no ${category} row exists at tier ${from + 1} yet`
  return null
}

export const canTradeIn = (campaign: CampaignState, burned: readonly string[]): boolean => whyNotTradeIn(campaign, burned) === null

/** What a trade-in can yield: every row of the category one tier up. Sorted by id (Law 6). */
export function poolOf(category: string, tier: number): ItemRow[] {
  return ITEMS.filter((r) => tradeCategoryOf(r) === category && r.tier === tier).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/**
 * Burn three, gain one. The result is drawn on cup.forge keyed by the Week and the three
 * (the same three, the same Week, the same answer), or — the switch — chosen from the pool.
 */
export function performTradeIn(ctx: Ctx, burned: readonly string[], causeId: string, choice?: string): string {
  const why = whyNotTradeIn(ctx.campaign, burned)
  if (why) throw new Error(`performTradeIn refused: ${why}`)
  const rows = burned.map(itemOf)
  const category = tradeCategoryOf(rows[0]!)
  const pool = poolOf(category, Math.max(...rows.map((r) => r.tier)) + 1)
  let got: string
  if (SWITCHES.tradeInResult === 'chosen') {
    if (!choice || !pool.some((r) => r.id === choice)) throw new Error(`performTradeIn refused: choose one of ${pool.map((r) => r.id).join(', ')}`)
    got = choice
  } else {
    got = pickOf(ctx.campaign, CUP_IDS.forge, ['tradein', ctx.campaign.week, ...[...burned].sort()], pool, 1)[0]!.id
  }
  applyTradeIn(ctx, burned, got, causeId)
  return got
}
