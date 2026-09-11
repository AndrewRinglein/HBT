import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
const missing = new Set(['badge.held', 'aoo.skipped'])
for (let seed = 0; seed < 25 && missing.size; seed++) for (const row of Object.values(SCENARIOS)) {
  const ctx = createBattle({ ...scenarioOptions(row), replicate: seed }); runBattle(ctx)
  for (const type of [...missing]) if (ctx.events.some(e => e.type === type)) { console.log(JSON.stringify({ type, scenario: row.id, seed, events: ctx.events.filter(e => e.type === type) })); missing.delete(type) }
  if (!missing.size) break
}
if (missing.size) throw new Error(`uncovered: ${[...missing]}`)
