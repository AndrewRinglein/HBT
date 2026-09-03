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
import { type Ctx, applyBuyItem, applyEquip, applyUnequip } from './mutate.js'
import { whyNotFit } from './loadout.js'
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

/**
 * Why this hero cannot put on this item now — or null. `displace` names an item the
 * hero is wearing that comes off first (a drop onto a full slot: "you replace it, the
 * other thing bounces back out"), so the fit is judged on the list after the swap.
 */
export function whyNotEquip(campaign: CampaignState, heroId: HeroId, itemId: string, displace?: string): string | null {
  if (!atEquip(campaign)) return 'not the equip step'
  if (!campaign.cursor.engagement?.deployed.includes(heroId)) return 'not deployed'
  const h = campaign.roster[heroId]
  if (!h) return `no hero '${heroId}'`
  if (!campaign.stash.includes(itemId)) return `'${itemId}' is not in the stash`
  if (displace !== undefined && !h.equipped.includes(displace)) return `'${displace}' is not worn by ${h.name}`
  const after = displace === undefined ? [...h.equipped, itemId] : [...h.equipped.filter((id) => id !== displace), itemId]
  return whyNotFit(campaign, heroId, after)
}

export const canEquip = (campaign: CampaignState, heroId: HeroId, itemId: string, displace?: string): boolean => whyNotEquip(campaign, heroId, itemId, displace) === null

export function performEquip(ctx: Ctx, heroId: HeroId, itemId: string, causeId: string, displace?: string): void {
  const why = whyNotEquip(ctx.campaign, heroId, itemId, displace)
  if (why) throw new Error(`performEquip refused (${heroId} ← ${itemId}): ${why}`)
  if (displace !== undefined) applyUnequip(ctx, heroId, displace, causeId)
  applyEquip(ctx, heroId, itemId, causeId)
}

export function whyNotUnequip(campaign: CampaignState, heroId: HeroId, itemId: string): string | null {
  if (!atEquip(campaign)) return 'not the equip step'
  if (!campaign.cursor.engagement?.deployed.includes(heroId)) return 'not deployed'
  const h = campaign.roster[heroId]
  if (!h) return `no hero '${heroId}'`
  if (!h.equipped.includes(itemId)) return `'${itemId}' is not worn by ${h.name}`
  // taking something off can only free room — except a Backpack whose slots are in use
  return whyNotFit(campaign, heroId, h.equipped.filter((id) => id !== itemId))
}

export const canUnequip = (campaign: CampaignState, heroId: HeroId, itemId: string): boolean => whyNotUnequip(campaign, heroId, itemId) === null

/** Off, and into the shared stash — a starting item included ("they are their own thing and can be removed"). */
export function performUnequip(ctx: Ctx, heroId: HeroId, itemId: string, causeId: string): void {
  const why = whyNotUnequip(ctx.campaign, heroId, itemId)
  if (why) throw new Error(`performUnequip refused (${heroId} → ${itemId}): ${why}`)
  applyUnequip(ctx, heroId, itemId, causeId)
}

export { loadoutOf, itemSlotsOf, slotCostOf } from './loadout.js'
