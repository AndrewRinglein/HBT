import { performance } from 'node:perf_hooks'
import { createBattle } from '../src/core/setup.js'
import { attackLineStats } from '../src/core/los.js'
const warm = process.argv.includes('--warm')

for (const [width, height, count] of [[20, 10, 0], [20, 10, 32], [40, 40, 0], [40, 40, 64], [40, 40, 600], [100, 100, 0]]) {
  const cells = width! * height!, tiles = Array(cells).fill('.')
  for (let i = 0; i < count!; i++) tiles[(i * 37 + 17) % cells] = 'x'
  const rows = Array.from({ length: height! }, (_, row) => tiles.slice(row * width!, (row + 1) * width!).join(''))
  const started = performance.now()
  try {
    const ctx = createBattle({ replicate: 0, heroes: [], enemies: [], heroHexes: [], enemyHexes: [], map: { id: 'test.map.los-benchmark', name: 'LOS benchmark only', rows: warm ? rows.map(r => r.replaceAll('x', '.')) : rows } })
    if (warm) ctx.state.terrain = tiles.map(t => t === 'x' ? 6 : 0)
    const stats = attackLineStats(ctx)
    console.log(JSON.stringify({ width, height, blockers: count, warm, ms: Math.round(performance.now() - started), ...stats }))
  } catch (error) {
    console.log(JSON.stringify({ width, height, blockers: count, ms: Math.round(performance.now() - started), rejected: String(error) }))
  }
}
