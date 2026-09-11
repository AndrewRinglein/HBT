import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { saveBattle } from '../src/core/snapshot.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const rulesVersion = JSON.parse(saveBattle(battleCursorCases()[0]!.create())).rulesVersion
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create(), result = runBattle(ctx)
  return { id, events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result }
})
writeFileSync('test/fixtures/battle-cursor-identities.json', JSON.stringify({
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  pendingItem: 'fix.unit-identities', rulesVersion,
  sourceDiffHash: hash(execFileSync('git', ['diff', '--', 'src'], { encoding: 'utf8' })), cases,
}, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} identity-migration cases separately from original history.`)
