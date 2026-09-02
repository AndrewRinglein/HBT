// ISC-044 — one hero is drafted before battle 1, two more after it, one more
// after each battle until six drafted heroes, and no draft is offered after.
// GAME-ARCHITECTURE.md §2.5 · SKELETON-SETTLED.md:112
import { describe, it, expect } from 'vitest'
import { makeNewCampaign, draftedCountOf } from '../src/core/opening.js'
import { makeCtx } from '../src/core/mutate.js'
import { playOpening, playWeeks } from '../src/sim/autoplay.js'

describe('ISC-044 — the draft cadence', () => {
  it('1 · +2 · +1 · +1 · +1 = six, then the Beacon; the opening ends with the Kingdom Territory and the Ridge held at Week 1', () => {
    const ctx = playOpening(makeCtx(makeNewCampaign(21)))
    const c = ctx.campaign
    const drafts = ctx.events.filter((e) => e.type === 'hero.drafted')
    const battles = ctx.events.filter((e) => e.type === 'engagement.resolved')
    expect(battles.length).toBe(5)
    // drafts between battles: before 1 → 1; after 1 → 2; after 2, 3, 4 → 1 each; after 5 → none (six reached)
    const seqOf = (e: { seq: number }) => e.seq
    const between = (a: number, b: number) => drafts.filter((d) => seqOf(d) > a && seqOf(d) < b).length
    const bs = battles.map(seqOf)
    expect(between(-1, bs[0]!)).toBe(1)
    expect(between(bs[0]!, bs[1]!)).toBe(2)
    expect(between(bs[1]!, bs[2]!)).toBe(1)
    expect(between(bs[2]!, bs[3]!)).toBe(1)
    expect(between(bs[3]!, bs[4]!)).toBe(1)
    expect(drafts.length).toBe(6)
    expect(draftedCountOf(c)).toBe(6)
    expect(c.cursor.prologue).toBeNull()
    expect(c.week).toBe(1)
    expect(c.territories['territory.ruined-kingdom.sanctuary']!.owned).toBe(true)
    expect(c.territories['territory.ruined-kingdom.ridge']!.owned).toBe(true)
    // no draft is ever offered again
    playWeeks(ctx, 3)
    expect(ctx.events.filter((e) => e.type === 'draft.offered').length).toBe(6)
  })
})
