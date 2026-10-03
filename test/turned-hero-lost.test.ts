// fix.turned-hero-lost (2026-10-02) — engine DECISIONS.md 2026-10-02 'a hero still turned when a battle is lost is lost':
// asked "If a hero turns against you, is never beaten down, and the battle is lost, should it come home normal and
// unhurt, as built now, or be treated as lost?" — "3 treated as lost." A hero row the fold marks `turned` (it ended a
// lost battle still on the enemy side, standing) goes through the Reckoning's one dead path: dead, no XP, no wound, no
// MVP, and the roster no longer holds it alive. A hero that turned and was beaten down, or that ended on the player's
// side, is unchanged. Overturns engine SWITCHES.md turnedAtBattleEnd's "no wound" for that hero; kingdom SWITCHES.md
// turnedLostIsDead.
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { applyBattleResult, battleXpOf } from '../src/core/reckoning.js'
import { resolveEngagement, type EngagementResult } from '../src/core/seam.js'
import { validateResult } from '../src/core/result.js'
import { SWITCHES } from '../src/content/switches.js'

const HEROES = ['test-warrior', 'test-warrior', 'test-warrior', 'test-warrior']
const PACK = Array.from({ length: 6 }, () => 'unit.werewolf')
const AFFLICTED = [['badge.vampirism'], ['badge.lycanthropy'], ['badge.vampirism'], ['badge.lycanthropy']]
const battle = (seed: number) => resolveEngagement({ id: 'test.k.turned', mapId: 'map.open', heroes: HEROES, enemies: PACK, seed, heroBadges: AFFLICTED })

describe('a hero still turned when a battle is lost is lost', () => {
  // seed 1: a wipe — heroes 0, 2 and 3 end it turned to the enemy side, standing; hero 1 turned and was beaten down
  const { result, events } = battle(1)

  it('the battle is the case: lost, some heroes turned at its end, one turned and beaten down', () => {
    expect(() => validateResult(result)).not.toThrow()
    expect(result.outcome).toBe('wipe')
    const heroes = result.units.filter((u) => u.side === 'hero' && u.role === undefined)
    expect(heroes.filter((u) => u.turned).map((u) => u.index)).toEqual([0, 2, 3])
    expect(events.some((e) => e.type === 'unit.reverted' && e.actor === heroes[1]!.unitId && e['reason'] === 'fell')).toBe(true)
    expect(heroes[1]).toMatchObject({ lifeState: 'downed', downed: true })
  })

  it('the one formula pays a turned hero of a lost battle nothing and counts it dead; the beaten-down one is unchanged', () => {
    const paid = battleXpOf('test.k.turned', result)
    expect(paid.map((p) => p.dead)).toEqual([true, false, true, true])
    for (const i of [0, 2, 3]) expect(paid[i]!.xp).toBe(0)
    // the beaten-down hero is paid by the formula as before: the speed bonus (and its kills)
    expect(paid[1]!.xp).toBeGreaterThan(0)
  })

  it('the Reckoning reports it dead, pays no XP and no MVP; the writer takes it off the living roster', () => {
    const ctx = toBattle(loadFixture())
    const e = ctx.campaign.cursor.engagement!
    // the real battle's hero fates on the fixture's Engagement (four deployed, as the battle fielded)
    const fates = result.units.filter((u) => u.side === 'hero' && u.role === undefined)
    const r = panelResult(ctx, false, (x): EngagementResult => ({ ...x, units: x.units.map((u) => {
      if (u.side !== 'hero') return u
      const f = fates[u.index]!
      return { ...u, lifeState: f.lifeState, dead: f.dead, downed: f.downed, ...(f.turned ? { turned: true as const } : {}) }
    }) }))
    const { reckoning } = decide(ctx, r)
    expect(reckoning.won).toBe(false)
    expect(reckoning.heroes.map((h) => h.dead)).toEqual([true, false, true, true])
    for (const i of [0, 2, 3]) expect(reckoning.heroes[i]).toMatchObject({ dead: true, xp: 0, wound: 0, mvp: false })
    expect(reckoning.heroes[1]!.wound).toBe(Math.max(ctx.campaign.roster[e.deployed[1]!]!.wound, SWITCHES.woundFromDowned))
    applyBattleResult(ctx, e, r, reckoning)
    for (const i of [0, 2, 3]) {
      const id = e.deployed[i]!
      expect(ctx.campaign.roster[id]!.lifeState).toBe('dead')
      expect(ctx.events.some((x) => x.type === 'hero.died' && x['heroId'] === id)).toBe(true)
    }
    const living = Object.values(ctx.campaign.roster).filter((h) => h.lifeState === 'alive').map((h) => h.id)
    expect(living).toContain(e.deployed[1])
    for (const i of [0, 2, 3]) expect(living).not.toContain(e.deployed[i])
  })

  it('a won battle: a hero that turned and was beaten down, and the heroes on the player\'s side, are unchanged', () => {
    // seed 2: heroClear — hero 3 turned, was beaten down in its own form; the rest never left
    const won = battle(2).result
    expect(won.outcome).toBe('heroClear')
    expect(won.units.some((u) => u.turned)).toBe(false)
    const paid = battleXpOf('test.k.turned', won)
    expect(paid.every((p) => !p.dead && p.xp > 0)).toBe(true)
  })

  it('a hero standing on the player\'s side of a won battle comes home and is paid, as before', () => {
    const ctx = toBattle(loadFixture())
    const e = ctx.campaign.cursor.engagement!
    const { result: r, reckoning } = decide(ctx, panelResult(ctx, true))
    expect(reckoning.heroes.every((h) => !h.dead && h.xp > 0)).toBe(true)
    applyBattleResult(ctx, e, r, reckoning)
    for (const id of e.deployed) expect(ctx.campaign.roster[id]!.lifeState).toBe('alive')
  })
})
