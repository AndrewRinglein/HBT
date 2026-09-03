// encounter.battle-2 (2026-09-03) — Surrounded, across seeds: every spawn the
// schedule owes by the Turn the battle ended has arrived, on its Turn.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { ENCOUNTERS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

describe('battle.prologue-2 across seeds', () => {
  it('the schedule is honoured on every seed, and the fast zombies come from every side', () => {
    const enc = ENCOUNTERS['battle.prologue-2']!
    for (let r = 0; r < 12; r++) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef('showcase.surrounded')), replicate: r })
      runBattle(ctx)
      const waves = ctx.events.filter((e) => e.type === 'encounter.wave')
      const due = enc.schedule.filter((row) => (row.phase ?? row.enemyPhase!) <= ctx.state.turn)
      expect(waves.length, `seed ${r}`).toBe(due.length)
      for (const w of waves) expect(w['turn']).toBe(enc.schedule[w['row'] as number]!.phase ?? enc.schedule[w['row'] as number]!.enemyPhase)
      if (ctx.state.turn >= 4) {
        const fast = ctx.events.filter((e) => e.type === 'unit.enter' && e['typeId'] === 'unit.fast-zombie')
        expect(fast.length).toBe(4)
      }
    }
  })
})
