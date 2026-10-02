// rule.afflictions-at-zero (2026-10-02) — the engine half of DECISIONS.md 2026-10-01 'the afflictions at 0 Health' and
// 'bleed-out is a stat on every player unit, 5; Rotting Flesh +5'. Andrew: "When a vampire- or werewolf-badged player
// unit goes to zero health, rather than making a deathbed check, they are going to transform into a werewolf or a
// vampire ... make a luck check" · "If they stayed on your side, they don't [bleed out]. They just die" · "if they went
// over to the enemy side ... you basically need to beat them down, and then they're bleeding out" · "Possessed hero ...
// No deathbed roll. They just go down. They're bleeding out, and then a ghost with their image is going to appear" ·
// "if you're rotting flesh and you're taken to zero, you're going to gain a badge: Fragile. Gives you -1 maximum health"
// · "They're back to their normal self."
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { bleedOutCounterOf, settle } from '../src/core/settle.js'
import { grantBadge, setOutcome } from '../src/core/mutate.js'
import { saveBattle, restoreBattle } from '../src/core/snapshot.js'
import { applyBadges } from '../src/core/items.js'
import { BADGES, UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from './board16.js'

const HERO = 'hero.base.warrior-iron'
type Ctx = ReturnType<typeof createCustomBattle>
const field = (badges: string[], luck = 0) => {
  // a second hero far off, so one hero turning to the enemy side is not yet a lost battle
  const ctx = createCustomBattle([{ type: HERO, hex: hexId(5, 5) }, { type: HERO, hex: hexId(1, 14) }], [{ type: 'test-zombie', hex: hexId(12, 12) }])
  const h = ctx.state.units[0]!
  for (const b of badges) grantBadge(ctx, h.id, b, 'test')
  h.luck = luck
  return { ctx, h }
}
const drop = (ctx: Ctx, id: number) => { ctx.state.units[id]!.hp = 0; settle(ctx, 'test') }
const after = (ctx: Ctx, n: number) => ctx.events.slice(n)

describe('Vampirism and Lycanthropy: no Deathbed roll — the hero transforms and rolls Luck', () => {
  for (const [badge, into] of [['badge.vampirism', 'unit.vampire'], ['badge.lycanthropy', 'unit.werewolf']] as const) {
    it(`${badge}, Luck 100: a player-side ${into} at full Health with the bestiary's powers and no hero gear; at 0 again the hero dies, no bleed-out`, () => {
      const { ctx, h } = field([badge], 100)
      const heroType = h.typeId, heroMaxHp = h.maxHp
      expect(h.loadout).toBeDefined()   // the hero carries its kit before
      const n = ctx.events.length
      drop(ctx, h.id)
      const lines = after(ctx, n)
      expect(lines.some((e) => e.type === 'deathbed.stood' || e.type === 'deathbed.fell')).toBe(false)
      expect(lines.find((e) => e.type === 'deathbed.none')).toMatchObject({ reason: 'affliction', badgeId: badge })
      const t = lines.find((e) => e.type === 'unit.transformed')!
      expect(t).toMatchObject({ actor: h.id, badgeId: badge, from: heroType, into, side: 'hero', chance: 100, kept: true })
      expect(h).toMatchObject({ typeId: into, side: 'hero', lifeState: 'standing', name: 'H0' })
      expect(h.hp).toBe(h.maxHp)
      expect(h.maxHp).toBe(UNITS[into]!.maxHp)
      expect(h.actions).toEqual([...UNITS[into]!.attacks, ...UNITS[into]!.abilities, ...UNITS[into]!.moves])
      expect(h.loadout).toBeUndefined()   // "no hero gear"
      expect(h.mods).toEqual([])
      expect(h.transformed).toMatchObject({ badgeId: badge, into, original: { typeId: heroType, maxHp: heroMaxHp } })
      // at 0 again: dead in the hero's own form, a corpse, never downed, no bleed-out
      const m = ctx.events.length
      drop(ctx, h.id)
      expect(h).toMatchObject({ typeId: heroType, side: 'hero', lifeState: 'dead', bleedOut: 0 })
      expect(h.transformed).toBeUndefined()
      expect(after(ctx, m).find((e) => e.type === 'unit.reverted')).toMatchObject({ actor: h.id, from: into, into: heroType, reason: 'fell' })
      expect(after(ctx, m).find((e) => e.type === 'life.dead')).toMatchObject({ target: h.id, reason: 'transformed' })
      expect(after(ctx, m).some((e) => e.type === 'life.downed' || e.type === 'bleedout.set')).toBe(false)
      expect(ctx.state.corpses?.some((c) => c.uid === h.uid && c.typeId === heroType)).toBe(true)
    })

    it(`${badge}, Luck 0: always turns — an enemy ${into}; beaten to 0 it falls in the hero's form and bleeds out from its bleed-out stat`, () => {
      const { ctx, h } = field([badge], 0)
      const heroType = h.typeId
      drop(ctx, h.id)
      expect(ctx.events.find((e) => e.type === 'unit.transformed')).toMatchObject({ side: 'enemy', chance: 0, kept: false })
      expect(h).toMatchObject({ typeId: into, side: 'enemy', rowSide: 'enemy', lifeState: 'standing' })
      expect(h.hp).toBe(UNITS[into]!.maxHp)
      drop(ctx, h.id)
      expect(h).toMatchObject({ typeId: heroType, side: 'hero', lifeState: 'downed' })
      expect(h.bleedOut).toBe(bleedOutCounterOf(h))
      expect(h.bleedOut).toBe(5)
      expect(h.badges).toContain(badge)   // the hero it falls back into still carries its affliction
    })
  }

  it('the chance is the Luck stat as a percentage, rolled on its own cup keyed by the unit and its count of goes to 0', () => {
    const rolls = [0, 1, 2, 3].map((r) => {
      const ctx = createCustomBattle([{ type: HERO, hex: hexId(5, 5) }, { type: HERO, hex: hexId(1, 14) }], [{ type: 'test-zombie', hex: hexId(12, 12) }], { replicate: r })
      const h = ctx.state.units[0]!
      grantBadge(ctx, h.id, 'badge.vampirism', 'test')
      h.luck = 40
      drop(ctx, h.id)
      const t = ctx.events.find((e) => e.type === 'unit.transformed')!
      expect(t['chance']).toBe(40)
      expect(t['kept']).toBe((t['roll'] as number) <= 40)
      expect(ctx.rng.log.some((x) => x.stream === 'transform' && x.keys[0] === h.uid && x.keys[1] === 1)).toBe(true)
      return t['roll']
    })
    expect(new Set(rolls).size).toBeGreaterThan(1)
  })

  it('a hero transformed when the battle ends is back to normal: its own form, its own side, standing, nothing else', () => {
    const { ctx, h } = field(['badge.vampirism'], 100)
    const heroType = h.typeId, heroMaxHp = h.maxHp
    drop(ctx, h.id)
    expect(h.typeId).toBe('unit.vampire')
    setOutcome(ctx, 'heroClear', 'test')
    expect(h).toMatchObject({ typeId: heroType, side: 'hero', lifeState: 'standing', hp: heroMaxHp, maxHp: heroMaxHp })
    const i = ctx.events.findIndex((e) => e.type === 'unit.reverted')
    expect(ctx.events[i]).toMatchObject({ reason: 'battleEnd', into: heroType })
    expect(i).toBeLessThan(ctx.events.findIndex((e) => e.type === 'battle.end'))
  })

  it('a transformed hero saves and restores (plain data, Law 5b)', () => {
    const { ctx, h } = field(['badge.lycanthropy'], 0)
    drop(ctx, h.id)
    const back = restoreBattle(saveBattle(ctx), ctx)
    expect(back.state.units[h.id]).toEqual(h)
    drop(back, h.id)
    expect(back.state.units[h.id]).toMatchObject({ typeId: HERO, lifeState: 'downed' })
  })
})

describe('Possession: no Deathbed roll — the hero goes down and bleeds out, and a Ghost with its image rises as an enemy', () => {
  it('downed at once with its bleed-out, a summoned Ghost beside it on the enemy side, named for the hero it wears', () => {
    const { ctx, h } = field(['badge.possession'])
    const before = ctx.state.units.length
    drop(ctx, h.id)
    expect(ctx.events.some((e) => e.type === 'deathbed.stood' || e.type === 'deathbed.fell')).toBe(false)
    expect(ctx.events.find((e) => e.type === 'deathbed.none')).toMatchObject({ reason: 'affliction', badgeId: 'badge.possession' })
    expect(h).toMatchObject({ lifeState: 'downed', bleedOut: 5 })
    expect(ctx.state.units.length).toBe(before + 1)
    const ghost = ctx.state.units[before]!
    expect(ghost).toMatchObject({ typeId: 'unit.ghost', side: 'enemy', lifeState: 'standing', summoned: true, maxHp: UNITS['unit.ghost']!.maxHp })
    expect(ctx.geo.distance(ghost.hex, h.hex)).toBe(1)   // the hero's body holds its hex; the Ghost stands up beside it
    expect(ctx.events.find((e) => e.type === 'unit.raised')).toMatchObject({ actor: h.id, raised: ghost.id, image: h.typeId, imageOf: h.uid, side: 'enemy' })
  })
})

describe('Rotting Flesh: Deathbed Fighting as normal (+20 kept), and Fragile each time the hero is taken to 0', () => {
  it('rolls the Deathbed with its +20, gains Fragile (−1 maximum Health) on the way, and stands at the new maximum', () => {
    const { ctx, h } = field(['badge.rotting-flesh'])
    h.toughness = 16   // 100%: the roll stands
    const maxHp = h.maxHp
    drop(ctx, h.id)
    const stood = ctx.events.find((e) => e.type === 'deathbed.stood')!
    expect(stood['sources']).toEqual([{ badgeId: 'badge.rotting-flesh', value: 20 }])
    expect(ctx.events.find((e) => e.type === 'badge.gained' && e['badgeId'] === 'badge.fragile')).toMatchObject({ actor: h.id, atZeroOf: 'badge.rotting-flesh', held: 1, causeId: 'badge.rotting-flesh' })
    expect(h.badges.filter((b) => b === 'badge.fragile')).toHaveLength(1)
    expect(h.maxHp).toBe(maxHp - 1 - 2)   // Fragile −1, Wounded −2
    expect(h.hp).toBe(h.maxHp)
  })

  it('Fragile stacks with no limit: taken to 0 twice, it is held twice — even on the zero that kills', () => {
    const { ctx, h } = field(['badge.rotting-flesh'])
    h.toughness = 16
    drop(ctx, h.id)
    drop(ctx, h.id)   // Wounded now: this zero is fatal, and it still takes Fragile
    expect(h.lifeState).toBe('dead')
    expect(h.badges.filter((b) => b === 'badge.fragile')).toHaveLength(2)
    expect(ctx.events.filter((e) => e.type === 'badge.gained' && e['badgeId'] === 'badge.fragile').map((e) => e['held'])).toEqual([1, 2])
  })

  it('a hero carrying Fragile twice into battle folds it twice; a badge that does not stack is still held once', () => {
    const base = UNITS[HERO]!
    expect(applyBadges(base, ['badge.fragile', 'badge.fragile', 'badge.fragile'], BADGES, 't').def.maxHp).toBe(base.maxHp - 3)
    expect(applyBadges(base, ['badge.fragile', 'badge.fragile'], BADGES, 't').def.badges).toEqual(['badge.fragile', 'badge.fragile'])
    expect(applyBadges(base, ['badge.cold-heart', 'badge.cold-heart'], BADGES, 't').def.badges).toEqual(['badge.cold-heart'])
  })

  it('fails the roll and bleeds out over 10 — its +5 counts from the moment it is gained mid-battle', () => {
    const { ctx, h } = field(['badge.rotting-flesh'])
    h.toughness = -20   // the chance floors at 0
    drop(ctx, h.id)
    expect(ctx.events.find((e) => e.type === 'deathbed.fell')).toMatchObject({ chance: 0, bleedsOut: true })
    expect(h).toMatchObject({ lifeState: 'downed', bleedOut: 10 })
    expect(h.badges).toContain('badge.fragile')
  })

  it('every other player unit bleeds out over 5', () => {
    const { ctx, h } = field([])
    h.toughness = -20
    drop(ctx, h.id)
    expect(h).toMatchObject({ lifeState: 'downed', bleedOut: 5 })
    expect(ctx.events.some((e) => e.type === 'badge.gained')).toBe(false)
  })
})

describe('in a battle', () => {
  it('test.afflictions-at-zero-rule: the four afflicted heroes meet a horde; each one\'s 0-Health rule runs, and the battle finishes', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.afflictions-at-zero-rule']!))
    const r = runBattle(ctx)
    expect(r.outcome).toBeTruthy()
    const types = new Set(ctx.events.map((e) => e.type))
    expect(types.has('unit.transformed')).toBe(true)
    expect(ctx.events.some((e) => e.type === 'unit.raised' && e['image'] !== undefined)).toBe(true)
    expect(ctx.events.some((e) => e.type === 'badge.gained' && e['badgeId'] === 'badge.fragile')).toBe(true)
    // the end of the battle leaves no hero in a borrowed form
    expect(ctx.state.units.filter((u) => u.transformed && u.lifeState === 'standing')).toEqual([])
  })
})
