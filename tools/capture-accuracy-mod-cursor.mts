// fix.enemy-accuracy-mod (2026-09-27): freeze every battle-cursor case's full hashes after the
// pack began carrying a regular enemy attack's accuracyMod onto AttackDef.accuracy (it was
// dropped silently — Law 9). `changed` marks the cases whose full events differ from the
// pack.enemy-actions capture — the scenarios that field a unit whose attack row carries an
// accuracyMod (the Necromancer's Necro Bolt, the Lieutenant Demon's melee). No state field was
// added, so an unchanged case needs no projection before the older layers.
// Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-accuracy-mod-cursor.mts --out test/fixtures/battle-cursor-accuracy-mod.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-enemy-actions.json', 'utf8')) as { cases: { id: string; events: string }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  return { id, events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result, changed: was !== undefined && was.events !== hash(ctx.events) }
})
const note = 'fix.enemy-accuracy-mod (2026-09-27): a regular enemy attack carries its bestiary row\'s accuracyMod (was dropped silently). Cases marked changed field a unit whose attack row carries one. Every older fixture stays immutable.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'fix.enemy-accuracy-mod', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases, ${cases.filter((c) => c.changed).map((c) => c.id).join(', ') || 'none'} changed.`)
