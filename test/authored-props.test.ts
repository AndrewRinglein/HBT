import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createBattle } from '../src/core/setup.js'
import { canAttack } from '../src/core/pipeline.js'
import { reachable, planMovement, movementOptions, flightLandings, executeKnockback } from '../src/core/movement.js'
import { decodeMap, terrainOf, mapDef } from '../src/content/maps.js'
import { saveBattle, restoreBattle } from '../src/core/snapshot.js'
import { mapBoardOf } from '../src/content/pack.js'
import { decodeProps, passableHexes } from '../src/core/props.js'
import { arrive } from '../src/core/encounter.js'
import { advanceBattle } from '../src/core/battle.js'
import { executeBattleCommand } from '../src/core/commands.js'
import { renderBoard } from '../src/view/text.js'
import type { HighProp, MoveDef } from '../src/core/types.js'

// The historical fixtures deliberately exercise only full-hex geometry.
const prop = (hexes = [7]): HighProp & {footprint:{kind:'hex';hexes:number[]}} => ({ id: 'prop.fixture', height: 'high', material: 3, footprint: { kind: 'hex', hexes } })
const row = (props = [prop()]) => ({ id: 'test.map.props', name: 'Props', rows: ['.....', '..w..', '.....'], props })
const setup = (map = row()) => createBattle({ replicate: 0, heroes: ['test-ranger'], enemies: ['test-zombie'], heroHexes: [5], enemyHexes: [9], map: map as any })

describe('canonical authored high props', () => {
  it.each(['pack-first', 'setup-first'])('loads real prop packs in a fresh native %s process', order => {
    const imports = ["import {packTestMaps} from './src/content/pack.ts'", "import {createBattle} from './src/core/setup.ts'"]
    if (order === 'setup-first') imports.reverse()
    const script = "import assert from 'node:assert/strict';" + imports.join(';') + "; const id='test.map.high-prop-single';const map=packTestMaps().find(m=>m.id===id);const ctx=createBattle({replicate:0,mapId:id});assert.deepEqual(ctx.state.props,map.props);console.log('loaded')"
    expect(execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', '-e', script], { encoding: 'utf8' }).trim()).toBe('loaded')
  })
  it('accepts deeply readonly authored inputs and produces mutable detached state', () => {
    const map = { id: 'test.map.const', name: 'Readonly', rows: ['.w.'], props: [{ id: 'prop.const', height: 'high', material: 1, footprint: { kind: 'hex', hexes: [1] } }] } as const
    const ctx = createBattle({ replicate: 0, heroes: [], enemies: [], map })
    if(ctx.state.props[0]!.footprint.kind!=='hex')throw Error('expected hex fixture')
    ctx.state.props[0]!.footprint.hexes[0] = 2
    expect(map.props[0].footprint.hexes).toEqual([1])
  })
  it.each(['test.map.high-prop-single', 'test.map.high-prop-multi'])('%s survives real publication, commands and passive field export', mapId => {
    const ctx = createBattle({ replicate: 0, mapId, heroes: ['test-ranger'], enemies: ['test-zombie'], heroHexes: [88], enemyHexes: [92] })
    const authored = mapDef(mapId).props!
    expect(ctx.state.props).toEqual(authored)
    expect(ctx.state.terrain[90]).toBe(5)
    expect(canAttack(ctx, 0, 1, 'attack.test-ranger.bow')).toBe(false)
    const field = JSON.parse(execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'tools/field-geometry.mts', mapId], { encoding: 'utf8' }))
    expect(field.props).toEqual(authored)
    expect(field.terrainIds[90]).toBe('terrain.water')
    for (const p of authored) {if(p.footprint.kind!=='hex')throw Error('expected hex fixture');for (const h of p.footprint.hexes) expect(field.passable[h]).toBe(false)}
    advanceBattle(ctx)
    ctx.state.props = []
    expect(executeBattleCommand(ctx, { humanUnitUids: [ctx.state.units[0]!.uid] }, { kind: 'action', actor: 0, actionId: 'attack.test-ranger.bow', target: 1, expectedSeq: ctx.state.seq }).ok).toBe(true)
    expect(ctx.events.filter(e => e.type === 'action.spent')).toHaveLength(1)
    expect(ctx.events.find(e => e.type === 'map.loaded')!.props).toEqual(authored)
  })
  // V2 now supports low; keep the malformed-height rule with an unknown height.
  it.each([null, {}, [null], [{ ...prop(), id: 'bare' }], [{ ...prop(), id: 'prop.obstacle.7' }], [prop(), prop()], [{ ...prop(), material: 0 }], [{ ...prop(), height: 'medium' }], [prop([])], [prop([7, 7])], [prop([15])], [prop([-1])], [prop([1.5])], [{ ...prop(), footprint: { kind: 'edge', hexes: [7] } }], [{ ...prop(), destruction: {} }]].map(props => ({ props })))('rejects malformed authored props at loader and direct boundaries: $props', ({ props }) => {
    for (const decode of [mapBoardOf, decodeMap]) expect(() => decode({ ...row(), props } as any)).toThrow(/prop/i)
  })
  it('rejects sparse, excessive and accessor arrays without invoking them', () => {
    for (const value of [new Array(10001), [prop([7]), , prop([8])]]) expect(() => decodeProps(value, 15)).toThrow(/props/)
    const values = [prop()]
    Object.defineProperty(values, '0', { get() { throw new Error('invoked getter') } })
    expect(() => decodeProps(values, 15)).toThrow(/dense data/)
    const hexes = [7]; hexes[Symbol.iterator] = () => { throw new Error('invoked iterator') }
    expect(() => decodeProps([prop(hexes)], 15)).toThrow(/array/)
  })
  it('permits generated reserved IDs only in canonical state, preserving independent initial facts', () => {
    const ctx = createBattle({ replicate: 0, heroes: [], enemies: [], map: { id: 'test.map.reserved', name: 'Reserved', rows: ['.x.'] } })
    expect(restoreBattle(saveBattle(ctx), ctx).state.props).toEqual(ctx.state.props)
    for (const target of ['state', 'initial'] as const) {
      const saved = JSON.parse(saveBattle(ctx))
      const holder = target === 'state' ? saved.state : saved.events.find((e: any) => e.type === 'map.loaded')
      holder.terrain[1] = 6
      expect(() => restoreBattle(JSON.stringify(saved), ctx)).toThrow(/terrain/)
    }
  })
  it.each(['state', 'initial'])('rejects malformed saved %s props', target => {
    const ctx = setup(), saved = JSON.parse(saveBattle(ctx))
    const holder = target === 'state' ? saved.state : saved.events.find((e: any) => e.type === 'map.loaded')
    holder.props[0].footprint.hexes = [99]
    expect(() => restoreBattle(JSON.stringify(saved), ctx)).toThrow(/props/)
  })
  it.each(['power.move', 'power.sidestep', 'power.flight'])('%s rejects prop landing without spending, then uses the same cleared cell', id => {
    const ctx = setup(row([prop([6])])), unit = ctx.state.units[0]!
    if (!unit.actions.includes(id)) unit.actions.push(id)
    advanceBattle(ctx)
    const before = saveBattle(ctx), policy = { humanUnitUids: [unit.uid] }
    expect(executeBattleCommand(ctx, policy, { kind: 'action', actor: 0, actionId: id, destination: 6, expectedSeq: ctx.state.seq }).ok).toBe(false)
    expect(saveBattle(ctx)).toBe(before)
    expect(planMovement(ctx, 0, id, 6)).toMatchObject({ ok: false })
    if (id === 'power.flight') expect(flightLandings(ctx, unit, ctx.actions[id] as MoveDef)).not.toContain(6)
    ctx.state.props = []
    expect(executeBattleCommand(ctx, policy, { kind: 'action', actor: 0, actionId: id, destination: 6, expectedSeq: ctx.state.seq }).ok).toBe(true)
    expect(unit.hex).toBe(6)
  })
  it('shares full footprints across placement, arrivals and prepared movement views', () => {
    expect(() => createBattle({ replicate: 0, map: row(), heroes: ['test-ranger'], enemies: [], heroHexes: [7] })).toThrow(/high prop/)
    const ctx = setup(), passable = passableHexes(ctx)
    expect(passable(7)).toBe(false)
    const unit = arrive(ctx, ctx.units!['test-zombie']!, 7, 'test', {})
    expect(unit.hex).not.toBe(7)
    if(ctx.state.props[0]!.footprint.kind!=='hex')throw Error('expected hex fixture')
    ctx.state.props[0]!.footprint.hexes = [6, 8]
    const next = passableHexes(ctx)
    expect(next(7)).toBe(true); expect(next(6)).toBe(false); expect(next(8)).toBe(false)
    expect(passable(7)).toBe(false) // immutable view captured for the prior synchronous operation
  })
  it('knockback names the blocking prop and never enters its footprint', () => {
    const ctx = createBattle({ replicate: 0, map: row(), heroes: ['test-warrior'], enemies: ['test-zombie'], heroHexes: [5], enemyHexes: [6] })
    expect(executeKnockback(ctx, 0, 1, 1, 'test')).toBe(0)
    expect(ctx.state.units[1]!.hex).toBe(6)
    // v2.knockback-collisions (2026-09-23, Law 10 — the rule changed, COMBAT-V2 §9.3): the blocked
    // line now names the prop it struck, and the mover's collision damage follows it.
    expect(ctx.events.at(-2)).toMatchObject({ type: 'knockback.blocked', reason: 'impassable prop', at: 6, collidedWith: 'prop', blocker: ctx.state.props[0]!.id })
    expect(ctx.events.at(-1)).toMatchObject({ type: 'damage.applied', target: 1, collision: true, damageType: 'true' })
  })
  it('sidestep enumeration prepares blockage once, not once per board cell', () => {
    const ctx = setup(), props = ctx.state.props
    ctx.state.units[0]!.actions.push('power.sidestep')
    let reads = 0
    Object.defineProperty(ctx.state, 'props', { get() { reads++; return props }, configurable: true })
    const options = movementOptions(ctx, 0, 'power.sidestep')
    expect(options.length).toBeGreaterThan(0)
    expect(reads).toBe(1)
  })
  it('text board renders unknown-map prop facts without registry lookups', () => {
    const ctx = setup()
    expect(renderBoard(new Map(), ctx.state.mapId, ctx.events).split('#')).toHaveLength(2)
  })
  it('normalizes x once into OPEN ground and a stable high prop', () => {
    const decoded = decodeMap({ id: 'test.map.shorthand', name: 'Shorthand', rows: ['.x.'] }) as any
    expect(decoded.terrain).toEqual([0, 0, 0])
    expect(decoded.props).toEqual([{ id: 'prop.obstacle.1', height: 'high', material: 3, footprint: { kind: 'hex', hexes: [1] } }])
    expect(terrainOf('map.thicket')).not.toContain(6)
  })
  it('preserves ground while blocking ordinary and reaction shots and reachable cells', () => {
    const ctx = setup()
    expect(ctx.state.terrain[7]).toBe(5)
    expect((ctx.state as any).props).toEqual([prop()])
    expect(canAttack(ctx, 0, 1, 'attack.test-ranger.bow')).toBe(false)
    expect(canAttack(ctx, 0, 1, 'attack.test-ranger.bow', 'reaction')).toBe(false)
    expect(reachable(ctx, ctx.state.units[0]!).has(7)).toBe(false)
  })
  it('detaches caller footprints and authoritative initial facts across save/restore', () => {
    const input = row(), ctx = setup(input)
    input.props[0]!.footprint.hexes[0] = 6
    const fact = ctx.events.find(e => e.type === 'map.loaded')! as any
    expect(fact.props).toEqual([prop()])
    ;(ctx.state as any).props[0].footprint.hexes[0] = 8
    expect(fact.props).toEqual([prop()])
    const restored = restoreBattle(saveBattle(ctx), ctx)
    expect((restored.state as any).props[0].footprint.hexes).toEqual([8])
    expect((restored.events.find(e => e.type === 'map.loaded') as any).props).toEqual([prop()])
  })
})
