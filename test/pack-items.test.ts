// pack.items (2026-09-02, ITEMS-PLAN.md §3) — every Codex item row reaches the
// engine as an ItemDef. Ruled 2026-09-02 (Andrew): "the items should go into
// battle … They define what attacks they have. They modify stats." This is
// the registry; nothing fields an item until seam.items-per-unit. Pipeline
// agreement, never frozen numbers: every assertion reads the Codex row and
// checks the pack said the same.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTIONS, BURSTS, ABILITIES, ATTACKS, ITEMS, UNITS } from '../src/content/index.js'
import { fieldedDef, createBattle } from '../src/core/setup.js'

// LAW 10 — 2026-09-02 (seam.items-per-unit): hero rows are BARE now — the kit's
// attacks, powers, riders and stat deltas are applied at FIELDING by
// applyItems, not folded into the row by the converter. Every claim below
// about what a hero carries is a claim about the hero AS FIELDED, so it reads
// fieldedDef(id) (the one function the battle and any preview share). The
// claims are unchanged; only where the kit lives moved.
const CONTENT = join(__dirname, '..', '..', 'content')
type CodexItem = { id: string; name: string; itemClass: string; hands: number; slots: number; grants: string[]; statModifiers: Record<string, number>; triggers: { hook: string; effect: string }[]; stamina?: number; targets?: string }
const codexItems = (): Map<string, CodexItem> => {
  const D = JSON.parse(readFileSync(join(CONTENT, 'hbt-content.json'), 'utf8'))
  const out = new Map<string, CodexItem>()
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) { o.forEach(walk); return }
    if (o && typeof o === 'object') {
      const r = o as { id?: string; itemClass?: string }
      if (typeof r.id === 'string' && r.id.startsWith('item.') && r.itemClass) out.set(r.id, r as CodexItem)
      Object.values(o).forEach(walk)
    }
  }
  walk(D)
  return out
}
const kits = (): Record<string, string[]> =>
  Object.fromEntries(Object.entries(JSON.parse(readFileSync(join(CONTENT, 'gen', 'kits.json'), 'utf8')).heroKits as Record<string, unknown>)
    .filter(([id, v]) => id.startsWith('hero.') && Array.isArray(v))) as Record<string, string[]>
const STAT_WORD: Record<string, string> = { health: 'maxHp', staminaMax: 'maxStamina' }

describe('every Codex item is an ItemDef, and says exactly what it can and cannot do', () => {
  it('every Codex item row, every Codex item class, ids and physical facts verbatim', () => {
    // Counts are the Codex's to change (the consumable class was deleted and
    // the Waystation rows added while this landed, 268 rows now) — the claim
    // is agreement, read off the Codex each run.
    const codex = codexItems()
    // Hero assembly (2026-09-03): ITEMS also carries the generated tier-3
    // enchanted rows (ITEMS-PLAN.md §6, base + enchant); the Codex rows are
    // exactly the ones with no `enchant` provenance. Agreement, not a count.
    // LAW 10 — 2026-09-25 (pack.derived-rows): the Forge's masterwork rows are derived
    // (GEAR-DESIGN.md §3) and name a `base` but no enchant, so "no derivation provenance"
    // now reads both fields. The claim — the Codex rows are exactly the underived ones,
    // every one present with its facts verbatim — is unchanged; no assertion moved.
    const codexOnly = Object.values(ITEMS).filter((it) => !(it as { enchant?: string }).enchant && !(it as { base?: string }).base)
    expect(codexOnly.length).toBe(codex.size)
    for (const [id, c] of codex) {
      const it = ITEMS[id]!
      expect(it, id).toBeDefined()
      expect(it.name).toBe(c.name)
      expect(it.itemClass).toBe(c.itemClass)
      expect(it.hands).toBe(c.hands)
      expect(it.slots).toBe(c.slots)
    }
    expect([...new Set(Object.values(ITEMS).map((i) => i.itemClass))].sort()).toEqual([...new Set([...codex.values()].map((c) => c.itemClass))].sort())
  })

  it('stat modifiers: every Codex key the engine has is folded under the engine name; every other key is a named gap on the row', () => {
    for (const [id, c] of codexItems()) {
      const it = ITEMS[id]!
      for (const [k, v] of Object.entries(c.statModifiers ?? {})) {
        const engineKey = STAT_WORD[k] ?? k
        if ((it.statModifiers as Record<string, number>)[engineKey] !== undefined) expect((it.statModifiers as Record<string, number>)[engineKey], `${id} ${k}`).toBe(v)
        else expect(it.gaps?.some((g) => g.startsWith(`statModifier '${k}'`)), `${id}: ${k} must be a named gap`).toBe(true)
      }
    }
  })

  it('grants: every attack an item grants is in ATTACKS, every power in ABILITIES, or the row names the gap — nothing is dropped silently', () => {
    for (const [id, c] of codexItems()) {
      const it = ITEMS[id]!
      for (const g of c.grants ?? []) {
        if (g.startsWith('power.')) {
          const has = it.abilities.includes(g) && ACTIONS[g] !== undefined
          expect(has || it.gaps?.some((x) => x.includes(`grants ${g}`)), `${id}: ${g}`).toBeTruthy()
        } else {
          const has = it.grants.includes(g) && ACTIONS[g] !== undefined
          expect(has || it.gaps?.some((x) => x.includes(`grants ${g}`)), `${id}: ${g}`).toBeTruthy()
        }
      }
      for (const t of it.triggers) expect(t.source).toBe(id)
      // Law 10 rewrite, capability.charges (2026-09-03): an activated item is
      // EITHER a compiled power in its `abilities` (with `uses` where the row
      // has them) OR a named gap — never silent, never both missing.
      const cu = (c as unknown as { uses?: unknown }).uses
      if (c.stamina !== undefined || c.targets || cu !== undefined) {
        const compiled = it.abilities.some((a) => ABILITIES[a]?.effects !== undefined)
        const gapped = it.gaps?.some((x) => x.startsWith('active:') || x.startsWith('uses:'))
        expect(compiled || gapped, `${id} is activated: compiled or gapped`).toBe(true)
        if (compiled && cu !== undefined) expect(it.abilities.some((a) => (ABILITIES[a]?.uses ?? 0) > 0), `${id} carries its uses`).toBe(true)
      }
    }
  })

  it('the attack id space widened to every grant: the pack carries far more attacks than the fielded kits use', () => {
    const granted = new Set(Object.values(ITEMS).flatMap((i) => i.grants))
    for (const a of granted) expect(ACTIONS[a], a).toBeDefined()
    const fielded = new Set(Object.values(UNITS).flatMap((u) => u.attacks))
    expect(granted.size).toBeGreaterThan(fielded.size)
  })

  it('every dictated kit item resolves to a whole-enough ItemDef — its attacks are the ones the hero row carries', () => {
    for (const [hero, kit] of Object.entries(kits())) {
      for (const itemId of kit) {
        const it = ITEMS[itemId]
        expect(it, `${hero} wears ${itemId}`).toBeDefined()
        for (const a of it!.grants) expect(fieldedDef(hero).attacks, `${hero} swings ${a} from ${itemId}`).toContain(a)
      }
    }
  })

  it('the registry rides on Ctx, under the kill-switch seam, and nothing reads it yet', () => {
    const ctx = createBattle({ replicate: 0 })
    expect(ctx.items).toBe(ITEMS)
    expect(ctx.items['item.longsword']!.grants).toEqual(['attack.longsword.slash', 'attack.longsword.stab'])
    // seam.items-per-unit landed right behind this: the log now says what
    // every hero wears (unit.equipped, cause = the item)
    expect(ctx.events.filter((e) => e.type === 'unit.equipped').length).toBeGreaterThan(0)
  })
})
