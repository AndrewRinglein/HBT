// pack.enemy-actions — AI-DESIGN.md §7 step 2 (ruled 2026-09-26). Enemies use
// the ONE action type too (DECISIONS.md 2026-09-04, "The power pool is much
// larger, and enemies use the one action type too") and carry uses, cooldown
// and warmup ("Enemies carry uses, cooldown, warmup; cost is unresolved"). The
// `move.*` kind was approved 2026-09-02 (DECISIONS.md "The enemy special
// moves"; KINDS.md). What the pack used to drop — enemy special moves and the
// movement power `flight` — is carried here, and what the engine truly cannot
// say stays a NAMED gap (content/gen/enemy-pack-gaps.json), never a guess.
//
// Rules, not frozen numbers: every number below is read from the Codex's own
// bestiary row (content/hbt-content.json), never retyped.
//   (1) each carried action is on its unit in the engine pack with the row's numbers
//   (2) it is on the action list (legalActions, src/core/commands.ts) for that
//       unit in a scripted battle when ready, and off it while on cooldown
//   (3) a special move the engine cannot express is a named gap, not dropped
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { UNIT_PACK } from '../src/content/generated/pack.js'
import { createCustomBattle } from '../src/core/setup.js'
import { beginActivation } from '../src/core/mutate.js'
import { executeAction, legalActions, type ActionRequest } from '../src/core/commands.js'
import { runActivation } from '../src/ai/modes.js'
import type { Ctx } from '../src/core/types.js'
import { hexId } from './board16.js'

type RowEffect = { effect: string; stat?: string; value?: number; powerScale?: number; target?: string }
type RowTrigger = { hook: string; chance?: number }
type RowMove = {
  id: string; name: string; hexes?: number; cooldown?: number; warmup?: number; whenStartingAdjacent?: boolean
  attack?: { damage: { stat: string; mod: number }; crit?: number; accuracyMod?: number; triggers?: RowTrigger[] }
  effects?: RowEffect[]
}
type Row = { id: string; movePower?: string; moveIgnoresZOC?: boolean; moves?: (string | RowMove)[] }
const CODEX = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8')) as { bestiary: Row[] }
const GAPS = () => (JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')) as
  { gaps: { unit: string; what: string; needs: string }[] }).gaps

function row(unitId: string): Row {
  const r = CODEX.bestiary.find((u) => u.id === unitId)
  if (!r) throw new Error(`no Codex bestiary row ${unitId}`)
  return r
}
function moveRow(unitId: string, moveId: string): RowMove {
  const m = (row(unitId).moves ?? []).find((x): x is RowMove => typeof x === 'object' && x.id === moveId)
  if (!m) throw new Error(`${unitId} has no Codex move ${moveId}`)
  return m
}

type PackUnit = { typeId: string; ai: string; attacks: string[]; abilities: string[]; moves: string[]; triggers: { hook: string; chance: number; onlyWithAttack?: string }[] }
type PackAction = Record<string, unknown> & { id: string }
const PACK = UNIT_PACK as unknown as {
  authoredEnemies: PackUnit[]; authoredAttacks: Record<string, PackAction>; authoredAbilities: Record<string, PackAction>
}
function packUnit(unitId: string): PackUnit {
  const u = PACK.authoredEnemies.find((x) => x.typeId === unitId)
  if (!u) throw new Error(`no pack row ${unitId}`)
  return u
}

// The named actions (AI-DESIGN.md §7 step 2; backlog pack.enemy-actions).
const ATTACK_MOVES: readonly [string, string][] = [
  ['unit.iron-colossus', 'move.iron-colossus.clobber'],
  ['unit.bloodhound', 'move.hound.close-bite'],
  ['unit.hellhound', 'move.hellhound.close-bite'],
  ['unit.zombie-hound', 'move.zombie-hound.close-bite'],
  ['unit.demon-hound', 'move.demon-hound.close-bite'],
]
const BUFF: [string, string] = ['unit.iron-colossus', 'move.iron-colossus.buff']
const CHARGE: [string, string] = ['unit.iron-colossus', 'move.iron-colossus.charge']
const HOUNDS = ['unit.bloodhound', 'unit.hellhound', 'unit.zombie-hound', 'unit.demon-hound']
// Every Codex row whose movement power is flight — `movePower: flight`, or a
// `power.flight` grant in its moves (the Shadow Sorcerer's spelling).
const FLIERS = CODEX.bestiary.filter((u) => u.movePower === 'flight' || (u.moves ?? []).includes('power.flight')).map((u) => u.id).sort()
const flightPowerOf = (r: Row) => r.movePower ? `power.${r.movePower}` : (r.moves ?? []).find((m): m is string => typeof m === 'string' && m.startsWith('power.'))!

/** One hero with deep health and one enemy, `d` hexes apart on row 5, at Turn 1. */
function duel(enemy: string, d: number): { ctx: Ctx; h: number; e: number } {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(4, 5) }], [{ type: enemy, hex: hexId(4 + d, 5) }])
  const hero = ctx.state.units[0]!, foe = ctx.state.units[1]!
  expect(ctx.geo.distance(hero.hex, foe.hex)).toBe(d)
  hero.hp = 999; hero.maxHp = 999
  ctx.state.turn = 1
  beginActivation(ctx, foe.id, 'test')
  return { ctx, h: hero.id, e: foe.id }
}
const listed = (ctx: Ctx, actor: number, actionId: string, pred: (r: ActionRequest) => boolean = () => true) =>
  legalActions(ctx, actor).some((r) => r.actionId === actionId && pred(r))
const at = (target: number) => (r: ActionRequest) => 'target' in r && r.target === target

describe('pack.enemy-actions — the pack carries the Codex rows', () => {
  it('the named rows exist in the Codex as the item says (six movePower fliers, four ZOC-ignoring hounds)', () => {
    expect(CODEX.bestiary.filter((u) => u.movePower === 'flight').length).toBe(6)
    for (const id of HOUNDS) expect(row(id).moveIgnoresZOC, id).toBe(true)
    for (const [u, m] of [...ATTACK_MOVES, BUFF, CHARGE]) expect(moveRow(u, m).name, m).toBeTruthy()
  })

  it.each(ATTACK_MOVES)('%s — %s is a movement-slot melee attack with the row\'s numbers and riders', (unitId, moveId) => {
    const m = moveRow(unitId, moveId)
    const a = PACK.authoredAttacks[moveId]
    expect(a, `${moveId} in the pack's attacks`).toBeDefined()
    expect(a).toMatchObject({
      id: moveId, name: m.name, kind: 'melee', reach: 1, staminaCost: 0,
      // the row is a MOVE: it spends the Activation's movement action (ENEMY-REVIEW.md:276 "their move action can be a Close Bite")
      slot: 'movement',
      stat: m.attack!.damage.stat, bonus: m.attack!.damage.mod,
    })
    expect(a!.crit, `${moveId} crit`).toBe(m.attack!.crit)
    expect(a!.accuracy, `${moveId} accuracy`).toBe(m.attack!.accuracyMod)
    expect(a!.cooldown, `${moveId} cooldown`).toBe(m.cooldown)
    expect(packUnit(unitId).attacks, unitId).toContain(moveId)
    for (const t of m.attack!.triggers ?? []) {
      expect(packUnit(unitId).triggers.some((x) => x.onlyWithAttack === moveId && x.hook === t.hook && x.chance === (t.chance ?? 100)),
        `${moveId} ${t.hook} rider`).toBe(true)
    }
  })

  it('Buff is a self power on the movement action with the row\'s warmup, cooldown and effects', () => {
    const [unitId, moveId] = BUFF
    const m = moveRow(unitId, moveId)
    const p = PACK.authoredAbilities[moveId]
    expect(p, `${moveId} in the pack's abilities`).toBeDefined()
    expect(p).toMatchObject({ id: moveId, name: m.name, slot: 'movement', warmup: m.warmup, cooldown: m.cooldown, staminaCost: 0, target: { select: 'self' } })
    const want = (m.effects ?? []).map((e) => e.effect === 'heal'
      ? { kind: 'heal', amount: e.powerScale ? { scale: 'power', base: e.value, mult: e.powerScale } : e.value }
      : { kind: 'statMod', stat: e.stat, value: e.value, until: 'battle' })
    expect(want.length).toBe(3)
    expect(p!.effects).toEqual(want)
    expect(packUnit(unitId).abilities).toContain(moveId)
  })

  it('every flier moves by flight, its one movement power', () => {
    expect(FLIERS.length).toBeGreaterThanOrEqual(6)
    for (const id of FLIERS) expect(packUnit(id).moves, id).toEqual([flightPowerOf(row(id))])
  })

  it('what the engine cannot express is a NAMED gap, never silently dropped or guessed', () => {
    const gaps = GAPS()
    // Charge moves N hexes AND attacks as one action. Until capability.charge (2026-09-27)
    // no engine action resolved both, so it was a named gap. REWRITTEN (Law 10) from "is a
    // gap" to the rule that assertion protected: carried or named, and never a PLAIN attack
    // with its move dropped — a carried Charge keeps the Codex row's hexes. The mechanism
    // itself is test/charge.test.ts.
    const [cu, cm] = CHARGE
    const carried = PACK.authoredAttacks[cm]
    expect(carried !== undefined || gaps.some((g) => g.unit === cu && g.what.includes(cm)), `${cm} carried or named`).toBe(true)
    if (carried) expect(carried.hexes, `${cm} must not be carried as a plain attack`).toBe(moveRow(cu, cm).hexes)
    // the hounds' movement ignores zones of control: no movement power says "provokes nothing" on a walk
    for (const id of HOUNDS) expect(gaps.some((g) => g.unit === id && /moveIgnoresZOC/.test(g.what)), `${id} ZOC gap`).toBe(true)
    // the carried moves are no longer gaps, and no gap still calls the kind unapproved (approved 2026-09-02)
    // (Buff's row also carries an AI hint, "use whenever available" — AI-DESIGN.md §3D; that
    // hint is its own named gap until ai.scorer reads it, and is not the move being dropped)
    for (const [u, m] of [...ATTACK_MOVES, BUFF]) expect(gaps.some((g) => g.unit === u && g.what.includes(m) && !/^action hint/.test(g.needs)), m).toBe(false)
    expect(gaps.some((g) => /kind unapproved/.test(g.needs))).toBe(false)
  })
})

describe('pack.enemy-actions — on the action list when ready, off it on cooldown', () => {
  it('Clobber: listed against an adjacent hero; used, the movement action is spent; back next Turn; off the list on cooldown', () => {
    const [, clobber] = ATTACK_MOVES[0]!
    const { ctx, h, e } = duel('unit.iron-colossus', 1)
    expect(listed(ctx, e, clobber, at(h))).toBe(true)
    const use = legalActions(ctx, e).find((r) => r.actionId === clobber && at(h)(r))!
    expect(executeAction(ctx, use)).toEqual({ ok: true })
    expect(listed(ctx, e, clobber)).toBe(false)
    // the blow may have knocked the hero back (v2.kdb) — stand it beside the Colossus again
    ctx.state.units[h]!.hex = hexId(4, 5)
    ctx.state.turn = 2; beginActivation(ctx, e, 'test')
    expect(listed(ctx, e, clobber, at(h))).toBe(true)
    // a cooldown takes it off the list
    ctx.state.units[e]!.cooldowns[clobber] = ctx.state.turn + 1
    expect(listed(ctx, e, clobber)).toBe(false)
  })

  it('Buff: off the list through its warmup, on it when ready, heals by the row, then off for its cooldown', () => {
    const [, buff] = BUFF
    const m = moveRow(...BUFF)
    const { ctx, e } = duel('unit.iron-colossus', 6)
    const c = ctx.state.units[e]!
    const ready = c.cooldowns[buff]!
    expect(ready, 'warmup seeds the cooldown').toBeGreaterThan(ctx.state.turn)
    for (let t = 1; t < ready; t++) { ctx.state.turn = t; beginActivation(ctx, e, 'test'); expect(listed(ctx, e, buff), `turn ${t}`).toBe(false) }
    ctx.state.turn = ready; beginActivation(ctx, e, 'test')
    expect(listed(ctx, e, buff, at(e))).toBe(true)
    c.hp = c.maxHp - 20
    const before = c.hp
    const heal = m.effects!.find((x) => x.effect === 'heal')!
    const pool = ctx.state.power ?? 0
    expect(executeAction(ctx, { actor: e, actionId: buff, target: e })).toEqual({ ok: true })
    expect(c.hp - before).toBe(heal.value! + Math.floor(pool * heal.powerScale! + 0.5))
    const used = ctx.state.turn
    const back = c.cooldowns[buff]!
    // Codex semantics (2-ACTIONS-SETTLED.md, action.ts spendAction): cooldown N = skip N Turns
    expect(back).toBe(used + m.cooldown! + 1)
    for (let t = used + 1; t <= back; t++) { ctx.state.turn = t; beginActivation(ctx, e, 'test'); expect(listed(ctx, e, buff), `turn ${t}`).toBe(t >= back) }
  })

  it.each(ATTACK_MOVES.slice(1))('%s — Close Bite: listed only when the move action starts adjacent; a bite still follows on the primary', (unitId, closeBite) => {
    const bite = packUnit(unitId).attacks.find((a) => a.startsWith('attack.'))!
    expect(bite, `${unitId} has its own Bite`).toBeDefined()
    // starting adjacent: both are on the list
    const near = duel(unitId, 1)
    expect(listed(near.ctx, near.e, closeBite, at(near.h))).toBe(true)
    expect(executeAction(near.ctx, { actor: near.e, actionId: closeBite, target: near.h })).toEqual({ ok: true })
    expect(listed(near.ctx, near.e, closeBite)).toBe(false)
    expect(listed(near.ctx, near.e, bite, at(near.h)), 'the primary is still open').toBe(true)
    // ready again next Turn; a cooldown takes it off the list
    near.ctx.state.turn = 2; beginActivation(near.ctx, near.e, 'test')
    expect(listed(near.ctx, near.e, closeBite, at(near.h))).toBe(true)
    near.ctx.state.units[near.e]!.cooldowns[closeBite] = near.ctx.state.turn + 1
    expect(listed(near.ctx, near.e, closeBite)).toBe(false)
    // not starting adjacent: walk in, and the move action is spent — no Close Bite
    const far = duel(unitId, 3)
    expect(listed(far.ctx, far.e, closeBite)).toBe(false)
    const walk = legalActions(far.ctx, far.e).find((r) => 'destination' in r && far.ctx.geo.distance(r.destination, far.ctx.state.units[far.h]!.hex) === 1)!
    expect(walk, 'a walk that ends adjacent').toBeDefined()
    expect(executeAction(far.ctx, walk)).toEqual({ ok: true })
    expect(listed(far.ctx, far.e, closeBite)).toBe(false)
  })

  it.each(FLIERS)('%s — flight is on its list, and a walk is not', (unitId) => {
    const fly = flightPowerOf(row(unitId))
    const { ctx, e } = duel(unitId, 8)
    expect(legalActions(ctx, e).filter((r) => r.actionId === fly && 'destination' in r).length).toBeGreaterThan(0)
    expect(listed(ctx, e, 'power.move')).toBe(false)
    ctx.state.units[e]!.cooldowns[fly] = ctx.state.turn + 1
    expect(listed(ctx, e, fly)).toBe(false)
  })

  it('a flight-only melee enemy closes on its target by flight (the AI moves with the unit\'s one movement power)', () => {
    const melee = FLIERS.find((id) => packUnit(id).ai === 'dumb-melee')!
    expect(melee, 'a dumb-melee flier').toBeDefined()
    const { ctx, h, e } = duel(melee, 10)
    const d0 = ctx.geo.distance(ctx.state.units[h]!.hex, ctx.state.units[e]!.hex)
    runActivation(ctx, e)
    expect(ctx.geo.distance(ctx.state.units[h]!.hex, ctx.state.units[e]!.hex)).toBeLessThan(d0)
    expect(ctx.events.some((x) => x.type === 'move.begin' && x.causeId === flightPowerOf(row(melee)))).toBe(true)
  })
})
