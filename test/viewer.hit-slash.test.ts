// viewer.hit-slash (engine backlog; engine DECISIONS.md 2026-10-03 'an attack's timing: the projectile leaves at the release, the
// target reacts at the blow, a miss is dodged, a hit shows a red slash' — Andrew: "Also, there's no red slash across the target
// that is part of a hit." — and '...; the slash on every damaging hit; ...': "Red slash on every damage").
// Display only: the engine and its log are untouched. This file holds what the display stands on — the engine's own lines:
// an attack's damage line carries the attack's id and says what it dealt (its packets' `applied`, or its `amount`), a hit
// may deal nothing, and a miss has no damage line at all. The board reads those figures; it computes none.
// The viewer's half (../viewer/tools/hit-slash.test.mjs) finds the slash by what is drawn on the board's effects canvas, on
// the painted 3D board and the flat board; the sandbox's half (../kingdom/tools/hit-slash.verify.mjs) plays the built
// BATTLE-SANDBOX.html's Enemy Phases; ../kingdom/tools/hit-slash.shot.mjs saves the browser's own picture (not a gate test).
// Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { runBattle } from '../../engine/src/core/battle.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

const page = (file: string) => execFileSync(process.execPath, ['--test', '--test-reporter=tap', file], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
type E = { type: string; target?: number | null; attackId?: string; amount?: number; packets?: { applied: number }[]; kind?: string; burst?: boolean }
const dealt = (e: E) => e.packets ? e.packets.reduce((s, p) => s + p.applied, 0) : e.amount ?? 0

describe('the slash on every hit that deals damage: what the engine\'s log gives the board', () => {
  it('the engine: an attack\'s damage line carries the attack\'s id and what it dealt; a miss has none; melee and ranged alike', () => {
    let melee = 0, ranged = 0, misses = 0
    for (const id of ['test.opening-orphanage', 'test.opening-lumberjack', 'test.opening-bridge']) {
      const ctx = createBattle(scenarioOptions(scenarioDef(id), 1)); runBattle(ctx)
      const EV = ctx.events as unknown as E[]
      for (let i = 0; i < EV.length; i++) { const e = EV[i]!; if (e.type !== 'attack.declared') continue
        let hit = false, missed = false, dmg: E | null = null
        for (let j = i + 1; j < EV.length && !['attack.declared', 'activation.end', 'activation.begin'].includes(EV[j]!.type); j++) { const x = EV[j]!
          if (x.type === 'attack.hit' && x.target === e.target) hit = true
          if (x.type === 'attack.miss' && x.target === e.target) missed = true
          if (x.type === 'damage.applied' && x.target === e.target && x.attackId === e.attackId && !dmg) dmg = x }
        if (missed) { misses++; expect(dmg, `${id} line ${i}: a miss has no damage line`).toBe(null) }
        if (hit && dmg) { expect(Number.isInteger(dealt(dmg))).toBe(true); expect(dmg.burst).not.toBe(true); if (dealt(dmg) > 0) { if (e.kind === 'ranged') ranged++; else melee++ } } } }
    expect(melee).toBeGreaterThan(15); expect(ranged).toBeGreaterThan(10); expect(misses).toBeGreaterThan(10)
  })
  it('the viewer page: a red slash across the target at the blow for a hit that deals damage — melee and ranged, on the painted 3D board and the flat board — and none for a miss, a block or a hit that deals nothing', () => {
    const out = page('tools/hit-slash.test.mjs')
    expect(out).toMatch(/# pass 7/); expect(out).toMatch(/# fail 0/)
    for (const line of out.split('\n').filter((l) => /^# \\?# /.test(l))) console.log(line.replace(/^# \\?# /, '  '))
  }, 600000)
  it('the viewer page: the attack\'s timing still holds (attack-impact-timing)', () => {
    const out = page('tools/attack-impact-timing.test.mjs'); expect(out).toMatch(/# pass 11/); expect(out).toMatch(/# fail 0/)
  }, 600000)
  it('the sandbox: on the built BATTLE-SANDBOX.html (the Orphanage) each Zombie\'s damaging hit draws one red slash across the hero at the blow, a miss none', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/hit-slash.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/hit-slash.verify.mjs', 'scratch/hit-slash.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/hit-slash: .*passed/)
  }, 300000)
})
