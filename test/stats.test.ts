import { describe, it, expect } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { effective, stat, modsFor, terrainMods } from '../src/core/stats.js'
import type { StatMod } from '../src/core/stats.js'
import { resolveAccuracy, reachOf } from '../src/core/pipeline.js'
import { ATTACKS } from '../src/content/index.js'
import { hexId } from '../src/core/hex.js'
import { TERRAIN } from '../src/core/types.js'

function ranger() {
  const ctx = createCustomBattle(
    [{ type: 'ranger', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(5, 8) }], { mapId: 'map.open' })
  return { ctx, r: ctx.state.units[0]!, z: ctx.state.units[1]! }
}

const mod = (m: Partial<StatMod> & Pick<StatMod, 'stat' | 'value'>): StatMod =>
  ({ op: 'add', source: 'test', scope: 'unit', ...m })

// ─── gate 2: the numbers the old hardcoded stations produced ─────────────────
describe('terrain through the stat pipeline', () => {
  it('hills are still +10 accuracy and +2 ranged reach, and nothing else', () => {
    const { ctx, r, z } = ranger()
    const flatAcc = resolveAccuracy(ctx, r, z, ATTACKS['attack.ranger.bow']!).value
    const flatReach = reachOf(ctx, r, ATTACKS['attack.ranger.bow']!)

    ctx.state.terrain[r.hex] = TERRAIN.HILLS
    expect(resolveAccuracy(ctx, r, z, ATTACKS['attack.ranger.bow']!).value - flatAcc).toBe(10)
    expect(reachOf(ctx, r, ATTACKS['attack.ranger.bow']!) - flatReach).toBe(2)
    expect(reachOf(ctx, r, ATTACKS['attack.punch']!)).toBe(1)      // melee ignores it
    expect(stat(ctx, r, 'dodge')).toBe(r.dodge)                    // hills grant no dodge
    expect(stat(ctx, r, 'armor')).toBe(r.armor)                    // and no armor
  })

  it('terrain is DERIVED — moving off the hill takes the bonus with it', () => {
    const { ctx, r } = ranger()
    ctx.state.terrain[r.hex] = TERRAIN.HILLS
    expect(stat(ctx, r, 'accuracy')).toBe(r.accuracy + 10)
    r.hex = hexId(6, 5)                                            // one hex sideways, open ground
    expect(stat(ctx, r, 'accuracy')).toBe(r.accuracy)
    expect(terrainMods(ctx, r)).toEqual([])                        // nothing stored to clean up
  })
})

// ─── gate 2: stored modifiers ────────────────────────────────────────────────
describe('stored modifiers', () => {
  it('gear-style adds stack, and a wound-style negative subtracts', () => {
    const { ctx, r } = ranger()
    const base = r.accuracy
    r.mods.push(mod({ stat: 'accuracy', value: 15, source: 'item.longbow' }))
    r.mods.push(mod({ stat: 'accuracy', value: -25, source: 'badge.shaky-hands' }))
    expect(stat(ctx, r, 'accuracy')).toBe(base - 10)
  })

  it('`set` overrides everything before it, wherever it was added', () => {
    const { ctx, r } = ranger()
    r.mods.push(mod({ stat: 'strength', op: 'set', value: 0, source: 'status.petrified' }))
    r.mods.push(mod({ stat: 'strength', value: 99, source: 'status.rage' }))
    expect(stat(ctx, r, 'strength')).toBe(0)
  })

  it('order is stated, not incidental — the same set added backwards resolves the same', () => {
    const a = ranger(), b = ranger()
    const mods = [
      mod({ stat: 'armor', value: 3, source: 'item.plate' }),
      mod({ stat: 'armor', op: 'set', value: 1, source: 'status.sundered' }),
      mod({ stat: 'armor', value: 2, source: 'aura.captain' }),
    ]
    a.r.mods.push(...mods)
    b.r.mods.push(...[...mods].reverse())
    expect(stat(a.ctx, a.r, 'armor')).toBe(stat(b.ctx, b.r, 'armor'))
    expect(modsFor(a.ctx, a.r).map(m => m.source)).toEqual(modsFor(b.ctx, b.r).map(m => m.source))
  })

  it('an expiring modifier stops applying on its turn, not after it', () => {
    const { ctx, r } = ranger()
    const base = r.precision
    r.mods.push(mod({ stat: 'precision', value: 4, source: 'status.blessed', expiresAtTurn: 3 }))
    ctx.state.turn = 2; expect(stat(ctx, r, 'precision')).toBe(base + 4)
    ctx.state.turn = 3; expect(stat(ctx, r, 'precision')).toBe(base)
  })

  it('a modifier for another stat never leaks', () => {
    const { ctx, r } = ranger()
    r.mods.push(mod({ stat: 'dodge', value: 40 }))
    expect(stat(ctx, r, 'accuracy')).toBe(r.accuracy)
    expect(stat(ctx, r, 'dodge')).toBe(r.dodge + 40)
  })
})

// ─── gate 1: provenance ──────────────────────────────────────────────────────
describe('the ledger explains the number', () => {
  it('base plus every delta equals the value, for every stat', () => {
    const { ctx, r } = ranger()
    ctx.state.terrain[r.hex] = TERRAIN.HILLS
    r.mods.push(mod({ stat: 'accuracy', value: -25, source: 'badge.shaky-hands' }))
    r.mods.push(mod({ stat: 'reach', value: 1, source: 'item.longbow' }))
    for (const s of ['accuracy', 'reach', 'strength', 'armor', 'dodge'] as const) {
      const e = effective(ctx, r, s)
      expect(e.base + e.ledger.reduce((n, row) => n + row.delta, 0)).toBe(e.value)
    }
  })

  it('every row names a source, and terrain names itself', () => {
    const { ctx, r } = ranger()
    ctx.state.terrain[r.hex] = TERRAIN.HILLS
    const e = effective(ctx, r, 'accuracy')
    expect(e.ledger.length).toBe(1)
    expect(e.ledger[0]!.source).toBe('terrain.hills')
    expect(e.ledger[0]).toMatchObject({ op: 'add', delta: 10, from: r.accuracy, to: r.accuracy + 10 })
  })

  it('a modifier that changes nothing leaves no row — the ledger is deltas, not intentions', () => {
    const { ctx, r } = ranger()
    r.mods.push(mod({ stat: 'accuracy', value: 0, source: 'item.noop' }))
    expect(effective(ctx, r, 'accuracy').ledger).toEqual([])
  })
})

// ─── the guard ───────────────────────────────────────────────────────────────
describe('re-entrancy', () => {
  it('a stat read from inside a stat read throws instead of looping', () => {
    const { ctx, r } = ranger()
    const evil = { ...r, get accuracy(): number { return stat(ctx, r, 'dodge') } }
    expect(() => effective(ctx, evil, 'accuracy')).toThrow(/re-entrant/)
  })

  it('the guard clears after a throw — one bad read does not poison the run', () => {
    const { ctx, r } = ranger()
    const evil = { ...r, get accuracy(): number { return stat(ctx, r, 'dodge') } }
    expect(() => effective(ctx, evil, 'accuracy')).toThrow()
    expect(stat(ctx, r, 'accuracy')).toBe(r.accuracy)
  })
})

// ─── purity ──────────────────────────────────────────────────────────────────
describe('resolution is pure', () => {
  it('reading a stat a hundred times changes nothing and emits nothing', () => {
    const { ctx, r } = ranger()
    ctx.state.terrain[r.hex] = TERRAIN.HILLS
    r.mods.push(mod({ stat: 'accuracy', value: 5 }))
    const before = JSON.stringify(ctx.state)
    const n = ctx.events.length
    for (let i = 0; i < 100; i++) stat(ctx, r, 'accuracy')
    expect(JSON.stringify(ctx.state)).toBe(before)
    expect(ctx.events.length).toBe(n)
  })
})
