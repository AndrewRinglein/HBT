// Export one battle's event log as JSON, for the replay viewer.
//   npx tsx tools/export-battle.mts <replicate> <mapId> <enemyCount> > battle.json
//   npx tsx tools/export-battle.mts --scenario <id>                  > battle.json
//   npx tsx tools/export-battle.mts --scenarios          # list what is fielded
//
// A battle is a SEED, not a recording — this file records the seed and the engine
// commit next to the events, so a replay that no longer matches says so.
//
// The --scenario form (PLAYBACK-DESIGN §6.2) names a FIELDING: which units stand
// where, on which map. It exists because the standard battle cannot show the
// benched beasts or the flight ladder, so nothing new could be shown at all.
// A scenario names units and positions and CANNOT name statistics — overrides
// belong to sweeps, and a showcase that can change numbers can lie about the game.
import { execSync } from 'node:child_process'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { SCENARIOS, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

const argv = process.argv.slice(2)

if (argv.includes('--scenarios')) {
  const ids = Object.keys(SCENARIOS)
  if (ids.length === 0) console.error('no scenarios registered')
  for (const id of ids) {
    const s = SCENARIOS[id]!
    console.error(`${id}\n  ${s.note}\n  ${s.mapId} · heroes ${s.heroes.join(', ')} · enemies ${s.enemies.join(', ')}\n`)
  }
  process.exit(0)
}

const sIdx = argv.indexOf('--scenario')
const scenarioId = sIdx >= 0 ? argv[sIdx + 1] : undefined
if (sIdx >= 0 && !scenarioId) {
  console.error('usage: export-battle.mts --scenario <id>   (--scenarios lists them)')
  process.exit(2)
}

// Positional form, unchanged — every existing caller keeps working.
const positional = argv.filter((a, i) => !a.startsWith('--') && a !== scenarioId && argv[i - 1] !== '--seed')
const replicate = Number(positional[0] ?? 0)
const mapId = positional[1] ?? 'map.field'
const enemyCount = Number(positional[2] ?? 8)

// --seed <n> on a scenario export (2026-09-03): the scenario names the fielding,
// the replicate picks the dice — a showcase seed is still a seed.
const seedIdx = argv.indexOf('--seed')
const seedOverride = seedIdx >= 0 ? Number(argv[seedIdx + 1]) : undefined
const ctx = scenarioId
  ? createBattle({ ...scenarioOptions(scenarioDef(scenarioId)), ...(seedOverride !== undefined ? { replicate: seedOverride } : {}) })
  : createBattle({ replicate, enemyCount, mapId })
runBattle(ctx)

let commit = 'unknown'
try { commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() } catch {}

// `seed` gains scenarioId ONLY when there is one, so a positional export is
// byte-identical to what it produced before this flag existed (§9: same battle,
// same templates, byte-identical page).
const seed = scenarioId
  ? { ...(({ scenarioId: _s, ...rest }) => rest)(scenarioOptions(scenarioDef(scenarioId))), scenarioId, ...(seedOverride !== undefined ? { replicate: seedOverride } : {}) }
  : { replicate, mapId, enemyCount }

console.log(JSON.stringify({
  seed,
  engineCommit: commit,
  outcome: ctx.events.find((e) => e.type === 'battle.end')?.['outcome'] ?? 'unknown',
  turns: ctx.state.turn,
  events: ctx.events,
}))
