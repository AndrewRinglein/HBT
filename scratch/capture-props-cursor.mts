import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create(), result = runBattle(ctx)
  return { id, events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result, surgeHits: ctx.events.filter(e => e.type === 'surge.hit').length }
})
writeFileSync('test/fixtures/battle-cursor-props.json', JSON.stringify({ sourceCommit: '038304f', workingTreeChange: 'terrain.authored-high-props', rulesVersion: 'v2-migration.12', cases }, null, 2) + '\n')
console.log(`Captured ${cases.length} prop-contract cases; all historical fixtures untouched.`)
