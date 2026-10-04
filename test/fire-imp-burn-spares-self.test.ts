// fix.fire-imp-burn-spares-self (2026-10-04) — ruled 2026-10-03 (Andrew, DECISIONS.md "the Fire Imp's burn does not hit the
// imp itself; an end-of-Activation area burn shows an explosion of fire"): "it seems like it's dealing fire damage to itself
// every turn, or trying to do burn that's then being resisted. It means at the end of every turn, it has a damage reaction to
// itself." / "It should not hit him."
//
// The Fire Imp's row carries the trigger onActivationEnd — "every unit within N hexes", range 2 — apply Burn 1, and "every
// unit within 2 hexes" counts the imp (distance 0). The row now says "every OTHER unit within N hexes": the one targeting
// vocabulary (core/target.ts) gains `excludeSelf` on an area — the second form of the same area shape, read by the one
// resolver, never a Fire-Imp hook (the core names no unit). Everyone else within 2 hexes still burns, its own side included.
// Only the Fire Imp's row changed: the Poison Imp and the Balrog still say "every unit" and still count themselves.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { endOfActivation } from '../src/core/battle.js'
import { beginActivation, endActivation } from '../src/core/mutate.js'
import { resolveTargets, validateTargeting, type Targeting } from '../src/core/target.js'
import { triggersFrom, type Trigger } from '../src/core/trigger.js'
import { valueOf } from '../src/core/status.js'
import { UNITS } from '../src/content/index.js'
import type { Ctx } from '../src/core/types.js'
import { openingBattle } from './opening-helpers.js'
import { hexId } from './board16.js'

const FIRE_IMP = 'unit.fire-imp'
/** The Fire Imp's end-of-Activation trigger (its Blast's on-hit rider carried the same id until fix.trigger-ids-and-scopes, 2026-10-04: it is trigger.fire-imp.burn.blast now). */
const BURN = 'trigger.fire-imp.burn'
const HOOK = 'onActivationEnd'
const eoa = (typeId: string) => UNITS[typeId]!.triggers!.find((t) => t.hook === HOOK)!
const BRIDGE = 'test.opening-bridge'

/** One unit's whole end of Activation, with nothing moved and nothing done. */
function endGo(ctx: Ctx, id: number): void { beginActivation(ctx, id, 'test'); endActivation(ctx, id, 'test'); endOfActivation(ctx, id) }

describe('the row: the Fire Imp burns every OTHER unit within 2 hexes', () => {
  it('trigger.fire-imp.burn fires at the end of its Activation on an area of 2 from itself, any side, itself excluded', () => {
    const t = eoa(FIRE_IMP)
    expect(t.id).toBe(BURN)
    expect(t.chance).toBe(100)
    expect(t.select).toEqual({ select: 'area', side: 'any', radius: 2, origin: 'self', excludeSelf: true })
    expect(t.effect).toEqual({ kind: 'status.apply', statusId: 'status.burn', value: 1 })
  })

  // Law 10, 2026-10-04 (fix.own-area-skips-owner; ruled 2026-10-04, Andrew, DECISIONS.md "the Poison Imp, the Balrog and the
  // four caster-centred class powers skip their owner too": asked "Should the Poison Imp and the Balrog spare themselves
  // too, like the Fire Imp?" — "One and two, yes, skip the caster."). This test read
  //   it('only the Fire Imp changed: the Poison Imp and the Balrog still say "every unit" and count themselves', …
  //     expect(t.select, id).toEqual({ select: 'area', side: 'any', radius: 2, origin: 'self' })
  //     … expect(ctx.events.some((e) => e.type === 'trigger.fired' && … e.actor === imp.id && e.target === imp.id)).toBe(true)
  // — true the day the Fire Imp's row alone was changed, and what found the two other rows. The ruling it led to is the
  // rule now: both rows say "every OTHER unit", as the Fire Imp's does, and neither trigger lands on its owner
  // (test/own-area-skips-owner.test.ts holds each in a small fight).
  it('the Poison Imp and the Balrog read as the Fire Imp does: every OTHER unit within 2 hexes — neither counts itself', () => {
    for (const id of ['unit.poison-imp', 'unit.balrog']) {
      const t = eoa(id)
      expect(t.select, id).toEqual({ select: 'area', side: 'any', radius: 2, origin: 'self', excludeSelf: true })
    }
    // and in battle the Poison Imp's own trigger no longer lands on the Poison Imp
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: hexId(15, 15) }], [{ type: 'unit.poison-imp', hex: hexId(5, 5) }])
    const imp = ctx.state.units.find((u) => u.typeId === 'unit.poison-imp')!
    endGo(ctx, imp.id)
    expect(ctx.events.some((e) => e.type === 'trigger.fired' && e.causeId === eoa('unit.poison-imp').id && e.actor === imp.id && e.target === imp.id)).toBe(false)
    expect(ctx.events.filter((e) => e.causeId === eoa('unit.poison-imp').id && e.target === imp.id)).toEqual([])
  })
})

describe('in a small fight: a hero and an Imp within 2 hexes burn, a unit 3 hexes off does not, the Fire Imp does not', () => {
  const rig = () => {
    const ctx = createCustomBattle(
      [{ type: 'hero.base.warrior-iron', hex: hexId(7, 5) }],
      [{ type: FIRE_IMP, hex: hexId(5, 5) }, { type: 'unit.imp', hex: hexId(6, 5) }, { type: 'unit.imp', hex: hexId(2, 5) }],
    )
    const imp = ctx.state.units.find((u) => u.typeId === FIRE_IMP)!
    const hero = ctx.state.units.find((u) => u.side === 'hero')!
    const [near, far] = ctx.state.units.filter((u) => u.typeId === 'unit.imp')
    return { ctx, imp, hero, near: near!, far: far! }
  }

  it('the trigger lands on the hero and on the Imp beside it — its own side included — and on nobody else', () => {
    const { ctx, imp, hero, near, far } = rig()
    expect([hero, near, far].map((u) => ctx.geo.distance(imp.hex, u.hex))).toEqual([2, 1, 3])
    endGo(ctx, imp.id)
    const rolled = ctx.events.filter((e) => e.type === 'trigger.rolled' && e.causeId === BURN)
    expect(rolled.map((e) => [e['hook'], e['fired']])).toEqual([[HOOK, true]])
    const fired = ctx.events.filter((e) => e.type === 'trigger.fired' && e.causeId === BURN).map((e) => e.target)
    expect(fired).toEqual([hero.id, near.id])
    const applied = ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === BURN)
    expect(applied.map((e) => [e.target, e['statusId'], e['amount'], e['by']])).toEqual([[hero.id, 'status.burn', 1, imp.id], [near.id, 'status.burn', 1, imp.id]])
    expect(valueOf(hero, 'status.burn')).toBe(1)
    expect(valueOf(far, 'status.burn')).toBe(0)
  })

  it('nothing is applied to, resisted by or expired on the Fire Imp itself: its end of Activation leaves no line about it', () => {
    const { ctx, imp } = rig()
    endGo(ctx, imp.id)
    expect(valueOf(imp, 'status.burn')).toBe(0)
    const aboutItself = ctx.events.filter((e) => e.target === imp.id && (e.type === 'trigger.fired' || e.type.startsWith('status.') || e.type === 'damage.applied'))
    expect(aboutItself).toEqual([])
  })

  it('another Fire Imp within 2 hexes is somebody else: each burns the other, neither burns itself', () => {
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: hexId(15, 15) }], [{ type: FIRE_IMP, hex: hexId(5, 5) }, { type: FIRE_IMP, hex: hexId(6, 5) }])
    const [a, b] = ctx.state.units.filter((u) => u.typeId === FIRE_IMP)
    endGo(ctx, a!.id)
    expect(ctx.events.filter((e) => e.type === 'trigger.fired' && e.causeId === BURN).map((e) => [e.actor, e.target])).toEqual([[a!.id, b!.id]])
  })
})

describe('in encounter.opening.bridge: every Fire Imp ends its Activations burning the others in reach and never itself', () => {
  it('over ten seeds: no Burn applied to a Fire Imp by its own trigger; heroes and Imps within 2 hexes are still burned by it', () => {
    let fired = 0, heroesBurned = 0, impsBurned = 0, ends = 0
    for (let r = 0; r < 10; r++) {
      const ctx = openingBattle(BRIDGE, r)
      expect(ctx.events.find((e) => e.type === 'encounter.begin')!.causeId, `replicate ${r}`).toBe('encounter.opening.bridge')
      const typeOf = (id: number) => ctx.state.units[id]!.typeId
      const fireImps = new Set(ctx.state.units.filter((u) => u.typeId === FIRE_IMP).map((u) => u.id))
      expect(fireImps.size, `replicate ${r}: the Bridge fields Fire Imps`).toBeGreaterThan(0)
      // every end-of-Activation roll of the trigger, and the firings that follow it before the next roll
      const rolls = ctx.events.filter((e) => e.type === 'trigger.rolled' && e.causeId === BURN && e['hook'] === HOOK)
      ends += rolls.length
      for (const roll of rolls) {
        expect(fireImps.has(roll.actor!), `replicate ${r}: rolled by a Fire Imp`).toBe(true)
        for (let i = ctx.events.indexOf(roll) + 1; i < ctx.events.length; i++) {
          const e = ctx.events[i]!
          if (e.causeId !== BURN || e.type === 'trigger.rolled') { if (e.type === 'trigger.fired' || e.type === 'status.applied') continue; break }
          if (e.type === 'trigger.fired') {
            fired++
            expect(e.actor, `replicate ${r} seq ${e.seq}`).toBe(roll.actor)
            expect(e.target, `replicate ${r} seq ${e.seq}: ${BURN} landed on the Fire Imp that owns it`).not.toBe(roll.actor)
            if (ctx.state.units[e.target!]!.side === 'hero') heroesBurned++
            if (typeOf(e.target!) === 'unit.imp') impsBurned++
          }
        }
      }
      // the log holds no Burn applied to a Fire Imp by itself, from any cause
      const self = ctx.events.filter((e) => e.type === 'status.applied' && e['statusId'] === 'status.burn' && fireImps.has(e.target!) && e['by'] === e.target)
      expect(self, `replicate ${r}: a Fire Imp burned itself`).toEqual([])
    }
    expect(ends, 'Fire Imps ended Activations').toBeGreaterThan(0)
    expect(fired, 'the trigger landed on somebody').toBeGreaterThan(0)
    expect(heroesBurned, 'a hero within 2 hexes was burned').toBeGreaterThan(0)
    expect(impsBurned, 'an Imp within 2 hexes — its own side — was burned').toBeGreaterThan(0)
  })
})

describe('the mechanism: excludeSelf is a field of the one targeting vocabulary, and a second instance is pure data', () => {
  const board = () => {
    const ctx = createCustomBattle(
      [{ type: 'hero.base.warrior-iron', hex: hexId(5, 5) }, { type: 'hero.base.priest-armored', hex: hexId(6, 5) }],
      [{ type: 'unit.zombie', hex: hexId(4, 5) }, { type: 'unit.zombie', hex: hexId(12, 12) }],
    )
    const [iron, priest] = ctx.state.units.filter((u) => u.side === 'hero')
    const [zNear] = ctx.state.units.filter((u) => u.side === 'enemy')
    return { ctx, iron: iron!, priest: priest!, zNear: zNear! }
  }

  it('an area with excludeSelf resolves to everyone the same area holds, less the one acting — any side, ally, any radius', () => {
    const { ctx, iron, priest, zNear } = board()
    const any: Targeting = { select: 'area', side: 'any', radius: 1, origin: 'self' }
    expect(resolveTargets(ctx, iron, any, iron.id)).toEqual([iron.id, priest.id, zNear.id].sort((a, b) => a - b))
    expect(resolveTargets(ctx, iron, { ...any, excludeSelf: true }, iron.id)).toEqual([priest.id, zNear.id].sort((a, b) => a - b))
    // a second instance with different data: "every other ally within 3"
    expect(resolveTargets(ctx, iron, { select: 'area', side: 'ally', radius: 3, origin: 'self', excludeSelf: true }, iron.id)).toEqual([priest.id])
    expect(resolveTargets(ctx, iron, { select: 'area', side: 'ally', radius: 3, origin: 'self' }, iron.id)).toEqual([iron.id, priest.id])
    // an area measured from a target spares the one acting too, wherever it stands
    expect(resolveTargets(ctx, iron, { select: 'area', side: 'any', radius: 1, origin: 'target', excludeSelf: true }, priest.id)).toEqual([priest.id])
  })

  it('a second trigger with the same form and different data runs with no engine code: a heal for every other ally within 3', () => {
    const { ctx, iron, priest } = board()
    const mend: Trigger = { id: 'trigger.test.mend-the-others', hook: 'onActivationEnd', chance: 100, source: 'test',
      select: { select: 'area', side: 'ally', radius: 3, origin: 'self', excludeSelf: true }, effect: { kind: 'heal', amount: 2 } }
    iron.triggers = triggersFrom([mend])
    iron.hp = 1; priest.hp = 1
    endGo(ctx, iron.id)
    expect(ctx.events.filter((e) => e.type === 'trigger.fired' && e.causeId === mend.id).map((e) => e.target)).toEqual([priest.id])
    expect(priest.hp).toBe(3)
    expect(iron.hp).toBe(1)
  })

  it('it is validated at load: only an area may exclude the one acting, and only by the literal true', () => {
    expect(() => validateTargeting({ select: 'area', side: 'any', radius: 2, excludeSelf: true }, 'test')).not.toThrow()
    expect(() => validateTargeting({ select: 'unit', side: 'ally', excludeSelf: true }, 'test')).toThrow(/excludeSelf only means something for select:'area'/)
    expect(() => validateTargeting({ select: 'self', side: 'any', excludeSelf: true }, 'test')).toThrow(/excludeSelf only means something for select:'area'/)
    expect(() => validateTargeting({ select: 'area', side: 'any', radius: 2, excludeSelf: false as unknown as true }, 'test')).toThrow(/excludeSelf is true or absent/)
  })
})
