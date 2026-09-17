// fix.class-restriction (2026-09-04) — session 9's E5b. Ruled 2026-09-03 (the
// Proving): "Items only on classes that can wield them." `ItemDef.classRestriction`
// was on 138 of 510 rows and read by nobody in src/core: a warrior fielded with
// a fire staff and nothing refused (9-PROVING-SETTLED §2). The fielding refuses
// it now, with the reason — so a mis-wielded item is INVALID in the Proving,
// never a number.
import { describe, expect, it } from 'vitest'
import { applyItems } from '../src/core/items.js'
import { ACTIONS, BURSTS, ATTACKS, ITEMS, UNITS } from '../src/content/index.js'
import { createBattle } from '../src/core/setup.js'
import { hexId } from './board16.js'

describe('the fielding reads classRestriction', () => {
  it('a warrior cannot wield the fire staff (class.mage); the reason names the row, its class and the restriction', () => {
    expect(ITEMS['item.fire-staff']!.classRestriction).toBe('class.mage')
    expect(() => applyItems(UNITS['hero.base.warrior-iron']!, ['item.fire-staff'], ITEMS, ACTIONS, 'test'))
      .toThrow(/hero\.base\.warrior-iron \(class\.warrior\) cannot wield 'item\.fire-staff', a class\.mage item/)
  })
  it('the mage can — and every Codex start kit already obeys its own restrictions', () => {
    expect(() => applyItems(UNITS['hero.base.mage-fire']!, ['item.fire-staff'], ITEMS, ACTIONS, 'test')).not.toThrow()
    for (const u of Object.values(UNITS)) if (u.defaultItems?.length) expect(() => applyItems(u, u.defaultItems!, ITEMS, ACTIONS, 'kits')).not.toThrow()
  })
  it('an unrestricted item goes on anyone; a civilian (class.civilian) is refused a class.warrior item', () => {
    const free = Object.values(ITEMS).find((i) => !i.classRestriction && i.itemClass === 'armor')!
    expect(() => applyItems(UNITS['hero.fixed.fisherman']!, [free.id], ITEMS, ACTIONS, 'test')).not.toThrow()
    expect(() => applyItems(UNITS['hero.fixed.fisherman']!, ['item.war-axe'], ITEMS, ACTIONS, 'test')).toThrow(/cannot wield 'item\.war-axe', a class\.warrior item/)
  })
  it('createBattle refuses the fielding the same way — the seam the Proving reads', () => {
    expect(() => createBattle({ replicate: 0, mapId: 'map.open', heroes: ['hero.base.warrior-iron'], heroHexes: [hexId(0, 5)], heroItems: [['item.fire-staff']], enemies: ['unit.zombie'], enemyHexes: [hexId(15, 5)], enemyCount: 1 }))
      .toThrow(/cannot wield 'item\.fire-staff'/)
  })
})
