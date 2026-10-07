// content.one-use-class-powers-reworded (2026-10-06). Ruled 2026-10-06 (Andrew, DECISIONS.md 'the one-use rules: most are cut
// or reworded onto rules the engine already has; a handful are built'): "A ton of these things can be done in other ways that
// fit within our mechanics." "We can reuse the things we already have." The class powers whose rule only one row used say
// only what other rows say now (content 7c6e522; SWITCHES.md 'content.one-use-*'). Most of them were named gaps in the engine
// and still are; what reaches a battle is held here. Of Take Root he said: "the idea is that you don't move and you get a
// bonus. What we do instead is we give -5 move and a bonus until the end of your next activation."
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { settle } from '../src/core/settle.js'
import { usePower } from '../src/core/ability.js'
import { beginActivation, endActivation, expireActivationMods } from '../src/core/mutate.js'
import { effective } from '../src/core/stats.js'
import { ABILITIES } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Unit } from '../src/core/types.js'

const ROOT = 'power.sentinel.take-root', WATCH = 'power.sentinel.overwatch'
const SENTINEL = { level: 3, specialtyId: 'specialty.sentinel', powers: [ROOT, WATCH] }
/** A Sentinel holding both powers, one zombie far away. */
function field(): { ctx: Ctx; ranger: Unit } {
  const ctx = createBattle({ replicate: 0, mapId: 'map.open', heroes: ['hero.base.ranger-aggressive'], heroHexes: [85], heroProgress: [SENTINEL], enemies: ['unit.zombie'], enemyHexes: [95], enemyCount: 1 })
  return { ctx, ranger: ctx.state.units.find((u) => u.side === 'hero')! }
}
/** One Activation of unit `id`, then its end - the ladder's own order. */
function activate(ctx: Ctx, id: number, during?: () => void): void {
  beginActivation(ctx, id, 'test'); during?.(); endActivation(ctx, id, 'test'); expireActivationMods(ctx, id, 'activation.end')
}
const stats = (ctx: Ctx, u: Unit): [number, number] => [effective(ctx, u, 'movement').value, effective(ctx, u, 'accuracy').value]

describe('the rows', () => {
  it('Take Root: free, 1 Stamina, on its user - 5 Movement lost and +20 Accuracy, both until the end of her next Activation', () => {
    expect(ABILITIES[ROOT]).toMatchObject({ id: ROOT, name: 'Take Root', free: true, staminaCost: 1, cooldown: 0, target: { select: 'self', side: 'any' } })
    expect(ABILITIES[ROOT]!.effects).toEqual([
      { kind: 'statMod', stat: 'movement', value: -5, until: 'endOfNextActivation', who: 'self' },
      { kind: 'statMod', stat: 'accuracy', value: 20, until: 'endOfNextActivation', who: 'self' },
    ])
    // what the engine still cannot say is named: the bonus is the unit's, not only its ranged attacks'
    expect(ABILITIES[ROOT]!.gaps).toEqual(['modifies only ranged attacks — engine applies it to the unit'])
  })
  it('Overwatch is a bonus to its holder for a window - no shot on an enemy\'s movement', () => {
    expect(ABILITIES[WATCH]!.effects).toEqual([
      { kind: 'statMod', stat: 'crit', value: 10, until: 'endOfNextTurn', who: 'self' },
      { kind: 'statMod', stat: 'reach', value: 1, until: 'endOfNextTurn', who: 'self' },
    ])
  })
  it('Guidance is aimed at its caster and lends nothing to an ally; Impersonation and the rest keep their ids', () => {
    expect(ABILITIES['power.mystic.guidance']!.target).toEqual({ select: 'self', side: 'any' })
    for (const id of ['power.demonic-ward.soul-barrier', 'power.protector.take-the-blow', 'power.nightblade.long-knife', 'power.soul-stealer.life-drain', 'power.totem-master.ancestral-anchor',
      'power.redeemer.bear-the-flame', 'power.holy-avenger.succor-of-the-faithful', 'power.seer.foresee-the-blow', 'power.exorcist.sever-the-channel', 'power.witch-hunter.iron-and-salt',
      'power.witch-hunter.hunt', 'power.grand-master.close-ranks', 'power.porter.drop-the-pack', 'power.militia.aim', 'power.trickster.escape', 'power.archivist.identify', 'power.sage.enlighten',
      'power.torchbearer.flare', 'power.nightblade.exsanguinate', 'power.magical-friend.share-senses', 'power.magical-friend.succor']) {
      expect(ABILITIES[id], id).toBeDefined()
      // a row the engine cannot fight says so by name: never an empty power that claims to be whole
      if ((ABILITIES[id]!.effects ?? []).length === 0) expect((ABILITIES[id]!.gaps ?? []).length, id).toBeGreaterThan(0)
    }
  })
})

describe('Take Root, used', () => {
  it('she loses 5 Movement and gains 20 Accuracy for the rest of this Activation and all of her next, and then has neither', () => {
    const { ctx, ranger } = field()
    const [mv, acc] = stats(ctx, ranger)
    activate(ctx, ranger.id, () => {
      const stamina = ranger.stamina
      usePower(ctx, ranger.id, ranger.id, ROOT); settle(ctx, ROOT)
      expect(stamina - ranger.stamina).toBe(1)
      expect(stats(ctx, ranger)).toEqual([mv - 5, acc + 20])
    })
    expect(stats(ctx, ranger), 'between her Activations').toEqual([mv - 5, acc + 20])
    activate(ctx, ranger.id, () => expect(stats(ctx, ranger), 'during her next').toEqual([mv - 5, acc + 20]))
    expect(stats(ctx, ranger), 'after her next Activation ends').toEqual([mv, acc])
    const added = ctx.events.filter((e) => e.type === 'statmod.added' && e.causeId === ROOT).map((e) => [e['stat'], e['value']])
    expect(added).toEqual([['movement', -5], ['accuracy', 20]])
    expect(ctx.events.filter((e) => e.type === 'statmod.expired' && e['source'] === ROOT).map((e) => e['stat'])).toEqual(['movement', 'accuracy'])
  })
  it('the price is never left out: a Sentinel who has planted herself cannot walk', () => {
    const { ctx, ranger } = field()
    beginActivation(ctx, ranger.id, 'test')
    usePower(ctx, ranger.id, ranger.id, ROOT); settle(ctx, ROOT)
    expect(effective(ctx, ranger, 'movement').value).toBeLessThanOrEqual(0)
  })
})

describe('in a real battle', () => {
  it('test.take-root: the Sentinel plants herself on her first Activation, and her shot is rolled with the 20', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.take-root']!))
    runBattle(ctx)
    const ranger = ctx.state.units.find((u) => u.typeId === 'hero.base.ranger-aggressive')!
    const used = ctx.events.filter((e) => e.type === 'power.used' && e['abilityId'] === ROOT)
    expect(used.length).toBeGreaterThan(0)
    expect(used[0]!.turn).toBe(1)
    const shot = ctx.events.find((e) => e.type === 'attack.declared' && e.actor === ranger.id && e.seq > used[0]!.seq && e['kind'] === 'ranged')!
    expect((shot['accLedger'] as { station: string; effectId: string; delta: number }[]).filter((r) => r.effectId === ROOT)).toEqual([{ station: 'BASE_MOD', effectId: ROOT, delta: 20 }])
    // her next Activation begins with the 5 Movement gone
    const next = ctx.events.find((e) => e.type === 'activation.begin' && e.actor === ranger.id && e['ordinal'] === 2)!
    expect(next['movementMods']).toEqual([{ source: ROOT, delta: -5 }])
    expect(next['movePoints']).toBe(0)
  })
})
