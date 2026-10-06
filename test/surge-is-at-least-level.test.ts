// rule.surge-is-at-least-level (2026-10-06). Ruled 2026-10-06 (DECISIONS.md 'everyone gains Surge equal to its level at the
// least, and rolls the Surge check every Activation'): "Everybody should be rolling a surge check after activation. Everyone
// gains surge equal to level, at the very least. Therefore, there is always at least a 1% chance of a surge."
//
// Until now a hero's level reached its Surge only when it was fielded WITH a progress record (core/items.ts applyProgress
// added the level, silently), and a level-1 hero is fielded with none - so every level-1 hero had Surge 0 and the check
// skipped it. Now the number is made where the hero's other numbers are made: each hero class's level table grants 1 Surge
// at every level (content gen/levels.json, the table's every-level grant), the hero's own row carries the level-1 point, and
// the engine adds nothing of its own. HEROES ONLY: an enemy has none, and a civilian has what it had (none at level 1, its
// level from level 2) until he rules on them.
import { describe, expect, it } from 'vitest'
import { createBattle, fieldedDef, levelTableOf } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { LEVELS, SPECIALTIES, UNITS } from '../src/content/index.js'
import { UNIT_PACK } from '../src/content/generated/pack.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { HeroProgress, UnitDef } from '../src/core/types.js'

const BASE = Object.keys(UNITS).filter((id) => id.startsWith('hero.base.')).sort()
const HERO_CLASSES = ['class.warrior', 'class.ranger', 'class.rogue', 'class.mage', 'class.priest', 'class.paladin']
const FEY = 'hero.base.ranger-nature'   // the Forest Fey: her Fey badge gives 10 Surge on top
/** a legal progress record for a hero at a level: the first specialty of its class, the first option of the choice row */
function progressAt(typeId: string, level: number): HeroProgress {
  const table = levelTableOf(UNITS[typeId]!)
  const cls = (UNITS[typeId]!.tags ?? []).find((t) => t.startsWith('class.'))!
  const specialtyId = level >= 2 ? Object.values(SPECIALTIES).find((s) => s.class === cls)?.id : undefined
  const choice = LEVELS[table]!.rows.find((r) => r.choice && r.level <= level)?.choice
  return { level, ...(specialtyId ? { specialtyId } : {}), ...(choice ? { levelFivePick: choice[0]! } : {}) }
}
const surgeOf = (def: UnitDef) => def.surge ?? 0

describe('where the number is made', () => {
  it('each hero class grants 1 Surge at every level of its table, level 1 among them; the engine adds none of its own', () => {
    for (const cls of HERO_CLASSES) {
      const rows = LEVELS[cls]!.rows
      expect(rows.map((r) => r.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      for (const r of rows) expect(r.grants['surge'], `${cls} level ${r.level}`).toBe(1)
    }
  })
  it('the hero\'s own row carries the level-1 point: every base hero\'s row says Surge 1', () => {
    expect(BASE.length).toBe(24)
    for (const id of BASE) expect(UNITS[id]!.surge, id).toBe(1)
  })
  it('fielded at a level, a hero has its row\'s Surge and each later level\'s grant - with what its specialty gives on top', () => {
    for (const id of BASE) for (const level of [1, 2, 5, 10]) {
      const p = progressAt(id, level)
      const table = LEVELS[levelTableOf(UNITS[id]!)]!
      const fromRows = table.rows.filter((r) => r.level >= 2 && r.level <= level).reduce((n, r) => n + (r.grants['surge'] ?? 0), 0)
      const fromSpecialty = p.specialtyId ? SPECIALTIES[p.specialtyId]!.statModifiers['surge'] ?? 0 : 0
      const fielded = fieldedDef(id, {}, p)
      const badge = surgeOf(fieldedDef(id)) - (UNITS[id]!.surge ?? 0)        // what its origin badges add (the Fey's 10)
      expect(surgeOf(fielded), `${id} level ${level}`).toBe(1 + fromRows + fromSpecialty + badge)
      expect(surgeOf(fielded), `${id} level ${level}`).toBeGreaterThanOrEqual(level)
    }
  })
})

describe('every hero has Surge of at least its level', () => {
  it('at level 1, fielded with no progress record at all - as the opening fields it - every base hero has Surge 1, and the Forest Fey 11', () => {
    expect(BASE).toContain(FEY)
    for (const id of BASE) expect(surgeOf(fieldedDef(id)), id).toBe(id === FEY ? 11 : 1)
    for (const id of BASE) expect(surgeOf(fieldedDef(id, {}, { level: 1 })), id).toBe(id === FEY ? 11 : 1)
  })
  it('at level 5 every base hero has Surge of at least 5; at level 10 at least 10', () => {
    for (const id of BASE) {
      expect(surgeOf(fieldedDef(id, {}, progressAt(id, 5))), id).toBeGreaterThanOrEqual(5)
      expect(surgeOf(fieldedDef(id, {}, progressAt(id, 10))), id).toBeGreaterThanOrEqual(10)
    }
  })
  it('the heroes of the opening\'s six battles and of the control battles\' party are fielded with Surge 1 or more', () => {
    for (const id of ['test.opening-orphanage', 'test.opening-lumberjack', 'test.opening-bridge', 'test.opening-cavern-trail', 'test.opening-gates', 'test.opening-cathedral']) {
      const ctx = createBattle(scenarioOptions(SCENARIOS[id]!))
      const heroes = ctx.state.units.filter((u) => u.typeId.startsWith('hero.base.'))
      expect(heroes.length, id).toBeGreaterThan(0)
      for (const u of heroes) expect(u.surge, `${id} ${u.typeId}`).toBeGreaterThanOrEqual(1)
    }
    const control = createBattle({ replicate: 0, enemyCount: 8, mapId: 'map.open' })
    for (const u of control.state.units.filter((x) => x.side === 'hero')) expect(u.surge, u.typeId).toBeGreaterThanOrEqual(1)
  })
})

describe('so every hero rolls the check', () => {
  it('in a real battle a level-1 hero rolls a Surge check at the end of every Activation it finishes standing, the chance one more each time until it surges', () => {
    // two priests against two zombies, nothing in it that gives Surge Chance (test.sets-counted)
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.sets-counted']!))
    runBattle(ctx)
    for (const u of ctx.state.units.filter((x) => x.typeId.startsWith('hero.base.'))) {
      const all = ctx.events.filter((e) => e.type === 'surge.checked' && e.actor === u.id)
      const checks = all.filter((e) => e['link'] === 0)
      // one check to an Activation it finished standing and able to act
      const finished = ctx.events.filter((e) => e.type === 'activation.end' && e.actor === u.id).length
      expect(checks.length, u.typeId).toBeGreaterThan(0)
      expect(checks.length, u.typeId).toBeLessThanOrEqual(finished)
      expect(checks.length, u.typeId).toBeGreaterThanOrEqual(finished - 2)   // the Activations it ended down or unable to act roll none
      // the first check is at 1 in 100; every check adds the hero's 1 Surge to what the pool held
      expect(checks[0]!['chance']).toBe(1)
      let pool = 0
      for (const c of all) { expect(c['before']).toBe(pool); expect(c['chance']).toBe(pool + 1); expect(c['surge']).toBe(1); pool = Number(c['after']) }
    }
  })
  it('COMBAT-DESIGN\'s curve: over many seeded battles a level-1 hero with no other Surge first surges after about 12 to 14 Activations, and never later than its 100th point', () => {
    const first: number[] = []
    for (let r = 0; r < 150; r++) {
      // one priest and one zombie that cannot hurt each other enough to matter: both made too tough to fall, so the battle is 110 Turns of Activations
      const ctx = createBattle({ ...scenarioOptions(SCENARIOS['test.banner-courage']!), heroes: ['hero.base.priest-robes'], heroHexes: [85], heroItems: [undefined], enemies: ['unit.zombie'], enemyHexes: [94], enemyCount: 1, replicate: r, cfg: { turnCap: 110 } })
      for (const u of ctx.state.units) { u.maxHp = 1_000_000; u.hp = 1_000_000 }
      runBattle(ctx)
      const hero = ctx.state.units.find((u) => u.side === 'hero')!
      expect(hero.surge).toBe(1)
      const checks = ctx.events.filter((e) => e.type === 'surge.checked' && e.actor === hero.id && e['link'] === 0)
      const at = checks.findIndex((e) => e['hit'] === true)
      expect(at, `replicate ${r}: it surges within the battle`).toBeGreaterThanOrEqual(0)
      expect(at + 1).toBeLessThanOrEqual(100)
      expect(checks[at]!['chance']).toBe(at + 1)             // the pool gained 1 each Activation: its (at+1)th point
      first.push(at + 1)
    }
    const mean = first.reduce((a, b) => a + b, 0) / first.length
    expect(mean).toBeGreaterThan(11)
    expect(mean).toBeLessThan(14.5)
  }, 120_000)
})

describe('enemies and civilians are as they were', () => {
  const P = UNIT_PACK as unknown as { enemies: UnitDef[]; authoredEnemies: UnitDef[]; prologueParty: UnitDef[] }
  it('no enemy row has Surge, and no enemy rolls', () => {
    for (const e of [...P.enemies, ...P.authoredEnemies]) expect(e.surge ?? 0, e.typeId).toBe(0)
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.banner-courage']!))
    runBattle(ctx)
    const enemies = new Set(ctx.state.units.filter((u) => u.side === 'enemy').map((u) => u.id))
    expect(ctx.events.filter((e) => e.type === 'surge.checked' && enemies.has(e.actor as number))).toEqual([])
  })
  it('a civilian has none at level 1 and its level from level 2, as before - said in its own table now, not added by the engine', () => {
    const civilians = P.prologueParty.filter((r) => (r.tags ?? []).includes('class.civilian'))
    expect(civilians.length).toBeGreaterThan(10)
    for (const c of civilians) {
      expect(surgeOf(fieldedDef(c.typeId)), c.typeId).toBe(0)
      const specialtyId = Object.values(SPECIALTIES).find((s) => s.class === 'class.civilian')!.id
      for (const level of [2, 3, 4]) expect(surgeOf(fieldedDef(c.typeId, {}, { level, specialtyId })), `${c.typeId} level ${level}`).toBe(level)
    }
    // and in the opening's first battle the orphans and the school teacher roll no check
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.opening-orphanage']!))
    runBattle(ctx)
    const civ = new Set(ctx.state.units.filter((u) => u.typeId.startsWith('hero.fixed.')).map((u) => u.id))
    expect(civ.size).toBeGreaterThan(0)
    expect(ctx.events.filter((e) => e.type === 'surge.checked' && civ.has(e.actor as number))).toEqual([])
  })
})
