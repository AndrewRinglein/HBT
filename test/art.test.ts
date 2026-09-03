// The kingdom art on the page — what tools/prep-art.py prepared agrees with
// the Territory rows and with USE-THIS-ART.md's geometry, and the page's
// mapping from state to picture is the ruled one (band = level; a building
// shows in the town once its Territory is held).
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { TERRITORIES } from '../src/content/territories.js'
import { bandOf, townBuildings, slugOf } from '../src/ui/art.js'
import { loadFixture } from './walk.js'

const tileIdOf = (q: number, r: number) => `t_${q < 0 ? 'm' : 'p'}${String(Math.abs(q)).padStart(2, '0')}_${r < 0 ? 'm' : 'p'}${String(Math.abs(r)).padStart(2, '0')}`

describe('the kingdom art', () => {
  const index = existsSync('generated/art/index.json') ? JSON.parse(readFileSync('generated/art/index.json', 'utf8')) : null
  it('generated/art/ exists and every Territory row has its tile prepared', () => {
    expect(index).not.toBeNull()
    for (const t of TERRITORIES) {
      const tile = index.tiles[tileIdOf(t.hex.q, t.hex.r)]
      expect(tile, `${t.id} at (${t.hex.q}, ${t.hex.r})`).toBeDefined()
      expect(existsSync(`generated/art/${tile.file}`)).toBe(true)
    }
  })
  it('the hex geometry is the handoff\'s, scaled: 512×768 canvas, top vertex 250, sides 382…642, bottom 766, row step 388', () => {
    const s = index.hex.scale
    expect(index.hex.tileW).toBeCloseTo(512 * s, 1)
    expect(index.hex.tileH).toBeCloseTo(768 * s, 1)
    expect(index.hex.topVertex).toBeCloseTo(250 * s, 1)
    expect(index.hex.sides).toEqual([expect.closeTo(382 * s, 1), expect.closeTo(642 * s, 1)])
    expect(index.hex.bottomVertex).toBeCloseTo(766 * s, 1)
    expect(index.hex.rowStep).toBeCloseTo(388 * s, 1)
    expect(index.overlaySeat).toBeCloseTo(42 * s, 1)
    // the map crop holds every tile, with its headroom
    for (const tile of Object.values<{ px: [number, number] }>(index.tiles)) {
      const cx = tile.px[0] * s - index.map.originX, cy = tile.px[1] * s - index.map.originY
      expect(cx - index.hex.tileW / 2).toBeGreaterThanOrEqual(0); expect(cx + index.hex.tileW / 2).toBeLessThanOrEqual(index.map.w)
      expect(cy - index.hex.tileH / 2).toBeGreaterThanOrEqual(0); expect(cy + index.hex.tileH / 2).toBeLessThanOrEqual(index.map.h)
    }
  })
  it('every building the rows can stand on a Territory has an overlay that fits inside a hex, and a lot with five bands in the town (the Memorial excepted)', () => {
    const slugs = new Set(TERRITORIES.flatMap((t) => t.buildings.map((b) => slugOf(b.id))))
    expect(slugs.size).toBeGreaterThan(0)
    for (const slug of slugs) {
      const o = index.overlays[slug]
      expect(o, slug).toBeDefined()
      expect(o.w).toBeLessThanOrEqual(index.hex.tileW)
      const lot = index.town.lots[slug]
      expect(lot, slug).toBeDefined()
      expect(lot.bands.length).toBe(5)
      expect(index.interiors[slug]).toBeDefined()
      expect(index.cards[slug]).toBeDefined()
    }
  })
  it('band is the level, never the nodes: a ruin or level 0 is ruined; 1 working … 4+ ascendant', () => {
    expect(bandOf({ level: 0, damaged: true })).toBe(0)
    expect(bandOf({ level: 3, damaged: true })).toBe(0)
    expect(bandOf({ level: 0, damaged: false })).toBe(0)
    expect(bandOf({ level: 1, damaged: false })).toBe(1)
    expect(bandOf({ level: 4, damaged: false })).toBe(4)
    expect(bandOf({ level: 9, damaged: false })).toBe(4)
  })
  it('the town shows the Sanctuary\'s buildings, and a Territory\'s only once it is held', () => {
    const ctx = loadFixture()
    const ridge = Object.values(ctx.campaign.territories).find((t) => t.buildings.some((b) => b.id === 'building.forge'))!
    // (the Sanctuary's own buildings: the Chapel and, since G7, the Waystation)
    ridge.owned = false
    expect(townBuildings(ctx.campaign).map((b) => b.slug).sort()).toEqual(['chapel', 'waystation'])
    ridge.owned = true
    expect(townBuildings(ctx.campaign).map((b) => b.slug).sort()).toEqual(['chapel', 'forge', 'waystation'])
    expect(townBuildings(ctx.campaign).find((b) => b.slug === 'forge')!.band).toBe(0)   // a ruin until repaired
  })
})
