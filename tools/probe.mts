// Gate 1, mechanised: does this id appear in a real battle, and did it do anything?
// Three distinct failures, and the log tells them apart.
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { MAP_PANEL } from '../src/content/maps.js'

const id = process.argv[2]
if (!id) { console.error('usage: probe <id> [--neutral]'); process.exit(2) }

// A PLUMBING item asserts the opposite of a normal one: the id must appear in the
// log, and must NOT have changed any state. Inverting gate 1 is stronger than
// skipping it — "I changed nothing" becomes a claim the log has to support, and a
// plumbing change that quietly altered behaviour fails here instead of silently
// landing. Law 10: the gate is not weakened, it is pointed the other way.
const NEUTRAL = process.argv.includes('--neutral')

const ACTED = new Set(['damage.applied','heal.applied','power.used','attack.declared',
  'unit.enter','moved','ai.mode','status.applied','status.reduced','status.expired'])

let mentions = 0, acted = 0, changed = 0
for (const mapId of MAP_PANEL) for (const z of [4, 8, 12]) for (let r = 0; r < 25; r++) {
  const ctx = createBattle({ replicate: r, enemyCount: z, mapId, strict: true })
  runBattle(ctx)
  for (const e of ctx.events) {
    if (!JSON.stringify(e).includes(id)) continue
    mentions++
    if (e.type.endsWith('.consulted')) continue
    acted++
    if (ACTED.has(e.type)) changed++
  }
}
if (mentions === 0) { console.log(`'${id}' never appears in any log. It is not wired in — check the registry entry.`); process.exit(1) }
if (NEUTRAL) {
  if (changed > 0) {
    console.log(`'${id}' claims to be plumbing but changed state ${changed}x. A neutral item must not alter behaviour.`)
    process.exit(1)
  }
  console.log(`${mentions} log lines, changed state 0x — neutral, as declared`)
  process.exit(0)
}
if (acted === 0)   { console.log(`'${id}' was consulted ${mentions}x but never fired. Its condition never became true.`); process.exit(1) }
if (changed === 0) { console.log(`'${id}' fired ${acted}x but changed nothing. Check the station or the mutator it calls.`); process.exit(1) }
console.log(`${mentions} log lines, ${acted} fired, ${changed} changed state`)
