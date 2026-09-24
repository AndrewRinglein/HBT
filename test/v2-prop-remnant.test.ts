// fix.prop-destroyed-remnant — V2 R7 (COMBAT-V2-DESIGN-2026-09-07 §15.1: prop.destroyed
// carries "what it leaves behind"). When destroyed high cover leaves low cover, the event
// states the remnant prop itself, so a reader copies the fact instead of re-deriving the
// §12.3 rule (the viewer draws, it never decides). A prop that leaves nothing carries none.
import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { beginActivation } from '../src/core/mutate.js'
import { attackProp } from '../src/core/prop-attack.js'
import type { Ctx } from '../src/core/types.js'

const CHOP = 'attack.test-destroy.chop'
function rig(props: unknown[]): Ctx {
  const ctx = createBattle({ replicate: 0, map: { id: 'test.map.remnant', name: 'Remnant TEST', rows: Array(5).fill('.......'), props } as never,
    heroes: ['test-destroy-chopper'], enemies: ['test-zombie'], heroHexes: [9], enemyHexes: [34] })
  beginActivation(ctx, 0, 'test')
  return ctx
}

describe('prop.destroyed states what it leaves behind', () => {
  it('high cover: the remnant is the low prop now in state, detached', () => {
    const ctx = rig([{ id: 'prop.test.log', height: 'high', material: 1, collisionValue: 3, footprint: { kind: 'hex', hexes: [10] } }])
    attackProp(ctx, 0, 10, CHOP)
    const e = ctx.events.find((x) => x.type === 'prop.destroyed')!
    expect(e['leaves']).toBe('low')
    expect(e['remnant']).toEqual({ id: 'prop.test.log', height: 'low', material: 1, footprint: { kind: 'hex', hexes: [10] } })
    expect(e['remnant']).toEqual(ctx.state.props[0])
    expect(e['remnant']).not.toBe(ctx.state.props[0])
  })
  it('low cover leaves nothing and carries no remnant', () => {
    const ctx = rig([{ id: 'prop.test.crates', height: 'low', material: 1, footprint: { kind: 'hex', hexes: [10] } }])
    attackProp(ctx, 0, 10, CHOP)
    const e = ctx.events.find((x) => x.type === 'prop.destroyed')!
    expect(e['leaves']).toBe('nothing')
    expect(Object.hasOwn(e, 'remnant')).toBe(false)
  })
})
