// kingdom.civilians-played (DECISIONS.md 2026-09-30 "the civilians are played; no 2D before the 3D bodies"). Andrew:
// "There's no movement for the child when I click on it, so the civilians, I think, aren't activating properly."
// (2026-08-26: "Civilians are exactly like heroes.") Expect: "In BATTLE-SANDBOX.html?play=encounter.opening.orphanage,
// clicking the Orphan Child in the Hero Phase starts its activation and shows where it can move; it moves where clicked;
// End Turn's pop-up names the civilians that have not acted." The engine's side: the encounter fields its civilians on
// the heroes' side, and the control policy — not allegiance — decides who the player plays (core/control.ts). The
// kingdom's half (../kingdom/tools/sandbox-civilians.verify.mjs) plays the COMMITTED sandbox. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { ENCOUNTERS, UNITS } from '../src/content/index.js'

describe('the civilians are played, like the heroes', () => {
  it("battle 1's civilians are the Orphan Child and the School Teacher, fielded on the heroes' side", () => {
    const civ = (ENCOUNTERS as Record<string, any>)['encounter.opening.orphanage'].setup.filter((f: any) => f.civilian).map((f: any) => f.unit).sort()
    expect(civ).toEqual(['hero.fixed.orphans', 'hero.fixed.school-teacher'])
    for (const t of civ) expect((UNITS as Record<string, any>)[t].side).toBe('hero')
  })
  it('the sandbox: the child is the player\'s - named among those yet to act, clicked to act, walked where clicked', () => {
    const out = execFileSync(process.execPath, ['tools/sandbox-civilians.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/sandbox civilians: .*passed/)
  }, 90000)
})
