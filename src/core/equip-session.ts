// The equip session — GEAR-DESIGN.md §6, ruled 2026-09-02: "Equipping an idol costs
// 1 faith. Equipping a Bloodrune costs 3 mana crystals. You get those back if you
// unequip it during the same preparation view." · "Once you leave that screen, it's
// saved, equipped, and you can't get it back anymore." · "Idols should not be
// equipped between battles … idols only relate to one battle. You shouldn't pay for it
// until the battle is about to happen."
//
// A session is a cursor field (state, plain data): where it is open (the prep Equip
// step, or the roster between battles) and what it has paid. Costs come from the
// item row's `equipCost` — the codex's, never typed here. This file knows no item by
// name; it knows that an item with an equipCost is paid for, and that an idol is
// whatever class the rows say may only be paid for at prep (ITEM_CLASSES_PREP_ONLY).

import type { CampaignState, HeroId } from './campaign.js'
import { type Ctx, setEquipSession, applyGrant } from './mutate.js'
import { canAfford, performSpend, type Cost } from './purse.js'
import { itemOf } from '../content/items.js'
import { PREP_ONLY_CLASSES, OPENING_EQUIPS_FREE } from '../content/equip.js'

export type EquipWhere = 'prep' | 'roster'

export const isEquipOpen = (campaign: CampaignState): boolean => campaign.cursor.equipSession !== null
export const equipWhere = (campaign: CampaignState): EquipWhere | null => campaign.cursor.equipSession?.where ?? null

export function openEquipSession(ctx: Ctx, where: EquipWhere, causeId: string): void {
  if (ctx.campaign.cursor.equipSession) throw new Error(`openEquipSession refused: a session is already open (${ctx.campaign.cursor.equipSession.where})`)
  setEquipSession(ctx, { where, paid: [] }, causeId, { type: 'equip.opened' })
}

/** Close: what was paid stays paid. */
export function closeEquipSession(ctx: Ctx, causeId: string): void {
  if (!ctx.campaign.cursor.equipSession) throw new Error('closeEquipSession refused: no session is open')
  setEquipSession(ctx, null, causeId, { type: 'equip.closed' })
}

/**
 * What putting this item on costs in THIS Campaign, now: the row's equipCost — or nothing while the Campaign is still in
 * the opening (its cursor's `prologue` set: before any Week), when the content's row says the opening equips free
 * (kingdom.opening-free-equip; engine DECISIONS.md 2026-10-03 'the opening run, audited': "4 free"). The one reading
 * every caller takes — the refusal, the payment, the screen — so there is one equip path, and in the opening it pays
 * nothing, records nothing paid, and has nothing to refund.
 */
export const equipCostOf = (campaign: CampaignState, itemId: string): Cost =>
  OPENING_EQUIPS_FREE && campaign.cursor.prologue !== null ? {} : { ...itemOf(itemId).equipCost }

/** Why the session refuses to pay for this item here — or null. */
export function whyNotPay(campaign: CampaignState, itemId: string): string | null {
  const s = campaign.cursor.equipSession
  if (!s) return 'no equip session is open'
  const row = itemOf(itemId)
  const cost = equipCostOf(campaign, itemId)
  if (Object.keys(cost).length === 0) return null
  if (PREP_ONLY_CLASSES.includes(row.itemClass) && s.where !== 'prep') return `a ${row.itemClass} is paid for only at prep, when the battle is about to happen`
  if (!canAfford(campaign, cost)) return `short of ${Object.entries(cost).filter(([c, n]) => (campaign.purse[c] ?? 0) < n).map(([c]) => c.replace('currency.', '')).map((c) => c[0]!.toUpperCase() + c.slice(1)).join(', ')} to equip '${row.name}'`
  return null
}

/** Pay for an item as it goes on, and remember it, so taking it off in this session refunds. */
export function paySession(ctx: Ctx, heroId: HeroId, itemId: string, causeId: string): void {
  const cost = equipCostOf(ctx.campaign, itemId)
  if (Object.keys(cost).length === 0) return
  const why = whyNotPay(ctx.campaign, itemId)
  if (why) throw new Error(`paySession refused (${heroId} ← ${itemId}): ${why}`)
  performSpend(ctx, cost, causeId)
  const s = ctx.campaign.cursor.equipSession!
  setEquipSession(ctx, { ...s, paid: [...s.paid, { heroId, itemId, cost: { ...cost } }] }, causeId, { type: 'equip.paid', heroId, itemId })
}

/** An item coming off: if THIS session paid for it, the money comes back; otherwise nothing. */
export function refundSession(ctx: Ctx, heroId: HeroId, itemId: string, causeId: string): void {
  const s = ctx.campaign.cursor.equipSession
  if (!s) return
  const at = s.paid.findIndex((p) => p.heroId === heroId && p.itemId === itemId)
  if (at < 0) return
  const entry = s.paid[at]!
  for (const [currency, amount] of Object.entries(entry.cost).sort()) applyGrant(ctx, currency, amount, causeId)
  setEquipSession(ctx, { ...s, paid: s.paid.filter((_, i) => i !== at) }, causeId, { type: 'equip.refunded', heroId, itemId })
}
