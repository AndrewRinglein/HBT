// ISC-046 — between Buy and Quest, a roll on cup.unavailability keeps some
// heroes home for the Week, each with a story, and commitmentOf says so.
// KINGDOM-DESIGN.md §3 · SKELETON-SETTLED.md:119-122
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { performAdvance, tickWeek } from '../src/core/week.js'
import { commitmentOf, listAvailable } from '../src/core/assignments.js'
import { absencesFor, ABSENCES } from '../src/content/absences.js'
import type { CampaignState } from '../src/core/campaign.js'

const atBuy = (c: CampaignState) => { c.cursor = { ...c.cursor, stage: 'stage.buy', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 } }

describe('ISC-046 — the unavailability roll', () => {
  it('leaving Buy for Quest keeps floor(roster/3) heroes home, each with a story, and they answer unavailable in both slots', () => {
    const ctx = loadFixture(atBuy)
    const roster = Object.keys(ctx.campaign.roster).length
    expect(roster).toBeGreaterThanOrEqual(6)
    expect(ctx.campaign.unavailable).toEqual([])
    performAdvance(ctx, 'test')
    expect(ctx.campaign.cursor.stage).toBe('stage.quest')
    const kept = ctx.campaign.unavailable
    expect(kept.length).toBe(absencesFor(roster))
    expect(kept.length).toBeGreaterThan(0)
    for (const a of kept) {
      expect(ctx.campaign.roster[a.heroId]).toBeDefined()
      expect(ABSENCES.map((r) => r.story)).toContain(a.story)
      expect(commitmentOf(ctx.campaign, a.heroId, 'field')).toBe('unavailable')
      expect(commitmentOf(ctx.campaign, a.heroId, 'city')).toBe('unavailable')
      expect(listAvailable(ctx.campaign, 'stage.conquer')).not.toContain(a.heroId)
    }
    expect(new Set(kept.map((a) => a.heroId)).size).toBe(kept.length)          // no hero kept home twice
    expect(ctx.events.filter((e) => e.type === 'absence.rolled').length).toBe(1)
  })
  it('the roll is keyed by the Week, not by when it is made: a reload lands on the same absences; the next Week rolls afresh', () => {
    const a = loadFixture(atBuy); performAdvance(a, 'test')
    const b = loadFixture(atBuy); performAdvance(b, 'test')
    expect(b.campaign.unavailable).toEqual(a.campaign.unavailable)
    const c = loadFixture((s) => { atBuy(s); s.week = s.week + 1 }); performAdvance(c, 'test')
    expect(c.campaign.unavailable).not.toEqual(a.campaign.unavailable)
  })
  it('the Week boundary clears the list', () => {
    const ctx = loadFixture(atBuy); performAdvance(ctx, 'test')
    expect(ctx.campaign.unavailable.length).toBeGreaterThan(0)
    tickWeek(ctx, 'test')
    expect(ctx.campaign.unavailable).toEqual([])
    expect(ctx.events.some((e) => e.type === 'absence.cleared')).toBe(true)
  })
  it('badge.responsible is never unavailable; a roster under six loses nobody', () => {
    const ctx = loadFixture((c) => { atBuy(c); for (const h of Object.values(c.roster)) h.badges = ['badge.responsible'] })
    performAdvance(ctx, 'test')
    expect(ctx.campaign.unavailable).toEqual([])
    const small = loadFixture((c) => { atBuy(c); for (const id of Object.keys(c.roster).sort().slice(5)) { delete c.roster[id]; delete c.assignments[id] } })
    expect(Object.keys(small.campaign.roster).length).toBe(5)
    performAdvance(small, 'test')
    expect(small.campaign.unavailable).toEqual([])
    expect(absencesFor(5)).toBe(0); expect(absencesFor(6)).toBe(1); expect(absencesFor(12)).toBe(3); expect(absencesFor(18)).toBe(5)
  })
})
