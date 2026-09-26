// ai.scorer (AI-DESIGN.md §3B-D, ruled 2026-09-26 — DECISIONS.md "the AI: modes
// per unit type, scoring inside them, encounter rules on top").
//
// The item's expect, one block each:
//   1. the ten modes run as DATA ROWS through the scorer (the control battles
//      staying byte-identical is the gate's control check, not re-run here)
//   2. a second row with different weights changes a decision in a scripted
//      battle with no code change
//   3. every AI decision logs its top three plans and the numbers behind each
// and the framework's two other parts: considerations are numbers from
// preview(), and an action row's hint steers one action without a mode.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { runActivation, AI_MODES } from '../src/ai/modes.js'
import { CONSIDERATIONS, rank } from '../src/ai/scorer.js'
import { beginActivation } from '../src/core/mutate.js'
import { preview } from '../src/core/pipeline.js'
import type { AiModeRow, Ctx } from '../src/core/types.js'
import { hexId, neighbours } from './board16.js'

const TEN = ['flee', 'dumb-melee', 'melee-aggressive', 'ranged-kite', 'defender', 'support', 'focused-fire', 'value-hunter', 'follow', 'hunter']

/** A zombie with a warrior and a mage beside it; the warrior is the weaker. */
function crowd() {
  const z0 = hexId(5, 5)
  const [a, b] = neighbours(z0)
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: a! }, { type: 'test-mage', hex: b! }], [{ type: 'unit.zombie', hex: z0 }])
  const warrior = ctx.state.units[0]!, mage = ctx.state.units[1]!, zombie = ctx.state.units[2]!
  warrior.hp = 3; mage.hp = mage.maxHp
  expect(mage.hp).toBeGreaterThan(warrior.hp)
  return { ctx, warrior, mage, zombie }
}
const struck = (ctx: Ctx, actor: number) => ctx.events.find((e) => e.type === 'attack.declared' && e.actor === actor)?.target
const addRow = (ctx: Ctx, name: string, row: AiModeRow) => { ctx.aiModes = { ...ctx.aiModes, [name]: row } }

describe('the ten modes are data rows', () => {
  it('every mode is a row on ctx.aiModes, id ai.<name>, in the Confusion order', () => {
    const ctx = createBattle({ replicate: 0 })
    expect(Object.keys(ctx.aiModes)).toEqual(TEN)
    expect(AI_MODES).toEqual(TEN)
    for (const name of TEN) {
      const row = ctx.aiModes[name]!
      expect(row.id).toBe(`ai.${name}`)
      expect(row.rules).toBe(name)
      expect(row.target.length).toBeGreaterThan(0)
      expect(Object.keys(row.weights)).toEqual(expect.arrayContaining(['heal', 'burst', 'move']))
    }
  })

  it('every weight names a consideration the engine has, as an integer (Law 7)', () => {
    const ctx = createBattle({ replicate: 0 })
    for (const row of Object.values(ctx.aiModes)) {
      for (const tier of [row.target, ...Object.values(row.weights)].flat()) {
        for (const [k, w] of Object.entries(tier)) { expect(CONSIDERATIONS[k], `${row.id}: ${k}`).toBeDefined(); expect(Number.isSafeInteger(w)).toBe(true) }
      }
    }
  })

  it('a unit whose mode row is missing stops loudly (Law 9)', () => {
    const { ctx, zombie } = crowd()
    zombie.ai = 'nobody-authored-this'
    beginActivation(ctx, zombie.id, 'test')
    expect(() => runActivation(ctx, zombie.id)).toThrow(/unknown AI mode/)
  })
})

describe('a second row with different weights changes a decision — no code', () => {
  it('the dumb-melee row strikes the weakest; the same rules with targetHealth +1 strike the strongest', () => {
    const plain = crowd()
    beginActivation(plain.ctx, plain.zombie.id, 'test'); runActivation(plain.ctx, plain.zombie.id)
    expect(struck(plain.ctx, plain.zombie.id)).toBe(plain.warrior.id)

    const stout = crowd()
    addRow(stout.ctx, 'test-stout', { ...stout.ctx.aiModes['dumb-melee']!, id: 'ai.test-stout', target: [{ targetHealth: 1 }] })
    stout.zombie.ai = 'test-stout'
    beginActivation(stout.ctx, stout.zombie.id, 'test'); runActivation(stout.ctx, stout.zombie.id)
    expect(struck(stout.ctx, stout.zombie.id)).toBe(stout.mage.id)
    expect(stout.ctx.aiLog.at(-1)!.mode).toBe('ai.test-stout')
  })

  it('weights are summed within a tier: damage weighed above health swings at whoever the preview says takes more', () => {
    const t = crowd()
    const claw = t.zombie.actions.find((id) => t.ctx.actions[id]?.attack)!
    // measured before the swing lands — the preview the zombie chose on
    const before = new Map([t.warrior, t.mage].map((u) => [u.id, preview(t.ctx, t.zombie.id, u.id, claw).damageOnHit]))
    const dmg = (id: number) => before.get(id)!
    addRow(t.ctx, 'test-bruiser', { ...t.ctx.aiModes['dumb-melee']!, id: 'ai.test-bruiser', target: [{ damage: 1000, targetHealth: 1 }] })
    t.zombie.ai = 'test-bruiser'
    const want = [t.warrior, t.mage].sort((a, b) => (dmg(b.id) * 1000 + b.hp) - (dmg(a.id) * 1000 + a.hp) || a.id - b.id)[0]!
    const wantHp = want.hp
    beginActivation(t.ctx, t.zombie.id, 'test'); runActivation(t.ctx, t.zombie.id)
    expect(struck(t.ctx, t.zombie.id)).toBe(want.id)
    const line = t.ctx.aiLog.at(-1)!.plans[0]!
    expect(line.terms['damage']).toBe(dmg(want.id))
    expect(line.score[0]).toBe(dmg(want.id) * 1000 + wantHp)
  })
})

describe('every AI decision logs its top three plans', () => {
  for (const replicate of [0, 1]) it(`standard battle r${replicate}: one log line per action taken, the taken plan first`, () => {
    const ctx = createBattle({ replicate })
    runBattle(ctx)
    const spent = ctx.events.filter((e) => e.type === 'action.spent').length
    expect(ctx.aiLog.length).toBeGreaterThan(10)
    expect(ctx.aiLog.length).toBe(spent)
    for (const d of ctx.aiLog) {
      expect(d.plans.length).toBeGreaterThanOrEqual(1)
      expect(d.plans.length).toBeLessThanOrEqual(3)
      expect(d.mode).toMatch(/^ai\./)
      // the taken plan is the one whose events begin at `at` (Law 12: it names its cause)
      const first = ctx.events[d.at]!
      expect(first.actor).toBe(d.actor)
      expect(first.causeId).toBe(d.plans[0]!.actionId)
      // best first: no plan below outranks the one taken
      for (const p of d.plans.slice(1)) {
        const a = d.plans[0]!.score, b = p.score
        const i = a.findIndex((x, k) => x !== b[k])
        if (i >= 0) expect(a[i]!).toBeGreaterThan(b[i]!)
      }
    }
    // the scored choices carry their numbers
    const scored = ctx.aiLog.filter((d) => d.choice === 'move' || d.choice === 'attack')
    expect(scored.length).toBeGreaterThan(0)
    for (const d of scored) expect(Object.keys(d.plans[0]!.terms).length).toBeGreaterThan(0)
  })

  it('a choice with alternatives logs three, with the numbers behind each', () => {
    const ctx = createBattle({ replicate: 0 })
    runBattle(ctx)
    const move = ctx.aiLog.find((d) => d.choice === 'move' && d.plans.length === 3)!
    expect(move).toBeDefined()
    for (const p of move.plans) expect(p.terms['anchorDistance']).toEqual(expect.any(Number))
  })

  it('the log is not the event log: the event stream carries no decision line', () => {
    const ctx = createBattle({ replicate: 0 })
    runBattle(ctx)
    expect(ctx.events.some((e) => /^ai\.(decision|plans)/.test(e.type))).toBe(false)
  })
})

describe('considerations are numbers from preview (Laws 1-2)', () => {
  it('damage is the preview damage on a hit; targetHealth the state; ties keep the listed order (Law 6)', () => {
    const { ctx, zombie, warrior, mage } = crowd()
    const claw = zombie.actions.find((id) => ctx.actions[id]?.attack)!
    const r = rank({ ctx, actor: zombie }, [{ actionId: claw, target: mage.id }, { actionId: claw, target: warrior.id }], [{ damage: 1 }])
    for (const x of r) expect(x.terms['damage']).toBe(preview(ctx, zombie.id, x.plan.target!, claw).damageOnHit)
    const tie = rank({ ctx, actor: zombie }, [{ actionId: claw, target: mage.id }, { actionId: claw, target: warrior.id }], [])
    expect(tie.map((x) => x.plan.target)).toEqual([mage.id, warrior.id])
  })
})

describe('an action row hint steers one action (AI-DESIGN §3D)', () => {
  // the Iron Colossus's movement-slot self power, read off its row (pack.enemy-actions)
  const stanceOf = (ctx: Ctx, u: Ctx['state']['units'][number]) =>
    u.actions.find((id) => ctx.actions[id]?.slot === 'movement' && ctx.actions[id]?.target?.select === 'self')!
  let STANCE = ''
  function colossus(hint?: object) {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(2, 2) }], [{ type: 'unit.iron-colossus', hex: hexId(8, 12) }])
    const c = ctx.state.units[1]!
    STANCE = stanceOf(ctx, c)
    expect(STANCE).toBeDefined()
    c.cooldowns[STANCE] = 0
    if (hint) ctx.actions = { ...ctx.actions, [STANCE]: { ...ctx.actions[STANCE]!, aiHint: hint } }
    beginActivation(ctx, c.id, 'test'); runActivation(ctx, c.id)
    return { ctx, c }
  }
  it("use: 'whenever' — the Colossus opens its Activation with its movement-slot power, before any walk", () => {
    const plain = colossus()
    expect(plain.ctx.events.some((e) => e.causeId === STANCE)).toBe(false)
    const hinted = colossus({ use: 'whenever' })
    expect(hinted.ctx.aiLog[0]!.choice).toBe('hint.whenever')
    expect(hinted.ctx.aiLog[0]!.plans[0]!.actionId).toBe(STANCE)
    const stanceAt = hinted.ctx.events.findIndex((e) => e.causeId === STANCE)
    const walkAt = hinted.ctx.events.findIndex((e) => e.type === 'moved')
    expect(stanceAt).toBeGreaterThanOrEqual(0)
    if (walkAt >= 0) expect(stanceAt).toBeLessThan(walkAt)
  })

  it('belowHalfHp — the zombie holds its claw until it is under half Health', () => {
    const run = (hurt: boolean) => {
      const t = crowd()
      const claw = t.zombie.actions.find((id) => t.ctx.actions[id]?.attack)!
      t.ctx.actions = { ...t.ctx.actions, [claw]: { ...t.ctx.actions[claw]!, aiHint: { belowHalfHp: true } } }
      if (hurt) t.zombie.hp = Math.floor((t.zombie.maxHp - 1) / 2)
      beginActivation(t.ctx, t.zombie.id, 'test'); runActivation(t.ctx, t.zombie.id)
      return struck(t.ctx, t.zombie.id)
    }
    expect(run(false)).toBeUndefined()
    expect(run(true)).toBeDefined()
  })
})
