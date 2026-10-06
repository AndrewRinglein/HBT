// rule.special-moves-unlock-at-level-two (2026-10-06). Ruled 2026-10-06 (DECISIONS.md 'the starting heroes' special moves
// unlock at level 2 …' and 'a hero's special moves unlock at level 2, ruled: all of them, every hero, enemies and civilians
// unchanged, named on the level-up screen'): "the special moves that the starting heroes get should be unlocked instead at
// level 2, so they don't clutter up level 1 tutorial. That way, you get something extra when you level up." - which ones,
// "You name them all in one" (Leap, Side Roll, Sidestep, Back Flip, Focus, Devotion) - "This is going to cover later heroes
// too … Enemies are unchanged. Civilians will be unchanged."
//
// The rule, with no content name in core: a unit's row may say the LEVEL at which a movement it lists is granted
// (`moveLevels`); fielded below that level the unit does not have the movement at all - not on its list, not legal, not
// offered. Content writes the level on the grant: a class's movement power is granted at the level its Codex row says
// (`grantedAtLevel`, 2 for each today), so a later special move can name another level with no code change. A row that gets
// no movement by its class - an enemy, a civilian, the engine's own test party - says no level and keeps what it has.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle, fieldedDef, levelTableOf } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { movesAtLevel, validateMoveLevels } from '../src/core/items.js'
import { grantedActionIds } from '../src/core/action.js'
import { legalActions, validateAction } from '../src/core/commands.js'
import { beginActivation } from '../src/core/mutate.js'
import { ACTIONS, LEVELS, SPECIALTIES, UNITS } from '../src/content/index.js'
import { UNIT_PACK } from '../src/content/generated/pack.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { HeroProgress, UnitDef } from '../src/core/types.js'

const BASE = Object.keys(UNITS).filter((id) => id.startsWith('hero.base.')).sort()
const WALK = 'power.move'
const SPECIAL: Record<string, string> = { 'class.warrior': 'power.leap', 'class.ranger': 'power.side-roll', 'class.rogue': 'power.side-roll', 'class.mage': 'power.focus', 'class.priest': 'power.devotion', 'class.paladin': 'power.sidestep' }
const classOf = (id: string) => (UNITS[id]!.tags ?? []).find((t) => t.startsWith('class.'))!
function progressAt(typeId: string, level: number, powers?: string[]): HeroProgress {
  const specialtyId = level >= 2 ? Object.values(SPECIALTIES).find((s) => s.class === classOf(typeId))?.id : undefined
  const choice = LEVELS[levelTableOf(UNITS[typeId]!)]!.rows.find((r) => r.choice && r.level <= level)?.choice
  return { level, ...(specialtyId ? { specialtyId } : {}), ...(choice ? { levelFivePick: choice[0]! } : {}), ...(powers ? { powers } : {}) }
}
const P = UNIT_PACK as unknown as { enemies: UnitDef[]; authoredEnemies: UnitDef[]; prologueParty: UnitDef[]; heroes: UnitDef[]; alphaTeam: UnitDef[] }

describe('the rule: a movement a row lists may be granted at a level', () => {
  const def = { typeId: 'test-x', moves: [WALK, 'power.a', 'power.b'], moveLevels: { 'power.a': 2, 'power.b': 4 } } as unknown as UnitDef
  it('below the level the unit does not have it; at the level and above it does; a movement with no level is had from the start', () => {
    expect(movesAtLevel(def, 1)).toEqual([WALK])
    expect(movesAtLevel(def, 2)).toEqual([WALK, 'power.a'])
    expect(movesAtLevel(def, 3)).toEqual([WALK, 'power.a'])
    expect(movesAtLevel(def, 4)).toEqual([WALK, 'power.a', 'power.b'])
    expect(movesAtLevel({ typeId: 'test-y', moves: [WALK, 'power.a'] } as unknown as UnitDef, 1)).toEqual([WALK, 'power.a'])
  })
  it('the row is held to its shape: a level names a movement the row lists, and is a whole number, 2 or more', () => {
    expect(() => validateMoveLevels(def)).not.toThrow()
    expect(() => validateMoveLevels({ ...def, moveLevels: { 'power.c': 2 } } as unknown as UnitDef)).toThrow(/'power\.c'.*does not list/)
    expect(() => validateMoveLevels({ ...def, moveLevels: { 'power.a': 1 } } as unknown as UnitDef)).toThrow(/whole number, 2 or more/)
    expect(() => validateMoveLevels({ ...def, moveLevels: { 'power.a': 2.5 } } as unknown as UnitDef)).toThrow(/whole number, 2 or more/)
    expect(() => validateMoveLevels({ ...def, moveLevels: {} } as unknown as UnitDef)).toThrow(/names no movement/)
  })
})

describe('the rows: a hero\'s special moves are granted at level 2', () => {
  it('every base hero lists the basic Move and its class\'s special move, and the special move is granted at level 2', () => {
    expect(BASE.length).toBe(24)
    for (const id of BASE) {
      const row = UNITS[id]!, special = SPECIAL[classOf(id)]!
      expect(row.moves, id).toEqual([WALK, special])
      expect(row.moveLevels, id).toEqual({ [special]: 2 })
    }
  })
  it('the six special moves are move-class actions; the basic Move is granted at no level', () => {
    for (const id of new Set(Object.values(SPECIAL))) expect(ACTIONS[id]?.move, id).toBeDefined()
    for (const id of BASE) expect(UNITS[id]!.moveLevels?.[WALK], id).toBeUndefined()
  })
})

describe('a hero at level 1 and at level 2', () => {
  it('at level 1 - with no progress record, as the opening fields it, or with one - a hero has the basic Move and no special move', () => {
    for (const id of BASE) {
      expect(fieldedDef(id).moves, id).toEqual([WALK])
      expect(fieldedDef(id, {}, { level: 1 }).moves, id).toEqual([WALK])
    }
  })
  it('at level 2 and above it has every movement its row and its class give', () => {
    for (const id of BASE) for (const level of [2, 3, 10]) expect(fieldedDef(id, {}, progressAt(id, level)).moves, `${id} level ${level}`).toEqual([WALK, SPECIAL[classOf(id)]!])
  })
  it('on the board at level 1 the special move is not on its list, not offered and refused if asked; at level 2 it is granted and legal', () => {
    for (const id of ['hero.base.warrior-iron', 'hero.base.priest-robes', 'hero.base.paladin-shiney', 'hero.base.rogue-raven', 'hero.base.mage-fire']) {
      const special = SPECIAL[classOf(id)]!
      const one = createCustomBattle([{ type: id, hex: 85 }], [{ type: 'test-zombie', hex: 181 }])
      const u = one.state.units[0]!
      beginActivation(one, u.id, 'test')
      expect(grantedActionIds(one, u), id).not.toContain(special)
      expect(legalActions(one, u.id).some((r) => r.actionId === special), id).toBe(false)
      for (const destination of [u.hex, ...one.geo.neighboursOf(u.hex)]) expect(validateAction(one, { actor: u.id, actionId: special, destination }), id).toEqual({ ok: false, reason: 'action-not-ready' })
      // the same hero at level 2
      const two = createBattle({ ...scenarioOptions(SCENARIOS['test.banner-courage']!), heroes: [id], heroHexes: [85], heroItems: [undefined], heroProgress: [progressAt(id, 2)], enemies: ['unit.zombie'], enemyHexes: [95], enemyCount: 1 })
      const v = two.state.units[0]!
      beginActivation(two, v.id, 'test')
      v.stamina = v.maxStamina
      expect(grantedActionIds(two, v), id).toContain(special)
      expect(legalActions(two, v.id).some((r) => r.actionId === special), `${id} at level 2`).toBe(true)
    }
  })
  it('a movement power drafted at its own later level is as it was: the Raven at level 3 with Back Flip drafted has Move, Back Flip and Side Roll', () => {
    const raven = 'hero.base.rogue-raven'
    const moves = fieldedDef(raven, {}, progressAt(raven, 3, ['power.back-flip'])).moves
    expect([...moves].sort()).toEqual([WALK, 'power.back-flip', 'power.side-roll'].sort())
  })
})

describe('the computer, and who is unchanged', () => {
  it('in the opening\'s six battles a level-1 hero has no special move on its list and uses none; the first hero, level 2 from the second battle, has hers', () => {
    const specials = new Set(Object.values(SPECIAL))
    const levels: string[] = []
    for (const id of ['test.opening-orphanage', 'test.opening-lumberjack', 'test.opening-bridge', 'test.opening-cavern-trail', 'test.opening-gates', 'test.opening-cathedral']) {
      const o = scenarioOptions(SCENARIOS[id]!)
      const ctx = createBattle(o)
      const heroes = ctx.state.units.filter((u) => u.typeId.startsWith('hero.base.'))
      expect(heroes.length, id).toBeGreaterThan(0)
      const levelOf = (typeId: string) => o.heroProgress?.[o.heroes!.indexOf(typeId)]?.level ?? 1
      levels.push(heroes.map((u) => levelOf(u.typeId)).join(''))
      for (const u of heroes) expect(grantedActionIds(ctx, u).filter((a) => specials.has(a)), `${id} ${u.typeId}`).toEqual(levelOf(u.typeId) >= 2 ? [SPECIAL[classOf(u.typeId)]!] : [])
      runBattle(ctx)
      const low = new Set(heroes.filter((u) => levelOf(u.typeId) < 2).map((u) => u.id))
      expect(ctx.events.filter((e) => low.has(e.actor as number) && specials.has(e.causeId)).map((e) => `${e.type} ${e.causeId}`), id).toEqual([])
    }
    // the levels the recordings field, battle by battle: level 2 is first reached by the first hero, going into battle 2
    expect(levels).toEqual(['1', '21', '211', '2111', '21111', '211111'])
    // 2026-10-06 (after this item's gate ran out of time on two many-battle tests of its files): six whole battles, 2.1 seconds
    // alone against the default limit of 5; the limit is said here.
  }, 30_000)
  it('an enemy keeps every movement it has: no enemy row names a level, and the Vampire still flies', () => {
    for (const e of [...P.enemies, ...P.authoredEnemies]) expect(e.moveLevels, e.typeId).toBeUndefined()
    expect(fieldedDef('unit.vampire').moves).toContain('power.flight')
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'unit.vampire', hex: 95 }])
    expect(grantedActionIds(ctx, ctx.state.units[1]!)).toContain('power.flight')
  })
  it('a civilian is unchanged: no civilian row names a level', () => {
    const civilians = P.prologueParty.filter((r) => (r.tags ?? []).includes('class.civilian'))
    expect(civilians.length).toBeGreaterThan(10)
    for (const c of civilians) { expect(c.moveLevels, c.typeId).toBeUndefined(); expect(fieldedDef(c.typeId).moves, c.typeId).toEqual(c.moves) }
  })
  it('the engine\'s own test party lists its movements itself, not by its class, and keeps them at level 1 - so the control battles do not move', () => {
    for (const row of [...P.heroes, ...P.alphaTeam]) {
      expect(row.typeId.startsWith('test-') || row.typeId.startsWith('alpha-'), row.typeId).toBe(true)
      expect(row.moveLevels, row.typeId).toBeUndefined()
      expect(row.moves.length, row.typeId).toBe(2)
      expect(fieldedDef(row.typeId).moves, row.typeId).toEqual(row.moves)
    }
  })
})
