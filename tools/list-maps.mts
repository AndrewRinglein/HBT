// Print the engine's map ids, one per line, THROUGH THE DOOR — used by
// dump-fields.mjs and gate.mjs so the map list is never read from a dump.
//   --geometry   print instead the board-space layout every field carries (the engine's
//                FIELD_GEOMETRY, view/field.ts) as JSON — dump-fields compares each field with
//                it rather than typing the numbers (viewer.reads-engine, review V14)
import { readCatalog, FIELD_GEOMETRY } from '../src/engine.js'
if (process.argv.includes('--geometry')) console.log(JSON.stringify(FIELD_GEOMETRY))
else { const { MAPS } = await readCatalog(); console.log(MAPS.map((m) => m.id).join('\n')) }
