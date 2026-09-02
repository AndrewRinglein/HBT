// ISC-035 — stage.defend rolls once per Week on cup.threat, at 6% per owned
// Territory, and produces at most one engagement.defend; over 200 Weeks with
// four Territories owned the rate lands within 24% ± 6.
// THIN-SLICE-REVIEW.md §G2 — "one roll per Week, 6% per owned Territory, all in one roll"
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { resolveThreat } from '../src/core/map.js'
import { setCursor } from '../src/core/mutate.js'
import { beginWeek, listStageOffers, stageOf, performAdvance, performChooseEngagement } from '../src/core/week.js'
import { playStage, playEngagement, DEFAULTS } from '../src/sim/autoplay.js'
import { SWITCHES } from '../src/content/switches.js'

describe('ISC-035 — the weekly defend roll', () => {
  it('with four Territories held, ~24% of 200 Weeks are attacked, each on a held Territory, once', () => {
    const ctx = loadFixture((c) => { for (const t of Object.values(c.territories)) { t.owned = true; t.claimedOnce = true } })
    expect(SWITCHES.defendChancePerTerritory).toBe(6)
    let fired = 0
    for (let week = 1; week <= 200; week++) {
      const at = resolveThreat(ctx.campaign, week)
      expect(at).toBe(resolveThreat(ctx.campaign, week))     // the same Week rolls the same attack
      if (at) { fired++; expect(ctx.campaign.territories[at]!.owned).toBe(true) }
    }
    expect(fired).toBeGreaterThanOrEqual(36)
    expect(fired).toBeLessThanOrEqual(60)
    // one Territory held → 6%; none held → never
    const one = loadFixture()
    let f1 = 0
    for (let week = 1; week <= 400; week++) if (resolveThreat(one.campaign, week)) f1++
    expect(f1).toBeGreaterThanOrEqual(10); expect(f1).toBeLessThanOrEqual(40)
    const none = loadFixture((c) => { for (const t of Object.values(c.territories)) t.owned = false })
    expect(resolveThreat(none.campaign, 7)).toBeNull()
  })

  it('an attack the Stage offers is answered by fighting, or costs the Territory when passed', () => {
    const ctx = loadFixture((c) => { for (const t of Object.values(c.territories)) { t.owned = true; t.claimedOnce = true } })
    setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
    beginWeek(ctx, 'test')
    let passed = 0, fought = 0, lost = 0
    for (let i = 0; i < 60 && (passed < 1 || fought < 1); i++) {
      while (stageOf(ctx.campaign).targets !== 'rolled') playStage(ctx, { ...DEFAULTS, target: () => null }, 'test')
      const offers = listStageOffers(ctx.campaign)
      expect(offers.length).toBeLessThanOrEqual(1)
      if (offers.length && fought === 0) {
        performChooseEngagement(ctx, offers[0]!, 'test')
        expect(ctx.campaign.cursor.engagement?.kind).toBe('engagement.defend')
        playEngagement(ctx, DEFAULTS, 'test')          // won: kept
        expect(ctx.campaign.territories[offers[0]!]!.owned).toBe(true)
        fought++
      } else if (offers.length) {
        const before = ctx.events.length
        performAdvance(ctx, 'test')                        // passed: lost, or the Kingdom Territory's cost
        const t = ctx.campaign.territories[offers[0]!]!
        if (t.kingdom) expect(ctx.events.slice(before).some((e) => e.type === 'resource.spent')).toBe(true)
        else { expect(t.owned).toBe(false); lost++ }
        passed++
        continue
      }
      performAdvance(ctx, 'test')
    }
    expect(fought).toBe(1)
    expect(passed).toBeGreaterThanOrEqual(1)
  })
})
