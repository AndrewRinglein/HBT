import { describe, it, expect } from 'vitest'
import {
  hexId, colOf, rowOf, distance, neighboursOf, neighbours,
  isAdjacent, WIDTH, HEIGHT, HEX_COUNT,
} from './board16.js'

describe('hex geometry', () => {
  it('round-trips id <-> col/row', () => {
    for (let r = 0; r < HEIGHT; r++)
      for (let c = 0; c < WIDTH; c++) {
        const h = hexId(c, r)
        expect(colOf(h)).toBe(c)
        expect(rowOf(h)).toBe(r)
      }
  })

  it('distance to self is 0, and is symmetric', () => {
    for (let h = 0; h < HEX_COUNT; h++) expect(distance(h, h)).toBe(0)
    for (let a = 0; a < HEX_COUNT; a += 7)
      for (let b = 0; b < HEX_COUNT; b += 5)
        expect(distance(a, b)).toBe(distance(b, a))
  })

  it('every neighbour is at distance 1, and only neighbours are', () => {
    for (let h = 0; h < HEX_COUNT; h++) {
      const n = neighboursOf(h)
      for (const x of n) expect(distance(h, x)).toBe(1)
      let count = 0
      for (let x = 0; x < HEX_COUNT; x++) if (distance(h, x) === 1) count++
      expect(n.length).toBe(count)
    }
  })

  it('interior hexes have 6 neighbours, corners fewer', () => {
    expect(neighboursOf(hexId(5, 5)).length).toBe(6)
    expect(neighboursOf(hexId(0, 0)).length).toBeLessThan(6)
    expect(neighboursOf(hexId(WIDTH - 1, HEIGHT - 1)).length).toBeLessThan(6)
  })

  it('adjacency is symmetric', () => {
    for (let h = 0; h < HEX_COUNT; h++)
      for (const n of neighboursOf(h)) expect(neighboursOf(n)).toContain(h)
  })

  it('neighbours come back sorted — Law 6', () => {
    for (let h = 0; h < HEX_COUNT; h++) {
      const n = neighbours(h)
      expect([...n].sort((a, b) => a - b)).toEqual(n)
    }
  })

  it('distance obeys the triangle inequality', () => {
    for (let a = 0; a < HEX_COUNT; a += 11)
      for (let b = 0; b < HEX_COUNT; b += 13)
        for (let c = 0; c < HEX_COUNT; c += 17)
          expect(distance(a, c)).toBeLessThanOrEqual(distance(a, b) + distance(b, c))
  })

  it('isAdjacent agrees with the neighbour table', () => {
    for (let h = 0; h < HEX_COUNT; h += 3)
      for (let x = 0; x < HEX_COUNT; x += 3)
        expect(isAdjacent(h, x)).toBe(neighboursOf(h).includes(x))
  })

  it('the top and bottom rows are ~11 apart, as the spec assumes', () => {
    expect(distance(hexId(6, 0), hexId(6, 11))).toBe(11)
  })
})

// board.variable-size (2026-09-04): the same properties on every ruled
// format. Ids are row × width + col PER BOARD, so a geometry is only ever
// asked about hexes on its own board — and two boards never share one.
import { FORMATS, formatOf, geometryOf } from '../src/core/hex.js'

describe('hex geometry on every format', () => {
  for (const [name, board] of Object.entries(FORMATS)) {
    const g = geometryOf(board)
    it(`${name} ${board.width}×${board.height}: ids round-trip, neighbours are the distance-1 set, sorted, symmetric`, () => {
      expect(g.hexCount).toBe(board.width * board.height)
      for (let r = 0; r < board.height; r++) for (let c = 0; c < board.width; c++) {
        const h = g.hexId(c, r)
        expect(g.colOf(h)).toBe(c)
        expect(g.rowOf(h)).toBe(r)
        expect(g.inBounds(c, r)).toBe(true)
      }
      expect(g.inBounds(board.width, 0)).toBe(false)
      expect(g.inBounds(0, board.height)).toBe(false)
      for (let h = 0; h < g.hexCount; h++) {
        const n = g.neighboursOf(h)
        expect([...n].sort((a, b) => a - b)).toEqual([...n])
        expect(n.length).toBeGreaterThanOrEqual(2)
        expect(n.length).toBeLessThanOrEqual(6)
        for (const x of n) { expect(g.distance(h, x)).toBe(1); expect(g.neighboursOf(x)).toContain(h) }
        let count = 0
        for (let x = 0; x < g.hexCount; x++) if (g.distance(h, x) === 1) count++
        expect(n.length).toBe(count)
      }
    })
    it(`${name}: a row-end hex never neighbours the next row's start — the wrap that a wrong width would produce`, () => {
      for (let r = 0; r + 1 < board.height; r++) {
        const end = g.hexId(board.width - 1, r), start = g.hexId(0, r + 1)
        // adjacent only if the geometry says so; on odd-r offset the right end of an
        // even row and the left start of the next are never adjacent
        if (!(r & 1)) expect(g.neighboursOf(end)).not.toContain(start)
      }
    })
  }

  it('the same board gives the same geometry object; a different board never does (the memo is keyed by the whole input)', () => {
    expect(geometryOf({ width: 16, height: 8 })).toBe(geometryOf({ width: 16, height: 8 }))
    expect(geometryOf(FORMATS.dungeon)).not.toBe(geometryOf(FORMATS.standard))
    // hex 20 is (4,1) on a 16-wide board and (4,2) on an 8-wide one — the per-width formula
    expect(geometryOf(FORMATS.standard).rowOf(20)).toBe(1)
    expect(geometryOf(FORMATS.duel).rowOf(20)).toBe(2)
    expect(geometryOf(FORMATS.duel).neighboursOf(20)).not.toEqual(geometryOf(FORMATS.standard).neighboursOf(20))
  })

  it('formatOf names the four and refuses a fifth', () => {
    expect(formatOf({ width: 8, height: 8 })).toBe('duel')
    expect(formatOf({ width: 16, height: 8 })).toBe('dungeon')
    expect(formatOf({ width: 16, height: 16 })).toBe('standard')
    expect(formatOf({ width: 24, height: 24 })).toBe('horde')
    expect(formatOf({ width: 8, height: 16 })).toBeNull()
    expect(formatOf({ width: 12, height: 12 })).toBeNull()
  })
})
