// The encounter × roster sweep — the run's deliverable (2026-09-03).
// Every shipped encounter against the progression roster at its campaign
// position (Angela: "Yes, all twenty by position"), N seeds each. Prints a
// table and writes .state/encounter-sweep.json. Read-only: no state changes.
import { readFileSync, writeFileSync } from 'node:fs'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { ENCOUNTERS, ITEMS } from '../src/content/index.js'
import { rosterOptionsOf, type Schedule } from '../src/sim/progression.js'

const schedule = JSON.parse(readFileSync('../progression/PROGRESSION-SCHEDULE.json', 'utf8')) as Schedule
const SEEDS = +(process.argv[2] ?? 20)
// campaign position per encounter: the prologue five are battles 1–5; the rest by the entry's era
const POSITION: Record<string, number> = {
  'battle.prologue-1': 1, 'battle.prologue-2': 2, 'battle.prologue-3': 3, 'battle.prologue-4': 4, 'battle.prologue-5': 5,
  'encounter.supper': 3, 'encounter.kiln': 9, 'battle.horrors-of-the-night': 12, 'encounter.last-company': 14, 'encounter.rime': 20,
}
const rows: Record<string, unknown>[] = []
for (const [id, enc] of Object.entries(ENCOUNTERS)) {
  const battle = POSITION[id] ?? 10
  const opts = rosterOptionsOf(schedule, battle, ITEMS)
  const outcomes: Record<string, number> = {}
  let turns = 0, heroDowns = 0, heroDeaths = 0, civDead = 0, stands = 0
  for (let r = 0; r < SEEDS; r++) {
    const ctx = createBattle({ ...opts, encounter: enc, replicate: r })
    const o = runBattle(ctx)
    outcomes[o.outcome] = (outcomes[o.outcome] ?? 0) + 1
    turns += o.turns
    for (const u of ctx.state.units) {
      if (u.side !== 'hero') continue
      const civ = u.tags.includes('civilian')
      if (u.lifeState === 'dead') { if (civ) civDead++; else heroDeaths++ }
      if (!civ && u.woundLevel > 0) stands += u.woundLevel
    }
    heroDowns += ctx.events.filter((e) => e.type === 'life.downed').length
  }
  rows.push({ encounter: id, battle, heroes: opts.heroes.length, seeds: SEEDS, outcomes, avgTurns: +(turns / SEEDS).toFixed(1), downsPerBattle: +(heroDowns / SEEDS).toFixed(2), heroDeaths, civiliansDead: civDead, standsPerBattle: +(stands / SEEDS).toFixed(2), gaps: enc.gaps?.length ?? 0 })
}
writeFileSync('.state/encounter-sweep.json', JSON.stringify({ at: new Date().toISOString(), seeds: SEEDS, rows }, null, 1))
for (const r of rows) console.log(String(r['encounter']).padEnd(30), 'b' + String(r['battle']).padEnd(3), String(r['heroes']) + 'h', JSON.stringify(r['outcomes']).padEnd(52), 'turns', r['avgTurns'], 'downs/b', r['downsPerBattle'], 'deaths', r['heroDeaths'], 'civ†', r['civiliansDead'], 'stands/b', r['standsPerBattle'], 'gaps', r['gaps'])
