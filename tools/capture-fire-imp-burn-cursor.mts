// fix.fire-imp-burn-spares-self (2026-10-04; DECISIONS.md 2026-10-03 'the Fire Imp's burn does not hit the imp itself; an
// end-of-Activation area burn shows an explosion of fire': "It should not hit him."): freeze every battle-cursor case's full
// hashes after the Fire Imp's end-of-Activation Burn targets every OTHER unit within 2 hexes — the imp no longer applies Burn 1
// to itself (and its Fire Resist no longer takes it) at the end of each of its Activations.
// `changed` marks the cases whose full events OR state differ from the fix.starting-kit-powers capture; `movedOnlyText`
// says the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-fire-imp-burn-cursor.mts --out test/fixtures/battle-cursor-fire-imp-burn.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-starting-kit-powers.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = `the Fire Imp's end-of-Activation Burn spares the imp itself (fix.fire-imp-burn-spares-self; DECISIONS.md 2026-10-03). Cases marked changed differ from the fix.starting-kit-powers capture; movedOnlyText means state, RNG and result are unchanged.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.fire-imp-burn-spares-self', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
