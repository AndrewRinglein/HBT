// fix.opening-orphanage-arrivals (2026-09-29): freeze every battle-cursor case's full hashes after the
// Orphanage gains a Zombie on Turn 2 and one on Turn 3 (Andrew, DECISIONS.md 2026-09-29: "Battle 1: Let's
// add a zombie on turn 2 and a zombie on turn 3."). `changed` marks the cases whose full events OR state
// differ from the badge-rules capture (rule.badge-immunity) — the Orphanage only. No state field was added. Refuses to overwrite (flag wx), like
// the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-orphanage-arrivals-cursor.mts --out test/fixtures/battle-cursor-orphanage-arrivals.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-badge-rules.json', 'utf8')) as { cases: { id: string; events: string; state: string }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state)
  return { id, events, state, rng: hash(ctx.rng.log), result, changed: was !== undefined && (was.events !== events || was.state !== state) }
})
const note = 'fix.opening-orphanage-arrivals (2026-09-29): the Orphanage gains a Zombie on Turn 2 and one on Turn 3 (ruled 2026-09-29). Cases marked changed differ from the badge-rules capture. Every older fixture stays immutable.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.opening-orphanage-arrivals', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases, ${cases.filter((c) => c.changed).map((c) => c.id).join(', ') || 'none'} changed.`)
