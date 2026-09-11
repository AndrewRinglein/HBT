import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { coverage, mergeCoverage } from '../src/sim/coverage.js'
import type { Event } from '../src/core/types.js'

const battle = () => createCustomBattle([{ type: 'test-arc-golem', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
const event = (fields: Record<string, unknown>) => ({ seq: 0, turn: 1, phase: 'hero', ...fields }) as Event

describe('simulation coverage', () => {
  it('reports granted registered actions once, distinguishes used and unused, and leaves the battle unchanged', () => {
    const ctx = battle()
    const ids = [...new Set(ctx.state.units.flatMap(u => u.actions))].sort()
    const before = JSON.stringify(ctx.state)
    const result = coverage(ctx, [event({ type: 'action.used', actionId: ids[0] })])
    expect(result.slices.find(s => s.kind === 'action')).toEqual({ kind: 'action', reachable: ids, exercised: [ids[0]], unused: ids.slice(1) })
    expect(result.blind).toEqual(expect.arrayContaining(ids.slice(1)))
    expect(JSON.stringify(ctx.state)).toBe(before)
  })

  it('omits missing or disabled action rows even when granted or named in old events', () => {
    const ctx = battle()
    const removed = ctx.state.units[0]!.actions[0]!
    ctx.actions = Object.fromEntries(Object.entries(ctx.actions).filter(([id]) => id !== removed))
    ctx.state.units[0]!.actions.push('power.missing')
    const result = coverage(ctx, [event({ type: 'action.used', actionId: removed })])
    const actions = result.slices.find(s => s.kind === 'action')!
    expect(actions.reachable).not.toContain(removed)
    expect(actions.reachable).not.toContain('power.missing')
    expect(actions.exercised).toEqual([])
  })

  it('reads unvisited terrain from the map census and does not leak terrain names between reports', () => {
    const ctx = battle()
    const first = coverage(ctx, [event({ type: 'map.loaded', 'terrain.open': 255, 'terrain.forest': 1 }), event({ type: 'moved', terrain: 'terrain.open', to: 1 })])
    expect(first.slices.find(s => s.kind === 'terrain')).toEqual({ kind: 'terrain', reachable: ['terrain.forest', 'terrain.open'], exercised: ['terrain.open'], unused: ['terrain.forest'] })
    expect(coverage(battle(), []).slices.some(s => s.kind === 'terrain')).toBe(false)
    const second = coverage(ctx, [event({ type: 'map.loaded', 'terrain.forest': 256 }), event({ type: 'moved', terrain: 'terrain.forest', to: 1 })])
    expect(mergeCoverage([first, second]).slices.find(s => s.kind === 'terrain')!.unused).toEqual([])
  })
})
