// capability.deathbed (2026-09-03), REVERSED by fix.deathbed-no-stands
// (2026-09-04). Angela, verbatim: "there are no stands ... Only those with
// the badge Hero bleed out. A civilian who goes down and doesn't have the hero
// badge is just dead and a corpse. Now any player unit rolls deathbed
// fighting. Unless they have the badge Wounded. If they are wounded, then
// they just die. When a player succeeds at deathbed fighting ... they
// immediately gain Wounded ... they gain 1 stamina and 1 equal to whatever
// their stamina recovery is ... and they get placed at maximum hit points."
//
// LAW 10: this file asserted the stand ladder (Fresh → Wounded → Badly
// Wounded, civilians one stand, heroes two) that the ruling reverses. The
// rule now, proved on TEST badges (test.badge.deaths-door has the ruled
// Wounded numbers and the `wounded` flag; test.badge.brand has `bleedsOut`)
// because content owes badge.hero and badge.wounded — the log names that gap.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { deathbedFighting, settle } from '../src/core/settle.js'
import { effective } from '../src/core/stats.js'
import { BADGES, UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from './board16.js'

const DOOR = 'test.badge.deaths-door', BRAND = 'test.badge.brand'
const drop = (ctx: ReturnType<typeof createCustomBattle>, id: number) => { ctx.state.units[id]!.hp = 0; settle(ctx, 'test') }
/** the rules read the roles off ctx — a test points them at the test rows */
const withTestRows = (ctx: ReturnType<typeof createCustomBattle>) => { (ctx as { ruleBadges: { hero: string; wounded: string } }).ruleBadges = { hero: BRAND, wounded: DOOR }; return ctx }

describe('the roll', () => {
  it('Deathbed Fighting is 20 + 5 × Toughness, read off the row; the Iron Dwarf carries Toughness 3', () => {
    expect(UNITS['hero.base.warrior-iron']!.toughness).toBe(3)
    expect(deathbedFighting({ toughness: 3 })).toBe(35)
    expect(deathbedFighting({ toughness: 0 })).toBe(20)
  })

  it('STOOD: Wounded at once (the ruled penalties), 1 + Regen stamina capped, HP = the new max — no stands, no ladder', () => {
    const ctx = withTestRows(createCustomBattle([{ type: 'hero.base.warrior-iron', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }]))
    const w = ctx.state.units[0]!
    w.toughness = 16   // 100%: standing is routine
    w.stamina = 0
    const acc = effective(ctx, w, 'accuracy').value, dodge = effective(ctx, w, 'dodge').value, str = effective(ctx, w, 'strength').value, maxHp = w.maxHp, maxSt = w.maxStamina
    drop(ctx, w.id)
    expect(w.lifeState).toBe('standing')
    expect(w.badges).toContain(DOOR)
    expect(w.maxHp).toBe(maxHp - 2)
    expect(w.hp).toBe(w.maxHp)
    expect(w.maxStamina).toBe(maxSt)   // Wounded no longer touches Max Stamina
    expect(w.stamina).toBe(Math.min(w.maxStamina, 1 + w.staminaRegen))
    expect(effective(ctx, w, 'accuracy').value).toBe(acc - 10)
    expect(effective(ctx, w, 'dodge').value).toBe(dodge - 10)
    expect(effective(ctx, w, 'strength').value).toBe(str - 1)
    expect(effective(ctx, w, 'armor').value).toBe(effective(ctx, w, 'armor').base)   // Armor untouched
    const stood = ctx.events.find((e) => e.type === 'deathbed.stood')!
    expect(stood['chance']).toBe(100)
    expect(stood['badgeId']).toBe(DOOR)
    expect(ctx.events.some((e) => e.type === 'badge.gained' && e['badgeId'] === DOOR)).toBe(true)
    expect(ctx.events.some((e) => e.type === 'stamina.gained' && e['actor'] === w.id)).toBe(true)
  })

  it('WOUNDED at 0: dead, no roll, no bleed-out — "if they are wounded, then they just die"', () => {
    const ctx = withTestRows(createCustomBattle([{ type: 'hero.base.warrior-iron', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }]))
    const w = ctx.state.units[0]!
    w.toughness = 16
    drop(ctx, w.id)
    expect(w.lifeState).toBe('standing')
    drop(ctx, w.id)
    expect(w.lifeState).toBe('dead')
    expect(w.bleedOut).toBe(0)
    expect(ctx.events.some((e) => e.type === 'deathbed.none' && e['reason'] === 'wounded')).toBe(true)
    expect(ctx.events.filter((e) => e.type === 'deathbed.stood' || e.type === 'deathbed.fell').length).toBe(1)
    expect(ctx.state.corpses?.some((c) => c.uid === w.uid)).toBe(true)
  })

  it('FELL with the Hero badge: downed and bleeding out; FELL without it: dead and a corpse', () => {
    const fell = (badges: string[]) => {
      const ctx = withTestRows(createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }]))
      const w = ctx.state.units[0]!
      w.toughness = -4   // 0%: falling is routine
      for (const b of badges) w.badges.push(b)
      drop(ctx, w.id)
      return { w, ctx }
    }
    const hero = fell([BRAND])
    expect(hero.w.lifeState).toBe('downed')
    expect(hero.w.bleedOut).toBeGreaterThan(0)
    expect(hero.ctx.events.find((e) => e.type === 'deathbed.fell')!['bleedsOut']).toBe(true)
    const nobody = fell([])
    expect(nobody.w.lifeState).toBe('dead')
    expect(nobody.ctx.events.find((e) => e.type === 'life.dead' && e['target'] === nobody.w.id)!['reason']).toBe('fell')
    expect(nobody.ctx.state.corpses?.some((c) => c.uid === nobody.w.uid)).toBe(true)
  })

  it('a Wounded hero fielded already Wounded (the kingdom\'s list) dies at 0 with no roll', () => {
    const ctx = withTestRows(createBattle({ replicate: 0, mapId: 'map.open', heroes: ['test-warrior'], heroHexes: [hexId(0, 5)], heroBadges: [[DOOR]], enemies: ['test-zombie'], enemyHexes: [hexId(15, 5)], enemyCount: 1 }))
    const w = ctx.state.units[0]!
    expect(w.badges).toEqual([DOOR])
    drop(ctx, w.id)
    expect(w.lifeState).toBe('dead')
  })

  it('until content authors badge.hero and badge.wounded, the lines NAME the gap and every player unit bleeds as before', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }])
    expect(BADGES[ctx.ruleBadges.hero]?.flags.bleedsOut).toBeUndefined()
    expect(BADGES[ctx.ruleBadges.wounded]?.flags.wounded).toBeUndefined()
    const w = ctx.state.units[0]!
    w.toughness = 16
    drop(ctx, w.id)
    expect(w.lifeState).toBe('standing')
    expect((ctx.events.find((e) => e.type === 'deathbed.stood') as unknown as { gaps: string[] }).gaps[0]).toMatch(/badge\.wounded/)
    w.toughness = -4
    drop(ctx, w.id)
    expect(w.lifeState).toBe('downed')
    expect((ctx.events.find((e) => e.type === 'deathbed.fell') as unknown as { gaps: string[] }).gaps[0]).toMatch(/badge\.hero/)
  })

  it('at Toughness 0 the roll is 20%: across many seeds both STAND and FALL happen', () => {
    const seen = { stood: 0, fell: 0 }
    for (let r = 0; r < 40; r++) {
      const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }], { replicate: r })
      const w = ctx.state.units[0]!
      expect(w.toughness).toBe(0)
      drop(ctx, w.id)
      if (ctx.events.some((e) => e.type === 'deathbed.stood')) seen.stood++
      if (ctx.events.some((e) => e.type === 'deathbed.fell')) seen.fell++
    }
    expect(seen.stood).toBeGreaterThan(0)
    expect(seen.fell).toBeGreaterThan(seen.stood)
  })

  it('it happens in real battles — the standard battle at sixteen zombies shows a roll', () => {
    let rolls = 0
    for (let r = 0; r < 8 && !rolls; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 16, mapId: 'map.open' })
      runBattle(ctx)
      rolls += ctx.events.filter((e) => e.type === 'deathbed.stood' || e.type === 'deathbed.fell').length
    }
    expect(rolls).toBeGreaterThan(0)
  })
})

describe('live', () => {
  it('a hero fielded Wounded dies at 0 with no roll in the showcase battle — no bleed-out, a corpse', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['showcase.wounded-entry']!))
    runBattle(ctx)
    const w = ctx.state.units[0]!
    expect(w.lifeState).toBe('dead')
    expect(ctx.events.some((e) => e.type === 'deathbed.none' && e['target'] === w.id)).toBe(true)
    expect(ctx.events.some((e) => e.type === 'life.downed' && e['target'] === w.id)).toBe(false)
    expect(ctx.events.filter((e) => e.type === 'deathbed.stood' || e.type === 'deathbed.fell').length).toBe(0)
  })
})
