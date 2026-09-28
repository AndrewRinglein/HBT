// fix.raise-two-cursor (2026-09-28): freeze every battle-cursor case's full hashes after the
// Necromancer's Raise began taking two bodies a firing (fix.raise-two; ruled 2026-09-28, DECISIONS.md
// "the Cathedral encounter": "Let's have the necromancer raise two per turn."). `changed` marks the
// cases whose full events OR state differ from the fix.surge-spend capture — the ones that field a
// Necromancer with more than one body in reach. No state field was added. Refuses to overwrite
// (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-raise-two-cursor.mts --out test/fixtures/battle-cursor-raise-two.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-surge-spend.json', 'utf8')) as { cases: { id: string; events: string; state: string }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state)
  return { id, events, state, rng: hash(ctx.rng.log), result, changed: was !== undefined && (was.events !== events || was.state !== state) }
})
const note = 'fix.raise-two-cursor (2026-09-28): the Necromancer\'s Raise takes two bodies a firing (fix.raise-two). Cases marked changed field a Necromancer with more than one body in reach. Every older fixture stays immutable.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.raise-two', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases, ${cases.filter((c) => c.changed).map((c) => c.id).join(', ') || 'none'} changed.`)
