// rule.immunity-is-resistance (2026-09-29, Andrew, DECISIONS.md 'the Ghost possesses on its Attack at 15%; every resistance
// works the one way, and it replaces immunity'): "So there is one way we're doing resistance. It should all be the same. ...
// Every type of resistance should work the same. Replaces previous immunity"
//
// LAW 10 — this file proved rule.badge-immunity (earlier the same day): a badge's immunity refused a status and zeroed a
// damage type. That mechanism is removed; the file now proves what replaced it. The one way is COMBAT-V2-DESIGN §8.2 —
// an element's resist reduces that element's damage flatly, dealt directly or by its status's tick, and never refuses or
// shortens a status — with the V2 migration's "elemental immunity becomes flat named resistance", one for one.
// was: 'Cold Heart: Karma and Frost never land …', 'a Frosted hero who gains Cold Heart loses the Frost …',
//      'Rotting Flesh: poison damage deals nothing …' (status.immune events, immuneTo rows, flatDamage immuneBy)
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { grantBadge } from '../src/core/mutate.js'
import { applyStatus, statusDamage } from '../src/core/status.js'
import { flatDamage } from '../src/core/mitigation.js'
import { effective } from '../src/core/stats.js'
import { BADGES } from '../src/content/index.js'
import { hexId } from './board16.js'

const field = () => {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }])
  const w = ctx.state.units[0]!
  w.hp = 999; w.maxHp = 999
  return { ctx, w }
}
const has = (w: { statuses: { id: string; value: number }[] }, id: string) => w.statuses.find((s) => s.id === id)?.value ?? 0

describe('immunity is resistance', () => {
  it('"immune to <element or its status>" is +1 of the element\'s resist; a status with no element is a named gap', () => {
    expect(BADGES['badge.cold-heart']!.statModifiers).toEqual({ maxHp: 2, coldResist: 1 })     // immune to Cold
    expect(BADGES['badge.frostborn']!.statModifiers).toEqual({ coldResist: 1 })                // Immune to Frost — Cold's status
    expect(BADGES['badge.rotting-flesh']!.statModifiers['poisonResist' as never]).toBe(1)     // immune to poison
    expect(BADGES['badge.cold-heart']!.gaps).toEqual(['immune to Karma'])
    expect(BADGES['badge.brave']!.gaps).toEqual(['immune to Weak'])
    for (const b of Object.values(BADGES)) expect('immuneTo' in b, b.id).toBe(false)
  })

  it('a resist never refuses a status: Cold Heart takes Frost and Karma as anyone does', () => {
    const { ctx, w } = field()
    grantBadge(ctx, w.id, 'badge.cold-heart', 'test')
    applyStatus(ctx, w.id, 'status.frost', 2, 'test')
    applyStatus(ctx, w.id, 'status.karma', 3, 'test')
    expect(has(w, 'status.frost')).toBe(2)
    expect(has(w, 'status.karma')).toBe(3)
  })

  it('one resist, both forms: Rotting Flesh takes one point off poison damage, direct or by the Poison tick, and the status stays', () => {
    const { ctx, w } = field()
    const direct0 = flatDamage(ctx, w, 5, 'poison').value
    grantBadge(ctx, w.id, 'badge.rotting-flesh', 'test')
    expect(effective(ctx, w, 'poisonResist').value).toBe(1)
    expect(flatDamage(ctx, w, 5, 'poison').value).toBe(direct0 - 1)
    applyStatus(ctx, w.id, 'status.poison', 3, 'test')
    expect(has(w, 'status.poison')).toBe(3)
    const hp = w.hp
    statusDamage(ctx, w.id, 3, 'status.poison')
    expect(hp - w.hp).toBe(2)
  })
})
