// V2 chapel assignments. Farm, Delve and Gather are removed; prayer tuning and wound service tiers follow separately.
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
  { key: 'pray', name: 'Pray', kind: 'labour', node: 'abbey', currency: 'currency.faith', base: 4, perNode: 1, does: 'Abbeys → Faith' },
  { key: 'heal', name: 'Heal', kind: 'heal', node: null, currency: null, base: 0, perNode: 0, does: 'a wound heals one level; produces nothing' },
  { key: 'rest', name: 'Rest', kind: 'rest', node: null, currency: null, base: 0, perNode: 0, does: 'one Week clears Fatigued and Exhausted' },
]

export function labourOf(key: string): LabourRow {
  const row = LABOURS.find((l) => l.key === key)
  if (!row) throw new Error(`unknown labour '${key}' — the labours are an explicit registry: ${LABOURS.map((l) => l.key).join(', ')}`)
  return row
}
