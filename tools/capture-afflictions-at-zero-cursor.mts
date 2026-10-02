// content.afflictions-at-zero (2026-10-01; DECISIONS.md 'the afflictions at 0 Health' and 'bleed-out is a stat on every player
// unit, 5; Rotting Flesh +5'): freeze every battle-cursor case's full hashes after Rotting Flesh carries +5 bleed-out (a
// fielding-only stat its badge.gained line now names) and the four afflictions name what happens at 0 Health as gaps.
// `changed` marks the cases whose full events OR state differ from the fix.codex-numbers capture; `movedOnlyText` says
// the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-afflictions-at-zero-cursor.mts --out test/fixtures/battle-cursor-afflictions-at-zero.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-codex-numbers.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = `Rotting Flesh carries +5 bleed-out and the four afflictions name what happens at 0 Health (DECISIONS.md 2026-10-01). Cases marked changed differ from the fix.codex-numbers capture; movedOnlyText means state, RNG and result are unchanged.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'content.afflictions-at-zero', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
