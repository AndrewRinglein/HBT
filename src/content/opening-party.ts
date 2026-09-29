// fix.opening-party (2026-09-29): the party the player has at each of the opening's six battles.
//
// Ruled 2026-09-28 (Andrew, DECISIONS.md 'the opening is tested with the player's party, not the
// Alpha Team'): "Opening battles should be tested with a party the player should have at that
// point. We need to move away from these alpha heroes."
//
// The rules and the pool are progression/OPENING-PARTY.json's, built by progression/build-schedule.mjs
// from GAME-ARCHITECTURE.md §2.5 (1 drafted before battle 1, +2 after it, +1 after each until six;
// one of three offered, stat-less) and the 2026-09-28 rulings (the six in order; the Flaming Longsword
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
import { ITEMS, UNITS } from './index.js'

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
const baseOf = (id: string, stat: string): number => ((UNITS[id] as unknown as Record<string, number | undefined>)[STAT_OF[stat] ?? stat]) ?? 0

/**
 * The Crucible's stat changes (generateCrucibleHero: `gains` then `losses`, a stat never twice, up to
 * `repeatAttempts` rolls to find a new one; one change is the stat's step, held at its floor).
 */
function rollStats(rng: Rng, id: string, gains: number, losses: number, keys: readonly number[], used: Set<string>): Rolled[] {
  const out: Rolled[] = []
  const now: Record<string, number> = {}
  for (const [sign, count, sub] of [[1, gains, 1], [-1, losses, 2]] as const) {
    for (let i = 0; i < count; i++) {
      let stat = '', a = 0
      do { stat = CRUCIBLE.statPool[rollBelow(rng, CRUCIBLE.statPool.length, 'draft', ...keys, sub, i, a)]!; a++ } while (used.has(stat) && a < CRUCIBLE.repeatAttempts)
      if (used.has(stat)) continue
      const was = now[stat] ?? baseOf(id, stat)
      const is = Math.max(floorOf(stat), was + sign * stepOf(stat))
      now[stat] = is
      used.add(stat)
      if (is !== was) out.push({ stat, amount: is - was })
    }
  }
  return out
}

/** pickWeightedBadge: favourable at `favourablePercent`, else flawed; weighted by rarity; `exclude` never. */
function pickBadge(rng: Rng, favourablePercent: number, exclude: ReadonlySet<string>, keys: readonly number[]): string | null {
  const wantGood = roll100(rng, 'draft', ...keys, 0) <= favourablePercent
  let cands = (wantGood ? FAVOURABLE : FLAWED).filter((b) => !exclude.has(b.id))
  if (!cands.length) cands = [...FAVOURABLE, ...FLAWED].filter((b) => !exclude.has(b.id))
  if (!cands.length) return null
  const weight = (b: BadgeRow) => (CRUCIBLE.rarityWeight as Record<string, number>)[b.rarity] ?? CRUCIBLE.rarityDefault
  let r = rollBelow(rng, cands.reduce((s, b) => s + weight(b), 0), 'draft', ...keys, 1)
  for (const b of cands) { r -= weight(b); if (r < 0) return b.id }
  return cands[cands.length - 1]!.id
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

/** The first hero: one pool row taken, no offer and no pick, with everything the ruling gives it. */
function firstHero(rng: Rng, id: string): OpeningHero {
  const F = OPENING.firstHero
  const badges = [...F.badges]
  const positives = F.positiveBadges + (roll100(rng, 'draft', 0, 2, 7) <= F.anotherBadgePercent ? 1 : 0)
  for (let i = 0; i < positives; i++) {
    const b = pickBadge(rng, 100, new Set(badges), [0, 2, 6, i])
    if (b) badges.push(b)
  }
  const points = F.statPoints + (roll100(rng, 'draft', 0, 2, 9) <= F.anotherPointPercent ? 1 : 0)
  const rolls = rollStats(rng, id, points, 0, [0, 2, 8], new Set())
  const { mods, unfielded } = modsOf(rolls, SCORE.rollSource, [{ stat: 'maxHp', add: F.health, source: F.healthSource }])
  return { id, badges, rolls, mods, unfielded, offered: [id], scores: [] }
}

/** One offered hero as the Crucible rolls it (generateCrucibleHero: the stat changes, then 1-3 badges, the first unique across the hand). */
function rolledOffer(rng: Rng, id: string, ordinal: number, j: number, signatures: Set<string>): { badges: string[]; rolls: Rolled[] } {
  const keys = [ordinal, 2 + j]
  const [gains, losses] = CRUCIBLE.modTypes[rollBelow(rng, CRUCIBLE.modTypes.length, 'draft', ...keys, 0)]!
  const rolls = rollStats(rng, id, gains!, losses!, keys, new Set())
  const c = roll100(rng, 'draft', ...keys, 3)
  let count = 0, acc = 0
  for (const [n, pct] of CRUCIBLE.badgeCount) { acc += pct!; if (c <= acc) { count = n!; break } }
  const badges: string[] = []
  for (let i = 0; i < count; i++) {
    const signature = i === 0
    const exclude = new Set([...badges, ...(signature ? signatures : [])])
    const b = pickBadge(rng, signature ? CRUCIBLE.favourablePercent.signature : CRUCIBLE.favourablePercent.later, exclude, [...keys, 4, i])
    if (b && !badges.includes(b)) { badges.push(b); if (signature) signatures.add(b) }
  }
  return { badges, rolls }
}

/**
 * The first `count` heroes of a replicate, in draft order. The first is taken; every later one is the
 * best-scoring of `offer` rows of classes not yet drafted (until all six classes are), each rolled by the
 * Crucible. A pool row the content does not have is never offered. The same replicate gives the same
 * heroes with the same rolls, so a hero is the same at every opening position.
 */
export function openingHeroesOf(replicate: number, count: number): OpeningHero[] {
  const rng = draftRng(replicate)
  const pool = OPENING.pool.filter((id) => UNITS[id])
  const drafted: OpeningHero[] = []
  for (let ordinal = 0; ordinal < count; ordinal++) {
    const ids = drafted.map((h) => h.id)
    const classes = new Set(ids.map(classOfRow))
    const allSix = OPENING.classes.every((c) => classes.has(c))
    const left = pool.filter((id) => !ids.includes(id))
    const eligible = allSix ? left : left.filter((id) => !classes.has(classOfRow(id)))
    if (eligible.length === 0) throw new Error(`opening draft ${ordinal + 1}: nobody left to draft — pool ${pool.length}, drafted ${ids.join(', ')}`)
    if (ordinal === 0) { drafted.push(firstHero(rng, sample(rng, eligible, 1, 'draft', ordinal, 0)[0]!)); continue }
    const offer = sample(rng, eligible, OPENING.offer, 'draft', ordinal, 0)
    // the hand's signature badges are unique against every badge the party already carries (dealHeroCards)
    const signatures = new Set(drafted.flatMap((h) => h.badges))
    const rolled = offer.map((id, j) => ({ id, ...rolledOffer(rng, id, ordinal, j, signatures) }))
    const scores = rolled.map((o) => draftScoreOf(o.id, o.rolls, o.badges, ids))
    // the best score; a tie goes to the earlier offer (Law 6)
    const best = scores.reduce((b, s, j) => (s > scores[b]! ? j : b), 0)
    const take = rolled[best]!
    const { mods, unfielded } = modsOf(take.rolls, SCORE.rollSource)
    drafted.push({ id: take.id, badges: take.badges, rolls: take.rolls, mods, unfielded, offered: offer, scores })
  }
  return drafted
}

/** The first `count` drafted rows of a replicate, in draft order. */
export function openingDraftOf(replicate: number, count: number): string[] {
  return openingHeroesOf(replicate, count).map((h) => h.id)
}

/**
 * The party at `position` for `replicate`, as createBattle options: the drafted heroes, each on its
 * own kit, and each carried item on the first drafted hero who can wield it (SWITCHES.md
 * openingCarriedHolder), taking the place of that hero's kit weapons — its shield and armour stay;
 * a result the hands cannot hold is refused by applyItems, the one legality. A hero above level 1
 * (fix.opening-first-level: the XP the builder wrote, on the ruled curve) takes its level through
 * heroProgress — applyProgress folds the class table and the specialty chosen at level 2.
 */
export function openingPartyOf(position: number, replicate: number): { heroes: string[]; heroItems: (string[] | undefined)[]; heroProgress: (HeroProgress | undefined)[]; heroBadges: (string[] | undefined)[]; heroMods: (UnitMods | undefined)[] } {
  const at = OPENING_POSITIONS.find((p) => p.position === position)
  if (!at) throw new Error(`opening: no position ${position} — progression/OPENING-PARTY.json has ${OPENING_POSITIONS.map((p) => p.position).join(', ')}`)
  const drafted = openingHeroesOf(replicate, at.drafted)
  const heroes = drafted.map((h) => h.id)
  const heroProgress = heroes.map((id, n): HeroProgress | undefined => {
    const level = at.levels[n] ?? 1
    if (level === 1) return undefined
    // level 3 brings the first class power, which nothing here chooses yet — refused, not guessed (fix.opening-levels)
    if (level > 2) throw new Error(`opening position ${position}: draft ${n + 1} is level ${level} — powers from level 3 are fix.opening-levels'`)
    const cls = (UNITS[id]!.tags ?? []).find((t) => t in SPECIALTY_OF)
    if (!cls) throw new Error(`opening position ${position}: ${id} has no class with a specialty in progression/OPENING-PARTY.json`)
    return { level, specialtyId: SPECIALTY_OF[cls]!, powers: [] }
  })
  const heroItems: (string[] | undefined)[] = heroes.map(() => undefined)
  for (const itemId of at.carried) {
    const item = ITEMS[itemId]
    if (!item) throw new Error(`opening position ${position}: carried item '${itemId}' is not in the content`)
    const i = heroes.findIndex((id, n) => heroItems[n] === undefined && (!item.classRestriction || (UNITS[id]!.tags ?? []).includes(item.classRestriction)))
    if (i < 0) throw new Error(`opening position ${position}: no drafted hero can wield '${itemId}'`)
    const kit = UNITS[heroes[i]!]!.defaultItems ?? []
    heroItems[i] = [itemId, ...kit.filter((k) => ITEMS[k]?.itemClass !== 'weapon')]
  }
  // fix.opening-draft: each hero's badges and rolled points, identical at every position (the same replicate, the same draws)
  const heroBadges = drafted.map((h) => (h.badges.length ? [...h.badges] : undefined))
  const heroMods = drafted.map((h) => (h.mods.stats?.length ? h.mods : undefined))
  return { heroes, heroItems, heroProgress, heroBadges, heroMods }
}
