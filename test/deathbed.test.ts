// capability.deathbed (2026-09-03) — COMBAT-DESIGN §13, ruled 2026-09-03
// (Angela): "We should include the deathbed roll. And then we don't need to
// include stabilization. If the bleed-out turns past, then we'll count the
// hero as dead. Otherwise, they're counted as wounded."
//   Hit 0 → roll Deathbed Fighting (20 + 5 × Toughness, derived never stored).
//   STAND → a fresh bar at the next wound level (Wounded −1 to every stat but
//   Armor/Resist/Toughness/Item Slots, −2 Max Health, −2 Max Stamina; Badly
//   Wounded doubles). FALL → downed, the bleed-out counter. Civilians stand
//   once, heroes twice. Marks are minted after the battle — the STAND line
//   carries the roll, the chance and the level for the kingdom.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { deathbedFighting, settle } from '../src/core/settle.js'
import { effective } from '../src/core/stats.js'
import { UNITS } from '../src/content/index.js'
import { hexId } from '../src/core/hex.js'

const drop = (ctx: ReturnType<typeof createCustomBattle>, id: number) => { ctx.state.units[id]!.hp = 0; settle(ctx, 'test') }

describe('the roll', () => {
  it('Deathbed Fighting is 20 + 5 × Toughness, read off the row; the Iron Dwarf carries Toughness 3', () => {
    expect(UNITS['hero.base.warrior-iron']!.toughness).toBe(3)
    expect(deathbedFighting({ toughness: 3 })).toBe(35)
    expect(deathbedFighting({ toughness: 0 })).toBe(20)
  })

  it('at 0 a hero rolls; STAND is a fresh bar one level down the ladder, FALL is downed with the counter — and a hero stands at most twice', () => {
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }])
    const w = ctx.state.units[0]!
    w.toughness = 16   // 100%: standing is routine
    const str = effective(ctx, w, 'strength').value, maxHp = w.maxHp, maxSt = w.maxStamina
    drop(ctx, w.id)
    expect(w.lifeState).toBe('standing')
    expect(w.woundLevel).toBe(1)
    expect(w.hp).toBe(w.maxHp)
    expect(w.maxHp).toBe(maxHp - 2)
    expect(w.maxStamina).toBe(maxSt - 2)
    expect(effective(ctx, w, 'strength').value).toBe(str - 1)
    expect(effective(ctx, w, 'armor').value).toBe(effective(ctx, w, 'armor').base)   // Armor untouched
    const stood = ctx.events.find((e) => e.type === 'deathbed.stood')!
    expect(stood['chance']).toBe(100)
    drop(ctx, w.id)
    expect(w.woundLevel).toBe(2)
    expect(effective(ctx, w, 'strength').value).toBe(str - 2)   // Badly Wounded doubles it
    drop(ctx, w.id)
    expect(w.lifeState).toBe('downed')   // the third fall is final: no roll left
    expect(ctx.events.some((e) => e.type === 'deathbed.exhausted')).toBe(true)
    expect(w.bleedOut).toBeGreaterThan(0)
  })

  it('at Toughness 0 the roll is 20%: across many seeds both STAND and FALL happen, never a stand past the ladder', () => {
    const seen = { stood: 0, fell: 0 }
    for (let r = 0; r < 40; r++) {
      const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }], { replicate: r })
      const w = ctx.state.units[0]!
      expect(w.toughness).toBe(0)
      drop(ctx, w.id)
      if (ctx.events.some((e) => e.type === 'deathbed.stood')) seen.stood++
      if (ctx.events.some((e) => e.type === 'deathbed.fell')) seen.fell++
    }
    expect(seen.stood).toBeGreaterThan(0)
    expect(seen.fell).toBeGreaterThan(seen.stood)
  })

  it('a civilian stands once', () => {
    const ctx = createCustomBattle([{ type: 'hero.fixed.farmer', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }])
    const f = ctx.state.units[0]!
    f.toughness = 16
    drop(ctx, f.id)
    expect(f.lifeState).toBe('standing')
    drop(ctx, f.id)
    expect(f.lifeState).toBe('downed')
  })

  it('it happens in real battles — the standard battle at sixteen zombies shows a roll', () => {
    let rolls = 0
    for (let r = 0; r < 8 && !rolls; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 16, mapId: 'map.open' })
      runBattle(ctx)
      rolls += ctx.events.filter((e) => e.type === 'deathbed.stood' || e.type === 'deathbed.fell').length
    }
    expect(rolls).toBeGreaterThan(0)
  })
})
