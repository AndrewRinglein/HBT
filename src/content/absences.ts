// V2 after-battle stories. Every participant rolls independently, with badge multipliers.
// One Week means return after the next Field half; authored longer durations use the same clock.
export type AbsenceRow = {
  readonly story: string
  readonly weeks: number
  /** What the slice does about it: nothing (the story is the effect), or +5 XP. Everything else is content the slice does not carry. */
  readonly effect: 'none' | 'xp5'
  readonly note?: string
}

export const ABSENCES: readonly AbsenceRow[] = [
  { story: 'Grandma showed up alive . . . although looking a little green', effect: 'none', weeks: 1, note: 'Rotting Flesh — affliction reroll: OUT' },
  { story: 'Decided to visit that really old castle on a whim', effect: 'none', weeks: 1, note: 'vampire badge — affliction reroll: OUT' },
  { story: 'Had a midnight visitor who was not human', effect: 'none', weeks: 1, note: 'possessed badge — affliction reroll: OUT' },
  { story: 'Got bit by a stray dog', effect: 'none', weeks: 1, note: 'werewolf badge — affliction reroll: OUT' },
  { story: 'Got injured in an accident . . .', effect: 'none', weeks: 1, note: 'wounded reroll: OUT' },
  { story: 'Got seriously injured by falling rocks', effect: 'none', weeks: 1, note: 'rolled minor injury: OUT' },
  { story: 'Went missing', effect: 'none', weeks: 1 },
  { story: 'Took the week off', effect: 'none', weeks: 1 },
  { story: 'Went into a training frenzy', effect: 'xp5', weeks: 1 },
  { story: 'Exhausted themselves drinking', effect: 'none', weeks: 1, note: 'badge.exhausted: OUT' },
  { story: 'Ran out of steam', effect: 'none', weeks: 1, note: 'fatigue badge: OUT' },
  { story: 'The Apocalypse is too much for them', effect: 'none', weeks: 1 },
  { story: 'Starting to feel really lazy', effect: 'none', weeks: 1, note: 'gain badge.lazy if no other availability badge: OUT' },
]

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

/** V2 ordinary-battle chance in whole percent, before badge multipliers. */
export const ABSENCE_CHANCE = 20
