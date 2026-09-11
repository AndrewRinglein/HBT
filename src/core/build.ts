// Build — stage.build. GAME-ARCHITECTURE.md §2.6 BUILDINGS: listBuildings ·
// canBuild / costOfBuild / performBuild. A building's tree is rows
// (src/content/buildings.ts); a node is bought on its own, in Salvage, once
// its parents are built (all of them, or `needs` of them) and its Territory
// gate is met — or waived on the slice map (SWITCHES.md gates.waived). The
// building must stand on a Territory you hold: conquering the Territory is
// what unlocks it (ruled 2026-09-02, ART-NOTES.md).

import type { CampaignState, TerritoryId, Building } from './campaign.js'
import { type Ctx, applyBuildNode } from './mutate.js'
import { canAfford, performSpend, type Cost } from './purse.js'
import { nodeCountOf } from './mend.js'
import { BUILDINGS, buildingRowOf, type BuildingRow, type BuildingNode } from '../content/buildings.js'
import { CURRENCY_IDS } from '../content/currencies.js'
import { SWITCHES } from '../content/switches.js'
import { canUseActivity } from './activity.js'

export type BuildingView = { territoryId: TerritoryId; building: Building; row: BuildingRow; held: boolean }

/** Every building on the map with its Territory and its row. Sorted by Territory then building id (Law 6). */
export function listBuildings(campaign: CampaignState): BuildingView[] {
  const out: BuildingView[] = []
  for (const t of Object.values(campaign.territories)) for (const b of t.buildings) {
    if (!BUILDINGS.some((r) => r.id === b.id)) continue
    out.push({ territoryId: t.id, building: b, row: buildingRowOf(b.id), held: t.owned })
  }
  return out.sort((a, b) => (a.territoryId === b.territoryId ? (a.building.id < b.building.id ? -1 : 1) : a.territoryId < b.territoryId ? -1 : 1))
}

export function nodeOf(row: BuildingRow, key: string): BuildingNode {
  const n = row.nodes.find((x) => x.key === key)
  if (!n) throw new Error(`no node '${key}' on ${row.id} — its nodes are ${row.nodes.map((x) => x.key).join(', ')}`)
  return n
}

export const costOfBuild = (row: BuildingRow, key: string): Cost => ({ [CURRENCY_IDS.salvage]: nodeOf(row, key).salvage })

const atBuild = (campaign: CampaignState) => canUseActivity(campaign, 'build')

/** Why a node cannot be built now, or null when it can. The reasons are the rule, spelled out. */
export function whyNotBuild(campaign: CampaignState, territoryId: TerritoryId, buildingId: string, key: string): string | null {
  const t = campaign.territories[territoryId]
  const b = t?.buildings.find((x) => x.id === buildingId)
  if (!t || !b) return 'no such building here'
  if (!t.owned) return 'the Territory is not held'
  if (!atBuild(campaign)) return 'not the Build Stage'
  const row = buildingRowOf(buildingId)
  const node = row.nodes.find((x) => x.key === key)
  if (!node) return 'no such node'
  if (b.nodes.includes(key)) return 'already built'
  const parentsBuilt = node.parents.filter((p) => b.nodes.includes(p)).length
  if (parentsBuilt < (node.needs ?? node.parents.length)) return `needs ${node.needs ?? node.parents.length} of ${node.parents.join(', ')} built`
  if (node.gate && !SWITCHES.buildingGatesWaived) {
    for (const [n, count] of Object.entries(node.gate)) if (nodeCountOf(campaign, n as keyof typeof node.gate) < (count ?? 0)) return `needs ${count} ${n}s held`
  }
  if (!canAfford(campaign, costOfBuild(row, key))) return `short of ${node.salvage} Salvage`
  return null
}

export function canBuild(campaign: CampaignState, territoryId: TerritoryId, buildingId: string, key: string): boolean {
  return whyNotBuild(campaign, territoryId, buildingId, key) === null
}

export function performBuild(ctx: Ctx, territoryId: TerritoryId, buildingId: string, key: string, causeId: string): void {
  const why = whyNotBuild(ctx.campaign, territoryId, buildingId, key)
  if (why) throw new Error(`performBuild refused (${buildingId} · ${key}): ${why}`)
  performSpend(ctx, costOfBuild(buildingRowOf(buildingId), key), causeId)
  applyBuildNode(ctx, territoryId, buildingId, key, causeId)
}
