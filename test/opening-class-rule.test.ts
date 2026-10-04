// fix.opening-draft (engine, 2026-09-29) — the kingdom's half. Ruled 2026-09-28 (Andrew,
// engine/DECISIONS.md 'the draft never repeats a class until all six are drafted'): "Until you've
// drafted all six of the starting classes, you never get a draft of the same class again. So if your
// first hero is a warrior, on your next draft pool you will not see a warrior."
import { describe, it, expect } from 'vitest'
import { makeNewCampaign, listDraftOffers, performDraft, draftPoolOf } from '../src/core/opening.js'
import { performAdvance } from '../src/core/week.js'
import { makeCtx, applyDraft } from '../src/core/mutate.js'
import { CLASSES, groupOf } from '../src/content/classes.js'
import { HERO_POOL, heroRowOf } from '../src/content/heroes.js'

// the hero classes the pool can offer (SWITCHES.md openingKingdomClasses)
// Law 10, 2026-10-03 (kingdom.opening-draft-pool; engine DECISIONS.md 2026-10-03 'the opening draft pool is all 24 heroes,
// Rogues and Mages included'): the comment here said "the pool is short of two today" — it offers all six now, and that is
// asserted below, so "all six" in this file's title is six.
const HERO_CLASSES = CLASSES.filter((r) => r.group === 'hero' && HERO_POOL.some((h) => h.classes.includes(r.id))).map((r) => r.id)
const classOf = (classes: readonly string[]) => classes.find((c) => HERO_CLASSES.includes(c))

describe('the opening draft never offers a class already drafted until all six are', () => {
  it('the pool offers all six hero classes', () => {
    expect(HERO_CLASSES).toHaveLength(6)
    expect(HERO_CLASSES).toEqual(CLASSES.filter((r) => r.group === 'hero').map((r) => r.id))
  })

  it('after the first draft, no offer and no pool row is of the drafted class', () => {
    for (const seed of [1, 2, 3, 11, 42]) {
      const ctx = makeCtx(makeNewCampaign(seed))
      performAdvance(ctx, 'test')   // the opening's first act: the first draft is offered
      const first = listDraftOffers(ctx.campaign)[0]!
      performDraft(ctx, first.id, 'test')
      const pool = draftPoolOf(ctx.campaign)
      expect(pool.length).toBeGreaterThan(0)
      for (const h of pool) expect(classOf(h.classes), `seed ${seed}: ${h.id}`).not.toBe(classOf(first.classes))
    }
  })

  it('with every class but one drafted only the last is offered; with all drafted every undrafted row is back', () => {
    const ctx = makeCtx(makeNewCampaign(5))
    const one = (cls: string) => HERO_POOL.find((h) => groupOf(h.classes) === 'hero' && classOf(h.classes) === cls)!
    const last = HERO_CLASSES.length - 1
    for (const cls of HERO_CLASSES.slice(0, last)) applyDraft(ctx, heroRowOf(one(cls).id), 'test')
    expect([...new Set(draftPoolOf(ctx.campaign).map((h) => classOf(h.classes)))]).toEqual([HERO_CLASSES[last]])
    applyDraft(ctx, heroRowOf(one(HERO_CLASSES[last]!).id), 'test')
    expect(draftPoolOf(ctx.campaign).map((h) => h.id)).toEqual(HERO_POOL.filter((h) => !ctx.campaign.roster[h.id]).map((h) => h.id))
  })
})
