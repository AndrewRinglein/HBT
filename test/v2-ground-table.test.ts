// v2.ground-table — V2 R7 part 3: the ground a unit stands in (COMBAT-V2-DESIGN-2026-09-07
// §3.2, ruled 2026-09-07).
//
//   Grass, wheat   −10 ranged accuracy against you · normal move
//   Bush           −10 ranged accuracy against you · +1 (difficult)
//   Woodland       −15 ranged, −7 melee accuracy against you · +1 · does not block LOS
//   Lava           3 fire damage and 2 Burn on entry, and again at end of activation;
//                  the 3 meets Fire Resist; being knocked into lava is entering it
//
// Concealment is the accuracy ladder's TERRAIN rung (400), read off the TARGET's ground.
// Every way into a hex goes through core/ground.ts. Defaults the document does not
// answer are SWITCHES.md "V2 ground table".
import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { preview } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { runBattle, endOfActivation } from '../src/core/battle.js'
import { executeMove, executeKnockback, movePowerOf } from '../src/core/movement.js'
import { accuracyAgainstOf, hazardOf, moveCostOf, GLYPH } from '../src/content/maps.js'
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

describe('the table is COMBAT-V2 §3.2, copied', () => {
  it('grass and wheat hide from ranged only, at normal cost; bush and woodland cost +1', () => {
    expect([TERRAIN.GRASS, TERRAIN.WHEAT, TERRAIN.BUSH, TERRAIN.WOODLAND, TERRAIN.LAVA].map(moveCostOf)).toEqual([1, 1, 2, 2, 1])
    expect([TERRAIN.GRASS, TERRAIN.WHEAT, TERRAIN.BUSH, TERRAIN.WOODLAND].map((t) => accuracyAgainstOf(t, 'ranged'))).toEqual([-10, -10, -10, -15])
    expect([TERRAIN.GRASS, TERRAIN.WHEAT, TERRAIN.BUSH, TERRAIN.WOODLAND].map((t) => accuracyAgainstOf(t, 'melee'))).toEqual([0, 0, 0, -7])
    expect(hazardOf(TERRAIN.LAVA)).toEqual({ damageType: 'fire', damage: 3, applies: [['status.burn', 2]] })
    expect(hazardOf(TERRAIN.GRASS)).toBeNull()
    expect([GLYPH['g'], GLYPH['y'], GLYPH['u'], GLYPH['o'], GLYPH['l']]).toEqual([TERRAIN.GRASS, TERRAIN.WHEAT, TERRAIN.BUSH, TERRAIN.WOODLAND, TERRAIN.LAVA])
  })
})

describe('concealment — the TERRAIN rung reads the target\'s ground', () => {
  it('a shot into grass is 10 worse than the same shot into the open, and the ledger names the grass', () => {
    const open = preview(rig(row('.......'), 'test-ranger', 7, 10), 0, 1, BOW)
    const grass = preview(rig(row('...g...'), 'test-ranger', 7, 10), 0, 1, BOW)
    expect(terrainRow(open)).toEqual([])
    expect(terrainRow(grass)).toEqual([expect.objectContaining({ station: 400, effectId: 'terrain.grass', delta: -10 })])
    expect(grass.accuracy).toBe(open.accuracy - 10)
  })
  it('woodland takes 15 from a shot and 7 from a swing; grass takes nothing from a swing', () => {
    const shot = preview(rig(row('...o...'), 'test-ranger', 7, 10), 0, 1, BOW)
    expect(terrainRow(shot)).toEqual([expect.objectContaining({ effectId: 'terrain.woodland', delta: -15 })])
    const swing = preview(rig(row('...o...'), 'test-warrior', 9, 10), 0, 1, AXE)
    expect(terrainRow(swing)).toEqual([expect.objectContaining({ effectId: 'terrain.woodland', delta: -7 })])
    expect(terrainRow(preview(rig(row('...g...'), 'test-warrior', 9, 10), 0, 1, AXE))).toEqual([])
  })
  it('the shooter\'s own ground hides nothing — standing in bush does not blur your own aim', () => {
    const open = preview(rig(row('.......'), 'test-ranger', 7, 10), 0, 1, BOW)
    const fromBush = preview(rig(row('u......'), 'test-ranger', 7, 10), 0, 1, BOW)
    expect(fromBush.accuracy).toBe(open.accuracy)
  })
  it('woodland and low cover stack — two rows, −15 and −20', () => {
    const crates = [{ id: 'prop.test.crates', height: 'low', material: 1, footprint: { kind: 'hex', hexes: [10] } }]
    const open = preview(rig(row('.......'), 'test-ranger', 7, 10), 0, 1, BOW)
    const both = preview(rig(row('...o...'), 'test-ranger', 7, 10, crates), 0, 1, BOW)
    expect(both.accLedger.filter((r) => r.name === 'TERRAIN' || r.name === 'COVER').map((r) => r.delta)).toEqual([-15, -20])
    expect(both.accuracy).toBe(open.accuracy - 35)
  })
})

describe('lava — the two-beat hazard', () => {
  it('walking in deals 3 fire and 2 Burn, named for the lava', () => {
    const ctx = rig(row('..l....'), 'test-warrior', 0, 34)
    const w = ctx.state.units[0]!
    beginActivation(ctx, 0, 'test')
    executeMove(ctx, 0, [1, 2, 3], movePowerOf(ctx, w, 'path')!)
    expect(lavaHits(ctx)).toHaveLength(1)
    expect(lavaHits(ctx)[0]).toMatchObject({ amount: 3, damageType: 'fire', hazard: true, target: 0 })
    expect(burn(w)).toBe(2)
    expect(w.hp).toBe(47)
    expect(w.hex).toBe(3)
  })
  it('and again at end of activation if still there — the second beat', () => {
    const ctx = rig(row('..l....'), 'test-warrior', 0, 34)
    const w = ctx.state.units[0]!
    beginActivation(ctx, 0, 'test')
    executeMove(ctx, 0, [1, 2], movePowerOf(ctx, w, 'path')!)
    endOfActivation(ctx, 0)
    expect(lavaHits(ctx).map((e) => e.amount)).toEqual([3, 3])
    // 2 on entry + 2 at the end; the tick that follows then burns and decays it
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
    expect(burn(z)).toBe(2)
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
  it('test.ground-table: zombies wade the lava and cross the vegetation, and it replays byte for byte', () => {
    const run = () => { const ctx = createBattle(scenarioOptions(SCENARIOS['test.ground-table']!)); runBattle(ctx); return ctx }
    const a = run()
    expect(lavaHits(a).length).toBeGreaterThan(0)
    expect(a.events.some((e) => e.type === 'moved' && JSON.stringify(e).includes('terrain.woodland'))).toBe(true)
    expect(JSON.stringify(run().events)).toBe(JSON.stringify(a.events))
  })
})
