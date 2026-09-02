// ISC-008 — a hero holds at most one field Assignment and one city Assignment
// in a Week; a second in either slot is refused by canCommit.
// Law 17 amended · SKELETON-SETTLED.md:102
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { canCommit, performCommit, performRelease, commitmentOf, tickAssignments } from '../src/core/assignments.js'
import { setCursor } from '../src/core/mutate.js'

const H = 'hero.base.paladin-shiney'

describe('ISC-008 — two slots, one Assignment each', () => {
  it('field and city each take one; a second in the same slot is refused; releasing reopens it', () => {
    const ctx = loadFixture()
    setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
    const field = { kind: 'engagement' as const, target: 'engagement.conquer.ridge.week-3', weeks: 1 }
    const city = { kind: 'labour' as const, target: 'farm', weeks: 1 }
    expect(canCommit(ctx.campaign, H, field)).toBe(true)
    performCommit(ctx, H, field, 'test')
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('committed')
    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('free')                  // fight AND one city action
    expect(canCommit(ctx.campaign, H, { ...field, target: 'engagement.conquer.thicket.week-3' })).toBe(false)
    expect(() => performCommit(ctx, H, field, 'test')).toThrow(/refused/)
    performCommit(ctx, H, city, 'test')
    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('committed')
    expect(canCommit(ctx.campaign, H, { ...city, target: 'pray' })).toBe(false)
    expect(ctx.campaign.assignments[H]).toEqual({ field, city })
    performRelease(ctx, H, 'city', 'test')
    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('free')
    expect(ctx.events.filter((e) => e.type === 'hero.committed').length).toBe(2)
    expect(ctx.events.filter((e) => e.type === 'hero.released').length).toBe(1)
  })
  it('the Week boundary releases what has run out and counts down what has not', () => {
    const ctx = loadFixture()
    performCommit(ctx, H, { kind: 'engagement', target: 'x', weeks: 1 }, 'test')
    performCommit(ctx, H, { kind: 'labour', target: 'farm', weeks: 3 }, 'test')
    tickAssignments(ctx, 'test')
    expect(ctx.campaign.assignments[H]).toEqual({ city: { kind: 'labour', target: 'farm', weeks: 2 } })
    tickAssignments(ctx, 'test'); tickAssignments(ctx, 'test')
    expect(ctx.campaign.assignments[H]).toBeUndefined()
  })
})
