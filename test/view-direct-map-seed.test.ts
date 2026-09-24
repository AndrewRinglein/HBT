// fix.view-direct-map-seed — V2 R7 follow-up, found wiring the viewer half of prop
// destruction: a scenario whose seed carries a direct authored map row (test.prop-destroy,
// test.cover-crates …) exports `seed.map` as that row, not an id. The view door read it as
// an id and refused ("seed: invalid map"), so no such battle could be drawn. The row names
// itself by `id`; the exact initial facts are the map.loaded event's own (direct maps
// always carry their terrain there), never a registry field.
import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { initialMapId, prepareBattleField } from '../src/view/field.js'

describe('a scenario seed carrying its direct map row', () => {
  it('test.prop-destroy: the exported seed prepares the field from map.loaded, props and all', () => {
    const seed = JSON.parse(JSON.stringify(scenarioOptions(SCENARIOS['test.prop-destroy']!)))
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.prop-destroy']!))
    const events = JSON.parse(JSON.stringify(ctx.events))
    expect(initialMapId(seed)).toBe('test.map.prop-destroy')
    const { field } = prepareBattleField(events, seed)
    expect(field.props).toEqual(ctx.state.props)
    expect(field.props.map((p) => p.id)).toEqual(['prop.test.barrels', 'prop.test.stone-wall'])
  })
  it('the row must name itself, and agree with mapId', () => {
    expect(initialMapId({ map: { id: 'test.map.x', rows: ['..'] } })).toBe('test.map.x')
    expect(() => initialMapId({ map: { rows: ['..'] } })).toThrow(/invalid map/)
    expect(() => initialMapId({ map: { id: '' } })).toThrow(/invalid map/)
    expect(() => initialMapId({ mapId: 'test.map.y', map: { id: 'test.map.x' } })).toThrow(/conflicting/)
    expect(() => initialMapId({ map: Object.defineProperty({}, 'id', { get: () => 'test.map.x', enumerable: true }) })).toThrow(/accessors/)
  })
  it('the two id envelopes are unchanged', () => {
    expect(initialMapId({ mapId: 'map.open' })).toBe('map.open')
    expect(initialMapId({ map: 'map.open' })).toBe('map.open')
    expect(() => initialMapId({ map: 7 })).toThrow(/invalid map/)
  })
})
