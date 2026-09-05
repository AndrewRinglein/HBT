// proving.side-override (2026-09-04). Ruled 2026-09-03 (DECISIONS.md "the
// Proving"): "I also want to be able to do enemies against enemies and heroes
// against heroes. So we can actually test four zombies against four zombies,
// and what we're testing is: what does initiative matter? And then we can
// swap in one elf in place of a zombie." createBattle refused a row fielded
// on the other side (checkSides); `sides: 'byList'` lets the list decide.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from './board16.js'

describe('the list decides the side', () => {
  it('byRow (the default) still refuses a zombie among the heroes', () => {
    expect(() => createBattle({ replicate: 0, mapId: 'map.open', heroes: ['unit.zombie'], heroHexes: [hexId(0, 5)], enemies: ['unit.zombie'], enemyHexes: [hexId(15, 5)], enemyCount: 1 }))
      .toThrow(/fielded as a hero but its row declares side 'enemy'/)
  })

  it('byList fields four Codex zombies as heroes against four as enemies, and unit.enter names the row side they left', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['showcase.mirror-zombies']!))
    const heroes = ctx.state.units.filter((u) => u.side === 'hero'), enemies = ctx.state.units.filter((u) => u.side === 'enemy')
    expect(heroes.length).toBe(4)
    expect(enemies.length).toBe(4)
    for (const u of heroes) expect(u.typeId).toBe('unit.zombie')
    expect(UNITS['unit.zombie']!.side).toBe('enemy')
    const enters = ctx.events.filter((e) => e.type === 'unit.enter')
    expect(enters.filter((e) => e['side'] === 'hero').every((e) => e['rowSide'] === 'enemy')).toBe(true)
    expect(enters.filter((e) => e['side'] === 'enemy').every((e) => e['rowSide'] === undefined)).toBe(true)
  })

  it('a hero among the enemies works the same way round, and the battle runs to an outcome', () => {
    const ctx = createBattle({ replicate: 0, mapId: 'map.open', sides: 'byList', heroes: ['unit.zombie', 'unit.zombie'], heroHexes: [hexId(0, 5), hexId(0, 6)], enemies: ['test-warrior', 'unit.zombie'], enemyHexes: [hexId(15, 5), hexId(15, 6)], enemyCount: 2 })
    const w = ctx.state.units.find((u) => u.typeId === 'test-warrior')!
    expect(w.side).toBe('enemy')
    const res = runBattle(ctx)
    expect(['heroClear', 'wipe', 'capped']).toContain(res.outcome)
  })

  it('an overridden unit follows the FIELDED side\'s rules (mirrorSideRules: fielded) — a zombie among the heroes rolls Deathbed Fighting; one among the enemies just dies', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['showcase.mirror-zombies']!))
    runBattle(ctx)
    const heroIds = new Set(ctx.state.units.filter((u) => u.side === 'hero').map((u) => u.id))
    const rolls = ctx.events.filter((e) => e.type === 'deathbed.stood' || e.type === 'deathbed.fell')
    expect(rolls.length).toBeGreaterThan(0)
    for (const e of rolls) expect(heroIds.has(e['target'] as number)).toBe(true)
    // the enemy-side zombies never rolled: every one that died went straight to dead
    for (const e of ctx.events.filter((e) => e.type === 'life.dead' && !heroIds.has(e['target'] as number))) expect(e['reason']).toBe('hp0')
  })

  it('mirror — the initiative question is measurable: twenty seeds, four zombies each way, both sides win some', () => {
    let hero = 0, enemy = 0
    for (let r = 0; r < 20; r++) {
      const res = runBattle(createBattle({ ...scenarioOptions(SCENARIOS['showcase.mirror-zombies']!), replicate: r }))
      if (res.outcome === 'heroClear') hero++; else if (res.outcome === 'wipe') enemy++
    }
    expect(hero + enemy).toBe(20)
    expect(hero).toBeGreaterThan(0)
    expect(enemy).toBeGreaterThan(0)
  })
})
