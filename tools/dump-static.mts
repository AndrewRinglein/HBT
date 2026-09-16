// Write generated/static.json — the read-only content the viewer draws from,
// read THROUGH THE DOOR (src/engine.ts) and shaped by src/sheet.ts.
//   npm run static        (from viewer/)
// Nothing here is computed; every field is copied from a definition. The
// standalone page bakes this file in; the game (stage 3) reads the same door
// at runtime. Never hand-edit the output.
import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { allSheets, absorbingStatusIds, statusNames, attackTable, abilityTable, actionTable, badgeTable, layerNames } from '../src/sheet.js'
import { readCatalog } from '../src/engine.js'
const { MAPS } = await readCatalog()

let engineCommit = 'unknown'
try { engineCommit = execSync('git -C ../engine rev-parse --short HEAD', { encoding: 'utf8' }).trim() } catch {}
let dirty = false
try { dirty = execSync('git -C ../engine status --porcelain', { encoding: 'utf8' }).trim().length > 0 } catch {}

/* attacks/abilities: the whole tables, so a unit.equipped grant resolves at fold
   time; layers: the ground layer names by number (2026-09-03) */
const out = { engineCommit, engineDirty: dirty, maps: MAPS.map((m) => m.id), units: allSheets(), statuses: statusNames(), absorbingStatuses: absorbingStatusIds(),
  attacks: attackTable(), abilities: abilityTable(), actions: actionTable(), badges: badgeTable(),
  layers: layerNames() }
writeFileSync('generated/static.json', JSON.stringify(out))
console.log(`static.json: ${out.maps.length} maps · ${Object.keys(out.units).length} units · ${Object.keys(out.statuses).length} statuses · ${Object.keys(out.actions).length} actions · ${Object.keys(out.badges).length} badges · engine ${engineCommit}${dirty ? ' (DIRTY tree)' : ''}`)
