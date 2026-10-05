// kingdom.opening-free-equip — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the opening run, audited', question 4: "Should
// idols and bloodrunes be free to equip during the opening, or be left out of the opening's rewards?" — "4 free").
//
// Expect: "At http://127.0.0.1:4230/play an idol or bloodrune kept as a battle reward goes onto a hero at the Equip screen
// with an empty purse and is fielded in the next battle; outside the opening the same item still costs its faith or mana;
// the page test takes such a reward and asserts it worn."
//
// One rule, read from the Campaign's own state: while the Campaign is still in the opening (before any Week), what an
// item costs to equip is nothing (core/equip-session.ts equipCostOf(campaign, item); the row that says so is content's,
// content/equip.ts). The one equip path (core/shop.ts performEquip → paySession) is unchanged: it pays what the item
// costs here, which in the opening is nothing. The page half is tools/opening-run-six.verify.mjs.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, listDraftOffers, performOpeningDeploy, isOpeningDone } from '../src/core/opening.js'
import { makeCtx, type Ctx } from '../src/core/mutate.js'
import { performAdvancePrep } from '../src/core/prep.js'
import * as SHOP from '../src/core/shop.js'
import { canEquip, whyNotEquip, performEquip, performUnequip } from '../src/core/shop.js'
import { createSandbox } from '../src/core/sandbox.js'
import * as EQUIP_ROWS from '../src/content/equip.js'
import { ITEMS, itemOf } from '../src/content/items.js'
import { REWARDS, REWARD_ODDS } from '../src/content/rewards.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { equipPage } from '../src/ui/equip.js'
import { encounterDef } from '../src/engine.js'

const costOf = SHOP.equipCostOf as unknown as (...a: unknown[]) => Record<string, number>
// Law 10, 2026-10-04 (kingdom.rewards-only-authored; engine/DECISIONS.md 2026-10-04, Andrew: "One yes. Stop appearing as battle
// rewards."). These were read from the reward POOL (REWARDS), which held every idol and bloodrune of the odds table's tier. The
// pool now deals only the rows Andrew authored, and no idol or bloodrune in the game is his, so the pool has none and reading
// it would hold the rule below on no item at all. The rule — in the opening an idol or a bloodrune costs nothing to equip —
// stands (2026-10-03, "4 free") and is held on the same rows as before, read from the items: the idols and bloodrunes of the
// odds table's tier. The page half (the last test) is rewritten for the same reason, there.
const pool = (cls: string) => ITEMS.filter((r) => r.itemClass === cls && r.waystationBand === null && REWARD_ODDS.some((o) => o.itemClass === cls && o.tier === r.tier)).map((r) => r.id)
const IDOLS = pool('idol'), RUNES = pool('bloodrune')

/** A new run with its first hero drafted, the Orphanage fielded, standing at Equip — nothing in the purse, as the opening leaves it. */
function atEquip(seed = 11): { ctx: Ctx; hero: string } {
  const ctx = makeCtx(makeNewCampaign(seed))
  performAdvanceOpening(ctx, 'test'); performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test')
  const id = ABBOTOWN_MAP.sections[0]!.encounterId
  performFieldOpeningBattle(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
  expect(performOpeningDeploy(ctx, 'test')).toBe(false)
  expect(ctx.campaign.cursor.prepStep).toBe('equip')
  return { ctx, hero: ctx.campaign.cursor.engagement!.deployed[0]! }
}
const purseOf = (ctx: Ctx) => JSON.stringify(ctx.campaign.purse)

describe('kingdom.opening-free-equip — idols and bloodrunes equip free during the opening', () => {
  it('the idols and bloodrunes of the reward odds\' tier cost faith or mana to equip — and at the first Equip the purse is empty', () => {
    expect(IDOLS.length).toBeGreaterThan(0); expect(RUNES.length).toBeGreaterThan(0)
    for (const id of IDOLS) expect(itemOf(id).equipCost, `${id}'s row costs faith`).toEqual({ 'currency.faith': 1 })
    for (const id of RUNES) expect(itemOf(id).equipCost, `${id}'s row costs mana`).toEqual({ 'currency.mana': 3 })
    const { ctx } = atEquip()
    expect(Object.values(ctx.campaign.purse).every((n) => n === 0), 'a new run\'s purse is empty').toBe(true)
  })

  it('the rule is one row and one reading of the Campaign: in the opening an item costs nothing to equip; after it, its row\'s cost', () => {
    expect((EQUIP_ROWS as unknown as { OPENING_EQUIPS_FREE?: boolean }).OPENING_EQUIPS_FREE, 'content/equip.ts OPENING_EQUIPS_FREE').toBe(true)
    const { ctx } = atEquip(), c = ctx.campaign
    expect(isOpeningDone(c)).toBe(false)
    for (const id of [...IDOLS, ...RUNES]) expect(costOf(c, id), `${id} in the opening`).toEqual({})
    // the same Campaign, the opening done and a Week begun: the row's cost
    const later = structuredClone(c); later.cursor.prologue = null; later.week = 1
    for (const id of [...IDOLS, ...RUNES]) expect(costOf(later, id), `${id} after the opening`).toEqual(itemOf(id).equipCost)
    // not a second equip path: the one performEquip pays through the one paySession, which reads the one cost
    const shop = readFileSync('src/core/shop.ts', 'utf8'), session = readFileSync('src/core/equip-session.ts', 'utf8')
    expect(shop.match(/paySession\(/g)?.length, 'one call to paySession').toBe(1)
    expect(shop.match(/export function performEquip\b/g)?.length).toBe(1)
    expect(session).toContain('OPENING_EQUIPS_FREE')
    expect(session.match(/export (function|const) equipCostOf\b/g)?.length, 'one equipCostOf').toBe(1)
  })

  it('an idol or a bloodrune kept as a reward goes onto a hero at Equip with an empty purse, costs nothing, and is fielded in the battle', () => {
    for (const item of [IDOLS[0]!, RUNES[0]!]) {
      const { ctx, hero } = atEquip(), c = ctx.campaign
      c.stash.push(item)
      const before = purseOf(ctx)
      expect(whyNotEquip(c, hero, item), `${item} goes on with an empty purse`).toBeNull()
      expect(canEquip(c, hero, item)).toBe(true)
      performEquip(ctx, hero, item, 'test')
      expect(c.roster[hero]!.equipped).toContain(item); expect(c.stash).not.toContain(item)
      expect(purseOf(ctx), 'nothing is spent').toBe(before)
      expect(c.cursor.equipSession!.paid, 'nothing is paid, so nothing is owed back').toEqual([])
      expect(ctx.events.some((e) => e.type === 'equip.paid' || e.type === 'resource.spent')).toBe(false)
      // off again in the same sitting: nothing to refund, the purse is still empty
      performUnequip(ctx, hero, item, 'test')
      expect(purseOf(ctx)).toBe(before)
      performEquip(ctx, hero, item, 'test')
      // to the battle: the hero is fielded wearing it
      performAdvancePrep(ctx, 'test')
      expect(c.cursor.step).toBe('battle')
      const e = c.cursor.engagement!
      const s = createSandbox({ mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((id) => structuredClone(c.roster[id]!)), enemies: [], seed: e.seed, encounterId: e.id })
      const carried = [...(s.setup.heroItems?.[0] ?? []), ...((s.setup as unknown as { heroStowed?: readonly (readonly string[])[] }).heroStowed?.[0] ?? [])]
      expect(carried, `${item} is fielded on the hero`).toContain(item)
    }
  })

  it('outside the opening the same item still costs its faith or mana: refused with an empty purse, paid for with a full one', () => {
    for (const item of [IDOLS[0]!, RUNES[0]!]) {
      const { ctx, hero } = atEquip(), c = ctx.campaign
      c.stash.push(item)
      c.cursor.prologue = null; c.week = 1   // the same step of the same Campaign, the opening behind it
      expect(whyNotEquip(c, hero, item), `${item} with an empty purse`).toMatch(/short of (Faith|Mana)/)
      expect(() => performEquip(ctx, hero, item, 'test')).toThrow(/short of/)
      const [currency, amount] = Object.entries(itemOf(item).equipCost)[0]!
      c.purse[currency] = amount
      performEquip(ctx, hero, item, 'test')
      expect(c.purse[currency], `${item} is paid for`).toBe(0)
      expect(c.cursor.equipSession!.paid).toEqual([{ heroId: hero, itemId: item, cost: itemOf(item).equipCost }])
      expect(ctx.events.some((e) => e.type === 'equip.paid')).toBe(true)
    }
  })

  it('the Equip screen shows the cost as free in the opening, and as its faith or mana outside it', () => {
    const { ctx, hero } = atEquip(), c = ctx.campaign
    c.stash.push(IDOLS[0]!, RUNES[0]!)
    const tile = (html: string, id: string) => { const at = html.indexOf(`data-act="pick" data-id="${id}"`); return html.slice(at, html.indexOf('</small>', at)) }
    const opening = equipPage(c, [hero], { where: 'prep', picked: null })
    for (const id of [IDOLS[0]!, RUNES[0]!]) { expect(tile(opening, id), `${id}: free`).toContain('free to equip'); expect(tile(opening, id)).not.toMatch(/\d+ (faith|mana) to equip/) }
    c.cursor.prologue = null; c.week = 1
    const later = equipPage(c, [hero], { where: 'prep', picked: null })
    expect(tile(later, IDOLS[0]!)).toContain('1 faith to equip'); expect(tile(later, RUNES[0]!)).toContain('3 mana to equip')
    expect(later).not.toContain('free to equip')
  })

  // Law 10, 2026-10-04 (kingdom.rewards-only-authored; engine/DECISIONS.md 2026-10-04, Andrew: "One yes. Stop appearing as battle
  // rewards."). This held that the page's run (seed 11) keeps an idol or a bloodrune as a battle reward and wears it free. The
  // reward pool now deals only the rows Andrew authored and no idol or bloodrune is his, so no run is offered one: the old line
  // pinned a set-aside item as a dealt card. As the rule now stands, the page's run says the pool holds none and keeps none —
  // and, whenever the list gives the pool one and a run is offered it, the old sentence, word for word (the tool still asserts
  // every step of it where it happens). The rule is held above on the screens' own HTML and the one equip path.
  it('the page: no idol or bloodrune is in the reward pool, so none is kept as a battle reward — one that is, is put on a hero at Equip free and fielded', () => {
    const six = execFileSync(process.execPath, ['tools/opening-run-six.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    const inPool = REWARDS.some((r) => IDOLS.includes(r.id) || RUNES.includes(r.id))
    if (inPool) expect(six).toMatch(/(an? (idol|bloodrune) kept as a battle reward \([^)]+\) went onto [^;]+ at Equip free — shown as free to equip, nothing taken from the purse — and was fielded in the next battle|no idol or bloodrune was offered before the last battle)/)
    else expect(six).toContain('no idol or bloodrune is in the reward pool (none is on the list of the items Andrew authored), so none was kept as a battle reward')
    // Law 10, 2026-10-04 (kingdom.rewards-derived-rows-offered; Andrew, "1 yes": one of his bases carrying one of his attributes is
    // his): this line read "only items on that list … (N listed cards …)", which held a card to an id on the list alone.
    expect(six).toMatch(/every reward screen showed only his items — on that list, or one of his bases carrying one of his attributes — or the battle's own named reward \(\d+ drawn cards: \d+ on the list, \d+ made of listed rows; named: item\.longsword\.flaming\)/)
  }, 1800000)
})
