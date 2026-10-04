// fix.burst-ground-class-powers (2026-10-04; SWITCHES.md burstGroundClassPowers): the Fire Master's Fireball and the Wyrmling's
// Scorch leave their seven hexes burning (the burst profile's `paints`, authored on the two class-power rows — content only), so
// every battle in which a Fire Master throws Fireball plays differently from the cast on. Freeze every case's full hashes on this tree.
// `changed` marks the cases whose full events OR state differ from the capability.counterattack-and-fend capture below it;
// `movedOnlyText` says the state, RNG and result are all unchanged; `groundStrokes` counts the hexes a CLASS power's burst painted
// in that battle. A case the layer below does not hold (a fielding registered since) is frozen here and is not `changed`.
// Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-burst-ground-class-powers-cursor.mts --out test/fixtures/battle-cursor-burst-ground-class-powers.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-counterattack.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  // what moved it, said from the battle's own log: the strokes a class power's burst painted
  const groundStrokes = ctx.events.filter((e) => (e.type === 'layer.painted' || e.type === 'layer.cancelled')
    && (ctx.actions[e.causeId as string] as { burst?: unknown; source?: string } | undefined)?.burst !== undefined
    && (ctx.actions[e.causeId as string] as { source?: string }).source === 'class').length
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(groundStrokes ? { groundStrokes } : {}) }
})
const note = `a class power's burst leaves its ground (fix.burst-ground-class-powers, 2026-10-04): Fireball's and Scorch's seven hexes burn. Cases marked changed differ from the counterattack capture; movedOnlyText means state, RNG and result are unchanged; groundStrokes counts the hexes a class power's burst painted in that battle.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.burst-ground-class-powers', note, cases }, null, 2) + '\n', { flag: 'wx' })
const moved = cases.filter((c) => c.changed)
console.log(`Captured ${cases.length} cases; changed ${moved.length}: ${moved.map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}${c.groundStrokes ? ` [${c.groundStrokes} strokes]` : ' [NO GROUND PAINTED]'}`).join(', ') || 'none'}.`)
