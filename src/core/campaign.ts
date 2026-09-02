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

export type StageId = string
export type CurrencyId = string
export type HeroId = string
export type TerritoryId = string
export type BuildingId = string

/** GAME-ARCHITECTURE.md §2.2 — the coarse position within a Week. */
export type CursorStep = 'open' | 'prep' | 'battle' | 'reckoning' | 'rewards' | 'levelUp'
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
  territoryId: TerritoryId
  mapId: string
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
  week: number
  stage: StageId
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
  /** The reward draft on offer after a won battle — three item ids, keep one — while step === 'rewards'. */
  rewardOffer: string[] | null
  /**
   * §4.4 (THIN-SLICE-IMPLEMENTATION.md): the battle's seed and options, never
   * its state. In the slice the battle is not played; this holds what the
   * outcome panel SET — the result and the Reckoning proposed from it, both
   * plain data — until the one writer applies them, so a reload lands back on
   * the panel or the tally with nothing lost.
   */
  battle: { resultSet: boolean; result?: EngagementResult; reckoning?: Reckoning } | null
}

export type Hero = {
  id: HeroId
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
  /** Item ids worn, from the stash (GAME-ARCHITECTURE.md §1: `campaign.stash[] + hero.equipped`). */
  equipped: string[]
  /** Per-hero corruption, STORED (SKELETON-SETTLED.md:117 derives the pool; the summand lives here). */
  corruption: number
}

/**
 * One hero, one thing, one slot (§2.3, amended Law 17). `kind` is the
 * destination — an Engagement, a quest, a labour, a service, healing, rest —
 * `target` what it is, `weeks` how long it holds. A quest is written to BOTH
 * slots: "questing costs two actions, fighting costs one."
 */
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

export type QuestInFlight = { id: string; heroes: HeroId[]; weeksLeft: number }

export type CampaignState = {
  realm: string
  seed: number
  week: number
  cursor: Cursor
  purse: Record<CurrencyId, number>
  renown: number
  unlocks: string[]
  revealed: string[]
  roster: Record<HeroId, Hero>
  assignments: Record<HeroId, { field?: Assignment; city?: Assignment }>
  stash: string[]
  territories: Record<TerritoryId, Territory>
  threat: number
  losses: number
  quests: Record<string, QuestInFlight>
  captured: HeroId[]
  /** Who the Week's unavailability roll kept home (KINGDOM-DESIGN.md §3) — cleared at the Week boundary. */
  unavailable: HeroId[]
  /** Named streams' root seeds — every Campaign roll is keyed by what it is (Law 4). Never a counter. */
  cups: Record<string, number>
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
    realm: options.realm,
    seed,
    week: options.week ?? 1,
    cursor: { week: options.week ?? 1, stage: options.stage, step: 'open', prepStep: null, engagement: null, attack: null, fought: 0, recruited: 0, rewardOffer: null, battle: null },
    purse,
    renown: options.renown ?? 0,
    unlocks: [],
    revealed: [],
    roster,
    assignments: {},
    stash: [],
    territories,
    threat: 0,
    losses: 0,
    quests: {},
    captured: [],
    unavailable: [],
    cups,
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

/** The load: parse, then refuse anything that is not a Campaign (Law 9). */
export function campaignOf(json: string): CampaignState {
  const c = JSON.parse(json) as CampaignState
  assertPlainData(c)
  const required: (keyof CampaignState)[] = ['realm', 'seed', 'week', 'cursor', 'purse', 'renown', 'unlocks', 'revealed', 'roster', 'assignments', 'stash', 'territories', 'threat', 'losses', 'quests', 'captured', 'unavailable', 'cups']
  for (const k of required) if (!(k in c)) throw new Error(`save is missing '${k}' — not a Campaign`)
  for (const k of ['week', 'stage', 'step', 'prepStep', 'engagement', 'attack', 'fought', 'recruited', 'rewardOffer', 'battle'] as const) if (!(k in c.cursor)) throw new Error(`save's cursor is missing '${k}'`)
  return c
}
