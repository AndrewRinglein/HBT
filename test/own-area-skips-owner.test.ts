// fix.own-area-skips-owner (2026-10-04) — ruled 2026-10-04 (Andrew, DECISIONS.md "the Poison Imp, the Balrog and the four
// caster-centred class powers skip their owner too"): asked "Should the Poison Imp and the Balrog spare themselves too, like
// the Fire Imp?" and "Should the four class powers (War Cry, Fel Rush, Holy Radiance, Warcry) skip the caster?" —
// "One and two, yes, skip the caster."
//
// Content only. fix.fire-imp-burn-spares-self gave the Codex the words "every other unit within N hexes" and the engine's
// one targeting vocabulary its `excludeSelf` on an area (core/target.ts). The six rows that still said "every unit" — the
// Poison Imp's end-of-Activation Poison 1 and the Balrog's end-of-Activation Burn 1 (range 2), and the class powers War
// Cry, Fel Rush, Holy Radiance and Warcry — now say "every other unit", and the pack carries the same area with
// excludeSelf. No engine code. The four powers compile no effect yet (their rows name the gaps), so what a test can hold
// of them is who the engine's own resolver names as their targets: everyone in reach but the caster.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { endOfActivation } from '../src/core/battle.js'
import { beginActivation, endActivation } from '../src/core/mutate.js'
import { resolveTargets, hasAnyTarget } from '../src/core/target.js'
import { valueOf } from '../src/core/status.js'
import { UNITS, ABILITIES } from '../src/content/index.js'
import type { Ctx } from '../src/core/types.js'
import { hexId } from './board16.js'

const HOOK = 'onActivationEnd'
const eoa = (typeId: string) => UNITS[typeId]!.triggers!.find((t) => t.hook === HOOK)!
/** One unit's whole end of Activation, with nothing moved and nothing done. */
function endGo(ctx: Ctx, id: number): void { beginActivation(ctx, id, 'test'); endActivation(ctx, id, 'test'); endOfActivation(ctx, id) }

/** The two enemies: the unit, the status its end-of-Activation area applies, and the Codex's range. */
const OWNERS = [
  { unit: 'unit.poison-imp', status: 'status.poison', value: 1, radius: 2 },
  { unit: 'unit.balrog', status: 'status.burn', value: 1, radius: 2 },
] as const
/** The four class powers aimed from the caster at everyone in reach, and the Codex's reach. */
const POWERS = [
  { id: 'power.warchief.war-cry', name: 'War Cry', radius: 3 },
  { id: 'power.havoc.fel-rush', name: 'Fel Rush', radius: 3 },
  { id: 'power.holy-champion.holy-radiance', name: 'Holy Radiance', radius: 2 },
  { id: 'power.warbeast.warcry', name: 'Warcry', radius: 3 },
] as const

describe('the rows: each of the six targets every OTHER unit in range', () => {
  for (const o of OWNERS) {
    it(`${o.unit}: its end-of-Activation ${o.status} ${o.value} is an area of ${o.radius} from itself, any side, itself excluded`, () => {
      const t = eoa(o.unit)
      expect(t.select).toEqual({ select: 'area', side: 'any', radius: o.radius, origin: 'self', excludeSelf: true })
      expect(t.effect).toEqual({ kind: 'status.apply', statusId: o.status, value: o.value })
      expect(t.chance).toBe(100)
    })
  }
  for (const p of POWERS) {
    it(`${p.id} (${p.name}): an area of ${p.radius} from the caster, any side, the caster excluded`, () => {
      const a = ABILITIES[p.id]!
      expect(a, p.id).toBeDefined()
      expect(a.name).toBe(p.name)
      expect(a.target).toEqual({ select: 'area', side: 'any', radius: p.radius, origin: 'self', excludeSelf: true })
    })
  }
  it('the Fire Imp is as it was: the three end-of-Activation areas now read alike', () => {
    expect(eoa('unit.fire-imp').select).toEqual({ select: 'area', side: 'any', radius: 2, origin: 'self', excludeSelf: true })
  })
  it('unchanged: an ally-side area still counts its owner (the heal and stat-boost circles, the auras) — only these six rows moved', () => {
    const others = Object.values(ABILITIES).filter((a) => a.target?.select === 'area' && a.target.excludeSelf)
    expect(others.map((a) => a.id).sort()).toEqual(POWERS.map((p) => p.id).sort())
    const owners = Object.values(UNITS).filter((u) => (u.triggers ?? []).some((t) => typeof t.select === 'object' && t.select.select === 'area' && t.select.excludeSelf))
    expect(owners.map((u) => u.typeId).sort()).toEqual(['unit.balrog', 'unit.fire-imp', 'unit.poison-imp'])
  })
})

describe('in a small fight: the owner is untouched and a neighbour is not', () => {
  for (const o of OWNERS) {
    it(`${o.unit} ends its Activation: the hero 2 hexes off and the Imp beside it take ${o.status}; a unit 3 hexes off does not; the owner does not`, () => {
      const ctx = createCustomBattle(
        [{ type: 'hero.base.warrior-iron', hex: hexId(7, 5) }],
        [{ type: o.unit, hex: hexId(5, 5) }, { type: 'unit.imp', hex: hexId(6, 5) }, { type: 'unit.imp', hex: hexId(2, 5) }],
      )
      const owner = ctx.state.units.find((u) => u.typeId === o.unit)!, hero = ctx.state.units.find((u) => u.side === 'hero')!
      const [near, far] = ctx.state.units.filter((u) => u.typeId === 'unit.imp')
      expect([hero, near!, far!].map((u) => ctx.geo.distance(owner.hex, u.hex))).toEqual([2, 1, 3])
      const id = eoa(o.unit).id
      endGo(ctx, owner.id)
      expect(ctx.events.filter((e) => e.type === 'trigger.fired' && e.causeId === id).map((e) => e.target), 'who it landed on').toEqual([hero.id, near!.id])
      expect(valueOf(hero, o.status), 'the neighbour is not untouched').toBeGreaterThan(0)
      expect(valueOf(far!, o.status)).toBe(0)
      // the owner: nothing applied to it, nothing resisted by it — no line about it at all from its own trigger
      expect(valueOf(owner, o.status), 'the owner is untouched').toBe(0)
      expect(ctx.events.filter((e) => e.causeId === id && e.target === owner.id)).toEqual([])
    })
  }
  for (const p of POWERS) {
    it(`${p.name}: the engine's resolver names everyone within ${p.radius} hexes of the caster — ally and enemy — and never the caster`, () => {
      const ctx = createCustomBattle(
        [{ type: 'hero.base.warrior-iron', hex: hexId(5, 5) }, { type: 'hero.base.priest-armored', hex: hexId(6, 5) }],
        [{ type: 'unit.zombie', hex: hexId(5, 5 + p.radius) }, { type: 'unit.zombie', hex: hexId(12, 12) }],
      )
      const [caster, ally] = ctx.state.units.filter((u) => u.side === 'hero'), [near, far] = ctx.state.units.filter((u) => u.side === 'enemy')
      expect(ctx.geo.distance(caster!.hex, near!.hex)).toBeLessThanOrEqual(p.radius)
      expect(ctx.geo.distance(caster!.hex, far!.hex)).toBeGreaterThan(p.radius)
      const a = ABILITIES[p.id]!
      const hit = resolveTargets(ctx, caster!, a.target!, caster!.id)
      expect(hit, 'the caster is untouched').not.toContain(caster!.id)
      expect(hit.sort(), 'the neighbours are not').toEqual([ally!.id, near!.id].sort())
      // alone, the caster has nobody to use it on: the power's own area no longer finds its caster
      const alone = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: hexId(5, 5) }], [{ type: 'unit.zombie', hex: hexId(14, 14) }])
      const solo = alone.state.units.find((u) => u.side === 'hero')!
      expect(resolveTargets(alone, solo, a.target!, solo.id)).toEqual([])
      expect(hasAnyTarget(alone, solo, a.target!, a.target!.radius ?? 0)).toBe(false)
    })
  }
})
