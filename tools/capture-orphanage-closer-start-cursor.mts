// fix.opening-orphanage-closer-start (2026-10-04; DECISIONS.md 2026-10-04 'the opening's tutorial: ... a closer start': "We need to
// shrink this map. First we can bring the hero forward to the end of the bridge and bring the zombie left, maybe 3 squares."):
// freeze every battle-cursor case's full hashes after the Orphanage's heroes' zone moved to the bridge's east end ((10,5)) and
// its starting Zombie three hexes left ((16,3)).
// `changed` marks the cases whose full events OR state differ from the fix.own-area-skips-owner capture; `movedOnlyText`
// says the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-orphanage-closer-start-cursor.mts --out test/fixtures/battle-cursor-orphanage-closer-start.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-own-area-skips-owner.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = "the Orphanage starts closer: the hero at the bridge's east end, the Zombie three hexes left (fix.opening-orphanage-closer-start; DECISIONS.md 2026-10-04). Cases marked changed differ from the fix.own-area-skips-owner capture; movedOnlyText means state, RNG and result are unchanged."
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: "fix.opening-orphanage-closer-start", note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
