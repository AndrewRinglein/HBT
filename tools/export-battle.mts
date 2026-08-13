// Export one battle's event log as JSON, for the replay viewer.
//   npx tsx tools/export-battle.mts <replicate> <mapId> <enemyCount> > battle.json
// A battle is a SEED, not a recording — this file records the seed and the engine
// commit next to the events, so a replay that no longer matches says so.
import { execSync } from 'node:child_process'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

const replicate = Number(process.argv[2] ?? 0)
const mapId = process.argv[3] ?? 'map.field'
const enemyCount = Number(process.argv[4] ?? 8)

const ctx = createBattle({ replicate, enemyCount, mapId })
runBattle(ctx)

let commit = 'unknown'
try { commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() } catch {}

console.log(JSON.stringify({
  seed: { replicate, mapId, enemyCount },
  engineCommit: commit,
  outcome: ctx.events.find((e) => e.type === 'battle.end')?.['outcome'] ?? 'unknown',
  turns: ctx.state.turn,
  events: ctx.events,
}))
