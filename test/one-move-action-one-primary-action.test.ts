// rule.one-move-action-one-primary-action (engine item) — the host's half, on the BUILT battle screen. Ruled 2026-10-06
// (Andrew, engine/DECISIONS.md 'an Activation is one move action and one primary action, in that order; a used-up power stays
// on the bar, greyed'): "All the player units get two actions: a move action and a primary action, in that order, every time
// they get activated."
//
// The item: "The bar and the kingdom's play input grey what the engine refuses - check on the built page that after a Leap the
// Move row is greyed and after a Move the special moves are greyed (already so by the walked rule)."
//
// No line of the play input changed for this rule (SWITCHES.md, the section of the same name): `moveDone` is read from the
// engine, so the Move row greys after a Leap because the engine now refuses the walk. What the play input itself holds is in
// test/play-input-choose.test.ts and test/bar-moves-grey-when-done.test.ts; this file holds the page.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'

describe('rule.one-move-action-one-primary-action — the built battle screen greys what the engine refuses', () => {
  it('the page: after its Leap the Iron Dwarf\'s Move row is greyed and the walk refused, after a Side Roll the Ranger\'s; after one hex of a walk every other movement is greyed and the rest of the walk is still the move action', () => {
    const out = execFileSync(process.execPath, ['tools/one-move-action-one-primary-action.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/one-move-action-one-primary-action: .* passed/)
    for (const line of out.split('\n').filter((l) => /^  /.test(l))) console.log(line)
  }, 240000)
})
