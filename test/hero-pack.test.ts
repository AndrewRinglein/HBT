// The prologue party — content.hero-pack (2026-08-26).
//
// Ruled: "pick a ranger of the 24 Eve, then a warrior and a preist, all from
// 24 eve." The Hunter resolves fully (dictated longbow override); Iron Dwarf
// and Battle Chaplain have SPEC kits whose roll belongs to the draft — NAMED
// GAPS in content/gen/enemy-pack-gaps.json until a dictated override lands.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { ATTACKS, UNITS } from '../src/content/index.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

const HUNTER = 'hero.base.ranger-aggressive'

// Pipeline agreement, not frozen numbers (Law 10, rewritten 2026-09-02 with
// content.field-eve-24): a hero's row is its Codex body PLUS the kit's stat
// modifiers. The Hunter was asserted at maxHp 6 — his bare body — because the
// converter could not find the tier-0 armors (they live only in
// hbt-content.json) and dropped Thick Hide's +3 Health / −1 Movement / −10
// Dodge as a gap. Now it folds, and the expectation is derived from the same
// two sources the converter reads.
const codexHero = (id: string) => {
  const D = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8'))
  let found: { ported: Record<string, number & {}>; derivedBase: Record<string, number> } | null = null
  const items = new Map<string, { statModifiers?: Record<string, number> }>()
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) { o.forEach(walk); return }
    if (o && typeof o === 'object') {
      const r = o as { id?: string; ported?: Record<string, number>; itemClass?: string }
      if (r.id === id && r.ported) found = r as typeof found
      if (typeof r.id === 'string' && r.id.startsWith('item.') && r.itemClass) items.set(r.id, r as { statModifiers?: Record<string, number> })
      Object.values(o).forEach(walk)
    }
  }
  walk(D)
  const kits = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'gen', 'kits.json'), 'utf8')).heroKits as Record<string, string[]>
  const mod = (stat: string) => (kits[id] ?? []).reduce((s, it) => s + (items.get(it)?.statModifiers?.[stat] ?? 0), 0)
  return { row: found!, mod }
}

describe('the Hunter is a real hero from the Codex', () => {
  it('carries the authored Eve stats and pays stamina like a hero', () => {
    const h = UNITS[HUNTER]!
    expect(h).toBeDefined()
    expect(h.side).toBe('hero')
    const { row, mod } = codexHero(HUNTER)
    expect(row.ported.health, 'the bare Codex body').toBe(6)
    expect(mod('health'), 'Thick Hide folds').toBe(3)
    expect(h.maxHp).toBe((row.ported.health ?? 0) + mod('health'))
    expect(h.accuracy).toBe((row.derivedBase.accuracy ?? 0) + mod('accuracy'))
    expect(h.precision).toBe((row.ported.precision ?? 0) + mod('precision'))
    expect(h.movement).toBe((row.derivedBase.movement ?? 0) + mod('movement'))
    expect(h.dodge).toBe((row.ported.dodge ?? 0) + mod('dodge'))
    expect(h.maxStamina, 'heroes run stamina').toBe((row.derivedBase.staminaMax ?? 0) + mod('staminaMax'))
    // class half-step read from the Codex movementAction grants
    expect(h.moves).toEqual(['power.move', 'power.side-roll'])
  })

  it('fights with the longbow the kit dictated — both attacks, stamina PAID', () => {
    // Punch joined every classed hero with S37's re-rule (2026-08-27) — the
    // universal flag, honored by the party lane since S37a.
    expect(UNITS[HUNTER]!.attacks).toEqual(['attack.longbow.shot', 'attack.longbow.long-shot', 'attack.punch'])
    expect(ATTACKS['attack.longbow.shot']).toMatchObject(
      { kind: 'ranged', reach: 6, stat: 'precision', bonus: 1, staminaCost: 1 })
    expect(ATTACKS['attack.longbow.long-shot']).toMatchObject(
      { kind: 'ranged', reach: 7, bonus: 2, staminaCost: 2 })
  })

  it('the whole battle-2 party fields, fully armed — S36 dictated every kit', () => {
    // LAW 10 — rewritten for the THIRD time today, each toward the day's
    // truth: first "SPEC kits are named gaps" (they were), then "the Dwarf
    // fields pinned-armor-only" (S34a), and now S36's full-kit dictation plus
    // the confirmation "Battle Chaplain should be in there now" — all three
    // stand armed, and no kit gap remains for any of them.
    const gaps = JSON.parse(readFileSync(
      join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')).gaps as
      { unit: string; needs: string }[]
    for (const id of ['hero.base.warrior-iron', 'hero.base.priest-armored']) {
      expect(gaps.some((g) => g.unit === id && /kit/.test(g.needs)), `${id} — no kit gap survives S36`).toBe(false)
      expect(UNITS[id], `${id} fields`).toBeDefined()
      expect(UNITS[id]!.attacks.length, `${id} is armed`).toBeGreaterThan(1)
      expect(UNITS[id]!.attacks, `${id} carries the universal Punch`).toContain('attack.punch')
    }
    expect(UNITS['hero.base.warrior-iron']!.attacks).toContain('attack.war-axe.chop')
    expect(UNITS['hero.base.priest-armored']!.attacks).toContain('attack.holy-texts.mercy')
  })

  it('battle 1 in miniature runs: the Hunter shoots authored zombies', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.prologue-party')))
    runBattle(ctx)
    const shots = ctx.events.filter((e) =>
      e.type === 'attack.declared' && String(e['attackId']).startsWith('attack.longbow.'))
    expect(shots.length, 'the Hunter never drew the bow').toBeGreaterThan(0)
    expect(ctx.events.some((e) => e.type === 'stamina.spent' &&
      String(e.causeId).startsWith('attack.longbow.')), 'shots must cost stamina').toBe(true)
    expect(ctx.state.outcome).not.toBeNull()
  })
})
