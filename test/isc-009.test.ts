// ISC-009 — a hero on a quest holds both slots and appears in no listAvailable
// for any Stage.
// Law 17 amended · SKELETON-SETTLED.md:102
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { performCommit, commitmentOf, listAvailable, canCommit, tickAssignments } from '../src/core/assignments.js'
import { STAGES } from '../src/content/stages.js'

const H = 'hero.base.ranger-aggressive'

describe('ISC-009 — a quest takes both slots', () => {
  it('on a quest: both slots answer onQuest, no Stage lists the hero, nothing else may be committed, and the quest ends when its Weeks do', () => {
    const ctx = loadFixture()
    performCommit(ctx, H, { kind: 'quest', target: 'quest.escort', weeks: 2 }, 'test')
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('onQuest')
    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('onQuest')
    for (const s of STAGES) expect(listAvailable(ctx.campaign, s.id), s.id).not.toContain(H)
    expect(STAGES.some((s) => listAvailable(ctx.campaign, s.id).length > 0)).toBe(true)     // others are listed
    expect(canCommit(ctx.campaign, H, { kind: 'engagement', target: 'x', weeks: 1 })).toBe(false)
    expect(canCommit(ctx.campaign, H, { kind: 'labour', target: 'farm', weeks: 1 })).toBe(false)
    tickAssignments(ctx, 'test')
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('onQuest')
    tickAssignments(ctx, 'test')
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('free')
    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('free')
  })
})
