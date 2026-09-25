// fix.ground-goldens (2026-09-24): freeze every battle-cursor case's full hashes after the
// ground table was re-ruled (v2.ground-retable, v2.retire-forest-hills — Andrew, DECISIONS.md
// "the ground table, re-ruled"). `changed` marks the cases whose full events differ from the
// v2.item-uses capture. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-ground-cursor.mts --out test/fixtures/battle-cursor-ground.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-item-uses.json', 'utf8')) as { cases: { id: string; events: string }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  return { id, events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result, changed: was !== undefined && was.events !== hash(ctx.events) }
})
const note = 'fix.ground-goldens (2026-09-24): the ground table re-ruled — forest is woodland (−15 ranged / −7 melee against, no Dodge/Armor), hills +10 accuracy and +1 reach for ranged attacks only. Cases marked changed fight on hill or forest ground. Every older fixture stays immutable.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'v2.retire-forest-hills', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases, ${cases.filter((c) => c.changed).map((c) => c.id).join(', ') || 'none'} changed.`)
