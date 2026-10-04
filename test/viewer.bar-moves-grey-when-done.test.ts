// viewer.bar-moves-grey-when-done (engine backlog; engine DECISIONS.md 2026-10-03 'the action bar: the moves grey slightly once
// the move is done, nothing else greys; every action shows all it does; the Soldier holds no sword'). Andrew: "Yes, they
// should still be usable before you've moved. However, if you do it, you'll lose your move, so I guess, actually, don't gray
// them out. Just gray the moves out after a move is done." The engine's side, and the check the item asks for — "say what the
// engine does to a unit's move after it uses its primary action first, with the test that shows it; if the engine still lets
// it move, do not invent the loss in the viewer". What the engine does, held here on a real hero (the Iron Dwarf's row: Move
// and Leap) and nothing changed:
//   · a PAID attack or power made first ends the Activation at once (rule.primary-ends-activation): the move is lost with it;
//   · a walk cut short spends the movement action (moveUsed) and keeps the movement left over — the engine still takes the
//     basic move, as the PRIMARY action;
//   · a walk of the whole movement leaves no destination for the basic move; a movement power with its own distance (Leap)
//     is still taken, as the primary action.
// So "the move is done" is, per move action: the unit has moved and the engine lists no further use of that action — which is
// what the host hands the bar (kingdom src/ui/play-input.ts moveDone). The viewer's half
// (../viewer/tools/bar-moves-grey-when-done.test.mjs) asks the page to grey what the host names and nothing else; the
// sandbox's half (../kingdom/tools/bar-moves-grey-when-done.verify.mjs) walks two heroes on the built BATTLE-SANDBOX.html.
// Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { advanceBattle } from '../../engine/src/core/battle.js'
import { createCustomBattle } from '../../engine/src/core/setup.js'
import { executeBattleCommand, legalActions, validateBattleCommand, type ControlPolicy } from '../../engine/src/core/commands.js'
import type { Ctx } from '../../engine/src/core/types.js'

const HERO = 100, policy: ControlPolicy = { humanUnitUids: [HERO, 101] }
/** the Iron Dwarf beside a durable zombie (or far from it), a second hero so the Hero Phase goes on after the first */
function field(zombieHex: number): Ctx {
  const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: 85 }, { type: 'hero.base.warrior-iron', hex: 20 }], [{ type: 'unit.zombie', hex: zombieHex }], { strict: true, heroUids: [HERO, 101], enemyUids: [900] })
  ctx.state.units[2]!.hp = ctx.state.units[2]!.maxHp = 1000
  for (const u of ctx.state.units) { u.surge = 0; u.surgeChance = 0 }
  expect(advanceBattle(ctx, policy)).toMatchObject({ kind: 'selecting' })
  expect(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: HERO, expectedSeq: ctx.state.seq })).toEqual({ ok: true })
  expect(advanceBattle(ctx, policy)).toEqual({ kind: 'acting', actor: 0 })
  return ctx
}
const act = (ctx: Ctx, request: object) => executeBattleCommand(ctx, policy, { kind: 'action', actor: 0, expectedSeq: ctx.state.seq, ...request })
const destinations = (ctx: Ctx, actionId: string) => legalActions(ctx, 0).filter((r) => r.actionId === actionId && 'destination' in r).map((r) => (r as { destination: number }).destination)

describe('the moves grey once the move is done: what the engine does to a unit\'s move', () => {
  it('an attack made first (a paid primary) ends the Activation at once — the move is lost with it', () => {
    const ctx = field(86), me = ctx.state.units[0]!
    expect(me.actions).toEqual(expect.arrayContaining(['power.move', 'power.leap', 'attack.punch']))
    expect(destinations(ctx, 'power.move').length).toBeGreaterThan(0)     // before: it may move, or attack — nothing is refused for not having moved
    expect(act(ctx, { actionId: 'attack.punch', target: 2 })).toEqual({ ok: true })
    expect(me).toMatchObject({ primaryUsed: true, moveUsed: false })      // the movement action was never spent …
    expect(ctx.battleCursor!.at).not.toBe('acting')                       // … the Activation is simply over
    expect(validateBattleCommand(ctx, policy, { kind: 'action', actor: 0, actionId: 'power.move', destination: 84, expectedSeq: ctx.state.seq })).toMatchObject({ ok: false, reason: 'not-acting' })
    expect(advanceBattle(ctx, policy)).toEqual({ kind: 'selecting', unitUids: [101] })
  })
  it('a walk cut short: the movement action is spent, the movement left over is still offered — as the primary action, which ends the Activation', () => {
    const ctx = field(15), me = ctx.state.units[0]!, budget = me.movePointsLeft
    const near = destinations(ctx, 'power.move').find((d) => ctx.geo.distance(me.hex, d) === 1)!
    expect(act(ctx, { actionId: 'power.move', destination: near })).toEqual({ ok: true })
    expect(me).toMatchObject({ moveUsed: true, primaryUsed: false, hex: near })
    expect(me.movePointsLeft).toBeGreaterThan(0); expect(me.movePointsLeft).toBeLessThan(budget)
    expect(ctx.battleCursor).toMatchObject({ at: 'acting', actor: 0 })
    const rest = destinations(ctx, 'power.move'); expect(rest.length).toBeGreaterThan(0)   // the engine still takes the basic move
    expect(validateBattleCommand(ctx, policy, { kind: 'action', actor: 0, actionId: 'power.move', slot: 'movement', destination: rest[0]!, expectedSeq: ctx.state.seq }).ok).toBe(false)   // not as a second movement action
    expect(act(ctx, { actionId: 'power.move', slot: 'primary', destination: rest[0]! })).toEqual({ ok: true })
    expect(me.primaryUsed).toBe(true); expect(ctx.battleCursor!.at).not.toBe('acting')
  })
  it('the whole movement walked: no destination is left for the basic move; Leap is still taken, as the primary action', () => {
    const ctx = field(15), me = ctx.state.units[0]!, budget = me.movePointsLeft
    const far = destinations(ctx, 'power.move').sort((a, b) => ctx.geo.distance(me.hex, b) - ctx.geo.distance(me.hex, a) || a - b)[0]!
    expect(ctx.geo.distance(me.hex, far)).toBe(budget)
    expect(act(ctx, { actionId: 'power.move', destination: far })).toEqual({ ok: true })
    expect(me).toMatchObject({ moveUsed: true, primaryUsed: false, movePointsLeft: 0 })
    expect(ctx.battleCursor).toMatchObject({ at: 'acting', actor: 0 })
    expect(destinations(ctx, 'power.move')).toEqual([])                   // the basic move: done
    const leaps = destinations(ctx, 'power.leap'); expect(leaps.length).toBeGreaterThan(0)   // another movement power: still offered
    expect(validateBattleCommand(ctx, policy, { kind: 'action', actor: 0, actionId: 'power.leap', slot: 'movement', destination: leaps[0]!, expectedSeq: ctx.state.seq }).ok).toBe(false)
    expect(validateBattleCommand(ctx, policy, { kind: 'action', actor: 0, actionId: 'power.leap', slot: 'primary', destination: leaps[0]!, expectedSeq: ctx.state.seq })).toEqual({ ok: true })
  })
  it('the viewer page: the bar greys the move rows the host names as done, nothing else, and not with the disabled look', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/bar-moves-grey-when-done.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, on the built BATTLE-SANDBOX.html (the Orphanage) — one hero walks a hex, the next its whole movement', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/bar-moves-grey-when-done.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/bar-moves-grey-when-done.verify.mjs', 'scratch/bar-moves-grey-when-done.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/bar-moves-grey-when-done: .*passed/)
  }, 170000)
})
