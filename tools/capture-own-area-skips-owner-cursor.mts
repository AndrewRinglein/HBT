// fix.own-area-skips-owner (2026-10-04; DECISIONS.md 2026-10-04 'the Poison Imp, the Balrog and the four caster-centred class powers
// skip their owner too': "One and two, yes, skip the caster."): freeze every battle-cursor case's full hashes after the Poison Imp's
// end-of-Activation Poison and the Balrog's end-of-Activation Burn target every OTHER unit within 2 hexes (neither lands on its
// owner any more) and the class powers War Cry, Fel Rush, Holy Radiance and Warcry skip their caster.
// `changed` marks the cases whose full events OR state differ from the combined-tree (combine-civilians-kit) capture; `movedOnlyText`
// says the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-own-area-skips-owner-cursor.mts --out test/fixtures/battle-cursor-own-area-skips-owner.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-combine-civilians-kit.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = "the Poison Imp's and the Balrog's end-of-Activation areas and four class powers skip their owner (fix.own-area-skips-owner; DECISIONS.md 2026-10-04). Cases marked changed differ from the combined-tree (combine-civilians-kit) capture; movedOnlyText means state, RNG and result are unchanged."
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: "fix.own-area-skips-owner", note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
