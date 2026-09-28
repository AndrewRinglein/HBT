// capability.charge (2026-09-27): freeze every battle-cursor case's full hashes after the pack
// began carrying the Codex Charge rows (a walk and an attack as one action) and the Iron
// Colossus's noPrimaryAction. `changed` marks the cases whose full events OR state differ from
// the fix.enemy-accuracy-mod capture — the scenarios that field a Fast Zombie: its action list
// now carries move.fast-zombie.charge (state), and where it charges, the battle plays out
// differently (events). State is compared too because a fielded zombie that never charges still
// carries the action — an older layer's state hash no longer matches it. No state field was
// added, so an unchanged case needs no projection before the older layers.
// Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-charge-cursor.mts --out test/fixtures/battle-cursor-charge.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-accuracy-mod.json', 'utf8')) as { cases: { id: string; events: string; state: string }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state)
  return { id, events, state, rng: hash(ctx.rng.log), result, changed: was !== undefined && (was.events !== events || was.state !== state) }
})
const note = 'capability.charge (2026-09-27): the Codex Charge rows are carried (a walk and an attack as one action), and noPrimaryAction. Cases marked changed field a Fast Zombie: its action list carries the charge (state), and where it charges the battle differs (events). Every older fixture stays immutable.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'capability.charge', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases, ${cases.filter((c) => c.changed).map((c) => c.id).join(', ') || 'none'} changed.`)
