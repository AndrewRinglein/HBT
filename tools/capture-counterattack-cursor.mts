// capability.counterattack-and-fend (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six,
// shields, custom weapons'): the Longsword carries a Counterattack power the computer uses, a unit with Counterattack up answers
// a melee attack, and a unit with Fend up swings at an enemy that walks into its zone. Every battle that fields a Longsword plays
// differently from the first use of the power on. Freeze every case's full hashes on this tree.
// `changed` marks the cases whose full events OR state differ from the rule.free-attack-is-basic-attack capture below it;
// `movedOnlyText` says the state, RNG and result are all unchanged; `counterattacks` and `fends` count them in the battle.
// A case the layer below does not hold (a fielding registered since) is frozen here and is not `changed`. Refuses to overwrite.
// node node_modules/tsx/dist/cli.mjs tools/capture-counterattack-cursor.mts --out test/fixtures/battle-cursor-counterattack.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-free-attack.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  const counterattacks = ctx.events.filter((e) => e.type === 'aoo.provoked' && e['as'] === 'counterattack').length
  const fends = ctx.events.filter((e) => e.type === 'aoo.provoked' && e['as'] === 'fend').length
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(counterattacks ? { counterattacks } : {}), ...(fends ? { fends } : {}) }
})
const note = `Counterattack and Fend (capability.counterattack-and-fend, 2026-10-04). Cases marked changed differ from the free-attack capture; movedOnlyText means state, RNG and result are unchanged; counterattacks and fends count them in that battle.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'capability.counterattack-and-fend', note, cases }, null, 2) + '\n', { flag: 'wx' })
const moved = cases.filter((c) => c.changed)
console.log(`Captured ${cases.length} cases; changed ${moved.length}: ${moved.map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ''}`).join(', ') || 'none'}.`)
