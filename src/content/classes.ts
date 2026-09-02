// The eight classes in three groups — GAME-ARCHITECTURE.md §2.3, ruled
// 2026-08-23: "6 Hero Classes, then Civilians, and Beasts. They are all player
// units… all in one shared unit pool." The GROUP is what requirements and the
// difficulty formula select on; the class is what a unit IS. Rows, so core
// never spells a class id.

import { omitDisabled } from './disable.js'

export type ClassGroup = 'hero' | 'civilian' | 'beast'
export type ClassRow = { readonly id: string; readonly name: string; readonly group: ClassGroup }

const RAW_CLASSES: readonly ClassRow[] = [
  { id: 'class.warrior', name: 'Warrior', group: 'hero' },
  { id: 'class.ranger', name: 'Ranger', group: 'hero' },
  { id: 'class.rogue', name: 'Rogue', group: 'hero' },
  { id: 'class.priest', name: 'Priest', group: 'hero' },
  { id: 'class.mage', name: 'Mage', group: 'hero' },
  { id: 'class.paladin', name: 'Paladin', group: 'hero' },
  { id: 'class.civilian', name: 'Civilian', group: 'civilian' },
  { id: 'class.beast', name: 'Beast', group: 'beast' },
]

export const CLASSES: readonly ClassRow[] = omitDisabled(RAW_CLASSES)

/**
 * A unit's group from its class list. `classes` is plural — any one match
 * satisfies a filter (2-ACTIONS-SETTLED.md) — so the first class that has a
 * row decides; a unit whose classes have no row is refused loudly.
 */
export function groupOf(classes: readonly string[]): ClassGroup {
  for (const c of classes) { const row = CLASSES.find((r) => r.id === c); if (row) return row.group }
  throw new Error(`no class row for [${classes.join(', ')}] — classes are an explicit registry`)
}
