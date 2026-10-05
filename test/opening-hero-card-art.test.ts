// kingdom.opening-hero-card-art — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'every draft card shows the hero's card
// art; …': "Card art for heroes 2 and 3 didn't come through when I was selecting heroes for the battle. Card art should be
// present when you're drafting, both the first time and the next ones."; and 'card art on the level-up and reward screens;
// …': "Card art not showing in the level-up screen.").
//
// Expect: "… the first draft shows three cards each with its hero's card art and description and no number; every later
// draft's three cards show their art; the Equip screen and the Who-goes page show art for every hero of a six-hero party;
// the page test asserts an image on every draft card and on every hero card at Equip, and a test asserts all 24 base
// heroes have a portrait or are named in heroesMissing. The level-up screen and the victory screen show the art of a hero
// from the new pool; the page test asserts an image for every hero on each."
//
// Two halves. (1) The portraits: tools/prep-heroes.py made them for the hero('…') literals in src/content/heroes.ts — the
// old five-hero pool — and kingdom.opening-draft-pool replaced those with the pack's rows; the tool now asks the kingdom's
// own registry who the pool is. Held here against what it wrote (generated/art/index.json). (2) The screens: every screen
// that shows a hero's card or face shows that hero's OWN portrait — the draft (first and later), the Who-goes page, Equip,
// the victory screen, the rewards screen and who carries a reward, the level-up screen — and a hero with no portrait shows
// a blank card, never another's. Held here on the screens' own HTML with a stand-in portrait per hero; the page half is
// tools/opening-run-six.verify.mjs (test/opening-run-six.test.ts), on the built BATTLE-SANDBOX.html with the real ones.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'

// the page's art is a build-time constant (__ART__, tools/build-sandbox.mjs); here it is a stand-in filled in below
vi.hoisted(() => { (globalThis as unknown as { __ART__: unknown }).__ART__ = { heroes: {}, data: {} } })

import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, listDraftOffers, draftsOwedOf, draftedCountOf, performOpeningDeploy, listOpeningParty } from '../src/core/opening.js'
import { makeCtx, setBattleOutcome, type Ctx } from '../src/core/mutate.js'
import { performAdvancePrep, performDeploy } from '../src/core/prep.js'
import { createSandbox, sandboxResult } from '../src/core/sandbox.js'
import { resolveReckoning, applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { listRewardTakers } from '../src/core/rewards.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { HERO_POOL, CIVILIANS, RESCUABLE_CIVILIANS, baseHeroIdsOf } from '../src/content/heroes.js'
import { ART, portraitOf } from '../src/ui/art.js'
import { draftScreen } from '../src/ui/draft.js'
import { deployPage } from '../src/ui/deploy.js'
import { equipPage } from '../src/ui/equip.js'
import * as AFTER from '../src/ui/after.js'
import { runBattle, encounterDef } from '../src/engine.js'

const SECTIONS = ABBOTOWN_MAP.sections.map((s) => s.encounterId)
const SWORD = 'item.longsword.flaming'
/** the five heroes of the pool before kingdom.opening-draft-pool — the only ones with a portrait until this item */
const OLD_FIVE = ['hero.base.paladin-shiney', 'hero.base.priest-armored', 'hero.base.priest-scantily', 'hero.base.ranger-aggressive', 'hero.base.warrior-iron']

// a stand-in portrait per hero the kingdom can show: its own file, its own bytes
const fileOf = (id: string) => `hero-${id.split('.').pop()}.jpg`
const uriOf = (id: string) => `data:image/jpeg;base64,${Buffer.from('portrait of ' + id).toString('base64')}`
const art = ART as unknown as { heroes: Record<string, string>; data: Record<string, string> }
for (const h of [...HERO_POOL, ...CIVILIANS, ...RESCUABLE_CIVILIANS]) { art.heroes[h.id] = fileOf(h.id); art.data[fileOf(h.id)] = uriOf(h.id) }

/**
 * the opening battle before which the cadence has drafted `heroes`: one before every battle, to six.
 * Law 10, 2026-10-04 (kingdom.opening-draft-cadence; engine DECISIONS.md 2026-10-03 'one draft after every battle; …': "We're only supposed to have one draft between battles 1 and 2. I was getting two drafts." · "One, yes."): this read
 *   const BATTLE_OF: Record<number, number> = { 1: 1, 3: 2, 4: 3, 5: 4, 6: 5 }
 * — the 2026-08-23 cadence (two drafts after battle 1) the ruling replaces. A party of N now stands before battle N.
 */
const BATTLE_OF: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 }
/** A run with `heroes` drafted, standing on the map before the battle the cadence brings them to. `pick`: which offer. */
function partyOf(seed: number, heroes: number, pick: (offers: readonly { id: string }[]) => string = (o) => o[0]!.id): Ctx {
  const ctx = makeCtx(makeNewCampaign(seed))
  ctx.campaign.cursor.prologue = BATTLE_OF[heroes]!
  for (let guard = 0; draftsOwedOf(ctx.campaign) > 0 && guard < 8; guard++) {
    performAdvanceOpening(ctx, 'test')
    performDraft(ctx, pick(listDraftOffers(ctx.campaign)), 'test')
  }
  expect(draftedCountOf(ctx.campaign)).toBe(heroes)
  return ctx
}
function field(ctx: Ctx): void {
  const id = SECTIONS[ctx.campaign.cursor.prologue! - 1]!
  performFieldOpeningBattle(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
}
/** every block of `html` opened by `<div class="<cls>…"` up to the next one (or the end) — one per card */
function blocks(html: string, open: RegExp): string[] {
  const at = [...html.matchAll(open)].map((m) => m.index!)
  return at.map((from, i) => html.slice(from, at[i + 1] ?? html.length))
}
const textOf = (html: string) => html.replace(/<[^>]*>/g, ' ')
const imagesIn = (html: string) => [...html.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/g)].map((m) => m[1]!)
const idOf = (block: string, attr = 'data-id') => block.match(new RegExp(`${attr}="([^"]+)"`))![1]!

describe('kingdom.opening-hero-card-art — the portraits', () => {
  const index = existsSync('generated/art/index.json') ? JSON.parse(readFileSync('generated/art/index.json', 'utf8')) as { files: Record<string, { w: number; h: number; bytes: number }>; heroes: Record<string, string>; heroesMissing: string[] } : null

  it('all 24 base heroes have a portrait or are named in heroesMissing — never both, never neither', () => {
    expect(index).not.toBeNull()
    const base = baseHeroIdsOf()
    expect(base.length).toBe(24)
    for (const id of base) {
      const has = id in index!.heroes, missing = index!.heroesMissing.includes(id)
      expect([id, has !== missing], `${id}: a portrait, or named as missing`).toEqual([id, true])
    }
    // the pool the draft offers from is all of them (none is left out for want of a kit today)
    expect(HERO_POOL.map((h) => h.id).sort()).toEqual(base)
  })

  it('the civilians the kingdom rescues are covered the same way: a portrait, or named in heroesMissing', () => {
    for (const h of [...CIVILIANS, ...RESCUABLE_CIVILIANS]) {
      const has = h.id in index!.heroes, missing = index!.heroesMissing.includes(h.id)
      expect([h.id, has !== missing], `${h.id}: a portrait, or named as missing`).toEqual([h.id, true])
    }
  })

  it('a portrait is the hero\'s own file — a 2:3 card on disk, no two heroes sharing one; a hero named as missing has none', () => {
    const files = Object.values(index!.heroes)
    expect(new Set(files).size, 'no two heroes share a portrait').toBe(files.length)
    for (const [id, file] of Object.entries(index!.heroes)) {
      expect(file, `${id}'s portrait is its own`).toBe(fileOf(id))
      expect(existsSync(`generated/art/${file}`), `${file} is on disk`).toBe(true)
      expect([index!.files[file]?.w, index!.files[file]?.h], `${file} is the 2:3 card`).toEqual([320, 480])
    }
    for (const id of index!.heroesMissing) expect(id in index!.heroes, `${id}: named as missing, so no portrait`).toBe(false)
  })

  it('a hero is named as missing only when its art is not on disk: the codex gives it none, or the file is not there', () => {
    const codex = JSON.parse(readFileSync('../content/hbt-content.json', 'utf8')) as { heroes: { heroes: { id: string; art?: string | null }[] } }
    const artOf = Object.fromEntries(codex.heroes.heroes.map((h) => [h.id, h.art ?? null]))
    for (const id of index!.heroesMissing) expect(artOf[id] && existsSync(`../${artOf[id]}`) ? `${id}: its art is on disk at ${artOf[id]}` : null, `${id} is named as missing`).toBeNull()
  })
})

describe('kingdom.opening-hero-card-art — every screen that shows a hero shows its own card art', () => {
  it('the stand-in: every hero of the pool and every civilian has its own portrait here', () => {
    for (const h of [...HERO_POOL, ...RESCUABLE_CIVILIANS]) expect(portraitOf(h.id)).toBe(uriOf(h.id))
    expect(new Set(HERO_POOL.map((h) => portraitOf(h.id))).size).toBe(24)
  })

  // Law 10, 2026-10-05 (kingdom.first-hero-own-positives-negatives; engine/DECISIONS.md 2026-10-05 'the playtest post
  // answered: …, the first hero's own positives and negatives' — Andrew: "It should show its positives and negatives compared to a
  // standard hero of that type. It should say one line about what it is, like a ranger, and then … just about the positives and
  // negatives it has, stats, and badges." — "This replaces 2026-10-03's 'no stats or badges shown, just a description'".) This test
  // held each first-draft card as "stat-less — no number at all". The card now lists its own differences from its class's
  // standard hero, which are numbers, so that line is rewritten as the rule now stands: no number BUT those. The art, the name,
  // nothing carried as data and no kit: as they were.
  it('the first draft: three cards, each its hero\'s card art with the name, class and description — no number but its own differences from its class\'s standard, no kit', () => {
    for (const seed of [5, 11, 15]) {
      const ctx = makeCtx(makeNewCampaign(seed))
      performAdvanceOpening(ctx, 'test')
      const offers = listDraftOffers(ctx.campaign)
      const cards = blocks(draftScreen(ctx.campaign), /<div class="opt[^"]*" data-act="draft"/g)
      expect(cards.length).toBe(3)
      for (const [i, card] of cards.entries()) {
        const id = idOf(card)
        expect(id).toBe(offers[i]!.id)
        expect(imagesIn(card), `seed ${seed}: ${id}'s card shows its own art, once`).toEqual([uriOf(id)])
        expect(textOf(card), `seed ${seed}: ${id} is named`).toContain(offers[i]!.name)
        expect(textOf(card.replace(/<ul class="own"[^>]*>[\s\S]*?<\/ul>|<p class="own same"[^>]*>[\s\S]*?<\/p>/g, ' ')), `seed ${seed}: ${id}: no number but its own differences`).not.toMatch(/\d/)
        expect(card, `seed ${seed}: ${id} carries no stats, badges or rolls`).not.toMatch(/data-(stats|badges|rolls)=/)
        expect(textOf(card)).not.toMatch(/carries/i)
      }
    }
  })

  it('every later draft: three cards, each its hero\'s card art with what it already shows — its stats, rolled points and badges', () => {
    for (const heroes of [1, 2, 3, 4, 5]) {
      // the next battle's draft: stand on the map before it and open the draft
      const next = partyOf(11, heroes)
      next.campaign.cursor.prologue = next.campaign.cursor.prologue! + 1
      expect(draftsOwedOf(next.campaign), `after ${heroes}: a draft is owed before the next battle`).toBeGreaterThan(0)
      performAdvanceOpening(next, 'test')
      expect(next.campaign.cursor.step).toBe('draft')
      const cards = blocks(draftScreen(next.campaign), /<div class="opt[^"]*" data-act="draft"/g)
      expect(cards.length, `after ${heroes}: three offered`).toBe(3)
      for (const card of cards) {
        const id = idOf(card)
        expect(imagesIn(card), `after ${heroes}: ${id}'s card shows its own art, once`).toEqual([uriOf(id)])
        expect(card, `after ${heroes}: ${id} still shows its stats, rolled points and badges`).toMatch(/data-stats="[^"]+"/)
        expect(card).toMatch(/data-rolls="/); expect(card).toMatch(/data-badges="/)
      }
    }
  })

  it('a hero with no portrait shows a blank card on the draft — never another hero\'s art', () => {
    const ctx = makeCtx(makeNewCampaign(11))
    performAdvanceOpening(ctx, 'test')
    const offers = listDraftOffers(ctx.campaign), gone = offers[1]!.id, kept = art.heroes[gone]!
    delete art.heroes[gone]
    try {
      const cards = blocks(draftScreen(ctx.campaign), /<div class="opt[^"]*" data-act="draft"/g)
      for (const card of cards) {
        const id = idOf(card)
        if (id === gone) { expect(imagesIn(card), `${id} has no portrait: no image`).toEqual([]); expect(card, `${id}: a blank card`).toContain('class="noart"') }
        else expect(imagesIn(card), `${id} keeps its own`).toEqual([uriOf(id)])
      }
    } finally { art.heroes[gone] = kept }
  })

  it('the Who-goes page shows the art of every hero of a six-hero party, and Equip the art of every hero sent', () => {
    const ctx = partyOf(11, 6), c = ctx.campaign
    field(ctx)
    expect(performOpeningDeploy(ctx, 'test'), 'six free to fight: the run asks who goes').toBe(true)
    const party = listOpeningParty(c)
    expect(party.length).toBe(6)
    const cards = blocks(deployPage(c), /<div class="deploycard/g)
    expect(cards.map((card) => idOf(card, 'data-hero'))).toEqual(party)
    for (const card of cards) { const id = idOf(card, 'data-hero'); expect(imagesIn(card), `Who goes: ${id}'s card shows its own art`).toEqual([uriOf(id)]) }
    const sent = party.slice(-4)
    for (const h of sent) performDeploy(ctx, h, 'test')
    performAdvancePrep(ctx, 'test')
    expect(c.cursor.prepStep).toBe('equip')
    const equip = blocks(equipPage(c, sent, { where: 'prep', picked: null }), /<div class="herocard/g)
    expect(equip.length).toBe(4)
    for (const [i, card] of equip.entries()) expect(imagesIn(card), `Equip: ${sent[i]}'s card shows its own art`).toEqual([uriOf(sent[i]!)])
  })

  /** A new Campaign whose first hero is of the NEW pool, through a won Orphanage, at the reckoning. */
  function afterOrphanage() {
    for (let seed = 1; seed <= 40; seed++) {
      const ctx = makeCtx(makeNewCampaign(seed))
      performAdvanceOpening(ctx, 'test')
      const hero = listDraftOffers(ctx.campaign).find((h) => !OLD_FIVE.includes(h.id))!.id
      performDraft(ctx, hero, 'test')
      field(ctx)
      performOpeningDeploy(ctx, 'test'); performAdvancePrep(ctx, 'test')
      expect(ctx.campaign.cursor.step).toBe('battle')
      const e = ctx.campaign.cursor.engagement!
      for (let battle = 1; battle <= 12; battle++) {
        const s = createSandbox({ mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((id) => structuredClone(ctx.campaign.roster[id]!)), enemies: [], seed: battle, encounterId: e.id })
        runBattle(s.ctx)
        const r = sandboxResult(s)
        if (r.outcome !== 'heroClear') continue
        const k = resolveReckoning(ctx.campaign, e, r)
        setBattleOutcome(ctx, r, k, 'test'); applyBattleResult(ctx, e, r, k)
        return { ctx, hero, last: { engagementId: e.id, result: r, reckoning: k } }
      }
    }
    throw new Error('no run of seeds 1 to 40 wins the Orphanage with a hero of the new pool')
  }

  it('the victory screen, the rewards screen and the level-up screen show the art of a hero from the new pool', () => {
    const { ctx, hero, last } = afterOrphanage(), c = ctx.campaign
    expect(OLD_FIVE).not.toContain(hero)
    expect(c.cursor.step).toBe('reckoning')
    const recap = AFTER.recapScreen(c, ctx.events, last)
    const faces = blocks(recap, /<div class="party-portrait/g)
    expect(faces.length, 'the victory screen: a face per hero who fought').toBe(1)
    expect(imagesIn(faces[0]!.slice(0, faces[0]!.indexOf('party-name'))), 'the victory screen: the hero\'s own art').toEqual([uriOf(hero)])
    expect(imagesIn(recap.slice(recap.indexOf('spotlight-frame'), recap.indexOf('hero-quote'))), 'the victory screen\'s spotlight: the hero\'s own art').toEqual([uriOf(hero)])
    performExitBattle(ctx, 'test')
    expect(['rewards', 'levelUp']).toContain(c.cursor.step)
    const rewards = AFTER.rewardsScreen(c, ctx.events, last)
    const cards = blocks(rewards, /<div class="hero-card[ "]/g)
    expect(cards.map((card) => idOf(card, 'data-hero'))).toEqual([hero])
    expect(cards[0], 'the rewards screen: the hero\'s own art').toContain(`<div class="hero-portrait" style="background-image:url(${uriOf(hero)})"`)
    const sheet = AFTER.levelUpScreen(c, hero, 'rewards', { specialtyOwed: true })
    expect(imagesIn(sheet.slice(sheet.indexOf('lu-portrait'), sheet.indexOf('hero-info'))), 'the level-up screen: the hero\'s own art, before and after').toEqual([uriOf(hero), uriOf(hero)])
  })

  it('who carries a reward: each hero who may carry it is shown with its own art', () => {
    const carrierChoice = (AFTER as unknown as { carrierChoice?: (c: Ctx['campaign'], itemId: string) => string }).carrierChoice
    expect(typeof carrierChoice, 'ui/after.ts carrierChoice — the rewards screen\'s carrier').toBe('function')
    let seen = 0
    for (let seed = 1; seed <= 30 && seen < 2; seed++) {
      // Law 10, 2026-10-04 (kingdom.opening-draft-cadence): was partyOf(seed, 3) — the party of three the old cadence brought
      // to the Lumberjack House. Two heroes stand there now; the carrier screen is held the same way, of that party
      const ctx = partyOf(seed, 2), c = ctx.campaign
      field(ctx)   // the Lumberjack House: its row offers the Flaming Longsword to a Warrior or a Paladin
      const takers = listRewardTakers(c, SWORD)
      if (!takers.length) continue
      seen++
      const html = carrierChoice!(c, SWORD)
      const buttons = blocks(html, /<button[^>]*data-act="give"/g)
      expect(buttons.map((b) => idOf(b))).toEqual(takers)
      for (const b of buttons) { const id = idOf(b); expect(imagesIn(b), `seed ${seed}: ${id} is shown with its own art`).toEqual([uriOf(id)]); expect(textOf(b)).toContain(c.roster[id]!.name) }
    }
    expect(seen, 'a party with somebody to carry the sword was found').toBeGreaterThan(0)
  })
})
