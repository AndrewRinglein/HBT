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
//   XP    15 − enemy phases (speed bonus, SKELETON-NOTES.md B6) + each kill priced
//         by its victim's tier — the engine's XP_BY_TIER, the Codex's 2 / 5 / 15
//         (engine DECISIONS.md 2026-09-28 "XP per kill is 2 / 5 / 15 by tier";
//         kingdom.reads-engine, review finding K7: this was 3 per kill, typed here)
//         + 10 to the MVP, a weighted roll on a named cup (B7). Never below 0. A
//         kill the result does not name (the panel's), or a victim with no tier,
//         is priced at the lowest tier (kingdom SWITCHES.md killXpUnnamed). A battle whose row (src/content/encounter-rewards.ts)
//         fixes its XP pays exactly that instead (kingdom.opening-rewards).
//   Wound downed and alive → Wounded (1); dead → dead; untouched → 0. A hero still turned to the enemy side when
//         a battle is lost is dead (fix.turned-hero-lost, engine DECISIONS.md 2026-10-02). The
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
import { UNITS, XP_BY_TIER } from '../engine.js'
import { validateResult } from './result.js'
import {
  type Ctx, applyXp, setWound, setHeroDead, applyGrant, applyRenown,
  setFoughtThisWeek, applyRelease, setEngagementResolved, applyClaim, setCursor, setRewardOffer, applyRestock, applyInstanceUse,
  setHeroBadges,
} from './mutate.js'
import { instanceSlotsOf } from './loadout.js'
import { itemOf } from '../content/items.js'
import { performRollAbsences } from './absence.js'
import { performLose } from './map.js'
import { resolveBattleOffer, performExitReckoning } from './rewards.js'
import { performResolvePrologue, rescueSurvivors } from './opening.js'
import { engagementKindOf } from '../content/engagements.js'
import { encounterRewardOf } from '../content/encounter-rewards.js'
import { PAYOUTS } from '../content/payouts.js'
import { SWITCHES } from '../content/switches.js'
import { CUP_IDS } from '../content/cups.js'
import { groupOf } from '../content/classes.js'
import { resolveBattleQuest, performCompleteQuest } from './quests.js'

export type HeroReckoning = {
  heroId: HeroId
  xp: number
  /** 0 none · 1 Wounded · 2 Badly Wounded · 3 Severe. Ignored when dead. */
  wound: number
  dead: boolean
  mvp: boolean
  /**
   * engine rule.afflictions-at-zero-refiled-2 (2026-10-02): badges the battle leaves the hero with, added to what it carries
   * — Rotting Flesh's Fragile, one per time it was taken to 0 ("it will just accumulate"). Absent when none, or dead.
   */
  badges?: string[]
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

/** The XP a row's kills pay — each victim's tier priced by the engine's XP_BY_TIER; an unnamed kill or an untiered victim at the lowest tier. */
export function killXpOf(u: Pick<EngagementResult['units'][number], 'kills' | 'killed'>): number {
  const tiers = Object.keys(XP_BY_TIER).map(Number).sort((a, b) => a - b)
  const lowest = XP_BY_TIER[tiers[0]!]
  if (lowest === undefined) throw new Error('XP_BY_TIER prices no tier — the pack carries no xpByTier')
  const priced = (u.killed ?? []).map((typeId) => { const tier = UNITS[typeId]?.tier; return tier === undefined ? lowest : XP_BY_TIER[tier] ?? lowest })
  return priced.reduce((s, n) => s + n, 0) + (u.kills - priced.length) * lowest
}

/**
 * The XP one battle pays each hero-side ROSTER row of its result, before the MVP — the one formula: resolveReckoning reads
 * it, and so does the opening's carry (src/sim/opening-run.ts, fix.opening-levels 2026-10-02), so the levels the engine's
 * opening probe fields come from the kingdom's XP (engine DECISIONS.md 2026-09-28: "the XP rewards are in the kingdom, not
 * the engine"). The dead earn nothing; a battle whose row fixes its XP pays exactly that; else the speed bonus and each
 * kill priced by its victim's tier. Rows in result order. Pure.
 */
export function battleXpOf(engagementId: string, result: EngagementResult): { index: number; xp: number; dead: boolean }[] {
  const speed = Math.max(0, 15 - result.enemyPhases)
  // kingdom.opening-rewards: a battle whose row fixes its XP pays exactly that to each deployed hero who lives, whatever
  // the outcome, kills or length — the formula and the MVP's +10 do not apply ("20 XP no matter what", DECISIONS.md
  // 2026-09-28; SWITCHES.md openingFixedXp)
  const fixedXp = encounterRewardOf(engagementId)?.xp
  // kingdom.encounter-result-fold: only the roster rows are the deployed heroes — an encounter's civilians and its
  // arrivals (a `role`) are never keyed to engagement.deployed
  // fix.turned-hero-lost (engine DECISIONS.md 2026-10-02 'a hero still turned when a battle is lost is lost': "3 treated
  // as lost"): a row the fold marks `turned` ended a lost battle still on the enemy side — it is dead here, the one dead
  // path, never a second removal (kingdom SWITCHES.md turnedLostIsDead)
  const lost = result.outcome !== 'heroClear'
  return result.units.filter((u) => u.side === 'hero' && u.role === undefined).map((u) => {
    const dead = u.lifeState === 'dead' || (lost && u.turned === true)
    return { index: u.index, xp: dead ? 0 : fixedXp ?? speed + killXpOf(u), dead }
  })
}

/** The MVP's prize on top of its battle's XP (B7). */
export const MVP_XP = 10

/**
 * MVP — "chosen randomly among all of the heroes… the more experience points a hero got, the higher their chance" (B7):
 * a weighted roll over the living, each weighing its XP + 1; `roll` is the caller's, from its own cup, drawn only when there is an MVP to choose. The position in
 * `xps` of the MVP — or null when nobody lives, or the battle's row fixes its XP (no MVP then). Pure.
 */
export function mvpOf(engagementId: string, xps: readonly { readonly xp: number; readonly dead: boolean }[], roll: () => number): number | null {
  if (encounterRewardOf(engagementId)?.xp !== undefined) return null
  const alive = xps.flatMap((h, i) => (h.dead ? [] : [{ xp: h.xp, i }]))
  if (!alive.length) return null
  let at = roll() % alive.reduce((s, h) => s + h.xp + 1, 0)
  for (const h of alive) { at -= h.xp + 1; if (at < 0) return h.i }
  return null
}

export function resolveReckoning(campaign: CampaignState, engagement: Engagement, result: EngagementResult): Reckoning {
  const kind = engagementKindOf(engagement.kind)
  resolveBattleQuest(campaign, engagement)
  const won = result.outcome === 'heroClear'
  // fix.opening-levels (engine, 2026-10-02): the XP is battleXpOf's and the MVP mvpOf's — the one formula, read here too
  const xps = battleXpOf(engagement.id, result)

  const heroes: HeroReckoning[] = result.units.filter((u) => u.side === 'hero' && u.role === undefined).map((u, k) => {
    const heroId = engagement.deployed[u.index]
    if (!heroId) throw new Error(`${engagement.id}: result names hero row ${u.index} but only ${engagement.deployed.length} were deployed`)
    // battleXpOf's: dead, or still turned when the battle was lost (fix.turned-hero-lost)
    const dead = xps[k]!.dead
    const hero = campaign.roster[heroId]
    if (!hero) throw new Error(`${engagement.id}: deployed hero '${heroId}' is not on the roster`)
    // A wound is a level, REPLACED not accumulated (§4.2) — and a battle never
    // heals one: the proposal is the worse of what they carried in and what
    // this battle did.
    return {
      heroId,
      xp: xps[k]!.xp,
      // kingdom.encounter-result-fold: a hero who stood again at the Deathbed is Wounded in the battle — the same plain
      // wound as one who went down (SWITCHES.md foldDeathbedStood)
      wound: dead ? 0 : Math.max(hero.wound, u.downed || u.stood ? SWITCHES.woundFromDowned : 0),
      dead,
      mvp: false,
      // engine rule.afflictions-at-zero-refiled-2: Fragile, gained at 0 Health, is "a permanent consequence" — carried
      ...(!dead && u.carried?.length ? { badges: [...u.carried] } : {}),
    }
  })

  // MVP — mvpOf, a weighted roll keyed by the Engagement, on its own cup. Nobody alive → no MVP.
  const mvp = mvpOf(engagement.id, heroes, () => rollOf(campaign, CUP_IDS.mvp, [engagement.id]))
  if (mvp !== null) { heroes[mvp]!.mvp = true; heroes[mvp]!.xp += MVP_XP }

  // a prologue battle may take no ground (content/prologue.ts): no claim, no
  // loss, and a first-claim payout has nothing to be first about
  const territory = engagement.territoryId === null ? null : campaign.territories[engagement.territoryId]
  if (engagement.territoryId !== null && !territory) throw new Error(`${engagement.id}: Territory '${engagement.territoryId}' is not on the map`)
  const claim = won && kind.onWin === 'claim-territory' && territory ? territory.id : null
  // a lost defence names the Territory either way; the writer's performLose
  // knows the Kingdom Territory cannot be lost and charges its stakes instead
  const lose = !won && kind.onLose === 'lose-territory' && territory ? territory.id : null
  const grants: Grant[] = won && kind.rewards === 'battle'
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
  if (named.size !== reckoning.heroes.length) throw new Error('applyBattleResult refused: duplicate Reckoning hero')
  const kind = engagementKindOf(engagement.kind)
  const quest = resolveBattleQuest(c, engagement)
  if (quest && (reckoning.won !== (result.outcome === 'heroClear') || reckoning.grants.length || reckoning.claim || reckoning.lose)) throw new Error('quest battle outcome or payout differs from its quest-owned reward policy')
  for (const heroId of engagement.deployed) if (!named.has(heroId)) throw new Error(`applyBattleResult refused: the Reckoning says nothing about deployed hero '${heroId}'`)
  for (const h of reckoning.heroes) {
    if (!engagement.deployed.includes(h.heroId)) throw new Error(`applyBattleResult refused: the Reckoning names '${h.heroId}', who was not deployed`)
    if (!Number.isInteger(h.xp) || h.xp < 0 || !Number.isInteger(h.wound) || h.wound < 0 || h.wound > 3) throw new Error(`applyBattleResult refused: '${h.heroId}' xp ${h.xp}, wound ${h.wound}`)
    if (h.badges !== undefined && (h.dead || !Array.isArray(h.badges) || h.badges.some((b) => typeof b !== 'string' || !b))) throw new Error(`applyBattleResult refused: '${h.heroId}' carries badges [${String(h.badges)}] out of the battle`)
  }
  for (const g of reckoning.grants) if (!(g.currency in c.purse) || !Number.isInteger(g.amount) || g.amount < 0) throw new Error(`applyBattleResult refused: grant ${g.amount} of '${g.currency}'`)
  // v2.item-uses: each instance's spend, mapped to its hero and equipped slot — checked before anything is written
  const instanceUses = (result.itemUses ?? []).map((x) => {
    const heroId = engagement.deployed[x.index]
    const h = heroId === undefined ? undefined : c.roster[heroId]
    const slot = h ? instanceSlotsOf(h.equipped)[x.instance] : undefined
    if (!h || slot === undefined || h.equipped[slot] !== x.itemId) throw new Error(`applyBattleResult refused: item uses name '${x.itemId}' as hero ${x.index}'s instance ${x.instance}, which it does not carry`)
    const uses = itemOf(x.itemId).uses
    if (uses === null || (h.used?.[slot] ?? 0) + x.used > uses) throw new Error(`applyBattleResult refused: item uses spend ${x.used} of ${heroId}'s '${x.itemId}', which has ${uses === null ? 'no uses' : `${uses - (h.used?.[slot] ?? 0)} left`}`)
    return { heroId: heroId!, slot, itemId: x.itemId, used: x.used }
  })

  const cause = engagement.id
  // kingdom.opening-rewards: "wounds apply, fatigue does not" (DECISIONS.md 2026-09-28) — a battle whose row says it
  // does not fatigue marks nobody fought this Week and rolls no absences, as the prologue's never did
  const fatigues = engagement.prologue === undefined && (encounterRewardOf(engagement.id)?.fatigues ?? true)
  for (const id of engagement.deployed) {
    if (c.assignments[id]?.kind === 'engagement') applyRelease(ctx, id, 'field', cause)
  }
  if (fatigues) setFoughtThisWeek(ctx, [...c.foughtThisWeek, ...engagement.deployed], cause)
  for (const h of reckoning.heroes) {
    if (h.dead) { setHeroDead(ctx, h.heroId, cause); continue }
    if (h.xp > 0) applyXp(ctx, h.heroId, h.xp, cause)
    if (h.wound !== c.roster[h.heroId]!.wound) setWound(ctx, h.heroId, h.wound, cause)
    // engine rule.afflictions-at-zero-refiled-2: Fragile stacks — each one gained is another on the roster
    if (h.badges?.length) setHeroBadges(ctx, h.heroId, [...c.roster[h.heroId]!.badges, ...h.badges], cause)
  }
  for (const x of instanceUses) applyInstanceUse(ctx, x.heroId, x.slot, x.itemId, x.used, cause)
  if (fatigues) performRollAbsences(ctx, engagement.deployed, cause)
  if (reckoning.renown > 0) applyRenown(ctx, reckoning.renown, cause)
  setEngagementResolved(ctx, engagement.id, reckoning.won, cause)
  if (reckoning.claim) applyClaim(ctx, reckoning.claim, cause)
  if (reckoning.lose) performLose(ctx, reckoning.lose, cause)
  for (const g of reckoning.grants) if (g.amount > 0) applyGrant(ctx, g.currency, g.amount, cause)
  // a won battle earns its draft — three drawn on cup.reward, keyed by the Engagement — or what its row offers instead
  // (kingdom.opening-rewards: nothing, or one item a hero of the row's classes takes)
  const questReward = quest ? performCompleteQuest(ctx, quest, result.outcome === 'heroClear', cause) : null
  setRewardOffer(ctx, reckoning.won && kind.rewards === 'battle' ? resolveBattleOffer(c, engagement.id) : null, cause)
  // Keep a quest tally in the save so its recap remains truthful after reload.
  setCursor(ctx, { step: 'reckoning', prepStep: null, battle: questReward ? { resultSet: true, result, reckoning, questReward } : null, fought: c.cursor.fought + 1 }, cause)
  // the opening: the civilians a won battle saved join (kingdom.opening-loop-three); the next battle is owed — or, lost
  // before the Kingdom Territory, the run is over, unless the battle's row says a lost one is replayed
  if (engagement.prologue !== undefined) {
    rescueSurvivors(ctx, result, cause)
    performResolvePrologue(ctx, reckoning.won, cause, encounterRewardOf(engagement.id)?.replayed ?? false)
  }
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
