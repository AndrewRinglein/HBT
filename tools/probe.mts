// Gate 1, mechanised: does this id appear in a real battle, and did it do anything?
// Three distinct failures, and the log tells them apart.
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { MAP_PANEL } from '../src/content/maps.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'

const id = process.argv[2]
if (!id) { console.error('usage: probe <id> [--neutral]'); process.exit(2) }

// A PLUMBING item asserts the opposite of a normal one: the id must appear in the
// log, and must NOT have changed any state. Inverting gate 1 is stronger than
// skipping it — "I changed nothing" becomes a claim the log has to support, and a
// plumbing change that quietly altered behaviour fails here instead of silently
// landing. Law 10: the gate is not weakened, it is pointed the other way.
const NEUTRAL = process.argv.includes('--neutral')

// What counts as "it changed something." Death and the bleed-out counter were
// missing until 2026-08-15 — every one of them goes through a mutator and emits an
// event, so leaving them out meant an item whose only effect was killing a unit
// read as "fired but changed nothing." Widening this makes the gate stricter, not
// looser: more items can now be held to gate 1 rather than needing probeIds.
const ACTED = new Set(['damage.applied','heal.applied','power.used','attack.declared',
  'unit.enter','moved','ai.mode','status.applied','status.reduced','status.expired',
  'life.downed','life.dead','bleedout.set','bleedout.tick',
  // map.loaded added 2026-08-20 (landing map.showcase): a MAP's effect IS the
  // battles fought on it — loading onto the panel is the state it changes.
  // Widening ACTED is stricter, not looser: map items can now face gate 1
  // directly instead of hiding behind terrain probeIds.
  'map.loaded',
  // seam.items-per-unit (2026-09-02): an ITEM's effect is the unit it was put
  // on — attacks granted, stats folded at t=0 — and unit.equipped is the line
  // that says so. Same widening argument as map.loaded: items can face gate 1
  // by their own id instead of hiding behind the attacks they grant.
  'unit.equipped',
  // movement.bonus-actions (2026-08-25): a bonus move's rider IS its state
  // change — Focus moves zero hexes on purpose, so 'stamina.gained' is the only
  // mark it leaves. Same widening-is-stricter argument as map.loaded above.
  'stamina.gained', 'staminaMax.lost', 'statmod.added',
  // capability.knockback (2026-08-27): a knockback's state change is the hex
  // itself — 'knocked' is displacement, and a fully blocked push that only
  // logs knockback.blocked has genuinely changed nothing, so that one is
  // deliberately NOT here. Same widening-is-stricter argument as above.
  'knocked',
  // station.crit (2026-08-27): the chart's own state changes.
  'stamina.drained', 'maxHp.lost',
  // fix.downed-targetable (2026-09-03): a hit on the downed moves the counter,
  // and this is the line that says so. Widening, stricter, as above.
  'bleedout.accelerated',
  // encounter.runner (2026-09-03): an arrival is a unit that was not there
  // (unit.enter already counts); a shunt moved it; an objective outcome ended
  // the battle. Widening, stricter, as above.
  'unit.shunted', 'encounter.won', 'encounter.lost'])

/**
 * A SCENARIO is probed by fielding it, not by sweeping the standard panel.
 *
 * Added 2026-08-21 with `scenario.export`. A scenario exists precisely because
 * no standard battle can produce it — the benched beasts and the flight ladder
 * are unreachable from `createBattle`'s default roster — so sweeping the panel
 * would always report "never appears in any log" and every scenario would have
 * to buy an `unreachable` exemption. Teaching the probe to field one keeps
 * scenarios under gate 1 instead of exempt from it, which is stricter, not
 * looser: the same widening argument as `map.loaded` joining ACTED.
 *
 * A scenario DISABLED through the kill-switch seam is absent from `SCENARIOS`,
 * falls through to the panel sweep, and correctly reports that it is not wired in.
 */
const scenario = SCENARIOS[id]

let mentions = 0, acted = 0, changed = 0
// A non-scenario id is probed in the REGISTERED SCENARIOS FIRST, then the
// standard panel (2026-08-27, capability.area-attack): scenario-only content
// — the alpha kits, the beasts, the test variants — can be live in a fielding
// no standard battle produces, and before this a variant that only a scenario
// reaches probed as "never appears" however real it was. Monotone verdict, so
// prepending battles only widens what can be found; a --neutral claim gets
// STRICTER, which is the right direction for "changed nothing, anywhere".
const battles: (() => ReturnType<typeof createBattle>)[] = scenario
  ? [() => createBattle(scenarioOptions(scenario))]
  : [
      ...Object.values(SCENARIOS).map((s) => () => createBattle(scenarioOptions(s))),
      ...MAP_PANEL.flatMap((mapId) => [4, 8, 12].flatMap((z) =>
        Array.from({ length: 25 }, (_, r) => () => createBattle({ replicate: r, enemyCount: z, mapId, strict: true })))),
    ]

for (const make of battles) {
  const ctx = make()
  runBattle(ctx)
  for (const e of ctx.events) {
    if (!JSON.stringify(e).includes(id)) continue
    mentions++
    if (e.type.endsWith('.consulted')) continue
    acted++
    if (ACTED.has(e.type)) changed++
  }
  // Early exit — 2026-08-25, and Law 0 demands the measurement: the verdict is
  // MONOTONE (each counter only grows), so the moment all three are positive
  // the answer cannot change; the remaining battles only inflate the counts.
  // NEUTRAL mode never exits early — its claim is "changed NOTHING, anywhere",
  // which only the full sweep can support. Measured need: the gate re-probes
  // every variant after gate 1, and six full 600-battle sweeps at 16x16 put
  // the whole gate beyond this environment's process ceiling — the gate was
  // being killed mid-generalization on every attempt.
  if (!NEUTRAL && mentions > 0 && acted > 0 && changed > 0) break
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
