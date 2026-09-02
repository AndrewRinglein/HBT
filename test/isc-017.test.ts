// ISC-017 — re-conquest of a Territory lost earlier pays Renown and never Salvage.
// SKELETON-SETTLED.md:108
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { applyBattleResult } from '../src/core/reckoning.js'

describe('ISC-017 — re-conquest: Renown yes, Salvage no', () => {
  it('a first conquest pays Salvage; the same Territory taken again after being lost pays Renown only', () => {
    const first = toBattle(loadFixture())
    const e1 = first.campaign.cursor.engagement!
    const salvageBefore = first.campaign.purse['currency.salvage']!
    const d1 = decide(first, panelResult(first, true))
    applyBattleResult(first, e1, d1.result, d1.reckoning)
    expect(first.campaign.purse['currency.salvage']!).toBeGreaterThan(salvageBefore)
    expect(first.campaign.territories[e1.territoryId!]!.claimedOnce).toBe(true)

    // the Ridge was held once and lost since: claimedOnce stays true, owned is false
    const again = toBattle(loadFixture((c) => { const t = c.territories[c.cursor.engagement!.territoryId!]!; t.claimedOnce = true; t.owned = false }))
    const e2 = again.campaign.cursor.engagement!
    const salvage = again.campaign.purse['currency.salvage']!
    const renown = again.campaign.renown
    const d2 = decide(again, panelResult(again, true))
    // Law 10, rewritten 2026-09-01 toward the rule: the three shop currencies
    // are paid on every win (7-KINGDOM-SETTLED.md); Salvage, and only Salvage,
    // never fires twice. The old lines asserted an empty grant list.
    expect(d2.reckoning.grants.some((g) => g.currency === 'currency.salvage')).toBe(false)
    applyBattleResult(again, e2, d2.result, d2.reckoning)
    expect(again.campaign.renown).toBe(renown + 1)
    expect(again.campaign.purse['currency.salvage']).toBe(salvage)
    expect(again.campaign.territories[e2.territoryId!]!.owned).toBe(true)
    expect(again.events.filter((ev) => ev.type === 'territory.claimed').map((ev) => ev['first'])).toEqual([false])
  })
})
