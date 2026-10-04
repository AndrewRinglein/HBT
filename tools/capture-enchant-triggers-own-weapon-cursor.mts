// fix.enchant-triggers-own-weapon (2026-10-04; DECISIONS.md 2026-10-04 'after the backlog run: ... an enchant is its own weapon's ...'):
// on a tier-3 row every trigger its attribute adds on an attacker's hook is compiled once per attack the weapon grants, each
// onlyWithAttack. A unit's trigger list is part of the state, so every case that fields such a weapon moves; a holder's later
// triggers sit on later slots and roll other dice (Law 4: the key carries the slot). Freeze every case's full hashes on this tree.
// `changed` marks the cases whose full events OR state differ from the content.longsword-loses-stab capture (the layer below);
// `movedOnlyText` says the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-enchant-triggers-own-weapon-cursor.mts --out test/fixtures/battle-cursor-enchant-triggers-own-weapon.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-longsword-loses-stab.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = `fix.enchant-triggers-own-weapon (2026-10-04): an attribute's attacker-hook triggers ride its own weapon's attacks. Cases marked changed differ from the content.longsword-loses-stab capture; movedOnlyText means state, RNG and result are unchanged.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.enchant-triggers-own-weapon', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
