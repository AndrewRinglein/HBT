// viewer.battle-full-screen (engine DECISIONS.md 2026-09-30 "the battle is its own full screen; End Turn and End Activation
// lower right; a red targeting arrow"). Andrew: "I want a fucking battle. It should be full screen. How can I experience
// this if you've got one screen that is both your launcher and your battle?" · "You've got End Turn and End Activation on
// the battle map. They shouldn't be. Put them in the lower right-hand corner." · "The arrow for targeting should be red,
// not blue." Expect: "BATTLE-SANDBOX.html?play=encounter.opening.orphanage opens to the battle filling the window with
// nothing of the setup form showing; End Turn and End Activation are in the lower right corner, not over the board; the
// targeting arrow is red." The kingdom's half (../kingdom/tools/sandbox-full-screen.verify.mjs) boots the COMMITTED
// sandbox page with ?play= at 16:9, wide and 5:4 windows; the viewer's half (../viewer/tools/battle-full-screen.test.mjs)
// runs against the committed viewer page. This asks the engine's side — the encounter ?play= names is the engine's —
// and runs both halves in child processes; imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { ENCOUNTERS } from '../src/content/index.js'

const run = (cwd: string, args: string[]) => execFileSync(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: '' } })

describe('the battle is its own full screen; End Turn and End Activation lower right; a red targeting arrow', () => {
  it('?play=encounter.opening.orphanage names an engine encounter with an enemy to fight and civilians to save', () => {
    const enc = (ENCOUNTERS as Record<string, any>)['encounter.opening.orphanage']
    expect(enc).toBeDefined()
    expect(enc.setup.some((f: any) => !f.civilian && String(f.unit).startsWith('unit.'))).toBe(true)
    expect(enc.setup.some((f: any) => f.civilian === true)).toBe(true)
  })
  it('the sandbox page opened with ?play= is the battle alone, filling the window; nothing of the setup form shows; the endings off the board', () => {
    const out = run('../kingdom', ['tools/sandbox-full-screen.verify.mjs', 'BATTLE-SANDBOX.html'])
    expect(out).toMatch(/sandbox full screen: .*passed/)
  }, 60000)
  it('the viewer page: End Turn and End activation in the screen\'s lower right-hand corner, not on the board; the targeting arrow red', () => {
    const out = run('../viewer', ['--test', 'tools/battle-full-screen.test.mjs'])
    expect(out).toMatch(/# pass 3/)
    expect(out).toMatch(/# fail 0/)
  }, 90000)
})
