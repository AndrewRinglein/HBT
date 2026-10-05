// The special free attacks a unit makes only while it has them UP — one table, in a module that imports nothing at
// run time, so the pipeline (which rolls them), the movement ladder (which sets them off) and the mutators (which take
// them away) all read it without importing one another.
//
// capability.counterattack-and-fend (2026-10-04): the stat that says the kind is up (above 0), the stat added to that
// swing's Accuracy, and the cause its lines name. The attack of opportunity is the third special free attack; every unit
// with a zone of control makes it, so it has no row. The table was pipeline.ts's (`FREE_ATTACK_STATS`, still exported there
// under that name); it moved here for rule.counterattack-replaced-and-lost (2026-10-04), whose mutators sit below the
// pipeline.
import type { StatName } from './stats.js'

export type FreeAttackKind = 'counterattack' | 'fend'
export const SPECIAL_FREE_ATTACKS: Readonly<Record<FreeAttackKind, { readonly up: StatName; readonly accuracy: StatName; readonly cause: string }>> = {
  counterattack: { up: 'counterattack', accuracy: 'counterattackAccuracy', cause: 'rule.counterattack' },
  fend: { up: 'fend', accuracy: 'fendAccuracy', cause: 'rule.fend' },
}
/** The special free attack whose "up" stat this is, or undefined. */
export function freeAttackKindOf(stat: string): FreeAttackKind | undefined {
  return (Object.keys(SPECIAL_FREE_ATTACKS) as FreeAttackKind[]).find((k) => SPECIAL_FREE_ATTACKS[k].up === stat)
}
