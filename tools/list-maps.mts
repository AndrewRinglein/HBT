// Print the engine's map ids, one per line, THROUGH THE DOOR — used by
// dump-fields.mjs and gate.mjs so the map list is never read from a dump.
import { readCatalog } from '../src/engine.js'
const { MAPS } = await readCatalog()
console.log(MAPS.map((m) => m.id).join('\n'))
