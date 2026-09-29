// fix.opening-draft (2026-09-29): freeze every battle-cursor case's full hashes after the opening's heroes
// carry the first hero's Leadership, badges, +2 Health and Crucible points, and every later draft is the
// best-scoring of three Crucible-rolled heroes of classes not yet drafted (Andrew, DECISIONS.md
// 2026-09-28). `changed` marks the cases whose full events OR state differ from the content.peddlers-vest
// capture — the opening scenarios only. No state field was added. Refuses to overwrite (flag wx), like
// the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-opening-draft-cursor.mts --out test/fixtures/battle-cursor-opening-draft.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-peddlers-vest.json', 'utf8')) as { cases: { id: string; events: string; state: string }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state)
  return { id, events, state, rng: hash(ctx.rng.log), result, changed: was !== undefined && (was.events !== events || was.state !== state) }
})
const note = 'fix.opening-draft (2026-09-29): the opening\'s heroes carry the first hero\'s modifiers and the Crucible\'s rolls, drafted by class and weighted score (ruled 2026-09-28). Cases marked changed differ from the content.peddlers-vest capture. Every older fixture stays immutable.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.opening-draft', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases, ${cases.filter((c) => c.changed).map((c) => c.id).join(', ') || 'none'} changed.`)
