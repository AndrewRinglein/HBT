import { describe, it, expect } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import {
  validateTargeting, eligible, resolveTargets, hasAnyTarget,
  TARGET_SIDES, TARGET_SELECTS,
} from '../src/core/target.js'
import type { Targeting } from '../src/core/target.js'
import { partySum, partySpiritSum, valueOf } from '../src/core/trigger.js'
import { hexId } from '../src/core/hex.js'

// A priest, two allies, three enemies, spread out.
function board() {
  const ctx = createCustomBattle(
    [{ type: 'test-mage', hex: hexId(5, 5) },      // 0 — the actor
     { type: 'test-warrior', hex: hexId(6, 5) },   // 1 — ally, adjacent
     { type: 'test-ranger', hex: hexId(5, 9) }],   // 2 — ally, far
    [{ type: 'test-zombie', hex: hexId(4, 5) },    // 3 — enemy, adjacent
     { type: 'test-zombie', hex: hexId(7, 5) },    // 4 — enemy, 2 away
     { type: 'test-zombie', hex: hexId(5, 11) }],  // 5 — enemy, far
    { mapId: 'map.open' })
  return ctx
}
const T = (o: Partial<Targeting> = {}): Targeting => ({ select: 'unit', side: 'enemy', ...o })

describe('targeting — the five shapes Angela specified', () => {
  it('self', () => {
    const ctx = board()
    expect(resolveTargets(ctx, ctx.state.units[0]!, T({ select: 'self', side: 'any' }), -1)).toEqual([0])
  })

  it('an ally or an enemy — one unit, either side', () => {
    const ctx = board()
    const a = ctx.state.units[0]!
    expect(resolveTargets(ctx, a, T({ select: 'unit', side: 'any' }), 1)).toEqual([1])
    expect(resolveTargets(ctx, a, T({ select: 'unit', side: 'any' }), 3)).toEqual([3])
  })

  it('all allies in an area', () => {
    const ctx = board()
    const got = resolveTargets(ctx, ctx.state.units[0]!, T({ select: 'area', side: 'ally', radius: 2 }), 0)
    expect(got).toEqual([0, 1])          // self and the adjacent warrior; the far ranger is out
  })

  it('all enemies in an area', () => {
    const ctx = board()
    const got = resolveTargets(ctx, ctx.state.units[0]!, T({ select: 'area', side: 'enemy', radius: 2 }), 0)
    expect(got).toEqual([3, 4])          // both near zombies, not the far one
  })

  it('an area — both sides', () => {
    const ctx = board()
    const got = resolveTargets(ctx, ctx.state.units[0]!, T({ select: 'area', side: 'any', radius: 1 }), 0)
    expect(got).toEqual([0, 1, 3])
  })

  it('an area with no radius reaches the whole side — "heal all rangers"', () => {
    const ctx = board()
    const got = resolveTargets(ctx, ctx.state.units[0]!, T({ select: 'area', side: 'ally' }), 0)
    expect(got).toEqual([0, 1, 2])       // including the far ranger
  })
})

describe('targeting — by type', () => {
  it('"target undead" only reaches the undead', () => {
    const ctx = board()
    for (const id of [3, 4, 5]) (ctx.state.units[id] as unknown as { tags: string[] }).tags = ['undead']
    ;(ctx.state.units[1] as unknown as { tags: string[] }).tags = ['hero']
    const a = ctx.state.units[0]!
    expect(resolveTargets(ctx, a, T({ select: 'area', side: 'any', requireTags: ['undead'] }), 0))
      .toEqual([3, 4, 5])
    // aimed at a living ally, an undead-only ability finds nothing
    expect(resolveTargets(ctx, a, T({ select: 'unit', side: 'any', requireTags: ['undead'] }), 1)).toEqual([])
  })

  it('"heal all rangers" — hero AND type, both required', () => {
    const ctx = board()
    ;(ctx.state.units[1] as unknown as { tags: string[] }).tags = ['hero', 'warrior']
    ;(ctx.state.units[2] as unknown as { tags: string[] }).tags = ['hero', 'ranger']
    const got = resolveTargets(ctx, ctx.state.units[0]!,
      T({ select: 'area', side: 'ally', requireTags: ['hero', 'ranger'] }), 0)
    expect(got).toEqual([2])             // the ranger, not the warrior
  })

  it('an untagged unit matches nothing that requires a tag', () => {
    const ctx = board()
    expect(ctx.state.units[3]!.tags).toEqual([])
    expect(eligible(ctx.state.units[0]!, ctx.state.units[3]!, T({ requireTags: ['undead'] }))).toBe(false)
  })
})

describe('targeting — legality is answered before the stamina is spent', () => {
  it('"target undead" is not castable on a board with no undead', () => {
    const ctx = board()
    const a = ctx.state.units[0]!
    expect(hasAnyTarget(ctx, a, T({ requireTags: ['undead'] }), 99)).toBe(false)
    ;(ctx.state.units[3] as unknown as { tags: string[] }).tags = ['undead']
    expect(hasAnyTarget(ctx, a, T({ requireTags: ['undead'] }), 99)).toBe(true)
  })

  it('range is part of legality', () => {
    const ctx = board()
    const a = ctx.state.units[0]!
    expect(hasAnyTarget(ctx, a, T({ side: 'enemy' }), 1)).toBe(true)    // the adjacent zombie
    expect(hasAnyTarget(ctx, a, T({ side: 'enemy' }), 0)).toBe(false)   // none at range 0
  })

  // RULED, Angela 2026-08-15: "I don't think we're ever gonna use exclude self.
  // Because it's already either including or excluding heroes or things by target,
  // but I don't think self will ever be one of those."
  //
  // So there is no opt-out and no flag — the actor is always one of its own allies.
  // The `excludeSelf` field was deleted rather than left as an unused escape hatch.
  it('the actor is ALWAYS one of its own allies — there is no opt-out', () => {
    const ctx = board()
    const a = ctx.state.units[0]!
    expect(hasAnyTarget(ctx, a, T({ side: 'ally' }), 0)).toBe(true)
    expect(resolveTargets(ctx, a, T({ select: 'area', side: 'ally', radius: 0 }), 0)).toEqual([0])
    // a self-targeted heal reaches the healer, at every radius, on both sidedness settings
    expect(resolveTargets(ctx, a, T({ select: 'area', side: 'ally', radius: 9 }), 0)).toContain(0)
    expect(resolveTargets(ctx, a, T({ select: 'area', side: 'any', radius: 0 }), 0)).toEqual([0])
  })

  it('an unknown Targeting key is not silently ignored', () => {
    // excludeSelf is gone; TypeScript rejects it at compile time, and a hand-written
    // object literal carrying it would simply have no effect. Asserted so that
    // deleting the field cannot quietly become "the flag stopped working."
    const ctx = board()
    const a = ctx.state.units[0]!
    const withStaleFlag = { select: 'area', side: 'ally', radius: 0, excludeSelf: true } as unknown as Targeting
    expect(resolveTargets(ctx, a, withStaleFlag, 0)).toEqual([0])
  })

  it('the dead are never a target', () => {
    const ctx = board()
    ctx.state.units[3]!.lifeState = 'dead'
    expect(resolveTargets(ctx, ctx.state.units[0]!, T({ select: 'area', side: 'enemy', radius: 9 }), 0))
      .toEqual([4, 5])
  })
})

describe('targeting — a typo fails loudly, at load', () => {
  it('rejects unknown select and side', () => {
    expect(() => validateTargeting({ select: 'evrywhere' as never, side: 'ally' }, 'x')).toThrow(/select/)
    expect(() => validateTargeting({ select: 'unit', side: 'freind' as never }, 'x')).toThrow(/side/)
  })
  it('rejects a radius on a non-area, and a negative radius', () => {
    expect(() => validateTargeting({ select: 'unit', side: 'ally', radius: 2 }, 'x')).toThrow(/radius only/)
    expect(() => validateTargeting({ select: 'area', side: 'ally', radius: -1 }, 'x')).toThrow(/non-negative/)
  })
  it('rejects self with an enemy side, and an empty tag', () => {
    expect(() => validateTargeting({ select: 'self', side: 'enemy' }, 'x')).toThrow(/self/)
    expect(() => validateTargeting({ select: 'unit', side: 'ally', requireTags: [''] }, 'x')).toThrow(/tag/)
  })
  it('the vocabularies are closed', () => {
    expect(TARGET_SELECTS).toEqual(['self', 'unit', 'area'])
    expect(TARGET_SIDES).toEqual(['ally', 'enemy', 'any'])
  })
})

// ─── Spirit, per Angela 2026-08-15 ──────────────────────────────────────────
describe('Spirit — identical to Magic, including the party-wide sum', () => {
  it('sums across the side, and the dead do not count', () => {
    const ctx = board()
    ctx.state.units[0]!.spirit = 2                 // the Priest-to-be
    expect(partySpiritSum(ctx, 'hero')).toBe(2)
    ctx.state.units[1]!.spirit = 3
    expect(partySpiritSum(ctx, 'hero')).toBe(5)
    ctx.state.units[1]!.lifeState = 'dead'
    expect(partySpiritSum(ctx, 'hero')).toBe(2)
    expect(partySum(ctx, 'hero', 'spirit')).toBe(2)
  })

  it('Heal Ally is 6 + 2 x Spirit — and still 6 at Spirit 0', () => {
    // "even if the spirit was zero, he would still have his heal of six"
    const ctx = board()
    const spec = { scale: 'partySpirit', mult: 2, base: 6, round: 'down' } as const
    const priest = ctx.state.units[0]!
    expect(partySpiritSum(ctx, 'hero')).toBe(0)
    expect(valueOf(ctx, priest, spec)).toBe(6)     // base survives a zero stat
    priest.spirit = 2
    expect(valueOf(ctx, priest, spec)).toBe(10)    // 6 + 2x2
  })
})
