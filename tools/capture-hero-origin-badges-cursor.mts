// content.hero-origin-badges (2026-10-05; DECISIONS.md 2026-10-05 'seven answers: … origin badges go on the heroes …': asked whether
// the Codex's origin badges should be put on the heroes' rows - "3, yes."), Law 10: each of the 24 base heroes' rows carries the
// origin badges the Codex names for it, and a badge acts from the row. Every case that fields a base hero has one more line per
// origin badge at fielding; the 13 heroes whose badges carry numbers are fielded with them (the Iron Dwarf +2 Health +1 Stamina,
// the Pyre Witch and the Raven -2 Health +20 Dodge, …), so every such battle moves.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// damage-from-two-stats capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged; `added` marks a
// case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-hero-origin-badges-cursor.mts --out test/fixtures/battle-cursor-hero-origin-badges.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-damage-from-two-stats.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'content.hero-origin-badges (2026-10-04). Cases marked changed differ from the damage-from-two-stats capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'content.hero-origin-badges', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
