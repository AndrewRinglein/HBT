// Slow — reduces Movement by its value, read once at each Activation start.
// GAME-DESIGN §5; Codex 2026-08-20: "A one-Turn Movement loss is now the Slow
// status — apply N Slow." At zero points the unit still ACTS from where it
// stands — that is what separates Slow from Stun. The one new core read lives
// in beginActivation; everything downstream (reachable, executeMove, the AIs)
// already flows from movePointsLeft. Bearers are TESTING LANE: test.zombie.grasp
// (slow) and test.ranger.pin (the hobble variant).
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyStatus, isBlocked, tickStatuses } from '../src/core/status.js'
import { beginActivation } from '../src/core/mutate.js'
import { canAttack } from '../src/core/pipeline.js'
import { reachable } from '../src/core/movement.js'
import { STATUSES } from '../src/content/statuses.js'
import { hexId } from '../src/core/hex.js'

function board() {
  const ctx = createCustomBattle(
    [{ type: 'warrior', hex: hexId(5, 5) }],
    [{ type: 'zombie', hex: hexId(5, 6) }],
  )
  return { ctx, w: ctx.state.units[0]!, z: ctx.state.units[1]! }
}

describe('the data', () => {
  it('status.slow and its testing variant both declare the beginActivation read', () => {
    for (const id of ['status.slow', 'test.status.hobble']) {
      const def = STATUSES[id]!
      expect(def, id).toBeDefined()
      expect(def.reducesMovement, id).toBe(true)
      expect(def.shape, id).toBe('counter')
      expect(def.onPhaseEnd, id).toBeUndefined()   // never ticks damage
    }
  })
})

describe('the budget walk: slow N leaves movement − N points, recovering as it decays', () => {
  it('zombie (movement 4) with Slow 3: budgets run 1, 2, 3, 4', () => {
    const { ctx, z } = board()
    applyStatus(ctx, z.id, 'status.slow', 3, 'test')
    const budgets: number[] = []
    for (let i = 0; i < 4; i++) {
      beginActivation(ctx, z.id, 'test')
      budgets.push(z.movePointsLeft)
      tickStatuses(ctx, 'enemy')      // slow 3→2→1→0
    }
    expect(budgets).toEqual([1, 2, 3, 4])
  })

  it('overstack floors at 0 — and the unit still ACTS from where it stands', () => {
    const { ctx, w, z } = board()
    applyStatus(ctx, z.id, 'status.slow', 9, 'test')
    beginActivation(ctx, z.id, 'test')
    expect(z.movePointsLeft).toBe(0)
    expect(isBlocked(ctx, z)).toBe(false)                       // Slow is not Stun
    expect(canAttack(ctx, z.id, w.id, 'attack.zombie.basic')).toBe(true)  // adjacent, still bites
  })

  it('reach shrinks under slow — everything downstream flows from movePointsLeft', () => {
    const { ctx, z } = board()
    beginActivation(ctx, z.id, 'test')
    const clean = reachable(ctx, z).size
    applyStatus(ctx, z.id, 'status.slow', 3, 'test')
    beginActivation(ctx, z.id, 'test')
    expect(reachable(ctx, z).size).toBeLessThan(clean)
  })

  it('the hobble variant reduces identically — the slot is data', () => {
    const { ctx, z } = board()
    applyStatus(ctx, z.id, 'test.status.hobble', 2, 'test')
    beginActivation(ctx, z.id, 'test')
    expect(z.movePointsLeft).toBe(2)
  })

  it('plumbing honesty: an unslowed activation.begin is byte-identical — no movePoints field', () => {
    const { ctx, z } = board()
    beginActivation(ctx, z.id, 'test')
    const clean = ctx.events.filter((e) => e.type === 'activation.begin').pop()!
    expect('movePoints' in clean).toBe(false)
    applyStatus(ctx, z.id, 'status.slow', 1, 'test')
    beginActivation(ctx, z.id, 'test')
    const slowed = ctx.events.filter((e) => e.type === 'activation.begin').pop()!
    expect(slowed['movePoints']).toBe(3)
  })
})

describe('the battle sources fire in real battles', () => {
  it('grasp slows heroes somewhere in the first 30 seeds', () => {
    let found = 0
    for (let r = 0; r < 30 && !found; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 })
      runBattle(ctx)
      found += ctx.events.filter((e) => e.type === 'status.applied'
        && e['causeId'] === 'test.zombie.grasp' && e['statusId'] === 'status.slow').length
    }
    expect(found).toBeGreaterThan(0)
  })

  it('pin hobbles zombies somewhere in the first 30 seeds', () => {
    let found = 0
    for (let r = 0; r < 30 && !found; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 })
      runBattle(ctx)
      found += ctx.events.filter((e) => e.type === 'status.applied'
        && e['causeId'] === 'test.ranger.pin' && e['statusId'] === 'test.status.hobble').length
    }
    expect(found).toBeGreaterThan(0)
  })
})
