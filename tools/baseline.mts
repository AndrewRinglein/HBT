// Hash of the control battles' event logs. If one of these changes unexpectedly,
// something leaked into a path it should not have touched.
//
// One hash PER MAP, not one overall. The reason is a real miss: the stat pipeline
// landed with a single open-ground hash unchanged, and that was read as proof of
// behaviour neutrality. It wasn't — `map.open` has no terrain, so no terrain
// modifiers, so no ledger rows for the control to notice. The control map was
// blind to the entire terrain path by construction.
//
// Split like this, a terrain change moves three lines and leaves `map.open`
// alone, which says what changed instead of only that something did.
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { MAP_PANEL } from '../src/content/maps.js'

for (const mapId of MAP_PANEL) {
  let h = 2166136261
  for (let r = 0; r < 25; r++) {
    const ctx = createBattle({ replicate: r, enemyCount: 8, mapId })
    runBattle(ctx)
    for (const c of JSON.stringify(ctx.events)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  }
  console.log(`${mapId} ${(h >>> 0).toString(16).padStart(8, '0')}`)
}
