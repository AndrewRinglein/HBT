// kingdom.first-hero-each-rolls-own-gifts — ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'gifts: the word; each first-hero
// choice rolls its own; …': asked whether each of the three first-hero choices should roll its own gifts instead of one roll
// shared by all three — "Yeah, they each roll their own gifts." and "the random modifiers that are applied to a hero are called
// gifts. That includes the random badges and random stats."; and 'Leadership is given to every first hero, not rolled': "Every
// first hero choice gets leadership. They don't roll it, they just get it."). GLOSSARY.md 'Settled, 2026-10-05': Gift.
//
// Expect: "On a new run the three first-hero cards show three separately rolled sets of gifts (a test over 50 seeds finds the
// three sets differ on most seeds and never read from one shared roll); the hero taken has exactly the gifts its card showed;
// reloading the saved run shows the same three cards; the heading on the cards and the hero sheet reads 'Gifts'; what is not
// rolled is said once for the pick."
//
// A GIFT is what the dice decide: a random badge, a random stat change. What the first hero's rule gives every first hero
// whoever it is — Leadership, and the +2 Health (2026-09-28: "You get the leadership badge. … +2 health.") — is not rolled, is
// not a gift, and is said once for the pick. It overturns kingdom SWITCHES.md firstHeroGiftsOnce (one roll for the pick).
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { makeNewCampaign, performAdvanceOpening, performDraft, performOpeningStraightIn, performResolvePrologue, listDraftOffers, draftedHeroOf } from '../src/core/opening.js'
import { makeCtx, setCursor, type Ctx } from '../src/core/mutate.js'
import { campaignOf, saveOf } from '../src/core/campaign.js'
import * as DRAFT from '../src/core/draft-modifiers.js'
import { joinsWithOf, type JoinedWith, type Drafted } from '../src/core/draft-modifiers.js'
import { CRUCIBLE, FIRST_HERO, crucibleStatOf, badgeLineOf, statLineOf } from '../src/content/crucible.js'
import { statLabelOf } from '../src/content/stat-labels.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { draftScreen } from '../src/ui/draft.js'
import { heroRosterCard } from '../src/ui/roster.js'
import { BADGES, encounterDef } from '../src/engine.js'

const giftsOf = (DRAFT as unknown as { giftsOf?: (d: Drafted, rule: { badges: readonly string[]; healthSource: string }) => JoinedWith[] }).giftsOf!
const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
function offersOn(html: string): { id: string; html: string }[] {
  const starts = [...html.matchAll(/<div class="opt[^"]*" data-act="draft" data-id="([^"]+)"/g)]
  return starts.map((m, i) => ({ id: m[1]!, html: html.slice(m.index!, i + 1 < starts.length ? starts[i + 1]!.index! : html.length) }))
}
/** the gifts a card lists, under its Gifts heading: which thing each line is said of, and its words */
function giftsOn(card: string): { of: string; words: string }[] | null {
  const block = card.match(/<div class="gifts"[^>]*><h4 class="gifts-h">([^<]*)<\/h4>([\s\S]*?)<\/div><!--gifts-->/)
  if (!block) return null
  expect(block[1], 'the heading').toBe('Gifts')
  return [...block[2]!.matchAll(/<li class="(?:pos|neg)" data-own="([^"]+)"[^>]*>(.*?)<\/li>/g)].map((m) => ({ of: m[1]!, words: text(m[2]!) }))
}
const pickLineOn = (html: string) => { const block = html.match(/<p class="firstGifts"[^>]*>([\s\S]*?)<\/p>/); return block ? [...block[1]!.matchAll(/<span data-joins="([^"]+)">([^<]*)<\/span>/g)].map((m) => ({ of: m[1]!.split(' '), words: m[2]! })) : null }
function atFirstDraft(seed: number): Ctx { const ctx = makeCtx(makeNewCampaign(seed)); performAdvanceOpening(ctx, 'test'); return ctx }
function atSecondDraft(seed: number): Ctx {
  const ctx = atFirstDraft(seed), id = ABBOTOWN_MAP.sections[0]!.encounterId
  performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test')
  performOpeningStraightIn(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
  setCursor(ctx, { step: 'open', engagement: null, prepStep: null, battle: null, equipSession: null }, 'test')
  performResolvePrologue(ctx, true, 'test', true)
  performAdvanceOpening(ctx, 'test')
  return ctx
}
/** What the dice decided for a first hero: every badge but the rule's, and every stat point — by the draft's own keys. */
const rolledOf = (d: Drafted) => joinsWithOf(d, FIRST_HERO.healthSource).filter((j) => (j.badge ? !FIRST_HERO.badges.includes(j.badge) : j.key !== 'health'))
const sig = (d: Drafted) => JSON.stringify(rolledOf(d).map((j) => [j.key, j.amount ?? null]))

describe('kingdom.first-hero-each-rolls-own-gifts — three rolls, not one', () => {
  it('over 50 seeds the three offered first heroes\' gifts differ on most seeds — never one shared roll', () => {
    let allThreeAlike = 0, allThreeDiffer = 0
    for (let seed = 1; seed <= 50; seed++) {
      const c = atFirstDraft(seed).campaign, three = listDraftOffers(c).map((h) => sig(draftedHeroOf(c, h.id).drafted!))
      expect(three.length).toBe(3)
      const distinct = new Set(three).size
      if (distinct === 1) allThreeAlike++
      if (distinct === 3) allThreeDiffer++
    }
    // one roll shared by the three made all three alike on every seed
    expect(allThreeAlike, 'seeds where all three rolled the same gifts').toBeLessThan(5)
    expect(allThreeDiffer, 'seeds where the three sets all differ').toBeGreaterThan(25)
  })

  it('the roll is the hero\'s own: the same hero offered in another place, or beside other heroes, rolls the same gifts', () => {
    const c = atFirstDraft(7).campaign, [a, b, x] = c.cursor.draftOffer!
    const was = Object.fromEntries([a!, b!, x!].map((id) => [id, sig(draftedHeroOf(c, id).drafted!)]))
    c.cursor.draftOffer = [x!, a!, b!]
    for (const id of [a!, b!, x!]) expect(sig(draftedHeroOf(c, id).drafted!), `${id}, offered in another place`).toBe(was[id])
  })

  it('what is not rolled is every first hero\'s: Leadership first among its badges and +2 Health by the rule — the same for each of the three', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const c = atFirstDraft(seed).campaign
      for (const h of listDraftOffers(c)) {
        const d = draftedHeroOf(c, h.id).drafted!
        expect(d.badges.slice(0, FIRST_HERO.badges.length), `seed ${seed}: ${h.id}`).toEqual([...FIRST_HERO.badges])
        expect(d.mods[0], `seed ${seed}: ${h.id}`).toEqual({ stat: 'maxHp', add: FIRST_HERO.health, source: FIRST_HERO.healthSource })
        // its gifts are exactly what the dice decided: positive badges and stat points — never the rule's own
        const gifts = giftsOf(d, FIRST_HERO)
        expect(gifts.map((g) => g.key)).toEqual(rolledOf(d).map((j) => j.key))
        expect(gifts.some((g) => g.badge !== undefined && FIRST_HERO.badges.includes(g.badge)), 'Leadership is not a gift').toBe(false)
        expect(gifts.some((g) => g.key === 'health'), 'the rule\'s Health is not a gift').toBe(false)
        expect(gifts.filter((g) => g.badge).length).toBeGreaterThanOrEqual(FIRST_HERO.positiveBadges)
        expect(gifts.filter((g) => !g.badge).length).toBeGreaterThanOrEqual(FIRST_HERO.statPoints)
      }
    }
  })

  it('the hero taken has exactly the gifts its card showed, and a run saved on the pick and opened again shows the same three cards', () => {
    for (const seed of [2, 11, 23, 41]) {
      const ctx = atFirstDraft(seed), c = ctx.campaign, html = draftScreen(c), cards = offersOn(html)
      // saved and opened again: the same three cards, gift for gift
      const again = draftScreen(campaignOf(saveOf(c)))
      expect(again, `seed ${seed}: the reopened run's draft`).toBe(html)
      for (const [take, card] of cards.entries()) {
        const run = atFirstDraft(seed), shown = giftsOn(card.html)!
        expect(shown, `seed ${seed}: ${card.id} lists its gifts`).not.toBeNull()
        performDraft(run, listDraftOffers(run.campaign)[take]!.id, 'test')
        const hero = run.campaign.roster[card.id]!
        expect(giftsOf(hero.drafted!, FIRST_HERO).map((g) => g.key).sort(), `seed ${seed}: ${card.id} joined with the gifts its card showed`).toEqual(shown.map((x) => x.of).sort())
        expect(hero.badges.slice(0, FIRST_HERO.badges.length)).toEqual([...FIRST_HERO.badges])
      }
    }
  })
})

describe('kingdom.first-hero-each-rolls-own-gifts — the word on the screens: Gifts', () => {
  it('each first-hero card lists ITS OWN gifts under the heading "Gifts": its random badges by name with their meaning, its random stat changes; the pick\'s line keeps only what is not rolled', () => {
    for (const seed of [1, 2, 3, 5, 8, 11, 13, 21, 34, 55]) {
      const c = atFirstDraft(seed).campaign, html = draftScreen(c), pick = pickLineOn(html)!
      // said once for the pick: what every first hero gets by rule — Leadership, and the rule's Health — and nothing rolled
      expect(pick.flatMap((p) => p.of).sort(), `seed ${seed}: the pick's line`).toEqual([...FIRST_HERO.badges.map((b) => `badge:${b}`), 'health'].sort())
      expect(pick.map((p) => p.words)).toEqual([...FIRST_HERO.badges.map(badgeLineOf), statLineOf('health')])
      for (const card of offersOn(html)) {
        const who = `seed ${seed}: ${card.id}`, d = draftedHeroOf(c, card.id).drafted!, shown = giftsOn(card.html)
        expect(shown, `${who}: a Gifts block`).not.toBeNull()
        expect(shown!.map((x) => x.of).sort(), `${who}: exactly its own gifts`).toEqual(rolledOf(d).map((j) => j.key).sort())
        for (const j of rolledOf(d)) {
          const line = shown!.find((x) => x.of === j.key)!
          if (j.badge) expect(line.words.startsWith(`${BADGES[j.badge]!.name} `), `${who}: ${j.badge} by name, with its meaning — "${line.words}"`).toBe(true)
          else expect(line.words, `${who}: ${j.key}`).toBe(`+${j.amount} ${statLabelOf(crucibleStatOf(j.stat!))}`)
        }
        // Leadership is on no card
        for (const b of FIRST_HERO.badges) expect(text(card.html).includes(BADGES[b]!.name!) || text(card.html).includes(badgeLineOf(b)), `${who}: ${b} is the pick's, not a gift`).toBe(false)
      }
    }
  })

  it('a later draft\'s cards say "Gifts" over the stat points and badges the Crucible rolled for each hero', () => {
    for (const seed of [3, 11, 21]) {
      const c = atSecondDraft(seed).campaign, html = draftScreen(c)
      expect(c.cursor.step).toBe('draft')
      expect(text(html), 'the draft says what the cards show, in his word').toMatch(/gifts/)
      expect(text(html)).not.toMatch(/modifier/i)
      for (const card of offersOn(html)) {
        const head = card.html.match(/<div class="gifts"[^>]*><h4 class="gifts-h">([^<]*)<\/h4>/)
        expect(head?.[1], `seed ${seed}: ${card.id}: the heading`).toBe('Gifts')
        // the rolled points and the badges stand under it
        expect(card.html.indexOf('<div class="rolls">')).toBeGreaterThan(card.html.indexOf('class="gifts-h"'))
        expect(card.html.indexOf('<div class="badges">')).toBeGreaterThan(card.html.indexOf('class="gifts-h"'))
      }
    }
  })

  it('the hero sheet — the roster\'s card — lists a drafted hero\'s gifts under "Gifts"; a hero that rolled none has no such block', () => {
    const ctx = atFirstDraft(11), offered = listDraftOffers(ctx.campaign)[0]!
    performDraft(ctx, offered.id, 'test')
    const c = ctx.campaign, hero = c.roster[offered.id]!, card = heroRosterCard(c, offered.id)
    const block = card.match(/<div class="gifts"[^>]*><h4 class="gifts-h">([^<]*)<\/h4>([\s\S]*?)<\/div><!--gifts-->/)
    expect(block?.[1], 'the hero sheet\'s heading').toBe('Gifts')
    const listed = [...block![2]!.matchAll(/data-own="([^"]+)"/g)].map((m) => m[1]!)
    expect(listed.sort()).toEqual(giftsOf(hero.drafted!, FIRST_HERO).map((g) => g.key).sort())
    for (const g of giftsOf(hero.drafted!, FIRST_HERO)) if (g.badge) expect(text(block![2]!)).toContain(BADGES[g.badge]!.name!)
    // a hero with no draft record (a civilian, a recruit) has no Gifts block
    const plain = structuredClone(hero); delete (plain as { drafted?: unknown }).drafted; c.roster[offered.id] = plain
    expect(heroRosterCard(c, offered.id)).not.toMatch(/class="gifts"/)
    expect(CRUCIBLE.favourable.length).toBeGreaterThan(0)
  })

  it('the page: a new run\'s first draft shows three cards each with its own gifts under "Gifts", and the hero taken joins with exactly those', () => {
    const out = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/each of the three first-hero cards listed its own gifts under "Gifts" \(\d+ gifts over the three\)/)
    expect(out).toMatch(/what every one of the three is given was said once, above the three \(2 plain lines, "Born leader" first — no stat table\)/)
  }, 600000)
})
