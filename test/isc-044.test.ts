// ISC-044 — one hero is drafted before battle 1, two more after it, one more
// after each battle until six drafted heroes, and no draft is offered after.
// GAME-ARCHITECTURE.md §2.5 · SKELETON-SETTLED.md:112
//
// Law 10 note, 2026-09-02: the pool holds FIVE heroes since the alpha four were
// removed (Andrew: "Let's just remove those four alpha heroes") and until the
// engine fields the Eve 24 (engine backlog content.field-eve-24). The cadence
// is unchanged; it stops where the pool does. The test asserts the cadence up
// to the pool and that nothing is offered past it — the rule, not the number six.
//
// Law 10 note, 2026-10-03 (kingdom.opening-draft-pool; engine DECISIONS.md 2026-10-03
// 'the opening draft pool is all 24 heroes, Rogues and Mages included'): the pool is
// the Eve 24, so the cadence runs its full length — six. `expect(cap)
// .toBeGreaterThanOrEqual(5)` is now `expect(cap).toBe(6)`: the number the cadence
// names, no longer clipped by a short pool.
import { describe, it, expect } from 'vitest'
import { makeNewCampaign, draftedCountOf } from '../src/core/opening.js'
import { HERO_POOL } from '../src/content/heroes.js'
import { groupOf } from '../src/content/classes.js'
import { DRAFT_CADENCE } from '../src/content/prologue.js'
import { makeCtx } from '../src/core/mutate.js'
import { playOpening, playWeeks } from '../src/sim/autoplay.js'

describe('ISC-044 — the draft cadence', () => {
  it('1 · +2 · +1 · +1 · +1 up to six or the pool, then the Beacon; the opening ends with the Kingdom Territory and the Ridge held at Week 1', () => {
    const pool = HERO_POOL.filter((h) => groupOf(h.classes) === 'hero').length
    const cap = Math.min(DRAFT_CADENCE.until, pool)
    expect(pool).toBe(24)
    expect(cap).toBe(6)
    const ctx = playOpening(makeCtx(makeNewCampaign(21)))
    const c = ctx.campaign
    const drafts = ctx.events.filter((e) => e.type === 'hero.drafted')
    const battles = ctx.events.filter((e) => e.type === 'engagement.resolved')
    expect(battles.length).toBe(5)
    // drafts between battles: before 1 → 1; after 1 → 2; after 2, 3, 4 → 1 each; after 5 → none (six reached)
    const seqOf = (e: { seq: number }) => e.seq
    const between = (a: number, b: number) => drafts.filter((d) => seqOf(d) > a && seqOf(d) < b).length
    const bs = battles.map(seqOf)
    // the cadence's running total, clipped at the cap: 1, 3, 4, 5, 6 → the drafts between battles are the differences
    const totals = [1, 3, 4, 5, 6].map((t) => Math.min(t, cap))
    expect(between(-1, bs[0]!)).toBe(totals[0])
    expect(between(bs[0]!, bs[1]!)).toBe(totals[1]! - totals[0]!)
    expect(between(bs[1]!, bs[2]!)).toBe(totals[2]! - totals[1]!)
    expect(between(bs[2]!, bs[3]!)).toBe(totals[3]! - totals[2]!)
    expect(between(bs[3]!, bs[4]!)).toBe(totals[4]! - totals[3]!)
    expect(drafts.length).toBe(cap)
    expect(draftedCountOf(c)).toBe(cap)
    expect(c.cursor.prologue).toBeNull()
    expect(c.week).toBe(1)
    expect(c.territories['territory.ruined-kingdom.sanctuary']!.owned).toBe(true)
    expect(c.territories['territory.ruined-kingdom.ridge']!.owned).toBe(true)
    // no draft is ever offered again
    playWeeks(ctx, 3)
    expect(ctx.events.filter((e) => e.type === 'draft.offered').length).toBe(cap)
  })
})
