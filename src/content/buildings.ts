// Buildings — 7-KINGDOM-SETTLED.md "Buildings — nine": "Trees, not ladders.
// Shape grammar: Fan (categories, any order) · Chain (real escalation) · Fork
// (identity). Every node bought separately in Salvage." The Forge's tree is
// THE-KINGDOM.html §III (and pipeline/ui/trees.json, the art chat's
// transcription): repair 10, then the arms fan (Blades · Bows · Shields, 8
// each) and the armour fan (Light · Mail, 10 each), then Exotic arms 18 (3
// Mines, any 2 arms) and Plate 18 (3 Mines), then Masterworks 40 (both), then
// Enchanted 60 (1 Wellspring) — 190 in all. The Chapel stands at Sanctuary,
// its root free; its root and the first rite of its fan are rows here, as the
// second instance that proves the tree machine is data. The other seven are out of the slice.
//
// Node gates name Territory nodes, never money (7-KINGDOM-SETTLED.md "Node
// types — permissions, never payments"). On the four-Territory slice map they
// cannot be met — "the Forge's 3-Mines gate is waived or scaled"
// (THIN-SLICE-REVIEW.md §G2) — see SWITCHES.md, gates.waived.

import { omitDisabled } from './disable.js'

export type NodeGate = Readonly<Partial<Record<'mine' | 'field' | 'abbey' | 'wellspring', number>>>

export type BuildingNode = {
  readonly key: string
  readonly name: string
  readonly salvage: number
  /** Parent node keys; `needs` says how many of them must be built (default: all). */
  readonly parents: readonly string[]
  readonly needs?: number
  readonly gate?: NodeGate
  readonly note?: string
}

export type BuildingRow = {
  readonly id: string
  readonly name: string
  readonly tag: string
  /** Where it stands: a Territory conquered with it, or the Sanctuary from the start. */
  readonly stands: 'territory' | 'sanctuary'
  readonly nodes: readonly BuildingNode[]
  /**
   * The building's bands, in order — the level its art shows and its services read
   * (ART-NOTES.md: "bands key to a building's level"). A band is reached when ANY of
   * its `at` nodes is built. Absent: the level is the node count, as before.
   */
  readonly bands?: readonly { readonly name: string; readonly at: readonly string[] }[]
  /**
   * The Forge's shelf by band (GEAR-DESIGN.md §3, ruled 2026-09-02): base items on
   * the shelf, masterworks and enchanted added, and whether the trade-in is open.
   * Cumulative: the highest band reached says how many of each.
   */
  readonly shelf?: readonly { readonly band: number; readonly base?: number; readonly masterwork?: number; readonly enchanted?: number; readonly tradeIn?: boolean }[]
}

const RAW_BUILDINGS: readonly BuildingRow[] = [
  {
    id: 'building.forge', name: 'The Forge', tag: 'Everything a hero carries. Weaponsmith + Armorsmith.', stands: 'territory',
    nodes: [
      { key: 'repair', name: 'Repair', salvage: 10, parents: [] },
      { key: 'blades', name: 'Blades', salvage: 8, parents: ['repair'] },
      { key: 'bows', name: 'Bows', salvage: 8, parents: ['repair'] },
      { key: 'shields', name: 'Shields', salvage: 8, parents: ['repair'] },
      { key: 'light', name: 'Light', salvage: 10, parents: ['repair'] },
      { key: 'mail', name: 'Mail', salvage: 10, parents: ['repair'] },
      { key: 'exotic-arms', name: 'Exotic arms', salvage: 18, parents: ['blades', 'bows', 'shields'], needs: 2, gate: { mine: 3 } },
      { key: 'plate', name: 'Plate', salvage: 18, parents: ['light', 'mail'], gate: { mine: 3 } },
      { key: 'masterworks', name: 'Masterworks', salvage: 40, parents: ['exotic-arms', 'plate'] },
      { key: 'enchanted', name: 'Enchanted', salvage: 60, parents: ['masterworks'], gate: { wellspring: 1 }, note: 'lvl 1 enchants' },
    ],
    // Repaired · Equipped · Masterwork · Enchanted — the four bands the art was painted for (kingdom-art forge--*)
    bands: [
      { name: 'Repaired', at: ['repair'] },
      { name: 'Equipped', at: ['blades', 'bows', 'shields', 'light', 'mail'] },
      { name: 'Masterwork', at: ['masterworks'] },
      { name: 'Enchanted', at: ['enchanted'] },
    ],
    // "Repaired sells two items, Equipped four. Masterwork gives you two masterwork items. Enchanted two enchanted items." · "Let's just do it in Forge. It unlocks at the highest tier."
    shelf: [
      { band: 1, base: 2 },
      { band: 2, base: 4 },
      { band: 3, masterwork: 2 },
      { band: 4, enchanted: 2, tradeIn: true },
    ],
  },
  {
    id: 'building.chapel', name: 'The Chapel', tag: 'What the gods do to your people — bodies and souls.', stands: 'sanctuary',
    nodes: [
      { key: 'standing', name: 'Standing', salvage: 0, parents: [], note: 'free — cleanse & cure Minor · gates Pray' },
      // the first rite of its RITES fan (THE-KINGDOM.html §III) — the one node
      // beyond the root the slice carries, so the tree machine's second
      // instance is bought in a run, not merely read
      { key: 'attach-origins', name: 'Attach origins', salvage: 20, parents: ['standing'], note: '10 Mana each — the service itself is out of the slice' },
    ],
  },
]

export const BUILDINGS: readonly BuildingRow[] = omitDisabled(RAW_BUILDINGS)

export function buildingRowOf(id: string): BuildingRow {
  const row = BUILDINGS.find((b) => b.id === id)
  if (!row) throw new Error(`unknown building '${id}' — the buildings are an explicit registry: ${BUILDINGS.map((b) => b.id).join(', ') || '(none)'}`)
  return row
}
