// The Reckoning — what the Campaign decides from a battle's result. Two halves:
//
//   resolveReckoning(campaign, engagement, result) → Reckoning     PURE — a proposal
//   applyBattleResult(ctx, engagement, result, reckoning)          THE ONE WRITER
//
// GLOSSARY.md: resolveX computes a value and its ledger; the panel may edit
// every proposed value before the writer runs ("Xp gain by unit. Wounded by
// hero unit. Just set everything that could happen in battle" — 2026-09-01),
// and the writer writes exactly what it is given (ISC-032). The engine path
// gets the same proposal from the same function; nothing here knows which
// hand made the result (ISC-031).
//
// GAME-ARCHITECTURE.md §1 rule 2: "Combat touches the Campaign in exactly one
// function — applyBattleResult." tools/scan.mjs only-writer is the teeth
// (ISC-014). Everything it writes goes through src/core/mutate.ts and emits.
//
// Numbers are SOFT and every one has an owner or a switch:
//   XP    15 − enemy phases (speed bonus, SKELETON-NOTES.md B6) + 3 per kill
//         (3-UNITS-SETTLED.md "3 / 6 / 9 per kill by rank" — rank 1 until enemy
//         rows carry a rank) + 10 to the MVP, a weighted roll on a named cup
//         (B7). Never below 0.
//   Wound downed and alive → Wounded (1); dead → dead; untouched → 0. The
//         Deathbed is OUT of the slice (THIN-SLICE-IMPLEMENTATION.md §8), so
//         "down-and-out resolves to plain wounds" — SWITCHES.md, wound.fromDowned.
//   Renown +1 per Engagement won (KINGDOM-DESIGN.md §3A). Losses +1 per lost.
//   Claim a won Conquer claims the Territory and any building on it
//         (7-KINGDOM-SETTLED.md); a lost Defend loses it unless it is the
//         Kingdom Territory (SKELETON-SETTLED.md:80-81) — both read from the
//         Engagement kind's row. Grants come from src/content/payouts.ts.

import type { CampaignState, Engagement, HeroId, TerritoryId } from './campaign.js'
import type { EngagementResult } from './seam.js'
import { rollOf } from './rng.js'
import { validateResult } from './result.js'
import {
  type Ctx, applyXp, setWound, setHeroDead, applyGrant, applyRenown,
  setFoughtThisWeek, applyRelease, setEngagementResolved, applyClaim, setCursor, setRewardOffer, applyRestock,
} from './mutate.js'
import { performRollAbsences } from './absence.js'
import { performLose } from './map.js'
import { resolveRewardDraw, performExitReckoning } from './rewards.js'
import { performResolvePrologue } from './opening.js'
import { engagementKindOf } from '../content/engagements.js'
import { PAYOUTS } from '../content/payouts.js'
import { SWITCHES } from '../content/switches.js'
import { CUP_IDS } from '../content/cups.js'
import { groupOf } from '../content/classes.js'

export type HeroReckoning = {
  heroId: HeroId
  xp: number
  /** 0 none · 1 Wounded · 2 Badly Wounded · 3 Severe. Ignored when dead. */
  wound: number
  dead: boolean
  mvp: boolean
}

export type Grant = { currency: string; amount: number }

export type Reckoning = {
  engagementId: string
  won: boolean
  heroes: HeroReckoning[]
  renown: number
  losses: number
  /** A Territory claimed by this battle, or null. */
  claim: TerritoryId | null
  /** A Territory lost by this battle, or null. */
  lose: TerritoryId | null
  /** What the purse receives — from the payout rows, so "only Conquer pays Salvage" is data. */
  grants: Grant[]
}

export function resolveReckoning(campaign: CampaignState, engagement: Engagement, result: EngagementResult): Reckoning {
  const kind = engagementKindOf(engagement.kind)
  const won = result.outcome === 'heroClear'
  const speed = Math.max(0, 15 - result.enemyPhases)

  const heroes: HeroReckoning[] = result.units.filter((u) => u.side === 'hero').map((u) => {
    const heroId = engagement.deployed[u.index]
    if (!heroId) throw new Error(`${engagement.id}: result names hero row ${u.index} but only ${engagement.deployed.length} were deployed`)
    const dead = u.lifeState === 'dead'
    const hero = campaign.roster[heroId]
    if (!hero) throw new Error(`${engagement.id}: deployed hero '${heroId}' is not on the roster`)
    // A wound is a level, REPLACED not accumulated (§4.2) — and a battle never
    // heals one: the proposal is the worse of what they carried in and what
    // this battle did.
    return {
      heroId,
      xp: dead ? 0 : speed + 3 * u.kills,
      wound: dead ? 0 : Math.max(hero.wound, u.downed ? SWITCHES.woundFromDowned : 0),
      dead,
      mvp: false,
    }
  })

  // MVP — "chosen randomly among all of the heroes… the more experience points
  // a hero got, the higher their chance" (B7). A weighted roll, keyed by the
  // Engagement, on its own cup. Nobody alive → no MVP.
  const alive = heroes.filter((h) => !h.dead)
  const weight = alive.reduce((s, h) => s + h.xp + 1, 0)
  if (alive.length) {
    let at = rollOf(campaign, CUP_IDS.mvp, [engagement.id]) % weight
    for (const h of alive) { at -= h.xp + 1; if (at < 0) { h.mvp = true; h.xp += 10; break } }
  }

  // a prologue battle may take no ground (content/prologue.ts): no claim, no
  // loss, and a first-claim payout has nothing to be first about
  const territory = engagement.territoryId === null ? null : campaign.territories[engagement.territoryId]
  if (engagement.territoryId !== null && !territory) throw new Error(`${engagement.id}: Territory '${engagement.territoryId}' is not on the map`)
  const claim = won && kind.onWin === 'claim-territory' && territory ? territory.id : null
  // a lost defence names the Territory either way; the writer's performLose
  // knows the Kingdom Territory cannot be lost and charges its stakes instead
  const lose = !won && kind.onLose === 'lose-territory' && territory ? territory.id : null
  const grants: Grant[] = won
    ? PAYOUTS.filter((p) => p.engagementKind === engagement.kind && !(p.firstClaimOnly && (!territory || territory.claimedOnce)))
        .map((p) => ({ currency: p.currency, amount: p.amount }))
    : []

  // the prologue's battles pay Renown or not by a switch — STATE.md's open label question
  const renown = won && (engagement.prologue === undefined || SWITCHES.prologuePaysRenown) ? 1 : 0
  return { engagementId: engagement.id, won, heroes, renown, losses: won ? 0 : 1, claim, lose, grants }
}

/**
 * THE ONE WRITER. Refuses before it writes anything (Law 9): the cursor must
 * be at the battle with a result set, the result must validate against the
 * Engagement, and the Reckoning must be for this Engagement. Then it writes
 * exactly the Reckoning it was given, through the mutators, and moves the
 * cursor past the battle so a second apply is refused.
 */
export function applyBattleResult(ctx: Ctx, engagement: Engagement, result: EngagementResult, reckoning: Reckoning): void {
  const c = ctx.campaign
  const cursor = c.cursor
  if (cursor.step !== 'battle' || !cursor.battle?.resultSet) {
    throw new Error(`applyBattleResult refused: the cursor is at '${cursor.step}'${cursor.battle ? ' with no result set' : ''} — a result is applied once, from the battle step`)
  }
  if (cursor.engagement?.id !== engagement.id) throw new Error(`applyBattleResult refused: the cursor holds '${cursor.engagement?.id}', not '${engagement.id}'`)
  validateResult(result, { heroes: engagement.deployed.length, enemies: engagement.enemies.length, id: engagement.id })
  if (reckoning.engagementId !== engagement.id) throw new Error(`applyBattleResult refused: the Reckoning is for '${reckoning.engagementId}', not '${engagement.id}'`)
  const named = new Set(reckoning.heroes.map((h) => h.heroId))
  for (const heroId of engagement.deployed) if (!named.has(heroId)) throw new Error(`applyBattleResult refused: the Reckoning says nothing about deployed hero '${heroId}'`)
  for (const h of reckoning.heroes) {
    if (!engagement.deployed.includes(h.heroId)) throw new Error(`applyBattleResult refused: the Reckoning names '${h.heroId}', who was not deployed`)
    if (!Number.isInteger(h.xp) || h.xp < 0 || !Number.isInteger(h.wound) || h.wound < 0 || h.wound > 3) throw new Error(`applyBattleResult refused: '${h.heroId}' xp ${h.xp}, wound ${h.wound}`)
  }
  for (const g of reckoning.grants) if (!(g.currency in c.purse) || !Number.isInteger(g.amount) || g.amount < 0) throw new Error(`applyBattleResult refused: grant ${g.amount} of '${g.currency}'`)

  const cause = engagement.id
  for (const id of engagement.deployed) {
    if (c.assignments[id]?.kind === 'engagement') applyRelease(ctx, id, 'field', cause)
  }
  if (engagement.prologue === undefined) setFoughtThisWeek(ctx, [...c.foughtThisWeek, ...engagement.deployed], cause)
  for (const h of reckoning.heroes) {
    if (h.dead) { setHeroDead(ctx, h.heroId, cause); continue }
    if (h.xp > 0) applyXp(ctx, h.heroId, h.xp, cause)
    if (h.wound !== c.roster[h.heroId]!.wound) setWound(ctx, h.heroId, h.wound, cause)
  }
  if (engagement.prologue === undefined) performRollAbsences(ctx, engagement.deployed, cause)
  if (reckoning.renown > 0) applyRenown(ctx, reckoning.renown, cause)
  setEngagementResolved(ctx, engagement.id, reckoning.won, cause)
  if (reckoning.claim) applyClaim(ctx, reckoning.claim, cause)
  if (reckoning.lose) performLose(ctx, reckoning.lose, cause)
  for (const g of reckoning.grants) if (g.amount > 0) applyGrant(ctx, g.currency, g.amount, cause)
  // a won battle earns its draft — three drawn on cup.reward, keyed by the Engagement
  setRewardOffer(ctx, reckoning.won ? resolveRewardDraw(c, engagement.id) : null, cause)
  setCursor(ctx, { step: 'reckoning', prepStep: null, battle: null, fought: c.cursor.fought + 1 }, cause)
  // the opening: the next battle is owed — or, lost before the Kingdom Territory, the run is over
  if (engagement.prologue !== undefined) performResolvePrologue(ctx, reckoning.won, cause)
}

/**
 * Leave the tally. The Engagement is done; what follows is the reward draft
 * (won) and whoever can level (rewards.ts), then the Week's open step — the
 * cursor keeps the Engagement until then so the screens can name it.
 */
export function performExitBattle(ctx: Ctx, causeId: string): void {
  // "used-up items are replaced; they're restocked after the battle" (2026-09-02)
  applyRestock(ctx, causeId)
  performExitReckoning(ctx, causeId)
  if (ctx.campaign.cursor.step === 'open') setCursor(ctx, { engagement: null, battle: null }, causeId)
}

/**
 * The combat difficulty number — SKELETON-NOTES.md:675, Andrew 2026-08-23:
 * Σ(hero levels, civilians ÷2 ⌊⌋) + 2×week − 5×losses + 3×corruption, counting
 * everyone you own who is alive (SKELETON-SETTLED.md:117-118). Derived, never
 * stored; losses and corruption are the stored summands. Integers only.
 */
export function resolveDifficulty(campaign: CampaignState): number {
  let levels = 0, corruption = 0
  for (const h of Object.values(campaign.roster)) {
    if (h.lifeState !== 'alive') continue
    levels += groupOf(h.classes) === 'civilian' ? Math.floor(h.level / 2) : h.level
    corruption += h.corruption
  }
  return levels + 2 * campaign.week - 5 * campaign.losses + 3 * corruption
}
