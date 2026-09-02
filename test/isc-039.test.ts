// ISC-039 — canLevelUp is true at 20, 100 and 250 XP and performLevelUp raises
// the level by exactly one; below the threshold it is refused.
// GLOSSARY.md "Level thresholds 20 · 100 · 250 · 500 — soft" · SKELETON-SETTLED.md:114
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { canLevelUp, performLevelUp, listLevelUps } from '../src/core/rewards.js'
import { LEVEL_THRESHOLDS } from '../src/content/levels.js'

const H = 'hero.fixed.air-mage'

describe('ISC-039 — the ruled thresholds', () => {
  it('20 · 100 · 250 · 500, one level at a time, refused below', () => {
    expect(LEVEL_THRESHOLDS.slice(2)).toEqual([20, 100, 250, 500])
    const ctx = loadFixture((c) => { c.roster[H]!.xp = 19 })
    expect(canLevelUp(ctx.campaign, H)).toBe(false)
    expect(() => performLevelUp(ctx, H, 'test')).toThrow(/needs 20/)
    ctx.campaign.roster[H]!.xp = 20
    expect(canLevelUp(ctx.campaign, H)).toBe(true)
    expect(listLevelUps(ctx.campaign)).toEqual([H])
    performLevelUp(ctx, H, 'test')
    expect(ctx.campaign.roster[H]!.level).toBe(2)
    expect(canLevelUp(ctx.campaign, H)).toBe(false)                      // 100 next
    ctx.campaign.roster[H]!.xp = 260
    performLevelUp(ctx, H, 'test'); expect(ctx.campaign.roster[H]!.level).toBe(3)
    performLevelUp(ctx, H, 'test'); expect(ctx.campaign.roster[H]!.level).toBe(4)
    expect(canLevelUp(ctx.campaign, H)).toBe(false)                      // 500 next
    expect(ctx.events.filter((e) => e.type === 'hero.leveled').map((e) => e['level'])).toEqual([2, 3, 4])
  })
  it('the dead do not level', () => {
    const ctx = loadFixture((c) => { c.roster[H]!.xp = 999; c.roster[H]!.lifeState = 'dead' })
    expect(canLevelUp(ctx.campaign, H)).toBe(false)
  })
})
