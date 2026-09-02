// The Forge's shelf, and equipping. GAME-ARCHITECTURE.md §2.6 MARKET:
// listShopItems · canBuyItem / costOfItem / performBuyItem · canEquip /
// performEquip. THIN-SLICE-REVIEW.md §G2: "The Forge is in. Slice items: the
// weapons/items the heroes already use as starting gear, plus some tier-1
// armors — heroes start with none, so the Forge's shelf is where armor enters
// the game." The shelf opens once the Forge's repair node is built on a held
// Territory; buying is at stage.buy for Supplies (a switch — gear is
// unpriced); equipping is the prep step whose row says so. What is equipped
// is RECORDED on the hero; the engine still fields the unit row's own kit —
// the item's effect in battle is content's to land, not the kingdom's to fake.

import type { CampaignState, HeroId } from './campaign.js'
import { type Ctx, applyBuyItem, applyEquip } from './mutate.js'
import { canAfford, performSpend, type Cost } from './purse.js'
import { listBuildings } from './build.js'
import { REWARDS, type RewardRow } from '../content/rewards.js'
import { CURRENCY_IDS } from '../content/currencies.js'
import { SWITCHES } from '../content/switches.js'
import { stageRowOf } from '../content/stages.js'
import { PREP_STEP_ROWS } from '../content/prep.js'

/** The shelf is open when a held building whose first node is built stands anywhere — the Forge, repaired. */
export function isShopOpen(campaign: CampaignState): boolean {
  return listBuildings(campaign).some((b) => b.held && b.row.stands === 'territory' && b.building.nodes.length > 0)
}

/** Starting weapons and tier-1 armors — the slice's items. Sorted by id (Law 6). */
export function listShopItems(campaign: CampaignState): RewardRow[] {
  if (!isShopOpen(campaign)) return []
  return REWARDS.filter((r) => r.tier <= 1).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export const costOfItem = (_itemId: string): Cost => ({ [CURRENCY_IDS.supplies]: SWITCHES.shopSupplies })

const atBuy = (campaign: CampaignState) => campaign.cursor.step === 'open' && stageRowOf(campaign.cursor.stage).offers === 'market'

export function canBuyItem(campaign: CampaignState, itemId: string): boolean {
  if (!atBuy(campaign)) return false
  if (!listShopItems(campaign).some((r) => r.id === itemId)) return false
  return canAfford(campaign, costOfItem(itemId))
}

export function performBuyItem(ctx: Ctx, itemId: string, causeId: string): void {
  if (!canBuyItem(ctx.campaign, itemId)) {
    const why = !atBuy(ctx.campaign) ? 'not the Buy Stage' : !isShopOpen(ctx.campaign) ? 'the Forge is not repaired' : !listShopItems(ctx.campaign).some((r) => r.id === itemId) ? 'not on the shelf' : 'short of Supplies'
    throw new Error(`performBuyItem refused for '${itemId}': ${why}`)
  }
  performSpend(ctx, costOfItem(itemId), causeId)
  applyBuyItem(ctx, itemId, costOfItem(itemId), causeId)
}

/** The prep step whose row says it equips — core reads the row, not the name. */
const atEquip = (campaign: CampaignState) => campaign.cursor.step === 'prep' && campaign.cursor.prepStep === PREP_STEP_ROWS.find((r) => r.equips)?.step

export function canEquip(campaign: CampaignState, heroId: HeroId, itemId: string): boolean {
  if (!atEquip(campaign)) return false
  if (!campaign.cursor.engagement?.deployed.includes(heroId)) return false
  return campaign.stash.includes(itemId)
}

export function performEquip(ctx: Ctx, heroId: HeroId, itemId: string, causeId: string): void {
  if (!canEquip(ctx.campaign, heroId, itemId)) {
    const why = !atEquip(ctx.campaign) ? 'not the equip step' : !ctx.campaign.cursor.engagement?.deployed.includes(heroId) ? 'not deployed' : 'not in the stash'
    throw new Error(`performEquip refused (${heroId} ← ${itemId}): ${why}`)
  }
  applyEquip(ctx, heroId, itemId, causeId)
}
