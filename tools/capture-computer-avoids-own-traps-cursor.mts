// The group of 2026-10-06 (DECISIONS.md 'engine items too are built in groups of up to four …'): three items, one layer.
// content.sets-count-holy-texts-and-heavy-chain (Holy Texts a book, Heavy Chain a chain item for sets - by a set membership the Forge
// does not read), content.resistance-to-weak-and-vigil-party-spirit (the word; the Banner of the Vigil heals by the party's Spirit) and
// rule.computer-avoids-own-traps (ruled 2026-10-05: "Computers should avoid their own traps." - a unit the computer plays will not
// enter a hex holding its own side's trap). No battle fought before moves: no case fields the Book of Karma or the Chains of the
// Wrathful with either row, none plants the Vigil's banner, and in the one case with traps (test.bear-traps) no hero walked onto a
// hero's trap. test.snarer-traps is ADDED: a trap an enemy places, on its own side's way.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// dwarf-elf-fey-badges-act capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged; `added` marks a
// case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-computer-avoids-own-traps-cursor.mts --out test/fixtures/battle-cursor-computer-avoids-own-traps.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-dwarf-elf-fey-badges-act.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'group A: content.sets-count-holy-texts-and-heavy-chain, content.resistance-to-weak-and-vigil-party-spirit, rule.computer-avoids-own-traps (2026-10-06). Cases marked changed differ from the dwarf-elf-fey-badges-act capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'group A: content.sets-count-holy-texts-and-heavy-chain, content.resistance-to-weak-and-vigil-party-spirit, rule.computer-avoids-own-traps', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
