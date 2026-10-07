// content.impersonation-badge (2026-10-06). Ruled 2026-10-06 (Andrew, DECISIONS.md 'the one-use rules: most are cut or
// reworded onto rules the engine already has; a handful are built'): "Impersonation is something we want. However, this also
// needs the class power. I think it gives you a badge, so I think we turn this into a badge, and this class power gives that
// badge." badge.impersonation is a row of the registry; the Trickster's Impersonation grants it, by the engine's badge.grant,
// and the log says so. What the badge DOES is named on its row and built by nobody here: lifting class restrictions is the
// kingdom's Equip, and "enemies choose targets as though this were a hero" waits on the design of the enemy's thinking
// (the same day: "AI hasn't really been designed yet") - SWITCHES.md impersonationBadgeUnbuilt.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { settle } from '../src/core/settle.js'
import { canUsePower, usePower } from '../src/core/ability.js'
import { beginActivation } from '../src/core/mutate.js'
import { ABILITIES, BADGES } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'

const POWER = 'power.trickster.impersonation', BADGE = 'badge.impersonation'
const TRICKSTER = { level: 3, specialtyId: 'specialty.trickster', powers: [POWER] }

describe('the rows', () => {
  it('badge.impersonation: no stat and no flag; its two lines are named, as what is not built', () => {
    expect(BADGES[BADGE]).toMatchObject({ id: BADGE, name: 'Impersonation', statModifiers: {}, grants: [], flags: {} })
    expect(BADGES[BADGE]!.gaps).toEqual(['satisfies every class restriction on the items carried', 'enemies choose targets as though this were a hero', 'not a civilian'])
  })
  it('the Trickster\'s Impersonation grants it to the one who uses it, and leaves nothing unread', () => {
    expect(ABILITIES[POWER]).toMatchObject({ id: POWER, name: 'Impersonation', staminaCost: 0, cooldown: 8, warmup: 3, target: { select: 'self', side: 'any' } })
    expect(ABILITIES[POWER]!.effects).toEqual([{ kind: 'badge.grant', badgeId: BADGE, who: 'self' }])
    expect(ABILITIES[POWER]!.gaps ?? []).toEqual([])
  })
})

describe('used', () => {
  it('after its warm-up a Trickster uses it and holds the badge; the log says who gained what, from which power, and what is not built', () => {
    const ctx = createBattle({ replicate: 0, mapId: 'map.open', heroes: ['hero.fixed.orphans'], heroHexes: [85], heroProgress: [TRICKSTER], enemies: ['unit.zombie'], enemyHexes: [95], enemyCount: 1 })
    const hero = ctx.state.units.find((u) => u.side === 'hero')!
    beginActivation(ctx, hero.id, 'test')
    expect(canUsePower(ctx, hero.id, hero.id, POWER), 'warming up on Turn 0').toBe(false)
    ctx.state.turn = 4
    expect(canUsePower(ctx, hero.id, hero.id, POWER)).toBe(true)
    expect(hero.badges).not.toContain(BADGE)
    usePower(ctx, hero.id, hero.id, POWER); settle(ctx, POWER)
    expect(hero.badges).toContain(BADGE)
    const lines = ctx.events.filter((e) => e.type === 'badge.gained')
    expect(lines.map((e) => [e.causeId, e.actor, e['badgeId'], e['name'], e['gaps']])).toEqual([[POWER, hero.id, BADGE, 'Impersonation', BADGES[BADGE]!.gaps]])
    // a badge already carried is not granted twice
    hero.cooldowns[POWER] = 0
    beginActivation(ctx, hero.id, 'test')
    usePower(ctx, hero.id, hero.id, POWER); settle(ctx, POWER)
    expect(hero.badges.filter((b) => b === BADGE)).toEqual([BADGE])
  })
})

describe('in a real battle', () => {
  it('test.impersonation: the orphans, with nothing in reach once the power is ready, take the badge', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.impersonation']!))
    runBattle(ctx)
    const orphans = ctx.state.units.find((u) => u.typeId === 'hero.fixed.orphans')!
    const used = ctx.events.filter((e) => e.type === 'power.used' && e['abilityId'] === POWER)
    expect(used.map((e) => e.actor)).toEqual([orphans.id])
    expect(used[0]!.turn).toBeGreaterThanOrEqual(4)                     // past its warm-up of 3
    expect(ctx.events.filter((e) => e.type === 'badge.gained' && e['badgeId'] === BADGE).map((e) => [e.causeId, e.actor])).toEqual([[POWER, orphans.id]])
  })
})
