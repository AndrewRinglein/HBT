// The draft's modifiers — kingdom.opening-draft-modifiers (2026-10-03); the procedure moved to the engine by
// fix.opening-draft-one-rule (engine queue, 2026-10-04).
//
// Ruled 2026-09-28 (Andrew, engine/DECISIONS.md 'no Health minimum … the first hero gets Leadership and a random positive
// badge; the draft pick is weighted' and 'the first hero: Leadership …; the draft offers three with the Crucible's
// modifiers'): "You get the leadership badge. You get a random positive badge. 25% chance of another positive badge. +2
// health. One stat point from the Crucible's randomness, a 30% chance of another stat point." · "You get your choice of
// one of three heroes. Those heroes had randomized modifiers applied to them, and typically you would pick the best one."
//
// ONE RULE, ONE HOME. The procedure is the engine's (engine/src/content/opening-party.ts): firstHeroDraftOf — the first
// hero's bonuses for the hero the player chose — and draftHandOf — each of the three offered heroes as the Crucible rolls
// it. The engine's own opening party is drafted by those two functions on its own stream; the run calls the same two,
// through the one door (src/engine.ts), on the run's own stream (core/opening.ts hands the dice in). Until 2026-10-04 this
// file ran the procedure a second time over the same numbers, held to the engine's by a parity test (kingdom SWITCHES.md
// openingDraftRuleKingdomSide, answered). Nothing is rolled here and no table is read here.
//
// What is left is the kingdom's own: the shape a hero's draft is KEPT in for the run (Hero.drafted, in every save), which
// is not the engine's — the battle's unit mods as a plain list, each a copy the Campaign owns (Law 5b).

import { firstHeroDraftOf, draftHandOf, type DraftRoller, type DraftBase, type DraftRolls } from '../engine.js'

/** The dice a draft rolls on, keyed by what the roll is (Law 4): 0..n-1, and 1..100 — the engine's own type. */
export type Roller = DraftRoller
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
/** A row's own value of a stat, in the Crucible's word — what a point is added to and floored against. The engine's own type. */
export type BaseOf = DraftBase

/** The engine's rolls as the run keeps them: its own copies, the unit mods as a plain list. */
function keptOf(d: DraftRolls): Drafted {
  return {
    badges: [...d.badges],
    rolls: d.rolls.map((r) => ({ stat: r.stat, amount: r.amount })),
    mods: (d.mods.stats ?? []).map((m) => ({ stat: m.stat, add: m.add, source: m.source })),
    unfielded: d.unfielded.map((r) => ({ stat: r.stat, amount: r.amount })),
  }
}

/**
 * The first hero's bonuses, for the row whose base `baseOf` reads — the engine's firstHeroDraftOf, on the dice handed in:
 * the rule's badges (Leadership), a positive badge and the chance of another, +Health, a Crucible stat point and the
 * chance of another.
 */
export function firstHeroDraftedOf(roller: Roller, baseOf: BaseOf): Drafted {
  return keptOf(firstHeroDraftOf(roller, baseOf))
}

/**
 * One draft's hand as the Crucible rolls it — the engine's draftHandOf, on the dice handed in: per offered row, in offer
 * order, the stat changes, then one to three badges, each hero's first badge unlike every badge the party already
 * carries (`carried`) and every first badge earlier in the hand. `ordinal` is the draft's (0 = the first hero's).
 */
export function handDraftedOf(roller: Roller, bases: readonly BaseOf[], ordinal: number, carried: readonly string[]): Drafted[] {
  return draftHandOf(roller, bases, ordinal, carried).map(keptOf)
}
