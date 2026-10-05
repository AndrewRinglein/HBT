// fix.enchant-stats-on-weapon (2026-10-04). Ruled 2026-09-28 (Andrew, DECISIONS.md 'counterattack, special free attacks, the
// opening six, shields, custom weapons'): "What a weapon's enchantment or custom tier may convey: Strength becomes the
// weapon's damage (its attacks go up); Crit and Accuracy apply to that weapon's attacks; Stamina, Luck, Block, Dodge and
// Armor may be conveyed to the wielder" — and half applied (the weapon audit, 2026-10-04): the Forge's tier-2 enchantments
// ride copies of the weapon's own attacks, but the tier-3 artifact attributes and the named weapons folded Strength,
// Precision, Crit and Accuracy onto the WIELDER, so the bonus also rode a Punch, the other hand's weapon and a cast.
// One rule in content's pipeline (mkenginepack; SWITCHES.md weaponStats*): a weapon row's Strength, Precision, Crit and
// Accuracy go onto that weapon's own attacks — the damage of each attack that uses that stat, the crit, the accuracy —
// never onto the wielder; everything else on the row stays the wielder's.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { applyItems } from '../src/core/items.js'
import { preview } from '../src/core/pipeline.js'
import { createBattle } from '../src/core/setup.js'
import { effective } from '../src/core/stats.js'
import { ACTIONS, ATTACKS, ITEMS, UNITS } from '../src/content/index.js'
import type { Ctx } from '../src/core/types.js'

type Row = (typeof ITEMS)[string] & { base?: string; enchant?: string; gaps?: readonly string[] }
const ROWS = Object.values(ITEMS) as Row[]
const ATTACK_STATS = ['strength', 'precision', 'crit', 'accuracy'] as const
const PUNCH = 'attack.punch'
/** The published Codex's attack rows (content/hbt-content.json): what each attack says before its weapon's row is added. */
const PUBLISHED = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8')) as { attacks: { id: string; damage: number; stat: string; crit?: number }[] }
/** A test warrior holding `items` beside a test zombie (no dice are rolled: the preview is read). */
function holder(items: string[], hero = 'test-warrior'): Ctx {
  return createBattle({ replicate: 0, strict: true, mapId: 'map.open', heroes: [hero], heroHexes: [85], heroItems: [items], enemies: ['test-zombie'], enemyHexes: [86], enemyCount: 1,
    overrides: { 'test-zombie': { maxHp: 60, armor: 0, block: 0, dodge: 0 } as never } })
}
const sheet = (ctx: Ctx, stat: string) => effective(ctx, ctx.state.units[0]!, stat as never).value
const look = (ctx: Ctx, attackId: string) => { const p = preview(ctx, 0, 1, attackId); return { damage: p.damageOnHit, crit: p.critChance, accuracy: p.accuracy } }
/** The attack of `row` that is the base attack `baseAttack` or its own copy of it. */
const own = (row: string, baseAttack: string) => ITEMS[row]!.grants.find((g) => g === baseAttack || g.startsWith(baseAttack + '.'))!

describe('the rule, over the whole pack', () => {
  it('no weapon row carries Strength, Precision, Crit or Accuracy as a stat of its holder', () => {
    const still = ROWS.filter((i) => i.itemClass === 'weapon' && ATTACK_STATS.some((s) => (i.statModifiers as Record<string, number>)[s])).map((i) => i.id)
    expect(still).toEqual([])
  })

  it('every attack a weapon row grants exists, and every rider scoped to an attack rides one the row itself grants', () => {
    for (const i of ROWS.filter((r) => r.itemClass === 'weapon')) {
      for (const g of i.grants) expect(ACTIONS[g], `${i.id} grants ${g}`).toBeDefined()   // an attack row, or a burst (the Halberd's Cleave)
      for (const t of i.triggers) if (t.onlyWithAttack) expect(i.grants, `${i.id}: ${t.id}`).toContain(t.onlyWithAttack)
    }
  })
})

describe('a tier-3 artifact attribute — the Soul Reaper Greatsword (+1 Strength)', () => {
  const PLAIN = 'item.greatsword', REAPER = 'item.greatsword.soul-reaper', HEW = 'attack.greatsword.hew'
  it('its own attack hits for 1 more than the plain Greatsword\'s; the hero\'s Strength is unchanged; a Punch hits no harder', () => {
    const a = holder([PLAIN]), b = holder([REAPER])
    expect(sheet(b, 'strength')).toBe(sheet(a, 'strength'))
    expect(look(b, own(REAPER, HEW)).damage).toBe(look(a, HEW).damage + 1)
    expect(look(b, PUNCH)).toEqual(look(a, PUNCH))
  })

  it('the row says it on the attack: its own copy of the Hew, 1 more damage, the same cost — and the row keeps the base\'s Block and power', () => {
    const copy = own(REAPER, HEW)
    expect(copy).not.toBe(HEW)
    expect(ATTACKS[copy]!.attack!.bonus).toBe(ATTACKS[HEW]!.attack!.bonus! + 1)
    expect(ATTACKS[copy]!.staminaCost).toBe(ATTACKS[HEW]!.staminaCost)
    expect(ATTACKS[copy]!.name).toBe(ATTACKS[HEW]!.name)
    expect(ITEMS[REAPER]!.statModifiers).toEqual(ITEMS[PLAIN]!.statModifiers)
    expect(ITEMS[REAPER]!.abilities).toEqual(ITEMS[PLAIN]!.abilities)
  })
})

describe('the other hand\'s weapon is not raised — the Bloodthirsty Raider\'s Cutlass (+1 Strength, −5 Dodge) beside a Dagger', () => {
  const PLAIN = 'item.raiders-cutlass', THIRSTY = 'item.raiders-cutlass.bloodthirsty', DAGGER = 'item.dagger'
  it('the cutlass\'s attacks hit for 1 more; the Dagger\'s and the Punch do not; the −5 Dodge is the hero\'s', () => {
    const a = holder([PLAIN, DAGGER]), b = holder([THIRSTY, DAGGER])
    expect(sheet(b, 'strength')).toBe(sheet(a, 'strength'))
    expect(sheet(b, 'dodge')).toBe(sheet(a, 'dodge') - 5)
    for (const base of ITEMS[PLAIN]!.grants) expect(look(b, own(THIRSTY, base)).damage, base).toBe(look(a, base).damage + 1)
    for (const other of [...ITEMS[DAGGER]!.grants, PUNCH]) expect(look(b, other), other).toEqual(look(a, other))
  })
})

describe('Crit and Accuracy — the Bloodletting Greatsword (+3 Crit) and the Gale Crossbow (+20 Accuracy)', () => {
  it('+3 Crit is the weapon\'s attack\'s; the hero\'s Crit and a Punch\'s crit chance are unchanged', () => {
    const a = holder(['item.greatsword']), b = holder(['item.greatsword.bloodletting']), HEW = 'attack.greatsword.hew'
    expect(sheet(b, 'crit')).toBe(sheet(a, 'crit'))
    expect(look(b, own('item.greatsword.bloodletting', HEW)).crit).toBe(look(a, HEW).crit + 3)
    expect(look(b, PUNCH)).toEqual(look(a, PUNCH))
  })

  it('+20 Accuracy is the weapon\'s attacks\'; the hero\'s Accuracy and a Punch\'s are unchanged', () => {
    const a = holder(['item.crossbow']), b = holder(['item.crossbow.gale'])
    expect(sheet(b, 'accuracy')).toBe(sheet(a, 'accuracy'))
    for (const base of ITEMS['item.crossbow']!.grants) expect(ATTACKS[own('item.crossbow.gale', base)]!.attack!.accuracy ?? 0, base).toBe((ATTACKS[base]!.attack!.accuracy ?? 0) + 20)
    expect(look(b, PUNCH).accuracy).toBe(look(a, PUNCH).accuracy)
  })
})

describe('Precision rides the attacks that use it — the Hunting Spear of Hunting (+1 Precision): the Hurl, not the Thrust', () => {
  it('the throw, a Precision attack, hits for 1 more; the thrust, a Strength attack, does not; the hero\'s Precision is unchanged', () => {
    const PLAIN = 'item.hunting-spear', HUNT = 'item.hunting-spear.hunting'
    const byStat = (stat: string) => ITEMS[PLAIN]!.grants.find((g) => ATTACKS[g]!.attack!.stat === stat)!
    const thrust = byStat('strength'), hurl = byStat('precision')
    expect(thrust && hurl).toBeTruthy()
    expect(sheet(holder([HUNT]), 'precision')).toBe(sheet(holder([PLAIN]), 'precision'))
    expect(ATTACKS[own(HUNT, hurl)]!.attack!.bonus).toBe(ATTACKS[hurl]!.attack!.bonus! + 1)
    expect(ATTACKS[own(HUNT, thrust)]!.attack!.bonus).toBe(ATTACKS[thrust]!.attack!.bonus)
  })

  it('a stat no attack of the weapon uses rides nothing and is named, never dropped — the Greatsword of Sacrifice\'s +2 Precision', () => {
    const SAC = 'item.greatsword.sacrifice', HEW = 'attack.greatsword.hew'
    expect(ATTACKS[own(SAC, HEW)]!.attack!.bonus).toBe(ATTACKS[HEW]!.attack!.bonus! + 2)   // its +2 Strength
    expect((ITEMS[SAC] as Row).gaps?.some((g) => /precision/i.test(g) && /no attack/i.test(g)), JSON.stringify((ITEMS[SAC] as Row).gaps)).toBe(true)
    // what it conveys to the wielder is still his: −4 Health, −10 Dodge
    expect((ITEMS[SAC]!.statModifiers as Record<string, number>)['maxHp']).toBe(-4)
    expect((ITEMS[SAC]!.statModifiers as Record<string, number>)['dodge']).toBe(-10)
  })
})

describe('a named weapon — the Death Blade (+1 Strength) and the Demonic Shiv (+1 Strength, +5 Crit)', () => {
  it('the Death Blade\'s attacks carry its +1; the hero\'s Strength is the bare hero\'s; a Punch hits no harder than a bare hero\'s', () => {
    const bare = holder([]), b = holder(['item.death-blade'])
    expect(sheet(b, 'strength')).toBe(sheet(bare, 'strength'))
    expect(look(b, PUNCH)).toEqual(look(bare, PUNCH))
    expect(ITEMS['item.death-blade']!.grants.length).toBeGreaterThan(0)
    for (const g of ITEMS['item.death-blade']!.grants) expect(g.startsWith('attack.death-blade.'), g).toBe(true)
  })

  it('its numbers are on its own attack rows: the Codex\'s damage plus the row\'s Strength; the Shiv\'s plus its Crit', () => {
    for (const [item, strength, crit] of [['item.death-blade', 1, 0], ['item.demonic-shiv', 1, 5]] as const) {
      for (const g of ITEMS[item]!.grants) {
        const row = PUBLISHED.attacks.find((a) => a.id === g)!
        expect(ATTACKS[g]!.attack!.bonus, g).toBe(row.damage + (row.stat === 'strength' ? strength : 0))
        expect(ATTACKS[g]!.attack!.crit ?? 0, g).toBe((row.crit ?? 0) + crit)
      }
    }
  })

  it('a bow\'s Precision is its shots\' — the Seraph Bow (+1 Precision)', () => {
    const RANGER = 'hero.base.ranger-ranger', bare = holder([], RANGER), b = holder(['item.seraph-bow'], RANGER)   // a Ranger's bow: a Ranger holds it
    expect(sheet(b, 'precision')).toBe(sheet(bare, 'precision'))
    for (const g of ITEMS['item.seraph-bow']!.grants) { const row = PUBLISHED.attacks.find((a) => a.id === g)!; expect(ATTACKS[g]!.attack!.bonus, g).toBe(row.damage + 1) }
  })
})

describe('what a weapon conveys to its wielder is still the wielder\'s', () => {
  it('Block from a sword, Dodge from an attribute, Health from an attribute', () => {
    const bare = UNITS['test-warrior']!
    const w = (items: string[]) => applyItems(bare, items, ITEMS, ACTIONS, 'test').def
    expect((w(['item.greatsword.soul-reaper']).block ?? 0) - (bare.block ?? 0)).toBe(5)
    expect(w(['item.raiders-cutlass.bloodthirsty']).dodge - w(['item.raiders-cutlass']).dodge).toBe(-5)
    expect(w(['item.greatsword.sacrifice']).maxHp - w(['item.greatsword']).maxHp).toBe(-4)
  })
})

describe('the Forge\'s tier-2 enchantments are what they were — the one path', () => {
  it('Heavy, Keen and Cruel ride their own copies: +1 damage; +6 Accuracy; +3 Accuracy and +4 Crit', () => {
    const HEW = 'attack.greatsword.hew', base = ATTACKS[HEW]!.attack!
    expect(ATTACKS[HEW + '.heavy']!.attack!.bonus).toBe(base.bonus! + 1)
    expect(ATTACKS[HEW + '.keen']!.attack!.accuracy ?? 0).toBe((base.accuracy ?? 0) + 6)
    expect([ATTACKS[HEW + '.cruel']!.attack!.accuracy ?? 0, ATTACKS[HEW + '.cruel']!.attack!.crit ?? 0]).toEqual([(base.accuracy ?? 0) + 3, (base.crit ?? 0) + 4])
  })

  it('an attribute\'s "+1 damage" rides its weapon\'s attacks at tier 3 as it does at tier 2 — the Destroying Greatsword', () => {
    const HEW = 'attack.greatsword.hew'
    expect(ATTACKS[own('item.greatsword.destroying', HEW)]!.attack!.bonus).toBe(ATTACKS[HEW]!.attack!.bonus! + 1)
  })
})
