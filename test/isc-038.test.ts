// ISC-038 — performHeal spends Faith and lowers a hero's wound by one level; it
// is refused on a whole hero and when Faith is short.
// GAME-ARCHITECTURE.md §2.6 "canHeal / costOfHeal / performHeal" · 7-KINGDOM-NOTES.md:189 (Field Surgery, 7 Faith)
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { setCursor } from '../src/core/mutate.js'
import { beginWeek } from '../src/core/week.js'
import { canHeal, performHeal, costOfHeal } from '../src/core/market.js'
import { commitmentOf } from '../src/core/assignments.js'
import { SWITCHES } from '../src/content/switches.js'

const H = 'hero.base.paladin-shiney', WHOLE = 'hero.fixed.air-mage'

describe('ISC-038 — Field Surgery', () => {
  it('a Severe hero healed once is Badly Wounded and back on the field roster; Faith paid to the number', () => {
    const ctx = loadFixture((c) => { c.roster[H]!.wound = 3; c.purse['currency.faith'] = SWITCHES.healFaith * 2 + 1 })
    setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
    beginWeek(ctx, 'test')
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('wounded')
    expect(costOfHeal()).toEqual({ 'currency.faith': SWITCHES.healFaith })
    expect(canHeal(ctx.campaign, H)).toBe(true)
    performHeal(ctx, H, 'test')
    expect(ctx.campaign.roster[H]!.wound).toBe(2)
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('free')
    expect(ctx.campaign.purse['currency.faith']).toBe(SWITCHES.healFaith + 1)
    performHeal(ctx, H, 'test')
    expect(ctx.campaign.roster[H]!.wound).toBe(1)
    expect(canHeal(ctx.campaign, H)).toBe(false)                                 // short now
    expect(() => performHeal(ctx, H, 'test')).toThrow(/short of Faith/)
    expect(ctx.campaign.roster[H]!.wound).toBe(1)
    expect(canHeal(ctx.campaign, WHOLE)).toBe(false)
    expect(() => performHeal(ctx, WHOLE, 'test')).toThrow(/whole already/)
    expect(ctx.events.filter((e) => e.type === 'hero.wounded').map((e) => [e['from'], e['to']])).toEqual([[3, 2], [2, 1]])
  })
})
