// v2.thin-obstruction (2026-09-24): freeze every battle-cursor case's full hashes after thin
// obstructions landed (Andrew, DECISIONS.md "the ground table, re-ruled": every woodland hex is
// a thin obstruction — −5 per hex a ranged shot enters, −1 Vision per one between). `changed`
// marks the cases whose full events differ from the fix.ground-goldens capture. Refuses to
// overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-thin-cursor.mts --out test/fixtures/battle-cursor-thin.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-ground.json', 'utf8')) as { cases: { id: string; events: string }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  return { id, events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result, changed: was !== undefined && was.events !== hash(ctx.events) }
})
const note = 'v2.thin-obstruction (2026-09-24): every woodland hex is a thin obstruction — −5 per thin hex a ranged shot enters (through, and the target\'s own; never the shooter\'s), −1 Vision per one between. Cases marked changed shoot through or into woodland. Every older fixture stays immutable.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'v2.thin-obstruction', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases, ${cases.filter((c) => c.changed).map((c) => c.id).join(', ') || 'none'} changed.`)
