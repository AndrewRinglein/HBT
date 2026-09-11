// The three kinds of Engagement — GAME-ARCHITECTURE.md §4's stakes table,
// verbatim as rows. "That table is the entire difference. It is three data
// rows, not three code paths." Core reads a row by the Engagement's `kind` and
// never spells one of these ids out.
//
// The columns that are consequences (what losing and winning do) are named
// here as stakes the Reckoning (M4) reads; the columns that are prep facts
// (whose structures apply, whether the roster is fixed) are read by Combat
// Prep (M2).

import { omitDisabled } from './disable.js'

export type EngagementKindRow = {
  readonly id: string
  readonly stage: string
  /** "Your structures apply" — only when defending what you hold. */
  readonly structuresApply: boolean
  /** "fixed — whoever you sent": canDeploy is false, the roster was committed Weeks ago. */
  readonly rosterFixed: boolean
  readonly rewards: 'battle' | 'quest'
  readonly onLose: 'lose-territory' | 'nothing' | 'lose-heroes'
  readonly onWin: 'keep-territory' | 'claim-territory' | 'quest-reward'
}

const RAW_ENGAGEMENT_KINDS: readonly EngagementKindRow[] = [
  { id: 'engagement.defend', stage: 'stage.field', structuresApply: true, rosterFixed: false, rewards: 'battle', onLose: 'lose-territory', onWin: 'keep-territory' },
  { id: 'engagement.conquer', stage: 'stage.field', structuresApply: false, rosterFixed: false, rewards: 'battle', onLose: 'nothing', onWin: 'claim-territory' },
  { id: 'engagement.quest', stage: 'stage.field', structuresApply: false, rosterFixed: true, rewards: 'quest', onLose: 'lose-heroes', onWin: 'quest-reward' },
]

export const ENGAGEMENT_KINDS: readonly EngagementKindRow[] = omitDisabled(RAW_ENGAGEMENT_KINDS)

export function engagementKindOf(id: string): EngagementKindRow {
  const row = ENGAGEMENT_KINDS.find((r) => r.id === id)
  if (!row) throw new Error(`unknown engagement kind '${id}' — the kinds are an explicit registry: ${ENGAGEMENT_KINDS.map((r) => r.id).join(', ') || '(none)'}`)
  return row
}
