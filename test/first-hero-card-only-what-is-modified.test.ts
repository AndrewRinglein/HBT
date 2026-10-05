// kingdom.first-hero-card-only-what-is-modified — ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'seven answers: the first
// hero's card shows only what is modified; origin badges go on the heroes; …': told that the first-hero card compares each
// hero, stat by stat, with the value most of its class's four base heroes have, and asked whether that is the comparison he
// wants — "No, it's just the things that get modified: the extra stats and the badges.").
//
// Expect: "A first-hero card shows its art, 'A ranger.', and only the extra stats and badges that hero itself carries; no line
// on any card comes from comparing the hero with other heroes of its class (the test fails if the majority standard is
// consulted); a hero with no modification reads one plain line; the gifts line shows once for the pick; when a hero's row
// carries an origin badge the card shows it with its meaning."
//
// What is modified on a hero is (1) what its draft gave it — the record the run keeps on the hero (Hero.drafted: its badges,
// its stat changes) — and (2) the origin badges its own row carries, read from the row and never from a list in the kingdom
// (none is on a row until content.hero-origin-badges). The majority-of-four "standard" of kingdom.first-hero-own-positives-
// negatives is gone (kingdom SWITCHES.md firstHeroStandard, overturned). These hold whichever way the first hero's draft is
// rolled — one roll for the pick, or one for each of the three (kingdom.first-hero-each-rolls-own-gifts): what is said once
// for the pick is never on a card, and everything the hero's draft gave it is said exactly once.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { makeNewCampaign, performAdvanceOpening, listDraftOffers, draftedHeroOf } from '../src/core/opening.js'
import { makeCtx, type Ctx } from '../src/core/mutate.js'
import { joinsWithOf } from '../src/core/draft-modifiers.js'
import { HERO_POOL } from '../src/content/heroes.js'
import { CLASSES } from '../src/content/classes.js'
import { CRUCIBLE, FIRST_HERO, crucibleStatOf } from '../src/content/crucible.js'
import { BADGE_LINES } from '../src/content/generated/progress.js'
import { statLabelOf } from '../src/content/stat-labels.js'
import { draftScreen } from '../src/ui/draft.js'
import { BADGES, RULE_BADGES, UNITS } from '../src/engine.js'

const SEEDS = [1, 2, 3, 5, 8, 11, 13, 15, 21, 34, 42, 55]
const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
function offersOn(html: string): { id: string; html: string }[] {
  const starts = [...html.matchAll(/<div class="opt[^"]*" data-act="draft" data-id="([^"]+)"/g)]
  return starts.map((m, i) => ({ id: m[1]!, html: html.slice(m.index!, i + 1 < starts.length ? starts[i + 1]!.index! : html.length) }))
}
/** the lines a card lists as the hero's own: which thing each is said of, its side, its words */
const ownOn = (html: string) => [...html.matchAll(/<li class="(pos|neg)" data-own="([^"]+)"[^>]*>(.*?)<\/li>/g)].map((m) => ({ side: m[1]!, of: m[2]!, words: text(m[3]!) }))
/** the things said once for the pick, above the cards: which thing(s) each line is said of */
const pickLineOn = (html: string) => { const block = html.match(/<p class="firstGifts"[^>]*>([\s\S]*?)<\/p>/); return block ? [...block[1]!.matchAll(/<span data-joins="([^"]+)">([^<]*)<\/span>/g)].flatMap((m) => m[1]!.split(' ')) : [] }
function atFirstDraft(seed: number, offer?: readonly string[]): Ctx {
  const ctx = makeCtx(makeNewCampaign(seed)); performAdvanceOpening(ctx, 'test')
  if (offer) ctx.campaign.cursor.draftOffer = [...offer]
  return ctx
}
/** What the hero's draft gave it, each thing by the draft's own key (joinsWithOf: badge:<id>, health, point:<stat>), as the card would word it. */
function draftedThings(ctx: Ctx, heroId: string): Record<string, { side: string; words?: string }> {
  const out: Record<string, { side: string; words?: string }> = {}
  for (const j of joinsWithOf(draftedHeroOf(ctx.campaign, heroId).drafted!, FIRST_HERO.healthSource)) {
    if (j.badge) out[j.key] = { side: CRUCIBLE.flawed.some((b) => b.id === j.badge) ? 'neg' : 'pos' }
    else out[j.key] = { side: j.amount! > 0 ? 'pos' : 'neg', words: `${j.amount! > 0 ? '+' : ''}${j.amount} ${statLabelOf(crucibleStatOf(j.stat!))}` }
  }
  return out
}
const keyOnCard = (joinKey: string) => joinKey

describe('kingdom.first-hero-card-only-what-is-modified — no standard hero', () => {
  it('the majority-of-four standard is gone: no source file holds it, names it or reads it', () => {
    expect(existsSync('src/content/class-standard.ts'), 'src/content/class-standard.ts').toBe(false)
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(`${dir}/${d.name}`) : d.name.endsWith('.ts') ? [`${dir}/${d.name}`] : []))
    // (a comment may still say what was removed; what must not be there is the thing itself: its import, or a call of it)
    const naming = files('src').filter((f) => /from '[^']*class-standard|classStandardOf\(|ownDifferencesOf\(|classHeroesOf\(/.test(readFileSync(f, 'utf8')))
    expect(naming, 'source files that still consult a class standard').toEqual([])
  })

  it('no line on a card comes from comparing the hero with the others of its class: heroes the old standard set apart list no such stat', () => {
    // the Hunter read "+1 Precision, +1 Reach" and the Iron Dwarf "+2 Health" against their classes' majority — neither is a modification
    const three = ['hero.base.ranger-aggressive', 'hero.base.warrior-iron', 'hero.base.priest-pauper']
    for (const seed of [3, 11]) {
      const ctx = atFirstDraft(seed, three), cards = offersOn(draftScreen(ctx.campaign))
      expect(cards.map((c) => c.id)).toEqual(three)
      for (const c of cards) {
        expect(c.html, `${c.id}: nothing "against" a class`).not.toMatch(/data-against=|standard/)
        const drafted = draftedThings(ctx, c.id)
        // Law 10, 2026-10-05 — content.hero-origin-badges (engine item; engine/DECISIONS.md 2026-10-05 'seven answers: … origin badges
        // go on the heroes …': "3, yes."): this read
        //   for (const x of ownOn(c.html)) expect(Object.keys(drafted), …).toContain(x.of)
        // The three heroes' rows carry their origin badges now (the Hunter Vengeful, the Iron Dwarf Stalwart and Dwarf, the
        // Barefoot Mendicant Faithful). A line on a card is a thing its own draft gave it or a badge its own ROW carries -
        // still never a stat set against the others of its class.
        const rowBadges = ((UNITS[c.id] as unknown as { badges?: string[] }).badges ?? []).filter((b) => b !== RULE_BADGES.hero).map((b) => `badge:${b}`)
        expect(rowBadges.length, `${c.id}: its row carries an origin badge`).toBeGreaterThan(0)
        for (const x of ownOn(c.html)) expect([...Object.keys(drafted), ...rowBadges], `${c.id}: "${x.words}" is a thing its own draft gave it, or a badge of its row`).toContain(x.of)
        for (const b of rowBadges) expect(ownOn(c.html).map((x) => x.of), `${c.id}: its row's ${b} is on its card`).toContain(b)
      }
    }
  })
})

describe('kingdom.first-hero-card-only-what-is-modified — the card', () => {
  it('each card: its art, "A ranger.", and only what is modified on that hero — what its draft gave it and is not said once for the pick, and its row\'s own badges', () => {
    for (const seed of SEEDS) {
      const ctx = atFirstDraft(seed), c = ctx.campaign, html = draftScreen(c), cards = offersOn(html), pick = pickLineOn(html).map(keyOnCard)
      expect(cards.length).toBe(3)
      for (const card of cards) {
        const who = `seed ${seed}: ${card.id}`, row = listDraftOffers(c).find((h) => h.id === card.id)!
        expect(card.html, `${who}: its card art`).toMatch(/^<div class="opt[^>]*><div class="art">/)
        const className = CLASSES.find((k) => k.id === row.classes[0])!.name.toLowerCase()
        expect(card.html, `${who}: one line of what it is`).toContain(`<small class="whatitis" data-what="${row.classes[0]}">${/^[aeiou]/.test(className) ? 'An' : 'A'} ${className}.</small>`)
        const drafted = draftedThings(ctx, card.id), own = ownOn(card.html)
        // Law 10, 2026-10-05 — content.hero-origin-badges (engine item; engine/DECISIONS.md 2026-10-05 'seven answers: … origin badges go on the heroes …': "3, yes."): this block read
        //   // nothing on the card but what its own draft gave it (no row carries an origin badge today)
        //   for (const x of own) { expect(Object.keys(drafted), …).toContain(x.of); expect(x.side, …).toBe(drafted[x.of]!.side); … }
        //   expect([...own.map((x) => x.of), ...pick.filter((k) => k in drafted)].sort(), …).toEqual(Object.keys(drafted).sort())
        //   expect(own.map((x) => x.side).join(' ')).toMatch(/^(pos ?)*(neg ?)*$/)
        // The base heroes' rows carry their origin badges now. The card is still ONLY what is modified on that hero: the badges
        // its own row carries (read from the engine's row; the rule badge every hero carries is not one), then what its draft
        // gave it - each thing once, each list positives first (the card lists the row's badges, then the gifts under their heading).
        const rule = new Set<string>(Object.values(RULE_BADGES))
        const rowBadges = ((UNITS[row.unitType] as unknown as { badges?: string[] }).badges ?? []).filter((b) => !rule.has(b))
        const origin = Object.fromEntries(rowBadges.filter((b) => !(`badge:${b}` in drafted)).map((b) => [`badge:${b}`, { side: CRUCIBLE.flawed.some((f) => f.id === b) ? 'neg' : 'pos', name: BADGES[b]!.name! }]))
        // nothing on the card but its row's own badges and what its own draft gave it
        for (const x of own) {
          const o = origin[x.of]
          if (o) {
            expect(x.side, `${who}: ${x.of}`).toBe(o.side)
            expect(x.words.startsWith(`${o.name} `) && x.words.length > o.name.length + 1, `${who}: ${x.of} is named with its meaning: "${x.words}"`).toBe(true)
            continue
          }
          expect(Object.keys(drafted), `${who}: "${x.words}" (${x.of}) is its own`).toContain(x.of)
          expect(x.side, `${who}: ${x.of}`).toBe(drafted[x.of]!.side)
          if (drafted[x.of]!.words) expect(x.words, `${who}: ${x.of}`).toBe(drafted[x.of]!.words)
          expect(pick, `${who}: ${x.of} is on the card, so it is not said again for the pick`).not.toContain(x.of)
        }
        // and everything its row carries and its draft gave it is said exactly once — on its card, or once for the pick
        expect([...own.map((x) => x.of), ...pick.filter((k) => k in drafted)].sort(), `${who}: every badge of its row and every thing its draft gave it, each once`).toEqual([...Object.keys(origin), ...Object.keys(drafted)].sort())
        // positives before negatives, in each of the card's two lists: its row's badges, then its gifts
        const lists = [...card.html.matchAll(/<ul class="own(?: origin)?"[^>]*>([\s\S]*?)<\/ul>/g)].map((m) => ownOn(m[1]!).map((x) => x.side).join(' '))
        expect(lists.length, `${who}: a list for its row's badges, a list for its gifts`).toBe((Object.keys(origin).length ? 1 : 0) + (own.length > Object.keys(origin).length ? 1 : 0))
        for (const sides of lists) expect(sides, `${who}: positives first`).toMatch(/^(pos ?)*(neg ?)*$/)
        // a hero with nothing of its own says so in one plain line, and lists nothing
        const none = card.html.match(/<p class="own same" data-own="none">([^<]*)<\/p>/)
        if (own.length === 0) expect(none?.[1], `${who}: says nothing is modified`).toBe('No extra stats and no badges of its own.')
        else expect(none, `${who}: lists what is modified, so does not say nothing is`).toBeNull()
      }
    }
  })

  it('what is said for the pick is said once, above the three cards, and is on no card', () => {
    for (const seed of SEEDS) {
      const html = draftScreen(atFirstDraft(seed).campaign)
      expect(html.match(/class="firstGifts"/g)?.length, `seed ${seed}: one line for the pick`).toBe(1)
      expect(html.indexOf('class="firstGifts"')).toBeLessThan(html.indexOf('data-act="draft"'))
      for (const card of offersOn(html)) expect(card.html, `seed ${seed}: ${card.id}`).not.toMatch(/data-joins=|class="joins"/)
    }
  })

  it('a badge the hero\'s own row carries is shown on its card with its meaning — a good one with the positives, a flaw with the negatives; the badge every hero carries is not', () => {
    const GOOD = 'badge.mystic', FLAW = CRUCIBLE.flawed.find((b) => BADGES[b.id])!.id
    const ctx = atFirstDraft(11), c = ctx.campaign, offered = listDraftOffers(c)[0]!
    const row = HERO_POOL.find((h) => h.id === offered.id)! as unknown as { badges: string[] }
    // every hero's engine row carries the engine's own rule badge (a hero is a hero) — that is not an origin badge
    expect(((UNITS[offered.unitType] as unknown as { badges?: string[] }).badges ?? [])).toContain(RULE_BADGES.hero)
    const before = ownOn(offersOn(draftScreen(c)).find((x) => x.id === offered.id)!.html)
    expect(before.some((x) => x.of === `badge:${RULE_BADGES.hero}`), 'the rule badge is not listed').toBe(false)
    const was = [...row.badges]
    try {
      row.badges.push(FLAW, GOOD)   // as content.hero-origin-badges will put them on the row
      const card = offersOn(draftScreen(c)).find((x) => x.id === offered.id)!, own = ownOn(card.html)
      const good = own.find((x) => x.of === `badge:${GOOD}`)!, flaw = own.find((x) => x.of === `badge:${FLAW}`)!
      expect(good, 'the good badge is on the card').toBeTruthy(); expect(flaw, 'the flaw is on the card').toBeTruthy()
      expect([good.side, flaw.side]).toEqual(['pos', 'neg'])
      expect(good.words, 'its name and its one-line meaning — the content\'s words').toBe(`${BADGES[GOOD]!.name} ${BADGE_LINES[GOOD]}`)
      expect(flaw.words.startsWith(`${BADGES[FLAW]!.name} `) && flaw.words.length > BADGES[FLAW]!.name!.length + 1, `the flaw's name and meaning: "${flaw.words}"`).toBe(true)
      expect(own.findIndex((x) => x.of === `badge:${GOOD}`)).toBeLessThan(own.findIndex((x) => x.of === `badge:${FLAW}`))
      expect(card.html).not.toMatch(/data-own="none"/)
      // the other two cards are untouched by it
      for (const other of offersOn(draftScreen(c)).filter((x) => x.id !== offered.id)) expect(ownOn(other.html).some((x) => x.of === `badge:${GOOD}` || x.of === `badge:${FLAW}`)).toBe(false)
    } finally { row.badges.length = 0; row.badges.push(...was) }
    expect(ownOn(offersOn(draftScreen(c)).find((x) => x.id === offered.id)!.html)).toEqual(before)
  })

  it('the page: a new run\'s first draft shows each card\'s own modifications and nothing worked out against its class', () => {
    const out = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/the first draft's three cards each said what it is in one line and listed only what is modified on that hero \([^)]*\)/)
    expect(out).not.toMatch(/standard hero/)
  }, 600000)
})
