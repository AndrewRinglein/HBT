// fix.turn-mods-expire (2026-10-01; reported by Andrew, playing the Lumberjack House: the Warrior's Leap gave +2
// Strength and the screen kept it). A mod "until the end of the Turn" is removed as the Turn ends, with
// statmod.expired (Law 3) — before this it was only filtered at read, and nothing in the log said it ended.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation, beginTurn } from '../src/core/mutate.js'
import { executeSidestep } from '../src/core/movement.js'
import { effective } from '../src/core/stats.js'
import type { MoveDef } from '../src/core/types.js'

const leapt = () => {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 200 }])
  const w = ctx.state.units[0]!
  ctx.state.turn = 1
  w.actions.push('power.leap')
  beginActivation(ctx, w.id, 'test')
  const to = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).find((h) => ctx.geo.distance(h, w.hex) === 2)!
  expect(executeSidestep(ctx, w.id, to, ctx.actions['power.leap'] as MoveDef)).toBe(true)
  return { ctx, w }
}

describe('fix.turn-mods-expire', () => {
  it("the Leap's +2 Strength lasts the Turn, then leaves the unit with a statmod.expired line", () => {
    const { ctx, w } = leapt()
    const base = w.strength
    expect(effective(ctx, w, 'strength').value).toBe(base + 2)
    expect(w.mods.filter((m) => m.source === 'power.leap')).toHaveLength(1)
    beginTurn(ctx, 'engine')
    expect(w.mods.filter((m) => m.source === 'power.leap')).toHaveLength(0)
    expect(effective(ctx, w, 'strength').value).toBe(base)
    const ended = ctx.events.find((e) => e.type === 'statmod.expired' && e['source'] === 'power.leap')!
    expect([ended.turn, ended.actor, ended['stat'], ended['value']]).toEqual([1, w.id, 'strength', 2])
    // logged as the Turn ends — before the next Turn's line
    expect(ended.seq).toBeLessThan(ctx.events.find((e) => e.type === 'turn.begin' && e.turn === 2)!.seq)
  })
  it('a mod for the rest of the Battle stays', () => {
    const { ctx, w } = leapt()
    w.mods.push({ stat: 'armor', op: 'add', value: 1, source: 'test.battle-long', scope: 'unit' })
    beginTurn(ctx, 'engine')
    expect(w.mods.map((m) => m.source)).toEqual(['test.battle-long'])
  })
  it('in real battles every Turn-long mod that was added and reached a new Turn is logged as ended', () => {
    for (let r = 0; r < 6; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, mapId: 'map.open' })
      runBattle(ctx)
      const turns = ctx.state.turn
      for (const add of ctx.events.filter((e) => e.type === 'statmod.added' && typeof e['expiresAtTurn'] === 'number' && (e['expiresAtTurn'] as number) <= turns)) {
        expect(ctx.events.some((e) => e.type === 'statmod.expired' && e.seq > add.seq && e.actor === add.actor && e['source'] === add['source'] && e['stat'] === add['stat']), `replicate ${r}: ${add['source']} on ${add.actor}`).toBe(true)
      }
      for (const u of ctx.state.units) expect(u.mods.filter((m) => m.expiresAtTurn !== undefined && m.expiresAtTurn <= turns)).toEqual([])
    }
  })
})
