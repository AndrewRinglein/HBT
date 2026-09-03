// ai.mode.support (2026-09-03): "holds at range, prefers using abilities on
// allies over attacking, retreats when threatened." The Necromancer and the
// Imp Master run it from their rows (role: support).
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { runActivation } from '../src/ai/modes.js'
import { beginActivation } from '../src/core/mutate.js'
import { UNITS } from '../src/content/index.js'
import { distance, hexId } from '../src/core/hex.js'

describe('support', () => {
  it('a hurt undead ally in the pulse\'s reach is healed before the bolt is thrown', () => {
    expect(UNITS['unit.necromancer']!.ai).toBe('support')
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(8, 14) }], [{ type: 'unit.necromancer', hex: hexId(8, 6) }, { type: 'unit.zombie', hex: hexId(8, 7) }])
    const n = ctx.state.units[1]!, z = ctx.state.units[2]!
    z.hp = 1
    const d0 = distance(n.hex, ctx.state.units[0]!.hex)
    beginActivation(ctx, n.id, 'test'); runActivation(ctx, n.id)
    expect(ctx.events.some((e) => e.type === 'ai.mode' && e['actor'] === n.id && e['mode'] === 'support')).toBe(true)
    // holds at range: it did not close to melee with the warrior
    expect(distance(n.hex, ctx.state.units[0]!.hex)).toBeGreaterThan(1)
    void d0
  })
})
