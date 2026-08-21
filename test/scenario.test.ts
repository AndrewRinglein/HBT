// Scenarios — named fieldings (PLAYBACK-DESIGN §6.2).
//
// The point of the item, stated as a test: ids that NO standard battle can
// produce must appear in a scenario's log. Measured before this landed — across
// 640 battles on all 8 maps at two army sizes, the whole flight ladder and all
// four beast attacks fired zero times, because their only grantors are benched.
import { describe, expect, it } from 'vitest'
import { SCENARIOS, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { UNITS } from '../src/content/index.js'
import { terrainOf, isPassable } from '../src/content/maps.js'

const BEASTS = 'showcase.beasts'

describe('the scenario registry', () => {
  it('is an explicit registry — an unknown id throws and names what exists', () => {
    expect(() => scenarioDef('showcase.nonexistent')).toThrow(/unknown scenario/)
    expect(() => scenarioDef('showcase.nonexistent')).toThrow(/known ids/)
  })

  it('NO scenario may carry stat overrides — the constraint, not a convention', () => {
    // Ruled: a scenario names units and positions; statistics belong to sweeps.
    // A showcase that can change numbers is a showcase that can lie about the
    // game. Asserted over every row so a future scenario cannot smuggle one in.
    for (const [id, s] of Object.entries(SCENARIOS)) {
      expect(Object.keys(s), `${id} must not carry overrides`).not.toContain('overrides')
      expect(Object.keys(s), `${id} must not carry stats`).not.toContain('stats')
    }
  })

  it('every scenario names real units, on their own declared side', () => {
    for (const [id, s] of Object.entries(SCENARIOS)) {
      for (const t of s.heroes) expect(UNITS[t]?.side, `${id}: ${t}`).toBe('hero')
      for (const t of s.enemies) expect(UNITS[t]?.side, `${id}: ${t}`).toBe('enemy')
    }
  })

  it('every scenario names one passable in-range hex per unit', () => {
    for (const [id, s] of Object.entries(SCENARIOS)) {
      const terrain = terrainOf(s.mapId)
      expect(s.heroHexes.length, `${id} heroes`).toBe(s.heroes.length)
      expect(s.enemyHexes.length, `${id} enemies`).toBe(s.enemies.length)
      const all = [...s.heroHexes, ...s.enemyHexes]
      expect(new Set(all).size, `${id}: two units on one hex`).toBe(all.length)
      for (const h of all) {
        expect(h, `${id}: hex ${h} off board`).toBeLessThan(terrain.length)
        expect(isPassable(terrain[h] ?? 0), `${id}: hex ${h} impassable`).toBe(true)
      }
    }
  })

  it('enemyCount is derived from the roster, never a second number that can disagree', () => {
    const o = scenarioOptions(scenarioDef(BEASTS))
    expect(o.enemyCount).toBe(o.enemies.length)
  })
})

describe('fielding a scenario', () => {
  it('places exactly the named units on exactly the named hexes', () => {
    const s = scenarioDef(BEASTS)
    const ctx = createBattle(scenarioOptions(s))
    const heroes = ctx.state.units.filter((u) => u.side === 'hero')
    const enemies = ctx.state.units.filter((u) => u.side === 'enemy')
    expect(heroes.map((u) => u.typeId)).toEqual([...s.heroes])
    expect(enemies.map((u) => u.typeId)).toEqual([...s.enemies])
    expect(heroes.map((u) => u.hex)).toEqual([...s.heroHexes])
    expect(enemies.map((u) => u.hex)).toEqual([...s.enemyHexes])
  })

  it('shows what no standard battle can: the flight ladder runs', () => {
    // THE WHOLE REASON THIS ITEM EXISTS. power.flight's only grantor is the
    // Green Drake, which is benched — so before scenarios, movement.flight had
    // landed without ever running in a real fight.
    const ctx = createBattle(scenarioOptions(scenarioDef(BEASTS)))
    runBattle(ctx)
    const flew = ctx.events.filter((e) => e.causeId === 'power.flight')
    expect(flew.length, 'the drake never flew').toBeGreaterThan(0)
    expect(flew.some((e) => e.type === 'moved'), 'flight logged no movement').toBe(true)
  })

  it('fields the benched beasts — all three appear as real units', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef(BEASTS)))
    runBattle(ctx)
    const entered = new Set(ctx.events.filter((e) => e.type === 'unit.enter').map((e) => e['typeId']))
    for (const t of ['spirit-snake', 'green-drake', 'shadow-hound-puppy']) {
      expect(entered, `${t} was not fielded`).toContain(t)
    }
  })

  it('the LOG names the fielding, not just the export envelope', () => {
    // The replay is built from the event log alone (PLAYBACK-DESIGN §1, seam 1),
    // so a scenario recorded only in `seed` is invisible to it — and gate 1
    // could not probe a scenario at all. Law 12: every line names its cause.
    const ctx = createBattle(scenarioOptions(scenarioDef(BEASTS)))
    const loaded = ctx.events.find((e) => e.type === 'map.loaded')!
    expect(loaded['scenarioId']).toBe(BEASTS)
  })

  it('a standard battle carries NO scenarioId — the field appears only when earned', () => {
    // Conditional on purpose: an always-present key would change map.loaded for
    // every battle ever exported and move the control baselines.
    const ctx = createBattle({ replicate: 0, enemyCount: 4, mapId: 'map.thicket' })
    const loaded = ctx.events.find((e) => e.type === 'map.loaded')!
    expect(loaded).not.toHaveProperty('scenarioId')
  })

  it('is still a seed — the same scenario twice is the same battle', () => {
    const run = () => {
      const ctx = createBattle(scenarioOptions(scenarioDef(BEASTS)))
      const r = runBattle(ctx)
      return `${r.outcome}:${r.turns}:${ctx.events.length}`
    }
    expect(run()).toBe(run())
  })
})

describe('positions are validated at load, loudly (Law 9)', () => {
  // Nothing checked these before 2026-08-21: opts.heroHexes went straight into
  // makeUnit, so a fielding inside a wall produced a battle that ran and looked
  // fine. Each failure must name the unit and the hex.
  const base = () => scenarioOptions(scenarioDef(BEASTS))

  it('an impassable hex throws and says what terrain it is', () => {
    const terrain = terrainOf('map.thicket')
    const blocked = terrain.findIndex((t) => !isPassable(t))
    expect(blocked, 'map.thicket has no impassable hex to test with').toBeGreaterThan(-1)
    expect(() => createBattle({ ...base(), heroHexes: [blocked, 80] }))
      .toThrow(/impassable/)
  })

  it('an off-board hex throws', () => {
    expect(() => createBattle({ ...base(), heroHexes: [99999, 80] })).toThrow(/off a \d+-hex board/)
  })

  it('two units on one hex throws, naming both', () => {
    expect(() => createBattle({ ...base(), heroHexes: [79, 79] })).toThrow(/both placed on hex 79/)
  })

  it('a hex count that does not match the roster throws', () => {
    expect(() => createBattle({ ...base(), heroHexes: [79] })).toThrow(/must correspond/)
  })

  it('a unit fielded on the wrong side throws instead of silently switching', () => {
    // makeUnit reads def.side, so this used to produce an enemy without a word.
    // PLAYBACK-DESIGN §6.2's own example scenario would have hit exactly this.
    expect(() => createBattle({ ...base(), heroes: ['shadow-hound-puppy', 'green-drake'] }))
      .toThrow(/declares side 'enemy'/)
  })

  it('an unknown typeId throws and points at the registry', () => {
    expect(() => createBattle({ ...base(), heroes: ['no-such-beast', 'green-drake'] }))
      .toThrow(/unknown unit typeId/)
  })

  it('the error names the scenario when there is one', () => {
    expect(() => createBattle({ ...base(), heroHexes: [79, 79] })).toThrow(/showcase\.beasts/)
  })
})

describe('the standard battle is untouched', () => {
  it('a positional battle still rolls its own deployment and is unchanged', () => {
    const a = createBattle({ replicate: 3, enemyCount: 8, mapId: 'map.thicket', strict: true })
    const b = createBattle({ replicate: 3, enemyCount: 8, mapId: 'map.thicket', strict: true })
    runBattle(a); runBattle(b)
    expect(a.events.length).toBe(b.events.length)
    expect(a.state.outcome).toBe(b.state.outcome)
    // No scenario, so no scenario id leaks into the run.
    expect(a.events.some((e) => JSON.stringify(e).includes('showcase.'))).toBe(false)
  })
})
