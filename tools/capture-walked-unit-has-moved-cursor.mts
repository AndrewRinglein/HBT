// rule.walked-unit-has-moved (2026-10-04; DECISIONS.md 2026-10-04 'after the backlog run: ... moves are refused once a unit has walked ...'):
// a unit that has entered a hex with its walk carries `walked` until its Activation ends (or a Surge reopens it), and takes no other
// movement meanwhile. The computer never did walk and then use another movement, so no fight changes; what moves is the STATE of a
// battle that ends in the middle of an Activation whose unit had walked - that unit still holds the fact. Freeze every case's full
// hashes on this tree. `changed` marks the cases whose full events OR state differ from the fix.enchant-triggers-own-weapon capture
// (the layer below); `stateOnly` says the events, the RNG and the result are all unchanged. Refuses to overwrite (flag wx).
// node node_modules/tsx/dist/cli.mjs tools/capture-walked-unit-has-moved-cursor.mts --out test/fixtures/battle-cursor-walked-unit-has-moved.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-enchant-triggers-own-weapon.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const stateOnly = changed && was!.events === events && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { stateOnly, walkedAtTheEnd: ctx.state.units.filter((u) => u.walked).map((u) => u.name) } : {}) }
})
const note = `rule.walked-unit-has-moved (2026-10-04): a unit that has walked takes no other movement that action cycle. Cases marked changed differ from the fix.enchant-triggers-own-weapon capture; stateOnly means the events, the RNG and the result are unchanged - the battle ended inside an Activation whose unit had walked (walkedAtTheEnd names it).`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'rule.walked-unit-has-moved', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.stateOnly ? ' (state only)' : ' (EVENTS/RNG/RESULT)'}`).join(', ') || 'none'}.`)
