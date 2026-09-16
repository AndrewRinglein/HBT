// Authored scenes are flat generated content. Only the root compiler translates
// their geometry; Kingdom selects a map and the engine validates its fielding.
import registry from '../../../assets/battle-atlas/generated-combat/registry.json'
import type { AuthoredMap } from '../engine.js'

export type AtlasBinding = {
  mapId: string; areaIndex: number; compiler: string; sourceFingerprint: string
  layout: Record<string, unknown>; catalog: Record<string, unknown>
  policy: Record<string, unknown>; initialMapFact: Record<string, unknown>
}
type AtlasFielding = {
  id: string; name: string; setup: { map: AuthoredMap }
  atlasScene: AtlasBinding
  deploymentSlots: { heroes: number[]; enemies: number[] }
}
const rows = registry.entries as unknown as readonly AtlasFielding[]
export function atlasFieldingOf(id: string): AtlasFielding | undefined {
  const row = rows.find(r => r.id === id || r.setup.map.id === id)
  return row ? structuredClone(row) : undefined
}
