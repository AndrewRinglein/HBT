// Stun — the unit cannot act. GAME-DESIGN §5: "Stunned | the unit cannot act |
// −1"; Codex name is Stun (22 uses). blocksAction is read by isBlocked() in the
// turn loop; the End of Activation ladder still runs for blocked units. Stun N
// is exactly N lost activations. The battle sources are TESTING LANE
// (test.warrior.stagger for status.stun, test.zombie-burning.lurch for the
// generalization variant test.status.daze).
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyStatus, isBlocked, tickStatuses, valueOf } from '../src/core/status.js'
import { STATUSES } from '../src/content/statuses.js'
import { hexId } from '../src/core/hex.js'

describe('the data', () => {
  it('status.stun and its testing variant both block action as pure data', () => {
    for (const id of ['status.stun', 'test.status.daze']) {
      const def = STATUSES[id]!
      expect(def, id).toBeDefined()
      expect(def.blocksAction, id).toBe(true)
      expect(def.shape, id).toBe('counter')
      expect(def.decayPerPhase ?? 1, id).toBe(1)
      // Stun never ticks damage — no onPhaseEnd, nothing for Resist to touch.
      expect(def.onPhaseEnd, id).toBeUndefined()
    }
  })
})

describe('Stun N = exactly N lost activations', () => {
  it('isBlocked walks with the counter: blocked, blocked, free', () => {
    const ctx = createCustomBattle(
      [{ type: 'warrior', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(11, 11) }],
    )
    const z = ctx.state.units[1]!
    applyStatus(ctx, z.id, 'status.stun', 2, 'test')
    expect(isBlocked(ctx, z)).toBe(true)
    tickStatuses(ctx, 'enemy')            // 2 → 1
    expect(valueOf(z, 'status.stun')).toBe(1)
    expect(isBlocked(ctx, z)).toBe(true)
    tickStatuses(ctx, 'enemy')            // 1 → 0, expired
    expect(valueOf(z, 'status.stun')).toBe(0)
    expect(isBlocked(ctx, z)).toBe(false)
  })

  it('a stunned zombie idles in the real loop — and never swings before it dies', () => {
    // Warrior adjacent to a zombie carrying Stun 5: the zombie must emit
    // activation.idle "cannot act" every enemy phase and die without ever
    // declaring an attack.
    const ctx = createCustomBattle(
      [{ type: 'warrior', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(5, 6) }],
    )
    const z = ctx.state.units[1]!
    applyStatus(ctx, z.id, 'status.stun', 5, 'test')
    runBattle(ctx)
    const idles = ctx.events.filter((e) => e.type === 'activation.idle'
      && e['actor'] === z.id && e['reason'] === 'cannot act')
    expect(idles.length).toBeGreaterThan(0)
    const swings = ctx.events.filter((e) => e.type === 'attack.declared' && e['actor'] === z.id)
    expect(swings.length).toBe(0)
  })

  it('the daze variant blocks identically — the slot is data, not a stun special-case', () => {
    const ctx = createCustomBattle(
      [{ type: 'warrior', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(11, 11) }],
    )
    const w = ctx.state.units[0]!
    applyStatus(ctx, w.id, 'test.status.daze', 1, 'test')
    expect(isBlocked(ctx, w)).toBe(true)
    tickStatuses(ctx, 'hero')
    expect(isBlocked(ctx, w)).toBe(false)
  })
})

describe('the battle sources fire in real battles', () => {
  it('test.warrior.stagger stuns zombies somewhere in the first 30 field seeds', () => {
    let found = 0
    for (let r = 0; r < 30 && !found; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, mapId: 'map.field' })
      runBattle(ctx)
      found += ctx.events.filter((e) => e.type === 'status.applied'
        && e['causeId'] === 'test.warrior.stagger' && e['statusId'] === 'status.stun').length
    }
    expect(found).toBeGreaterThan(0)
  })

  it('test.zombie-burning.lurch dazes a hero somewhere in the first 40 thicket seeds', () => {
    let found = 0
    for (let r = 0; r < 40 && !found; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, mapId: 'map.thicket' })
      runBattle(ctx)
      found += ctx.events.filter((e) => e.type === 'status.applied'
        && e['causeId'] === 'test.zombie-burning.lurch' && e['statusId'] === 'test.status.daze').length
    }
    expect(found).toBeGreaterThan(0)
  })
})
