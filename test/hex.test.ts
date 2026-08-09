import { describe, it, expect } from 'vitest'
import {
  hexId, colOf, rowOf, distance, neighboursOf, neighbours,
  isAdjacent, WIDTH, HEIGHT, HEX_COUNT,
} from '../src/core/hex.js'

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
