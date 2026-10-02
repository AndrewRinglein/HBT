// fix.opening-levels (2026-10-02; DECISIONS.md 2026-09-28 'the opening's party levels up; the Flaming Longsword is a Warrior's
// or a Paladin's; the Bridge gives a reward': "it only is going to help the paladin or the warrior"):
// freeze every battle-cursor case's full hashes after the opening's Flaming Longsword went only to a drafted Warrior or
// Paladin (openingHolderOf, OPENING-PARTY.json takers) — nobody holds it when neither is drafted.
// `changed` marks the cases whose full events OR state differ from the fix.orphans-teacher-knife capture; `movedOnlyText`
// says the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-opening-levels-cursor.mts --out test/fixtures/battle-cursor-opening-levels.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-orphans-teacher-knife.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = `the opening's Flaming Longsword only on a Warrior or a Paladin (fix.opening-levels; DECISIONS.md 2026-09-28). Cases marked changed differ from the fix.orphans-teacher-knife capture; movedOnlyText means state, RNG and result are unchanged.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.opening-levels', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
