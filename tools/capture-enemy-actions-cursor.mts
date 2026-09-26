// pack.enemy-actions (2026-09-26, AI-DESIGN.md §7 step 2): freeze every battle-cursor case's full
// hashes after the pack began carrying enemy special moves (Clobber, Buff, the four Close Bites)
// and flight as the ONE movement power of the fliers (engine DECISIONS.md 2026-09-04, "enemies use
// the one action type too"). `changed` marks the cases whose full events differ from the
// fix.vs-target-worn-and-flat capture — the scenarios that field a hound or a flier. No state field
// was added, so an unchanged case needs no projection before the older layers.
// Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-enemy-actions-cursor.mts --out test/fixtures/battle-cursor-enemy-actions.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-worn.json', 'utf8')) as { cases: { id: string; events: string }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  return { id, events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result, changed: was !== undefined && was.events !== hash(ctx.events) }
})
const note = 'pack.enemy-actions (2026-09-26): enemy special moves (Clobber, Buff, the Close Bites) are actions on the movement slot, and a flier moves by power.flight, its one movement power. Cases marked changed field a hound or a flier. Every older fixture stays immutable.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'pack.enemy-actions', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases, ${cases.filter((c) => c.changed).map((c) => c.id).join(', ') || 'none'} changed.`)
