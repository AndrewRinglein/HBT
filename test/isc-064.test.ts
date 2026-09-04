// ISC-064 — what is equipped is what is fielded: battleOptionsOf passes each
// deployed hero's equipped list; with the engine's seam landed, a hero fielded
// with a swapped weapon has that weapon's attacks and not the kit's.
// 7-KINGDOM-SETTLED.md 2026-09-02 "the items should go into battle" · engine/ITEMS-PLAN.md §2
import { describe, it, expect } from 'vitest'
import { loadFixture, toEquip } from './walk.js'
import { performEquip } from '../src/core/shop.js'
import { performAdvancePrep } from '../src/core/prep.js'
import { makeBattleState, battleOptionsOf } from '../src/core/seam.js'
import { viewBattle } from '../src/view/battle.js'
import { createBattle } from '../src/engine.js'
import { itemOf } from '../src/content/items.js'

const HUNTER = 'hero.base.ranger-aggressive', DWARF = 'hero.base.warrior-iron'
const LONGBOW = 'item.longbow', SHORTBOW = 'item.shortbow'

function swapped() {
  const ctx = toEquip(loadFixture((c) => { c.stash = [SHORTBOW] }), [DWARF, HUNTER])
  performEquip(ctx, HUNTER, SHORTBOW, 'test', LONGBOW)
  performAdvancePrep(ctx, 'test')
  return ctx
}

describe('ISC-064 — what is equipped is what is fielded', () => {
  it('the fielding carries every deployed hero\'s equipped list, in deployment order, and the options hand it to the engine', () => {
    const ctx = swapped()
    const e = ctx.campaign.cursor.engagement!
    const spec = makeBattleState(ctx.campaign.roster, e)
    expect(spec.heroItems).toEqual(e.deployed.map((h) => ctx.campaign.roster[h]!.equipped))
    const at = e.deployed.indexOf(HUNTER)
    expect(spec.heroItems![at]).toContain(SHORTBOW)
    expect(spec.heroItems![at]).not.toContain(LONGBOW)
    const opts = battleOptionsOf(spec)
    expect(opts.heroItems).toEqual(spec.heroItems)
    expect(opts.heroes).toEqual(spec.heroes)
  })
  // refactor.one-action-type (engine, 2026-09-04): a Unit's `attacks` became `actions` —
  // ONE list of attacks, powers and movements in row order. What is asserted is unchanged:
  // the granted attack ids of the item that was fielded are on the unit, the other item's are not.
  it('the fielded Hunter shoots the shortbow, not the kit\'s longbow — and with nothing handed over, the kit', () => {
    const ctx = swapped()
    const e = ctx.campaign.cursor.engagement!
    const spec = makeBattleState(ctx.campaign.roster, e)
    const at = e.deployed.indexOf(HUNTER)
    const fielded = createBattle(battleOptionsOf(spec))
    const hunter = fielded.state.units.find((u) => u.uid === 100 + at)!
    expect(hunter.typeId).toBe(ctx.campaign.roster[HUNTER]!.unitType)
    for (const a of itemOf(SHORTBOW).grants) expect(hunter.actions).toContain(a)
    for (const a of itemOf(LONGBOW).grants) expect(hunter.actions).not.toContain(a)
    // the engine says why, per item, on the log (Law 12) — and the view reads it
    const worn = fielded.events.filter((ev) => ev.type === 'unit.equipped' && ev.actor === hunter.id).map((ev) => ev['itemId'])
    expect(worn).toEqual(ctx.campaign.roster[HUNTER]!.equipped)          // in placement order (loadout.ts)
    const v = viewBattle(ctx.campaign)
    const row = v.units.find((u) => u.heroId === HUNTER)!
    expect(row.equipped).toEqual(ctx.campaign.roster[HUNTER]!.equipped)
    for (const a of itemOf(SHORTBOW).grants) expect(row.attacks).toContain(a)
    // the same fielding with no list: the Codex default kit — the longbow
    const { heroItems: _dropped, ...bareSpec } = spec
    const bare = createBattle(battleOptionsOf(bareSpec))
    const kit = bare.state.units.find((u) => u.uid === 100 + at)!
    for (const a of itemOf(LONGBOW).grants) expect(kit.actions).toContain(a)
    for (const a of itemOf(SHORTBOW).grants) expect(kit.actions).not.toContain(a)
  })
})
