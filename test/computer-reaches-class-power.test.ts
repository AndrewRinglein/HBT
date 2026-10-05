// fix.computer-reaches-class-power-past-shield-power (2026-10-05). Found landing content.shields-reauthored (SWITCHES.md
// shieldPowersDisplaceClassPowers): the Armory Ledger's shield powers cost 1 Stamina and have no cooldown, and the computer used
// the FIRST ready power its kit lists whenever it was not about to attack — so a computer-played hero with a shield raised it
// every Activation it did not swing and never reached the class powers listed after it (in 40 replicates of
// showcase.assembled-party the Priest never used Circle of Healing and the Paladin never used Aegis).
//
// The rule (SWITCHES.md aiPowerLongestCooldownFirst — the item's own proposal, taken as the default; not ruled): among its powers
// the computer tries the one with the LONGEST COOLDOWN first — a power it can use only now and then is worth more than one it can
// use every Activation — the unit's own kit order breaking ties. One comparison, in the one decision layer (ai/modes.ts), no
// list of powers. Everything else about when a power is worth using is as it was.
import { describe, expect, it } from 'vitest'
import { runActivation } from '../src/ai/modes.js'
import { advanceBattle, completeActionCycle, runBattle } from '../src/core/battle.js'
import { powerIdsOf } from '../src/core/action.js'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { ACTIONS, ITEMS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx } from '../src/core/types.js'
import { hexId } from './board16.js'

const BRACE = 'power.tower-shield.brace', WALL = 'power.tower-shield.arrow-wall'
const AEGIS = 'power.sacred-shield.aegis', CIRCLE = 'power.shepherd.circle-of-healing'
const PALADIN = 'hero.base.paladin-hunk', PRIEST = 'hero.base.priest-armored'
/** Play whole Activations until unit `id` has had `n` of its own; returns the powers it used, one list per Activation of its own. */
function activationsOf(ctx: Ctx, id: number, n: number): string[][] {
  const out: string[][] = []
  for (let guard = 0; guard < 400 && out.length < n; guard++) {
    const next = advanceBattle(ctx)
    if (next.kind === 'complete') break
    const from = ctx.events.length
    if (ctx.state.units[next.actor]!.lifeState === 'standing') runActivation(ctx, next.actor)
    completeActionCycle(ctx)
    if (next.actor === id) out.push(ctx.events.slice(from).filter((e) => e.type === 'power.used' && e.actor === id).map((e) => String(e.causeId)))
  }
  return out
}

describe('the two rows the rule is shown on: one shield, two powers, one of them with a cooldown', () => {
  it('the Tower Shield lists Brace (no cooldown) before Arrow Wall (cooldown 1)', () => {
    expect(ITEMS['item.tower-shield']!.abilities).toEqual([BRACE, WALL])
    expect([ACTIONS[BRACE]!.cooldown ?? 0, ACTIONS[WALL]!.cooldown ?? 0]).toEqual([0, 1])
  })
})

describe('the computer tries its power with the longest cooldown first', () => {
  /** One unit of `side` holding the two shield powers, in the kit's order, playing the support mode, and one unarmed foe near it. */
  function idle(side: 'hero' | 'enemy') {
    const mine = { type: side === 'hero' ? 'test-warrior' : 'test-zombie', hex: hexId(3, 8) }, foe = { type: side === 'hero' ? 'test-zombie' : 'test-warrior', hex: hexId(12, 8) }
    const ctx = side === 'hero' ? createCustomBattle([mine], [foe], { strict: true }) : createCustomBattle([foe], [mine], { strict: true })
    const u = ctx.state.units.find((x) => x.side === side)!, other = ctx.state.units.find((x) => x.side !== side)!
    u.actions = [...u.actions, BRACE, WALL]; u.stamina = u.maxStamina = 20
    // the unit plays the support mode, which reaches for a power before it walks or swings (ai/modes.ts support); the foe stands
    // where it is, unarmed, two hexes off - within the reach a guard is raised for - so every Activation is a power's
    u.ai = 'support'; other.movement = 0; other.actions = other.actions.filter((a) => !ctx.actions[a]?.attack && !ctx.actions[a]?.move)
    u.hex = hexId(6, 8); other.hex = hexId(7, 10)
    expect(powerIdsOf(ctx, u).slice(-2)).toEqual([BRACE, WALL])
    return { ctx, u }
  }

  it('a hero with the shield: Arrow Wall first, though Brace is listed first; while Arrow Wall cools down, Brace; then Arrow Wall again', () => {
    const { ctx, u } = idle('hero')
    const used = activationsOf(ctx, u.id, 3)
    expect(used).toEqual([[WALL], [BRACE], [WALL]])
  })

  it('an enemy handed the same two powers chooses the same way — the rule is the computer\'s, not a side\'s', () => {
    const { ctx, u } = idle('enemy')
    const used = activationsOf(ctx, u.id, 3)
    expect(used).toEqual([[WALL], [BRACE], [WALL]])
  })

  it('kit order breaks a tie: two powers with the same cooldown are tried in the order the unit lists them', () => {
    const { ctx, u } = idle('hero')
    u.actions = u.actions.filter((a) => a !== WALL)
    const SET = 'power.round-shield.set-feet'
    expect(ACTIONS[SET]!.cooldown ?? 0).toBe(ACTIONS[BRACE]!.cooldown ?? 0)
    u.actions.push(SET)
    expect(activationsOf(ctx, u.id, 2)).toEqual([[BRACE], [BRACE]])
  })
})

describe('a computer-played hero with a shield reaches its class powers — the assembled party, with its full kits', () => {
  const opts = scenarioOptions(scenarioDef('showcase.assembled-party'))
  const played = (replicates: number) => {
    const used = new Map<string, Set<string>>()
    for (let r = 0; r < replicates; r++) {
      const ctx = createBattle({ ...opts, replicate: r }); runBattle(ctx)
      for (const e of ctx.events) if (e.type === 'power.used') { const type = ctx.state.units[e.actor!]!.typeId; used.set(type, (used.get(type) ?? new Set()).add(String(e.causeId))) }
    }
    return used
  }

  it('three of the six hold a shield, and each of those has class powers listed after its shield\'s', () => {
    const shielded = opts.heroes!.filter((h) => (UNITS[h]!.defaultItems ?? []).some((i) => ITEMS[i]?.itemClass === 'shield'))
    expect(shielded).toHaveLength(3)
  })

  it('in the fights themselves the Paladin uses Aegis — it was none in 40 replicates', () => {
    const paladin = played(3).get(PALADIN) ?? new Set()
    expect(paladin.has(AEGIS), [...paladin].join(', ')).toBe(true)
  })

  /** One hero of the party, alone, with its Codex kit and the party's progress, playing the support mode beside an unarmed foe: every Activation is a power's. */
  function alone(hero: string) {
    const at = opts.heroes!.indexOf(hero)
    const ctx = createBattle({ ...opts, heroes: [hero], heroHexes: [hexId(6, 8)], heroProgress: [opts.heroProgress![at]!], enemies: ['test-zombie'], enemyHexes: [hexId(7, 10)], enemyCount: 1, replicate: 0, mapId: 'map.open' })
    const u = ctx.state.units.find((x) => x.typeId === hero)!, foe = ctx.state.units.find((x) => x.side === 'enemy')!
    u.ai = 'support'; u.stamina = u.maxStamina = 30; foe.movement = 0; foe.actions = foe.actions.filter((a) => !ctx.actions[a]?.attack && !ctx.actions[a]?.move)
    return { ctx, u }
  }

  it('and a shield is still raised on other Activations: the Iron Dwarf of that party, with nothing to swing at, uses his class powers first and the Tower Shield\'s while they cool', () => {
    const { ctx, u } = alone('hero.base.warrior-iron')
    const kit = powerIdsOf(ctx, u)
    expect(kit.slice(0, 2)).toEqual([BRACE, WALL])   // the shield's powers are listed BEFORE the class's
    const used = activationsOf(ctx, u.id, 8).flat()
    const shield = used.findIndex((p) => p.startsWith('power.tower-shield.')), cls = used.findIndex((p) => p.startsWith('power.bloodrage.'))
    expect(cls, used.join(', ')).toBe(0)
    expect(shield, used.join(', ')).toBeGreaterThan(0)
  })

  // FOUND, and said (SWITCHES.md counterattackDisplacesShieldPowers, aiPowerLongestCooldownFirst): the Paladin holds a Longsword,
  // whose Counterattack has no cooldown either and is listed before his Kite Shield - the tie is the kit's order, so while his class
  // powers cool it is the Counterattack he puts up, not the shield. The rule is one comparison; which of two cooldown-free self
  // powers is worth the Activation is not answered by it.
  it('the Paladin of that party with nothing to swing at uses Aegis first; while his class powers cool he reaches for his kit\'s first cooldown-free power — the Longsword\'s Counterattack, listed before the shield', () => {
    const at = opts.heroes!.indexOf(PALADIN)
    const ctx = createBattle({ ...opts, heroes: [PALADIN], heroHexes: [hexId(6, 8)], heroProgress: [opts.heroProgress![at]!], enemies: ['test-zombie'], enemyHexes: [hexId(7, 10)], enemyCount: 1, replicate: 0, mapId: 'map.open' })
    const u = ctx.state.units.find((x) => x.typeId === PALADIN)!, foe = ctx.state.units.find((x) => x.side === 'enemy')!
    // the support mode reaches for a power before it walks or swings; the foe stands where it is, unarmed
    u.ai = 'support'; u.stamina = u.maxStamina = 30; foe.movement = 0; foe.actions = foe.actions.filter((a) => !ctx.actions[a]?.attack && !ctx.actions[a]?.move)
    const kit = powerIdsOf(ctx, u)
    expect(kit.indexOf('power.kite-shield.raise-guard')).toBeLessThan(kit.indexOf(AEGIS))   // the shield's powers are listed BEFORE the class's
    const used = activationsOf(ctx, u.id, 6).flat()
    expect(used[0], used.join(', ')).toBe(AEGIS)
    const kitPower = used.findIndex((p) => /^power\.(kite-shield|longsword)\./.test(p))
    expect(kitPower, used.join(', ')).toBeGreaterThan(0)
    expect(used[kitPower]).toBe('power.longsword.counterattack')
    expect(kit.indexOf('power.longsword.counterattack')).toBeLessThan(kit.indexOf('power.kite-shield.raise-guard'))
  })

  it('the Priest\'s Circle of Healing is tried before her shield\'s powers too — and used when the circle holds someone hurt enough', () => {
    const at = opts.heroes!.indexOf(PRIEST)
    const ctx = createBattle({ ...opts, heroes: [PRIEST, 'hero.base.warrior-iron'], heroHexes: [hexId(6, 8), hexId(6, 9)], heroProgress: [opts.heroProgress![at]!, opts.heroProgress![0]!], enemies: ['test-zombie'], enemyHexes: [hexId(12, 12)], enemyCount: 1, replicate: 0, mapId: 'map.open' })
    const u = ctx.state.units.find((x) => x.typeId === PRIEST)!, ally = ctx.state.units.find((x) => x.typeId === 'hero.base.warrior-iron')!, foe = ctx.state.units.find((x) => x.side === 'enemy')!
    u.ai = 'support'; u.stamina = u.maxStamina = 30; foe.movement = 0; foe.actions = foe.actions.filter((a) => !ctx.actions[a]?.attack && !ctx.actions[a]?.move)
    ally.movement = 0
    // her single-target heals are set aside for this fielding (they are the heal procedure's, and come first): what is asked is which of the REST she reaches for
    u.actions = u.actions.filter((a) => !['power.holy-texts.mercy', 'power.shepherd.close-wounds'].includes(a))
    const kit = powerIdsOf(ctx, u)
    expect(kit.indexOf('power.round-shield.lock-shields')).toBeLessThan(kit.indexOf(CIRCLE))
    delete u.cooldowns[CIRCLE]   // its warm-up is over
    ally.hp = Math.max(1, ally.maxHp - 6); u.hp = Math.max(1, u.maxHp - 6)
    const first = activationsOf(ctx, u.id, 1).flat().filter((p) => !ctx.actions[p]?.free)
    expect(first).toEqual([CIRCLE])
  })
})
