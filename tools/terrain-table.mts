// The terrain table, as the ENGINE holds it — for any renderer that wants to show it.
// Hand-typing this into a viewer is how a legend comes to disagree with the rules.
import { MAPS, terrainOf, terrainIdOf, moveCostOf, isPassable,
         accuracyBonusOf, reachBonusOf, dodgeBonusOf, armorBonusOf } from '../src/content/maps.js'
import { TERRAIN } from '../src/core/types.js'

const KINDS = Object.values(TERRAIN) as number[]
const table = KINDS.map((t) => ({
  id: terrainIdOf(t),
  moveCost: moveCostOf(t),
  passable: isPassable(t),
  accuracy: accuracyBonusOf(t), reach: reachBonusOf(t),
  dodge: dodgeBonusOf(t), armor: armorBonusOf(t),
}))
const mapId = process.argv[2] ?? 'map.field'
const terr = terrainOf(mapId)
console.log(JSON.stringify({
  mapId,
  table,
  ids: terr.map(terrainIdOf),
  cost: terr.map(moveCostOf),
}))
