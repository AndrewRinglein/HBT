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
import { isEquipOpen, equipWhere, openEquipSession, closeEquipSession, whyNotPay, paySession, refundSession } from './equip-session.js'
import { canAfford, performSpend, type Cost } from './purse.js'
import { listBuildings } from './build.js'
import { slotOf, type RewardRow } from '../content/rewards.js'
import { itemOf } from '../content/items.js'
import { rewardTakersOf } from '../content/encounter-rewards.js'
import { CLASSES } from '../content/classes.js'
import { resolveShelf, forgeLevelOf, costOfItem } from './forge.js'
import { CURRENCY_IDS } from '../content/currencies.js'
import { SWITCHES } from '../content/switches.js'
import { canUseActivity } from './activity.js'
import { PREP_STEP_ROWS } from '../content/prep.js'

/** The shelf is open when the Forge stands on ground you hold and has reached its first band (Repaired). */
export function isShopOpen(campaign: CampaignState): boolean {
  return forgeLevelOf(campaign) >= 1
}

/** The Week's shelf (src/core/forge.ts), as reward-shaped rows for the page. In the shelf's drawn order. */
export function listShopItems(campaign: CampaignState): RewardRow[] {
  if (!isShopOpen(campaign)) return []
  return resolveShelf(campaign).map((id) => { const r = itemOf(id); return { id: r.id, name: r.name, tier: r.tier, slot: slotOf(r) } })
}

export { costOfItem, forgeLevelOf, forgeBandName, shelfSpecOf, whyNotTradeIn, canTradeIn, performTradeIn, poolOf, tradeCategoryOf } from './forge.js'

const atBuy = (campaign: CampaignState) => canUseActivity(campaign, 'market')

export function canBuyItem(campaign: CampaignState, itemId: string): boolean {
  if (!atBuy(campaign)) return false
  if (!listShopItems(campaign).some((r) => r.id === itemId)) return false
  return canAfford(campaign, costOfItem(campaign, itemId))
}

export function performBuyItem(ctx: Ctx, itemId: string, causeId: string): void {
  if (!canBuyItem(ctx.campaign, itemId)) {
    const why = !atBuy(ctx.campaign) ? 'not the Buy Stage' : !isShopOpen(ctx.campaign) ? 'the Forge is not repaired' : !listShopItems(ctx.campaign).some((r) => r.id === itemId) ? 'not on the shelf this Week' : `short of ${Object.entries(costOfItem(ctx.campaign, itemId)).filter(([c, n]) => (ctx.campaign.purse[c] ?? 0) < n).map(([c]) => c.replace('currency.', '')).map((c) => c[0]!.toUpperCase() + c.slice(1)).join(', ')}`
    throw new Error(`performBuyItem refused for '${itemId}': ${why}`)
  }
  const cost = costOfItem(ctx.campaign, itemId)
  performSpend(ctx, cost, causeId)
  applyBuyItem(ctx, itemId, cost, causeId)
}

/** Equipping happens inside an equip session (G5): the prep step whose row equips opens one; the roster between battles may open one too. */
const atEquip = (campaign: CampaignState) => isEquipOpen(campaign)
/** Whose gear may be fitted: at prep the deployed; from the roster any living hero. */
const fittable = (campaign: CampaignState, heroId: HeroId): boolean =>
  equipWhere(campaign) === 'prep' ? (campaign.cursor.engagement?.deployed.includes(heroId) ?? false) : campaign.roster[heroId]?.lifeState === 'alive'

/** Open the equip session from the roster, between battles — never inside prep or a battle. */
export function performOpenEquip(ctx: Ctx, causeId: string): void {
  if (ctx.campaign.cursor.step !== 'open') throw new Error(`performOpenEquip refused: the cursor is at step '${ctx.campaign.cursor.step}' — gear is fitted from the roster between battles, or at prep's Equip step`)
  openEquipSession(ctx, 'roster', causeId)
}
export function performCloseEquip(ctx: Ctx, causeId: string): void {
  if (equipWhere(ctx.campaign) !== 'roster') throw new Error(`performCloseEquip refused: no roster equip session is open`)
  closeEquipSession(ctx, causeId)
}
export { isEquipOpen, equipWhere, equipCostOf } from './equip-session.js'

/**
 * Why this hero cannot put on this item now — or null. `displace` names an item the
 * hero is wearing that comes off first (a drop onto a full slot: "you replace it, the
 * other thing bounces back out"), so the fit is judged on the list after the swap.
 */
export function whyNotEquip(campaign: CampaignState, heroId: HeroId, itemId: string, displace?: string): string | null {
  if (!atEquip(campaign)) return 'not the equip step'
  if (!fittable(campaign, heroId)) return equipWhere(campaign) === 'prep' ? 'not deployed' : 'not a living hero'
  const h = campaign.roster[heroId]
  if (!h) return `no hero '${heroId}'`
  if (!campaign.stash.includes(itemId)) return `'${itemId}' is not in the stash`
  if (displace !== undefined && !h.equipped.includes(displace)) return `'${displace}' is not worn by ${h.name}`
  const after = displace === undefined ? [...h.equipped, itemId] : [...h.equipped.filter((id) => id !== displace), itemId]
  // kingdom.opening-sword-waits: an item its row gives to named classes is those classes' only — it may lie in the stash
  // (waiting for its taker, or taken off), and nobody else puts it on (2026-09-28 "it only is going to help the paladin
  // or the warrior")
  const whose = rewardTakersOf(itemId)
  if (whose && !h.classes.some((c) => whose.includes(c))) return `'${itemOf(itemId).name}' is for ${whose.map((c) => 'a ' + (CLASSES.find((r) => r.id === c)?.name ?? c)).join(' or ')} only`
  return whyNotFit(campaign, heroId, after) ?? whyNotPay(campaign, itemId)
}

export const canEquip = (campaign: CampaignState, heroId: HeroId, itemId: string, displace?: string): boolean => whyNotEquip(campaign, heroId, itemId, displace) === null

export function performEquip(ctx: Ctx, heroId: HeroId, itemId: string, causeId: string, displace?: string): void {
  const why = whyNotEquip(ctx.campaign, heroId, itemId, displace)
  if (why) throw new Error(`performEquip refused (${heroId} ← ${itemId}): ${why}`)
  if (displace !== undefined) { applyUnequip(ctx, heroId, displace, causeId); refundSession(ctx, heroId, displace, causeId) }
  paySession(ctx, heroId, itemId, causeId)
  applyEquip(ctx, heroId, itemId, causeId)
}

export function whyNotUnequip(campaign: CampaignState, heroId: HeroId, itemId: string): string | null {
  if (!atEquip(campaign)) return 'not the equip step'
  if (!fittable(campaign, heroId)) return equipWhere(campaign) === 'prep' ? 'not deployed' : 'not a living hero'
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
  refundSession(ctx, heroId, itemId, causeId)
}

export { loadoutOf, itemSlotsOf, slotCostOf } from './loadout.js'
