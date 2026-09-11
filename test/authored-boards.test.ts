import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createBattle } from '../src/core/setup.js'
import { advanceBattle, runBattle } from '../src/core/battle.js'
import { executeAction } from '../src/core/commands.js'
import { geometryOf, type Board } from '../src/core/hex.js'
import { packMaps, packEncounters } from '../src/content/pack.js'
import { ENCOUNTERS, UNITS } from '../src/content/index.js'
import { UNIT_PACK } from '../src/content/generated/pack.js'
import { boardOf, MAP_PANEL } from '../src/content/maps.js'
import { saveBattle, restoreBattle } from '../src/core/snapshot.js'

const cases = [
  ['test.map.journey-20x10', { width: 20, height: 10 }],
  ['test.map.authored-40x40', { width: 40, height: 40 }],
] as const
function load(row: unknown) {
  const pack = UNIT_PACK as unknown as Record<string, unknown>, previous = pack.maps
  try { pack.maps = { 'map.validation': row }; return packMaps() }
  finally { pack.maps = previous }
}
const row = () => ({ id: 'map.validation', name: 'Validation', rows: Array(10).fill('.'.repeat(20)), board: { width: 20, height: 10 }, format: '20x10' })
describe('authored board boundaries', () => {
  it('pack loader accepts a rectangular authored size without a preset label', () => {
    expect(load(row())[0]!.board).toEqual({ width: 20, height: 10 })
  })
  it.each([[], [''], [null], [1], [{ length: 20 }], ['..', '.'], ['..', 12]].map(rows => ({ rows })))('rejects malformed rows $rows', ({ rows }) => {
    expect(() => load({ ...row(), rows })).toThrow()
  })
  it.each([{ width: 10001, height: 1 }, { width: 101, height: 100 }, { width: 0, height: 1 }, { width: 1.5, height: 2 }, { width: Infinity, height: 1 }])('geometry rejects bounded invalid dimensions %j before building', board => {
    expect(() => geometryOf(board)).toThrow(/board|dimension|cell/i)
  })
  it('geometry validates before cache lookup, preventing string dimensions aliasing a cached board', () => {
    geometryOf({ width: 16, height: 16 })
    expect(() => geometryOf({ width: '16', height: 16 } as unknown as Board)).toThrow()
  })
  it('accepts exactly10000 cells and rejects unsafe dimensions without huge allocation', () => {
    expect(geometryOf({ width: 100, height: 100 }).hexCount).toBe(10000)
    expect(() => geometryOf({ width: Number.MAX_SAFE_INTEGER, height: 2 })).toThrow()
    expect(() => geometryOf({ width: 2 ** 53, height: 1 })).toThrow()
  })
  it('rejects an otherwise coherent oversized snapshot at the board boundary', () => {
    const ctx = createBattle({ replicate: 0, enemyCount: 1 })
    const snapshot = JSON.parse(saveBattle(ctx))
    snapshot.state.board = { width: 101, height: 100 }
    snapshot.state.terrain = Array(10100).fill(0)
    if (snapshot.state.layers) snapshot.state.layers = Array(10100).fill(0)
    expect(() => restoreBattle(JSON.stringify(snapshot), ctx)).toThrow(/board/i)
  })
  it.each([null, { width: 10001, height: 1 }, { width: 16.5, height: 16 }, { width: 2 ** 53, height: 2 }])('rejects invalid encounter board metadata %j', board => {
    const encounter = { id: 'test.encounter.invalid-board', name: 'Invalid board', board, setup: [], schedule: [] } as any
    expect(() => packEncounters(UNITS, { [encounter.id]: encounter })).toThrow(/board/)
    expect(() => createBattle({ replicate: 0, encounter })).toThrow(/board/)
  })
  it.each([
    { board: { width: 10, height: 20 } }, { board: null }, { board: { width: 2 ** 53, height: 1 } },
    { format: 'dungeon' }, { format: '' }, { format: null },
    { deploy: { hero: 'west', enemy: 'west' } }, { deploy: { hero: 'top', enemy: 'east' } },
    { deploy: { hero: 'west' } }, { deploy: null },
  ])('rejects contradictory or malformed metadata %j', patch => {
    // Use a known-size row to expose invalid metadata independent of preset rejection.
    expect(() => load({ ...row(), rows: Array(16).fill('.'.repeat(16)), board: { width: 16, height: 16 }, format: 'standard', ...patch })).toThrow()
  })
  for (const [mapId, board] of cases) {
    it(`${mapId} publishes its encounter dimensions and boundary placement`, () => {
      const encounter = ENCOUNTERS[mapId.replace('test.map.', 'test.encounter.')]
      expect(encounter).toBeDefined(); expect(encounter!.board).toEqual(board)
      const ctx = createBattle({ replicate: 0, encounter: encounter!, heroes: ['test-warrior'], strict: true })
      expect(ctx.state.units.find(u => u.side === 'enemy')!.hex).toBe(board.width * board.height - 1)
      expect(ctx.state.board).toEqual(board)
      const restored = restoreBattle(saveBattle(ctx), ctx)
      expect(runBattle(restored)).toEqual(runBattle(ctx))
      expect(saveBattle(restored)).toBe(saveBattle(ctx))
      expect(() => createBattle({ replicate: 0, mapId: 'map.open', encounter: encounter!, heroes: ['test-warrior'] })).toThrow(/board differs/)
    })
    it(`${mapId} fields authored dimensions, boundary steps and saved continuation`, () => {
      expect(MAP_PANEL).toContain(mapId)
      expect(boardOf(mapId)).toEqual(board)
      const ctx = createBattle({ replicate: 0, mapId, heroes: ['test-warrior'], enemies: ['test-zombie'], strict: true })
      const u = ctx.state.units[0]!, e = ctx.state.units[1]!
      expect(ctx.geo.colOf(u.hex)).toBe(0); expect(ctx.geo.colOf(e.hex)).toBe(board.width - 1)
      expect(new Set(ctx.state.units.map(u => u.hex)).size).toBe(2)
      expect(ctx.events.find(e => e.type === 'map.loaded')).toMatchObject(board)
      const end = board.width * board.height - 1
      expect(ctx.geo.neighboursOf(end)).toContain(end - 1)
      expect(ctx.geo.neighboursOf(board.width - 1)).not.toContain(board.width)
      expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
      const destination = u.hex + 1
      expect(executeAction(ctx, { actor: 0, actionId: 'power.move', destination }).ok).toBe(true)
      expect(u.hex).toBe(destination)
      const restored = restoreBattle(saveBattle(ctx), ctx)
      expect(runBattle(restored)).toEqual(runBattle(ctx))
      expect(saveBattle(restored)).toBe(saveBattle(ctx))
      for (const event of ctx.events.filter(e => e.type === 'moved')) {
        expect(event.to as number).toBeLessThan(board.width * board.height)
        expect(event.to as number).toBeGreaterThanOrEqual(0)
      }
    })
    it(`${mapId} exports the actual board and completed battle`, () => {
      const text = execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'tools/export-battle.mts', '0', mapId, '2'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
      const exported = JSON.parse(text)
      expect(exported.seed.mapId).toBe(mapId)
      expect(exported.events.find((e: any) => e.type === 'map.loaded')).toMatchObject(board)
      expect(exported.events.at(-1).type).toBe('battle.end')
      const scenario = mapId.includes('journey') ? 'test.board-journey' : 'test.board-authored'
      const authored = JSON.parse(execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'tools/export-battle.mts', '--scenario', scenario], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }))
      expect(authored.events.find((e: any) => e.type === 'map.loaded')).toMatchObject(board)
      expect(authored.events.some((e: any) => e.causeId === mapId.replace('test.map.', 'test.encounter.'))).toBe(true)
      expect(authored.events.at(-1).type).toBe('battle.end')
    }, 30000)
  }
})
