import assert from 'node:assert/strict'
import { terrainIdOf } from '../src/content/maps.js'
import { TERRAIN, type Ctx } from '../src/core/types.js'

/** Narrow migration proof, NOT a runtime/save compatibility path. */
export function projectShorthand(ctx: Ctx, authoredTerrain: readonly number[]) {
  const cells = authoredTerrain.flatMap((t, h) => t === TERRAIN.OBSTACLE ? [h] : [])
  const expected = cells.map(h => ({ id: `prop.obstacle.${h}`, height: 'high', material: 3, footprint: { kind: 'hex', hexes: [h] } }))
  assert.deepEqual(ctx.state.props, expected, 'projection permits only exact authored x shorthand, never arbitrary props')
  const { props: _, ...state } = structuredClone(ctx.state)
  for (const h of cells) { assert.equal(state.terrain[h], TERRAIN.OPEN); state.terrain[h] = TERRAIN.OBSTACLE }
  const census = (terrain: readonly number[]) => { const out: Record<string, number> = {}; for (const t of terrain) { const id = terrainIdOf(t); out[id] = (out[id] ?? 0) + 1 } return out }
  const initialGround = authoredTerrain.map(t => t === TERRAIN.OBSTACLE ? TERRAIN.OPEN : t)
  const events = ctx.events.map(event => {
    const e = structuredClone(event)
    if (e.type === 'map.loaded') {
      assert.deepEqual(e.props, expected, 'initial prop facts must independently match authored x')
      const oldCensus = census(authoredTerrain)
      assert.deepEqual(Object.fromEntries(Object.entries(e).filter(([k]) => k.startsWith('terrain.'))), census(initialGround), 'only expected initial census may project')
      const entries: [string, unknown][] = []; let inserted = false
      for (const [k, v] of Object.entries(e)) {
        if (k === 'props') continue
        if (k.startsWith('terrain.')) { if (!inserted) { entries.push(...Object.entries(oldCensus)); inserted = true } continue }
        if (k === 'terrain') { assert.deepEqual(v, initialGround); entries.push([k, [...authoredTerrain]]) }
        else entries.push([k, v])
      }
      return Object.fromEntries(entries) as typeof e
    }
    // Truthful diagnostic correction only; every other field remains compared.
    if (e.type === 'knockback.blocked' && e.reason === 'impassable prop') e.reason = 'impassable terrain.obstacle'
    if (e.type === 'knocked' && e.stoppedBy === 'impassable prop') e.stoppedBy = 'impassable terrain.obstacle'
    return e
  })
  return { state, events }
}
