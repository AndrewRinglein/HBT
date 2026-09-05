// npm run proving <plan.json> [--out <dir>]
//
// THE PROVING's runner (proving.rig, 2026-09-04; PROVING-PLAN.md §3). Reads a
// plan file, runs every subject and matchup, writes one result file per
// subject under <out>/<plan-id>/ and a rollup.json, and prints the ranking:
// flip rate first (ruled), margin shift beside it. Deterministic and stamped
// with the pack it ran against; a result whose stamp is current is not re-run.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runMatchup, runSubject, validatePlan, type Plan, type SubjectResult } from '../sim/proving.js'
import stampJson from '../content/generated/pack.stamp.json' with { type: 'json' }

const args = process.argv.slice(2)
const planPath = args.find((a) => !a.startsWith('--'))
if (!planPath) { console.error('usage: npm run proving <plan.json> [--out <dir>] [--force]'); process.exit(2) }
const outRoot = args.includes('--out') ? args[args.indexOf('--out') + 1]! : '.state/proving'
const force = args.includes('--force')

const plan = JSON.parse(readFileSync(planPath, 'utf8')) as Plan
validatePlan(plan)
const stamp = `${(stampJson as { contentSha: string }).contentSha}`
const dir = join(outRoot, plan.id)
mkdirSync(dir, { recursive: true })

const fileOf = (key: string) => join(dir, key.replace(/[^a-z0-9.@-]+/gi, '_') + '.json')
const results: SubjectResult[] = []
let ran = 0, reused = 0
for (const sub of plan.subjects) {
  const key = `${sub.id}@${sub.fixture}.${sub.rotation}.${sub.side}${sub.slot !== undefined ? '.' + sub.slot : ''}`
  const f = fileOf(key)
  if (!force && existsSync(f)) {
    const prev = JSON.parse(readFileSync(f, 'utf8')) as SubjectResult
    if (prev.stamp === stamp) { results.push(prev); reused++; continue }
  }
  const r = runSubject(plan, sub, stamp)
  writeFileSync(f, JSON.stringify(r, null, 1))
  results.push(r); ran++
}
const matchups = (plan.matchups ?? []).map((m) => { const r = runMatchup(plan, m, stamp); writeFileSync(fileOf('matchup.' + m.id), JSON.stringify(r, null, 1)); return r })

// the ranking: flip rate, then margin shift, then id (Law 6 — a tiebreaker that cannot tie)
const ranked = [...results].sort((a, b) => b.summary.flipRatePermille - a.summary.flipRatePermille || b.summary.swing - a.summary.swing || a.subject.id.localeCompare(b.subject.id))
const rollup = {
  plan: plan.id, stamp, generated: new Date().toISOString().slice(0, 10), maps: plan.maps, seed: plan.seed,
  ranking: ranked.map((r) => ({ id: r.subject.id, fixture: r.subject.fixture, rotation: r.subject.rotation, side: r.subject.side, slot: r.subject.slot, ...r.summary })),
  // proving.plan-shape (session 9's E2): `invalid` per matchup, and the battles themselves — the initiative plan is read per map
  matchups: matchups.map((m) => ({ id: m.matchup.id, hero: m.matchup.hero, enemy: m.matchup.enemy, ...(m.matchup.sides ? { sides: m.matchup.sides } : {}), ...(m.matchup.gap !== undefined ? { gap: m.matchup.gap } : {}),
    heroWins: m.heroWins, enemyWins: m.enemyWins, other: m.other, invalid: m.invalid, marginMean: m.marginMean, turnsMean: m.turnsMean,
    battles: m.battles.map((b) => ({ map: b.map, seed: b.seed, outcome: b.outcome, turns: b.turns, margin: b.margin, ...(b.error ? { error: b.error } : {}) })) })),
  ...(plan.switches ? { switches: plan.switches } : {}),
}
writeFileSync(join(dir, 'rollup.json'), JSON.stringify(rollup, null, 1))

console.log(`\nTHE PROVING — ${plan.id} · ${plan.maps.length} maps · seed ${plan.seed} · pack ${stamp} · ${ran} ran, ${reused} current\n`)
console.log('flip   swing   tempo  presence  subject   (swing: margin shift from the subject\'s side, permille)')
for (const r of rollup.ranking) {
  const flip = `${r.flips}/${r.valid}`.padEnd(6)
  console.log(`${flip} ${String(r.swing).padStart(6)}  ${String(r.tempoShiftMean).padStart(5)}  ${String(r.presence).padStart(8)}  ${r.id} (${r.rotation}${r.slot !== undefined ? ' seat ' + r.slot : ''}, ${r.fixture})${r.invalid ? `  ${r.invalid} INVALID` : ''}`)
}
for (const m of rollup.matchups) console.log(`matchup ${m.id}: ${m.hero} vs ${m.enemy}${m.gap !== undefined ? ` gap ${m.gap}` : ''} — hero ${m.heroWins} · enemy ${m.enemyWins} · other ${m.other} · margin ${m.marginMean} · turns ${m.turnsMean}${m.invalid ? `  ${m.invalid} INVALID` : ''}`)
const invalid = [
  ...results.flatMap((r) => r.pairs.filter((p) => p.with.outcome === 'invalid' || p.without.outcome === 'invalid').map((p) => `${r.subject.id}: ${p.with.error ?? p.without.error}`)),
  ...matchups.flatMap((m) => m.battles.filter((b) => b.outcome === 'invalid').map((b) => `matchup ${m.matchup.id}: ${b.error}`)),
]
if (invalid.length) { console.log('\nINVALID fieldings (Law 9 — recorded, never counted):'); for (const l of [...new Set(invalid)]) console.log('  ' + l) }
console.log(`\nwritten: ${dir}/`)
