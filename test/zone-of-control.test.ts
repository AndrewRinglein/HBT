// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// movement.zone-of-control + movement.attack-of-opportunity (2026-09-03),
// REVERSED in part by fix.zoc-threat-not-stop (2026-09-04).
//
// GAME-DESIGN §4, Angela 2026-08-13: a standing unit exerts ZoC on its six
// adjacent hexes; leaving one provokes one free attack from the holder (its
// cheapest melee attack), once per holder per activation, costing the holder
// nothing. Angela 2026-09-04: "Zone of control is only a threat. If you do not
// stop moving, you are going to get whacked ... you get hit, and you lose
// movement, and you can no longer move. There is no held." So entering a ZoC
// ends nothing; a HIT from the provoked swing ends the move; a miss costs
// nothing. THE AI IS BLIND to it by ruling. Switch zoneOfControl keeps the
// pre-ZoC battle for paired sweeps.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { executeMove, reachable, pathTo, movePowerOf, zocHoldersAt } from '../src/core/movement.js'
import { beginActivation } from '../src/core/mutate.js'
import { hexId } from './board16.js'

describe('zone of control', () => {
  // LAW 10 — 2026-09-04 (fix.zoc-threat-not-stop): this test asserted the hard
  // stop ("ends its move on the first hex inside that zombie's ZoC") that the
  // ruling reverses. The rule now: the walk continues; the swing on the way out
  // is the whole of the threat.
  it('a unit pathing past an adjacent zombie walks THROUGH its ZoC when the provoked swing MISSES — no stop, no held', () => {
    // warrior at (2,5) walks east along row 5; a zombie stands at (5,4) —
    // (4,5) is inside its ZoC, (6,5) is beyond
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(2, 5) }], [{ type: 'test-zombie', hex: hexId(5, 4) }])
    const w = ctx.state.units[0]!, z = ctx.state.units[1]!
    z.mods.push({ stat: 'accuracy', op: 'add', value: -200, source: 'test', scope: 'unit' })   // it cannot hit
    expect(zocHoldersAt(ctx, w, hexId(4, 5)).map((u) => u.id)).toEqual([z.id])
    beginActivation(ctx, w.id, 'test')
    const walk = movePowerOf(ctx, w, 'path')!
    const reach = reachable(ctx, w, walk.move.budgetMod)
    const path = pathTo(reach, w.hex, hexId(6, 5))
    expect(path.at(-1)).toBe(hexId(6, 5))
    executeMove(ctx, w.id, path, walk)
    expect(w.hex).toBe(hexId(6, 5))
    // it provoked on the way out, missed, and nothing stopped
    expect(ctx.events.filter((e) => e.type === 'aoo.provoked').length).toBe(1)
    expect(ctx.events.some((e) => e.type === 'attack.declared' && e['actor'] === z.id)).toBe(true)
    expect(ctx.events.some((e) => e.type === 'move.stopped')).toBe(false)
    expect(JSON.stringify(ctx.events)).not.toContain('held')
  })

  it('a HIT from the provoked swing ends the move — the mover loses its movement and stops where it stands', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(2, 5) }], [{ type: 'test-zombie', hex: hexId(5, 4) }])
    const w = ctx.state.units[0]!, z = ctx.state.units[1]!
    z.mods.push({ stat: 'accuracy', op: 'add', value: 200, source: 'test', scope: 'unit' })   // it cannot miss
    w.hp = 99; w.maxHp = 99
    beginActivation(ctx, w.id, 'test')
    const walk = movePowerOf(ctx, w, 'path')!
    executeMove(ctx, w.id, pathTo(reachable(ctx, w, walk.move.budgetMod), w.hex, hexId(6, 5)), walk)
    expect(w.hex).toBe(hexId(4, 5))   // entered the zone freely; struck on the way out; went no further
    expect(w.movePointsLeft).toBe(0)
    const stop = ctx.events.find((e) => e.type === 'move.stopped')
    expect(stop?.['reason']).toBe('hit')
    expect(ctx.events.some((e) => e.type === 'damage.applied' && e['target'] === w.id)).toBe(true)
  })

  it('a holder that cannot practically hit still provokes, and its miss costs the mover nothing', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(2, 5) }], [{ type: 'test-zombie', hex: hexId(5, 4) }])
    const w = ctx.state.units[0]!, z = ctx.state.units[1]!
    z.mods.push({ stat: 'accuracy', op: 'add', value: -200, source: 'test', scope: 'unit' })
    const hp = w.hp
    beginActivation(ctx, w.id, 'test')
    const walk = movePowerOf(ctx, w, 'path')!
    const before = w.movePointsLeft
    executeMove(ctx, w.id, pathTo(reachable(ctx, w, walk.move.budgetMod), w.hex, hexId(6, 5)), walk)
    expect(ctx.events.filter((e) => e.type === 'aoo.provoked').length).toBe(1)
    expect(w.hp).toBe(hp)
    expect(w.movePointsLeft).toBe(before - 4)   // four open steps, nothing lost to the zone
  })

  it('downed units exert nothing', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(2, 5) }], [{ type: 'test-zombie', hex: hexId(5, 4) }])
    const z = ctx.state.units[1]!
    z.lifeState = 'downed'
    expect(zocHoldersAt(ctx, ctx.state.units[0]!, hexId(4, 5))).toEqual([])
  })

  it('with the switch off nothing stops', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(2, 5) }], [{ type: 'test-zombie', hex: hexId(5, 4) }])
    ctx.cfg.switches.zoneOfControl = false
    const w = ctx.state.units[0]!
    beginActivation(ctx, w.id, 'test')
    const walk = movePowerOf(ctx, w, 'path')!
    executeMove(ctx, w.id, pathTo(reachable(ctx, w, walk.move.budgetMod), w.hex, hexId(6, 5)), walk)
    expect(w.hex).toBe(hexId(6, 5))
    expect(ctx.events.some((e) => e.type === 'move.stopped')).toBe(false)
  })
})

describe('attack of opportunity', () => {
  it('leaving a hex inside a zombie\'s ZoC provokes ONE free swing, through performAttack, costing the zombie nothing', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const w = ctx.state.units[0]!, z = ctx.state.units[1]!
    z.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })
    const hpBefore = w.hp
    beginActivation(ctx, w.id, 'test')
    const walk = movePowerOf(ctx, w, 'path')!
    executeMove(ctx, w.id, pathTo(reachable(ctx, w, walk.move.budgetMod), w.hex, hexId(5, 2)), walk)
    const aoo = ctx.events.filter((e) => e.type === 'aoo.provoked')
    expect(aoo.length).toBe(1)
    expect(aoo[0]!.causeId).toBe('movement.aoo')
    expect(aoo[0]!['actor']).toBe(z.id)
    expect(ctx.events.some((e) => e.type === 'attack.declared' && e['actor'] === z.id)).toBe(true)
    expect(w.hp).toBeLessThan(hpBefore)
    expect(z.primaryUsed).toBe(false)
    expect(z.stamina).toBe(0)
  })

  it('the kiting ranger takes hits it never took before — measured across the standard panel (switch on vs off)', () => {
    const taken = (zoc: boolean) => {
      let n = 0
      for (let r = 0; r < 10; r++) {
        const ctx = createBattle({ replicate: r, enemyCount: 12, mapId: 'map.open' })
        ctx.cfg.switches.zoneOfControl = zoc
        runBattle(ctx)
        n += ctx.events.filter((e) => e.type === 'aoo.provoked').length
      }
      return n
    }
    expect(taken(false)).toBe(0)
    expect(taken(true)).toBeGreaterThan(0)
  })
})
