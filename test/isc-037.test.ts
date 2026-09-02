// ISC-037 — at stage.buy, performRecruit spends Faith from the purse and adds
// one hero row to the roster; canRecruit is false when Faith is short.
// 7-KINGDOM-SETTLED.md — Currencies (Faith buys recruits) · KINGDOM-DESIGN.md §10 (the Beacon), §3 (one a Week)
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { setCursor } from '../src/core/mutate.js'
import { beginStage, performAdvance, beginWeek } from '../src/core/week.js'
import { listRecruitOffers, canRecruit, performRecruit, costOfRecruit } from '../src/core/market.js'
import { SWITCHES } from '../src/content/switches.js'

function atBuy(edit?: Parameters<typeof loadFixture>[0]) {
  const ctx = loadFixture(edit)
  setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
  beginWeek(ctx, 'test')
  return ctx
}

describe('ISC-037 — recruiting costs Faith and adds a hero', () => {
  it('one recruit a Week, for Faith, onto the roster; refused when short, twice, or elsewhere', () => {
    const ctx = atBuy((c) => { c.purse['currency.faith'] = SWITCHES.recruitFaith * 2 })
    const offers = listRecruitOffers(ctx.campaign)
    expect(offers.length).toBeGreaterThan(1)
    const pick = offers[0]!
    const before = Object.keys(ctx.campaign.roster).length
    expect(canRecruit(ctx.campaign, pick.id)).toBe(true)
    performRecruit(ctx, pick.id, 'test')
    expect(Object.keys(ctx.campaign.roster).length).toBe(before + 1)
    expect(ctx.campaign.roster[pick.id]).toMatchObject({ name: pick.name, lifeState: 'alive', wound: 0 })
    expect(ctx.campaign.purse['currency.faith']).toBe(SWITCHES.recruitFaith)
    expect(listRecruitOffers(ctx.campaign).some((r) => r.id === pick.id)).toBe(false)
    expect(ctx.events.filter((e) => e.type === 'hero.recruited').map((e) => e['heroId'])).toEqual([pick.id])
    expect(canRecruit(ctx.campaign, offers[1]!.id)).toBe(false)                  // one a Week
    expect(() => performRecruit(ctx, offers[1]!.id, 'test')).toThrow(/one recruit a Week/)
    performAdvance(ctx, 'test')                                                  // → Quest
    expect(canRecruit(ctx.campaign, offers[1]!.id)).toBe(false)                  // not the Buy Stage
    expect(costOfRecruit()).toEqual({ 'currency.faith': SWITCHES.recruitFaith })
  })
  it('short of Faith is refused with nothing changed', () => {
    const ctx = atBuy((c) => { c.purse['currency.faith'] = SWITCHES.recruitFaith - 1; c.purse['currency.supplies'] = 999 })
    const pick = listRecruitOffers(ctx.campaign)[0]!
    expect(canRecruit(ctx.campaign, pick.id)).toBe(false)
    expect(() => performRecruit(ctx, pick.id, 'test')).toThrow(/short of Faith/)
    expect(ctx.campaign.roster[pick.id]).toBeUndefined()
  })
  it('next Week the Beacon is open again — while the roster has room', () => {
    // Law 10, rewritten 2026-09-02 toward the rule: the roster's base room is
    // eight ("Roster 10 — hold two more heroes"), and the fixture's seven plus
    // one recruit fills it. Two heroes fewer, and the Beacon reopens.
    const ctx = atBuy((c) => { c.purse['currency.faith'] = 100; delete c.roster['hero.fixed.orphans']; delete c.roster['hero.base.priest-scantily'] })
    performRecruit(ctx, listRecruitOffers(ctx.campaign)[0]!.id, 'test')
    for (let i = 0; i < 6; i++) performAdvance(ctx, 'test')
    expect(ctx.campaign.week).toBe(4)
    expect(canRecruit(ctx.campaign, listRecruitOffers(ctx.campaign)[0]!.id)).toBe(true)
    beginStage(ctx, 'stage.build', 'test')
    expect(canRecruit(ctx.campaign, listRecruitOffers(ctx.campaign)[0]!.id)).toBe(false)
  })
  it('a full roster refuses a recruit until a Roster Article holds more', () => {
    const ctx = atBuy((c) => { c.purse['currency.faith'] = 100; c.roster['hero.base.warrior-iron'] = { ...c.roster['hero.fixed.orphans']!, id: 'hero.base.warrior-iron', name: 'Iron Dwarf' } })   // eight alive
    const pick = listRecruitOffers(ctx.campaign)[0]!
    expect(canRecruit(ctx.campaign, pick.id)).toBe(false)
    expect(() => performRecruit(ctx, pick.id, 'test')).toThrow(/roster is full at 8/)
  })
})
