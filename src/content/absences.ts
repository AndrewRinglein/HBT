// Unavailability — KINGDOM-DESIGN.md §3 "The Unavailability Stage — between
// Buy and Quest", Andrew 2026-08-23, numbers soft: "some heroes just become
// unavailable", one per three heroes from six, a story reason drawn from a
// long list, badges weighting the roll. Angela's and Andrew's wording kept
// verbatim. Most effects are OUT of the slice (afflictions, injuries, the
// Deathbed's badges — THIN-SLICE-IMPLEMENTATION.md §8); the row says which
// the slice enacts. The ten "random time-off entries" are unwritten and are
// not invented here.
//
// These rows carry no id: a story is not a thing anything references, and
// "absence" is no approved kind. If one is ever needed it is Angela's.

export type AbsenceRow = {
  readonly story: string
  /** What the slice does about it: nothing (the story is the effect), or +5 XP. Everything else is content the slice does not carry. */
  readonly effect: 'none' | 'xp5'
  readonly note?: string
}

export const ABSENCES: readonly AbsenceRow[] = [
  { story: 'Grandma showed up alive . . . although looking a little green', effect: 'none', note: 'Rotting Flesh — affliction reroll: OUT' },
  { story: 'Decided to visit that really old castle on a whim', effect: 'none', note: 'vampire badge — affliction reroll: OUT' },
  { story: 'Had a midnight visitor who was not human', effect: 'none', note: 'possessed badge — affliction reroll: OUT' },
  { story: 'Got bit by a stray dog', effect: 'none', note: 'werewolf badge — affliction reroll: OUT' },
  { story: 'Got injured in an accident . . .', effect: 'none', note: 'wounded reroll: OUT' },
  { story: 'Got seriously injured by falling rocks', effect: 'none', note: 'rolled minor injury: OUT' },
  { story: 'Went missing', effect: 'none' },
  { story: 'Took the week off', effect: 'none' },
  { story: 'Went into a training frenzy', effect: 'xp5' },
  { story: 'Exhausted themselves drinking', effect: 'none', note: 'badge.exhausted: OUT' },
  { story: 'Ran out of steam', effect: 'none', note: 'fatigue badge: OUT' },
  { story: 'The Apocalypse is too much for them', effect: 'none' },
  { story: 'Starting to feel really lazy', effect: 'none', note: 'gain badge.lazy if no other availability badge: OUT' },
]

/** "One per three heroes from six" — 6:1 · 9:2 · 12:3 · 15:4 · 18:5. Soft. */
export function absencesFor(rosterSize: number): number {
  return rosterSize < 6 ? 0 : Math.floor(rosterSize / 3) - 1
}

/** Badge weights on the roll — KINGDOM-DESIGN.md §3, ×100 so the arithmetic stays integer (Law 7). A hero with no listed badge weighs 100. */
export const ABSENCE_WEIGHTS: Readonly<Record<string, number>> = {
  'badge.responsible': 0,
  'badge.dedicated': 50,
  'badge.lazy': 200,
  'badge.withdrawn': 300,
}
export const ABSENCE_WEIGHT_BASE = 100

/** "Went into a training frenzy" — the one absence with a number. Soft. */
export const ABSENCE_FRENZY_XP = 5
