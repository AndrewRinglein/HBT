import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
const N = 5000
const t0 = Date.now()
const outcomes = new Map<string, number>()
let errors = 0
for (let i = 0; i < N; i++) {
  try {
    const ctx = createBattle({ replicate: i, strict: true })
    const r = runBattle(ctx)
    outcomes.set(r.outcome, (outcomes.get(r.outcome) ?? 0) + 1)
  } catch (e) { errors++; if (errors < 4) console.log('ERROR at replicate', i, (e as Error).message) }
}
console.log(`${N} battles in ${Date.now()-t0}ms, errors: ${errors}`)
console.log([...outcomes].map(([k,v])=>`${k}:${v}`).join('  '))
