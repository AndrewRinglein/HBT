// rule.counterattack-replaced-and-lost (2026-10-04; DECISIONS.md 2026-09-28, the Armory Ledger's rules: "A new counterattack replaces the
// old one. Knocked down, knocked back or moved by an enemy's power: it is lost."), Law 10: a power that grants a special free attack
// first takes away the one its receiver has up (the kind's two stats and the older grant's riders), and a unit that goes prone or is
// knocked to another hex loses the kind's two stats - one statmod.expired line each, saying why. Thorns answers an ADJACENT melee
// attacker. A case moves where a unit uses its counterattack power again while one is up (the computer does: it had Counterattack 2 and
// +20, now 1 and +10), or is knocked down or back with one up.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// enchant-stats-on-weapon capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged; `added` marks a
// case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-counterattack-replaced-and-lost-cursor.mts --out test/fixtures/battle-cursor-counterattack-replaced-and-lost.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-enchant-stats-on-weapon.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'rule.counterattack-replaced-and-lost (2026-10-04). Cases marked changed differ from the enchant-stats-on-weapon capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'rule.counterattack-replaced-and-lost', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
