// content.resistance-to-weak-and-vigil-party-spirit (2026-10-06). Ruled 2026-10-05 (DECISIONS.md 'a prone unit only stands; …
// Resistance to Weak; the Vigil heals by the party's Spirit'; GLOSSARY.md 'Settled, 2026-10-05'): "Immunity to week 2 should
// now be resistance to week 2. And yes, when we get to that part, it should remove two points of weak", and, asked whether the
// Banner of the Vigil heals each ally by that ally's own Spirit or the party's, "2 by the party spirit".
//   (1) the word: where a row said 'Immunity to Weak N' it says 'Resistance to Weak N' - N points come off each Weak the unit
//       would gain, which is what capability.planted-banners built for the Banner of Courage. Ids and field names keep theirs
//       (the event is still status.warded, the field still `wards`).
//   (2) the Vigil: an ally inside heals by the PARTY's Spirit at the End of its Activation, its own Spirit or none.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { settle } from '../src/core/settle.js'
import { usePower } from '../src/core/ability.js'
import { applyStatus, valueOf as statusValue } from '../src/core/status.js'
import { beginActivation } from '../src/core/mutate.js'
import { fireTriggers, partySum } from '../src/core/trigger.js'
import { effective } from '../src/core/stats.js'
import { ABILITIES, ITEMS } from '../src/content/index.js'
import { UNIT_PACK } from '../src/content/generated/pack.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Effect, Unit } from '../src/core/types.js'

const COURAGE = 'power.banner-courage.plant', VIGIL = 'power.banner-vigil.plant', WEAK = 'status.weak'
const COURAGE_KIT = ['item.destroyed-mail', 'item.war-axe'], VIGIL_KIT = ['item.holy-symbol', 'item.peddlers-vest']
function field(banner: string, heroes: [string, string], kit: string[]): { ctx: Ctx; planter: Unit; ally: Unit } {
  const ctx = createBattle({ ...scenarioOptions(SCENARIOS['test.banner-courage']!), heroes, heroHexes: [85, 86], heroItems: [[...kit, banner], undefined], enemies: ['unit.zombie'], enemyHexes: [95], enemyCount: 1 })
  const [planter, ally] = ctx.state.units.filter((u) => u.side === 'hero') as [Unit, Unit]
  return { ctx, planter, ally }
}
function plant(ctx: Ctx, planter: Unit, power: string): void {
  beginActivation(ctx, planter.id, 'test')
  usePower(ctx, planter.id, planter.id, power)
  settle(ctx, power)
}
const endOfActivation = (ctx: Ctx, u: Unit) => fireTriggers(ctx, 'onActivationEnd', { ownerId: u.id, targetId: null, causeId: 'activation.end', ordinal: u.activationOrdinal })
/** every string anywhere in the pack */
function strings(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node)
  else if (Array.isArray(node)) for (const x of node) strings(x, out)
  else if (node && typeof node === 'object') for (const v of Object.values(node)) strings(v, out)
  return out
}
const freeHexAt = (ctx: Ctx, from: number, d: number) => Array.from({ length: ctx.geo.hexCount }, (_, h) => h).find((h) => ctx.geo.distance(h, from) === d && !ctx.state.units.some((u) => u.hex === h))!

describe('the word: Resistance to Weak', () => {
  it('no row of the pack reads "Immunity to Weak N"; the Banner of Courage is compiled from "Resistance to Weak 2" to the same two points', () => {
    expect(strings(UNIT_PACK).filter((s) => /immun\w* (to )?weak \d|immun\w* \d \(weak\)/i.test(s))).toEqual([])
    const fx = ABILITIES[COURAGE]!.effects![0] as Extract<Effect, { kind: 'plant' }>
    expect(fx.wards).toEqual({ [WEAK]: 2 })
    expect(ABILITIES[COURAGE]!.gaps ?? []).toEqual([])
  })
  it('Weak 5 gained inside the Banner of Courage leaves 3; outside it all 5 land', () => {
    const { ctx, planter, ally } = field('item.banner-courage', ['hero.base.warrior-iron', 'hero.base.priest-robes'], COURAGE_KIT)
    plant(ctx, planter, COURAGE)
    applyStatus(ctx, ally.id, WEAK, 5, 'test')
    expect(statusValue(ally, WEAK)).toBe(3)
    const line = ctx.events.filter((e) => e.type === 'status.warded').at(-1)!
    expect([line.causeId, line['target'], line['amount'], line['of']]).toEqual([COURAGE, ally.id, 2, 5])
    const fresh = field('item.banner-courage', ['hero.base.warrior-iron', 'hero.base.priest-robes'], COURAGE_KIT)
    applyStatus(fresh.ctx, fresh.ally.id, WEAK, 5, 'test')             // no banner planted
    expect(statusValue(fresh.ally, WEAK)).toBe(5)
  })
  it('the Necklace bears the same word, and what it would do is still named as not built (the engine has no ward a unit carries)', () => {
    const n = ITEMS['item.necklace-of-weakness-immunity']!
    expect(n.name).toBe('Necklace of Weakness Resistance')
    expect(n.gaps).toEqual(['immunity: {"weak":1} — item field: immunity'])
  })
})

describe("the Banner of the Vigil heals by the party's Spirit", () => {
  it("the row: the heal it lends is the party's Spirit", () => {
    const fx = ABILITIES[VIGIL]!.effects![0] as Extract<Effect, { kind: 'plant' }>
    expect(fx).toEqual({ kind: 'plant', radius: 1,
      lends: [{ id: 'trigger.banner-vigil.plant.heal', hook: 'onActivationEnd', chance: 100, select: 'self', effect: { kind: 'heal', amount: { scale: 'partySpirit', base: 0, mult: 1 } }, source: VIGIL }] })
    expect(ABILITIES[VIGIL]!.gaps ?? []).toEqual([])
  })
  it("an ally with no Spirit of its own, ending its Activation in the aura, heals by the party's Spirit; so does the priest who planted it", () => {
    const { ctx, planter, ally } = field('item.banner-vigil', ['hero.base.priest-robes', 'hero.base.warrior-iron'], VIGIL_KIT)
    plant(ctx, planter, VIGIL)
    const party = partySum(ctx, 'hero', 'spirit')
    expect(party).toBeGreaterThan(0)
    expect(effective(ctx, ally, 'spirit').value).toBe(0)               // the warrior has none of its own
    expect(ctx.geo.distance(ally.hex, ctx.state.planted![0]!.hex)).toBe(1)
    ally.hp = 1
    endOfActivation(ctx, ally)
    expect(ally.hp).toBe(Math.min(ally.maxHp, 1 + party))
    planter.hp = 1
    endOfActivation(ctx, planter)
    expect(planter.hp).toBe(Math.min(planter.maxHp, 1 + party))
  })
  // 2026-10-06, the same day (rule.surge-is-at-least-level and rule.special-moves-unlock-at-level-two (DECISIONS.md 2026-10-06 'everyone gains Surge equal to its level at the least …', 'a hero's special moves unlock at level 2, ruled …')): the fielding is said again - the priest carries the banner alone
  // and the ally is the Dwarven Brawler (scenarios.ts test.banner-vigil); the test is as it was but for the ally's name in its title
  // ("the ranger - no Spirit of her own").
  it("in a real battle (test.banner-vigil): the priest plants the Vigil's banner, and the ally beside him - no Spirit of its own - heals by the party's Spirit inside it", () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.banner-vigil']!))
    const [priest, ranger] = ctx.state.units.filter((u) => u.side === 'hero') as [Unit, Unit]
    expect(effective(ctx, ranger, 'spirit').value).toBe(0)
    const party = partySum(ctx, 'hero', 'spirit')
    expect(party).toBeGreaterThan(0)
    runBattle(ctx)
    expect(ctx.events.filter((e) => e.type === 'object.planted').map((e) => [e.actor, e.causeId])).toEqual([[priest.id, VIGIL]])
    const heals = ctx.events.filter((e) => e.type === 'heal.applied' && e.causeId === 'trigger.banner-vigil.plant.heal')
    // every one asks for the party's Spirit, whoever it is for; the ranger's, when she is hurt, lands
    expect(new Set(heals.map((e) => e['asked']))).toEqual(new Set([party]))
    const hers = heals.filter((e) => e['target'] === ranger.id)
    expect(hers.length).toBeGreaterThan(0)
    expect(hers.some((e) => Number(e['amount']) === party)).toBe(true)
  })
  it('outside the aura nothing is healed, and an enemy inside it heals nothing', () => {
    const { ctx, planter, ally } = field('item.banner-vigil', ['hero.base.priest-robes', 'hero.base.warrior-iron'], VIGIL_KIT)
    plant(ctx, planter, VIGIL)
    const at = ctx.state.planted![0]!.hex
    ally.hex = freeHexAt(ctx, at, 2); ally.hp = 1
    endOfActivation(ctx, ally)
    expect(ally.hp).toBe(1)
    const foe = ctx.state.units.find((u) => u.side === 'enemy')!
    foe.hex = freeHexAt(ctx, at, 1); foe.hp = 1
    endOfActivation(ctx, foe)
    expect(foe.hp).toBe(1)
  })
})
