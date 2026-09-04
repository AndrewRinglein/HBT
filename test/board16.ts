// The standard 16×16 board, bound — a TEST convenience (board.variable-size,
// 2026-09-04). The engine has no default board: hex.ts exports only
// `geometryOf(board)`, and every rule reads `ctx.geo`. Tests that hand-place
// units on the standard board import the bound functions from here, so a
// literal like hexId(3, 15) keeps meaning what it meant when 16×16 was the
// only board. Nothing under src/ may import this file.
import { FORMATS, geometryOf } from '../src/core/hex.js'

export const BOARD16 = FORMATS.standard
export const GEO16 = geometryOf(BOARD16)
export const WIDTH = BOARD16.width
export const HEIGHT = BOARD16.height
export const HEX_COUNT = GEO16.hexCount
export const hexId = GEO16.hexId
export const colOf = GEO16.colOf
export const rowOf = GEO16.rowOf
export const inBounds = GEO16.inBounds
export const neighbours = GEO16.neighbours
export const neighboursOf = GEO16.neighboursOf
export const distance = GEO16.distance
export const stepAwayFrom = GEO16.stepAwayFrom
export const isAdjacent = GEO16.isAdjacent
export type { HexId } from '../src/core/hex.js'
