// Quests — one, authored: THIN-SLICE-REVIEW.md §D "quests (one authored
// quest, the tutorial's)". GLOSSARY.md's example id is quest.escort. The shape
// is GAME-ARCHITECTURE.md §2.3's requirement slots — "a quest posts a floor" —
// and §2.6 QUESTS. A quest holds its heroes for N Weeks (never "N turns") and
// resolves without you. Quests pay Faith (7-KINGDOM-SETTLED.md: Faith's
// faucets are "Pray · quests · rescue"). The numbers are soft; the odds are a
// switch (a tutorial quest that can fail is a choice nobody has made).

import { omitDisabled } from './disable.js'
import { SWITCHES } from './switches.js'

export type QuestRow = {
  readonly id: string
  readonly name: string
  readonly does: string
  readonly weeks: number
  /** Requirement slots: a floor, per §2.3 — `accepts` a group or a class. */
  readonly requires: readonly { readonly min: number; readonly accepts: string }[]
  readonly reward: Readonly<Record<string, number>>
  /** Chance of success in whole percent. */
  readonly odds: number
}

const RAW_QUESTS: readonly QuestRow[] = [
  { id: 'quest.escort', name: 'Escort the survivors', does: 'Walk a band of survivors to the Sanctuary. Two Weeks on the road.', weeks: 2,
    requires: [{ min: 1, accepts: 'any' }], reward: { 'currency.faith': SWITCHES.questFaith }, odds: SWITCHES.questOdds },
]

export const QUESTS: readonly QuestRow[] = omitDisabled(RAW_QUESTS)

export function questRowOf(id: string): QuestRow {
  const row = QUESTS.find((q) => q.id === id)
  if (!row) throw new Error(`unknown quest '${id}' — the quests are an explicit registry: ${QUESTS.map((q) => q.id).join(', ') || '(none)'}`)
  return row
}
