// fix.phase-ladder-config (2026-09-25). COMBAT-SEQUENCE §End of Hero Phase: "The
// ladder is an ordered list of named rungs supplied by config, not six hardcoded
// calls — so reordering it is a sweep axis rather than a diff." The built rungs
// are bleed-out (4b, hero phase only), stamina regen (5) and the victory check (6).
// SWITCHES.md `endOfPhaseLadder`, `phaseRungLog`.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { DEFAULT_CONFIG, END_OF_PHASE_RUNGS, type EndOfPhaseRung } from '../src/core/types.js'

type Ev = { type: string; [k: string]: unknown }

/** Each End of Phase in the log, as the rungs it named and the events between them. */
function phaseEnds(events: Ev[]): { side: string; rungs: { rung: string; events: string[] }[] }[] {
  const out: { side: string; rungs: { rung: string; events: string[] }[] }[] = []
  let open: (typeof out)[number] | null = null
  for (const e of events) {
    if (e.type === 'phase.end.begin') { open = { side: String(e['side']), rungs: [] }; out.push(open); continue }
    if (!open) continue
    if (e.type === 'phase.end.done' || e.type === 'battle.end' || e.type === 'turn.begin') { open = null; continue }
    if (e.type === 'phase.rung') { open.rungs.push({ rung: String(e['rung']), events: [] }); continue }
    open.rungs.at(-1)?.events.push(e.type)
  }
  return out
}

const battle = (ladder?: EndOfPhaseRung[], log = true) => createBattle({
  replicate: 3, enemyCount: 8, mapId: 'map.open',
  cfg: { switches: { ...DEFAULT_CONFIG.switches, ...(ladder ? { endOfPhaseLadder: ladder } : {}), phaseRungLog: log } },
})

describe('the End of Phase ladder is config — fix.phase-ladder-config', () => {
  it('the default ladder is the order the document gives: bleed-out, stamina regen, victory check', () => {
    expect(END_OF_PHASE_RUNGS).toEqual(['bleedOut', 'staminaRegen', 'victoryCheck'])
    expect(DEFAULT_CONFIG.switches.endOfPhaseLadder).toEqual(['bleedOut', 'staminaRegen', 'victoryCheck'])
  })

  it('by default the log is what it always was — no rung lines (the control battles stay byte-identical)', () => {
    const ctx = battle(undefined, false)
    runBattle(ctx)
    expect(ctx.events.some((e) => e.type === 'phase.rung')).toBe(false)
    expect(ctx.events.filter((e) => e.type === 'phase.end.begin').length).toBeGreaterThan(1)
  })

  it('with phaseRungLog on, every End of Phase names each rung in ladder order; bleed-out only on the hero ladder', () => {
    const ctx = battle()
    runBattle(ctx)
    const ends = phaseEnds(ctx.events as Ev[])
    expect(ends.length).toBeGreaterThan(2)
    for (const end of ends) {
      const expected = end.side === 'hero' ? ['bleedOut', 'staminaRegen', 'victoryCheck'] : ['staminaRegen', 'victoryCheck']
      // a phase end that decides the battle stops at the rung that decided it
      expect(expected.slice(0, end.rungs.length), `${end.side} ladder`).toEqual(end.rungs.map((r) => r.rung))
    }
    // what each rung does is logged under it — regen lines sit under the regen rung, and only there
    for (const end of ends) for (const r of end.rungs) {
      if (r.events.includes('stamina.regen')) expect(r.rung).toBe('staminaRegen')
      if (r.events.includes('bleedout.tick')) expect(r.rung).toBe('bleedOut')
    }
    expect(ends.some((end) => end.rungs.some((r) => r.rung === 'staminaRegen' && r.events.includes('stamina.regen')))).toBe(true)
  })

  it('reordering the ladder is a config value: the rungs run in the order given', () => {
    const ladder: EndOfPhaseRung[] = ['victoryCheck', 'staminaRegen', 'bleedOut']
    const ctx = battle(ladder)
    const out = runBattle(ctx)
    expect(out.outcome).toBeTruthy()
    const heroEnds = phaseEnds(ctx.events as Ev[]).filter((end) => end.side === 'hero' && end.rungs.length === 3)
    expect(heroEnds.length).toBeGreaterThan(0)
    for (const end of heroEnds) expect(end.rungs.map((r) => r.rung)).toEqual(ladder)
  })

  it('the default order and the explicit default order are the same battle', () => {
    const a = battle(undefined, false), b = battle(['bleedOut', 'staminaRegen', 'victoryCheck'], false)
    runBattle(a); runBattle(b)
    expect(JSON.stringify(b.events)).toBe(JSON.stringify(a.events))
  })

  it('a ladder that drops, repeats or invents a rung is refused loudly (Law 9)', () => {
    for (const bad of [['bleedOut', 'victoryCheck'], ['bleedOut', 'bleedOut', 'staminaRegen', 'victoryCheck'], ['bleedOut', 'staminaRegen', 'auras']]) {
      expect(() => runBattle(battle(bad as EndOfPhaseRung[])), JSON.stringify(bad)).toThrow(/End of Phase ladder/)
    }
  })

  it('a saved battle carries its ladder, and a restore refuses a bad one', () => {
    const ladder: EndOfPhaseRung[] = ['staminaRegen', 'bleedOut', 'victoryCheck']
    const ctx = battle(ladder)
    const saved = saveBattle(ctx)
    expect(restoreBattle(saved, ctx).cfg.switches.endOfPhaseLadder).toEqual(ladder)
    const broken = JSON.parse(saved)
    broken.cfg.switches.endOfPhaseLadder = ['staminaRegen', 'victoryCheck']
    expect(() => restoreBattle(JSON.stringify(broken), ctx)).toThrow()
  })
})
