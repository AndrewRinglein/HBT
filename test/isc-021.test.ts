// ISC-021 — four currencies exist — currency.salvage · currency.supplies ·
// currency.faith · currency.mana — and none substitutes for another: canAfford
// is false when the named currency is short, whatever the others hold.
// Law 18 · 7-KINGDOM-SETTLED.md — Currencies
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { balanceOf, canAfford, performSpend } from '../src/core/purse.js'
import { CURRENCIES } from '../src/content/currencies.js'

// the RULED four, written here from the settled table — a registry missing one (KINGDOM_DISABLE_IDS) fails this
const RULED = ['currency.faith', 'currency.mana', 'currency.salvage', 'currency.supplies']

describe('ISC-021 — four currencies, no substitution', () => {
  it('the registry and the purse carry exactly the four', () => {
    expect(CURRENCIES.map((c) => c.id).sort()).toEqual(RULED)
    const ctx = loadFixture()
    expect(Object.keys(ctx.campaign.purse).sort()).toEqual(RULED)
    for (const c of RULED) expect(typeof balanceOf(ctx.campaign, c)).toBe('number')
    expect(() => balanceOf(ctx.campaign, 'currency.gold')).toThrow(/no currency/)
  })
  it('short of the named currency is short, however rich the others', () => {
    const ctx = loadFixture((c) => { c.purse['currency.supplies'] = 100; c.purse['currency.faith'] = 100; c.purse['currency.mana'] = 100; c.purse['currency.salvage'] = 0 })
    expect(canAfford(ctx.campaign, { 'currency.salvage': 1 })).toBe(false)
    expect(canAfford(ctx.campaign, { 'currency.supplies': 100 })).toBe(true)
    expect(canAfford(ctx.campaign, { 'currency.supplies': 1, 'currency.salvage': 1 })).toBe(false)
    expect(() => performSpend(ctx, { 'currency.supplies': 1, 'currency.salvage': 1 }, 'test')).toThrow(/short of 1 currency.salvage/)
    expect(ctx.campaign.purse['currency.supplies']).toBe(100)              // refused before the first coin moved
    performSpend(ctx, { 'currency.supplies': 30, 'currency.faith': 5 }, 'test')
    expect(ctx.campaign.purse['currency.supplies']).toBe(70)
    expect(ctx.campaign.purse['currency.faith']).toBe(95)
    expect(ctx.events.filter((e) => e.type === 'resource.spent').length).toBe(2)
  })
})
