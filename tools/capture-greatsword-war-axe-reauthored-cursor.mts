// content.greatsword-war-axe-reauthored (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields,
// custom weapons' and the Armory Ledger approved that day), Law 10: the Great Sword is +5 Block with the Hew at 1 Stamina and the power
// Heavy Counterattack (its Great Cleave is gone); the War Axe's Chop is -10 Accuracy and its second attack is Heavy Chop (Strength +3, -15
// Accuracy, no Crit, no Bleed). A holder's attacks, costs and numbers are part of the state and of every roll it makes, so every case that
// fields a Great Sword or a War Axe moves - the Alpha Team's among them.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// shields-reauthored capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged; `added` marks a
// case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-greatsword-war-axe-reauthored-cursor.mts --out test/fixtures/battle-cursor-greatsword-war-axe-reauthored.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-shields-reauthored.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'content.greatsword-war-axe-reauthored (2026-10-04). Cases marked changed differ from the shields-reauthored capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'content.greatsword-war-axe-reauthored', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
