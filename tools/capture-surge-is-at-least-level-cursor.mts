// rule.surge-is-at-least-level (2026-10-06). Ruled 2026-10-06 (DECISIONS.md 'everyone gains Surge equal to its level at the least, and
// rolls the Surge check every Activation'): "Everyone gains surge equal to level, at the very least. Therefore, there is always at
// least a 1% chance of a surge." Every hero is fielded with Surge of at least 1 - the level's Surge is data now, on the pack's level
// rows and the hero's own row - so every hero rolls the Surge check after each Activation: one more roll an Activation, and now and
// then a Surge. Every battle a hero fights moves; a battle that fields only enemies, civilians or bodies with no hero class does not.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// computer-avoids-own-traps capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged; `added` marks a
// case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-surge-is-at-least-level-cursor.mts --out test/fixtures/battle-cursor-surge-is-at-least-level.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-computer-avoids-own-traps.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'rule.surge-is-at-least-level (2026-10-06). Cases marked changed differ from the computer-avoids-own-traps capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'rule.surge-is-at-least-level', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
