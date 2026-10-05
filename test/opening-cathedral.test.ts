// encounter.opening.cathedral (2026-10-01): battle 6 of the opening (DECISIONS.md 2026-09-28 "the
// Cathedral encounter"): the Necromancer at the altar raising two bodies a turn (reach 10), a Skeleton
// Archer up on the altar, two Skeletons before it; the Ground Check's 33 remains laid as bodies on
// cursed ground (capability.placed-remains, layer.weak); two Ghouls through the side doors on Turn 5,
// eating corpses. "When the body is raised, the cursed ground stays."
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { advanceBattle, completeActionCycle, runBattle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { setLifeState } from '../src/core/mutate.js'
import { encounterDef, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { layerOfId } from '../src/content/maps.js'
import type { Ctx } from '../src/core/types.js'
import { arrivedAt, deterministic, openingBattle } from './opening-helpers.js'

const S = 'test.opening-cathedral', ENC = 'encounter.opening.cathedral', RAISE = 'trigger.necromancer.raise'
// No replicate is won untouched on the party drafted by battle 6 (0 of 20, 2026-10-01 — the 2026-09-29
// count "Cathedral 0" before the upgrades, DECISIONS.md "the battles might be too hard"). Replicate 0
// runs to Turn 12 with the Ghouls eating.
const SEEN = 0
const field = (replicate: number): Ctx => createBattle({ ...scenarioOptions(scenarioDef(S), replicate), replicate, cfg: { switches: { boardClearWaitsForSchedule: true } } } as Parameters<typeof createBattle>[0])
const strike = (ctx: Ctx, id: number) => { ctx.state.units[id]!.hp = 0; setLifeState(ctx, id, 'dead', 'test', { reason: 'hp0' }) }
const raisedOn = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'unit.raised').map((e) => [e.turn, e.causeId] as const)

describe('encounter.opening.cathedral', () => {
  it('lays a body on every remains hex of the Ground Check, on cursed ground', () => {
    const e = encounterDef(ENC), ctx = field(SEEN)
    const hexes = e.remains!.flatMap((r) => r.hexes)
    expect(hexes).toHaveLength(33)
    expect(ctx.state.corpses!.map((c) => c.hex).sort((a, b) => a - b)).toEqual([...hexes].sort((a, b) => a - b))
    for (const h of hexes) expect(ctx.state.layers?.[h]).toBe(layerOfId('layer.weak'))
  })
  it('runs deterministically on its map', () => deterministic(S))
  it('the Necromancer raises two a turn from the remains', () => {
    const ctx = openingBattle(S, SEEN, true)
    const raised = raisedOn(ctx)
    expect(raised.every(([, cause]) => cause === RAISE)).toBe(true)
    const per = (t: number) => raised.filter(([turn]) => turn === t).length
    for (const t of [1, 2, 3, 4, 5]) expect(per(t), `Turn ${t}`).toBe(2)
    for (let t = 1; t <= ctx.state.turn; t++) expect(per(t)).toBeLessThanOrEqual(2)
  })
  it('raises none after the Necromancer dies', () => {
    const ctx = field(SEEN)
    const necro = ctx.state.units.find((u) => u.typeId === 'unit.necromancer')!.id
    while (true) {
      const next = advanceBattle(ctx)
      if (next.kind === 'complete') break
      if (ctx.state.turn === 3 && ctx.state.units[necro]!.lifeState === 'standing') strike(ctx, necro)
      if (ctx.state.units[next.actor]!.lifeState === 'standing') runActivation(ctx, next.actor)
      completeActionCycle(ctx)
    }
    const raised = raisedOn(ctx)
    expect(raised.filter(([t]) => t < 3)).toHaveLength(4)
    expect(raised.filter(([t]) => t >= 3)).toHaveLength(0)
  })
  it('the Ghouls arrive on Turn 5 through the side doors and eat', () => {
    const ctx = openingBattle(S, SEEN, true)
    arrivedAt(ctx, 5, 'unit.ghoul', 0, 22)
    arrivedAt(ctx, 5, 'unit.ghoul', 19, 22)
    const ghouls = new Set(ctx.state.units.filter((u) => u.typeId === 'unit.ghoul').map((u) => u.id))
    expect(ctx.events.some((e) => e.type === 'corpse.eaten' && ghouls.has(e.actor as number))).toBe(true)
  })
  it('every remains hex stays cursed after its body is raised or eaten', () => {
    const ctx = openingBattle(S, SEEN, true)
    const hexes = encounterDef(ENC).remains!.flatMap((r) => r.hexes)
    const gone = ctx.events.filter((e) => e.type === 'corpse.removed').length
    expect(gone).toBeGreaterThan(10)
    // Law 10, 2026-10-04 — capability.free-attack-accuracy (DECISIONS.md 2026-09-28, the Armory Ledger's rules: "'+10 counterattack' on a weapon is +10 Accuracy on your counterattacks."): this read
    //   for (const h of hexes) expect(ctx.state.layers?.[h], `hex ${h}`).toBe(layerOfId('layer.weak'))
    // — every remains hex still cursed at the battle's end, which held while nothing else painted one. The Longsword's holder answers
    // at +10 now, replicate 0 is another fight, and on its Turn 14 a mage's Flame Burst lays fire on a remains hex - over the curse,
    // as any ground a burst paints replaces what was there. The claim is the ruling's - "When the body is raised, the cursed ground
    // stays" - and is held exactly: a remains hex is cursed unless the log holds a later line that painted it, and no such line is
    // a raise's or an eating's.
    const RAISED_OR_EATEN = new Set(ctx.events.filter((e) => e.type === 'unit.raised' || e.type === 'corpse.eaten' || e.type === 'corpse.removed').map((e) => e.causeId))
    let cursed = 0
    for (const h of hexes) {
      const painted = ctx.events.filter((e) => e.type === 'layer.painted' && e['hex'] === h && e.causeId !== ENC)
      for (const p of painted) expect(RAISED_OR_EATEN.has(p.causeId), `hex ${h} was repainted by ${p.causeId}`).toBe(false)
      expect(ctx.state.layers?.[h], `hex ${h}`).toBe(painted.length ? painted[painted.length - 1]!['after'] : layerOfId('layer.weak'))
      if (!painted.length) cursed++
    }
    expect(cursed, 'the remains hexes nothing else painted are still cursed').toBeGreaterThan(hexes.length - 6)
  })
  it('is won when the last enemy dies, the Turn 5 Ghouls included', () => {
    // The four starting enemies are struck down at setup so the drafted party can finish the fight;
    // what is under test is the encounter's victory (clear the map, no limit), not its difficulty.
    const ctx = field(1)
    for (const u of ctx.state.units.filter((x) => x.side === 'enemy')) strike(ctx, u.id)
    runBattle(ctx)
    expect(ctx.state.outcome).toBe('heroClear')
    expect(ctx.state.turn).toBeGreaterThanOrEqual(5)
    const enemies = ctx.state.units.filter((u) => u.side === 'enemy')
    expect(enemies.filter((u) => u.typeId === 'unit.ghoul')).toHaveLength(2)
    expect(enemies.every((u) => u.lifeState !== 'standing')).toBe(true)
  })
})
