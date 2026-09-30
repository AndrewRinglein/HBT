// command.end-player-phase — PLAYABLE-OPENING-PLAN.md item 2. Ruled 2026-09-29 (Andrew,
// DECISIONS.md "the playable battle screen ... End Turn ..."): "There should be a button for
// End whole turn ... If you have anybody who has not acted, it should pop up ... If all your
// units act, then your turn just ends. And by turn, I mean player phase."
//
// The engine side of that button: a battle command `end-player-phase` (every human hero not
// yet activated forgoes its activation — it begins, idles and runs its End of Activation
// ladder, as a blocked unit does), the query `heroesYetToAct` naming who has not acted (the
// pop-up's list), and the phase ending by itself once every hero has acted — which the
// resumable lifecycle already did (advanceBattle's next-activation → phase-end); this file
// holds it. SWITCHES.md "command.end-player-phase" records the defaults chosen.
import { describe, expect, it } from 'vitest'
import { advanceBattle, completeActionCycle, runBattle } from '../src/core/battle.js'
import { createCustomBattle } from '../src/core/setup.js'
import { executeBattleCommand, heroesYetToAct, validateBattleCommand, type ControlPolicy } from '../src/core/commands.js'
import { attacksOf } from '../src/core/action.js'
import { runActivation } from '../src/ai/modes.js'
import { applyStatus } from '../src/core/status.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import type { Ctx } from '../src/core/types.js'

const both: ControlPolicy = { humanUnitUids: [100, 101] }
function field(): Ctx {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }, { type: 'test-warrior', hex: 87 }], [{ type: 'test-zombie', hex: 86 }],
    { strict: true, heroUids: [100, 101], enemyUids: [900] })
  // A durable opponent keeps every assertion inside the Battle; no Surge unless a test gives it.
  ctx.state.units[2]!.hp = ctx.state.units[2]!.maxHp = 1000
  for (const u of ctx.state.units) { u.surge = 0; u.surgeChance = 0 }
  return ctx
}
const endPhase = (ctx: Ctx, policy: ControlPolicy = both) => executeBattleCommand(ctx, policy, { kind: 'end-player-phase', expectedSeq: ctx.state.seq })
const select = (ctx: Ctx, unitUid: number, policy: ControlPolicy = both) => executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid, expectedSeq: ctx.state.seq })
const attack = (ctx: Ctx, actor: number) => executeBattleCommand(ctx, both, { kind: 'action', actor, actionId: attacksOf(ctx, ctx.state.units[actor]!)[0]!.id, target: 2, expectedSeq: ctx.state.seq })
const of = (ctx: Ctx, type: string, actor: number) => ctx.events.filter(e => e.type === type && e.actor === actor)
const spentBy = (ctx: Ctx, actor: number) => ctx.events.filter(e => (e.type === 'action.spent' || e.type === 'attack.declared' || e.type === 'moved') && (e.actor === actor || e.attacker === actor)).length

describe('command.end-player-phase', () => {
  it('with two heroes unacted, the query names both and end-player-phase moves to the Enemy Phase with neither acting', () => {
    const ctx = field()
    expect(advanceBattle(ctx, both)).toEqual({ kind: 'selecting', unitUids: [100, 101] })
    expect(heroesYetToAct(ctx, both)).toEqual([100, 101])
    const before = saveBattle(ctx)
    expect(validateBattleCommand(ctx, both, { kind: 'end-player-phase', expectedSeq: ctx.state.seq })).toEqual({ ok: true })
    expect(saveBattle(ctx)).toBe(before)   // asking changes nothing
    expect(endPhase(ctx)).toEqual({ ok: true })
    expect(ctx.events.filter(e => e.type === 'activation.forgone').map(e => e.actor)).toEqual([0, 1])
    // the enemy's activation is the next thing the driver is handed
    expect(advanceBattle(ctx, both)).toEqual({ kind: 'acting', actor: 2 })
    expect(ctx.state.phase).toBe('enemy')
    expect(heroesYetToAct(ctx, both)).toEqual([])
    for (const hero of [0, 1]) {
      expect(spentBy(ctx, hero)).toBe(0)                                   // neither acted
      expect(of(ctx, 'activation.idle', hero)).toMatchObject([{ reason: 'forgone' }])
      expect(of(ctx, 'activation.end', hero)).toHaveLength(1)             // the End of Activation ladder ran once
    }
  })

  it('when the last hero\'s activation ends the phase advances with no command', () => {
    const ctx = field()
    advanceBattle(ctx, both)
    expect(select(ctx, 100)).toEqual({ ok: true }); expect(advanceBattle(ctx, both)).toEqual({ kind: 'acting', actor: 0 })
    expect(attack(ctx, 0)).toEqual({ ok: true })   // a paid primary ends the activation (rule.primary-ends-activation)
    expect(advanceBattle(ctx, both)).toEqual({ kind: 'selecting', unitUids: [101] })
    expect(heroesYetToAct(ctx, both)).toEqual([101])
    expect(select(ctx, 101)).toEqual({ ok: true }); expect(advanceBattle(ctx, both)).toEqual({ kind: 'acting', actor: 1 })
    expect(heroesYetToAct(ctx, both)).toEqual([])   // the pop-up has nobody to name
    const at = ctx.events.length
    expect(attack(ctx, 1)).toEqual({ ok: true })
    advanceBattle(ctx, both)   // the zombie may act or idle (a hit can stun it); either way the Phase has ended
    const after = ctx.events.slice(at)
    expect(after.filter(e => e.type === 'phase.end.begin').map(e => e.side)[0]).toBe('hero')
    expect(after.some(e => e.type === 'activation.begin' && e.actor === 2)).toBe(true)   // the Enemy Phase ran
    expect(ctx.events.some(e => e.type === 'activation.forgone')).toBe(false)
  })

  it('mid-activation, the acting hero\'s cycle closes as end-cycle closes it and the rest forgo', () => {
    const ctx = field()
    advanceBattle(ctx, both); select(ctx, 101); expect(advanceBattle(ctx, both)).toEqual({ kind: 'acting', actor: 1 })
    expect(heroesYetToAct(ctx, both)).toEqual([100])
    expect(endPhase(ctx)).toEqual({ ok: true })
    expect(ctx.events.filter(e => e.type === 'activation.forgone').map(e => e.actor)).toEqual([0])
    expect(advanceBattle(ctx, both)).toEqual({ kind: 'acting', actor: 2 })
    expect(of(ctx, 'activation.end', 1)).toHaveLength(1)
    expect(of(ctx, 'activation.idle', 1)).toHaveLength(0)   // it was acting, not forgoing
    expect(of(ctx, 'activation.idle', 0)).toMatchObject([{ reason: 'forgone' }])
  })

  it('a stunned hero is not named and an AI-controlled hero still takes its activation', () => {
    const ctx = field(), one: ControlPolicy = { humanUnitUids: [100] }
    const block = Object.values(ctx.statuses).find(s => s.blocksAction)!
    applyStatus(ctx, 0, block.id, 2, 'test')
    const two = field()
    // stunned: nobody left to name, the phase runs through by itself
    expect(advanceBattle(ctx, both)).toEqual({ kind: 'selecting', unitUids: [101] })
    expect(heroesYetToAct(ctx, both)).toEqual([101])
    // AI-controlled 101: the command forgoes only 100; 101 is handed to the driver
    expect(advanceBattle(two, one)).toEqual({ kind: 'selecting', unitUids: [100] })
    expect(endPhase(two, one)).toEqual({ ok: true })
    expect(advanceBattle(two, one)).toEqual({ kind: 'acting', actor: 1 })
    expect(two.state.phase).toBe('hero')
    expect(two.events.filter(e => e.type === 'activation.forgone').map(e => e.actor)).toEqual([0])
  })

  it('refuses a stale, malformed, AI-held or finished command and changes nothing', () => {
    const ctx = field(); advanceBattle(ctx, both)
    for (const command of [{ kind: 'end-player-phase', expectedSeq: ctx.state.seq - 1 }, { kind: 'end-player-phase' }, { kind: 'end-player-phase', expectedSeq: ctx.state.seq, actor: 0 }]) {
      const before = saveBattle(ctx)
      expect(validateBattleCommand(ctx, both, command).ok).toBe(false)
      expect(executeBattleCommand(ctx, both, command).ok).toBe(false)
      expect(saveBattle(ctx)).toBe(before)
    }
    endPhase(ctx); expect(advanceBattle(ctx, both)).toEqual({ kind: 'acting', actor: 2 })
    expect(endPhase(ctx)).toMatchObject({ ok: false, reason: 'not-human-controlled' })   // the enemy's activation is not the player's
    const done = field(); done.state.units[2]!.hp = 1
    runBattle(done)
    expect(endPhase(done)).toMatchObject({ ok: false, reason: 'battle-complete' })
  })

  it('the sandbox and replays agree: the same commands replay byte-identically, across a save and restore', () => {
    const drive = (ctx: Ctx, cut?: (c: Ctx) => Ctx): Ctx => {
      for (let steps = 0; steps < 400; steps++) {
        const next = advanceBattle(ctx, both)
        if (next.kind === 'complete') break
        if (next.kind === 'selecting') {
          // hero 100 attacks every Turn, 101 is left: End Turn forgoes it
          if (next.unitUids.includes(100)) { select(ctx, 100); advanceBattle(ctx, both); attack(ctx, 0) }
          else { expect(endPhase(ctx)).toEqual({ ok: true }); if (cut) { ctx = cut(ctx); cut = undefined } }
          continue
        }
        runActivation(ctx, next.actor); completeActionCycle(ctx)
        if (ctx.state.turn >= 3) break
      }
      return ctx
    }
    const a = drive(field()), b = drive(field())
    const c = drive(field(), (ctx) => restoreBattle(saveBattle(ctx), ctx))
    expect(a.events.filter(e => e.type === 'activation.forgone').length).toBeGreaterThan(1)
    expect(JSON.stringify(b.events)).toBe(JSON.stringify(a.events))
    expect(JSON.stringify(c.events)).toBe(JSON.stringify(a.events))
    expect(saveBattle(c)).toBe(saveBattle(a))
  })
})
