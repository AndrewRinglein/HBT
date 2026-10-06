// rule.special-moves-unlock-at-level-two (2026-10-06). Ruled 2026-10-06 (DECISIONS.md 'a hero's special moves unlock at level 2,
// ruled: all of them, every hero, enemies and civilians unchanged, named on the level-up screen'): "the special moves that the starting
// heroes get should be unlocked instead at level 2". A row may say the level a movement it lists is granted at; a hero fielded below
// it does not have the movement. The 24 base heroes have their class's special move from level 2; an enemy, a civilian and the engine's
// test parties keep theirs. A battle that fields a base hero at level 1 moves where that hero would have used its special move.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// surge-is-at-least-level capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged; `added` marks a
// case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-special-moves-unlock-at-level-two-cursor.mts --out test/fixtures/battle-cursor-special-moves-unlock-at-level-two.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-surge-is-at-least-level.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'rule.special-moves-unlock-at-level-two (2026-10-06). Cases marked changed differ from the surge-is-at-least-level capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'rule.special-moves-unlock-at-level-two', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
