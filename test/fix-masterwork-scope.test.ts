// fix.masterwork-scope (2026-09-25). Ruled by Andrew, engine DECISIONS.md
// "masterwork: one-handers and shields too": "Masterwork should not only apply
// to two-handed armor. It can also apply to a shield. It can also apply to a
// one-hander." GEAR-DESIGN.md §3 now reads: masterwork is a tier-1 two-hander,
// one-hander, shield or armor; +1 Max Stamina, tier 2 — unchanged. A shield is
// still never enchanted (not ruled otherwise).
//
// Both generators widen together — content/mkenginepack.mjs (the engine pack)
// and kingdom/tools/mk-items.mjs (the kingdom's rows) — so every Forge id
// resolves in both directions. Pipeline agreement, never frozen counts: the
// rule is read off the Codex rows and the kingdom's generated file each run.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { attackIdsOf } from '../src/core/action.js'
import { createBattle, fieldedDef } from '../src/core/setup.js'
import { ITEMS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

type CodexItem = { id: string; itemClass: string; tier: number | string; hands?: number; tags?: string[]; classRestriction?: string | null }
const codex = (): CodexItem[] =>
  (JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8')) as { items: CodexItem[] }).items
const isShield = (c: CodexItem) => (c.tags ?? []).includes('shield') || c.itemClass === 'shield'
// GEAR-DESIGN.md §3 as corrected 2026-09-25: two-handers, one-handers, shields and armor.
// fix.one-hero-assembly (2026-10-02), Law 10: a natural weapon took hands 0, which is how this rule kept it out; every weapon
// now takes at least one hand (DECISIONS.md 2026-09-28, "There should be no weapon that is zero-handed"), so the natural
// weapon — a beast's body part, class.beast — is kept out by name, as the test's own title says (SWITCHES.md naturalWeaponMasterwork).
// was: (isShield(c) || c.itemClass === 'armor' || (c.itemClass === 'weapon' && (c.hands === 1 || c.hands === 2)))
const takesMasterwork = (c: CodexItem) => Number(c.tier) === 1 &&
  (isShield(c) || c.itemClass === 'armor' || (c.itemClass === 'weapon' && c.classRestriction !== 'class.beast' && (c.hands === 1 || c.hands === 2)))

type KingdomRow = { id: string; base: string | null; enchant: string | null; source: string }
const kingdomRows = (): KingdomRow[] => {
  const text = readFileSync(join(__dirname, '..', '..', 'kingdom', 'src', 'content', 'generated', 'items.ts'), 'utf8')
  return [...text.matchAll(/^ {2}(\{.*\}),$/gm)].map((m) => JSON.parse(m[1]!) as KingdomRow)
}
type Derived = { base?: string; enchant?: string }
const derived = () => Object.values(ITEMS).filter((it) => (it as unknown as Derived).base && it.tier === 2) as unknown as (Derived & { id: string })[]

const base = scenarioOptions(scenarioDef('showcase.prologue-party'))
const fielded = (hero: string, items: string[]) => {
  const ctx = createBattle({ ...base, heroes: [hero], heroHexes: [247], heroItems: [items] })
  return { ctx, h: ctx.state.units[0]! }
}

describe('masterwork reaches one-handers and shields', () => {
  it('item.longsword.masterwork exists: one more Max Stamina than the Longsword, the same attacks, tier 2', () => {
    const mwRow = ITEMS['item.longsword.masterwork']
    expect(mwRow).toBeDefined()
    expect(mwRow!.tier).toBe(2)
    expect((mwRow as unknown as Derived).base).toBe('item.longsword')
    const plain = fielded('hero.base.warrior-iron', ['item.longsword'])
    const mw = fielded('hero.base.warrior-iron', ['item.longsword.masterwork'])
    expect(mw.h.maxStamina).toBe(plain.h.maxStamina + 1)
    expect(mw.h.maxHp).toBe(plain.h.maxHp)
    expect(mw.h.block).toBe(plain.h.block)
    expect(attackIdsOf(mw.ctx, mw.h)).toEqual(attackIdsOf(plain.ctx, plain.h))
  })

  it('every tier-1 shield has a masterwork row: +1 Max Stamina over the shield, nothing else moved', () => {
    const shields = codex().filter((c) => Number(c.tier) === 1 && isShield(c))
    expect(shields.length).toBeGreaterThan(0)
    for (const s of shields) {
      const mw = ITEMS[`${s.id}.masterwork`]
      expect(mw, `${s.id}.masterwork`).toBeDefined()
      const plain = fieldedDef('hero.base.warrior-iron', ['item.longsword', s.id])
      const withMw = fieldedDef('hero.base.warrior-iron', ['item.longsword', `${s.id}.masterwork`])
      expect(withMw.maxStamina, s.id).toBe((plain.maxStamina ?? 0) + 1)
      expect(withMw.block, s.id).toBe(plain.block)
      expect(withMw.maxHp, s.id).toBe(plain.maxHp)
    }
  })

  it('the masterwork rows are exactly the tier-1 two-handers, one-handers, shields and armor — no natural weapon, trinket or relic', () => {
    const want = codex().filter(takesMasterwork).map((c) => `${c.id}.masterwork`).sort()
    const have = derived().filter((d) => !d.enchant).map((d) => d.id).sort()
    expect(have).toEqual(want)
  })

  it('no shield has an enchanted tier-2 row — a shield is still never enchanted', () => {
    const shieldIds = new Set(codex().filter(isShield).map((c) => c.id))
    const bad = derived().filter((d) => d.enchant && shieldIds.has(d.base!)).map((d) => d.id)
    expect(bad).toEqual([])
  })

  it('the kingdom and the engine hold the same masterwork ids, in both directions', () => {
    const k = kingdomRows().filter((r) => r.source === 'masterwork').map((r) => r.id).sort()
    const e = derived().filter((d) => !d.enchant).map((d) => d.id).sort()
    expect(k).toContain('item.longsword.masterwork')
    expect(k).toEqual(e)
  })
})
