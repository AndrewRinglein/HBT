// viewer.unit-card-bar (engine DECISIONS.md 2026-10-01, Andrew: "We also need a character selector bar above the screen …
// And I can use that to target things as well as clicking on them."). Expect: "In the sandbox the strip of every unit's card
// sits above the board; clicking a hero's card starts its activation; with an attack chosen, clicking an enemy's card aims and
// confirms exactly as clicking its body." The kingdom's half (tools/sandbox-card-bar.verify.mjs) plays the COMMITTED sandbox.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'

describe('the unit-card bar in the sandbox', () => {
  it('every unit\'s card above the board; a card begins the hero, chooses the next, and plans as the body', () => {
    const out = execFileSync(process.execPath, ['tools/sandbox-card-bar.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/sandbox card bar: .*passed/)
  }, 90000)
})
