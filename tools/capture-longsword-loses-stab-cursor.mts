// content.longsword-loses-stab (2026-10-04; DECISIONS.md 2026-10-04 'after the backlog run: ... the Longsword loses Stab ...':
// "3 yes"): item.longsword grants Slash and Counterattack - the Stab is gone, and every row made from the Longsword follows
// its base. A unit's attack list is part of the state, so every case that fields a Longsword moves, and the fights in
// which its holder would have Stabbed are other fights. Freeze every case's full hashes on this tree.
// `changed` marks the cases whose full events OR state differ from the combine-free-attack capture (the layer below);
// `movedOnlyText` says the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-longsword-loses-stab-cursor.mts --out test/fixtures/battle-cursor-longsword-loses-stab.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-combine-free-attack.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = `content.longsword-loses-stab (2026-10-04): the Longsword grants Slash and Counterattack and no Stab. Cases marked changed differ from the combine-free-attack capture; movedOnlyText means state, RNG and result are unchanged.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'content.longsword-loses-stab', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
