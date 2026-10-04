// capability.counterattack-and-fend — ruled 2026-09-28 (Andrew, DECISIONS.md 'counterattack, special free attacks, the
// opening six, shields, custom weapons') and in no queue until 2026-10-04:
//   "Counterattack is set off by being attacked, not by being hit, blocked, or dodged." — "You can counterattack once per
//   enemy action, so if that enemy action is three attacks, all three of their attacks will resolve, and then you will
//   get your one counterattack."
//   "Counter Strike and Spear Fend are very similar in that regard. One is triggered by attacking, and one is triggered
//   by moving into your zone of control." — "fumble damage is the same as attack of opportunity. Yes, it can stop you
//   from moving."
//   "The counter strike is with +10 accuracy. That's the one it has. Costs 2 stamina." — until the end of the next Turn.
// Both are SPECIAL FREE ATTACKS on the one rule rule.free-attack-is-basic-attack laid down: the basic attack, no
// Stamina, −20 Accuracy.
//
// The mechanism: Counterattack and Fend are stats a unit has while a power's timed modifier is on it (the existing
// statMod effect, the existing "until the end of your next Turn" lifetime — no new effect, no new duration). While its
// Counterattack is above 0 a unit attacked in melee by an adjacent enemy makes one free attack on it after that
// action's attacks have all resolved; while its Fend is above 0 it makes one on an enemy that walks into its zone of
// control, and a hit stops the mover. Each has its own Accuracy stat, added on the swing. The core names no power.
import { describe, expect, it } from 'vitest'
import { usePower } from '../src/core/ability.js'
import { runBattle } from '../src/core/battle.js'
import { useBurst } from '../src/core/burst.js'
import { forecastFrom } from '../src/core/forecast.js'
import { attackOfOpportunity, executeMove, executeSidestep, planMovement } from '../src/core/movement.js'
import { beginActivation, expireTurnMods } from '../src/core/mutate.js'
import { performAttack, preview } from '../src/core/pipeline.js'
import { createBattle } from '../src/core/setup.js'
import { effective, isStatName } from '../src/core/stats.js'
import { ABILITIES, ACTIONS, ITEMS, UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Unit } from '../src/core/types.js'
import { hexId } from './board16.js'

const COUNTER = 'power.longsword.counterattack', FEND = 'power.test-fend'
const SLASH = 'attack.longsword.slash'
const PALADIN = 'hero.base.paladin-hunk', ZOMBIE = 'unit.zombie'
const LONG = 120_000   // whole battles beside other workers' suites: a time limit is not the assertion
const stat = (ctx: Ctx, u: Unit, name: string) => effective(ctx, u, name as never).value
const sure = (u: Unit, by = 300) => u.mods.push({ stat: 'accuracy', op: 'add', value: by, source: 'test', scope: 'unit' })
const provokes = (ctx: Ctx, as: string) => ctx.events.filter((e) => e.type === 'aoo.provoked' && e['as'] === as)

/** A paladin with his Longsword at (5,5); enemies where the test puts them. No crits: a crit's chart can throw a unit a hex away, and these tests place their units. */
function rig(enemyHexes: number[] = [hexId(5, 6)], enemy = ZOMBIE, replicate = 1) {
  const ctx = createBattle({ scenarioId: 'probe.counterattack-and-fend', replicate, mapId: 'map.open', heroes: [PALADIN], heroHexes: [hexId(5, 5)],
    enemies: enemyHexes.map(() => enemy), enemyHexes, enemyCount: enemyHexes.length, cfg: { switches: { critEnabled: false } as never } })
  const h = ctx.state.units.find((u) => u.typeId === PALADIN)!
  const foes = ctx.state.units.filter((u) => u.typeId === enemy)
  return { ctx, h, z: foes[0]!, foes }
}
/** The paladin uses the Longsword's Counterattack on his own Activation. */
function guard(ctx: Ctx, h: Unit) { beginActivation(ctx, h.id, 'test'); usePower(ctx, h.id, h.id, COUNTER) }
/** A unit is given the test Fend power and uses it. */
function fend(ctx: Ctx, h: Unit) { if (!h.actions.includes(FEND)) h.actions.push(FEND); beginActivation(ctx, h.id, 'test'); usePower(ctx, h.id, h.id, FEND) }
const bite = (ctx: Ctx, z: Unit) => z.actions.find((a) => ctx.actions[a]?.attack?.kind === 'melee')!

describe('the rows', () => {
  it('Counterattack and Fend, and each one\'s Accuracy, are stats of the engine', () => {
    for (const name of ['counterattack', 'counterattackAccuracy', 'fend', 'fendAccuracy']) expect(isStatName(name), name).toBe(true)
  })

  it('the Longsword\'s second power: Counterattack with +10 Accuracy until the end of your next Turn, 2 Stamina — beside its two attacks', () => {
    expect(ABILITIES[COUNTER]).toMatchObject({
      name: 'Counterattack', staminaCost: 2, cooldown: 0, target: { select: 'self' },
      effects: [
        { kind: 'statMod', stat: 'counterattack', value: 1, until: 'endOfNextTurn', who: 'self' },
        { kind: 'statMod', stat: 'counterattackAccuracy', value: 10, until: 'endOfNextTurn', who: 'self' },
      ],
    })
    expect(ABILITIES[COUNTER]!.gaps ?? []).toEqual([])
    expect(ITEMS['item.longsword']!.abilities).toEqual([COUNTER])
    expect(ITEMS['item.longsword']!.grants[0]).toBe(SLASH)
    expect(UNITS[PALADIN]!.defaultItems).toContain('item.longsword')
  })

  it('Fend is the same shape with the other stat — a second instance, pure data (the test receptacle\'s power)', () => {
    expect(ABILITIES[FEND]).toMatchObject({ target: { select: 'self' }, effects: [{ kind: 'statMod', stat: 'fend', value: 1, until: 'endOfNextTurn', who: 'self' }] })
  })
})

describe('Counterattack — set off by being attacked in melee by an adjacent enemy', () => {
  it('the power costs 2 Stamina and gives Counterattack 1 and +10 Counterattack Accuracy', () => {
    const { ctx, h } = rig()
    const before = h.stamina
    guard(ctx, h)
    expect(h.stamina).toBe(before - 2)
    expect(stat(ctx, h, 'counterattack')).toBe(1)
    expect(stat(ctx, h, 'counterattackAccuracy')).toBe(10)
    expect(ctx.events.filter((e) => e.type === 'statmod.added' && e.causeId === COUNTER).map((e) => e['stat'])).toEqual(['counterattack', 'counterattackAccuracy'])
  })

  it('attacked, he makes one free basic attack at −20 +10 Accuracy after the attack has resolved, and spends no Stamina', () => {
    const { ctx, h, z } = rig()
    guard(ctx, h)
    const own = preview(ctx, h.id, z.id, SLASH)
    beginActivation(ctx, z.id, 'test')
    const stamina = h.stamina, from = ctx.events.length
    performAttack(ctx, z.id, h.id, bite(ctx, z))
    const after = ctx.events.slice(from)
    const provoked = after.findIndex((e) => e.type === 'aoo.provoked')
    expect(after[provoked]).toMatchObject({ causeId: 'rule.counterattack', actor: h.id, target: z.id, attackId: SLASH, as: 'counterattack' })
    // every line of the enemy's attack is before it
    const theirs = after.map((e, i) => (e.actor === z.id && ['attack.declared', 'attack.hit', 'attack.miss'].includes(e.type) ? i : -1)).filter((i) => i >= 0)
    expect(theirs.length).toBeGreaterThan(0)
    expect(Math.max(...theirs)).toBeLessThan(provoked)
    const swing = after.find((e) => e.type === 'attack.declared' && e.actor === h.id)!
    expect(swing).toMatchObject({ attackId: SLASH, free: true, as: 'counterattack', hitChance: Math.max(0, Math.min(100, own.accuracy - 20 + 10)) })
    const ledger = swing['accLedger'] as { station: string; delta: number }[]
    expect(ledger.find((r) => r.station === 'FREE_ATTACK')!.delta).toBe(-20)
    expect(ledger.find((r) => r.station === 'FREE_ATTACK_BONUS')!.delta).toBe(10)
    expect(after.filter((e) => e.type === 'stamina.spent' && e.actor === h.id)).toEqual([])
    expect(h.stamina).toBe(stamina)
    expect(provokes(ctx, 'counterattack')).toHaveLength(1)
  })

  it('set off by being ATTACKED — a miss, a block and a hit all set it off', () => {
    for (const how of ['miss', 'block', 'hit'] as const) {
      const { ctx, h, z } = rig()
      guard(ctx, h)
      if (how === 'miss') sure(z, -500)
      if (how === 'hit') sure(z)
      if (how === 'block') { sure(z); h.mods.push({ stat: 'block', op: 'add', value: 200, source: 'test', scope: 'unit' }) }
      beginActivation(ctx, z.id, 'test')
      const r = performAttack(ctx, z.id, h.id, bite(ctx, z))
      expect([r.hit, r.blocked === true], how).toEqual(how === 'hit' ? [true, false] : how === 'block' ? [false, true] : [false, false])
      expect(provokes(ctx, 'counterattack'), how).toHaveLength(1)
    }
  })

  it('once per enemy action: every hit of a several-hit attack resolves, then the one counterattack', () => {
    const many = Object.values(ACTIONS).find((a) => a.attack?.kind === 'melee' && (a.attack.hits ?? 1) > 1 && a.move === undefined)!
    expect(many, 'the registry has no several-hit melee attack').toBeDefined()
    const { ctx, h, z } = rig()
    h.hp = h.maxHp = 200   // he lives through it
    guard(ctx, h)
    z.actions.push(many.id)
    sure(z, -500)   // every hit misses: the attack runs its full length
    beginActivation(ctx, z.id, 'test')
    const from = ctx.events.length
    performAttack(ctx, z.id, h.id, many.id)
    const after = ctx.events.slice(from)
    const hits = after.map((e, i) => (e.type === 'attack.declared' && e.actor === z.id ? i : -1)).filter((i) => i >= 0)
    expect(hits).toHaveLength(many.attack!.hits!)
    const counters = after.map((e, i) => (e.type === 'aoo.provoked' && e['as'] === 'counterattack' ? i : -1)).filter((i) => i >= 0)
    expect(counters).toHaveLength(1)
    expect(counters[0]).toBeGreaterThan(Math.max(...hits))
  })

  it('each enemy action is answered: two attackers, two counterattacks', () => {
    const { ctx, h, foes } = rig([hexId(5, 6), hexId(6, 5)])
    h.hp = h.maxHp = 200
    guard(ctx, h)
    for (const z of foes) { beginActivation(ctx, z.id, 'test'); performAttack(ctx, z.id, h.id, bite(ctx, z)) }
    expect(provokes(ctx, 'counterattack').map((e) => e.target)).toEqual(foes.map((z) => z.id))
  })

  it('nothing else sets it off: no Counterattack up, a shot from range, a burst, or a free attack', () => {
    // no power used
    const plain = rig()
    beginActivation(plain.ctx, plain.z.id, 'test')
    performAttack(plain.ctx, plain.z.id, plain.h.id, bite(plain.ctx, plain.z))
    expect(plain.ctx.events.filter((e) => e.type === 'aoo.provoked')).toEqual([])
    // a ranged attacker
    const shot = rig([hexId(5, 9)], 'unit.imp')
    shot.h.hp = shot.h.maxHp = 200
    guard(shot.ctx, shot.h)
    beginActivation(shot.ctx, shot.z.id, 'test')
    const blast = shot.z.actions.find((a) => shot.ctx.actions[a]?.attack?.kind === 'ranged')!
    performAttack(shot.ctx, shot.z.id, shot.h.id, blast)
    expect(shot.ctx.events.filter((e) => e.type === 'aoo.provoked')).toEqual([])
    // a free attack on him (he walks out of a zone with Counterattack up): the swing is not answered
    const free = rig()
    free.h.hp = free.h.maxHp = 200
    guard(free.ctx, free.h)
    attackOfOpportunity(free.ctx, free.z.id, free.h.id)
    expect(free.ctx.events.filter((e) => e.type === 'aoo.provoked').map((e) => e['as'] ?? 'opportunity')).toEqual(['opportunity'])
    // a burst is not an attack
    const burst = rig([hexId(5, 6)])
    burst.h.hp = burst.h.maxHp = 200
    guard(burst.ctx, burst.h)
    const storm = 'power.lightning-staff.storm'
    burst.z.actions.push(storm); burst.z.magic = 1
    beginActivation(burst.ctx, burst.z.id, 'test')
    useBurst(burst.ctx, burst.z.id, burst.h.hex, storm)
    expect(burst.ctx.events.filter((e) => e.type === 'aoo.provoked')).toEqual([])
  })

  it('a counterattack is not itself answered: two units with Counterattack up trade one swing each way, not a chain', () => {
    const { ctx, h, z } = rig()
    h.hp = h.maxHp = 200; z.hp = z.maxHp = 200
    guard(ctx, h)
    z.mods.push({ stat: 'counterattack' as never, op: 'add', value: 1, source: 'test', scope: 'unit' })
    beginActivation(ctx, z.id, 'test')
    performAttack(ctx, z.id, h.id, bite(ctx, z))
    expect(provokes(ctx, 'counterattack').map((e) => e.actor)).toEqual([h.id])
  })

  it('no counterattack from a unit the attack put down — and one that keeps its feet answers', () => {
    // a blow that takes him to 0: whether he stands (the deathbed roll) is the dice's; what he does then is the rule
    let down = 0, stood = 0
    for (let replicate = 0; replicate < 40 && !(down && stood); replicate++) {
      const { ctx, h, z } = rig([hexId(5, 6)], ZOMBIE, replicate)
      guard(ctx, h)
      h.hp = 1; sure(z)
      z.mods.push({ stat: 'strength', op: 'add', value: 50, source: 'test', scope: 'unit' })
      beginActivation(ctx, z.id, 'test')
      performAttack(ctx, z.id, h.id, bite(ctx, z))
      const answered = provokes(ctx, 'counterattack').length
      if (h.lifeState !== 'standing') { down++; expect(answered, `replicate ${replicate}: a unit that is down answers nothing`).toBe(0) }
      else if (ctx.geo.distance(h.hex, z.hex) === 1) { stood++; expect(answered, `replicate ${replicate}: he kept his feet beside it`).toBe(1) }
    }
    expect(down, 'the blow never put him down in forty tries').toBeGreaterThan(0)
  })

  it('until the end of his next Turn: up through the Enemy Phase and the whole next Turn, gone when that Turn ends', () => {
    const { ctx, h } = rig()
    ctx.state.turn = 3
    guard(ctx, h)
    expect(stat(ctx, h, 'counterattack')).toBe(1)
    expireTurnMods(ctx, 'test')   // Turn 3 ends
    ctx.state.turn = 4
    expect(stat(ctx, h, 'counterattack'), 'through the next Turn').toBe(1)
    expect(stat(ctx, h, 'counterattackAccuracy')).toBe(10)
    expireTurnMods(ctx, 'test')   // Turn 4 — his next Turn — ends
    ctx.state.turn = 5
    expect(stat(ctx, h, 'counterattack'), 'gone').toBe(0)
    expect(stat(ctx, h, 'counterattackAccuracy')).toBe(0)
    expect(ctx.events.filter((e) => e.type === 'statmod.expired' && ['counterattack', 'counterattackAccuracy'].includes(e['stat'] as string))).toHaveLength(2)
  })
})

describe('Fend — set off by an enemy moving into the zone of control', () => {
  /** The paladin fends at (5,5); a zombie three hexes off walks up beside him. */
  function approach(accuracy: number) {
    const r = rig([hexId(5, 8)])
    r.h.hp = r.h.maxHp = 200
    r.z.hp = r.z.maxHp = 200   // it lives through the swing: a dead mover is not a stopped one
    fend(r.ctx, r.h)
    sure(r.h, accuracy)
    beginActivation(r.ctx, r.z.id, 'test')
    const walk = r.z.actions.find((a) => r.ctx.actions[a]?.move?.shape === 'path')!
    const dest = hexId(5, 6)
    const plan = planMovement(r.ctx, r.z.id, walk, dest)
    if (!('path' in plan)) throw new Error('no path: ' + JSON.stringify(plan))
    return { ...r, walk, dest, path: plan.path }
  }

  it('a unit with Fend up makes one free basic attack on an enemy that walks into its zone, with no Stamina spent', () => {
    const { ctx, h, z, walk, path } = approach(300)
    expect(stat(ctx, h, 'fend')).toBe(1)
    const stamina = h.stamina
    executeMove(ctx, z.id, path, ctx.actions[walk] as never)
    const p = provokes(ctx, 'fend')
    expect(p).toHaveLength(1)
    expect(p[0]).toMatchObject({ causeId: 'rule.fend', actor: h.id, target: z.id, attackId: SLASH })
    expect(ctx.events.find((e) => e.type === 'attack.declared' && e.actor === h.id)).toMatchObject({ free: true, as: 'fend' })
    expect(ctx.events.filter((e) => e.type === 'stamina.spent' && e.actor === h.id && e.causeId === SLASH)).toEqual([])
    expect(h.stamina).toBe(stamina)
  })

  it('a hit stops the mover where it entered the zone; a miss does not', () => {
    const hit = approach(300)
    // a longer walk, so there is somewhere left to go: past him, to the far side
    const far = hexId(4, 5)
    const through = planMovement(hit.ctx, hit.z.id, hit.walk, far)
    const path = 'path' in through ? through.path : hit.path
    executeMove(hit.ctx, hit.z.id, path, hit.ctx.actions[hit.walk] as never)
    const entered = path.find((x) => hit.ctx.geo.distance(x, hit.h.hex) === 1)!
    expect(hit.z.hex, 'stopped on the first hex inside the zone').toBe(entered)
    expect(hit.ctx.events.find((e) => e.type === 'move.stopped' && e.actor === hit.z.id)).toMatchObject({ reason: 'hit' })
    expect(hit.z.movePointsLeft).toBe(0)
    const miss = approach(-500)
    executeMove(miss.ctx, miss.z.id, miss.path, miss.ctx.actions[miss.walk] as never)
    expect(provokes(miss.ctx, 'fend')).toHaveLength(1)
    expect(miss.z.hex, 'a miss stops nothing').toBe(miss.dest)
    expect(miss.ctx.events.some((e) => e.type === 'move.stopped')).toBe(false)
  })

  it('moving INTO the zone sets it off — not a step from one hex of the zone to another, not a sidestep, and not without Fend', () => {
    // already inside: a step around him stays inside the zone
    const inside = rig([hexId(5, 6)])
    inside.h.hp = inside.h.maxHp = 200
    fend(inside.ctx, inside.h); sure(inside.h)
    beginActivation(inside.ctx, inside.z.id, 'test')
    const walk = inside.z.actions.find((a) => inside.ctx.actions[a]?.move?.shape === 'path')!
    const next = inside.ctx.geo.neighboursOf(inside.z.hex).find((x) => inside.ctx.geo.distance(x, inside.h.hex) === 1 && x !== inside.h.hex)!
    executeMove(inside.ctx, inside.z.id, [next], inside.ctx.actions[walk] as never)
    expect(provokes(inside.ctx, 'fend')).toEqual([])
    // no Fend up: an enemy walks in untouched
    const none = rig([hexId(5, 8)])
    beginActivation(none.ctx, none.z.id, 'test')
    const w2 = none.z.actions.find((a) => none.ctx.actions[a]?.move?.shape === 'path')!
    const plan = planMovement(none.ctx, none.z.id, w2, hexId(5, 6))
    executeMove(none.ctx, none.z.id, (plan as { path: number[] }).path, none.ctx.actions[w2] as never)
    expect(none.ctx.events.filter((e) => e.type === 'aoo.provoked')).toEqual([])
    // a sidestep provokes nothing: a hero with Fend up beside a test warrior who half-steps into the zone
    const step = createBattle({ scenarioId: 'probe.counterattack-and-fend', replicate: 1, mapId: 'map.open', heroes: ['test-warrior'], heroHexes: [hexId(5, 7)], enemies: [ZOMBIE], enemyHexes: [hexId(5, 5)], enemyCount: 1 })
    const w = step.state.units[0]!, zz = step.state.units[1]!
    zz.mods.push({ stat: 'fend' as never, op: 'add', value: 1, source: 'test', scope: 'unit' })
    beginActivation(step, w.id, 'test')
    executeSidestep(step, w.id, hexId(5, 6), step.actions['power.sidestep'] as never)
    expect(step.events.filter((e) => e.type === 'aoo.provoked')).toEqual([])
  })

  it('the forecast shows the fend: where, from whom, with what and at what chance', () => {
    const { ctx, h, z, walk, dest } = approach(300)
    const fc = forecastFrom(ctx, { actor: z.id, actionId: walk, destination: dest })
    if (!fc.ok) throw new Error(fc.reason)
    const p = fc.provokes.find((x) => x.from === h.id)!
    expect(p).toMatchObject({ attackId: SLASH, as: 'fend' })
    expect(p.preview!.accLedger.some((r) => r.name === 'FREE_ATTACK')).toBe(true)
    expect(ctx.events.some((e) => e.type === 'aoo.provoked')).toBe(false)   // recorded, never rolled
  })

  it('Fend has its own Accuracy stat, as Counterattack has: +N on the fend, and on nothing else', () => {
    const { ctx, h, z } = rig()
    h.mods.push({ stat: 'fendAccuracy' as never, op: 'add', value: 15, source: 'test', scope: 'unit' })
    const base = preview(ctx, h.id, z.id, SLASH).accuracy
    const p = preview as unknown as (c: Ctx, a: number, t: number, id: string, mode: string, as?: string) => { accuracy: number }
    expect(p(ctx, h.id, z.id, SLASH, 'reaction', 'fend').accuracy).toBe(base - 20 + 15)
    expect(p(ctx, h.id, z.id, SLASH, 'reaction', 'counterattack').accuracy).toBe(base - 20)
    expect(p(ctx, h.id, z.id, SLASH, 'reaction').accuracy).toBe(base - 20)
  })
})

describe('in real battles', () => {
  it('the fielding test.counterattack: a paladin raises his Counterattack and answers a zombie that swings at him', () => {
    const s = SCENARIOS['test.counterattack']
    expect(s, 'no scenario test.counterattack is registered').toBeDefined()
    let used = 0, answered = 0
    for (let r = 0; r < 12 && !(used && answered); r++) {
      const ctx = createBattle(scenarioOptions(s!, r))
      runBattle(ctx)
      used += ctx.events.filter((e) => e.type === 'power.used' && e.causeId === COUNTER).length
      answered += provokes(ctx, 'counterattack').length
    }
    expect(used, 'nobody used the Longsword\'s Counterattack').toBeGreaterThan(0)
    expect(answered, 'nobody counterattacked').toBeGreaterThan(0)
  }, LONG)

  it('the fielding test.fend: a unit with the test Fend power fends off a zombie that walks up to it', () => {
    const s = SCENARIOS['test.fend']
    expect(s, 'no scenario test.fend is registered').toBeDefined()
    let used = 0, fended = 0
    for (let r = 0; r < 12 && !(used && fended); r++) {
      const ctx = createBattle(scenarioOptions(s!, r))
      runBattle(ctx)
      used += ctx.events.filter((e) => e.type === 'power.used' && e.causeId === FEND).length
      fended += provokes(ctx, 'fend').length
    }
    expect(used, 'nobody used the Fend power').toBeGreaterThan(0)
    expect(fended, 'nobody fended').toBeGreaterThan(0)
  }, LONG)
})
