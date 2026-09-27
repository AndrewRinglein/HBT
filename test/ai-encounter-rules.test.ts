// ai.encounter-rules (AI-DESIGN.md §4; DECISIONS.md 2026-09-26 "the AI: modes per
// unit type, scoring inside them, encounter rules on top"): "By default, they will
// not work together. By default, we basically have a mode for each type of unit.
// But we can have some overarching rules that could apply based on an encounter."
// Authored on the encounter row, not the unit; coordination is a once-per-Phase
// side step (the focus target) that coordinated units' scoring reads.
//
// The item's expect, one block each:
//   1. one encounter anchors a unit to a hex it would otherwise leave —
//      test.encounter.anchor-hold: its Strong Skeleton holds within 1 of (14,4)
//   2. another turns on coordination and its units share a target —
//      test.encounter.coordinated-pack: two Strong Skeletons, one focus a Phase
//   3. the same units without the encounter rules behave as their modes alone —
//      each block runs the same fielding with the row's rules taken off
// Both rows are content/test/encounters.json; the engine names neither. The
// defaults taken are SWITCHES.md "Encounter AI rules".
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { sideStep } from '../src/ai/side-brain.js'
import { applyDamage, beginActivation, setPhase } from '../src/core/mutate.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { settle } from '../src/core/settle.js'
import { ENCOUNTERS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Event, Unit } from '../src/core/types.js'

const ANCHOR = 'test.anchor.hold-the-line'
const COORDINATE = 'test.coordinate.one-target'

/** A scenario's fielding — with the encounter's AI rules, or with them taken off. */
function field(scenario: string, rules = true): Ctx {
  const o = scenarioOptions(SCENARIOS[scenario]!)
  if (rules) return createBattle(o)
  const { aiRules: _taken, ...alone } = o.encounter!
  return createBattle({ ...o, encounter: alone })
}
function activate(ctx: Ctx, id: number): Event[] {
  const from = ctx.events.length
  beginActivation(ctx, id, 'test'); runActivation(ctx, id)
  return ctx.events.slice(from)
}
const moves = (evs: readonly Event[], actor: number) => evs.filter((e) => e.type === 'move.begin' && e.actor === actor)
const swings = (evs: readonly Event[], actor: number) => evs.filter((e) => e.type === 'attack.declared' && e.actor === actor)
const byType = (ctx: Ctx, typeId: string): Unit[] => ctx.state.units.filter((u) => u.typeId === typeId)

describe('an encounter anchors a unit to a hex it would otherwise leave', () => {
  function anchored(rules = true) {
    const ctx = field('test.encounter-rules-a', rules)
    ctx.state.turn = 1
    const [warrior] = byType(ctx, 'test-warrior'), [skeleton] = byType(ctx, 'unit.strong-skeleton'), [zombie] = byType(ctx, 'unit.zombie')
    warrior!.hp = warrior!.maxHp = 999
    return { ctx, warrior: warrior!, skeleton: skeleton!, zombie: zombie!, anchor: ctx.geo.hexId(14, 4) }
  }

  it('the rule is data on the encounter row and binds only the unit type it names, as it arrives', () => {
    expect(ENCOUNTERS['test.encounter.anchor-hold']!.aiRules).toEqual([
      { id: ANCHOR, rule: 'anchor', units: ['unit.strong-skeleton'], at: { col: 14, row: 4 }, radius: 1 },
    ])
    const { ctx, skeleton, zombie, anchor } = anchored()
    expect(skeleton.aiRules).toEqual([ANCHOR])
    expect(zombie.aiRules).toBeUndefined()
    const bound = ctx.events.filter((e) => e.type === 'ai.anchored')
    expect(bound).toHaveLength(1)
    expect(bound[0]).toMatchObject({ causeId: ANCHOR, actor: skeleton.id, hex: anchor, radius: 1 })
  })

  it('with a warrior twelve hexes off, the anchored skeleton ends within 1 of its hex; the zombie beside it advances', () => {
    const { ctx, warrior, skeleton, zombie, anchor } = anchored()
    const start = zombie.hex
    const s = activate(ctx, skeleton.id)
    expect(ctx.geo.distance(skeleton.hex, anchor)).toBeLessThanOrEqual(1)
    for (const m of moves(s, skeleton.id)) expect(ctx.geo.distance(m['to'] as number, anchor)).toBeLessThanOrEqual(1)
    activate(ctx, zombie.id)
    expect(ctx.geo.distance(zombie.hex, start)).toBe(4)   // the zombie is not bound: its whole walk, toward the warrior
    expect(ctx.geo.distance(zombie.hex, warrior.hex)).toBeLessThan(ctx.geo.distance(start, warrior.hex))
  })

  it('without the rule the same skeleton walks its full Movement toward the warrior and leaves the hex', () => {
    const { ctx, warrior, skeleton, anchor } = anchored(false)
    expect(skeleton.aiRules).toBeUndefined()
    const before = ctx.geo.distance(skeleton.hex, warrior.hex)
    activate(ctx, skeleton.id)
    expect(ctx.geo.distance(skeleton.hex, anchor)).toBe(4)
    expect(ctx.geo.distance(skeleton.hex, warrior.hex)).toBe(before - 4)
  })

  it('an enemy that comes to the edge of the anchor is still fought: the skeleton steps within its radius and swings', () => {
    const { ctx, warrior, skeleton, anchor } = anchored()
    warrior.hex = ctx.geo.hexId(12, 4)   // 2 from the anchor: reachable from a hex inside it
    const evs = activate(ctx, skeleton.id)
    expect(ctx.geo.distance(skeleton.hex, anchor)).toBeLessThanOrEqual(1)
    expect(ctx.geo.distance(skeleton.hex, warrior.hex)).toBe(1)
    expect(swings(evs, skeleton.id).map((e) => e.target)).toEqual([warrior.id])
  })

  it('knocked outside its anchor, it walks back first — a rule, logged — and does not chase the warrior', () => {
    const { ctx, warrior, skeleton, anchor } = anchored()
    skeleton.hex = ctx.geo.hexId(10, 4)   // 4 outside (14,4)
    warrior.hex = ctx.geo.hexId(6, 4)
    const evs = activate(ctx, skeleton.id)
    expect(moves(evs, skeleton.id)).toHaveLength(1)
    expect(ctx.geo.distance(skeleton.hex, anchor)).toBe(0)
    expect(ctx.aiLog.filter((l) => l.actor === skeleton.id).map((l) => l.choice)).toEqual(['rule.return-to-anchor'])
    expect(swings(evs, skeleton.id)).toHaveLength(0)
  })

  it('in a real battle (test.encounter-rules-a) no move of the skeleton ends more than 1 from its hex; without the rule its first move does', () => {
    const ctx = field('test.encounter-rules-a')
    runBattle(ctx)
    const [skeleton] = byType(ctx, 'unit.strong-skeleton'), anchor = ctx.geo.hexId(14, 4)
    const walked = moves(ctx.events, skeleton!.id)
    expect(walked.length).toBeGreaterThan(0)
    for (const m of walked) expect(ctx.geo.distance(m['to'] as number, anchor)).toBeLessThanOrEqual(1)
    const alone = field('test.encounter-rules-a', false)
    runBattle(alone)
    const first = moves(alone.events, byType(alone, 'unit.strong-skeleton')[0]!.id)[0]!
    expect(alone.geo.distance(first['to'] as number, anchor)).toBeGreaterThan(1)
  })
})

describe('an encounter turns on coordination and its units share a target', () => {
  /** The same fielding, placed by hand: warrior (9,2) above, ranger (9,7) below; skeleton A (11,3) nearer the warrior, B (11,6) nearer the ranger. */
  function pack(rules = true) {
    const ctx = field('test.encounter-rules-b', rules)
    const g = ctx.geo
    const [warrior] = byType(ctx, 'test-warrior'), [ranger] = byType(ctx, 'test-ranger'), [a, b] = byType(ctx, 'unit.strong-skeleton')
    warrior!.hex = g.hexId(9, 2); ranger!.hex = g.hexId(9, 7); a!.hex = g.hexId(11, 3); b!.hex = g.hexId(11, 6)
    warrior!.hp = warrior!.maxHp = 900; ranger!.hp = ranger!.maxHp = 800   // the ranger has the least Health
    ctx.state.turn = 1
    setPhase(ctx, 'enemy', 'test')
    sideStep(ctx, 'enemy')
    return { ctx, warrior: warrior!, ranger: ranger!, a: a!, b: b! }
  }

  it('the rule is data on the encounter row and binds both skeletons as they arrive', () => {
    expect(ENCOUNTERS['test.encounter.coordinated-pack']!.aiRules).toEqual([
      { id: COORDINATE, rule: 'coordinate', units: ['unit.strong-skeleton'], focus: [{ targetHealth: -1 }] },
    ])
    const { ctx, a, b } = pack()
    expect([a.aiRules, b.aiRules]).toEqual([[COORDINATE], [COORDINATE]])
    expect(ctx.events.filter((e) => e.type === 'ai.coordinated').map((e) => [e.causeId, e.actor])).toEqual([[COORDINATE, a.id], [COORDINATE, b.id]])
  })

  it('the side step picks one focus by the row\'s tiers — the enemy with the least Health — as state, logged with its cause', () => {
    const { ctx, ranger, a } = pack()
    expect(ctx.state.encounter!.focus).toEqual({ [COORDINATE]: ranger.id })
    const picked = ctx.events.filter((e) => e.type === 'ai.focused')
    expect(picked).toHaveLength(1)
    expect(picked[0]).toMatchObject({ causeId: COORDINATE, side: 'enemy', target: ranger.id })
    // it does not change who the units are nearest: A is still nearer the warrior
    expect(ctx.geo.distance(a.hex, ranger.hex)).toBeGreaterThan(ctx.geo.distance(a.hex, ctx.state.units[0]!.hex))
  })

  it('both skeletons close on and strike the focus, though A stands nearer the warrior', () => {
    const { ctx, ranger, a, b } = pack()
    const evs = [...activate(ctx, a.id), ...activate(ctx, b.id)]
    expect(swings(evs, a.id).map((e) => e.target)).toEqual([ranger.id])
    expect(swings(evs, b.id).map((e) => e.target)).toEqual([ranger.id])
    // the scoring read the side plan: the taken swing scored 1 on it
    const choice = ctx.aiLog.find((l) => l.actor === a.id && l.choice === 'attack')!
    expect(choice.plans[0]).toMatchObject({ target: ranger.id, terms: { sidePlan: 1 } })
  })

  it('without the rule the same skeletons play their modes alone: each goes for its nearest, and they split', () => {
    const { ctx, warrior, ranger, a, b } = pack(false)
    expect(ctx.state.encounter?.focus).toBeUndefined()
    expect(ctx.events.filter((e) => e.type === 'ai.focused')).toHaveLength(0)
    const evs = [...activate(ctx, a.id), ...activate(ctx, b.id)]
    expect(swings(evs, a.id).map((e) => e.target)).toEqual([warrior.id])
    expect(swings(evs, b.id).map((e) => e.target)).toEqual([ranger.id])
  })

  it('a focus that falls mid-Phase frees the units to their own modes until the next side step', () => {
    const { ctx, warrior, ranger, a } = pack()
    applyDamage(ctx, ranger.id, ranger.hp, 'test', {})
    settle(ctx, 'test')
    expect(ranger.lifeState).not.toBe('standing')
    const evs = activate(ctx, a.id)
    expect(swings(evs, a.id).map((e) => e.target)).toEqual([warrior.id])
  })

  it('the focus and the bound rules survive a save and restore exactly', () => {
    const { ctx } = pack()
    const saved = saveBattle(ctx)
    const loaded = restoreBattle(saved, ctx)
    expect(loaded.state.encounter!.focus).toEqual(ctx.state.encounter!.focus)
    expect(saveBattle(loaded)).toBe(saved)
  })

  it('in a real battle (test.encounter-rules-b) the side step runs once per enemy Phase, before any enemy Activation, while a bound unit stands', () => {
    const ctx = field('test.encounter-rules-b')
    runBattle(ctx)
    const [a, b] = byType(ctx, 'unit.strong-skeleton')
    const picks = ctx.events.filter((e) => e.type === 'ai.focused')
    expect(picks.length).toBeGreaterThan(0)
    for (const p of picks) {
      expect(p.causeId).toBe(COORDINATE)
      expect(p.phase).toBe('enemy')
      const opened = ctx.events.find((e) => e.type === 'phase.begin' && e.turn === p.turn && e['phase'] === 'enemy')!
      const firstActivation = ctx.events.find((e) => e.type === 'activation.begin' && e.turn === p.turn && e.phase === 'enemy')
      expect(p.seq).toBeGreaterThan(opened.seq)
      if (firstActivation) expect(p.seq).toBeLessThan(firstActivation.seq)
      expect(picks.filter((q) => q.turn === p.turn)).toHaveLength(1)
    }
    // Turn 1: the ranger (7 Health) is the focus over the warrior (10)
    expect(picks[0]).toMatchObject({ turn: 1, target: ctx.state.units.find((u) => u.typeId === 'test-ranger')!.id })
    // both skeletons moved toward the focus on Turn 1; alone, A walks to the warrior instead
    const focus = picks[0]!.target!
    const turn1 = (c: Ctx, id: number) => moves(c.events.filter((e) => e.turn === 1 && e.phase === 'enemy'), id)[0]!
    for (const s of [a!, b!]) {
      const m = turn1(ctx, s.id), at = (seq: number, id: number) => ctx.events.filter((e) => e.seq < seq && e.type === 'moved' && e.actor === id).at(-1)?.['to'] as number | undefined
      const focusHex = at(m.seq, focus) ?? ctx.events.find((e) => e.type === 'unit.enter' && e.actor === focus)!['hex'] as number
      expect(ctx.geo.distance(m['to'] as number, focusHex)).toBeLessThan(ctx.geo.distance(m['from'] as number, focusHex))
    }
    // alone, the same fielding binds nothing and picks nothing: the modes play alone
    const alone = field('test.encounter-rules-b', false)
    runBattle(alone)
    expect(alone.events.filter((e) => e.type === 'ai.focused' || e.type === 'ai.coordinated')).toHaveLength(0)
    expect(byType(alone, 'unit.strong-skeleton').map((u) => u.aiRules)).toEqual([undefined, undefined])
  })
})
