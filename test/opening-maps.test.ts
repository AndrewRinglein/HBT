// map.opening-six (2026-09-28): the opening's six battle maps, each at its own size
// (DECISIONS.md 2026-09-28 "the opening's maps: whole size, the painted gate, ground types by
// letter"). Compiled from the per-hex ground letters Andrew checked on the Abbotown Ground Check
// (assets/battle-atlas/opening-ground-proposal-2026-09-28.json) by content/mkopeningmaps.mjs, and
// shipped like every other map row through the pack. What each letter becomes is named there:
// F and X the engine's high `x` shorthand, c a LOW prop (low cover), ~ water with no floor (the V2
// floor mask: nobody stands in it or paths through it), * open ground the encounter paints.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { reachable, pathTo, stepCost } from '../src/core/movement.js'
import { passableFor } from '../src/core/structure.js'
import { hasLowCover } from '../src/core/cover.js'
import { TERRAIN } from '../src/core/types.js'
import { boardOf, mapDef, moveCostOf, takesEntry, MAP_PANEL } from '../src/content/maps.js'

// The sizes are the ruling's (DECISIONS.md 2026-09-28): the Gates is 20 wide and 50 long,
// walked south to north ("50x20" in the ruling is the same map).
const SIX: Record<string, { width: number; height: number }> = {
  'map.opening.orphanage': { width: 20, height: 14 },
  'map.opening.lumberjack': { width: 20, height: 14 },
  'map.opening.bridge': { width: 40, height: 20 },
  'map.opening.cavern-trail': { width: 40, height: 16 },
  'map.opening.gates': { width: 20, height: 50 },
  'map.opening.cathedral': { width: 20, height: 40 },
}

describe('map.opening-six — the opening\'s six maps', () => {
  it.each(Object.entries(SIX))('%s is on the map panel and fields a real battle at its stated size, run to an outcome', (mapId, size) => {
    expect(MAP_PANEL).toContain(mapId)
    expect(boardOf(mapId)).toEqual(size)
    const ctx = createBattle({ replicate: 0, mapId, enemyCount: 4, strict: true })
    expect(ctx.state.board).toEqual(size)
    const loaded = ctx.events.find((e) => e.type === 'map.loaded')!
    expect([loaded['mapId'], loaded['width'], loaded['height']]).toEqual([mapId, size.width, size.height])
    runBattle(ctx)
    expect(ctx.state.outcome).not.toBeNull()
    expect(ctx.state.outcome).not.toBe('capped')
  }, 60_000)

  it.each(Object.keys(SIX))('%s: every hex a unit may stand on reaches every other — no cut-off pocket (flood fill)', (mapId) => {
    const ctx = createBattle({ replicate: 0, mapId, enemyCount: 4, strict: true })
    const hero = ctx.state.units.find((u) => u.side === 'hero')!
    const passable = passableFor(ctx, hero)
    // No door or stairs is authored on these maps (the letter grid has no letter for one), so a
    // house or wall hex is never stood on; a tower is entered from any side.
    expect(ctx.state.entries).toBeUndefined()
    const n = ctx.state.terrain.length
    const node = (h: number) => passable(h) && !takesEntry(ctx.state.terrain[h]!)
    const nodes = Array.from({ length: n }, (_, h) => h).filter(node)
    expect(nodes.length).toBeGreaterThan(n / 3)
    const seen = new Set([nodes[0]!]), stack = [nodes[0]!]
    while (stack.length) {
      const h = stack.pop()!
      for (const m of ctx.geo.neighboursOf(h)) if (!seen.has(m) && node(m) && passable(m, h)) { seen.add(m); stack.push(m) }
    }
    expect(nodes.filter((h) => !seen.has(h))).toEqual([])
  })

  it('deep water (~): no unit may stand in it, and a path to the far bank is found around the river', () => {
    const ctx = createBattle({ replicate: 0, mapId: 'map.opening.bridge', enemyCount: 4, strict: true })
    const W = 40, hex = (c: number, r: number) => r * W + c
    const floor = ctx.state.floor!
    const deep = floor.flatMap((f, h) => (f ? [] : [h]))
    expect(deep.length).toBeGreaterThan(300)
    const hero = ctx.state.units.find((u) => u.side === 'hero')!
    const passable = passableFor(ctx, hero)
    for (const h of deep) {
      expect(ctx.state.terrain[h]).toBe(TERRAIN.WATER) // it is water — deep, not a wall
      expect(passable(h)).toBe(false)
    }
    // Straight east across row 10 is river; the walk goes round by the deck.
    const from = hex(2, 10), to = hex(37, 16)
    expect(deep).toContain(hex(20, 10))
    hero.hex = from
    for (const u of ctx.state.units) if (u !== hero) u.lifeState = 'dead' // an empty board: only the ground decides
    hero.movePointsLeft = 500
    const reach = reachable(ctx, hero)
    expect(reach.has(to)).toBe(true)
    const path = pathTo(reach, from, to)
    expect(path.every((h) => floor[h] === true)).toBe(true)
    expect(path.length).toBeGreaterThan(35)
  })

  it('a riverbank boulder (c) gives low cover to the hex beside it, across the line through it, and not away from it', () => {
    const ctx = createBattle({ replicate: 0, mapId: 'map.opening.orphanage', enemyCount: 4, strict: true })
    const W = 20, hex = (c: number, r: number) => r * W + c
    const boulder = ctx.state.props.find((p) => p.id === `prop.cover.${hex(10, 3)}`)!
    expect(boulder.height).toBe('low')
    expect(ctx.state.terrain[hex(9, 3)]).toBe(TERRAIN.WATER) // on the bank of the river
    expect(hasLowCover(ctx, hex(5, 3), hex(11, 3))).toBe(true)   // shot across the boulder
    expect(hasLowCover(ctx, hex(15, 3), hex(9, 3))).toBe(true)   // and from the other side
    expect(hasLowCover(ctx, hex(15, 3), hex(11, 3))).toBe(false) // the boulder is behind the target
  })

  it('the Orphanage river is ordinary water: it costs what terrain.water costs, and a unit may stand in it', () => {
    const ctx = createBattle({ replicate: 0, mapId: 'map.opening.orphanage', enemyCount: 4, strict: true })
    const W = 20, hex = (c: number, r: number) => r * W + c
    const river = hex(9, 4)
    expect(ctx.state.terrain[river]).toBe(TERRAIN.WATER)
    expect(ctx.state.floor).toBeUndefined()
    expect(stepCost(ctx, river)).toBe(moveCostOf(TERRAIN.WATER))
    expect(passableFor(ctx, ctx.state.units[0]!)(river)).toBe(true)
  })

  it('the Gates is 20 wide and 50 long, and the maps walked south to north deploy heroes south', () => {
    expect(boardOf('map.opening.gates')).toEqual({ width: 20, height: 50 })
    for (const id of ['map.opening.gates', 'map.opening.cathedral']) expect(mapDef(id).deploy).toEqual({ hero: 'south', enemy: 'north' })
  })
})
