// kingdom.play-launcher (engine DECISIONS.md 2026-09-30 "the game plays from a link"). Andrew: "I don't want to have to
// go dig for bat files. I want a way to play this game out of a link." · chose "Local link on this PC" · "Make me a game
// launcher where I can play the various battles." Expect: "http://127.0.0.1:4230/play shows the launcher with the
// Orphanage, Lumberjack House, Bridge and Cavern Trail; clicking a battle opens it straight into the battle screen; no
// .bat is run." The engine's side: the battles and their order are the engine's encounters and scenarios. The kingdom's
// half (../kingdom/tools/play-launcher.verify.mjs) checks the COMMITTED launcher against them and that the server
// answers /play with it. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { ENCOUNTERS } from '../src/content/index.js'
import { SCENARIOS } from '../src/content/scenarios.js'

describe('the game plays from a link: the launcher', () => {
  it('the opening\'s first four battles are engine encounters, in that order', () => {
    const order = Object.values(SCENARIOS as Record<string, any>).filter(s => s.openingPosition && s.encounterId).sort((a, b) => a.openingPosition - b.openingPosition)
    expect(order.slice(0, 4).map(s => (ENCOUNTERS as Record<string, any>)[s.encounterId].name)).toEqual(['Orphanage', 'Lumberjack House', 'Bridge', 'Cavern Trail'])
  })
  it('the launcher lists every playable battle in that order, each straight into the battle screen, and /play serves it', () => {
    const out = execFileSync(process.execPath, ['tools/play-launcher.verify.mjs', 'PLAY.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/play launcher: 4 battles \(Orphanage, Lumberjack House, Bridge, Cavern Trail\).*passed/)
  }, 60000)
})
