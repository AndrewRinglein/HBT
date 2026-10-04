// (Re-captured 2026-10-04 at the second merge, engine master eec6321: master's fix.burst-ground-class-powers and
// fix.trigger-ids-and-scopes move cases too; the fixture is the combined tree's as it stands after both merges.)
// combine (2026-10-04; GBH SWITCHES combine.mergeMainFirst): engine master ea9dafc (capability.burst-paints-ground — a burst leaves
// its ground; rule.free-attack-is-basic-attack — the attack of opportunity is the holder's basic attack, free of Stamina, at −20
// Accuracy; capability.counterattack-and-fend — the Longsword's Counterattack) merged into the kingdom worker's copy
// (fix.own-area-skips-owner, fix.opening-orphanage-closer-start, fix.opening-probe-cadence, fix.affliction-pop-up-words). Each side
// froze its own battle-cursor layers on its own tree; a case both sides moved has neither side's hash on the combined tree. Freeze
// every case's full hashes on the combined tree.
// `changed` marks the cases whose full events OR state differ from the fix.affliction-pop-up-words capture (this copy's top layer) —
// the cases master's three items move; `movedOnlyText` says the state, RNG and result are all unchanged. Refuses to overwrite
// (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-combine-free-attack-cursor.mts --out test/fixtures/battle-cursor-combine-free-attack.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-affliction-pop-up-words.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = `engine master eec6321 (capability.burst-paints-ground, rule.free-attack-is-basic-attack, capability.counterattack-and-fend, fix.burst-ground-class-powers, fix.trigger-ids-and-scopes) combined with the kingdom worker's four engine items (GBH SWITCHES combine.mergeMainFirst, 2026-10-04). Cases marked changed differ from the fix.affliction-pop-up-words capture; movedOnlyText means state, RNG and result are unchanged.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'combine: engine master eec6321 into the kingdom worker copy', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
