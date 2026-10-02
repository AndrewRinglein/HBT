// fix.codex-numbers (2026-10-01) — DECISIONS.md 2026-09-28 "the duplication review, ruled",
// findings C1 C2 C5 C8 C9 C21 K7. Andrew: "Crit base 3 should be counted once." "Let's do
// 2,515 XP by tier" (read as the Codex's xpByTier 2 / 5 / 15).
//
// (1) Crit: the engine's 3 (CRIT_BASE) is the rule; the pack carries each unit's Codex total
//     minus 3 — a level-1 warrior rolls 3 before gear, a rogue 5 — and an enemy's authored
//     total the same way (the Bloodhound's 10 is a 7 over the base).
// (2) Vision: every hero sees the battlefield's 6; the Codex class value is a delta of 0.
// (3) Bleed-out and Deathbed: the formulas stay the engine's; bleedOutTurns and
//     deathbedFighting fold like any stat. A Death Seeker ("Turns to Bleed out -3") bleeds
//     out in 2; its "Deathbed +40" rides the badge, read at the roll.
// (6) The pack carries each enemy's tier and the xpByTier price list.
import { describe, expect, it } from 'vitest'
import { preview, CRIT_BASE } from '../src/core/pipeline.js'
import { BATTLEFIELD_VISION, visionOf } from '../src/core/vision.js'
import { bleedOutCounterOf, settle, BLEED_OUT_COUNTER } from '../src/core/settle.js'
import { createBattle } from '../src/core/setup.js'
import { engineVocabulary } from '../src/core/vocabulary.js'
import { ACTIONS, BADGES, UNITS, XP_BY_TIER } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

const rig = (heroes: string[], heroHexes: number[], enemies: string[], enemyHexes: number[], heroBadges?: string[][]) =>
  createBattle({ ...scenarioOptions(scenarioDef('showcase.alpha-team')), heroes, heroHexes, enemies, enemyHexes, enemyCount: enemies.length, ...(heroBadges ? { heroBadges } : {}) })

/** The unit's own crit chance: the preview's, less the weapon's crit field and any surplus accuracy (the target has no Luck). */
function chanceBeforeGear(heroType: string, attackId: string): number {
  const ctx = rig([heroType], [135], ['unit.zombie'], [118])
  const hero = ctx.state.units.find((u) => u.typeId === heroType)!
  const z = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!
  expect(z.luck).toBe(0)
  const pv = preview(ctx, hero.id, z.id, attackId)
  const surplus = pv.accuracy > 100 ? Math.trunc((pv.accuracy - 100) / 4) : 0
  return pv.critChance - (ACTIONS[attackId]!.attack!.crit ?? 0) - surplus
}

describe('crit base 3 is counted once (C1)', () => {
  it('a level-1 warrior rolls 3 and a rogue 5, before gear', () => {
    expect(CRIT_BASE).toBe(3)
    expect(chanceBeforeGear('alpha-oathblade', 'attack.halberd.hack')).toBe(3)
    expect(chanceBeforeGear('alpha-sky-pirate', 'attack.dagger.stab')).toBe(5)
  })

  it('the pack carries the Codex total over the base: warrior none, rogue +2, the Orphan Child 20 → 17', () => {
    expect(UNITS['hero.base.warrior-iron']!.crit ?? 0).toBe(0)
    expect(UNITS['hero.base.rogue-raven']!.crit).toBe(2)
    expect(UNITS['hero.fixed.orphans']!.crit).toBe(17)
  })

  it('an enemy\'s authored crit is a total too: the Bloodhound 10 → 7, the Eyeblight\'s 0 → −3 (its surplus is its only crit)', () => {
    expect(UNITS['unit.bloodhound']!.crit).toBe(7)
    expect(UNITS['unit.doombringer']!.crit).toBe(22)
    expect(UNITS['unit.eyeblight']!.crit).toBe(-3)
    expect(UNITS['unit.zombie']!.crit ?? 0).toBe(0)   // no authored crit: the base itself
  })
})

describe('every hero sees 6 (C2)', () => {
  it('no hero row carries a vision of its own, and a fielded hero sees the battlefield\'s 6', () => {
    expect(BATTLEFIELD_VISION).toBe(6)
    for (const [id, u] of Object.entries(UNITS)) if (u.side === 'hero' && (id.startsWith('hero.') || id.startsWith('alpha-'))) expect([id, u.vision ?? 0]).toEqual([id, 0])
    const ctx = rig(['alpha-dusk-hawk', 'alpha-sky-pirate', 'alpha-air-mage'], [135, 136, 137], ['unit.zombie'], [118])
    for (const u of ctx.state.units.filter((x) => x.side === 'hero')) expect(visionOf(ctx, u)).toBe(6)
  })
})

describe('bleed-out and Deathbed fold like any stat (C9)', () => {
  it('a Death Seeker bleeds out in 2: its −3 folds at fielding, onto the ruled 5', () => {
    expect(BLEED_OUT_COUNTER).toBe(5)
    expect((BADGES['badge.death-seeker']!.statModifiers as Record<string, number>)['bleedOutTurns']).toBe(-3)
    const ctx = rig(['alpha-oathblade'], [135], ['unit.zombie'], [118], [['badge.death-seeker']])
    const w = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    expect(w.bleedOutTurns).toBe(-3)
    expect(bleedOutCounterOf(w)).toBe(2)
    // fall for certain (a chance of 0 cannot stand) and watch the counter
    w.toughness = -40
    w.hp = 0
    settle(ctx, 'test')
    expect(w.lifeState).toBe('downed')
    expect(w.bleedOut).toBe(2)
    expect(ctx.events.find((e) => e.type === 'bleedout.set' && e['target'] === w.id)!['bleedOut']).toBe(2)
  })

  it('Survivor and Thick Blooded lengthen it; a hero with none bleeds for the ruled 5', () => {
    expect((BADGES['badge.survivor']!.statModifiers as Record<string, number>)['bleedOutTurns']).toBe(3)
    expect((BADGES['badge.thick-blooded']!.statModifiers as Record<string, number>)['bleedOutTurns']).toBe(5)
    const ctx = rig(['alpha-oathblade'], [135], ['unit.zombie'], [118])
    expect(bleedOutCounterOf(ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!)).toBe(5)
  })

  it('"Deathbed +40" rides the badge and is read at the roll; a level pick folds Deathbed Fighting as a stat', () => {
    expect(BADGES['badge.death-seeker']!.deathbedFighting).toBe(40)
    expect(BADGES['badge.survivor']!.deathbedFighting).toBe(20)
    expect((BADGES['badge.death-seeker']!.statModifiers as Record<string, number>)['deathbedFighting']).toBeUndefined()
    expect(engineVocabulary().stats).toEqual(expect.arrayContaining(['bleedOutTurns', 'deathbedFighting']))
    expect(engineVocabulary().ruleBases).toEqual({ crit: 3, vision: 6, bleedOutTurns: 5, deathbedFighting: 20, deathbedPerToughness: 5 })
  })
})

describe('the pack carries tier and the XP price list (K7)', () => {
  it('xpByTier is 2 / 5 / 15, and every authored enemy carries a priced tier', () => {
    expect(XP_BY_TIER).toEqual({ 1: 2, 2: 5, 3: 15 })
    expect(UNITS['unit.zombie']!.tier).toBe(1)
    expect(UNITS['unit.vampire']!.tier).toBe(2)
    expect(UNITS['unit.doombringer']!.tier).toBe(3)
    for (const [id, u] of Object.entries(UNITS)) if (id.startsWith('unit.')) expect([id, XP_BY_TIER[u.tier ?? 0]]).toEqual([id, expect.any(Number)])
  })
})
