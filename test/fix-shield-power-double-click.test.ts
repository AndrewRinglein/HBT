// fix.shield-power-double-click (engine DECISIONS.md 2026-10-01 'a self power fires on a double-click on its bar button').
// Andrew, playing the Orphanage on the built sandbox: "The two shield powers do not work. I click on them. … If I
// double-click on them or click on them and click on the hero, neither one of those does anything. I should be able to
// double-click on it in the bar and have it activate." movement.swap-and-shields' page test passed while this was so: it
// called the page's handlers by hand, skipped every animation between its two clicks, and always made the shield hero the
// one acting before touching its bar. This one builds BATTLE-SANDBOX.html into the kingdom's scratch folder and
// ../kingdom/tools/shield-dblclick.verify.mjs plays it in a real browser with real mouse events: a double-click on the bar
// of the hero proposed to act and of a hero only looked at, and a click on the bar then on the hero, for both. The engine's
// own numbers are asked here: each power's name and staminaCost. Imports no kingdom code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { ACTIONS } from '../src/content/index.js'

type Use = { how: string, hero: string, power: string, used: boolean, cost: number, staminaBefore: number, staminaAfter: number, logNamed: boolean,
  modsShown: number, badgesBefore: number, badgesAfter: number, note: string | null }
const record = (): { errors: string[], uses: Use[] } => {
  mkdirSync('../kingdom/scratch', { recursive: true })
  execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/shield-dblclick.html'], { cwd: '../kingdom', stdio: 'pipe' })
  return JSON.parse(execFileSync(process.execPath, ['tools/shield-dblclick.verify.mjs', 'scratch/shield-dblclick.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 }))
}

describe('a shield power fires from the bar of the built sandbox, driven by a real mouse', () => {
  const r = record()
  it('the page runs without an error', () => { expect(r.errors).toEqual([]) })
  it('every way Andrew tried: a double-click on the bar (the hero proposed, the hero looked at), the bar then the hero', () => {
    expect(r.uses.map((u) => [u.how, u.power])).toEqual([
      ['double-click on the bar, the hero proposed', 'power.tower-shield.cover'],
      ['double-click on the bar of the hero looked at', 'power.round-shield.turn-aside'],
      ['click on the bar, then the hero', 'power.tower-shield.stand-tall'],
      ['click on the bar of the hero looked at, then the hero', 'power.round-shield.brace'],
    ])
  })
  for (const i of [0, 1, 2, 3]) it(`fires: stamina paid, the log names it, the board shows it — use ${i + 1}`, () => {
    const u = r.uses[i]!, def = ACTIONS[u.power]!
    expect(u.used, u.how).toBe(true)
    expect(u.cost, u.how).toBe(def.staminaCost)
    expect(u.staminaBefore - u.staminaAfter, u.how).toBe(def.staminaCost)
    expect(u.logNamed, u.how).toBe(true)
    expect(u.modsShown, u.how).toBeGreaterThan(0)
    expect(u.badgesAfter, u.how).toBeGreaterThan(u.badgesBefore)
  })
}, 400000)
