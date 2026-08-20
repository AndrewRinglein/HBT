// The Proving Ground — TESTING-LANE board that exercises every ground mechanic
// at once: river washes on the west, an ember band and a blight belt both
// sides must cross, hills for the modifiers. Exists so ONE replay can show
// every landed mechanic (Angela 2026-08-20).
import { describe, expect, it } from 'vitest'
import { MAPS, MAP_PANEL, terrainOf } from '../src/content/maps.js'
import { TERRAIN } from '../src/core/types.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

describe('the board', () => {
  it('parses, sits on the panel, and carries all four ground mechanics', () => {
    expect(MAPS.some((m) => m.id === 'test.map.showcase')).toBe(true)
    expect(MAP_PANEL).toContain('test.map.showcase')
    const t = terrainOf('test.map.showcase')
    expect(t.filter((x) => x === TERRAIN.WATER).length).toBeGreaterThan(10)
    expect(t.filter((x) => x === TERRAIN.BURNING).length).toBe(8)
    expect(t.filter((x) => x === TERRAIN.POISONED).length).toBe(8)
    expect(t.filter((x) => x === TERRAIN.HILLS).length).toBe(4)
    // both deployment rows are fully open — nobody spawns in a hazard
    expect(t.slice(0, 12).every((x) => x === TERRAIN.OPEN)).toBe(true)
    expect(t.slice(132).every((x) => x === TERRAIN.OPEN)).toBe(true)
  })

  it('battles on it produce ember applies, blight applies AND river washes', () => {
    let ember = 0, blight = 0, wash = 0
    for (let r = 0; r < 10; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 12, mapId: 'test.map.showcase' })
      runBattle(ctx)
      for (const e of ctx.events) {
        if (e.type === 'status.applied' && e.causeId === 'terrain.burning') ember++
        if (e.type === 'status.applied' && e.causeId === 'terrain.poisoned') blight++
        if (e.type === 'status.reduced' && e.causeId === 'terrain.water') wash++
      }
    }
    expect(ember).toBeGreaterThan(0)
    expect(blight).toBeGreaterThan(0)
    expect(wash).toBeGreaterThan(0)
  })
})
