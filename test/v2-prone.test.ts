// v2.prone — V2 R3, Prone and standing (COMBAT-V2-DESIGN-2026-09-07.md §10).
// The probes the roadmap demands: legal actions, payment, occupancy, Block while
// prone, no ZoC/AoO, the ±accuracy/dodge/damage rows through the engine's own
// ledgers, Airwalk as a readable fact, snapshots, the AI, and replay.
import { describe, it, expect } from 'vitest'
import { createCustomBattle, createBattle } from '../src/core/setup.js'
import { performAttack, preview, resolveAccuracy, resolveDamage, damageSourceOfAttack } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { applyStatus, airwalkSuspended, isProne } from '../src/core/status.js'
import { effective } from '../src/core/stats.js'
import { saveBattle, restoreBattle } from '../src/core/snapshot.js'
import { executeAction, validateAction } from '../src/core/commands.js'
import { movementOptions, planMovement, usableMoves, zocHoldersAt, reachable, pathTo } from '../src/core/movement.js'
import { attacksOf } from '../src/core/action.js'
import { runActivation } from '../src/ai/modes.js'
import { runBattle } from '../src/core/battle.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { AttackDef, Ctx } from '../src/core/types.js'

const STAND = 'power.stand-up'
const rig = () => {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }], { strict: true })
  const at = ctx.state.units[0]!, tg = ctx.state.units[1]!
  at.triggers = []; tg.triggers = []; at.accuracy = 100; tg.dodge = 0; tg.hp = tg.maxHp = 100; at.hp = at.maxHp = 100
  beginActivation(ctx, 0, 'test')
  const id = attacksOf(ctx, at).find((a) => a.attack.kind === 'melee')!.id
  return { ctx, at, tg, id }
}
const awayHex = (ctx: Ctx, from: number, foe: number) => {
  for (let h = 0; h < ctx.geo.hexCount; h++) if (ctx.geo.distance(from, h) === 1 && ctx.geo.distance(foe, h) === 2 && !ctx.state.units.some((u) => u.hex === h)) return h
  throw new Error('no away hex')
}

describe('v2.prone — the Codex rows carry the numbers', () => {
  it('status.prone is a status flag with the ruled numbers and grants the stand action', () => {
    const { ctx } = rig()
    expect(ctx.statuses['status.prone']?.prone).toEqual({ accuracyAgainst: 10, dodge: -10, damageAgainst: 1, accuracy: -10, damage: -1, standAction: STAND })
    expect(ctx.statuses['status.prone']?.decayPerPhase).toBe(0)
    expect(ctx.actions[STAND]?.slot).toBe('movement')
    expect(ctx.actions[STAND]?.move).toMatchObject({ shape: 'sidestep', stepRange: 0 })
  })
  it('prone is not a LifeState: the holder stays standing and emits unit.proned once', () => {
    const { ctx, tg } = rig()
    applyStatus(ctx, 1, 'status.prone', 1, 'test')
    applyStatus(ctx, 1, 'status.prone', 1, 'test')
    expect(tg.lifeState).toBe('standing')
    expect(isProne(ctx, tg)).toBe(true)
    expect(ctx.events.filter((e) => e.type === 'unit.proned').map((e) => [e['target'], e['statusId']])).toEqual([[1, 'status.prone']])
    expect(tg.statuses.find((s) => s.id === 'status.prone')?.value).toBe(1)
  })
})

describe('v2.prone — legal actions and payment', () => {
  it('stand is offered only while prone; no other movement while prone', () => {
    const { ctx, at } = rig()
    expect(validateAction(ctx, { actor: 0, actionId: STAND, destination: 85 }).ok).toBe(false)
    expect(usableMoves(ctx, at).map((m) => m.id)).not.toContain(STAND)
    applyStatus(ctx, 0, 'status.prone', 1, 'test')
    expect(usableMoves(ctx, at).map((m) => m.id)).toEqual([STAND])
    expect(movementOptions(ctx, 0, 'power.move')).toEqual([])
    const away = awayHex(ctx, 85, 86)
    // Law 10, 2026-10-05 — rule.prone-only-stand-up (DECISIONS.md 'a prone unit only stands; Stand Up is its one move; …'):
    // the refusal is the same refusal, and it now carries its own reason. The line was:
    //   expect(validateAction(ctx, { actor: 0, actionId: 'power.move', destination: away })).toEqual({ ok: false, reason: 'action-not-ready' })
    expect(validateAction(ctx, { actor: 0, actionId: 'power.move', destination: away })).toEqual({ ok: false, reason: 'actor-prone' })
    expect(validateAction(ctx, { actor: 0, actionId: STAND, destination: 85 })).toEqual({ ok: true })
    expect(validateAction(ctx, { actor: 0, actionId: STAND, destination: 85, slot: 'primary' }).ok).toBe(false)
  })
  it('standing spends the movement slot, not the activation; the primary stays', () => {
    const { ctx, at, id } = rig()
    applyStatus(ctx, 0, 'status.prone', 1, 'test')
    expect(executeAction(ctx, { actor: 0, actionId: STAND, destination: 85 })).toEqual({ ok: true })
    expect(at.moveUsed).toBe(true); expect(at.primaryUsed).toBe(false)
    expect(isProne(ctx, at)).toBe(false)
    expect(ctx.events.find((e) => e.type === 'action.spent' && e['actionId'] === STAND)).toMatchObject({ slot: 'movement', moveUsed: true, primaryUsed: false })
    expect(ctx.events.find((e) => e.type === 'unit.stood')).toMatchObject({ actor: 0, statusIds: ['status.prone'] })
    expect(ctx.events.some((e) => e.type === 'aoo.provoked')).toBe(false)
    expect(validateAction(ctx, { actor: 0, actionId: STAND, destination: 85 }).ok).toBe(false)
    expect(validateAction(ctx, { actor: 0, actionId: id, target: 1 })).toEqual({ ok: true })
  })
  // Law 10, 2026-10-05 — OVERTURNED by a ruling, not loosened. rule.prone-only-stand-up (Andrew, DECISIONS.md 'a prone unit
  // only stands; Stand Up is its one move; …': "yes, it cannot use attacks or powers until it stands."). The test was:
  //   it('a prone unit may still take its primary at -10/-1 without standing', () => {
  //     const { ctx, id } = rig()
  //     applyStatus(ctx, 0, 'status.prone', 1, 'test')
  //     expect(validateAction(ctx, { actor: 0, actionId: id, target: 1 })).toEqual({ ok: true })
  //   })
  // The -10/-1 rows of a prone attacker stay in the pipeline (read through the ledgers below); no legal order reaches them.
  it('a prone unit may NOT take its primary without standing: the attack is refused until it stands, then taken', () => {
    const { ctx, id } = rig()
    applyStatus(ctx, 0, 'status.prone', 1, 'test')
    expect(validateAction(ctx, { actor: 0, actionId: id, target: 1 })).toEqual({ ok: false, reason: 'actor-prone' })
    expect(executeAction(ctx, { actor: 0, actionId: STAND, destination: 85 })).toEqual({ ok: true })
    expect(validateAction(ctx, { actor: 0, actionId: id, target: 1 })).toEqual({ ok: true })
  })
})

describe('v2.prone — the board', () => {
  it('a prone hex still blocks movement and is never a path', () => {
    const { ctx, at } = rig()
    applyStatus(ctx, 1, 'status.prone', 1, 'test')
    expect(planMovement(ctx, 0, 'power.move', 86)).toMatchObject({ ok: false, reason: 'unreachable-destination' })
    const reach = reachable(ctx, at)
    expect(reach.has(86)).toBe(false)
    for (const h of reach.keys()) expect(pathTo(reach, 85, h)).not.toContain(86)
  })
  it('a prone holder exerts no zone of control and makes no attack of opportunity', () => {
    const { ctx, at } = rig()
    expect(zocHoldersAt(ctx, at, 85).map((u) => u.id)).toEqual([1])
    applyStatus(ctx, 1, 'status.prone', 1, 'test')
    expect(zocHoldersAt(ctx, at, 85)).toEqual([])
    const away = awayHex(ctx, 85, 86)
    expect(executeAction(ctx, { actor: 0, actionId: 'power.move', destination: away })).toEqual({ ok: true })
    expect(at.hex).toBe(away)
    expect(ctx.events.some((e) => e.type === 'aoo.provoked' || e.type === 'aoo.skipped')).toBe(false)
  })
  it('the standing control: the same walk away from a standing zombie provokes', () => {
    const { ctx } = rig()
    executeAction(ctx, { actor: 0, actionId: 'power.move', destination: awayHex(ctx, 85, 86) })
    expect(ctx.events.some((e) => e.type === 'aoo.provoked' && e['actor'] === 1)).toBe(true)
  })
  it('Airwalk is suspended while prone, as a fact core can read', () => {
    const { ctx, at } = rig()
    expect(airwalkSuspended(ctx, at)).toBe(false)
    applyStatus(ctx, 0, 'status.prone', 1, 'test')
    expect(airwalkSuspended(ctx, at)).toBe(true)
    executeAction(ctx, { actor: 0, actionId: STAND, destination: 85 })
    expect(airwalkSuspended(ctx, at)).toBe(false)
  })
  it('a prone unit keeps its Block: block.rolled rolls at its chance', () => {
    const { ctx, tg, id } = rig()
    Object.assign(tg, { block: 60 })
    applyStatus(ctx, 1, 'status.prone', 1, 'test')
    performAttack(ctx, 0, 1, id)
    const b = ctx.events.find((e) => e.type === 'block.rolled')!
    expect(b).toMatchObject({ chance: 60 })
    expect(b['suppressed']).not.toBe(true)
    expect(ctx.rng.log.some((r) => String(r.stream) === 'block')).toBe(true)
  })
})

describe('v2.prone — the modifiers, read through the ledgers', () => {
  const rows = (ledger: readonly { name: string; effectId: string; delta: number }[]) => ledger.filter((r) => r.name.includes('PRONE')).map((r) => [r.name, r.effectId, r.delta])
  for (const statusId of ['status.prone', 'test.status.floored']) {
    it(`${statusId}: attacks against the holder, and the holder's own attacks`, () => {
      const { ctx, at, tg, id } = rig()
      const rule = ctx.statuses[statusId]!.prone!
      const a = ctx.actions[id] as AttackDef
      const acc0 = resolveAccuracy(ctx, at, tg, a).value, dmg0 = resolveDamage(ctx, at, tg, damageSourceOfAttack(a), false).value
      applyStatus(ctx, 1, statusId, 1, 'test')
      const acc = resolveAccuracy(ctx, at, tg, a), dmg = resolveDamage(ctx, at, tg, damageSourceOfAttack(a), false)
      expect(rows(acc.ledger)).toEqual([['TARGET_PRONE', statusId, rule.accuracyAgainst]])
      expect(effective(ctx, tg, 'dodge').ledger).toEqual([{ source: statusId, op: 'add', delta: rule.dodge, from: 0, to: rule.dodge }])
      expect(acc.value).toBe(acc0 + rule.accuracyAgainst - rule.dodge)
      expect(rows(dmg.ledger)).toEqual([['TARGET_PRONE', statusId, rule.damageAgainst]])
      expect(dmg.value).toBe(dmg0 + rule.damageAgainst)
      const p = preview(ctx, 0, 1, id) as { accuracy: number; damageOnHit: number; accLedger: typeof acc.ledger }
      expect(p.accuracy).toBe(acc.value); expect(p.damageOnHit).toBe(dmg.value); expect(rows(p.accLedger)).toEqual(rows(acc.ledger))
      // now the attacker is the prone one, the target stands
      const c2 = rig()
      applyStatus(c2.ctx, 0, statusId, 1, 'test')
      const acc2 = resolveAccuracy(c2.ctx, c2.at, c2.tg, a), dmg2 = resolveDamage(c2.ctx, c2.at, c2.tg, damageSourceOfAttack(a), false)
      expect(rows(acc2.ledger)).toEqual([['ATTACKER_PRONE', statusId, rule.accuracy]])
      expect(acc2.value).toBe(acc0 + rule.accuracy)
      expect(rows(dmg2.ledger)).toEqual([['ATTACKER_PRONE', statusId, rule.damage]])
      expect(dmg2.value).toBe(dmg0 + rule.damage)
    })
  }
  it('the variant carries different numbers — the rows are data', () => {
    const { ctx } = rig()
    expect(ctx.statuses['test.status.floored']!.prone).not.toEqual(ctx.statuses['status.prone']!.prone)
  })
})

describe('v2.prone — snapshots, the AI and replay', () => {
  it('save/load mid-prone round-trips and the restored unit can stand', () => {
    const { ctx } = rig()
    applyStatus(ctx, 0, 'status.prone', 1, 'test')
    const restored = restoreBattle(saveBattle(ctx), ctx)
    expect(restored.state).toEqual(ctx.state)
    expect(isProne(restored, restored.state.units[0]!)).toBe(true)
    expect(executeAction(restored, { actor: 0, actionId: STAND, destination: 85 })).toEqual({ ok: true })
    expect(isProne(restored, restored.state.units[0]!)).toBe(false)
    expect(isProne(ctx, ctx.state.units[0]!)).toBe(true)
  })
  it('a prone AI unit spends its movement standing, then takes its primary', () => {
    const { ctx, at } = rig()
    applyStatus(ctx, 0, 'status.prone', 1, 'test')
    const from = ctx.events.length
    runActivation(ctx, 0)
    const spent = ctx.events.slice(from).filter((e) => e.type === 'action.spent')
    expect(spent[0]).toMatchObject({ actionId: STAND, slot: 'movement' })
    expect(spent.some((e) => e['slot'] === 'primary')).toBe(true)
    expect(isProne(ctx, at)).toBe(false)
  })
  for (const id of ['test.prone-a', 'test.prone-b']) {
    it(`${id}: a real battle knocks a unit down, it stands, and the replay is deterministic`, () => {
      const run = () => { const c = createBattle(scenarioOptions(SCENARIOS[id]!)); runBattle(c); return c }
      const a = run(), b = run()
      expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events))
      const types = a.events.map((e) => e.type)
      expect(types).toContain('unit.proned')
      expect(types).toContain('unit.stood')
      expect(a.events.some((e) => e.type === 'action.spent' && e['actionId'] === STAND && e['slot'] === 'movement')).toBe(true)
      const proned = a.events.findIndex((e) => e.type === 'unit.proned'), stood = a.events.findIndex((e) => e.type === 'unit.stood')
      expect(proned).toBeLessThan(stood)
    })
  }
})
