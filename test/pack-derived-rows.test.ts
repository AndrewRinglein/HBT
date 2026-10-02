// pack.derived-rows (2026-09-25; filed from the kingdom session 2026-09-03, G9).
// The Forge sells tier-2 rows the codex never lists one by one: a MASTERWORK
// row for every tier-1 two-hander and armor (+1 Max Stamina, tier 2) and an
// ENCHANTED row for every tier-1 base x every buyable enchant it takes
// (GEAR-DESIGN.md §3; the kingdom's tools/mk-items.mjs is the reference rule).
// The engine's ITEMS had the codex rows and the tier-3 combinations but not
// these, so a hero wearing one into battle was refused by applyItems. The
// engine pack now derives the same rows by the same rule (content/mkenginepack.mjs,
// beside the tier-3 rule). Pipeline agreement, never frozen counts: the id
// list is read off the kingdom's generated rows each run.
//
// Payload (SWITCHES `forgeEnchantPayload`): GEAR-DESIGN.md §3, ruled 2026-09-05
// (Angela), "All of the modifiers from weapons and range weapons are only on
// the attack. They're not an inherent stat modifier." — a weapon enchant's
// numbers ride COPIED attack rows (ITEMS-PLAN.md §6 route (a)); an armor
// enchant's are the item's statModifiers.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { attackIdsOf } from '../src/core/action.js'
import { createBattle, fieldedDef } from '../src/core/setup.js'
import { damageSourceOfAttack, resolveDamage } from '../src/core/pipeline.js'
import { ATTACKS, ITEMS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

// Law 10, 2026-10-02 (kingdom.reads-engine, review finding K2): the kingdom no longer derives its own Forge rows (its
// mk-items steps 2-4 retired) — its rows ARE these, joined to the codex items' campaign fields, which its generated file
// carries one per codex item. "Every id the kingdom generates resolves" becomes: it generates no derived id, every id it
// carries is an engine item, and every Forge row's base is one it carries — so the two cannot drift apart again.
type KingdomRow = { id: string }
const kingdomRows = (): KingdomRow[] => {
  const text = readFileSync(join(__dirname, '..', '..', 'kingdom', 'src', 'content', 'generated', 'items.ts'), 'utf8')
  return [...text.matchAll(/^ {2}(\{.*\}),$/gm)].map((m) => JSON.parse(m[1]!) as KingdomRow).filter((r) => r.id.startsWith('item.'))   // the item rows, not the enchants' campaign rows
}
type Derived = { base?: string; enchant?: string }
const provenance = (id: string): Derived => ITEMS[id] as unknown as Derived

const base = scenarioOptions(scenarioDef('showcase.prologue-party'))
const fielded = (hero: string, items: string[]) => {
  const ctx = createBattle({ ...base, heroes: [hero], heroHexes: [247], heroItems: [items] })
  return { ctx, h: ctx.state.units[0]! }
}

describe('the Forge rows resolve in the engine', () => {
  it('every id the kingdom generates is an item in ITEMS, and it generates no derived row of its own', () => {
    const rows = kingdomRows()
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.map((r) => r.id).filter((id) => !ITEMS[id])).toEqual([])
    expect(rows.filter((r) => provenance(r.id).base)).toEqual([])
  })

  it('every Forge row is tier 2, its base tier 1 and one the kingdom carries campaign fields for', () => {
    const carried = new Set(kingdomRows().map((r) => r.id))
    const forge = Object.values(ITEMS).filter((it) => provenance(it.id).base && it.tier === 2)
    expect(forge.some((it) => !provenance(it.id).enchant)).toBe(true)
    expect(forge.some((it) => provenance(it.id).enchant)).toBe(true)
    for (const it of forge) {
      const b = provenance(it.id).base!
      expect(ITEMS[b]!.tier, `${it.id}'s base is tier 1`).toBe(1)
      expect(ITEMS[b]!.itemClass, it.id).toBe(it.itemClass)
      expect(carried.has(b), `${it.id}'s base ${b} has the kingdom's campaign fields`).toBe(true)
    }
  })
})

describe('masterwork — +1 Max Stamina, nothing else', () => {
  // SWITCHES `longswordMasterwork`: the backlog row names item.longsword.masterwork,
  // but the Longsword is one-handed and GEAR-DESIGN §3 makes masterwork "two-handers
  // and armor only" — no such row exists in either package. The claim is proved on
  // the Greatsword, the two-handed sword.
  // SUPERSEDED 2026-09-25 (Andrew, DECISIONS.md "masterwork: one-handers and shields
  // too"): item.longsword.masterwork now exists in both packages; its claim is proved
  // in test/fix-masterwork-scope.test.ts. This test's claim on the Greatsword still holds.
  it('a warrior fielded with the masterwork greatsword has one more Max Stamina than with the greatsword, and swings the same attacks', () => {
    const plain = fielded('hero.base.warrior-iron', ['item.greatsword'])
    const mw = fielded('hero.base.warrior-iron', ['item.greatsword.masterwork'])
    expect(mw.h.maxStamina).toBe(plain.h.maxStamina + 1)
    expect(mw.h.maxHp).toBe(plain.h.maxHp)
    expect(attackIdsOf(mw.ctx, mw.h)).toEqual(attackIdsOf(plain.ctx, plain.h))
    const eq = mw.ctx.events.filter((e) => e.type === 'unit.equipped' && e.actor === mw.h.id)
    expect(eq.map((e) => e.causeId)).toEqual(['item.greatsword.masterwork'])
  })

  it('a masterwork armor adds +1 Max Stamina to what the armor already gives', () => {
    const plain = fieldedDef('hero.base.warrior-iron', ['item.studded-leather'])
    const mw = fieldedDef('hero.base.warrior-iron', ['item.studded-leather.masterwork'])
    expect(mw.maxStamina).toBe((plain.maxStamina ?? 0) + 1)
    expect(mw.maxHp).toBe(plain.maxHp)
  })
})

describe('enchanted — the weapon enchant rides the weapon\'s own attacks', () => {
  it('a Cruel Ancient Tome: every granted attack is a copied row with +3 Accuracy and +4 Crit; the mage\'s own stats do not move', () => {
    const tome = ITEMS['item.ancient-tome']!, cruel = ITEMS['item.ancient-tome.cruel']!
    expect(cruel.grants.length).toBe(tome.grants.length)
    cruel.grants.forEach((id, i) => {
      const from = ATTACKS[tome.grants[i]!]!.attack, to = ATTACKS[id]!.attack
      expect(id).not.toBe(tome.grants[i])
      expect(to.accuracy ?? 0, id).toBe((from.accuracy ?? 0) + 3)
      expect(to.crit ?? 0, id).toBe((from.crit ?? 0) + 4)
      expect(to.bonus, id).toBe(from.bonus)
    })
    const plain = fielded('hero.base.mage-thinking', ['item.ancient-tome'])
    const en = fielded('hero.base.mage-thinking', ['item.ancient-tome.cruel'])
    expect(en.h.accuracy).toBe(plain.h.accuracy)
    expect(en.h.crit).toBe(plain.h.crit)
    expect(attackIdsOf(en.ctx, en.h)).toEqual(expect.arrayContaining([...cruel.grants]))
  })

  it('a Heavy Longsword\'s slash does exactly one more damage than the Longsword\'s (ITEMS-PLAN §8 #3)', () => {
    const plain = fielded('hero.base.warrior-iron', ['item.longsword'])
    const heavy = fielded('hero.base.warrior-iron', ['item.longsword.heavy'])
    const enemyOf = (c: typeof plain) => c.ctx.state.units.find((u) => u.side !== c.h.side)!
    const slash = ITEMS['item.longsword']!.grants[0]!, heavySlash = ITEMS['item.longsword.heavy']!.grants[0]!
    const d0 = resolveDamage(plain.ctx, plain.h, enemyOf(plain), damageSourceOfAttack(ATTACKS[slash]!), false).value
    const d1 = resolveDamage(heavy.ctx, heavy.h, enemyOf(heavy), damageSourceOfAttack(ATTACKS[heavySlash]!), false).value
    expect(d1).toBe(d0 + 1)
  })

  it('an armor enchant is the armor\'s own stat: Hale Studded Leather is two more Health', () => {
    const plain = fieldedDef('hero.base.warrior-iron', ['item.studded-leather'])
    const hale = fieldedDef('hero.base.warrior-iron', ['item.studded-leather.hale'])
    expect(hale.maxHp).toBe(plain.maxHp + 2)
    expect(hale.maxStamina).toBe(plain.maxStamina)
  })
})
