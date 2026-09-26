import type { Scoreboard } from '../sim/score.js'
import { runSweep } from '../sim/sweep.js'
import { renderCoverage } from '../sim/coverage.js'

// `npm run sweep -- <n> --coverage` adds the coverage report (sim.coverage): what the
// fielded roster could reach and this sweep never used. npm swallows a bare
// `--coverage` placed before `--` into npm_config_coverage, so both spellings count.
const N = Number(process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 100)
const wantCoverage = process.argv.includes('--coverage') || process.env['npm_config_coverage'] === 'true'
const t0 = Date.now()
const run = runSweep(N, { coverage: wantCoverage })
const boards: Scoreboard[] = run.boards
const ms = Date.now() - t0

const n = boards.length
const pct = (x: number) => `${((x / n) * 100).toFixed(0)}%`
const avg = (f: (b: Scoreboard) => number) => (boards.reduce((s, b) => s + f(b), 0) / n)
const dist = (f: (b: Scoreboard) => number) => {
  const m = new Map<number, number>()
  for (const b of boards) m.set(f(b), (m.get(f(b)) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join('  ')
}
const sumRec = (f: (b: Scoreboard) => Record<string, number>) => {
  const out: Record<string, number> = {}
  for (const b of boards) for (const [k, v] of Object.entries(f(b))) out[k] = (out[k] ?? 0) + v
  return out
}

console.log(`\nBASELINE 4v4 — ${n} battles in ${ms}ms (${(ms / n).toFixed(1)}ms each)\n`)

console.log('OUTCOME')
const outcomes = new Map<string, number>()
for (const b of boards) outcomes.set(b.outcome, (outcomes.get(b.outcome) ?? 0) + 1)
for (const [k, v] of [...outcomes].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(12)} ${String(v).padStart(4)}  ${pct(v)}`)

console.log(`\nTURNS   avg ${avg(b => b.turns).toFixed(1)}   min ${Math.min(...boards.map(b => b.turns))}   max ${Math.max(...boards.map(b => b.turns))}`)
console.log(`  distribution  ${dist(b => b.turns)}`)

console.log(`\nHEROES  downed/battle ${avg(b => b.heroesDowned).toFixed(2)}   dead/battle ${avg(b => b.heroesDead).toFixed(2)}`)
console.log(`  deaths distribution  ${dist(b => b.heroesDead)}`)
console.log(`  battles with no losses  ${pct(boards.filter(b => b.heroesDead === 0).length)}`)

console.log(`\nENEMIES killed/battle ${avg(b => b.enemiesKilled).toFixed(2)} of 4`)

console.log('\nDAMAGE DEALT BY UNIT TYPE')
const dealt = sumRec(b => b.damageDealtByType)
const totalDealt = Object.values(dealt).reduce((a, c) => a + c, 0)
for (const [k, v] of Object.entries(dealt).sort((a, b) => b[1] - a[1]))
  console.log(`  ${k.padEnd(10)} ${String(v).padStart(6)}  ${((v / totalDealt) * 100).toFixed(0)}%   ${(v / n).toFixed(1)}/battle`)

console.log('\nBY ATTACK')
const atk: Record<string, { swings: number; hits: number; damage: number }> = {}
for (const b of boards) for (const [k, v] of Object.entries(b.attacksByAttack)) {
  atk[k] ??= { swings: 0, hits: 0, damage: 0 }
  atk[k]!.swings += v.swings; atk[k]!.hits += v.hits; atk[k]!.damage += v.damage
}
console.log(`  ${'attack'.padEnd(24)}${'swings'.padStart(7)}${'hit%'.padStart(7)}${'damage'.padStart(8)}${'dmg/swing'.padStart(11)}`)
for (const [k, v] of Object.entries(atk).sort((a, b) => b[1].damage - a[1].damage))
  console.log(`  ${k.padEnd(24)}${String(v.swings).padStart(7)}${(v.swings ? (v.hits / v.swings * 100).toFixed(0) : '-').padStart(6)}%${String(v.damage).padStart(8)}${(v.damage / Math.max(1, v.swings)).toFixed(2).padStart(11)}`)

const outTurns = boards.map(b => b.heroStaminaOutTurn).filter((x): x is number => x !== null)
console.log(`\nSTAMINA  a hero began an activation at 0 in ${pct(outTurns.length)} of battles` +
  (outTurns.length ? `, first at turn ${(outTurns.reduce((a, c) => a + c, 0) / outTurns.length).toFixed(1)} on average` : ''))
console.log(`IDLE     ${(avg(b => b.idleActivations) / avg(b => b.totalActivations) * 100).toFixed(0)}% of activations did nothing\n`)
if (run.coverage) console.log(renderCoverage(run.coverage) + '\n')
