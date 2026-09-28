// content.flaming-longsword (2026-09-28): the battle-2 reward, the standard tier-3 Flaming Longsword
// (DECISIONS.md 2026-09-28 'custom weapons are series across base weapons': "let's do a flaming long
// sword, standard tier 3"). The Armory Ledger's Flaming series, tier 3 (approved for now 2026-09-28):
// "Basic attack, on hit: Burn 1 and 2 fire damage." A custom weapon is a series across base weapons,
// so it is the existing tier-3 shape — base + enchant (content/gen/tier3-combinations.json) — with
// `enchant.flaming`, whose triggers fire only with the base's BASIC attack (its first attack). The
// second instance is pure data: the same enchant on the War Axe.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { advanceBattle } from '../src/core/battle.js'
import { executeAction } from '../src/core/commands.js'
import { ITEMS } from '../src/content/index.js'
import type { Event } from '../src/core/types.js'

/** One swing by a warrior carrying `item` at an adjacent zombie, on replicate r: the swing's events. */
// The warrior's Accuracy is lowered (a stat override; it does not change the dice) so misses exist to find.
function swing(item: string, attackId: string, r: number): Event[] {
  const ctx = createBattle({ replicate: r, strict: true, mapId: 'map.open', heroes: ['test-warrior'], heroHexes: [85], heroItems: [[item]],
    enemies: ['test-zombie'], enemyHexes: [86], enemyCount: 1, overrides: { 'test-warrior': { accuracy: 40 } } })
  advanceBattle(ctx)
  const from = ctx.events.length
  expect(executeAction(ctx, { actor: 0, actionId: attackId, target: 1 })).toEqual({ ok: true })
  return ctx.events.slice(from)
}
/** The first replicate whose swing hits (or misses). */
function find(item: string, attackId: string, hit: boolean): Event[] {
  for (let r = 0; r < 200; r++) {
    const ev = swing(item, attackId, r)
    if (ev.some((e) => e.type === 'attack.hit') === hit && (hit || ev.some((e) => e.type === 'attack.miss'))) return ev
  }
  throw new Error(`no ${hit ? 'hit' : 'miss'} in 200 replicates`)
}
const flaming = (ev: Event[], item: string) => ev.filter((e) => String(e.causeId).startsWith(`trigger.${item.replace(/^item\./, '')}`) && e.type !== 'trigger.rolled')
const burnAndFire = (ev: Event[], item: string) => {
  const f = flaming(ev, item)
  const burn = f.filter((e) => e.type === 'status.applied').map((e) => [e['statusId'], e['amount'] ?? e['value']])
  const fire = f.filter((e) => e.type === 'damage.applied').map((e) => [e['damageType'], e['amount']])
  return { burn, fire }
}

describe.each([
  ['item.longsword.flaming', 'Flaming Longsword', 'item.longsword', 'attack.longsword.slash', 'attack.longsword.stab'],
  ['item.war-axe.flaming', 'Flaming War Axe', 'item.war-axe', 'attack.war-axe.chop', 'attack.war-axe.hack'],
])('%s', (item, name, base, basic, other) => {
  it('is the base weapon at tier 3, its attacks unchanged, the Flaming enchant on its basic attack', () => {
    const i = ITEMS[item]!, b = ITEMS[base]!
    expect([i.name, i.tier]).toEqual([name, 3])
    expect(i.grants).toEqual(b.grants)
    expect(i.grants[0]).toBe(basic)
    const added = i.triggers.filter((t) => t.source === item)
    expect(added.map((t) => [t.hook, t.onlyWithAttack, t.effect])).toEqual([
      ['onHit', basic, { kind: 'status.apply', statusId: 'status.burn', value: 1 }],
      ['onHit', basic, { kind: 'damage', amount: 2, damageType: 'fire' }],
    ])
  })

  it('a hit with the basic attack adds 1 Burn and 2 fire damage', () => {
    const ev = find(item, basic, true)
    expect(burnAndFire(ev, item)).toEqual({ burn: [['status.burn', 1]], fire: [['fire', 2]] })
    // the weapon's own damage still lands, from the attack
    expect(ev.some((e) => e.type === 'damage.applied' && e.causeId === basic)).toBe(true)
  })

  it('a miss adds nothing', () => {
    expect(burnAndFire(find(item, basic, false), item)).toEqual({ burn: [], fire: [] })
  })

  it('the other attack adds nothing — only the basic attack burns', () => {
    expect(burnAndFire(find(item, other, true), item)).toEqual({ burn: [], fire: [] })
  })
})
