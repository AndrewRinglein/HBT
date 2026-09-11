// Run against the PRE-EXTRACTION commit, before changing battle.ts:
// node node_modules/tsx/dist/cli.mjs tools/capture-battle-cursor.mts --out test/fixtures/battle-cursor-golden.json
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  return { id, events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result, surgeHits: ctx.events.filter(e => e.type === 'surge.hit').length }
})
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} unchanged-loop cases; ${cases.reduce((n, c) => n + c.surgeHits, 0)} surge hits.`)
