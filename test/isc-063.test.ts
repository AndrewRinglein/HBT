// ISC-063 — set bonuses are resolved at fielding and shown before the battle: the
// prep view lists every triggered set per deployed hero with its number; the same
// numbers appear in the roster deltas; they are written into the fielding, not
// recomputed in battle.
// 2-ACTIONS-SETTLED.md 2026-09-02 "looked up when the players are being built and shipped to combat"
import { describe, it, expect } from 'vitest'
import { loadFixture, toEquip } from './walk.js'
import { performEquip, performUnequip } from '../src/core/shop.js'
import { viewCombatPrep, performAdvancePrep } from '../src/core/prep.js'
import { heroModsOf, resolveSets } from '../src/core/sets.js'
import { makeBattleState, battleOptionsOf } from '../src/core/seam.js'
import { itemOf } from '../src/content/items.js'

const CHAPLAIN = 'hero.base.priest-armored', DWARF = 'hero.base.warrior-iron'
const CHAINS = 'item.chains-of-the-wrathful', CHAIN_ARMOR = 'item.chains-of-the-faithful', PRIEST_CHAIN = 'item.priest-chain'

function chained() {
  const ctx = toEquip(loadFixture((c) => { c.stash = [CHAINS, CHAIN_ARMOR, PRIEST_CHAIN] }), [DWARF, CHAPLAIN])
  /* Law 10, 2026-09-23 (v2.shields): the Knight Shield retired with V2 R1; this hero's kit carries the Round Shield now. The claim is unchanged. */ performUnequip(ctx, CHAPLAIN, 'item.round-shield', 'test')
  performUnequip(ctx, CHAPLAIN, 'item.holy-texts', 'test')
  performEquip(ctx, CHAPLAIN, CHAINS, 'test')
  performEquip(ctx, CHAPLAIN, CHAIN_ARMOR, 'test', 'item.pilgrims-habit')
  performEquip(ctx, CHAPLAIN, PRIEST_CHAIN, 'test')
  return ctx
}

describe('ISC-063 — resolved at fielding, shown before the battle', () => {
  it('the prep view lists the triggered set per deployed hero with its number', () => {
    const ctx = chained()
    const v = viewCombatPrep(ctx.campaign)
    expect(v.step).toBe('equip')
    expect(v.sets[CHAPLAIN]).toEqual([{ itemId: CHAINS, tag: 'chain', shape: 'per-other', count: 2, stats: { precision: 2 }, attackDamage: 0 }])
    expect(v.sets[DWARF]).toEqual([])
    expect(Object.keys(v.sets).sort()).toEqual([...v.deployed].sort())      // one entry per deployed hero, nobody else
  })
  it('the roster deltas carry the same numbers, on top of what the items themselves modify', () => {
    const ctx = chained()
    const d = heroModsOf(ctx.campaign, CHAPLAIN)
    const worn = ctx.campaign.roster[CHAPLAIN]!.equipped.map(itemOf)
    const fromItems: Record<string, number> = {}
    for (const r of worn) for (const [k, n] of Object.entries(r.statModifiers)) fromItems[k] = (fromItems[k] ?? 0) + n
    expect(d.items).toEqual(fromItems)
    expect(d.sets).toEqual({ precision: 2 })
    expect(d.total['precision']).toBe((fromItems['precision'] ?? 0) + 2)
    for (const [k, n] of Object.entries(fromItems)) if (k !== 'precision') expect(d.total[k]).toBe(n)
    expect(d.lines).toEqual(resolveSets(ctx.campaign, CHAPLAIN))
  })
  it('the fielding carries the resolved numbers as plain data — the battle is handed numbers, never set logic', () => {
    const ctx = chained()
    performAdvancePrep(ctx, 'test')
    const e = ctx.campaign.cursor.engagement!
    const spec = makeBattleState(ctx.campaign.roster, e)
    const at = e.deployed.indexOf(CHAPLAIN)
    expect(spec.heroMods).toHaveLength(e.deployed.length)
    /* Law 10, 2026-10-02 (kingdom.reads-engine, review finding K3): the fielding's share is the engine's own unit-mod
       shape now (BattleOptions.heroMods — each stat naming the item that pays it), and the options hand it to the engine:
       the sets are fought, not only shown. The claim — resolved numbers, plain data, the prep view's, never set logic — is unchanged. */
    expect(spec.heroMods![at]).toEqual({ stats: [{ stat: 'precision', add: 2, source: CHAINS }] })
    expect(spec.heroMods![e.deployed.indexOf(DWARF)]).toEqual({})
    expect(JSON.parse(JSON.stringify(spec.heroMods))).toEqual(spec.heroMods)
    for (const m of spec.heroMods![at]!.stats!) expect(Number.isInteger(m.add)).toBe(true)
    // the same numbers the prep view showed, in the same order the heroes are fielded
    const summed: Record<string, number> = {}
    for (const m of spec.heroMods![at]!.stats!) summed[m.stat] = (summed[m.stat] ?? 0) + m.add
    expect(summed).toEqual(heroModsOf(ctx.campaign, CHAPLAIN).sets)
    // the options hand the engine the numbers, per hero; nothing in them is a tag or a set
    const opts = battleOptionsOf(spec)
    expect(opts.heroMods![at]).toEqual(spec.heroMods![at])
    expect(opts.heroMods![e.deployed.indexOf(DWARF)]).toBeUndefined()
    expect(JSON.stringify(opts)).not.toMatch(/setBonus|"tag"/)
  })
})
