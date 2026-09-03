// seam.items-per-unit (2026-09-02, ITEMS-PLAN.md §2 §4 §5) — items go into
// battle. Ruled 2026-09-02 (Andrew): "the items should go into battle … They
// define what attacks they have. They modify stats." Hero rows are bare; the
// kit — the Codex default, or whatever BattleOptions.heroItems hands over —
// is applied at fielding by ONE function (applyItems), which fieldedDef and
// the battle both read. THE INVARIANT: with no heroItems, every hero fields
// exactly as the converter used to fold it (the oracle fixture).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createBattle, fieldedDef } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyItems } from '../src/core/items.js'
import { ATTACKS, ITEMS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

const oracle = (): Record<string, Record<string, unknown>> =>
  JSON.parse(readFileSync(join(__dirname, 'fixtures', 'folded-heroes.json'), 'utf8')).rows

// what the comparison ignores, and why: the row's new fields, and trigger
// `source` — the item is the source now (Law 12), the hero was before
const shape = (x: Record<string, unknown>): Record<string, unknown> => {
  const { defaultItems, aiAuthored, triggers, ...rest } = x
  return { ...rest, triggers: ((triggers as { source?: string }[] | undefined) ?? []).map(({ source, ...t }) => t) }
}

describe('the invariant — no heroItems means the hero the converter used to fold', () => {
  it('thirty of thirty-three hero rows field byte-identical to the oracle; the three that differ are the old fold\'s own bug, now fixed', () => {
    const o = oracle()
    const differ: Record<string, string[]> = {}
    for (const [id, row] of Object.entries(o)) {
      const f = shape(fieldedDef(id) as unknown as Record<string, unknown>)
      const r = shape(row)
      const keys = [...new Set([...Object.keys(f), ...Object.keys(r)])].filter((k) => JSON.stringify(f[k]) !== JSON.stringify(r[k]))
      if (keys.length) differ[id] = keys
    }
    // FINDING: the converter folded item crit/luck into `ported`, then wrote
    // the row from `derivedBase.crit ?? ported.crit` — so an item's crit or
    // luck never reached a hero whose body carried a derived crit. Rusted
    // Plate's −5 Crit and Nice Robes' +3 Luck apply at fielding now.
    expect(differ).toEqual({
      'hero.base.paladin-dark': ['crit'],
      'hero.base.mage-fireaura': ['luck'],
      'hero.base.priest-pauper': ['luck'],
    })
    expect(fieldedDef('hero.base.paladin-dark').crit).toBe((o['hero.base.paladin-dark']!['crit'] as number) + ITEMS['item.rusted-plate']!.statModifiers.crit!)
    expect(fieldedDef('hero.base.priest-pauper').luck).toBe(ITEMS['item.nice-robes']!.statModifiers.luck)
  })

  it('the bare row really is bare, and the default kit really is the Codex kit', () => {
    const bare = UNITS['hero.base.ranger-aggressive']!
    expect(bare.attacks).toEqual(['attack.punch'])
    expect(bare.maxHp).toBe(6)
    expect(bare.defaultItems).toEqual(['item.longbow', 'item.thick-hide'])
    const f = fieldedDef('hero.base.ranger-aggressive')
    expect(f.attacks).toEqual(['attack.longbow.shot', 'attack.longbow.long-shot', 'attack.punch'])
    expect(f.maxHp).toBe(9)
    // triggers that ride an item name the item as their source
    for (const t of fieldedDef('alpha-oathblade').triggers ?? []) if (t.id === 'trigger.halberd.hack.knockback') expect(t.source).toBe('item.halberd')
  })
})

describe('heroItems — the fielding decides the kit', () => {
  const base = scenarioOptions(scenarioDef('showcase.prologue-party'))
  it('a Hunter handed a halberd has Hack and no shot, kites no more, and the log says what he wears', () => {
    const ctx = createBattle({ ...base, heroes: ['hero.base.ranger-aggressive'], heroHexes: [247], heroItems: [['item.halberd']] })
    const h = ctx.state.units[0]!
    expect(h.attacks).toEqual(['attack.halberd.hack', 'attack.halberd.cleave', 'attack.punch'])
    expect(h.attacks).not.toContain('attack.longbow.shot')
    expect(h.role).toBe('melee')
    expect(h.ai).toBe('melee-aggressive')
    expect(h.maxHp, 'no Thick Hide, so the bare 6').toBe(6)
    const eq = ctx.events.filter((e) => e.type === 'unit.equipped' && e.actor === h.id)
    expect(eq.map((e) => e.causeId)).toEqual(['item.halberd'])
    expect(eq[0]!['grants']).toEqual(['attack.halberd.hack', 'attack.halberd.cleave'])
  })
  it('an explicit default kit is the same unit as no kit at all, and an empty list is the bare hero', () => {
    const a = createBattle({ ...base, heroes: ['hero.base.ranger-aggressive'], heroHexes: [247] }).state.units[0]!
    const b = createBattle({ ...base, heroes: ['hero.base.ranger-aggressive'], heroHexes: [247], heroItems: [['item.longbow', 'item.thick-hide']] }).state.units[0]!
    const c = createBattle({ ...base, heroes: ['hero.base.ranger-aggressive'], heroHexes: [247], heroItems: [[]] }).state.units[0]!
    expect(b).toEqual(a)
    expect(c.attacks).toEqual(['attack.punch'])
    expect(c.maxHp).toBe(6)
    // the seed sequence is untouched by items: the same battle, either way
    const ra = createBattle({ ...base }); runBattle(ra)
    const rb = createBattle({ ...base, heroItems: base.heroes.map((h) => [...(UNITS[h]!.defaultItems ?? [])]) }); runBattle(rb)
    expect(rb.events.map((e) => ({ ...e, seq: 0 }))).toEqual(ra.events.map((e) => ({ ...e, seq: 0 })))
  })
  it('an authored ai survives a re-kit; a derived one follows the new weapon', () => {
    // the Sky Pirate's ai is authored melee-aggressive (settled.json) although his Javelin throws
    const pirate = createBattle({ ...base, heroes: ['alpha-sky-pirate'], heroHexes: [247], heroItems: [['item.shortbow']] }).state.units[0]!
    expect(pirate.role).toBe('ranged')
    expect(pirate.ai, 'authored, so it stands').toBe('melee-aggressive')
    const hunter = createBattle({ ...base, heroes: ['hero.base.ranger-aggressive'], heroHexes: [247], heroItems: [['item.longsword']] }).state.units[0]!
    expect(hunter.ai, 'derived, so it follows the sword').toBe('melee-aggressive')
  })
  it('refuses loudly: an unknown item, three hands of weapons, two armors, a mismatched list', () => {
    const one = { ...base, heroes: ['hero.base.ranger-aggressive'], heroHexes: [247] }
    expect(() => createBattle({ ...one, heroItems: [['item.does-not-exist']] })).toThrow(/not an item/)
    expect(() => createBattle({ ...one, heroItems: [['item.halberd', 'item.longsword']] })).toThrow(/more than two hands/)
    expect(() => createBattle({ ...one, heroItems: [['item.thick-hide', 'item.basic-armor']] })).toThrow(/two armors/)
    expect(() => createBattle({ ...one, heroItems: [] })).toThrow(/must correspond/)
    expect(() => createBattle({ ...one, heroItems: [['item.longsword', 'item.longsword']] })).toThrow(/twice/)
  })
  it('applyItems is pure over its inputs — the same call twice is the same def, and the base is untouched', () => {
    const bare = UNITS['alpha-osric']!
    const before = JSON.stringify(bare)
    const a = applyItems(bare, ['item.longsword', 'item.knight-shield'], ITEMS, ATTACKS, 'test')
    const b = applyItems(bare, ['item.longsword', 'item.knight-shield'], ITEMS, ATTACKS, 'test')
    expect(JSON.stringify(a.def)).toBe(JSON.stringify(b.def))
    expect(JSON.stringify(bare)).toBe(before)
    expect(a.worn.map((w) => w.itemId)).toEqual(['item.longsword', 'item.knight-shield'])
  })
})

describe('in real battles', () => {
  it('every hero in the standard battle enters wearing its Codex kit, one unit.equipped per item, cause = the item', () => {
    const ctx = createBattle({ replicate: 0 }); runBattle(ctx)
    for (const u of ctx.state.units.filter((x) => x.side === 'hero')) {
      const kit = UNITS[u.typeId]!.defaultItems ?? []
      const eq = ctx.events.filter((e) => e.type === 'unit.equipped' && e.actor === u.id)
      expect(eq.map((e) => e.causeId), u.typeId).toEqual(kit)
      for (const e of eq) expect(e['itemId']).toBe(e.causeId)
    }
    expect(ctx.events.filter((e) => e.type === 'unit.equipped' && ctx.state.units[e.actor!]!.side === 'enemy').length, 'enemies carry no items').toBe(0)
  })
})
