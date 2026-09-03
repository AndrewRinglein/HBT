// Attack-scoped triggers — `onlyWithAttack` on a Trigger fires it only when the
// firing context's cause IS that attack. Forced by Angela's Green Drake
// (2026-08-20): its breath applies 3 Poison on hit and its bite applies 1, so
// "onHit" alone cannot say which. This makes the Codex's "your fang attacks"
// phrasing data instead of an approximation. Retro-scoped variants: zombie rot
// rides the bite, snake venom rides the fangs — vacuous while each bearer has
// one attack, which is exactly what keeps this landing byte-identical.
import { describe, expect, it } from 'vitest'
import type { Trigger } from '../src/core/trigger.js'
import { validateTrigger } from '../src/core/trigger.js'
import { createCustomBattle } from '../src/core/setup.js'
import { performAttack } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { valueOf } from '../src/core/status.js'
import { UNITS } from '../src/content/index.js'
import { hexId } from '../src/core/hex.js'

function board() {
  const ctx = createCustomBattle(
    [{ type: 'test-warrior', hex: hexId(5, 5) }],
    [{ type: 'test-zombie', hex: hexId(5, 6) }],
  )
  const w = ctx.state.units[0]!, z = ctx.state.units[1]!
  w.mods.push({ stat: 'accuracy', op: 'add', value: 60, source: 'test', scope: 'unit' })  // never miss
  w.stamina = 99
  return { ctx, w, z }
}

describe('the differential — the same hook, two attacks, only one carries the rider', () => {
  it('a trigger scoped to the axe fires on axe hits and NEVER on Massive Strike hits', () => {
    const { ctx, w, z } = board()
    // synthetic scoped trigger, injected on the unit instance (plain data, 5b)
    const scoped: Trigger = {
      id: 'test.warrior.aimed-venom', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 2 },
      source: 'test', onlyWithAttack: 'attack.test-warrior.axe',
    }
    ;(w as { triggers: readonly Trigger[] }).triggers = [scoped]

    beginActivation(ctx, w.id, 'test')   // one primary per activation
    performAttack(ctx, w.id, z.id, 'attack.test-warrior.massive')
    expect(valueOf(z, 'status.poison')).toBe(0)          // wrong attack — silent

    beginActivation(ctx, w.id, 'test')
    performAttack(ctx, w.id, z.id, 'attack.test-warrior.axe')
    expect(valueOf(z, 'status.poison')).toBe(2)          // its attack — fires

    // and the wrong-attack case never even ROLLED — scope is a filter, not a miss
    const rolls = ctx.events.filter((e) => e.type === 'trigger.rolled' && e.causeId === 'test.warrior.aimed-venom')
    expect(rolls.length).toBe(1)
  })
})

describe('the retro-scoped variants — the Codex sentences as data', () => {
  it('rot rides the bite; venom rides the fangs', () => {
    expect(UNITS['test-zombie']!.triggers!.find((t) => t.id === 'trigger.zombie.rot')!.onlyWithAttack)
      .toBe('attack.test-zombie.bite')
    expect(UNITS['spirit-snake']!.triggers!.find((t) => t.id === 'trigger.spirit-snake.venom')!.onlyWithAttack)
      .toBe('attack.fangs.bite')
  })
})

describe('load-time validation (Law 9 — a content typo dies loudly)', () => {
  it('onlyWithAttack must name an attack id', () => {
    const bad: Trigger = {
      id: 'test.bad', hook: 'onHit', chance: 100, select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 },
      source: 'test', onlyWithAttack: 'status.poison',
    }
    expect(() => validateTrigger(bad)).toThrow(/onlyWithAttack/)
  })
})
