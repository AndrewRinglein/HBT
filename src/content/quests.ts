// V2 authored quests: staffing, fixed rewards and encounter tuning are flat content.
// The two opening quests precede the retained two-Week Escort.

import { omitDisabled } from './disable.js'
import { SWITCHES } from './switches.js'

export type QuestRow = {
  readonly id: string
  readonly name: string
  readonly does: string
  readonly weeks: number
  readonly reward: Readonly<Record<string, number>>
  /** Chance of success in whole percent. */
  readonly odds: number
  readonly staffing: { readonly kind: 'people'; readonly min: number; readonly max: number | null } | { readonly kind: 'hero-led'; readonly maxEscorts: number }
  readonly xp: { readonly amount: number; readonly recipient: 'party' | 'lead' }
  readonly rescueCivilian: boolean
  readonly encounter: { readonly pct: number; readonly safeEscorts: number; readonly kind: string; readonly mapId: string; readonly enemies: readonly string[] } | null
}

const RAW_QUESTS: readonly QuestRow[] = [
  { id: 'quest.rescue-civilian', name: 'Rescue a Civilian', does: 'Send exactly three people. Each gains 3 XP and a civilian joins the roster. No combat risk.', weeks: 1,
    staffing: { kind: 'people', min: 3, max: 3 }, reward: {}, odds: 100,
    xp: { amount: 3, recipient: 'party' }, rescueCivilian: true, encounter: null },
  { id: 'quest.recover-supplies', name: 'Recover Supplies', does: 'Choose a hero lead and up to two escorts. The lead gains 5 quest XP; bring home 10 Supplies. Combat risk: 5%, or none with two escorts.', weeks: 1,
    staffing: { kind: 'hero-led', maxEscorts: 2 }, reward: { 'currency.supplies': 10 }, odds: 100,
    xp: { amount: 5, recipient: 'lead' }, rescueCivilian: false,
    encounter: { pct: 5, safeEscorts: 2, kind: 'engagement.quest', mapId: 'map.open', enemies: ['unit.zombie', 'unit.zombie'] } },
  { id: 'quest.escort', name: 'Escort the survivors', does: 'Walk a band of survivors to the Sanctuary. Two Weeks on the road.', weeks: 2,
    staffing: { kind: 'people', min: 1, max: null }, reward: { 'currency.faith': SWITCHES.questFaith }, odds: SWITCHES.questOdds,
    xp: { amount: 0, recipient: 'party' }, rescueCivilian: false, encounter: null },
]

export const QUESTS: readonly QuestRow[] = omitDisabled(RAW_QUESTS)

export function questRowOf(id: string): QuestRow {
  const row = QUESTS.find((q) => q.id === id)
  if (!row) throw new Error(`unknown quest '${id}' — the quests are an explicit registry: ${QUESTS.map((q) => q.id).join(', ') || '(none)'}`)
  return row
}
