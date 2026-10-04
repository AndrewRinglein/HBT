// viewer.affliction-pop-up (engine backlog; engine DECISIONS.md 2026-10-01 'the afflictions at 0 Health: Vampirism and Lycanthropy
// transform on a Luck roll, Possession raises a Ghost, Rotting Flesh gains Fragile; the first-affliction pop-up'). Andrew: "The
// first time someone gets any one of the four main status afflictions, we need to pop up before and after art for that character
// with an explanation" / "There is a before/after pop-up mid-battle that will explain what just happened with the card art of
// both before and after." The engine's side: a hero bitten mid-battle gains the affliction on ONE line — badge.gained — that
// carries everything the pop-up says (its stat modifiers, the row's written terms, its 0-Health rule); the viewer computes
// nothing (Law 0). The viewer's half (../viewer/tools/affliction-pop-up.test.mjs) asks the page, on battles exported from the
// engine as it stands: the pump holds on the pop-up, the hero's card before and after, the three explanations, and the battle
// goes on when it is closed; the sandbox's half (../kingdom/tools/affliction-pop-up.verify.mjs) plays the built
// BATTLE-SANDBOX.html in a real browser until a zombie afflicts a hero — the expect line. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { runBattle } from '../../engine/src/core/battle.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'
import { BADGES } from '../../engine/src/content/index.js'

describe('the first-affliction pop-up: before and after art, the three explanations, the battle held until it is closed', () => {
  it('the engine states it on one line: a hero\'s badge.gained carries the stat modifiers, the written terms and the 0-Health rule', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.prologue-party')))
    runBattle(ctx)
    const gain = ctx.events.find((e) => e.type === 'badge.gained' && e['atZero'] !== undefined) as Record<string, any> | undefined
    expect(gain, 'a zombie afflicts a hero of the battle-2 party').toBeDefined()
    const enter = ctx.events.find((e) => e.type === 'unit.enter' && e.actor === gain!['actor']) as Record<string, any>
    expect(enter['side']).toBe('hero')
    const row = BADGES[gain!['badgeId'] as string]!
    expect(gain!['name']).toBe(row.name)
    expect(gain!['mods']).toEqual(row.statModifiers)
    expect(gain!['atZero']).toEqual(row.atZero)
    expect(gain!['gaps']).toEqual(row.gaps)
    // engine fix.affliction-pop-up-words (2026-10-04; engine DECISIONS.md 2026-10-03 "the affliction pop-up's 0-Health words and its
    // drawbacks come from the engine"): … and the Codex's ruled 0-Health text and which of the row's terms are drawbacks
    expect(typeof (gain!['atZero'] as { text?: string }).text).toBe('string')
    expect((gain!['atZero'] as { text?: string }).text).toBe((row.atZero as unknown as { text: string }).text)
    expect(gain!['drawbacks']).toEqual((row as unknown as { drawbacks: unknown }).drawbacks)
    expect(gain!['drawbacks']).toBeDefined()
    // the four afflictions are the badges with a 0-Health rule — the pop-up is raised for exactly these, by shape
    expect(Object.values(BADGES).filter((b) => b.atZero).map((b) => b.id).sort()).toEqual(['badge.lycanthropy', 'badge.possession', 'badge.rotting-flesh', 'badge.vampirism'])
  })
  it('the viewer page: the pump holds on the pop-up, the card before and after, the three explanations, closed it goes on; no art is said, not faked', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/affliction-pop-up.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, played on the built BATTLE-SANDBOX.html until a zombie afflicts a hero, at 1920 x 1080', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/affliction-pop-up.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/affliction-pop-up.verify.mjs', 'scratch/affliction-pop-up.html', 'scratch/affliction-pop-up.png'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/affliction-pop-up: .*passed/)
    // about a minute alone; the viewer gate's checks part runs it beside every other page test and their browsers
  }, 280000)
})
