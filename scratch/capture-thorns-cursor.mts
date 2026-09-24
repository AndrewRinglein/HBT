// v2.thorns: freeze the battle-cursor cases the Thorns change moved. Writes only
// the ids named on the command line; the test checks both drivers against them.
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'
const ids = process.argv.slice(2, process.argv.indexOf('--out'))
const out = process.argv[process.argv.indexOf('--out') + 1]!
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex')
const cases = battleCursorCases().filter((c) => ids.includes(c.id)).map(({ id, create }) => {
  const ctx = create(); const result = runBattle(ctx)
  return { id, events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result, changed: true,
    thornsReflected: ctx.events.filter((e) => e.type === 'thorns.reflected').length }
})
if (cases.length !== ids.length) throw new Error('unknown case id')
writeFileSync(out, JSON.stringify({ sourceCommit: 'v2.thorns', note: 'v2.thorns (2026-09-24): Thorns is a magnitude (COMBAT-V2-DESIGN section 9.4). The test golem\'s V1 onTakingDamage retaliation (trigger.test-thorns: 1 true back at any range, only when damage got through) became test.badge.bramble (Thorns 1: 1 true back on every connecting MELEE hit, armor-zero included; never ranged, burst, miss or block). The listed cases field the golem and moved; both drivers are checked against these frozen hashes. thornsReflected counts the reflections. Old fixtures stay immutable.', cases }, null, 2) + '\n', { flag: 'wx' })
console.log(cases.map((c) => `${c.id} ${JSON.stringify(c.result)} reflected ${c.thornsReflected}`).join('\n'))
