// kingdom.opening-draft-cadence — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'one draft after every battle; the yellow
// focus border goes; …'): "We're only supposed to have one draft between battles 1 and 2. I was getting two drafts." ·
// asked "Should the cadence change to one draft after every battle (party of 1, 2, 3, 4, 5, 6), replacing the 2026-08-23
// ruling of two drafts after battle 1?" — "One, yes."
//
// Expect: "At http://127.0.0.1:4230/play a new run drafts one hero before the Orphanage and exactly one after each battle:
// two heroes at the Lumberjack House, three at the Bridge, four at the Cavern Trail, five at the Gates, six at the
// Cathedral; the draft screen's 'hero N of six' counts them; the page test asserts one draft between each pair of battles
// and the party's size at every battle."
//
// The cadence is a content row (content/prologue.ts DRAFT_CADENCE: one first, one after each battle, until six); the
// mechanism (core/opening.ts draftsOwedOf) reads it and names no number of its own. The page half is
// tools/opening-run-six.verify.mjs and tools/opening-loop-three.verify.mjs, on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, performResolvePrologue, listDraftOffers, draftsOwedOf, draftedCountOf } from '../src/core/opening.js'
import { makeCtx, setCursor, type Ctx } from '../src/core/mutate.js'
import { DRAFT_CADENCE } from '../src/content/prologue.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { draftScreen } from '../src/ui/draft.js'
import { encounterDef } from '../src/engine.js'

const SECTIONS = ABBOTOWN_MAP.sections.map((s) => s.encounterId)
const battleOf = (id: string) => ({ id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind })

/** Every draft owed before the battle on the cursor, taken (the first offer each time); the draft screen's heading at each. */
function draftsBefore(ctx: Ctx): string[] {
  const headings: string[] = []
  for (let guard = 0; draftsOwedOf(ctx.campaign) > 0 && guard < 8; guard++) {
    performAdvanceOpening(ctx, 'test')
    expect(ctx.campaign.cursor.step).toBe('draft')
    headings.push(draftScreen(ctx.campaign).match(/<h2>([^<]*)<\/h2>/)![1]!)
    performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test')
  }
  return headings
}

describe('kingdom.opening-draft-cadence — one draft after every battle', () => {
  it('the cadence is a content row: one before battle 1, one after each battle, until six — and core names no number of its own', () => {
    expect(DRAFT_CADENCE).toEqual({ first: 1, afterEach: 1, until: 6 })
    const core = readFileSync('src/core/opening.ts', 'utf8')
    const body = core.slice(core.indexOf('export function draftsOwedOf'), core.indexOf('export function openingBattlesWonOf'))
    expect(body).toContain('DRAFT_CADENCE.first')
    expect(body).toContain('DRAFT_CADENCE.afterEach')
    expect(body).toContain('DRAFT_CADENCE.until')
    expect(core, 'the two drafts after battle 1 are gone from the mechanism').not.toContain('afterFirst')
  })

  it('a new run drafts one hero before the Orphanage and exactly one after each battle: a party of 1, 2, 3, 4, 5, 6 at battles 1 to 6', () => {
    for (const seed of [5, 11, 21]) {
      const ctx = makeCtx(makeNewCampaign(seed))
      const sizes: number[] = [], drafts: number[] = [], headings: string[] = []
      for (let n = 1; n <= SECTIONS.length; n++) {
        expect(ctx.campaign.cursor.prologue).toBe(n)
        expect(draftsOwedOf(ctx.campaign), `seed ${seed}: one draft is owed before battle ${n}`).toBe(1)
        // the battle is refused while its one draft is owed
        expect(() => performFieldOpeningBattle(ctx, battleOf(SECTIONS[n - 1]!), 'test')).toThrow(new RegExp(`refused: 1 to draft before battle ${n}`))
        const got = draftsBefore(ctx)
        drafts.push(got.length); headings.push(...got); sizes.push(draftedCountOf(ctx.campaign))
        expect(draftsOwedOf(ctx.campaign)).toBe(0)
        // … and fielded once it is taken; then won: the cursor moves on (performResolvePrologue, the writer's call)
        const e = performFieldOpeningBattle(ctx, battleOf(SECTIONS[n - 1]!), 'test')
        expect(e.prologue).toBe(n)
        setCursor(ctx, { step: 'open', engagement: null }, 'test')
        performResolvePrologue(ctx, true, 'test', true)
      }
      expect(drafts, `seed ${seed}: one draft before each battle`).toEqual([1, 1, 1, 1, 1, 1])
      expect(sizes, `seed ${seed}: the party at battles 1 to 6`).toEqual([1, 2, 3, 4, 5, 6])
      // the draft screen counts them: the first hero, then hero 2 of six … hero 6 of six
      expect(headings).toEqual(['The draft — your first hero', ...[2, 3, 4, 5, 6].map((k) => `The draft — hero ${k} of six`)])
      // six drafted before the Cathedral: nothing is owed after it
      expect(ctx.campaign.cursor.prologue).toBe(7)
      expect(draftsOwedOf(ctx.campaign), 'six are drafted: the tutorial draft retires').toBe(0)
    }
  })

  it('a lost battle, replayed, owes no draft: the cadence counts battles won', () => {
    const ctx = makeCtx(makeNewCampaign(11))
    draftsBefore(ctx)
    performFieldOpeningBattle(ctx, battleOf(SECTIONS[0]!), 'test')
    setCursor(ctx, { step: 'open', engagement: null }, 'test')
    performResolvePrologue(ctx, false, 'test', true)
    expect(ctx.campaign.cursor.prologue).toBe(1)
    expect(draftsOwedOf(ctx.campaign)).toBe(0)
    expect(draftedCountOf(ctx.campaign)).toBe(1)
  })

  it('the draft screen never says two are owed: one draft stands between two battles', () => {
    const ctx = makeCtx(makeNewCampaign(11))
    draftsBefore(ctx)
    setCursor(ctx, { prologue: 2 }, 'test')
    performAdvanceOpening(ctx, 'test')
    expect(draftScreen(ctx.campaign)).not.toMatch(/to draft before the next battle/)
  })

  it('the pages: the six-battle run and the three-battle sitting each take one draft between each pair of battles, and say the party\'s size at every battle', () => {
    const six = execFileSync(process.execPath, ['tools/opening-run-six.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(six).toMatch(/one draft before every battle \(1, 1, 1, 1, 1, 1\): a party of 1, 2, 3, 4, 5, 6 at battles 1 to 6/)
    const three = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(three).toMatch(/draft \(one before every battle: a party of 1, 2, 3; no class twice\)/)
  }, 1800000)
})
