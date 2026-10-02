// Write generated/static.json — the read-only content the viewer draws from,
// read THROUGH THE DOOR (src/engine.ts) and shaped by src/sheet.ts.
//   npm run static        (from viewer/)
// Nothing here is computed; every field is copied from a definition. The
// standalone page bakes this file in; the game (stage 3) reads the same door
// at runtime. Never hand-edit the output.
import { writeFileSync } from 'node:fs'
import { codeStamp } from '../../engine/tools/code-stamp.mjs'
import { allSheets, absorbingStatusIds, statusNames, attackTable, abilityTable, actionTable, badgeTable, layerNames, groundApplies, actionKinds, statusRows } from '../src/sheet.js'
import { readCatalog } from '../src/engine.js'
const { MAPS } = await readCatalog()

/* the engine's code stamp, not its HEAD (Andrew, 2026-10-01): a ruling commit leaves this file unchanged */
const { stamp: engineCommit, dirty } = codeStamp()

/* attacks/abilities: the whole tables, so a unit.equipped grant resolves at fold
   time; layers: the ground layer names by number (2026-09-03) */
const out = { engineCommit, engineDirty: dirty, maps: MAPS.map((m) => m.id), units: allSheets(), statuses: statusNames(), absorbingStatuses: absorbingStatusIds(),
  attacks: attackTable(), abilities: abilityTable(), actions: actionTable(), badges: badgeTable(),
  layers: layerNames(), ...groundApplies(),
  /* viewer.reads-engine (review V1, V5): the engine's classification of every action and each status's behaviour */
  actionKinds: actionKinds(), statusRows: statusRows() }
writeFileSync('generated/static.json', JSON.stringify(out))
console.log(`static.json: ${out.maps.length} maps · ${Object.keys(out.units).length} units · ${Object.keys(out.statuses).length} statuses · ${Object.keys(out.actions).length} actions · ${Object.keys(out.badges).length} badges · engine ${engineCommit}${dirty ? ' (DIRTY tree)' : ''}`)
