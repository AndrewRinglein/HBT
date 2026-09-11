// V2 supersedes the old dual-slot truth; release and multiweek countdown checks retained.
// ISC-008 — a hero holds at most one field Assignment and one city Assignment
// in a Week; a second in either slot is refused by canCommit.
// Law 17 amended · SKELETON-SETTLED.md:102
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { canCommit, performCommit, performRelease, commitmentOf, tickAssignments } from '../src/core/assignments.js'
import { setCursor } from '../src/core/mutate.js'

const H = 'hero.base.paladin-shiney'

describe('ISC-008 — one Assignment across both halves', () => {
  it('Field and City compete for one commitment; releasing an unperformed reservation reopens it', () => {
    const ctx = loadFixture()
    setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
    const field = { kind: 'engagement' as const, target: 'engagement.conquer.ridge.week-3', weeks: 1 }
    const city = { kind: 'labour' as const, target: 'pray', weeks: 1 }
    expect(canCommit(ctx.campaign, H, field)).toBe(true)
    performCommit(ctx, H, field, 'test')
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('committed')
    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('committed')             // V2: one weekly commitment
    expect(canCommit(ctx.campaign, H, { ...field, target: 'engagement.conquer.thicket.week-3' })).toBe(false)
    expect(() => performCommit(ctx, H, field, 'test')).toThrow(/refused/)
    expect(canCommit(ctx.campaign, H, city)).toBe(false)
    expect(() => performCommit(ctx, H, city, 'test')).toThrow(/refused/)
    performRelease(ctx, H, 'field', 'test')
    performCommit(ctx, H, city, 'test')
    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('committed')
    expect(canCommit(ctx.campaign, H, { ...city, target: 'pray' })).toBe(false)
    expect(ctx.campaign.assignments[H]).toEqual(city)
    performRelease(ctx, H, 'city', 'test')
    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('free')
    expect(ctx.events.filter((e) => e.type === 'hero.committed').length).toBe(2)
    expect(ctx.events.filter((e) => e.type === 'hero.released').length).toBe(2)
  })
  it('the Week boundary releases what has run out and counts down what has not', () => {
    const ctx = loadFixture()
    const other = 'hero.base.warrior-iron'
    performCommit(ctx, other, { kind: 'engagement', target: 'x', weeks: 1 }, 'test')
    performCommit(ctx, H, { kind: 'labour', target: 'pray', weeks: 3 }, 'test')
    tickAssignments(ctx, 'test')
    expect(ctx.campaign.assignments[H]).toEqual({ kind: 'labour', target: 'pray', weeks: 2 })
    expect(ctx.campaign.assignments[other]).toBeUndefined()
    tickAssignments(ctx, 'test'); tickAssignments(ctx, 'test')
    expect(ctx.campaign.assignments[H]).toBeUndefined()
  })
})
