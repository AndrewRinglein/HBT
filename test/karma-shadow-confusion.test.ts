// capability.karma / capability.shadow / capability.confusion (2026-09-03) —
// the last three Codex status rows that were named gaps.
//   Karma: "Increases every heal the unit receives by its value, and every
//          point of damage it deals by half its value." "-1 on a kill."
//   Shadow: "Obliterates the unit — killed, removed, no corpse — once it
//          reaches the unit's Max Health." "+1 per Turn, first in Settling."
//   Confusion: "Swaps the affected unit's AI strategy for a different one."
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { runBattle, endOfActivation } from '../src/core/battle.js'
import { preview, performAttack } from '../src/core/pipeline.js'
import { applyStatus, valueOf, tickUnitStatuses } from '../src/core/status.js'
import { applyHealing, beginActivation, endActivation } from '../src/core/mutate.js'
import { runActivation } from '../src/ai/modes.js'
import { STATUSES } from '../src/content/statuses.js'
import { hexId } from './board16.js'
import { settle } from '../src/core/settle.js'

const board = () => {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
  return { ctx, w: ctx.state.units[0]!, z: ctx.state.units[1]! }
}

describe('Karma', () => {
  it('heals received grow by its value; hits dealt by half, rounded down; a kill takes one', () => {
    expect(STATUSES['status.karma']!.decayPerPhase).toBe(0)
    const { ctx, w, z } = board()
    const base = preview(ctx, w.id, z.id, 'attack.test-warrior.axe').damageOnHit
    applyStatus(ctx, w.id, 'status.karma', 3, 'test')
    expect(preview(ctx, w.id, z.id, 'attack.test-warrior.axe').damageOnHit).toBe(base + 1)
    w.hp = 1
    applyHealing(ctx, w.id, 2, 'test')
    expect(w.hp).toBe(Math.min(w.maxHp, 1 + 2 + 3))
    w.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })
    w.stamina = 99; z.hp = 1
    beginActivation(ctx, w.id, 'test')
    performAttack(ctx, w.id, z.id, 'attack.test-warrior.axe')
    settle(ctx, 'test')
    expect(z.lifeState).toBe('dead')
    expect(valueOf(w, 'status.karma')).toBe(2)
    // and it does not tick down on the clock
    beginActivation(ctx, w.id, 'test'); endActivation(ctx, w.id, 'test'); endOfActivation(ctx, w.id)
    expect(valueOf(w, 'status.karma')).toBe(2)
  })
})

describe('Shadow', () => {
  it('grows by 1 each tick, and at Max Health the unit is obliterated — dead, no corpse, no downed', () => {
    const { ctx, w } = board()
    applyStatus(ctx, w.id, 'status.shadow', w.maxHp - 2, 'test')
    tickUnitStatuses(ctx, w.id)
    expect(valueOf(w, 'status.shadow')).toBe(w.maxHp - 1)
    expect(w.lifeState).toBe('standing')
    tickUnitStatuses(ctx, w.id)
    expect(w.lifeState).toBe('dead')
    const ob = ctx.events.find((e) => e.type === 'unit.obliterated')
    expect(ob?.['target']).toBe(w.id)
    expect(ctx.events.find((e) => e.type === 'life.dead' && e['target'] === w.id)?.['corpse']).toBe(false)
    expect(ctx.events.some((e) => e.type === 'life.downed' && e['target'] === w.id)).toBe(false)
  })
})

describe('Confusion', () => {
  it('a confused unit runs a different AI mode, and the log names the swap', () => {
    const { ctx, z } = board()
    applyStatus(ctx, z.id, 'status.confusion', 1, 'test')
    beginActivation(ctx, z.id, 'test')
    runActivation(ctx, z.id)
    const m = ctx.events.filter((e) => e.type === 'ai.mode' && e['actor'] === z.id).pop()!
    expect(m['mode']).not.toBe(z.ai)
    expect(m['confusedFrom']).toBe(z.ai)
  })
  it('all three show in the arc-variant battle through the golem\'s test riders', () => {
    // LAW 10 — 2026-09-04 (fix.knockback-beyond-one, FINDING 35): the golem's
    // accuracy was 5 and is 65 now; on replicate 0 its single-target swings
    // finish the zombies before every sweep rider has fired. Same claim, over
    // the first few replicates.
    const want = ['status.karma', 'status.shadow', 'status.confusion']
    const seen = new Set<string>()
    for (let r = 0; r < 8 && !want.every((id) => seen.has(id)); r++) {
      const ctx = createCustomBattle([{ type: 'test-arc-golem', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }, { type: 'test-zombie', hex: hexId(6, 6) }], { replicate: r })
      runBattle(ctx)
      for (const e of ctx.events) if (e.type === 'status.applied') seen.add(e['statusId'] as string)
    }
    for (const id of want) expect(seen.has(id), id).toBe(true)
  })
})
