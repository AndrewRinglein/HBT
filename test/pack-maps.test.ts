// content.pack-maps (2026-09-04) — the engine half of content.maps-as-rows
// (PROVING-PLAN Stage A2; session 9's E1). The shipping maps are rows in
// content/gen/maps.json and reach the engine through the pack; the six that
// were hand-typed in maps.ts moved there row for row (every control hash
// held); the TESTING lane stays hand-typed. `createBattle` used to say
// "unknown map 'map.proving.open'" — the whole Proving waited on this.
import { describe, expect, it } from 'vitest'
import { MAPS, MAP_PANEL, boardOf, deployOf, terrainOf } from '../src/content/maps.js'
import { packMaps } from '../src/content/pack.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { formatOf } from '../src/core/hex.js'

describe('the pack owns the shipping maps', () => {
  // map.opening-six (2026-09-28), Law 10: the count 13 was a number standing in for a rule.
  // The opening's six maps joined the pack after the thirteen (gen/opening-maps.json, appended
  // by assemble.mjs), so the rule is written out: the thirteen lead the pack in their order, the
  // pack leads the panel, and everything after the pack is the testing lane.
  it('the thirteen original pack rows lead the pack, the pack leads the panel, the testing lane follows', () => {
    const pack = packMaps().map((m) => m.id)
    expect(pack.slice(0, 13)).toEqual(['map.open', 'map.ridge', 'map.flanks', 'map.highlands', 'map.field', 'map.thicket', 'map.proving.open', 'map.proving.ridge', 'map.proving.ford', 'map.proving.copse', 'map.proving.ruin', 'map.courtyard', 'map.floodplain'])
    for (const id of pack.slice(13)) expect(id.startsWith('map.opening.'), id).toBe(true)
    expect(MAP_PANEL.slice(0, pack.length)).toEqual(pack)
    for (const id of MAP_PANEL.slice(pack.length)) expect(id.startsWith('test.map.')).toBe(true)
  })

  it('every pack row draws the board it claims, in one of the four formats, and boardOf agrees', () => {
    for (const m of packMaps()) {
      const b = boardOf(m.id)
      expect(b).toEqual({ width: m.rows[0]!.length, height: m.rows.length })
      // map.opening-six (2026-09-28), Law 10: the rule the pack compiles by (content/map-schema.mjs
      // compileMaps) — a preset label for a preset size, else WIDTHxHEIGHT — and a map's own edges
      // when it declares them, else the default. The thirteen original rows are still pinned below.
      expect(m.format).toBe(formatOf(b) ?? `${b.width}x${b.height}`)
      expect(terrainOf(m.id).length).toBe(b.width * b.height)
      expect(deployOf(m.id)).toEqual(m.deploy ?? { hero: 'west', enemy: 'east' })
      if (!m.id.startsWith('map.opening.')) { expect(formatOf(b)).toBe(m.format); expect(deployOf(m.id)).toEqual({ hero: 'west', enemy: 'east' }) }
    }
    expect(boardOf('map.proving.open')).toEqual({ width: 16, height: 8 })
    expect(boardOf('map.courtyard')).toEqual({ width: 8, height: 8 })
    expect(boardOf('map.floodplain')).toEqual({ width: 24, height: 24 })
  })

  it('the five Proving maps field a battle and run it to an outcome', () => {
    for (const id of ['map.proving.open', 'map.proving.ridge', 'map.proving.ford', 'map.proving.copse', 'map.proving.ruin']) {
      const ctx = createBattle({ replicate: 0, mapId: id, enemyCount: 6 })
      expect(ctx.state.board).toEqual({ width: 16, height: 8 })
      expect(ctx.events.find((e) => e.type === 'map.loaded')!['mapId']).toBe(id)
      expect(runBattle(ctx).outcome).not.toBeNull()
    }
  })

  it('one owner per id: no map is both a pack row and a hand-typed row', () => {
    const ids = MAPS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
