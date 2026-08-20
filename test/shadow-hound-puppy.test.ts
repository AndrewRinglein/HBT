// The Shadow Hound Puppy — PENDING REDESIGN. Angela 2026-08-20: the Beast pen
// are PLAYER beasts and the ported blocks were never her design. Pulled from
// the horde and benched; the def survives (provisional, the ported Codex row)
// so the id and this coverage are waiting when she dictates its real block,
// the way she did the snake and the drake.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { UNITS, FIRST_BATTLE } from '../src/content/index.js'

describe('benched, provisional, waiting', () => {
  it('the def survives with the ported row and the fang-scoped worry', () => {
    const d = UNITS['shadow-hound-puppy']!
    expect(d).toBeDefined()
    expect([d.maxHp, d.armor, d.strength, d.precision]).toEqual([12, 0, 6, 2])
    const t = d.triggers![0]!
    expect(t.effect).toEqual({ kind: 'status.apply', statusId: 'status.bleed', value: 1 })
    expect(t.onlyWithAttack).toBe('attack.fangs.bite')
  })
  it('it is in NO horde at any count', () => {
    expect([...FIRST_BATTLE.enemies]).not.toContain('shadow-hound-puppy')
    for (const z of [4, 8, 12]) {
      const ctx = createBattle({ replicate: 0, enemyCount: z })
      expect(ctx.state.units.some((u) => u.typeId === 'shadow-hound-puppy'), String(z)).toBe(false)
    }
  })
})
