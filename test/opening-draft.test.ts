// fix.opening-draft (2026-09-29). Ruled 2026-09-28 (Andrew, DECISIONS.md 'the first hero: Leadership ...',
// 'no Health minimum; ... the draft pick is weighted' and 'the draft never repeats a class until all six are
// drafted'): "You get the leadership badge. You get a random positive badge. 25% chance of another positive
// badge. +2 health. One stat point from the Crucible's randomness, a 30% chance of another stat point."
// "we use the Crucible randomness, three heroes, and then use a weighted system for what you choose."
// "Until you've drafted all six of the starting classes, you never get a draft of the same class again."
// The Crucible's numbers are read from crucible/ by progression/build-schedule.mjs (OPENING-PARTY.json).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createBattle, fieldedDef } from '../src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { OPENING_POSITIONS, draftScoreOf, openingHeroesOf, openingPartyOf } from '../src/content/opening-party.js'
import { BADGES, UNITS } from '../src/content/index.js'
import OPENING from '../../progression/OPENING-PARTY.json' with { type: 'json' }

const N = 60
const crucible = (f: string) => JSON.parse(readFileSync(join(__dirname, '..', '..', 'crucible', 'data', f), 'utf8'))
const classOf = (id: string) => (UNITS[id]!.tags ?? []).find((t) => OPENING.classes.includes(t))
const FAVOURABLE = new Set(OPENING.crucible.badges.favourable.map((b) => b.id))
const maxHpHanded = (h: { mods: { stats?: readonly { stat: string; add: number; source: string }[] } }, source?: string) =>
  (h.mods.stats ?? []).filter((m) => m.stat === 'maxHp' && (!source || m.source === source)).reduce((a, m) => a + m.add, 0)

describe('fix.opening-draft — the first hero, the class rule, the Crucible\'s rolls and the weighted pick', () => {
  it('the Crucible\'s randomness is read from its files, not retyped', () => {
    expect(OPENING.crucible.statPool).toEqual(crucible('stat-pool.json').pool)
    const rollable = (cat: string) => (crucible('badges.json') as { id: string; category: string; rollable: boolean }[]).filter((b) => b.rollable && b.category === cat).map((b) => b.id)
    // the Codex owns the badges: a Crucible badge it has cut is named, not rolled (SWITCHES.md openingCutBadges)
    const cut = OPENING.crucible.badges.notInCodex
    expect(OPENING.crucible.badges.favourable.map((b) => b.id)).toEqual(rollable('favourable').filter((id) => !cut.includes(id)))
    expect(OPENING.crucible.badges.flawed.map((b) => b.id)).toEqual(rollable('flawed').filter((id) => !cut.includes(id)))
    for (const id of cut) expect(BADGES[id], `${id} is cut from the Codex`).toBeUndefined()
    // every badge the draft can hand over is one the engine folds
    for (const b of [...OPENING.crucible.badges.favourable, ...OPENING.crucible.badges.flawed, ...OPENING.firstHero.badges.map((id) => ({ id }))]) expect(BADGES[b.id], b.id).toBeDefined()
    expect(BADGES['badge.leadership']!.statModifiers).toEqual({})
  })

  it('the first hero is taken, not offered: Leadership, one positive badge (two at 25%), +2 Health, one Crucible point (two at 30%)', () => {
    const F = OPENING.firstHero
    let secondBadge = 0, secondPoint = 0
    for (let r = 0; r < N; r++) {
      const [h] = openingHeroesOf(r, 1)
      expect(h!.offered).toEqual([h!.id])
      expect(h!.badges[0]).toBe('badge.leadership')
      const positives = h!.badges.slice(1)
      expect(positives.length === 1 || positives.length === 2, `replicate ${r}: ${positives}`).toBe(true)
      for (const b of positives) expect(FAVOURABLE.has(b), `${b} is positive`).toBe(true)
      expect(new Set(h!.badges).size).toBe(h!.badges.length)
      if (positives.length === 2) secondBadge++
      expect(maxHpHanded(h!, F.healthSource)).toBe(F.health)
      expect(h!.rolls.length === 1 || h!.rolls.length === 2).toBe(true)
      for (const x of h!.rolls) expect(x.amount, `${x.stat} is a gain`).toBeGreaterThan(0)
      if (h!.rolls.length === 2) secondPoint++
    }
    // the chances are the ruling's: some replicates get the second, most do not
    expect(secondBadge).toBeGreaterThan(0); expect(secondBadge).toBeLessThan(N / 2)
    expect(secondPoint).toBeGreaterThan(0); expect(secondPoint).toBeLessThan(N / 2)
  })

  it('a Health point is 2 Health — the Crucible\'s step', () => {
    const health = Array.from({ length: N }, (_, r) => openingHeroesOf(r, 6)).flat().flatMap((h) => h.rolls).filter((x) => x.stat === 'health')
    expect(health.length).toBeGreaterThan(0)
    for (const x of health) expect(Math.abs(x.amount)).toBe(2)
  })

  it('no draft offers a class already drafted until all six are: the six drafted heroes are six classes', () => {
    for (let r = 0; r < N; r++) {
      const six = openingHeroesOf(r, 6)
      expect(new Set(six.map((h) => classOf(h.id))).size, `replicate ${r}`).toBe(6)
      six.forEach((h, k) => {
        const before = new Set(six.slice(0, k).map((x) => classOf(x.id)))
        for (const o of h.offered) expect(before.has(classOf(o)), `replicate ${r} draft ${k + 1} offers ${o}`).toBe(false)
      })
    }
  })

  it('every later draft offers three rolled heroes and takes the best by the weighted score', () => {
    let rolledAny = false
    for (let r = 0; r < N; r++) {
      const six = openingHeroesOf(r, 6)
      six.slice(1).forEach((h, k) => {
        expect(h.offered.length).toBe(OPENING.offer)
        expect(h.offered).toContain(h.id)
        const taken = h.offered.indexOf(h.id)
        expect(h.scores[taken]).toBe(Math.max(...h.scores))
        expect(h.scores[taken]).toBe(draftScoreOf(h.id, h.rolls, h.badges, six.slice(0, k + 1).map((x) => x.id)))
        if (h.rolls.length || h.badges.length) rolledAny = true
      })
    }
    expect(rolledAny).toBe(true)
  })

  it('minus points count against a hero and a melee hero is worth more while the party has none — not absolutely', () => {
    const warrior = OPENING.pool.find((id) => classOf(id) === 'class.warrior')!
    const mage = OPENING.pool.find((id) => classOf(id) === 'class.mage')!
    const ranger = OPENING.pool.find((id) => classOf(id) === 'class.ranger')!
    expect(draftScoreOf(warrior, [{ stat: 'strength', amount: -1 }], [], [warrior])).toBeLessThan(draftScoreOf(warrior, [], [], [warrior]))
    // no melee yet: the bare warrior outscores the bare mage; with a warrior already drafted, it does not
    expect(draftScoreOf(warrior, [], [], [ranger])).toBeGreaterThan(draftScoreOf(mage, [], [], [ranger]))
    expect(draftScoreOf(warrior, [], [], [warrior])).toBe(draftScoreOf(mage, [], [], [warrior]))
    // a good roll on the mage outweighs the melee term
    expect(draftScoreOf(mage, [{ stat: 'magic', amount: 1 }, { stat: 'resist', amount: 1 }], [], [ranger])).toBeGreaterThan(draftScoreOf(warrior, [], [], [ranger]))
    // Armor and Resist are worth the class's best on every class
    for (const cls of OPENING.classes) {
      const w = (OPENING.draftScore.weights as Record<string, Record<string, number>>)[cls]!
      expect(w['armor']).toBe(Math.max(...Object.values(w))); expect(w['resist']).toBe(Math.max(...Object.values(w)))
    }
  })

  it('the same replicate gives the same heroes with the same rolls, and a hero\'s rolls are identical at every opening position', () => {
    expect(openingHeroesOf(7, 6)).toEqual(openingHeroesOf(7, 6))
    for (let r = 0; r < 10; r++) {
      const six = openingHeroesOf(r, 6)
      for (const p of OPENING_POSITIONS) {
        const party = openingPartyOf(p.position, r)
        party.heroes.forEach((id, k) => {
          expect(id).toBe(six[k]!.id)
          expect(party.heroBadges[k] ?? []).toEqual(six[k]!.badges)
          expect(party.heroMods[k]?.stats ?? []).toEqual(six[k]!.mods.stats ?? [])
        })
      }
    }
  })

  it('in the battle the first hero wears Leadership and its badges, and fields its row, its kit and exactly what it was handed', () => {
    for (const r of [0, 1, 2]) {
      const opts = scenarioOptions(scenarioDef('test.opening-orphanage'), r)
      const ctx = createBattle({ ...opts, replicate: r } as Parameters<typeof createBattle>[0])
      const [h] = openingHeroesOf(r, 1)
      const u = ctx.state.units.find((x) => x.typeId === h!.id)!
      const badged = ctx.events.filter((e) => e.type === 'unit.badged' && e.actor === u.id).map((e) => e['badgeId'])
      for (const b of h!.badges) expect(badged, `replicate ${r}`).toContain(b)
      const badgeHp = h!.badges.reduce((a, b) => a + (BADGES[b]!.statModifiers.maxHp ?? 0), 0)
      expect(u.maxHp, `replicate ${r}`).toBe(fieldedDef(h!.id).maxHp + badgeHp + maxHpHanded(h!))
      const modified = ctx.events.filter((e) => e.type === 'unit.modified' && e.actor === u.id).map((e) => e['source'])
      expect(modified).toContain(OPENING.firstHero.healthSource)
    }
  })
})
