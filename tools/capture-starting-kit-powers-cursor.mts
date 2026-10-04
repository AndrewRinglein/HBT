// fix.starting-kit-powers (2026-10-04; DECISIONS.md 2026-10-03 'reported: the priest's Holy Texts has no heal in battle — three
// starting weapons lose their power on the way into the engine'): freeze every battle-cursor case's full hashes after the Holy
// Texts' Mercy, the Fire Staff's Flame Burst and the Frost Staff's Frost Nova reach the engine — six of the 24 base heroes field
// a power they did not have, and the AI plays it (the Heal shape, the burst shape).
// `changed` marks the cases whose full events OR state differ from the rule.afflictions-at-zero-refiled-2 capture; `movedOnlyText`
// says the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-starting-kit-powers-cursor.mts --out test/fixtures/battle-cursor-starting-kit-powers.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-afflictions-at-zero-rule.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = `the Holy Texts' Mercy, the Fire Staff's Flame Burst and the Frost Staff's Frost Nova reach the engine (fix.starting-kit-powers; DECISIONS.md 2026-10-03). Cases marked changed differ from the rule.afflictions-at-zero-refiled-2 capture; movedOnlyText means state, RNG and result are unchanged.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.starting-kit-powers', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
