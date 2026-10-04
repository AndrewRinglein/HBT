// The opening draft's numbers — kingdom.opening-draft-modifiers (2026-10-03).
//
// Ruled 2026-09-28 (Andrew, engine/DECISIONS.md 'no Health minimum … the first hero gets Leadership and a random positive
// badge; the draft pick is weighted' and 'the first hero: Leadership …; the draft offers three with the Crucible's
// modifiers'): "You get the leadership badge. You get a random positive badge. 25% chance of another positive badge. +2
// health. One stat point from the Crucible's randomness, a 30% chance of another stat point." · "we use the Crucible
// randomness, three heroes".
//
// ONE TABLE, never typed here: progression/OPENING-PARTY.json — written by progression/build-schedule.mjs out of the
// Crucible's own files (crucible/data/stat-pool.json, crucible/data/badges.json, crucible/index.html
// generateCrucibleHero) and read by the engine's own opening party (engine/src/content/opening-party.ts,
// fix.opening-draft). The kingdom reads the same file, so the first hero's rule and the Crucible's pool, steps, floors,
// shapes and badges have one owner. The engine does not export these numbers (they are private to opening-party.ts), so
// they are read where the engine reads them — not through src/engine.ts (kingdom SWITCHES.md
// openingDraftRuleKingdomSide). The procedure that rolls them is the ENGINE's (firstHeroDraftOf, draftHandOf — called
// through src/engine.ts by src/core/draft-modifiers.ts; fix.opening-draft-one-rule, 2026-10-04): what is read here is
// what the draft SCREEN lists (src/ui/draft.ts) and a badge's own row, never the rolling.

import OPENING from '../../../progression/OPENING-PARTY.json'

/** One rollable badge as the Crucible lists it: its rarity (the draw's weight) and its stats in the Crucible's words. */
export type CrucibleBadge = { readonly id: string; readonly rarity: string; readonly stats: Readonly<Record<string, number>> }

/** The first hero's rule: the badges it always gets, how many positive ones, +Health, the stat points, and the chances of one more of each. */
export const FIRST_HERO: {
  readonly badges: readonly string[]; readonly positiveBadges: number; readonly anotherBadgePercent: number
  readonly health: number; readonly healthSource: string; readonly statPoints: number; readonly anotherPointPercent: number
} = OPENING.firstHero

const C = OPENING.crucible
/** The Crucible's randomness: the stat pool, the gain/loss shapes, each stat's step and floor, the badge counts, chances and rarity weights. */
export const CRUCIBLE: {
  readonly statPool: readonly string[]
  readonly repeatAttempts: number
  /** [gains, losses] — one shape is rolled per offered hero. */
  readonly modTypes: readonly (readonly number[])[]
  /** [count, percent] — how many badges an offered hero rolls. */
  readonly badgeCount: readonly (readonly number[])[]
  readonly favourablePercent: { readonly signature: number; readonly later: number }
  readonly statStep: Readonly<Record<string, number>>
  readonly statFloor: Readonly<Record<string, number>>
  readonly rarityWeight: Readonly<Record<string, number>>
  readonly rarityDefault: number
  readonly favourable: readonly CrucibleBadge[]
  readonly flawed: readonly CrucibleBadge[]
  /** The Crucible's word for a stat -> the engine's name, where they differ (health -> maxHp). */
  readonly statOf: Readonly<Record<string, string>>
} = {
  statPool: C.statPool, repeatAttempts: C.repeatAttempts, modTypes: C.modTypes, badgeCount: C.badgeCount,
  favourablePercent: C.favourablePercent, statStep: C.statStep, statFloor: C.statFloor,
  rarityWeight: C.rarityWeight, rarityDefault: C.rarityDefault,
  favourable: C.badges.favourable as readonly CrucibleBadge[], flawed: C.badges.flawed as readonly CrucibleBadge[],
  statOf: C.statOf,
}

/** The source a rolled stat point names when the battle is handed it (seam.unit-mods) — the engine's own word for it. */
export const CRUCIBLE_ROLL_SOURCE: string = OPENING.draftScore.rollSource

/** A rollable badge's row, by id — undefined for a badge the Crucible does not roll (Leadership). */
export function crucibleBadgeOf(id: string): CrucibleBadge | undefined {
  return CRUCIBLE.favourable.find((b) => b.id === id) ?? CRUCIBLE.flawed.find((b) => b.id === id)
}

/** The engine's name for a stat the Crucible names (health -> maxHp); the word itself when they agree. */
export const crucibleStatOf = (word: string): string => CRUCIBLE.statOf[word] ?? word
