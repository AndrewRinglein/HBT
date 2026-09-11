import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { ITEMS } from '../src/content/index.js'
import { rosterOptionsOf, type Schedule } from '../src/sim/progression.js'
import type { Ctx } from '../src/core/types.js'

/** Explicit inputs shared by the pre-extraction capture command and parity tests. */
export function battleCursorCases(): { id: string; create: () => Ctx }[] {
  const schedule = JSON.parse(readFileSync(fileURLToPath(new URL('../../progression/PROGRESSION-SCHEDULE.json', import.meta.url)), 'utf8')) as Schedule
  return [
    ...Object.keys(SCENARIOS).sort().map(id => ({ id, create: () => createBattle(scenarioOptions(SCENARIOS[id]!)) })),
    ...[0, 1, 2].map(replicate => ({
      id: `progression-surge-${replicate}`,
      create: () => createBattle({ ...rosterOptionsOf(schedule, 20, ITEMS), replicate, enemyCount: 12, mapId: 'map.open', strict: true }),
    })),
    {
      id: 'legacy-surge-cap',
      create: () => {
        const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 181 }], { strict: true })
        ctx.state.units[0]!.surge = 100
        return ctx
      },
    },
  ]
}
