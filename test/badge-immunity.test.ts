// rule.badge-immunity (2026-09-29, Andrew, DECISIONS.md 'Possession's Surge loads at fielding; the Ghost inflicts
// Possession; Deathbed Fighting and Cold Heart's immunities are built'): "Cold Hard badge gives Immune to Karma 2,
// Immune to Cold 2" · "I meant immune to Karma, too. As written, it is another type of status." · "Fire and burn are
// the same thing ... I guess this is immune to cold, and it resists both frost status and cold damage." · "yes".
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { grantBadge } from '../src/core/mutate.js'
import { applyStatus } from '../src/core/status.js'
import { flatDamage } from '../src/core/mitigation.js'
import { BADGES } from '../src/content/index.js'
import { hexId } from './board16.js'

const field = () => {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }])
  return { ctx, w: ctx.state.units[0]! }
}
const has = (w: { statuses: { id: string; value: number }[] }, id: string) => w.statuses.find((s) => s.id === id)?.value ?? 0

describe('immunity from badges', () => {
  it('the rows: Cold Heart is immune to Karma and Frost, its cold damage a named gap; Rotting Flesh to poison, status and damage', () => {
    expect(BADGES['badge.cold-heart']!.immuneTo).toEqual({ statuses: ['status.karma', 'status.frost'] })
    expect(BADGES['badge.cold-heart']!.gaps).toContain('immune to Cold: cold damage — the engine has no cold damage type')
    expect(BADGES['badge.rotting-flesh']!.immuneTo).toEqual({ statuses: ['status.poison'], damage: ['poison'] })
    expect(BADGES['badge.brave']!.immuneTo).toEqual({ statuses: ['status.weak'] })
    expect(BADGES['badge.vampirism']!.immuneTo).toBeUndefined()
  })

  it('Cold Heart: Karma and Frost never land, each refusal names the badge; Burn still lands', () => {
    const { ctx, w } = field()
    grantBadge(ctx, w.id, 'badge.cold-heart', 'test')
    applyStatus(ctx, w.id, 'status.frost', 2, 'test')
    applyStatus(ctx, w.id, 'status.karma', 3, 'test')
    applyStatus(ctx, w.id, 'status.burn', 1, 'test')
    expect(has(w, 'status.frost')).toBe(0)
    expect(has(w, 'status.karma')).toBe(0)
    expect(has(w, 'status.burn')).toBe(1)
    const refused = ctx.events.filter((e) => e.type === 'status.immune')
    expect(refused.map((e) => [e['statusId'], e['badgeId'], e['value']])).toEqual([['status.frost', 'badge.cold-heart', 2], ['status.karma', 'badge.cold-heart', 3]])
  })

  it('a Frosted hero who gains Cold Heart loses the Frost at once, the badge the cause', () => {
    const { ctx, w } = field()
    applyStatus(ctx, w.id, 'status.frost', 2, 'test')
    expect(has(w, 'status.frost')).toBe(2)
    grantBadge(ctx, w.id, 'badge.cold-heart', 'test')
    expect(has(w, 'status.frost')).toBe(0)
    expect(ctx.events.some((e) => e.causeId === 'badge.cold-heart' && e['statusId'] === 'status.frost')).toBe(true)
  })

  it('Rotting Flesh: poison damage deals nothing and names the badge; other damage is untouched; true damage is never resisted', () => {
    const { ctx, w } = field()
    const before = flatDamage(ctx, w, 5, 'poison')
    grantBadge(ctx, w.id, 'badge.rotting-flesh', 'test')
    const poison = flatDamage(ctx, w, 5, 'poison')
    expect(before.value).toBeGreaterThan(0)
    expect(poison.value).toBe(0)
    expect(poison.resisted).toBe(5)
    expect(poison.immuneBy).toBe('badge.rotting-flesh')
    expect(flatDamage(ctx, w, 5, 'fire').immuneBy).toBeUndefined()
    expect(flatDamage(ctx, w, 5, 'true').value).toBe(5)
    applyStatus(ctx, w.id, 'status.poison', 3, 'test')
    expect(has(w, 'status.poison')).toBe(0)
  })
})
