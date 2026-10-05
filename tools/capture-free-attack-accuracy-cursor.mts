// capability.free-attack-accuracy (2026-10-04; DECISIONS.md 2026-09-28, the Armory Ledger's rules: "'+10 counterattack' on a weapon is +10
// Accuracy on your counterattacks." / "Bonuses 'to special attacks' and 'Dodge against special attacks' apply to all three."), Law 10:
// the Longsword and the Great Sword carry +10 Counterattack Accuracy while held (a stat of the row, named on its unit.equipped line and
// added to its holder's counterattack roll, on top of a power's own), and two stats exist - freeAttackAccuracy on every special free
// attack, freeAttackDodge against them. Every case that fields either sword moves: its equipped line says the stat, and each
// counterattack its holder makes rolls 10 higher.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// counterattack-replaced-and-lost capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged; `added` marks a
// case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-free-attack-accuracy-cursor.mts --out test/fixtures/battle-cursor-free-attack-accuracy.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-counterattack-replaced-and-lost.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'capability.free-attack-accuracy (2026-10-04). Cases marked changed differ from the counterattack-replaced-and-lost capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'capability.free-attack-accuracy', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
