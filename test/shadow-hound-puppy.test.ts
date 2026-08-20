// The Shadow Hound Puppy — Codex §10: "Shadow Hound Puppy | Beast | str 6 |
// prec 2 | armor 0 | health 12 | reach 1"; §3 Hound: "onHit your fang attacks
// apply 1 Bleed." The heavy hitter of the Beast pen, landed LAST because its
// kit needs status.bleed (849ead6). Cycle slot 11 — enemyCount 8 control
// battles stay byte-identical (changesBaseline false, proven neutral).
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { preview } from '../src/core/pipeline.js'
import { UNITS, FIRST_BATTLE } from '../src/content/index.js'
import { hexId } from '../src/core/hex.js'

describe('the data — the Codex row, verbatim', () => {
  it('unit.shadow-hound-puppy carries the §10 statline and the Hound rider', () => {
    const d = UNITS['shadow-hound-puppy']!
    expect(d).toBeDefined()
    expect([d.maxHp, d.armor, d.strength, d.precision, d.reach]).toEqual([12, 0, 6, 2, 1])
    expect(d.maxStamina).toBe(0)
    expect(d.ai).toBe('melee-aggressive')
    expect(d.attacks).toEqual(['attack.fangs.bite'])   // the shared Fangs row
    const t = d.triggers![0]!
    expect(t.id).toBe('trigger.shadow-hound-puppy.worry')
    expect(t.effect).toEqual({ kind: 'status.apply', statusId: 'status.bleed', value: 1 })
  })
})

describe('the numbers', () => {
  it('its bite previews 7 vs the warrior (6 str + 2 bonus − 1 armor) — the pen heavyweight', () => {
    const ctx = createCustomBattle(
      [{ type: 'warrior', hex: hexId(5, 5) }],
      [{ type: 'shadow-hound-puppy', hex: hexId(5, 6) }],
    )
    expect(preview(ctx, 1, 0, 'attack.fangs.bite').damageOnHit).toBe(7)
  })
})

describe('the cycle', () => {
  it('slot 11; nothing below enemyCount 11; the burning cadence still holds at 12', () => {
    expect(FIRST_BATTLE.enemies[10]).toBe('shadow-hound-puppy')
    const eight = createBattle({ replicate: 0, enemyCount: 8 })
    expect(eight.state.units.filter((u) => u.typeId === 'shadow-hound-puppy').length).toBe(0)
    const twelve = createBattle({ replicate: 0, enemyCount: 12 })
    expect(twelve.state.units.filter((u) => u.typeId === 'shadow-hound-puppy').length).toBe(1)
    expect(twelve.state.units.filter((u) => u.typeId === 'zombie-burning').length).toBe(3)
  })
})

describe('the worry fires in real battles', () => {
  it('bleeds a hero in the first z=12 seeds — and the bleed then ticks its flat 2', () => {
    let worried = 0, tickedFlat = 0
    for (let r = 0; r < 10 && !worried; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 12 })
      runBattle(ctx)
      worried += ctx.events.filter((e) => e.type === 'status.applied'
        && e['causeId'] === 'trigger.shadow-hound-puppy.worry' && e['statusId'] === 'status.bleed').length
      tickedFlat += ctx.events.filter((e) => e.type === 'damage.applied'
        && e['causeId'] === 'status.bleed' && (e['amount'] as number) === 2).length
    }
    expect(worried).toBeGreaterThan(0)
    expect(tickedFlat).toBeGreaterThan(0)
  })
})
