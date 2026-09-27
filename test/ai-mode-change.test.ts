// ai.mode-change (AI-DESIGN.md §3E; DECISIONS.md 2026-09-26 "the AI: a framework
// now; modes can change; ..."): "a unit's mode can change mid-battle — a brute that
// runs when badly hurt, a boss that fights differently below half health. The
// condition and the new mode are data on the unit's row; the change emits an event
// (ai.mode, GLOSSARY) naming its cause."
//
// The item's expect, one block each:
//   1. a scripted battle where a unit crossing a Health threshold switches mode,
//      logged with its cause — the Rout Zombie (TEST, 30 Health) runs below half
//   2. a second unit with a different condition switches on its own data — the
//      Late Zombie (TEST) hangs back until Turn 3, then charges
// Both rows are content/test/units.json; the engine names neither. The defaults
// taken are SWITCHES.md "AI mode changes".
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { applyDamage, beginActivation } from '../src/core/mutate.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Event } from '../src/core/types.js'
import { distance, hexId, neighbours } from './board16.js'

const ROUT = 'test.rout-zombie.rout'
const CHARGE = 'test.late-zombie.charge'

const changes = (ctx: Ctx, actor?: number): Event[] =>
  ctx.events.filter((e) => e.type === 'ai.mode' && e['from'] !== undefined && (actor === undefined || e.actor === actor))
const swings = (ctx: Ctx, actor: number): Event[] => ctx.events.filter((e) => e.type === 'attack.declared' && e.actor === actor)
function activate(ctx: Ctx, id: number): Event[] {
  const from = ctx.events.length
  beginActivation(ctx, id, 'test'); runActivation(ctx, id)
  return ctx.events.slice(from)
}

/** A warrior beside the Rout Zombie, on the open board. */
function rout() {
  const z0 = hexId(8, 8)
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: neighbours(z0)[0]! }], [{ type: 'test-rout-zombie', hex: z0 }])
  ctx.state.turn = 1
  const warrior = ctx.state.units[0]!, zombie = ctx.state.units[1]!
  warrior.hp = warrior.maxHp = 999   // the zombie's bites must not end the fight
  return { ctx, warrior, zombie }
}

describe('a unit crossing a Health threshold switches mode, logged with its cause', () => {
  it('the row carries the change as data: below half Health, flee', () => {
    const { zombie } = rout()
    expect(zombie.maxHp).toBe(30)
    expect(zombie.ai).toBe('dumb-melee')
    expect(zombie.aiChanges).toEqual([{ id: ROUT, when: { hpBelow: 50 }, mode: 'flee' }])
  })

  it('at full Health, and at exactly half, it fights as a dumb-melee zombie — no change', () => {
    const { ctx, warrior, zombie } = rout()
    activate(ctx, zombie.id)
    expect(changes(ctx)).toHaveLength(0)
    expect(swings(ctx, zombie.id).map((e) => e.target)).toEqual([warrior.id])
    applyDamage(ctx, zombie.id, 15, 'test', {})          // 15 of 30: 1500 < 1500 is false
    expect(zombie.hp).toBe(15)
    activate(ctx, zombie.id)
    expect(changes(ctx)).toHaveLength(0)
    expect(zombie.ai).toBe('dumb-melee')
    expect(swings(ctx, zombie.id)).toHaveLength(2)
  })

  it('one below half, its next Activation opens with ai.mode naming the change, and it runs instead of biting', () => {
    const { ctx, warrior, zombie } = rout()
    applyDamage(ctx, zombie.id, 16, 'test', {})          // 14 of 30
    const at = zombie.hex
    const evs = activate(ctx, zombie.id)
    const modes = evs.filter((e) => e.type === 'ai.mode')
    // first the change, named by its cause; then the Activation's own mode line, the new mode
    expect(modes.map((e) => [e.causeId, e['mode']])).toEqual([[ROUT, 'flee'], ['ai.flee', 'flee']])
    expect(modes[0]).toMatchObject({ actor: zombie.id, mode: 'flee', from: 'dumb-melee', when: { hpBelow: 50 } })
    expect(zombie.ai).toBe('flee')
    expect(zombie.aiChanges).toBeUndefined()
    expect(swings(ctx, zombie.id)).toHaveLength(0)
    // it walks AWAY (the warrior's attack of opportunity may stop it; the walk it chose is the claim)
    const walk = evs.find((e) => e.type === 'move.begin' && e.actor === zombie.id)!
    expect(walk.seq).toBeGreaterThan(modes[1]!.seq)
    expect(walk['from']).toBe(at)
    expect(distance(walk['to'] as number, warrior.hex)).toBeGreaterThan(distance(at, warrior.hex))
    // the decision log reads the new row
    expect(ctx.aiLog.filter((l) => l.actor === zombie.id).map((l) => l.mode)).toEqual(['ai.flee'])
  })

  it('the change happens once: healed back to full, it keeps running, and no second change is logged', () => {
    const { ctx, zombie } = rout()
    applyDamage(ctx, zombie.id, 20, 'test', {})
    activate(ctx, zombie.id)
    zombie.hp = zombie.maxHp
    activate(ctx, zombie.id)
    expect(changes(ctx)).toHaveLength(1)
    expect(zombie.ai).toBe('flee')
    expect(swings(ctx, zombie.id)).toHaveLength(0)
  })

  it('in a real battle (test.mode-change-a) it bites until the warrior cuts it below half, then never bites again', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.mode-change-a']!))
    runBattle(ctx)
    const zombie = ctx.state.units.find((u) => u.typeId === 'test-rout-zombie')!
    const [change, ...more] = changes(ctx, zombie.id)
    expect(more).toHaveLength(0)
    expect(change).toMatchObject({ causeId: ROUT, mode: 'flee', from: 'dumb-melee' })
    const hpAtChange = ctx.events.filter((e) => e.type === 'damage.applied' && e.target === zombie.id && e.seq < change!.seq).at(-1)!['hpAfter'] as number
    expect(hpAtChange * 2).toBeLessThan(30)
    const bites = swings(ctx, zombie.id)
    expect(bites.filter((e) => e.seq < change!.seq).length).toBeGreaterThan(0)
    expect(bites.filter((e) => e.seq > change!.seq)).toHaveLength(0)
  })
})

describe('a second unit with a different condition switches on its own data', () => {
  /** The Late Zombie beside a warrior, at a given Turn. */
  function late(turn: number) {
    const z0 = hexId(8, 8)
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: neighbours(z0)[0]! }], [{ type: 'test-late-zombie', hex: z0 }])
    ctx.state.turn = turn
    ctx.state.units[0]!.hp = ctx.state.units[0]!.maxHp = 999
    return { ctx, warrior: ctx.state.units[0]!, zombie: ctx.state.units[1]! }
  }

  it('the row: flee, then dumb-melee from Turn 3 — no Health in it', () => {
    const { zombie } = late(1)
    expect(zombie.ai).toBe('flee')
    expect(zombie.aiChanges).toEqual([{ id: CHARGE, when: { fromTurn: 3 }, mode: 'dumb-melee' }])
  })

  it('on Turn 2 it hangs back at full Health; on Turn 3 it charges, and the log names the change', () => {
    const two = late(2)
    activate(two.ctx, two.zombie.id)
    expect(changes(two.ctx)).toHaveLength(0)
    expect(swings(two.ctx, two.zombie.id)).toHaveLength(0)

    const three = late(3)
    const evs = activate(three.ctx, three.zombie.id)
    expect(evs.filter((e) => e.type === 'ai.mode').map((e) => [e.causeId, e['mode']])).toEqual([[CHARGE, 'dumb-melee'], ['ai.dumb-melee', 'dumb-melee']])
    expect(changes(three.ctx)[0]).toMatchObject({ actor: three.zombie.id, from: 'flee', when: { fromTurn: 3 } })
    expect(swings(three.ctx, three.zombie.id).map((e) => e.target)).toEqual([three.warrior.id])
  })

  it('Health does not move it: cut below half on Turn 1, it still hangs back', () => {
    const { ctx, zombie } = late(1)
    applyDamage(ctx, zombie.id, 25, 'test', {})
    activate(ctx, zombie.id)
    expect(changes(ctx)).toHaveLength(0)
    expect(zombie.ai).toBe('flee')
  })

  it('in a real battle (test.mode-change-b) it never bites before Turn 3, changes on Turn 3, and bites after', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.mode-change-b']!))
    runBattle(ctx)
    const zombie = ctx.state.units.find((u) => u.typeId === 'test-late-zombie')!
    const [change, ...more] = changes(ctx, zombie.id)
    expect(more).toHaveLength(0)
    expect(change).toMatchObject({ causeId: CHARGE, mode: 'dumb-melee', from: 'flee', turn: 3 })
    const bites = swings(ctx, zombie.id)
    expect(bites.filter((e) => e.seq < change!.seq)).toHaveLength(0)
    expect(bites.filter((e) => e.seq > change!.seq).length).toBeGreaterThan(0)
  })
})

describe('the mechanism', () => {
  it('several changes that hold together happen in listed order — the last is the mode it plays', () => {
    const { ctx, zombie } = rout()
    zombie.aiChanges = [...zombie.aiChanges!, { id: 'test.rout-zombie.second', when: { hpBelow: 25 }, mode: 'hunter' }]
    applyDamage(ctx, zombie.id, 25, 'test', {})          // 5 of 30: both hold
    const evs = activate(ctx, zombie.id)
    expect(evs.filter((e) => e.type === 'ai.mode').map((e) => e.causeId)).toEqual([ROUT, 'test.rout-zombie.second', 'ai.hunter'])
    expect(zombie.ai).toBe('hunter')
  })

  it('a change to a mode no row carries stops loudly (Law 9)', () => {
    const { ctx, zombie } = rout()
    zombie.aiChanges = [{ id: ROUT, when: { hpBelow: 50 }, mode: 'nobody-authored-this' }]
    applyDamage(ctx, zombie.id, 20, 'test', {})
    beginActivation(ctx, zombie.id, 'test')
    expect(() => runActivation(ctx, zombie.id)).toThrow(/unknown AI mode/)
  })

  it('a unit whose row names no change behaves as before: no aiChanges field, no change line', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(8, 7) }], [{ type: 'test-zombie', hex: hexId(8, 8) }])
    expect(ctx.state.units[1]!.aiChanges).toBeUndefined()
    runBattle(ctx)
    expect(changes(ctx)).toHaveLength(0)
  })
})
