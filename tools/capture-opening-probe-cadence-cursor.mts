// fix.opening-probe-cadence (2026-10-04; DECISIONS.md 2026-10-03 'one draft after every battle; ...': "We're only supposed to have
// one draft between battles 1 and 2." - "One, yes."): freeze every battle-cursor case's full hashes after the engine's opening
// party follows the ruled cadence - 1, 2, 3, 4, 5, 6 heroes at battles 1 to 6 (it was 1, 3, 4, 5, 6, 6).
// `changed` marks the cases whose full events OR state differ from the fix.opening-orphanage-closer-start capture; `movedOnlyText`
// says the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-opening-probe-cadence-cursor.mts --out test/fixtures/battle-cursor-opening-probe-cadence.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-orphanage-closer-start.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = "the engine's opening party follows the ruled draft cadence: 1, 2, 3, 4, 5, 6 heroes at battles 1 to 6 (fix.opening-probe-cadence; DECISIONS.md 2026-10-03). Cases marked changed differ from the fix.opening-orphanage-closer-start capture; movedOnlyText means state, RNG and result are unchanged."
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: "fix.opening-probe-cadence", note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
