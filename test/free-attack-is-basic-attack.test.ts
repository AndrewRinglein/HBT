// rule.free-attack-is-basic-attack — ruled 2026-09-28 (Andrew, DECISIONS.md 'counterattack, special free attacks, the
// opening six, shields, custom weapons'): "we're changing attack of opportunity, so it's using the same rules as
// everything else. No stamina, uses the basic attack." — "Special free attacks — counterattack, fend, the attack of
// opportunity — are one rule: the basic attack, no stamina, −20 Accuracy." Never built until 2026-10-04 ('the basic
// attack is a weapon's first attack, and every free attack uses it without paying stamina'): "There's supposed to be
// a basic attack for each character, and that basic attack is used on all [free] attacks. Most weapons have a basic
// attack. Chop should be the basic attack … It is the first attack. It has a stamina cost, but that stamina cost is
// not triggered by special free attacks." And the same day: "If you have something that does not have a basic melee
// attack as its number 1 action, then you do not have a basic attack, and you use punch."
//
// So: a unit's basic attack is the first action of the weapon it holds, when that is a melee attack; with no such
// attack its free attack is its own unarmed one (Punch on every hero row; a bestiary row's own first melee attack).
// The attack of opportunity is that attack, through THE attack function, as a special free attack: no Stamina asked
// for and none spent (no stamina.spent line), −20 Accuracy as a named row of the accuracy ladder. On its own
// Activation the same attack costs what it always cost. The core names no attack: it reads the loadout and the
// rows' declared order.
import { describe, expect, it } from 'vitest'
import { aooChoice, attackOfOpportunity, executeMove, planMovement } from '../src/core/movement.js'
import { FREE_ATTACK_ACCURACY, performAttack, preview } from '../src/core/pipeline.js'
import { basicAttackOf, freeAttackOf } from '../src/core/free-attack.js'
import { beginActivation } from '../src/core/mutate.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { forecastFrom } from '../src/core/forecast.js'
import { ACTIONS, ITEMS, UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { AttackDef, Ctx, Unit } from '../src/core/types.js'
import { hexId } from './board16.js'

const CHOP = 'attack.lumberjack-axe.chop', SLASH = 'attack.longsword.slash', PUNCH = 'attack.punch'
const LUMBERJACK = 'hero.fixed.lumberjack-and-wife', PALADIN = 'hero.base.paladin-hunk', IRON = 'hero.base.warrior-iron'
const RANGER = 'hero.base.ranger-ranger', MAGE = 'hero.base.mage-fire', PRIEST = 'hero.base.priest-armored'
type FreeAttacks = {
  basicAttackOf?: (ctx: Ctx, u: Unit) => AttackDef | null
  freeAttackOf?: (ctx: Ctx, u: Unit) => AttackDef | null
  FREE_ATTACK_ACCURACY?: number
}
/** The rule's functions (src/core/free-attack.ts; the ruled penalty is the attack function's, pipeline.ts). */
const rule: FreeAttacks = { basicAttackOf, freeAttackOf, FREE_ATTACK_ACCURACY }

/** One hero at (5,5) holding the zone; one enemy beside it at (5,6), the mover. Nobody misses for want of Accuracy. */
function rig(hero: string, enemy = 'unit.zombie', heroItems?: string[]) {
  const ctx = createBattle({ scenarioId: 'probe.free-attack', replicate: 1, mapId: 'map.open', heroes: [hero], heroHexes: [hexId(5, 5)],
    ...(heroItems ? { heroItems: [heroItems] } : {}), enemies: [enemy], enemyHexes: [hexId(5, 6)], enemyCount: 1 })
  const h = ctx.state.units.find((u) => u.typeId === hero)!, e = ctx.state.units.find((u) => u.typeId === enemy)!
  return { ctx, h, e }
}
const sure = (u: Unit) => u.mods.push({ stat: 'accuracy', op: 'add', value: 200, source: 'test', scope: 'unit' })
const idOf = (a: AttackDef | null | undefined) => a?.id ?? null
const LONG = 120_000   // eighteen and twelve whole battles beside other workers' suites: a time limit is not the assertion

describe('the basic attack: the first action of the weapon a unit holds, when that is a melee attack', () => {
  it('the rule is the engine\'s: basicAttackOf and freeAttackOf, and the ruled −20', () => {
    expect(typeof rule.basicAttackOf).toBe('function')
    expect(typeof rule.freeAttackOf).toBe('function')
    expect(rule.FREE_ATTACK_ACCURACY).toBe(-20)
  })

  it.each([
    [LUMBERJACK, 'item.lumberjack-axe', CHOP],
    [PALADIN, 'item.longsword', SLASH],
    [IRON, 'item.war-axe', 'attack.war-axe.chop'],   // a shield is handed first; the weapon is still the main hand's
  ])('%s holds %s: its basic attack is %s — the row\'s first attack, a second weapon costing no code', (hero, item, attack) => {
    const { ctx, h } = rig(hero)
    expect(h.loadout!.hands.some((i) => i.itemId === item)).toBe(true)
    expect(ITEMS[item]!.grants[0]).toBe(attack)
    expect(ACTIONS[attack]!.attack!.kind).toBe('melee')
    expect(idOf(rule.basicAttackOf!(ctx, h))).toBe(attack)
    expect(idOf(rule.freeAttackOf!(ctx, h))).toBe(attack)
  })

  it.each([
    [RANGER, 'item.elfbow'], [MAGE, 'item.fire-staff'], [PRIEST, 'item.holy-texts'],
  ])('%s holds %s, whose first action is not a melee attack: no basic attack — its free attack is Punch', (hero, item) => {
    const { ctx, h } = rig(hero)
    expect(ACTIONS[ITEMS[item]!.grants[0]!]!.attack!.kind).toBe('ranged')
    expect(rule.basicAttackOf!(ctx, h)).toBeNull()
    expect(idOf(rule.freeAttackOf!(ctx, h))).toBe(PUNCH)
  })

  it('a hero holding no weapon — nothing, or a shield alone — has Punch as its basic attack', () => {
    for (const items of [[], ['item.round-shield']]) {
      const { ctx, h } = rig(PALADIN, 'unit.zombie', items)
      expect(idOf(rule.basicAttackOf!(ctx, h)), items.join()).toBe(PUNCH)
      expect(idOf(rule.freeAttackOf!(ctx, h)), items.join()).toBe(PUNCH)
    }
  })

  it('a unit whose attacks are its row\'s own: its first attack when that is melee; a row that leads with a shot uses its own first melee attack; a row with none has no free attack', () => {
    const { ctx, e: zombie } = rig(PALADIN, 'unit.zombie')
    expect(idOf(rule.freeAttackOf!(ctx, zombie))).toBe(UNITS['unit.zombie']!.attacks[0])
    const imp = rig(PALADIN, 'unit.imp')
    expect(ACTIONS[UNITS['unit.imp']!.attacks[0]!]!.attack!.kind).toBe('ranged')
    expect(idOf(rule.freeAttackOf!(imp.ctx, imp.e))).toBe('attack.imp.claw')
    const sniper = rig(PALADIN, 'unit.dark-sniper')
    expect(rule.freeAttackOf!(sniper.ctx, sniper.e)).toBeNull()
    const test = rig('test-warrior')   // a row armed by its own attacks, in its own order
    expect(idOf(rule.freeAttackOf!(test.ctx, test.h))).toBe(UNITS['test-warrior']!.attacks[0])
  })
})

describe('the attack of opportunity is the basic attack, free: no Stamina, −20 Accuracy', () => {
  it.each([[LUMBERJACK, CHOP], [PALADIN, SLASH]])('%s swings %s at a passer-by and spends no Stamina — no stamina.spent line for that swing', (hero, attack) => {
    const { ctx, h, e } = rig(hero)
    sure(h)
    expect(ACTIONS[attack]!.staminaCost).toBeGreaterThan(0)
    beginActivation(ctx, e.id, 'test')
    const before = h.stamina, from = ctx.events.length
    expect(attackOfOpportunity(ctx, h.id, e.id)).toBe(true)
    const swing = ctx.events.slice(from)
    expect(swing.find((x) => x.type === 'aoo.provoked')).toMatchObject({ actor: h.id, target: e.id, attackId: attack })
    expect(swing.find((x) => x.type === 'attack.declared')).toMatchObject({ actor: h.id, attackId: attack })
    expect(swing.filter((x) => x.type === 'stamina.spent')).toEqual([])
    expect(h.stamina).toBe(before)
    expect(swing.find((x) => x.type === 'action.spent' && x.causeId === attack)).toMatchObject({ slot: 'reaction' })
    expect(h.primaryUsed).toBe(false)
  })

  it('a unit at 0 Stamina still makes its free attack', () => {
    const { ctx, h, e } = rig(LUMBERJACK)
    sure(h); h.stamina = 0
    beginActivation(ctx, e.id, 'test')
    expect(attackOfOpportunity(ctx, h.id, e.id)).toBe(true)
    expect(ctx.events.find((x) => x.type === 'aoo.provoked')!['attackId']).toBe(CHOP)
    expect(h.stamina).toBe(0)
    expect(ctx.events.some((x) => x.type === 'aoo.skipped')).toBe(false)
  })

  it('−20 Accuracy, as a named row of the accuracy ladder — and only on the free attack', () => {
    const { ctx, h, e } = rig(LUMBERJACK)
    const own = preview(ctx, h.id, e.id, CHOP)
    const free = (preview as unknown as (c: Ctx, a: number, t: number, id: string, mode: string) => ReturnType<typeof preview>)(ctx, h.id, e.id, CHOP, 'reaction')
    expect(free.accuracy).toBe(own.accuracy - 20)
    expect(free.accLedger.filter((r) => r.name === 'FREE_ATTACK')).toEqual([expect.objectContaining({ delta: -20 })])
    expect(own.accLedger.some((r) => r.name === 'FREE_ATTACK')).toBe(false)
    expect(free.damageOnHit).toBe(own.damageOnHit)
    // the swing rolls against that number
    beginActivation(ctx, e.id, 'test')
    attackOfOpportunity(ctx, h.id, e.id)
    expect(ctx.events.find((x) => x.type === 'attack.declared' && x.causeId === CHOP)).toMatchObject({ hitChance: free.hitChance })
  })

  it('on its own Activation the same attack still costs its Stamina, at its own Accuracy', () => {
    const { ctx, h, e } = rig(LUMBERJACK)
    sure(h)
    beginActivation(ctx, h.id, 'test')
    const before = h.stamina
    performAttack(ctx, h.id, e.id, CHOP)
    expect(h.stamina).toBe(before - ACTIONS[CHOP]!.staminaCost)
    expect(ctx.events.filter((x) => x.type === 'stamina.spent' && x.causeId === CHOP)).toHaveLength(1)
    expect(ctx.events.find((x) => x.type === 'attack.declared')!['accLedger']).not.toEqual(expect.arrayContaining([expect.objectContaining({ station: 'FREE_ATTACK' })]))
  })

  it('a hero whose main-hand weapon is a bow makes its free attack with Punch', () => {
    const { ctx, h, e } = rig(RANGER)
    sure(h)
    beginActivation(ctx, e.id, 'test')
    expect(attackOfOpportunity(ctx, h.id, e.id)).toBe(true)
    expect(ctx.events.find((x) => x.type === 'aoo.provoked')!['attackId']).toBe(PUNCH)
  })

  it('an unarmed hero punches; an enemy swings its own first attack and pays nothing', () => {
    const bare = rig(PALADIN, 'unit.zombie', [])
    sure(bare.h)
    beginActivation(bare.ctx, bare.e.id, 'test')
    attackOfOpportunity(bare.ctx, bare.h.id, bare.e.id)
    expect(bare.ctx.events.find((x) => x.type === 'aoo.provoked')!['attackId']).toBe(PUNCH)
    const { ctx, h, e } = rig(PALADIN)
    sure(e)
    beginActivation(ctx, h.id, 'test')
    attackOfOpportunity(ctx, e.id, h.id)
    expect(ctx.events.find((x) => x.type === 'aoo.provoked')).toMatchObject({ actor: e.id, attackId: UNITS['unit.zombie']!.attacks[0] })
    expect(ctx.events.filter((x) => x.type === 'stamina.spent')).toEqual([])
  })

  it('when the basic attack is not legal the unit punches; skipped, with a line, only when even that is not legal', () => {
    const { ctx, h, e } = rig(LUMBERJACK)
    sure(h)
    h.cooldowns[CHOP] = ctx.state.turn + 3   // the basic attack is down
    beginActivation(ctx, e.id, 'test')
    expect(attackOfOpportunity(ctx, h.id, e.id)).toBe(true)
    expect(ctx.events.find((x) => x.type === 'aoo.provoked')!['attackId']).toBe(PUNCH)
    // …and with Punch gone too, the skip names it
    const none = rig(LUMBERJACK)
    none.h.cooldowns[CHOP] = none.ctx.state.turn + 3
    none.h.actions = none.h.actions.filter((a) => a !== PUNCH)
    beginActivation(none.ctx, none.e.id, 'test')
    expect(attackOfOpportunity(none.ctx, none.h.id, none.e.id)).toBe(false)
    expect(none.ctx.events.find((x) => x.type === 'aoo.skipped')).toMatchObject({ reason: 'not legal' })
    // a row with no melee attack at all
    const sniper = rig(PALADIN, 'unit.dark-sniper')
    beginActivation(sniper.ctx, sniper.h.id, 'test')
    expect(attackOfOpportunity(sniper.ctx, sniper.e.id, sniper.h.id)).toBe(false)
    expect(sniper.ctx.events.find((x) => x.type === 'aoo.skipped')).toMatchObject({ reason: 'no melee attack' })
  })

  it('the cheaper attack is not chosen: the Lumberjack\'s Punch costs nothing and he still chops', () => {
    const { ctx, h, e } = rig(LUMBERJACK)
    expect(ACTIONS[PUNCH]!.staminaCost).toBeLessThan(ACTIONS[CHOP]!.staminaCost)
    expect(h.actions).toContain(PUNCH)
    const c = aooChoice(ctx, h.id, e.id)
    expect('attack' in c && c.attack.id).toBe(CHOP)
  })
})

describe('the forecast shows the same attack', () => {
  it('a walk out of the Lumberjack\'s zone is forecast his Chop at the free attack\'s own chance', () => {
    const { ctx, h, e } = rig(LUMBERJACK)
    // the zombie walks away from the hero: its first step leaves the zone
    beginActivation(ctx, e.id, 'test')
    const walk = e.actions.find((a) => ctx.actions[a]?.move?.shape === 'path')!
    const dest = hexId(5, 9)
    const plan = planMovement(ctx, e.id, walk, dest)
    expect('path' in plan, JSON.stringify(plan)).toBe(true)
    const fc = forecastFrom(ctx, { actor: e.id, actionId: walk, destination: dest })
    expect(fc.ok, JSON.stringify(fc)).toBe(true)
    const provoke = (fc as unknown as { provokes: { from: number; attackId: string | null; preview: { hitChance: number; accLedger: { name: string }[] } | null }[] }).provokes.find((p) => p.from === h.id)!
    expect(provoke.attackId).toBe(CHOP)
    expect(provoke.preview!.accLedger.some((r) => r.name === 'FREE_ATTACK')).toBe(true)
    // and the real walk draws that swing
    executeMove(ctx, e.id, (plan as { path: number[] }).path, ctx.actions[walk] as never)
    expect(ctx.events.find((x) => x.type === 'aoo.provoked')).toMatchObject({ actor: h.id, attackId: CHOP })
    expect(ctx.events.find((x) => x.type === 'attack.declared' && x.causeId === CHOP)).toMatchObject({ hitChance: provoke.preview!.hitChance })
  })
})

describe('in real battles', () => {
  it('every attack of opportunity in the opening is the holder\'s free attack by the rule, and no swing spends Stamina', () => {
    const opening = Object.values(SCENARIOS).filter((s) => s.openingPosition)
    expect(opening).toHaveLength(6)
    let swings = 0, armed = 0
    const chosen = new Set<string>()
    for (const s of opening) for (const replicate of [0, 1, 2]) {
      const ctx = createBattle(scenarioOptions(s, replicate))
      // the rule read at the moment of each swing: hook the log as it grows
      runBattle(ctx)
      ctx.events.forEach((x, i) => {
        if (x.type !== 'aoo.provoked') return
        swings++
        const attackId = x['attackId'] as string
        chosen.add(attackId)
        expect(ctx.actions[attackId]!.attack!.kind, attackId).toBe('melee')
        if (/^attack\.(?!punch)/.test(attackId) && ctx.state.units[x.actor as number]!.loadout?.hands.some((h) => ctx.items[h.itemId]?.grants[0] === attackId)) armed++
        // nothing between the provoke and the swing's own declaration spends Stamina for it
        const declared = ctx.events.findIndex((y, j) => j > i && y.type === 'attack.declared' && y.actor === x.actor)
        expect(ctx.events.slice(i, declared + 1).filter((y) => y.type === 'stamina.spent' && y.actor === x.actor)).toEqual([])
        expect((ctx.events[declared]!['accLedger'] as { station: string }[]).some((r) => r.station === 'FREE_ATTACK'), 'the −20 is on the swing').toBe(true)
        expect(ctx.events[declared]!['free'], 'the swing says it is a free attack').toBe(true)
      })
    }
    expect(swings, 'no attack of opportunity in eighteen opening battles').toBeGreaterThan(0)
    expect(armed, 'no armed unit swung its weapon\'s first attack').toBeGreaterThan(0)
  }, LONG)

  it('the Lumberjack chops a passer-by at the Lumberjack House; he never punches one while his axe is in hand', () => {
    const s = Object.values(SCENARIOS).find((x) => x.openingPosition === 2)!
    let chops = 0
    for (let replicate = 0; replicate < 12; replicate++) {
      const ctx = createBattle(scenarioOptions(s, replicate))
      runBattle(ctx)
      for (const x of ctx.events) {
        if (x.type !== 'aoo.provoked') continue
        const u = ctx.state.units[x.actor as number]!
        if (u.typeId !== LUMBERJACK) continue
        expect(x['attackId'], `replicate ${replicate}`).toBe(CHOP)
        chops++
      }
    }
    expect(chops, 'the Lumberjack made no attack of opportunity in twelve fights').toBeGreaterThan(0)
  }, LONG)
})
