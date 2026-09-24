// CampaignState — one save. GAME-ARCHITECTURE.md §1 (the tiers, "where each
// thing lives"), §2.2 (the cursor), §2.3 (assignments), §4 (the Engagement).
//
// Plain data, Constitution Law 5b: integers, strings, arrays, plain objects,
// ids. No classes, no Map or Set, no functions, no object references — saving
// is JSON.stringify(campaign) and loading is the reverse, and ISC-004 is the
// test that says so. Every field below has a home named in the architecture
// document; the four the skeleton session flagged as owed (SKELETON-SETTLED.md
// :57-61 — losses, quests in flight, captured, corruption stored) are here too.
//
// Nothing in this file mutates. Mutation goes through src/core/mutate.ts and
// emits (Law 3).

import type { EngagementResult } from './seam.js'
import type { Reckoning } from './reckoning.js'
import { STAGES, FIELD_STEPS, type FieldStep } from '../content/stages.js'
import { validateQuestSave } from './quests.js'

export type StageId = string
export type CurrencyId = string
export type HeroId = string
export type TerritoryId = string
export type BuildingId = string

/**
 * GAME-ARCHITECTURE.md §2.2 — the coarse position within a Week. `draft` is
 * the one value §2.2 did not list: "The draft — the player's FIRST act — has no
 * screen and no cursor.step value" (THIN-SLICE-REVIEW.md §E); it is added for
 * the opening, and flagged.
 */
export type CursorStep = 'open' | 'prep' | 'battle' | 'reckoning' | 'rewards' | 'levelUp' | 'draft' | 'questReport'
/** §4 "Inside Combat Prep — four ordered steps". The ORDER is a row list in src/content/prep.ts, not here. */
export type PrepStep = 'reveal' | 'council' | 'deploy' | 'equip'

/**
 * One Engagement — anything that becomes a Battle (§4). Campaign state until
 * the battle begins; the prep choices accumulate on it and nowhere else.
 * `kind` names one of the stakes rows in src/content/engagements.ts — "three
 * data rows, not three code paths" — so core never spells one out.
 */
export type Engagement = {
  id: string
  kind: string
  /** The ground at stake — null for a prologue battle that takes none (content/prologue.ts). */
  territoryId: TerritoryId | null
  mapId: string
  /** One of the opening's five (its number), or absent. Not a kind: a flag on an Engagement of an existing kind. */
  prologue?: number
  /** The particular dispatched quest, not the reusable quest content row. */
  questRunId?: string
  /** Enemy unit typeIds, as the engine fields them. */
  enemies: string[]
  /** A condition.* id, or null when the Reveal shows none. */
  condition: string | null
  /** The War Council's draw, offered then taken. Empty until the council step. */
  councilOffer: string[]
  tactic: string | null
  /** Heroes committed to the field, in deployment order. */
  deployed: HeroId[]
  /** The battle's named seed — keyed by what the battle IS, never by when. */
  seed: number
}

export type Cursor = {
  /** Pending report acknowledgment, while step === questReport. */
  questReport: string | null
  week: number
  stage: StageId
  fieldStep: FieldStep | null
  conquestAttempted: boolean
  step: CursorStep
  /** Which of the four prep steps, while step === 'prep'; null otherwise. */
  prepStep: PrepStep | null
  engagement: Engagement | null
  /**
   * The Territory the weekly defend roll picked, while stage.defend is open and
   * the attack is unanswered — a counterattack you did not defend is a
   * Territory lost (SKELETON-SETTLED.md:80). Null otherwise.
   */
  attack: TerritoryId | null
  /** Engagements resolved in this Stage so far — the Stage offers no more past SWITCHES engagements.perStage. */
  fought: number
  /** Recruits this Week — "one hero per Week" (KINGDOM-DESIGN.md §3). */
  recruited: number
  /** Bought off the Forge's shelf this Week — the shelf is rolled by the Week, and a sold item leaves it until the reroll. */
  sold: string[]
  /** One-use items spent in the Battle being fought — restocked when it is left (GEAR-DESIGN.md §4). */
  spent: string[]
  /** The reward draft on offer after a won battle — three item ids, keep one — while step === 'rewards'. */
  rewardOffer: string[] | null
  /** The opening: the next prologue battle's number (1–5) while the opening runs; null once the Kingdom Territory is taken. */
  prologue: number | null
  /** The draft on offer — three hero ids, take one — while step === 'draft'. */
  draftOffer: string[] | null
  /**
   * §4.4 (THIN-SLICE-IMPLEMENTATION.md): the battle's seed and options, never
   * its state. In the slice the battle is not played; this holds what the
   * outcome panel SET — the result and the Reckoning proposed from it, both
   * plain data — until the one writer applies them, so a reload lands back on
   * the panel or the tally with nothing lost.
   */
  battle: { resultSet: boolean; result?: EngagementResult; reckoning?: Reckoning; questReward?: QuestReward } | null
  /**
   * The equip session (G5, ruled 2026-09-02): open while the Equip step runs at prep, or
   * while the player is fitting gear from the roster between battles. `paid` is what this
   * session spent to equip — refunded if the item comes off before the session closes,
   * kept once it has ("once you leave that screen, it's saved").
   */
  equipSession: { where: 'prep' | 'roster'; paid: { heroId: HeroId; itemId: string; cost: Record<CurrencyId, number> }[] } | null
}

export type Hero = {
  id: HeroId
  /** Content/art identity for distinct campaign instances of one civilian. */
  templateId?: string
  name: string
  /** Plural — a multi-class hero satisfies a class filter if any one matches (3-UNITS-SETTLED.md). */
  classes: string[]
  level: number
  xp: number
  /** A LEVEL, replaced not accumulated (§4.2): 0 none · 1 Wounded · 2 Badly Wounded · 3 Severe. */
  wound: number
  /** Campaign-tier life. Dead heroes stay on the roster for the Memorial; commitmentOf answers 'dead'. */
  lifeState: 'alive' | 'dead'
  /** injury.* · badge.* · origin.* · mark.* — one list, the prefix is the meaning. */
  badges: string[]
  /** The engine unit row this hero fields as, until the Crucible generates units. */
  unitType: string
  /** Item ids worn, from the stash (GAME-ARCHITECTURE.md §1: `campaign.stash[] + hero.equipped`). ORDER IS PLACEMENT (src/core/loadout.ts). */
  equipped: string[]
  /**
   * v2.item-uses (2026-09-24): uses spent by each equipped instance, parallel to `equipped` —
   * the campaign record of spent item instances (DUNGEON-MODE-2026-09-07, 2026-09-10:
   * "Persist … spent item instances"). Absent = nothing spent. Written only by
   * applyInstanceUse; cleared by the restock as the Battle is left (ISC-061).
   */
  used?: number[]
  /** General item slots, from the codex hero row (`itemSlots`, 0–3). Hands and the armor slot are not counted here. */
  itemSlots: number
  /** Per-hero corruption, STORED (SKELETON-SETTLED.md:117 derives the pool; the summand lives here). */
  corruption: number
  /** The specialty chosen at the first level-up (the codex: reaching level 2), a specialty.* id — or null/absent before it. G12. */
  specialty?: string | null
  /** The level-5 pick: the INDEX of the option taken from the class table's choice row — or null/absent. The engine reads the option by index through the seam. G12. */
  levelPick?: number | null
}

/** One exclusive assignment per hero; fighting participation is tracked separately for the Week. */
export type Assignment = { kind: 'engagement' | 'quest' | 'labour' | 'service' | 'heal' | 'rest'; target: string; weeks: number }

/** A building on a Territory: which nodes of its tree are built; `level` is their count (the art's band keys to it). */
export type Building = { id: BuildingId; level: number; damaged: boolean; nodes: string[] }

export type Territory = {
  id: TerritoryId
  name: string
  mapId: string
  owned: boolean
  /** The Kingdom Territory: cannot be lost (SKELETON-SETTLED.md:81). Stakes data, not a fourth kind. */
  kingdom: boolean
  /** Salvage and the one-time reward never fire twice (SKELETON-SETTLED.md:108). */
  claimedOnce: boolean
  buildings: Building[]
  adjacent: TerritoryId[]
  /**
   * What holds it — the enemy unit typeIds a Conquer here fields. In the slice
   * "encounters collapse to difficulty-ranked rows with enemy lists"
   * (THIN-SLICE-REVIEW.md §G ruling 4); the ranked list is post-slice, so the
   * Territory carries its own.
   */
  enemies: string[]
  /** The node it carries — a Mine, a Field, an Abbey, a Wellspring — or none. Permissions, never payments (7-KINGDOM-SETTLED.md). */
  node: 'mine' | 'field' | 'abbey' | 'wellspring' | null
}

export type QuestOutcome = { kind: 'report'; won: boolean; rescued: { id: HeroId; templateId: string } | null } | { kind: 'battle'; engagement: Engagement }
export type QuestReward = { runId: string; fixedXp: { heroId: HeroId; amount: number }[]; grants: { currency: string; amount: number }[] }
export type QuestInFlight = { id: string; runId: string; leadHeroId: HeroId | null; heroes: HeroId[]; weeksLeft: number; sentWeek: number; dueWeek: number; outcome: QuestOutcome | null }
/** One hero the Week's roll kept home, with the story line drawn for them. */
export type Absence = { heroId: HeroId; story: string; returnWeek?: number }

export type CampaignState = {
  version: 2
  realm: string
  seed: number
  week: number
  cursor: Cursor
  purse: Record<CurrencyId, number>
  renown: number
  unlocks: string[]
  revealed: string[]
  roster: Record<HeroId, Hero>
  assignments: Record<HeroId, Assignment>
  /** Fighting can continue in the Field, but precludes City work this Week. */
  foughtThisWeek: HeroId[]
  stash: string[]
  territories: Record<TerritoryId, Territory>
  threat: number
  losses: number
  quests: Record<string, QuestInFlight>
  captured: HeroId[]
  /** Who the Week's unavailability roll kept home, and the story why (KINGDOM-DESIGN.md §3) — cleared at the Week boundary. */
  unavailable: Absence[]
  /** Named streams' root seeds — every Campaign roll is keyed by what it is (Law 4). Never a counter. */
  cups: Record<string, number>
  /** Permanent death: a Campaign that ended, and why. GAME-ARCHITECTURE.md §2.5, §6 — the only path out of a wipe. */
  ended: { week: number; reason: string } | null
}

export type MakeCampaignOptions = {
  realm: string
  /** The opening Stage; the Week machine (M5) reads it from the Stage rows. */
  stage: StageId
  currencies: readonly CurrencyId[]
  cups: readonly string[]
  territories: readonly Territory[]
  roster: readonly Hero[]
  week?: number
  /** Opening balances, by currency id; anything unnamed opens at 0. Authored state, not a grant — no event. */
  purse?: Readonly<Record<CurrencyId, number>>
  renown?: number
}

/** A pure constructor of plain data — nothing rolled, nothing emitted. */
export function makeCampaign(seed: number, options: MakeCampaignOptions): CampaignState {
  const purse: Record<CurrencyId, number> = {}
  for (const c of [...options.currencies].sort()) purse[c] = options.purse?.[c] ?? 0
  for (const c of Object.keys(options.purse ?? {})) if (!(c in purse)) throw new Error(`makeCampaign: opening balance names '${c}', which is not one of the currencies`)
  const cups: Record<string, number> = {}
  // Each cup's root is a stable function of the campaign seed and the cup's
  // name — derived once, written down, never advanced.
  ;[...options.cups].sort().forEach((cup) => { cups[cup] = cupRootOf(seed, cup) })
  const roster: Record<HeroId, Hero> = {}
  for (const h of [...options.roster].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) roster[h.id] = { ...h, classes: [...h.classes], badges: [...h.badges], equipped: [...h.equipped] }
  const territories: Record<TerritoryId, Territory> = {}
  for (const t of [...options.territories].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    territories[t.id] = { ...t, buildings: t.buildings.map((b) => ({ ...b, nodes: [...b.nodes] })), adjacent: [...t.adjacent], enemies: [...t.enemies], node: t.node }
  }
  return {
    version: 2,
    realm: options.realm,
    seed,
    week: options.week ?? 1,
    cursor: { questReport: null, week: options.week ?? 1, stage: options.stage, fieldStep: STAGES.find((s) => s.id === options.stage)?.spends === 'assignments' ? FIELD_STEPS[0]!.key : null, conquestAttempted: false, step: 'open', prepStep: null, engagement: null, attack: null, fought: 0, recruited: 0, sold: [], spent: [], rewardOffer: null, prologue: null, draftOffer: null, battle: null, equipSession: null },
    purse,
    renown: options.renown ?? 0,
    unlocks: [],
    revealed: [],
    roster,
    assignments: {},
    foughtThisWeek: [],
    stash: [],
    territories,
    threat: 0,
    losses: 0,
    quests: {},
    captured: [],
    unavailable: [],
    cups,
    ended: null,
  }
}

/** FNV-1a over the seed and the cup's name — integers only (Law 7). */
export function cupRootOf(seed: number, cup: string): number {
  let h = 0x811c9dc5
  const mix = (v: number) => { h ^= v & 0xff; h = Math.imul(h, 0x01000193) >>> 0 }
  for (let b = 0; b < 4; b++) mix(seed >>> (b * 8))
  for (let i = 0; i < cup.length; i++) mix(cup.charCodeAt(i))
  return h >>> 0
}

/**
 * Law 5b, enforced: walk a value and refuse anything that would not survive
 * JSON — a class instance, a Map, a Set, a function, a non-integer where the
 * rules want one is the caller's business; here only the SHAPE is policed.
 * Throws with the path, never returns false (Law 9).
 */
export function assertPlainData(value: unknown, path = 'campaign'): void {
  if (value === null) return
  const t = typeof value
  if (t === 'number') { if (!Number.isFinite(value as number)) throw new Error(`${path}: ${String(value)} is not a finite number`); return }
  if (t === 'string' || t === 'boolean') return
  if (t !== 'object') throw new Error(`${path}: a ${t} is not plain data`)
  if (Array.isArray(value)) { value.forEach((v, i) => assertPlainData(v, `${path}[${i}]`)); return }
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) throw new Error(`${path}: a ${(proto as { constructor?: { name?: string } }).constructor?.name ?? 'non-plain'} instance is not plain data`)
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) assertPlainData(v, `${path}.${k}`)
}

/** The save: what JSON.stringify writes, after the shape check. */
export function saveOf(campaign: CampaignState): string {
  assertPlainData(campaign)
  return JSON.stringify(campaign)
}

/** V2 saves must carry the complete cursor; V1 saves are deliberately not migrated. */
export function campaignOf(json: string): CampaignState {
  const c = JSON.parse(json) as CampaignState
  assertPlainData(c)
  if (c.version !== 2) throw new Error('not a Campaign V2 save: unsupported version — start a V2 Campaign')
  if (!Array.isArray(c.foughtThisWeek)) throw new Error("save is missing 'foughtThisWeek'")
  const required: (keyof CampaignState)[] = ['realm', 'seed', 'week', 'cursor', 'purse', 'renown', 'unlocks', 'revealed', 'roster', 'assignments', 'stash', 'territories', 'threat', 'losses', 'quests', 'captured', 'unavailable', 'cups', 'ended']
  for (const k of required) if (!(k in c)) throw new Error(`save is missing '${k}' — not a Campaign`)
  for (const k of ['questReport', 'week', 'stage', 'fieldStep', 'conquestAttempted', 'step', 'prepStep', 'engagement', 'attack', 'fought', 'recruited', 'rewardOffer', 'prologue', 'draftOffer', 'battle', 'equipSession', 'sold', 'spent'] as const) if (!(k in c.cursor)) throw new Error(`save's cursor is missing '${k}'`)
  const stage = STAGES.find((s) => s.id === c.cursor.stage)
  if (!stage) throw new Error('save has an unknown Week half')
  if (stage.spends === 'assignments' ? !FIELD_STEPS.some((s) => s.key === c.cursor.fieldStep) : c.cursor.fieldStep !== null) throw new Error('save has an invalid fieldStep for its Week half')
  if (typeof c.cursor.conquestAttempted !== 'boolean') throw new Error('save has an invalid conquestAttempted flag')
  validateQuestSave(c)
  return c
}
