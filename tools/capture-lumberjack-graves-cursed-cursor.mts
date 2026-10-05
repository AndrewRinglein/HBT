// content.orphanage-body-and-graves-cursed (2026-10-05; DECISIONS.md 2026-10-05 'playtest post: … bodies, cursed ground …' and 2026-09-28
// 'cursed ground is the Weak ground layer, the one ground-status shape'), Law 10: the Lumberjack House's encounter paints its map's
// cursed ground - layer.weak on the three graves and the body, four hexes - at setup. The one case that fields that battle moves: four
// layer.painted lines at the start, and Weak on whoever enters or ends an Activation on one.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// computer-reaches-class-power capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged; `added` marks a
// case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-lumberjack-graves-cursed-cursor.mts --out test/fixtures/battle-cursor-lumberjack-graves-cursed.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-computer-reaches-class-power.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'content.orphanage-body-and-graves-cursed (2026-10-04). Cases marked changed differ from the computer-reaches-class-power capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'content.orphanage-body-and-graves-cursed', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
