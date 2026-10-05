// kingdom.first-hero-own-positives-negatives — ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'playtest post: …, the first
// hero's positives': "When I was drafting my first hero, I weirdly got a list of like six positive things for each person. It
// seemed like maybe all of the positives for all of them were showing under each of them, as opposed to just the one that
// related to that hero." — and 'the playtest post answered: …': "It should show its positives and negatives compared to a
// standard hero of that type. It should say one line about what it is, like a ranger, and then it should do something similar
// to what you have there, but just about the positives and negatives it has, stats, and badges.").
//
// The fault: each card listed what the FIRST HERO is given — Leadership, a positive badge, +2 Health, a stat point — the same
// lines under each of the three, none of them told apart as that hero's own.
//
// LAW 10 — REWRITTEN 2026-10-05, the same day, by kingdom.first-hero-card-only-what-is-modified (engine/DECISIONS.md 2026-10-05
// 'seven answers: the first hero's card shows only what is modified; …' — Andrew, told that the card compares each hero, stat
// by stat, with the value most of its class's four base heroes have, and asked whether that is the comparison he wants: "No,
// it's just the things that get modified: the extra stats and the badges."). This file held, as this item first landed it:
//   · "the standard hero of a class" — stat by stat, the value most of the class's base heroes have, a tie to the lower
//     (src/content/class-standard.ts classStandardOf), and a hero's "own differences" from it (ownDifferencesOf);
//   · each card listing exactly those differences ("+1 Precision" for the Hunter, "+2 Health" for the Iron Dwarf), three
//     heroes that differ showing three different lists, and a hero equal to the standard saying "The same as a standard
//     paladin in everything.";
//   · what the first hero is given as one roll, the same for each of the three, all of it said once above the cards.
// The first two pinned a comparison he did not mean, and are gone with the standard itself. The third is not this file's to
// pin any more: whether a thing is said once for the pick or on a hero's own card follows how the first hero is rolled
// (kingdom.first-hero-each-rolls-own-gifts). What a card lists now — only what is modified on that hero — is held by
// test/first-hero-card-only-what-is-modified.test.ts. What still stands of this item, and is held here as it was: each card
// says in one line what the hero is; the line said once for the pick is above the three cards, in the content's plain words,
// Leadership first, and says nothing that any of the three was not given; and the later drafts are as they were.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { makeNewCampaign, performAdvanceOpening, performDraft, performOpeningStraightIn, performResolvePrologue, listDraftOffers, draftedHeroOf } from '../src/core/opening.js'
import { makeCtx, setCursor, type Ctx } from '../src/core/mutate.js'
import { joinsWithOf } from '../src/core/draft-modifiers.js'
import { CLASSES } from '../src/content/classes.js'
import { FIRST_HERO, badgeLineOf, statLineOf } from '../src/content/crucible.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { draftScreen } from '../src/ui/draft.js'
import { encounterDef } from '../src/engine.js'

const SEEDS = [1, 2, 3, 5, 8, 11, 13, 15, 21, 34, 42, 55]

// ── the screen ──
function offersOn(html: string): { id: string; html: string }[] {
  const starts = [...html.matchAll(/<div class="opt[^"]*" data-act="draft" data-id="([^"]+)"/g)]
  return starts.map((m, i) => ({ id: m[1]!, html: html.slice(m.index!, i + 1 < starts.length ? starts[i + 1]!.index! : html.length) }))
}
const pickLineOn = (html: string) => { const block = html.match(/<p class="firstGifts"[^>]*>(.*?)<\/p>/s); return block ? [...block[1]!.matchAll(/<span data-joins="([^"]+)">([^<]*)<\/span>/g)].map((m) => ({ of: m[1]!.split(' '), words: m[2]! })) : null }
function atFirstDraft(seed: number): Ctx {
  const ctx = makeCtx(makeNewCampaign(seed)); performAdvanceOpening(ctx, 'test'); return ctx
}
function atSecondDraft(seed: number): Ctx {
  const ctx = atFirstDraft(seed), id = ABBOTOWN_MAP.sections[0]!.encounterId
  performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test')
  performOpeningStraightIn(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
  setCursor(ctx, { step: 'open', engagement: null, prepStep: null, battle: null, equipSession: null }, 'test')
  performResolvePrologue(ctx, true, 'test', true)
  performAdvanceOpening(ctx, 'test')
  expect(ctx.campaign.cursor.step).toBe('draft')
  return ctx
}

describe('kingdom.first-hero-own-positives-negatives — the three cards of the first draft', () => {
  it('each card: its art, then one line of what it is — its class in plain words', () => {
    for (const seed of SEEDS) {
      const ctx = atFirstDraft(seed), c = ctx.campaign, offers = offersOn(draftScreen(c))
      expect(offers.map((o) => o.id)).toEqual(listDraftOffers(c).map((h) => h.id))
      expect(offers.length).toBe(3)
      for (const o of offers) {
        const who = `seed ${seed}: ${o.id}`, row = listDraftOffers(c).find((h) => h.id === o.id)!
        expect(o.html, `${who}: its card art`).toMatch(/^<div class="opt[^>]*><div class="art">/)
        const what = [...o.html.matchAll(/<small class="whatitis" data-what="([^"]+)">([^<]*)<\/small>/g)]
        expect(what.length, `${who}: one line of what it is`).toBe(1)
        const className = CLASSES.find((k) => k.id === row.classes[0])!.name.toLowerCase()
        expect([what[0]![1], what[0]![2]], who).toEqual([row.classes[0], `${/^[aeiou]/.test(className) ? 'An' : 'A'} ${className}.`])
      }
    }
  })

  it('what is said once for the pick is above the three cards, in the content\'s plain words, Leadership first — and says nothing any of the three was not given', () => {
    for (const seed of SEEDS) {
      const c = atFirstDraft(seed).campaign, html = draftScreen(c), pick = pickLineOn(html)
      expect(pick, `seed ${seed}: one line for the pick`).not.toBeNull()
      expect(html.match(/class="firstGifts"/g)!.length).toBe(1)
      expect(html.indexOf('class="firstGifts"'), 'above the three cards').toBeLessThan(html.indexOf('data-act="draft"'))
      const per = listDraftOffers(c).map((h) => joinsWithOf(draftedHeroOf(c, h.id).drafted!, FIRST_HERO.healthSource))
      for (const line of pick!) for (const key of line.of) {
        for (const given of per) {
          const j = given.find((x) => x.key === key)
          expect(j, `seed ${seed}: ${key} is said for the pick, so each of the three was given it`).toBeTruthy()
          expect(line.words, `seed ${seed}: ${key} in the content's plain words`).toBe(j!.badge ? badgeLineOf(j!.badge) : statLineOf(j!.stat!))
        }
      }
      expect(new Set(pick!.map((g) => g.words)).size, 'no line twice').toBe(pick!.length)
      expect(pick![0]!.words).toBe('Born leader')
      // no card repeats a thing said for the pick
      for (const o of offersOn(html)) expect(o.html, `seed ${seed}: ${o.id}`).not.toMatch(/data-joins=|class="joins"/)
    }
  })

  it('a later draft is as it was: its numbers, its rolled points and its badges — each hero\'s own roll — and none of the first draft\'s lines', () => {
    for (const seed of [3, 11, 21]) {
      const c = atSecondDraft(seed).campaign, html = draftScreen(c), offers = offersOn(html)
      expect(offers.length).toBe(3)
      expect(html).not.toMatch(/class="firstGifts"|class="whatitis"|data-own=/)
      for (const o of offers) expect(o.html).toMatch(/data-stats="/)
      // the later drafts never shared the fault: each offer shows its own rolled modifiers
      const rolled = offers.map((o) => { const d = draftedHeroOf(c, o.id).drafted!; return JSON.stringify([d.badges, d.rolls]) })
      const shown = offers.map((o) => `${o.html.match(/data-badges="([^"]*)"/)![1]}|${o.html.match(/data-rolls="([^"]*)"/)![1]}`)
      expect(new Set(shown).size, `seed ${seed}: what the three show`).toBe(new Set(rolled).size)
    }
  })

  it('the page: a new run\'s first draft shows each card\'s one line of what it is, and the pick\'s line once above the three', () => {
    const out = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/the first draft's three cards each said what it is in one line/)
    expect(out).toMatch(/said once, above the three \([^)]*\)/)
  }, 600000)
})
