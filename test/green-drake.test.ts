// The Green Drake — Codex §10: "Green Drake | Beast | str 5 | prec 4 | armor 1
// | health 12 | reach 2 | resist 1"; §5 Breath: "Hiss | range 3 | magic | +0 |
// magic | onHit apply 2 Poison." With the published magic 0 the Hiss is a
// 0-damage attack — the whole threat is the poison clock, faithful to the rows.
// It extends the FIRST_BATTLE cycle at slot 10, so enemyCount 8 battles (the
// control set) are BYTE-IDENTICAL — a proven-neutral landing whose one engine
// change is reach-aware swinging in dumb-melee (an adjacency-only check meant a
// reach unit closed and then never attacked; for reach-1 units the new check is
// the old check exactly).
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { preview, reachOf } from '../src/core/pipeline.js'
import { UNITS, ATTACKS, FIRST_BATTLE } from '../src/content/index.js'
import { hexId } from '../src/core/hex.js'

describe('the data — the Codex rows, verbatim', () => {
  it('unit.green-drake carries the §10 statline', () => {
    const d = UNITS['green-drake']!
    expect(d).toBeDefined()
    expect([d.maxHp, d.armor, d.resist, d.strength, d.precision, d.reach])
      .toEqual([12, 1, 1, 5, 4, 2])
    expect(d.maxStamina).toBe(0)
    expect(d.attacks).toEqual(['attack.breath.hiss'])
    expect(d.attributes).toEqual(['beast', 'dragon'])
    expect(d.triggers?.map((t) => t.id)).toEqual(['trigger.green-drake.venom-breath'])
  })
  it('attack.breath.hiss is the §5 Breath row', () => {
    const a = ATTACKS['attack.breath.hiss']!
    expect([a.kind, a.stat, a.bonus, a.damageType, a.reach, a.staminaCost])
      .toEqual(['ranged', 'magic', 0, 'magic', 3, 0])
  })
})

describe('the 0-damage identity — the threat is the clock', () => {
  it('hiss previews 0 damage vs everyone; the reach is 3 + 2 = 5', () => {
    const ctx = createCustomBattle(
      [{ type: 'warrior', hex: hexId(5, 5) }],
      [{ type: 'green-drake', hex: hexId(5, 8) }],
    )
    const drake = ctx.state.units[1]!
    expect(preview(ctx, drake.id, 0, 'attack.breath.hiss').damageOnHit).toBe(0)
    expect(reachOf(ctx, drake, ATTACKS['attack.breath.hiss']!)).toBe(5)
  })
})

describe('the cycle — and the byte-identity claim', () => {
  it('no drake below enemyCount 10; one at 12; the one-per-four burning cadence holds', () => {
    const eight = createBattle({ replicate: 0, enemyCount: 8 })
    expect(eight.state.units.filter((u) => u.typeId === 'green-drake').length).toBe(0)
    const twelve = createBattle({ replicate: 0, enemyCount: 12 })
    expect(twelve.state.units.filter((u) => u.typeId === 'green-drake').length).toBe(1)
    expect(twelve.state.units.filter((u) => u.typeId === 'zombie-burning').length).toBe(3)
  })
  it('reach-1 units still idle with the exact old words — the neutrality hinge', () => {
    // A lone zombie far from the heroes idles as it approaches; its text must
    // be byte-identical to the pre-drake engine or the control battles move.
    const ctx = createBattle({ replicate: 0, enemyCount: 4 })
    runBattle(ctx)
    const idles = ctx.events.filter((e) => e.type === 'activation.idle' && String(e.causeId).startsWith('ai.'))
    for (const e of idles) expect(['nothing adjacent', 'could not reach an enemy', 'no target in range', 'no enemy in reach']).toContain(e['reason'])
    expect(idles.some((e) => e['reason'] === 'no enemy in reach')).toBe(false)   // no reach unit in a 4v4
  })
})

describe('the drake actually fights now', () => {
  it('venom-breath poisons a hero in the first z=12 seeds — the reach-aware swing at work', () => {
    let found = 0, hisses = 0
    for (let r = 0; r < 10 && !found; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 12 })
      runBattle(ctx)
      const drake = ctx.state.units.find((u) => u.typeId === 'green-drake')!
      hisses += ctx.events.filter((e) => e.type === 'attack.declared' && e['actor'] === drake.id).length
      found += ctx.events.filter((e) => e.type === 'status.applied'
        && e['causeId'] === 'trigger.green-drake.venom-breath' && e['amount'] === 2).length
    }
    expect(hisses).toBeGreaterThan(0)
    expect(found).toBeGreaterThan(0)
  })
})
