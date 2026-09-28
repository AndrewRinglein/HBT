// fix.raise-two (2026-09-28): the Necromancer raises two bodies per Turn (DECISIONS.md
// "the Cathedral encounter": "Let's have the necromancer raise two per turn."). How many a Raise
// takes is a number on the trigger row, authored in the Codex (gen/enemies-authored.json, the
// Raise's `count`: 2); each takes the nearest remaining corpse in reach, ties by the lower corpse
// id (Law 6). The Necromancer activates once a Turn, so two per activation is two per Turn
// (SWITCHES.md raisePerActivation). The second instance, pure data: test-raiser at count 1.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { advanceBattle, completeActionCycle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { applyDamage } from '../src/core/mutate.js'
import { settle } from '../src/core/settle.js'
import { encounterDef, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { UNITS } from '../src/content/index.js'
import type { Ctx, EncounterDef } from '../src/core/types.js'

const W = 20, hex = (c: number, r: number) => r * W + c
const RAISE = 'trigger.necromancer.raise', ONE = 'trigger.test-raise-one'

/** A battle over `bodies` placed remains, under `raiser`, run until the raiser's first Raise has fired. */
function firstRaise(bodies: number[], raiser = 'unit.necromancer', trigger = RAISE) {
  const base = encounterDef('test.encounter.placed-remains-a')
  const enc: EncounterDef = { ...base, setup: [{ unit: raiser, at: { col: 17, row: 1 } }],
    remains: bodies.length ? [{ id: 'test.remains.chapel', typeId: 'unit.zombie', hexes: bodies }] : [] }
  const ctx = createBattle({ ...scenarioOptions(scenarioDef('test.placed-remains-a')), encounter: enc })
  const fired = () => ctx.events.find((e) => e.type === 'trigger.fired' && e.causeId === trigger)
  while (!fired()) {
    const next = advanceBattle(ctx)
    if (next.kind === 'complete') throw new Error('the battle ended before the raise fired')
    runActivation(ctx, next.actor)
    completeActionCycle(ctx)
  }
  const owner = ctx.state.units.find((u) => u.typeId === raiser)!
  return { ctx, owner, fired: fired()!, raised: ctx.events.filter((e) => e.type === 'unit.raised' && e.causeId === trigger) }
}
/** The corpses nearest the raiser as the Raise fired: distance, then the order they were laid (corpse id). */
const nearest = (ctx: Ctx, from: number, bodies: number[], n: number) =>
  bodies.map((h, i) => ({ h, i })).filter(({ h }) => ctx.geo.distance(h, from) <= 10)
    .sort((a, b) => ctx.geo.distance(a.h, from) - ctx.geo.distance(b.h, from) || a.i - b.i).slice(0, n).map(({ h }) => h)

describe('fix.raise-two — how many bodies a Raise takes is the row\'s number', () => {
  it('the Codex row says two', () => {
    const raise = UNITS['unit.necromancer']!.triggers!.find((t) => t.id === RAISE)!
    expect(raise.effect).toEqual({ kind: 'corpse.raise', unit: 'unit.zombie', radius: 10, count: 2 })
  })

  it('with four corpses in reach, the Necromancer raises two at the end of its activation — the two nearest', () => {
    const bodies = [hex(14, 4), hex(16, 7), hex(12, 2), hex(10, 5)]
    const { ctx, owner, fired, raised } = firstRaise(bodies)
    expect(fired['corpsesInReach']).toBe(4)
    expect(raised).toHaveLength(2)
    expect(raised.map((e) => e['hex'])).toEqual(nearest(ctx, owner.hex, bodies, 2))
    expect(ctx.state.corpses).toHaveLength(2)
    // at the end of its activation: after its activation.end line, in the same activation
    const end = ctx.events.findIndex((e) => e.type === 'activation.end' && e.actor === owner.id)
    expect(ctx.events.indexOf(raised[0]!)).toBeGreaterThan(end)
  })

  it('with one corpse it raises one; with none, nothing and no error', () => {
    expect(firstRaise([hex(14, 4)]).raised).toHaveLength(1)
    const none = firstRaise([])
    expect(none.fired['corpsesInReach']).toBe(0)
    expect(none.raised).toEqual([])
  })

  it('the raised are Zombies, and a raised Zombie leaves no corpse when it dies', () => {
    const { ctx, raised } = firstRaise([hex(14, 4), hex(16, 7), hex(12, 2)])
    for (const e of raised) {
      const z = ctx.state.units[e['raised'] as number]!
      expect([z.typeId, z.summoned]).toEqual(['unit.zombie', true])
    }
    const z = ctx.state.units[raised[0]!['raised'] as number]!
    const before = (ctx.state.corpses ?? []).length
    applyDamage(ctx, z.id, z.hp + 10, 'test.kill', { actor: null })
    settle(ctx, 'test.kill')
    expect(z.lifeState).toBe('dead')
    expect((ctx.state.corpses ?? []).length).toBe(before)
    expect(ctx.events.filter((e) => e.type === 'corpse.created' && e['of'] === z.id)).toEqual([])
  })

  it('a row with the number at 1 raises one (test-raiser, pure data)', () => {
    const bodies = [hex(14, 4), hex(16, 7), hex(12, 2), hex(10, 5)]
    const { ctx, owner, raised } = firstRaise(bodies, 'test-raiser', ONE)
    expect(raised).toHaveLength(1)
    expect(raised[0]!['hex']).toBe(nearest(ctx, owner.hex, bodies, 1)[0])
  })
})
