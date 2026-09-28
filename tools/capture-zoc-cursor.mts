// capability.move-ignores-zoc (2026-09-28): freeze every battle-cursor case's full hashes after the
// pack began walking the four hounds with the Codex's walk that ignores zones of control
// (power.move-ignoring-zoc, MoveProfile.ignoresZoc). `changed` marks the cases whose full events OR
// state differ from the capability.charge capture — the scenarios that field a hound: its action
// list carries the new walk (state), every step names it, and where it leaves a hero's zone it logs
// zoc.ignored instead of drawing an attack of opportunity, so the battle plays out differently
// (events). No state field was added, so an unchanged case needs no projection before the older layers.
// Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-zoc-cursor.mts --out test/fixtures/battle-cursor-zoc.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-charge.json', 'utf8')) as { cases: { id: string; events: string; state: string }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state)
  return { id, events, state, rng: hash(ctx.rng.log), result, changed: was !== undefined && (was.events !== events || was.state !== state) }
})
const note = 'capability.move-ignores-zoc (2026-09-28): the four hounds walk with the Codex walk that ignores zones of control. Cases marked changed field a hound: its action list carries the walk (state), and its steps name it and provoke nothing (events). Every older fixture stays immutable.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'capability.move-ignores-zoc', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases, ${cases.filter((c) => c.changed).map((c) => c.id).join(', ') || 'none'} changed.`)
