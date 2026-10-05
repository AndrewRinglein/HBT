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
import { CRIT_BASE } from '../src/core/pipeline.js'
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
      // Law 10, 2026-10-01 (fix.codex-numbers; DECISIONS.md 2026-09-28 "the duplication review, ruled",
      // finding C1: "Crit base 3 should be counted once"): the frozen oracle holds crit as the Codex
      // TOTAL (a warrior 3), which the engine then added its own 3 to. A row now carries the total less
      // CRIT_BASE. The oracle stays frozen; its crit is read as that same difference, so the comparison
      // still says whether the FOLD moved — no assertion below is loosened.
      const critOver = ((row['crit'] as number | undefined) ?? 0) - CRIT_BASE
      const { crit: _frozenCrit, ...frozen } = row
      const r = shape(critOver ? { ...frozen, crit: critOver } : frozen)
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
      // Law 10, 2026-10-04 — capability.free-attack-accuracy (DECISIONS.md 2026-09-28, the Armory Ledger's rules: "'+10 counterattack' on a weapon is +10 Accuracy on your counterattacks."): the Longsword and
      // the Great Sword carry Counterattack Accuracy 10 on their rows, a stat the frozen oracle never had. A hero whose kit holds one
      // differs from it in that field too - content moved, not the fold; exactly the kit's own sum, held below.
      // (was: new Set(['abilities', 'block', 'rangedBlock', 'triggers', 'dodge', 'maxStamina']))
      const R1 = new Set(['abilities', 'block', 'rangedBlock', 'triggers', 'dodge', 'maxStamina', 'counterattackAccuracy'])
      const kitCounter = (fieldedDef(id).defaultItems ?? []).reduce((n, i) => n + ((ITEMS[i]?.statModifiers as Record<string, number> | undefined)?.['counterattackAccuracy'] ?? 0), 0)
      expect((fieldedDef(id) as unknown as Record<string, number>)['counterattackAccuracy'] ?? 0, `${id} Counterattack Accuracy is its kit's`).toBe(kitCounter)
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
      // Law 10, 2026-10-04 — content.greatsword-war-axe-reauthored (DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): the Great Sword grants the
      // Hew and the power Heavy Counterattack; its Great Cleave is gone, row and all. The two rows that hold a Great Sword field
      // without the Great Cleave the frozen oracle folded - content moved, not the fold. Exactly that attack, held below.
      // (was: 'hero.base.paladin-dark': ['crit'], and no row for 'hero.base.warrior-barbarian')
      'hero.base.paladin-dark': ['attacks', 'crit'],
      'hero.base.warrior-barbarian': ['attacks'],
      'hero.base.priest-armored': ['attacks'],
      // Law 10, 2026-10-04 — content.longsword-loses-stab (2026-10-04; DECISIONS.md 2026-10-04 'after the backlog run: ... the Longsword loses Stab ...', "3 yes"): the Longsword grants Slash alone,
      // so a row that holds one fields without the Stab the frozen oracle folded - content moved, not the fold. The oracle
      // stays frozen (it still names the retired Shield Slam too). The three Paladins' and Osric's `attacks` already differed
      // by that Shield Slam (their rows below); the Raven's did not, and is named here
      // (was: no 'attacks' on 'hero.base.rogue-raven').
      // Law 10, fix.starting-kit-powers (2026-10-04; DECISIONS.md 2026-10-03 "reported: the priest's Holy Texts has no heal
      // in battle — three starting weapons lose their power on the way into the engine"): the Holy Texts' Mercy, the Fire
      // Staff's Flame Burst and the Frost Staff's Frost Nova compile now, so the five rows that hold one of those weapons
      // carry a power the frozen oracle never had — content moved, not the fold. (The Battle Chaplain holds the Holy Texts
      // too; his `abilities` already differed by his Round Shield's powers, the R1 allowance above.) Their powers are named below.
      // was: 'hero.base.mage-fireaura': ['luck'], 'hero.base.priest-pauper': ['attacks', 'luck'], 'hero.base.mage-thinking': ['triggers'],
      //      and no row for 'hero.base.mage-fire' or 'hero.base.mage-sexy'
      'hero.base.mage-fire': ['abilities'],
      'hero.base.mage-sexy': ['abilities'],
      'hero.base.mage-fireaura': ['abilities', 'luck'],
      'hero.base.priest-pauper': ['attacks', 'abilities', 'luck'],
      // capability.frost (2026-09-03): the Thinking Mage's staff applies Frost,
      // which compiles now that the status exists — a trigger the oracle never had.
      'hero.base.mage-thinking': ['abilities', 'triggers'],
      // FINDING 39 (2026-09-04): the oracle froze Second Wind, Brace and Arcane Ward
      // aimed at the ATTACKER — the converter bug the audit found. The rows say
      // target: self and compile so now; the oracle keeps the bug on purpose as
      // the record of it (Law 10 — content moved, the fold did not).
      'alpha-oathblade': ['triggers'],
      'alpha-air-mage': ['triggers'],
      // Law 10, Sep 10: Sep 5 grants civilians universal Punch. Preserve the
      // frozen oracle and name this exact authored addition, not a fold drift.
      // Law 10, fix.orphans-teacher-knife (2026-10-02; DECISIONS.md 2026-10-02 "The Orphanage, Orphanage, and the school
      // teacher should start with a knife each."): her kit is the Dagger, not the pile of rocks — content moved, not the
      // fold. The melee knife makes her role and ai melee (derived from the kit), and her row says placedWithKit.
      // was: 'hero.fixed.orphans': ['attacks'],
      // Law 10, fix.civilians-field-kit (2026-10-03; DECISIONS.md 2026-10-03 'every civilian fields its kit by default when an
      // encounter places it': "all of the civilians, by default, should field their kit the first time they're loaded"): the
      // opt-in row flag is retired — every placed unit fields its kit — so her row no longer says placedWithKit. Content
      // moved, not the fold.
      // was: 'hero.fixed.orphans': ['role', 'ai', 'attacks', 'placedWithKit'],
      'hero.fixed.orphans': ['role', 'ai', 'attacks'],
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
      // Law 10, 2026-10-04 — fix.kit-attack-clauses (DECISIONS.md 2026-10-04 'the weapon audit: ...': "the pack drops clauses from
      // weapons the 24 base heroes carry"): the Iron Mace's Crush and the Elfbow's Elf Shot carry their Codex riders now (on hit
      // the target loses 1 Armor; on hit gain 1 Precision), so the three rows that hold one of those weapons carry a trigger the
      // frozen oracle never had - content moved, not the fold. Exactly those riders, held below.
      // (was: no row for 'hero.base.priest-scantily', 'hero.base.ranger-ranger' or 'hero.base.ranger-scantily')
      'hero.base.priest-scantily': ['triggers'],
      'hero.base.ranger-ranger': ['triggers'],
      'hero.base.ranger-scantily': ['triggers'],
      'hero.base.rogue-raven': ['maxHp', 'attacks'],   // 'attacks': Law 10, 2026-10-04, the note above (was: ['maxHp'])
    })
    for (const id of ['hero.base.priest-robes', 'hero.base.rogue-raven']) expect(fieldedDef(id).maxHp, id).toBe((o[id]!['maxHp'] as number) + 2)
    // fix.kit-attack-clauses (2026-10-04): the `triggers` that differ are exactly the weapon's stat rider, one more than the oracle's
    for (const [id, rider] of [['hero.base.priest-scantily', 'trigger.iron-mace.crush.armor'], ['hero.base.ranger-ranger', 'trigger.elfbow.elf-shot.precision'], ['hero.base.ranger-scantily', 'trigger.elfbow.elf-shot.precision']] as const) {
      const was = ((o[id]!['triggers'] as { id: string }[] | undefined) ?? []).map((t) => t.id)
      expect((fieldedDef(id).triggers ?? []).map((t) => t.id).filter((t) => !was.includes(t)), id).toEqual([rider])
    }
    // content.longsword-loses-stab (2026-10-04): the Raven's `attacks` differ by exactly the attacks the pack no longer holds - the Longsword's Stab
    expect(fieldedDef('hero.base.rogue-raven').attacks).toEqual((o['hero.base.rogue-raven']!['attacks'] as string[]).filter((a) => ATTACKS[a]))
    expect((o['hero.base.rogue-raven']!['attacks'] as string[]).filter((a) => !ATTACKS[a])).toEqual(['attack.longsword.stab'])
    // content.greatsword-war-axe-reauthored (2026-10-04): the two Great Sword holders' `attacks` differ by exactly the Great Cleave
    for (const id of ['hero.base.paladin-dark', 'hero.base.warrior-barbarian']) {
      expect(fieldedDef(id).attacks, id).toEqual((o[id]!['attacks'] as string[]).filter((a) => ATTACKS[a]))
      expect((o[id]!['attacks'] as string[]).filter((a) => !ATTACKS[a]), id).toEqual(['attack.greatsword.great-cleave'])
    }
    expect(fieldedDef('hero.base.paladin-dark').crit).toBe((o['hero.base.paladin-dark']!['crit'] as number) - CRIT_BASE + ITEMS['item.rusted-plate']!.statModifiers.crit!)   // Law 10, fix.codex-numbers: the oracle's total, less the base (above)
    expect(fieldedDef('hero.base.priest-pauper').luck).toBe(ITEMS['item.nice-robes']!.statModifiers.luck)
    // fix.starting-kit-powers (2026-10-04): the `abilities` that differ are exactly the three powers, and nothing else
    for (const [id, power] of [['hero.base.mage-fire', 'power.fire-staff.fireball'], ['hero.base.mage-sexy', 'power.fire-staff.fireball'], ['hero.base.mage-fireaura', 'power.fire-staff.fireball'],
      ['hero.base.mage-thinking', 'power.frost-staff.frost-nova'], ['hero.base.priest-pauper', 'power.holy-texts.mercy']] as const) {
      expect(fieldedDef(id).abilities, id).toEqual([...((o[id]!['abilities'] as string[] | undefined) ?? []), power])
    }
    expect(fieldedDef('hero.base.priest-armored').abilities).toContain('power.holy-texts.mercy')
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
    // Law 10, 2026-10-04 — content.longsword-loses-stab (2026-10-04; DECISIONS.md 2026-10-04 'after the backlog run: ... the Longsword loses Stab ...', "3 yes"): the Longsword's attacks are what its
    // row grants (Slash; the Stab is gone), and the claim is said as that rule: the handed kit's attacks, then the Punch
    // (was: `toEqual(['attack.longsword.slash', 'attack.longsword.stab', 'attack.punch'])`).
    expect(ITEMS['item.longsword']!.grants[0]).toBe('attack.longsword.slash')
    expect(attackIdsOf(ctx, h)).toEqual([...ITEMS['item.longsword']!.grants, 'attack.punch'])
    expect(attackIdsOf(ctx, h)).not.toContain('attack.longbow.shot')
    expect(h.role).toBe('melee')
    expect(h.ai).toBe('melee-aggressive')
    expect(h.maxHp, 'no Thick Hide, so the bare 6').toBe(6)
    const eq = ctx.events.filter((e) => e.type === 'unit.equipped' && e.actor === h.id)
    expect(eq.map((e) => e.causeId)).toEqual(['item.longsword'])
    // Law 10, 2026-10-04 (same edit): the log says the row's own grants (was: `toEqual(['attack.longsword.slash', 'attack.longsword.stab'])`)
    expect(eq[0]!['grants']).toEqual(ITEMS['item.longsword']!.grants)
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
