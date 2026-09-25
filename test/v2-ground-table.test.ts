// v2.ground-table — V2 R7 part 3: the ground a unit stands in.
//
// Law 10, REWRITTEN by v2.ground-retable (2026-09-24): the rule changed by ruling, not the
// code under test. Andrew re-ruled COMBAT-V2 §3.2 the same day (engine/DECISIONS.md "the
// ground table, re-ruled", verbatim there): grass, wheat and bush are ONE ground,
// undergrowth, at 1 move; lava costs 2 and gives 1 Burn, not 2; marsh, desert and ruins
// join. Every assertion below reads the ruled table; the old −10-on-grass and 2-Burn
// numbers were a finding, not a rule.
//
//   Undergrowth  1 move · −10 ranged accuracy against you
//   Woodland     2 move · −15 ranged, −7 melee accuracy against you
//   Lava         2 move · 3 fire + 1 Burn on entry, and again at end of activation
//   Marsh        2 move · −5 accuracy, −10 Dodge to whoever is in it · strips 1 Burn at end of activation
//   Desert       −5 Dodge to whoever is in it
//   Ruins        behaves like rocky ground (the same trait — Climber reads one)
//
// Concealment is the accuracy ladder's TERRAIN rung (400), read off the TARGET's ground.
// Every way into a hex goes through core/ground.ts.
import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { preview } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { runBattle, endOfActivation } from '../src/core/battle.js'
import { executeMove, executeKnockback, movePowerOf } from '../src/core/movement.js'
import { accuracyAgainstOf, accuracyBonusOf, armorBonusOf, dodgeBonusOf, hazardOf, moveCostOf, resistBonusOf, stripsOnActivationEndOf, GLYPH } from '../src/content/maps.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { TERRAIN } from '../src/core/types.js'
import type { Ctx, Event, Unit } from '../src/core/types.js'

const BOW = 'attack.test-ranger.bow'
const AXE = 'attack.test-warrior.axe'
// Seven wide, five tall; hex = row * 7 + col, and the same row's col ± 1 are adjacent.
const board = (rows: string[], props: unknown[] = []) => ({ id: 'test.map.ground', name: 'Ground TEST', rows, props })
const row = (s: string) => Array(5).fill(s) as string[]

function rig(rows: string[], hero: string, heroHex: number, enemyHex: number, props: unknown[] = []): Ctx {
  const ctx = createBattle({ replicate: 0, map: board(rows, props) as never, heroes: [hero], enemies: ['test-zombie'], heroHexes: [heroHex], enemyHexes: [enemyHex],
    cfg: { switches: { critEnabled: false } as never } })
  for (const u of ctx.state.units) { u.triggers = []; u.block = 0; u.rangedBlock = 0; u.hp = u.maxHp = 50 }
  return ctx
}
const terrainRow = (p: ReturnType<typeof preview>) => p.accLedger.filter((r) => r.name === 'TERRAIN')
const lavaHits = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'damage.applied' && e.causeId === 'terrain.lava') as (Event & { amount: number; resisted?: number; damageType: string; hazard: boolean })[]
const burn = (u: Unit) => u.statuses.find((s) => s.id === 'status.burn')?.value ?? 0
const fireResist = (u: Unit, n: number) => u.mods.push({ stat: 'fireResist', op: 'add', value: n, source: 'test', scope: 'unit' })
const shot = (rows: string[]) => preview(rig(rows, 'test-ranger', 7, 10), 0, 1, BOW)

describe('the table is the 2026-09-24 ruling, copied', () => {
  it('move costs: undergrowth 1, woodland 2, lava 2, marsh 2, desert 1, ruins 2', () => {
    expect([TERRAIN.UNDERGROWTH, TERRAIN.WOODLAND, TERRAIN.LAVA, TERRAIN.MARSH, TERRAIN.DESERT, TERRAIN.RUINS].map(moveCostOf)).toEqual([1, 2, 2, 2, 1, 2])
  })
  it('concealment: undergrowth −10 ranged; woodland −15 ranged and −7 melee; nothing else hides', () => {
    expect([TERRAIN.UNDERGROWTH, TERRAIN.WOODLAND, TERRAIN.MARSH, TERRAIN.DESERT].map((t) => accuracyAgainstOf(t, 'ranged'))).toEqual([-10, -15, 0, 0])
    expect([TERRAIN.UNDERGROWTH, TERRAIN.WOODLAND].map((t) => accuracyAgainstOf(t, 'melee'))).toEqual([0, -7])
  })
  it('lava is 3 fire and 1 Burn; marsh −5 accuracy, −10 Dodge and a Burn washed off; desert −5 Dodge', () => {
    expect(hazardOf(TERRAIN.LAVA)).toEqual({ damageType: 'fire', damage: 3, applies: [['status.burn', 1]] })
    expect(hazardOf(TERRAIN.UNDERGROWTH)).toBeNull()
    expect([accuracyBonusOf(TERRAIN.MARSH), dodgeBonusOf(TERRAIN.MARSH), stripsOnActivationEndOf(TERRAIN.MARSH)]).toEqual([-5, -10, ['status.burn']])
    expect([accuracyBonusOf(TERRAIN.DESERT), dodgeBonusOf(TERRAIN.DESERT)]).toEqual([0, -5])
  })
  it('ruins behave like rocky ground — every number the same', () => {
    const of = (t: number) => [moveCostOf(t), accuracyBonusOf(t), armorBonusOf(t), resistBonusOf(t), dodgeBonusOf(t)]
    expect(of(TERRAIN.RUINS)).toEqual(of(TERRAIN.ROCKY))
    expect(of(TERRAIN.RUINS)).toEqual([2, -5, 1, 1, 0])
  })
  it('glyphs: u undergrowth, o woodland, l lava, m marsh, d desert, n ruins', () => {
    expect(['u', 'o', 'l', 'm', 'd', 'n'].map((g) => GLYPH[g])).toEqual([TERRAIN.UNDERGROWTH, TERRAIN.WOODLAND, TERRAIN.LAVA, TERRAIN.MARSH, TERRAIN.DESERT, TERRAIN.RUINS])
  })
})

describe('concealment — the TERRAIN rung reads the target\'s ground', () => {
  it('a shot into undergrowth is 10 worse than the same shot into the open, and the ledger names it', () => {
    const open = shot(row('.......')), under = shot(row('...u...'))
    expect(terrainRow(open)).toEqual([])
    expect(terrainRow(under)).toEqual([expect.objectContaining({ station: 400, effectId: 'terrain.undergrowth', delta: -10 })])
    expect(under.accuracy).toBe(open.accuracy - 10)
  })
  it('woodland takes 15 from a shot and 7 from a swing; undergrowth takes nothing from a swing', () => {
    expect(terrainRow(shot(row('...o...')))).toEqual([expect.objectContaining({ effectId: 'terrain.woodland', delta: -15 })])
    expect(terrainRow(preview(rig(row('...o...'), 'test-warrior', 9, 10), 0, 1, AXE))).toEqual([expect.objectContaining({ effectId: 'terrain.woodland', delta: -7 })])
    expect(terrainRow(preview(rig(row('...u...'), 'test-warrior', 9, 10), 0, 1, AXE))).toEqual([])
  })
  it('the shooter\'s own undergrowth does not blur its aim', () => {
    expect(shot(row('u......')).accuracy).toBe(shot(row('.......')).accuracy)
  })
  it('woodland and low cover stack — two rows, −15 and −20', () => {
    const crates = [{ id: 'prop.test.crates', height: 'low', material: 1, footprint: { kind: 'hex', hexes: [10] } }]
    const both = preview(rig(row('...o...'), 'test-ranger', 7, 10, crates), 0, 1, BOW)
    expect(both.accLedger.filter((r) => r.name === 'TERRAIN' || r.name === 'COVER').map((r) => r.delta)).toEqual([-15, -20])
    expect(both.accuracy).toBe(shot(row('.......')).accuracy - 35)
  })
})

describe('marsh, desert and ruins — what they do to whoever is in them', () => {
  it('a target in marsh is 10 easier to hit, a target in desert 5 easier', () => {
    const open = shot(row('.......')).accuracy
    expect(shot(row('...m...')).accuracy).toBe(open + 10)
    expect(shot(row('...d...')).accuracy).toBe(open + 5)
  })
  it('a shooter in marsh aims 5 worse; a shooter in ruins aims exactly as one on rocky ground', () => {
    const open = shot(row('.......')).accuracy
    expect(shot(row('m......')).accuracy).toBe(open - 5)
    expect(shot(row('n......')).accuracy).toBe(shot(row('r......')).accuracy)
    expect(shot(row('n......')).accuracy).toBe(open - 5)
  })
  it('standing in marsh at end of activation washes off 1 Burn, named for the marsh', () => {
    const ctx = rig(row('m......'), 'test-warrior', 0, 34)
    const w = ctx.state.units[0]!
    w.statuses.push({ id: 'status.burn', value: 3 } as never)
    beginActivation(ctx, 0, 'test')
    endOfActivation(ctx, 0)
    expect(ctx.events.some((e) => e.type === 'status.reduced' && e.causeId === 'terrain.marsh')).toBe(true)
  })
})

describe('lava — the two-beat hazard', () => {
  it('walking in costs 2 and deals 3 fire and 1 Burn, named for the lava', () => {
    const ctx = rig(row('..l....'), 'test-warrior', 0, 34)
    const w = ctx.state.units[0]!
    beginActivation(ctx, 0, 'test')
    const before = w.movePointsLeft
    executeMove(ctx, 0, [1, 2, 3], movePowerOf(ctx, w, 'path')!)
    expect(lavaHits(ctx)).toHaveLength(1)
    expect(lavaHits(ctx)[0]).toMatchObject({ amount: 3, damageType: 'fire', hazard: true, target: 0 })
    expect(burn(w)).toBe(1)
    expect(w.hp).toBe(47)
    expect(w.hex).toBe(3)
    expect(before - w.movePointsLeft).toBe(4)
  })
  it('and again at end of activation if still there — the second beat', () => {
    const ctx = rig(row('..l....'), 'test-warrior', 0, 34)
    const w = ctx.state.units[0]!
    beginActivation(ctx, 0, 'test')
    executeMove(ctx, 0, [1, 2], movePowerOf(ctx, w, 'path')!)
    endOfActivation(ctx, 0)
    expect(lavaHits(ctx).map((e) => e.amount)).toEqual([3, 3])
    const applied = ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === 'terrain.lava')
    expect(applied).toHaveLength(2)
  })
  it('Fire Resist 3 walks through untouched — the line still says why', () => {
    const ctx = rig(row('..l....'), 'test-warrior', 0, 34)
    const w = ctx.state.units[0]!
    fireResist(w, 3)
    beginActivation(ctx, 0, 'test')
    executeMove(ctx, 0, [1, 2, 3], movePowerOf(ctx, w, 'path')!)
    expect(lavaHits(ctx)[0]).toMatchObject({ amount: 0, resisted: 3 })
    expect(w.hp).toBe(50)
  })
  it('lava that kills a walker stops the walk', () => {
    const ctx = rig(row('..l....'), 'test-warrior', 0, 34)
    const w = ctx.state.units[0]!
    w.hp = 2
    beginActivation(ctx, 0, 'test')
    executeMove(ctx, 0, [1, 2, 3, 4], movePowerOf(ctx, w, 'path')!)
    expect(w.lifeState).not.toBe('standing')
    expect(w.hex).toBe(2)
  })
  it('being knocked into lava is entering it, not a collision', () => {
    const ctx = rig(row('...l...'), 'test-warrior', 8, 9)
    const z = ctx.state.units[1]!
    expect(executeKnockback(ctx, 0, 1, 1, 'test')).toBe(1)
    expect(z.hex).toBe(10)
    expect(lavaHits(ctx)).toHaveLength(1)
    expect(lavaHits(ctx)[0]).toMatchObject({ amount: 3, target: 1 })
    expect(burn(z)).toBe(1)
    expect(ctx.events.some((e) => e.type === 'damage.applied' && (e as { collision?: boolean }).collision)).toBe(false)
  })
  it('a push is a hazard entry only — pushed into water keeps its Burn (the v1 beats stay step-only)', () => {
    const ctx = rig(row('...w...'), 'test-warrior', 8, 9)
    const z = ctx.state.units[1]!
    z.statuses.push({ id: 'status.burn', value: 3 } as never)
    executeKnockback(ctx, 0, 1, 1, 'test')
    expect(z.hex).toBe(10)
    expect(burn(z)).toBe(3)
  })
})

describe('live in a battle', () => {
  it('test.ground-table: zombies wade the lava and cross the grounds, and it replays byte for byte', () => {
    const run = () => { const ctx = createBattle(scenarioOptions(SCENARIOS['test.ground-table']!)); runBattle(ctx); return ctx }
    const a = run()
    expect(lavaHits(a).length).toBeGreaterThan(0)
    expect(a.events.some((e) => e.type === 'moved' && JSON.stringify(e).includes('terrain.woodland'))).toBe(true)
    expect(JSON.stringify(run().events)).toBe(JSON.stringify(a.events))
  })
})
