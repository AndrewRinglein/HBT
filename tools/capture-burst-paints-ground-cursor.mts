// capability.burst-paints-ground (2026-10-04; DECISIONS.md 2026-10-03 'reported: the priest's Holy Texts has no heal in battle —
// three starting weapons lose their power on the way into the engine'): the Fire Staff's Flame Burst and the Frost Staff's Frost
// Nova leave their seven hexes burning / frost (BurstProfile.paints, through paintGround), so every battle in which a staff mage
// casts one plays differently from the cast on. Freeze every case's full hashes on this tree.
// `changed` marks the cases whose full events OR state differ from the combine capture below it (battle-cursor-combine-civilians-kit,
// this copy's top layer until now); `movedOnlyText` says the state, RNG and result are all unchanged. A case the layer below does
// not hold (a fielding registered since) is frozen here and is not `changed`. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-burst-paints-ground-cursor.mts --out test/fixtures/battle-cursor-burst-paints-ground.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-combine-civilians-kit.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  // what moved it, said from the battle's own log: the strokes a burst painted
  const groundStrokes = ctx.events.filter((e) => (e.type === 'layer.painted' || e.type === 'layer.cancelled') && ctx.actions[e.causeId as string]?.burst !== undefined).length
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(groundStrokes ? { groundStrokes } : {}) }
})
const note = `a burst leaves its ground (capability.burst-paints-ground, 2026-10-04): Flame Burst's seven hexes burn, Frost Nova's frost. Cases marked changed differ from the combine-civilians-kit capture; movedOnlyText means state, RNG and result are unchanged; groundStrokes counts the hexes a burst painted in that battle.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'capability.burst-paints-ground', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}${c.groundStrokes ? '' : ' [NO GROUND PAINTED]'}`).join(', ') || 'none'}.`)
