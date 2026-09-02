// The six Stages of a Week — KINGDOM-DESIGN.md §3, GLOSSARY.md, ruled
// 2026-08-23 (twice, then merged): Buy → Quest → Defend → Conquer → Build →
// Mend. Rows in the ruled order; the Week machine (src/core/week.ts) walks
// this list and names no Stage. Every Stage begins and ends even when it
// resolves to nothing (GAME-ARCHITECTURE.md §2.1) — "a Stage that is sometimes
// skipped is a Stage the flow forgets to leave."
//
// `offers` says what a Stage puts in front of the player; the machine reads it
// to know which resolver to call. The stakes of what is offered are the
// Engagement kind rows (engagements.ts), never this file.

import { omitDisabled } from './disable.js'

export type StageRow = {
  readonly id: string
  readonly title: string
  /** GAME-ARCHITECTURE.md §2.1 "What each Stage is allowed to touch" — may spend. */
  readonly spends: 'purse' | 'assignments' | 'city-assignments'
  /** What the Stage puts in front of the player, if anything. */
  readonly offers: 'engagement' | 'market' | 'quests' | 'build' | 'labours' | null
  /** The Engagement kind an `engagement` Stage produces. */
  readonly engagementKind?: string
  /** Where an `engagement` Stage's targets come from: the player picks an adjacent unclaimed Territory, or a roll picks one you hold. */
  readonly targets?: 'conquerable' | 'rolled'
  /** KINGDOM-DESIGN.md §3: "in between the buy and the quest phase, there is an unavailability phase" — the Stage this precedes rolls it on entry. */
  readonly absencesBefore?: boolean
  /** One line, from §3's table. */
  readonly does: string
}

const RAW_STAGES: readonly StageRow[] = [
  { id: 'stage.buy', title: 'Buy', spends: 'purse', offers: 'market', does: 'Buy goods and services inside buildings. Recruit — one hero per Week. Train.' },
  { id: 'stage.quest', title: 'Quest', spends: 'assignments', offers: 'quests', absencesBefore: true, does: 'Dispatch heroes on quests. They leave for N Weeks and resolve without you.' },
  { id: 'stage.defend', title: 'Defend', spends: 'assignments', offers: 'engagement', engagementKind: 'engagement.defend', targets: 'rolled', does: 'Fight a counterattack on one of your Territories. Does not fire every Week.' },
  { id: 'stage.conquer', title: 'Conquer', spends: 'assignments', offers: 'engagement', engagementKind: 'engagement.conquer', targets: 'conquerable', does: 'Attack an adjacent unclaimed Territory — with whoever is left. Always optional.' },
  { id: 'stage.build', title: 'Build', spends: 'purse', offers: 'build', does: 'Repair and upgrade buildings. Salvage.' },
  { id: 'stage.mend', title: 'Mend', spends: 'city-assignments', offers: 'labours', does: 'The city Stage. Farm · Pray · Delve · Gather, plus Heal and Rest. Each consumes the city Assignment.' },
]

export const STAGES: readonly StageRow[] = omitDisabled(RAW_STAGES)

export function stageRowOf(id: string): StageRow {
  const row = STAGES.find((s) => s.id === id)
  if (!row) throw new Error(`unknown Stage '${id}' — the Stages are an explicit registry: ${STAGES.map((s) => s.id).join(' → ') || '(none)'}`)
  return row
}
