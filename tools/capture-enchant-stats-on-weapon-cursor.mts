// fix.enchant-stats-on-weapon (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom
// weapons': "Strength becomes the weapon's damage (its attacks go up); Crit and Accuracy apply to that weapon's attacks"), Law 10: a
// weapon row's Strength, Precision, Crit and Accuracy ride its own attacks at every tier - a tier-3 row grants its own copy of each
// attack it raises ('<attack id>.<attribute>'), a named weapon's attack rows are raised where they are - and are no stat of the holder.
// A case that fields such a weapon moves: its holder's sheet is less by those numbers, his weapon's attacks carry them (under their
// own ids on a tier-3 row), and a Punch, the other hand's weapon and a cast no longer do.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// greatsword-war-axe-reauthored capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged; `added` marks a
// case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-enchant-stats-on-weapon-cursor.mts --out test/fixtures/battle-cursor-enchant-stats-on-weapon.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-greatsword-war-axe-reauthored.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'fix.enchant-stats-on-weapon (2026-10-04). Cases marked changed differ from the greatsword-war-axe-reauthored capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.enchant-stats-on-weapon', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
