// content.used-twice-rules-removed (2026-10-06). Ruled 2026-10-06 (Andrew, DECISIONS.md 'the one-use rules: most are cut or
// reworded onto rules the engine already has; a handful are built'), of the rules two rows shared and the engine had nothing
// for: "We can remove the status that ticks twice." (the Tainted Blood enchantment: on taking damage, gain 1 Bleed - SWITCHES
// usedTwiceTaintedBlood); "We don't need to remember what killed someone, so we can get rid of that." (Giant-Killer a fixed
// slayer, Grudge-Bearer +1 Strength - usedTwiceWhatKilled). And two small ones that ride this item: the Eyeblight's Gaze - "It
// should not have flat damage. It should be based on its stat." - and the Werewolf's Claw Frenzy - "the ordering, I don't
// really care about": its Strength counts from the attack after the one that granted it (clawFrenzyCountsFromTheNextAttack).
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { settle } from '../src/core/settle.js'
import { performAttack, preview } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { valueOf as statusValue } from '../src/core/status.js'
import { effective } from '../src/core/stats.js'
import { ATTACKS, BADGES, ITEMS, UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'

const FRENZY = 'attack.werewolf.claw-frenzy', GAZE = 'attack.eyeblight.gaze'
const ON_HIT = 'trigger.werewolf.strength-strength.on-hit', ON_MISS = 'trigger.werewolf.strength-strength.on-miss'

describe('the Werewolf\'s Claw Frenzy: every swing leaves it a point stronger, from the next swing on', () => {
  it('the row: +1 Strength for the Battle, lent when the swing is over - on a hit and on a miss, never before the damage', () => {
    const lent = UNITS['unit.werewolf']!.triggers!.filter((t) => t.effect.kind === 'statMod')
    expect(lent.map((t) => [t.id, t.hook, t.select, t.onlyWithAttack, t.effect])).toEqual([
      [ON_HIT, 'onHit', 'self', FRENZY, { kind: 'statMod', stat: 'strength', value: 1, until: 'battle' }],
      [ON_MISS, 'onMiss', 'self', FRENZY, { kind: 'statMod', stat: 'strength', value: 1, until: 'battle' }],
    ])
    expect(UNITS['unit.werewolf']!.triggers!.filter((t) => t.hook === 'onAttack' || t.hook === 'onCrit')).toEqual([])
  })
  it('fought: each swing is rolled at the Strength it began with and the Werewolf has one more after it, whether it hit or missed', () => {
    const ctx = createBattle({ replicate: 0, mapId: 'map.open', heroes: ['hero.base.warrior-iron'], heroHexes: [85], enemies: ['unit.werewolf'], enemyHexes: [86], enemyCount: 1 })
    const hero = ctx.state.units.find((u) => u.side === 'hero')!, wolf = ctx.state.units.find((u) => u.side === 'enemy')!
    hero.maxHp = 400; hero.hp = 400                                    // she outlasts the count; nothing else of hers is touched
    const str0 = effective(ctx, wolf, 'strength').value
    let hits = 0, misses = 0
    for (let i = 0; i < 12; i++) {
      beginActivation(ctx, wolf.id, 'test')
      if (ctx.geo.distance(wolf.hex, hero.hex) !== 1) hero.hex = 85      // a crit that knocked her back: she is stood beside it again
      const before = effective(ctx, wolf, 'strength').value
      expect(before, `swing ${i + 1} begins`).toBe(str0 + i)
      const from = ctx.events.length
      const r = performAttack(ctx, wolf.id, hero.id, FRENZY); settle(ctx, FRENZY)
      const mine = ctx.events.slice(from)
      if (r.hit) {
        hits++
        // the Strength this hit was computed from is the Strength the swing began with (Law 1): the point is not in this swing
        const hit = mine.find((e) => e.type === 'attack.hit')!
        expect((hit['ledger'] as { station: string; delta: number }[]).find((r) => r.station === 'SOURCE_STAT')!.delta, `swing ${i + 1}`).toBe(before)
        expect(mine.filter((e) => e.type === 'trigger.fired' && e['effect'] === 'statMod').map((e) => e.causeId)).toEqual([ON_HIT])
      } else {
        misses++
        expect(mine.filter((e) => e.type === 'trigger.fired' && e['effect'] === 'statMod').map((e) => e.causeId)).toEqual([ON_MISS])
      }
      expect(effective(ctx, wolf, 'strength').value, `after swing ${i + 1}`).toBe(before + 1)
    }
    expect(hits + misses).toBe(12)
    expect(hits).toBeGreaterThan(0)
  })
  it('in a real battle (test.afflictions-at-zero-rule): the Werewolves grow as they swing', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.afflictions-at-zero-rule']!))
    runBattle(ctx)
    const grown = ctx.events.filter((e) => e.type === 'statmod.added' && (e.causeId === ON_HIT || e.causeId === ON_MISS))
    expect(grown.length).toBeGreaterThan(0)
    for (const e of grown) expect([e['stat'], e['value']]).toEqual(['strength', 1])
  })
})

describe('the Eyeblight\'s Gaze deals damage from a stat', () => {
  it('the row: a ranged attack of true damage by Precision, and the Eyeblight holds it', () => {
    expect(ATTACKS[GAZE]).toMatchObject({ id: GAZE, range: 9, attack: { kind: 'ranged', damageType: 'true', bonus: 0, stat: 'precision' } })
    expect(UNITS['unit.eyeblight']!.attacks).toContain(GAZE)
  })
  it('fought: what it deals is the Eyeblight\'s Precision, and a point of Precision more is a point of damage more', () => {
    const ctx = createBattle({ replicate: 0, mapId: 'map.open', heroes: ['hero.base.warrior-iron'], heroHexes: [85], enemies: ['unit.eyeblight'], enemyHexes: [89], enemyCount: 1 })
    const hero = ctx.state.units.find((u) => u.side === 'hero')!, eye = ctx.state.units.find((u) => u.side === 'enemy')!
    const precision = effective(ctx, eye, 'precision').value
    expect(precision).toBeGreaterThan(0)
    expect(preview(ctx, eye.id, hero.id, GAZE).damageOnHit).toBe(precision)       // true damage: nothing of the hero's stands in its way
    eye.precision += 1
    expect(preview(ctx, eye.id, hero.id, GAZE).damageOnHit).toBe(precision + 1)
  })
  it('in a real battle (showcase.horrors): the Eyeblights gaze', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['showcase.horrors']!))
    runBattle(ctx)
    expect(ctx.events.filter((e) => e.type === 'attack.declared' && e['attackId'] === GAZE).length).toBeGreaterThan(0)
  })
})

describe('Tainted Blood, Giant-Killer and Grudge-Bearer', () => {
  it('each of the four Tainted Blood items: on taking damage its wearer gains 1 Bleed, and the row names no gap', () => {
    const rows = Object.values(ITEMS as Record<string, (typeof ITEMS)[string] & { enchant?: string }>).filter((i) => i.enchant === 'enchant.tainted-blood')
    expect(rows.map((r) => r.id).sort()).toEqual(['item.barbarian-hide.tainted-blood', 'item.brutes-harness.tainted-blood', 'item.creature-hide.tainted-blood', 'item.mismatched-armor.tainted-blood'])
    for (const r of rows) {
      expect(r.triggers.map((t) => [t.hook, t.select, t.effect]), r.id).toEqual([['onTakingDamage', 'self', { kind: 'status.apply', statusId: 'status.bleed', value: 1 }]])
      expect(r.gaps ?? [], r.id).toEqual([])
    }
  })
  it('fought: a warrior in the Barbarian Hide of Tainted Blood, struck and hurt, gains 1 Bleed for it; one in the plain hide gains none', () => {
    for (const [hide, bleed] of [['item.barbarian-hide.tainted-blood', 1], ['item.barbarian-hide', 0]] as const) {
      const ctx = createBattle({ replicate: 0, mapId: 'map.open', heroes: ['hero.base.warrior-iron'], heroHexes: [85], heroItems: [['item.war-axe', hide]], enemies: ['unit.zombie'], enemyHexes: [86], enemyCount: 1 })
      const hero = ctx.state.units.find((u) => u.side === 'hero')!, z = ctx.state.units.find((u) => u.side === 'enemy')!
      let hurt = false
      for (let i = 0; i < 40 && !hurt; i++) { beginActivation(ctx, z.id, 'test'); const hp = hero.hp; performAttack(ctx, z.id, hero.id, 'attack.zombie.claw'); hurt = hero.hp < hp }
      expect(hurt, hide).toBe(true)
      expect(statusValue(hero, 'status.bleed'), hide).toBe(bleed)
    }
  })
  it('Grudge-Bearer is +1 Strength and reads no history; Giant-Killer names its fixed slayer, which waits as every badge slayer does', () => {
    expect(BADGES['badge.grudge-bearer']).toMatchObject({ statModifiers: { strength: 1 } })
    expect(BADGES['badge.grudge-bearer']!.gaps ?? []).toEqual([])
    expect(BADGES['badge.giant-killer']!.gaps).toEqual(['Damage +2 vs Giants'])
    const plain = createBattle({ replicate: 0, mapId: 'map.open', heroes: ['hero.base.warrior-iron'], heroHexes: [85], enemies: ['unit.zombie'], enemyHexes: [95], enemyCount: 1 })
    const grudge = createBattle({ replicate: 0, mapId: 'map.open', heroes: ['hero.base.warrior-iron'], heroHexes: [85], heroBadges: [['badge.grudge-bearer']], enemies: ['unit.zombie'], enemyHexes: [95], enemyCount: 1 })
    const str = (ctx: typeof plain) => effective(ctx, ctx.state.units.find((u) => u.side === 'hero')!, 'strength').value
    expect(str(grudge) - str(plain)).toBe(1)
  })
})
