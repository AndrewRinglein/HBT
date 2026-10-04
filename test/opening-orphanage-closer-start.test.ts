// fix.opening-orphanage-closer-start (2026-10-04) — ruled 2026-10-04 (Andrew, DECISIONS.md "the opening's tutorial: the first
// hero's class line, no map before battle 1, the Orphanage's lessons, the camera shows what arrives, new enemies are named, a
// closer start"): "We need to shrink this map. First we can bring the hero forward to the end of the bridge and bring the
// zombie left, maybe 3 squares. So that conflict is much faster."
//
// Two things move and nothing else: the heroes' zone goes from the west bank (5,4) to the bridge's east end — the lone hero
// on (10,5), the deck's last hex on the house's side — and the starting Zombie from the right edge (19,3) three hexes left,
// to (16,3). The board stays 20 by 14; the civilians, the three arrivals, no retreat and the victory rule stand.
//
// "Nearest free to the zone's centre" would put a second hero in the water beside the deck — (10,4) is the next hex by id —
// so the zone NAMES its hexes, in the order heroes take them (the encounter row's `heroZone.at.hexes`, the shape a setup
// row already uses for its units): dry ground east of the bridge's end. The mechanism (core/encounter.ts heroDeployHexes)
// reads the list first and names no encounter; a zone that lists none deploys as before.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { heroDeployHexes } from '../src/core/encounter.js'
import { encounterDef, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { mapDef } from '../src/content/maps.js'
import type { EncounterDef } from '../src/core/types.js'
import { arrivals, openingBattle } from './opening-helpers.js'

const S = 'test.opening-orphanage', ID = 'encounter.opening.orphanage'
type Zone = { count: number; at: { near: { col: number; row: number }; range: number; hexes?: readonly { col: number; row: number }[] } }
const zoneOf = (id: string) => encounterDef(id).heroZone as Zone | undefined
const start = (replicate = 0) => createBattle({ ...scenarioOptions(scenarioDef(S), replicate), replicate } as Parameters<typeof createBattle>[0])
/** the map's own ground letter under a hex ('w' is water; the bridge deck is open ground) */
const letterAt = (col: number, row: number) => (mapDef('map.opening.orphanage') as unknown as { rows: readonly string[] }).rows[row]![col]!

describe('the pack: the Orphanage starts closer — the hero at the bridge\'s east end, the Zombie three hexes left', () => {
  it('the heroes\' zone is the bridge\'s east end: (10,5) first, then dry ground east of it', () => {
    const z = zoneOf(ID)!
    expect(z.at.near).toEqual({ col: 10, row: 5 })
    expect(z.at.hexes, 'the zone names its hexes, in the order heroes take them').toBeDefined()
    expect(z.at.hexes![0]).toEqual({ col: 10, row: 5 })
    expect(z.at.hexes!.length, 'a hex for every hero a battle can field').toBeGreaterThanOrEqual(6)
    expect(new Set(z.at.hexes!.map((p) => `${p.col},${p.row}`)).size, 'no hex twice').toBe(z.at.hexes!.length)
    for (const p of z.at.hexes!) {
      expect(letterAt(p.col, p.row), `(${p.col},${p.row}) is dry ground`).toBe('.')
      expect(p.col, `(${p.col},${p.row}) is at or east of the bridge's end`).toBeGreaterThanOrEqual(10)
    }
    // the deck is row 5, columns 7 to 10: (10,5) is its last hex on the house's side, water north and south of it
    expect([7, 8, 9, 10].map((c) => letterAt(c, 5))).toEqual(['.', '.', '.', '.'])
    expect([letterAt(10, 4), letterAt(10, 6), letterAt(11, 5)]).toEqual(['w', 'w', '.'])
  })

  it('the starting Zombie is on (16,3) — three hexes left of the right edge\'s (19,3)', () => {
    const zombies = encounterDef(ID).setup.filter((p) => p.unit === 'unit.zombie')
    expect(zombies.map((p) => [p.count ?? 1, p.hexes ?? [p.at]])).toEqual([[1, [{ col: 16, row: 3 }]]])
    expect(letterAt(16, 3), 'open ground').toBe('.')
  })

  it('nothing else moved: the board, the civilians, the three arrivals, no retreat, the victory rule', () => {
    const e = encounterDef(ID)
    expect(e.mapId).toBe('map.opening.orphanage')
    const m = mapDef('map.opening.orphanage') as unknown as { rows: readonly string[] }
    expect([m.rows[0]!.length, m.rows.length], 'the board stays 20 by 14').toEqual([20, 14])
    expect(e.setup.filter((p) => p.civilian).map((p) => [p.unit, p.at, !!p.objective])).toEqual([
      ['hero.fixed.orphans', { col: 12, row: 1 }, false], ['hero.fixed.school-teacher', { col: 13, row: 2 }, false]])
    expect((e.schedule ?? []).map((s) => [s.phase, s.spawn.map((u) => [u.unit, u.at])])).toEqual([
      [2, [['unit.zombie', { col: 19, row: 5 }]]], [3, [['unit.zombie', { col: 0, row: 6 }]]], [4, [['unit.zombie', { col: 9, row: 13 }]]]])
    expect(e.loseAfter, 'no turn limit').toBeUndefined()
    expect(e.win, 'clear the map').toBeUndefined()
  })
})

describe('a battle of the Orphanage with one hero', () => {
  it('begins with the hero on (10,5) and the starting Zombie on (16,3); the civilians where they were', () => {
    for (const replicate of [0, 1, 2, 3]) {
      const ctx = start(replicate), g = ctx.geo, at = (col: number, row: number) => g.hexId(col, row)
      const heroes = ctx.state.units.filter((u) => u.side === 'hero' && !u.typeId.startsWith('hero.fixed.'))
      expect(heroes.length, `replicate ${replicate}: one hero`).toBe(1)
      expect([g.colOf(heroes[0]!.hex), g.rowOf(heroes[0]!.hex)], `replicate ${replicate}: the hero`).toEqual([10, 5])
      const zombies = ctx.state.units.filter((u) => u.typeId === 'unit.zombie')
      expect(zombies.map((u) => [g.colOf(u.hex), g.rowOf(u.hex)]), `replicate ${replicate}: the Zombie`).toEqual([[16, 3]])
      expect(ctx.state.units.find((u) => u.typeId === 'hero.fixed.orphans')!.hex).toBe(at(12, 1))
      expect(ctx.state.units.find((u) => u.typeId === 'hero.fixed.school-teacher')!.hex).toBe(at(13, 2))
      // "so that conflict is much faster": the hero is 7 hexes from the Zombie now — it was 15, from the west bank's (5,4) to the right edge's (19,3)
      expect(g.distance(heroes[0]!.hex, zombies[0]!.hex), `replicate ${replicate}: the distance between them`).toBe(7)
      expect(g.distance(at(5, 4), at(19, 3)), 'the distance before').toBe(15)
    }
  })

  it('the three arrivals still come where they came: Turn 2 the right edge, Turn 3 the left edge, Turn 4 the bottom edge', () => {
    const ctx = openingBattle(S, 0, true), w = ctx.geo.board.width
    expect(arrivals(ctx).map(([t, u, h]) => [t, u, h])).toEqual([[2, 'unit.zombie', 5 * w + 19], [3, 'unit.zombie', 6 * w + 0], [4, 'unit.zombie', 13 * w + 9]])
  })
})

describe('the mechanism: a zone that names its hexes deploys on them, in the order written', () => {
  it('no hero of a larger party is ever deployed in the water: two to six heroes take the listed hexes in order', () => {
    const ctx = start(0), enc = encounterDef(ID), g = ctx.geo, z = zoneOf(ID)!
    for (let n = 1; n <= 6; n++) {
      const got = heroDeployHexes(ctx, enc, n)!
      expect(got.map((h) => ({ col: g.colOf(h), row: g.rowOf(h) })), `${n} heroes`).toEqual(z.at.hexes!.slice(0, n))
      for (const h of got) expect(letterAt(g.colOf(h), g.rowOf(h)), `${n} heroes: (${g.colOf(h)},${g.rowOf(h)}) is not water`).not.toBe('w')
    }
  })

  it('a listed hex that is taken is passed over; past the list, the nearest free hexes to the centre follow, as before', () => {
    const ctx = start(0), enc = encounterDef(ID), g = ctx.geo, z = zoneOf(ID)!
    const listed = z.at.hexes!.map((p) => g.hexId(p.col, p.row))
    const reserved = new Set([listed[1]!])
    const got = heroDeployHexes(ctx, enc, 3, reserved)!
    expect(got).toEqual([listed[0], listed[2], listed[3]])
    // a synthetic zone of two listed hexes asked for four: the two, then the ring by distance and id — never a listed one twice
    const two: EncounterDef = { ...enc, heroZone: { count: 4, at: { near: { col: 10, row: 5 }, range: 2, hexes: z.at.hexes!.slice(0, 2) } } }
    const four = heroDeployHexes(ctx, two, 4)!
    expect(four.slice(0, 2)).toEqual(listed.slice(0, 2))
    expect(new Set(four).size).toBe(4)
    const c = g.hexId(10, 5)
    for (const h of four.slice(2)) expect(g.distance(c, h)).toBeLessThanOrEqual(2)
    // a listed hex off the zone's own passable ground is refused loudly (Law 9), never skipped silently
    const bad: EncounterDef = { ...enc, heroZone: { count: 1, at: { near: { col: 10, row: 5 }, range: 2, hexes: [{ col: 0, row: 7 }] } } }
    expect(letterAt(0, 7), 'a cliff: nobody can stand there').toBe('x')
    expect(() => heroDeployHexes(ctx, bad, 1)).toThrow(/hero zone lists \(0,7\)/)
  })

  it('a zone that lists none deploys as before: nearest free to its centre, lowest id first — every other opening battle', () => {
    for (const id of ['encounter.opening.lumberjack', 'encounter.opening.bridge', 'encounter.opening.cavern-trail', 'encounter.opening.gates', 'encounter.opening.cathedral']) {
      expect(zoneOf(id)?.at.hexes, id).toBeUndefined()
    }
    const lumber = encounterDef('encounter.opening.lumberjack')
    expect(zoneOf('encounter.opening.lumberjack')!.at).toEqual({ near: { col: 5, row: 7 }, range: 2 })
    const ctx = createBattle({ ...scenarioOptions(scenarioDef('test.opening-lumberjack'), 0), replicate: 0 } as Parameters<typeof createBattle>[0]), g = ctx.geo
    const c = g.hexId(5, 7), got = heroDeployHexes(ctx, lumber, 3, new Set(ctx.state.units.map((u) => u.hex)))!
    const sorted = [...got].sort((a, b) => g.distance(c, a) - g.distance(c, b) || a - b)
    expect(got).toEqual(sorted)
  })
})
