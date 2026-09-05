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
  it('thirteen pack rows are on the panel, before the testing lane, in pack order', () => {
    const pack = packMaps().map((m) => m.id)
    expect(pack.length).toBe(13)
    expect(MAP_PANEL.slice(0, 13)).toEqual(pack)
    expect(pack).toEqual(expect.arrayContaining(['map.open', 'map.ridge', 'map.flanks', 'map.highlands', 'map.field', 'map.thicket', 'map.proving.open', 'map.proving.ridge', 'map.proving.ford', 'map.proving.copse', 'map.proving.ruin', 'map.courtyard', 'map.floodplain']))
    for (const id of MAP_PANEL.slice(13)) expect(id.startsWith('test.map.')).toBe(true)
  })

  it('every pack row draws the board it claims, in one of the four formats, and boardOf agrees', () => {
    for (const m of packMaps()) {
      const b = boardOf(m.id)
      expect(b).toEqual({ width: m.rows[0]!.length, height: m.rows.length })
      expect(formatOf(b)).toBe(m.format)
      expect(terrainOf(m.id).length).toBe(b.width * b.height)
      expect(deployOf(m.id)).toEqual({ hero: 'west', enemy: 'east' })
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
