// ISC-006 — every Stage emits stage.begun and stage.ended even when it resolves
// to nothing — no threat this Week, nothing affordable to build.
// GAME-ARCHITECTURE.md §2.1
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { playWeeks } from '../src/sim/autoplay.js'
import { setCursor } from '../src/core/mutate.js'
import { beginWeek } from '../src/core/week.js'
import { STAGES } from '../src/content/stages.js'

describe('ISC-006 — a Stage that resolves to nothing still begins and ends', () => {
  it('an empty Week — no conquest chosen, nothing bought — pairs begun and ended for every Stage', () => {
    const ctx = loadFixture()
    setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
    beginWeek(ctx, 'test')
    const week = ctx.campaign.week
    playWeeks(ctx, 1, { target: () => null })
    const inWeek = ctx.events.filter((e) => e['week'] === week)
    const begun = inWeek.filter((e) => e.type === 'stage.begun').map((e) => e['stageId'])
    const ended = inWeek.filter((e) => e.type === 'stage.ended').map((e) => e['stageId'])
    expect(begun).toEqual(STAGES.map((s) => s.id))
    expect(ended).toEqual(STAGES.map((s) => s.id))
    expect(STAGES.length).toBe(6)
    // and nothing else happened — no engagement, no writer
    expect(inWeek.some((e) => e.type === 'engagement.offered' || e.type === 'engagement.resolved')).toBe(false)
    expect(ctx.events.filter((e) => e.type === 'week.ended').map((e) => e['week'])).toEqual([week])
  })
})
