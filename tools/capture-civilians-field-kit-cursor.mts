// fix.civilians-field-kit (2026-10-03; DECISIONS.md 2026-10-03 'every civilian fields its kit by default when an encounter
// places it': "all of the civilians, by default, should field their kit the first time they're loaded" · "If enemies have
// weapons assigned, they need them also when they come into play."): freeze every battle-cursor case's full hashes after
// every unit an encounter places fields the kit its row carries (src/core/setup.ts fieldArrival) and the opt-in
// placedWithKit flag is retired.
// `changed` marks the cases whose full events OR state differ from the rule.afflictions-at-zero-refiled-2 capture;
// `movedOnlyText` says the state, RNG and result are all unchanged. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-civilians-field-kit-cursor.mts --out test/fixtures/battle-cursor-civilians-field-kit.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-afflictions-at-zero-rule.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}) }
})
const note = `every unit an encounter places fields the kit its row carries; the opt-in placedWithKit flag is retired (fix.civilians-field-kit; DECISIONS.md 2026-10-03). Cases marked changed differ from the rule.afflictions-at-zero-refiled-2 capture; movedOnlyText means state, RNG and result are unchanged.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.civilians-field-kit', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
