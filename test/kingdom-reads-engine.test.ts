// kingdom.reads-engine — the kingdom stops keeping second copies of engine facts (duplication review 2026-09-28,
// findings K1-K18; engine DECISIONS.md "the duplication review, ruled"). The kingdom half of the item's probe; the
// engine's test/kingdom-reads-engine.test.ts runs this file and the engine's own half.
// Expect: "A Farmer levels on civilian.farmer and its level-5 pick fields; the Equip card and the battle show the same
// numbers for a set-bonus hero; the Net is one-use in battle; a hero who stood at Deathbed fights the next battle
// Wounded; a tier-2 kill pays 5 XP."
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { makeNewCampaign } from '../src/core/opening.js'
import { viewLevelUp } from '../src/core/rewards.js'
import { makeBattleState, battleOptionsOf, fieldedPreviewOf } from '../src/core/seam.js'
import { applyBattleResult, resolveReckoning } from '../src/core/reckoning.js'
import { heroOfRow, HERO_POOL } from '../src/content/heroes.js'
import { ITEMS as KINGDOM_ITEMS, itemOf } from '../src/content/items.js'
import { levelRowOf } from '../src/content/progress.js'
import { fieldedItemsOf } from '../src/core/loadout.js'
import { createBattle, fieldedDef, LEVELS, ACTIONS, ITEMS, UNITS, XP_BY_TIER, RULE_BADGES, type Ctx as Battle } from '../src/engine.js'

const ENEMIES = ['unit.zombie']
/** One hero fielded on the open map against a zombie, through the seam exactly as the campaign fields it. */
function field(h: ReturnType<typeof heroOfRow>): Battle {
  const spec = makeBattleState({ h }, { id: 'probe.reads-engine', mapId: 'map.open', enemies: ENEMIES, deployed: ['h'], seed: 1 })
  return createBattle(battleOptionsOf(spec))
}
const heroUnit = (b: Battle) => b.state.units.find((u) => u.side === 'hero')!

describe('kingdom.reads-engine — the kingdom reads the engine', () => {
  it('K1: a Farmer levels on civilian.farmer, and its level-5 pick fields', () => {
    const farmer = heroOfRow('hero.fixed.farmer')
    const c = makeNewCampaign(1)
    c.roster[farmer.id] = { ...farmer, xp: 10_000 }
    // the level-up screen shows the TYPE table's row — the engine's, the one the battle folds
    expect(viewLevelUp(c, farmer.id).row.grants).toEqual(LEVELS['civilian.farmer']!.rows.find((r) => r.level === 2)!.grants)
    expect(levelRowOf('civilian.farmer', 2).specialty).toBe(true)
    // a level-5 pick made from the farmer's options fields: option 1 is +5 Health on civilian.farmer, +2 Precision on class.civilian
    const options = LEVELS['civilian.farmer']!.rows.find((r) => r.choice)!.choice!
    const b = field({ ...farmer, level: 5, specialty: 'specialty.militia', levelPick: 1 })
    const grown = b.events.find((e) => e.type === 'unit.grown')!
    expect(grown['table']).toBe('civilian.farmer')
    expect(options[1]).toEqual({ maxHp: 5 })
    expect(heroUnit(b).maxHp).toBe(fieldedDef(farmer.unitType, { items: farmer.equipped, progress: { level: 5, specialtyId: 'specialty.militia', levelFivePick: { maxHp: 5 } } }).maxHp)
  })

  it('K3: the Equip card and the battle show the same numbers for a set-bonus hero', () => {
    const chaplain = { ...heroOfRow('hero.base.priest-armored'), equipped: ['item.chains-of-the-wrathful', 'item.chains-of-the-faithful', 'item.priest-chain'] }
    const { now } = fieldedPreviewOf(chaplain)
    const b = field(chaplain)
    const u = heroUnit(b)
    const battle = (k: string) => (u as unknown as Record<string, number>)[k]! + u.mods.filter((m) => m.stat === k && m.op === 'add').reduce((s, m) => s + m.value, 0)
    for (const k of ['precision', 'strength', 'accuracy', 'dodge', 'armor', 'resist', 'magic', 'spirit']) expect([k, (now as unknown as Record<string, number>)[k]]).toEqual([k, battle(k)])
    expect(now.maxHp).toBe(u.maxHp)
    // Law 10, 2026-10-05 — capability.set-bonus (engine item; engine/DECISIONS.md 2026-10-04 'his 28 reward weapons read back …':
    // "We need: … set bonus"): this read "the chain set's +2 Precision is in both" and
    //   expect(now.precision).toBe(fieldedDef(chaplain.unitType, { items: fielded, stowed }).precision + 2)
    // The Chains' sentence is "for every CHAIN item you carry" and the Chains are one: three carried, +3 - counted by the
    // engine when it fields the hero, no longer handed in by the kingdom. In both, and the battle fought it: unchanged.
    const { fielded, stowed } = fieldedItemsOf(chaplain.equipped)
    expect(now.precision).toBe(fieldedDef(chaplain.unitType, { items: fielded, stowed }).precision + 3)
    expect(b.events.some((e) => e.type === 'unit.modified' && e['source'] === 'item.chains-of-the-wrathful')).toBe(true)
  })

  it('K8: the Net is one-use in battle, and the kingdom reads its uses from the engine', () => {
    expect(ACTIONS['attack.net.cast']!.uses).toBe(1)
    expect(itemOf('item.net').uses).toBe(1)
    const b = field({ ...heroOfRow('hero.base.ranger-aggressive'), equipped: [...heroOfRow('hero.base.ranger-aggressive').equipped, 'item.net'] })
    expect(heroUnit(b).usesLeft['attack.net.cast']).toBe(1)
  })

  it('K10: a hero who stood at the Deathbed fights the next battle Wounded; a Fatigued hero fights Fatigued', () => {
    const ctx = toBattle(loadFixture(), 2)
    const e = ctx.campaign.cursor.engagement!
    const r = panelResult(ctx, true, (x) => ({ ...x, units: x.units.map((u) => (u.side === 'hero' && u.index === 0 ? { ...u, stood: true as const } : u)) }))
    const { reckoning } = decide(ctx, r)
    expect(reckoning.heroes[0]).toMatchObject({ wound: 1, dead: false })
    applyBattleResult(ctx, e, r, reckoning)
    const stood = ctx.campaign.roster[e.deployed[0]!]!
    expect(stood.wound).toBe(1)
    const next = field(stood)
    expect(next.events.some((x) => x.type === 'unit.badged' && x['badgeId'] === RULE_BADGES.wounded)).toBe(true)
    // the recovery badges are Codex badges, carried into battle like any other
    const fresh = heroOfRow('hero.base.warrior-iron')
    const tired = field({ ...fresh, badges: ['badge.fatigued'] })
    expect(heroUnit(tired).strength).toBe(heroUnit(field(fresh)).strength - 1)
  })

  it('K7: a tier-2 kill pays 5 XP — the engine\'s XP_BY_TIER', () => {
    expect(UNITS['unit.necromancer']!.tier).toBe(2)
    const ctx = toBattle(loadFixture(), 1)
    const e = ctx.campaign.cursor.engagement!
    const base = panelResult(ctx, true)
    const killed = { ...base, units: base.units.map((u) => (u.side === 'hero' ? { ...u, kills: 1, killed: ['unit.necromancer'] } : u)) }
    const xp = (x: typeof base) => resolveReckoning(ctx.campaign, e, x).heroes[0]!.xp
    expect(xp(killed) - xp(base)).toBe(XP_BY_TIER[2])
    expect(XP_BY_TIER[2]).toBe(5)
  })

  it('K2 K9 K15: the item rows, the pool heroes and the level rows are the engine\'s', () => {
    for (const r of KINGDOM_ITEMS) {
      const e = ITEMS[r.id]!
      expect([r.id, r.grants]).toEqual([r.id, [...e.grants, ...e.abilities]])
      for (const [k, v] of Object.entries(e.statModifiers)) if (v) expect([r.id, k, r.statModifiers[k]]).toEqual([r.id, k, v])
    }
    for (const h of HERO_POOL) { expect(h.unitType).toBe(h.id); expect(h.name).toBe(UNITS[h.id]!.name); expect(h.equipped).toEqual(UNITS[h.id]!.defaultItems) }
    for (const [id, t] of Object.entries(LEVELS)) for (const row of t.rows) expect(levelRowOf(id, row.level).grants).toEqual(row.grants)
  })
})
