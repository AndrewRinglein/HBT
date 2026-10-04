// The Reckoning's tail — GAME-ARCHITECTURE.md §7: reckoning → rewards → level-up
// → back to the Week. §2.6: listRewardOffers / canTakeReward / performTakeReward;
// canLevelUp / performLevelUp.
//
// The reward draft (7-KINGDOM-SETTLED.md): "3 → 4 → 5 drawn, keep 1. Keep-2
// was proposed and rejected: it dissolves the draft." Drawn on cup.reward,
// keyed by the Engagement (Law 4) — a reload shows the same three. Only a WON
// battle offers one; a loss "costs wounds and pays no Salvage" and no draft.
//
// A battle with a row in src/content/encounter-rewards.ts (kingdom.opening-rewards) offers what its row says instead:
// nothing, or one item that a hero of the row's classes takes — onto that hero, not into the stash.
//
// Level-up: thresholds from the ruled curve (src/content/levels.ts); a level
// is the engine's level row's grants (the hero's own table — levelTableOf), and the first chooses the specialty.

import type { CampaignState, HeroId } from './campaign.js'
import { type Ctx, setRewardOffer, applyTakeReward, applyEquip, applyLevel, applySpecialty, setCursor } from './mutate.js'
import { levelRowOf, specialtiesOf, specialtyOf, SPECIALTY_OFFER, type SpecialtyRow, type LevelRow } from '../content/progress.js'
import { SWITCHES } from '../content/switches.js'
import { rollOf, drawOf } from './rng.js'
import { REWARDS, REWARD_ODDS, slotOf, type RewardRow } from '../content/rewards.js'
import { encounterRewardOf } from '../content/encounter-rewards.js'
import { whyNotFit } from './loadout.js'
import { itemOf } from '../content/items.js'
import { rewardDrawOf } from './charter.js'
import { CUP_IDS } from '../content/cups.js'
import { xpForLevel } from '../content/levels.js'
import { UNITS, levelTableOf, classOf } from '../engine.js'

/**
 * The draw for an Engagement — pure, so the same battle always offers the same
 * three. Tiered (rewards.tiered, G10): each card rolls its CLASS on the odds
 * table, then a row of that class from the pool, both on cup.reward keyed by
 * the Engagement and the card's ordinal (Law 4). Cards are distinct: a row
 * already dealt leaves the class pool for the next card.
 */
export function resolveRewardDraw(campaign: CampaignState, engagementId: string): string[] {
  const out: string[] = []
  for (let i = 0; i < rewardDrawOf(campaign); i++) {
    const cls = classOfRoll(rollOf(campaign, CUP_IDS.reward, [engagementId, 'class', i]) % 100)
    const pool = REWARDS.filter((r) => itemOf(r.id).itemClass === cls && !out.includes(r.id))
    if (pool.length === 0) throw new Error(`resolveRewardDraw: the pool has no ${cls} row left to deal for card ${i + 1} of '${engagementId}'`)
    out.push(pool[rollOf(campaign, CUP_IDS.reward, [engagementId, 'row', i]) % pool.length]!.id)
  }
  return out
}

/** A percent roll (0–99) against the odds table, in table order. */
function classOfRoll(r: number): string {
  let at = 0
  for (const o of REWARD_ODDS) { at += o.pct; if (r < at) return o.itemClass }
  throw new Error(`rewards odds sum to ${at}, not 100`)
}

/**
 * kingdom.opening-rewards: what a won battle offers — its row's (src/content/encounter-rewards.ts): nothing, or one
 * item, offered only when some hero may take it (SWITCHES.md openingItemTakers); without a row, or with a 'draw' row,
 * the standing draw. Pure.
 */
export function resolveBattleOffer(campaign: CampaignState, engagementId: string): string[] | null {
  const offer = encounterRewardOf(engagementId)?.offer
  if (!offer || offer.kind === 'draw') return resolveRewardDraw(campaign, engagementId)
  if (offer.kind === 'none') return null
  return takersOf(campaign, offer.itemId, offer.takers).length ? [offer.itemId] : null
}

/** The item the cursor's battle offers to named classes, or null — read from the row of the Engagement on the cursor. */
function namedTakerOffer(campaign: CampaignState): { itemId: string; takers: readonly string[] } | null {
  const id = campaign.cursor.engagement?.id
  const offer = id === undefined ? undefined : encounterRewardOf(id)?.offer
  return offer?.kind === 'item' ? offer : null
}

/** Who may take `itemId`: alive, of one of `takers`' classes, and it fits beside what they carry. Sorted (Law 6). */
function takersOf(campaign: CampaignState, itemId: string, takers: readonly string[]): HeroId[] {
  return Object.values(campaign.roster)
    .filter((h) => h.lifeState === 'alive' && h.classes.some((c) => takers.includes(c)) && whyNotFit(campaign, h.id, [...h.equipped, itemId]) === null)
    .map((h) => h.id).sort()
}

/** Who may take this reward — empty for a reward that goes to the stash. */
export function listRewardTakers(campaign: CampaignState, itemId: string): HeroId[] {
  const named = namedTakerOffer(campaign)
  return named && named.itemId === itemId ? takersOf(campaign, itemId, named.takers) : []
}

export function listRewardOffers(campaign: CampaignState): RewardRow[] {
  // an offered item outside the draw's pool (a row's own item) is shown as the pool shows its rows
  return (campaign.cursor.rewardOffer ?? []).map((id) => REWARDS.find((r) => r.id === id) ?? offerRowOf(id))
}
const offerRowOf = (id: string): RewardRow => { const r = itemOf(id); return { id: r.id, name: r.name, tier: r.tier, slot: slotOf(r) } }

/** Why this reward cannot be taken (by this hero) — or null. A row's named-class item names its taker; a drawn item names none. */
export function whyNotTakeReward(campaign: CampaignState, itemId: string, heroId?: HeroId): string | null {
  if (campaign.cursor.step !== 'rewards' || !(campaign.cursor.rewardOffer ?? []).includes(itemId)) return `'${itemId}' is not on offer at step '${campaign.cursor.step}' — ${(campaign.cursor.rewardOffer ?? []).join(', ') || 'nothing is'}`
  const named = namedTakerOffer(campaign)
  if (named && named.itemId === itemId) {
    const may = takersOf(campaign, itemId, named.takers)
    if (heroId === undefined) return `'${itemId}' is taken by a hero of ${named.takers.join(' or ')} — name one of ${may.join(', ') || 'nobody'}`
    if (!may.includes(heroId)) return `'${heroId}' cannot take '${itemId}' — it is for ${named.takers.join(' or ')}, alive, with room for it; ${may.join(', ') || 'nobody'} may`
    return null
  }
  if (heroId !== undefined) return `'${itemId}' goes to the stash — it names no hero`
  return null
}

export function canTakeReward(campaign: CampaignState, itemId: string, heroId?: HeroId): boolean {
  return whyNotTakeReward(campaign, itemId, heroId) === null
}

/** Take the reward: into the stash — or, a row's named-class item, onto the hero who takes it. */
export function performTakeReward(ctx: Ctx, itemId: string, causeId: string, heroId?: HeroId): void {
  const why = whyNotTakeReward(ctx.campaign, itemId, heroId)
  if (why) throw new Error(`performTakeReward refused: ${why}`)
  applyTakeReward(ctx, itemId, causeId)
  if (heroId !== undefined) applyEquip(ctx, heroId, itemId, causeId)
  const next = listLevelUps(ctx.campaign).length ? 'levelUp' : 'open'
  setCursor(ctx, next === 'open' ? { step: 'open', engagement: null, battle: null } : { step: next }, causeId)
}

// ── levels ──────────────────────────────────────────────────────────────────

export function canLevelUp(campaign: CampaignState, heroId: HeroId): boolean {
  const h = campaign.roster[heroId]
  if (!h || h.lifeState !== 'alive') return false
  const need = xpForLevel(h.level + 1)
  return need !== null && h.xp >= need
}

/** Everyone who may level now. Sorted by id (Law 6). */
export function listLevelUps(campaign: CampaignState): HeroId[] {
  return Object.keys(campaign.roster).filter((id) => canLevelUp(campaign, id)).sort()
}

/**
 * The table a hero levels on and the class its specialty is of — the ENGINE's (levelTableOf, classOf over the hero's
 * unit row): a civilian levels on its type table (civilian.farmer) and takes a class.civilian specialty. kingdom.reads-
 * engine (review finding K1): this read the first of the hero's classes, so the level-up screen showed the class
 * table's grants and options while the battle folded the type table's, and a pick made from the class options made
 * the engine refuse to field the hero.
 */
export const levelTableOfHero = (campaign: CampaignState, heroId: HeroId): { table: string; classId: string } => {
  const h = campaign.roster[heroId]
  if (!h) throw new Error(`no hero '${heroId}'`)
  const def = UNITS[h.unitType]
  if (!def) throw new Error(`${heroId} fields as '${h.unitType}', which is no engine unit — no level table to read`)
  return { table: levelTableOf(def), classId: classOf(def) }
}

/**
 * kingdom.opening-specialty-three — the specialties a hero's specialty choice offers. Ruled 2026-10-03 (Andrew,
 * engine/DECISIONS.md 'card art on the level-up and reward screens; the specialty choice offers three, not nine': "you're
 * supposed to only get a choice of three different specialty classes, not nine."; '… the specialty three are random; …':
 * "It's random: 3 of the 9."): a plain draw without repeats of the content's count (SPECIALTY_OFFER) from the specialties
 * of the hero's class (content's nine), on the run's own named stream — cup.reward, keyed by what the roll is: this hero's
 * specialty offer. Nothing is stored for it: the three are DERIVED from the Campaign, so a run saved on the choice and
 * reopened shows the same three, and two heroes of one class are drawn apart (their keys differ). Pure.
 * kingdom SWITCHES.md specialtyThreeDraw, specialtyThreeCup.
 */
export function specialtyOfferOf(campaign: CampaignState, heroId: HeroId): SpecialtyRow[] {
  return drawOf(campaign, CUP_IDS.reward, ['specialty', heroId], specialtiesOf(levelTableOfHero(campaign, heroId).classId), SPECIALTY_OFFER)
}

/** What the next level does (screens.after-battle, G12): the row's grants, the specialty offer at the codex's level, the level-5 pick. Pure. */
export type LevelUpView = {
  heroId: HeroId
  from: number
  to: number
  row: LevelRow
  /** The specialty is chosen here — the first level-up (codex levels.rules) — and only if none is held. */
  needsSpecialty: boolean
  /** The specialties offered — specialtyOfferOf: three of the class's, the run's own draw for this hero (until 2026-10-04, all nine). */
  specialtyOffers: SpecialtyRow[]
  /** The row carries a choice: one of these, by index. */
  pickOptions: readonly Readonly<Record<string, number>>[] | null
  specialty: SpecialtyRow | null
}
export function viewLevelUp(campaign: CampaignState, heroId: HeroId): LevelUpView {
  const h = campaign.roster[heroId]
  if (!h) throw new Error(`no hero '${heroId}'`)
  const { table } = levelTableOfHero(campaign, heroId)
  const row = levelRowOf(table, h.level + 1)
  const needsSpecialty = row.specialty && !h.specialty
  return {
    heroId, from: h.level, to: h.level + 1, row,
    needsSpecialty, specialtyOffers: needsSpecialty ? specialtyOfferOf(campaign, heroId) : [],
    pickOptions: row.choice ?? null,
    specialty: h.specialty ? specialtyOf(h.specialty) : null,
  }
}

export type LevelChoice = { specialtyId?: string; pick?: number }

/** Why this level cannot be taken with this choice — or null. Refuses loudly (Law 9): a specialty owed and not named, a pick owed and not made, a specialty of another class. */
export function whyNotLevelUp(campaign: CampaignState, heroId: HeroId, choice: LevelChoice = {}): string | null {
  if (!canLevelUp(campaign, heroId)) {
    const h = campaign.roster[heroId]
    return h ? `${h.xp} xp at level ${h.level}, needs ${xpForLevel(h.level + 1) ?? 'a curve past the ruled one'}` : 'no such hero'
  }
  const v = viewLevelUp(campaign, heroId)
  if (v.needsSpecialty) {
    // the offer is made once; a level taken without a name DECLINES it unless the switch says it must be answered
    if (!choice.specialtyId && SWITCHES.levelUpSpecialtyRequired) return `reaching level ${v.to} chooses a specialty — name one of ${v.specialtyOffers.map((s) => s.id).join(', ')}`
    if (choice.specialtyId && !v.specialtyOffers.some((s) => s.id === choice.specialtyId)) {
      const classId = levelTableOfHero(campaign, heroId).classId
      if (!specialtiesOf(classId).some((s) => s.id === choice.specialtyId)) return `'${choice.specialtyId}' is not a ${classId} specialty`
      return `'${choice.specialtyId}' is not one of the ${v.specialtyOffers.length} offered to ${campaign.roster[heroId]!.name} — ${v.specialtyOffers.map((s) => s.id).join(', ')}`
    }
  } else if (choice.specialtyId) return `the specialty is chosen once, at the first level-up — ${campaign.roster[heroId]!.name} already ${campaign.roster[heroId]!.specialty ? 'holds ' + campaign.roster[heroId]!.specialty : 'passed it'}`
  if (v.pickOptions) {
    if (choice.pick === undefined) return `level ${v.to} picks one of ${v.pickOptions.length} — name its index`
    if (!Number.isInteger(choice.pick) || choice.pick < 0 || choice.pick >= v.pickOptions.length) return `pick ${choice.pick} is not one of level ${v.to}'s ${v.pickOptions.length} options`
  } else if (choice.pick !== undefined) return `level ${v.to} offers no pick`
  return null
}

export function performLevelUp(ctx: Ctx, heroId: HeroId, causeId: string, choice: LevelChoice = {}): void {
  const why = whyNotLevelUp(ctx.campaign, heroId, choice)
  if (why) throw new Error(`performLevelUp refused for '${heroId}': ${why}`)
  const v = viewLevelUp(ctx.campaign, heroId)
  if (v.needsSpecialty && choice.specialtyId) applySpecialty(ctx, heroId, choice.specialtyId, causeId)
  applyLevel(ctx, heroId, causeId, v.row.grants, v.pickOptions ? choice.pick! : null, v.needsSpecialty && !choice.specialtyId)
}

/** Leave the level-up step for the Week, levelled or not — a level waits; XP is never lost. */
export function performLeaveLevelUp(ctx: Ctx, causeId: string): void {
  if (ctx.campaign.cursor.step !== 'levelUp') throw new Error(`performLeaveLevelUp refused: the cursor is at '${ctx.campaign.cursor.step}'`)
  setCursor(ctx, { step: 'open', engagement: null, battle: null }, causeId)
}

/** After the writer: a won battle offers its draft; then whoever can level; then the Week. */
export function performExitReckoning(ctx: Ctx, causeId: string): void {
  const c = ctx.campaign
  if (c.cursor.step !== 'reckoning') throw new Error(`performExitReckoning refused: the cursor is at '${c.cursor.step}', not the Reckoning`)
  if (c.cursor.rewardOffer) { setCursor(ctx, { step: 'rewards' }, causeId); return }
  setCursor(ctx, { step: listLevelUps(c).length ? 'levelUp' : 'open' }, causeId)
}
