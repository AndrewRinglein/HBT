// capability.unit-trigger-with-tag (2026-10-04). Ruled 2026-10-04 (Andrew, DECISIONS.md 'after the backlog run: ...; a trigger
// on the hero with a tag requirement; ...'): "There's also the ability to have a trigger on a hero itself. That trigger could
// have a tag requirement like melee, so you can add to burn to melee attacks on a hero, and then it only triggers when you're
// using something that has the tag melee."
//
// One field on the trigger - `onlyWithTag` - read where `onlyWithAttack` is (core/trigger.ts fireTriggers): the trigger fires
// only when the attack that caused it carries that tag. With no requirement it fires for every attack of the unit, as before.
// What "carries the tag" means is one function (core/action.ts carriesTag; SWITCHES.md attackHasTag): the tag is among the
// attack row's tags - the Codex attack's own, joined by the pack compiler with its weapon's - and a row that states no tags
// carries its kind, melee or ranged. Proved with content, no code per instance: a test badge that adds Burn to melee attacks,
// the worn Bloodrune Burning Touch (melee), Pharaoh's Gauntlets (brawl), and the Bleeding Strike (no requirement).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { advanceBattle, runBattle } from '../src/core/battle.js'
import { executeAction } from '../src/core/commands.js'
import * as action from '../src/core/action.js'
import { fireTriggers, validateTrigger, type Trigger } from '../src/core/trigger.js'
import { ACTIONS, BADGES, ITEMS, UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { ActionDef, Event } from '../src/core/types.js'

const MELEE_BURN = 'test.badge.melee-burn', ANY_BURN = 'test.badge.any-burn'
const TOUCH = 'item.rune-burning-touch', STRIKE = 'item.rune-bleeding-strike', GAUNTLETS = 'item.pharaohs-gauntlets'
const NEAR = 86, FAR = 88   // beside the hero on 85, and three hexes off (a ranged attack needs the distance)
/** the one reading of "carries the tag" - the item's own function, absent before it */
const carriesTag = (action as unknown as { carriesTag?: (a: ActionDef | undefined, tag: string) => boolean }).carriesTag!

type Field = { hero?: string; items?: string[]; badges?: string[] }
/** One use of `attackId` by a hero at a zombie beside it or three hexes off, on replicate r. He always hits and always crits (stat overrides; the dice are the same). */
function swing(f: Field, attackId: string, at: number, r: number): Event[] {
  const hero = f.hero ?? 'test-warrior'
  const ctx = createBattle({ replicate: r, strict: true, mapId: 'map.open', heroes: [hero], heroHexes: [85], ...(f.items ? { heroItems: [f.items] } : {}), ...(f.badges ? { heroBadges: [f.badges] } : {}),
    enemies: ['test-zombie'], enemyHexes: [at], enemyCount: 1, overrides: { [hero]: { accuracy: 400, crit: 400, maxStamina: 20, stamina: 20 } as never, 'test-zombie': { maxHp: 60, armor: 0, resist: 0 } as never } })
  advanceBattle(ctx)
  const from = ctx.events.length
  expect(executeAction(ctx, { actor: 0, actionId: attackId, target: 1 }), `${attackId} by ${hero} with ${(f.items ?? []).join(' + ') || 'its kit'}`).toEqual({ ok: true })
  return ctx.events.slice(from)
}
/** The first replicate on which the attack lands as a crit that deals damage - every attacker hook but onMiss and onKill has fired. */
function landed(f: Field, attackId: string, at: number): Event[] {
  for (let r = 0; r < 60; r++) {
    const ev = swing(f, attackId, at, r)
    const hit = ev.find((e) => e.type === 'attack.hit' && e.causeId === attackId)
    if (hit && hit['crit'] === true && ev.some((e) => e.type === 'damage.applied' && e.causeId === attackId && (e['amount'] as number) > 0)) return ev
  }
  throw new Error(`${attackId}: no damaging crit in 60 replicates`)
}
/** How often the triggers `source` brought rolled in these events (a roll is logged whether or not it fires). */
const rolls = (ev: Event[], source: string) => ev.filter((e) => e.type === 'trigger.rolled' && e['source'] === source).length
const applied = (ev: Event[], statusId: string, triggerId: string) => ev.filter((e) => e.type === 'status.applied' && e['statusId'] === statusId && e.causeId === triggerId).length

describe('a trigger on the hero with a tag requirement', () => {
  it('the test badge: Burn on a hit with a melee attack, none when the hero shoots - a bow in hand, the Punch its melee', () => {
    expect(BADGES[MELEE_BURN]!.triggers).toEqual([expect.objectContaining({ id: 'trigger.test-melee-burn.burn', hook: 'onHit', onlyWithTag: 'melee', source: MELEE_BURN })])
    const f: Field = { items: ['item.shortbow'], badges: [MELEE_BURN] }
    for (const shot of ITEMS['item.shortbow']!.grants) {
      const ev = landed(f, shot, FAR)
      expect(rolls(ev, MELEE_BURN), shot).toBe(0)
      expect(ev.some((e) => e.type === 'status.applied' && e['statusId'] === 'status.burn'), `${shot} burns nothing`).toBe(false)
    }
    const punch = landed(f, 'attack.punch', NEAR)
    expect(rolls(punch, MELEE_BURN)).toBe(1)
    expect(applied(punch, 'status.burn', 'trigger.test-melee-burn.burn')).toBe(1)
  })

  it('the same hero holding a crossbow in one hand and a dagger in the other: the Stab burns, the bolt does not', () => {
    // a bow is two-handed and the engine refuses it beside a dagger, so the pair in hand is the Hand Crossbow and the Dagger
    expect(() => createBattle({ replicate: 0, strict: true, mapId: 'map.open', heroes: ['test-warrior'], heroHexes: [85], heroItems: [['item.shortbow', 'item.dagger']], enemies: ['test-zombie'], enemyHexes: [NEAR], enemyCount: 1 })).toThrow(/more than two hands/)
    const f: Field = { items: ['item.hand-crossbow', 'item.dagger'], badges: [MELEE_BURN] }
    const stab = landed(f, 'attack.dagger.stab', NEAR)
    expect(rolls(stab, MELEE_BURN)).toBe(1)
    expect(applied(stab, 'status.burn', 'trigger.test-melee-burn.burn')).toBe(1)
    for (const bolt of ITEMS['item.hand-crossbow']!.grants) {
      const ev = landed(f, bolt, FAR)
      expect(rolls(ev, MELEE_BURN), bolt).toBe(0)
      expect(applied(ev, 'status.burn', 'trigger.test-melee-burn.burn'), bolt).toBe(0)
    }
  })

  it('nor when it casts: a mage with the badge burns with its fists, not with its staff', () => {
    const f: Field = { hero: 'hero.base.mage-fire', badges: [MELEE_BURN] }
    const staff = ITEMS['item.fire-staff']!.grants[0]!
    expect(carriesTag(ACTIONS[staff], 'melee')).toBe(false)
    expect(rolls(landed(f, staff, FAR), MELEE_BURN)).toBe(0)
    expect(rolls(landed(f, 'attack.punch', NEAR), MELEE_BURN)).toBe(1)
  })

  it('the same trigger with no requirement fires on both', () => {
    expect(BADGES[ANY_BURN]!.triggers![0]!.onlyWithTag).toBeUndefined()
    const { onlyWithTag: _tag, id: _a, source: _b, ...melee } = BADGES[MELEE_BURN]!.triggers![0]!
    const { id: _c, source: _d, ...any } = BADGES[ANY_BURN]!.triggers![0]!
    expect(any, 'the two badges differ in the requirement and nothing else').toEqual(melee)
    const f: Field = { items: ['item.hand-crossbow', 'item.dagger'], badges: [ANY_BURN] }
    expect(applied(landed(f, 'attack.dagger.stab', NEAR), 'status.burn', 'trigger.test-any-burn.burn')).toBe(1)
    expect(applied(landed(f, ITEMS['item.hand-crossbow']!.grants[0]!, FAR), 'status.burn', 'trigger.test-any-burn.burn')).toBe(1)
  })
})

describe('the rows the Codex words name', () => {
  it('the Burning Touch (worn): "flames lick from every strike" - a melee attack burns, a shot does not', () => {
    expect(ITEMS[TOUCH]!.triggers.map((t) => [t.hook, t.onlyWithTag, t.onlyWithAttack])).toEqual([['onHit', 'melee', undefined]])
    const f: Field = { items: ['item.shortbow', TOUCH] }
    expect(rolls(landed(f, ITEMS['item.shortbow']!.grants[0]!, FAR), TOUCH)).toBe(0)
    const punch = landed(f, 'attack.punch', NEAR)
    expect(applied(punch, 'status.burn', 'trigger.rune-burning-touch.burn')).toBe(1)
    // and with a blade in hand, every melee attack the bearer has
    for (const a of ['attack.dagger.stab', 'attack.test-warrior.axe']) expect(applied(landed({ items: ['item.dagger', TOUCH] }, a, NEAR), 'status.burn', 'trigger.rune-burning-touch.burn'), a).toBe(1)
  })

  it('the Bleeding Strike (worn): "wounds from this bearer" - no requirement, so a crit bleeds by blade and by arrow alike', () => {
    expect(ITEMS[STRIKE]!.triggers.map((t) => [t.hook, t.onlyWithTag, t.onlyWithAttack])).toEqual([['onCrit', undefined, undefined]])
    const f: Field = { items: ['item.shortbow', STRIKE] }
    expect(applied(landed(f, ITEMS['item.shortbow']!.grants[0]!, FAR), 'status.bleed', 'trigger.rune-bleeding-strike.bleed')).toBe(1)
    expect(applied(landed(f, 'attack.punch', NEAR), 'status.bleed', 'trigger.rune-bleeding-strike.bleed')).toBe(1)
  })

  it('Pharaoh\'s Gauntlets: "both hands are the weapon" - Weak on every blow of the hands (the two strikes and a Punch: brawl), not on another melee attack', () => {
    expect(ITEMS[GAUNTLETS]!.triggers.map((t) => [t.hook, t.onlyWithTag, t.onlyWithAttack])).toEqual([['onHit', 'brawl', undefined]])
    const f: Field = { items: [GAUNTLETS] }
    for (const a of [...ITEMS[GAUNTLETS]!.grants, 'attack.punch']) {
      expect(carriesTag(ACTIONS[a], 'brawl'), a).toBe(true)
      const ev = landed(f, a, NEAR), hits = ev.filter((e) => e.type === 'attack.hit' && e.causeId === a).length
      expect(hits, a).toBeGreaterThan(0)
      expect(applied(ev, 'status.weak', 'trigger.pharaohs-gauntlets.weak'), `${a}: once per hit that lands`).toBe(hits)
    }
    // the test warrior's own axe swing is a melee attack and not a blow of the hands
    expect(carriesTag(ACTIONS['attack.test-warrior.axe'], 'melee')).toBe(true)
    expect(carriesTag(ACTIONS['attack.test-warrior.axe'], 'brawl')).toBe(false)
    expect(rolls(landed(f, 'attack.test-warrior.axe', NEAR), GAUNTLETS)).toBe(0)
  })

  it('they are fielded in a real battle: the scenario plays, and each requirement fires there', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.trigger-with-tag']!))
    runBattle(ctx)
    for (const source of [MELEE_BURN, TOUCH, GAUNTLETS]) expect(ctx.events.some((e) => e.type === 'trigger.rolled' && e['source'] === source && e['fired'] === true), source).toBe(true)
    // every roll of a tag-requiring trigger in that battle was for an attack that carries the tag
    const required = new Map(ctx.state.units.flatMap((u) => u.triggers).filter((t) => t.onlyWithTag).map((t) => [t.id, t.onlyWithTag!]))
    expect(required.size).toBeGreaterThanOrEqual(3)
    let checked = 0
    for (const [i, e] of ctx.events.entries()) {
      if (e.type !== 'trigger.rolled' || !required.has(String(e.causeId))) continue
      const cause = [...ctx.events.slice(0, i)].reverse().find((x) => (x.type === 'attack.declared') && x['actor'] === e['actor'])!
      expect(carriesTag(ctx.actions[String(cause.causeId)], required.get(String(e.causeId))!), `${e.causeId} after ${cause.causeId}`).toBe(true)
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  })
})

describe('what "carries the tag" means, and the field', () => {
  it('an attack carries the tags of its row: its own Codex tags and its weapon\'s; a row that states none carries its kind', () => {
    expect(ACTIONS['attack.dagger.stab']!.tags).toEqual(['dagger', 'melee'])
    expect(ACTIONS['attack.longsword.slash']!.tags).toEqual(['blade', 'melee'])   // 'blade' is the Longsword's
    expect(carriesTag(ACTIONS['attack.longsword.slash'], 'blade')).toBe(true)
    expect(carriesTag(ACTIONS['attack.longsword.slash'], 'ranged')).toBe(false)
    // a row with no tags: the bestiary's claw is a melee attack, and carries that
    const claw = ACTIONS['attack.zombie.claw']!
    expect(claw.tags).toBeUndefined()
    expect([carriesTag(claw, claw.attack!.kind), carriesTag(claw, claw.attack!.kind === 'melee' ? 'ranged' : 'melee')]).toEqual([true, false])
    // where the Codex states the tags, they are the answer: a whip the Codex tags melee is a melee attack for a
    // requirement, though the engine's kind for anything that reaches past the next hex is ranged
    const whip = ACTIONS['attack.demon-whip.crack']!
    expect([whip.attack!.kind, carriesTag(whip, 'melee'), carriesTag(whip, 'ranged')]).toEqual(['ranged', true, false])
    // not an attack, no row: nothing carries anything
    expect(carriesTag(undefined, 'melee')).toBe(false)
    expect(carriesTag(ACTIONS['power.move'], 'melee')).toBe(false)
  })

  it('the requirement is validated at load: a tag is a plain word; a burst\'s hook cannot carry one', () => {
    const t: Trigger = { id: 'trigger.test-x', hook: 'onHit', chance: 100, select: 'target', effect: { kind: 'status.apply', statusId: 'status.burn', value: 1 }, source: 'test.x', onlyWithTag: 'melee' }
    expect(() => validateTrigger(t)).not.toThrow()
    for (const bad of ['', 'Melee', 'tag.melee', 'two words']) expect(() => validateTrigger({ ...t, onlyWithTag: bad }), bad).toThrow(/onlyWithTag/)
    expect(() => validateTrigger({ ...t, hook: 'onBurst', select: 'self' })).toThrow(/onBurst/)
  })

  it('over the whole pack every requirement names a tag of the Codex\'s vocabulary, and an attack\'s tags are all of it too', () => {
    const vocabulary = new Set((JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8')).tags as { id: string }[]).map((t) => t.id.replace(/^tag\./, '')))
    const carriers = [...Object.values(ITEMS), ...Object.values(BADGES), ...Object.values(UNITS)] as { triggers?: readonly Trigger[] }[]
    const required = carriers.flatMap((c) => c.triggers ?? []).filter((t) => t.onlyWithTag !== undefined)
    expect(required.length).toBeGreaterThanOrEqual(3)
    for (const t of required) expect(vocabulary.has(t.onlyWithTag!), `${t.id}: ${t.onlyWithTag}`).toBe(true)
    let tagged = 0
    for (const a of Object.values(ACTIONS)) for (const tag of a.tags ?? []) { expect(vocabulary.has(tag), `${a.id}: ${tag}`).toBe(true); tagged++ }
    expect(tagged).toBeGreaterThan(200)
  })

  it('it joins an attack scope rather than replacing it, and a cause that is no attack never meets it', () => {
    const ctx = createBattle({ replicate: 0, strict: true, mapId: 'map.open', heroes: ['test-warrior'], heroHexes: [85], heroItems: [['item.dagger']], enemies: ['test-zombie'], enemyHexes: [NEAR], enemyCount: 1 })
    advanceBattle(ctx)
    const u = ctx.state.units[0]!
    const base = { hook: 'onHit', chance: 100, select: 'target', effect: { kind: 'status.apply', statusId: 'status.burn', value: 1 }, source: 'test.x' } as const
    u.triggers = [
      Object.freeze({ ...base, id: 'trigger.test-both', onlyWithAttack: 'attack.dagger.stab', onlyWithTag: 'dagger' }),
      Object.freeze({ ...base, id: 'trigger.test-wrong-tag', onlyWithAttack: 'attack.dagger.stab', onlyWithTag: 'ranged' }),
      Object.freeze({ ...base, id: 'trigger.test-wrong-attack', onlyWithAttack: 'attack.punch', onlyWithTag: 'dagger' }),
      Object.freeze({ ...base, id: 'trigger.test-end', hook: 'onActivationEnd', select: 'self', onlyWithTag: 'melee' }),
    ] as Trigger[]
    const rolled = (from: number) => ctx.events.slice(from).filter((e) => e.type === 'trigger.rolled').map((e) => e.causeId)
    let from = ctx.events.length
    fireTriggers(ctx, 'onHit', { ownerId: 0, targetId: 1, causeId: 'attack.dagger.stab', ordinal: 1 })
    expect(rolled(from)).toEqual(['trigger.test-both'])
    from = ctx.events.length
    fireTriggers(ctx, 'onHit', { ownerId: 0, targetId: 1, causeId: 'attack.punch', ordinal: 2 })
    expect(rolled(from)).toEqual([])
    from = ctx.events.length
    fireTriggers(ctx, 'onActivationEnd', { ownerId: 0, targetId: null, causeId: 'engine', ordinal: 0 })
    expect(rolled(from)).toEqual([])
  })
})
