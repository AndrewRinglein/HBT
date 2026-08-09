// Hash of the control battle's event log. If this changes unexpectedly,
// something leaked into paths it should not have touched.
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
let h = 2166136261
for (let r = 0; r < 25; r++) {
  const ctx = createBattle({ replicate: r, enemyCount: 8, mapId: 'open' })
  runBattle(ctx)
  for (const c of JSON.stringify(ctx.events)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
}
console.log((h >>> 0).toString(16))
