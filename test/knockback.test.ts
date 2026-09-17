// Knockback — capability.knockback (2026-08-27).
//
// Authored on the halberd's Hack: "push the target 1 hex directly away from
// you" (onDamage). CODEX §12 bans every other forced movement, so this is the
// whole capability. The undefined edges — walls, occupied hexes, the board
// rim — stop the push and log knockback.blocked (SWITCHES.md knockbackBlocked,
// default fizzle-in-place). Second consumer: trigger.test-ram.knockback on
// the Arc Golem, pure data, live in showcase.arc-variant.
import { describe, expect, it } from 'vitest'
import { stepAwayFrom, distance } from './board16.js'
import { executeKnockback } from '../src/core/movement.js'
import { performAttack } from '../src/core/pipeline.js'
import { UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { fieldedDef, createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'

describe('the geometry — a line, or nothing', () => {
  it('continues the pusher->target line one hex, and is null when not adjacent', () => {
    // 135 -> 118 continues to 102 (the axial line q3: r8 -> r7 -> r6).
    expect(stepAwayFrom(135, 118)).toBe(102)
    expect(stepAwayFrom(118, 135)).toBe(151) // the same line, reversed
    expect(stepAwayFrom(135, 102), 'not adjacent — no line').toBeNull()
    expect(stepAwayFrom(118, 118), 'no direction from a point').toBeNull()
  })

  it('returns null off the board edge', () => {
    // 7 -> 6 pushes along row 0 toward col 5... fine; 22 -> 6 pushes off the top.
    expect(stepAwayFrom(22, 6)).toBeNull() // row1 col6 -> row0 col6 -> off the board
  })
})

describe('the authored rider — Hack pushes on damage', () => {
  const rig = () => {
    const base = scenarioOptions(scenarioDef('showcase.alpha-team'))
    return createBattle({
      ...base,
      heroes: ['alpha-oathblade'], heroHexes: [135],
      enemies: ['unit.zombie'], enemyHexes: [118], enemyCount: 1,
    })
  }

  it('a hacked zombie ends one hex further along the line, and the log names the trigger', () => {
    const ctx = rig()
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    const z = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!
    beginActivation(ctx, oath.id, 'test')
    // Hack does str 5 + 2 vs armor 0 — damage lands, onDamage fires at 100%.
    const r = performAttack(ctx, oath.id, z.id, 'attack.halberd.hack')
    if (r.hit && r.damage > 0) {
      expect(z.hex, 'pushed from 118 directly away from 135').toBe(102)
      const ev = ctx.events.find((e) => e.type === 'knocked')!
      expect(ev.causeId).toBe('trigger.halberd.hack.knockback')
      expect(ev['from']).toBe(118)
      expect(ev['to']).toBe(102)
      expect(ev.actor).toBe(oath.id)
      expect(ev.target).toBe(z.id)
    } else {
      // The swing can miss (accuracy roll) — then nothing may have moved.
      expect(z.hex).toBe(118)
      expect(ctx.events.some((e) => e.type === 'knocked')).toBe(false)
    }
  })

  it('a blocked push fizzles in place, loudly', () => {
    const ctx = createBattle({
      ...scenarioOptions(scenarioDef('showcase.alpha-team')),
      heroes: ['alpha-oathblade'], heroHexes: [135],
      // a second zombie stands exactly where the push would land
      enemies: ['unit.zombie', 'unit.zombie'], enemyHexes: [118, 102], enemyCount: 2,
    })
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    const z = ctx.state.units.find((u) => u.hex === 118)!
    const n = executeKnockback(ctx, oath.id, z.id, 1, 'test.push')
    expect(n).toBe(0)
    expect(z.hex, 'fizzle-in-place is the switch default').toBe(118)
    const ev = ctx.events.find((e) => e.type === 'knockback.blocked')!
    expect(ev['reason']).toBe('occupied')
    expect(ctx.events.some((e) => e.type === 'knocked')).toBe(false)
  })

  it('a push off the board edge is blocked and says so', () => {
    const ctx = createBattle({
      ...scenarioOptions(scenarioDef('showcase.alpha-team')),
      heroes: ['alpha-oathblade'], heroHexes: [22],
      enemies: ['unit.zombie'], enemyHexes: [6], enemyCount: 1,
    })
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    const z = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!
    const n = executeKnockback(ctx, oath.id, z.id, 1, 'test.push')
    expect(n).toBe(0)
    expect(z.hex).toBe(6)
    expect(ctx.events.find((e) => e.type === 'knockback.blocked')!['reason']).toBe('edge of the board')
  })
})

describe('the second consumer — pure data on the Arc Golem', () => {
  it('the golem rams ordinary attack victims with its data-defined onHit rider, in the live scenario', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.arc-variant')))
    // V2 sweep no longer fires onHit; retain the data rider proof on real ordinary swings.
    const golem = ctx.state.units.find(u => u.typeId === 'test-arc-golem')!
    golem.actions = golem.actions.filter(id => !ctx.actions[id]?.burst)
    for (const u of ctx.state.units) { u.hp = u.maxHp = 200 } // enough survivors for two separate ordinary Slam rungs
    runBattle(ctx)
    const rams = ctx.events.filter((e) => e.type === 'knocked' && e.causeId === 'trigger.test-ram.knockback')
    expect(rams.length, 'the ordinary swings must push real victims').toBeGreaterThanOrEqual(2)
    for (const ev of rams) {
      expect(distance(ev['from'] as number, ev['to'] as number)).toBe(1)
    }
  })

  it('is a seed — the scenario with knockback in it stays byte-identical', () => {
    const run = () => {
      const ctx = createBattle(scenarioOptions(scenarioDef('showcase.arc-variant')))
      const r = runBattle(ctx)
      return `${r.outcome}:${r.turns}:${ctx.events.length}`
    }
    expect(run()).toBe(run())
  })

  it('the trigger is DATA on the unit rows — the engine names no unit', () => {
    // seam.items-per-unit (2026-09-02): the Halberd's push rides the ITEM, so
    // it is on the Oathblade as fielded, not on his bare row — same claim.
    expect((fieldedDef('alpha-oathblade').triggers ?? []).some((t) => t.effect.kind === 'knockback')).toBe(true)
    expect((UNITS['test-arc-golem']!.triggers ?? []).some((t) => t.effect.kind === 'knockback')).toBe(true)
  })
})
