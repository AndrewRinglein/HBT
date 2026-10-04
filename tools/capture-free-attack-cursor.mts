// rule.free-attack-is-basic-attack (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six,
// shields, custom weapons' and 2026-10-04 'the basic attack is a weapon's first attack, and every free attack uses it without
// paying stamina'): the attack of opportunity is the holder's basic attack, with no Stamina spent, at -20 Accuracy. Every battle
// in which a unit leaves a zone of control plays differently from that swing on. Freeze every case's full hashes on this tree.
// `changed` marks the cases whose full events OR state differ from the capability.burst-paints-ground capture below it;
// `movedOnlyText` says the state, RNG and result are all unchanged; `freeAttacks` counts the attacks of opportunity in the battle.
// A case the layer below does not hold (a fielding registered since) is frozen here and is not `changed`. Refuses to overwrite.
// node node_modules/tsx/dist/cli.mjs tools/capture-free-attack-cursor.mts --out test/fixtures/battle-cursor-free-attack.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-burst-paints-ground.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  const freeAttacks = ctx.events.filter((e) => e.type === 'aoo.provoked').length
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(freeAttacks ? { freeAttacks } : {}) }
})
const note = `the attack of opportunity is the basic attack, free, at -20 Accuracy (rule.free-attack-is-basic-attack, 2026-10-04). Cases marked changed differ from the burst-paints-ground capture; movedOnlyText means state, RNG and result are unchanged; freeAttacks counts the attacks of opportunity in that battle.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'rule.free-attack-is-basic-attack', note, cases }, null, 2) + '\n', { flag: 'wx' })
const moved = cases.filter((c) => c.changed)
console.log(`Captured ${cases.length} cases; changed ${moved.length}: ${moved.map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}${c.freeAttacks ? '' : ' [NO FREE ATTACK]'}`).join(', ') || 'none'}.`)
console.log(`Unchanged ${cases.length - moved.length}: ${cases.filter((c) => !c.changed).map((c) => `${c.id}${c.freeAttacks ? ' [HAS FREE ATTACKS]' : ''}`).join(', ')}`)
