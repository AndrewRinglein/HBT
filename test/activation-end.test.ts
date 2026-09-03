// fix.activation-end-fires (2026-09-03) — the End of Activation ladder's rung 2.
//
// `onActivationEnd` was in HOOKS, validated, glossed, and never called: a hook
// "indistinguishable from a working one until a piece of content depends on
// it" (COMBAT-SEQUENCE, End of Activation). The first content that depends on
// it is the test receptacle's `trigger.test-eoa.brace` on the Arc Golem:
// Protection 1 to self, every Activation. These tests are pipeline agreement
// — they read the trigger off the pack, never restate it.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { endOfActivation, runBattle } from '../src/core/battle.js'
import { beginActivation, endActivation } from '../src/core/mutate.js'
import { applyStatus, valueOf } from '../src/core/status.js'
import { UNITS } from '../src/content/index.js'
import { hexId } from '../src/core/hex.js'

const GOLEM = 'test-arc-golem'
const BRACE = 'trigger.test-eoa.brace'

function board() {
  const ctx = createCustomBattle(
    [{ type: GOLEM, hex: hexId(5, 5) }],
    [{ type: 'test-zombie', hex: hexId(9, 9) }],   // far away: nobody reaches anybody this activation
  )
  return { ctx, g: ctx.state.units[0]! }
}

describe('onActivationEnd fires, once per Activation', () => {
  it('the receptacle row carries the hook — the test depends on content, not on a synthetic trigger', () => {
    const t = UNITS[GOLEM]!.triggers?.find((x) => x.id === BRACE)
    expect(t, `${BRACE} is on the golem`).toBeDefined()
    expect(t!.hook).toBe('onActivationEnd')
  })

  it('a unit that neither moved nor acted still fires it exactly once, and the effect lands', () => {
    const { ctx, g } = board()
    beginActivation(ctx, g.id, 'test')
    endActivation(ctx, g.id, 'test')
    endOfActivation(ctx, g.id)
    const rolled = ctx.events.filter((e) => e.type === 'trigger.rolled' && e.causeId === BRACE)
    expect(rolled.length).toBe(1)
    expect(rolled[0]!['hook']).toBe('onActivationEnd')
    expect(rolled[0]!['fired']).toBe(true)
    // the effect landed — and rung 3 (the status tick) then decayed it by the
    // status's own decay, in the same ladder, exactly as COMBAT-SEQUENCE orders
    // the rungs (embers: catch, then cook). Pipeline agreement, both numbers
    // read off the rows.
    const value = (UNITS[GOLEM]!.triggers!.find((x) => x.id === BRACE)!.effect as { value: number }).value
    const decay = ctx.statuses['status.protection']!.decayPerPhase ?? 1
    const applied = ctx.events.find((e) => e.type === 'status.applied' && e.causeId === BRACE)
    expect(applied?.['amount']).toBe(value)
    expect(valueOf(g, 'status.protection')).toBe(value - decay)
  })

  it('a STUNNED unit (idle activation) still reaches the ladder and fires it', () => {
    const { ctx, g } = board()
    applyStatus(ctx, g.id, 'status.stun', 1, 'test')
    runBattle(ctx)
    const idle = ctx.events.filter((e) => e.type === 'activation.idle' && e['actor'] === g.id)
    expect(idle.length, 'the stun produced at least one idle activation').toBeGreaterThan(0)
    const firstIdle = idle[0]!.seq
    const nextEnd = ctx.events.find((e) => e.seq > firstIdle && e.type === 'activation.end' && e['actor'] === g.id)
    const after = ctx.events.find((e) => e.seq > firstIdle && e.type === 'trigger.rolled' && e.causeId === BRACE)
    expect(after, 'the idle activation fired the hook').toBeDefined()
    expect(after!.seq).toBeGreaterThan(nextEnd!.seq)   // after activation.end, i.e. in the ladder
  })

  it('over a whole battle the count equals the golem\'s activations — never twice, never zero', () => {
    const { ctx, g } = board()
    runBattle(ctx)
    const ends = ctx.events.filter((e) => e.type === 'activation.end' && e['actor'] === g.id).length
    const rolls = ctx.events.filter((e) => e.type === 'trigger.rolled' && e.causeId === BRACE).length
    expect(ends).toBeGreaterThan(0)
    expect(rolls).toBe(ends)
  })
})
