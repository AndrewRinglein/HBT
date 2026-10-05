// capability.unit-trigger-with-tag (2026-10-04; DECISIONS.md 2026-10-04 'after the backlog run: ... a trigger on the hero with a tag requirement ...'):
// a trigger may name a tag requirement (`onlyWithTag`) and then fires only for an attack that carries the tag. The Bloodrune Burning
// Touch (melee) and Pharaoh's Gauntlets (brawl) carry one now. A unit's trigger list is part of the state, so every case that fields
// one of them moves; where its bearer shoots, the rune no longer burns and the fight is another fight. Freeze every case's full hashes
// on this tree - the new fielding test.trigger-with-tag among them. `changed` marks the cases whose full events OR state differ from
// the rule.walked-unit-has-moved capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged. Refuses
// to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-unit-trigger-with-tag-cursor.mts --out test/fixtures/battle-cursor-unit-trigger-with-tag.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-walked-unit-has-moved.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = `capability.unit-trigger-with-tag (2026-10-04): a trigger's tag requirement. Cases marked changed differ from the rule.walked-unit-has-moved capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold (the new fielding).`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'capability.unit-trigger-with-tag', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
