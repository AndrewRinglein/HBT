// seam.unit-mods (2026-09-25, GEAR-IMPLEMENTATION.md §1, GEAR-DESIGN.md §5) — set
// bonuses reach the battle as PER-UNIT numbers. The kingdom resolves the sets when the
// hero is built for battle ("looked up when the players are being built and shipped to
// combat … then it gets written to the stats for that battle", Andrew 2026-09-02) and
// hands the engine numbers, never set logic: stat mods on one fielded hero, and +damage
// on one fielded weapon's attacks. `BattleOptions.heroMods` is parallel to heroes /
// heroHexes / heroItems; applied after the items, one `unit.modified` per (unit, source).
//
// The numbers here are TEST values shaped on GEAR-DESIGN.md §5's published examples —
// Slaying "+1 Damage on this weapon per other slaying weapon (three → +2 each)", Plate
// "+2 Health per other plate piece", the Relic's "+1 Magic per equipped ring". The set
// labels are the item's expect's own; the engine treats a source as an opaque label
// (SWITCHES.md unitModsSource) — no set id is minted in content.
import { describe, expect, it } from 'vitest'
import { createBattle, type BattleOptions } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { effective } from '../src/core/stats.js'
import { preview, type LedgerRow } from '../src/core/pipeline.js'
import type { Ctx } from '../src/core/types.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { performSwap } from '../src/core/swap.js'

const AXE = 'item.hand-axe', LID = 'item.pot-lid'
const CHOP = 'attack.hand-axe.chop', BASH = 'attack.pot-lid.bash'
const base: BattleOptions = { replicate: 3, mapId: 'map.open', heroes: ['test-warrior'], heroItems: [[AXE, LID]], enemies: ['test-zombie'] }
const field = (extra: Partial<BattleOptions> = {}): Ctx => createBattle({ ...base, ...extra } as BattleOptions)
const hero = (ctx: Ctx) => ctx.state.units.find((u) => u.side === 'hero')!
const foe = (ctx: Ctx) => ctx.state.units.find((u) => u.side === 'enemy')!
const rowsFrom = (ledger: readonly LedgerRow[], source: string) => ledger.filter((r) => r.effectId === source)
const hitLedger = (ctx: Ctx, attackId: string) => preview(ctx, hero(ctx).id, foe(ctx).id, attackId).packetsOnHit[0]!.ledger
const hitValue = (ctx: Ctx, attackId: string) => preview(ctx, hero(ctx).id, foe(ctx).id, attackId).damageOnHit

describe('stat mods on one fielded hero', () => {
  it('Magic +4 from set.ring sits in the ledger under that source, and the log names the set', () => {
    const plain = field()
    const ctx = field({ heroMods: [{ stats: [{ stat: 'magic', add: 4, source: 'set.ring' }] }] })
    const was = effective(plain, hero(plain), 'magic')
    const now = effective(ctx, hero(ctx), 'magic')
    expect(now.value).toBe(was.value + 4)
    expect(now.ledger).toContainEqual({ source: 'set.ring', op: 'add', delta: 4, from: was.value, to: was.value + 4 })
    const mod = hero(ctx).mods.find((m) => m.source === 'set.ring')
    expect(mod).toEqual({ stat: 'magic', op: 'add', value: 4, source: 'set.ring', scope: 'unit' })
    const lines = ctx.events.filter((e) => e.type === 'unit.modified')
    expect(lines.map((e) => [e.causeId, e.actor])).toEqual([['set.ring', hero(ctx).id]])
    expect(lines[0]!['stats']).toEqual({ magic: 4 })
    // after the unit's enter line and its equipped lines (Law 12: the log says why)
    const at = ctx.events.indexOf(lines[0]!)
    const lastEquipped = ctx.events.map((e) => e.type).lastIndexOf('unit.equipped')
    expect(at).toBeGreaterThan(lastEquipped)
  })

  it('set.plate: +4 Health raises max and current Health — the pool stat folds onto the unit, as every other source\'s does', () => {
    const plain = field()
    const ctx = field({ heroMods: [{ stats: [{ stat: 'maxHp', add: 4, source: 'set.plate' }] }] })
    expect(hero(ctx).maxHp).toBe(hero(plain).maxHp + 4)
    expect(hero(ctx).hp).toBe(hero(plain).hp + 4)
    const line = ctx.events.find((e) => e.type === 'unit.modified')!
    expect(line.causeId).toBe('set.plate')
    expect(line['stats']).toEqual({ maxHp: 4 })
    expect([line['maxHp'], line['hp']]).toEqual([hero(ctx).maxHp, hero(ctx).hp])
  })

  it('two sets on one hero: one unit.modified per source, in the order handed', () => {
    const ctx = field({ heroMods: [{ stats: [{ stat: 'magic', add: 4, source: 'set.ring' }, { stat: 'maxHp', add: 2, source: 'set.plate' }, { stat: 'maxHp', add: -1, source: 'set.ring' }] }] })
    const lines = ctx.events.filter((e) => e.type === 'unit.modified')
    expect(lines.map((e) => e.causeId)).toEqual(['set.ring', 'set.plate'])
    expect(lines[0]!['stats']).toEqual({ magic: 4, maxHp: -1 })
    expect(lines[1]!['stats']).toEqual({ maxHp: 2 })
  })
})

describe('+damage on one fielded weapon\'s attacks', () => {
  it('+2 from set.slaying shows on the hand axe\'s attack only — one ledger row naming the set, before the crit', () => {
    const plain = field()
    const ctx = field({ heroMods: [{ attacks: [{ itemId: AXE, damage: 2, source: 'set.slaying' }] }] })
    expect(hitValue(ctx, CHOP)).toBe(hitValue(plain, CHOP) + 2)
    const rows = rowsFrom(hitLedger(ctx, CHOP), 'set.slaying')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.delta).toBe(2)
    expect(rows[0]!.station).toBeLessThan(450) // before CRIT: a crit multiplies the weapon's own damage
    // the other weapon's attack, and the body's own, are untouched
    expect(hitValue(ctx, BASH)).toBe(hitValue(plain, BASH))
    expect(rowsFrom(hitLedger(ctx, BASH), 'set.slaying')).toEqual([])
    expect(hitValue(ctx, 'attack.punch')).toBe(hitValue(plain, 'attack.punch'))
    const line = ctx.events.find((e) => e.type === 'unit.modified')!
    expect(line.causeId).toBe('set.slaying')
    expect(line['attacks']).toEqual([{ itemId: AXE, damage: 2 }])
  })

  it('the bonus is carried on the unit as plain data and survives a battle run', () => {
    const ctx = field({ heroMods: [{ attacks: [{ itemId: AXE, damage: 2, source: 'set.slaying' }] }] })
    expect(hero(ctx).weaponBonuses).toEqual([{ itemId: AXE, damage: 2, source: 'set.slaying' }])
    expect(JSON.parse(JSON.stringify(hero(ctx).weaponBonuses))).toEqual(hero(ctx).weaponBonuses)
    runBattle(ctx)
    expect(ctx.state.outcome).not.toBeNull()
  })

  it('a save and restore keeps the bonus, and a malformed one is refused on restore (Law 5b)', () => {
    const ctx = field({ heroMods: [{ attacks: [{ itemId: AXE, damage: 2, source: 'set.slaying' }] }] })
    const back = restoreBattle(saveBattle(ctx), ctx)
    expect(hero(back).weaponBonuses).toEqual([{ itemId: AXE, damage: 2, source: 'set.slaying' }])
    expect(hitValue(back, CHOP)).toBe(hitValue(ctx, CHOP))
    const broken = JSON.parse(saveBattle(ctx))
    broken.state.units[hero(ctx).id].weaponBonuses = [{ itemId: AXE, damage: 1.5, source: 'set.slaying' }]
    expect(() => restoreBattle(JSON.stringify(broken), ctx)).toThrow(/weaponBonuses/)
  })

  it('a bonus on a STOWED weapon reaches nothing until that weapon is in hand', () => {
    const ctx = field({ heroItems: [[LID]], heroStowed: [[AXE]], heroMods: [{ attacks: [{ itemId: AXE, damage: 2, source: 'set.slaying' }] }] })
    const plain = field({ heroItems: [[LID]], heroStowed: [[AXE]] })
    expect(hitValue(ctx, BASH)).toBe(hitValue(plain, BASH))
    expect(rowsFrom(hitLedger(ctx, BASH), 'set.slaying')).toEqual([])
    expect(hero(ctx).weaponBonuses).toEqual([{ itemId: AXE, damage: 2, source: 'set.slaying' }])
    // swapped into hand, the axe's attack carries it; swapped out, the lid's still does not
    const axe = hero(ctx).loadout!.stowed.find((x) => x.itemId === AXE)!.instanceId
    performSwap(ctx, hero(ctx).id, [axe]); performSwap(plain, hero(plain).id, [axe])
    expect(hitValue(ctx, CHOP)).toBe(hitValue(plain, CHOP) + 2)
    expect(rowsFrom(hitLedger(ctx, CHOP), 'set.slaying').map((r) => r.delta)).toEqual([2])
  })
})

describe('with no list nothing changes', () => {
  it('absent, an empty entry, and an entry with empty lists all field byte-identical to no heroMods', () => {
    const run = (extra: Partial<BattleOptions>) => { const c = field(extra); runBattle(c); return JSON.stringify(c.events) }
    const plain = run({})
    expect(run({ heroMods: [undefined] })).toBe(plain)
    expect(run({ heroMods: [{}] })).toBe(plain)
    expect(run({ heroMods: [{ stats: [], attacks: [] }] })).toBe(plain)
    expect(plain.includes('unit.modified')).toBe(false)
  })
})

describe('refused loudly (Law 9)', () => {
  const bad = (heroMods: unknown) => () => field({ heroMods } as Partial<BattleOptions>)
  it('a list that does not correspond to the heroes', () => {
    expect(bad([{}, {}])).toThrow(/1 heroes but 2 mod lists/)
  })
  it('a stat the engine does not know, a non-integer, a missing source', () => {
    expect(bad([{ stats: [{ stat: 'health', add: 2, source: 'set.plate' }] }])).toThrow(/'health'/)
    expect(bad([{ stats: [{ stat: 'magic', add: 1.5, source: 'set.ring' }] }])).toThrow(/integer/)
    expect(bad([{ stats: [{ stat: 'magic', add: 1, source: '' }] }])).toThrow(/source/)
  })
  it('a weapon bonus on an item the hero does not carry, or on one that grants no attack', () => {
    expect(bad([{ attacks: [{ itemId: 'item.cart-chain', damage: 1, source: 'set.slaying' }] }])).toThrow(/does not carry 'item.cart-chain'/)
    expect(bad([{ attacks: [{ itemId: AXE, damage: 0.5, source: 'set.slaying' }] }])).toThrow(/integer/)
  })
})
