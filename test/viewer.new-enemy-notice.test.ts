// viewer.new-enemy-notice (engine backlog; engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class line,
// no map before battle 1, the Orphanage's lessons, the camera shows what arrives, new enemies are named, a closer start').
// Andrew: "If a new enemy is introduced there is going to be a notification: \"New enemy\" and their name." — asked whether
// every time any enemy arrives or the first time a kind is met: "To first time". The engine's side — nothing of it changes:
// which enemies a battle has, when they arrive and what each is called are its own rows and its own log. Held here: battle 2
// (the Lumberjack House) opens with a Zombie and brings a Skeleton Archer on Turn 2 and two more on Turn 3; battle 3 (the
// Bridge) opens with Imps and brings a Fire Imp on Turn 2. The viewer's half (../viewer/tools/new-enemy-notice.test.mjs)
// names a kind the host hands over the first time a unit of it is on the board, once; the run's half is the kingdom's
// (../kingdom/test/new-enemy-notice.test.ts: the Campaign's `revealed` list and its save;
// ../kingdom/tools/new-enemy-notice.verify.mjs: the built BATTLE-SANDBOX.html, outside a run and through the opening run's
// first two battles, the second lost and replayed). Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'
import { UNITS } from '../../engine/src/content/index.js'
import { runBattle } from '../../engine/src/core/battle.js'

const enemyKinds = (ctx: ReturnType<typeof createBattle>) => [...new Set(ctx.state.units.filter((u) => u.side === 'enemy' && u.lifeState !== 'dead').map((u) => u.typeId))].sort()
type Row = { name: string; side: string }

describe('a new kind of enemy is named the first time it is met', () => {
  it('the engine: battle 2 opens with a Zombie; a Skeleton Archer arrives on Turn 2 and two more on Turn 3', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-lumberjack'), 1))
    expect(enemyKinds(ctx)).toEqual(['unit.zombie'])
    runBattle(ctx)
    const arrivals = ctx.events.filter((e) => e.type === 'unit.enter' && (e as { arrived?: unknown }).arrived && (e as { typeId?: string }).typeId === 'unit.skeletal-archer').map((e) => e.turn)
    expect(arrivals.filter((t) => t === 2).length).toBe(1); expect(arrivals.filter((t) => t === 3).length).toBe(2)
    expect((UNITS as Record<string, Row>)['unit.skeletal-archer']).toMatchObject({ name: 'Skeleton Archer', side: 'enemy' })
  })
  it('the engine: battle 3 opens with Imps on the board, and a Fire Imp arrives on Turn 2', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-bridge'), 1))
    expect(enemyKinds(ctx)).toEqual(['unit.imp'])
    expect(ctx.state.units.filter((u) => u.typeId === 'unit.imp').length).toBeGreaterThanOrEqual(3)
    runBattle(ctx)
    const fire = ctx.events.find((e) => e.type === 'unit.enter' && (e as { typeId?: string }).typeId === 'unit.fire-imp')!
    expect(fire.turn).toBe(2)
    expect((UNITS as Record<string, Row>)['unit.imp']!.name).toBe('Imp')
  })
  it('the viewer page: the notice\'s two lines for a kind handed over, none for a kind not handed over, one notice for many of a kind', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/new-enemy-notice.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: outside a run and through the opening run on the built BATTLE-SANDBOX.html — the met kinds are in the run\'s save; a replayed battle announces nothing already met', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/new-enemy-notice.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/new-enemy-notice.verify.mjs', 'scratch/new-enemy-notice.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'] })
    expect(out).toMatch(/new-enemy-notice: .*passed/)
  }, 170000)
})
