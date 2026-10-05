// rule.walked-unit-has-moved (2026-10-04). Ruled 2026-10-04 (Andrew, DECISIONS.md 'after the backlog run: ...; moves are
// refused once a unit has walked; ...'): asked "Once a unit has walked, should Leap and Side Roll grey out and be refused?
// Today the engine still accepts them." - "2 yes". With 2026-10-03 'the action bar: the moves grey slightly once the move
// is done, nothing else greys': "Just gray the moves out after a move is done."
//
// The rule: once a unit has walked in its Activation - entered any hex with its walk, its first path-shaped movement -
// no OTHER movement is accepted from it until that action cycle is over; the refusal is the engine's own
// 'movement-slot-closed'. The rest of a walk cut short may still be walked. A movement used BEFORE any walk is unchanged.
// It lives in the one movement legality (core/movement.ts), so the action list, the AI and the host's commands all follow.
import { describe, expect, it } from 'vitest'
import { advanceBattle, runBattle } from '../src/core/battle.js'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { executeAction, executeBattleCommand, legalActions, validateAction, validateBattleCommand, type ControlPolicy } from '../src/core/commands.js'
import { isCharge, isMove, movesOf } from '../src/core/action.js'
import { movementOptions } from '../src/core/movement.js'
import { beginActivation, reopenSurgeCycle } from '../src/core/mutate.js'
import { MAP_PANEL } from '../src/content/maps.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import OPENING from '../../progression/OPENING-PARTY.json' with { type: 'json' }
import type { Ctx, Unit } from '../src/core/types.js'
import { hexId } from './board16.js'

const REFUSED = { ok: false, reason: 'movement-slot-closed' }
const WARRIOR = 'hero.base.warrior-iron', RANGER = 'hero.base.ranger-ranger', PALADIN = 'hero.base.paladin-shiney', ROGUE = 'hero.base.rogue-rose'
const HOME = hexId(5, 5), FAR = hexId(14, 13)

/** One hero alone in the open, its Activation begun, with Stamina for anything; one zombie far away. */
function rig(hero: string, opts: Record<string, unknown> = {}): { ctx: Ctx; u: Unit } {
  const ctx = createBattle({ replicate: 0, mapId: 'map.open', heroes: [hero], heroHexes: [HOME], enemies: ['test-zombie'], enemyHexes: [FAR], enemyCount: 1, strict: true, ...opts })
  const u = ctx.state.units[0]!
  beginActivation(ctx, 0, 'test')
  u.stamina = u.maxStamina = 20
  return { ctx, u }
}
/** The unit's walk: its first path-shaped movement, in its own order. */
const walkOf = (ctx: Ctx, u: Unit) => movesOf(ctx, u).find((a) => a.move.shape === 'path')!
/** Every other movement the unit has. */
const others = (ctx: Ctx, u: Unit) => movesOf(ctx, u).filter((a) => a.id !== walkOf(ctx, u).id)
const destinations = (ctx: Ctx, actionId: string) => movementOptions(ctx, 0, actionId).map((p) => p.destination)
const listed = (ctx: Ctx, actionId: string) => legalActions(ctx, 0).filter((r) => r.actionId === actionId).length
/** Walk exactly one hex with the unit's walk. */
function walkOneHex(ctx: Ctx, u: Unit) {
  const walk = walkOf(ctx, u).id
  const next = destinations(ctx, walk).find((h) => ctx.geo.distance(u.hex, h) === 1)!
  expect(executeAction(ctx, { actor: 0, actionId: walk, destination: next })).toEqual({ ok: true })
  expect(u.hex).toBe(next)
}
/** Some open hex `range` away from the unit - where the movement would be aimed. */
const aimAt = (ctx: Ctx, u: Unit, range: number) => range === 0 ? u.hex : ctx.geo.neighboursOf(u.hex).flatMap((h) => [h, ...ctx.geo.neighboursOf(h)]).find((h) => ctx.geo.distance(u.hex, h) === range)!

describe('once a unit has walked, no other movement is accepted from it', () => {
  it.each([
    ['Leap', WARRIOR, 'power.leap', {}],
    ['Side Roll', RANGER, 'power.side-roll', {}],
    ['Sidestep', PALADIN, 'power.sidestep', {}],
    ['Back Flip', ROGUE, 'power.back-flip', { heroProgress: [{ level: 1, powers: ['power.back-flip'] }] }],
    ['Charging Run', WARRIOR, 'power.charging-run', { overrides: { [WARRIOR]: { moves: ['power.move', 'power.leap', 'power.charging-run'] } } }],
  ])('%s: usable before the hero walks; refused with the engine\'s reason after it has walked one hex; off the action list', (_name, hero, power, opts) => {
    const fresh = rig(hero, opts)
    expect(movesOf(fresh.ctx, fresh.u).map((a) => a.id), 'the hero holds it').toContain(power)
    expect(destinations(fresh.ctx, power).length, 'before walking it has somewhere to go').toBeGreaterThan(0)
    expect(listed(fresh.ctx, power)).toBeGreaterThan(0)
    expect(validateAction(fresh.ctx, { actor: 0, actionId: power, destination: destinations(fresh.ctx, power)[0]! })).toEqual({ ok: true })

    const { ctx, u } = rig(hero, opts)
    walkOneHex(ctx, u)
    const a = ctx.actions[power]!
    const aim = aimAt(ctx, u, a.move!.shape === 'sidestep' ? (a.move!.stepRange ?? 1) : 1)
    const before = ctx.events.length, at = u.hex, stamina = u.stamina
    expect(validateAction(ctx, { actor: 0, actionId: power, destination: aim })).toEqual(REFUSED)
    expect(executeAction(ctx, { actor: 0, actionId: power, destination: aim })).toEqual(REFUSED)
    // a refusal emits nothing, spends nothing and moves nobody
    expect([ctx.events.length, u.hex, u.stamina]).toEqual([before, at, stamina])
    expect(destinations(ctx, power)).toEqual([])
    expect(listed(ctx, power)).toBe(0)
    // and it is the walk that closed it: its Stamina, cooldown and uses are all still good
    expect(u.stamina).toBeGreaterThanOrEqual(a.staminaCost ?? 0)
  })

  it('every base hero: each movement it has besides its walk is offered before the walk and refused after it', () => {
    let checked = 0
    for (const hero of OPENING.pool as string[]) {
      const fresh = rig(hero)
      for (const m of others(fresh.ctx, fresh.u)) {
        expect(destinations(fresh.ctx, m.id).length, `${hero} ${m.id} before`).toBeGreaterThan(0)
        const { ctx, u } = rig(hero)
        walkOneHex(ctx, u)
        expect(validateAction(ctx, { actor: 0, actionId: m.id, destination: aimAt(ctx, u, m.move.shape === 'sidestep' ? (m.move.stepRange ?? 1) : 1) }), `${hero} ${m.id} after`).toEqual(REFUSED)
        expect(listed(ctx, m.id), `${hero} ${m.id} listed after`).toBe(0)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(10)
  })

  it('the rest of a walk cut short may still be walked', () => {
    const { ctx, u } = rig(WARRIOR)
    const walk = walkOf(ctx, u).id
    expect(u.movePointsLeft).toBeGreaterThan(1)
    walkOneHex(ctx, u)
    const more = destinations(ctx, walk)
    expect(more.length).toBeGreaterThan(0)
    expect(listed(ctx, walk)).toBe(more.length)
    const from = u.hex
    expect(executeAction(ctx, { actor: 0, actionId: walk, destination: more[0]! })).toEqual({ ok: true })
    expect(u.hex).not.toBe(from)
  })

  it('a movement used BEFORE any walk is unchanged: after a Leap the walk is still taken, and the hero has not walked until it does', () => {
    const { ctx, u } = rig(WARRIOR)
    const walk = walkOf(ctx, u).id
    expect(executeAction(ctx, { actor: 0, actionId: 'power.leap', destination: destinations(ctx, 'power.leap')[0]! })).toEqual({ ok: true })
    expect(u.moveUsed).toBe(true)
    expect((u as { walked?: boolean }).walked).toBeUndefined()
    const next = destinations(ctx, walk)
    expect(next.length).toBeGreaterThan(0)
    expect(executeAction(ctx, { actor: 0, actionId: walk, destination: next[0]! })).toEqual({ ok: true })
    // as before this rule: the walk after a Leap is the hero's primary action
    expect(u.primaryUsed).toBe(true)
  })

  it('a walk of no hex is no walk: a unit that has not entered a hex may still use its other movement', () => {
    const { ctx, u } = rig(WARRIOR)
    expect((u as { walked?: boolean }).walked).toBeUndefined()
    expect(destinations(ctx, 'power.leap').length).toBeGreaterThan(0)
  })

  it('the unit carries the fact for that action cycle only: a new Activation and a Surge both reopen its movements', () => {
    const a = rig(WARRIOR)
    walkOneHex(a.ctx, a.u)
    expect((a.u as { walked?: boolean }).walked).toBe(true)
    expect(destinations(a.ctx, 'power.leap')).toEqual([])
    beginActivation(a.ctx, 0, 'test'); a.u.stamina = 20
    expect((a.u as { walked?: boolean }).walked).toBeUndefined()
    expect(destinations(a.ctx, 'power.leap').length).toBeGreaterThan(0)

    const b = rig(WARRIOR)
    walkOneHex(b.ctx, b.u)
    reopenSurgeCycle(b.ctx, 0, b.u.movement, 1)
    expect((b.u as { walked?: boolean }).walked).toBeUndefined()
    expect(destinations(b.ctx, 'power.leap').length).toBeGreaterThan(0)
  })

  it('the host\'s command is refused with the same reason, and nothing is spent', () => {
    const policy: ControlPolicy = { humanUnitUids: [100] }
    const ctx = createCustomBattle([{ type: WARRIOR, hex: HOME }], [{ type: 'test-zombie', hex: FAR }], { strict: true, heroUids: [100], enemyUids: [900] })
    expect(advanceBattle(ctx, policy)).toEqual({ kind: 'selecting', unitUids: [100] })
    expect(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: 100, expectedSeq: ctx.state.seq })).toEqual({ ok: true })
    expect(advanceBattle(ctx, policy)).toEqual({ kind: 'acting', actor: 0 })
    const u = ctx.state.units[0]!
    u.stamina = u.maxStamina = 20
    const command = (actionId: string, destination: number) => ({ kind: 'action', actor: 0, expectedSeq: ctx.state.seq, actionId, destination })
    expect(validateBattleCommand(ctx, policy, command('power.leap', destinations(ctx, 'power.leap')[0]!))).toEqual({ ok: true })
    const step = destinations(ctx, 'power.move').find((h) => ctx.geo.distance(u.hex, h) === 1)!
    expect(executeBattleCommand(ctx, policy, command('power.move', step))).toEqual({ ok: true })
    expect(ctx.battleCursor).toMatchObject({ at: 'acting', actor: 0 })   // the walk was the movement action: the Activation is still open
    const seq = ctx.state.seq
    expect(validateBattleCommand(ctx, policy, command('power.leap', aimAt(ctx, u, 2)))).toEqual(REFUSED)
    expect(executeBattleCommand(ctx, policy, command('power.leap', aimAt(ctx, u, 2)))).toEqual(REFUSED)
    expect(ctx.state.seq).toBe(seq)
    // the rest of the walk is still the hero's to take
    expect(validateBattleCommand(ctx, policy, command('power.move', destinations(ctx, 'power.move')[0]!))).toEqual({ ok: true })
  })
})

describe('the computer follows: it never issues the refused command', () => {
  /** In one battle's log: every movement other than the unit's walk that was spent AFTER that unit had walked in the same action cycle. */
  function afterAWalk(ctx: Ctx): { broke: string[]; used: Set<string> } {
    const walked = new Map<number, boolean>(), broke: string[] = [], used = new Set<string>()
    for (const e of ctx.events) {
      const actor = e.actor as number
      if (e.type === 'activation.begin' || e.type === 'surge.hit') walked.set(actor, false)
      else if (e.type === 'moved' && e.causeId === walkOf(ctx, ctx.state.units[actor]!)?.id) walked.set(actor, true)
      else if (e.type === 'action.spent' && e['slot'] !== 'reaction') {
        const a = ctx.actions[String(e.causeId)]
        if (!a || !isMove(a) || isCharge(a) || a.id === walkOf(ctx, ctx.state.units[actor]!)?.id) continue
        used.add(a.id)
        if (walked.get(actor)) broke.push(`${ctx.state.units[actor]!.name} ${a.id} (seq ${e.seq})`)
      }
    }
    return { broke, used }
  }

  it('over the control battles and every scenario no unit uses another movement after it has walked, and Leap and Side Roll are still used', () => {
    const broke: string[] = [], used = new Set<string>()
    const battles = [
      ...MAP_PANEL.flatMap((mapId) => Array.from({ length: 8 }, (_, r) => () => createBattle({ replicate: r, enemyCount: 8, mapId }))),
      ...Object.values(SCENARIOS).map((s) => () => createBattle(scenarioOptions(s))),
    ]
    for (const make of battles) {
      const ctx = make()
      runBattle(ctx)
      const r = afterAWalk(ctx)
      broke.push(...r.broke.map((b) => `${ctx.state.mapId}: ${b}`))
      for (const id of r.used) used.add(id)
    }
    expect(broke).toEqual([])
    // the rule closes nothing it should not: the two movements are live in real battles
    expect(used.has('power.leap'), 'Leap is used').toBe(true)
    expect(used.has('power.side-roll'), 'Side Roll is used').toBe(true)
  }, 240_000)
})
