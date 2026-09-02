// The Mend labours — 7-KINGDOM-SETTLED.md "The Mend labours", Law 7 ("nodes
// never print; they raise what a person produces"):
//
//   Farm    Field · +2 each      5 + 2×Fields Supplies
//   Pray    Abbey · +1 each      4 + 1×Abbeys Faith
//   Delve   Wellspring · +1 each 4 + 1×Wellsprings Mana
//   Gather  Mine · +1 quality    a loot roll — no item pool yet, so no yield yet
//   Heal · Rest                  produce nothing and compete for the same Assignment
//
// These rows have NO id kind — no prefix covers a labour (THIN-SLICE-
// IMPLEMENTATION.md §9 blocker 9, Andrew's call) — so they are keyed by a bare
// word and cannot be kill-switched by name. Each consumes the CITY Assignment
// (amended Law 17).

export type NodeType = 'mine' | 'field' | 'abbey' | 'wellspring'

export type LabourRow = {
  readonly key: string
  readonly name: string
  /** What the labour writes to the Assignment: a labour yields; heal and rest are their own kinds. */
  readonly kind: 'labour' | 'heal' | 'rest'
  /** The node that raises it, and what it pays. Null on the ones that produce nothing. */
  readonly node: NodeType | null
  readonly currency: string | null
  readonly base: number
  readonly perNode: number
  readonly does: string
}

export const LABOURS: readonly LabourRow[] = [
  { key: 'farm', name: 'Farm', kind: 'labour', node: 'field', currency: 'currency.supplies', base: 5, perNode: 2, does: 'Fields → Supplies' },
  { key: 'pray', name: 'Pray', kind: 'labour', node: 'abbey', currency: 'currency.faith', base: 4, perNode: 1, does: 'Abbeys → Faith' },
  { key: 'delve', name: 'Delve', kind: 'labour', node: 'wellspring', currency: 'currency.mana', base: 4, perNode: 1, does: 'Wellsprings → Mana' },
  { key: 'gather', name: 'Gather', kind: 'labour', node: 'mine', currency: null, base: 0, perNode: 0, does: 'Mines → loot — no item pool yet, so nothing yet' },
  { key: 'heal', name: 'Heal', kind: 'heal', node: null, currency: null, base: 0, perNode: 0, does: 'a wound heals one level; produces nothing' },
  { key: 'rest', name: 'Rest', kind: 'rest', node: null, currency: null, base: 0, perNode: 0, does: 'produces nothing' },
]

export function labourOf(key: string): LabourRow {
  const row = LABOURS.find((l) => l.key === key)
  if (!row) throw new Error(`unknown labour '${key}' — the labours are an explicit registry: ${LABOURS.map((l) => l.key).join(', ')}`)
  return row
}
