// kingdom.reads-engine — duplication review 2026-09-28, findings K1-K18 and V10 (kingdom half); engine DECISIONS.md
// "the duplication review, ruled". The kingdom stops keeping second copies of engine facts and reads them through its
// one door; the engine opens what it reads: fieldedPreview (the unit as fielded, set bonuses included — K3), the
// hands split (splitHandsOf — K4), an item's uses (usesPerBattleOf — K8), the specialty level (K15), the one hash
// (fnv1a — K12). Content: the Net's one use rides its attack (K8, SWITCHES netIsAPower); badge.fatigued is a Codex
// badge (K10).
// Expect: "A Farmer levels on civilian.farmer and its level-5 pick fields; the Equip card and the battle show the same
// numbers for a set-bonus hero; the Net is one-use in battle; a hero who stood at Deathbed fights the next battle
// Wounded; a tier-2 kill pays 5 XP." — the kingdom's half is ../kingdom/test/kingdom-reads-engine.test.ts, run here.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { ACTIONS, BADGES, ITEMS, LEVELS, UNITS, XP_BY_TIER } from '../src/content/index.js'
import { createBattle, fieldedDef, fieldedPreview, levelTableOf } from '../src/core/setup.js'
import { SPECIALTY_LEVEL, splitHandsOf, usesPerBattleOf, HANDS } from '../src/core/items.js'
import { fnv1a } from '../src/core/rng.js'

const KINGDOM = fileURLToPath(new URL('../../kingdom/', import.meta.url))
const VITEST = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))

describe('kingdom.reads-engine — what the engine opens to the kingdom', () => {
  it('K8: the Net is one-use in battle — its use rides attack.net.cast, and usesPerBattleOf reads it', () => {
    expect(ACTIONS['attack.net.cast']!.uses).toBe(1)
    expect(usesPerBattleOf(ITEMS['item.net']!, ACTIONS)).toBe(1)
    expect(usesPerBattleOf(ITEMS['item.longsword']!, ACTIONS)).toBeNull()
    const ctx = createBattle({ scenarioId: 'probe.net', replicate: 1, heroes: ['hero.base.ranger-aggressive'], heroItems: [['item.longbow', 'item.net']], enemies: ['unit.zombie'], enemyCount: 1, mapId: 'map.open' })
    const hero = ctx.state.units.find((u) => u.side === 'hero')!
    expect(hero.usesLeft['attack.net.cast']).toBe(1)
  })

  it('K3: fieldedPreview is the unit the battle fields, its set bonuses (heroMods) included', () => {
    const items = ['item.chains-of-the-wrathful', 'item.chains-of-the-faithful']
    const heroMods = { stats: [{ stat: 'precision' as const, add: 2, source: 'item.chains-of-the-wrathful' }, { stat: 'maxHp' as const, add: 1, source: 'item.chains-of-the-wrathful' }] }
    const preview = fieldedPreview('hero.base.priest-armored', { items, heroMods })
    const bare = fieldedDef('hero.base.priest-armored', { items })
    expect(preview.precision).toBe(bare.precision + 2)
    expect(preview.maxHp).toBe(bare.maxHp + 1)
    const ctx = createBattle({ scenarioId: 'probe.mods', replicate: 1, heroes: ['hero.base.priest-armored'], heroItems: [items], heroMods: [heroMods], enemies: ['unit.zombie'], enemyCount: 1, mapId: 'map.open' })
    const u = ctx.state.units.find((x) => x.side === 'hero')!
    expect(u.precision + u.mods.filter((m) => m.stat === 'precision').reduce((s, m) => s + m.value, 0)).toBe(preview.precision)
    expect(u.maxHp).toBe(preview.maxHp)
  })

  it('K4: one hands split — held classes take their hands in order, the rest work from their slots', () => {
    const s = splitHandsOf(['item.longsword', 'item.net', 'item.greatsword', 'item.kite-shield'], ITEMS)
    expect(HANDS).toBe(2)
    expect(s.handed).toEqual(['item.longsword', 'item.net', 'item.kite-shield'])
    expect(s.stowed).toEqual(['item.greatsword'])
    expect(s.order).toEqual([0, 1, 3, 2])
    expect(() => splitHandsOf(['item.no-such-thing'], ITEMS)).toThrow(/not an item/)
  })

  it('K1 K15: a civilian levels on its type table; the specialty is chosen at SPECIALTY_LEVEL', () => {
    expect(levelTableOf(UNITS['hero.fixed.farmer']!)).toBe('civilian.farmer')
    expect(LEVELS['civilian.farmer']!.rows.some((r) => r.choice)).toBe(true)
    expect(SPECIALTY_LEVEL).toBe(2)
    expect(() => fieldedDef('hero.fixed.farmer', { progress: { level: SPECIALTY_LEVEL } })).toThrow(/no specialty/)
  })

  it('K7 K10 K12: tier prices, the Fatigued badge and the one hash are the engine\'s exports', () => {
    expect(XP_BY_TIER).toEqual({ 1: 2, 2: 5, 3: 15 })
    expect(BADGES['badge.fatigued']!.statModifiers).toEqual({ strength: -1, precision: -1, accuracy: -5, dodge: -5, maxStamina: -1 })
    expect(fnv1a([1, 2, 3])).toBe(fnv1a([1, 2, 3]))
    expect(fnv1a([])).toBe(0x811c9dc5)
  })

  it("the kingdom's half: it reads the engine (../kingdom/test/kingdom-reads-engine.test.ts)", () => {
    const out = execFileSync(process.execPath, [VITEST, 'run', 'test/kingdom-reads-engine.test.ts'], { cwd: KINGDOM, encoding: 'utf8', stdio: 'pipe' })
    expect(out.replace(/\x1b\[[0-9;]*m/g, '')).toMatch(/Tests\s+6 passed/)
  }, 180_000)
})
