// content.shields-reauthored (2026-10-04). Ruled 2026-09-28 (Andrew, DECISIONS.md 'counterattack, special free attacks, the
// opening six, shields, custom weapons': "Shields: the sixth-pass numbers stand, except Kite is +20 Block / +5 Ranged Block;
// Tower keeps -1 max Stamina ... The Knight shield is a fourth shield. The Round shield has both powers. Iron is a version of
// each") and the Armory Ledger he approved that day, never landed (the weapon audit, 2026-10-04). The rows are the Ledger's
// (CONTENT-DRAFTS/2026-09-28-armory-ledger/ledger-rows.json: tower-shield, round-shield, kite-shield, knight-shield,
// iron-shields), authored through the Codex; what the rows leave unstated is decided and recorded (SWITCHES.md shield*).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { beginActivation, endActivation, expireActivationMods } from '../src/core/mutate.js'
import { usePower } from '../src/core/ability.js'
import { canUsePower } from '../src/core/ability.js'
import { effective } from '../src/core/stats.js'
import { applyItems } from '../src/core/items.js'
import { ACTIONS, ITEMS, UNITS } from '../src/content/index.js'
import type { Ctx, Effect } from '../src/core/types.js'

const TOWER = 'item.tower-shield', ROUND = 'item.round-shield', KITE = 'item.kite-shield', KNIGHT = 'item.knight-shield'
const IRON: Record<string, string> = { 'item.iron-round-shield': ROUND, 'item.iron-knight-shield': KNIGHT, 'item.iron-tower-shield': TOWER, 'item.iron-kite-shield': KITE }
const warrior = UNITS['hero.base.warrior-iron']!
const NEXT = 'endOfNextActivation', WALL = 'power.round-shield.lock-shields'
const gain = (stat: string, value: number): Effect => ({ kind: 'statMod', stat, value, until: NEXT, who: 'self' } as Effect)
/** What holding `item` beside a Longsword adds to a bare warrior: Block, Ranged Block, Dodge, max Stamina. */
function held(item: string): [number, number, number, number] {
  const bare = applyItems(warrior, ['item.longsword'], ITEMS, ACTIONS, 'test').def, w = applyItems(warrior, ['item.longsword', item], ITEMS, ACTIONS, 'test').def
  return [(w.block ?? 0) - (bare.block ?? 0), (w.rangedBlock ?? 0) - (bare.rangedBlock ?? 0), w.dodge - bare.dodge, w.maxStamina - bare.maxStamina]
}
/** The powers and attacks a shield's row gives, in its order. */
const gives = (item: string) => [...ITEMS[item]!.grants, ...ITEMS[item]!.abilities]
/** One Activation of unit `id`, then its end - the ladder's own order. */
function activate(ctx: Ctx, id: number, during?: () => void) { beginActivation(ctx, id, 'test'); during?.(); endActivation(ctx, id, 'test'); expireActivationMods(ctx, id, 'activation.end') }
const blockOf = (ctx: Ctx, id: number) => [effective(ctx, ctx.state.units[id]!, 'block').value, effective(ctx, ctx.state.units[id]!, 'rangedBlock').value]

describe('the four shields, as the Ledger rows read', () => {
  it('Tower +10 Block, +20 Ranged Block, -5 Dodge, -1 max Stamina; Round +10/+10; Kite +20/+5; Knight +15/+10', () => {
    expect(held(TOWER)).toEqual([10, 20, -5, -1])
    expect(held(ROUND)).toEqual([10, 10, 0, 0])
    expect(held(KITE)).toEqual([20, 5, 0, 0])
    expect(held(KNIGHT)).toEqual([15, 10, 0, 0])
    for (const s of [TOWER, ROUND, KITE, KNIGHT]) expect(ITEMS[s]!.itemClass, s).toBe('shield')
  })

  it('the Tower Shield: Brace (+20 Block, +10 Ranged Block, 1 Stamina) and Arrow Wall (+15 Block, +25 Ranged Block, +1 Armor, 2 Stamina, cooldown 1)', () => {
    expect(gives(TOWER)).toEqual(['power.tower-shield.brace', 'power.tower-shield.arrow-wall'])
    expect(ACTIONS['power.tower-shield.brace']).toMatchObject({ name: 'Brace', staminaCost: 1, cooldown: 0, effects: [gain('block', 20), gain('rangedBlock', 10)] })
    expect(ACTIONS['power.tower-shield.arrow-wall']).toMatchObject({ name: 'Arrow Wall', staminaCost: 2, cooldown: 1, effects: [gain('block', 15), gain('rangedBlock', 25), gain('armor', 1)] })
  })

  // the Ledger's "Shield Wall" is named Lock Shields: the Shieldbearer's class power is Shield Wall already (SWITCHES.md shieldPowerNames)
  it('the Round Shield has both powers: Lock Shields (2 Stamina) and Set Feet (+2 Armor, 1 Stamina)', () => {
    expect(gives(ROUND)).toEqual([WALL, 'power.round-shield.set-feet'])
    const wall = ACTIONS[WALL]!
    expect(wall).toMatchObject({ name: 'Lock Shields', staminaCost: 2, cooldown: 0, target: { select: 'area', side: 'ally', radius: 1, origin: 'self' } })
    expect(wall.effects!.map((e) => [e.kind, (e as { stat?: string }).stat, (e as { value?: number }).value, (e as { until?: string }).until])).toEqual([['statMod', 'block', 10, NEXT], ['statMod', 'rangedBlock', 10, NEXT]])
    expect(ACTIONS['power.round-shield.set-feet']).toMatchObject({ name: 'Set Feet', staminaCost: 1, cooldown: 0, effects: [gain('armor', 2)] })
  })

  it('Lock Shields gives the holder and every adjacent ally +10 Block and +10 Ranged Block; an ally farther off gets nothing', () => {
    // the holder on 85, an ally beside it on 86, an ally three hexes off on 88
    const ctx = createCustomBattle([{ type: 'hero.base.priest-armored', hex: 85 }, { type: 'test-warrior', hex: 86 }, { type: 'test-warrior', hex: 88 }], [{ type: 'test-zombie', hex: 200 }])
    expect(ctx.state.units[0]!.actions).toContain(WALL)
    const before = [0, 1, 2].map((i) => blockOf(ctx, i))
    activate(ctx, 1); activate(ctx, 2)   // the allies have acted this Phase
    beginActivation(ctx, 0, 'test'); ctx.state.units[0]!.stamina = 9
    expect(canUsePower(ctx, 0, 0, WALL)).toBe(true)
    usePower(ctx, 0, 0, WALL)
    expect(blockOf(ctx, 0)).toEqual([before[0]![0]! + 10, before[0]![1]! + 10])
    expect(blockOf(ctx, 1)).toEqual([before[1]![0]! + 10, before[1]![1]! + 10])
    expect(blockOf(ctx, 2)).toEqual(before[2])
    // it holds through the holder's own Activation's end, and goes at the end of its next
    endActivation(ctx, 0, 'test'); expireActivationMods(ctx, 0, 'activation.end')
    expect(blockOf(ctx, 0)).toEqual([before[0]![0]! + 10, before[0]![1]! + 10])
    activate(ctx, 0)
    expect(blockOf(ctx, 0)).toEqual(before[0])
    // the ally's goes at the end of the ally's own next Activation (SWITCHES.md shieldWallAllyLifetime)
    expect(blockOf(ctx, 1)).toEqual([before[1]![0]! + 10, before[1]![1]! + 10])
    activate(ctx, 1)
    expect(blockOf(ctx, 1)).toEqual(before[1])
  })

  it('the Kite Shield: Raise Guard (+15 Block, +10 Ranged Block, +10 Luck, 1 Stamina) and Cover Ally (an adjacent ally gains 4 Protection)', () => {
    expect(gives(KITE)).toEqual(['power.kite-shield.raise-guard', 'power.kite-shield.cover-ally'])
    expect(ACTIONS['power.kite-shield.raise-guard']).toMatchObject({ name: 'Raise Guard', staminaCost: 1, cooldown: 0, effects: [gain('block', 15), gain('rangedBlock', 10), gain('luck', 10)] })
    expect(ACTIONS['power.kite-shield.cover-ally']).toMatchObject({ name: 'Cover Ally', staminaCost: 1, cooldown: 0, range: 1, target: { select: 'unit', side: 'ally' },
      effects: [{ kind: 'status.apply', statusId: 'status.protection', value: 4 }] })
    const ctx = createCustomBattle([{ type: 'hero.base.paladin-hunk', hex: 85 }, { type: 'test-warrior', hex: 86 }, { type: 'test-warrior', hex: 88 }], [{ type: 'test-zombie', hex: 200 }])
    beginActivation(ctx, 0, 'test'); ctx.state.units[0]!.stamina = 9
    expect(canUsePower(ctx, 0, 2, 'power.kite-shield.cover-ally'), 'an ally three hexes off is out of its reach').toBe(false)
    expect(canUsePower(ctx, 0, 3, 'power.kite-shield.cover-ally'), 'never an enemy').toBe(false)
    usePower(ctx, 0, 1, 'power.kite-shield.cover-ally')
    expect(ctx.state.units[1]!.statuses.find((s) => s.id === 'status.protection')?.value).toBe(4)
    expect(ctx.state.units[0]!.statuses.find((s) => s.id === 'status.protection')).toBeUndefined()
  })

  it('the Knight Shield is a fourth shield: Shield Slam (Strength -1, cooldown 2; on hit, 70%: Stun) and Guard (+15 Block, +10 Ranged Block)', () => {
    expect(gives(KNIGHT)).toEqual(['attack.knight-shield.shield-slam', 'power.knight-shield.guard'])
    const slam = ACTIONS['attack.knight-shield.shield-slam']!
    expect(slam).toMatchObject({ name: 'Shield Slam', staminaCost: 1, cooldown: 2, attack: { kind: 'melee', stat: 'strength', bonus: -1 } })
    expect(ITEMS[KNIGHT]!.triggers.filter((t) => t.onlyWithAttack === slam.id).map((t) => [t.hook, t.chance, t.select, t.effect])).toEqual([
      ['onHit', 70, 'target', { kind: 'status.apply', statusId: 'status.stun', value: 1 }]])
    expect(ACTIONS['power.knight-shield.guard']).toMatchObject({ name: 'Guard', staminaCost: 1, cooldown: 0, effects: [gain('block', 15), gain('rangedBlock', 10)] })
  })
})

describe('Iron is a version of each', () => {
  it.each(Object.entries(IRON))('%s: the plain shield with -5 Dodge always, a tier above it, each Block power giving +5 more Block', (iron, plain) => {
    const i = ITEMS[iron]!, p = ITEMS[plain]!
    expect(i, iron).toBeDefined()
    expect(i.itemClass).toBe('shield')
    expect(i.tier).toBe(p.tier + 1)
    expect([i.hands, i.slots]).toEqual([p.hands, p.slots])
    const [b, rb, dodge, stam] = held(plain)
    expect(held(iron)).toEqual([b, rb, dodge - 5, stam])
    // its powers are the plain shield's, one for one; a power that gives Block gives 5 more, and nothing else differs
    const mine = gives(iron), theirs = gives(plain)
    expect(mine).toHaveLength(theirs.length)
    for (const [k, id] of mine.entries()) {
      const a = ACTIONS[id]!, base = ACTIONS[theirs[k]!]!
      expect(a, id).toBeDefined()
      // a power's own row is named for the iron (two rows may not share a display name); the attack keeps its name
      expect(a.name, id).toBe(a.attack ? base.name : 'Iron ' + base.name)
      expect([a.staminaCost, a.cooldown, a.range, a.target, a.attack], id).toEqual([base.staminaCost, base.cooldown, base.range, base.target, base.attack])
      expect(a.effects ?? [], id).toEqual((base.effects ?? []).map((e) => (e.kind === 'statMod' && e.stat === 'block' ? { ...e, value: e.value + 5 } : e)))
    }
    expect(mine.some((id, k) => JSON.stringify(ACTIONS[id]!.effects) !== JSON.stringify(ACTIONS[theirs[k]!]!.effects)), `${iron} has a Block power`).toBe(true)
  })
})

describe('the old powers are gone, the kits keep their shields, and the Codex, the published content and the pack agree', () => {
  it('no row grants a power the Ledger replaced', () => {
    for (const gone of ['power.tower-shield.cover', 'power.tower-shield.stand-tall', 'power.round-shield.turn-aside', 'power.round-shield.brace', 'power.kite-shield.shield-wall', 'power.round-shield.shield-wall'])
      expect(ACTIONS[gone], gone).toBeUndefined()
  })

  it('every hero whose kit holds a shield keeps it, and fields its two powers', () => {
    const holders = Object.values(UNITS).filter((u) => (u.defaultItems ?? []).some((i) => ITEMS[i]?.itemClass === 'shield'))
    expect(holders.length).toBeGreaterThan(4)
    for (const u of holders) for (const s of (u.defaultItems ?? []).filter((i) => ITEMS[i]?.itemClass === 'shield')) {
      expect([TOWER, ROUND, KITE, KNIGHT]).toContain(s)
      const fielded = applyItems(u, u.defaultItems ?? [], ITEMS, ACTIONS, 'test').def
      for (const g of gives(s)) expect([...fielded.attacks, ...fielded.abilities], `${u.typeId} ${g}`).toContain(g)
    }
  })

  it('the Codex rows, the published content and the pack say the same grants and the same numbers', () => {
    const STAT: Record<string, string> = { block: 'block', rangedBlock: 'rangedBlock', dodge: 'dodge', staminaMax: 'maxStamina' }
    for (const f of ['gen/settled-items.json', 'hbt-content.json']) {
      const j = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', f), 'utf8')) as { items: { id: string; tier: number; grants: string[]; statModifiers: Record<string, number> }[] }
      for (const id of [TOWER, ROUND, KITE, KNIGHT, ...Object.keys(IRON)]) {
        const row = j.items.find((i) => i.id === id)!
        expect(row, `${f} ${id}`).toBeDefined()
        expect(row.grants, `${f} ${id}`).toEqual(gives(id))
        expect(row.tier, `${f} ${id}`).toBe(ITEMS[id]!.tier)
        expect(Object.fromEntries(Object.entries(row.statModifiers).map(([k, v]) => [STAT[k] ?? k, v])), `${f} ${id}`).toEqual(ITEMS[id]!.statModifiers)
      }
    }
  })
})
