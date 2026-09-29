// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// seam.items-per-unit (2026-09-02, ITEMS-PLAN.md §2 §4 §5) — items go into
// battle. Ruled 2026-09-02 (Andrew): "the items should go into battle … They
// define what attacks they have. They modify stats." Hero rows are bare; the
// kit — the Codex default, or whatever BattleOptions.heroItems hands over —
// is applied at fielding by ONE function (applyItems), which fieldedDef and
// the battle both read. THE INVARIANT: with no heroItems, every hero fields
// exactly as the converter used to fold it (the oracle fixture).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { attackIdsOf, powerIdsOf } from '../src/core/action.js'
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
      // fix.unit-tags (2026-09-03): the oracle predates the collapse of
      // `attributes` into `tags` (Law 11); the field no longer exists.
      // Hero assembly (2026-09-03): rows carry their class on `tags` now
      // (class.warrior …) so fieldedDef can find the level table; the oracle
      // predates that too.
      // capability.deathbed (2026-09-03): rows carry `toughness` now (the
      // Deathbed Fighting base); the oracle predates it.
      // capability.vision (2026-09-03): items fold `vision` now; the oracle predates it too.
      // progression.level-table-by-type (2026-09-03): the farmer row names its
      // own level table (`levelTable`); a pointer, not a folded number — the
      // oracle predates it. Law 10 reason: a new row FIELD, not a changed value.
      // badge.mechanism / content c24b1ac (2026-09-04): every hero row carries
      // badge.hero (`badges`) — a new row FIELD, not a folded number; the oracle predates it (Law 10).
      // Law 10, 2026-09-23 (v2.shields): V2 R1 moved content, not the fold — the shields
      // (Kite/Round/Tower replace knight-shield and buckler), sword and dagger Block and
      // the axe's onBlock trigger. A hero whose kit carries one of those items differs from
      // the frozen oracle in exactly the fields those items carry, and only those.
      const R1 = new Set(['abilities', 'block', 'rangedBlock', 'triggers', 'dodge', 'maxStamina'])
      const r1Kit = (fieldedDef(id).defaultItems ?? []).some((i) => ITEMS[i]?.itemClass === 'shield' || ITEMS[i]?.statModifiers.block || ITEMS[i]?.triggers.some((t) => t.hook === 'onBlock'))
      const keys = [...new Set([...Object.keys(f), ...Object.keys(r)])].filter((k) => !['attributes', 'tags', 'toughness', 'vision', 'levelTable', 'badges'].includes(k) && !(r1Kit && R1.has(k)) && JSON.stringify(f[k]) !== JSON.stringify(r[k]))
      if (keys.length) differ[id] = keys
    }
    // FINDING: the converter folded item crit/luck into `ported`, then wrote
    // the row from `derivedBase.crit ?? ported.crit` — so an item's crit or
    // luck never reached a hero whose body carried a derived crit. Rusted
    // Plate's −5 Crit and Nice Robes' +3 Luck apply at fielding now.
    // 2026-09-03, pack shipped at content 3f0f1fa: the priest/mage pass
    // (content 20f8576) moved the Holy Texts' Mercy from an attack to a power,
    // so both priests' `attacks` now differ from the pre-2026-09-02 oracle.
    // That is content moving, not the fold — the oracle is frozen on purpose.
    expect(differ).toEqual({
      'hero.base.paladin-dark': ['crit'],
      'hero.base.priest-armored': ['attacks'],
      'hero.base.mage-fireaura': ['luck'],
      'hero.base.priest-pauper': ['attacks', 'luck'],
      // capability.frost (2026-09-03): the Thinking Mage's staff applies Frost,
      // which compiles now that the status exists — a trigger the oracle never had.
      'hero.base.mage-thinking': ['triggers'],
      // FINDING 39 (2026-09-04): the oracle froze Second Wind, Brace and Arcane Ward
      // aimed at the ATTACKER — the converter bug the audit found. The rows say
      // target: self and compile so now; the oracle keeps the bug on purpose as
      // the record of it (Law 10 — content moved, the fold did not).
      'alpha-oathblade': ['triggers'],
      'alpha-air-mage': ['triggers'],
      // Law 10, Sep 10: Sep 5 grants civilians universal Punch. Preserve the
      // frozen oracle and name this exact authored addition, not a fold drift.
      'hero.fixed.orphans': ['attacks'],
      'hero.fixed.lumberjack-and-wife': ['attacks'],
      'hero.fixed.farmer': ['attacks'],
      // Law 10, 2026-09-23 (v2.shields): the retired Knight Shield took its Shield Slam with it.
      'alpha-osric': ['attacks'],
      'hero.base.paladin-hunk': ['attacks'],
      'hero.base.paladin-shiney': ['attacks'],
      'hero.base.paladin-smug': ['attacks'],
      // Law 10, content.peddlers-vest (2026-09-29): the Peddler's Vest no longer takes 2 Health (Andrew,
      // DECISIONS.md 2026-09-28: "No health change."). Content moved, not the fold — the two rows that wear
      // it differ from the frozen oracle in maxHp alone, by exactly the 2 the vest used to take (below).
      'hero.base.priest-robes': ['maxHp'],
      'hero.base.rogue-raven': ['maxHp'],
    })
    for (const id of ['hero.base.priest-robes', 'hero.base.rogue-raven']) expect(fieldedDef(id).maxHp, id).toBe((o[id]!['maxHp'] as number) + 2)
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
  // LAW 10 — 2026-09-04 (fix.class-restriction): this test handed the Hunter a
  // HALBERD, a class.warrior item, and the engine accepted it because nothing
  // read classRestriction. Ruled 2026-09-03: "Only classes that can wield it."
  // The claim — the handed kit decides the attacks, the role, the AI, the bar,
  // and the log says what he wears — is unchanged, on an unrestricted weapon
  // (the longsword). The halberd case is now the refusal test below.
  it('a Hunter handed a longsword has Slash and no shot, kites no more, and the log says what he wears', () => {
    const ctx = createBattle({ ...base, heroes: ['hero.base.ranger-aggressive'], heroHexes: [247], heroItems: [['item.longsword']] })
    const h = ctx.state.units[0]!
    expect(attackIdsOf(ctx, h)).toEqual(['attack.longsword.slash', 'attack.longsword.stab', 'attack.punch'])
    expect(attackIdsOf(ctx, h)).not.toContain('attack.longbow.shot')
    expect(h.role).toBe('melee')
    expect(h.ai).toBe('melee-aggressive')
    expect(h.maxHp, 'no Thick Hide, so the bare 6').toBe(6)
    const eq = ctx.events.filter((e) => e.type === 'unit.equipped' && e.actor === h.id)
    expect(eq.map((e) => e.causeId)).toEqual(['item.longsword'])
    expect(eq[0]!['grants']).toEqual(['attack.longsword.slash', 'attack.longsword.stab'])
    // and the halberd he used to be handed is refused: a class.warrior item on a class.ranger row
    expect(() => createBattle({ ...base, heroes: ['hero.base.ranger-aggressive'], heroHexes: [247], heroItems: [['item.halberd']] })).toThrow(/cannot wield 'item\.halberd', a class\.warrior item/)
  })
  it('an explicit default kit is the same unit as no kit at all, and an empty list is the bare hero', () => {
    const a = createBattle({ ...base, heroes: ['hero.base.ranger-aggressive'], heroHexes: [247] }).state.units[0]!
    const b = createBattle({ ...base, heroes: ['hero.base.ranger-aggressive'], heroHexes: [247], heroItems: [['item.longbow', 'item.thick-hide']] }).state.units[0]!
    const cc = createBattle({ ...base, heroes: ['hero.base.ranger-aggressive'], heroHexes: [247], heroItems: [[]] })
    const c = cc.state.units[0]!
    expect(b).toEqual(a)
    expect(attackIdsOf(cc, c)).toEqual(['attack.punch'])
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
    // LAW 10 — 2026-09-04 (fix.class-restriction): was halberd + longsword on the Hunter; the halberd is refused for its class first now, so three hands is proved with the ranger's own bow and a sword
    expect(() => createBattle({ ...one, heroItems: [['item.longbow', 'item.longsword']] })).toThrow(/more than two hands/)
    expect(() => createBattle({ ...one, heroItems: [['item.thick-hide', 'item.basic-armor']] })).toThrow(/two armors/)
    expect(() => createBattle({ ...one, heroItems: [] })).toThrow(/must correspond/)
    // LAW 10 — 2026-09-24 (v2.loadout): the same row handed twice was refused as 'twice'.
    // COMBAT-V2 §6.1 (ruled 2026-09-07): "Two longswords is 10" — two instances, legal.
    // The claim kept is the refusal of too many hands: a third longsword is still refused.
    expect(() => createBattle({ ...one, heroItems: [['item.longsword', 'item.longsword']] })).not.toThrow()
    expect(() => createBattle({ ...one, heroItems: [['item.longsword', 'item.longsword', 'item.longsword']] })).toThrow(/more than two hands/)
  })
  it('applyItems is pure over its inputs — the same call twice is the same def, and the base is untouched', () => {
    const bare = UNITS['alpha-osric']!
    const before = JSON.stringify(bare)
    // Law 10, 2026-09-23 (v2.shields): item.knight-shield retired; Osric's shield is the Kite now.
    const a = applyItems(bare, ['item.longsword', 'item.kite-shield'], ITEMS, ATTACKS, 'test')
    const b = applyItems(bare, ['item.longsword', 'item.kite-shield'], ITEMS, ATTACKS, 'test')
    expect(JSON.stringify(a.def)).toBe(JSON.stringify(b.def))
    expect(JSON.stringify(bare)).toBe(before)
    expect(a.worn.map((w) => w.itemId)).toEqual(['item.longsword', 'item.kite-shield'])
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
