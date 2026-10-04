// fix.trigger-ids-and-scopes (2026-10-04; SWITCHES.md triggerIdsDistinctInARow, itemTriggerOwnAttacks, testDeltaTriggersOnce):
// no row holds two triggers under one id, a weapon's row-level trigger may ride only that weapon's own attacks, and a test unit
// that is a delta over another holds its base's triggers once. So a battle moves where (a) its log names a renamed trigger
// (the Fire Imp's Blast burn is trigger.fire-imp.burn.blast), (b) a holder of a War Axe, a Lumberjack's Axe or another scoped
// weapon carries more triggers than before — one per attack — which shifts the roll of every trigger listed after them, or a
// blocked Punch no longer strips Block, or (c) it fields test-slot-striker, test-packet-flame or test-packet-shadow.
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// fix.burst-ground-class-powers capture below it; `movedOnlyText` says the state, RNG and result are all unchanged.
// `renamed` counts the log lines whose cause is one of the ids this item gave a row; `ownScoped` counts the trigger rolls that were
// scoped to an attack of the item that carries them. A case the layer below does not hold is frozen here and is not `changed`.
// Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-trigger-ids-cursor.mts --out test/fixtures/battle-cursor-trigger-ids.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-burst-ground-class-powers.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
// the ids the rule gave: a trigger id that ends in the last word of the attack it is scoped to, or in a hook's words, or (the Shadow Sorcerer) in what it does
const HOOK_WORDS = /\.(start-of-battle|on-activation-end|on-taking-damage)$/
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const movedOnlyText = changed && was!.state === state && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  const scopeOf = new Map<string, string | undefined>()
  for (const u of ctx.state.units) for (const t of u.triggers) scopeOf.set(t.id, t.onlyWithAttack)
  let renamed = 0, ownScoped = 0
  for (const e of ctx.events) {
    if (e.type !== 'trigger.rolled') continue
    const cause = String(e.causeId), scope = scopeOf.get(cause)
    if (HOOK_WORDS.test(cause) || /^trigger\.shadow-sorcerer\.dragged-under\./.test(cause) || (scope !== undefined && cause.endsWith('.' + scope.split('.').pop()) && !cause.startsWith('trigger.' + scope.replace(/^attack\./, '') + '.'))) renamed++
    if (scope !== undefined && String(e['source']).startsWith('item.')) ownScoped++
  }
  return { id, events, state, rng, result, changed, ...(changed ? { movedOnlyText } : {}), ...(renamed ? { renamed } : {}), ...(ownScoped ? { ownScoped } : {}) }
})
const note = `trigger ids distinct within a row, weapons' row-level triggers scoped to their own attacks, test deltas' triggers once (fix.trigger-ids-and-scopes, 2026-10-04). Cases marked changed differ from the burst-ground-class-powers capture; movedOnlyText means state, RNG and result are unchanged; renamed counts trigger rolls logged under an id the rule gave; ownScoped counts rolls of item triggers scoped to an attack.`
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.trigger-ids-and-scopes', note, cases }, null, 2) + '\n', { flag: 'wx' })
const moved = cases.filter((c) => c.changed)
console.log(`Captured ${cases.length} cases; changed ${moved.length}: ${moved.map((c) => `${c.id}${c.movedOnlyText ? ' (text only)' : ' (STATE/RNG/RESULT)'}`).join(', ') || 'none'}.`)
