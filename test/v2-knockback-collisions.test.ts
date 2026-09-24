// v2.knockback-collisions — V2 R4 part 1: knockback geometry and collisions
// (COMBAT-V2-DESIGN-2026-09-07.md §9.3, re-ruled 2026-09-07). Knockback from ANY
// source: a push that is stopped deals TRUE damage to the MOVER only =
// blocker's collision value × remaining knockback points. A unit is 1 + Thorns,
// a basic obstruction / wall / map edge 2, the well 3; the struck unit or prop
// takes nothing and is not moved; a `consumes` prop takes a unit the collision
// kills (no corpse, no Deathbed). The damage-triggered KDB roll is the next item.
//
// Test props (content test/maps.json, test.map.well-shove, 9x7): on the middle
// row, column 2 prop.test.boulder (collisionValue 4), column 6 prop.test.well
// (collisionValue 3, consumes). The numbers are TEST data. C(c) is that row's hex.
import { describe, it, expect } from 'vitest'
import { createCustomBattle, createBattle } from '../src/core/setup.js'
import { executeKnockback, COLLISION_OBSTRUCTION, COLLISION_UNIT_BASE } from '../src/core/movement.js'
import { performAttack } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { applyStatus, isProne } from '../src/core/status.js'
import { settle } from '../src/core/settle.js'
import { runBattle } from '../src/core/battle.js'
import { saveBattle, restoreBattle } from '../src/core/snapshot.js'
import { ITEMS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { hexId, stepAwayFrom } from './board16.js'
import type { Ctx, Event } from '../src/core/types.js'

const WELL = 'prop.test.well'
const BOULDER = 'prop.test.boulder'
const WELL_MAP = 'test.map.well-shove'
const C = (col: number) => 3 * 9 + col

const collisions = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'damage.applied' && e['collision'] === true)
const last = (ctx: Ctx, type: string) => [...ctx.events].reverse().find((e) => e.type === type) as Event

/** The middle row: pusher and mover placed by column; triggers off so only the push acts. */
const row = (pusherCol: number, moverCol: number, opts: { heroMoves?: boolean } = {}) => {
  const pusherHex = C(pusherCol), moverHex = C(moverCol)
  const ctx = opts.heroMoves
    ? createCustomBattle([{ type: 'test-warrior', hex: moverHex }], [{ type: 'test-zombie', hex: pusherHex }], { mapId: WELL_MAP, strict: true })
    : createCustomBattle([{ type: 'test-warrior', hex: pusherHex }], [{ type: 'test-zombie', hex: moverHex }], { mapId: WELL_MAP, strict: true })
  for (const u of ctx.state.units) u.triggers = []
  const pusher = ctx.state.units.find((u) => u.hex === pusherHex)!
  const mover = ctx.state.units.find((u) => u.hex === moverHex)!
  return { ctx, pusher, mover }
}

describe('geometry — a line from any distance, the vertex tiebreak, adjacency unchanged', () => {
  it('adjacent origins behave exactly as V1', () => {
    expect(stepAwayFrom(135, 118)).toBe(102)
    expect(stepAwayFrom(118, 135)).toBe(151)
    expect(stepAwayFrom(118, 118)).toBeNull()
    expect(stepAwayFrom(22, 6)).toBeNull() // off the top edge
  })
  it('a non-adjacent origin continues its straight line', () => {
    expect(stepAwayFrom(hexId(5, 5), hexId(8, 5))).toBe(hexId(9, 5))   // along a row
    expect(stepAwayFrom(135, 102)).toBe(stepAwayFrom(118, 102))          // two back on an axis = one back
  })
  it('a line through a vertex breaks to the first of E, NE, NW, W, SW, SE', () => {
    // through (8,8) is axial (4,8); from (6,9) is axial (2,9): delta (+2,−1) runs
    // exactly between E (9,8) and NE (8,7) — E comes first.
    expect(stepAwayFrom(hexId(6, 9), hexId(8, 8))).toBe(hexId(9, 8))
    // the mirror: delta (−2,+1) ties W (7,8) and SW (7,9) — W comes first.
    expect(stepAwayFrom(hexId(9, 7), hexId(8, 8))).toBe(hexId(7, 8))
  })
})

describe('collisions — the mover pays value × remaining, in true damage', () => {
  it('a wall-type prop: the well (3) stops a push of 1 — 3 true damage, the mover stays, the prop is untouched', () => {
    const { ctx, pusher, mover } = row(4, 5)
    const hp = mover.hp
    const props = JSON.stringify(ctx.state.props)
    expect(executeKnockback(ctx, pusher.id, mover.id, 1, 'test.push')).toBe(0)
    expect(mover.hex).toBe(C(5))
    expect(hp - mover.hp).toBe(3)
    expect(last(ctx, 'knockback.blocked')).toMatchObject({ collidedWith: 'prop', blocker: WELL, collisionValue: 3, remaining: 1, reason: 'impassable prop' })
    expect(collisions(ctx)).toHaveLength(1)
    expect(collisions(ctx)[0]).toMatchObject({ target: mover.id, actor: pusher.id, causeId: 'test.push', damageType: 'true', blocker: WELL, amount: 3 })
    expect(JSON.stringify(ctx.state.props)).toBe(props)
  })

  it('the second prop is data: the boulder (4) — 4 per point', () => {
    const { ctx, pusher, mover } = row(4, 3)
    const hp = mover.hp
    executeKnockback(ctx, pusher.id, mover.id, 1, 'test.push')
    expect(hp - mover.hp).toBe(4)
    expect(collisions(ctx)[0]).toMatchObject({ blocker: BOULDER, collisionValue: 4, remaining: 1 })
  })

  it('remaining distance: a push of 3 stopped after 1 costs value × 2', () => {
    const { ctx, pusher, mover } = row(3, 4)
    const hp = mover.hp
    expect(executeKnockback(ctx, pusher.id, mover.id, 3, 'test.push')).toBe(1)
    expect(mover.hex).toBe(C(5))
    expect(hp - mover.hp).toBe(3 * 2)
    expect(last(ctx, 'knocked')).toMatchObject({ asked: 3, hexes: 1, stoppedBy: 'impassable prop', blocker: WELL, collisionValue: 3, remaining: 2 })
  })

  it('the board edge is a basic obstruction (2): a push of 2 off the top costs 4', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 22 }], [{ type: 'test-zombie', hex: 6 }], { strict: true })
    for (const u of ctx.state.units) u.triggers = []
    const z = ctx.state.units[1]!, hp = z.hp
    expect(executeKnockback(ctx, 0, z.id, 2, 'test.push')).toBe(0)
    expect(z.hex).toBe(6)
    expect(COLLISION_OBSTRUCTION).toBe(2)
    expect(hp - z.hp).toBe(2 * 2)
    expect(last(ctx, 'knockback.blocked')).toMatchObject({ reason: 'edge of the board', collidedWith: 'edge', collisionValue: 2, remaining: 2 })
  })

  it('a unit (1 + Thorns): only the mover is hurt; the struck unit takes nothing and does not move', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }, { type: 'test-zombie', hex: hexId(8, 5) }], { strict: true })
    for (const u of ctx.state.units) u.triggers = []
    const mover = ctx.state.units[1]!, struck = ctx.state.units[2]!
    const [mhp, shp] = [mover.hp, struck.hp]
    expect(executeKnockback(ctx, 0, mover.id, 3, 'test.push')).toBe(1)
    expect(mover.hex).toBe(hexId(7, 5))
    expect(mhp - mover.hp).toBe(COLLISION_UNIT_BASE * 2)
    expect(struck.hp).toBe(shp)
    expect(struck.hex).toBe(hexId(8, 5))
    expect(ctx.events.filter((e) => e.type === 'damage.applied' && e.target === struck.id)).toHaveLength(0)
    expect(ctx.events.filter((e) => e.type === 'knocked' || e.type === 'knockback.blocked')).toHaveLength(1) // no chaining
    expect(last(ctx, 'knocked')).toMatchObject({ collidedWith: 'unit', blocker: struck.id, collisionValue: 1, remaining: 2 })
  })

  it('Protection absorbs collision damage; Armor does not (true damage)', () => {
    const { ctx, pusher, mover } = row(4, 5)
    mover.mods.push({ stat: 'armor', op: 'add', value: 10, source: 'test', scope: 'unit' })
    applyStatus(ctx, mover.id, 'status.protection', 2, 'test')
    const hp = mover.hp
    executeKnockback(ctx, pusher.id, mover.id, 1, 'test.push')
    expect(hp - mover.hp).toBe(3 - 2)
    expect(collisions(ctx)[0]).toMatchObject({ absorbed: 2, amount: 1 })
    expect(mover.statuses.find((s) => s.id === 'status.protection')).toBeUndefined()
  })

  it('an already-prone mover is still pushed (prone only stops KDB, the next item)', () => {
    const { ctx, pusher, mover } = row(3, 4)
    applyStatus(ctx, mover.id, 'status.prone', 1, 'test')
    expect(isProne(ctx, mover)).toBe(true)
    expect(executeKnockback(ctx, pusher.id, mover.id, 1, 'test.push')).toBe(1)
    expect(mover.hex).toBe(C(5))
  })
})

describe('consumes — the well takes a unit its collision kills', () => {
  it('an enemy: dead, no corpse, onDeath fires', () => {
    const { ctx, pusher, mover } = row(4, 5)
    mover.hp = 3
    executeKnockback(ctx, pusher.id, mover.id, 1, 'test.push')
    settle(ctx, 'test.push')
    expect(mover.lifeState).toBe('dead')
    expect(last(ctx, 'life.dead')).toMatchObject({ target: mover.id, reason: 'consumed', by: WELL, corpse: false })
    expect(collisions(ctx)[0]).toMatchObject({ consumedBy: WELL })
    expect(ctx.events.some((e) => e.type === 'corpse.created')).toBe(false)
  })

  it('a hero skips the Deathbed — and the boulder, which does not consume, does not', () => {
    const consumed = row(4, 5, { heroMoves: true })
    consumed.mover.hp = 2
    executeKnockback(consumed.ctx, consumed.pusher.id, consumed.mover.id, 1, 'test.push')
    settle(consumed.ctx, 'test.push')
    expect(consumed.mover.lifeState).toBe('dead')
    expect(consumed.ctx.events.some((e) => e.type.startsWith('deathbed.'))).toBe(false)
    expect(consumed.ctx.events.some((e) => e.type === 'corpse.created' || e.type === 'bleedout.set')).toBe(false)

    const rock = row(4, 3, { heroMoves: true })
    rock.mover.hp = 2
    executeKnockback(rock.ctx, rock.pusher.id, rock.mover.id, 1, 'test.push')
    settle(rock.ctx, 'test.push')
    expect(rock.ctx.events.some((e) => e.type.startsWith('deathbed.'))).toBe(true)
  })

  it('a collision that does not kill leaves no mark', () => {
    const { ctx, pusher, mover } = row(4, 5)
    executeKnockback(ctx, pusher.id, mover.id, 1, 'test.push')
    settle(ctx, 'test.push')
    expect(mover.lifeState).toBe('standing')
    expect(mover.consumedBy).toBeUndefined()
  })

  it('the mark survives a snapshot round-trip', () => {
    const { ctx, pusher, mover } = row(4, 5)
    mover.hp = 1
    executeKnockback(ctx, pusher.id, mover.id, 1, 'test.push')
    const back = restoreBattle(saveBattle(ctx), ctx)
    expect(back.state.units[mover.id]!.consumedBy).toBe(WELL)
  })
})

describe('any source — the ranged pushes now push from range', () => {
  const ranged = (attackId: string, triggerId: string, itemId: string, from: number, at: number) => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: from }], [{ type: 'test-zombie', hex: at }], { strict: true })
    const h = ctx.state.units[0]!, z = ctx.state.units[1]!
    h.triggers = [ITEMS[itemId]!.triggers!.find((t) => t.id === triggerId)!]
    h.actions = [...h.actions, attackId]
    z.triggers = []
    h.mods.push({ stat: 'accuracy', op: 'add', value: 300, source: 'test', scope: 'unit' })
    z.hp = z.maxHp = 99
    beginActivation(ctx, h.id, 'test')
    const r = performAttack(ctx, h.id, z.id, attackId)
    return { ctx, z, r }
  }
  it('power-shot.knockback from 4 hexes pushes along the line', () => {
    const { ctx, z, r } = ranged('attack.barbarian-bow.power-shot', 'trigger.barbarian-bow.power-shot.knockback', 'item.barbarian-bow', hexId(3, 5), hexId(7, 5))
    expect(r.hit).toBe(true)
    expect(z.hex).toBe(hexId(8, 5))
    expect(last(ctx, 'knocked')).toMatchObject({ causeId: 'trigger.barbarian-bow.power-shot.knockback', from: hexId(7, 5), to: hexId(8, 5) })
  })
  it('earth-blast.knockback on a vertex line takes the tiebreak direction', () => {
    const { ctx, z, r } = ranged('attack.earth-staff.earth-blast', 'trigger.earth-staff.earth-blast.knockback', 'item.earth-staff', hexId(6, 9), hexId(8, 8))
    expect(r.hit).toBe(true)
    expect(z.hex).toBe(hexId(9, 8))
    expect(last(ctx, 'knocked')).toMatchObject({ causeId: 'trigger.earth-staff.earth-blast.knockback' })
  })
  it('preview and execution agree: the attack event carries the previewed damage; the collision is its own event', () => {
    const { ctx } = ranged('attack.barbarian-bow.power-shot', 'trigger.barbarian-bow.power-shot.knockback', 'item.barbarian-bow', hexId(2, 5), hexId(0, 5))
    // from col 2 to col 0: the push leaves the board — an edge collision
    const declared = ctx.events.find((e) => e.type === 'attack.declared')!
    const hit = ctx.events.find((e) => e.type === 'damage.applied' && e.causeId === 'attack.barbarian-bow.power-shot')!
    expect((hit['amount'] as number) + (hit['overkill'] as number)).toBe(declared['damageOnHit'])
    expect(collisions(ctx)).toHaveLength(1)
    expect(collisions(ctx)[0]).toMatchObject({ causeId: 'trigger.barbarian-bow.power-shot.knockback', collidedWith: 'edge', amount: 2 })
  })
})

describe('a real battle — test.knockback-well', () => {
  const run = () => { const ctx = createBattle(scenarioOptions(SCENARIOS['test.knockback-well']!)); const r = runBattle(ctx); return { ctx, r } }
  it('both props stop pushes, the collisions hurt only the movers, and the well consumes', () => {
    const { ctx } = run()
    const hits = collisions(ctx)
    expect(hits.some((e) => e['blocker'] === BOULDER)).toBe(true)
    expect(hits.some((e) => e['blocker'] === WELL)).toBe(true)
    for (const e of hits) expect(ctx.state.units[e.target!]!.side).toBe('enemy')
    const eaten = ctx.events.find((e) => e.type === 'life.dead' && e['reason'] === 'consumed')!
    expect(eaten).toBeDefined()
    expect(ctx.events.some((e) => e.type === 'corpse.created' && e['of'] === eaten.target)).toBe(false)
  })
  it('replays byte-identically', () => {
    expect(JSON.stringify(run().ctx.events)).toBe(JSON.stringify(run().ctx.events))
  })
})
