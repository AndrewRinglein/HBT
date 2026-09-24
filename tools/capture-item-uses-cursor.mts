// v2.item-uses (2026-09-24): freeze every battle-cursor case's full hashes after uses
// became counted by item instance. Refuses to overwrite (flag wx), like the capture it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-item-uses-cursor.mts --out test/fixtures/battle-cursor-item-uses.json
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const instances = ctx.state.units.reduce((n, u) => n + (u.itemUses?.length ?? 0), 0)
  return { id, events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result, instances }
})
const note = 'v2.item-uses (2026-09-24): uses counted by item instance (itemUses on a unit, instanceId/itemId/instanceLeft on charge.spent, spent on unit.enter, itemUses on the result). Every older fixture is checked on item-uses-projection.ts, which removes exactly those fields. instances counts itemUses entries.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'v2.item-uses', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases.`)
