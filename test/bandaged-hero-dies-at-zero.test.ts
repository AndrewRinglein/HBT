// fix.bandaged-hero-dies-at-zero (2026-10-05). Ruled 2026-10-05 (Andrew, DECISIONS.md 'a bandaged hero's count has no floor:
// bandaging stops the count, a hit still takes one, and at 0 the hero dies'): "I thought that a hit on a bandaged hero cost
// them one bleedout." and, asked whether hits can take the count to 0 so the hero dies though bandaged, "I don't get why the
// count would start and stop at 1. No, it goes to 0 when they die. Bandaging is supposed to completely stop the bleed-out
// counter, and they're just stable."
//
// capability.stabilise-downed-ally landed with a hit on a stabilised hero moving its count but never below 1. The rule now: a
// bandaged hero's count no longer runs down by itself (unchanged); each hit it takes costs one, as a hit costs any downed hero,
// with NO floor - at 0 the hero dies, by the same death the count's own running out gives. An unbandaged downed hero is
// unchanged: a hit never takes its count below 1 - its kill is the count's own (fix.downed-targetable).
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { advanceBleedOuts, settle } from '../src/core/settle.js'
import { performAttack } from '../src/core/pipeline.js'
import { usePower } from '../src/core/ability.js'
import { accelerateBleedOut, beginActivation, setBleedOut, setLifeState } from '../src/core/mutate.js'
import { ACTIONS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Unit } from '../src/core/types.js'

const USE = 'power.bandages.use'
/** The Bandages' fielding: the one carrying them, its ally beside it, and one zombie beside the ally. */
function field(): { ctx: Ctx; medic: Unit; ally: Unit; foe: Unit } {
  const ctx = createBattle({ ...scenarioOptions(SCENARIOS['test.bandages']!), heroHexes: [85, 86], enemies: ['unit.zombie'], enemyHexes: [87], enemyCount: 1 })
  const medic = ctx.state.units.find((u) => u.side === 'hero' && u.actions.includes(USE))!
  const ally = ctx.state.units.find((u) => u.side === 'hero' && u.id !== medic.id)!
  return { ctx, medic, ally, foe: ctx.state.units.find((u) => u.side === 'enemy')! }
}
function down(ctx: Ctx, u: Unit, count: number): void {
  u.hp = 0
  setLifeState(ctx, u.id, 'downed', 'test', { reason: 'hp0' })
  setBleedOut(ctx, u.id, count, 'test')
}
function bandage(ctx: Ctx, medic: Unit, ally: Unit): void {
  beginActivation(ctx, medic.id, 'test')
  usePower(ctx, medic.id, ally.id, USE)
  expect(ally.bleedStopped).toBe(true)
}
/** The zombie strikes the downed hero until one blow lands - the roll is the battle's own - and the blow is settled as a command settles it. */
function hit(ctx: Ctx, foe: Unit, target: Unit): void {
  const attack = foe.actions.find((id) => ACTIONS[id]?.attack)!
  const from = ctx.events.filter((e) => e.type === 'bleedout.accelerated').length
  for (let i = 0; i < 60 && ctx.events.filter((e) => e.type === 'bleedout.accelerated').length === from; i++) {
    beginActivation(ctx, foe.id, 'test'); foe.stamina = foe.maxStamina; delete foe.cooldowns[attack]
    performAttack(ctx, foe.id, target.id, attack)
    settle(ctx, attack)
  }
  expect(ctx.events.filter((e) => e.type === 'bleedout.accelerated').length).toBe(from + 1)
}
const types = (ctx: Ctx, t: string) => ctx.events.filter((e) => e.type === t)

describe('a bandaged hero\'s count has no floor', () => {
  it('nobody hits it: at count 3 it is still at 3 and down, not dead, Hero Phase after Hero Phase', () => {
    const { ctx, medic, ally } = field()
    down(ctx, ally, 3); bandage(ctx, medic, ally)
    for (let i = 0; i < 8; i++) advanceBleedOuts(ctx)
    expect([ally.lifeState, ally.bleedOut, ally.bleedStopped]).toEqual(['downed', 3, true])
  })

  it('hit three times it is at 2, then 1, then dead at 0 - one from the count a hit, the stop standing until the last', () => {
    const { ctx, medic, ally, foe } = field()
    down(ctx, ally, 3); bandage(ctx, medic, ally)
    hit(ctx, foe, ally)
    expect([ally.lifeState, ally.bleedOut, ally.bleedStopped]).toEqual(['downed', 2, true])
    hit(ctx, foe, ally)
    expect([ally.lifeState, ally.bleedOut, ally.bleedStopped]).toEqual(['downed', 1, true])
    advanceBleedOuts(ctx)   // the count still does not run by itself
    expect([ally.lifeState, ally.bleedOut]).toEqual(['downed', 1])
    hit(ctx, foe, ally)
    expect([ally.lifeState, ally.bleedOut]).toEqual(['dead', 0])
    expect(ally.bleedStopped).toBeUndefined()   // it is no longer downed
    expect(types(ctx, 'bleedout.accelerated').map((e) => [e['target'], e['steps'], e['bleedOut']])).toEqual([[ally.id, 1, 2], [ally.id, 1, 1], [ally.id, 1, 0]])
  })

  it('the death at 0 is the death the count\'s own running out gives: the same lines, the same body', () => {
    // one hero bandaged and hit to 0 …
    const a = field()
    down(a.ctx, a.ally, 1); bandage(a.ctx, a.medic, a.ally)
    const fromA = a.ctx.events.length
    hit(a.ctx, a.foe, a.ally)
    // … and the same hero, unbandaged, whose count runs out by itself
    const b = field()
    down(b.ctx, b.ally, 1)
    const fromB = b.ctx.events.length
    advanceBleedOuts(b.ctx)
    const death = (ctx: Ctx, from: number, id: number) => ctx.events.slice(from).filter((e) => (e.type === 'life.dead' && e['target'] === id) || (e.type === 'corpse.created' && e['of'] === id))
      .map((e) => e.type === 'life.dead' ? [e.type, e['from'], e['to'], e['reason']] : [e.type, e['hex'], e['typeId'], e['side']])
    expect(death(a.ctx, fromA, a.ally.id)).toEqual(death(b.ctx, fromB, b.ally.id))
    expect(death(a.ctx, fromA, a.ally.id)).toEqual([['life.dead', 'downed', 'dead', 'bledOut'], ['corpse.created', a.ally.hex, a.ally.typeId, 'hero']])
    expect((a.ctx.state.corpses ?? []).some((c) => c.uid === a.ally.uid)).toBe(true)
  })

  it('an unbandaged downed hero is unchanged: a hit takes one and never takes its count below 1 - its kill is the count\'s own', () => {
    const { ctx, ally, foe } = field()
    down(ctx, ally, 2)
    hit(ctx, foe, ally)
    expect([ally.lifeState, ally.bleedOut]).toEqual(['downed', 1])
    hit(ctx, foe, ally)
    expect([ally.lifeState, ally.bleedOut]).toEqual(['downed', 1])
    expect(types(ctx, 'bleedout.accelerated').map((e) => [e['steps'], e['bleedOut']])).toEqual([[1, 1], [0, 1]])
    advanceBleedOuts(ctx)
    expect(ally.lifeState).toBe('dead')
  })

  it('the mutator alone: the floor is 1 for a running count and 0 for a stopped one', () => {
    const { ctx, medic, ally, foe } = field()
    down(ctx, ally, 2)
    accelerateBleedOut(ctx, ally.id, 5, 'test', foe.id)
    expect(ally.bleedOut).toBe(1)
    bandage(ctx, medic, ally)
    accelerateBleedOut(ctx, ally.id, 5, 'test', foe.id)
    expect(ally.bleedOut).toBe(0)
  })
})

describe('in a real battle', () => {
  it('the Bandages\' fielding, on the first replicate read from 0 upward in which the enemy keeps striking the bandaged hero: one from the held count a hit, and dead at 0', () => {
    let seen: { r: number; ctx: Ctx } | null = null
    for (let r = 0; r < 60 && !seen; r++) {
      // Restated 2026-10-06 (rule.surge-is-at-least-level and rule.special-moves-unlock-at-level-two (DECISIONS.md 2026-10-06 'everyone gains Surge equal to its level at the least …', 'a hero's special moves unlock at level 2, ruled …')): every replicate is another battle now, and in none of 0 to 399 does an
      // enemy strike a bandaged hero - 16 of the first 100 bandage one and none is hit afterwards (the computer strikes the
      // downed only when no standing enemy is in reach, SWITCHES aiAttacksDowned). So the probe fields the computer set to
      // strike the downed always - a fielding choice for this run, as an opening probe waits for its schedule; the rule held is
      // unchanged and the replicate is still the first read from 0 upward (14). The line was the same without `cfg`.
      const ctx = createBattle({ ...scenarioOptions(SCENARIOS['test.bandages']!), replicate: r, cfg: { switches: { aiAttacksDowned: 'always' } } } as Parameters<typeof createBattle>[0]); runBattle(ctx)
      const at = ctx.events.findIndex((e) => e.type === 'bleedout.stopped')
      if (at >= 0 && ctx.events.slice(at).some((e) => e.type === 'life.dead' && e['target'] === ctx.events[at]!['target'])) seen = { r, ctx }
    }
    expect(seen, 'a replicate in 0-59 in which a bandaged hero is hit to 0').not.toBeNull()
    const { ctx } = seen!
    const at = ctx.events.findIndex((e) => e.type === 'bleedout.stopped'), stopped = ctx.events[at]!, id = stopped['target'] as number
    const after = ctx.events.slice(at + 1).filter((e) => e['target'] === id && (e.type === 'bleedout.accelerated' || e.type === 'bleedout.tick' || e.type === 'life.dead'))
    // never counted down by itself; each hit takes one; the last line is its death, of the count
    expect(after.some((e) => e.type === 'bleedout.tick')).toBe(false)
    const hits = after.filter((e) => e.type === 'bleedout.accelerated')
    expect(hits.map((e) => e['bleedOut'])).toEqual(Array.from({ length: stopped['bleedOut'] as number }, (_, i) => (stopped['bleedOut'] as number) - 1 - i))
    expect(hits.every((e) => e['steps'] === 1)).toBe(true)
    const death = after.at(-1)!
    expect([death.type, death['reason']]).toEqual(['life.dead', 'bledOut'])
    expect(ctx.state.units[id]!.lifeState).toBe('dead')
  })
})
