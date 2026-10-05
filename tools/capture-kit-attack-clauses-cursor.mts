// fix.kit-attack-clauses (2026-10-04; DECISIONS.md 2026-10-04 'the weapon audit: the Armory Ledger was approved 2026-09-28 and almost
// none of it is in the game': "the pack drops clauses from weapons the 24 base heroes carry"), Law 10: a weapon attack's rider that moves
// a stat reaches the engine - the Iron Mace's Crush (on hit the target loses 1 Armor), the Elfbow's Elf Shot (on hit gain 1 Precision),
// the Obsidian Fang's 20% Strength loss. A unit's trigger list is part of the state, and a Ranger whose every hit adds Precision fights
// another fight, so each case that fields one of those weapons moves - the six opening battles (their first hero holds an Elfbow) among them.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// unit-trigger-with-tag capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged; `added` marks a
// case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-kit-attack-clauses-cursor.mts --out test/fixtures/battle-cursor-kit-attack-clauses.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-unit-trigger-with-tag.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'fix.kit-attack-clauses (2026-10-04). Cases marked changed differ from the unit-trigger-with-tag capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.kit-attack-clauses', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
