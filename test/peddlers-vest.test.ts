// content.peddlers-vest (2026-09-29). Ruled 2026-09-28 (Andrew, DECISIONS.md "no Health minimum; the
// Peddler's Vest has no Health change ..."): "The Peddler's Vest should just be -5 dodge, -5 accuracy,
// +1 item slot. No health change." The row is the Codex's (content/gen/armor-enchants.json), carried to
// the engine pack; nothing here types it into the engine. The item slot is a kingdom quantity — the pack
// names it as a gap ("no UnitDef field"), so the battle sees the Dodge and the Accuracy only.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createBattle, fieldedDef } from '../src/core/setup.js'
import { ITEMS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { openingDraftOf, openingPartyOf } from '../src/content/opening-party.js'

const VEST = 'item.peddlers-vest'
const codexRow = () => (JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8')) as
  { items: { id: string; statModifiers: Record<string, number> }[] }).items.find((i) => i.id === VEST)

describe('content.peddlers-vest — -5 Dodge, -5 Accuracy, +1 item slot, no Health change', () => {
  it('the Codex row is exactly the ruling: one item slot, 5 Dodge and 5 Accuracy off, and no Health', () => {
    expect(codexRow()?.statModifiers).toEqual({ itemSlots: 1, dodge: -5, accuracy: -5 })
  })
  it('the engine pack agrees with the Codex: the battle takes the Dodge and the Accuracy and no Health; the slot is named, not dropped', () => {
    const item = ITEMS[VEST]!
    expect(item.statModifiers).toEqual({ dodge: -5, accuracy: -5 })
    expect(item.statModifiers.maxHp).toBeUndefined()
    expect(item.gaps?.some((g) => g.startsWith("statModifier 'itemSlots' 1"))).toBe(true)
  })
  it('every hero who wears it fields its row\'s own Health; the Raven fields Health 5', () => {
    const wearers = Object.keys(UNITS).filter((id) => (UNITS[id]!.defaultItems ?? []).includes(VEST)).sort()
    expect(wearers.length).toBeGreaterThan(0)
    for (const id of wearers) {
      const row = UNITS[id]!, f = fieldedDef(id)
      expect(f.maxHp, `${id} Health`).toBe(row.maxHp)
      expect(f.dodge, `${id} Dodge`).toBe((row.dodge ?? 0) - 5)
      expect(f.accuracy, `${id} Accuracy`).toBe((row.accuracy ?? 0) - 5)
    }
    expect(fieldedDef('hero.base.rogue-raven').maxHp).toBe(5)
  })
  it('in a real battle the Raven stands with Health 5 — the Orphanage replicate that drafts her first, at level 1', () => {
    // the opening's draft (fix.opening-party) is the one path that fields a pool hero at level 1 on its own kit
    const r = Array.from({ length: 200 }, (_, n) => n).find((n) => openingDraftOf(n, 1)[0] === 'hero.base.rogue-raven')
    expect(r, 'a replicate that drafts the Raven first').toBeDefined()
    const opts = scenarioOptions(scenarioDef('test.opening-orphanage'), r!)
    const ctx = createBattle({ ...opts, replicate: r! } as Parameters<typeof createBattle>[0])
    const raven = ctx.state.units.find((u) => u.typeId === 'hero.base.rogue-raven')!
    // Law 10, fix.opening-draft (2026-09-29): the first hero now carries +2 Health and its Crucible points
    // (Andrew, DECISIONS.md 2026-09-28: "+2 health. One stat point from the Crucible's randomness"), handed
    // in as unit mods — the vest's part is unchanged: her Health is her row's 5 plus exactly what was handed in.
    // was: expect([raven.maxHp, raven.hp]).toEqual([5, 5])
    const handed = (openingPartyOf(1, r!).heroMods[0]?.stats ?? []).filter((m) => m.stat === 'maxHp').reduce((a, m) => a + m.add, 0)
    expect([raven.maxHp, raven.hp]).toEqual([5 + handed, 5 + handed])
  })
})
