// ISC-012 — a won Conquer claims the Territory and any building standing on it;
// a lost Conquer claims nothing.
// 7-KINGDOM-SETTLED.md — The Week, Payouts
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { setCursor } from '../src/core/mutate.js'
import { beginWeek, listStageOffers, performChooseEngagement, stageOf } from '../src/core/week.js'
import { playStage, playEngagement, DEFAULTS } from '../src/sim/autoplay.js'
import { STAGES } from '../src/content/stages.js'

function toConquer(won: boolean) {
  const ctx = loadFixture()
  setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
  beginWeek(ctx, 'test')
  while (stageOf(ctx.campaign).targets !== 'conquerable') playStage(ctx, { ...DEFAULTS, target: () => null }, 'test')
  const offers = listStageOffers(ctx.campaign)
  const target = offers.find((id) => ctx.campaign.territories[id]!.buildings.length > 0)!
  performChooseEngagement(ctx, target, 'test')
  playEngagement(ctx, won ? DEFAULTS : { ...DEFAULTS, outcome: (_c, blank) => ({ ...blank, outcome: 'wipe', units: blank.units.map((u) => (u.side === 'hero' ? { ...u, lifeState: 'downed' as const, downed: true } : u)) }) }, 'test')
  return { ctx, target }
}

describe('ISC-012 — a won Conquer claims the Territory and its building', () => {
  it('won: the Territory and the Forge are held; the claim is the first', () => {
    const { ctx, target } = toConquer(true)
    const t = ctx.campaign.territories[target]!
    expect(t.owned).toBe(true)
    expect(t.buildings.map((b) => b.id)).toContain('building.forge')
    const claim = ctx.events.find((e) => e.type === 'territory.claimed')!
    expect(claim['territoryId']).toBe(target)
    expect(claim['buildings']).toContain('building.forge')
    expect(claim['first']).toBe(true)
    expect(stageOf(ctx.campaign).targets).toBe('conquerable')   // back at the Stage, open
    expect(ctx.campaign.cursor.step).toBe('open')
  })
  it('lost: nothing is claimed and the Territory is offered again next Week', () => {
    const { ctx, target } = toConquer(false)
    expect(ctx.campaign.territories[target]!.owned).toBe(false)
    expect(ctx.events.some((e) => e.type === 'territory.claimed')).toBe(false)
    expect(ctx.campaign.losses).toBe(1)
    expect(listStageOffers(ctx.campaign)).toEqual([])          // one Engagement a Stage
  })
})
