// combine (2026-10-04; GBH SWITCHES combine.mergeMainFirst): engine master c6552d5 (fix.civilians-field-kit — every unit an
// encounter places fields the kit its row carries — and kingdom.page-test-strong-party) merged into the engine worker's copy
// (fix.starting-kit-powers, fix.fire-imp-burn-spares-self, content.imp-blast-tuned). Each side froze its own battle-cursor layer
// on its own tree; a case both sides moved has neither side's hash on the combined tree. Freeze every case's full hashes on the
// combined tree.
// `changed` marks the cases whose full events OR state differ from the content.imp-blast-tuned capture (this copy's top layer) —
// the cases fix.civilians-field-kit moves; `movedOnlyText` says the state, RNG and result are all unchanged. Refuses to overwrite
// (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-combine-civilians-kit-cursor.mts --out test/fixtures/battle-cursor-combine-civilians-kit.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-imp-blast-tuned.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = `engine master c6552d5 (fix.civilians-field-kit) combined with the engine worker's three items (GBH SWITCHES combine.mergeMainFirst, 2026-10-04). Cases marked changed differ from the content.imp-blast-tuned capture; movedOnlyText means state, RNG and result are unchanged.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'combine: engine master c6552d5 into the engine worker copy', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
