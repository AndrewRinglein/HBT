// v2.loadout (2026-09-24): freeze every battle-cursor case's full hashes after item
// instances became fielding metadata. Refuses to overwrite (flag wx), like the capture it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-loadout-cursor.mts --out test/fixtures/battle-cursor-loadout.json
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
  const instances = ctx.events.filter((e) => e.type === 'unit.equipped').length
  return { id, events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result, instances }
})
const note = 'v2.loadout (2026-09-24): fielding names item instances (instanceId on unit.equipped, stowed on unit.enter, loadout on a hero). Metadata only; every older fixture is checked on loadout-projection.ts, which removes exactly those fields. instances counts unit.equipped lines.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'v2.loadout', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases.`)
