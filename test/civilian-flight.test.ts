// Ruled 2026-09-03 (Angela, after watching Supper seed 5): "in this battle
// specifically, the civilians should have a flight mindset for the first
// three turns." An AI mode `flee` and an encounter field `civilianAi` that
// stands in for every civilian's own AI until that Turn ends.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { ENCOUNTERS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { distance } from './board16.js'

describe('the civilians flee, then fight', () => {
  it('Supper carries civilianAi flee until Turn 3; every civilian runs flee on Turns 1–3 and its own mode after', () => {
    expect(ENCOUNTERS['encounter.supper']!.civilianAi).toEqual({ mode: 'flee', untilTurn: 3 })
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.supper')))
    const civs = ctx.state.units.filter((u) => u.tags.includes('civilian'))
    expect(civs.length).toBe(10)
    for (const c of civs) expect(c.aiOverride).toEqual({ mode: 'flee', untilTurn: 3 })
    runBattle(ctx)
    const modes = ctx.events.filter((e) => e.type === 'ai.mode' && civs.some((c) => c.id === e['actor']))
    expect(modes.some((m) => m.turn <= 3)).toBe(true)
    for (const m of modes) {
      if (m.turn <= 3) expect(m['mode'], `turn ${m.turn}`).toBe('flee')
      else expect(m['mode'], `turn ${m.turn}`).not.toBe('flee')
    }
    // a fleeing civilian never attacks
    for (const e of ctx.events) if (e.type === 'attack.declared' && e.turn <= 3) expect(civs.some((c) => c.id === e['actor'])).toBe(false)
  })

  it('flee moves away: a civilian adjacent to a zombie at Turn 1 ends its first move farther from the nearest enemy, or stands if boxed', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.supper')))
    const civs = ctx.state.units.filter((u) => u.tags.includes('civilian'))
    const before = new Map(civs.map((c) => [c.id, Math.min(...ctx.state.units.filter((u) => u.side === 'enemy').map((z) => distance(c.hex, z.hex)))]))
    runBattle(ctx)
    let moved = 0
    for (const e of ctx.events) {
      if (e.type !== 'move.begin' || e.turn !== 1 || !civs.some((c) => c.id === e['actor'])) continue
      moved++
      const zombiesAtStart = ctx.events.filter((x) => x.type === 'unit.enter' && x['side'] === 'enemy' && x.seq < e.seq).map((x) => x['hex'] as number)
      const dFrom = Math.min(...zombiesAtStart.map((h) => distance(e['from'] as number, h)))
      const dTo = Math.min(...zombiesAtStart.map((h) => distance(e['to'] as number, h)))
      expect(dTo, `civilian ${e['actor']}`).toBeGreaterThan(dFrom)
      void before
    }
    expect(moved).toBeGreaterThan(0)
  })
})
