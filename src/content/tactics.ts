// Tactics — the War Council's draw. PLACEHOLDERS.
//
// Ruled 2026-09-01 (THIN-SLICE-REVIEW.md §G, ruling 4 sharpened): the council
// step is real and draws from stand-in rows under the reserved `test.*` kind,
// because `tactic.*` is an undeclared kind with zero ids (SKELETON-SETTLED.md
// "Still open" #6 — Angela's call). Every row here does NOTHING — `effect` is
// null by construction — and is replaced the day tactic.* is declared and the
// ~8–10 slice tactics are authored. Nothing that reads these may depend on a
// placeholder's name.

import { omitDisabled } from './disable.js'

export type TacticRow = {
  readonly id: string
  readonly name: string
  /** Always null on a placeholder. A real tactic.* row will carry its effect by id. */
  readonly effect: null
}

const RAW_TACTICS: readonly TacticRow[] = [
  { id: 'test.tactic.hold-the-line', name: 'Hold the Line (placeholder)', effect: null },
  { id: 'test.tactic.forced-march', name: 'Forced March (placeholder)', effect: null },
  { id: 'test.tactic.high-ground', name: 'High Ground (placeholder)', effect: null },
  { id: 'test.tactic.night-raid', name: 'Night Raid (placeholder)', effect: null },
]

export const TACTICS: readonly TacticRow[] = omitDisabled(RAW_TACTICS)

export function tacticOf(id: string): TacticRow {
  const row = TACTICS.find((t) => t.id === id)
  if (!row) throw new Error(`unknown tactic '${id}' — tactics are an explicit registry: ${TACTICS.map((t) => t.id).join(', ') || '(none)'}`)
  return row
}
