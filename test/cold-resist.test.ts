// rule.cold-resist (2026-09-29, Andrew, DECISIONS.md 'the Ghost as the bestiary has it; Cold Resist; "Immune X 1" is a
// resistance of 1'): "Should cold damage get its own resistance stat, like fire resistance, now that Cold is an
// element?" — "Yes." Cold is a damage type; Cold Resist mitigates it as Fire Resist mitigates fire.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { grantBadge, addStatMod } from '../src/core/mutate.js'
import { flatDamage } from '../src/core/mitigation.js'
import { effective, isStatName } from '../src/core/stats.js'
import { DAMAGE_TYPES } from '../src/core/types.js'
import { engineVocabulary } from '../src/core/vocabulary.js'
import { hexId } from './board16.js'

const field = () => {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }])
  return { ctx, w: ctx.state.units[0]! }
}

describe('cold, an element with its own resistance', () => {
  it('cold is a damage type and Cold Resist a stat — resolvable, foldable, and in the vocabulary content reads', () => {
    expect(DAMAGE_TYPES).toContain('cold')
    expect(isStatName('coldResist')).toBe(true)
    expect(engineVocabulary().stats).toContain('coldResist')
    expect(engineVocabulary().damageTypes).toContain('cold')
  })
  it('Cold Resist mitigates cold damage point for point, and only cold', () => {
    const { ctx, w } = field()
    expect(effective(ctx, w, 'coldResist').value).toBe(0)
    const bare = flatDamage(ctx, w, 5, 'cold')
    addStatMod(ctx, w.id, { stat: 'coldResist', op: 'add', value: 2, source: 'test', scope: 'unit' }, 'test')
    const resisted = flatDamage(ctx, w, 5, 'cold')
    expect(resisted.value).toBe(bare.value - 2)
    expect(resisted.resisted).toBe(bare.resisted + 2)
    expect(flatDamage(ctx, w, 5, 'fire').value).toBe(flatDamage(ctx, field().w, 5, 'fire').value)
  })
  it('Cold Heart is immune to cold damage: none of it lands, the badge named', () => {
    const { ctx, w } = field()
    grantBadge(ctx, w.id, 'badge.cold-heart', 'test')
    const r = flatDamage(ctx, w, 7, 'cold')
    expect(r.value).toBe(0)
    expect(r.immuneBy).toBe('badge.cold-heart')
  })
})
