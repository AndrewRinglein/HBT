// ISC-039 — canLevelUp is true at each ruled threshold and performLevelUp raises
// the level by exactly one; below the threshold it is refused.
// was: GLOSSARY.md "Level thresholds 20 · 100 · 250 · 500 — soft" · SKELETON-SETTLED.md:114 — the curve was re-ruled
// 2026-09-28 (Andrew, engine/DECISIONS.md 'levels by XP at 20, 50, 100, 170, 270, 400'; GLOSSARY.md's row follows) and
// src/content/levels.ts takes it in kingdom.opening-rewards (Law 10): the rule — refused below, one level at a time,
// stopped at the next threshold — is unchanged; only the numbers are the new curve's.
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { canLevelUp, performLevelUp, listLevelUps } from '../src/core/rewards.js'
import { LEVEL_THRESHOLDS } from '../src/content/levels.js'

const H = 'hero.base.priest-armored'

describe('ISC-039 — the ruled thresholds', () => {
  // was: it('20 · 100 · 250 · 500, one level at a time, refused below'
  it('20 · 50 · 100 · 170 · 270 · 400, one level at a time, refused below', () => {
    // was: expect(LEVEL_THRESHOLDS.slice(2)).toEqual([20, 100, 250, 500]) — the 2026-09-28 curve
    expect(LEVEL_THRESHOLDS.slice(2)).toEqual([20, 50, 100, 170, 270, 400])
    const ctx = loadFixture((c) => { c.roster[H]!.xp = 19 })
    expect(canLevelUp(ctx.campaign, H)).toBe(false)
    expect(() => performLevelUp(ctx, H, 'test')).toThrow(/needs 20/)
    ctx.campaign.roster[H]!.xp = 20
    expect(canLevelUp(ctx.campaign, H)).toBe(true)
    expect(listLevelUps(ctx.campaign)).toEqual([H])
    performLevelUp(ctx, H, 'test')
    expect(ctx.campaign.roster[H]!.level).toBe(2)
    expect(canLevelUp(ctx.campaign, H)).toBe(false)                      // was: 100 next — now 50 next
    // was: ctx.campaign.roster[H]!.xp = 260 — two levels short of the next threshold on the new curve (50, 100; 170 next)
    ctx.campaign.roster[H]!.xp = 160
    performLevelUp(ctx, H, 'test'); expect(ctx.campaign.roster[H]!.level).toBe(3)
    performLevelUp(ctx, H, 'test'); expect(ctx.campaign.roster[H]!.level).toBe(4)
    expect(canLevelUp(ctx.campaign, H)).toBe(false)                      // was: 500 next — now 170 next
    expect(ctx.events.filter((e) => e.type === 'hero.leveled').map((e) => e['level'])).toEqual([2, 3, 4])
  })
  it('the dead do not level', () => {
    const ctx = loadFixture((c) => { c.roster[H]!.xp = 999; c.roster[H]!.lifeState = 'dead' })
    expect(canLevelUp(ctx.campaign, H)).toBe(false)
  })
})
