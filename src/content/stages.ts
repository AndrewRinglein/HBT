// V2 Week registry: two halves; Field activities are ordered, City activities are not.
import { omitDisabled } from './disable.js'

export type StageRow = {
  readonly id: string
  readonly title: string
  /** GAME-ARCHITECTURE.md §2.1 "What each Stage is allowed to touch" — may spend. */
  readonly spends: 'purse' | 'assignments' | 'city-assignments'
  /** What the Stage puts in front of the player, if anything. */
  readonly offers: 'engagement' | 'quest-results' | 'city' | null
  /** The Engagement kind an `engagement` Stage produces. */
  readonly engagementKind?: string
  /** Where an `engagement` Stage's targets come from: the player picks an adjacent unclaimed Territory, or a roll picks one you hold. */
  readonly targets?: 'conquerable' | 'rolled'
  /** One line, from §3's table. */
  readonly does: string
}

// KINGDOM-V2-2026-09-07: the two saved halves, with unordered City activities.
const RAW_STAGES: readonly StageRow[] = [
  { id: 'stage.field', title: 'Field', spends: 'assignments', offers: null, does: 'Conquest, Defense, then due quest results.' },
  { id: 'stage.city', title: 'City', spends: 'city-assignments', offers: 'city', does: 'Build, buy, recruit, dispatch quests and use the chapel in any order.' },
]

export type FieldStep = 'conquest' | 'defense' | 'quests'
export const FIELD_STEPS: readonly (Pick<StageRow, 'title' | 'offers' | 'engagementKind' | 'targets' | 'does'> & { key: FieldStep })[] = [
  { key: 'conquest', title: 'Conquest', offers: 'engagement', engagementKind: 'engagement.conquer', targets: 'conquerable', does: 'Attack adjacent land, or skip and increase the chance of a Defense.' },
  { key: 'defense', title: 'Defense', offers: 'engagement', engagementKind: 'engagement.defend', targets: 'rolled', does: 'Defend the threatened Territory. The castle must be defended.' },
  { key: 'quests', title: 'Quest results', offers: 'quest-results', does: 'Resolve due quests after the Field battles. Their heroes remain away until resolution.' },
]

export const CITY_ACTIVITIES = ['market', 'build', 'quests', 'chapel'] as const

export const STAGES: readonly StageRow[] = omitDisabled(RAW_STAGES)

export function stageRowOf(id: string): StageRow {
  const row = STAGES.find((s) => s.id === id)
  if (!row) throw new Error(`unknown Stage '${id}' — the Stages are an explicit registry: ${STAGES.map((s) => s.id).join(' → ') || '(none)'}`)
  return row
}
