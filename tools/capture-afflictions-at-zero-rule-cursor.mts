// rule.afflictions-at-zero-refiled-2 (2026-10-02; DECISIONS.md 2026-10-01 'the afflictions at 0 Health' and 'bleed-out is a stat
// on every player unit, 5; Rotting Flesh +5'): freeze every battle-cursor case's full hashes after an affliction's 0-Health rule
// runs before the Deathbed — Vampirism and Lycanthropy transform on a Luck roll, Possession raises a Ghost, Rotting Flesh gains
// Fragile — and Rotting Flesh's +5 bleed-out counts from its gain.
// `changed` marks the cases whose full events OR state differ from the fix.opening-levels capture; `movedOnlyText`
// says the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-afflictions-at-zero-rule-cursor.mts --out test/fixtures/battle-cursor-afflictions-at-zero-rule.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-opening-levels.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = `an affliction's 0-Health rule before the Deathbed, Fragile gained at 0, Rotting Flesh's +5 bleed-out from its gain (rule.afflictions-at-zero-refiled-2; DECISIONS.md 2026-10-01). Cases marked changed differ from the fix.opening-levels capture; movedOnlyText means state, RNG and result are unchanged.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'rule.afflictions-at-zero-refiled-2', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
