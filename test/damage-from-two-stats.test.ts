// capability.damage-from-two-stats (2026-10-05). Ruled 2026-10-04 (Andrew, DECISIONS.md 'his 28 reward weapons read back: … the
// mechanics his own items need are wanted'): of damage from two stats added, Precision and Magic among them — "We do need that."
// — and 'the Force Staff is Precision plus half Magic, as magic damage': "pre+ 1/2 magic, as magic damage".
//
// The Codex's attack rows already said it, in four fields the pack dropped and named (fix.kit-attack-clauses): `addsStat` (a
// second stat, once), `halfStatBonus` (half of one), `doubleStatBonus` (twice one) and `doubleStat` (the attack's own stat,
// twice). The mechanism (SWITCHES.md twoStat*): an attack's damage is a SUM OF TERMS — its own stat times a whole multiple,
// plus each added stat times a multiple over a divisor, a half rounded nearest with 0.5 up — plus its flat number, dealt as
// one damage of the attack's type. Magic and Spirit are the party's (the side's total), every other stat the attacker's own.
// Each added term is its own row of the damage ledger, so the preview shows it before the swing (Law 1).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DMG, attackDef, damageSourceOfAttack, preview, resolveDamage } from '../src/core/pipeline.js'
import { createBattle } from '../src/core/setup.js'
import { effective } from '../src/core/stats.js'
import { partySum } from '../src/core/trigger.js'
import { ATTACKS, ITEMS } from '../src/content/index.js'
import type { Ctx, Unit } from '../src/core/types.js'
import { hexId } from './board16.js'

const CONTENT = join(__dirname, '..', '..', 'content')
const CODEX = JSON.parse(readFileSync(join(CONTENT, 'hbt-content.json'), 'utf8')) as { attacks: { id: string; stat: string; damage: number; description?: string; addsStat?: string; halfStatBonus?: string; doubleStatBonus?: string; doubleStat?: boolean; burst?: unknown }[] }
const GAPS = (JSON.parse(readFileSync(join(CONTENT, 'gen', 'enemy-pack-gaps.json'), 'utf8')) as { gaps: { unit: string; what: string; needs: string }[] }).gaps
const MAGE = 'hero.base.mage-fire', ZOMBIE = 'test-zombie'
const FORCE = 'attack.force-staff.force-blast', UNBINDING = 'attack.staff-of-summoning.unbinding', RUIN = 'attack.staff-of-the-destroyer.ruin',
  SUNDERING = 'attack.staff-of-the-destroyer.sundering', ANNIHILATION = 'attack.staff-of-the-ultimate-destroyer.annihilation'
/** A mage holding `item`, a second mage beside him (so the party's Magic is more than his own), and a zombie with no Armor or Resist five hexes off. */
function rig(item: string) {
  const ctx = createBattle({ scenarioId: 'probe.damage-from-two-stats', replicate: 1, mapId: 'map.open', heroes: [MAGE, MAGE], heroHexes: [hexId(5, 5), hexId(4, 5)], heroItems: [[item], []],
    enemies: [ZOMBIE], enemyHexes: [hexId(9, 5)], enemyCount: 1, cfg: { switches: { critEnabled: false } as never }, overrides: { [ZOMBIE]: { maxHp: 500, armor: 0, resist: 0 } as never } })
  const h = ctx.state.units[0]!, z = ctx.state.units.find((u) => u.side === 'enemy')!
  return { ctx, h, z }
}
const stat = (ctx: Ctx, u: Unit, name: string) => effective(ctx, u, name as never).value
const half = (n: number) => Math.floor(n / 2 + 0.5)
/** The source damage of `attack` by the rig's mage: the number before the target's mitigation, and its ledger. */
const source = (ctx: Ctx, h: Unit, z: Unit, attack: string) => resolveDamage(ctx, h, z, damageSourceOfAttack(attackDef(ctx, attack)), 0)
const added = (ledger: readonly { name: string; effectId: string; delta: number }[]) => ledger.filter((r) => r.name === 'SOURCE_STAT_ADDED').map((r) => [r.effectId, r.delta])

describe('the rows: each attack says its terms', () => {
  it('Force Blast: Precision, plus half the party\'s Magic; Unbinding the same; Ruin and Sundering Precision plus twice Magic; Annihilation twice Precision plus twice Magic', () => {
    const terms = (id: string) => [ATTACKS[id]!.attack!.stat, ATTACKS[id]!.attack!.statMult ?? 1, ATTACKS[id]!.attack!.addsStats ?? []]
    expect(terms(FORCE)).toEqual(['precision', 1, [{ stat: 'magic', mult: 1, div: 2 }]])
    expect(terms(UNBINDING)).toEqual(['precision', 1, [{ stat: 'magic', mult: 1, div: 2 }]])
    expect(terms(RUIN)).toEqual(['precision', 1, [{ stat: 'magic', mult: 2 }]])
    expect(terms(SUNDERING)).toEqual(['precision', 1, [{ stat: 'magic', mult: 2 }]])
    expect(terms(ANNIHILATION)).toEqual(['precision', 2, [{ stat: 'magic', mult: 2 }]])
    for (const id of [FORCE, UNBINDING, RUIN, SUNDERING, ANNIHILATION]) expect(ATTACKS[id]!.attack!.damageType, id).toBe('magic')
  })

  it('the Force Staff\'s own words say half, as ruled: "pre+ 1/2 magic, as magic damage"', () => {
    expect(CODEX.attacks.find((a) => a.id === FORCE)!.description).toBe('Damage equals your Precision plus half the party\'s Magic.')
  })

  it('every Codex attack that names a second term carries it in the pack, and no gap line says "damage from two stats" of an attack', () => {
    const rows = CODEX.attacks.filter((a) => !a.burst && (a.addsStat || a.halfStatBonus || a.doubleStatBonus || a.doubleStat))
    expect(rows.length).toBeGreaterThan(15)
    for (const r of rows) {
      const p = ATTACKS[r.id]?.attack
      if (!p) continue   // an attack no fielded row grants is not in the registry
      const want = [...(r.addsStat ? [{ stat: r.addsStat, mult: 1 }] : []), ...(r.halfStatBonus ? [{ stat: r.halfStatBonus, mult: 1, div: 2 }] : []), ...(r.doubleStatBonus ? [{ stat: r.doubleStatBonus, mult: 2 }] : [])]
      expect(p.addsStats ?? [], r.id).toEqual(want)
      expect(p.statMult ?? 1, r.id).toBe(r.doubleStat ? 2 : 1)
    }
    expect(GAPS.filter((g) => /damage from two stats/.test(g.needs) && !/burst/.test(g.needs)).map((g) => g.what)).toEqual([])
  })
})

describe('the damage is the sum, dealt as one damage of the attack\'s type', () => {
  it('Force Blast deals Precision plus half the party\'s Magic, the half rounded nearest with 0.5 up — and the half is the PARTY\'s, not his own', () => {
    const { ctx, h, z } = rig('item.force-staff')
    const pre = stat(ctx, h, 'precision'), magic = partySum(ctx, h.side, 'magic')
    expect(magic).toBeGreaterThan(stat(ctx, h, 'magic'))
    const d = source(ctx, h, z, FORCE)
    expect(d.value).toBe(pre + half(magic))
    expect(added(d.ledger)).toEqual([['party.magic', half(magic)]])
    expect(preview(ctx, h.id, z.id, FORCE).damageOnHit).toBe(d.value)
  })

  it('an odd Magic rounds its half up: 3 gives 2, 5 gives 3, 4 gives 2', () => {
    for (const [m, want] of [[3, 2], [5, 3], [4, 2], [1, 1], [0, 0]] as const) {
      const { ctx, h, z } = rig('item.force-staff')
      for (const u of ctx.state.units) if (u.side === 'hero') u.magic = 0
      h.magic = m
      expect(source(ctx, h, z, FORCE).value - stat(ctx, h, 'precision'), `Magic ${m}`).toBe(want)
    }
  })

  it('Unbinding is the same sum; Ruin and Sundering are Precision plus twice Magic; Annihilation is twice Precision plus twice Magic', () => {
    for (const [item, attack, pm, mm] of [['item.staff-of-summoning', UNBINDING, 1, 0.5], ['item.staff-of-the-destroyer', RUIN, 1, 2], ['item.staff-of-the-destroyer', SUNDERING, 1, 2], ['item.staff-of-the-ultimate-destroyer', ANNIHILATION, 2, 2]] as const) {
      const { ctx, h, z } = rig(item)
      const pre = stat(ctx, h, 'precision'), magic = partySum(ctx, h.side, 'magic')
      const flat = ATTACKS[attack]!.attack!.bonus
      expect(source(ctx, h, z, attack).value, attack).toBe(flat + pre * pm + (mm === 0.5 ? half(magic) : magic * mm))
    }
  })

  it('raising the party\'s Magic by 1 raises each by its multiple — and it need not be the attacker\'s own Magic that rises', () => {
    for (const [item, attack, per2] of [['item.staff-of-the-destroyer', RUIN, 4], ['item.staff-of-the-ultimate-destroyer', ANNIHILATION, 4], ['item.force-staff', FORCE, 1]] as const) {
      const { ctx, h, z } = rig(item)
      const before = source(ctx, h, z, attack).value
      ctx.state.units[1]!.magic += 2   // the OTHER mage's
      expect(source(ctx, h, z, attack).value - before, attack).toBe(per2)
    }
  })

  it('raising his Precision by 1 raises Annihilation by 2 and the others by 1', () => {
    for (const [item, attack, per] of [['item.staff-of-the-ultimate-destroyer', ANNIHILATION, 2], ['item.staff-of-the-destroyer', RUIN, 1], ['item.force-staff', FORCE, 1]] as const) {
      const { ctx, h, z } = rig(item)
      const before = source(ctx, h, z, attack).value
      h.mods.push({ stat: 'precision', op: 'add', value: 1, source: 'test', scope: 'unit' })
      expect(source(ctx, h, z, attack).value - before, attack).toBe(per)
    }
  })

  it('it is one damage of the attack\'s type: the target\'s Resist comes off the whole sum once', () => {
    const { ctx, h, z } = rig('item.force-staff')
    const open = preview(ctx, h.id, z.id, FORCE).damageOnHit
    z.resist = 2
    expect(preview(ctx, h.id, z.id, FORCE).damageOnHit).toBe(open - 2)
  })

  it('a stat that is not the party\'s is the attacker\'s own: the War Hammer\'s Skullsplitter adds his Armor', () => {
    const SKULL = 'attack.war-hammer.skullsplitter'
    expect(ATTACKS[SKULL]!.attack!.addsStats).toEqual([{ stat: 'armor', mult: 1 }])
    const ctx = createBattle({ scenarioId: 'probe.damage-from-two-stats', replicate: 1, mapId: 'map.open', heroes: ['test-warrior', 'test-warrior'], heroHexes: [hexId(5, 5), hexId(4, 5)], heroItems: [['item.war-hammer'], []],
      enemies: [ZOMBIE], enemyHexes: [hexId(5, 6)], enemyCount: 1, overrides: { [ZOMBIE]: { maxHp: 500, armor: 0, resist: 0 } as never } })
    const h = ctx.state.units[0]!, other = ctx.state.units[1]!, z = ctx.state.units.find((u) => u.side === 'enemy')!
    h.armor = 3; other.armor = 9
    const d = source(ctx, h, z, SKULL)
    expect(added(d.ledger)).toEqual([[`unit.${h.typeId}`, 3]])
    expect(d.value).toBe(ATTACKS[SKULL]!.attack!.bonus + stat(ctx, h, 'strength') + 3)
  })
})

describe('a one-stat attack deals what it dealt before', () => {
  it('no attack without a second term carries the fields, and its ledger has no added row', () => {
    const plain = Object.values(ATTACKS).filter((a) => a.attack && !a.attack.addsStats && a.attack.statMult === undefined)
    expect(plain.length).toBeGreaterThan(200)
    const { ctx, h, z } = rig('item.fire-staff')
    const bolt = ITEMS['item.fire-staff']!.grants[0]!
    const d = source(ctx, h, z, bolt)
    expect(added(d.ledger)).toEqual([])
    expect(d.value).toBe(ATTACKS[bolt]!.attack!.bonus + stat(ctx, h, ATTACKS[bolt]!.attack!.stat))
    expect(DMG.SOURCE_STAT).toBeDefined()
  })
})

describe('in a real battle — the fielding test.force-blast', () => {
  it('the computer-played mage shoots Force Blasts, and each hit\'s ledger shows the party\'s half Magic as its own row', async () => {
    const { SCENARIOS, scenarioOptions } = await import('../src/content/scenarios.js')
    const { runBattle } = await import('../src/core/battle.js')
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.force-blast']!, 0)); runBattle(ctx)
    const hits = ctx.events.filter((e) => e.type === 'attack.hit' && e.causeId === FORCE)
    expect(hits.length).toBeGreaterThan(0)
    for (const h of hits) expect((h['ledger'] as { station: string; effectId: string }[]).some((r) => r.station === 'SOURCE_STAT_ADDED' && r.effectId === 'party.magic'), JSON.stringify(h['ledger']).slice(0, 300)).toBe(true)
  })
})
