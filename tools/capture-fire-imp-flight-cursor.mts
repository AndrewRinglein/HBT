// content.fire-imp-flight (2026-10-01; ruled 2026-09-30, DECISIONS.md 'the Fire Imp flies': "The Fire Imp does fly, yes.
// That was an oversight if it does not."): freeze every battle-cursor case's full hashes after the Fire Imp gains the
// Imp's flight. `changed` marks the cases whose full events OR state differ from the encounter.opening.bridge-ai capture;
// `movedOnlyText` says the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the
// captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-fire-imp-flight-cursor.mts --out test/fixtures/battle-cursor-fire-imp-flight.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-kite-alone.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = 'the Fire Imp flies with the Imp\'s flight (DECISIONS.md 2026-09-30 "the Fire Imp flies"). Cases marked changed differ from the encounter.opening.bridge-ai capture; movedOnlyText means state, RNG and result are unchanged.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'content.fire-imp-flight', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
