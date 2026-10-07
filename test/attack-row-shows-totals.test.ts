// viewer.attack-row-shows-totals and viewer.used-up-power-stays-greyed — the host's halves, in one file (both are what the host
// hands the action bar from the live engine).
//
// viewer.attack-row-shows-totals — ruled 2026-10-06 (Andrew, engine/DECISIONS.md 'an attack shows its total Accuracy and Crit,
// not the weapon's plus' and 'an attack's numbers: the total alone, no list of what it is made of'): "The dagger doesn't show
// +5 critical. What happens is the attack shows the total critical. The same thing is true of accuracy." / "We just need to
// see the total." The host hands the bar the ENGINE'S OWN figures for a unit's attacks (src/ui/attack-totals.ts: the engine's
// attackFigures on the live battle); it adds nothing up.
//
// viewer.used-up-power-stays-greyed — ruled 2026-10-06 ('… a used-up power stays on the bar, greyed'): asked whether a used-up
// once-per-battle power should stay on the bar greyed instead of disappearing — "One, yes." The host names an action whose
// last use is spent (the engine's own record, usesSpentThisBattle, while the engine no longer grants it) with its line; a
// press on it is answered by the line and changes nothing; a use given back, it is named no longer.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createSandbox, advanceSandbox, commandSandbox, type Sandbox } from '../src/core/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { attackTotalsOf } from '../src/ui/attack-totals.js'
import { usedUpLine } from '../src/ui/refusals.js'
import { encounterDef, isAttack, grantedActionIds, attackFigures, type BattleCommand } from '../src/engine.js'
import { spendAction } from '../../engine/src/core/action.js'
import { applyStatus } from '../../engine/src/core/status.js'
import { kdbDownStatus } from '../../engine/src/core/kdb.js'

const LUMBERJACK = 'encounter.opening.lumberjack', ORPHANAGE = 'encounter.opening.orphanage', DWARF = 'hero.base.warrior-iron'
type U = Sandbox['ctx']['state']['units'][number]
function battle(encounterId: string, heroes: string[]) {
  const s = createSandbox({ mapId: encounterDef(encounterId).mapId!, heroes, enemies: [], seed: 1, encounterId })
  advanceSandbox(s)
  const P = createPlayInput(() => s, (c: BattleCommand) => commandSandbox(s, c))
  const acting = () => (s.ctx.battleCursor?.at === 'acting' ? s.ctx.battleCursor.actor : null)
  const begin = (u: U) => { if (acting() === u.id) return; P.input({ kind: 'choose', id: u.id }); expect(acting(), `${u.name}'s Activation`).toBe(u.id) }
  return { s, P, begin, acting }
}

describe('viewer.attack-row-shows-totals — the host hands the bar the engine\'s own figures', () => {
  it('for every unit of battle 2: each attack it is granted, and only those, with the engine\'s attackFigures; the Dagger\'s 5 is in the Wife\'s Stab; a unit the battle does not hold has none', () => {
    const { s } = battle(LUMBERJACK, [DWARF])
    let attacks = 0
    for (const u of s.ctx.state.units) {
      const T = attackTotalsOf(s.ctx, u.id)!, mine = grantedActionIds(s.ctx, u).filter((id) => isAttack(s.ctx.actions[id]!))
      expect(Object.keys(T).sort(), u.name).toEqual([...mine].sort())
      for (const id of mine) { expect(T[id], `${u.name}'s ${s.ctx.actions[id]!.name}`).toEqual(attackFigures(s.ctx, u, s.ctx.actions[id] as never)); attacks++ }
    }
    expect(attacks).toBeGreaterThan(8)
    const wife = s.ctx.state.units.find((u) => u.typeId === 'hero.fixed.lumberjacks-wife')!, T = attackTotalsOf(s.ctx, wife.id)!
    expect(s.ctx.actions['attack.dagger.stab']!.attack!.crit).toBe(5)
    const other = Object.keys(T).find((id) => id !== 'attack.dagger.stab')!
    expect(T['attack.dagger.stab']!.crit - T[other]!.crit).toBe(Math.min(T['attack.dagger.stab']!.crit, 5 - (s.ctx.actions[other]!.attack!.crit ?? 0)))
    expect(attackTotalsOf(s.ctx, 999)).toBeNull(); expect(attackTotalsOf(null, 0)).toBeNull()
  })
  it('the figures are the live battle\'s: knocked down, a unit\'s Accuracy with every attack is the engine\'s figure for the floor', () => {
    const { s } = battle(LUMBERJACK, [DWARF])
    const wife = s.ctx.state.units.find((u) => u.typeId === 'hero.fixed.lumberjacks-wife')!, before = attackTotalsOf(s.ctx, wife.id)!
    const prone = kdbDownStatus(s.ctx)!, rule = s.ctx.statuses[prone]!.prone!
    applyStatus(s.ctx, wife.id, prone, 1, 'viewer.attack-row-shows-totals', s.ctx.state.units.find((u) => u.side === 'enemy')!.id)
    const after = attackTotalsOf(s.ctx, wife.id)!
    for (const id of Object.keys(before)) expect(after[id]!.accuracy, s.ctx.actions[id]!.name).toBe(before[id]!.accuracy + rule.accuracy)
  })
  it('the page: on the built battle screen every attack row shows the live engine\'s Accuracy and Crit and names no part of a total', () => {
    const out = execFileSync(process.execPath, ['tools/attack-row-shows-totals.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/attack-row-shows-totals: .* passed/)
    for (const line of out.split('\n').filter((l) => /^  /.test(l))) console.log(line)
  }, 240000)
})

describe('viewer.used-up-power-stays-greyed — the host names a used-up action and answers a press on it', () => {
  it('a power\'s one use spent by the engine: it leaves the engine\'s list, the host names it "Used: once per Battle.", a press says so and changes nothing; a use given back, it is named no longer', () => {
    /* No hero of the opening is fielded with a once-per-Battle power, so one of the Iron Dwarf's own powers is given one use
       here, and only here (its row copied with uses: 1, and the unit's count set as fielding sets it); it is then SPENT BY THE
       ENGINE'S OWN SPEND (core/action.ts spendAction → spendUse), which is what takes it off the unit's list, says
       power.exhausted and remembers the use. What is held is the host's reading of that. */
    const b = battle(ORPHANAGE, [DWARF]), { s, P } = b, u = s.ctx.state.units.find((x) => x.typeId === DWARF)!
    b.begin(u)
    const id = grantedActionIds(s.ctx, u).find((x) => !s.ctx.actions[x]!.attack && !s.ctx.actions[x]!.move && !s.ctx.actions[x]!.cooldown)!
    expect(id, 'a power of its own').toBeTruthy()
    const rows = s.ctx as unknown as { actions: Record<string, unknown> }, row = { ...s.ctx.actions[id]!, uses: 1 }
    rows.actions = { ...rows.actions, [id]: row }; u.usesLeft[id] = 1
    expect((P.facts().cantPay ?? []).map((c) => c.id), 'with its use left it is not named').not.toContain(id)
    spendAction(s.ctx, u.id, row as never, 'primary')
    expect(u.actions, 'the engine took it off the unit\'s list').not.toContain(id)
    expect(s.ctx.events.some((e) => e.type === 'power.exhausted' && e['abilityId'] === id)).toBe(true)
    const named = (P.facts().cantPay ?? []).find((c) => c.id === id)
    expect(named, 'the host names it').toEqual({ id, why: 'Used: once per Battle.' })
    const from = s.ctx.events.length, slot = P.facts().slot
    expect(P.input({ kind: 'slot', actionId: id, unit: u.id }), 'the press is answered').toBe(true)
    expect(P.facts().note).toBe('Used: once per Battle.'); expect(P.facts().slot).toBe(slot); expect(s.ctx.events.length, 'nothing happened').toBe(from)
    // a use given back: the engine grants it again
    u.actions.push(id); u.usesLeft[id] = 1
    expect((P.facts().cantPay ?? []).map((c) => c.id), 'a use given back: named no longer').not.toContain(id)
    expect(usedUpLine(1)).toBe('Used: once per Battle.'); expect(usedUpLine(3)).toBe('No uses left.'); expect(usedUpLine(undefined)).toBe('No uses left.')
  })
})
