// ISC-045 — a lost battle before the Kingdom Territory is taken ends the
// Campaign; a lost Conquer after it does not.
// GAME-ARCHITECTURE.md §2.5 · SKELETON-SETTLED.md:75-76
import { describe, it, expect } from 'vitest'
import { makeNewCampaign, performEndCampaign } from '../src/core/opening.js'
import { makeCtx } from '../src/core/mutate.js'
import { playOpening, playWeeks, playStage, DEFAULTS, type Decisions } from '../src/sim/autoplay.js'
import { performAdvance } from '../src/core/week.js'
import { campaignOf, saveOf } from '../src/core/campaign.js'

const lose: Decisions['outcome'] = (_c, blank) => ({ ...blank, outcome: 'wipe', units: blank.units.map((u) => (u.side === 'hero' ? { ...u, lifeState: 'downed' as const, downed: true } : u)) })

describe('ISC-045 — the restart window closes at the Kingdom Territory', () => {
  it('losing battle 2 ends the Campaign, the save says so, nothing advances, and a fresh Campaign starts again', () => {
    let n = 0
    const ctx = playOpening(makeCtx(makeNewCampaign(3)), { outcome: (c, blank) => (++n === 2 ? lose(c, blank) : DEFAULTS.outcome(c, blank)) })
    const c = ctx.campaign
    expect(c.ended).toMatchObject({ week: 0 })
    expect(c.ended!.reason).toMatch(/prologue battle 2/)
    expect(c.cursor.prologue).toBe(2)
    expect(ctx.events.filter((e) => e.type === 'campaign.ended').length).toBe(1)
    expect(campaignOf(saveOf(c)).ended).toEqual(c.ended)
    expect(() => performAdvance(ctx, 'test')).toThrow(/ended/)
    expect(() => playStage(ctx, DEFAULTS, 'test')).toThrow(/ended/)
    const fresh = performEndCampaign(ctx, 'test')
    expect(fresh.ended).toBeNull(); expect(fresh.week).toBe(0); expect(Object.keys(fresh.roster)).toEqual([])
    expect(fresh.seed).not.toBe(c.seed)
  })
  it('a lost battle 5, after the Sanctuary is taken in battle 4, does not end the run; nor does a lost Conquer in Week 2', () => {
    let n = 0
    const ctx = playOpening(makeCtx(makeNewCampaign(3)), { outcome: (c, blank) => (++n === 5 ? lose(c, blank) : DEFAULTS.outcome(c, blank)) })
    expect(ctx.campaign.ended).toBeNull()
    expect(ctx.campaign.territories['territory.ruined-kingdom.sanctuary']!.owned).toBe(true)
    expect(ctx.campaign.territories['territory.ruined-kingdom.ridge']!.owned).toBe(false)     // battle 5 lost: the Ridge not taken
    expect(ctx.campaign.week).toBe(1)
    playWeeks(ctx, 2, { outcome: lose })
    expect(ctx.campaign.ended).toBeNull()
    expect(ctx.campaign.losses).toBeGreaterThanOrEqual(2)
  })
})
