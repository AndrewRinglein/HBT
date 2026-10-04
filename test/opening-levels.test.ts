// fix.opening-levels (2026-10-02): the opening's party levels up between its battles, the Flaming Longsword is a
// Warrior's or a Paladin's, and the Bridge gives a reward. Ruled 2026-09-28 (Andrew, DECISIONS.md 'the opening's party
// levels up; the Flaming Longsword is a Warrior's or a Paladin's; the Bridge gives a reward', 'levels by XP at 20, 50,
// 100, 170, 270, 400', 'the Orphanage pays 20 XP no matter what'): "They need to be leveling up." · "it only is going to
// help the paladin or the warrior." · "On battle 3, which is the bridge, we should be giving another reward."
// The XP, the curve and the rewards are the kingdom's (kingdom/src/sim/opening-run.ts carries a replicate through the
// six battles and hands each one's party back as an OpeningCarry); the engine fields the carry, places a carried item
// and keeps one of three cards (src/content/opening-party.ts). The kingdom's half runs here as its own suite file.
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createBattle } from '../src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { OPENING_POSITIONS, OPENING_TAKERS, openingDraftOf, openingHolderOf, openingPartyOf, openingRewardPickOf, withOpeningItem } from '../src/content/opening-party.js'
import { ITEMS, LEVELS, UNITS } from '../src/content/index.js'
import OPENING from '../../progression/OPENING-PARTY.json' with { type: 'json' }

const SWORD = 'item.longsword.flaming'
const KINGDOM = fileURLToPath(new URL('../../kingdom/', import.meta.url))
const VITEST = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))
const classOf = (id: string) => (UNITS[id]!.tags ?? []).find((t) => t.startsWith('class.'))!
const swordHolders = (heroItems: readonly (readonly string[] | undefined)[]) => heroItems.flatMap((l, i) => (l?.includes(SWORD) ? [i] : []))

describe('fix.opening-levels — the engine fields what the opening carried', () => {
  it('the Flaming Longsword is a Warrior\'s or a Paladin\'s: only they take it, and nobody when neither is drafted', () => {
    expect(OPENING_TAKERS[SWORD]).toEqual(['class.warrior', 'class.paladin'])
    let none = -1
    for (let r = 0; r < 60; r++) {
      for (const p of [3, 4, 5, 6]) {
        const { heroes, heroItems } = openingPartyOf(p, r)
        const holders = swordHolders(heroItems)
        const takers = heroes.filter((id) => OPENING_TAKERS[SWORD]!.includes(classOf(id)))
        expect(holders, `replicate ${r} position ${p}`).toHaveLength(takers.length ? 1 : 0)
        // the first Warrior or Paladin drafted holds it
        if (takers.length) expect(heroes[holders[0]!], `replicate ${r} position ${p}`).toBe(takers[0])
      }
      // Law 10, fix.opening-probe-cadence (2026-10-04; DECISIONS.md 2026-10-03 'one draft after every battle; …': "One, yes." — a party of 1, 2, 3, 4, 5, 6): this read openingDraftOf(r, 4) — the Bridge's party of four under the old cadence. The Bridge's
      // party is whatever the numbers file gives position 3 (three now); the claim is unchanged.
      if (none < 0 && !openingDraftOf(r, OPENING_POSITIONS[2]!.drafted).some((id) => OPENING_TAKERS[SWORD]!.includes(classOf(id)))) none = r
    }
    expect(none, 'a replicate whose Bridge party has no Warrior or Paladin').toBeGreaterThanOrEqual(0)
    expect(swordHolders(openingPartyOf(3, none).heroItems)).toEqual([])
    // the holder fields it in hand, its kit weapons gone, its shield and armour kept
    const brawler = 'hero.base.warrior-brawler', paladin = 'hero.base.paladin-shiney'
    expect(withOpeningItem(paladin, undefined, SWORD)).toEqual([SWORD, ...UNITS[paladin]!.defaultItems!.filter((k) => ITEMS[k]!.itemClass !== 'weapon')])
    expect(openingHolderOf(SWORD, ['hero.base.mage-fire', brawler], [undefined, undefined])).toEqual({ holder: 1, items: [SWORD, ...UNITS[brawler]!.defaultItems!] })
    expect(openingHolderOf(SWORD, ['hero.base.mage-fire', 'hero.base.ranger-ranger'], [undefined, undefined])).toBeNull()
  })

  it('a carry fields each drafted hero at its level — the specialty from level 2, the level-5 pick, no drafted power — and a hero past the carry at level 1', () => {
    const r = 1
    const party = openingPartyOf(4, r, { levels: [5, 3, 2], items: [] })
    const [a, b, c, d, e] = party.heroProgress
    const spec = (id: string) => (OPENING.specialties as Record<string, string>)[classOf(id)]
    expect(a).toEqual({ level: 5, specialtyId: spec(party.heroes[0]!), levelFivePick: LEVELS[classOf(party.heroes[0]!)]!.rows.find((x) => x.level === 5)!.choice![0], powers: [] })
    expect(b).toEqual({ level: 3, specialtyId: spec(party.heroes[1]!), powers: [] })
    expect(c).toEqual({ level: 2, specialtyId: spec(party.heroes[2]!), powers: [] })
    expect([d, e]).toEqual([undefined, undefined])
    // a carry names the items: the static sword is not added on top of it
    expect(swordHolders(party.heroItems)).toEqual([])
    expect(() => openingPartyOf(1, r, { levels: [2, 2], items: [] })).toThrow(/carry names 2 heroes, but 1 are drafted/)
    expect(() => scenarioOptions(scenarioDef('test.opening-units'), 0, { levels: [], items: [] })).toThrow(/no opening position/)
  })

  it('the Cavern Trail fields the carried party: its levels grow the heroes, its items are in their hands', () => {
    const S = scenarioDef('test.opening-cavern-trail'), r = 2
    const { heroes } = openingPartyOf(4, r)
    const holder = openingHolderOf(SWORD, heroes, heroes.map(() => undefined))
    const items = heroes.map((_, n) => (holder && n === holder.holder ? holder.items : undefined))
    const carry = { levels: heroes.map((_, n) => (n === 0 ? 3 : 1)), items }
    const carried = createBattle(scenarioOptions(S, r, carry))
    const bare = createBattle(scenarioOptions(S, r, { levels: [], items: [] }))
    const first = (ctx: typeof carried) => ctx.state.units.find((u) => u.side === 'hero' && u.typeId === heroes[0])!
    expect(first(carried).maxHp + first(carried).strength + first(carried).precision + first(carried).magic + first(carried).spirit)
      .toBeGreaterThan(first(bare).maxHp + first(bare).strength + first(bare).precision + first(bare).magic + first(bare).spirit)
    const named = (ctx: typeof carried) => ctx.events.filter((x) => x.actor === 0 || x.target === 0).some((x) => JSON.stringify(x).includes((OPENING.specialties as Record<string, string>)[classOf(heroes[0]!)]!))
    expect([named(carried), named(bare)], 'the specialty is named in the log at level 3, not at level 1').toEqual([true, false])
    if (holder) expect(carried.state.units.find((u) => u.side === 'hero' && u.typeId === heroes[holder.holder])!.loadout!.hands.some((i) => i.itemId === SWORD)).toBe(true)
  })

  it('one of three reward cards is kept as a player would: a card on a hero who may hold it, by the class\'s weights, ties to the earlier card', () => {
    const heroes = ['hero.base.warrior-iron', 'hero.base.mage-fire', 'hero.base.priest-armored']
    const cards = Object.values(ITEMS).filter((i) => ['trinket', 'relic', 'idol', 'bloodrune', 'armor'].includes(i.itemClass) && Object.keys(i.statModifiers ?? {}).length).map((i) => i.id).slice(0, 12)
    for (let k = 0; k + 3 <= cards.length; k += 3) {
      const offers = cards.slice(k, k + 3)
      const got = openingRewardPickOf(offers, heroes, heroes.map(() => undefined))
      expect(got, offers.join(',')).not.toBeNull()
      expect(offers).toContain(got!.itemId)
      expect(got!.items).toContain(got!.itemId)
      // the same call, the same keep; the kept card fields legally on its holder
      expect(openingRewardPickOf(offers, heroes, heroes.map(() => undefined))).toEqual(got)
      expect(() => createBattle({ scenarioId: 'probe.reward', replicate: 1, heroes: [heroes[got!.holder]!], heroItems: [got!.items], enemies: ['unit.zombie'], enemyCount: 1, mapId: 'map.open' })).not.toThrow()
    }
    // a bow never goes to a sword hand, nor a sword to a bow's
    expect(openingRewardPickOf(['item.longbow'], ['hero.base.warrior-iron'], [undefined])).toBeNull()
    expect(openingRewardPickOf(['item.longsword'], ['hero.base.ranger-ranger'], [undefined])).toBeNull()
    expect(() => openingRewardPickOf(['item.no-such-card'], heroes, [])).toThrow(/not in the content/)
  })

  it("the kingdom's half: the XP of each battle's own result, the level on the ruled curve, the sword and the Bridge's reward carried (../kingdom/test/opening-levels.test.ts)", () => {
    const out = execFileSync(process.execPath, [VITEST, 'run', 'test/opening-levels.test.ts'], { cwd: KINGDOM, encoding: 'utf8', stdio: 'pipe' })
    expect(out.replace(/\x1b\[[0-9;]*m/g, '')).toMatch(/Tests\s+5 passed/)
  }, 600_000)
})
