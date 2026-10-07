// combine (2026-10-06; GBH SWITCHES combine.mergeMainFirst, combine.cursorLayersCombinedOnTop): engine master a359a77
// (rule.one-move-action-one-primary-action — a move-class action is only ever the move action; `Unit.stood` removed as subsumed)
// merged into the engine worker's copy (rule.surge-is-at-least-level — every hero rolls the Surge check;
// rule.special-moves-unlock-at-level-two — a hero's special move is granted at level 2). Each side froze its battle-cursor layer
// on its own tree from the same layer below (computer-avoids-own-traps); a case both sides moved has neither side's hash on the
// combined tree. Freeze every case's full hashes on the combined tree.
// `changed` marks the cases whose full events OR state differ from the special-moves-unlock-at-level-two capture (this copy's top
// layer) — the cases master's item moves on this copy's battles; `stateOnly` says the events, the RNG and the result are all
// unchanged (the unit state no longer carries `stood`). Captured 2026-10-06: test.prone-b (state only); showcase.supper and
// showcase.waystation, one `ai.denied` line more each (a ranged unit the computer plays, just stood up, wanted to reposition:
// its move action is spent - before the merge the walk was still asked for as the primary action and found nowhere to go);
// same outcome on the same Turn. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-combine-one-move-cursor.mts --out test/fixtures/battle-cursor-combine-one-move.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-special-moves-unlock-at-level-two.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const stateOnly = changed && was!.events === events && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { stateOnly } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = `engine master a359a77 (rule.one-move-action-one-primary-action) combined with the engine worker's rule.surge-is-at-least-level and rule.special-moves-unlock-at-level-two (GBH SWITCHES combine.mergeMainFirst, combine.cursorLayersCombinedOnTop, 2026-10-06). Cases marked changed differ from the special-moves-unlock-at-level-two capture; stateOnly means the events, the RNG and the result are unchanged (the unit state no longer carries stood); added marks a case the layer below does not hold.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'combine: engine master a359a77 into the engine worker copy', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.stateOnly ? ' (state only)' : ' (EVENTS/RNG/RESULT)'}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
