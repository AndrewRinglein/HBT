// fix.badge-surge-at-fielding (2026-09-29, Andrew, DECISIONS.md 'Possession's Surge loads at fielding'):
// "The -10 surge per turn cannot be relevant until the next battle. It can be loaded on load."
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { grantBadge } from '../src/core/mutate.js'
import { effective } from '../src/core/stats.js'
import { BADGES } from '../src/content/index.js'
import { hexId } from './board16.js'

describe('a badge\'s Surge folds at fielding, never mid-battle', () => {
  it('Possession granted mid-battle: Magic, Resist and Vision now; the −10 Surge waits, named on the gain line', () => {
    expect((BADGES['badge.possession']!.statModifiers as Record<string, number>)['surge']).toBe(-10)
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }])
    const w = ctx.state.units[0]!
    const surge0 = w.surge, magic0 = effective(ctx, w, 'magic').value, vision0 = effective(ctx, w, 'vision').value
    expect(grantBadge(ctx, w.id, 'badge.possession', 'test')).toBe(true)
    expect(w.surge).toBe(surge0)
    expect(w.mods.some((m) => (m.stat as string) === 'surge')).toBe(false)
    expect(ctx.events.filter((e) => e.type === 'statmod.added').map((e) => e['stat'])).not.toContain('surge')
    expect(effective(ctx, w, 'magic').value).toBe(magic0 + 2)
    expect(effective(ctx, w, 'vision').value).toBe(vision0 + 3)
    const gained = ctx.events.find((e) => e.type === 'badge.gained' && e['badgeId'] === 'badge.possession')!
    expect(gained['atFielding']).toEqual({ surge: -10 })
  })

  // Law 10, content.afflictions-at-zero (2026-10-01; DECISIONS.md 'bleed-out is a stat on every player unit, 5; Rotting
  // Flesh +5'): Rotting Flesh gained a stat the runtime never resolves (+5 bleed-out), so it no longer has "no such stat".
  // The claim is kept on a badge that still has none (Vampirism), and Rotting Flesh now names its one fielding-only stat.
  // was: it('a badge with no such stat names nothing: Rotting Flesh\'s gain line carries no atFielding', () => {
  // was:   grantBadge(ctx, ctx.state.units[0]!.id, 'badge.rotting-flesh', 'test') … expect('atFielding' in gained).toBe(false)
  it('a badge with no such stat names nothing: Vampirism\'s gain line carries no atFielding', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }])
    grantBadge(ctx, ctx.state.units[0]!.id, 'badge.vampirism', 'test')
    const gained = ctx.events.find((e) => e.type === 'badge.gained')!
    expect('atFielding' in gained).toBe(false)
  })

  // Law 10, rule.afflictions-at-zero (2026-10-02): this asserted that Rotting Flesh's +5 bleed-out waits for the next
  // fielding (atFielding { bleedOutTurns: 5 }) — content.afflictions-at-zero's provisional switch rottingFleshBleedOutMidBattle,
  // which left the question to this item. Bleed-out is read off the unit the moment it goes down, as a badge's Deathbed
  // points are read at the roll, so the +5 counts from the gain (SWITCHES.md bleedOutMidBattle) and nothing waits.
  it('Rotting Flesh granted mid-battle carries its +5 bleed-out at once; nothing waits for the next fielding', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }])
    grantBadge(ctx, ctx.state.units[0]!.id, 'badge.rotting-flesh', 'test')
    const gained = ctx.events.find((e) => e.type === 'badge.gained')!
    // was: expect(gained['atFielding']).toEqual({ bleedOutTurns: 5 })
    expect('atFielding' in gained).toBe(false)
    expect(ctx.state.units[0]!.bleedOutTurns).toBe(5)
  })

  it('fielded already Possessed (the next battle), the hero carries its −10 Surge', () => {
    const opts = (heroBadges: string[][]) => ({ replicate: 0, mapId: 'map.open', heroes: ['test-warrior'], heroHexes: [85], enemies: ['test-zombie'], enemyHexes: [140], enemyCount: 1, heroBadges })
    const plain = createBattle(opts([[]]))
    const possessed = createBattle(opts([['badge.possession']]))
    expect(possessed.state.units[0]!.badges).toContain('badge.possession')
    expect(possessed.state.units[0]!.surge).toBe(plain.state.units[0]!.surge - 10)
  })
})
