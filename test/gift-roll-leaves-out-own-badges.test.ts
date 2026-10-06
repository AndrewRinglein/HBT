// kingdom.gift-roll-leaves-out-own-badges — ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'a prone unit only stands; Stand Up is
// its one move; a set counts everything carried; Dwarf, Elf and Fey act; no gift doubles a hero's own badge; …'): told that the
// draft can roll a hero a gift badge its row already has (the Berserker rolled Huge, the Fey rolled Frail), which then adds
// nothing, and asked whether a hero's own badges should be left out of its gift roll — "7, yes."
//
// Expect: "Across replicates 0-199 no hero is ever rolled a gift badge its own row already carries (a test walks them); a hero
// with no badge of its own rolls from the same badges as before; the Berserker never rolls Huge and the Forest Fey never rolls
// Frail; the report says how many drafts changed and which recordings moved."
//
// ONE RULE, ONE HOME: the rule is the engine's (engine/src/content/opening-party.ts pickBadge — its own test walks its own
// draft, engine/test/gift-roll-leaves-out-own-badges.test.ts). The played run's draft only tells the engine which badges are
// the hero's own, on the base it already hands in (src/core/opening.ts draftBaseOf: the engine row's badges — its origin
// badges among them — and any other on the hero's row). Held here: the run's base says them; a run's offers — the three first
// heroes, and the next draft's three — never hold a doubled badge, seeds 0 to 199; the roll is keyed as it was, so an offer
// that held none is the offer it was; and how many of those offers changed.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { makeNewCampaign, performAdvanceOpening, performDraft, performOpeningStraightIn, performResolvePrologue, listDraftOffers, draftedHeroOf, draftBaseOf, firstHeroDraftedOf, handDraftedOf, type BaseOf } from '../src/core/opening.js'
import { makeCtx, setCursor, type Ctx } from '../src/core/mutate.js'
import { campaignOf, saveOf } from '../src/core/campaign.js'
import { heroRowOf, HERO_POOL } from '../src/content/heroes.js'
import { CRUCIBLE, FIRST_HERO } from '../src/content/crucible.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { UNITS, encounterDef } from '../src/engine.js'
import { makeRng, rootSeedOf, rollBelow, roll100 } from '../../engine/src/core/rng.js'

const BERSERKER = 'hero.base.warrior-barbarian', FEY = 'hero.base.ranger-nature', SORCERESS = 'hero.base.mage-sexy', ELF = 'hero.base.ranger-ranger'
const ownOf = (id: string): string[] => [...((UNITS[heroRowOf(id).unitType] as { badges?: readonly string[] }).badges ?? []), ...heroRowOf(id).badges]
const GIFTS = [...CRUCIBLE.favourable, ...CRUCIBLE.flawed].map((b) => b.id)
function atFirstDraft(seed: number): Ctx { const ctx = makeCtx(makeNewCampaign(seed)); performAdvanceOpening(ctx, 'test'); return ctx }
/** the run at its second draft, the first hero taken being the offer's `take`-th */
function atSecondDraft(seed: number, take = 0): Ctx {
  const ctx = atFirstDraft(seed), id = ABBOTOWN_MAP.sections[0]!.encounterId
  performDraft(ctx, listDraftOffers(ctx.campaign)[take]!.id, 'test')
  performOpeningStraightIn(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
  setCursor(ctx, { step: 'open', engagement: null, prepStep: null, battle: null, equipSession: null }, 'test')
  performResolvePrologue(ctx, true, 'test', true)
  performAdvanceOpening(ctx, 'test')
  return ctx
}
const rollerOf = (seed: number) => { const rng = makeRng(rootSeedOf(0, 0, seed)); return { below: (n: number, ...keys: number[]) => rollBelow(rng, n, 'draft', ...keys), d100: (...keys: number[]) => roll100(rng, 'draft', ...keys) } }
/** the same hero's base told nothing of its own badges: the roll as it was before this item */
const asBefore = (id: string): BaseOf => { const b = draftBaseOf(heroRowOf(id)), bare = ((stat: string) => b(stat)) as BaseOf & { fielded?: (stat: string) => number }; bare.fielded = b.fielded!; return bare }

describe('kingdom.gift-roll-leaves-out-own-badges — the run\'s draft tells the engine the hero\'s own badges', () => {
  it('the draft\'s base for a pool row names the badges its row already carries: the engine row\'s (its origin badges) and any on the hero\'s row', () => {
    for (const row of HERO_POOL) expect(draftBaseOf(row).own, row.id).toEqual(ownOf(row.id))
    expect(draftBaseOf(heroRowOf(BERSERKER)).own).toContain('badge.huge'); expect(draftBaseOf(heroRowOf(FEY)).own).toContain('badge.frail')
    // a badge the campaign has put on the hero's own row counts too
    const marked = { ...heroRowOf('hero.base.mage-fire'), badges: ['badge.mystic'] }
    expect(draftBaseOf(marked).own).toEqual([...((UNITS['hero.base.mage-fire'] as { badges?: readonly string[] }).badges ?? []), 'badge.mystic'])
    // which of the pool's own badges the gift roll could give at all
    expect(HERO_POOL.filter((h) => ownOf(h.id).some((b) => GIFTS.includes(b))).map((h) => h.id).sort()).toEqual([SORCERESS, FEY, ELF, BERSERKER].sort())
  })

  it('seeds 0 to 199: none of the three first heroes on offer, and none of the next draft\'s three, is given a badge its own row already carries — and the hero that joins has none twice', () => {
    let offers = 0
    for (let seed = 0; seed < 200; seed++) {
      const first = atFirstDraft(seed)
      for (const h of listDraftOffers(first.campaign)) { offers++
        const d = draftedHeroOf(first.campaign, h.id)
        for (const b of d.drafted!.badges) expect(ownOf(h.id).includes(b), `seed ${seed}: ${h.id} is offered ${b} as the first hero, which its row has`).toBe(false)
        expect(new Set([...ownOf(h.id), ...d.drafted!.badges]).size, `seed ${seed}: ${h.id} carries no badge twice`).toBe(ownOf(h.id).length + d.drafted!.badges.length) }
      const second = atSecondDraft(seed, seed % 3)
      for (const h of listDraftOffers(second.campaign)) { offers++
        const d = draftedHeroOf(second.campaign, h.id)
        for (const b of d.drafted!.badges) expect(ownOf(h.id).includes(b), `seed ${seed}: ${h.id} is offered ${b} at the second draft, which its row has`).toBe(false) }
    }
    expect(offers).toBe(1200)
  })

  it('every later draft, on any dice: the Berserker is never given Huge, the Forest Fey and the Crimson Sorceress never Frail, the Ancient Elf never Mystic — before this they were', () => {
    const four = [BERSERKER, FEY, SORCERESS, ELF], gift: Record<string, string> = { [BERSERKER]: 'badge.huge', [FEY]: 'badge.frail', [SORCERESS]: 'badge.frail', [ELF]: 'badge.mystic' }
    const doubled: Record<string, number> = {}, before: Record<string, number> = {}
    for (let seed = 0; seed < 1500; seed++) for (const ordinal of [1, 2, 3, 4, 5]) for (const three of [[BERSERKER, FEY, SORCERESS], [ELF, BERSERKER, FEY]]) {
      const now = handDraftedOf(rollerOf(seed), three.map((id) => draftBaseOf(heroRowOf(id))), ordinal, []), was = handDraftedOf(rollerOf(seed), three.map(asBefore), ordinal, [])
      three.forEach((id, j) => { if (now[j]!.badges.includes(gift[id]!)) doubled[id] = (doubled[id] ?? 0) + 1; if (was[j]!.badges.includes(gift[id]!)) before[id] = (before[id] ?? 0) + 1 })
    }
    for (const id of four) { expect(before[id] ?? 0, `${id}: before, it was given ${gift[id]}`).toBeGreaterThan(20); expect(doubled[id] ?? 0, `${id} given ${gift[id]}`).toBe(0) }
    // and as the first hero (whose badges are all favourable: Huge and Mystic could be rolled, Frail never was)
    let hugeBefore = 0
    for (let seed = 0; seed < 3000; seed++) {
      expect(firstHeroDraftedOf(rollerOf(seed), draftBaseOf(heroRowOf(BERSERKER))).badges).not.toContain('badge.huge')
      expect(firstHeroDraftedOf(rollerOf(seed), draftBaseOf(heroRowOf(ELF))).badges).not.toContain('badge.mystic')
      if (firstHeroDraftedOf(rollerOf(seed), asBefore(BERSERKER)).badges.includes('badge.huge')) hugeBefore++
    }
    expect(hugeBefore).toBeGreaterThan(20)
  })

  it('the roll is keyed as it was: an offer that held no doubled badge is the offer it was, and a run saved at a draft and opened again shows the same offers', () => {
    let same = 0, changed = 0
    for (let seed = 0; seed < 200; seed++) {
      const c = atFirstDraft(seed).campaign
      for (const h of listDraftOffers(c)) {
        const now = draftedHeroOf(c, h.id).drafted!
        // the same dice, the hero's base told nothing of its own badges: what this offer was before
        const key = ['first-hero', h.id]
        const was = BEFORE.first[seed]![h.id]
        expect(was, `seed ${seed}: ${h.id} was on offer before`).toBeDefined()
        if (was!.every((b) => !ownOf(h.id).includes(b))) { expect(now.badges, `seed ${seed}: ${h.id} held no doubled badge: its gifts are what they were (${key.join(' ')})`).toEqual(was); same++ }
        else { expect(now.badges).not.toEqual(was); changed++ }
      }
      // saved and opened again: the same three, gift for gift
      const again = campaignOf(saveOf(c))
      for (const h of listDraftOffers(c)) expect(draftedHeroOf(again, h.id).drafted, `seed ${seed}: ${h.id}, the reopened run`).toEqual(draftedHeroOf(c, h.id).drafted)
    }
    expect(same + changed).toBe(600)
    expect(changed, 'first-hero offers of seeds 0-199 that held a doubled badge, and so changed').toBe(BEFORE.firstDoubled)
  })

  it('what is not rolled is untouched: every first hero still has Leadership first and the rule\'s +2 Health', () => {
    for (let seed = 0; seed < 60; seed++) { const c = atFirstDraft(seed).campaign
      for (const h of listDraftOffers(c)) { const d = draftedHeroOf(c, h.id).drafted!
        expect(d.badges.slice(0, FIRST_HERO.badges.length)).toEqual([...FIRST_HERO.badges]); expect(d.mods[0]).toEqual({ stat: 'maxHp', add: FIRST_HERO.health, source: FIRST_HERO.healthSource }) } }
  })
})
/** the first-hero offers of seeds 0-199 as they were before this item (each offered hero's badges), frozen 2026-10-05 by
    tools/capture-gift-roll-own-badges.mts — and how many of the 600 held a badge the hero's own row has */
const BEFORE = JSON.parse(readFileSync(new URL('./fixtures/gift-roll-own-badges-before.json', import.meta.url), 'utf8')) as { note: string; first: Record<string, string[]>[]; firstDoubled: number; secondDoubled: number }
