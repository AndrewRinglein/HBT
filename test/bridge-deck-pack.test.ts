// content.bridge-deck-pack (2026-10-01) — the Bridge's deck into the engine pack. Ruled 2026-09-30 (DECISIONS.md 'the
// Bridge's northern branch is walkable; the deck hexes marked X are deck'); the source grid (content/gen/opening-maps.json,
// generated from the root ground proposal) already carried it. The pipeline ships it: the engine's map.opening.bridge has
// open ground where the source does, a unit can stand on the northern branch, and battle 3 still ends on every seed.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MAPS } from '../src/content/maps.js'
import { createBattle } from '../src/core/setup.js'
import { passableHexes } from '../src/core/props.js'
import { openingBattle } from './opening-helpers.js'

const source = JSON.parse(readFileSync(new URL('../../content/gen/opening-maps.json', import.meta.url), 'utf8')) as { maps: { id: string; rows: string[] }[] }
const W = 40
// the deck hexes the rebuilt Bridge opened (row, col): the northern branch's four, and three on the southern crossing
const OPENED: [number, number][] = [[7, 23], [7, 29], [7, 30], [7, 32], [11, 28], [13, 23], [14, 18]]

describe('the Bridge deck in the pack', () => {
  it('the engine map is the source grid, row for row, with open ground on the deck', () => {
    const engine = MAPS.find((m) => m.id === 'map.opening.bridge')!
    const grid = source.maps.find((m) => m.id === 'map.opening.bridge')!.rows
    expect(engine.rows).toEqual(grid)
    for (const [r, c] of OPENED) expect(engine.rows[r]![c], `(${c},${r})`).toBe('.')
  })

  it('a unit can stand on the northern branch: the deck hexes are passable and a hero is fielded there', () => {
    const at = OPENED.slice(0, 4).map(([r, c]) => r * W + c)
    const ctx = createBattle({ replicate: 0, mapId: 'map.opening.bridge', heroes: ['test-warrior'], heroHexes: [at[0]!], enemies: ['test-zombie'], enemyHexes: [7 * W + 36], enemyCount: 1, strict: true })
    const open = passableHexes(ctx)
    for (const h of at) expect(open(h), `hex ${h}`).toBe(true)
    expect(ctx.state.units[0]!.hex).toBe(at[0])
  })

  it('battle 3 reaches a win or a loss on all 100 seeds — never the turn cap', () => {
    for (let r = 0; r < 100; r++) {
      const ctx = openingBattle('test.opening-bridge', r)
      expect(['heroClear', 'wipe'], `replicate ${r}: ${ctx.state.outcome} on Turn ${ctx.state.turn}`).toContain(ctx.state.outcome)
    }
  }, 120000)
})
