// ai.sight (DECISIONS.md 2026-09-26, the AI framework; Andrew: "the AI knows
// everything except stealthed units"). The AI's view of the battle excludes a
// unit carrying a status whose row hides it from foes (hidesFromFoes): not a
// target, not a threat, not counted in any score. Everything else it reads in full.
//
// The item's expect, one block each:
//   1. a stealthed hero is never chosen or scored by an AI unit — a zombie beside
//      a veiled Osric does not bite him, and no plan in its decision log names him
//   2. and becomes a target the moment stealth breaks — the Veil removed, or run
//      off its clock at End of Phase, and the same zombie bites
// Plus the second instance (the Shroud, no clock, on an enemy, read by the hero
// AI) and the threat half (a fleeing unit does not flee what it cannot see).
// Both statuses are content/test/statuses.json; the engine names neither. The
// defaults taken are SWITCHES.md "AI sight".
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { beginActivation, removeStatus } from '../src/core/mutate.js'
import { applyStatus, hiddenFrom, tickStatuses } from '../src/core/status.js'
import { livingEnemies, nearestEnemy } from '../src/core/movement.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { STATUSES } from '../src/content/statuses.js'
import type { Ctx, Event } from '../src/core/types.js'
import { hexId, neighbours } from './board16.js'

const VEIL = 'test.status.veil'
const SHROUD = 'test.status.shroud'

function activate(ctx: Ctx, id: number): Event[] {
  const from = ctx.events.length
  beginActivation(ctx, id, 'test'); runActivation(ctx, id)
  return ctx.events.slice(from)
}
const bites = (evs: readonly Event[], actor: number) => evs.filter((e) => e.type === 'attack.declared' && e.actor === actor)
/** Every unit any plan in the actor's decision log names, taken or not. */
const scored = (ctx: Ctx, actor: number) => ctx.aiLog.filter((d) => d.actor === actor).flatMap((d) => d.plans.map((p) => p.target))

/** A zombie beside Osric (who may be veiled), a second Osric six hexes off. */
function veiled(veil: boolean) {
  const z0 = hexId(8, 8)
  const ctx = createCustomBattle(
    [{ type: 'test-osric', hex: neighbours(z0)[0]! }, { type: 'test-osric', hex: hexId(8, 14) }],
    [{ type: 'test-zombie', hex: z0 }])
  ctx.state.turn = 1
  const [near, far, zombie] = [ctx.state.units[0]!, ctx.state.units[1]!, ctx.state.units[2]!]
  for (const u of ctx.state.units) u.hp = u.maxHp = 999   // no one falls; the choices are the claim
  if (veil) applyStatus(ctx, near.id, VEIL, 1, 'test')
  return { ctx, near, far, zombie }
}

describe('the rows carry the flag as data', () => {
  it('Veil and Shroud both hide from foes; the Veil has a clock, the Shroud none', () => {
    expect(STATUSES[VEIL]).toMatchObject({ shape: 'flag', hidesFromFoes: true, decayPerPhase: 1 })
    expect(STATUSES[SHROUD]).toMatchObject({ shape: 'flag', hidesFromFoes: true, decayPerPhase: 0 })
  })
  it('hidden from the other side only — its own side sees it', () => {
    const { ctx, near, far, zombie } = veiled(true)
    expect(hiddenFrom(ctx, zombie, near)).toBe(true)
    expect(hiddenFrom(ctx, far, near)).toBe(false)
    expect(hiddenFrom(ctx, zombie, far)).toBe(false)
    expect(livingEnemies(ctx, zombie).map((u) => u.id)).toEqual([far.id])
    expect(nearestEnemy(ctx, zombie)?.id).toBe(far.id)
  })
})

describe('a stealthed hero is never chosen or scored by an AI unit', () => {
  it('unveiled, the zombie bites the Osric beside it (the control)', () => {
    const { ctx, near, zombie } = veiled(false)
    const evs = activate(ctx, zombie.id)
    expect(bites(evs, zombie.id).map((e) => e.target)).toEqual([near.id])
  })
  it('veiled, the zombie does not bite him, and no plan it weighed names him', () => {
    const { ctx, near, zombie } = veiled(true)
    const evs = activate(ctx, zombie.id)
    expect(bites(evs, zombie.id).filter((e) => e.target === near.id)).toHaveLength(0)
    expect(scored(ctx, zombie.id)).not.toContain(near.id)
  })
  it('with only a veiled hero on the board, the zombie has nobody to fight', () => {
    const z0 = hexId(8, 8)
    const ctx = createCustomBattle([{ type: 'test-osric', hex: neighbours(z0)[0]! }], [{ type: 'test-zombie', hex: z0 }])
    ctx.state.turn = 1
    const [osric, zombie] = [ctx.state.units[0]!, ctx.state.units[1]!]
    applyStatus(ctx, osric.id, VEIL, 1, 'test')
    const evs = activate(ctx, zombie.id)
    // its mode's procedure ends at 'no enemies' (modes.ts): no swing, no step, no plan naming him
    expect(bites(evs, zombie.id)).toHaveLength(0)
    expect(evs.some((e) => e.type === 'move.begin' && e.actor === zombie.id)).toBe(false)
    expect(scored(ctx, zombie.id)).not.toContain(osric.id)
    expect(zombie.hex).toBe(z0)
  })
})

describe('and becomes a target the moment stealth breaks', () => {
  it('the Veil removed, the next Activation bites him', () => {
    const z0 = hexId(8, 8)
    const ctx = createCustomBattle([{ type: 'test-osric', hex: neighbours(z0)[0]! }], [{ type: 'test-zombie', hex: z0 }])
    ctx.state.turn = 1
    const [osric, zombie] = [ctx.state.units[0]!, ctx.state.units[1]!]
    osric.hp = osric.maxHp = 999
    applyStatus(ctx, osric.id, VEIL, 1, 'test')
    expect(bites(activate(ctx, zombie.id), zombie.id)).toHaveLength(0)
    removeStatus(ctx, osric.id, VEIL, 'test')                 // stealth breaks
    expect(hiddenFrom(ctx, zombie, osric)).toBe(false)
    expect(bites(activate(ctx, zombie.id), zombie.id).map((e) => e.target)).toEqual([osric.id])
  })
  it('the Veil runs off its clock at the End of the Hero Phase, and he is bitten', () => {
    const z0 = hexId(8, 8)
    const ctx = createCustomBattle([{ type: 'test-osric', hex: neighbours(z0)[0]! }], [{ type: 'test-zombie', hex: z0 }])
    ctx.state.turn = 1
    const [osric, zombie] = [ctx.state.units[0]!, ctx.state.units[1]!]
    osric.hp = osric.maxHp = 999
    applyStatus(ctx, osric.id, VEIL, 1, 'test')
    expect(bites(activate(ctx, zombie.id), zombie.id)).toHaveLength(0)
    tickStatuses(ctx, 'hero')
    expect(ctx.events.some((e) => e.type === 'status.expired' && e['statusId'] === VEIL && e.target === osric.id)).toBe(true)
    expect(bites(activate(ctx, zombie.id), zombie.id).map((e) => e.target)).toEqual([osric.id])
  })
})

describe('the second instance: the Shroud, on an enemy, read by the hero AI', () => {
  function shrouded(shroud: boolean) {
    const z0 = hexId(8, 8)
    const ctx = createCustomBattle([{ type: 'test-osric', hex: neighbours(z0)[0]! }], [{ type: 'test-zombie', hex: z0 }])
    ctx.state.turn = 1
    const [osric, zombie] = [ctx.state.units[0]!, ctx.state.units[1]!]
    for (const u of ctx.state.units) u.hp = u.maxHp = 999
    if (shroud) applyStatus(ctx, zombie.id, SHROUD, 1, 'test')
    return { ctx, osric, zombie }
  }
  it('unshrouded, Osric swings at the zombie beside him (the control)', () => {
    const { ctx, osric, zombie } = shrouded(false)
    expect(bites(activate(ctx, osric.id), osric.id).map((e) => e.target)).toEqual([zombie.id])
  })
  it('shrouded, Osric never swings at it — and the Shroud has no clock, so End of Phase does not lift it', () => {
    const { ctx, osric, zombie } = shrouded(true)
    expect(bites(activate(ctx, osric.id), osric.id)).toHaveLength(0)
    expect(scored(ctx, osric.id)).not.toContain(zombie.id)
    tickStatuses(ctx, 'enemy')
    expect(zombie.statuses.find((s) => s.id === SHROUD)?.value).toBe(1)
    expect(bites(activate(ctx, osric.id), osric.id)).toHaveLength(0)
  })
})

describe('not a threat: a fleeing unit does not flee what it cannot see', () => {
  function fleeing(veil: boolean) {
    const z0 = hexId(8, 8)
    const ctx = createCustomBattle([{ type: 'test-osric', hex: neighbours(z0)[0]! }], [{ type: 'test-zombie', hex: z0 }])
    ctx.state.turn = 1
    const [osric, zombie] = [ctx.state.units[0]!, ctx.state.units[1]!]
    for (const u of ctx.state.units) u.hp = u.maxHp = 999
    zombie.ai = 'flee'
    if (veil) applyStatus(ctx, osric.id, VEIL, 1, 'test')
    return { ctx, zombie, z0 }
  }
  it('with Osric in sight it runs', () => {
    const { ctx, zombie } = fleeing(false)
    const evs = activate(ctx, zombie.id)
    expect(evs.some((e) => e.type === 'move.begin' && e.actor === zombie.id)).toBe(true)
  })
  it('with Osric veiled there is nothing to flee, and it stays', () => {
    const { ctx, zombie, z0 } = fleeing(true)
    const evs = activate(ctx, zombie.id)
    expect(evs.find((e) => e.type === 'activation.idle' && e.actor === zombie.id)?.['reason']).toBe('nothing to flee')
    expect(zombie.hex).toBe(z0)
  })
})

describe('in a real battle, both instances from the rows (startOfBattle, content/test/units.json)', () => {
  it('test.sight-a: the zombie never bites Veiled Osric while the Veil holds', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.sight-a']!))
    runBattle(ctx)
    const veiledId = ctx.state.units.find((u) => u.typeId === 'test-veiled-osric')!.id
    const zombieId = ctx.state.units.find((u) => u.typeId === 'test-zombie')!.id
    const on = ctx.events.findIndex((e) => e.type === 'status.applied' && e['statusId'] === VEIL && e.target === veiledId)
    const off = ctx.events.findIndex((e) => e.type === 'status.expired' && e['statusId'] === VEIL && e.target === veiledId)
    expect(on).toBeGreaterThanOrEqual(0)
    const held = ctx.events.slice(on, off < 0 ? undefined : off)
    expect(bites(held, zombieId).filter((e) => e.target === veiledId)).toHaveLength(0)
    expect(bites(held, zombieId).length).toBeGreaterThan(0)   // it fought someone it could see
  })
  it('test.sight-b: Osric never swings at the Shrouded Zombie, all Battle', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.sight-b']!))
    runBattle(ctx)
    const osricId = ctx.state.units.find((u) => u.typeId === 'test-osric')!.id
    const shroudedId = ctx.state.units.find((u) => u.typeId === 'test-shrouded-zombie')!.id
    expect(ctx.events.some((e) => e.type === 'status.applied' && e['statusId'] === SHROUD && e.target === shroudedId)).toBe(true)
    expect(bites(ctx.events, osricId).filter((e) => e.target === shroudedId)).toHaveLength(0)
    expect(bites(ctx.events, osricId).length).toBeGreaterThan(0)
  })
})
