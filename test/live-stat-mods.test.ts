// viewer.live-stat-mods (engine backlog; reported 2026-10-01 by Andrew, playing the Lumberjack House: the Warrior's Leap
// "showed a +2 ... a green 4 for the Strength, but the Strength should have gone to 6. None of the attacks have their damage
// modified by the Strength."). The engine's side: a real Leap logs its +2 Strength on (statmod.added, power.leap) and, since
// fix.turn-mods-expire, off as the Turn ends (statmod.expired) — the two lines the viewer folds. The viewer's half
// (../viewer/tools/live-stat-mods.test.mjs) asks the panel and the action bar for the live numbers. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createCustomBattle } from '../../engine/src/core/setup.js'
import { beginActivation, beginTurn } from '../../engine/src/core/mutate.js'
import { executeSidestep } from '../../engine/src/core/movement.js'
import { preview } from '../../engine/src/core/pipeline.js'
import type { MoveDef } from '../../engine/src/core/types.js'

describe('live stat modifiers', () => {
  it('a Leap logs +2 Strength on and, as the Turn ends, off — and the engine\'s own hit is 2 harder while it lasts', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 200 }])
    const w = ctx.state.units[0]!, z = ctx.state.units[1]!
    ctx.state.turn = 1
    w.actions.push('power.leap')
    beginActivation(ctx, w.id, 'test')
    const hexes = Array.from({ length: ctx.geo.hexCount }, (_, h) => h)
    const to = hexes.find((h) => ctx.geo.distance(h, w.hex) === 2)!
    z.hex = hexes.find((h) => ctx.geo.distance(h, to) === 1 && ctx.geo.distance(h, w.hex) === 3)!
    const attack = w.actions.find((a) => ctx.actions[a]?.attack)!
    const before = preview(ctx, w.id, z.id, attack).damageOnHit
    expect(executeSidestep(ctx, w.id, to, ctx.actions['power.leap'] as MoveDef)).toBe(true)
    expect(preview(ctx, w.id, z.id, attack).damageOnHit).toBe(before + 2)
    expect(ctx.events.find((e) => e.type === 'statmod.added' && e['source'] === 'power.leap')).toMatchObject({ actor: w.id, stat: 'strength', value: 2 })
    beginTurn(ctx, 'engine')
    expect(ctx.events.find((e) => e.type === 'statmod.expired' && e['source'] === 'power.leap')).toMatchObject({ actor: w.id, stat: 'strength', value: 2 })
  })
  it('the viewer page: the stat window shows the sheet plus the modifiers, and the attacks move with them', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/live-stat-mods.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
