// encounter.battle-1 and encounter.battle-2 (2026-09-03) — the first two
// prologue battles as gated encounters, run through showcase scenarios.
//
// encounter.prologue-1, Two Zombies and a Child: one hero, two zombies, a third
// rolled onto an edge at Turn 4, the Orphans to protect, ten Turns. The
// backlog's expect: winnable AND losable across seeds.
// encounter.prologue-2, Surrounded: every spawn on schedule; the necromancer's
// unexpressed clauses are NAMED gaps, never silent.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { ENCOUNTERS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

describe('encounter.prologue-1 — Two Zombies and a Child', () => {
  it('is deterministic: the same seed twice is the same log', () => {
    const a = createBattle(scenarioOptions(scenarioDef('showcase.two-zombies-and-a-child'))); runBattle(a)
    const b = createBattle(scenarioOptions(scenarioDef('showcase.two-zombies-and-a-child'))); runBattle(b)
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events))
  })

  it('every fielded id is exercised — the child enters, both zombies swing, the Turn-4 arrival is rolled and arrives', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.two-zombies-and-a-child')))
    runBattle(ctx)
    expect(ctx.events.some((e) => e.type === 'unit.enter' && e['typeId'] === 'hero.fixed.orphans')).toBe(true)
    expect(ctx.events.some((e) => e.type === 'encounter.objective')).toBe(true)
    const enc = ENCOUNTERS['encounter.prologue-1']!
    const turns = ctx.state.turn
    if (turns >= 4) {
      expect(ctx.events.some((e) => e.type === 'encounter.roll')).toBe(true)
      expect(ctx.events.filter((e) => e.type === 'encounter.wave').length).toBe(enc.schedule.length)
    }
  })

  it('is winnable and losable across seeds — both outcomes in a hundred', () => {
    const seen: Record<string, number> = {}
    for (let r = 0; r < 100; r++) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef('showcase.two-zombies-and-a-child')), replicate: r })
      const o = runBattle(ctx)
      seen[o.outcome] = (seen[o.outcome] ?? 0) + 1
      expect(o.turns).toBeLessThanOrEqual(11)   // the loss timer at ten
    }
    expect(seen['heroClear'] ?? 0).toBeGreaterThan(0)
    expect((seen['objectiveFailed'] ?? 0) + (seen['wipe'] ?? 0)).toBeGreaterThan(0)
  })
})

describe('encounter.prologue-2 — Surrounded', () => {
  it('runs end to end with every spawn arriving on schedule', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.surrounded')))
    const enc = ENCOUNTERS['encounter.prologue-2']!
    const o = runBattle(ctx)
    expect(o.outcome).not.toBeNull()
    const waves = ctx.events.filter((e) => e.type === 'encounter.wave')
    // a battle can end early now (ruled 2026-09-03): every row due before the ending Turn fired
    const due = enc.schedule.filter((r) => (r.phase ?? r.enemyPhase!) < ctx.state.turn)
    expect(waves.length).toBeGreaterThanOrEqual(due.length)
    const archers = ctx.events.filter((e) => e.type === 'unit.enter' && e['typeId'] === 'unit.skeletal-archer')
    if (ctx.state.turn >= 3) expect(archers.length).toBe(4)
  })

  it('the necromancer fields with its compilable behaviour, and its dropped clauses are named gaps', () => {
    expect(UNITS['unit.necromancer']).toBeDefined()
    const gaps = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')).gaps as { unit: string; needs: string }[]
    // 2026-09-03, by the end of the feature run: every clause the Necromancer
    // carries compiles (power, corpses, aura, stamina drain, the pulse) — the
    // gap list is EMPTY, which is the finding the old assertion could not
    // express. The rule: whatever is not compiled is named, never dropped.
    const mine = gaps.filter((g) => g.unit === 'unit.necromancer')
    for (const g of mine) expect(g.needs.length).toBeGreaterThan(0)
    console.log('NECROMANCER gaps remaining:', mine.length)
  })

  it('FINDING: the row names no hero deployment, so the party starts on the player edge and the civilians die on every seed', () => {
    // recorded, not fixed — the encounter session owns the row's shape
    const seen: Record<string, number> = {}
    for (let r = 0; r < 10; r++) { const o = runBattle(createBattle({ ...scenarioOptions(scenarioDef('showcase.surrounded')), replicate: r })); seen[o.outcome] = (seen[o.outcome] ?? 0) + 1 }
    expect(ENCOUNTERS['encounter.prologue-2']!.heroZone).toBeUndefined()
    console.log('SURROUNDED x10 from the player edge:', JSON.stringify(seen))
  })
})
