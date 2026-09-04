// fix.downed-targetable (2026-09-03) — GAME-DESIGN §9: "Enemies roll at +20
// against downed heroes, but a hit only accelerates the bleed-out counter. It
// never kills." canAttack refused every non-standing target, so the downed
// could not be attacked at all — the safe direction, not the rule.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { ACC, canAttack, performAttack, preview } from '../src/core/pipeline.js'
import { beginActivation, setBleedOut, setLifeState } from '../src/core/mutate.js'
import { runBattle } from '../src/core/battle.js'
import { hexId } from './board16.js'

function board(bleedOut = 5) {
  const ctx = createCustomBattle(
    [{ type: 'test-warrior', hex: hexId(5, 5) }],
    [{ type: 'test-zombie', hex: hexId(5, 6) }],
  )
  const w = ctx.state.units[0]!, z = ctx.state.units[1]!
  w.hp = 0
  setLifeState(ctx, w.id, 'downed', 'test', { reason: 'hp0' })
  setBleedOut(ctx, w.id, bleedOut, 'test')
  z.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })   // never miss
  return { ctx, w, z }
}

describe('the downed can be attacked', () => {
  it('canAttack allows a downed target and still refuses a dead one', () => {
    const { ctx, w, z } = board()
    expect(canAttack(ctx, z.id, w.id, 'attack.test-zombie.bite')).toBe(true)
    setLifeState(ctx, w.id, 'dead', 'test', { reason: 'test' })
    expect(canAttack(ctx, z.id, w.id, 'attack.test-zombie.bite')).toBe(false)
  })

  it('at +20 — a CONDITION ledger row — and the preview promises no damage and no crit', () => {
    const { ctx, w, z } = board()
    const pv = preview(ctx, z.id, w.id, 'attack.test-zombie.bite')
    const row = pv.accLedger.find((r) => r.station === ACC.CONDITION)
    expect(row?.name).toBe('TARGET_DOWNED')
    expect(row?.delta).toBe(20)
    expect(pv.damageOnHit).toBe(0)
    expect(pv.critChance).toBe(0)
  })

  it('a hit reduces bleedOut by the switch, never hp, and never below 1', () => {
    const { ctx, w, z } = board(5)
    const steps = ctx.cfg.switches.downedHitBleedTicks
    beginActivation(ctx, z.id, 'test')
    const r = performAttack(ctx, z.id, w.id, 'attack.test-zombie.bite')
    expect(r.hit).toBe(true)
    expect(r.damage).toBe(0)
    expect(w.hp).toBe(0)
    expect(w.bleedOut).toBe(5 - steps)
    expect(w.lifeState).toBe('downed')
    const acc = ctx.events.find((e) => e.type === 'bleedout.accelerated')
    expect(acc?.['steps']).toBe(steps)
    // the floor: from 1, a hit moves nothing and kills nobody
    const b1 = board(1)
    beginActivation(b1.ctx, b1.z.id, 'test')
    performAttack(b1.ctx, b1.z.id, b1.w.id, 'attack.test-zombie.bite')
    expect(b1.w.bleedOut).toBe(1)
    expect(b1.w.lifeState).toBe('downed')
  })

  // A real battle needs someone standing or it is a wipe at battle.begin. The
  // second warrior stands adjacent to the zombie too (a melee hero stays and
  // fights; a mage would kite off), so the switch decides who is struck.
  function realBoard(mode: 'never' | 'whenNoStanding' | 'always') {
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(5, 5) }, { type: 'test-warrior', hex: hexId(6, 6) }],
      [{ type: 'test-zombie', hex: hexId(5, 6) }],
    )
    const w = ctx.state.units[0]!, z = ctx.state.units[2]!
    w.hp = 0
    setLifeState(ctx, w.id, 'downed', 'test', { reason: 'hp0' })
    setBleedOut(ctx, w.id, 5, 'test')
    ctx.cfg.switches.aiAttacksDowned = mode
    runBattle(ctx)
    return { ctx, w, z }
  }

  it('default switch: with a standing hero in reach the AI strikes the standing one, never the downed', () => {
    const { ctx } = realBoard('whenNoStanding')
    expect(ctx.events.some((e) => e.type === 'bleedout.accelerated')).toBe(false)
    expect(ctx.events.some((e) => e.type === 'attack.declared' && e['target'] === 1)).toBe(true)
  })

  it('always: the finisher — the downed hero in reach is struck first, and it shows in a real battle', () => {
    const { ctx, w, z } = realBoard('always')
    const first = ctx.events.find((e) => e.type === 'attack.declared' && e['actor'] === z.id)
    expect(first?.['target']).toBe(w.id)
    expect(ctx.events.some((e) => e.type === 'bleedout.accelerated' && e['target'] === w.id)).toBe(true)
    // and no hit ever killed him — only the bleed-out rung may
    for (const e of ctx.events) if (e.type === 'life.dead' && e['target'] === w.id) expect(e['reason']).toBe('bledOut')
  })

  it('never: the downed are left alone', () => {
    const { ctx } = realBoard('never')
    expect(ctx.events.some((e) => e.type === 'bleedout.accelerated')).toBe(false)
  })
})
