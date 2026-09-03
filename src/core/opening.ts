// The opening — GAME-ARCHITECTURE.md §2.5 "The Prologue — a reveal schedule,
// not a mode": a normal Campaign, Week 0, that begins with the player's first
// act — a stat-less draft of one hero from three — and runs the five authored
// battles (content/prologue.ts) straight into Combat Prep, drafting between
// them at the ruled cadence (1 · +2 · +1 per battle until six drafted heroes),
// until the Kingdom Territory and the square outside it are taken. Then the
// Week machine takes over at Week 1.
//
// "Losing a battle before the Kingdom Territory is taken ends the Campaign
// and starts a new one." (Andrew, 2026-08-23) — the last mandatory-win battle
// in the game. permanent death: performEndCampaign, then a fresh
// makeNewCampaign. Nothing here is a canX() gate on a reveal (C7): the opening
// is authored state — an empty roster, a fixed battle list — never a tutorial
// flag.

import type { CampaignState, Engagement, HeroId } from './campaign.js'
import { makeCampaign } from './campaign.js'
import { type Ctx, setCursor, setDraftOffer, applyDraft, applyRescue, setEnded } from './mutate.js'
import { pickOf } from './rng.js'
import { beginCombatPrep } from './prep.js'
import { beginWeek } from './week.js'
import { listTerritories } from './map.js'
import { tickAssignments } from './assignments.js'
import { groupOf } from '../content/classes.js'
import { HERO_POOL, CIVILIANS, heroRowOf, assertKitted, type HeroRow } from '../content/heroes.js'
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
  // before battle 1: one; before battle 2: three; then one more per battle, capped at six
  // …and never more than the pool holds: with the alpha four removed (2026-09-02) the pool is short of six until the engine fields the Eve 24
  const cap = Math.min(DRAFT_CADENCE.until, HERO_POOL.filter((h) => groupOf(h.classes) === 'hero').length)
  const target = n === 1 ? DRAFT_CADENCE.first : Math.min(cap, DRAFT_CADENCE.first + DRAFT_CADENCE.afterFirst + (n - 2) * DRAFT_CADENCE.afterEach)
  return Math.max(0, target - have)
}

export function isOpeningDone(campaign: CampaignState): boolean {
  return campaign.cursor.prologue === null
}

/** The three on offer: hero-group rows not yet on the roster, drawn on cup.reveal keyed by the draft's ordinal. Stat-less: name, class, kit — no numbers. */
export function listDraftOffers(campaign: CampaignState): HeroRow[] {
  return (campaign.cursor.draftOffer ?? []).map(heroRowOf)
}

export function canDraft(campaign: CampaignState, heroId: HeroId): boolean {
  return campaign.cursor.step === 'draft' && (campaign.cursor.draftOffer ?? []).includes(heroId)
}

function offerDraft(ctx: Ctx, causeId: string): void {
  const c = ctx.campaign
  const pool = HERO_POOL.filter((h) => !c.roster[h.id])
  const offer = pickOf(c, CUP_IDS.reveal, ['draft', draftedCountOf(c)], pool, DRAFT_OFFER).map((h) => h.id)
  if (offer.length === 0) throw new Error('the hero pool is empty — nobody left to draft')
  setDraftOffer(ctx, offer, causeId)
  setCursor(ctx, { step: 'draft' }, causeId)
}

export function performDraft(ctx: Ctx, heroId: HeroId, causeId: string): void {
  if (!canDraft(ctx.campaign, heroId)) throw new Error(`performDraft refused: '${heroId}' is not on offer at step '${ctx.campaign.cursor.step}' — ${(ctx.campaign.cursor.draftOffer ?? []).join(', ') || 'nothing is'}`)
  assertKitted(heroId)
  applyDraft(ctx, heroRowOf(heroId), causeId)
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

/** The writer calls this after a prologue battle is resolved: the next battle is owed, or the run is over. */
export function performResolvePrologue(ctx: Ctx, won: boolean, causeId: string): void {
  const c = ctx.campaign
  if (c.cursor.prologue === null) return
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
