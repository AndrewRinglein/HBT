// content.peddlers-vest (2026-09-29): freeze every battle-cursor case's full hashes after the Peddler's
// Vest stops taking 2 Health (Andrew, DECISIONS.md 2026-09-28 "no Health minimum; the Peddler's Vest has
// no Health change": "The Peddler's Vest should just be -5 dodge, -5 accuracy, +1 item slot. No health
// change."). `changed` marks the cases whose full events OR state differ from the
// fix.opening-orphanage-lighter capture — the cases that field the Raven or the Robes priest. No state
// field was added. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-peddlers-vest-cursor.mts --out test/fixtures/battle-cursor-peddlers-vest.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-orphanage-lighter.json', 'utf8')) as { cases: { id: string; events: string; state: string }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state)
  return { id, events, state, rng: hash(ctx.rng.log), result, changed: was !== undefined && (was.events !== events || was.state !== state) }
})
const note = 'content.peddlers-vest (2026-09-29): the Peddler\'s Vest is -5 Dodge, -5 Accuracy, +1 item slot and no Health change (ruled 2026-09-28). Cases marked changed differ from the fix.opening-orphanage-lighter capture. Every older fixture stays immutable.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'content.peddlers-vest', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases, ${cases.filter((c) => c.changed).map((c) => c.id).join(', ') || 'none'} changed.`)
