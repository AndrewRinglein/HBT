import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { previewPower, usePower } from '../src/core/ability.js'
import { beginActivation } from '../src/core/mutate.js'
import { applyStatus, valueOf } from '../src/core/status.js'

const DOUBLE = 'power.test-ordered-double'
const STRIP = 'power.test-ordered-strip'
function board(kind = 'double', protection = 3) {
  const ctx = createCustomBattle(
    [{ type: `test-ordered-${kind}`, hex: 85 }],
    [{ type: 'test-zombie', hex: 86 }],
  )
  ctx.state.units[1]!.hp = ctx.state.units[1]!.maxHp = 40
  ctx.state.units[1]!.resist = 0
  beginActivation(ctx, 0, 'test')
  if (protection) applyStatus(ctx, 1, 'status.protection', protection, 'test')
  return ctx
}

describe('ordered power previews', () => {
  it.each([0, 3, 5, 10, 12])('shares a Protection pool of %i across both packets', (pool) => {
    const ctx = board('double', pool)
    const before = structuredClone({ state: ctx.state, events: ctx.events, rng: ctx.rng })
    const shown = previewPower(ctx, 0, 1, DOUBLE).damage
    expect(shown).toBe(Math.max(0, 10 - pool))
    expect(previewPower(ctx, 0, 1, DOUBLE).damage).toBe(shown)
    expect({ state: ctx.state, events: ctx.events, rng: ctx.rng }).toEqual(before)
    const hp = ctx.state.units[1]!.hp
    expect(usePower(ctx, 0, 1, DOUBLE).damage).toBe(shown)
    expect(hp - ctx.state.units[1]!.hp).toBe(shown)
    expect(valueOf(ctx.state.units[1]!, 'status.protection')).toBe(Math.max(0, pool - 10))
  })

  it('applies status removal before previewing the following strike', () => {
    const ctx = board('strip', 20)
    const before = structuredClone({ state: ctx.state, events: ctx.events, rng: ctx.rng })
    expect(previewPower(ctx, 0, 1, STRIP).damage).toBe(7)
    expect({ state: ctx.state, events: ctx.events, rng: ctx.rng }).toEqual(before)
    expect(usePower(ctx, 0, 1, STRIP).damage).toBe(7)
    expect(valueOf(ctx.state.units[1]!, 'status.protection')).toBe(0)
  })

  it('uses the same mitigation order for every packet', () => {
    const ctx = board()
    ctx.state.units[1]!.resist = 1
    // Current pipeline: Protection first, then Resist on each packet: (5-3-1)+(5-1).
    expect(previewPower(ctx, 0, 1, DOUBLE).damage).toBe(5)
    expect(usePower(ctx, 0, 1, DOUBLE).damage).toBe(5)
  })
})
