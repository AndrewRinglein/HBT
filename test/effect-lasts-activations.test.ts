// capability.effect-lasts-activations (2026-10-05). Ruled 2026-10-04 (Andrew, DECISIONS.md 'his 28 reward weapons read back: … the
// mechanics his own items need are wanted'): "We need: … time / number of activations for a duration". Three lines of his did
// nothing in a battle: the Fire Gauntlet's Stoke ("For your next 3 Activations, every hit you land applies Burn equal to half
// your Magic, rounded nearest, 0.5 up"), the Staff of the Ultimate Destroyer's Perfect Sight ("Until the end of your third
// Activation from now, your Precision is doubled (Precision added to Precision)") and Poison Coating ("for the rest of the
// Battle, the target's hits have a 60% chance to apply 1 Poison").
//
// The mechanism (no content name in core; SWITCHES.md lent*): a timed effect IS A STATUS — shown on the unit with its count, as
// every status is — whose row may LEND its holder triggers and stat changes while it is held, and may COUNT DOWN by the holder's
// own Activations or by its attacks (optionally only attacks that carry a tag) instead of by the Phase. A power puts it on
// with the engine's existing "apply a status" effect.
//   lends.triggers    fire as the holder's own while the status is above 0 (a tag requirement and a chance as on any trigger)
//   lends.mods        stat changes, flat
//   lends.doubles     a stat's own value added to it once ("Precision added to Precision") — an add, never a multiply (Law 7)
//   countsDown        'activation': −1 at the end of each of the holder's Activations that BEGAN with it held
//                     'attack':     −1 after each attack the holder makes (with `countsAttackTag`: each that carries the tag)
//                     absent, with no Phase decay: the rest of the Battle
import { describe, expect, it } from 'vitest'
import { usePower } from '../src/core/ability.js'
import { endOfActivation } from '../src/core/battle.js'
import { beginActivation, endActivation } from '../src/core/mutate.js'
import { performAttack } from '../src/core/pipeline.js'
import { createBattle } from '../src/core/setup.js'
import { effective } from '../src/core/stats.js'
import { applyStatus, valueOf } from '../src/core/status.js'
import { partySum } from '../src/core/trigger.js'
import { ABILITIES, ACTIONS, ITEMS } from '../src/content/index.js'
import { STATUSES } from '../src/content/statuses.js'
import type { Ctx, Unit } from '../src/core/types.js'
import { hexId } from './board16.js'

const GAUNTLET = 'item.fire-gauntlet', STOKE = 'power.fire-gauntlet.stoke', PUNCH = 'attack.fire-gauntlet.fire-punch'
const STAFF = 'item.staff-of-the-ultimate-destroyer', SIGHT = 'power.staff-of-the-ultimate-destroyer.perfect-sight'
const COATING = 'item.poison-coating'
const MAGE = 'hero.base.mage-fire'
/** A mage holding `items` at (5,5) beside a sturdy zombie; he always hits, nothing crits, the zombie blocks nothing. */
function rig(items: string[], extraHeroes: string[] = []) {
  const ctx = createBattle({ scenarioId: 'probe.effect-lasts-activations', replicate: 1, mapId: 'map.open', heroes: [MAGE, ...extraHeroes], heroHexes: [hexId(5, 5), ...extraHeroes.map((_, i) => hexId(4, 5 + i))], heroItems: [items, ...extraHeroes.map(() => [] as string[])],
    enemies: ['test-zombie'], enemyHexes: [hexId(5, 6)], enemyCount: 1, cfg: { switches: { critEnabled: false } as never }, overrides: { 'test-zombie': { maxHp: 500, block: 0, dodge: 0 } as never } })
  const h = ctx.state.units.find((u) => u.typeId === MAGE)!, z = ctx.state.units.find((u) => u.side === 'enemy')!
  h.stamina = h.maxStamina = 60; h.mods.push({ stat: 'accuracy', op: 'add', value: 400, source: 'test', scope: 'unit' })
  return { ctx, h, z }
}
/** One whole Activation of `u`: begin, what it does, end, and the End-of-Activation pass. */
function activation(ctx: Ctx, u: Unit, during: () => void = () => {}) { beginActivation(ctx, u.id, 'test'); during(); endActivation(ctx, u.id, 'test'); endOfActivation(ctx, u.id) }
const stat = (ctx: Ctx, u: Unit, name: string) => effective(ctx, u, name as never).value
const lentBy = (power: string) => (ABILITIES[power]!.effects!.find((e) => e.kind === 'status.apply') as { statusId: string; value: number }).statusId
const applied = (ctx: Ctx, from: number, statusId: string, cause: RegExp) => ctx.events.slice(from).filter((e) => e.type === 'status.applied' && e['statusId'] === statusId && cause.test(String(e.causeId)))

describe('the rows: each power puts a counted status on its user, and the status row says what it lends', () => {
  it('Stoke: 1 Stamina, a status of 3 that counts down by the holder\'s Activations and lends an on-hit Burn of half the party\'s Magic, rounded nearest', () => {
    expect(ITEMS[GAUNTLET]!.abilities).toEqual([STOKE])
    expect(ABILITIES[STOKE]).toMatchObject({ name: 'Stoke', staminaCost: 1, target: { select: 'self' } })
    const id = lentBy(STOKE), row = STATUSES[id]!
    expect((ABILITIES[STOKE]!.effects![0] as { value: number }).value).toBe(3)
    expect(row).toMatchObject({ name: 'Stoke', countsDown: 'activation', decayPerPhase: 0 })
    expect(row.lends!.triggers).toEqual([expect.objectContaining({ hook: 'onHit', chance: 100, select: 'target', effect: { kind: 'status.apply', statusId: 'status.burn', value: { scale: 'partyMagic', div: 2, round: 'nearest' } } })])
    expect(ABILITIES[STOKE]!.gaps ?? []).toEqual([])
  })

  it('Perfect Sight: 2 Stamina, a status of 3 that counts down by Activations and doubles Precision', () => {
    expect(ITEMS[STAFF]!.abilities).toEqual([SIGHT])
    expect(ABILITIES[SIGHT]).toMatchObject({ name: 'Perfect Sight', staminaCost: 2, target: { select: 'self' } })
    const row = STATUSES[lentBy(SIGHT)]!
    expect(row).toMatchObject({ name: 'Perfect Sight', countsDown: 'activation', decayPerPhase: 0, lends: { doubles: ['precision'] } })
  })

  it('Poison Coating: once per Battle, 1 Stamina, on yourself or an ally beside you — a status with no clock that lends a 60% on-hit Poison', () => {
    const power = ITEMS[COATING]!.abilities[0]!
    expect(ACTIONS[power]).toMatchObject({ staminaCost: 1, uses: 1 })
    const row = STATUSES[lentBy(power)]!
    expect(row.countsDown).toBeUndefined(); expect(row.decayPerPhase).toBe(0)
    expect(row.lends!.triggers).toEqual([expect.objectContaining({ hook: 'onHit', chance: 60, select: 'target', effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 } })])
    expect((ITEMS[COATING] as { gaps?: readonly string[] }).gaps ?? []).toEqual([])
  })

  it('the Fire Punch\'s own line acts too: on hit, Burn of half the party\'s Magic, rounded nearest', () => {
    expect(ITEMS[GAUNTLET]!.triggers.map((t) => [t.hook, t.onlyWithAttack, t.effect])).toEqual([['onHit', PUNCH, { kind: 'status.apply', statusId: 'status.burn', value: { scale: 'partyMagic', div: 2, round: 'nearest' } }]])
  })
})

describe('Stoke — for the next 3 Activations every hit applies Burn of half the party\'s Magic', () => {
  it('each hit of the three Activations after it burns; the fourth Activation\'s does not; the unit shows the count, 3 then 2 then 1 then gone', () => {
    const { ctx, h, z } = rig([GAUNTLET]), id = lentBy(STOKE)
    const magic = partySum(ctx, h.side, 'magic'), burn = Math.floor(magic / 2 + 0.5)
    expect(burn).toBeGreaterThan(0)
    const mine = /^trigger\..*stoke/   // the lent trigger, not the Fire Punch's own rider
    activation(ctx, h, () => usePower(ctx, h.id, h.id, STOKE))
    expect(valueOf(h, id), 'the Activation it was used in is not one of the three').toBe(3)
    const counts: number[] = [], burns: number[] = []
    for (let n = 0; n < 4; n++) {
      const from = ctx.events.length
      activation(ctx, h, () => { performAttack(ctx, h.id, z.id, 'attack.punch') })
      burns.push(applied(ctx, from, 'status.burn', mine).reduce((s, e) => s + (e['amount'] as number), 0))
      counts.push(valueOf(h, id))
    }
    expect(burns).toEqual([burn, burn, burn, 0])
    expect(counts).toEqual([2, 1, 0, 0])
    expect(h.statuses.some((s) => s.id === id)).toBe(false)
  })

  it('it is EVERY hit he lands, with any attack — and a miss burns nothing', () => {
    const { ctx, h, z } = rig([GAUNTLET]), mine = /^trigger\..*stoke/
    activation(ctx, h, () => usePower(ctx, h.id, h.id, STOKE))
    const from = ctx.events.length
    activation(ctx, h, () => { performAttack(ctx, h.id, z.id, PUNCH) })
    expect(applied(ctx, from, 'status.burn', mine)).toHaveLength(1)
    h.mods.push({ stat: 'accuracy', op: 'add', value: -2000, source: 'test.blind', scope: 'unit' })
    const then = ctx.events.length
    activation(ctx, h, () => { performAttack(ctx, h.id, z.id, 'attack.punch') })
    expect(applied(ctx, then, 'status.burn', /./)).toEqual([])
  })

  it('used again while it is up, it is 3 again — not 6', () => {
    const { ctx, h } = rig([GAUNTLET]), id = lentBy(STOKE)
    activation(ctx, h, () => usePower(ctx, h.id, h.id, STOKE))
    activation(ctx, h)
    expect(valueOf(h, id)).toBe(2)
    activation(ctx, h, () => usePower(ctx, h.id, h.id, STOKE))
    expect(valueOf(h, id)).toBe(3)
  })
})

describe('Perfect Sight — until the end of the third Activation from now, Precision is doubled', () => {
  it('his Precision is his own added to itself through three Activations, and his own again after', () => {
    const { ctx, h } = rig([STAFF])
    const own = stat(ctx, h, 'precision')
    expect(own).toBeGreaterThan(0)
    activation(ctx, h, () => { usePower(ctx, h.id, h.id, SIGHT); expect(stat(ctx, h, 'precision')).toBe(own * 2) })
    const seen: number[] = []
    for (let n = 0; n < 4; n++) { beginActivation(ctx, h.id, 'test'); seen.push(stat(ctx, h, 'precision')); endActivation(ctx, h.id, 'test'); endOfActivation(ctx, h.id) }
    expect(seen).toEqual([own * 2, own * 2, own * 2, own])
  })
})

describe('Poison Coating — for the rest of the Battle the target\'s hits have a 60% chance to apply 1 Poison', () => {
  it('put on an ally beside him: the ally\'s hits roll the Poison at 60, about six in ten apply it, and the status never counts down', () => {
    const { ctx, h, z } = rig([GAUNTLET, COATING], ['hero.base.warrior-iron'])
    const ally = ctx.state.units.find((u) => u.typeId === 'hero.base.warrior-iron')!
    ally.hex = ctx.geo.neighbours(h.hex).find((n: number) => !ctx.state.units.some((u) => u.hex === n) && ctx.geo.distance(n, z.hex) === 1)!   // beside the mage, and beside the zombie
    ally.mods.push({ stat: 'accuracy', op: 'add', value: 400, source: 'test', scope: 'unit' }); ally.stamina = ally.maxStamina = 500
    const power = ITEMS[COATING]!.abilities[0]!, id = lentBy(power)
    activation(ctx, h, () => usePower(ctx, h.id, ally.id, power))
    expect(valueOf(ally, id)).toBe(1); expect(valueOf(h, id)).toBe(0)
    let rolls = 0, poisoned = 0
    for (let n = 0; n < 60; n++) {
      const from = ctx.events.length
      activation(ctx, ally, () => { performAttack(ctx, ally.id, z.id, 'attack.punch') })
      const rolled = ctx.events.slice(from).filter((e) => e.type === 'trigger.rolled' && e['hook'] === 'onHit' && e['chance'] === 60)
      rolls += rolled.length; poisoned += applied(ctx, from, 'status.poison', /./).length
      z.statuses = z.statuses.filter((s) => s.id !== 'status.poison')
    }
    expect(rolls).toBe(60)
    expect(poisoned).toBeGreaterThan(24); expect(poisoned).toBeLessThan(48)
    expect(valueOf(ally, id), 'sixty Activations later it is still on him').toBe(1)
  })

  it('once per Battle: the second use is refused', () => {
    const { ctx, h } = rig([GAUNTLET, COATING])
    const power = ITEMS[COATING]!.abilities[0]!
    activation(ctx, h, () => usePower(ctx, h.id, h.id, power))
    beginActivation(ctx, h.id, 'test')
    expect(() => usePower(ctx, h.id, h.id, power)).toThrow(/illegal power/)
  })
})

describe('the next-N-attacks kind, with a tag limit — the test row (test.status.whetted: 2 blade attacks, each hit applies 2 Weak)', () => {
  const WHET = 'test.status.whetted'
  it('the row: counts down by attacks that carry the tag, and its trigger asks for the same tag', () => {
    expect(STATUSES[WHET]).toMatchObject({ countsDown: 'attack', countsAttackTag: 'blade', decayPerPhase: 0 })
    expect(STATUSES[WHET]!.lends!.triggers![0]).toMatchObject({ hook: 'onHit', onlyWithTag: 'blade', effect: { kind: 'status.apply', statusId: 'status.weak', value: 2 } })
  })

  it('two sword swings carry it and use it up; a Punch between them neither carries it nor counts; the third swing has none', () => {
    const ctx = createBattle({ scenarioId: 'probe.effect-lasts-activations', replicate: 1, mapId: 'map.open', heroes: ['hero.base.paladin-hunk'], heroHexes: [hexId(5, 5)], heroItems: [['item.longsword']],
      enemies: ['test-zombie'], enemyHexes: [hexId(5, 6)], enemyCount: 1, cfg: { switches: { critEnabled: false } as never }, overrides: { 'test-zombie': { maxHp: 500, block: 0, dodge: 0 } as never } })
    const h = ctx.state.units[0]!, z = ctx.state.units.find((u) => u.side === 'enemy')!
    h.stamina = h.maxStamina = 60; h.mods.push({ stat: 'accuracy', op: 'add', value: 400, source: 'test', scope: 'unit' })
    applyStatus(ctx, h.id, WHET, 2, 'test')
    const swing = (attack: string) => { const from = ctx.events.length; activation(ctx, h, () => { performAttack(ctx, h.id, z.id, attack) }); return [applied(ctx, from, 'status.weak', /./).reduce((s, e) => s + (e['amount'] as number), 0), valueOf(h, WHET)] }
    expect(swing('attack.longsword.slash')).toEqual([2, 1])
    expect(swing('attack.punch')).toEqual([0, 1])
    expect(swing('attack.longsword.slash')).toEqual([2, 0])
    expect(swing('attack.longsword.slash')).toEqual([0, 0])
  })

  it('an Activation ending does not count it down, and the Phase does not either: only its attacks do', () => {
    const { ctx, h } = rig([GAUNTLET])
    applyStatus(ctx, h.id, WHET, 2, 'test')
    for (let n = 0; n < 3; n++) activation(ctx, h)
    expect(valueOf(h, WHET)).toBe(2)
  })
})

describe('a status that lends nothing is what it was', () => {
  it('no Codex status but the lent ones carries the new fields', () => {
    const lent = Object.values(STATUSES).filter((s) => s.lends || s.countsDown)
    for (const s of lent) expect(s.decayPerPhase, s.id).toBe(0)
    expect(Object.values(STATUSES).filter((s) => ['status.burn', 'status.poison', 'status.weak', 'status.protection'].includes(s.id)).every((s) => !s.lends && !s.countsDown)).toBe(true)
  })
})

describe('in real battles — the two fieldings', () => {
  it('test.stoke: the computer-played mage stokes the gauntlet while the zombie is out of reach, and his hits then burn by it', async () => {
    const { SCENARIOS, scenarioOptions } = await import('../src/content/scenarios.js')
    const { runBattle } = await import('../src/core/battle.js')
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.stoke']!, 0)); runBattle(ctx)
    expect(ctx.events.filter((e) => e.type === 'power.used' && e.causeId === STOKE).length).toBeGreaterThan(0)
    expect(ctx.events.some((e) => e.type === 'status.applied' && e['statusId'] === lentBy(STOKE) && e['after'] === 3)).toBe(true)
    expect(ctx.events.filter((e) => e.type === 'status.applied' && e['statusId'] === 'status.burn' && /^trigger\..*stoke/.test(String(e.causeId))).length).toBeGreaterThan(0)
    expect(ctx.events.some((e) => e.type === 'status.reduced' && e['statusId'] === lentBy(STOKE))).toBe(true)
  })

  it('test.perfect-sight: the computer-played mage takes Perfect Sight, and the status is on him at 3', async () => {
    const { SCENARIOS, scenarioOptions } = await import('../src/content/scenarios.js')
    const { runBattle } = await import('../src/core/battle.js')
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.perfect-sight']!, 0)); runBattle(ctx)
    expect(ctx.events.filter((e) => e.type === 'power.used' && e.causeId === SIGHT).length).toBeGreaterThan(0)
    expect(ctx.events.some((e) => e.type === 'status.applied' && e['statusId'] === lentBy(SIGHT) && e['after'] === 3)).toBe(true)
  })
})
