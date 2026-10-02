// fix.one-hero-assembly — duplication review 2026-09-28, findings E10–E14 (DECISIONS.md
// 'the duplication review, ruled'). Andrew: "There should be no weapon that is zero-handed."
//
//   (1) one assembler — fieldedDef(typeId, {items, stowed, used, progress, badges, heroMods})
//       is what createBattle and createCustomBattle field, so a preview and a battle agree
//   (2) one fold for items, progress and badges; swap's fold reads FOLD_BASE the same way
//   (3) one HANDS and one handsOf(item); every weapon takes at least one hand, and the pack
//       loader refuses a held item with none
//   (4) one mutator building unit.enter; one name-label function
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createBattle, createCustomBattle, fieldedDef, makeUnit } from '../src/core/setup.js'
import { HANDS, handsOf, HELD_CLASSES, FOLDABLE } from '../src/core/items.js'
import { packItems } from '../src/content/pack.js'
import { ABILITIES, ACTIONS, ATTACKS, BADGES, BURSTS, ENCOUNTERS, ITEMS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import type { ItemDef, Unit } from '../src/core/types.js'

const HERO = 'hero.base.warrior-iron'
const SRC = join(__dirname, '..', 'src')
const read = (f: string) => readFileSync(join(SRC, f), 'utf8')
const coreFiles = () => readdirSync(join(SRC, 'core')).filter((f) => f.endsWith('.ts')).map((f) => `core/${f}`)

/** The fields makeUnit copies from the def — what "the same def" means on the board. */
function asFielded(u: Unit): Record<string, unknown> {
  const rec = u as unknown as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of FOLDABLE) out[k] = rec[k] ?? null
  return { ...out, actions: u.actions, badges: u.badges, role: u.role, ai: u.ai, triggers: u.triggers.length, tags: u.tags }
}
/** The def as makeUnit would put it on the board. */
const defAsFielded = (d: ReturnType<typeof fieldedDef>) => asFielded(makeUnit(0, 0, 'probe', d, 0))

describe('(1) one assembler — the preview and the battle field the same hero', () => {
  it('fieldedDef(typeId, options) is the def createBattle fields for the same options — items, stowed, progress, badges, heroMods', () => {
    const badge = Object.values(BADGES).find((b) => (b.statModifiers.maxHp ?? 0) !== 0 && !b.grants.length && !(b.triggers ?? []).length)!
    expect(badge, 'a badge that moves maxHp').toBeDefined()
    const opts = {
      items: [...(UNITS[HERO]!.defaultItems ?? [])],
      stowed: ['item.dagger'],
      progress: { level: 3, specialtyId: 'specialty.bloodrage' },
      badges: [badge.id],
      heroMods: { stats: [{ stat: 'armor' as const, add: 1, source: 'set.probe' }] },
    }
    const def = fieldedDef(HERO, opts)
    const ctx = createBattle({ replicate: 0, heroes: [HERO], enemies: ['unit.zombie'], heroItems: [opts.items], heroStowed: [opts.stowed],
      heroProgress: [opts.progress], heroBadges: [opts.badges], heroMods: [opts.heroMods] })
    const u = ctx.state.units.find((x) => x.typeId === HERO)!
    expect(asFielded(u)).toEqual(defAsFielded(def))
    // the badge is folded by the preview too — the Equip card shows what the battle fields
    expect(def.maxHp).toBe(fieldedDef(HERO, { items: opts.items, progress: opts.progress }).maxHp + badge.statModifiers.maxHp!)
    // heroMods are checked by the preview as by the battle (Law 9), and ride as unit mods, not base stats
    expect(() => fieldedDef(HERO, { ...opts, heroMods: { stats: [{ stat: 'armor' as const, add: 1, source: '' }] } })).toThrow(/names no source/)
  })

  it('an item instance handed in spent folds nothing in the preview, as in the battle', () => {
    // a slot item with exactly one counted power, so one count spends all of it
    const counted = (i: ItemDef) => [...new Set([...i.grants, ...i.abilities])].filter((a) => (ACTIONS[a]?.uses ?? 0) > 0)
    const it0 = Object.values(ITEMS).find((i) => !HELD_CLASSES.includes(i.itemClass) && !i.classRestriction && counted(i).length === 1)
    expect(it0, 'a slot item with one counted power').toBeDefined()
    const power = counted(it0!)[0]!
    const items = [...(UNITS[HERO]!.defaultItems ?? []), it0!.id]
    const used = items.map((id) => (id === it0!.id ? ACTIONS[power]!.uses! : 0))
    const spent = fieldedDef(HERO, { items, used })
    const ctx = createBattle({ replicate: 0, heroes: [HERO], enemies: ['unit.zombie'], heroItems: [items], heroItemsUsed: [used] })
    expect(asFielded(ctx.state.units.find((x) => x.typeId === HERO)!)).toEqual(defAsFielded(spent))
    // spent, it grants nothing in the preview; whole, it does
    expect([...spent.attacks, ...spent.abilities]).not.toContain(power)
    const whole = fieldedDef(HERO, { items })
    expect([...whole.attacks, ...whole.abilities]).toContain(power)
  })

  it('a fixture hero is the scenario hero — createCustomBattle fields the row with its kit and its own badges', () => {
    const ctx = createCustomBattle([{ type: 'alpha-osric', hex: 0 }], [{ type: 'unit.zombie', hex: 40 }], {})
    const u = ctx.state.units[0]!
    expect(u.badges).toContain('badge.hero')
    const badged = ctx.events.filter((e) => e.type === 'unit.badged' && e.actor === 0).map((e) => e['badgeId'])
    expect(badged, 'the fixture hero carries badge.hero, and the log says so (Law 12)').toContain('badge.hero')
    expect(asFielded(u)).toEqual(defAsFielded(fieldedDef('alpha-osric')))
    // its kit is a loadout, as in a scenario
    expect(u.loadout?.hands.map((h) => h.itemId)).toEqual(UNITS['alpha-osric']!.defaultItems)
    expect(ctx.events.filter((e) => e.type === 'unit.equipped' && e.actor === 0).map((e) => e['itemId'])).toEqual(UNITS['alpha-osric']!.defaultItems)
  })
})

describe('(2) one fold', () => {
  it('items, progress and badges fold through one helper; swap reads the same unfolded values', () => {
    const items = read('core/items.ts')
    expect(items).toMatch(/export function foldStats\(/)
    // the unfolded value is read in one place, and no fold writes the stats back by its own copy
    expect(items.match(/FOLD_BASE\[/g)?.length ?? 0, 'one reader of FOLD_BASE').toBe(1)
    expect(items).not.toMatch(/maxStamina: stats\['maxStamina'\]/)
    expect(read('core/swap.ts')).toMatch(/unfoldedOf\(/)
  })
})

describe('(3) one HANDS, one handsOf — no zero-handed weapon', () => {
  it('HANDS is 2, declared once in core; handsOf reads the row; progression keeps no HELD copy', () => {
    expect(HANDS).toBe(2)
    const decl = coreFiles().filter((f) => /\bconst HANDS\b/.test(read(f)))
    expect(decl).toEqual(['core/items.ts'])
    expect(read('sim/progression.ts')).not.toMatch(/const HELD\b/)
    expect(read('core/swap.ts')).not.toMatch(/Math\.max\(1, row\.hands\)/)
  })

  it('every weapon and shield takes at least one hand — the natural weapons and their forge variants included', () => {
    for (const it of Object.values(ITEMS)) if (HELD_CLASSES.includes(it.itemClass)) expect(handsOf(it), it.id).toBeGreaterThanOrEqual(1)
    for (const id of ['item.claws', 'item.fangs', 'item.hooves', 'item.horns', 'item.tail', 'item.breath', 'item.claws.heavy', 'item.claws.keen', 'item.claws.cruel']) {
      expect(ITEMS[id], id).toBeDefined()
      expect(handsOf(ITEMS[id]!), id).toBe(1)
    }
    // a worn item takes no hand
    const armor = Object.values(ITEMS).find((i) => i.itemClass === 'armor')!
    expect(handsOf(armor)).toBe(0)
  })

  it('the pack loader refuses a weapon or shield with zero hands', () => {
    const claws = ITEMS['item.claws']!
    const zero: ItemDef = { ...claws, hands: 0 }
    expect(() => packItems(ATTACKS, ABILITIES, BURSTS, { [zero.id]: zero })).toThrow(/hand/)
    const shield = Object.values(ITEMS).find((i) => i.itemClass === 'shield' && !(i as { base?: string }).base && !(i as { enchant?: string }).enchant)!
    expect(() => packItems(ATTACKS, ABILITIES, BURSTS, { [shield.id]: { ...shield, hands: 0 } })).toThrow(/hand/)
    // the real rows load
    expect(() => packItems(ATTACKS, ABILITIES, BURSTS, { [claws.id]: claws })).not.toThrow()
  })
})

describe('(4) one unit.enter, one label', () => {
  const KEYS = ['actor', 'uid', 'name', 'side', 'typeId', 'role', 'hex', 'hp', 'maxHp', 'stamina', 'maxStamina', 'terrain']
  const shape = (e: Record<string, unknown>) => Object.keys(e).filter((k) => !['type', 'seq', 'causeId', 'turn', 'phase', 'target'].includes(k)).sort()

  it('one mutator emits unit.enter; fielded, arrived and custom units share its shape', () => {
    const emitters = [...coreFiles(), 'core/mutate.ts'].filter((f, i, a) => a.indexOf(f) === i && /emit\(ctx, 'unit\.enter'/.test(read(f)))
    expect(emitters).toEqual(['core/mutate.ts'])
    expect(read('core/mutate.ts')).toMatch(/export function enterUnit\(/)

    const fielded = createBattle({ ...scenarioOptions(scenarioDef('showcase.surrounded')), encounter: ENCOUNTERS['encounter.prologue-2']! })
    const custom = createCustomBattle([{ type: 'alpha-osric', hex: 0 }], [{ type: 'unit.zombie', hex: 40 }], {})
    const enters = [...fielded.events, ...custom.events].filter((e) => e.type === 'unit.enter') as unknown as Record<string, unknown>[]
    const arrived = enters.filter((e) => e['arrived'] !== undefined)
    expect(arrived.length, 'the encounter fields arrivals').toBeGreaterThan(0)
    for (const e of enters) {
      const s = shape(e)
      for (const k of KEYS) expect(s, `${e['name']} carries ${k}`).toContain(k)
      expect(s.filter((k) => !KEYS.includes(k)).every((k) => ['arrived', 'rowSide', 'stowed', 'spent'].includes(k)), `${e['name']}: ${s.join(',')}`).toBe(true)
    }
  })

  it('one name-label function', () => {
    const labelled = [...coreFiles()].filter((f) => /toUpperCase\(\) \+ w\.slice\(1\)/.test(read(f)))
    expect(labelled.length, labelled.join(', ')).toBe(1)
  })
})
