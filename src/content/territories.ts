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
// Nodes — one each, slice-tuned (7-KINGDOM-SETTLED.md: Mine ×8 · Field ×6 ·
// Abbey ×5 · Wellspring ×4 on a full map): the Sanctuary's field, the Ridge's
// mine (the Forge's), the Highlands' abbey, the Thicket's wellspring.
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
  /**
   * Where it sits on the painted world map — axial (q, r) of a tile in
   * kingdom-art/territories/index.json (USE-THIS-ART.md §2). Art placement
   * only; the rules never read it. Provisional: the four were picked for
   * contiguity around the keep at (−1, 0), not for matching terrain.
   */
  readonly hex: { readonly q: number; readonly r: number }
}

const t = (id: string, name: string, mapId: string, hex: [number, number], extra: Partial<TerritoryRow>): TerritoryRow => ({
  id, name, mapId, owned: false, kingdom: false, claimedOnce: false, buildings: [], adjacent: [], enemies: [], node: null, hex: { q: hex[0], r: hex[1] }, ...extra,
})

const RAW_TERRITORIES: readonly TerritoryRow[] = [
  t('territory.ruined-kingdom.sanctuary', 'Sanctuary', 'showcase.atlas-priory', [-1, 0], {
    owned: true, kingdom: true, claimedOnce: true, node: 'field',
    buildings: [{ id: 'building.chapel', level: 1, damaged: false, nodes: ['standing'] }, { id: 'building.waystation', level: 0, damaged: true, nodes: [] }],
    adjacent: ['territory.ruined-kingdom.ridge', 'territory.ruined-kingdom.highlands'],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.fast-zombie'],
    lostDefenceCosts: { 'currency.supplies': SWITCHES.sanctuaryLostDefenceSupplies },
  }),
  t('territory.ruined-kingdom.ridge', 'The Ridge', 'showcase.atlas-buried-pilgrimage', [-1, -1], {
    buildings: [{ id: 'building.forge', level: 0, damaged: true, nodes: [] }], node: 'mine',
    adjacent: ['territory.ruined-kingdom.sanctuary', 'territory.ruined-kingdom.thicket'],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie-hound', 'unit.skeletal-archer'],
  }),
  t('territory.ruined-kingdom.highlands', 'The Highlands', 'showcase.atlas-angled-halls', [0, -1], {
    adjacent: ['territory.ruined-kingdom.sanctuary'], node: 'abbey',
    enemies: ['unit.imp', 'unit.imp', 'unit.fire-imp', 'unit.poison-imp'],
  }),
  t('territory.ruined-kingdom.thicket', 'The Thicket', 'showcase.atlas-buried-pilgrimage', [-1, -2], {
    adjacent: ['territory.ruined-kingdom.ridge'], node: 'wellspring',
    enemies: ['unit.bloodhound', 'unit.bloodhound', 'unit.hellhound', 'unit.zombie-hound'],
  }),
]

export const TERRITORIES: readonly TerritoryRow[] = omitDisabled(RAW_TERRITORIES)

export function territoryRowOf(id: string): TerritoryRow {
  const row = TERRITORIES.find((r) => r.id === id)
  if (!row) throw new Error(`unknown Territory '${id}' — the realm is an explicit registry: ${TERRITORIES.map((r) => r.id).join(', ') || '(none)'}`)
  return row
}
