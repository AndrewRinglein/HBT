import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as battle from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { forkBattle } from '../src/core/fork.js'
import { createCustomBattle } from '../src/core/setup.js'
import { applyStatus } from '../src/core/status.js'
import { battleCursorCases } from './battle-cursor-cases.js'
import { projectShorthand } from './props-projection.js'
import { GLYPH, mapDef } from '../src/content/maps.js'

const golden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-golden.json', import.meta.url), 'utf8'))
const identityGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-identities.json', import.meta.url), 'utf8'))
const eventGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-action-spent.json', import.meta.url), 'utf8'))
const propGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-props.json', import.meta.url), 'utf8'))
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
// Explicit rule migration, not regenerated historical hashes. These nine old
// cases contain Surge ledger/refresh changes or terminal markers corrected
// by fix.surge-cycle. Keep every other historical assertion intact; these cases
// retain automatic/suspended parity plus the exact rules in surge-cycle.test.ts.
const surgeChanged = new Set(['showcase.assembled-party', 'showcase.badged', 'showcase.beasts', 'showcase.farmers-grown', 'progression-surge-0', 'progression-surge-1', 'legacy-surge-cap', 'showcase.supper', 'showcase.surrounded'])
// fix.ai-shared-commands: recovery can be chosen without displacement, and
// illegal lowest-health candidates cannot hide another legal target. The
// recorded 476-battle transition explains these three additional old hashes.
const aiChanged = new Set(['showcase.horrors', 'showcase.rime', 'showcase.waystation'])
// Law 10, fix.unit-identities: these fifteen remaining historical streams used
// target array indices in trigger keys. Measured before/after first differences
// are trigger.rolled. Preserve the original file, add separate frozen migration
// expectations, and continue checking BOTH drivers against all four hashes/results.
const identityChanged = new Set(['showcase.alpha-team', 'showcase.arc-variant', 'showcase.civilians', 'showcase.eve-24-a', 'showcase.eve-24-b', 'showcase.gash-variant', 'showcase.item-powers', 'showcase.kiln', 'showcase.knockback-two', 'showcase.mirror-zombies', 'showcase.ordered-power-preview', 'showcase.prologue-enemies', 'showcase.prologue-party', 'showcase.wounded-entry', 'progression-surge-2'])

describe('resumable battle cursor', () => {
  it('blocked actors run their end ladder without yielding an action cycle', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    const blocked = Object.values(ctx.statuses).find(s => s.blocksAction)!
    expect(blocked).toBeDefined()
    applyStatus(ctx, 0, blocked.id, 1, 'test')
    expect(battle.advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 1 })
    expect(ctx.events.filter(e => e.type === 'activation.idle' && e.actor === 0)).toHaveLength(1)
    expect(ctx.events.filter(e => e.type === 'activation.end' && e.actor === 0)).toHaveLength(1)
    expect(ctx.events.some(e => e.type === 'status.reduced' && e.target === 0 && e['statusId'] === blocked.id)).toBe(true)
    expect(ctx.events.some(e => e.type === 'ai.mode' && e.actor === 0)).toBe(false)
  })

  it('keeps the phase activation snapshot and refuses finishing a cycle twice', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    expect(battle.advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
    // A new ally arriving during this phase cannot join its captured order.
    ctx.state.units.push({ ...structuredClone(ctx.state.units[0]!), id: 2, uid: 300, hex: 100 })
    battle.completeActionCycle(ctx)
    expect(() => battle.completeActionCycle(ctx)).toThrow(/acting/)
    expect(battle.advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 1 })
    expect(ctx.events.some(e => e.type === 'activation.begin' && e.actor === 2)).toBe(false)
    battle.completeActionCycle(ctx)
    expect(battle.advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
    battle.completeActionCycle(ctx)
    expect(battle.advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 2 })
  })

  it('settles an already-decided starting position without opening a Turn', () => {
    // A board that never had an enemy intentionally does not count as cleared.
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    ctx.state.units[1]!.hp = 0
    ctx.state.units[1]!.lifeState = 'dead'
    const next = battle.advanceBattle(ctx)
    expect(next.kind).toBe('complete')
    expect(ctx.state.turn).toBe(0)
    expect(ctx.events.filter(e => e.type === 'battle.begin')).toHaveLength(1)
    expect(ctx.events.filter(e => e.type === 'battle.end')).toHaveLength(1)
    expect(battle.advanceBattle(ctx)).toEqual(next)
    expect(ctx.events.filter(e => e.type === 'battle.begin')).toHaveLength(1)
  })

  it('yields a begun activation, waits without changing anything, and finishes without reinitializing', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    expect(() => battle.completeActionCycle(ctx)).toThrow(/acting/)
    const first = battle.advanceBattle(ctx)
    expect(first).toEqual({ kind: 'acting', actor: 0 })
    const before = structuredClone({ state: ctx.state, events: ctx.events, rng: ctx.rng, cursor: ctx.battleCursor })
    expect(battle.advanceBattle(ctx)).toEqual(first)
    expect({ state: ctx.state, events: ctx.events, rng: ctx.rng, cursor: ctx.battleCursor }).toEqual(before)
    const result = battle.runBattle(ctx)
    const after = structuredClone({ state: ctx.state, events: ctx.events, rng: ctx.rng })
    expect(battle.advanceBattle(ctx)).toEqual({ kind: 'complete', result })
    expect(battle.runBattle(ctx)).toEqual(result)
    expect(() => battle.completeActionCycle(ctx)).toThrow(/acting/)
    expect({ state: ctx.state, events: ctx.events, rng: ctx.rng }).toEqual(after)
    expect(ctx.events.filter(e => e.type === 'battle.begin')).toHaveLength(1)
  })

  it('forks the plain control cursor independently of the live battle', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    battle.advanceBattle(ctx)
    const dry = forkBattle(ctx)
    expect(dry.battleCursor).toEqual(ctx.battleCursor)
    expect(dry.battleCursor).not.toBe(ctx.battleCursor)
    dry.battleCursor!.order.push(999)
    expect(ctx.battleCursor!.order).not.toContain(999)
  })

  for (const fixture of battleCursorCases()) {
    const historical = surgeChanged.has(fixture.id) || aiChanged.has(fixture.id) || identityChanged.has(fixture.id) ? undefined : golden.cases.find((row: { id: string }) => row.id === fixture.id)
    it(`${historical ? 'preserves historical' : 'automatic and suspended drivers agree on'} events/state/RNG/result: ${fixture.id}`, () => {
      // Law 10: universal expenditure adds metadata to every battle. Keep both
      // old files and check their exact hashes after removing ONLY that event
      // and normalizing sequence counters; freeze full current events separately.
      const prior = historical ?? identityGolden.cases.find((row: { id: string }) => row.id === fixture.id)
      const eventExpected = eventGolden.cases.find((row: { id: string }) => row.id === fixture.id)
      let expected = propGolden.cases.find((row: { id: string }) => row.id === fixture.id)
      for (const suspended of [false, true]) {
        const ctx = fixture.create()
        let result
        if (suspended) {
          while (true) {
            const next = battle.advanceBattle(ctx)
            if (next.kind === 'complete') { result = next.result; break }
            // No hidden iterator/closure: the cursor can round-trip at every yield.
            ctx.battleCursor = JSON.parse(JSON.stringify(ctx.battleCursor))
            runActivation(ctx, next.actor)
            battle.completeActionCycle(ctx)
          }
        } else result = battle.runBattle(ctx)
        // Historical shorthand projection is only meaningful for a historical
        // row. New direct geometry retains exact automatic/suspended comparison.
        const projected = eventExpected || prior ? projectShorthand(ctx, mapDef(ctx.state.mapId).rows.join('').split('').map(g => GLYPH[g]!)) : {events:ctx.events,state:ctx.state}
        if (eventExpected) {
          expect(hash(projected.events), 'prior event contract, exact prop projection').toBe(eventExpected.events)
          expect(hash(projected.state), 'prior state, exact prop projection').toBe(eventExpected.state)
          expect(hash(ctx.rng.log)).toBe(eventExpected.rng)
          expect(result).toEqual(eventExpected.result)
        }
        if (prior) {
          const oldEvents = projected.events.filter(e => e.type !== 'action.spent').map((e, seq) => ({ ...e, seq }))
          const oldState = { ...projected.state, seq: ctx.state.seq - (ctx.events.length - oldEvents.length) }
          expect(hash(oldEvents), 'historical events without new metadata').toBe(prior.events)
          expect(hash(oldState), 'historical state without new sequence count').toBe(prior.state)
          expect(hash(ctx.rng.log), 'historical RNG').toBe(prior.rng)
          expect(result, 'historical result').toEqual(prior.result)
        }
        expected ??= { events: hash(ctx.events), state: hash(ctx.state), rng: hash(ctx.rng.log), result }
        expect(hash(ctx.events), 'events').toBe(expected.events)
        expect(hash(ctx.state), 'state').toBe(expected.state)
        expect(hash(ctx.rng.log), 'RNG draws').toBe(expected.rng)
        expect(result).toEqual(expected.result)
        expect(ctx.events.at(-1)!.type).toBe('battle.end')
      }
    })
  }
  it('retains every historical case and actual surge links as the corpus grows', () => {
    const historicalIds = golden.cases.map((row: { id: string }) => row.id)
    expect(battleCursorCases().filter(row => historicalIds.includes(row.id)).map(row => row.id)).toEqual(historicalIds)
    expect(golden.cases.filter((row: { id: string }) => row.id.startsWith('progression-surge')).reduce((n: number, row: { surgeHits: number }) => n + row.surgeHits, 0)).toBeGreaterThan(0)
    for (const corpus of [identityGolden, eventGolden, propGolden]) {
      const ids = corpus.cases.map((row: { id: string }) => row.id)
      expect(battleCursorCases().filter(row => ids.includes(row.id)).map(row => row.id)).toEqual(ids)
    }
  })
})
