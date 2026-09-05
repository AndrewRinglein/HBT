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
//
// The --plan form (proving.page, 2026-09-05; session 9's E9) names a PAIR of the
// Proving: a plan file, a subject (its id, and slot/rotation when the id is in
// the plan more than once) and a pair index, WITH or WITHOUT the subject — or a
// matchup and a battle index. The export is the very battle the ranking
// counted, because the rig and this tool call the same fielding() on the same
// (map, seed). PROVING.html prints these commands beside every pair.
//   npx tsx tools/export-battle.mts --plan <file> --subject <id> --pair <n> [--arm with|without] [--slot k] [--rotation r] > battle.json
//   npx tsx tools/export-battle.mts --plan <file> --matchup <id> --battle <n> > battle.json
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { SCENARIOS, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { fielding, pairsOf, validatePlan, withSubject, type Plan } from '../src/sim/proving.js'

const argv = process.argv.slice(2)
const flag = (k: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined)

if (argv.includes('--plan')) {
  const plan = JSON.parse(readFileSync(flag('--plan')!, 'utf8')) as Plan
  validatePlan(plan)
  let opts, seed: Record<string, unknown>
  if (flag('--matchup') !== undefined) {
    const m = (plan.matchups ?? []).find((x) => x.id === flag('--matchup'))
    if (!m) { console.error(`plan ${plan.id} has no matchup '${flag('--matchup')}'`); process.exit(2) }
    const n = Number(flag('--battle') ?? 0)
    const list = pairsOf(plan, m.pairs ?? plan.maps.length)
    const at = list[n]
    if (!at) { console.error(`matchup ${m.id} has battles 0..${list.length - 1}`); process.exit(2) }
    opts = fielding(plan, m, at.map, at.seed)
    seed = { plan: plan.id, matchup: m.id, battle: n, map: at.map, replicate: at.seed }
  } else {
    const id = flag('--subject')
    const slot = flag('--slot') !== undefined ? Number(flag('--slot')) : undefined
    const rotation = flag('--rotation')
    const matches = plan.subjects.filter((s) => s.id === id && (slot === undefined || s.slot === slot) && (rotation === undefined || s.rotation === rotation))
    if (matches.length !== 1) { console.error(`plan ${plan.id}: ${matches.length} subjects match id '${id}'${slot !== undefined ? ` slot ${slot}` : ''}${rotation ? ` rotation ${rotation}` : ''} — name --slot / --rotation`); process.exit(2) }
    const sub = matches[0]!
    const fx = plan.fixtures.find((f) => f.id === sub.fixture)!
    const n = Number(flag('--pair') ?? 0)
    const list = pairsOf(plan, sub.pairs ?? plan.maps.length)
    const at = list[n]
    if (!at) { console.error(`subject ${sub.id} has pairs 0..${list.length - 1}`); process.exit(2) }
    const arm = flag('--arm') ?? 'with'
    if (arm !== 'with' && arm !== 'without') { console.error(`--arm is with or without`); process.exit(2) }
    const base = fielding(plan, fx, at.map, at.seed)
    opts = arm === 'with' ? withSubject(plan, sub, base) : base
    seed = { plan: plan.id, subject: sub.id, rotation: sub.rotation, side: sub.side, ...(sub.slot !== undefined ? { slot: sub.slot } : {}), fixture: sub.fixture, pair: n, arm, map: at.map, replicate: at.seed }
  }
  const ctx = createBattle(opts)
  runBattle(ctx)
  let commit = 'unknown'
  try { commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() } catch {}
  console.log(JSON.stringify({ seed, engineCommit: commit, outcome: ctx.events.find((e) => e.type === 'battle.end')?.['outcome'] ?? 'unknown', turns: ctx.state.turn, events: ctx.events }))
  process.exit(0)
}

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
