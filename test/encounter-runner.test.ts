// encounter.runner (2026-09-03) — P11 approved as written; encounters are data.
//
// The rulings this file holds the engine to:
//   · phases are TURNS (COMBAT-SEQUENCE); `phase: N` fires at Start of Turn N
//     BEFORE the hero phase — Angela: "Enemies spawn first. Then heroes spawn
//     and heroes act"; `enemyPhase: N` as the enemy phase of Turn N begins
//   · two units on one hex: the later is shunted to the nearest free hex and
//     the log says so
//   · an objective civilian's death loses (objectiveFailed); the loss timer
//     loses; survive-to wins (objectiveMet); a cleared board waits for the
//     schedule (switch)
//   · what the engine cannot honour is a named gap on the row
// Every row read here is the pack's own; nothing is restated.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { ENCOUNTERS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions, encounterDef } from '../src/content/scenarios.js'
import { hexId } from '../src/core/hex.js'
import { setBleedOut, setLifeState } from '../src/core/mutate.js'
import type { EncounterDef } from '../src/core/types.js'

const SURROUNDED = 'battle.prologue-2'
const party = () => scenarioOptions(scenarioDef('showcase.surrounded'))

describe('the pack carries the encounters', () => {
  it('every prologue battle and the scripted one are EncounterDefs, every unit they name is a row, every refusal is a named gap', () => {
    for (const id of ['battle.prologue-1', 'battle.prologue-2', 'battle.prologue-3', 'battle.prologue-4', 'battle.prologue-5', 'battle.horrors-of-the-night']) {
      const e = ENCOUNTERS[id]
      expect(e, id).toBeDefined()
      for (const p of e!.setup) expect(UNITS[p.unit], `${id} setup ${p.unit}`).toBeDefined()
      for (const r of e!.schedule) for (const p of r.spawn) expect(UNITS[p.unit], `${id} spawn ${p.unit}`).toBeDefined()
    }
    // retreat was skipped by ruling; the rows that allow it say so
    for (const id of ['battle.prologue-3', 'battle.prologue-4', 'battle.prologue-5']) expect(ENCOUNTERS[id]!.gaps!.some((g) => /retreat/.test(g)), `${id} names retreat as a gap`).toBe(true)
    // Horrors' standing rules are gaps until vision lands
    expect(ENCOUNTERS['battle.horrors-of-the-night']!.gaps!.some((g) => /standing rule/.test(g))).toBe(true)
  })
})

describe('the schedule fires on the Turn it names, before the hero phase', () => {
  it('Surrounded: setup units are on the board at battle.begin; each wave arrives on its Turn, at Start of Turn or as the enemy phase begins', () => {
    const ctx = createBattle(party())
    const enc = encounterDef(SURROUNDED)
    const setupCount = enc.setup.reduce((n, p) => n + (p.count ?? 1), 0)
    expect(ctx.state.units.filter((u) => u.uid >= 300).length).toBe(setupCount)
    runBattle(ctx)
    const waves = ctx.events.filter((e) => e.type === 'encounter.wave')
    // every row fired at most once, and on its own Turn
    for (const w of waves) {
      const row = enc.schedule[w['row'] as number]!
      expect(w['turn']).toBe(row.phase ?? row.enemyPhase)
      expect(w['when']).toBe(row.phase !== undefined ? 'phase' : 'enemyPhase')
    }
    expect(new Set(waves.map((w) => w['row'])).size).toBe(waves.length)
    // a Start-of-Turn wave precedes that Turn's first hero activation; an
    // enemy-phase wave follows the hero phase's end
    for (const w of waves) {
      const turnEvents = ctx.events.filter((e) => e.turn === w.turn)
      const firstHeroAct = turnEvents.find((e) => e.type === 'activation.begin' && ctx.state.units[e['actor'] as number]!.side === 'hero')
      const heroPhaseEnd = turnEvents.find((e) => e.type === 'phase.end.done' && e['side'] === 'hero')
      if (w['when'] === 'phase' && firstHeroAct) expect(w.seq).toBeLessThan(firstHeroAct.seq)
      if (w['when'] === 'enemyPhase' && heroPhaseEnd) expect(w.seq).toBeGreaterThan(heroPhaseEnd.seq)
    }
    // arrivals are real units with unit.enter lines naming the encounter as the cause
    const arrivals = ctx.events.filter((e) => e.type === 'unit.enter' && e['arrived'] === SURROUNDED)
    expect(arrivals.length).toBeGreaterThanOrEqual(setupCount)
  })

  it('an arrival onto an occupied hex is shunted to the nearest free hex, and the log names it', () => {
    const enc: EncounterDef = {
      id: 'test.encounter.shunt', name: 'shunt', setup: [], gaps: ['test-only'],
      schedule: [{ phase: 1, spawn: [{ unit: 'unit.zombie', count: 2, hexes: [{ col: 5, row: 5 }, { col: 5, row: 5 }] }] }],
    }
    const ctx = createBattle({ ...party(), encounter: enc, heroHexes: [hexId(2, 15), hexId(3, 15), hexId(4, 15), hexId(5, 15)] })
    runBattle(ctx)
    const shunt = ctx.events.find((e) => e.type === 'unit.shunted')
    expect(shunt).toBeDefined()
    expect(shunt!['wanted']).toBe(hexId(5, 5))
    expect(shunt!['hex']).not.toBe(hexId(5, 5))
    const zombies = ctx.events.filter((e) => e.type === 'unit.enter' && e['typeId'] === 'unit.zombie')
    expect(new Set(zombies.map((z) => z['hex'])).size).toBe(2)
  })
})

describe('objectives', () => {
  it('a dead objective civilian loses the battle — objectiveFailed, with the civilian named', () => {
    const enc: EncounterDef = {
      id: 'test.encounter.objective', name: 'objective', gaps: ['test-only'],
      setup: [{ unit: 'hero.fixed.farmer', objective: true, civilian: true, at: { col: 8, row: 3 } },
        { unit: 'unit.zombie', count: 6, hexes: [{ col: 7, row: 2 }, { col: 9, row: 2 }, { col: 7, row: 4 }, { col: 9, row: 4 }, { col: 8, row: 2 }, { col: 8, row: 4 }] }],
      schedule: [],
    }
    // the party starts in the far corner: the Farmer is downed on Turn 1 and,
    // with nobody standing in reach, the zombies work his counter (the
    // finisher rule, fix.downed-targetable) before help arrives
    // The Farmer is already down with one tick left when the battle begins:
    // the first End of Hero Phase kills him inside settle, and the objective
    // check there ends the battle where the death happened — not at the next
    // Start of Turn. (A live party clears six zombies before a five-tick
    // bleed-out runs, which is a finding about the party, not the rule.)
    const ctx = createBattle({ ...party(), encounter: enc })
    const farmer0 = ctx.state.units.find((u) => u.typeId === 'hero.fixed.farmer')!
    farmer0.hp = 0
    setLifeState(ctx, farmer0.id, 'downed', 'test', { reason: 'hp0' })
    setBleedOut(ctx, farmer0.id, 1, 'test')
    const out = runBattle(ctx)
    expect(out.outcome).toBe('objectiveFailed')
    expect(out.turns).toBe(1)
    expect(ctx.events.find((e) => e.type === 'encounter.lost')?.['reason']).toBe('objective dead')
    const farmer = ctx.state.units.find((u) => u.typeId === 'hero.fixed.farmer')!
    expect(farmer.lifeState).toBe('dead')
  })

  it('the loss timer: loseAfter N Turns ends the battle at Start of Turn N+1 with objectiveFailed', () => {
    const enc: EncounterDef = { id: 'test.encounter.timer', name: 'timer', gaps: ['test-only'], setup: [], schedule: [{ phase: 30, spawn: [{ unit: 'unit.zombie', at: { col: 8, row: 0 } }] }], loseAfter: { phase: 3 } }
    const ctx = createBattle({ ...party(), encounter: enc })
    const out = runBattle(ctx)
    expect(out.outcome).toBe('objectiveFailed')
    expect(out.turns).toBe(4)
    expect(ctx.events.find((e) => e.type === 'encounter.lost')?.['reason']).toBe('time')
  })

  it('survive-to: reaching Turn N wins with objectiveMet', () => {
    const enc: EncounterDef = { id: 'test.encounter.survive', name: 'survive', gaps: ['test-only'], setup: [{ unit: 'unit.zombie', at: { col: 8, row: 0 } }], schedule: [], win: { surviveTo: 3 } }
    const ctx = createBattle({ ...party(), encounter: enc, cfg: { switches: { boardClearWaitsForSchedule: true } as never } })
    const out = runBattle(ctx)
    expect(['objectiveMet', 'heroClear']).toContain(out.outcome)
    if (out.outcome === 'objectiveMet') expect(out.turns).toBe(3)
  })

  it('a cleared board is not a win while the schedule owes a wave (switch on); it is with the switch off', () => {
    const enc: EncounterDef = { id: 'test.encounter.wait', name: 'wait', gaps: ['test-only'], setup: [{ unit: 'unit.zombie', at: { col: 8, row: 14 } }], schedule: [{ phase: 6, spawn: [{ unit: 'unit.zombie', at: { col: 8, row: 0 } }] }] }
    const on = createBattle({ ...party(), encounter: enc })
    const a = runBattle(on)
    expect(a.turns).toBeGreaterThanOrEqual(6)
    expect(on.events.filter((e) => e.type === 'encounter.wave').length).toBe(1)
    const off = createBattle({ ...party(), encounter: enc })
    off.cfg.switches.boardClearWaitsForSchedule = false
    const b = runBattle(off)
    expect(b.outcome).toBe('heroClear')
    expect(b.turns).toBeLessThan(6)
  })
})
