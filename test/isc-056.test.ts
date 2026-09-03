// ISC-056 — idols and Bloodrunes cost, and refund inside the session: equipping
// an idol spends 1 Faith and only at the prep Equip step; a Bloodrune spends
// 3 Mana at prep or from the roster; unequipping inside the same equip session
// refunds; leaving the session commits and a later unequip refunds nothing.
// 7-KINGDOM-SETTLED.md 2026-09-02 (idol, Bloodrune, "once you leave that screen")
import { describe, it, expect } from 'vitest'
import { loadFixture, toEquip } from './walk.js'
import { performEquip, performUnequip, whyNotEquip, canEquip } from '../src/core/shop.js'
import { performOpenEquip, performCloseEquip, isEquipOpen } from '../src/core/shop.js'
import { performAdvancePrep } from '../src/core/prep.js'
import type { CampaignState } from '../src/core/campaign.js'

const HUNTER = 'hero.base.ranger-aggressive', DWARF = 'hero.base.warrior-iron'
const IDOL = 'item.pilgrims-warding-stone', RUNE = 'item.rune-bashing'
const atBuy = (c: CampaignState) => { c.cursor = { ...c.cursor, stage: 'stage.buy', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 } }

describe('ISC-056 — equip costs and the session', () => {
  it('at prep: an idol costs 1 Faith, a Bloodrune 3 Mana; taking either off in the same session refunds; leaving commits', () => {
    const ctx = toEquip(loadFixture((c) => { c.stash = [IDOL, RUNE]; c.purse['currency.faith'] = 5; c.purse['currency.mana'] = 5 }), [HUNTER, DWARF])
    expect(isEquipOpen(ctx.campaign)).toBe(true)
    performEquip(ctx, HUNTER, IDOL, 'test')
    expect(ctx.campaign.purse['currency.faith']).toBe(4)
    performEquip(ctx, DWARF, RUNE, 'test')                                             // the Hunter has one slot; the Dwarf two
    expect(ctx.campaign.purse['currency.mana']).toBe(2)
    performUnequip(ctx, HUNTER, IDOL, 'test')
    expect(ctx.campaign.purse['currency.faith']).toBe(5)                               // refunded, same session
    performEquip(ctx, HUNTER, IDOL, 'test')
    expect(ctx.campaign.purse['currency.faith']).toBe(4)
    expect(ctx.events.filter((e) => e.type === 'equip.refunded').length).toBe(1)
    performAdvancePrep(ctx, 'test')                                                    // leave: committed
    expect(isEquipOpen(ctx.campaign)).toBe(false)
    expect(ctx.campaign.cursor.equipSession).toBeNull()
    const spent = ctx.events.filter((e) => e.type === 'resource.spent').map((e) => [e['currencyId'], e['amount']])
    expect(spent).toEqual([['currency.faith', 1], ['currency.mana', 3], ['currency.faith', 1]])
  })
  it('too poor: refused, by name of the currency; nothing worn, nothing spent', () => {
    const ctx = toEquip(loadFixture((c) => { c.stash = [IDOL, RUNE]; c.purse['currency.faith'] = 0; c.purse['currency.mana'] = 2 }), [HUNTER])
    expect(canEquip(ctx.campaign, HUNTER, IDOL)).toBe(false)
    expect(whyNotEquip(ctx.campaign, HUNTER, IDOL)).toMatch(/Faith/)
    expect(whyNotEquip(ctx.campaign, HUNTER, RUNE)).toMatch(/Mana/)
    expect(() => performEquip(ctx, HUNTER, RUNE, 'test')).toThrow(/refused/)
    expect(ctx.campaign.roster[HUNTER]!.equipped).not.toContain(RUNE)
  })
  it('from the roster between battles: a Bloodrune equips and refunds inside the session; an idol is refused; after closing, a later unequip refunds nothing', () => {
    const ctx = loadFixture((c) => { atBuy(c); c.stash = [IDOL, RUNE]; c.purse['currency.faith'] = 5; c.purse['currency.mana'] = 5 })
    expect(isEquipOpen(ctx.campaign)).toBe(false)
    expect(() => performEquip(ctx, HUNTER, RUNE, 'test')).toThrow(/refused/)
    performOpenEquip(ctx, 'test')
    expect(isEquipOpen(ctx.campaign)).toBe(true)
    expect(whyNotEquip(ctx.campaign, HUNTER, IDOL)).toMatch(/prep/)                    // idols only when a battle is about to happen
    performEquip(ctx, HUNTER, RUNE, 'test')
    expect(ctx.campaign.purse['currency.mana']).toBe(2)
    performUnequip(ctx, HUNTER, RUNE, 'test'); expect(ctx.campaign.purse['currency.mana']).toBe(5)
    performEquip(ctx, HUNTER, RUNE, 'test'); expect(ctx.campaign.purse['currency.mana']).toBe(2)
    performCloseEquip(ctx, 'test')
    expect(isEquipOpen(ctx.campaign)).toBe(false)
    performOpenEquip(ctx, 'test')
    performUnequip(ctx, HUNTER, RUNE, 'test')
    expect(ctx.campaign.purse['currency.mana']).toBe(2)                                // paid for; no refund across sessions
    expect(ctx.campaign.stash).toContain(RUNE)
    performCloseEquip(ctx, 'test')
  })
})
