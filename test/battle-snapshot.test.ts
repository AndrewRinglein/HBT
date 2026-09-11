import { describe, expect, it } from 'vitest'
import { saveBattle, restoreBattle } from '../src/core/snapshot.js'
import { advanceBattle, completeActionCycle, runBattle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { battleCursorCases } from './battle-cursor-cases.js'

const small = () => createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }], { strict: true })
const plain = (ctx: ReturnType<typeof small>) => ({ state: ctx.state, events: ctx.events, rng: ctx.rng, cursor: ctx.battleCursor })

describe('battle save and restore', () => {
  it.each(battleCursorCases())('$id resumes identically after every action cycle', ({ create }) => {
    const uninterrupted = create()
    const expected = runBattle(uninterrupted)
    let ctx = create()
    ctx = restoreBattle(saveBattle(ctx), ctx)
    let cycles = 0
    while (true) {
      const next = advanceBattle(ctx)
      if (next.kind === 'complete') { expect(next.result).toEqual(expected); break }
      // Both the begun activation and the completed cycle survive reload.
      ctx = restoreBattle(saveBattle(ctx), ctx)
      runActivation(ctx, next.actor)
      completeActionCycle(ctx)
      ctx = restoreBattle(saveBattle(ctx), ctx)
      if (++cycles > 2000) throw new Error('snapshot battle did not terminate')
    }
    expect(plain(ctx)).toEqual(plain(uninterrupted))
    const finished = restoreBattle(saveBattle(ctx), ctx)
    expect(runBattle(finished)).toEqual(expected)
    expect(plain(finished)).toEqual(plain(ctx))
  }, 30000)

  it('rejects a different content binding, while accepting reordered registry keys', () => {
    const ctx = small(), saved = saveBattle(ctx)
    const reordered = { ...ctx, actions: Object.fromEntries(Object.entries(ctx.actions).reverse()) }
    expect(restoreBattle(saved, reordered).state).toEqual(ctx.state)
    const changed = { ...ctx, actions: { ...ctx.actions } }
    const key = Object.keys(changed.actions)[0]!
    changed.actions[key] = { ...changed.actions[key]!, staminaCost: 999 }
    expect(() => restoreBattle(saved, changed)).toThrow(/content/)
  })

  it('rejects malformed future placements before the encounter resumes', () => {
    const ctx = createBattle({ replicate: 0, encounter: {
      id: 'encounter.snapshot-test', name: 'Scheduled arrival', setup: [],
      schedule: [{ phase: 2, spawn: [{ unit: 'test-zombie', at: { col: 10, row: 5 } }] }],
    } })
    const snapshot = saveBattle(ctx)
    expect(restoreBattle(snapshot, ctx).encounter).toEqual(ctx.encounter)
    for (const at of [undefined, { col: -1, row: 5 }, { oneOf: [] }, { near: { col: 5, row: 5 }, range: -1 }]) {
      const bad = JSON.parse(snapshot)
      bad.encounter.schedule[0].spawn[0].at = at
      expect(() => restoreBattle(JSON.stringify(bad), ctx)).toThrow()
    }
  })

  it.each([
    ['old version', (s: any) => { s.version = 1 }],
    ['invalid actor', (s: any) => { s.cursor.actor = 900 }],
    ['invalid cursor', (s: any) => { s.cursor.at = 'surprise' }],
    ['invalid phase', (s: any) => { s.cursor.phase = 'other' }],
    ['restart begun battle', (s: any) => { s.cursor.at = 'battle-start' }],
    ['wrong legal phase', (s: any) => { s.cursor.phase = 'enemy' }],
    ['null modifier', (s: any) => { s.state.units[0].mods = [null] }],
    ['malformed modifier', (s: any) => { s.state.units[0].mods = [{ stat: 'accuracy', value: 2 }] }],
    ['null aura', (s: any) => { s.state.units[0].auras = [null] }],
    ['malformed aura', (s: any) => { s.state.units[0].auras = [{ id: 'aura.test', radius: 'two', mods: {} }] }],
    ['null trigger', (s: any) => { s.state.units[0].triggers = [null] }],
    ['malformed trigger', (s: any) => { s.state.units[0].triggers = [{ id: 'trigger.test', effect: null }] }],
    ['invalid order', (s: any) => { s.cursor.order.push(s.cursor.order[0]) }],
    ['invalid next', (s: any) => { s.cursor.next = 900 }],
    ['missing sampled movement', (s: any) => { delete s.cursor.movementAllowance }],
    ['negative sampled movement', (s: any) => { s.cursor.movementAllowance = -1 }],
    ['fractional sampled movement', (s: any) => { s.cursor.movementAllowance = 0.5 }],
    ['missing cursor', (s: any) => { delete s.cursor }],
    ['invalid geometry', (s: any) => { s.state.board.width = 0 }],
    ['short terrain', (s: any) => { s.state.terrain.pop() }],
    ['duplicate identity', (s: any) => { s.state.units[1].uid = s.state.units[0].uid }],
    ['missing unit data', (s: any) => { delete s.state.units[0].hp }],
    ['unknown action', (s: any) => { s.state.units[0].actions.push('power.missing') }],
    ['fractional health', (s: any) => { s.state.units[0].hp = 0.5 }],
    ['event gap', (s: any) => { s.events[0].seq = 10 }],
    ['tampered roll', (s: any) => { s.rng.log[0].value = (s.rng.log[0].value + 1) >>> 0 }],
    ['unknown stream', (s: any) => { s.rng.log[0].stream = 'missing' }],
    ['duplicate strict roll', (s: any) => { s.rng.log.push(s.rng.log[0]) }],
  ])('rejects %s without mutating live runtime', (_name, corrupt) => {
    const ctx = small()
    runBattle(ctx)
    // Reuse a valid acting cursor from the equivalent initial battle.
    const acting = small(); advanceBattle(acting)
    // A first attack gives the roll corruption cases a real roll to inspect.
    runActivation(acting, acting.battleCursor!.actor!)
    const saved = JSON.parse(saveBattle(acting))
    const before = structuredClone(plain(ctx))
    corrupt(saved)
    expect(() => restoreBattle(JSON.stringify(saved), ctx)).toThrow()
    expect(plain(ctx)).toEqual(before)
  })
})
