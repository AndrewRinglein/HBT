// kingdom.opening-draft-pool — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the opening draft pool is all 24 heroes,
// Rogues and Mages included'): asked "Should the draft pool get Rogues and Mages now, so every draft offers three and the
// party ends as one of each class?" — "1. Yes"; "If yes, should all 24 heroes be draftable, or a set you name?" — "2. Yes".
// With the standing rule (2026-09-28 'the draft never repeats a class until all six are drafted': "Until you've drafted all
// six of the starting classes, you never get a draft of the same class again") every draft offers three and the party ends
// as six heroes, one of each class. The cadence (to six) and the deploy limit of 4 are unchanged by this item; the cadence
// itself was ruled again the same day — one draft after every battle (kingdom.opening-draft-cadence).
// Expect: "every draft of a new run offers three heroes of classes not yet drafted, Rogues and Mages among them, and after
// the last draft the party is six heroes, one of each class; four deploy; … any base hero without a kit is listed by name."
//
// The page half is tools/opening-run-six.verify.mjs (test/opening-run-six.test.ts), on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { makeNewCampaign, draftedCountOf, draftPoolOf, listDraftOffers, performAdvanceOpening, performDraft, performFieldOpeningBattle } from '../src/core/opening.js'
import { makeCtx } from '../src/core/mutate.js'
import { performAdvance } from '../src/core/week.js'
import { performAdvancePrep, performDeploy, listDeployable, deployLimitOf, canDeploy } from '../src/core/prep.js'
import { playOpening } from '../src/sim/autoplay.js'
import { CLASSES, groupOf } from '../src/content/classes.js'
import { HERO_POOL, KIT_GAPS, UNKITTED_HEROES, heroPoolOf, heroRowOf, assertKitted } from '../src/content/heroes.js'
import { SANDBOX_HEROES } from '../src/content/sandbox.js'
import { HERO_ITEM_SLOTS } from '../src/content/generated/kits.js'
import { DRAFT_CADENCE, DRAFT_OFFER } from '../src/content/prologue.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { draftScreen } from '../src/ui/draft.js'
import { UNITS, encounterDef } from '../src/engine.js'

const SIX = ['class.mage', 'class.paladin', 'class.priest', 'class.ranger', 'class.rogue', 'class.warrior']
const classOf = (id: string) => heroRowOf(id).classes.find((c) => SIX.includes(c))!

describe('kingdom.opening-draft-pool — the opening draft pool is all 24 base heroes', () => {
  it('the pool is the engine pack\'s 24 hero.base rows — four of each of Warrior, Ranger, Rogue, Mage, Priest, Paladin — each wearing its kit', () => {
    expect(CLASSES.filter((r) => r.group === 'hero').map((r) => r.id).sort()).toEqual(SIX)
    const base = Object.keys(UNITS).filter((id) => id.startsWith('hero.base.')).sort()
    expect(base).toHaveLength(24)
    expect(HERO_POOL.map((h) => h.id)).toEqual(base)
    for (const cls of SIX) expect(HERO_POOL.filter((h) => h.classes.includes(cls)).length, cls).toBe(4)
    for (const h of HERO_POOL) {
      expect(groupOf(h.classes)).toBe('hero')
      expect(h.equipped, h.id).toEqual(UNITS[h.id]!.defaultItems)
      expect(h.equipped.length, h.id).toBeGreaterThan(0)
      expect(() => assertKitted(h.id)).not.toThrow()
      // one hero, one way: the row the standalone sandbox fields
      expect(h).toEqual(SANDBOX_HEROES.find((s) => s.id === h.id))
    }
    // nobody is left out today
    expect(UNKITTED_HEROES).toEqual([])
    expect(KIT_GAPS).toEqual([])
  })

  it('every draft of a run offers three, none of a class already drafted, Rogues and Mages among them; the party ends six, one of each class', () => {
    for (const seed of [1, 2, 3, 5, 11, 15, 21, 42]) for (const take of [0, 1, 2]) {
      const ctx = playOpening(makeCtx(makeNewCampaign(seed)), { draft: (_c, offers) => offers[take % offers.length]! })
      const label = `seed ${seed}, taking offer ${take + 1}`
      const drafted: string[] = [], offered = new Set<string>()
      let offers = 0
      for (const e of ctx.events) {
        if (e.type === 'draft.offered') {
          const offer = e['offer'] as string[]
          offers++
          expect(offer.length, `${label}: draft ${offers} offers three`).toBe(DRAFT_OFFER)
          expect(new Set(offer).size, `${label}: draft ${offers} offers three different heroes`).toBe(3)
          for (const id of offer) {
            expect(drafted.map(classOf), `${label}: draft ${offers} offers ${id}, of a class not yet drafted`).not.toContain(classOf(id))
            expect(drafted, `${label}: ${id} is not on the roster already`).not.toContain(id)
            offered.add(classOf(id))
          }
        }
        if (e.type === 'hero.drafted') drafted.push(e['heroId'] as string)
      }
      expect(offers, `${label}: six drafts`).toBe(DRAFT_CADENCE.until)
      expect(drafted.length, `${label}: six drafted`).toBe(6)
      expect(drafted.map(classOf).sort(), `${label}: one of each class`).toEqual(SIX)
      expect(offered.has('class.rogue') && offered.has('class.mage'), `${label}: Rogues and Mages are offered`).toBe(true)
      expect(draftedCountOf(ctx.campaign)).toBe(6)
      // with all six drafted the class rule lifts: every row not on the roster is back
      expect(draftPoolOf(ctx.campaign).map((h) => h.id)).toEqual(HERO_POOL.filter((h) => !ctx.campaign.roster[h.id]).map((h) => h.id))
      expect(draftPoolOf(ctx.campaign)).toHaveLength(18)
    }
  }, 120000)

  it('the last draft still offers three: with five classes drafted, three of the last class\'s four', () => {
    for (const lastClass of SIX) {
      const ctx = makeCtx(makeNewCampaign(7))
      performAdvance(ctx, 'test')
      // five drafted, one of each class but the last, through the draft itself is not needed here: the pool is read
      for (const cls of SIX.filter((c) => c !== lastClass)) ctx.campaign.roster[HERO_POOL.find((h) => h.classes.includes(cls))!.id] = structuredClone(HERO_POOL.find((h) => h.classes.includes(cls))!)
      const pool = draftPoolOf(ctx.campaign)
      expect(pool.map((h) => h.id)).toEqual(HERO_POOL.filter((h) => h.classes.includes(lastClass)).map((h) => h.id))
      expect(pool).toHaveLength(4)
    }
  })

  // Law 10, 2026-10-04 (kingdom.opening-draft-cadence; engine DECISIONS.md 2026-10-03 'one draft after every battle; …': "We're only supposed to have one draft between battles 1 and 2. I was getting two drafts." · "One, yes."): this test was titled
  //   'the cadence and the deploy limit are unchanged: 1 · +2 · +1 a battle to six, and four of the six deploy'
  // and read
  //   expect(DRAFT_CADENCE).toEqual({ first: 1, afterFirst: 2, afterEach: 1, until: 6 })
  //   ctx.campaign.cursor.prologue = 5   // the whole party on the roster, as after the last draft (before battle 5)
  //   const id = ABBOTOWN_MAP.sections[4]!.encounterId
  // — the 2026-08-23 cadence the ruling replaces. The row is now one before battle 1 and one after each battle, to six;
  // the sixth hero is drafted before battle 6 (the Cathedral), where the whole party stands. What the pool's item held is
  // held: the cadence still ends at six, three are offered at every draft, and four of the six deploy.
  it('the cadence runs to six — one draft before every battle — and the deploy limit is unchanged: four of the six deploy', () => {
    expect(DRAFT_CADENCE).toEqual({ first: 1, afterEach: 1, until: 6 })
    expect(DRAFT_OFFER).toBe(3)
    const ctx = makeCtx(makeNewCampaign(15))
    // the whole party on the roster, as after the last draft (before battle 6)
    ctx.campaign.cursor.prologue = 6
    const step = (): string => ctx.campaign.cursor.step
    performAdvanceOpening(ctx, 'test')
    for (let guard = 0; step() === 'draft' && guard < 8; guard++) {
      expect(listDraftOffers(ctx.campaign)).toHaveLength(3)
      performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test')
      if (draftedCountOf(ctx.campaign) < 6) performAdvanceOpening(ctx, 'test')
    }
    expect(draftedCountOf(ctx.campaign)).toBe(6)
    expect(Object.values(ctx.campaign.roster).map((h) => classOf(h.id)).sort()).toEqual(SIX)
    const id = ABBOTOWN_MAP.sections[5]!.encounterId
    performFieldOpeningBattle(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
    while (ctx.campaign.cursor.prepStep !== 'deploy') performAdvancePrep(ctx, 'test')
    expect(deployLimitOf(ctx.campaign)).toBe(4)
    expect(listDeployable(ctx.campaign)).toHaveLength(6)
    for (const h of listDeployable(ctx.campaign).slice(0, 4)) performDeploy(ctx, h, 'test')
    expect(ctx.campaign.cursor.engagement!.deployed).toHaveLength(4)
    for (const h of listDeployable(ctx.campaign)) expect(canDeploy(ctx.campaign, h), `${h}: a fifth is refused`).toBe(false)
  })

  it('a base hero whose row has no kit is not in the pool and is listed by name — never fielded bare', () => {
    const bare = 'hero.base.rogue-rose', units = { ...UNITS, [bare]: { ...UNITS[bare]!, defaultItems: [] } }
    const { pool, unkitted } = heroPoolOf(units, HERO_ITEM_SLOTS)
    expect(pool).toHaveLength(23)
    expect(pool.some((h) => h.id === bare)).toBe(false)
    expect(unkitted).toEqual([{ id: bare, name: UNITS[bare]!.name }])
    // a row with no kit at all, the same
    const { defaultItems: _kit, ...kitless } = UNITS[bare]!
    expect(heroPoolOf({ ...UNITS, [bare]: kitless }, HERO_ITEM_SLOTS).unkitted).toEqual([{ id: bare, name: UNITS[bare]!.name }])
    // the real content leaves nobody out
    expect(heroPoolOf(UNITS, HERO_ITEM_SLOTS).unkitted).toEqual([])
    // the draft refuses one by name
    expect(() => assertKitted('hero.shadows.oathblade.v1')).toThrow(/hero\.shadows\.oathblade\.v1.*no kit/)
    // and the draft screen says who was left out, by name — and says nothing when nobody is
    const ctx = makeCtx(makeNewCampaign(3))
    performAdvance(ctx, 'test')
    expect(draftScreen(ctx.campaign)).not.toContain('data-unkitted')
    const said = draftScreen(ctx.campaign, unkitted)
    expect(said).toContain(`data-unkitted="${bare}"`)
    expect(said).toContain(UNITS[bare]!.name!)
    expect(said).toMatch(/no kit in the content/)
  })

  it('the draft screen says what it shows: three come to the fire, hero N of six', () => {
    const ctx = makeCtx(makeNewCampaign(3))
    performAdvance(ctx, 'test')
    expect((draftScreen(ctx.campaign).match(/data-act="draft"/g) ?? []).length).toBe(3)
    expect(draftScreen(ctx.campaign)).toContain('Three come to the fire')
    performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test')
    ctx.campaign.cursor.prologue = 2
    performAdvanceOpening(ctx, 'test')
    expect(draftScreen(ctx.campaign)).toContain('hero 2 of six')
    expect((draftScreen(ctx.campaign).match(/data-act="draft"/g) ?? []).length).toBe(3)
  })
})
