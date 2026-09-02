// Buy — the market. GAME-ARCHITECTURE.md §2.6 MARKET and WOUNDS: recruiting
// (the Beacon, thin — Faith buys recruits, one a Week) and Field Surgery (the
// Chapel — "7 Faith to heal a wounded hero on the spot", 7-KINGDOM-NOTES.md:189).
// Both stand at Sanctuary and cannot be lost, so both are always open at
// stage.buy. Prices are switches (SWITCHES.md).

import type { CampaignState, HeroId } from './campaign.js'
import { type Ctx, applyRecruit, setWound, setCursor } from './mutate.js'
import { canAfford, performSpend, type Cost } from './purse.js'
import { RECRUITS, type RecruitRow } from '../content/heroes.js'
import { SWITCHES } from '../content/switches.js'
import { CURRENCY_IDS } from '../content/currencies.js'
import { stageRowOf } from '../content/stages.js'
import { rosterCapOf } from './charter.js'

/** Open only at the Stage whose row offers a market — core reads the row, not the name. */
const atBuy = (campaign: CampaignState) => campaign.cursor.step === 'open' && stageRowOf(campaign.cursor.stage).offers === 'market'

export const costOfRecruit = (): Cost => ({ [CURRENCY_IDS.faith]: SWITCHES.recruitFaith })
export const costOfHeal = (): Cost => ({ [CURRENCY_IDS.faith]: SWITCHES.healFaith })

/** Who the Beacon offers: the pool, less anyone already on the roster. Sorted by id. */
export function listRecruitOffers(campaign: CampaignState): RecruitRow[] {
  return RECRUITS.filter((r) => !campaign.roster[r.id]).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export function canRecruit(campaign: CampaignState, recruitId: string): boolean {
  if (!atBuy(campaign)) return false
  if (campaign.cursor.recruited >= 1) return false
  if (Object.values(campaign.roster).filter((h) => h.lifeState === 'alive').length >= rosterCapOf(campaign)) return false
  if (!listRecruitOffers(campaign).some((r) => r.id === recruitId)) return false
  return canAfford(campaign, costOfRecruit())
}

export function performRecruit(ctx: Ctx, recruitId: string, causeId: string): void {
  const c = ctx.campaign
  if (!canRecruit(c, recruitId)) {
    const why = !atBuy(c) ? 'not at the Buy Stage' : c.cursor.recruited >= 1 ? 'one recruit a Week, already taken' : Object.values(c.roster).filter((h) => h.lifeState === 'alive').length >= rosterCapOf(c) ? `the roster is full at ${rosterCapOf(c)} — a Roster Article holds more` : !listRecruitOffers(c).some((r) => r.id === recruitId) ? 'not offered' : 'short of Faith'
    throw new Error(`performRecruit refused for '${recruitId}': ${why}`)
  }
  performSpend(ctx, costOfRecruit(), causeId)
  const row = RECRUITS.find((r) => r.id === recruitId)!
  applyRecruit(ctx, row, causeId, costOfRecruit())
  setCursor(ctx, { recruited: c.cursor.recruited + 1 }, causeId)
}

export function canHeal(campaign: CampaignState, heroId: HeroId): boolean {
  const h = campaign.roster[heroId]
  if (!h || h.lifeState !== 'alive' || h.wound === 0) return false
  if (!atBuy(campaign)) return false
  return canAfford(campaign, costOfHeal())
}

/** Field Surgery: one level, now, for Faith. */
export function performHeal(ctx: Ctx, heroId: HeroId, causeId: string): void {
  const h = ctx.campaign.roster[heroId]
  if (!canHeal(ctx.campaign, heroId)) {
    const why = !h ? 'no such hero' : h.wound === 0 ? 'whole already' : !atBuy(ctx.campaign) ? 'not at the Buy Stage' : 'short of Faith'
    throw new Error(`performHeal refused for '${heroId}': ${why}`)
  }
  performSpend(ctx, costOfHeal(), causeId)
  setWound(ctx, heroId, h!.wound - 1, causeId)
}
