// fix.enchant-triggers-own-weapon (2026-10-04). Ruled 2026-10-04 (Andrew, DECISIONS.md 'after the backlog run: ...; an
// enchant is its own weapon's; ...'): asked "Should enchants (Frost, Fire, Venomous and the rest) apply only to the
// enchanted weapon's own attacks, not to a Punch?" - "4, yes. If you have a fiery longsword and a dagger with a stab
// ability on it that stab ability does not use the fiery that's on the longsword."
// The rows in question are ARTIFACT ATTRIBUTES - the tier-3 rows that come already on a reward item (GLOSSARY.md
// 'Settled, 2026-10-04': an enchantment is the Forge's tier-2 attribute only); the pack's field for one is still
// `enchant`. The rule is the pipeline's (content mkenginepack, SWITCHES.md attributeTriggersOwnAttacks): on a row made
// of a base weapon and an attribute, every trigger the attribute adds on an attacker's hook is compiled once per attack
// the weapon grants, each `onlyWithAttack` - or on the weapon's first attack alone when the attribute's row says
// `attack: 'basic'` (Flaming). Left as the unit's, by name: Pharaoh's Gauntlets and the Bloodrunes Burning Touch and Bleeding Strike
// (base rows whose words are every strike of their bearer; capability.unit-trigger-with-tag is theirs).
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { advanceBattle } from '../src/core/battle.js'
import { executeAction } from '../src/core/commands.js'
import { ITEMS } from '../src/content/index.js'
import type { Event } from '../src/core/types.js'

/** The hooks whose firing context is the attacker's own attack (COMBAT-SEQUENCE.md "Triggers"). */
const ATTACKER_HOOKS = new Set(['onAttack', 'onMiss', 'onHit', 'onCrit', 'onDamage', 'onKill'])
type Row = (typeof ITEMS)[string] & { base?: string; enchant?: string }
const ROWS = Object.values(ITEMS) as Row[]

/** One swing of `attackId` by a warrior holding `items` at an adjacent zombie, on replicate r. He always hits and always crits (stat overrides; the dice are the same). */
function swing(items: string[], attackId: string, r: number): Event[] {
  const ctx = createBattle({ replicate: r, strict: true, mapId: 'map.open', heroes: ['test-warrior'], heroHexes: [85], heroItems: [items],
    enemies: ['test-zombie'], enemyHexes: [86], enemyCount: 1, overrides: { 'test-warrior': { accuracy: 400, crit: 400, maxStamina: 20, stamina: 20 } as never, 'test-zombie': { maxHp: 60, armor: 0 } as never } })
  advanceBattle(ctx)
  const from = ctx.events.length
  expect(executeAction(ctx, { actor: 0, actionId: attackId, target: 1 }), `${attackId} with ${items.join(' + ')}`).toEqual({ ok: true })
  return ctx.events.slice(from)
}
/** The first replicate on which the swing lands as a crit that deals damage: every attacker hook but onMiss and onKill has fired. */
function landed(items: string[], attackId: string): Event[] {
  for (let r = 0; r < 60; r++) {
    const ev = swing(items, attackId, r)
    const hit = ev.find((e) => e.type === 'attack.hit' && e.causeId === attackId)
    if (hit && hit['crit'] === true && ev.some((e) => e.type === 'damage.applied' && e.causeId === attackId && (e['amount'] as number) > 0)) return ev
  }
  throw new Error(`${attackId} with ${items.join(' + ')}: no damaging crit in 60 replicates`)
}
/** The rolls of the triggers `item`'s attribute added, by hook, in one swing (a roll is logged whether or not it fires). */
const rolls = (ev: Event[], item: string) => ev.filter((e) => e.type === 'trigger.rolled' && e['source'] === item).map((e) => e['hook'])
/** The hooks of the triggers the attribute added to `item`. */
const hooksOf = (item: string) => [...new Set(ITEMS[item]!.triggers.filter((t) => t.source === item).map((t) => t.hook))].sort()

describe('an artifact attribute\'s triggers ride its own weapon\'s attacks', () => {
  it('on hit - the Frost War Hammer: Frost with the Smash and the Skullsplitter, none with a Punch or another attack of the unit', () => {
    const HAMMER = 'item.war-hammer.frost'
    expect(hooksOf(HAMMER)).toEqual(['onCrit', 'onHit'])
    for (const a of ITEMS[HAMMER]!.grants) {
      const ev = landed([HAMMER], a)
      expect(rolls(ev, HAMMER).sort(), a).toEqual(['onCrit', 'onHit'])
      expect(ev.some((e) => e.type === 'status.applied' && e['statusId'] === 'status.frost' && String(e.causeId).startsWith('trigger.war-hammer.frost.')), `${a} applies Frost`).toBe(true)
    }
    for (const other of ['attack.punch', 'attack.test-warrior.axe']) {
      const ev = landed([HAMMER], other)
      expect(rolls(ev, HAMMER), other).toEqual([])
      expect(ev.some((e) => e.type === 'status.applied' && e['statusId'] === 'status.frost'), `${other} applies no Frost`).toBe(false)
    }
  })

  it('on crit - the Bloodletting Longsword with a Dagger in the other hand: Bleed on the Slash\'s crit, none on the Dagger\'s Stab or a Punch', () => {
    const SWORD = 'item.longsword.bloodletting', kit = [SWORD, 'item.dagger']
    expect(hooksOf(SWORD)).toEqual(['onCrit'])
    // Law 10, 2026-10-04 — fix.enchant-stats-on-weapon (DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons': "Strength becomes the weapon's damage (its attacks go up); Crit and Accuracy apply to that weapon's attacks"):
    // this swung 'attack.longsword.slash'. The attribute's +3 Crit is the sword's own attack's now, so the row grants its own copy
    // of the Slash (attack.longsword.slash.bloodletting) and the holder has that, not the plain one. The claim is unchanged and is
    // said of the row's own attack. (was: const slash = landed(kit, 'attack.longsword.slash'))
    expect(ITEMS[SWORD]!.grants).toEqual(['attack.longsword.slash.bloodletting'])
    const slash = landed(kit, ITEMS[SWORD]!.grants[0]!)
    expect(rolls(slash, SWORD)).toEqual(['onCrit'])
    expect(slash.some((e) => e.type === 'status.applied' && e['statusId'] === 'status.bleed')).toBe(true)
    for (const other of ['attack.dagger.stab', 'attack.punch']) {
      const ev = landed(kit, other)
      expect(rolls(ev, SWORD), other).toEqual([])
      expect(ev.some((e) => e.type === 'status.applied' && e['statusId'] === 'status.bleed'), `${other} applies no Bleed`).toBe(false)
    }
  })

  it('on damage - the Hobbling Daggers: Slow with the daggers\' own attacks, none with a Punch', () => {
    const DAGGERS = 'item.daggers.hobbling'
    expect(hooksOf(DAGGERS)).toEqual(['onDamage'])
    // Law 10, 2026-10-04 (the note at the Bloodletting Longsword, above): the Hobbling attribute's "+1 damage" rides the daggers' own
    // attacks, so the row grants its own copies; the Stab swung is the row's. (was: const stab = landed([DAGGERS], 'attack.daggers.stab'))
    const ownStab = ITEMS[DAGGERS]!.grants.find((g) => g.startsWith('attack.daggers.stab'))!
    expect(ownStab).toBe('attack.daggers.stab.hobbling')
    const stab = landed([DAGGERS], ownStab)
    expect(rolls(stab, DAGGERS)).toEqual(['onDamage'])
    expect(stab.some((e) => e.type === 'status.applied' && e['statusId'] === 'status.slow')).toBe(true)
    const punch = landed([DAGGERS], 'attack.punch')
    expect(rolls(punch, DAGGERS)).toEqual([])
    expect(punch.some((e) => e.type === 'status.applied' && e['statusId'] === 'status.slow')).toBe(false)
  })

  it('the dictated case - a fiery longsword and a dagger: the Slash burns, the Dagger\'s Stab does not use the fire that is on the longsword', () => {
    const SWORD = 'item.longsword.flaming', kit = [SWORD, 'item.dagger']
    const slash = landed(kit, 'attack.longsword.slash')
    expect(rolls(slash, SWORD)).toEqual(['onHit', 'onHit'])
    expect(slash.some((e) => e.type === 'status.applied' && e['statusId'] === 'status.burn')).toBe(true)
    for (const other of ['attack.dagger.stab', 'attack.punch']) {
      const ev = landed(kit, other)
      expect(rolls(ev, SWORD), other).toEqual([])
      expect(ev.some((e) => e.type === 'status.applied' && e['statusId'] === 'status.burn'), `${other} burns nothing`).toBe(false)
      expect(ev.some((e) => e.type === 'damage.applied' && e['damageType'] === 'fire'), `${other} deals no fire`).toBe(false)
    }
    // and the Dagger keeps what is its own: its Stab's Protection, on the Stab alone
    expect(landed(kit, 'attack.dagger.stab').some((e) => e.type === 'trigger.rolled' && e['source'] === 'item.dagger')).toBe(true)
    expect(slash.some((e) => e.type === 'trigger.rolled' && e['source'] === 'item.dagger')).toBe(false)
  })
})

describe('over the whole pack', () => {
  /** Every trigger an attribute added to a row that grants an attack, on an attacker's hook (the row's `enchant` field names the attribute). */
  const added = ROWS.filter((i) => i.enchant && i.grants.length > 0)
    .flatMap((i) => i.triggers.filter((t) => t.source === i.id && ATTACKER_HOOKS.has(t.hook)).map((t) => ({ i, t })))

  it('no attribute-added attacker-hook trigger is unscoped, and each is scoped to an attack its own row grants', () => {
    expect(added.length).toBeGreaterThan(80)
    expect(added.filter(({ t }) => !t.onlyWithAttack).map(({ i, t }) => `${i.id}: ${t.id}`)).toEqual([])
    expect(added.filter(({ i, t }) => !i.grants.includes(t.onlyWithAttack!)).map(({ i, t }) => `${i.id}: ${t.id} @ ${t.onlyWithAttack}`)).toEqual([])
  })

  it('each of them rides every attack its weapon grants - or the first alone, where the attribute says the basic attack', () => {
    const wrong: string[] = []
    for (const i of ROWS.filter((r) => r.enchant && r.grants.length > 0)) {
      const mine = i.triggers.filter((t) => t.source === i.id && ATTACKER_HOOKS.has(t.hook))
      const kinds = new Map<string, string[]>()
      for (const t of mine) { const k = JSON.stringify([t.hook, t.chance, t.select, t.effect]); kinds.set(k, [...(kinds.get(k) ?? []), t.onlyWithAttack ?? '']) }
      for (const [k, attacks] of kinds) {
        const all = JSON.stringify([...attacks].sort()) === JSON.stringify([...i.grants].sort())
        const basic = attacks.length === 1 && attacks[0] === i.grants[0]
        if (!all && !basic) wrong.push(`${i.id} ${k}: ${attacks.join(', ')}`)
      }
    }
    expect(wrong).toEqual([])
    // the twelve attributes the finding named are among them, and a row with two attacks holds two of each
    const enchants = new Set(added.map(({ i }) => i.enchant))
    for (const e of ['addling', 'bewildering', 'bloodletting', 'eternal-ice', 'fire', 'frost', 'goading', 'hobbling', 'maddening', 'rooting', 'taunting', 'venomous']) expect(enchants.has('enchant.' + e), e).toBe(true)
    expect(ITEMS['item.war-hammer.frost']!.triggers.filter((t) => t.source === 'item.war-hammer.frost' && t.hook === 'onHit').map((t) => t.onlyWithAttack).sort()).toEqual([...ITEMS['item.war-hammer.frost']!.grants].sort())
  })

  it('within a row every trigger still has its own id', () => {
    for (const i of ROWS) expect(new Set(i.triggers.map((t) => t.id)).size, i.id).toBe(i.triggers.length)
  })

  it('the exceptions, by name: the only unscoped attacker-hook triggers an item brings are the three whose words are every strike of their bearer', () => {
    const unscoped = ROWS.filter((i) => !i.base).flatMap((i) => i.triggers.filter((t) => t.source === i.id && ATTACKER_HOOKS.has(t.hook) && !t.onlyWithAttack).map((t) => `${i.id}: ${t.id}`))
    expect(unscoped.sort()).toEqual([
      'item.pharaohs-gauntlets: trigger.pharaohs-gauntlets.weak',       // "Both hands are the weapon, so nothing you find later can replace them"
      'item.rune-bleeding-strike: trigger.rune-bleeding-strike.bleed',  // worn: "Wounds from this bearer"
      'item.rune-burning-touch: trigger.rune-burning-touch.burn',       // worn: "Flames lick from every strike"
    ])
    // and on every made row (a Forge row, a tier-3 row) nothing unscoped but what one of those three bases brought
    const madeUnscoped = ROWS.filter((i) => i.base).flatMap((i) => i.triggers.filter((t) => ATTACKER_HOOKS.has(t.hook) && !t.onlyWithAttack).map((t) => t.source))
    for (const source of new Set(madeUnscoped)) expect(['item.pharaohs-gauntlets', 'item.rune-bleeding-strike', 'item.rune-burning-touch']).toContain(source)
  })
})
