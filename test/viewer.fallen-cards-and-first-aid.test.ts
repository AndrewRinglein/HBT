// viewer.fallen-cards-and-first-aid (engine backlog; engine DECISIONS.md 2026-10-03 'the cards above the battle: the fallen
// leave, a downed hero's card wears a first-aid mark' and 'size and shadows are the default; the bleeding-out card; ...').
// Andrew: "When an enemy goes down, they should no longer have their card above the battle. When a hero is dead, it's the
// same. When a hero is downed, their card on the battlefield should have a little first aid symbol in the upper right-hand
// corner." / "The hero card above the battle should show a first aid icon in the upper right-hand corner and the number of
// turns they have left." The engine's side — nothing of it changes: what the card reads is the log's. Held here on the
// engine's own recording of the Bridge: a hero that goes down is given a bleed-out count (bleedout.set), the count steps
// down a Turn at a time (bleedout.tick) and the hero dies when it runs out (life.dead, bledOut); an enemy at 0 Health dies
// outright — it is never downed. FOUND, for the engine's queue: the engine has no way to stand a downed hero back up (no
// first aid: nothing ever emits life.standing), so "a hero stood back up has neither" is held by the stand the engine does
// have, the one at the Deathbed (deathbed.stood — never downed). The viewer's half is
// ../viewer/tools/fallen-cards-and-first-aid.test.mjs; the sandbox's half ../kingdom/tools/fallen-cards-and-first-aid.verify.mjs
// plays the built BATTLE-SANDBOX.html with the heroes idle and reads the cards against the engine's units. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { engineVocabulary } from '../../engine/src/core/vocabulary.js'

type E = { type: string; target?: number; actor?: number; side?: string; bleedOut?: number; reason?: string }
describe('the cards above the battle: the fallen leave, a downed hero\'s card wears a first-aid mark and the turns left', () => {
  const EV: E[] = JSON.parse(readFileSync('../viewer/battles/test.opening-bridge.json', 'utf8')).events
  const heroes = new Set(EV.filter((e) => e.type === 'unit.enter' && e.side === 'hero').map((e) => e.actor))
  it('the engine\'s log: a downed hero is given a bleed-out count, it steps down by one, and the hero dies when it runs out', () => {
    const downs = EV.map((e, i) => (e.type === 'life.downed' ? i : -1)).filter((i) => i >= 0)
    expect(downs.length).toBeGreaterThan(0)
    let bled = 0
    for (const i of downs) {
      const id = EV[i]!.target!
      expect(heroes.has(id)).toBe(true)
      const mine = EV.slice(i).filter((e) => e.target === id && /^bleedout\.|^life\./.test(e.type))
      expect(mine[0]!.type).toBe('life.downed')
      const set = mine.find((e) => e.type === 'bleedout.set')!
      expect(set.bleedOut).toBe(engineVocabulary().ruleBases.bleedOutTurns)       // the engine's own base count
      let last = set.bleedOut!
      /* a Turn's tick takes one; a blow on the downed (bleedout.accelerated) moves it by the steps the engine rolled, none or more — both state the new count */
      for (const e of mine.filter((x) => x.type === 'bleedout.tick' || x.type === 'bleedout.accelerated')) {
        if (e.type === 'bleedout.tick') expect(e.bleedOut).toBe(last - 1); else expect(e.bleedOut!).toBeLessThanOrEqual(last)
        last = e.bleedOut!
      }
      const dead = mine.find((e) => e.type === 'life.dead')
      if (dead) { expect(dead.reason).toBe('bledOut'); expect(last).toBeLessThanOrEqual(0); bled++ }
    }
    expect(bled).toBeGreaterThan(0)
  })
  it('the engine\'s log: an enemy is never downed — at 0 Health it dies; and nothing in the engine stands a downed unit up again', () => {
    for (const e of EV.filter((x) => x.type === 'life.downed')) expect(heroes.has(e.target)).toBe(true)
    expect(EV.some((e) => e.type === 'life.dead' && !heroes.has(e.target))).toBe(true)
    expect(EV.some((e) => e.type === 'life.standing')).toBe(false)
  })
  it('the viewer page: the fallen have no card; a downed hero\'s card wears the mark and the board\'s own count', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/fallen-cards-and-first-aid.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the viewer page: the card bar\'s own test, whose stale line about the fallen was rewritten as this rule', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/unit-card-bar.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: on the built BATTLE-SANDBOX.html (the Orphanage, the heroes idle) the cards follow the engine\'s units Turn by Turn', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/fallen-cards-and-first-aid.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/fallen-cards-and-first-aid.verify.mjs', 'scratch/fallen-cards-and-first-aid.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/fallen-cards-and-first-aid: .*passed/)
  }, 170000)
})
