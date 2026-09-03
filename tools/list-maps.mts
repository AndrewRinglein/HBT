// Print the engine's map ids, one per line, THROUGH THE DOOR — used by
// dump-fields.mjs and gate.mjs so the map list is never read from a dump.
import { MAPS } from '../src/engine.js'
console.log(MAPS.map((m) => m.id).join('\n'))
