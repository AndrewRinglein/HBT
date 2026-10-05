// rule.counterattack-replaced-and-lost (2026-10-04). Ruled 2026-09-28 (the Armory Ledger's rules, approved that day; DECISIONS.md
// 'counterattack, special free attacks, the opening six, shields, custom weapons'): "A new counterattack replaces the old one.
// Knocked down, knocked back or moved by an enemy's power: it is lost." — the dictation behind it: "If a new counterattack is
// defined, it overrides the old." and "A character who is knocked down or back or who is moved … lose their counterattack. The
// icon and the attribute go away." Recorded as not built by capability.counterattack-and-fend (SWITCHES.md
// counterattackNewOverridesOld, counterattackLostWhenMoved). And from the same rules line: Thorns answers a hit from an
// ADJACENT melee attacker.
//
// The mechanism (no power is named in core): a special free attack a unit has UP is the stored modifiers on that kind's stat
// (stats.ts SPECIAL_FREE_ATTACKS — counterattack, fend) and on its Accuracy stat. Using a power that grants the kind first
// takes away what an earlier grant placed — the kind's own two stats, and every other modifier that earlier grant put on with
// the same source and lifetime (its riders) — so the newer power's numbers stand alone, never a sum. A unit that goes prone, or
// is displaced by anything but its own movement, loses the kind's two stats. Each modifier that goes is one `statmod.expired`
// line that says why (`reason`) and which special free attack it was (`lost`). Fend follows the same two rules.
import { describe, expect, it } from 'vitest'
import { usePower } from '../src/core/ability.js'
import { executeKnockback } from '../src/core/movement.js'
import { beginActivation, moveUnit } from '../src/core/mutate.js'
import { performAttack, preview } from '../src/core/pipeline.js'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { effective } from '../src/core/stats.js'
import { applyStatus } from '../src/core/status.js'
import { ABILITIES } from '../src/content/index.js'
import type { Ctx, Event, Unit } from '../src/core/types.js'
import { hexId } from './board16.js'

const LONG = 'power.longsword.counterattack', GREAT = 'power.greatsword.counterattack', FEND = 'power.test-fend'
const SLASH = 'attack.longsword.slash'
const PALADIN = 'hero.base.paladin-hunk', ZOMBIE = 'unit.zombie'
const stat = (ctx: Ctx, u: Unit, name: string) => effective(ctx, u, name as never).value
const ended = (ev: readonly Event[]) => ev.filter((e) => e.type === 'statmod.expired').map((e) => [e['stat'], e['value'], e['source'], e['reason'], e['lost']])
const provokes = (ctx: Ctx, as: string) => ctx.events.filter((e) => e.type === 'aoo.provoked' && e['as'] === as)

/** A paladin with his Longsword at (5,5), a zombie beside him at (5,6). He is handed the Great Sword's power and the test Fend as well, so two counterattack powers and a fend can be used by one unit. No crits: a crit's chart can throw a unit a hex away, and these tests place their units. */
function rig() {
  const ctx = createBattle({ scenarioId: 'probe.counterattack-replaced-and-lost', replicate: 1, mapId: 'map.open', heroes: [PALADIN], heroHexes: [hexId(5, 5)],
    enemies: [ZOMBIE], enemyHexes: [hexId(5, 6)], enemyCount: 1, cfg: { switches: { critEnabled: false } as never } })
  const h = ctx.state.units.find((u) => u.typeId === PALADIN)!, z = ctx.state.units.find((u) => u.typeId === ZOMBIE)!
  for (const p of [GREAT, FEND]) if (!h.actions.includes(p)) h.actions.push(p)
  h.stamina = h.maxStamina = 20
  return { ctx, h, z }
}
/** He uses `power` on his own Activation; `nextTurn` first moves the battle on a Turn, so the earlier use is still up (it lasts to the end of the NEXT Turn). */
function use(ctx: Ctx, h: Unit, power: string, nextTurn = false) { if (nextTurn) { ctx.state.turn += 1; delete h.cooldowns[power] }   // the test's clock: the earlier use is still up, and the power is ready again
  beginActivation(ctx, h.id, 'test'); usePower(ctx, h.id, h.id, power) }
const prone = (ctx: Ctx) => Object.values(ctx.statuses).find((s) => s.prone)!.id

describe('the rows the rule is shown on', () => {
  it('two counterattack powers with different riders, and a fend', () => {
    expect(ABILITIES[LONG]!.effects!.map((e) => (e as { stat?: string }).stat)).toEqual(['counterattack', 'counterattackAccuracy'])
    expect(ABILITIES[GREAT]!.effects!.map((e) => (e as { stat?: string }).stat)).toEqual(['counterattack', 'strength'])
    expect(ABILITIES[FEND]!.effects!.map((e) => (e as { stat?: string }).stat)).toContain('fend')
  })
})

describe('a new counterattack replaces the old one', () => {
  it('the same power used again while it is up: Counterattack 1 and +10, not 2 and +20 — the old two modifiers end first, and the log says why', () => {
    const { ctx, h } = rig()
    use(ctx, h, LONG)
    const from = ctx.events.length
    use(ctx, h, LONG, true)
    expect(stat(ctx, h, 'counterattack')).toBe(1)
    expect(stat(ctx, h, 'counterattackAccuracy')).toBe(10)
    const after = ctx.events.slice(from)
    expect(ended(after)).toEqual([['counterattack', 1, LONG, 'replaced', 'counterattack'], ['counterattackAccuracy', 10, LONG, 'replaced', 'counterattack']])
    // the old ones end before the new ones are put on, and both name the power that did it
    const lastEnd = after.map((e) => e.type).lastIndexOf('statmod.expired'), firstAdd = after.findIndex((e) => e.type === 'statmod.added')
    expect(lastEnd).toBeLessThan(firstAdd)
    for (const e of after.filter((x) => x.type === 'statmod.expired')) expect(e.causeId).toBe(LONG)
    expect(h.mods.filter((m) => m.stat === 'counterattack' || m.stat === 'counterattackAccuracy')).toHaveLength(2)
  })

  it('a different power: only the second\'s bonus — the Longsword\'s +10 Accuracy goes, the Great Sword\'s +2 Strength stands', () => {
    const { ctx, h } = rig()
    const strength = stat(ctx, h, 'strength')
    use(ctx, h, LONG)
    use(ctx, h, GREAT, true)
    expect(stat(ctx, h, 'counterattack')).toBe(1)
    expect(stat(ctx, h, 'counterattackAccuracy')).toBe(0)
    expect(stat(ctx, h, 'strength')).toBe(strength + 2)
  })

  it('the older power\'s other riders go with it: the Great Sword\'s +2 Strength is not kept under the Longsword\'s, nor summed by a second use', () => {
    const { ctx, h } = rig()
    const strength = stat(ctx, h, 'strength')
    use(ctx, h, GREAT)
    use(ctx, h, GREAT, true)
    expect(stat(ctx, h, 'strength'), 'used twice: +2, not +4').toBe(strength + 2)
    const from = ctx.events.length
    use(ctx, h, LONG, true)
    expect(stat(ctx, h, 'strength')).toBe(strength)
    expect(stat(ctx, h, 'counterattackAccuracy')).toBe(10)
    expect(ended(ctx.events.slice(from))).toEqual([['counterattack', 1, GREAT, 'replaced', 'counterattack'], ['strength', 2, GREAT, 'replaced', 'counterattack']])
  })

  it('the answer he gives is the newer one\'s: after the Great Sword\'s replaces the Longsword\'s, his counterattack rolls without the +10', () => {
    const { ctx, h, z } = rig()
    use(ctx, h, LONG)
    use(ctx, h, GREAT, true)
    const own = preview(ctx, h.id, z.id, SLASH)
    beginActivation(ctx, z.id, 'test')
    performAttack(ctx, z.id, h.id, z.actions.find((a) => ctx.actions[a]?.attack?.kind === 'melee')!)
    const swing = ctx.events.find((e) => e.type === 'attack.declared' && e.actor === h.id && e['as'] === 'counterattack')!
    expect(swing).toBeDefined()
    expect(swing['hitChance']).toBe(Math.max(0, Math.min(100, own.accuracy - 20)))
  })

  it('a modifier another thing put on him is not the old counterattack\'s and stays', () => {
    const { ctx, h } = rig()
    const strength = stat(ctx, h, 'strength')
    h.mods.push({ stat: 'strength', op: 'add', value: 1, source: 'test.other', scope: 'unit' })
    use(ctx, h, GREAT)
    use(ctx, h, LONG, true)
    expect(stat(ctx, h, 'strength')).toBe(strength + 1)
  })
})

describe('knocked down, knocked back or moved: it is lost', () => {
  it('knocked back a hex by an enemy: Counterattack and its Accuracy are gone, each with a line that says why — after the line that moved him', () => {
    const { ctx, h, z } = rig()
    use(ctx, h, LONG)
    const from = ctx.events.length, was = h.hex
    executeKnockback(ctx, z.id, h.id, 1, 'test.shove')
    expect(h.hex).not.toBe(was)
    expect(stat(ctx, h, 'counterattack')).toBe(0)
    expect(stat(ctx, h, 'counterattackAccuracy')).toBe(0)
    const after = ctx.events.slice(from)
    expect(ended(after)).toEqual([['counterattack', 1, LONG, 'knocked-back', 'counterattack'], ['counterattackAccuracy', 10, LONG, 'knocked-back', 'counterattack']])
    expect(after.findIndex((e) => e.type === 'knocked')).toBeLessThan(after.findIndex((e) => e.type === 'statmod.expired'))
    for (const e of after.filter((x) => x.type === 'statmod.expired')) expect(e.causeId).toBe('test.shove')
  })

  it('and it stays lost: an enemy that then swings at him from the next hex is not answered', () => {
    const { ctx, h, z } = rig()
    use(ctx, h, LONG)
    executeKnockback(ctx, z.id, h.id, 1, 'test.shove')
    z.hex = ctx.geo.neighbours(h.hex).find((n: number) => !ctx.state.units.some((u) => u.hex === n))!
    beginActivation(ctx, z.id, 'test')
    performAttack(ctx, z.id, h.id, z.actions.find((a) => ctx.actions[a]?.attack?.kind === 'melee')!)
    expect(provokes(ctx, 'counterattack')).toEqual([])
  })

  it('knocked down: lost at the line that puts him down', () => {
    const { ctx, h } = rig()
    use(ctx, h, LONG)
    const from = ctx.events.length
    applyStatus(ctx, h.id, prone(ctx), 1, 'test.trip')
    expect(stat(ctx, h, 'counterattack')).toBe(0)
    const after = ctx.events.slice(from)
    expect(ended(after)).toEqual([['counterattack', 1, LONG, 'knocked-down', 'counterattack'], ['counterattackAccuracy', 10, LONG, 'knocked-down', 'counterattack']])
    expect(after.findIndex((e) => e.type === 'unit.proned')).toBeLessThan(after.findIndex((e) => e.type === 'statmod.expired'))
  })

  it('what is lost is the counterattack: the Great Sword\'s +2 Strength, its own clause, stays until its own end', () => {
    const { ctx, h, z } = rig()
    const strength = stat(ctx, h, 'strength')
    use(ctx, h, GREAT)
    executeKnockback(ctx, z.id, h.id, 1, 'test.shove')
    expect(stat(ctx, h, 'counterattack')).toBe(0)
    expect(stat(ctx, h, 'strength')).toBe(strength + 2)
  })

  it('his own movement loses nothing; nor does a unit with no counterattack up write a line', () => {
    const { ctx, h, z } = rig()
    use(ctx, h, LONG)
    const free = ctx.geo.neighbours(h.hex).find((n: number) => !ctx.state.units.some((u) => u.hex === n))!
    moveUnit(ctx, h.id, free, 1, 'test.walk', 'terrain.open')
    expect(stat(ctx, h, 'counterattack')).toBe(1)
    const from = ctx.events.length
    executeKnockback(ctx, h.id, z.id, 1, 'test.shove')   // the zombie has nothing up
    expect(ended(ctx.events.slice(from))).toEqual([])
  })

  it('a counterattack that is the unit\'s own — on its row or its gear, not put up by a power — is not a thing that can be knocked off', () => {
    const { ctx, h, z } = rig()
    h.counterattack = 1
    executeKnockback(ctx, z.id, h.id, 1, 'test.shove')
    expect(stat(ctx, h, 'counterattack')).toBe(1)
  })
})

describe('Fend follows the same two rules', () => {
  it('used again while up: Fend 1, not 2; knocked back: gone, and the line says it was the fend', () => {
    const { ctx, h, z } = rig()
    use(ctx, h, FEND)
    use(ctx, h, FEND, true)
    expect(stat(ctx, h, 'fend')).toBe(1)
    expect(h.mods.filter((m) => m.stat === 'fend')).toHaveLength(1)
    const from = ctx.events.length
    executeKnockback(ctx, z.id, h.id, 1, 'test.shove')
    expect(stat(ctx, h, 'fend')).toBe(0)
    expect(ended(ctx.events.slice(from)).map((r) => [r[0], r[3], r[4]])).toContainEqual(['fend', 'knocked-back', 'fend'])
  })

  it('a fend and a counterattack are two things: putting one up does not take the other down; a knock takes both', () => {
    const { ctx, h, z } = rig()
    use(ctx, h, LONG)
    use(ctx, h, FEND, true)
    expect([stat(ctx, h, 'counterattack'), stat(ctx, h, 'fend')]).toEqual([1, 1])
    executeKnockback(ctx, z.id, h.id, 1, 'test.shove')
    expect([stat(ctx, h, 'counterattack'), stat(ctx, h, 'fend')]).toEqual([0, 0])
  })
})

describe('Thorns answers a hit from an ADJACENT melee attacker', () => {
  const AXE = 'attack.test-warrior.axe'
  /** A warrior whose axe reaches 2 hexes (this battle's own copy of the row), and a briar zombie (Thorns 3) `gap` hexes away; a sure hit, no crits, no Block. */
  function duel(gap: number) {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-thorns-briar', hex: hexId(5 + gap, 5) }], { strict: true, cfg: { switches: { critEnabled: false } as never } })
    for (const u of ctx.state.units) { u.triggers = []; u.block = 0; u.rangedBlock = 0; u.hp = u.maxHp = 100 }
    const at = ctx.state.units[0]!, tg = ctx.state.units[1]!
    at.accuracy = 500
    // every melee attack in the registry reaches 1 hex today (a wall or a tower lends more); the rig's axe is the cohort axe with a long haft
    ;(ctx.actions as Record<string, unknown>)[AXE] = { ...ctx.actions[AXE]!, id: AXE, range: 2 }
    beginActivation(ctx, at.id, 'test')
    return { ctx, at, tg }
  }
  const reflected = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'thorns.reflected')

  it('beside it: the hit costs the attacker 3, and the preview said so', () => {
    const { ctx, at } = duel(1)
    expect(preview(ctx, 0, 1, AXE).thornsOnHit).toBe(3)
    expect(performAttack(ctx, 0, 1, AXE).hit).toBe(true)
    expect(at.hp).toBe(97)
    expect(reflected(ctx)).toHaveLength(1)
  })

  it('two hexes away with a reach weapon: the hit lands and costs him nothing, and the preview said nothing', () => {
    const { ctx, at } = duel(2)
    expect(ctx.geo.distance(at.hex, ctx.state.units[1]!.hex)).toBe(2)
    expect(preview(ctx, 0, 1, AXE).thornsOnHit).toBe(0)
    expect(performAttack(ctx, 0, 1, AXE).hit).toBe(true)
    expect(at.hp).toBe(100)
    expect(reflected(ctx)).toEqual([])
  })
})
