// encounter.opening.bridge-ai (2026-09-30): freeze every battle-cursor case's full hashes after a kiter with no
// melee ally standing plays its row's positionAlone ladder — a shot ahead of safety, read by canAttack's geometry
// (SWITCHES.md aiKiteAlone; the Bridge never ended because the Imps fled walkers they could never safely shoot).
// `changed` marks the cases whose full events OR state differ from the rule.immunity-is-resistance capture;
// `movedOnlyText` says the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the
// captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-kite-alone-cursor.mts --out test/fixtures/battle-cursor-kite-alone.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-resist-one-way.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = 'a kiter with no melee ally standing puts the shot ahead of safety (SWITCHES.md aiKiteAlone, 2026-09-30). Cases marked changed differ from the rule.immunity-is-resistance capture; movedOnlyText means state, RNG and result are unchanged.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'encounter.opening.bridge-ai', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
