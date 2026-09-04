// movement.attack-of-opportunity (2026-09-03) — the edges of the rule:
// once per holder per activation, and a sidestep never provokes (GAME-DESIGN
// §4, ruled 2026-08-17: "free, never provokes").
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { executeMove, executeSidestep, reachable, pathTo, movePowerOf } from '../src/core/movement.js'
import { beginActivation } from '../src/core/mutate.js'
import { hexId } from './board16.js'

describe('attack of opportunity, at the edges', () => {
  it('two zombies adjacent: each provokes once, however many ZoC hexes the path crosses', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }],
      [{ type: 'test-zombie', hex: hexId(4, 5) }, { type: 'test-zombie', hex: hexId(6, 5) }])
    const w = ctx.state.units[0]!
    w.hp = 99; w.maxHp = 99
    beginActivation(ctx, w.id, 'test')
    const walk = movePowerOf(ctx, w, 'path')!
    executeMove(ctx, w.id, pathTo(reachable(ctx, w, walk.budgetMod), w.hex, hexId(5, 1)), walk)
    const by = ctx.events.filter((e) => e.type === 'aoo.provoked').map((e) => e['actor'])
    expect(new Set(by).size).toBe(by.length)
    expect(by.length).toBe(2)
  })

  it('a sidestep out of a zone never provokes', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const w = ctx.state.units[0]!
    beginActivation(ctx, w.id, 'test')
    const step = movePowerOf(ctx, w, 'sidestep')!
    executeSidestep(ctx, w.id, hexId(5, 4), step)
    expect(w.hex).toBe(hexId(5, 4))
    expect(ctx.events.some((e) => e.type === 'aoo.provoked')).toBe(false)
  })
})
