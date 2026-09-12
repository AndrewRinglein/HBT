import { describe, it, expect } from 'vitest'
import { buildSync } from 'esbuild'
import { createBattle } from '../src/core/setup.js'
import { prepareBattleField } from '../src/view/field.js'

describe('readonly runtime metadata', () => {
  it('emitted field helper excludes registry, catalog and gameplay modules', () => {
    const result = buildSync({ entryPoints: ['src/view/field.ts'], bundle: true, write: false,
      format: 'esm', platform: 'browser', metafile: true })
    const emitted = Object.values(result.metafile!.outputs).flatMap(o => Object.entries(o.inputs)
      .filter(([,v]) => v.bytesInOutput > 0).map(([path]) => path.replaceAll('\\', '/')))
    expect(emitted).toContain('src/view/field.ts')
    expect(emitted.filter(p => /content\/(?:generated\/|pack\.|maps\.|index\.|statuses\.|moves\.)|core\/(?:mutate|trigger|status|pipeline|movement|battle|setup|rng)\./.test(p))).toEqual([])
  })
  for (const mapId of ['test.map.high-prop-single', 'test.map.high-prop-multi']) it(`prepares published ${mapId} through the runtime leaf`, () => {
    const ctx = createBattle({ replicate: 1, mapId, heroes: ['alpha-lucius'], enemies: ['unit.fire-imp'] })
    const loaded = ctx.events.find(e => e.type === 'map.loaded')!
    const events = ctx.events.map(e => e === loaded ? { ...e, terrain: [...ctx.state.terrain] } : e)
    const before = JSON.stringify(events)
    const prepared = prepareBattleField(events, { mapId })
    expect(prepared.field.props).toEqual(ctx.state.props)
    expect(prepared.field.props.length).toBeGreaterThan(0)
    expect(prepared.field.terrainIds.length).toBe(ctx.state.board.width * ctx.state.board.height)
    expect(JSON.stringify(events)).toBe(before)
  })
})
