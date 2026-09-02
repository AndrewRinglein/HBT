// The slice map — realm.ruined-kingdom, four Territories. GAME-ARCHITECTURE.md
// §2.4 "The map is content": authored and fixed, ids scoped to the realm.
// THIN-SLICE-REVIEW.md §G2: "the Kingdom hex plus three to conquer; the first
// conquest holds a critical building we need."
//
// Names: the Sanctuary is KINGDOM-DESIGN.md §1's centre ("Sanctuary sits on its
// hex"); the Ridge is GLOSSARY.md's own example id; the Highlands and the
// Thicket take the engine's existing map names. The Forge is the only building
// id the glossary carries and the critical building the first conquest holds.
// Enemy lists are the slice's encounters — "difficulty-ranked rows with enemy
// lists" collapsed to one list per Territory until the ranked list exists —
// drawn from the engine's pack rows.
//
// A Territory's stakes are its own: the Kingdom Territory cannot be lost
// (SKELETON-SETTLED.md:81) and a failed defence of it "costs resources and
// wounded heroes instead" — `lostDefenceCosts`, a number that is a switch.

import type { Territory } from '../core/campaign.js'
import { omitDisabled } from './disable.js'
import { SWITCHES } from './switches.js'

export const REALM = 'realm.ruined-kingdom'

export type TerritoryRow = Territory & {
  /** What a lost defence of an unlosable Territory costs, by currency. Absent on every other row. */
  readonly lostDefenceCosts?: Readonly<Record<string, number>>
}

const t = (id: string, name: string, mapId: string, extra: Partial<TerritoryRow>): TerritoryRow => ({
  id, name, mapId, owned: false, kingdom: false, claimedOnce: false, buildings: [], adjacent: [], enemies: [], ...extra,
})

const RAW_TERRITORIES: readonly TerritoryRow[] = [
  t('territory.ruined-kingdom.sanctuary', 'Sanctuary', 'map.open', {
    owned: true, kingdom: true, claimedOnce: true,
    adjacent: ['territory.ruined-kingdom.ridge', 'territory.ruined-kingdom.highlands'],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.fast-zombie'],
    lostDefenceCosts: { 'currency.supplies': SWITCHES.sanctuaryLostDefenceSupplies },
  }),
  t('territory.ruined-kingdom.ridge', 'The Ridge', 'map.ridge', {
    buildings: [{ id: 'building.forge', level: 0, damaged: true }],
    adjacent: ['territory.ruined-kingdom.sanctuary', 'territory.ruined-kingdom.thicket'],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie-hound', 'unit.skeletal-archer'],
  }),
  t('territory.ruined-kingdom.highlands', 'The Highlands', 'map.highlands', {
    adjacent: ['territory.ruined-kingdom.sanctuary'],
    enemies: ['unit.imp', 'unit.imp', 'unit.fire-imp', 'unit.poison-imp'],
  }),
  t('territory.ruined-kingdom.thicket', 'The Thicket', 'map.thicket', {
    adjacent: ['territory.ruined-kingdom.ridge'],
    enemies: ['unit.bloodhound', 'unit.bloodhound', 'unit.hellhound', 'unit.zombie-hound'],
  }),
]

export const TERRITORIES: readonly TerritoryRow[] = omitDisabled(RAW_TERRITORIES)

export function territoryRowOf(id: string): TerritoryRow {
  const row = TERRITORIES.find((r) => r.id === id)
  if (!row) throw new Error(`unknown Territory '${id}' — the realm is an explicit registry: ${TERRITORIES.map((r) => r.id).join(', ') || '(none)'}`)
  return row
}
