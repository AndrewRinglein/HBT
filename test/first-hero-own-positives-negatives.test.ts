// kingdom.first-hero-own-positives-negatives — ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'playtest post: …, the first
// hero's positives': "When I was drafting my first hero, I weirdly got a list of like six positive things for each person. It
// seemed like maybe all of the positives for all of them were showing under each of them, as opposed to just the one that
// related to that hero." — and 'the playtest post answered: …': "It should show its positives and negatives compared to a
// standard hero of that type. It should say one line about what it is, like a ranger, and then it should do something similar
// to what you have there, but just about the positives and negatives it has, stats, and badges.").
//
// Expect: "On a new run each of the three first-hero cards shows its art, a one-line 'what it is', and only its own differences
// from its class's standard hero - a test builds the three cards and fails if any line on a card belongs to another hero or if
// a stat equal to the standard is listed; two different heroes show two different lists; the report names the cause of the
// six-positives fault."
//
// The fault: each card listed what the FIRST HERO is given — Leadership, a positive badge, +2 Health, a stat point — which is
// rolled once for the pick and is the same whichever of the three is taken. So every card showed the same five or six lines,
// and none of them was that hero's. Those gifts are now said once, for the pick, above the three cards; under each card are
// its own differences from the standard hero of its class (src/content/class-standard.ts).
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { makeNewCampaign, performAdvanceOpening, performDraft, performOpeningStraightIn, performResolvePrologue, listDraftOffers, draftedHeroOf } from '../src/core/opening.js'
import { makeCtx, setCursor, type Ctx } from '../src/core/mutate.js'
import { joinsWithOf } from '../src/core/draft-modifiers.js'
import { HERO_POOL, type HeroRow } from '../src/content/heroes.js'
import { CLASSES } from '../src/content/classes.js'
import { FIRST_HERO, badgeLineOf, statLineOf } from '../src/content/crucible.js'
import { STAT_LABEL } from '../src/content/stat-labels.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { classStandardOf, ownDifferencesOf } from '../src/content/class-standard.js'
import { draftScreen } from '../src/ui/draft.js'
import { UNITS, encounterDef } from '../src/engine.js'

const SEEDS = [1, 2, 3, 5, 8, 11, 13, 15, 21, 34, 42, 55]
const HERO_CLASSES = CLASSES.filter((c) => c.group === 'hero').map((c) => c.id)
const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const sign = (n: number) => `${n > 0 ? '+' : ''}${n}`

// ── the standard, worked out here from the engine's rows and the pool — not through the code under test ──
const unit = (h: HeroRow) => UNITS[h.unitType] as unknown as Record<string, unknown>
const value = (h: HeroRow, stat: string): number => (stat === 'itemSlots' ? h.itemSlots : typeof unit(h)[stat] === 'number' ? (unit(h)[stat] as number) : 0)
const ofClass = (classId: string) => HERO_POOL.filter((h) => h.classes.includes(classId))
const statsOfClass = (classId: string) => [...new Set(['itemSlots', ...ofClass(classId).flatMap((h) => Object.entries(unit(h)).filter(([, v]) => typeof v === 'number').map(([k]) => k))])]
function standardOf(classId: string, stat: string): number {
  const values = ofClass(classId).map((h) => value(h, stat)), times = (v: number) => values.filter((x) => x === v).length
  const most = Math.max(...values.map(times))
  return Math.min(...values.filter((v) => times(v) === most))
}
/** A hero's own differences, as the card's words: "+1 Precision", "-1 Health" — keyed by stat. */
const differencesOf = (h: HeroRow): Record<string, number> =>
  Object.fromEntries(statsOfClass(h.classes[0]!).map((s): [string, number] => [s, value(h, s) - standardOf(h.classes[0]!, s)]).filter(([, n]) => n !== 0))

// ── the screen ──
function offersOn(html: string): { id: string; html: string }[] {
  const starts = [...html.matchAll(/<div class="opt[^"]*" data-act="draft" data-id="([^"]+)"/g)]
  return starts.map((m, i) => ({ id: m[1]!, html: html.slice(m.index!, i + 1 < starts.length ? starts[i + 1]!.index! : html.length) }))
}
const ownOn = (html: string) => [...html.matchAll(/<li class="(pos|neg)" data-own="([^"]+)"[^>]*>(.*?)<\/li>/g)].map((m) => ({ side: m[1]!, of: m[2]!, words: text(m[3]!) }))
const giftsOn = (html: string) => { const block = html.match(/<p class="firstGifts"[^>]*>(.*?)<\/p>/s); return block ? [...block[1]!.matchAll(/<span data-joins="([^"]+)">([^<]*)<\/span>/g)].map((m) => ({ of: m[1]!.split(' '), words: m[2]! })) : null }
function atFirstDraft(seed: number, offer?: readonly string[]): Ctx {
  const ctx = makeCtx(makeNewCampaign(seed)); performAdvanceOpening(ctx, 'test')
  if (offer) ctx.campaign.cursor.draftOffer = [...offer]
  return ctx
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

describe('kingdom.first-hero-own-positives-negatives — the standard hero of a class', () => {
  it('stat by stat, the standard is the value most of the class\'s base heroes have; a tie goes to the lower', () => {
    expect(HERO_CLASSES.length).toBe(6)
    for (const classId of HERO_CLASSES) {
      expect(ofClass(classId).length, `${classId} has base heroes`).toBeGreaterThan(1)
      const standard = classStandardOf(classId)
      expect(Object.keys(standard).sort(), `${classId}: every stat its heroes carry`).toEqual(statsOfClass(classId).sort())
      for (const stat of statsOfClass(classId)) expect(standard[stat], `${classId} ${stat} (${ofClass(classId).map((h) => value(h, stat)).join(', ')})`).toBe(standardOf(classId, stat))
    }
  })

  it('a hero\'s own differences are its stats above and below that standard — never one equal to it — and the badges only it carries', () => {
    let differing = 0, same = 0
    for (const h of HERO_POOL) {
      const own = ownDifferencesOf(h)
      expect(own.classId).toBe(h.classes[0])
      expect(Object.fromEntries(own.stats.map((d) => [d.stat, d.amount])), h.id).toEqual(differencesOf(h))
      for (const d of own.stats) expect(d.amount, `${h.id} ${d.stat}: a stat equal to the standard is not a difference`).not.toBe(0)
      // a badge every hero of the class carries is the standard's too, and is not this hero's own
      const everyones = ofClass(h.classes[0]!).map((x) => (unit(x)['badges'] as string[] | undefined) ?? [])
      for (const b of own.badges) expect(everyones.every((list) => list.includes(b)), `${h.id}: ${b} is not carried by every ${h.classes[0]}`).toBe(false)
      if (own.stats.length || own.badges.length) differing++; else same++
    }
    expect(differing).toBeGreaterThan(0); expect(same, 'some base hero IS its class\'s standard').toBeGreaterThan(0)
  })
})

describe('kingdom.first-hero-own-positives-negatives — the three cards of the first draft', () => {
  it('each card: its art, one line of what it is, then only its own differences from its class\'s standard — positives, then negatives', () => {
    let positives = 0, negatives = 0
    for (const seed of SEEDS) {
      const ctx = atFirstDraft(seed), c = ctx.campaign, offers = offersOn(draftScreen(c))
      expect(offers.map((o) => o.id)).toEqual(listDraftOffers(c).map((h) => h.id))
      expect(offers.length).toBe(3)
      for (const o of offers) {
        const who = `seed ${seed}: ${o.id}`, row = listDraftOffers(c).find((h) => h.id === o.id)!
        // the card art's place, first on the card
        expect(o.html, `${who}: its card art`).toMatch(/^<div class="opt[^>]*><div class="art">/)
        // one line of what it is: its class in plain words
        const what = [...o.html.matchAll(/<small class="whatitis" data-what="([^"]+)">([^<]*)<\/small>/g)]
        expect(what.length, `${who}: one line of what it is`).toBe(1)
        const className = CLASSES.find((k) => k.id === row.classes[0])!.name.toLowerCase()
        expect([what[0]![1], what[0]![2]], who).toEqual([row.classes[0], `${/^[aeiou]/.test(className) ? 'An' : 'A'} ${className}.`])
        // its own differences, and nothing else
        const want = differencesOf(row), own = ownOn(o.html)
        expect(own.filter((x) => x.of.startsWith('stat:')).map((x) => x.of.slice(5)).sort(), `${who}: exactly its own stats that differ from a standard ${className}`).toEqual(Object.keys(want).sort())
        for (const x of own.filter((y) => y.of.startsWith('stat:'))) {
          const stat = x.of.slice(5), amount = want[stat]!
          expect(amount, `${who}: ${stat} equals the standard and must not be listed`).not.toBe(0)
          expect(x.words, `${who}: ${stat}`).toBe(`${sign(amount)} ${STAT_LABEL[stat] ?? stat}`)
          expect(x.side, `${who}: ${x.words} is a ${amount > 0 ? 'positive' : 'negative'}`).toBe(amount > 0 ? 'pos' : 'neg')
          if (amount > 0) positives++; else negatives++
        }
        expect(own.filter((x) => x.of.startsWith('badge:')).map((x) => x.of.slice(6)).sort(), `${who}: exactly its own badges`).toEqual([...ownDifferencesOf(row).badges].sort())
        // positives stand before negatives
        expect(own.map((x) => x.side).join(' '), `${who}: positives, then negatives`).toMatch(/^(pos ?)*(neg ?)*$/)
        // a hero equal to the standard in everything says so, in a line — and lists nothing
        const sameLine = o.html.match(/<p class="own same" data-own="same">([^<]*)<\/p>/)
        if (own.length === 0) expect(sameLine?.[1], `${who}: says it is the standard`).toBe(`The same as a standard ${className} in everything.`)
        else expect(sameLine, `${who}: differs, so does not say it is the standard`).toBeNull()
        // no line of what the FIRST HERO is given is under a card: those are nobody's own
        expect(o.html, `${who}: the first hero's gifts are not listed under a card`).not.toMatch(/data-joins=|class="joins"/)
        for (const j of joinsWithOf(draftedHeroOf(c, o.id).drafted!, FIRST_HERO.healthSource)) {
          const words = j.badge ? badgeLineOf(j.badge) : statLineOf(j.stat!)
          expect(text(o.html).includes(words), `${who}: "${words}" is the pick's, not this card's`).toBe(false)
        }
      }
    }
    expect(positives, 'the seeds show positives').toBeGreaterThan(0); expect(negatives, 'and negatives').toBeGreaterThan(0)
  })

  it('no line on a card belongs to another hero: three heroes that differ show three different lists', () => {
    // three heroes of three classes, each with differences of its own, put on the offer
    const pick = (classId: string, of: (d: Record<string, number>) => boolean) => HERO_POOL.find((h) => h.classes[0] === classId && of(differencesOf(h)))!
    const some = (d: Record<string, number>) => Object.keys(d).length > 0
    const three = [pick('class.ranger', some), pick('class.warrior', some), pick('class.priest', (d) => Object.values(d).some((n) => n < 0))]
    expect(three.every(Boolean)).toBe(true)
    const ctx = atFirstDraft(11, three.map((h) => h.id)), offers = offersOn(draftScreen(ctx.campaign))
    const lists = offers.map((o) => ownOn(o.html).map((x) => `${x.of}=${x.words}`).join('; '))
    expect(new Set(lists).size, `three different lists: ${lists.join(' | ')}`).toBe(3)
    for (const [i, o] of offers.entries()) {
      const mine = differencesOf(three[i]!)
      for (const x of ownOn(o.html)) expect(x.words, `${o.id}: "${x.words}" is its own`).toBe(`${sign(mine[x.of.slice(5)]!)} ${STAT_LABEL[x.of.slice(5)] ?? x.of.slice(5)}`)
    }
    // and across the seeds: whenever two offered heroes differ from their standards differently, their cards differ
    for (const seed of SEEDS) {
      const c = atFirstDraft(seed).campaign, cards = offersOn(draftScreen(c))
      for (const a of cards) for (const b of cards) {
        if (a.id >= b.id) continue
        const A = listDraftOffers(c).find((h) => h.id === a.id)!, B = listDraftOffers(c).find((h) => h.id === b.id)!
        const differ = JSON.stringify(Object.entries(differencesOf(A)).sort()) !== JSON.stringify(Object.entries(differencesOf(B)).sort())
        expect(JSON.stringify(ownOn(a.html)) !== JSON.stringify(ownOn(b.html)), `seed ${seed}: ${a.id} and ${b.id}`).toBe(differ)
      }
    }
  })

  it('a hero that is its class\'s standard in everything says so in one line', () => {
    const standard = HERO_POOL.find((h) => Object.keys(differencesOf(h)).length === 0 && ownDifferencesOf(h).badges.length === 0)!
    expect(standard, 'a base hero that is the standard').toBeTruthy()
    const others = HERO_POOL.filter((h) => h.classes[0] !== standard.classes[0]).slice(0, 2)
    const o = offersOn(draftScreen(atFirstDraft(5, [standard.id, ...others.map((h) => h.id)]).campaign)).find((x) => x.id === standard.id)!
    const className = CLASSES.find((k) => k.id === standard.classes[0])!.name.toLowerCase()
    expect(text(o.html)).toContain(`The same as a standard ${className} in everything.`)
    expect(ownOn(o.html)).toEqual([])
  })

  it('what the first hero is given — whichever of the three it is — is said once, for the pick, above the three cards', () => {
    for (const seed of SEEDS) {
      const c = atFirstDraft(seed).campaign, html = draftScreen(c), gifts = giftsOn(html)
      expect(gifts, `seed ${seed}: one line for the pick`).not.toBeNull()
      expect(html.match(/class="firstGifts"/g)!.length).toBe(1)
      expect(html.indexOf('class="firstGifts"'), 'above the three cards').toBeLessThan(html.indexOf('data-act="draft"'))
      // the same things for all three, each said once, in the content's plain words — Leadership first
      const per = listDraftOffers(c).map((h) => joinsWithOf(draftedHeroOf(c, h.id).drafted!, FIRST_HERO.healthSource))
      for (const other of per) expect(other.map((j) => j.key), `seed ${seed}: the gifts are the pick's — the same for each of the three`).toEqual(per[0]!.map((j) => j.key))
      expect(gifts!.flatMap((g) => g.of).sort()).toEqual(per[0]!.map((j) => j.key).sort())
      for (const j of per[0]!) expect(gifts!.filter((g) => g.of.includes(j.key)).map((g) => g.words), `seed ${seed}: ${j.key}`).toEqual([j.badge ? badgeLineOf(j.badge) : statLineOf(j.stat!)])
      expect(new Set(gifts!.map((g) => g.words)).size, 'no line twice').toBe(gifts!.length)
      expect(gifts![0]!.words).toBe('Born leader')
    }
  })

  it('a later draft is as it was: its numbers, its rolled points and its badges — each hero\'s own roll — and none of the first draft\'s lines', () => {
    for (const seed of [3, 11, 21]) {
      const c = atSecondDraft(seed).campaign, html = draftScreen(c), offers = offersOn(html)
      expect(offers.length).toBe(3)
      expect(html).not.toMatch(/class="firstGifts"|class="whatitis"|data-own=/)
      for (const o of offers) expect(o.html).toMatch(/data-stats="[^"]+" *>|data-stats="/)
      // the later drafts never shared the fault: each offer shows its own rolled modifiers
      const rolled = offers.map((o) => { const d = draftedHeroOf(c, o.id).drafted!; return JSON.stringify([d.badges, d.rolls]) })
      const shown = offers.map((o) => `${o.html.match(/data-badges="([^"]*)"/)![1]}|${o.html.match(/data-rolls="([^"]*)"/)![1]}`)
      expect(new Set(shown).size, `seed ${seed}: what the three show`).toBe(new Set(rolled).size)
    }
  })

  it('the page: a new run\'s first draft shows each card\'s own differences and the pick\'s gifts once', () => {
    const out = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/the first draft's three cards each said what it is in one line and listed only its own differences from its class's standard hero \([^)]*\); what the first hero is given was said once, above the three \([^)]*\)/)
  }, 600000)
})
