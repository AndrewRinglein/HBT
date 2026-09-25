// v2.thin-obstruction — Andrew, 2026-09-24 (engine/DECISIONS.md "the ground table,
// re-ruled", verbatim there). A thin upright obstruction — every woodland hex is one — is
// free to move onto, and:
//   • a ranged shot takes −5 for each thin-obstruction hex it ENTERS: every hex it passes
//     through and the target's own hex, never the shooter's own ("A thin obstruction in your
//     own hex does not count against your own shot, only against those who are shooting you
//     or people who are shooting through the hex");
//   • each thin obstruction between a unit and a hex cuts its Vision toward that hex by 1.
// Undergrowth does neither. The −5 is the accuracy ladder's OBSTRUCTION rung (450), one row
// per hex, each naming its cause.
import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { preview } from '../src/core/pipeline.js'
import { canSeeHex, fallNight } from '../src/core/vision.js'
import { beginActivation } from '../src/core/mutate.js'
import { executeMove, movePowerOf, reachable } from '../src/core/movement.js'
import { runBattle } from '../src/core/battle.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { moveCostOf, isThinGround } from '../src/content/maps.js'
import { TERRAIN } from '../src/core/types.js'
import type { Ctx } from '../src/core/types.js'

const BOW = 'attack.test-ranger.bow'
const AXE = 'attack.test-warrior.axe'
const row = (s: string) => Array(5).fill(s) as string[]
function rig(rows: string[], hero: string, heroHex: number, enemyHex: number, props: unknown[] = []): Ctx {
  const ctx = createBattle({ replicate: 0, map: { id: 'test.map.thin', name: 'Thin TEST', rows, props } as never, heroes: [hero], enemies: ['test-zombie'], heroHexes: [heroHex], enemyHexes: [enemyHex],
    cfg: { switches: { critEnabled: false } as never } })
  for (const u of ctx.state.units) { u.triggers = []; u.block = 0; u.rangedBlock = 0; u.hp = u.maxHp = 50 }
  return ctx
}
// Seven wide: the Ranger at hex 7 (row 1, col 0) shoots the zombie at hex 10 (row 1, col 3).
// A shot along a row enters only that row's hexes — 8, 9 and the target's 10.
const shot = (rows: string[]) => preview(rig(rows, 'test-ranger', 7, 10), 0, 1, BOW)
const thin = (p: ReturnType<typeof preview>) => p.accLedger.filter((r) => r.name === 'THIN_OBSTRUCTION')

describe('the shot — −5 per thin-obstruction hex it enters', () => {
  const open = shot(row('.......'))
  it('a shot across two woodland hexes into open ground is −10, one row per hex', () => {
    const p = shot(row('.ff....'))
    expect(thin(p)).toEqual([
      expect.objectContaining({ station: 450, effectId: 'terrain.woodland', delta: -5 }),
      expect.objectContaining({ station: 450, effectId: 'terrain.woodland', delta: -5 }),
    ])
    expect(p.accuracy).toBe(open.accuracy - 10)
  })
  it('into a woodland target from open ground across none: −15 concealment and −5 thin = −20', () => {
    const p = shot(row('...f...'))
    expect(p.accLedger.filter((r) => r.name === 'TERRAIN')).toEqual([expect.objectContaining({ station: 400, effectId: 'terrain.woodland', delta: -15 })])
    expect(thin(p)).toEqual([expect.objectContaining({ station: 450, effectId: 'terrain.woodland', delta: -5 })])
    expect(p.accuracy).toBe(open.accuracy - 20)
  })
  it("the shooter's own woodland adds nothing", () => {
    const p = shot(row('f......'))
    expect(thin(p)).toEqual([])
    expect(p.accuracy).toBe(open.accuracy)
  })
  it('undergrowth between adds no −5', () => {
    const p = shot(row('.uu....'))
    expect(isThinGround(TERRAIN.UNDERGROWTH)).toBe(false)
    expect(thin(p)).toEqual([])
    expect(p.accuracy).toBe(open.accuracy)
  })
  it('it stacks: two woodland hexes between AND a woodland target is −15 −5 −5 −5 = −30', () => {
    expect(shot(row('.fff...')).accuracy).toBe(open.accuracy - 30)
  })
  it('a swing is not a shot: melee into woodland pays the −7 concealment and no −5', () => {
    const swing = (rows: string[]) => preview(rig(rows, 'test-warrior', 9, 10), 0, 1, AXE)
    const p = swing(row('..ff...'))
    expect(thin(p)).toEqual([])
    expect(p.accuracy).toBe(swing(row('.......')).accuracy - 7)
  })
})

describe('vision — each thin obstruction between cuts it by 1', () => {
  // Twelve wide; the Ranger (Vision 6) at hex 12 = row 1, col 0. The night falls, and a hex
  // is seen only within sight.
  const W = 12, at = (col: number) => W + col
  const night = (rows: string[]) => { const ctx = rig(rows, 'test-ranger', at(0), 4 * W + 11); fallNight(ctx, 'test.night'); return ctx }
  const sees = (ctx: Ctx, col: number) => canSeeHex(ctx, ctx.state.units[0]!, at(col))
  it('open: sight reaches 6', () => {
    const ctx = night(row('............'))
    expect([sees(ctx, 6), sees(ctx, 7)]).toEqual([true, false])
  })
  it('through two thin obstructions it is 2 shorter', () => {
    const ctx = night(row('..ff........'))
    expect([sees(ctx, 4), sees(ctx, 5), sees(ctx, 6)]).toEqual([true, false, false])
  })
  it('the far hex being woodland is not "between"; nor are undergrowth hexes', () => {
    expect(sees(night(row('......f.....')), 6)).toBe(true)
    expect(sees(night(row('..uu........')), 6)).toBe(true)
  })
})

describe('moving onto a thin obstruction costs nothing extra', () => {
  it("woodland costs its own 2 to enter — the thin obstruction adds nothing to it", () => {
    expect(isThinGround(TERRAIN.WOODLAND)).toBe(true)
    expect(moveCostOf(TERRAIN.WOODLAND)).toBe(2)
  })
})

// Andrew, 2026-09-24 (DECISIONS.md "thin obstructions are a third kind of prop"): "there is a
// new high thin prop. If you were in a tile with a high thin prop -5 ranged attack you and
// anything shooting through that: there's both -1 vision and -5 range to shoot through it. If
// you are on it, you have no penalty." A prop of height `thin` — a sign here.
describe('a thin prop (a sign) does what a woodland hex does', () => {
  const sign = (hex: number, height = 'thin') => [{ id: 'prop.test.sign', height, material: 1, footprint: { kind: 'hex', hexes: [hex] } }]
  const shotPast = (props: unknown[]) => preview(rig(row('.......'), 'test-ranger', 7, 10, props), 0, 1, BOW)
  const open = shotPast([])
  it('a shot across a sign is −5, the row naming the sign', () => {
    const p = shotPast(sign(8))
    expect(thin(p)).toEqual([expect.objectContaining({ station: 450, effectId: 'prop.test.sign', delta: -5 })])
    expect(p.accuracy).toBe(open.accuracy - 5)
  })
  it("a sign in the target's hex is −5 — and nothing else: a sign is not woodland's concealment", () => {
    const p = shotPast(sign(10))
    expect(p.accLedger.filter((r) => r.name === 'TERRAIN')).toEqual([])
    expect(p.accuracy).toBe(open.accuracy - 5)
  })
  it("a sign in the shooter's own hex costs the shooter nothing", () => {
    expect(thin(shotPast(sign(7)))).toEqual([])
  })
  it('a hex that is woodland AND holds a sign counts once', () => {
    const p = preview(rig(row('.f.....'), 'test-ranger', 7, 10, sign(8)), 0, 1, BOW)
    expect(thin(p)).toEqual([expect.objectContaining({ effectId: 'terrain.woodland', delta: -5 })])
  })
  it('sight through two signs is 2 shorter', () => {
    const W = 12, props = [{ id: 'prop.test.sign-a', height: 'thin', material: 1, footprint: { kind: 'hex', hexes: [W + 2] } }, { id: 'prop.test.sign-b', height: 'thin', material: 1, footprint: { kind: 'hex', hexes: [W + 3] } }]
    const ctx = rig(row('............'), 'test-ranger', W, 4 * W + 11, props)
    fallNight(ctx, 'test.night')
    expect([4, 5].map((c) => canSeeHex(ctx, ctx.state.units[0]!, W + c))).toEqual([true, false])
  })
  it('a unit walks onto and through a sign at 1 a hex; a high prop there would stop it', () => {
    const ctx = rig(row('.......'), 'test-warrior', 0, 34, [...sign(1), { id: 'prop.test.sign-2', height: 'thin', material: 1, footprint: { kind: 'hex', hexes: [2] } }])
    const w = ctx.state.units[0]!
    beginActivation(ctx, 0, 'test')
    const before = w.movePointsLeft
    executeMove(ctx, 0, [1, 2, 3], movePowerOf(ctx, w, 'path')!)
    expect([w.hex, before - w.movePointsLeft]).toEqual([3, 3])
    const walled = rig(row('.......'), 'test-warrior', 0, 34, sign(1, 'high'))
    expect(reachable(walled, walled.state.units[0]!).has(1)).toBe(false)
  })
  it('a thin prop stands in whole hexes — a drawn shape is refused', () => {
    expect(() => rig(row('.......'), 'test-ranger', 7, 10, [{ id: 'prop.test.sign', height: 'thin', material: 1, footprint: { kind: 'polygon', vertices: [[0, 0], [100, 0], [100, 100]], movementPadding: 0 } }])).toThrow(/thin prop has a hex footprint/)
  })
  it('in the test.thin-sign scenario the Ranger shoots across the sign, and the zombie walks through it', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.thin-sign']!))
    runBattle(ctx)
    const shots = ctx.events.filter((e) => e.type === 'attack.declared' && JSON.stringify(e).includes('prop.test.sign'))
    expect(shots.length).toBeGreaterThan(0)
    // a one-row corridor: the sign stands in hex 4, and the zombie's walk goes through it
    const zombieSteps = ctx.events.filter((e) => e.type === 'moved' && e.actor === 1).map((e) => (e as unknown as { to: number }).to)
    expect(zombieSteps).toContain(4)
  })
})
