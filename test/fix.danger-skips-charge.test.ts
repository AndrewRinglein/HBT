// fix.danger-skips-charge (ruled 2026-10-02, Andrew, engine/DECISIONS.md 'the fast zombie's danger marker reads 3, not its
// Charge's 4': "You can change it to 3."). The danger marker reads the unit's first attack that is not a Charge, by the
// engine's own classification (isCharge, dumped as static.json actionKinds); a unit whose only attacks are Charges keeps
// its first. The engine's side: the fast zombie's first attack is its Charge (Strength 3 + 1) and its first non-Charge is
// its claw (Strength 3 + 0); the zombie's claw is 3; the test zombies' bite 4. The viewer's half
// (../viewer/tools/reads-engine.test.mjs, 'fix.danger-skips-charge') asks the viewer for the same readings. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createCustomBattle } from '../../engine/src/core/setup.js'
import { attacksOf, isCharge } from '../../engine/src/core/action.js'
import { ACTIONS, UNITS } from '../../engine/src/content/index.js'

const hit = (typeId: string, actionId: string) => {
  const u = UNITS[typeId] as unknown as Record<string, number>, a = ACTIONS[actionId]!.attack!
  return u[a.stat!]! + (a.bonus ?? 0)
}

describe('the danger marker skips a Charge', () => {
  it('the fast zombie: first attack its Charge (4), first non-Charge its claw (3)', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'unit.fast-zombie', hex: 200 }])
    const atk = attacksOf(ctx, ctx.state.units[1]!)
    expect(isCharge(atk[0]!)).toBe(true)
    expect(atk[0]!.id).toBe('move.fast-zombie.charge')
    expect(hit('unit.fast-zombie', atk[0]!.id)).toBe(4)
    const first = atk.find((a) => !isCharge(a))!
    expect(first.id).toBe('attack.zombie.claw')
    expect(hit('unit.fast-zombie', first.id)).toBe(3)
  })
  it('the zombie reads 3, the test zombies 4 — none of them leads with a Charge', () => {
    expect(UNITS['unit.zombie']!.attacks[0]).toBe('attack.zombie.claw')
    expect(hit('unit.zombie', 'attack.zombie.claw')).toBe(3)
    for (const t of ['test-zombie', 'test-zombie-burning']) {
      const a0 = UNITS[t]!.attacks[0]!
      expect(isCharge(ACTIONS[a0]!)).toBe(false)
      expect(hit(t, a0)).toBe(4)
    }
  })
  it('the viewer: the fast zombie\'s marker reads 3, the zombie 3, the test zombies 4', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/reads-engine.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# fail 0/)
    expect(out).toMatch(/\nok \d+ - fix\.danger-skips-charge /)
    if (process.env.VIEWER_PAGE) expect(out).toMatch(/\nok \d+ - the page carries the engine's tables\n/)
  }, 170000)
})
