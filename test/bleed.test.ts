// Bleed — flat 2 damage a tick, and Resist NEVER touches it (ruled 2026-08-20:
// Resist mitigates burn/poison per tick, "never bleed"). The value is a turn
// counter, not a magnitude (GAME-DESIGN §5; Codex, 63 uses). The bearer is
// TESTING LANE: test.ranger.serrated-arrows (Codex Hunter's Mark shape).
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyStatus, tickStatuses } from '../src/core/status.js'
import { stripsOnActivationEndOf, stripsOnEnterOf } from '../src/content/maps.js'
import { STATUSES } from '../src/content/statuses.js'
import { TERRAIN } from '../src/core/types.js'
import { hexId } from '../src/core/hex.js'

function warriorWithResist(resist: number) {
  const ctx = createCustomBattle(
    [{ type: 'warrior', hex: hexId(5, 5) }],
    [{ type: 'zombie', hex: hexId(11, 11) }],
  )
  const w = ctx.state.units[0]!
  if (resist) w.mods.push({ stat: 'resist', op: 'add', value: resist, source: 'test', scope: 'unit' })
  return { ctx, w }
}

describe('the data', () => {
  it('bleed deliberately OMITS tickMitigatedByResist — the seam statusDamage was built with', () => {
    const def = STATUSES['status.bleed']!
    expect(def).toBeDefined()
    expect(def.tickMitigatedByResist).toBeUndefined()
    expect(def.shape).toBe('counter')
    expect(def.halvesHealing).toBeUndefined()
  })
})

describe('flat 2, full clock — the ruled pair with poison, in one harness', () => {
  it('bleed 5 vs resist 2 ticks 2,2,2,2,2 while poison 5 vs resist 2 ticks 3,2,1,0,0', () => {
    for (const [id, expected] of [
      ['status.bleed', [2, 2, 2, 2, 2]],
      ['status.poison', [3, 2, 1, 0, 0]],
    ] as const) {
      const { ctx, w } = warriorWithResist(2)
      w.hp = 100; w.maxHp = 100   // room for the full walk
      applyStatus(ctx, w.id, id, 5, 'test')
      const taken: number[] = []
      for (let i = 0; i < 5; i++) {
        const before = w.hp
        tickStatuses(ctx, 'hero')
        taken.push(before - w.hp)
      }
      expect(taken, id).toEqual([...expected])
      expect(w.statuses.find((s) => s.id === id), id).toBeUndefined()   // clock ran in full
    }
  })

  it('bleed 1 still ticks the flat 2 — flat means flat', () => {
    const { ctx, w } = warriorWithResist(0)
    const before = w.hp
    applyStatus(ctx, w.id, 'status.bleed', 1, 'test')
    tickStatuses(ctx, 'hero')
    expect(before - w.hp).toBe(2)
    expect(w.statuses.find((s) => s.id === 'status.bleed')).toBeUndefined()   // 1 → 0, expired
  })

  it('water strips burn and poison — NEVER bleed (ruled: "nothing else")', () => {
    expect(stripsOnActivationEndOf(TERRAIN.WATER)).not.toContain('status.bleed')
    expect(stripsOnEnterOf(TERRAIN.WATER)).not.toContain('status.bleed')
  })
})

describe('the battle source fires in real battles', () => {
  it('serrated arrows bleed zombies in the very first seeds — the ranger connects every battle', () => {
    let found = 0
    for (let r = 0; r < 5; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 })
      runBattle(ctx)
      found += ctx.events.filter((e) => e.type === 'status.applied'
        && e['causeId'] === 'test.ranger.serrated-arrows' && e['statusId'] === 'status.bleed').length
    }
    expect(found).toBeGreaterThan(0)
  })
})
