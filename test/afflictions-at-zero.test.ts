// engine rule.afflictions-at-zero-refiled-2 (2026-10-02) — the kingdom's half of engine DECISIONS.md 2026-10-01 'the
// afflictions at 0 Health': "if you're rotting flesh and you're taken to zero, you're going to gain a badge: Fragile.
// Gives you -1 maximum health. So there's a permanent consequence every time you're taken down and it will just
// accumulate" · "They're back to their normal self." Fragile, gained in battle, is carried onto the roster, one per gain;
// a hero who transformed comes home as itself. (Retreat is unreachable — skipped by ruling 2026-09-03 — so "a transformed
// hero at retreat is abandoned" has nothing to act on yet: engine SWITCHES.md transformedRetreat.)
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { applyBattleResult } from '../src/core/reckoning.js'
import { resolveEngagement } from '../src/core/seam.js'
import { validateResult } from '../src/core/result.js'

const PACK = Array.from({ length: 6 }, () => 'unit.werewolf')

describe('the fold reads what an affliction\'s 0-Health rule gave a hero', () => {
  it('each Fragile a Rotting Flesh hero gains at 0 is on its row, one per gain; nothing else gained is', () => {
    const { result, events } = resolveEngagement({ id: 'test.k.rotting', mapId: 'map.open', heroes: ['test-warrior', 'test-warrior', 'test-warrior', 'test-warrior'], enemies: PACK, seed: 0,
      heroBadges: [['badge.rotting-flesh'], ['badge.rotting-flesh'], ['badge.vampirism'], ['badge.possession']] })
    expect(() => validateResult(result)).not.toThrow()
    const gains = events.filter((e) => e.type === 'badge.gained' && e['atZeroOf'] !== undefined)
    expect(gains.length).toBeGreaterThan(0)
    for (const u of result.units.filter((x) => x.side === 'hero')) {
      const mine = gains.filter((e) => e.actor === u.unitId).map((e) => e['badgeId'])
      expect(u.carried ?? [], `hero ${u.index}`).toEqual(mine)
    }
    expect(gains.every((e) => e['badgeId'] === 'badge.fragile' && e['atZeroOf'] === 'badge.rotting-flesh')).toBe(true)
    // a bite's affliction is the battle's, not carried by this rule
    expect(events.some((e) => e.type === 'badge.gained' && e['atZeroOf'] === undefined)).toBe(true)
  })

  it('a hero transformed in the battle comes home as itself: its own row, its own type', () => {
    const heroes = ['test-warrior', 'test-warrior', 'test-warrior', 'test-warrior']
    const { result, events } = resolveEngagement({ id: 'test.k.turned', mapId: 'map.open', heroes, enemies: PACK, seed: 0,
      heroBadges: [['badge.vampirism'], ['badge.lycanthropy'], ['badge.vampirism'], ['badge.lycanthropy']] })
    expect(events.some((e) => e.type === 'unit.transformed')).toBe(true)
    expect(events.filter((e) => e.type === 'unit.reverted').length).toBe(events.filter((e) => e.type === 'unit.transformed').length)
    expect(() => validateResult(result)).not.toThrow()
    for (const u of result.units.filter((x) => x.side === 'hero' && x.role === undefined)) expect(u.typeId).toBe(heroes[u.index])
    // a hero still on the enemy side when the battle ended stands, turned — the battle was lost without it, and it is
    // back to normal after: never downed, so no wound of this battle's
    expect(result.outcome).toBe('wipe')
    const turned = result.units.filter((u) => u.turned)
    expect(turned.length).toBeGreaterThan(0)
    for (const u of turned) expect(u).toMatchObject({ side: 'hero', lifeState: 'standing', downed: false })
    for (const u of result.units.filter((x) => x.side === 'hero' && x.lifeState === 'standing')) expect(u.turned).toBe(true)
  })
})

describe('the Reckoning carries Fragile onto the roster', () => {
  it('a hero who gained Fragile twice carries two more; a dead hero carries nothing', () => {
    const ctx = toBattle(loadFixture())
    const e = ctx.campaign.cursor.engagement!
    const r = panelResult(ctx, true)
    const [first, second] = r.units.filter((u) => u.side === 'hero')
    const set = { ...r, units: r.units.map((u) => (u === first ? { ...u, carried: ['badge.fragile', 'badge.fragile'] } : u === second ? { ...u, lifeState: 'dead' as const, dead: true, downed: true, carried: ['badge.fragile'] } : u)) }
    expect(validateResult(set)).toBe(set)
    const { result, reckoning } = decide(ctx, set)
    expect(reckoning.heroes[0]!.badges).toEqual(['badge.fragile', 'badge.fragile'])
    expect(reckoning.heroes[1]!.badges).toBeUndefined()
    const carried = [...ctx.campaign.roster[e.deployed[0]!]!.badges]
    applyBattleResult(ctx, e, result, reckoning)
    expect(ctx.campaign.roster[e.deployed[0]!]!.badges).toEqual([...carried, 'badge.fragile', 'badge.fragile'])
    expect(ctx.events.some((x) => x.type === 'hero.badges-changed' && x['heroId'] === e.deployed[0])).toBe(true)
  })

  it('only a roster hero row carries badges out of a battle', () => {
    const ctx = toBattle(loadFixture())
    const r = panelResult(ctx, true)
    const enemy = r.units.find((u) => u.side === 'enemy')!
    expect(() => validateResult({ ...r, units: r.units.map((u) => (u === enemy ? { ...u, carried: ['badge.fragile'] } : u)) })).toThrow(/carried/)
  })
})
