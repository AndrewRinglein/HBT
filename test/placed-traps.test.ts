// capability.placed-traps (2026-10-05). Ruled 2026-10-04 (DECISIONS.md 'every dead line on his items is a feature that is
// needed; his items stay in rewards'): "All of those deadlines need to be added in as features that we need. So all of these
// are in." His four trap items are in the game and their use did nothing: Bear Traps, the Explosive Trap, the Fire Trap and
// the Magic Trap.
//
// Wanted, with no content name in core: a use places one or more traps on chosen empty hexes in range; a trap is an object on
// a hex that springs on the first unit to ENTER it - friend or foe - deals its damage (a flat number, or a multiple of the
// placer's side's party stat read when it springs), applies its statuses, strikes the hexes round it if its row says so,
// paints its hex if its row says so, and is gone.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { settle } from '../src/core/settle.js'
import { canUsePowerAt, powerHexesOf, usePowerAt } from '../src/core/ability.js'
import { grantedActionIds } from '../src/core/action.js'
import { executeAction, legalActions } from '../src/core/commands.js'
import { valueOf as statusValue } from '../src/core/status.js'
import { beginActivation, changeSideStat, layerAt, setOutcome } from '../src/core/mutate.js'
import { enterGround, groundAtActivationEnd } from '../src/core/ground.js'
import { executeKnockback } from '../src/core/movement.js'
import { partySum, validateEffect } from '../src/core/trigger.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { trapPower } from '../src/content/pack.js'
import { layerOfId } from '../src/content/maps.js'
import { ABILITIES, ITEMS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Effect, Unit } from '../src/core/types.js'

const BEAR = 'power.bear-trap.use', BOOM = 'power.explosive-trap.use', FIRE = 'power.fire-trap.use', MAGIC = 'power.magic-trap.use'
const ITEM: Record<string, string> = { [BEAR]: 'item.bear-trap', [BOOM]: 'item.explosive-trap', [FIRE]: 'item.fire-trap', [MAGIC]: 'item.magic-trap' }
/** The fielding's trapper (at hex 85) carrying one trap item, its ally beside it, and one zombie far away. */
function field(power: string): { ctx: Ctx; trapper: Unit; ally: Unit; foe: Unit } {
  const s = SCENARIOS['test.bear-traps']!
  const ctx = createBattle({ ...scenarioOptions(s), heroHexes: [85, 101], heroItems: [[...s.heroItems![0]!.filter((i) => !/trap/.test(i)), ITEM[power]!], undefined], enemies: ['unit.zombie'], enemyHexes: [95], enemyCount: 1 })
  const [trapper, ally] = ctx.state.units.filter((u) => u.side === 'hero') as [Unit, Unit]
  beginActivation(ctx, trapper.id, 'test')
  return { ctx, trapper, ally, foe: ctx.state.units.find((u) => u.side === 'enemy')! }
}
const types = (ctx: Ctx, t: string) => ctx.events.filter((e) => e.type === t)
const trapsAt = (ctx: Ctx) => (ctx.state.traps ?? []).map((t) => t.hex)
/** two free hexes one step from the trapper, and one more two steps away */
function hexesNear(ctx: Ctx, u: Unit): number[] {
  const free = (h: number) => !ctx.state.units.some((o) => o.hex === h)
  const all = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).filter(free)
  return [...all.filter((h) => ctx.geo.distance(u.hex, h) === 1).slice(0, 2), all.find((h) => ctx.geo.distance(u.hex, h) === 2)!]
}

describe('the rows', () => {
  it('Bear Traps: 1 Stamina, one use a Battle, two empty hexes within 3 - each trap deals 4 physical damage and leaves 1 Root', () => {
    const a = ABILITIES[BEAR]!
    expect(a).toBeDefined()
    expect([a.staminaCost, a.uses, a.range, a.hexes, a.target, a.free ?? false]).toEqual([1, 1, 3, 2, { select: 'hex', side: 'any' }, false])
    expect(a.effects).toEqual([{ kind: 'trap.place', damage: { amount: 4, damageType: 'physical' }, statuses: [{ statusId: 'status.root', value: 1 }] }])
    expect(ITEMS['item.bear-trap']!.abilities).toEqual([BEAR])
    expect(ITEMS['item.bear-trap']!.gaps ?? []).toEqual([])
  })

  it('the Explosive, Fire and Magic traps, each as its own line says', () => {
    const boom = ABILITIES[BOOM]!, fire = ABILITIES[FIRE]!, magic = ABILITIES[MAGIC]!
    expect([boom.staminaCost, boom.uses, boom.range, boom.hexes]).toEqual([1, 1, 3, undefined])   // one trap
    expect(boom.effects).toEqual([{ kind: 'trap.place', damage: { amount: { scale: 'partyMagic', base: 2, mult: 1 }, damageType: 'magic' }, radius: 1 }])
    expect([fire.staminaCost, fire.uses, fire.range, fire.hexes]).toEqual([1, 1, 3, 2])
    expect(fire.effects).toEqual([{ kind: 'trap.place', damage: { amount: { scale: 'partyMagic', base: 0, mult: 1 }, damageType: 'magic' }, statuses: [{ statusId: 'status.burn', value: 1 }], paints: 'layer.burning' }])
    expect([magic.staminaCost, magic.uses, magic.range, magic.hexes]).toEqual([1, 1, 3, 2])
    expect(magic.effects).toEqual([{ kind: 'trap.place', damage: { amount: { scale: 'partyMagic', base: 0, mult: 2 }, damageType: 'magic' }, statuses: [{ statusId: 'status.slow', value: 3 }] }])
    for (const id of Object.values(ITEM)) expect(ITEMS[id]!.gaps ?? [], id).toEqual([])
  })
})

describe('placing', () => {
  it('one use places two traps for 1 Stamina: the first hex spends the Stamina, the action and the use; the second is the same use', () => {
    const { ctx, trapper } = field(BEAR)
    const [h1, h2, h3] = hexesNear(ctx, trapper) as [number, number, number]
    const stamina = trapper.stamina
    expect(canUsePowerAt(ctx, trapper.id, h1, BEAR)).toBe(true)
    expect(executeAction(ctx, { actor: trapper.id, actionId: BEAR, hex: h1 })).toEqual({ ok: true })
    expect(trapper.stamina).toBe(stamina - 1)
    expect(trapper.usesLeft[BEAR]).toBe(0)
    expect(trapper.primaryUsed).toBe(true)
    expect(trapsAt(ctx)).toEqual([h1])
    // the second trap of the same use: no Stamina, no action, no further use - on another empty hex in range
    expect(canUsePowerAt(ctx, trapper.id, h1, BEAR)).toBe(false)   // a hex that holds a trap takes no second
    expect(canUsePowerAt(ctx, trapper.id, h2, BEAR)).toBe(true)
    // its use is spent, so it has left the unit's own list - and it is still granted while a hex is left to choose
    expect(trapper.actions.includes(BEAR)).toBe(false)
    expect(grantedActionIds(ctx, trapper).includes(BEAR)).toBe(true)
    expect(executeAction(ctx, { actor: trapper.id, actionId: BEAR, hex: h2, slot: 'movement' })).toMatchObject({ ok: false })   // it is the primary action's use, not a move's
    expect(legalActions(ctx, trapper.id).some((r) => r.actionId === BEAR && 'hex' in r && r.hex === h3)).toBe(true)
    expect(executeAction(ctx, { actor: trapper.id, actionId: BEAR, hex: h2 })).toEqual({ ok: true })
    expect(trapper.stamina).toBe(stamina - 1)
    expect(trapsAt(ctx)).toEqual([h1, h2])
    expect(types(ctx, 'power.used').filter((e) => e['abilityId'] === BEAR).length).toBe(1)   // one use
    expect(types(ctx, 'trap.placed').map((e) => [e.causeId, e.actor, e['trap'], e['hex'], e['side']])).toEqual([[BEAR, trapper.id, 1, h1, 'hero'], [BEAR, trapper.id, 2, h2, 'hero']])
    // both are down: nothing more to place, and a second use in the Battle is refused
    expect(powerHexesOf(ctx, trapper.id, BEAR)).toEqual([])
    expect(grantedActionIds(ctx, trapper).includes(BEAR)).toBe(false)
    expect(executeAction(ctx, { actor: trapper.id, actionId: BEAR, hex: h3 })).toMatchObject({ ok: false })
    beginActivation(ctx, trapper.id, 'test'); trapper.stamina = trapper.maxStamina
    expect(powerHexesOf(ctx, trapper.id, BEAR)).toEqual([])
  })

  it('a trap goes on an empty hex within 3 only: not under a unit, not out of range; the second trap not placed by the end of the Activation is lost', () => {
    const { ctx, trapper, ally } = field(BEAR)
    const far = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).find((h) => ctx.geo.distance(trapper.hex, h) === 4)!
    expect(canUsePowerAt(ctx, trapper.id, ally.hex, BEAR)).toBe(false)
    expect(canUsePowerAt(ctx, trapper.id, trapper.hex, BEAR)).toBe(false)
    expect(canUsePowerAt(ctx, trapper.id, far, BEAR)).toBe(false)
    const [h1, h2] = hexesNear(ctx, trapper) as [number, number]
    usePowerAt(ctx, trapper.id, h1, BEAR)
    expect(trapper.aiming).toEqual({ actionId: BEAR, left: 1 })
    beginActivation(ctx, trapper.id, 'test')   // its next Activation
    expect(trapper.aiming).toBeUndefined()
    expect(canUsePowerAt(ctx, trapper.id, h2, BEAR)).toBe(false)
    expect(trapsAt(ctx)).toEqual([h1])
  })

  it('the Explosive Trap is one trap: after it is placed nothing more is', () => {
    const { ctx, trapper } = field(BOOM)
    const [h1, h2] = hexesNear(ctx, trapper) as [number, number]
    usePowerAt(ctx, trapper.id, h1, BOOM)
    expect(trapper.aiming).toBeUndefined()
    expect(canUsePowerAt(ctx, trapper.id, h2, BOOM)).toBe(false)
    expect(trapsAt(ctx)).toEqual([h1])
  })
})

describe('springing', () => {
  it('the first unit to enter a Bear Trap takes 4 physical damage and gains 1 Root, and that trap is gone while the other stays', () => {
    const { ctx, trapper, foe } = field(BEAR)
    const [h1, h2] = hexesNear(ctx, trapper) as [number, number]
    usePowerAt(ctx, trapper.id, h1, BEAR); usePowerAt(ctx, trapper.id, h2, BEAR)
    foe.hp = foe.maxHp = 40
    const armor = foe.armor
    const from = ctx.events.length
    foe.hex = h1; const hurt = enterGround(ctx, foe.id, h1)   // a step onto it
    expect(hurt).toBe(true)
    expect(foe.hp).toBe(40 - Math.max(0, 4 - armor))
    expect(statusValue(foe, 'status.root')).toBe(1)
    expect(trapsAt(ctx)).toEqual([h2])
    const after = ctx.events.slice(from)
    expect(after.filter((e) => e.type === 'trap.sprung').map((e) => [e.causeId, e.actor, e['trap'], e['hex'], e['by'], e['side']])).toEqual([[BEAR, foe.id, 1, h1, trapper.id, 'hero']])
    expect(after.filter((e) => e.type === 'damage.applied').map((e) => [e.causeId, e['target'], e['damageType']])).toEqual([[BEAR, foe.id, 'physical']])
    // a second unit entering the hex it sprang on meets nothing
    const again = ctx.events.length
    foe.hex = h2 - 0; foe.hex = h1; enterGround(ctx, foe.id, h1)
    expect(ctx.events.slice(again).some((e) => e.type === 'trap.sprung')).toBe(false)
  })

  it('friend or foe: the placer\'s own ally springs it too; a push onto it springs it; a unit that ends its Activation on one springs it', () => {
    const { ctx, trapper, ally, foe } = field(BEAR)
    const [h1, h2] = hexesNear(ctx, trapper) as [number, number]
    usePowerAt(ctx, trapper.id, h1, BEAR); usePowerAt(ctx, trapper.id, h2, BEAR)
    ally.hp = ally.maxHp = 40
    ally.hex = h1; enterGround(ctx, ally.id, h1)
    expect(types(ctx, 'trap.sprung').map((e) => e.actor)).toEqual([ally.id])
    expect(statusValue(ally, 'status.root')).toBe(1)
    // pushed onto the other: the zombie stood beside it, struck from the far side
    foe.hp = foe.maxHp = 40
    const beside = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).find((h) => ctx.geo.distance(h, h2) === 1 && !ctx.state.units.some((u) => u.hex === h) && ctx.geo.distance(h, trapper.hex) === 1)
    if (beside !== undefined) {
      // the trapper pushes it one hex directly away - onto the trap, if that is where "away" leads; either way the funnel is the same
      foe.hex = beside
      executeKnockback(ctx, trapper.id, foe.id, 1, 'test')
      settle(ctx, 'test')
      if (foe.hex === h2) expect(types(ctx, 'trap.sprung').map((e) => e.actor)).toEqual([ally.id, foe.id])
    }
    // … and a unit that did not walk there (it landed, or was placed) meets it at the End of its Activation
    if ((ctx.state.traps ?? []).length) {
      foe.hex = ctx.state.traps![0]!.hex
      groundAtActivationEnd(ctx, foe.id)
      expect(ctx.state.traps ?? []).toEqual([])
    }
  })

  it('the Explosive Trap damages the unit that enters and every unit within 1 hex of it, friend or foe: the party\'s Magic plus 2', () => {
    const { ctx, trapper, ally, foe } = field(BOOM)
    const [h1] = hexesNear(ctx, trapper) as [number]
    usePowerAt(ctx, trapper.id, h1, BOOM)
    const magic = partySum(ctx, 'hero', 'magic')
    for (const u of [trapper, ally, foe]) u.hp = u.maxHp = 60
    const far = ctx.geo.distance(ally.hex, h1) > 1
    foe.hex = h1; enterGround(ctx, foe.id, h1)
    const hits = types(ctx, 'damage.applied').filter((e) => e.causeId === BOOM)
    expect(hits.map((e) => e['target']).sort()).toEqual([trapper.id, foe.id, ...(far ? [] : [ally.id])].sort())   // the trapper stands 1 from its own trap
    expect(foe.hp).toBe(60 - Math.max(0, magic + 2 - foe.resist))
    expect(hits.every((e) => e['damageType'] === 'magic')).toBe(true)
    expect(ctx.state.traps ?? []).toEqual([])
  })

  it('the Fire and Magic traps deal damage by the party\'s Magic as it stands when the trap springs: Magic, Burn 1 and burning ground; twice Magic and Slow 3', () => {
    {
      const { ctx, trapper, foe } = field(FIRE)
      const [h1] = hexesNear(ctx, trapper) as [number]
      usePowerAt(ctx, trapper.id, h1, FIRE)
      // the party's Magic changes after the trap is placed: the trap reads it when it springs
      changeSideStat(ctx, 'hero', { stat: 'magic', side: 'own', value: 2, until: 'battle' }, 'test', trapper.id)
      const magic = partySum(ctx, 'hero', 'magic')
      foe.hp = foe.maxHp = 60
      foe.hex = h1; enterGround(ctx, foe.id, h1)
      const hit = types(ctx, 'damage.applied').find((e) => e.causeId === FIRE)!
      expect([hit['target'], hit['damageType']]).toEqual([foe.id, 'magic'])
      expect(60 - foe.hp).toBe(Math.max(0, magic - foe.resist))
      expect(statusValue(foe, 'status.burn')).toBeGreaterThanOrEqual(1)
      expect(layerAt(ctx, h1)).toBe(layerOfId('layer.burning'))
    }
    {
      const { ctx, trapper, foe } = field(MAGIC)
      const [h1] = hexesNear(ctx, trapper) as [number]
      usePowerAt(ctx, trapper.id, h1, MAGIC)
      const magic = partySum(ctx, 'hero', 'magic')
      foe.hp = foe.maxHp = 60
      foe.hex = h1; enterGround(ctx, foe.id, h1)
      expect(60 - foe.hp).toBe(Math.max(0, magic * 2 - foe.resist))
      expect(statusValue(foe, 'status.slow')).toBe(3)
    }
  })

  it('a trap nobody enters does nothing and is gone at the end of the Battle, one line each saying so, before the end is told', () => {
    const { ctx, trapper } = field(BEAR)
    const [h1, h2] = hexesNear(ctx, trapper) as [number, number]
    usePowerAt(ctx, trapper.id, h1, BEAR); usePowerAt(ctx, trapper.id, h2, BEAR)
    const from = ctx.events.length
    setOutcome(ctx, 'heroClear', 'test')
    const after = ctx.events.slice(from)
    expect(ctx.state.traps).toBeUndefined()
    expect(after.filter((e) => e.type === 'trap.removed').map((e) => [e.causeId, e['trap'], e['hex'], e['by'], e['side'], e['reason']])).toEqual([['battle.end', 1, h1, trapper.id, 'hero', 'battle-end'], ['battle.end', 2, h2, trapper.id, 'hero', 'battle-end']])
    expect(after.some((e) => e.type === 'trap.sprung' || e.type === 'damage.applied')).toBe(false)
    expect(after.at(-1)!.type).toBe('battle.end')
  })
})

describe('the engine holds the row to its shape', () => {
  it('a trap is placed by a power aimed at a hex; its damage is a value and a type, its statuses and radius whole numbers', () => {
    const ok: Effect = { kind: 'trap.place', damage: { amount: 4, damageType: 'physical' }, statuses: [{ statusId: 'status.root', value: 1 }] }
    expect(() => validateEffect(ok, 'test')).not.toThrow()
    expect(() => validateEffect({ kind: 'trap.place' }, 'test')).toThrow(/does nothing/)
    expect(() => validateEffect({ kind: 'trap.place', damage: { amount: 4, damageType: 'sonic' as never } }, 'test')).toThrow(/damage type/)
    expect(() => validateEffect({ ...ok, radius: 0 }, 'test')).toThrow(/radius/)
    expect(() => validateEffect({ ...ok, statuses: [{ statusId: 'status.root', value: 0 }] }, 'test')).toThrow(/1 or more/)
    expect(() => trapPower({ target: { select: 'unit' }, effects: [ok] }, 'a power')).toThrow(/aimed at a hex/)
    expect(() => trapPower({ target: { select: 'hex' }, hexes: 2, effects: [{ kind: 'heal', amount: 1, who: 'self' }] }, 'a power')).toThrow(/several hexes/)
    expect(() => trapPower({ target: { select: 'hex' }, hexes: 2, effects: [ok] }, 'a power')).not.toThrow()
  })

  it('a battle saved with traps down, and mid-use with one trap still to place, restores as it was; a battle with none carries no such state', () => {
    const { ctx, trapper } = field(BEAR)
    expect(JSON.parse(saveBattle(ctx)).state.traps).toBeUndefined()
    const [h1] = hexesNear(ctx, trapper) as [number]
    usePowerAt(ctx, trapper.id, h1, BEAR)
    const saved = saveBattle(ctx)
    expect(JSON.parse(saved).state.units[trapper.id].aiming).toEqual({ actionId: BEAR, left: 1 })
    expect(saveBattle(restoreBattle(saved, ctx))).toEqual(saved)
  })
})

describe('in a real battle', () => {
  it('the computer places both Bear Traps and an enemy that walks onto one is hurt and Rooted', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.bear-traps']!))
    runBattle(ctx)
    expect(types(ctx, 'power.used').filter((e) => e['abilityId'] === BEAR).length).toBe(1)
    expect(types(ctx, 'trap.placed').length).toBe(2)
    const sprung = types(ctx, 'trap.sprung')
    expect(sprung.length).toBeGreaterThan(0)
    expect(ctx.events.some((e) => e.type === 'status.applied' && e.causeId === BEAR && e['statusId'] === 'status.root')).toBe(true)
  })
})
