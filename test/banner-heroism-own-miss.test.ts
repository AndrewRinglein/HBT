// content.banner-heroism-own-miss (2026-10-06). Ruled 2026-10-06 (Andrew, DECISIONS.md 'the one-use rules: most are cut or
// reworded onto rules the engine already has; a handful are built'), of the Banner of Heroism's last clause ("onMiss by any
// ally in the aura: EVERY ally in the aura gains 30 Surge Chance"): "it could be done by everybody who's in range. Gains on
// miss. Gain surge, but not everyone gives everyone the modifier. That seems like a double stacked thing that we don't need."
// An ally standing in the banner's reach that misses gains 30 Surge Chance ITSELF, and no other ally does. It is a trigger
// the planted object lends to the unit it is lent to (PlantedDef.lends, select 'self' - what the Banner of the Assassin's
// on-crit line already is), with the engine's surge.gain. It replaces capability.banner-heroism-on-miss, which was abandoned.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { settle } from '../src/core/settle.js'
import { usePower } from '../src/core/ability.js'
import { beginActivation } from '../src/core/mutate.js'
import { fireTriggers } from '../src/core/trigger.js'
import { ABILITIES, ITEMS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Effect, Unit } from '../src/core/types.js'

const PLANT = 'power.banner-heroism.plant', LENT = 'trigger.banner-heroism.plant.surge-on-miss'
/** The fielding's paladin with the banner and its ally, stood where the test says; one zombie. */
function field(heroHexes: [number, number]): { ctx: Ctx; planter: Unit; ally: Unit; foe: Unit } {
  const ctx = createBattle({ ...scenarioOptions(SCENARIOS['test.banner-heroism']!), heroHexes, enemies: ['unit.zombie'], enemyHexes: [95], enemyCount: 1 })
  const [planter, ally] = ctx.state.units.filter((u) => u.side === 'hero') as [Unit, Unit]
  beginActivation(ctx, planter.id, 'test')
  usePower(ctx, planter.id, planter.id, PLANT); settle(ctx, PLANT)
  return { ctx, planter, ally, foe: ctx.state.units.find((u) => u.side === 'enemy')! }
}
const miss = (ctx: Ctx, by: Unit, at: Unit) => fireTriggers(ctx, 'onMiss', { ownerId: by.id, targetId: at.id, causeId: 'attack.punch', ordinal: 1 })
const gained = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'surge.gained' && e.causeId === LENT).map((e) => [e.target, e['amount']])

describe('the row', () => {
  it('the Heroic Banner lends two triggers to a unit inside: 5 healed at the End of its Activation, and 30 Surge Chance on its own miss - and names no gap', () => {
    const plant = ABILITIES[PLANT]!.effects![0] as Extract<Effect, { kind: 'plant' }>
    expect(plant.lends).toEqual([
      { id: 'trigger.banner-heroism.plant.heal', hook: 'onActivationEnd', chance: 100, select: 'self', effect: { kind: 'heal', amount: 5 }, source: PLANT },
      { id: LENT, hook: 'onMiss', chance: 100, select: 'self', effect: { kind: 'surge.gain', value: 30 }, source: PLANT },
    ])
    expect(ABILITIES[PLANT]!.gaps ?? []).toEqual([])
    expect(ITEMS['item.banner-heroism']!.gaps ?? []).toEqual([])
  })
})

describe('with the banner planted', () => {
  it('an ally inside its reach that misses gains 30 Surge Chance, and no other ally does', () => {
    const { ctx, planter, ally, foe } = field([85, 86])
    expect(ctx.geo.distance(ally.hex, ctx.state.planted![0]!.hex)).toBeLessThanOrEqual(3)
    const [p0, a0] = [planter.surgeChance, ally.surgeChance]
    miss(ctx, ally, foe)
    expect([planter.surgeChance - p0, ally.surgeChance - a0]).toEqual([0, 30])
    expect(gained(ctx)).toEqual([[ally.id, 30]])
    // … and the planter's own miss is the planter's own gain
    miss(ctx, planter, foe)
    expect([planter.surgeChance - p0, ally.surgeChance - a0]).toEqual([30, 30])
    expect(gained(ctx)).toEqual([[ally.id, 30], [planter.id, 30]])
  })
  it('an ally outside its reach gains none, though an ally inside misses beside it', () => {
    const { ctx, planter, ally, foe } = field([85, 90])
    expect(ctx.geo.distance(ally.hex, ctx.state.planted![0]!.hex)).toBeGreaterThan(3)
    const a0 = ally.surgeChance
    miss(ctx, ally, foe)
    miss(ctx, planter, foe)
    expect(ally.surgeChance - a0).toBe(0)
    expect(gained(ctx)).toEqual([[planter.id, 30]])
  })
  it('an enemy that misses inside it gains nothing', () => {
    const { ctx, planter, foe } = field([85, 86])
    const f0 = foe.surgeChance
    foe.hex = 84                                                      // beside the banner
    miss(ctx, foe, planter)
    expect(foe.surgeChance - f0).toBe(0)
    expect(gained(ctx)).toEqual([])
  })
})

describe('in a real battle', () => {
  it('test.banner-heroism: the paladin plants her banner, and a miss made inside it gives the one that missed 30 Surge Chance', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.banner-heroism']!))
    runBattle(ctx)
    expect(ctx.events.filter((e) => e.type === 'object.planted').map((e) => e.causeId)).toEqual([PLANT])
    const got = ctx.events.filter((e) => e.type === 'surge.gained' && e.causeId === LENT)
    expect(got.length).toBeGreaterThan(0)
    for (const g of got) {
      expect(g['amount']).toBe(30)
      // each gain follows a miss by the very unit that gained
      const rolled = ctx.events.filter((e) => e.type === 'trigger.rolled' && e.causeId === LENT && e.seq < g.seq).at(-1)!
      expect(rolled.actor).toBe(g.target)
      const declared = ctx.events.filter((e) => e.type === 'attack.declared' && e.seq < rolled.seq).at(-1)!
      expect(declared.actor).toBe(g.target)
      // … and that attack did not land: no hit of it stands between its declaration and the gain
      expect(ctx.events.filter((e) => e.type === 'attack.hit' && e.seq > declared.seq && e.seq < g.seq)).toEqual([])
    }
  })
  it('a Battle with no such banner has no such line', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.banner-courage']!))
    runBattle(ctx)
    expect(ctx.events.filter((e) => e.causeId === LENT)).toEqual([])
  })
})
