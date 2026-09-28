// fix.surge-spend (2026-09-28): freeze every battle-cursor case's full hashes after a Surge began
// taking away 100 instead of emptying the amount (ruled 2026-09-27, DECISIONS.md "Surge: a pool
// that pays 100 per Surge"). `changed` marks the cases whose full events OR state differ from the
// capability.move-ignores-zoc capture — the ones where a hero makes a Surge check: surge.checked
// and surge.hit now carry the amount before and after (events), and an amount at 100 or more
// surges without a roll (RNG). No state field was added, so an unchanged case needs no projection
// before the older layers. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-surge-spend-cursor.mts --out test/fixtures/battle-cursor-surge-spend.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-zoc.json', 'utf8')) as { cases: { id: string; events: string; state: string }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state)
  return { id, events, state, rng: hash(ctx.rng.log), result, changed: was !== undefined && (was.events !== events || was.state !== state) }
})
const note = 'fix.surge-spend (2026-09-28): a Surge takes away 100 instead of emptying the amount. Cases marked changed make a Surge check: surge.checked and surge.hit carry the amount before and after (events), and an amount at 100 or more surges without a roll (RNG). Every older fixture stays immutable.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.surge-spend', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases, ${cases.filter((c) => c.changed).map((c) => c.id).join(', ') || 'none'} changed.`)
