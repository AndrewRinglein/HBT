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
import {projectBlock} from './block-projection.js'
import { projectPacketEvents } from './packet-projection.js'
import { projectLoadout } from './loadout-projection.js'

const golden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-golden.json', import.meta.url), 'utf8'))
const identityGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-identities.json', import.meta.url), 'utf8'))
const eventGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-action-spent.json', import.meta.url), 'utf8'))
// Intentional fix.ai-melee-contact migration: old fixtures remain immutable.
// compare-contact-transition proves every changed first choice is a cheaper
// equal-distance dumb-melee destination. Unchanged cases keep all prior checks.
const contactGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-contact.json', import.meta.url), 'utf8'))
// Law 10 / V2 sections 8 and 18: exact typed-damage transition captured
// against 1723e63. Every changed first event is Burn or Poison's typed tick.
// Historical fixtures remain immutable; both drivers retain exact full hashes.
const elementalGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-elemental.json', import.meta.url), 'utf8'))
// V2 section 18: seven first differences now consume Protection before typed HP damage.
const protectionGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-protection.json', import.meta.url), 'utf8'))
// V2 packet facts and Protection reservation: old files stay immutable. The
// transition tool proves the actual first raw and semantic difference per case.
// Metadata-only cases retain every earlier historical assertion via projection.
const packetGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-packets.json', import.meta.url), 'utf8'))
// V2 burst migration: four first differences are replaced attack/power declarations.
// All 42 prior inputs remain unchanged; full current hashes are frozen separately.
const blockGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-block.json', import.meta.url), 'utf8'))
const burstGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-bursts.json', import.meta.url), 'utf8'))
// v2.shields (2026-09-23), Law 10: Block went live on fielded heroes (Kite/Round/Tower,
// sword and dagger Block). Cases marked `changed` moved — the fixture counts each case's
// landed blocks — and are checked against the new frozen hashes on both drivers; every
// unchanged case keeps every prior assertion. Old fixtures stay immutable.
const shieldGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-shields.json', import.meta.url), 'utf8'))
// v2.knockback-collisions (2026-09-23), Law 10: a stopped push is a collision now
// (COMBAT-V2 §9.3). The one case that moved (showcase.gash-variant, a blocked push
// that costs its mover) is checked against its new frozen hashes on both drivers;
// every unchanged case keeps every prior assertion. Old fixtures stay immutable.
const knockGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-knockback.json', import.meta.url), 'utf8'))
// v2.kdb (2026-09-23), Law 10: every physical hit now makes a KDB check (COMBAT-V2 §9)
// and emits kdb.rolled; fired checks push and prone. Every case marked `changed` moved and
// is checked against its new frozen hashes on both drivers; unchanged cases keep every
// prior assertion. Old fixtures stay immutable.
const kdbGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-kdb.json', import.meta.url), 'utf8'))
// v2.thorns (2026-09-24), Law 10: Thorns is a magnitude (COMBAT-V2 §9.4). The golem's
// V1 retaliation trigger became test.badge.bramble (1 true on each connecting melee hit),
// so the cases that field it moved; `changed` cases are checked against new frozen hashes
// on both drivers. Old fixtures stay immutable.
const thornsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-thorns.json', import.meta.url), 'utf8'))
// v2.loadout (2026-09-24), Law 10: item instances are fielding metadata (loadout-projection.ts).
// Every case's full current hashes are frozen here; every older assertion runs on the projection.
const loadoutGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-loadout.json', import.meta.url), 'utf8'))
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
      const blockExpected = blockGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const contactExpected = contactGolden.cases.find((row: {id:string}) => row.id === fixture.id)
      const elementalExpected = elementalGolden.cases.find((row: {id:string}) => row.id === fixture.id)
      const protectionExpected = protectionGolden.cases.find((row: {id:string}) => row.id === fixture.id)
      const packetExpected = packetGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const burstExpected = burstGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const shieldExpected = shieldGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const knockExpected = knockGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const kdbExpected = kdbGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const thornsExpected = thornsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const thornsMoved = thornsExpected?.changed === true
      const kdbMoved = kdbExpected?.changed === true || thornsMoved
      const knockMoved = knockExpected?.changed === true || kdbMoved
      const shieldMoved = shieldExpected?.changed === true || knockMoved
      const migrated = shieldMoved || burstExpected?.changed === true || packetExpected?.semanticChanged === true || protectionExpected?.changed === true || elementalExpected?.changed === true || contactExpected?.changed === true
      const prior = migrated ? undefined : historical ?? identityGolden.cases.find((row: { id: string }) => row.id === fixture.id)
      const eventExpected = migrated ? undefined : eventGolden.cases.find((row: { id: string }) => row.id === fixture.id)
      let expected = (thornsMoved ? thornsExpected : undefined) ?? (kdbMoved ? kdbExpected : undefined) ?? (knockMoved ? knockExpected : undefined) ?? (shieldMoved ? shieldExpected : undefined) ?? burstExpected ?? packetExpected ?? protectionExpected ?? elementalExpected ?? contactExpected ?? propGolden.cases.find((row: { id: string }) => row.id === fixture.id)
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
        const loadoutExpected = loadoutGolden.cases.find((row:{id:string})=>row.id===fixture.id)
        // Law 10, 2026-09-24 (v2.swap): a case newer than the capture (test.swap) has no frozen
        // row; it keeps the automatic/suspended comparison below, like every new case before it.
        if (loadoutExpected) {
        expect(hash(ctx.events), 'full v2.loadout events').toBe(loadoutExpected.events)
        expect(hash(ctx.state), 'full v2.loadout state').toBe(loadoutExpected.state)
        expect(hash(ctx.rng.log), 'full v2.loadout RNG').toBe(loadoutExpected.rng)
        expect(result).toEqual(loadoutExpected.result)
        }
        // every older assertion below runs on the projection (metadata removed, nothing else)
        Object.assign(ctx, projectLoadout(ctx))
        // Historical shorthand projection is only meaningful for a historical
        // row. New direct geometry retains exact automatic/suspended comparison.
        // V2 Block metadata-only projection refuses any positive cup. All old
        // golden assertions remain exact, plus current raw hashes are retained.
        const historicalCtx=blockExpected&&!shieldMoved?{...ctx,...projectBlock(ctx)}:ctx
        if(blockExpected&&!shieldMoved){
          expect(hash(ctx.events),'full Block events').toBe(blockExpected.events)
          expect(hash(ctx.state),'full Block state').toBe(blockExpected.state)
          expect(hash(ctx.rng.log),'full Block RNG').toBe(blockExpected.rng)
          expect(result).toEqual(blockExpected.result)
        }
        const projected = eventExpected || prior ? projectShorthand({...historicalCtx,events:projectPacketEvents(historicalCtx.events)}, mapDef(historicalCtx.state.mapId).rows.join('').split('').map(g => GLYPH[g]!)) : {events:historicalCtx.events,state:historicalCtx.state}
        if (eventExpected) {
          expect(hash(projected.events), 'prior event contract, exact prop projection').toBe(eventExpected.events)
          expect(hash(projected.state), 'prior state, exact prop projection').toBe(eventExpected.state)
          expect(hash(historicalCtx.rng.log)).toBe(eventExpected.rng)
          expect(result).toEqual(eventExpected.result)
        }
        if (prior) {
          const oldEvents = projected.events.filter(e => e.type !== 'action.spent').map((e, seq) => ({ ...e, seq }))
          const oldState = { ...projected.state, seq: historicalCtx.state.seq - (historicalCtx.events.length - oldEvents.length) }
          expect(hash(oldEvents), 'historical events without new metadata').toBe(prior.events)
          expect(hash(oldState), 'historical state without new sequence count').toBe(prior.state)
          expect(hash(historicalCtx.rng.log), 'historical RNG').toBe(prior.rng)
          expect(result, 'historical result').toEqual(prior.result)
        }
        expected ??= { events: hash(historicalCtx.events), state: hash(historicalCtx.state), rng: hash(historicalCtx.rng.log), result }
        expect(hash(historicalCtx.events), 'events').toBe(expected.events)
        expect(hash(historicalCtx.state), 'state').toBe(expected.state)
        expect(hash(historicalCtx.rng.log), 'RNG draws').toBe(expected.rng)
        expect(result).toEqual(expected.result)
        expect(ctx.events.at(-1)!.type).toBe('battle.end')
      }
    })
  }
  it('retains every historical case and actual surge links as the corpus grows', () => {
    const historicalIds = golden.cases.map((row: { id: string }) => row.id)
    expect(battleCursorCases().filter(row => historicalIds.includes(row.id)).map(row => row.id)).toEqual(historicalIds)
    expect(golden.cases.filter((row: { id: string }) => row.id.startsWith('progression-surge')).reduce((n: number, row: { surgeHits: number }) => n + row.surgeHits, 0)).toBeGreaterThan(0)
    for (const corpus of [identityGolden, eventGolden, propGolden, contactGolden, elementalGolden, protectionGolden, packetGolden, burstGolden, blockGolden, shieldGolden, knockGolden, kdbGolden]) {
      const ids = corpus.cases.map((row: { id: string }) => row.id)
      expect(battleCursorCases().filter(row => ids.includes(row.id)).map(row => row.id)).toEqual(ids)
    }
  })
})
