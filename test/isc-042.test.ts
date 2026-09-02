// ISC-042 — makeCampaign from a seed offers three hero rows showing name,
// class, personality and prose and no numbers; performDraft puts one on the
// roster and the cursor at the first prologue battle's prep.
// GAME-ARCHITECTURE.md §2.5 · SKELETON-SETTLED.md:93,124
import { describe, it, expect } from 'vitest'
import { makeNewCampaign, listDraftOffers, canDraft, performDraft, performAdvanceOpening, draftsOwedOf } from '../src/core/opening.js'
import { makeCtx } from '../src/core/mutate.js'
import { campaignOf, saveOf } from '../src/core/campaign.js'
import { performAdvance } from '../src/core/week.js'
import { groupOf } from '../src/content/classes.js'
import { HERO_POOL } from '../src/content/heroes.js'

describe('ISC-042 — a new Campaign begins with one stat-less draft of three', () => {
  it('Week 0, nothing held, nobody on the roster, one draft owed; three offered, hero classes only, no numbers shown; one taken → prep', () => {
    const ctx = makeCtx(makeNewCampaign(11))
    const c = ctx.campaign
    expect(c.week).toBe(0)
    expect(Object.keys(c.roster)).toEqual([])
    expect(Object.values(c.territories).every((t) => !t.owned)).toBe(true)
    expect(c.cursor.prologue).toBe(1)
    expect(draftsOwedOf(c)).toBe(1)
    performAdvance(ctx, 'test')                                   // the opening's first act
    expect(c.cursor.step).toBe('draft')
    const offers = listDraftOffers(c)
    expect(offers.length).toBe(3)
    expect(new Set(offers.map((o) => o.id)).size).toBe(3)
    for (const o of offers) {
      expect(groupOf(o.classes)).toBe('hero')                     // "I AM ONLY DRAFTING HERO CLASSES"
      expect(HERO_POOL.some((h) => h.id === o.id)).toBe(true)
      expect(typeof o.name).toBe('string'); expect(o.classes.length).toBeGreaterThan(0)
    }
    // the same seed offers the same three, and a reload keeps them
    expect(listDraftOffers(makeCtx(campaignOf(saveOf(c))).campaign)).toEqual(offers)
    const other = makeCtx(makeNewCampaign(11)); performAdvance(other, 'test')
    expect(listDraftOffers(other.campaign)).toEqual(offers)
    const notOffered = HERO_POOL.find((h) => !offers.some((o) => o.id === h.id))!
    expect(canDraft(c, notOffered.id)).toBe(false)
    expect(() => performDraft(ctx, notOffered.id, 'test')).toThrow(/not on offer/)
    performDraft(ctx, offers[1]!.id, 'test')
    expect(Object.keys(c.roster)).toEqual([offers[1]!.id])
    expect(c.cursor.draftOffer).toBeNull()
    expect(draftsOwedOf(c)).toBe(0)
    performAdvanceOpening(ctx, 'test')                            // → battle 1's prep
    expect(c.cursor.step).toBe('prep')
    expect(c.cursor.engagement?.prologue).toBe(1)
    expect(ctx.events.filter((e) => e.type === 'draft.offered').length).toBe(1)
    expect(ctx.events.filter((e) => e.type === 'hero.drafted').map((e) => e['heroId'])).toEqual([offers[1]!.id])
  })
})
