// capability.move-ignores-zoc (2026-09-28) — the hounds "ignore ZOC": "the
// move-WITHOUT-provoking machinery, as a property of their movement — distinct
// from Juggernaut, which eats the AOO and refuses the slow" (ENEMY-REVIEW.md:276-278).
// Zone of control stays the board rule (DECISIONS.md 2026-08-20: "There are
// movement types that can happen without provoking"); what does not provoke is
// the MOVEMENT POWER the unit walks with — MoveProfile.ignoresZoc, a Codex power
// row's own sentence ("Ignores zones of control"), compiled by
// content/mkenginepack.mjs. The hounds' rows say `moveIgnoresZOC: true` and walk
// with that power.
//
// Rules, not frozen numbers: the power row and the hound rows are read from the
// Codex (content/hbt-content.json), never retyped.
//   (1) the Codex walk that ignores zones of control compiles with the property; Move does not
//   (2) every Codex row marked moveIgnoresZOC walks with it, and is no longer a gap
//   (3) a hound leaving a hero's zone provokes no attack of opportunity — one
//       `zoc.ignored` line per zone it left, naming the power (Law 12)
//   (4) a walker (the Codex Zombie, power.move) on the same path from the same hex provokes
//   (5) a hound that starts in no zone has nothing to ignore
//   (6) the four hounds are pure data (it.each over the Codex rows)
//   (7) in a real battle (showcase.prologue-enemies) the hounds walk, every step with the
//       ZoC-ignoring power, and no attack of opportunity is ever made against one
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ACTIONS, UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { beginActivation } from '../src/core/mutate.js'
import { executeAction } from '../src/core/commands.js'
import { runBattle } from '../src/core/battle.js'
import type { Ctx } from '../src/core/types.js'
import { hexId } from './board16.js'

type PowerRow = { id: string; movementAction?: boolean; description?: string }
type Row = { id: string; moveIgnoresZOC?: boolean }
const CODEX = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8')) as { powers: PowerRow[]; bestiary: Row[] }
const GAPS = (JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')) as
  { gaps: { unit: string; what: string }[] }).gaps

const ZOC_WALKS = CODEX.powers.filter((p) => p.movementAction && /Ignores zones of control/.test(p.description ?? ''))
const HOUNDS = CODEX.bestiary.filter((u) => u.moveIgnoresZOC).map((u) => u.id)
const CASES = HOUNDS.map((id) => [id] as const)

/** A deep-health warrior at (4,5) and `mover` beside it at (5,5); the mover's Activation open at Turn 1. */
function beside(mover: string, at = hexId(5, 5)): { ctx: Ctx; h: number; m: number } {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(4, 5) }], [{ type: mover, hex: at }])
  const hero = ctx.state.units[0]!, foe = ctx.state.units[1]!
  hero.hp = 999; hero.maxHp = 999
  ctx.state.turn = 1
  beginActivation(ctx, foe.id, 'test')
  return { ctx, h: hero.id, m: foe.id }
}
/** Walk `m` to `to` with the one movement power it carries; the events it made. */
function walk(ctx: Ctx, m: number, to: number) {
  const moves = UNITS[ctx.state.units[m]!.typeId]!.moves
  expect(moves).toHaveLength(1)
  const n0 = ctx.events.length
  expect(executeAction(ctx, { actor: m, actionId: moves[0]!, destination: to })).toEqual({ ok: true })
  return { power: moves[0]!, evs: ctx.events.slice(n0) }
}

describe('capability.move-ignores-zoc — the Codex rows', () => {
  it('the Codex has exactly one walk that ignores zones of control; it compiles with the property, Move does not', () => {
    expect(ZOC_WALKS).toHaveLength(1)
    const a = ACTIONS[ZOC_WALKS[0]!.id]
    expect(a, `${ZOC_WALKS[0]!.id} in the action registry`).toBeDefined()
    expect(a!.move).toMatchObject({ shape: 'path', ignoresZoc: true })
    expect(ACTIONS['power.move']!.move!.ignoresZoc).toBeUndefined()
  })

  it('the four hounds are the rows marked moveIgnoresZOC (ENEMY-REVIEW.md:276-278)', () => {
    expect([...HOUNDS].sort()).toEqual(['unit.bloodhound', 'unit.demon-hound', 'unit.hellhound', 'unit.zombie-hound'])
  })

  it.each(CASES)('%s — walks with the ZoC-ignoring power, and is no longer a gap', (id) => {
    expect(UNITS[id]!.moves).toEqual([ZOC_WALKS[0]!.id])
    expect(GAPS.some((g) => g.unit === id && /moveIgnoresZOC/.test(g.what)), `${id} still a gap`).toBe(false)
  })
})

describe('capability.move-ignores-zoc — leaving a zone of control', () => {
  it.each(CASES)('%s — leaves the warrior\'s zone and provokes nothing; one zoc.ignored line names the power', (id) => {
    const { ctx, h, m } = beside(id)
    const hp = ctx.state.units[m]!.hp
    const { power, evs } = walk(ctx, m, hexId(7, 5))
    expect(ctx.state.units[m]!.hex).toBe(hexId(7, 5))
    expect(evs.filter((e) => e.type === 'moved' && e.causeId === power)).toHaveLength(2)
    expect(evs.some((e) => e.type === 'aoo.provoked' || e.type === 'attack.declared')).toBe(false)
    expect(ctx.state.units[m]!.hp).toBe(hp)
    const ignored = evs.filter((e) => e.type === 'zoc.ignored')
    expect(ignored).toHaveLength(1)
    expect(ignored[0]).toMatchObject({ causeId: power, actor: m, holder: h, hex: hexId(5, 5) })
  })

  it('a walker on the same path, from the same hex, provokes — the Codex Zombie, with Move', () => {
    const { ctx, h, m } = beside('unit.zombie')
    const { power, evs } = walk(ctx, m, hexId(7, 5))
    expect(power).toBe('power.move')
    const provoked = evs.filter((e) => e.type === 'aoo.provoked')
    expect(provoked).toHaveLength(1)
    expect(provoked[0]).toMatchObject({ actor: h, target: m })
    expect(evs.some((e) => e.type === 'zoc.ignored')).toBe(false)
  })

  it.each(CASES)('%s — starting in no zone, there is nothing to ignore', (id) => {
    const { ctx, m } = beside(id, hexId(8, 5))
    const { evs } = walk(ctx, m, hexId(10, 5))
    expect(ctx.state.units[m]!.hex).toBe(hexId(10, 5))
    expect(evs.some((e) => e.type === 'zoc.ignored' || e.type === 'aoo.provoked')).toBe(false)
  })
})

describe('capability.move-ignores-zoc — a real battle', () => {
  it('showcase.prologue-enemies: the hounds walk with the ZoC-ignoring power, and no attack of opportunity is made against one', () => {
    const s = SCENARIOS['showcase.prologue-enemies']
    expect(s).toBeDefined()
    const ctx = createBattle(scenarioOptions(s!))
    runBattle(ctx)
    const hounds = new Set(ctx.state.units.filter((u) => HOUNDS.includes(u.typeId)).map((u) => u.id))
    expect(hounds.size).toBeGreaterThanOrEqual(3)
    const steps = ctx.events.filter((e) => e.type === 'moved' && hounds.has(e['actor'] as number))
    expect(steps.length).toBeGreaterThan(0)
    for (const e of steps) expect(ACTIONS[e.causeId]?.move?.ignoresZoc, `${e.causeId} step`).toBe(true)
    expect(ctx.events.some((e) => e.type === 'aoo.provoked' && hounds.has(e['target'] as number))).toBe(false)
  })
})
