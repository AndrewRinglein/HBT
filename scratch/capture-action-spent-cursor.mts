import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create(), result = runBattle(ctx)
  return { id, events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result, surgeHits: ctx.events.filter(e => e.type === 'surge.hit').length }
})
writeFileSync('test/fixtures/battle-cursor-action-spent.json', JSON.stringify({ sourceCommit: 'b0a80f6', workingTreeChange: 'plumbing.action-spent', rulesVersion: 'v2-migration.8', cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} current event-contract cases; historical fixtures untouched.`)
