// viewer.attack-impact-timing (engine backlog; engine DECISIONS.md 2026-10-03 'an attack's timing: the projectile leaves at the
// release, the target reacts at the blow, a miss is dodged, a hit shows a red slash' and, the same day, '...; a death is tied
// to the strike; ...'). Andrew: "Ranged attacks are not synced up well enough for the point at which the attack is launched
// compared to when the projectile animation then goes. Both the arrow and a priest cast were not synced up very well." /
// "a zombie hit my warrior, and the recoil from being hit should be connected to the timing of the attack. What happens is
// the attack plays, maybe a third of a second later, the reaction plays, and the reaction should just be a little bit
// delayed behind the attack." / "Death animations are happening separately from the strike. They should be more closely
// connected, just like the other reactions."
// Display only: the engine, its log and every result are untouched. This file holds what the display stands on — the order
// of the engine's own lines for an attack: its declaration, then its outcome (a hit, a miss or a block) before anything
// else is declared; a hit's damage after the hit; a death or a fall the damage caused after the damage, named with the
// attack as its cause. The board reads those lines ahead to time what it draws; it decides none of them.
// The viewer's half (../viewer/tools/attack-impact-timing.test.mjs) watches the bodies and the projectiles on the page
// against each clip's authored moment; the sandbox's half (../kingdom/tools/attack-impact-timing.verify.mjs) plays the built
// BATTLE-SANDBOX.html's Enemy Phases. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { runBattle } from '../../engine/src/core/battle.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

const page = (file: string) => execFileSync(process.execPath, ['--test', '--test-reporter=tap', file], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
type E = { type: string; actor?: number | null; target?: number | null; defender?: number; blocked?: boolean; attackId?: string; causeId?: string; kind?: string }
const ENDS = new Set(['attack.declared', 'activation.begin', 'activation.end', 'move.begin', 'moved', 'burst.declared', 'turn.begin', 'phase.begin', 'battle.end'])

describe('an attack\'s moments: what the engine\'s log gives the board to time', () => {
  it('the engine: every attack\'s outcome follows its declaration before anything else is declared; a hit\'s damage follows the hit; a death it causes follows the damage and names the attack', () => {
    let attacks = 0, hits = 0, falls = 0, ranged = 0
    for (const id of ['test.opening-orphanage', 'test.opening-lumberjack', 'test.opening-bridge']) {
      const ctx = createBattle(scenarioOptions(scenarioDef(id), 1)); runBattle(ctx)
      const EV = ctx.events as unknown as E[]
      for (let i = 0; i < EV.length; i++) { const e = EV[i]!; if (e.type !== 'attack.declared') continue
        attacks++; if (e.kind === 'ranged') ranged++
        let outcome = -1, damage = -1
        for (let j = i + 1; j < EV.length && !ENDS.has(EV[j]!.type); j++) { const x = EV[j]!
          if (outcome < 0) { if ((x.type === 'attack.hit' || x.type === 'attack.miss') && x.target === e.target || x.type === 'block.rolled' && x.blocked) outcome = j; continue }
          if (EV[outcome]!.type !== 'attack.hit') continue
          /* the attack's own damage carries its id (a hook's damage on the same target may stand between the hit and it) */
          if (x.type === 'damage.applied' && x.target === e.target && x.attackId === e.attackId && damage < 0) damage = j
          if ((x.type === 'life.dead' || x.type === 'life.downed') && x.target === e.target && damage >= 0) { expect(damage, `${id} line ${j}: the fall comes after the damage`).toBeGreaterThan(outcome); expect(x.causeId).toBe(e.attackId); falls++ } }
        expect(outcome, `${id} line ${i}: the attack's outcome follows its declaration`).toBeGreaterThan(i)
        if (EV[outcome]!.type === 'attack.hit') { hits++; expect(damage, `${id} line ${outcome}: a hit's damage follows it`).toBeGreaterThan(outcome) } } }
    expect(attacks).toBeGreaterThan(60); expect(hits).toBeGreaterThan(30); expect(falls).toBeGreaterThan(8); expect(ranged).toBeGreaterThan(15)
  })
  it('the viewer page: per attack kind, the attacker\'s motion start, the projectile\'s start and the target\'s reaction start against each clip\'s authored moment; every clip with none is listed; a kill falls at the blow', () => {
    const out = page('tools/attack-impact-timing.test.mjs')
    expect(out).toMatch(/# pass 11/); expect(out).toMatch(/# fail 0/)
    /* what was measured, for the record */
    for (const line of out.split('\n').filter((l) => /^# \\?# /.test(l))) console.log(line.replace(/^# \\?# /, '  '))
  }, 600000)
  it('the viewer page: the tests of the bodies and of the grouped Enemy Phase still hold (opening-cast, shield-guard, side-facing, enemy-type-moves-together)', () => {
    for (const [file, n] of [['tools/opening-cast.test.mjs', 6], ['tools/shield-guard.test.mjs', 4], ['tools/side-facing.test.mjs', 1], ['tools/enemy-type-moves-together.test.mjs', 9]] as const) {
      const out = page(file); expect(out, file).toMatch(new RegExp(`# pass ${n}\\b`)); expect(out, file).toMatch(/# fail 0/) }
  }, 600000)
  it('the sandbox: on the built BATTLE-SANDBOX.html (the Orphanage) a Zombie\'s blow starts the hero\'s reaction at the claw\'s blow moment, a kill falls at the blow, and the board stays the engine\'s battle', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/attack-impact-timing.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/attack-impact-timing.verify.mjs', 'scratch/attack-impact-timing.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/attack-impact-timing: .*passed/)
  }, 300000)
})
