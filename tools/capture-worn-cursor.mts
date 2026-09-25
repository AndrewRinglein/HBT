// fix.vs-target-worn-and-flat (2026-09-25): freeze every battle-cursor case's full hashes after a
// worn item's slayer became a rule (Andrew, DECISIONS.md "damage vs target: no percentages …":
// "Bloodrune Slayer bonus happens") and the hero's loadout gained `worn`, the non-held instances it
// carries. `changed` marks the cases whose full events differ from the v2.thin-obstruction capture
// (a bloodrune's slayer gap left its unit.equipped line, or its bonus landed); every other case
// differs only by loadout.worn in state, which the test projects away before the older layers.
// Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-worn-cursor.mts --out test/fixtures/battle-cursor-worn.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-thin.json', 'utf8')) as { cases: { id: string; events: string }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  return { id, events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result, changed: was !== undefined && was.events !== hash(ctx.events) }
})
const note = 'fix.vs-target-worn-and-flat (2026-09-25): a worn item\'s slayer (the bloodrunes) is a damage-vs-target rule that reaches every damage the hero deals, and the loadout names the worn instances (loadout.worn). Cases marked changed lost a slayer gap from a unit.equipped line or landed a worn bonus. Every older fixture stays immutable.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.vs-target-worn-and-flat', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases, ${cases.filter((c) => c.changed).map((c) => c.id).join(', ') || 'none'} changed.`)
