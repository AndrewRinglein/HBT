// kingdom.stand-up-one-press — ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'seven answers: the first hero's card shows only
// what is modified; origin badges go on the heroes; Stand Up is one press; …': asked whether Stand Up should stand the unit on
// one press instead of two — "stand up one press.").
//
// Expect: "In the opening's battle 2 a knocked-down Lumberjack's Wife stands on ONE press of Stand Up; the engine logs the
// stand; her move is spent; Back Flip and the other moves keep the gesture they had; the page verify presses once and finds her
// standing."
//
// It overturns kingdom SWITCHES.md standUpIsUsedLikeAMoveThatGoesNowhere (fix.stand-up-does-nothing, the same day), for Stand
// Up alone: the other moves that go nowhere (Devotion, Focus) keep their two presses (SWITCHES.md standUpAloneIsOnePress).
// Which move is the stand is the engine's answer (standsUp: a movement whose effects stand the unit), never an id typed here.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createSandbox, advanceSandbox, commandSandbox, sandboxChoices, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { encounterDef, staminaCostOf, isMove, isAttack, type BattleCommand } from '../src/engine.js'
import { applyStatus } from '../../engine/src/core/status.js'
import { kdbDownStatus } from '../../engine/src/core/kdb.js'
import { standsUp } from '../../engine/src/core/action.js'

const LUMBERJACK = 'encounter.opening.lumberjack'
type U = Sandbox['ctx']['state']['units'][number]
function battle2() {
  const s = createSandbox({ mapId: encounterDef(LUMBERJACK).mapId!, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId: LUMBERJACK })
  advanceSandbox(s)
  const P = createPlayInput(() => s, (c: BattleCommand) => commandSandbox(s, c))
  const begin = (u: U) => { P.input({ kind: 'choose', id: u.id }); P.input({ kind: 'unit', id: u.id, hex: u.hex }); expect(s.ctx.battleCursor, `${u.name}'s Activation`).toMatchObject({ at: 'acting', actor: u.id }) }
  return { s, P, begin }
}
/** `u` knocked down by a Zombie — the status the engine's own knockdown roll applies, put on by the engine's own mutator. */
function knockDown(s: Sandbox, u: U) {
  const prone = kdbDownStatus(s.ctx)!, enemy = s.ctx.state.units.find((x) => x.side === 'enemy' && x.lifeState === 'standing')!
  applyStatus(s.ctx, u.id, prone, 1, 'kingdom.stand-up-one-press', enemy.id)
  return { prone, stand: s.ctx.statuses[prone]!.prone!.standAction!, isProne: () => u.statuses.some((x) => x.id === prone && x.value > 0) }
}

describe('kingdom.stand-up-one-press — one press of Stand Up stands the unit', () => {
  it('battle 2: the knocked-down Lumberjack\'s Wife stands on ONE press — the engine logs the stand, her move is spent, nothing waits for a second press', () => {
    const { s, P, begin } = battle2()
    const wife = s.ctx.state.units.find((x) => x.typeId === 'hero.fixed.lumberjacks-wife')!
    const k = knockDown(s, wife); begin(wife)
    const row = s.ctx.actions[k.stand]!
    expect(row.name).toBe('Stand Up'); expect(standsUp(row), 'the engine says this move is the stand').toBe(true)
    const from = s.ctx.events.length, stamina = wife.stamina, hex = wife.hex
    expect(P.input({ kind: 'slot', actionId: k.stand, unit: wife.id }), 'the press is taken').toBe(true)
    // one press: she stands
    expect(k.isProne(), 'she is standing after ONE press').toBe(false)
    expect(s.ctx.events.slice(from).filter((e) => e.type === 'unit.stood').map((e) => e['actor']), 'the engine logs the stand').toEqual([wife.id])
    // it still takes her move and costs what the engine charges; the primary action is hers yet
    expect(wife.moveUsed, 'her move is spent').toBe(true); expect(wife.primaryUsed).toBe(false)
    expect(stamina - wife.stamina).toBe(staminaCostOf(wife, row)); expect(wife.hex).toBe(hex)
    // nothing is left planned or said: no ghost on her hex, no "click it again"
    expect(P.facts().ghost, 'nothing planned').toBeNull()
    expect(P.facts().note ?? '', 'no second press is asked for').not.toMatch(/click it again/)
    // and one press is all it took: the engine heard one command
    expect(s.ctx.events.slice(from).filter((e) => e.type === 'unit.stood').length).toBe(1)
  })

  it('a knocked-down hero stands on one press too', () => {
    const { s, P, begin } = battle2()
    const hero = s.ctx.state.units.find((x) => s.setup.heroUids!.includes(x.uid))!
    const k = knockDown(s, hero); begin(hero)
    expect(P.input({ kind: 'slot', actionId: k.stand, unit: hero.id })).toBe(true)
    expect(k.isProne()).toBe(false); expect(hero.moveUsed).toBe(true); expect(hero.primaryUsed).toBe(false)
  })

  it('the other moves keep the gesture they had: a move that goes nowhere is still pressed twice, and a move that goes somewhere still waits for its hex', () => {
    const { s, P, begin } = battle2()
    // a hero with a move that goes nowhere and is not the stand (Devotion, Focus): its only destination is its own hex
    const nowhere = (u: U) => u.actions.find((id) => { const a = s.ctx.actions[id]!; return isMove(a) && !isAttack(a) && !standsUp(a) && (a as { move?: { stepRange?: number } }).move?.stepRange === 0 })
    const u = s.ctx.state.units.find((x) => s.setup.heroUids!.includes(x.uid) && nowhere(x))!
    expect(u, 'a hero of the party has a move that goes nowhere').toBeTruthy()
    const still = nowhere(u)!
    begin(u)
    const from = s.ctx.events.length
    expect(P.input({ kind: 'slot', actionId: still, unit: u.id })).toBe(true)
    // the first press plans it on the hero's own hex and says how to use it; nothing has happened yet
    expect(P.facts().ghost).toEqual({ unit: u.id, hex: u.hex })
    expect(P.facts().note).toBe(`${s.ctx.actions[still]!.name}: click it again, or the hero, to use it.`)
    expect(s.ctx.events.length, 'nothing happened on the first press').toBe(from)
    expect(u.moveUsed).toBe(false)
    // the second press uses it
    expect(P.input({ kind: 'slot', actionId: still, unit: u.id })).toBe(true)
    expect(s.ctx.events.length).toBeGreaterThan(from)
    // a move that goes somewhere (the walk; Back Flip, Leap, Side Roll are chosen the same way): pressed, it shows where it can go and waits for the hex
    const b = battle2(), walker = b.s.ctx.state.units.find((x) => b.s.setup.heroUids!.includes(x.uid))!
    b.begin(walker)
    const moves = walker.actions.filter((id) => { const a = b.s.ctx.actions[id]!; return isMove(a) && !isAttack(a) && (a as { move?: { stepRange?: number } }).move?.stepRange !== 0 })
    expect(moves.length).toBeGreaterThan(0)
    for (const id of moves) {
      const seq = b.s.ctx.events.length
      b.P.input({ kind: 'slot', actionId: id, unit: walker.id })
      expect(b.s.ctx.events.length, `${b.s.ctx.actions[id]!.name}: pressing it moves nobody`).toBe(seq)
      if (sandboxChoices(b.s).some((c) => c.command.actionId === id)) expect(b.P.facts().reach.length, `${b.s.ctx.actions[id]!.name} shows where it can go`).toBeGreaterThan(0)
      b.P.input({ kind: 'back' })
    }
  })

  it('the page: on the built battle screen, battle 2, each knocked-down unit stands on one press of its Stand Up button', () => {
    const out = execFileSync(process.execPath, ['tools/stand-up.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/stand-up: .* each stood on ONE press of the Stand Up button .* passed/)
    expect(out).not.toMatch(/pressed twice/)
  }, 240000)
})
