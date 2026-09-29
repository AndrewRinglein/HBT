// badge.mechanism (2026-09-04). Ruled 2026-09-04 (DECISIONS.md "Deathbed
// Fighting, REVERSED" and its answers): badges are an engine type — the Hero
// badge, Wounded, the afflictions. A badge is a content row: stat modifiers
// folded onto the unit, granted actions, riders, and flags the rules read. It
// is on a unit from fielding (the row's own, or the list the kingdom hands
// over) or granted mid-battle. The two test rows prove the mechanism before
// content authors badge.hero and badge.wounded.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { badgeFlags, beginActivation, grantBadge } from '../src/core/mutate.js'
import { performAttack } from '../src/core/pipeline.js'
import { effective } from '../src/core/stats.js'
import { BADGES, UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from './board16.js'

const SKIN = 'test.badge.iron-skin', BRAND = 'test.badge.brand'

describe('the registry', () => {
  it('the Codex badge rows compile — modifiers, grants, flags, and every unexpressed clause named as a gap', () => {
    const rows = Object.values(BADGES).filter((b) => b.id.startsWith('badge.'))
    expect(rows.length).toBeGreaterThan(150)
    for (const b of rows) {
      expect(b.id.startsWith('badge.')).toBe(true)
      expect(Array.isArray(b.grants)).toBe(true)
      for (const v of Object.values(b.statModifiers)) expect(typeof v).toBe('number')
    }
    // the afflictions are rows, their stats compiled, their hooks named as gaps until badge.afflictions
    expect(BADGES['badge.lycanthropy']!.statModifiers).toMatchObject({ strength: 2, movement: 2 })
    // LAW 10 — content.afflictions-revised (2026-09-29, Andrew, DECISIONS.md 'the four afflictions'): Vampirism was
    // rewritten whole and the undefined blood drain is gone — "They gain the power of flight. Which uses movement +1".
    // The claim (the row's grant compiles) is unchanged; the authored grant is.
    // was: expect(BADGES['badge.vampirism']!.grants).toContain('power.vampirism.blood-drain')
    expect(BADGES['badge.vampirism']!.grants).toContain('power.flight-vampiric')
    expect(BADGES['badge.possession']!.statModifiers).toMatchObject({ magic: 2, vision: 3 })
    // content c24b1ac (2026-09-04): the two rows the rules read by role are data now
    expect(BADGES['badge.wounded']!.statModifiers).toEqual({ accuracy: -10, dodge: -10, strength: -1, precision: -1, maxHp: -2 })
    expect(BADGES['badge.wounded']!.flags.wounded).toBe(true)
    expect(BADGES['badge.hero']!.flags.bleedsOut).toBe(true)
    expect(BADGES['badge.hero']!.statModifiers).toEqual({})
  })
  it('the two test badges are the mechanism\'s two instances: modifiers only, and a rider plus a flag', () => {
    expect(BADGES[SKIN]!.statModifiers).toEqual({ armor: 2, dodge: -5 })
    expect(BADGES[BRAND]!.triggers?.length).toBe(1)
    expect(BADGES[BRAND]!.flags.bleedsOut).toBe(true)
    expect(BADGES[BRAND]!.triggers![0]!.source).toBe(BRAND)
  })
})

describe('at fielding', () => {
  it('a hero handed badges wears them: modifiers folded, the rider attached, the flag readable, one unit.badged line each', () => {
    const bare = UNITS['test-warrior']!
    const ctx = createBattle(scenarioOptions(SCENARIOS['showcase.badged']!))
    const w = ctx.state.units[0]!
    expect(w.badges).toEqual(['badge.hero', SKIN, BRAND])   // the row's own Hero badge first (every hero row carries it, 2026-09-04), then the list handed over
    expect(w.armor).toBe(bare.armor + 2)
    expect(w.dodge).toBe(bare.dodge - 5)
    expect(w.strength).toBe(bare.strength + 1)
    expect(w.triggers.some((t) => t.id === 'trigger.test-brand.sear')).toBe(true)
    expect(badgeFlags(ctx, w)).toEqual({ bleedsOut: true, wounded: false })   // bleedsOut from both the Hero badge and the Brand
    const lines = ctx.events.filter((e) => e.type === 'unit.badged' && e['actor'] === w.id)
    expect(lines.map((e) => e.causeId)).toEqual(['badge.hero', SKIN, BRAND])
    expect(lines[1]!['mods']).toEqual({ armor: 2, dodge: -5 })
  })
  it('a list that does not correspond to the heroes is refused, and an unknown badge is loud', () => {
    const base = scenarioOptions(SCENARIOS['showcase.badged']!)
    expect(() => createBattle({ ...base, heroBadges: [[SKIN], [SKIN]] })).toThrow(/badge lists/)
    expect(() => createBattle({ ...base, heroBadges: [['badge.nobody']] })).toThrow(/not a badge/)
  })
  it('the same badge twice is once', () => {
    const ctx = createBattle({ ...scenarioOptions(SCENARIOS['showcase.badged']!), heroBadges: [[SKIN, SKIN]] })
    expect(ctx.state.units[0]!.badges).toEqual(['badge.hero', SKIN])
    expect(ctx.state.units[0]!.armor).toBe(UNITS['test-warrior']!.armor + 2)
  })
})

describe('granted mid-battle', () => {
  it('grantBadge puts the modifiers on as stored mods, attaches the rider, logs badge.gained, and refuses a repeat', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const w = ctx.state.units[0]!, z = ctx.state.units[1]!
    const armor0 = effective(ctx, w, 'armor').value
    expect(grantBadge(ctx, w.id, SKIN, 'test')).toBe(true)
    expect(w.badges).toEqual(['badge.hero', SKIN])
    expect(effective(ctx, w, 'armor').value).toBe(armor0 + 2)
    expect(ctx.events.some((e) => e.type === 'badge.gained' && e.causeId === 'test' && e['badgeId'] === SKIN)).toBe(true)
    expect(grantBadge(ctx, w.id, SKIN, 'test')).toBe(false)
    expect(ctx.events.some((e) => e.type === 'badge.held')).toBe(true)
    // the Brand's rider sears on the next hit
    grantBadge(ctx, w.id, BRAND, 'test')
    w.mods.push({ stat: 'accuracy', op: 'add', value: 200, source: 'test', scope: 'unit' })
    z.hp = 99; z.maxHp = 99
    beginActivation(ctx, w.id, 'test')
    performAttack(ctx, w.id, z.id, w.actions[0]!)
    expect(z.statuses.find((s) => s.id === 'status.burn')?.value).toBe(1)
    expect(ctx.events.some((e) => e.type === 'trigger.fired' && e.causeId === 'trigger.test-brand.sear')).toBe(true)
  })
})

describe('live', () => {
  it('the badged warrior\'s brand sears a zombie in the showcase battle', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['showcase.badged']!))
    runBattle(ctx)
    expect(ctx.events.some((e) => e.type === 'trigger.fired' && e.causeId === 'trigger.test-brand.sear')).toBe(true)
  })
})
