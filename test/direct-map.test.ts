import { describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { createBattle, type BattleOptions } from '../src/core/setup.js'
import { advanceBattle, runBattle } from '../src/core/battle.js'
import { executeBattleCommand } from '../src/core/commands.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { GLYPH, MAPS, MAP_PANEL, terrainOf } from '../src/content/maps.js'
import { ENCOUNTERS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

const base = { replicate: 0, heroes: ['test-warrior'], enemies: ['test-zombie'], strict: true }
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const authored = (id = 'test.map.detached', width = 4, height = 3) => ({ id, name: 'Detached TEST board', rows: Array(height).fill('.'.repeat(width)) })
const battle = (map: unknown, extra: Partial<BattleOptions> = {}) => createBattle({ ...base, ...extra, map } as BattleOptions)
const loaded = (ctx: ReturnType<typeof createBattle>) => ctx.events.find(e => e.type === 'map.loaded')!
const unique = (ctx: ReturnType<typeof createBattle>) => expect(new Set(ctx.state.units.map(u => u.hex)).size).toBe(ctx.state.units.length)

describe('production direct authored maps', () => {
  for (const [id, scenarioId] of [
    ['test.map.journey-20x10', 'test.direct-map-journey'],
    ['test.map.authored-40x40', 'test.direct-map-authored'],
  ] as const) {
    it(`${id} uses the published row directly, emits exact replay facts and runs`, () => {
      const map = copy(MAPS.find(m => m.id === id)!)
      expect(map).toBeDefined()
      const ctx = battle(map)
      expect(ctx.state.mapId).toBe(id)
      expect(ctx.state.terrain).toEqual(terrainOf(id))
      expect(ctx.state.board).toEqual({ width: map.rows[0]!.length, height: map.rows.length })
      expect(loaded(ctx).terrain).toEqual(ctx.state.terrain)
      unique(ctx)
      expect(runBattle(ctx).outcome).not.toBeNull()
      const scenario = scenarioOptions(scenarioDef(scenarioId))
      expect((scenario as any).map).toEqual(map)
      const live = createBattle(scenario)
      expect(loaded(live).terrain).toEqual(ctx.state.terrain)
      expect(runBattle(live).outcome).not.toBeNull()
    })
    it(`${id} exports direct map replay facts through the existing production CLI`, () => {
      const exported = JSON.parse(execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'tools/export-battle.mts', '--scenario', scenarioId], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }))
      const fact = exported.events.find((e: any) => e.type === 'map.loaded')
      expect(fact.terrain).toEqual(terrainOf(id))
      expect(fact.terrain.length).toBe(fact.width * fact.height)
      expect(exported.seed.map.id).toBe(id)
      expect(exported.events.at(-1).type).toBe('battle.end')
    }, 30000)
  }

  it('unknown same-ID boards remain independent, never mutate the registry, and detach caller arrays/metadata', () => {
    const registry = JSON.stringify(MAPS), panel = [...MAP_PANEL]
    const input = { ...authored(), board: { width: 4, height: 3 }, deploy: { hero: 'west', enemy: 'east' } }
    input.rows[1] = '.h..'
    const a = battle(input), saved = saveBattle(a)
    const b = battle(authored(input.id, 5, 2))
    expect(a.state.board).toEqual({ width: 4, height: 3 }); expect(b.state.board).toEqual({ width: 5, height: 2 })
    input.rows[0] = 'xxxx'; input.rows[1] = 'xxxx'; input.board.width = 1; input.deploy.hero = 'south'
    expect(saveBattle(a)).toBe(saved)
    expect(JSON.stringify(MAPS)).toBe(registry); expect(MAP_PANEL).toEqual(panel)
    const replay = JSON.parse(JSON.stringify({ seed: { mapId: a.state.mapId }, events: a.events }))
    const fact = replay.events.find((e: any) => e.type === 'map.loaded')
    expect(fact).toMatchObject({ mapId: input.id, width: 4, height: 3, terrain: [0, 0, 0, 0, 0, GLYPH.h, 0, 0, 0, 0, 0, 0] })
    a.state.terrain[0] = GLYPH.b!
    expect(fact.terrain[0]).toBe(0); expect((loaded(a).terrain as number[])[0]).toBe(0)
    expect(JSON.parse(JSON.stringify(a.events)).find((e: any) => e.type === 'map.loaded').terrain[0]).toBe(0)
  })

  it('direct input wins over a same-ID registry entry without modifying it', () => {
    const original = terrainOf('map.open')
    const ctx = battle(authored('map.open'))
    expect(ctx.state.board).toEqual({ width: 4, height: 3 })
    expect(terrainOf('map.open')).toEqual(original)
  })

  it('human command and automatic drivers resume unknown maps from the same saved activation', () => {
    const ctx = battle(authored(), { heroHexes: [0], enemyHexes: [11] })
    expect(ctx.state.mapId).toBe('test.map.detached')
    expect(ctx.state.board).toEqual({ width: 4, height: 3 })
    expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
    const restored = restoreBattle(saveBattle(ctx), ctx)
    const command = { kind: 'action', actor: 0, actionId: 'power.move', destination: 1, expectedSeq: ctx.state.seq } as const
    const policy = { humanUnitUids: [ctx.state.units[0]!.uid] }
    expect(executeBattleCommand(ctx, policy, command).ok).toBe(true)
    expect(executeBattleCommand(restored, policy, command).ok).toBe(true)
    expect(ctx.state.units[0]!.hex).toBe(1)
    expect(saveBattle(restored)).toBe(saveBattle(ctx))
    expect(runBattle(restored)).toEqual(runBattle(ctx))
    expect(saveBattle(restored)).toBe(saveBattle(ctx))
  })

  it.each([
    null, false, [], {}, { ...authored('map.open'), rows: [] }, { ...authored('map.open'), rows: [''] },
    { ...authored('map.open'), rows: ['..', '.'] }, { ...authored('map.open'), rows: [12] },
    { ...authored('map.open'), rows: ['.?'] }, { ...authored('map.open'), id: ['map.open'] },
    { ...authored('map.open'), id: ' ' }, { ...authored('map.open'), name: '' },
    { ...authored('map.open'), note: 12 }, { ...authored('map.open'), board: { width: 3, height: 4 } },
    { ...authored('map.open'), board: { width: '4', height: 3 } },
    { ...authored('map.open'), board: { width: 4, height: 3, elevation: 1 } },
    { ...authored('map.open'), format: 'standard' },
    { ...authored('map.open'), deploy: { hero: 'west', enemy: 'west' } },
    { ...authored('map.open'), deploy: { hero: 'west', enemy: 'east', depth: 2 } },
    { ...authored('map.open'), terrain: [0] }, { ...authored('map.open'), layers: [] },
    { ...authored('map.open'), edges: [] }, { ...authored('map.open'), elevation: [] },
    { ...authored('map.open'), rows: Array(101).fill('.'.repeat(100)) },
  ].map(map => ({ map })))('rejects malformed/unsupported authored data $map', ({ map }) => {
    expect(() => battle(map)).toThrow(/map/i)
  })

  it('rejects explicit map ID mismatch and encounter identity/board mismatch', () => {
    const map = copy(MAPS.find(m => m.id === 'test.map.journey-20x10')!)
    const enc = copy(ENCOUNTERS['test.encounter.journey-20x10']!)
    expect(() => battle(map, { mapId: 'map.open' })).toThrow(/map/i)
    expect(() => battle(map, { encounter: { ...enc, mapId: 'map.open' } })).toThrow(/map/i)
    expect(() => battle(map, { encounter: { ...enc, board: { width: 10, height: 20 } } })).toThrow(/map/i)
    const valid = battle(map, { mapId: map.id, encounter: enc, enemies: [] })
    expect(valid.state.board).toEqual({ width: 20, height: 10 })
  })

  it('honors every supported glyph exactly and refuses explicit positions in obstacles', () => {
    const map = { ...authored(), rows: ['.hfrR', 'wxbp.'] }
    const ctx = battle(map, { heroHexes: [0], enemyHexes: [9] })
    expect(ctx.state.terrain).toEqual(map.rows.join('').split('').map(g => g === 'x' ? 0 : GLYPH[g]))
    expect(ctx.state.props).toEqual([{ id: 'prop.obstacle.6', height: 'high', material: 3, footprint: { kind: 'hex', hexes: [6] } }])
    expect(() => battle(map, { heroHexes: [6], enemyHexes: [9] })).toThrow(/impassable/)
  })

  it('rejects prototype-backed metadata, getters and sparse rows as non-plain data', () => {
    expect(() => battle(Object.create(authored()))).toThrow(/map/)
    const getter = { ...authored(), get layers() { throw new Error('must not invoke') } }
    expect(() => battle(getter)).toThrow(/unsupported field/)
    const sparse = ['....', , '....']
    expect(() => battle({ ...authored(), rows: sparse })).toThrow(/maps: rows/)
  })

  it('bounds row count before reading any row or invoking custom iteration', () => {
    const rows: string[] = new Array(10001)
    Object.defineProperty(rows, '0', { get() { throw new Error('row getter invoked') } })
    expect(() => battle({ ...authored(), rows })).toThrow(/maps:.*dimensions/)
  })

  it('rejects custom row iterators and index getters without executing them', () => {
    const iterated = ['....', '....', '....']
    iterated[Symbol.iterator] = () => { throw new Error('iterator invoked') }
    expect(() => battle({ ...authored(), rows: iterated })).toThrow(/maps:.*rows/)
    const getters = ['....', '....', '....']
    Object.defineProperty(getters, '1', { get() { throw new Error('row getter invoked') } })
    expect(() => battle({ ...authored(), rows: getters })).toThrow(/maps:.*rows/)
  })

  it.each(['test.map.journey-20x10', 'test.map.authored-40x40'])('disabling %s only removes its dependent direct scenario', mapId => {
    const removed = mapId.includes('journey') ? 'test.direct-map-journey' : 'test.direct-map-authored'
    const script = `import { SCENARIOS, scenarioDef, scenarioOptions } from './src/content/scenarios.ts'; import { createBattle } from './src/core/setup.ts'; import { runBattle } from './src/core/battle.ts'; if (SCENARIOS[${JSON.stringify(removed)}]) throw new Error('dependent scenario still present'); const ctx = createBattle(scenarioOptions(scenarioDef('test.authored-slots'))); runBattle(ctx); console.log(ctx.events.at(-1).type)`
    const run = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', '-e', script], { encoding: 'utf8', env: { ...process.env, CF_DISABLE_IDS: mapId } })
    expect(run.status, 'unrelated scenario process must complete').toBe(0)
    expect(run.stdout.trim()).toBe('battle.end')
  }, 30000)

  it('direct encounter board references and setup arrivals are detached and retain nearest-free shunting', () => {
    const map = { ...authored(), board: { width: 4, height: 3 } }
    const encounter = { id: 'test.encounter.direct', name: 'Direct TEST', mapId: map.id, board: map.board, setup: [{ unit: 'unit.zombie', at: { col: 0, row: 0 } }], schedule: [] }
    const ctx = battle(map, { encounter, heroHexes: [0], enemies: [] })
    unique(ctx)
    expect(ctx.events.some(e => e.type === 'unit.shunted')).toBe(true)
    const snapshot = saveBattle(ctx)
    map.board.width = 2; encounter.setup[0]!.at.col = 2
    expect(saveBattle(ctx)).toBe(snapshot)
  })

  it.each([
    { terrain: [] }, { terrain: null }, { terrain: [0] },
    { terrain: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1] },
    { terrain: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5] },
    { terrain: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '0'] },
    { width: 3, height: 4 }, { width: '4' }, { mapId: 'test.map.other' }, { causeId: 'test.map.other' },
  ])('rejects corrupted saved direct-map replay facts %j', patch => {
    const ctx = battle(authored())
    const saved = JSON.parse(saveBattle(ctx))
    Object.assign(saved.events.find((e: any) => e.type === 'map.loaded'), patch)
    expect(() => restoreBattle(JSON.stringify(saved), ctx)).toThrow(/map|terrain/)
  })

  it('restores initial replay terrain even after live terrain has changed', () => {
    const ctx = battle(authored())
    ctx.state.terrain[0] = GLYPH.b!
    const restored = restoreBattle(saveBattle(ctx), ctx)
    expect(restored.state.terrain[0]).toBe(GLYPH.b)
    expect((loaded(restored).terrain as number[])[0]).toBe(GLYPH['.'])
    expect(saveBattle(restored)).toBe(saveBattle(ctx))
  })
})

describe('mixed and tiny-map initial deployment', () => {
  it('zone deployment excludes an explicit enemy and preserves the actual zone before rolling enemies', () => {
    const encounter = { id: 'test.encounter.zone', name: 'Zone TEST', setup: [], schedule: [], heroZone: { count: 1, at: { near: { col: 0, row: 0 }, range: 1 } } }
    const explicit = createBattle({ ...base, encounter, enemyHexes: [0] })
    expect(explicit.state.units[1]!.hex).toBe(0); unique(explicit)
    expect(explicit.geo.distance(0, explicit.state.units[0]!.hex)).toBe(1)
    const rolledHex = createBattle(base).state.units[1]!.hex
    const centered = { ...encounter, heroZone: { count: 1, at: { near: { col: rolledHex % 16, row: Math.floor(rolledHex / 16) }, range: 0 } } }
    const rolled = createBattle({ ...base, encounter: centered })
    expect(rolled.state.units[0]!.hex).toBe(rolledHex); unique(rolled)
  })

  it('a valid zone does not require an unused passable hero edge', () => {
    const map = { ...authored(), rows: ['x...', 'x...', 'x...'] }
    const encounter = { id: 'test.encounter.zone', name: 'Zone TEST', setup: [], schedule: [], heroZone: { count: 1, at: { near: { col: 1, row: 1 }, range: 0 } } }
    const ctx = battle(map, { encounter })
    expect(ctx.state.units[0]!.hex).toBe(5); unique(ctx)
  })
  it('reserves an explicit enemy before rolling heroes', () => {
    const first = createBattle(base).state.units[0]!.hex
    const ctx = createBattle({ ...base, enemyHexes: [first] })
    expect(ctx.state.units[1]!.hex).toBe(first); unique(ctx)
  })
  it('reserves an explicit hero before rolling enemies', () => {
    const first = createBattle(base).state.units[1]!.hex
    const ctx = createBattle({ ...base, heroHexes: [first] })
    expect(ctx.state.units[0]!.hex).toBe(first); unique(ctx)
  })
  it('two opposing edge rolls on a one-column map use different hexes', () => {
    const ctx = battle(authored('test.map.tiny', 1, 2))
    expect(ctx.state.board).toEqual({ width: 1, height: 2 }); unique(ctx)
    expect(ctx.state.units.map(u => u.hex).sort()).toEqual([0, 1])
  })
  it('spilling enemies skip occupied lines and fail loudly when the board is full', () => {
    const map = authored('test.map.tiny', 3, 2)
    const ctx = battle(map, { enemies: Array(5).fill('test-zombie') })
    unique(ctx); expect(ctx.state.units.length).toBe(6)
    expect(() => battle(map, { enemies: Array(6).fill('test-zombie') })).toThrow(/cannot hold/)
    expect(() => battle(authored('test.map.tiny', 1, 1))).toThrow(/cannot hold|passable/)
  })
  it('keeps physically blocked enemy-edge rejection while spilling past an occupied edge', () => {
    expect(() => battle({ ...authored(), rows: ['...x', '...x', '...x'] })).toThrow(/no passable hex on its east edge/)
    expect(() => battle({ ...authored(), rows: ['.x.', '.x.'] }, { heroHexes: [0], enemies: Array(3).fill('test-zombie') })).toThrow(/cannot hold/)
    const occupied = battle(authored('test.map.tiny', 2, 2), { heroes: ['test-warrior', 'test-warrior'], heroHexes: [1, 3], enemies: ['test-zombie', 'test-zombie'] })
    unique(occupied)
    expect(occupied.state.units.slice(2).map(u => u.hex).sort()).toEqual([0, 2])
  })
})
