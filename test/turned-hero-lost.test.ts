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
  // Law 10, 2026-10-05 — engine rule.prone-only-stand-up (Andrew, engine DECISIONS.md 'a prone unit only stands; Stand Up is its
  // one move; …': "yes, it cannot use attacks or powers until it stands." / "No, you only perform one move action.") moved
  // these fights: a knocked-down unit no longer attacks from the floor or walks on after standing, and on seed 1 all four
  // heroes now end the battle turned and standing — no longer the case this file is about. The case is the same and every
  // assertion below is unchanged; only the seed that fights it out is read again, the lowest of seeds 0 to 39 that does
  // (4; also 11, 20, 28, 34, 38). The lines were:
  //   // seed 1: a wipe — heroes 0, 2 and 3 end it turned to the enemy side, standing; hero 1 turned and was beaten down
  //   const { result, events } = battle(1)
  // Law 10, 2026-10-06 — engine content.used-twice-rules-removed (Andrew, engine DECISIONS.md 2026-10-06 'the one-use rules: most
  // are cut or reworded onto rules the engine already has; a handful are built', of the Werewolf's Claw Frenzy: "the ordering, I
  // don't really care about"): the Claw Frenzy's Strength now counts - a Werewolf is a point stronger after every swing - so
  // these six Werewolves fight another battle on every seed, and on seed 4 all four heroes end it turned and standing. The
  // case is the same and every assertion below is unchanged; only the seed that fights it out is read again, the lowest of
  // seeds 0 to 39 that does (11; also 19, 20, 26, 28, 38, 39). The won battle below is still seed 53. Found by the group's
  // kingdom suite (the failed run stays in the record). The lines were:
  //   // seed 4: a wipe — heroes 0, 2 and 3 end it turned to the enemy side, standing; hero 1 turned and was beaten down
  //   const { result, events } = battle(4)
  // seed 11: a wipe — heroes 0, 2 and 3 end it turned to the enemy side, standing; hero 1 turned and was beaten down
  const { result, events } = battle(11)

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
    // Law 10, 2026-10-05 — the same engine item moved seed 2 (now a wipe, all four turned). The case is unchanged; the lowest
    // of seeds 0 to 39 that fights it out is 22. The lines were:
    //   // seed 2: heroClear — hero 3 turned, was beaten down in its own form; the rest never left
    //   const won = battle(2).result
    // Law 10, 2026-10-06 — engine rule.surge-is-at-least-level (engine DECISIONS.md 2026-10-06 'everyone gains Surge equal to its
    // level at the least, and rolls the Surge check every Activation'): the four test warriors have a hero class, so each has
    // Surge 1 and rolls the check after every Activation - every seed is another fight. Seed 22 is still won, but nobody turns
    // and is beaten down in it any more. The case is unchanged and so is every assertion below; only the seed that fights it out
    // is read again, from 0 upward: none of 0 to 52 does (the won ones - 15, 17, 18, 22, 30, 32 - have no hero beaten down in
    // its other form), 53 is the first (66 the next). Found, not tuned; the lost battle above is still seed 4. Found by the
    // group's kingdom suite (the failed run stays in the record). The lines were:
    //   // seed 22: heroClear — hero 3 turned, was beaten down in its own form; the rest never left
    //   const fought = battle(22), won = fought.result
    // seed 53: heroClear — hero 3 turned and was beaten down
    const fought = battle(53), won = fought.result
    expect(fought.events.some((e) => e.type === 'unit.reverted' && e['reason'] === 'fell'), 'a hero turned and was beaten down in this battle').toBe(true)
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
