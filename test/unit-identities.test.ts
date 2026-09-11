import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle, type BattleOptions } from '../src/core/setup.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { advanceBattle } from '../src/core/battle.js'
import { executeBattleCommand } from '../src/core/commands.js'
import { beginActivation } from '../src/core/mutate.js'
import { performAttack } from '../src/core/pipeline.js'
import { attacksOf } from '../src/core/action.js'
import { fireTriggers } from '../src/core/trigger.js'

const heroes = [{ type: 'test-warrior', hex: 85 }, { type: 'test-warrior', hex: 90 }]
const enemies = [{ type: 'test-zombie', hex: 86 }]
const custom = (extra: object = {}) => createCustomBattle(heroes, enemies, { strict: true, ...extra })
const standard = (extra: object = {}) => createBattle({
  replicate: 0, strict: true, heroes: heroes.map(h => h.type), enemies: enemies.map(e => e.type),
  heroHexes: heroes.map(h => h.hex), enemyHexes: enemies.map(e => e.hex), ...extra,
} as BattleOptions)

describe('unit identity at setup and continuation', () => {
  it.each(['standard', 'custom'])('%s setup does not overlap identities on large rosters', factory => {
    const roster = Array.from({ length: 101 }, (_, hex) => ({ type: 'test-warrior', hex }))
    const opposition = [{ type: 'test-zombie', hex: 400 }]
    const c = factory === 'standard' ? createBattle({ replicate: 0, mapId: 'test.map.horde-24',
      heroes: roster.map(h => h.type), heroHexes: roster.map(h => h.hex), enemies: opposition.map(e => e.type), enemyHexes: [400] })
      : createCustomBattle(roster, opposition, { mapId: 'test.map.horde-24' })
    expect(c.state.units).toHaveLength(102)
    expect(new Set(c.state.units.map(u => u.uid)).size).toBe(102)
    expect(restoreBattle(saveBattle(c), c).state.units).toEqual(c.state.units)
  })

  it.each([standard, custom])('preserves ordinary identities and exposes explicit ones in enter events', factory => {
    expect(factory().state.units.map(u => u.uid)).toEqual([100, 101, 200])
    const c = factory({ heroUids: [0, 0xffffffff], enemyUids: [70] })
    expect(c.state.units.map(u => u.uid)).toEqual([0, 0xffffffff, 70])
    expect(c.events.filter(e => e.type === 'unit.enter').map(e => e.uid)).toEqual([0, 0xffffffff, 70])
  })

  it.each([standard, custom])('reserves later caller identities before automatic allocation', factory => {
    const c = factory({ heroUids: [undefined, 100], enemyUids: [101] })
    expect(c.state.units.map(u => u.uid)).toEqual([102, 100, 101])
  })

  it.each([
    { heroUids: [8, 8] }, { heroUids: [8, 9], enemyUids: [8] },
    { heroUids: [8] }, { enemyUids: [] }, { heroUids: null }, { enemyUids: '8' },
    ...[-1, 1.5, NaN, Infinity, 0x100000000, Number.MAX_SAFE_INTEGER, null, '10'].map(uid => ({ heroUids: [uid, 11] })),
  ])('rejects malformed or colliding caller identities: %j', extra => {
    expect(() => standard(extra)).toThrow(/identit|uid/i)
    expect(() => custom(extra)).toThrow(/identit|uid/i)
  })

  it('does not mutate supplied identity arrays', () => {
    const extra = { heroUids: Object.freeze([undefined, 100]), enemyUids: Object.freeze([101]) }
    expect(custom(extra).state.units.map(u => u.uid)).toEqual([102, 100, 101])
    expect(extra.heroUids).toEqual([undefined, 100])
    expect(extra.enemyUids).toEqual([101])
  })

  it('arrivals fill a free identity without colliding with sparse or dead identities', () => {
    const c = custom()
    c.state.units[0]!.uid = 300
    c.state.units[1]!.uid = 302
    c.state.units[1]!.lifeState = 'dead'
    c.state.units[1]!.hp = 0
    const first = c.arrive!(c, c.units!['test-zombie']!, 95, 'test.identity-arrival')
    const second = c.arrive!(c, c.units!['test-zombie']!, 96, 'test.identity-arrival')
    expect([first.uid, second.uid]).toEqual([301, 303])
    expect(new Set(c.state.units.map(u => u.uid)).size).toBe(c.state.units.length)
  })

  it('arrivals continue identically after reload without a captured allocator counter', () => {
    const c = custom({ heroUids: [300, 302], enemyUids: [500] })
    c.arrive!(c, c.units!['test-zombie']!, 95, 'test.identity-arrival')
    const loaded = restoreBattle(saveBattle(c), c)
    c.arrive!(c, c.units!['test-zombie']!, 96, 'test.identity-next')
    loaded.arrive!(loaded, loaded.units!['test-zombie']!, 96, 'test.identity-next')
    expect(loaded.state.units.map(u => u.uid)).toEqual([300, 302, 500, 301, 303])
    expect(loaded.state).toEqual(c.state)
    expect(loaded.events).toEqual(c.events)
    expect(loaded.rng.log).toEqual(c.rng.log)
  })

  it('rejects snapshot identities that alias under the RNG key encoding', () => {
    const c = custom()
    const data = JSON.parse(saveBattle(c))
    data.state.units[0].uid = 0x100000000
    expect(() => restoreBattle(JSON.stringify(data), c)).toThrow(/identity/)
  })

  it('keeps controller ownership across a suspended save', () => {
    const c = custom({ heroUids: [873, 874], enemyUids: [900] })
    advanceBattle(c)
    const loaded = restoreBattle(saveBattle(c), c)
    const actor = loaded.battleCursor!.actor!
    const command = { kind: 'end-cycle', actor, expectedSeq: loaded.state.seq }
    expect(executeBattleCommand(loaded, { humanUnitUids: [873, 874] }, command)).toEqual({ ok: true })
  })

  it('keeps attack dice attached to the same units when roster entries are reordered', () => {
    const opts = { strict: true, heroUids: [873, 874], enemyUids: [900] }
    const a = createCustomBattle(heroes, enemies, opts)
    const b = createCustomBattle([...heroes].reverse(), enemies, { ...opts, heroUids: [874, 873] })
    for (const [c, actor] of [[a, 0], [b, 1]] as const) {
      c.state.turn = 1
      beginActivation(c, actor, 'test.identity')
      performAttack(c, actor, 2, attacksOf(c, c.state.units[actor]!)[0]!.id)
    }
    expect(a.rng.log.some(r => r.stream === 'to-hit')).toBe(true)
    expect(a.rng.log).toEqual(b.rng.log)
    expect(a.state.units[2]!.hp).toBe(b.state.units[2]!.hp)
  })

  it.each([undefined, 7])('keeps trigger dice attached to the target identity, keyTag=%s', keyTag => {
    const opts = { strict: true, heroUids: [873, 874], enemyUids: [900] }
    const a = createCustomBattle(heroes, enemies, opts)
    const b = createCustomBattle([...heroes].reverse(), enemies, { ...opts, heroUids: [874, 873] })
    for (const [c, targetId] of [[a, 0], [b, 1]] as const) {
      c.state.units[2]!.triggers = [{ id: 'trigger.test-identity', source: 'test', hook: 'onHit', chance: 100,
        select: 'target', effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 } }]
      fireTriggers(c, 'onHit', { ownerId: 2, targetId, ordinal: 0, causeId: 'test', ...(keyTag === undefined ? {} : { keyTag }) })
    }
    expect(a.rng.log).toHaveLength(1)
    expect(a.rng.log).toEqual(b.rng.log)
    expect(a.state.units[0]!.statuses).toContainEqual(expect.objectContaining({ id: 'status.poison', value: 1 }))
    expect(a.state.units[0]!.statuses).toEqual(b.state.units[1]!.statuses)
  })

  it.each([0, 0xffffffff])('distinguishes target UID%s from no target in the trigger cup', uid => {
    const c = custom({ heroUids: [uid, 11], enemyUids: [900] })
    c.state.units[2]!.triggers = [{ id: 'trigger.test-identity', source: 'test', hook: 'onHit', chance: 0,
      select: 'self', effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 } }]
    fireTriggers(c, 'onHit', { ownerId: 2, targetId: 0, ordinal: 0, causeId: 'test' })
    expect(() => fireTriggers(c, 'onHit', { ownerId: 2, targetId: null, ordinal: 0, causeId: 'test' })).not.toThrow()
    expect(c.rng.log).toHaveLength(2)
    expect(c.rng.log[0]!.keys).not.toEqual(c.rng.log[1]!.keys)
  })
})
