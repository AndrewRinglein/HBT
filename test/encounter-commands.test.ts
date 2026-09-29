// kingdom.encounter-battles (2026-09-28): a human plays an ENCOUNTER through the engine's command API
// — the path kingdom/BATTLE-SANDBOX.html drives (core/commands.ts, core/battle.ts advanceBattle with
// a ControlPolicy). The encounter's map, setup, scheduled arrivals, its civilians (hero-side units
// the player does not command) and its outcome all come through the same path a free battle uses;
// the heroes are the player's, everyone else the AI's. Prior art: advanceBattle already runs the
// schedule, falls and band at the same rungs runBattle does — this item adds no engine mechanism, it
// proves the path and carries it to the kingdom.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { advanceBattle, completeActionCycle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { activationChoices, controllerOf, executeBattleCommand, validateBattleCommand, type BattleCommand, type ControlPolicy } from '../src/core/commands.js'
import { isAttack, isMove } from '../src/core/action.js'
import { movementOptions } from '../src/core/movement.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx } from '../src/core/types.js'

const S = 'test.opening-orphanage'
// Law 10, fix.opening-party (2026-09-29): the battle now fields the party drafted by this point, not four Alpha heroes, so which replicate is a win changed — the patient player loses replicate 0 with one drafted hero; replicate 1 is a win. Same assertions.
// Law 10, fix.opening-orphanage-arrivals (2026-09-29): Turns 2 and 3 gained a Zombie each ("Battle 1: Let's add a zombie on turn 2 and a zombie on turn 3.", DECISIONS.md 2026-09-29), so the patient player now loses replicate 1; replicate 4 is a win. was: const WIN = 1
const WIN = 4
const field = () => { const o = scenarioOptions(scenarioDef(S), WIN); const ctx = createBattle(o); return { o, ctx, policy: { humanUnitUids: ctx.state.units.slice(0, o.heroes.length).map((u) => u.uid) } as ControlPolicy } }

/** A patient player: holds for `wait` Turns (ends each activation), then attacks what it can, else closes on the nearest enemy. Only legal commands. */
function choose(ctx: Ctx, policy: ControlPolicy, wait: number): BattleCommand {
  const c = ctx.battleCursor!
  if (c.at === 'selecting') return { kind: 'select-activation', unitUid: activationChoices(ctx, policy)[0]!, expectedSeq: ctx.state.seq }
  const actor = c.actor!, u = ctx.state.units[actor]!
  const end: BattleCommand = { kind: 'end-cycle', actor, expectedSeq: ctx.state.seq }
  if (ctx.state.turn <= wait) return end
  const foes = ctx.state.units.filter((e) => e.side === 'enemy' && e.lifeState === 'standing')
  const ok = (cmd: BattleCommand) => validateBattleCommand(ctx, policy, cmd).ok
  for (const id of u.actions) {
    if (!isAttack(ctx.actions[id]!)) continue
    for (const e of foes) { const cmd: BattleCommand = { kind: 'action', actor, actionId: id, slot: 'primary', target: e.id, expectedSeq: ctx.state.seq }; if (ok(cmd)) return cmd }
  }
  const near = (h: number) => Math.min(...foes.map((e) => ctx.geo.distance(h, e.hex)))
  let best: { d: number; cmd: BattleCommand } | null = null
  for (const id of u.actions) {
    if (!isMove(ctx.actions[id]!)) continue
    for (const p of movementOptions(ctx, actor, id, 'movement')) {
      const d = near(p.destination), cmd: BattleCommand = { kind: 'action', actor, actionId: id, slot: 'movement', destination: p.destination, expectedSeq: ctx.state.seq }
      if (d < near(u.hex) && (!best || d < best.d) && ok(cmd)) best = { d, cmd }
    }
  }
  return best?.cmd ?? end
}

/** Drive a battle to its end; the player's commands come from `next` and are recorded. `stopAtTurn` returns early at a human decision point. */
function drive(ctx: Ctx, policy: ControlPolicy, next: () => BattleCommand, log: BattleCommand[] = [], stopAtTurn = Infinity): BattleCommand[] {
  for (let guard = 0; guard < 50000; guard++) {
    const at = advanceBattle(ctx, policy)
    if (at.kind === 'complete') return log
    if (at.kind === 'acting' && controllerOf(ctx, at.actor, policy) === 'ai') { runActivation(ctx, at.actor); completeActionCycle(ctx); continue }
    if (ctx.state.turn >= stopAtTurn) return log
    const cmd = next(), r = executeBattleCommand(ctx, policy, cmd)
    if (!r.ok) throw new Error(`the player's command was refused: ${r.reason}`)
    log.push(cmd)
  }
  throw new Error('the battle did not end')
}
const typed = (ctx: Ctx, turn: number) => ctx.events.filter((e) => e.type === 'unit.enter' && e.turn === turn).map((e) => e['typeId'])

describe('kingdom.encounter-battles — a person plays encounter.opening.orphanage through the commands', () => {
  // was: '... the Turn 4 and Turn 5 Zombies arrive ...' — fix.opening-orphanage-lighter (2026-09-29): only Turn 4's remains
  // was: '... the Turn 4 Zombie arrives ...' — fix.opening-orphanage-arrivals (2026-09-29): Turns 2, 3 and 4
  it('the heroes are the player\'s, the civilians act on their own, the Turn 2, 3 and 4 Zombies arrive, and clearing the map wins', () => {
    const { o, ctx, policy } = field()
    const offered = new Set<number>()
    drive(ctx, policy, () => { for (const uid of activationChoices(ctx, policy)) offered.add(uid); return choose(ctx, policy, 3) })
    const heroes = ctx.state.units.slice(0, o.heroes.length), civilians = ctx.state.units.filter((u, i) => u.side === 'hero' && i >= o.heroes.length)
    expect(civilians.map((u) => u.typeId).sort()).toEqual(['hero.fixed.orphans', 'hero.fixed.school-teacher'])
    expect([...offered].sort()).toEqual(heroes.map((u) => u.uid).sort())
    for (const c of civilians) {
      expect(controllerOf(ctx, c.id, policy)).toBe('ai')
      expect(ctx.events.some((e) => e.type === 'activation.begin' && e.actor === c.id), `${c.typeId} acts`).toBe(true)
    }
    // fix.opening-orphanage-arrivals (2026-09-29): a Zombie on Turn 2 and one on Turn 3 (DECISIONS.md 2026-09-29)
    expect(typed(ctx, 2)).toEqual(['unit.zombie'])
    expect(typed(ctx, 3)).toEqual(['unit.zombie'])
    expect(typed(ctx, 4)).toEqual(['unit.zombie'])
    // Law 10, fix.opening-orphanage-lighter (2026-09-29): Turn 5's Zombie is gone from the row ("Let's remove an early zombie and a later zombie.", DECISIONS.md 2026-09-28; SWITCHES.md openingOrphanageLighter) — nothing arrives on Turn 5. was: toEqual(['unit.zombie'])
    expect(typed(ctx, 5)).toEqual([])
    expect(ctx.state.outcome).toBe('heroClear')
    expect(ctx.state.units.filter((u) => u.side === 'enemy').every((u) => u.lifeState !== 'standing')).toBe(true)
  })

  it('the same commands replayed give the same battle, byte for byte', () => {
    const a = field(), commands = drive(a.ctx, a.policy, () => choose(a.ctx, a.policy, 3))
    const b = field(); let i = 0
    drive(b.ctx, b.policy, () => ({ ...commands[i++]!, expectedSeq: b.ctx.state.seq }))
    expect(i).toBe(commands.length)
    expect(JSON.stringify(b.ctx.events)).toBe(JSON.stringify(a.ctx.events))
  })

  it('save and resume mid-battle keeps the schedule: the resumed battle is the uninterrupted one', () => {
    const whole = field(), commands = drive(whole.ctx, whole.policy, () => choose(whole.ctx, whole.policy, 3))
    const first = field(); let i = 0
    const next = (ctx: Ctx) => () => ({ ...commands[i++]!, expectedSeq: ctx.state.seq })
    drive(first.ctx, first.policy, next(first.ctx), [], 3)   // stop at Turn 3, before either arrival
    expect(first.ctx.state.turn).toBe(3)
    const saved = JSON.parse(JSON.stringify(saveBattle(first.ctx)))
    const resumed = restoreBattle(saved, createBattle(scenarioOptions(scenarioDef(S), WIN)))
    drive(resumed, first.policy, next(resumed))
    expect(i).toBe(commands.length)
    expect(typed(resumed, 4)).toEqual(['unit.zombie'])
    // Law 10, fix.opening-orphanage-lighter (2026-09-29): Turn 5's Zombie is gone from the row ("Let's remove an early zombie and a later zombie.", DECISIONS.md 2026-09-28; SWITCHES.md openingOrphanageLighter) — nothing arrives on Turn 5. was: toEqual(['unit.zombie'])
    expect(typed(resumed, 5)).toEqual([])
    expect(JSON.stringify(resumed.events)).toBe(JSON.stringify(whole.ctx.events))
  })
})
