// viewer.area-trigger-burst (engine backlog; engine DECISIONS.md 2026-10-03 'the Fire Imp's burn does not hit the imp itself; an
// end-of-Activation area burn shows an explosion of fire'). Andrew: "If it's an end-of-activation burn in a certain area, we
// need to create a VFX that goes along with that. So that should be an explosion of fire. We have the VFX for that."
// Display only: the engine and its log are untouched. This file holds what the display stands on — the engine's own: the Fire
// Imp's sheet names its end-of-Activation burn as an AREA (every unit within 2 of it, itself left out); when its Activation
// ends the log says the trigger fired, whose it is, and each unit it reached — and every unit it reached stood within 2 of
// the imp by the engine's own distance, the imp never among them. The board reads the area off the sheet and the owner off
// the log; it decides neither.
// The viewer's half (../viewer/tools/area-trigger-burst.test.mjs) finds the burst by what is drawn on the page; the sandbox's
// half (../kingdom/tools/area-trigger-burst.verify.mjs) plays the built BATTLE-SANDBOX.html's Bridge;
// ../kingdom/tools/area-trigger-burst.shot.mjs saves the browser's own picture (not a gate test). Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { runBattle } from '../../engine/src/core/battle.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'
import { UNITS } from '../../engine/src/content/index.js'

const page = (file: string) => execFileSync(process.execPath, ['--test', '--test-reporter=tap', file], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
type E = { type: string; actor?: number | null; target?: number | null; hook?: string; fired?: boolean; causeId?: string; hex?: number; to?: number }

describe('an end-of-Activation area effect plays its burst over its area: what the engine gives the board', () => {
  it('the engine\'s sheet: the Fire Imp\'s burn at its Activation\'s end selects an area of radius 2 about itself, itself excluded, and applies Burn', () => {
    const t = (UNITS as Record<string, { triggers?: { id: string; hook: string; select: unknown; effect: unknown }[] }>)['unit.fire-imp']!.triggers!.find((x) => x.hook === 'onActivationEnd')!
    expect(t.id).toBe('trigger.fire-imp.burn')
    expect(t.select).toEqual({ select: 'area', side: 'any', radius: 2, origin: 'self', excludeSelf: true })
    expect(t.effect).toMatchObject({ kind: 'status.apply', statusId: 'status.burn' })
  })
  it('the engine\'s log: the trigger fires as the imp\'s Activation ends, and every unit it reaches stands within 2 of the imp, never the imp', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-bridge'), 1)); runBattle(ctx)
    const EV = ctx.events as unknown as E[], at = new Map<number, number>()
    let fired = 0, reached = 0
    for (let i = 0; i < EV.length; i++) { const e = EV[i]!
      if (e.type === 'unit.enter' && e.hex != null) at.set(e.actor!, e.hex)
      if (e.type === 'moved' && e.to != null) at.set(e.actor!, e.to)
      if (e.type === 'knocked' && e.to != null && e.target != null) at.set(e.target, e.to)
      if (e.type !== 'trigger.rolled' || e.hook !== 'onActivationEnd' || !e.fired || e.causeId !== 'trigger.fire-imp.burn') continue
      fired++
      expect(EV[i - 1]!.type).toBe('activation.end'); expect(EV[i - 1]!.actor).toBe(e.actor)
      const centre = EV[i - 1]!.hex!
      for (let k = i + 1; EV[k] && (EV[k]!.type === 'trigger.fired' || EV[k]!.type === 'status.applied'); k++) { const x = EV[k]!
        if (x.type !== 'trigger.fired') continue
        reached++; expect(x.actor).toBe(e.actor); expect(x.target).not.toBe(e.actor)
        expect(ctx.geo.distance(centre, at.get(x.target!)!), `line ${k}: the unit reached stands within 2`).toBeLessThanOrEqual(2) } }
    expect(fired).toBeGreaterThan(5); expect(reached).toBeGreaterThan(2)
  })
  it('the viewer page: the burst drawn at the Fire Imp\'s end of Activation with the trigger\'s radius, before the burned units react; every area trigger with no burst listed', () => {
    const out = page('tools/area-trigger-burst.test.mjs')
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
    for (const line of out.split('\n').filter((l) => /^# \\?# /.test(l))) console.log(line.replace(/^# \\?# /, '  '))
  }, 600000)
  it('the viewer page: the bursts, the grouped Enemy Phase and the attack\'s timing still hold', () => {
    for (const [file, n] of [['tools/bursts-player.test.mjs', 11], ['tools/enemy-type-moves-together.test.mjs', 9], ['tools/attack-impact-timing.test.mjs', 11]] as const) {
      const out = page(file); expect(out, file).toMatch(new RegExp(`# pass ${n}\\b`)); expect(out, file).toMatch(/# fail 0/) }
  }, 600000)
  it('the sandbox: on the built BATTLE-SANDBOX.html (the Bridge) each Fire Imp Activation that ends shows the explosion over the hexes within 2 of it, and the board stays the engine\'s battle', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/area-trigger-burst.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/area-trigger-burst.verify.mjs', 'scratch/area-trigger-burst.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/area-trigger-burst: .*passed/)
  }, 300000)
})
