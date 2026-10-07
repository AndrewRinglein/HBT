// rule.one-move-action-one-primary-action (ruled 2026-10-06, DECISIONS.md 'an Activation is one move action and one primary action,
// in that order; …': "All the player units get two actions: a move action and a primary action, in that order, every time they
// get activated."). A move-class action is only ever the move action; `Unit.stood` is removed as subsumed (the slot's own answer
// closes every movement after a stand). No battle fought before is FOUGHT differently — the computer never spent its primary
// action on a movement (SWITCHES.md oneMoveEveryUnit; the 23 control battles and the six opening recordings are what they were) —
// but a case in which a unit stood up no longer carries `stood` in its state, so its state hash moves with every event, the
// RNG and the result unchanged.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// computer-avoids-own-traps capture (the layer below); `stateOnly` says the events, the RNG and the result are all unchanged;
// `added` marks a case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-one-move-action-one-primary-action-cursor.mts --out test/fixtures/battle-cursor-one-move-action-one-primary-action.json
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
  const stateOnly = changed && was!.events === events && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { stateOnly } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'rule.one-move-action-one-primary-action (2026-10-06). Cases marked changed differ from the computer-avoids-own-traps capture; stateOnly means the events, the RNG and the result are unchanged (the unit state no longer carries stood); added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'rule.one-move-action-one-primary-action', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.stateOnly ? ' (state only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
