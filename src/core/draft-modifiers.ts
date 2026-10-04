// The draft's modifiers — kingdom.opening-draft-modifiers (2026-10-03).
//
// Ruled 2026-09-28 (Andrew, engine/DECISIONS.md 'no Health minimum … the first hero gets Leadership and a random positive
// badge; the draft pick is weighted' and 'the first hero: Leadership …; the draft offers three with the Crucible's
// modifiers'): "You get the leadership badge. You get a random positive badge. 25% chance of another positive badge. +2
// health. One stat point from the Crucible's randomness, a 30% chance of another stat point." · "You get your choice of
// one of three heroes. Those heroes had randomized modifiers applied to them, and typically you would pick the best one."
//
// ONE RULE, and why it runs here. The engine already rolls its own test party by this rule (engine/src/content/
// opening-party.ts, fix.opening-draft: firstHero, rolledOffer, rollStats, pickBadge, modsOf). What it exports is
// openingHeroesOf(replicate, count) — the whole draft at once: it draws WHICH rows are offered from its own pool on its own
// stream, and takes the best-scoring one itself, handing back only the taken hero's rolls. The run needs the two halves
// that function keeps private: the first hero's bonuses for the row THE PLAYER chose, and all three offered rows as the
// Crucible rolls them (the player sees all three and picks). Neither is exported, and both take the engine's battle Rng.
// So the procedure runs here, over the same published numbers (src/content/crucible.ts — progression/OPENING-PARTY.json,
// the file the engine reads), with the SAME keys in the same order, on whatever stream the caller hands in — the run's
// own cup (core/opening.ts). test/opening-draft-modifiers.test.ts holds the two to one rule: fed the engine's stream,
// these functions give the engine's opening party, badge for badge and point for point. An engine item that exports
// those two functions (taking a roller) would let this file go (kingdom SWITCHES.md openingDraftRuleKingdomSide).
//
// A mechanism: it names no badge, no stat and no hero — the rows are content's.

import { CRUCIBLE, FIRST_HERO, CRUCIBLE_ROLL_SOURCE, crucibleStatOf, type CrucibleBadge } from '../content/crucible.js'
import { isStatName } from '../engine.js'

/** The dice a draft rolls on, keyed by what the roll is (Law 4): 0..n-1, and 1..100. */
export type Roller = { below(n: number, ...keys: number[]): number; d100(...keys: number[]): number }
/** One stat change the Crucible rolled, in the Crucible's word and the stat's own units (a Health point is 2 Health). */
export type Rolled = { stat: string; amount: number }
/** One rolled point as the battle takes it (seam.unit-mods): the engine's stat name, the amount, the source it names. */
export type DraftMod = { stat: string; add: number; source: string }
/**
 * What a hero is drafted with, kept on the hero for the run: the badges the draft gave it (the first hero's Leadership
 * and its positive ones, or the Crucible's rolled badges); the stat points it rolled; those points — and the first
 * hero's +2 Health — as the battle is handed them; and the points no engine stat can take (Item Slots, the campaign's
 * own; Toughness), named, never dropped silently.
 */
export type Drafted = { badges: string[]; rolls: Rolled[]; mods: DraftMod[]; unfielded: Rolled[] }
/** A row's own value of a stat, in the Crucible's word — what a point is added to and floored against. */
export type BaseOf = (stat: string) => number

const stepOf = (stat: string): number => CRUCIBLE.statStep[stat] ?? CRUCIBLE.statStep['default']!
const floorOf = (stat: string): number => CRUCIBLE.statFloor[stat] ?? CRUCIBLE.statFloor['default']!

/**
 * The Crucible's stat changes (generateCrucibleHero: `gains` then `losses`, a stat never twice, up to `repeatAttempts`
 * rolls to find a new one; one change is the stat's step, held at its floor).
 */
function statChangesOf(roller: Roller, baseOf: BaseOf, gains: number, losses: number, keys: readonly number[]): Rolled[] {
  const out: Rolled[] = []
  const now: Record<string, number> = {}
  const used = new Set<string>()
  for (const [sign, count, sub] of [[1, gains, 1], [-1, losses, 2]] as const) {
    for (let i = 0; i < count; i++) {
      let stat = '', a = 0
      do { stat = CRUCIBLE.statPool[roller.below(CRUCIBLE.statPool.length, ...keys, sub, i, a)]!; a++ } while (used.has(stat) && a < CRUCIBLE.repeatAttempts)
      if (used.has(stat)) continue
      const was = now[stat] ?? baseOf(stat)
      const is = Math.max(floorOf(stat), was + sign * stepOf(stat))
      now[stat] = is
      used.add(stat)
      if (is !== was) out.push({ stat, amount: is - was })
    }
  }
  return out
}

/** pickWeightedBadge: favourable at `favourablePercent`, else flawed; weighted by rarity; `exclude` never. */
function badgeOf(roller: Roller, favourablePercent: number, exclude: ReadonlySet<string>, keys: readonly number[]): string | null {
  const wantGood = roller.d100(...keys, 0) <= favourablePercent
  let cands = (wantGood ? CRUCIBLE.favourable : CRUCIBLE.flawed).filter((b) => !exclude.has(b.id))
  if (!cands.length) cands = [...CRUCIBLE.favourable, ...CRUCIBLE.flawed].filter((b) => !exclude.has(b.id))
  if (!cands.length) return null
  const weight = (b: CrucibleBadge) => CRUCIBLE.rarityWeight[b.rarity] ?? CRUCIBLE.rarityDefault
  let r = roller.below(cands.reduce((s, b) => s + weight(b), 0), ...keys, 1)
  for (const b of cands) { r -= weight(b); if (r < 0) return b.id }
  return cands[cands.length - 1]!.id
}

/** The rolls as unit mods; what no engine stat takes is returned apart, never dropped silently. */
function modsOf(rolls: readonly Rolled[], first: readonly DraftMod[] = []): { mods: DraftMod[]; unfielded: Rolled[] } {
  const mods: DraftMod[] = first.map((m) => ({ ...m }))
  const unfielded: Rolled[] = []
  for (const r of rolls) {
    const stat = crucibleStatOf(r.stat)
    if (isStatName(stat)) mods.push({ stat, add: r.amount, source: CRUCIBLE_ROLL_SOURCE }); else unfielded.push({ ...r })
  }
  return { mods, unfielded }
}

/**
 * The first hero's bonuses, for the row whose base `baseOf` reads: the rule's badges (Leadership), a positive badge and
 * the chance of another, +Health, a Crucible stat point and the chance of another. Nothing here depends on which of the
 * three the player takes but the floors a point is held at.
 */
export function firstHeroDraftedOf(roller: Roller, baseOf: BaseOf): Drafted {
  const F = FIRST_HERO
  const badges = [...F.badges]
  const positives = F.positiveBadges + (roller.d100(0, 2, 7) <= F.anotherBadgePercent ? 1 : 0)
  for (let i = 0; i < positives; i++) {
    const b = badgeOf(roller, 100, new Set(badges), [0, 2, 6, i])
    if (b) badges.push(b)
  }
  const points = F.statPoints + (roller.d100(0, 2, 9) <= F.anotherPointPercent ? 1 : 0)
  const rolls = statChangesOf(roller, baseOf, points, 0, [0, 2, 8])
  return { badges, rolls, ...modsOf(rolls, [{ stat: crucibleStatOf('health'), add: F.health, source: F.healthSource }]) }
}

/**
 * One draft's hand as the Crucible rolls it (generateCrucibleHero, dealHeroCards): per offered row, in offer order, the
 * stat changes, then one to three badges — each hero's first badge unlike every badge the party already carries
 * (`carried`) and every first badge earlier in the hand. `ordinal` is the draft's (0 = the first hero's, never rolled here).
 */
export function handDraftedOf(roller: Roller, bases: readonly BaseOf[], ordinal: number, carried: readonly string[]): Drafted[] {
  const signatures = new Set(carried)
  return bases.map((baseOf, j) => {
    const keys = [ordinal, 2 + j]
    const [gains, losses] = CRUCIBLE.modTypes[roller.below(CRUCIBLE.modTypes.length, ...keys, 0)]!
    const rolls = statChangesOf(roller, baseOf, gains!, losses!, keys)
    const c = roller.d100(...keys, 3)
    let count = 0, acc = 0
    for (const [n, pct] of CRUCIBLE.badgeCount) { acc += pct!; if (c <= acc) { count = n!; break } }
    const badges: string[] = []
    for (let i = 0; i < count; i++) {
      const signature = i === 0
      const exclude = new Set([...badges, ...(signature ? signatures : [])])
      const b = badgeOf(roller, signature ? CRUCIBLE.favourablePercent.signature : CRUCIBLE.favourablePercent.later, exclude, [...keys, 4, i])
      if (b && !badges.includes(b)) { badges.push(b); if (signature) signatures.add(b) }
    }
    return { badges, rolls, ...modsOf(rolls) }
  })
}
