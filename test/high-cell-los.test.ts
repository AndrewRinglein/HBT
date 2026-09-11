import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createBattle } from '../src/core/setup.js'
import { canAttack, performAttack } from '../src/core/pipeline.js'
import { advanceBattle } from '../src/core/battle.js'
import { executeBattleCommand } from '../src/core/commands.js'
import { saveBattle, restoreBattle } from '../src/core/snapshot.js'
import { forkBattle } from '../src/core/fork.js'
import { TERRAIN } from '../src/core/types.js'
import { attackLineClear, attackLineStats, segmentCrossesCell, LOS_LIMITS } from '../src/core/los.js'
import { canSee } from '../src/core/vision.js'
import { effective } from '../src/core/stats.js'
import { paintLayer } from '../src/core/mutate.js'
import { LAYER } from '../src/content/maps.js'
import { isAttack } from '../src/core/action.js'

const bow = 'attack.test-ranger.bow'
const battle = (rows = ['.....', '..x..', '.....']) => createBattle({
  replicate: 0, strict: true, heroes: ['test-ranger'], enemies: ['test-zombie'],
  heroHexes: [5], enemyHexes: [9], map: { id: 'test.map.high-cell-ray', name: 'High cell ray', rows },
})

describe('V2 high cell attack lines', () => {
  it('rejects a shot through a high cell in ordinary and reaction legality', () => {
    const ctx = battle()
    expect(canAttack(ctx, 0, 1, bow)).toBe(false)
    expect(canAttack(ctx, 0, 1, bow, 'reaction')).toBe(false)
    expect(canAttack(battle(['.....', '.....', '.....']), 0, 1, bow)).toBe(true)
  })

  it('rejects a human command atomically and retains that answer after restore', () => {
    const ctx = battle()
    expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
    const before = saveBattle(ctx), resumed = restoreBattle(before, ctx)
    for (const c of [ctx, resumed]) {
      const result = executeBattleCommand(c, { humanUnitUids: [c.state.units[0]!.uid] }, {
        kind: 'action', actor: 0, actionId: bow, target: 1, expectedSeq: c.state.seq,
      })
      expect(result.ok).toBe(false)
      expect(saveBattle(c)).toBe(before)
    }
  })

  it('notices removal and replacement without leaking through a preview fork', () => {
    const ctx = battle(), branch = forkBattle(ctx)
    expect(canAttack(ctx, 0, 1, bow)).toBe(false)
    branch.state.terrain[7] = TERRAIN.OPEN
    expect(canAttack(branch, 0, 1, bow)).toBe(true)
    expect(canAttack(ctx, 0, 1, bow)).toBe(false)
    ctx.state.terrain[7] = TERRAIN.FOREST
    expect(canAttack(ctx, 0, 1, bow)).toBe(true)
    ctx.state.terrain[7] = TERRAIN.OBSTACLE
    expect(canAttack(ctx, 0, 1, bow)).toBe(false)
  })

  it.each([['map.thicket', 5, 2, 4, 3], ['map.proving.ruin', 3, 5, 7, 6]] as const)('%s blocks its authored shot, removal enables a real paid command', (mapId, row, from, to, wall) => {
    const ctx = createBattle({ replicate: 0, strict: true, mapId, heroes: ['test-ranger'], enemies: ['test-zombie'], heroHexes: [row * 16 + from], enemyHexes: [row * 16 + to] })
    expect(ctx.state.terrain[row * 16 + wall]).toBe(TERRAIN.OBSTACLE)
    expect(canAttack(ctx, 0, 1, bow)).toBe(false)
    expect(canAttack(ctx, 0, 1, bow, 'reaction')).toBe(false)
    expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
    const before = saveBattle(ctx)
    expect(executeBattleCommand(ctx, { humanUnitUids: [ctx.state.units[0]!.uid] }, { kind: 'action', actor: 0, target: 1, actionId: bow, expectedSeq: ctx.state.seq }).ok).toBe(false)
    expect(saveBattle(ctx)).toBe(before)
    ctx.state.terrain[row * 16 + wall] = TERRAIN.OPEN
    expect(canAttack(ctx, 0, 1, bow)).toBe(true)
    const stamina = ctx.state.units[0]!.stamina
    expect(executeBattleCommand(ctx, { humanUnitUids: [ctx.state.units[0]!.uid] }, { kind: 'action', actor: 0, target: 1, actionId: bow, expectedSeq: ctx.state.seq }).ok).toBe(true)
    expect(ctx.state.units[0]!.stamina).toBe(stamina - ctx.actions[bow]!.staminaCost)
    expect(ctx.events.filter(e => e.type === 'action.spent' && e.actionId === bow)).toHaveLength(1)
  })

  it('real reactions are denied before payment, then pay once without consuming activation slots', () => {
    const ctx = battle(), actor = ctx.state.units[0]!
    actor.moveUsed = true; actor.primaryUsed = true
    const before = saveBattle(ctx)
    expect(() => performAttack(ctx, 0, 1, bow, 'reaction')).toThrow(/illegal/)
    expect(saveBattle(ctx)).toBe(before)
    ctx.state.terrain[7] = TERRAIN.OPEN
    const stamina = actor.stamina
    performAttack(ctx, 0, 1, bow, 'reaction')
    expect(actor.stamina).toBe(stamina - ctx.actions[bow]!.staminaCost)
    expect([actor.moveUsed, actor.primaryUsed]).toEqual([true, true])
    expect(ctx.events.filter(e => e.type === 'action.spent')).toHaveLength(1)
  })

  it('melee reach beyond one hex cannot cross a high cell', () => {
    const ctx = createBattle({ replicate: 0, heroes: ['test-warrior'], enemies: ['test-zombie'], heroHexes: [5], enemyHexes: [7], map: { id: 'test.map.melee-wall', name: 'Melee wall', rows: ['.....', '.x...', '.....'] } })
    const action = ctx.state.units[0]!.actions.map(id => ctx.actions[id]!).find(a => isAttack(a) && a.attack.kind === 'melee')!
    if (!isAttack(action)) throw new Error('fixture requires a melee attack')
    // Fixture-only long melee reach; no published content row is modified.
    ctx.actions = { ...ctx.actions, [action.id]: { ...action, range: 2 } }
    expect(canAttack(ctx, 0, 1, action.id)).toBe(false)
    expect(canAttack(ctx, 0, 1, action.id, 'reaction')).toBe(false)
    ctx.state.terrain[6] = TERRAIN.OPEN
    expect(canAttack(ctx, 0, 1, action.id)).toBe(true)
    performAttack(ctx, 0, 1, action.id)
    expect(ctx.events.some(e => e.type === 'attack.declared' && e.causeId === action.id)).toBe(true)
  })

  it('cold and warmed-open construction of identical final geometry have equal work and answers', () => {
    const run = (warm: boolean) => {
      const script = `import {createBattle} from './src/core/setup.ts'; import {attackLineClear,attackLineStats} from './src/core/los.ts'; const rows=['....','.xx.','....']; const ctx=createBattle({replicate:0,heroes:[],enemies:[],heroHexes:[],enemyHexes:[],map:{id:'test.map.cold-warm',name:'Cold warm',rows:${warm ? "rows.map(r=>r.replaceAll('x','.'))" : 'rows'}}}); ${warm ? 'ctx.state.terrain[5]=6;ctx.state.terrain[6]=6;' : ''} const answers=[];for(let a=0;a<12;a++)for(let b=0;b<12;b++)answers.push(attackLineClear(ctx,a,b));console.log(JSON.stringify({answers,stats:attackLineStats(ctx)}));`
      return JSON.parse(execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', '-e', script], { encoding: 'utf8' }))
    }
    const cold = run(false), warm = run(true)
    expect(warm.answers).toEqual(cold.answers)
    expect(warm.stats.pairCellTests).toBe(cold.stats.pairCellTests)
    expect(warm.stats.reverseEntries).toBe(cold.stats.reverseEntries)
    expect(cold.stats.pairCellTests).toBe(2 * 12 * 11 / 2)
  }, 30000)

  it('darkness vision and an authored aura still cross blockers by radius', () => {
    const ctx = battle()
    paintLayer(ctx, 9, LAYER.DARKNESS, 'test')
    expect(canSee(ctx, ctx.state.units[0]!, ctx.state.units[1]!)).toBe(true)
    expect(canAttack(ctx, 0, 1, bow)).toBe(false)
    const aura = createBattle({ replicate: 0, heroes: [], heroHexes: [], enemies: ['unit.necromancer', 'unit.zombie'], enemyHexes: [5, 7], map: { id: 'test.map.aura-wall', name: 'Aura wall', rows: ['.....', '.x...', '.....'] } })
    expect(attackLineClear(aura, 5, 7)).toBe(false)
    const source = aura.state.units[0]!, target = aura.state.units[1]!
    const accuracy = source.auras.find(a => a.mods.accuracy)!
    expect(effective(aura, target, 'accuracy').value).toBe(target.accuracy + accuracy.mods.accuracy!)
  })

  it('new blocker hits are ORed once, without history-dependent retracing', () => {
    const ctx = createBattle({ replicate: 0, heroes: [], enemies: [], heroHexes: [], enemyHexes: [], map: { id: 'test.map.add-los', name: 'Addition', rows: ['......', '......', '......'] } })
    ctx.state.terrain[7] = TERRAIN.OBSTACLE
    const stats = attackLineStats(ctx)
    expect(stats.cacheHit).toBe(false)
    expect(stats.pairCellTests).toBe(18 * 17 / 2)
    expect(attackLineClear(ctx, 6, 8)).toBe(false)
  })

  it('open maximal boards allocate no pair bitset and excessive dense work fails loudly', () => {
    const ctx = createBattle({ replicate: 0, heroes: [], enemies: [], heroHexes: [], enemyHexes: [], map: { id: 'test.map.open-limit', name: 'Open limit', rows: Array(100).fill('.'.repeat(100)) } })
    expect(attackLineClear(ctx, 0, 9999)).toBe(true)
    expect(attackLineStats(ctx).bytes).toBeLessThan(1000)
    expect(attackLineStats(ctx).pairCellTests).toBe(0)
    const terrain = Array(10000).fill('.')
    for (let i = 0; i < 21; i++) terrain[i] = 'x'
    expect(() => createBattle({ replicate: 0, heroes: [], enemies: [], heroHexes: [], enemyHexes: [], map: { id: 'test.map.excess-los', name: 'Excess work', rows: Array.from({ length: 100 }, (_, r) => terrain.slice(r * 100, r * 100 + 100).join('')) } })).toThrow(/pair-cell work limit/)
    expect(attackLineStats(ctx).sharedBytes).toBeLessThanOrEqual(LOS_LIMITS.cacheBytes)
  })
})

// Independent segment/edge oracle: orientation + on-segment tests, not SAT.
type Point = readonly [number, number]
const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
const on = (p: Point, a: Point, b: Point) => cross(a, b, p) === 0 && p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1])
const crosses = (a: Point, b: Point, c: Point, d: Point) => on(c, a, b) || on(d, a, b) || on(a, c, d) || on(b, c, d) || (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0)
const vertices = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]] as const
const center = (width: number, h: number): Point => [2 * (h % width) + Math.floor(h / width) % 2, 3 * Math.floor(h / width)]
function oracle(width: number, a: number, b: number, cell: number): boolean {
  const p = center(width, a), q = center(width, b), c = center(width, cell)
  const hex: Point[] = vertices.map(v => [c[0] + v[0], c[1] + v[1]])
  const inside = (v: Point) => hex.every((h, i) => cross(h, hex[(i + 1) % 6]!, v) >= 0)
  return inside(p) || inside(q) || hex.some((h, i) => crosses(p, q, h, hex[(i + 1) % 6]!))
}
describe('exact full-cell geometry', () => {
  it('all-pair tables remain oracle-exact after mixed edits, forks, restores and same-ID other dimensions', () => {
    const make = (width: number, height: number, blockers: number[]) => createBattle({ replicate: 0, heroes: [], enemies: [], heroHexes: [], enemyHexes: [], map: { id: 'test.map.same-los-id', name: 'Same ID', rows: Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => blockers.includes(row * width + col) ? 'x' : '.').join('')) } })
    const check = (ctx: ReturnType<typeof createBattle>) => {
      const blockers = ctx.state.terrain.flatMap((t, h) => t === TERRAIN.OBSTACLE ? [h] : [])
      for (let a = 0; a < ctx.geo.hexCount; a++) for (let b = 0; b < ctx.geo.hexCount; b++) {
        expect(attackLineClear(ctx, a, b), `${a}->${b}`).toBe(!blockers.some(cell => oracle(ctx.state.board.width, a, b, cell)))
      }
    }
    const ctx = make(4, 3, [5, 6]), original = saveBattle(ctx), fork = forkBattle(ctx)
    const forkBefore = saveBattle(fork)
    check(ctx); check(fork)
    ctx.state.terrain[5] = TERRAIN.OPEN; ctx.state.terrain[9] = TERRAIN.OBSTACLE
    check(ctx); check(fork)
    expect(attackLineStats(ctx).pairCellTests).toBe(12 * 11 / 2)
    expect(saveBattle(fork)).toBe(forkBefore)
    const resumed = restoreBattle(saveBattle(ctx), ctx), old = restoreBattle(original, ctx)
    check(resumed); check(old)
    const other = make(3, 4, [4, 8])
    check(other); check(ctx); check(fork)
    expect(ctx.state.board).toEqual({ width: 4, height: 3 })
    expect(other.state.board).toEqual({ width: 3, height: 4 })
    fork.state.terrain[6] = TERRAIN.OPEN
    check(fork); check(ctx)
  })
  it.each([{ width: 4, height: 3 }, { width: 3, height: 4 }, { width: 5, height: 5 }])('exhaustive independent oracle, symmetry, endpoints and zero-length on $width × $height', board => {
    const n = board.width * board.height
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let cell = 0; cell < n; cell++) {
      expect(segmentCrossesCell(board, a, b, cell), `${a}->${b} / ${cell}`).toBe(oracle(board.width, a, b, cell))
      expect(segmentCrossesCell(board, a, b, cell)).toBe(segmentCrossesCell(board, b, a, cell))
    }
  })
  it('closed vertex contact blocks both directions, while a neighbouring clear ray stays clear', () => {
    const board = { width: 5, height: 3 }
    expect(segmentCrossesCell(board, 0, 13, 5)).toBe(true)
    expect(segmentCrossesCell(board, 13, 0, 5)).toBe(true)
    expect(segmentCrossesCell(board, 0, 4, 5)).toBe(false)
    expect(segmentCrossesCell(board, 5, 5, 5)).toBe(true)
    expect(segmentCrossesCell(board, 0, 0, 5)).toBe(false)
    expect(() => segmentCrossesCell(board, -1, 2, 3)).toThrow(/invalid/)
    expect(() => segmentCrossesCell(board, 0, 2, 15)).toThrow(/invalid/)
  })
})
