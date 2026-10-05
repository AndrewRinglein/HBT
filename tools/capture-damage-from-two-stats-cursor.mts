// capability.damage-from-two-stats (2026-10-05; DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': of damage from two stats
// added, "We do need that."; 'the Force Staff is Precision plus half Magic, as magic damage'), Law 10: an attack's damage is a sum of
// terms - its own stat, counted as often as its row says, plus each added stat (the party's Magic or Spirit, or a stat of the
// attacker's own) times its multiple - where the row's second term was dropped. Every case that fields an attack with a second term
// moves (the Holy Texts' Verse adds the party's Spirit; the Ancient Tome, the War Hammer's Skullsplitter and the rest), and
// test.force-blast is ADDED: the Force Staff's Force Blast live in a real battle.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// effect-lasts-activations capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged; `added` marks a
// case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-damage-from-two-stats-cursor.mts --out test/fixtures/battle-cursor-damage-from-two-stats.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-effect-lasts-activations.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'capability.damage-from-two-stats (2026-10-04). Cases marked changed differ from the effect-lasts-activations capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'capability.damage-from-two-stats', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
