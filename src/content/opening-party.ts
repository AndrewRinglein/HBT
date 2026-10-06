// fix.opening-party (2026-09-29): the party the player has at each of the opening's six battles.
//
// Ruled 2026-09-28 (Andrew, DECISIONS.md 'the opening is tested with the player's party, not the
// Alpha Team'): "Opening battles should be tested with a party the player should have at that
// point. We need to move away from these alpha heroes."
//
// The rules and the pool are progression/OPENING-PARTY.json's, built by progression/build-schedule.mjs
// from the ruled draft cadence (one drafted before battle 1 and one more after each battle, to six: a party of
// 1, 2, 3, 4, 5, 6 — DECISIONS.md 2026-10-03 'one draft after every battle; …', fix.opening-probe-cadence 2026-10-04;
// until then the file carried the 2026-08-23 cadence, 1, 3, 4, 5, 6, 6; one of three offered) and the 2026-09-28 rulings (the six in order; the Flaming Longsword
// after battle 2). Nothing here types a count, a hero or an item — this file only DRAWS the drafts.
//
// Prior art, extended not duplicated: the kingdom's draft (kingdom/src/core/opening.ts offerDraft —
// three not-yet-drafted pool rows drawn keyed by the draft's ordinal, one taken) is the same shape;
// the engine imports nothing from the kingdom, so the draw runs on the engine's named streams
// (core/rng.ts 'draft'). The fielding is the 2026-09-03 hero-assembly path — `heroes` + `heroItems`
// folded by fieldedDef() in createBattle — not a second one. Each hero enters wearing its row's own
// kit (`defaultItems`, GEAR-IMPLEMENTATION.md G3).
import OPENING from '../../../progression/OPENING-PARTY.json' with { type: 'json' }
import type { HeroProgress, UnitMods } from '../core/types.js'
import { makeRng, roll100, rollBelow, rootSeedOf, sample, type Rng } from '../core/rng.js'
import { isStatName, type StatName } from '../core/stats.js'
import { ACTIONS, ITEMS, LEVELS, UNITS } from './index.js'
import { fieldedDef, levelTableOf } from '../core/setup.js'

export type OpeningPosition = {
  readonly position: number
  readonly encounterId: string
  readonly name: string
  /** How many drafted heroes the player has at this battle. */
  readonly drafted: number
  /** fix.opening-first-level: per draft ordinal, the XP carried into this battle and the level it reaches. */
  readonly xp: readonly number[]
  readonly levels: readonly number[]
  /** Items won earlier in the opening and carried into this battle. */
  readonly carried: readonly string[]
}
export const OPENING_POSITIONS: readonly OpeningPosition[] = OPENING.positions
/** The specialty each class takes at level 2 (SWITCHES.md openingSpecialty — build-schedule.mjs's SPECIALTY). */
const SPECIALTY_OF: Readonly<Record<string, string>> = OPENING.specialties

/** The seed the draft draws under — the replicate alone, so battle n's party extends battle n-1's. */
const draftRng = (replicate: number) => makeRng(rootSeedOf(0, 0, replicate))

// ---------- the draft (fix.opening-draft, 2026-09-29) ----------
// Ruled 2026-09-28 (Andrew, DECISIONS.md 'the first hero: Leadership ...', 'no Health minimum; ... the
// draft pick is weighted' and 'the draft never repeats a class until all six are drafted'): the first
// hero is taken, not drafted — "You get the leadership badge. You get a random positive badge. 25% chance
// of another positive badge. +2 health. One stat point from the Crucible's randomness, a 30% chance of
// another stat point." Every later draft is "the Crucible randomness, three heroes, and then use a
// weighted system for what you choose", and "Until you've drafted all six of the starting classes, you
// never get a draft of the same class again."
//
// Prior art, extended not duplicated: the Crucible's generator (crucible/index.html generateCrucibleHero:
// the stat changes, then the badges; crucible/shim.js pickWeightedBadge) — its numbers are read out of its
// files by progression/build-schedule.mjs into OPENING-PARTY.json `crucible`, and this file only runs the
// procedure on the engine's named stream (Law 4) with integer rolls (Law 7). The badges reach the battle
// through heroBadges (badge.mechanism, applyBadges); the stat points through heroMods (seam.unit-mods,
// applyUnitMods) — no second fold. The pick's weights are build-schedule.mjs's W table (`draftScore`).

const CRUCIBLE = OPENING.crucible
const SCORE = OPENING.draftScore as { weights: Record<string, Record<string, number>>; meleeClasses: string[]; noMeleeBonus: number; rollSource: string }
type BadgeRow = { id: string; rarity: string; stats: Record<string, number> }
const FAVOURABLE = CRUCIBLE.badges.favourable as BadgeRow[]
const FLAWED = CRUCIBLE.badges.flawed as BadgeRow[]
const BADGE_ROW: Readonly<Record<string, BadgeRow>> = Object.fromEntries([...FAVOURABLE, ...FLAWED].map((b) => [b.id, b]))
const STEP = CRUCIBLE.statStep as Record<string, number>
const FLOOR = CRUCIBLE.statFloor as Record<string, number>
const STAT_OF = CRUCIBLE.statOf as Record<string, string>

/** One stat change the Crucible rolled, in the Crucible's word and the stat's own units (a Health point is 2 Health). */
export type Rolled = { readonly stat: string; readonly amount: number }
/**
 * The dice a draft rolls on, keyed by what the roll is (Law 4): `below` gives 0..n-1, `d100` 1..100. The engine's own
 * draft rolls on its 'draft' stream; a caller with a stream of its own (the kingdom's run) hands its own in —
 * fix.opening-draft-one-rule (2026-10-04): one procedure, whoever's dice.
 */
export type DraftRoller = { below(n: number, ...keys: number[]): number; d100(...keys: number[]): number }
/**
 * A hero's own value of a stat, in the Crucible's word — what a rolled point is added to and floored against (its row's number).
 * `fielded`, where the caller has it, is the same hero's value AS FIELDED bare — its row, its own kit and its row's badges: a
 * rolled LOSS is also held at the stat's floor against that (content.hero-origin-badges, 2026-10-05).
 * `own`, where the caller has it, is the badges the hero's own row already carries — its origin badges and any other on the
 * row: none of them is a badge the gift roll gives that hero (kingdom.gift-roll-leaves-out-own-badges, 2026-10-05).
 */
export type DraftBase = ((stat: string) => number) & { readonly fielded?: (stat: string) => number; readonly own?: readonly string[] }
/** What a draft gives one hero: its badges, the stat points it rolled, those points as the battle takes them, and the points no engine stat takes. */
export type DraftRolls = { readonly badges: string[]; readonly rolls: Rolled[]; readonly mods: UnitMods; readonly unfielded: Rolled[] }
/** A drafted hero as the opening fields it: its row, what it rolled, and what the battle is handed. */
export type OpeningHero = {
  readonly id: string
  /** The badges it carries in (handed over as heroBadges): the first hero's Leadership and its positive ones, or the Crucible's rolled badges. */
  readonly badges: readonly string[]
  /** The Crucible stat points it rolled (the first hero's included). */
  readonly rolls: readonly Rolled[]
  /** The rolls, and the first hero's +2 Health, as the battle takes them — seam.unit-mods, each naming its source. */
  readonly mods: UnitMods
  /** Rolls no engine stat can take (Item Slots is the kingdom's; Toughness and Vision are not unit mods) — kept, named, not fielded. */
  readonly unfielded: readonly Rolled[]
  /** The rows it was offered with (the first hero: itself alone), and each offer's weighted score. */
  readonly offered: readonly string[]
  readonly scores: readonly number[]
}

const classOfRow = (id: string): string | undefined => (UNITS[id]!.tags ?? []).find((t) => OPENING.classes.includes(t))
const isMelee = (id: string): boolean =>
  SCORE.meleeClasses.includes(classOfRow(id) ?? '') || UNITS[id]!.ai === 'melee-aggressive'
const stepOf = (stat: string): number => STEP[stat] ?? STEP['default']!
const floorOf = (stat: string): number => FLOOR[stat] ?? FLOOR['default']!
/**
 * A row's own value of a stat, in the Crucible's word — what a point is added to and floored against; and, as `fielded`, the
 * same hero as the engine fields it bare (its row, its own kit and its row's badges — fieldedDef).
 * content.hero-origin-badges (2026-10-05): the Forest Fey's row says Health 6 and she fields 2 (her Pilgrim's Habit, and
 * Frail on her row), so a rolled loss of 2, held at the Crucible's floor of 1 against the ROW alone (6 → 4), left her at 0
 * and the engine refused to field her. A loss is held against what she fields as well: she loses 1 and stands at 1.
 */
export const baseOfRow = (id: string): DraftBase => {
  const row = UNITS[id] as unknown as Record<string, number | undefined>
  let bare: Record<string, number | undefined> | undefined
  const base = ((stat: string) => row[STAT_OF[stat] ?? stat] ?? 0) as DraftBase & { fielded: (stat: string) => number; own: readonly string[] }
  base.fielded = (stat) => ((bare ??= fieldedDef(id) as unknown as Record<string, number | undefined>)[STAT_OF[stat] ?? stat]) ?? 0
  // the badges its own row carries (its origin badges among them): never a gift of its own
  base.own = [...(UNITS[id]!.badges ?? [])]
  return base
}
/** The engine's own draft dice: its named 'draft' stream (Law 4), keyed by what the roll is. */
const rollerOf = (rng: Rng): DraftRoller => ({ below: (n, ...keys) => rollBelow(rng, n, 'draft', ...keys), d100: (...keys) => roll100(rng, 'draft', ...keys) })

/**
 * The Crucible's stat changes (generateCrucibleHero: `gains` then `losses`, a stat never twice, up to
 * `repeatAttempts` rolls to find a new one; one change is the stat's step, held at its floor).
 */
function rollStats(roller: DraftRoller, baseOf: DraftBase, gains: number, losses: number, keys: readonly number[], used: Set<string>): Rolled[] {
  const out: Rolled[] = []
  const now: Record<string, number> = {}
  for (const [sign, count, sub] of [[1, gains, 1], [-1, losses, 2]] as const) {
    for (let i = 0; i < count; i++) {
      let stat = '', a = 0
      do { stat = CRUCIBLE.statPool[roller.below(CRUCIBLE.statPool.length, ...keys, sub, i, a)]!; a++ } while (used.has(stat) && a < CRUCIBLE.repeatAttempts)
      if (used.has(stat)) continue
      const was = now[stat] ?? baseOf(stat)
      let is = Math.max(floorOf(stat), was + sign * stepOf(stat))
      // a loss is held at the floor against the hero as fielded too: never more than the room the fielded hero has above it
      if (sign < 0 && baseOf.fielded) is = Math.max(is, was - Math.max(0, baseOf.fielded(stat) - floorOf(stat)))
      now[stat] = is
      used.add(stat)
      if (is !== was) out.push({ stat, amount: is - was })
    }
  }
  return out
}

/**
 * pickWeightedBadge: favourable at `favourablePercent`, else flawed; weighted by rarity; `exclude` never.
 *
 * kingdom.gift-roll-leaves-out-own-badges (2026-10-05, Andrew, DECISIONS.md 'a prone unit only stands; …; no gift doubles a
 * hero's own badge; …' — told that the draft can roll a hero a gift badge its row already has (the Berserker rolled Huge, the
 * Fey rolled Frail), which then adds nothing, and asked whether a hero's own badges should be left out of its gift roll:
 * "7, yes."): `own` — the badges the hero's own row already carries — is never the badge given either. ONE RULE, HERE, for the
 * first hero's badges and every later draft's, the engine's own draft and the kingdom's (both hand `own` in on the hero's base).
 * The roll is made as it always was, on the same key, from the same badges; only when it lands on one of the hero's own is it
 * made again — one further key — among the same badges without the hero's own. So every roll that did not land on an own
 * badge gives the badge it gave before (a saved run shows the same offers except where an offer held a doubled badge), and
 * a hero with no badge of its own in the roll's reach rolls exactly as before; the badge given instead is still drawn by
 * rarity among those left (SWITCHES.md giftRollOwnAgain).
 */
function pickBadge(roller: DraftRoller, favourablePercent: number, exclude: ReadonlySet<string>, keys: readonly number[], own: readonly string[] = []): string | null {
  const wantGood = roller.d100(...keys, 0) <= favourablePercent
  let cands = (wantGood ? FAVOURABLE : FLAWED).filter((b) => !exclude.has(b.id))
  if (!cands.length) cands = [...FAVOURABLE, ...FLAWED].filter((b) => !exclude.has(b.id))
  if (!cands.length) return null
  const weight = (b: BadgeRow) => (CRUCIBLE.rarityWeight as Record<string, number>)[b.rarity] ?? CRUCIBLE.rarityDefault
  const draw = (from: readonly BadgeRow[], ...again: number[]): string => {
    let r = roller.below(from.reduce((s, b) => s + weight(b), 0), ...keys, 1, ...again)
    for (const b of from) { r -= weight(b); if (r < 0) return b.id }
    return from[from.length - 1]!.id
  }
  const first = draw(cands)
  if (!own.includes(first)) return first
  // it landed on a badge the hero's row already has: drawn again among the others (of this kind; of either, were none left)
  let rest = cands.filter((b) => !own.includes(b.id))
  if (!rest.length) rest = [...FAVOURABLE, ...FLAWED].filter((b) => !exclude.has(b.id) && !own.includes(b.id))
  return rest.length ? draw(rest, 1) : null
}

/** The rolls as unit mods; what no engine stat takes is returned apart, never dropped silently. */
function modsOf(rolls: readonly Rolled[], source: string, extra: UnitMods['stats'] = []): { mods: UnitMods; unfielded: Rolled[] } {
  const stats: { stat: StatName; add: number; source: string }[] = [...(extra ?? [])]
  const unfielded: Rolled[] = []
  for (const r of rolls) {
    const stat = STAT_OF[r.stat] ?? r.stat
    if (isStatName(stat)) stats.push({ stat, add: r.amount, source }); else unfielded.push(r)
  }
  return { mods: stats.length ? { stats } : {}, unfielded }
}

/** The weighted pick's score for a rolled offer: each rolled point and each rolled badge's stats by the class's weights, and a melee hero while the party has none. */
export function draftScoreOf(id: string, rolls: readonly Rolled[], badges: readonly string[], party: readonly string[]): number {
  const w = SCORE.weights[classOfRow(id) ?? ''] ?? {}
  let s = 0
  for (const r of rolls) s += (w[r.stat] ?? 0) * r.amount
  for (const b of badges) for (const [stat, v] of Object.entries(BADGE_ROW[b]?.stats ?? {})) s += (w[stat] ?? 0) * v
  if (isMelee(id) && !party.some(isMelee)) s += SCORE.noMeleeBonus
  return s
}

/**
 * The first hero's bonuses, for the hero whose base `baseOf` reads — the hero the player chose, or the row the engine's
 * own draft took: the rule's badges (Leadership), a positive badge and the chance of another, +Health, a Crucible stat
 * point and the chance of another. Nothing here depends on which hero it is but the floors a point is held at.
 * Exported for the played run (fix.opening-draft-one-rule, 2026-10-04): the kingdom calls this on its own stream.
 */
export function firstHeroDraftOf(roller: DraftRoller, baseOf: DraftBase): DraftRolls {
  const F = OPENING.firstHero
  const badges = [...F.badges]
  const positives = F.positiveBadges + (roller.d100(0, 2, 7) <= F.anotherBadgePercent ? 1 : 0)
  for (let i = 0; i < positives; i++) {
    const b = pickBadge(roller, 100, new Set(badges), [0, 2, 6, i], baseOf.own)
    if (b) badges.push(b)
  }
  const points = F.statPoints + (roller.d100(0, 2, 9) <= F.anotherPointPercent ? 1 : 0)
  const rolls = rollStats(roller, baseOf, points, 0, [0, 2, 8], new Set())
  const { mods, unfielded } = modsOf(rolls, SCORE.rollSource, [{ stat: 'maxHp', add: F.health, source: F.healthSource }])
  return { badges, rolls, mods, unfielded }
}

/**
 * One draft's hand as the Crucible rolls it (generateCrucibleHero, dealHeroCards): per offered hero, in offer order, the
 * stat changes, then one to three badges — each hero's first badge unlike every badge the party already carries
 * (`carried`) and every first badge earlier in the hand. `ordinal` is the draft's (0 is the first hero's, never rolled
 * here); `bases[j]` reads offered hero j's own stats. Exported for the played run (fix.opening-draft-one-rule): the
 * player sees all three and picks; the engine's own draft takes the best-scoring.
 */
export function draftHandOf(roller: DraftRoller, bases: readonly DraftBase[], ordinal: number, carried: readonly string[]): DraftRolls[] {
  const signatures = new Set(carried)
  return bases.map((baseOf, j) => {
    const keys = [ordinal, 2 + j]
    const [gains, losses] = CRUCIBLE.modTypes[roller.below(CRUCIBLE.modTypes.length, ...keys, 0)]!
    const rolls = rollStats(roller, baseOf, gains!, losses!, keys, new Set())
    const c = roller.d100(...keys, 3)
    let count = 0, acc = 0
    for (const [n, pct] of CRUCIBLE.badgeCount) { acc += pct!; if (c <= acc) { count = n!; break } }
    const badges: string[] = []
    for (let i = 0; i < count; i++) {
      const signature = i === 0
      const exclude = new Set([...badges, ...(signature ? signatures : [])])
      const b = pickBadge(roller, signature ? CRUCIBLE.favourablePercent.signature : CRUCIBLE.favourablePercent.later, exclude, [...keys, 4, i], baseOf.own)
      if (b && !badges.includes(b)) { badges.push(b); if (signature) signatures.add(b) }
    }
    const { mods, unfielded } = modsOf(rolls, SCORE.rollSource)
    return { badges, rolls, mods, unfielded }
  })
}

/**
 * The first `count` heroes of a replicate, in draft order. The first is taken; every later one is the
 * best-scoring of `offer` rows of classes not yet drafted (until all six classes are), each rolled by the
 * Crucible. A pool row the content does not have is never offered. The same replicate gives the same
 * heroes with the same rolls, so a hero is the same at every opening position.
 */
export function openingHeroesOf(replicate: number, count: number): OpeningHero[] {
  const rng = draftRng(replicate)
  const roller = rollerOf(rng)
  const pool = OPENING.pool.filter((id) => UNITS[id])
  const drafted: OpeningHero[] = []
  for (let ordinal = 0; ordinal < count; ordinal++) {
    const ids = drafted.map((h) => h.id)
    const classes = new Set(ids.map(classOfRow))
    const allSix = OPENING.classes.every((c) => classes.has(c))
    const left = pool.filter((id) => !ids.includes(id))
    const eligible = allSix ? left : left.filter((id) => !classes.has(classOfRow(id)))
    if (eligible.length === 0) throw new Error(`opening draft ${ordinal + 1}: nobody left to draft — pool ${pool.length}, drafted ${ids.join(', ')}`)
    if (ordinal === 0) {
      const id = sample(rng, eligible, 1, 'draft', ordinal, 0)[0]!
      const first = firstHeroDraftOf(roller, baseOfRow(id))
      drafted.push({ id, badges: first.badges, rolls: first.rolls, mods: first.mods, unfielded: first.unfielded, offered: [id], scores: [] })
      continue
    }
    const offer = sample(rng, eligible, OPENING.offer, 'draft', ordinal, 0)
    // the hand's signature badges are unique against every badge the party already carries (dealHeroCards)
    const hand = draftHandOf(roller, offer.map(baseOfRow), ordinal, drafted.flatMap((h) => h.badges))
    const rolled = offer.map((id, j) => ({ id, ...hand[j]! }))
    const scores = rolled.map((o) => draftScoreOf(o.id, o.rolls, o.badges, ids))
    // the best score; a tie goes to the earlier offer (Law 6)
    const best = scores.reduce((b, s, j) => (s > scores[b]! ? j : b), 0)
    const take = rolled[best]!
    drafted.push({ id: take.id, badges: take.badges, rolls: take.rolls, mods: take.mods, unfielded: take.unfielded, offered: offer, scores })
  }
  return drafted
}

/** The first `count` drafted rows of a replicate, in draft order. */
export function openingDraftOf(replicate: number, count: number): string[] {
  return openingHeroesOf(replicate, count).map((h) => h.id)
}

// ---------- the carry (fix.opening-levels, 2026-10-02) ----------
// Ruled 2026-09-28 (Andrew, DECISIONS.md 'the opening's party levels up; the Flaming Longsword is a Warrior's or a
// Paladin's; the Bridge gives a reward' and 'levels by XP at 20, 50, 100, 170, 270, 400'): "They need to be leveling
// up." · "it only is going to help the paladin or the warrior." · "On battle 3, which is the bridge, we should be giving
// another reward, which can help."
//
// Prior art, extended not duplicated: the XP a battle pays and the level it reaches are the KINGDOM's (reckoning.ts
// battleXpOf, levels.ts LEVEL_THRESHOLDS; DECISIONS.md 2026-09-28 "the XP rewards are in the kingdom, not the
// engine"), and so are the rewards (encounter-rewards.ts, the standing draw resolveRewardDraw). The engine imports
// nothing (Law 5), so the kingdom carries a replicate through the opening (kingdom/src/sim/opening-run.ts) and hands
// each battle's party back here as an OpeningCarry — levels and items, never XP. This file only FIELDS it: the level
// through heroProgress (applyProgress, the one fold), the items through heroItems (applyItems, the one legality). Who
// holds an item and which of three cards a player keeps are the engine's because they read the engine's rows and the
// draft's weighted score (fix.opening-draft, OPENING-PARTY.json draftScore) — SWITCHES.md openingRewardPick.

/** What a replicate's earlier battles gave each drafted hero, by draft ordinal: the level its XP reached and what it holds. */
export type OpeningCarry = {
  /** The level each drafted hero has reached; a hero past the list (drafted since) is level 1. */
  readonly levels: readonly number[]
  /** The items each drafted hero holds in place of its kit; undefined = its Codex kit. */
  readonly items: readonly (readonly string[] | undefined)[]
}

/** Who may take a carried item, by class — OPENING-PARTY.json `takers` (build-schedule.mjs; the kingdom's reward row is the other half, checked agreeing by kingdom/test/opening-levels.test.ts). */
export const OPENING_TAKERS: Readonly<Record<string, readonly string[]>> = OPENING.takers

/** The stat a list's first weapon attacks with (strength, precision, magic, spirit), or undefined with no weapon. */
const attackStatOf = (itemIds: readonly string[]): string | undefined => {
  for (const k of itemIds) {
    const it = ITEMS[k]
    if (it?.itemClass !== 'weapon') continue
    for (const g of it.grants ?? []) { const a = ACTIONS[g]?.attack; if (a) return a.stat }
  }
  return undefined
}

/**
 * `itemId` on a hero now holding `held` (undefined = its kit): a weapon takes the place of the held weapons, an armour
 * of the held armour, a shield of the held shields; anything else is added — as SWITCHES.md openingCarriedHolder put
 * the sword: the kit's shield and armour stay beside a weapon.
 */
export function withOpeningItem(typeId: string, held: readonly string[] | undefined, itemId: string): string[] {
  const item = ITEMS[itemId]
  if (!item) throw new Error(`opening: carried item '${itemId}' is not in the content`)
  const now = [...(held ?? UNITS[typeId]!.defaultItems ?? [])]
  if (item.itemClass === 'weapon') return [itemId, ...now.filter((k) => ITEMS[k]?.itemClass !== 'weapon')]
  if (item.itemClass === 'armor' || item.itemClass === 'shield') return [...now.filter((k) => ITEMS[k]?.itemClass !== item.itemClass), itemId]
  return [...now, itemId]
}

/**
 * The hero's items with `itemId`, or null when it may not take it: its class among `takers` (when the item has
 * takers), the row's classRestriction, a weapon that attacks with the stat its own weapon does (a bow never to a
 * sword hand; a hero with no weapon, the Brawler, takes any), and fielded legally (fieldedDef — applyItems, the one legality: hands, slots, armour).
 */
function canHold(typeId: string, held: readonly string[] | undefined, itemId: string, takers?: readonly string[]): string[] | null {
  const item = ITEMS[itemId]!
  const tags = UNITS[typeId]!.tags ?? []
  if (takers && !takers.some((t) => tags.includes(t))) return null
  if (item.classRestriction && !tags.includes(item.classRestriction)) return null
  const own = attackStatOf(held ?? UNITS[typeId]!.defaultItems ?? [])
  if (item.itemClass === 'weapon' && own !== undefined && attackStatOf([itemId]) !== own) return null
  const next = withOpeningItem(typeId, held, itemId)
  try { fieldedDef(typeId, { items: next }) } catch { return null }
  return next
}

/** The first drafted hero (draft order) who may hold `itemId`, and its items with it — or null: nobody (the Flaming Longsword with no Warrior or Paladin drafted). */
export function openingHolderOf(itemId: string, heroes: readonly string[], held: readonly (readonly string[] | undefined)[], takers: readonly string[] | undefined = OPENING_TAKERS[itemId]): { holder: number; items: string[] } | null {
  for (let n = 0; n < heroes.length; n++) {
    const items = canHold(heroes[n]!, held[n], itemId, takers)
    if (items) return { holder: n, items }
  }
  return null
}

/** An item's worth to a hero: its class's draft weights (OPENING-PARTY.json draftScore) over the item's stat modifiers. */
const WORD_OF: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(STAT_OF).map(([w, s]) => [s, w]))
export function openingItemScoreOf(typeId: string, itemId: string): number {
  const w = SCORE.weights[classOfRow(typeId) ?? ''] ?? {}
  let s = 0
  for (const [stat, v] of Object.entries(ITEMS[itemId]!.statModifiers ?? {})) s += (w[WORD_OF[stat] ?? stat] ?? 0) * (v as number)
  return s
}

/**
 * Three reward cards, one kept "as a player would" (SWITCHES.md openingRewardPick): every card on every hero who may
 * hold it, scored by that hero's class's draft weights over the item's stat modifiers; the best pair is kept, a tie to
 * the earlier card, then the earlier hero (Law 6). Null when no card fits anyone.
 */
export function openingRewardPickOf(offers: readonly string[], heroes: readonly string[], held: readonly (readonly string[] | undefined)[]): { itemId: string; holder: number; items: string[]; score: number } | null {
  let best: { itemId: string; holder: number; items: string[]; score: number } | null = null
  for (const itemId of offers) {
    if (!ITEMS[itemId]) throw new Error(`opening: reward card '${itemId}' is not in the content`)
    for (let n = 0; n < heroes.length; n++) {
      const items = canHold(heroes[n]!, held[n], itemId)
      if (!items) continue
      const score = openingItemScoreOf(heroes[n]!, itemId)
      if (!best || score > best.score) best = { itemId, holder: n, items, score }
    }
  }
  return best
}

/**
 * A drafted hero's progress at `level`: its class's specialty from level 2 (SWITCHES.md openingSpecialty), the
 * level-5 row's first option once reached (SWITCHES.md openingLevelFivePick — the kingdom's autoplay default), and no
 * drafted powers (the kingdom's level-up grants none).
 */
function progressAt(id: string, level: number, where: string): HeroProgress | undefined {
  if (level === 1) return undefined
  const cls = (UNITS[id]!.tags ?? []).find((t) => t in SPECIALTY_OF)
  if (!cls) throw new Error(`${where}: ${id} has no class with a specialty in progression/OPENING-PARTY.json`)
  const pickRow = (LEVELS[levelTableOf(UNITS[id]!)]?.rows ?? []).find((r) => r.choice && r.level <= level)
  return { level, specialtyId: SPECIALTY_OF[cls]!, ...(pickRow?.choice ? { levelFivePick: pickRow.choice[0]! } : {}), powers: [] }
}

/**
 * The party at `position` for `replicate`, as createBattle options: the drafted heroes, each on its own kit. Without a
 * carry, each hero is at the level the builder's fixed XP reaches (fix.opening-first-level: the Orphanage's 20) and
 * each item OPENING-PARTY.json carries is on the first drafted hero who may take it (openingHolderOf — its takers, so
 * the Flaming Longsword only on a Warrior or a Paladin, and on nobody when neither is drafted; fix.opening-levels).
 * With a carry (the kingdom's run through the opening), each hero's level and items are the carry's.
 */
export function openingPartyOf(position: number, replicate: number, carry?: OpeningCarry): { heroes: string[]; heroItems: (string[] | undefined)[]; heroProgress: (HeroProgress | undefined)[]; heroBadges: (string[] | undefined)[]; heroMods: (UnitMods | undefined)[] } {
  const at = OPENING_POSITIONS.find((p) => p.position === position)
  if (!at) throw new Error(`opening: no position ${position} — progression/OPENING-PARTY.json has ${OPENING_POSITIONS.map((p) => p.position).join(', ')}`)
  const drafted = openingHeroesOf(replicate, at.drafted)
  const heroes = drafted.map((h) => h.id)
  const where = `opening position ${position}`
  if (carry && (carry.levels.length > heroes.length || carry.items.length > heroes.length)) throw new Error(`${where}: the carry names ${Math.max(carry.levels.length, carry.items.length)} heroes, but ${heroes.length} are drafted`)
  const heroProgress = heroes.map((id, n) => progressAt(id, (carry ? carry.levels[n] : at.levels[n]) ?? 1, where))
  const heroItems: (string[] | undefined)[] = heroes.map((_, n) => (carry?.items[n] ? [...carry.items[n]!] : undefined))
  if (!carry) {
    for (const itemId of at.carried) {
      const got = openingHolderOf(itemId, heroes, heroItems)
      if (got) heroItems[got.holder] = got.items
    }
  }
  // fix.opening-draft: each hero's badges and rolled points, identical at every position (the same replicate, the same draws)
  const heroBadges = drafted.map((h) => (h.badges.length ? [...h.badges] : undefined))
  const heroMods = drafted.map((h) => (h.mods.stats?.length ? h.mods : undefined))
  return { heroes, heroItems, heroProgress, heroBadges, heroMods }
}
