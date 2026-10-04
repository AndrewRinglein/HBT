// The opening — GAME-ARCHITECTURE.md §2.5 "The Prologue — a reveal schedule,
// not a mode": a normal Campaign, Week 0, that begins with the player's first
// act — a stat-less draft of one hero from three — and runs the five authored
// battles (content/prologue.ts) straight into Combat Prep, drafting between
// them at the ruled cadence (one before battle 1, one more after each battle until six
// drafted heroes — content/prologue.ts DRAFT_CADENCE, kingdom.opening-draft-cadence —
// one of each class: the pool is the 24 base heroes, kingdom.opening-draft-pool),
// until the Kingdom Territory and the square outside it are taken. Then the
// Week machine takes over at Week 1.
//
// "Losing a battle before the Kingdom Territory is taken ends the Campaign
// and starts a new one." (Andrew, 2026-08-23) — the last mandatory-win battle
// in the game. permanent death: performEndCampaign, then a fresh
// makeNewCampaign. Nothing here is a canX() gate on a reveal (C7): the opening
// is authored state — an empty roster, a fixed battle list — never a tutorial
// flag.

import type { CampaignState, Engagement, Hero, HeroId } from './campaign.js'
import { makeCampaign } from './campaign.js'
import { type Ctx, engagementOf, setCursor, setDraftOffer, applyDraft, applyRescue, setEnded } from './mutate.js'
import { pickOf, rollBelowOf } from './rng.js'
import { firstHeroDraftedOf, handDraftedOf, type Roller, type BaseOf, type Drafted } from './draft-modifiers.js'
import { UNITS } from '../engine.js'
import { crucibleBadgeOf, crucibleStatOf } from '../content/crucible.js'
import { beginCombatPrep, prepStepOf, performAdvancePrep, performDeploy, listDeployable, deployLimitOf } from './prep.js'
import { beginWeek } from './week.js'
import { listTerritories } from './map.js'
import { tickAssignments } from './assignments.js'
import { CLASSES, groupOf } from '../content/classes.js'
import { HERO_POOL, CIVILIANS, RESCUABLE_CIVILIANS, heroRowOf, assertKitted, type HeroRow } from '../content/heroes.js'
import type { EngagementResult } from './seam.js'
import { PROLOGUE, DRAFT_CADENCE, DRAFT_OFFER, type PrologueRow } from '../content/prologue.js'
import { TERRITORIES, REALM } from '../content/territories.js'
import { CURRENCIES } from '../content/currencies.js'
import { CUPS, CUP_IDS } from '../content/cups.js'
import { STAGES } from '../content/stages.js'

/** A Campaign from nothing: Week 0, the realm's map with nothing held, an empty roster, the first draft on offer. */
export function makeNewCampaign(seed: number): CampaignState {
  const c = makeCampaign(seed, {
    realm: REALM,
    stage: STAGES[0]!.id,
    currencies: CURRENCIES.map((x) => x.id),
    cups: CUPS.map((x) => x.id),
    // the map is the realm's, but nothing is held yet — the opening takes the Kingdom Territory
    // the row's art placement (hex) is the page's, not the state's
    territories: TERRITORIES.map(({ hex: _hex, ...t }) => ({ ...t, owned: false, claimedOnce: false, buildings: t.buildings.map((b) => ({ ...b, nodes: [...b.nodes] })) })),
    roster: [],
    week: 0,
  })
  c.cursor.prologue = 1
  return c
}

/** How many of the hero group have been drafted or otherwise joined — the cadence counts these. */
export function draftedCountOf(campaign: CampaignState): number {
  return Object.values(campaign.roster).filter((h) => groupOf(h.classes) === 'hero').length
}

/** Drafts still owed before the next prologue battle, by the ruled cadence. */
export function draftsOwedOf(campaign: CampaignState): number {
  const n = campaign.cursor.prologue
  if (n === null) return 0
  const have = draftedCountOf(campaign)
  // the cadence's row: its `first` before battle 1, then its `afterEach` more for every battle won (the cursor's battle
  // number less one), capped at its `until` — a party of 1, 2, 3, 4, 5, 6 at battles 1 to 6 as the row stands
  // (kingdom.opening-draft-cadence, 2026-10-03; until then the row gave two after battle 1 — 1, 3, 4, 5, 6, 6)
  // …and never more than the pool holds — the Eve 24 since kingdom.opening-draft-pool (2026-10-03), so the cap is the cadence's six
  const cap = Math.min(DRAFT_CADENCE.until, HERO_POOL.filter((h) => groupOf(h.classes) === 'hero').length)
  const target = Math.min(cap, DRAFT_CADENCE.first + (n - 1) * DRAFT_CADENCE.afterEach)
  return Math.max(0, target - have)
}

/**
 * kingdom.opening-run-six: how many of the opening's battles are won — the cursor's battle number less one (a won battle
 * moves the cursor on; a lost one, replayed, does not — performResolvePrologue). A reopened run's map takes that many
 * sections from its start.
 */
export function openingBattlesWonOf(campaign: CampaignState): number {
  if (campaign.cursor.prologue === null) throw new Error('openingBattlesWonOf refused: the opening is done')
  return campaign.cursor.prologue - 1
}

export function isOpeningDone(campaign: CampaignState): boolean {
  return campaign.cursor.prologue === null
}

/**
 * The three on offer: hero-group rows not yet on the roster, drawn on cup.reveal keyed by the draft's ordinal — the bare
 * rows, who they are. What each would JOIN as — the first hero's bonuses, a later draft's rolled modifiers — is
 * draftedHeroOf (kingdom.opening-draft-modifiers).
 */
export function listDraftOffers(campaign: CampaignState): HeroRow[] {
  return (campaign.cursor.draftOffer ?? []).map(heroRowOf)
}

// ---------- the draft's modifiers (kingdom.opening-draft-modifiers, 2026-10-03) ----------
// Ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the opening run, audited'): "the first hero is chosen from 3, but no
// stats or badges shown, just a description." Its modifiers stand (2026-09-28 'no Health minimum … the first hero gets
// Leadership and a random positive badge'): "You get the leadership badge. You get a random positive badge. 25% chance of
// another positive badge. +2 health. One stat point from the Crucible's randomness, a 30% chance of another stat point."
// Every later draft (2026-09-28 'the first hero: Leadership …; the draft offers three with the Crucible's modifiers'):
// "You get your choice of one of three heroes. Those heroes had randomized modifiers applied to them, and typically you
// would pick the best one."
//
// Nothing is stored for an offer: what each offered hero would join as is DERIVED from the Campaign — the draft's
// ordinal, the offer's place in the hand, the badges the party already carries — on the run's own stream (cup.reveal, the
// cup the offer itself is drawn on, under its own keys). So a run saved at a draft and reopened shows the same three
// heroes with the same modifiers, and the hero that joins is the hero that was shown. Once taken, the modifiers are
// WRITTEN on the hero (hero.drafted, hero.badges, hero.itemSlots) and never rolled again.

/** The run's dice for a draft's modifiers: cup.reveal, keyed by what the roll is. */
function draftRollerOf(campaign: CampaignState): Roller {
  const below = (n: number, keys: readonly number[]) => rollBelowOf(campaign, CUP_IDS.reveal, ['draft', 'modifiers', ...keys], n)
  return { below: (n, ...keys) => below(n, keys), d100: (...keys) => below(100, keys) + 1 }
}

/**
 * A pool row's own value of a stat, in the Crucible's word: its engine row's number (the Crucible's `health` is the
 * row's maxHp), or — Item Slots, the campaign's own quantity the engine row does not carry — the hero row's.
 */
function draftBaseOf(row: HeroRow): BaseOf {
  const unit = UNITS[row.unitType] as unknown as Readonly<Record<string, unknown>> | undefined
  return (stat) => {
    if (stat === 'itemSlots') return row.itemSlots
    const v = unit?.[crucibleStatOf(stat)]
    return typeof v === 'number' ? v : 0
  }
}

/** The badges the party was drafted with — a hand's first badges are never one of these. */
function draftedBadgesOf(campaign: CampaignState): string[] {
  return Object.keys(campaign.roster).sort().flatMap((id) => campaign.roster[id]!.drafted?.badges ?? [])
}

/** A pool row as it joins with what the draft gave it: the badges on its list, its item slots moved by a rolled point or badge, the record kept. */
function heroWithDraft(row: HeroRow, drafted: Drafted): Hero {
  const slots = drafted.rolls.filter((r) => r.stat === 'itemSlots').reduce((s, r) => s + r.amount, 0)
    + drafted.badges.reduce((s, b) => s + (crucibleBadgeOf(b)?.stats['itemSlots'] ?? 0), 0)
  return { ...row, classes: [...row.classes], equipped: [...row.equipped], badges: [...row.badges, ...drafted.badges], itemSlots: Math.max(0, row.itemSlots + slots), drafted }
}

/**
 * The hero on offer AS IT WOULD JOIN: its row with the draft's modifiers applied. The first hero's are the ruled bonuses
 * (Leadership, a positive badge and the chance of another, +2 Health, a Crucible stat point and the chance of another) —
 * the same whichever of the three is taken, and never shown before the pick. A later draft's are the Crucible's, rolled
 * per offered hero — these the player sees, to pick the best. Refused when the hero is not on offer.
 */
export function draftedHeroOf(campaign: CampaignState, heroId: HeroId): Hero {
  const offer = campaign.cursor.draftOffer ?? []
  const j = offer.indexOf(heroId)
  if (campaign.cursor.step !== 'draft' || j < 0) throw new Error(`draftedHeroOf refused: '${heroId}' is not on offer at step '${campaign.cursor.step}' — ${offer.join(', ') || 'nothing is'}`)
  const rows = offer.map(heroRowOf), ordinal = draftedCountOf(campaign), roller = draftRollerOf(campaign)
  const drafted = ordinal === 0
    ? firstHeroDraftedOf(roller, draftBaseOf(rows[j]!))
    : handDraftedOf(roller, rows.map(draftBaseOf), ordinal, draftedBadgesOf(campaign))[j]!
  return heroWithDraft(rows[j]!, drafted)
}

// the procedure itself, for the check that holds it to the engine's (test/opening-draft-modifiers.test.ts)
export { firstHeroDraftedOf, handDraftedOf }
export type { Roller, BaseOf, Drafted }

export function canDraft(campaign: CampaignState, heroId: HeroId): boolean {
  return campaign.cursor.step === 'draft' && (campaign.cursor.draftOffer ?? []).includes(heroId)
}

/**
 * Rows the next draft may offer: not on the roster, and — until every hero class has been drafted — of a
 * class not yet drafted. Ruled 2026-09-28 (Andrew, engine/DECISIONS.md 'the draft never repeats a class
 * until all six are drafted'): "Until you've drafted all six of the starting classes, you never get a draft
 * of the same class again. So if your first hero is a warrior, on your next draft pool you will not see a
 * warrior." The same rule as the engine's opening probe (engine/src/content/opening-party.ts, fix.opening-draft).
 */
export function draftPoolOf(campaign: CampaignState): HeroRow[] {
  // "all six" is every hero class the pool can offer — all six since kingdom.opening-draft-pool (2026-10-03: the pool is
  // the 24 base heroes, four of each class), so every draft has three to offer and the sixth draft is of the last class.
  // A class the pool could not offer would never hold the rule shut (engine SWITCHES.md openingKingdomClasses)
  const heroClasses = CLASSES.filter((r) => r.group === 'hero' && HERO_POOL.some((h) => h.classes.includes(r.id))).map((r) => r.id)
  const drafted = new Set(Object.values(campaign.roster).filter((h) => groupOf(h.classes) === 'hero').flatMap((h) => h.classes).filter((c) => heroClasses.includes(c)))
  const allDrafted = heroClasses.every((c) => drafted.has(c))
  return HERO_POOL.filter((h) => !campaign.roster[h.id] && (allDrafted || !h.classes.some((c) => drafted.has(c))))
}

function offerDraft(ctx: Ctx, causeId: string): void {
  const c = ctx.campaign
  // was: const pool = HERO_POOL.filter((h) => !c.roster[h.id]) — fix.opening-draft (2026-09-29): the class rule
  const pool = draftPoolOf(c)
  const offer = pickOf(c, CUP_IDS.reveal, ['draft', draftedCountOf(c)], pool, DRAFT_OFFER).map((h) => h.id)
  if (offer.length === 0) throw new Error('the hero pool is empty — nobody left to draft')
  setDraftOffer(ctx, offer, causeId)
  setCursor(ctx, { step: 'draft' }, causeId)
}

export function performDraft(ctx: Ctx, heroId: HeroId, causeId: string): void {
  if (!canDraft(ctx.campaign, heroId)) throw new Error(`performDraft refused: '${heroId}' is not on offer at step '${ctx.campaign.cursor.step}' — ${(ctx.campaign.cursor.draftOffer ?? []).join(', ') || 'nothing is'}`)
  assertKitted(heroId)
  // was: applyDraft(ctx, heroRowOf(heroId), causeId) — the bare row. kingdom.opening-draft-modifiers: the hero joins as it was offered
  applyDraft(ctx, draftedHeroOf(ctx.campaign, heroId), causeId)
  setCursor(ctx, { step: 'open' }, causeId)
}

function prologueRowOf(n: number): PrologueRow {
  const row = PROLOGUE.find((r) => r.n === n)
  if (!row) throw new Error(`no prologue battle ${n} — the opening has ${PROLOGUE.length}`)
  return row
}

/** Field the next prologue battle: its civilians join the roster (rescued), the Engagement goes to prep. */
function beginPrologueBattle(ctx: Ctx, causeId: string): Engagement {
  const c = ctx.campaign
  const row = prologueRowOf(c.cursor.prologue!)
  for (const id of row.civilians) applyRescue(ctx, CIVILIANS.find((h) => h.id === id) ?? heroRowOf(id), causeId)
  const e: Engagement = {
    id: `${row.kind}.prologue-${row.n}`,
    kind: row.kind,
    prologue: row.n,
    territoryId: row.territoryId,
    mapId: row.mapId,
    enemies: [...row.enemies],
    condition: null, councilOffer: [], tactic: null, deployed: [],
    seed: row.n,
  }
  setCursor(ctx, { engagement: e, fought: 0 }, causeId)
  beginCombatPrep(ctx, causeId)
  return e
}

/**
 * kingdom.opening-loop-three (PLAYABLE-OPENING-PLAN.md item 12; engine DECISIONS.md 2026-09-28 'the opening's six battles,
 * in order'): field the next opening battle as an engine encounter — the Engagement's id is the encounter's, so its
 * rewards row (content/encounter-rewards.ts) pays it; the encounter brings its own map, enemies and civilians (none are
 * listed here); its number is the opening's cursor, so the draft cadence counts it. Refused while a draft is owed, off
 * the open step, after the opening or after the Campaign ended. Then Combat Prep, as beginPrologueBattle does.
 * A replayed battle (lost) is fielded again by the same call: the cursor did not move, so nothing is owed.
 */
export function performFieldOpeningBattle(ctx: Ctx, battle: { readonly id: string; readonly mapId: string; readonly kind: string }, causeId: string): Engagement {
  const c = ctx.campaign
  if (c.ended) throw new Error('performFieldOpeningBattle refused: the Campaign has ended')
  if (c.cursor.prologue === null) throw new Error('performFieldOpeningBattle refused: the opening is done')
  if (c.cursor.step !== 'open') throw new Error(`performFieldOpeningBattle refused: the cursor is at '${c.cursor.step}'`)
  if (draftsOwedOf(c) > 0) throw new Error(`performFieldOpeningBattle refused: ${draftsOwedOf(c)} to draft before battle ${c.cursor.prologue}`)
  const n = c.cursor.prologue
  const e: Engagement = {
    id: battle.id, kind: battle.kind, prologue: n, territoryId: null, mapId: battle.mapId,
    enemies: [], condition: null, councilOffer: [], tactic: null, deployed: [],
    // keyed by what the battle is — the opening's nth — so a replay is the same battle (kingdom SWITCHES.md openingReplaySeed)
    seed: n,
  }
  setCursor(ctx, { engagement: e, fought: 0 }, causeId)
  beginCombatPrep(ctx, causeId)
  return e
}

// ---------- who goes (kingdom.opening-deploy-choice, 2026-10-03) ----------
// Ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the opening run, audited', question 3: "Should the player choose which
// four heroes go into each battle?" — "3 yes"; his post: "Hero selection."). The choice is Combat Prep's own Deploy step
// (prep.ts performDeploy, performUndeploy, performAdvancePrep) — the kingdom's one Deploy mechanism, never a second: the
// chosen are the Engagement's `deployed`, in the Campaign, so they are saved with the run; a lost battle fielded again
// is a new Engagement with nobody sent, so the choice is asked again. Until this item the run walked past Deploy and the
// page sent the first four by id (kingdom SWITCHES.md openingDeployAll, openingPoolWhoDeploys).

/**
 * Who may go to the opening battle on the cursor: the heroes sent and the heroes free to be (prep.ts listDeployable —
 * alive, not Severely wounded, not held elsewhere), the hero group only — civilians stay home, the encounter fields its
 * own (kingdom SWITCHES.md openingDeployAll). Sorted by id (Law 6), the same list whoever is chosen.
 */
export function listOpeningParty(campaign: CampaignState): HeroId[] {
  const e = engagementOf(campaign)
  return [...e.deployed, ...listDeployable(campaign)].filter((id) => groupOf(campaign.roster[id]!.classes) === 'hero').sort()
}

/** Is the player's choice owed — the cursor at Deploy with more heroes who may go than the deploy limit? */
export function isDeployChoiceOwed(campaign: CampaignState): boolean {
  return campaign.cursor.step === 'prep' && campaign.cursor.prepStep === 'deploy' && listOpeningParty(campaign).length > deployLimitOf(campaign)
}

/**
 * The opening battle just fielded (performFieldOpeningBattle), walked to who goes: Reveal and the War Council are passed
 * with no tactic ("tactics are out", PLAYABLE-OPENING-PLAN.md), and at Deploy —
 *   · with the deploy limit or fewer who may go, all are sent and Equip opens: no choice is asked (returns false);
 *   · with more, nobody is sent and the cursor STAYS at Deploy: the player chooses, up to the limit (performDeploy /
 *     performUndeploy), and goes on to Equip by performAdvancePrep, which refuses while nobody is sent (returns true).
 * Refused off the prep steps before Equip.
 */
export function performOpeningDeploy(ctx: Ctx, causeId: string): boolean {
  const c = ctx.campaign
  if (c.cursor.prologue === null) throw new Error('performOpeningDeploy refused: the opening is done')
  for (let guard = 0; prepStepOf(c) !== 'deploy'; guard++) {
    if (prepStepOf(c) === 'equip' || guard > 8) throw new Error(`performOpeningDeploy refused: the cursor is past Deploy, at prep step '${c.cursor.prepStep}'`)
    performAdvancePrep(ctx, causeId)
  }
  if (isDeployChoiceOwed(c)) return true
  for (const h of listOpeningParty(c)) if (!engagementOf(c).deployed.includes(h)) performDeploy(ctx, h, causeId)
  performAdvancePrep(ctx, causeId)
  return false
}

/**
 * kingdom.opening-loop-three: the civilians a won opening battle rescues join the roster — every hero-side unit the
 * encounter fielded itself (a result row of role 'encounter') that did not die, joining as its rescuable row
 * (content/heroes.ts RESCUABLE_CIVILIANS, matched by unit). engine DECISIONS.md 2026-09-28 'answers to the 22 questions'
 * ("We're going to pick up civilians"); kingdom.opening-loop's note: "a civilian who died in their battle does not join"
 * (kingdom SWITCHES.md openingRescueOnWin). A lost battle rescues nobody — it is fought again, civilians and all.
 */
export function rescueSurvivors(ctx: Ctx, result: EngagementResult, causeId: string): void {
  if (result.outcome !== 'heroClear') return
  for (const u of result.units) {
    if (u.side !== 'hero' || u.role !== 'encounter' || u.lifeState === 'dead') continue
    const row = RESCUABLE_CIVILIANS.find((h) => h.unitType === u.typeId)
    if (row) applyRescue(ctx, row, causeId)
  }
}

/**
 * kingdom.opening-recap-civilians — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the civilians show on the victory screen;
 * …': "The battle should show in this victory screen too. If they were wounded, if they died, they're in there too." —
 * asked whether he meant the civilians: "2, yes."). The civilians who fought a battle, as it left them, read from the
 * battle's OWN result — every hero-side row that is not a roster hero's (a `role`: the units the encounter placed on the
 * player's side, and any that arrived there) — never from a list of names. In the result's order.
 *   fate    dead; wounded — went down in the battle (still down at its end, or stood again at the Deathbed); else unhurt
 *   heroId  the row the unit joins the roster as when it is rescued (content/heroes.ts RESCUABLE_CIVILIANS, matched by
 *           unit, as rescueSurvivors does), or null — whose portrait the screen shows
 *   name    that row's name (the name it joins under: "Orphan Child"); the battle's own name for the unit ("Orphan
 *           Child 1" — the engine numbers its units) when it has no row, or when two of one kind fought
 *   joins   the run records it joined: it lived, and its row is on the roster (rescueSurvivors wrote it — a won battle)
 * Pure. kingdom SWITCHES.md recapCivilians*.
 */
export type BattleCivilian = { readonly typeId: string; readonly name: string; readonly fate: 'unhurt' | 'wounded' | 'dead'; readonly heroId: HeroId | null; readonly joins: boolean }
export function listBattleCivilians(campaign: CampaignState, result: EngagementResult): BattleCivilian[] {
  const fought = result.units.filter((u) => u.side === 'hero' && u.role !== undefined)
  return fought.map((u) => {
    const fate = u.lifeState === 'dead' ? 'dead' : u.lifeState === 'downed' || u.downed || u.stood ? 'wounded' : 'unhurt'
    const row = RESCUABLE_CIVILIANS.find((h) => h.unitType === u.typeId) ?? null
    const alone = fought.filter((x) => x.typeId === u.typeId).length === 1
    return { typeId: u.typeId, name: row && alone ? row.name : u.name, fate, heroId: row?.id ?? null, joins: fate !== 'dead' && result.outcome === 'heroClear' && row !== null && campaign.roster[row.id] !== undefined }
  })
}

/**
 * Advance the opening from its open step: a draft if one is owed, else the
 * next battle, else — every battle fought — the Week machine at Week 1.
 */
export function performAdvanceOpening(ctx: Ctx, causeId: string): void {
  const c = ctx.campaign
  if (c.cursor.prologue === null) throw new Error('performAdvanceOpening refused: the opening is done')
  if (c.cursor.step !== 'open') throw new Error(`performAdvanceOpening refused: the cursor is at '${c.cursor.step}'`)
  if (c.ended) throw new Error('performAdvanceOpening refused: the Campaign has ended')
  if (draftsOwedOf(c) > 0) { offerDraft(ctx, causeId); return }
  if (c.cursor.prologue > PROLOGUE.length) {
    // the opening is over: Week 0 closes like any Week, and the machine begins Week 1
    tickAssignments(ctx, causeId)
    setCursor(ctx, { prologue: null, week: 1 }, causeId)
    beginWeek(ctx, causeId)
    return
  }
  beginPrologueBattle(ctx, causeId)
}

/**
 * The writer calls this after a prologue battle is resolved: the next battle is owed, or the run is over — or, a battle
 * that is `replayed` when lost (kingdom.opening-loop-three; the Engagement's rewards row), nothing: the same battle is
 * owed again and the run goes on.
 */
export function performResolvePrologue(ctx: Ctx, won: boolean, causeId: string, replayed = false): void {
  const c = ctx.campaign
  if (c.cursor.prologue === null) return
  if (!won && replayed) return
  if (!won && !listTerritories(c, (t) => t.kingdom && t.owned).length) {
    setEnded(ctx, `lost prologue battle ${c.cursor.prologue} before the Kingdom Territory was taken`, causeId)
    return
  }
  // each of the opening's battles is its own beat: the field slot clears between them
  tickAssignments(ctx, causeId)
  setCursor(ctx, { prologue: c.cursor.prologue + 1 }, causeId)
}

/** Permanent death: the only path out. GAME-ARCHITECTURE.md §6 — harvest, then a fresh Campaign. */
export function performEndCampaign(ctx: Ctx, causeId: string): CampaignState {
  if (!ctx.campaign.ended) throw new Error('performEndCampaign refused: the Campaign has not ended')
  // the Legacy's harvest is out of the slice (§8: "the Legacy tree beyond a stub"); the fresh Campaign takes a new seed
  return makeNewCampaign(ctx.campaign.seed + 1)
}
