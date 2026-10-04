// kingdom.opening-draft-modifiers — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the opening run, audited'): "the first
// hero is chosen from 3, but no stats or badges shown, just a description." With 2026-09-28 'no Health minimum … the first
// hero gets Leadership and a random positive badge; the draft pick is weighted': "You get the leadership badge. You get a
// random positive badge. 25% chance of another positive badge. +2 health. One stat point from the Crucible's randomness, a
// 30% chance of another stat point." and 'the first hero: Leadership …; the draft offers three with the Crucible's
// modifiers': "You get your choice of one of three heroes. Those heroes had randomized modifiers applied to them, and
// typically you would pick the best one."
// Expect: "a new run offers three first heroes by description only; the chosen one enters the Orphanage with the Leadership
// badge, at least one more positive badge and +2 Health or more over its row; each later draft shows three heroes whose
// stats differ from their rows by their rolled modifiers, and the one picked keeps them in battle; closing and reopening
// the page shows the same heroes and modifiers".
//
// ONE RULE, ONE HOME (fix.opening-draft-one-rule, engine queue, 2026-10-04): the engine rolls its own test party by this
// rule (engine/src/content/opening-party.ts) and exports the two functions that roll a given hero; the run's draft CALLS
// them through src/engine.ts on the run's own stream, and src/core/draft-modifiers.ts rolls nothing itself (kingdom
// SWITCHES.md openingDraftRuleKingdomSide, answered). The first test here holds that: the kingdom's draft is the engine's
// function — and a run shows what it showed before the procedure moved (test/fixtures/opening-draft-one-rule.json).
// The page half is tools/opening-run-six.verify.mjs (test/opening-run-six.test.ts), on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import OPENING from '../../progression/OPENING-PARTY.json'
import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, listDraftOffers, draftedCountOf, draftsOwedOf, draftedHeroOf, firstHeroDraftedOf, handDraftedOf } from '../src/core/opening.js'
import { makeCtx, type Ctx } from '../src/core/mutate.js'
import { saveOf, campaignOf, type Hero } from '../src/core/campaign.js'
import { makeBattleState, fieldedPreviewOf } from '../src/core/seam.js'
import { loadoutOf } from '../src/core/loadout.js'
import { performAdvancePrep, performDeploy } from '../src/core/prep.js'
import { createSandbox } from '../src/core/sandbox.js'
import { playOpening } from '../src/sim/autoplay.js'
import { heroRowOf } from '../src/content/heroes.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { draftScreen } from '../src/ui/draft.js'
import { runOf, runSaveOf } from '../src/ui/opening-run.js'
import { BADGES, UNITS, encounterDef, openingHeroesOf, draftScoreOf, firstHeroDraftOf, draftHandOf } from '../src/engine.js'
import { makeRng, rootSeedOf, rollBelow, roll100 } from '../../engine/src/core/rng.js'

const FIRST = OPENING.firstHero, CRUCIBLE = OPENING.crucible, ROLL_SOURCE = OPENING.draftScore.rollSource
const LEADERSHIP = FIRST.badges[0]!
const FAVOURABLE = CRUCIBLE.badges.favourable.map((b) => b.id), FLAWED = CRUCIBLE.badges.flawed.map((b) => b.id)
const STAT_OF = CRUCIBLE.statOf as Record<string, string>
const engineStat = (word: string) => STAT_OF[word] ?? word
const ORPHANAGE = 'encounter.opening.orphanage'
const SEEDS = [1, 2, 3, 5, 11, 15, 21, 42]
type Drafted = NonNullable<Hero['drafted']>

/** A new run at its first draft. */
function atFirstDraft(seed: number): Ctx {
  const ctx = makeCtx(makeNewCampaign(seed))
  performAdvanceOpening(ctx, 'test')
  expect(ctx.campaign.cursor.step).toBe('draft')
  return ctx
}
/** …and at the draft after the first hero is taken (the first of the two before battle 2). */
function atSecondDraft(seed: number, take = 0): Ctx {
  const ctx = atFirstDraft(seed)
  performDraft(ctx, listDraftOffers(ctx.campaign)[take]!.id, 'test')
  ctx.campaign.cursor.prologue = 2
  performAdvanceOpening(ctx, 'test')
  expect(ctx.campaign.cursor.step).toBe('draft')
  return ctx
}
/** The numbers the battle fields a hero with — the engine's own preview over what the seam hands it. */
const fielded = (h: Hero) => fieldedPreviewOf(h).now as unknown as Record<string, number | undefined>
/** What a hero's draft should move each engine stat by: its rolled mods, and its rolled badges' own rows. */
function movedBy(d: Drafted): Record<string, number> {
  const out: Record<string, number> = {}
  for (const m of d.mods) out[m.stat] = (out[m.stat] ?? 0) + m.add
  for (const b of d.badges) for (const [stat, v] of Object.entries(BADGES[b]!.statModifiers ?? {})) out[stat] = (out[stat] ?? 0) + (v as number)
  return out
}
/** Each offer on the draft screen: its attributes and its words, tags stripped. */
function offersOn(html: string): { id: string; attrs: Record<string, string>; text: string }[] {
  return html.split(/<div class="opt(?: rolled)?"/).slice(1).map((chunk) => {
    const tag = chunk.slice(0, chunk.indexOf('>'))
    const attrs = Object.fromEntries([...tag.matchAll(/data-([\w-]+)="([^"]*)"/g)].map((m) => [m[1]!, m[2]!]))
    const body = chunk.slice(chunk.indexOf('>') + 1).split('<p class="meta">Not at the fire')[0]!
    return { id: attrs['id']!, attrs, text: body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }
  })
}

describe('kingdom.opening-draft-modifiers — the first hero by description, later drafts with the Crucible\'s modifiers', () => {
  // LAW 10 — rewritten 2026-10-04 by fix.opening-draft-one-rule, as the item says: "The parity test becomes a test that the
  // kingdom's draft is the engine's function." This read 'ONE RULE: on the engine's own stream the kingdom's procedure rolls
  // the engine's opening party — every badge, point and score' and held a SECOND copy of the procedure to the engine's,
  // replicate by replicate. The copy is gone; the claim it guarded — one rule — is now held three ways, each stronger than
  // parity: the kingdom's two functions return exactly what the engine's two return on the same dice; fed the engine's own
  // stream they still give the engine's opening party, every badge, point and score (the old assertion, kept whole); and
  // the file that used to hold the procedure throws no dice and reads no table.
  it('ONE RULE, ONE HOME: the kingdom\'s draft is the engine\'s function — the same rolls on the same dice, and on the engine\'s own stream the engine\'s opening party, every badge, point and score', () => {
    const baseOf = (id: string) => (stat: string) => ((UNITS[id] as unknown as Record<string, number | undefined>)[engineStat(stat)]) ?? 0
    const rollerOf = (replicate: number) => {
      const rng = makeRng(rootSeedOf(0, 0, replicate))
      return { below: (n: number, ...keys: number[]) => rollBelow(rng, n, 'draft', ...keys), d100: (...keys: number[]) => roll100(rng, 'draft', ...keys) }
    }
    /** the engine's rolls in the shape the run keeps them: the unit mods as a plain list */
    const kept = (d: { badges: readonly string[]; rolls: readonly unknown[]; mods: { stats?: readonly unknown[] }; unfielded: readonly unknown[] }) => ({ badges: d.badges, rolls: d.rolls, mods: d.mods.stats ?? [], unfielded: d.unfielded })
    for (let replicate = 1; replicate <= 60; replicate++) {
      const roller = rollerOf(replicate)
      const engine = openingHeroesOf(replicate, 6)
      const first = firstHeroDraftedOf(roller, baseOf(engine[0]!.id))
      // the kingdom's function is the engine's: the same dice, the same rolls
      expect(first, `replicate ${replicate}: the first hero is the engine's firstHeroDraftOf`).toEqual(kept(firstHeroDraftOf(rollerOf(replicate), baseOf(engine[0]!.id))))
      expect({ badges: first.badges, rolls: first.rolls, mods: first.mods, unfielded: first.unfielded }, `replicate ${replicate}: the first hero`)
        .toEqual({ badges: engine[0]!.badges, rolls: engine[0]!.rolls, mods: engine[0]!.mods.stats ?? [], unfielded: engine[0]!.unfielded })
      for (let ordinal = 1; ordinal < engine.length; ordinal++) {
        const taken = engine[ordinal]!, party = engine.slice(0, ordinal)
        const hand = handDraftedOf(roller, taken.offered.map(baseOf), ordinal, party.flatMap((h) => h.badges))
        expect(hand).toHaveLength(3)
        const scores = hand.map((d, j) => draftScoreOf(taken.offered[j]!, d.rolls, d.badges, party.map((h) => h.id)))
        expect(scores, `replicate ${replicate}, draft ${ordinal + 1}: every offer scores as the engine's`).toEqual(taken.scores)
        const mine = hand[taken.offered.indexOf(taken.id)]!
        expect({ badges: mine.badges, rolls: mine.rolls, mods: mine.mods, unfielded: mine.unfielded }, `replicate ${replicate}, draft ${ordinal + 1}: the one the engine took`)
          .toEqual({ badges: taken.badges, rolls: taken.rolls, mods: taken.mods.stats ?? [], unfielded: taken.unfielded })
      }
      // a hand on fresh dice: the kingdom's function returns exactly the engine's
      const offered = engine[1]!.offered, carried = engine[0]!.badges
      expect(handDraftedOf(rollerOf(replicate), offered.map(baseOf), 1, carried), `replicate ${replicate}: a hand is the engine's draftHandOf`)
        .toEqual(draftHandOf(rollerOf(replicate), offered.map(baseOf), 1, carried).map(kept))
    }
    // and the file that held the second copy holds none: no dice thrown, no table read
    const src = readFileSync('src/core/draft-modifiers.ts', 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
    expect(src).not.toMatch(/\.below\(|\.d100\(|statPool|modTypes|badgeCount|rarityWeight|content\/crucible/)
    expect(src).toMatch(/firstHeroDraftOf\(/); expect(src).toMatch(/draftHandOf\(/)
  })

  it('a run shows what it showed before the procedure moved: the same first-hero bonuses and the same later-draft offers for the same run seed (seed 11 is the page test\'s)', () => {
    const frozen = JSON.parse(readFileSync('test/fixtures/opening-draft-one-rule.json', 'utf8')) as { runs: { seed: number; first: unknown[]; second: unknown[] }[] }
    expect(frozen.runs.map((r) => r.seed)).toEqual(SEEDS)
    const handOf = (ctx: Ctx) => listDraftOffers(ctx.campaign).map((row) => { const h = draftedHeroOf(ctx.campaign, row.id); return { id: row.id, badges: h.badges, itemSlots: h.itemSlots, drafted: h.drafted } })
    for (const run of frozen.runs) {
      const first = atFirstDraft(run.seed)
      expect(JSON.parse(JSON.stringify(handOf(first))), `seed ${run.seed}: the three first heroes as each would join`).toEqual(run.first)
      const second = atSecondDraft(run.seed)
      expect(JSON.parse(JSON.stringify(handOf(second))), `seed ${run.seed}: the draft after it`).toEqual(run.second)
    }
  })

  it('the first hero gets Leadership, a positive badge (25%: another), +2 Health, a Crucible stat point (30%: another) — whichever of the three is taken', () => {
    let second = 0, extra = 0, runs = 0
    for (let seed = 1; seed <= 240; seed++) {
      const offers = listDraftOffers(atFirstDraft(seed).campaign).map((h) => h.id)
      expect(offers).toHaveLength(3)
      for (const [take, id] of offers.entries()) {
        if (seed > 12 && take > 0) continue   // every offer on the first seeds; one a seed after that, for the rates
        const ctx = atFirstDraft(seed)
        const offered = draftedHeroOf(ctx.campaign, id)
        performDraft(ctx, id, 'test')
        const h = ctx.campaign.roster[id]!, d = h.drafted!, row = heroRowOf(id), label = `seed ${seed}, ${id}`
        expect(h, `${label}: the hero joins as it was offered`).toEqual(offered)
        // the badges: Leadership, then one positive badge, or two — never a flawed one, never one twice
        expect(d.badges[0], label).toBe(LEADERSHIP)
        expect(d.badges.length === 2 || d.badges.length === 3, `${label}: one positive badge, or two — ${d.badges.join(', ')}`).toBe(true)
        for (const b of d.badges.slice(1)) expect(FAVOURABLE, `${label}: ${b} is a positive badge`).toContain(b)
        expect(new Set(d.badges).size, label).toBe(d.badges.length)
        expect(h.badges, `${label}: the badges are the hero's own`).toEqual(d.badges)
        // +2 Health by the rule, then one stat point, or two — gains only, in the stat's own step (a point of Health is 2 Health)
        expect(d.mods[0], label).toEqual({ stat: 'maxHp', add: FIRST.health, source: FIRST.healthSource })
        expect(d.rolls.length === 1 || d.rolls.length === 2, `${label}: one stat point, or two`).toBe(true)
        for (const r of d.rolls) {
          expect(CRUCIBLE.statPool, label).toContain(r.stat)
          expect(r.amount, `${label}: a point of ${r.stat}`).toBe((CRUCIBLE.statStep as Record<string, number>)[r.stat] ?? CRUCIBLE.statStep.default)
        }
        expect(new Set(d.rolls.map((r) => r.stat)).size, `${label}: never the same stat twice`).toBe(d.rolls.length)
        expect([...d.mods.slice(1).map((m) => ({ stat: m.stat, amount: m.add })), ...d.unfielded.map((r) => ({ stat: engineStat(r.stat), amount: r.amount }))].sort((a, b) => a.stat.localeCompare(b.stat)),
          `${label}: every point is fielded as a unit mod, or named as one the battle cannot take`).toEqual(d.rolls.map((r) => ({ stat: engineStat(r.stat), amount: r.amount })).sort((a, b) => a.stat.localeCompare(b.stat)))
        for (const m of d.mods.slice(1)) expect(m.source, label).toBe(ROLL_SOURCE)
        // fielded: exactly its row moved by the mods and the badges — so +2 Health or more over its row
        const now = fielded(h), bare = fielded(row), moved = movedBy(d)
        for (const stat of new Set([...Object.keys(moved), 'maxHp', 'armor', 'strength'])) expect((now[stat] ?? 0) - (bare[stat] ?? 0), `${label}: ${stat} over its row`).toBe(moved[stat] ?? 0)
        expect(now['maxHp']! - bare['maxHp']!, `${label}: +2 Health or more over its row`).toBeGreaterThanOrEqual(FIRST.health)
        // a point of Item Slots is the campaign's own: on the hero, and its gear still fits
        const slots = d.rolls.filter((r) => r.stat === 'itemSlots').reduce((s, r) => s + r.amount, 0) + d.badges.reduce((s, b) => s + ((CRUCIBLE.badges.favourable.find((x) => x.id === b)?.stats as Record<string, number> | undefined)?.['itemSlots'] ?? 0), 0)
        expect(h.itemSlots, `${label}: item slots`).toBe(row.itemSlots + slots)
        const l = loadoutOf(ctx.campaign, id)
        expect(l.itemSlots.used, `${label}: the kit fits`).toBeLessThanOrEqual(l.itemSlots.max)
        if (take === 0) { runs++; if (d.badges.length === 3) second++; if (d.rolls.length === 2) extra++ }
      }
    }
    // the chances are the ruled ones, on the run's own stream: about a quarter, about three in ten
    expect(second / runs, `a second positive badge on ${second} of ${runs} runs`).toBeGreaterThan(0.15)
    expect(second / runs).toBeLessThan(0.35)
    expect(extra / runs, `a second stat point on ${extra} of ${runs} runs`).toBeGreaterThan(0.2)
    expect(extra / runs).toBeLessThan(0.4)
  }, 120000)

  it('the first hero enters the Orphanage with its badges and its Health, and the draft says what it gave', () => {
    for (const seed of SEEDS) {
      const ctx = atFirstDraft(seed)
      const id = listDraftOffers(ctx.campaign)[0]!.id
      performDraft(ctx, id, 'test')
      const h = ctx.campaign.roster[id]!, d = h.drafted!
      // every mutation an event: the draft's line carries what the hero was drafted with
      const line = ctx.events.find((e) => e.type === 'hero.drafted')!
      expect(line['badges']).toEqual(d.badges)
      expect(line['rolls']).toEqual(d.rolls)
      // the battle, fielded as the run's page fields it: the campaign's own Hero row through the sandbox
      performFieldOpeningBattle(ctx, { id: ORPHANAGE, mapId: encounterDef(ORPHANAGE).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
      performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
      performDeploy(ctx, id, 'test')
      const e = ctx.campaign.cursor.engagement!
      const spec = makeBattleState(ctx.campaign.roster, e)
      expect(spec.heroBadges![0]).toEqual(d.badges.filter((b) => Object.hasOwn(BADGES, b)))
      for (const m of d.mods) expect(spec.heroMods![0]!.stats, `seed ${seed}: ${m.stat} is handed to the battle`).toContainEqual(m)
      const s = createSandbox({ mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((x) => structuredClone(ctx.campaign.roster[x]!)), enemies: [], seed: 1, encounterId: e.id })
      const unit = s.ctx.state.units.find((u) => u.typeId === h.unitType && u.side === 'hero')!
      expect(unit.badges, `seed ${seed}: Leadership in the battle`).toContain(LEADERSHIP)
      expect(unit.badges.filter((b) => FAVOURABLE.includes(b)).length, `seed ${seed}: at least one more positive badge in the battle`).toBeGreaterThanOrEqual(1)
      for (const b of d.badges) expect(unit.badges).toContain(b)
      expect(unit.maxHp, `seed ${seed}: its Health in the battle`).toBe(fielded(h)['maxHp'])
      expect(unit.maxHp).toBeGreaterThanOrEqual(fielded(heroRowOf(id))['maxHp']! + FIRST.health)
      expect(unit.hp).toBe(unit.maxHp)
    }
  })

  it('every later draft offers three with the Crucible\'s modifiers applied: stats that differ from the row by the rolls and badges, and the one picked keeps them', () => {
    // the Crucible's largest shape — two gains and a loss, say — bounds the points a hero rolls
    const most = Math.max(...CRUCIBLE.modTypes.map(([g, l]) => g! + l!))
    let losses = 0, flawed = 0, changed = 0, offers = 0
    for (const seed of SEEDS) for (const take of [0, 1, 2]) {
      const ctx = makeCtx(makeNewCampaign(seed))
      // Law 10, 2026-10-04 (kingdom.opening-draft-cadence; engine DECISIONS.md 2026-10-03 'one draft after every battle; …':
      // "One, yes."): was `n <= 5` — the old cadence had drafted all six before battle 5. One draft stands before every
      // battle now, the sixth before battle 6; 'six drafted' below is held as it was.
      for (let n = 1; n <= 6; n++) {
        ctx.campaign.cursor.prologue = n
        while (draftsOwedOf(ctx.campaign) > 0) {
          performAdvanceOpening(ctx, 'test')
          const c = ctx.campaign, ordinal = draftedCountOf(c), ids = listDraftOffers(c).map((h) => h.id), label = `seed ${seed}, taking ${take + 1}, draft ${ordinal + 1}`
          const hand = ids.map((id) => draftedHeroOf(c, id))
          if (ordinal > 0) {
            const carried = new Set(Object.values(c.roster).flatMap((h) => h.drafted?.badges ?? []))
            const signatures = hand.flatMap((h) => h.drafted!.badges.slice(0, 1))
            expect(new Set(signatures).size, `${label}: the hand's first badges are all different`).toBe(signatures.length)
            for (const b of signatures) expect(carried.has(b), `${label}: ${b} is not one the party already carries`).toBe(false)
            for (const [j, h] of hand.entries()) {
              const d = h.drafted!, row = heroRowOf(ids[j]!), who = `${label}, ${ids[j]}`
              offers++
              // the Crucible's shapes: so many gains and losses, one to three badges, good or flawed
              // (a point's sign is not its kind: a loss held at a floor above the row's own value comes out a gain — the engine's
              // own arithmetic, held by the ONE RULE test — so the shapes are counted, not signed)
              const lost = d.rolls.filter((r) => r.amount < 0).length
              expect(d.rolls.length, `${who}: no more points than the Crucible's largest shape`).toBeLessThanOrEqual(most)
              expect(new Set(d.rolls.map((r) => r.stat)).size, `${who}: never the same stat twice`).toBe(d.rolls.length)
              for (const r of d.rolls) {
                // a point is the stat's step up or down from the row's own value, held at the stat's floor
                const step = (CRUCIBLE.statStep as Record<string, number>)[r.stat] ?? CRUCIBLE.statStep.default, floor = (CRUCIBLE.statFloor as Record<string, number>)[r.stat] ?? CRUCIBLE.statFloor.default
                const base = r.stat === 'itemSlots' ? row.itemSlots : ((UNITS[row.unitType] as unknown as Record<string, number | undefined>)[engineStat(r.stat)] ?? 0)
                expect([Math.max(floor, base + step) - base, Math.max(floor, base - step) - base], `${who}: a point of ${r.stat} from ${base}`).toContain(r.amount)
              }
              expect(d.badges.length >= 1 && d.badges.length <= 3, `${who}: one to three badges`).toBe(true)
              for (const b of d.badges) expect([...FAVOURABLE, ...FLAWED], who).toContain(b)
              expect(d.badges, `${who}: never Leadership — that is the first hero's`).not.toContain(LEADERSHIP)
              for (const m of d.mods) expect(m.source, who).toBe(ROLL_SOURCE)
              // shown and fielded: the row moved by exactly the rolled mods and the rolled badges
              const now = fielded(h), bare = fielded(row), moved = movedBy(d)
              for (const stat of new Set([...Object.keys(moved), 'maxHp', 'armor', 'resist', 'strength', 'precision', 'accuracy', 'dodge', 'movement'])) expect((now[stat] ?? 0) - (bare[stat] ?? 0), `${who}: ${stat} against its row`).toBe(moved[stat] ?? 0)
              expect(h.badges).toEqual(d.badges)
              const l = Math.max(0, row.itemSlots + d.rolls.filter((r) => r.stat === 'itemSlots').reduce((s, r) => s + r.amount, 0) + d.badges.reduce((s, b) => s + (([...CRUCIBLE.badges.favourable, ...CRUCIBLE.badges.flawed].find((x) => x.id === b)?.stats as Record<string, number> | undefined)?.['itemSlots'] ?? 0), 0))
              expect(h.itemSlots, `${who}: item slots`).toBe(l)
              if (lost) losses++
              if (d.badges.some((b) => FLAWED.includes(b))) flawed++
              if (Object.values(moved).some((v) => v !== 0)) changed++
            }
          }
          const id = ids[take]!
          performDraft(ctx, id, 'test')
          expect(ctx.campaign.roster[id], `${label}: the one picked joins as it was offered`).toEqual(hand[take])
          for (const other of ids.filter((x) => x !== id)) expect(ctx.campaign.roster[other], `${label}: the others do not join`).toBeUndefined()
          const spec = makeBattleState(ctx.campaign.roster, { id: 'test.draft', mapId: 'map.open', enemies: [], deployed: [id], seed: 1 })
          for (const m of hand[take]!.drafted!.mods) expect(spec.heroMods![0]!.stats, `${label}: ${m.stat} is handed to the battle`).toContainEqual(m)
          const worn = loadoutOf(ctx.campaign, id)
          expect(worn.itemSlots.used, `${label}: the kit still fits its item slots`).toBeLessThanOrEqual(worn.itemSlots.max)
        }
      }
      expect(draftedCountOf(ctx.campaign), `seed ${seed}: six drafted`).toBe(6)
    }
    // the Crucible's randomness is not all good: minus points and flawed badges do come, and nearly every offer is moved
    expect(losses, 'offers with a minus stat point').toBeGreaterThan(0)
    expect(flawed, 'offers with a flawed badge').toBeGreaterThan(0)
    expect(changed / offers, `${changed} of ${offers} offers differ from their rows`).toBeGreaterThan(0.8)
  }, 120000)

  it('the rolls are the run\'s own: the same run shows the same heroes and modifiers, saved and reopened; another run, others', () => {
    const seen = new Set<string>()
    for (const seed of SEEDS) {
      const a = atSecondDraft(seed), b = atSecondDraft(seed)
      const offersOf = (ctx: Ctx) => listDraftOffers(ctx.campaign).map((h) => draftedHeroOf(ctx.campaign, h.id))
      expect(offersOf(a), `seed ${seed}: the same run, the same offers`).toEqual(offersOf(b))
      // closed and opened again at the draft: the Campaign's own save, and the run's browser save
      const reopened = campaignOf(saveOf(a.campaign)), run = runOf(runSaveOf(a.campaign, null)).campaign
      expect(reopened).toEqual(a.campaign)
      for (const c of [reopened, run]) {
        expect(listDraftOffers(c).map((h) => draftedHeroOf(c, h.id)), `seed ${seed}: reopened, the same heroes and modifiers`).toEqual(offersOf(a))
        expect(draftScreen(c)).toBe(draftScreen(a.campaign))
      }
      // the first hero's modifiers are in the save, on the hero
      const firstId = Object.keys(a.campaign.roster)[0]!
      expect(run.roster[firstId]!.drafted).toEqual(a.campaign.roster[firstId]!.drafted)
      expect(run.roster[firstId]!.drafted!.badges[0]).toBe(LEADERSHIP)
      seen.add(JSON.stringify(offersOf(a).map((h) => h.drafted)))
    }
    expect(seen.size, 'different runs roll different modifiers').toBeGreaterThan(SEEDS.length / 2)
    // no dice but the run's named streams
    for (const f of ['src/core/opening.ts', 'src/core/draft-modifiers.ts', 'src/ui/draft.ts']) expect(readFileSync(f, 'utf8'), f).not.toMatch(/Math\.random|Date\.now|new Date\(/)
  })

  it('the modifiers stay with the hero for the run: after the whole opening each drafted hero still holds what it was drafted with', () => {
    for (const seed of [3, 11]) {
      const ctx = playOpening(makeCtx(makeNewCampaign(seed)))
      const lines = ctx.events.filter((e) => e.type === 'hero.drafted')
      expect(lines).toHaveLength(6)
      for (const [n, line] of lines.entries()) {
        const h = ctx.campaign.roster[line['heroId'] as string]!
        expect(h.drafted, `seed ${seed}: ${h.id} keeps its draft`).toBeDefined()
        expect(h.drafted!.badges).toEqual(line['badges'])
        expect(h.drafted!.rolls).toEqual(line['rolls'])
        expect(h.drafted!.badges.includes(LEADERSHIP), `seed ${seed}: only the first hero leads`).toBe(n === 0)
        for (const b of h.drafted!.badges) expect(h.badges, `seed ${seed}: ${h.id} still carries ${b}`).toContain(b)
        const spec = makeBattleState(ctx.campaign.roster, { id: 'test.later', mapId: 'map.open', enemies: [], deployed: [h.id], seed: 1 })
        for (const m of h.drafted!.mods) expect(spec.heroMods![0]!.stats).toContainEqual(m)
      }
    }
  }, 120000)

  it('a hero with no draft on it — a civilian, a recruit, an older save — is fielded as before', () => {
    const row = heroRowOf('hero.base.warrior-iron')
    expect(row.drafted).toBeUndefined()
    const spec = makeBattleState({ a: row }, { id: 'test.bare', mapId: 'map.open', enemies: [], deployed: ['a'], seed: 1 })
    expect(spec.heroMods).toEqual([{}])
    expect(spec.heroBadges).toBeUndefined()
    const blank: Hero = { ...row, drafted: { badges: [], rolls: [], mods: [], unfielded: [] } }
    expect(fielded(row)['maxHp']).toBe(fieldedPreviewOf(blank).now.maxHp)
  })

  it('the first draft is shown by description only — no number, no badge, no kit; a later draft shows the stats, the points and the badges', () => {
    const codex = JSON.parse(readFileSync('../content/hbt-content.json', 'utf8')) as { heroes: { heroes: { id: string; backstory?: string }[] } }
    const backstoryOf = (id: string) => codex.heroes.heroes.find((h) => h.id === id)!.backstory!
    const badgeNames = [LEADERSHIP, ...FAVOURABLE, ...FLAWED].map((b) => BADGES[b]!.name!)
    for (const seed of SEEDS) {
      const first = atFirstDraft(seed)
      const html = draftScreen(first.campaign), shown = offersOn(html)
      expect(shown.map((o) => o.id)).toEqual(listDraftOffers(first.campaign).map((h) => h.id))
      expect(html).toContain('your first hero')
      for (const o of shown) {
        const row = heroRowOf(o.id)
        expect(o.text, `seed ${seed}: ${o.id} is named`).toContain(row.name)
        expect(o.text, `seed ${seed}: ${o.id} is described`).toContain(backstoryOf(o.id))
        expect(o.text, `seed ${seed}: ${o.id} — no number at all`).not.toMatch(/\d/)
        // (a hero may be NAMED as a badge is — the Hunter — so its own name is set aside first)
        for (const name of badgeNames) expect(o.text.replace(row.name, '').includes(name), `seed ${seed}: ${o.id} — no badge (${name})`).toBe(false)
        expect(o.text, `seed ${seed}: ${o.id} — no kit line`).not.toMatch(/carries/i)
        expect(Object.keys(o.attrs).sort(), `seed ${seed}: ${o.id} carries nothing but who it is`).toEqual(['act', 'classes', 'id'])
      }
      const later = atSecondDraft(seed), c = later.campaign
      const shownLater = offersOn(draftScreen(c))
      expect(draftScreen(c)).toContain('hero 2 of six')
      expect(shownLater).toHaveLength(3)
      for (const o of shownLater) {
        const h = draftedHeroOf(c, o.id), d = h.drafted!, now = fielded(h), who = `seed ${seed}: ${o.id}`
        expect(o.attrs['badges'], who).toBe(d.badges.join(','))
        expect(o.attrs['rolls'], who).toBe(d.rolls.map((r) => `${r.stat}:${r.amount}`).join(','))
        const stats = Object.fromEntries(o.attrs['stats']!.split(',').map((p) => { const [k, v] = p.split(':'); return [k!, Number(v)] }))
        for (const need of ['maxHp', 'strength', 'precision', 'magic', 'spirit', 'accuracy', 'dodge', 'armor', 'resist', 'movement', 'reach', 'maxStamina', 'itemSlots']) expect(Object.keys(stats), `${who}: ${need} is shown`).toContain(need)
        for (const [stat, v] of Object.entries(stats)) expect(v, `${who}: ${stat} as the battle would field it`).toBe(stat === 'itemSlots' ? h.itemSlots : now[stat] ?? 0)
        expect(o.text, `${who}: its Health in words`).toMatch(new RegExp(`Health (?:[+-]\\d+ )?${now['maxHp']}\\b`))
        for (const b of d.badges) expect(o.text, `${who}: ${b} is named`).toContain(BADGES[b]!.name!)
      }
    }
  })
})
