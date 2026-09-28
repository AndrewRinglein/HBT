// capability.charge (2026-09-27) — "Charge (Iron Colossus, cd 4; Fast Zombie)
// moves N hexes and attacks as ONE action" (backlog; approved with the other
// move.* rows, DECISIONS.md 2026-09-02 "The enemy special moves"). The one-
// action-type ruling's own example, "Move 3, do damage" (types.ts): an action
// with a move profile AND an attack profile, aimed at a unit (src/core/charge.ts).
// The Colossus's noPrimaryAction ("has no primary action at all",
// ENEMY-REVIEW.md:348) rides with it.
//
// Rules, not frozen numbers: every number is read from the Codex's own bestiary
// row (content/hbt-content.json), never retyped.
//   (1) each Codex Charge row compiles to a charge with the row's numbers, and is no longer a gap
//   (2) on the action list when the target is out of reach and within `hexes`; off it
//       when already in reach, beyond `hexes`, or on cooldown
//   (3) one action: walks at most `hexes` (every step names the charge), then the
//       attack, resolved by the one damage function — the hit chance and the damage
//       are preview()'s from where the walk ended; the movement slot and the
//       cooldown are spent once
//   (4) the second row, with different numbers, is pure data (it.each over both)
//   (5) never an attack of opportunity; a walk stopped short spends the charge, no blow
//   (6) noPrimaryAction closes the primary slot — the Colossus's walk is movement only
//   (7) the AI charges in a real battle (test.charge-a / -b)
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ACTIONS, UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { beginActivation } from '../src/core/mutate.js'
import { executeAction, legalActions, type ActionRequest } from '../src/core/commands.js'
import { canAttack, preview } from '../src/core/pipeline.js'
import { isCharge, resolveActionSlot } from '../src/core/action.js'
import { runActivation } from '../src/ai/modes.js'
import { runBattle } from '../src/core/battle.js'
import type { Ctx } from '../src/core/types.js'
import { hexId } from './board16.js'

type RowMove = { id: string; hexes?: number; cooldown?: number; attack?: { damage: { stat: string; mod: number }; accuracyMod?: number } }
type Row = { id: string; noPrimaryAction?: boolean; moves?: (string | RowMove)[] }
const CODEX = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8')) as { bestiary: Row[] }
const GAPS = (JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')) as
  { gaps: { unit: string; what: string; needs: string }[] }).gaps

// Every Codex move row that travels AND attacks — the Charges.
const CHARGES: { unit: string; row: RowMove }[] = CODEX.bestiary.flatMap((u) => (u.moves ?? [])
  .filter((m): m is RowMove => typeof m === 'object' && m.hexes !== undefined && m.attack !== undefined)
  .map((row) => ({ unit: u.id, row })))
const CASES = CHARGES.map((c) => [c.row.id, c] as const)

/** One deep-health warrior and one enemy, `d` hexes apart on row 5, the enemy's Activation open at Turn 1. */
function duel(enemy: string, d: number): { ctx: Ctx; h: number; e: number } {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(4, 5) }], [{ type: enemy, hex: hexId(4 + d, 5) }])
  const hero = ctx.state.units[0]!, foe = ctx.state.units[1]!
  expect(ctx.geo.distance(hero.hex, foe.hex)).toBe(d)
  hero.hp = 999; hero.maxHp = 999
  ctx.state.turn = 1
  beginActivation(ctx, foe.id, 'test')
  return { ctx, h: hero.id, e: foe.id }
}
const listed = (ctx: Ctx, actor: number, actionId: string, target?: number) =>
  legalActions(ctx, actor).some((r: ActionRequest) => r.actionId === actionId && (target === undefined || ('target' in r && r.target === target)))

describe('capability.charge — the Codex rows compile to charges', () => {
  it('the Codex has the two Charge rows the item names, with different numbers', () => {
    expect(CHARGES.map((c) => c.row.id).sort()).toEqual(['move.fast-zombie.charge', 'move.iron-colossus.charge'])
    const [a, b] = CHARGES.map((c) => c.row)
    expect(a!.hexes === b!.hexes && a!.cooldown === b!.cooldown && a!.attack!.accuracyMod === b!.attack!.accuracyMod).toBe(false)
  })

  it.each(CASES)('%s — a movement-slot charge with the row\'s hexes, damage, accuracy and cooldown; no longer a gap', (_, { unit, row }) => {
    const a = ACTIONS[row.id]
    expect(a, `${row.id} in the action registry`).toBeDefined()
    expect(isCharge(a!)).toBe(true)
    expect(a!.slot).toBe('movement')
    expect(a!.move).toMatchObject({ shape: 'path', hexes: row.hexes })
    expect(a!.attack).toMatchObject({ kind: 'melee', stat: row.attack!.damage.stat, bonus: row.attack!.damage.mod })
    expect(a!.attack!.accuracy).toBe(row.attack!.accuracyMod)
    expect(a!.cooldown).toBe(row.cooldown ?? 0)
    expect(UNITS[unit]!.attacks).toContain(row.id)
    expect(GAPS.some((g) => g.unit === unit && g.what.includes(row.id)), `${row.id} still a gap`).toBe(false)
  })

  it('noPrimaryAction is carried from the Codex row, and is no longer a gap', () => {
    const rows = CODEX.bestiary.filter((u) => u.noPrimaryAction)
    expect(rows.map((u) => u.id)).toContain('unit.iron-colossus')
    for (const u of rows) {
      expect(UNITS[u.id]!.noPrimaryAction, u.id).toBe(true)
      expect(GAPS.some((g) => g.unit === u.id && /noPrimaryAction/.test(g.what)), `${u.id} gap`).toBe(false)
    }
  })
})

describe('capability.charge — on the list when it can reach, off it when it cannot', () => {
  it.each(CASES)('%s — listed at hexes+1 (out of reach, in charge range); not beside the target; not beyond hexes', (_, { unit, row }) => {
    const n = row.hexes!
    const reach = duel(unit, n + 1)
    expect(listed(reach.ctx, reach.e, row.id, reach.h)).toBe(true)
    const beside = duel(unit, 1)
    expect(listed(beside.ctx, beside.e, row.id), 'already in reach — nothing to charge').toBe(false)
    const far = duel(unit, n + 2)
    expect(listed(far.ctx, far.e, row.id), 'one hex too far').toBe(false)
  })
})

describe('capability.charge — one action: the walk, then the one damage function', () => {
  it.each(CASES)('%s — walks at most hexes to the target and strikes; preview\'s numbers from where it stopped', (_, { unit, row }) => {
    const n = row.hexes!
    const { ctx, h, e } = duel(unit, n + 1)
    const foe = ctx.state.units[e]!, hero = ctx.state.units[h]!
    const before = hero.hp, struckAt = hero.hex   // a heavy blow may knock the hero back afterwards (v2.kdb)
    const n0 = ctx.events.length
    expect(executeAction(ctx, { actor: e, actionId: row.id, target: h })).toEqual({ ok: true })
    const evs = ctx.events.slice(n0)
    const steps = evs.filter((x) => x.type === 'moved' && x.causeId === row.id)
    expect(steps.length).toBeGreaterThan(0)
    expect(steps.length).toBeLessThanOrEqual(n)
    expect(evs.filter((x) => x.type === 'attack.declared' && x.causeId === row.id).length, 'one attack').toBe(1)
    // the blow is performAttack's: its hit chance and damage are preview()'s from the landing hex
    const landing = foe.hex
    expect(ctx.geo.distance(landing, struckAt)).toBe(1)
    const roll = evs.find((x) => (x.type === 'attack.hit' || x.type === 'attack.miss') && x.causeId === row.id) as unknown as { type: string; hitChance: number; crit?: boolean }
    const twin = createCustomBattle([{ type: 'test-warrior', hex: hexId(4, 5) }], [{ type: unit, hex: landing }])
    twin.state.units[0]!.hp = 999; twin.state.units[0]!.maxHp = 999
    const pv = preview(twin, 1, 0, row.id)
    expect(roll.hitChance).toBe(pv.hitChance)
    if (roll.type === 'attack.hit' && !roll.crit) expect(before - hero.hp).toBe(pv.damageOnHit)
    // ONE spend: the movement slot, the cooldown; the primary is still the unit's own
    expect(foe.moveUsed).toBe(true)
    expect(foe.primaryUsed).toBe(false)
    expect(evs.filter((x) => x.type === 'action.spent' && x.causeId === row.id).length).toBe(1)
    if (row.cooldown) expect(foe.cooldowns[row.id]).toBe(ctx.state.turn + row.cooldown + 1)
    expect(listed(ctx, e, row.id)).toBe(false)
  })

  it.each(CASES.filter(([, c]) => c.row.cooldown))('%s — off the list through its cooldown, back when ready', (_, { unit, row }) => {
    const { ctx, h, e } = duel(unit, row.hexes! + 1)
    executeAction(ctx, { actor: e, actionId: row.id, target: h })
    const ready = ctx.state.units[e]!.cooldowns[row.id]!
    for (let t = 2; t <= ready; t++) {
      ctx.state.turn = t
      ctx.state.units[e]!.hex = hexId(5 + row.hexes!, 5)   // out of reach again, in charge range
      ctx.state.units[h]!.hex = hexId(4, 5)
      beginActivation(ctx, e, 'test')
      expect(listed(ctx, e, row.id, h), `turn ${t}`).toBe(t >= ready)
    }
  })
})

describe('capability.charge — what a charge is not', () => {
  it.each(CASES)('%s — never an attack of opportunity', (_, { unit, row }) => {
    const { ctx, h, e } = duel(unit, 1)
    expect(canAttack(ctx, e, h, row.id, 'reaction')).toBe(false)
    // the unit's plain melee still reacts (the charge's exclusion is the charge's alone)
    const plain = UNITS[unit]!.attacks.filter((id) => ACTIONS[id] && !isCharge(ACTIONS[id]!))
    expect(plain.some((id) => canAttack(ctx, e, h, id, 'reaction'))).toBe(true)
  })

  it('a walk stopped short by an attack of opportunity spends the charge and strikes nothing', () => {
    const row = CHARGES.find((c) => c.unit === 'unit.fast-zombie')!.row
    // the zombie starts inside a second warrior's zone: leaving it provokes; a sure hit ends movement
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(4, 5) }, { type: 'test-warrior', hex: hexId(8, 4) }],
      [{ type: 'unit.fast-zombie', hex: hexId(8, 5) }])
    const [a, guard, z] = ctx.state.units as [typeof ctx.state.units[0], typeof ctx.state.units[0], typeof ctx.state.units[0]]
    expect(ctx.geo.distance(guard!.hex, z!.hex)).toBe(1)
    a!.hp = 999; a!.maxHp = 999; z!.hp = 999; z!.maxHp = 999
    guard!.accuracy = 1000
    ctx.state.turn = 1
    beginActivation(ctx, z!.id, 'test')
    const n0 = ctx.events.length
    expect(executeAction(ctx, { actor: z!.id, actionId: row.id, target: a!.id })).toEqual({ ok: true })
    const evs = ctx.events.slice(n0)
    expect(evs.some((x) => x.type === 'aoo.provoked')).toBe(true)
    expect(evs.some((x) => x.type === 'move.stopped' && x.causeId === row.id)).toBe(true)
    expect(ctx.geo.distance(z!.hex, a!.hex)).toBeGreaterThan(1)
    expect(evs.some((x) => x.type === 'attack.declared' && x.causeId === row.id)).toBe(false)
    expect(evs.some((x) => x.type === 'attack.cancelled' && x.causeId === row.id)).toBe(true)
    expect(z!.moveUsed, 'spent all the same').toBe(true)
  })
})

describe('capability.charge — noPrimaryAction', () => {
  it('the Colossus cannot spend a primary: its walk is movement-slot only, and after one action nothing is left', () => {
    const { ctx, h, e } = duel('unit.iron-colossus', 6)
    const c = ctx.state.units[e]!
    const walk = ACTIONS['power.move']!
    expect(resolveActionSlot(ctx, c, walk, 'primary')).toBeNull()
    expect(resolveActionSlot(ctx, c, walk)).toBe('movement')
    const step = legalActions(ctx, e).find((r) => r.actionId === 'power.move' && 'destination' in r)!
    expect(executeAction(ctx, step)).toEqual({ ok: true })
    expect(legalActions(ctx, e)).toEqual([])
    // the same body without the flag walks twice (movement, then primary) — the flag is the difference
    const plain = duel('unit.fast-zombie', 6)
    expect(resolveActionSlot(plain.ctx, plain.ctx.state.units[plain.e]!, walk, 'primary')).toBe('primary')
    void h
  })
})

describe('capability.charge — the AI charges', () => {
  it('dumb-melee: the Fast Zombie charges its target out of reach, then claws with its primary', () => {
    const row = CHARGES.find((c) => c.unit === 'unit.fast-zombie')!.row
    const { ctx, e } = duel('unit.fast-zombie', row.hexes! + 1)
    const n0 = ctx.events.length
    runActivation(ctx, e)
    const declared = ctx.events.slice(n0).filter((x) => x.type === 'attack.declared').map((x) => x.causeId)
    expect(declared[0]).toBe(row.id)
    expect(declared).toContain('attack.zombie.claw')
  })

  it('the Colossus charges, and with no primary action does nothing more that Activation', () => {
    const row = CHARGES.find((c) => c.unit === 'unit.iron-colossus')!.row
    const { ctx, e } = duel('unit.iron-colossus', row.hexes! + 1)
    const n0 = ctx.events.length
    runActivation(ctx, e)
    const declared = ctx.events.slice(n0).filter((x) => x.type === 'attack.declared').map((x) => x.causeId)
    expect(declared).toEqual([row.id])
  })

  it.each([['test.charge-a', 'move.fast-zombie.charge'], ['test.charge-b', 'move.iron-colossus.charge']])('%s — %s is made in a real battle', (sid, id) => {
    const s = SCENARIOS[sid]
    expect(s, sid).toBeDefined()
    const ctx = createBattle(scenarioOptions(s!))
    runBattle(ctx)
    expect(ctx.events.some((x) => x.type === 'attack.declared' && x.causeId === id)).toBe(true)
  })
})
