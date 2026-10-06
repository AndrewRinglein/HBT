// content.dwarf-elf-fey-badges-act (2026-10-05; DECISIONS.md 2026-10-05 'a prone unit only stands; … Dwarf, Elf and Fey act; …': "6. They
// should act."), Law 10: the Dwarf, Elf and Fey badges carry the data's numbers (Dwarf -1 Movement +2 Health; Elf +3 Vision +2
// Luck; Fey +10 Surge), so every battle that fields the Iron Dwarf, the Dwarven Brawler, the Mountain Berserker, the Ancient Elf,
// the Forest Elf or the Forest Fey is another battle. A case that fields none of the six is event for event what it was; none is ADDED.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// stabilise-downed-ally capture (the layer below); `movedOnlyText` says the state, RNG and result are all unchanged; `added` marks a
// case the layer below does not hold. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-dwarf-elf-fey-badges-act-cursor.mts --out test/fixtures/battle-cursor-dwarf-elf-fey-badges-act.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-stabilise-downed-ally.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'content.dwarf-elf-fey-badges-act (2026-10-04). Cases marked changed differ from the stabilise-downed-ally capture; movedOnlyText means state, RNG and result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'content.dwarf-elf-fey-badges-act', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
