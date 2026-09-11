import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'
import * as currentSetup from '../src/core/setup.js'
import * as currentLos from '../src/core/los.js'
import * as currentMovement from '../src/core/movement.js'
const base = '038304f', temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-props-perf-'))
try {
  for (const file of execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'src'], { encoding: 'utf8' }).trim().split(/\r?\n/)) {
    const target = path.resolve(temporary, file); assert.ok(target.startsWith(temporary + path.sep))
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, execFileSync('git', ['show', `${base}:${file}`], { maxBuffer: 16 * 1024 * 1024 }))
  }
  fs.writeFileSync(path.join(temporary, 'package.json'), '{"type":"module"}')
  const load = (file: string) => import(pathToFileURL(path.join(temporary, file)).href)
  const arms = [{ label: base, setup: await load('src/core/setup.ts'), los: await load('src/core/los.ts'), movement: await load('src/core/movement.ts') }, { label: 'canonical-props', setup: currentSetup, los: currentLos, movement: currentMovement }]
  const tiles = Array(1600).fill('.'); for (let i = 0; i < 600; i++) tiles[(i * 37 + 17) % 1600] = 'x'
  const rows = Array.from({ length: 40 }, (_, r) => tiles.slice(r * 40, r * 40 + 40).join(''))
  const hero = tiles.indexOf('.'), enemy = tiles.lastIndexOf('.')
  const results: any[] = []
  for (const arm of arms) {
    const started = performance.now()
    const ctx = arm.setup.createBattle({ replicate: 0, heroes: ['test-warrior'], enemies: ['test-zombie'], heroHexes: [hero], enemyHexes: [enemy], map: { id: 'test.map.props-perf', name: 'Perf only', rows } })
    const setupMs = performance.now() - started, stats = arm.los.attackLineStats(ctx)
    ctx.state.units[0].actions.push('power.sidestep')
    ctx.state.units[0].movePointsLeft = 8
    const moveAt = performance.now(); let destinations: any
    for (let i = 0; i < 100; i++) destinations = arm.movement.movementOptions(ctx, 0, 'power.sidestep').map((p: any) => p.destination)
    const sidestep100Ms = performance.now() - moveAt
    const pathAt = performance.now(); let reach: any
    for (let i = 0; i < 100; i++) reach = [...arm.movement.reachable(ctx, ctx.state.units[0]).entries()]
    const path100Ms = performance.now() - pathAt
    assert.ok(reach.length > 0, 'benchmark must enumerate actual reachable destinations')
    assert.ok(destinations.length > 0)
    results.push({ label: arm.label, setupMs, sidestep100Ms, path100Ms, stats, destinations, reach })
  }
  assert.deepEqual(results[1].destinations, results[0].destinations)
  assert.deepEqual(results[1].reach, results[0].reach)
  for (const key of ['pairCellTests', 'reverseEntries', 'bytes']) assert.equal(results[1].stats[key], results[0].stats[key])
  fs.writeFileSync('scratch/authored-props-performance.json', JSON.stringify({ board: '40x40', blockers: 600, base, results }, null, 2) + '\n')
  console.log(JSON.stringify({ board: '40x40', blockers: 600, results: results.map(({ reach, destinations, ...r }) => r) }, null, 2))
} finally {
  assert.equal(path.dirname(temporary), path.resolve(os.tmpdir())); assert.ok(path.basename(temporary).startsWith('hobat-props-perf-'))
  fs.rmSync(temporary, { recursive: true, force: true })
}
