// badge.afflictions (2026-09-04). Angela: "We also need to be able to add the
// badges of the afflictions. Vampires, werewolves, and undead sometimes afflict
// their targets with a badge. Same with ghosts and things that can add
// possession." The bestiary's "inflict an affliction" riders (a named gap since
// 2026-08-26) compile to badge.grant triggers; the badge is the Codex's row.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'
import { performAttack } from '../src/core/pipeline.js'
import { effective } from '../src/core/stats.js'
import { BADGES, UNITS } from '../src/content/index.js'
import { hexId } from './board16.js'

const ROT = 'trigger.zombie.afflict-rotting-flesh', LYC = 'trigger.werewolf.afflict-lycanthropy', VAMP = 'trigger.vampire.afflict-vampirism'

describe('the riders compile', () => {
  it('five bestiary riders are badge.grant triggers at their authored chances, naming Codex badge rows', () => {
    const all = Object.values(UNITS).flatMap((u) => (u.triggers ?? []).map((t) => ({ unit: u.typeId, ...t })))
    const grants = all.filter((t) => t.effect.kind === 'badge.grant')
    expect(grants.map((t) => t.id).sort()).toEqual([ROT, VAMP, LYC, 'trigger.vampire-lord.afflict-vampirism', 'trigger.zombie-hound.afflict-rotting-flesh'].sort())
    for (const t of grants) {
      const e = t.effect as { kind: 'badge.grant'; badgeId: string }
      expect(BADGES[e.badgeId], `${t.id} names ${e.badgeId}`).toBeDefined()
      expect(['onHit', 'onDamage'], `${t.id} hook`).toContain(t.hook)   // as the bestiary authored each: the zombie's claw onHit, the rest onDamage
    }
    // LAW 10 — 2026-09-05 (content 3cfc13a): Angela ruled "In content, zombies have
    // a 10% chance of inflicting rotting flesh. Let's change that to 2%." The claim
    // (the rider fires at its AUTHORED chance) is unchanged; the authored number is.
    expect(all.find((t) => t.id === ROT)!.chance).toBe(2)
    expect(all.find((t) => t.id === LYC)!.chance).toBe(10)
    expect(all.find((t) => t.id === VAMP)!.chance).toBe(20)
  })
})

describe('an affliction lands', () => {
  it('a zombie\'s claw that afflicts gives the hero Rotting Flesh — +8 Health, +1 Armor, −2 Movement, −10 Accuracy — once, and the number the preview promised still lands', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'unit.zombie', hex: hexId(5, 6) }], { cfg: { switches: { critEnabled: false } as never } })
    const w = ctx.state.units[0]!, z = ctx.state.units[1]!
    w.hp = 30; w.maxHp = 30
    z.mods.push({ stat: 'accuracy', op: 'add', value: 200, source: 'test', scope: 'unit' })
    const armor0 = effective(ctx, w, 'armor').value, acc0 = effective(ctx, w, 'accuracy').value
    let afflicted = false
    for (let i = 0; i < 40 && !afflicted; i++) {
      beginActivation(ctx, z.id, 'test')
      performAttack(ctx, z.id, w.id, 'attack.zombie.claw')
      afflicted = w.badges.includes('badge.rotting-flesh')
    }
    expect(afflicted).toBe(true)
    expect(effective(ctx, w, 'armor').value).toBe(armor0 + 1)
    expect(effective(ctx, w, 'accuracy').value).toBe(acc0 - 10)
    expect(w.maxHp).toBe(38)
    expect(ctx.events.filter((e) => e.type === 'badge.gained' && e['badgeId'] === 'badge.rotting-flesh').length).toBe(1)
    // the swing that afflicted: its damage line matches the preview taken before the badge (Law 1)
    const gained = ctx.events.find((e) => e.type === 'badge.gained')!
    const dmg = ctx.events.find((e) => e.type === 'damage.applied' && e.seq > gained.seq)!
    const declared = [...ctx.events].reverse().find((e) => e.type === 'attack.declared' && e.seq < gained.seq)!
    expect(dmg['amount']).toBe(declared['damageOnHit'])
  })

  it('a second claw does not afflict twice', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'unit.zombie', hex: hexId(5, 6) }])
    const w = ctx.state.units[0]!, z = ctx.state.units[1]!
    w.hp = 99; w.maxHp = 99
    z.mods.push({ stat: 'accuracy', op: 'add', value: 200, source: 'test', scope: 'unit' })
    for (let i = 0; i < 60; i++) { beginActivation(ctx, z.id, 'test'); performAttack(ctx, z.id, w.id, 'attack.zombie.claw') }
    expect(w.badges.filter((b) => b === 'badge.rotting-flesh').length).toBeLessThanOrEqual(1)
    expect(ctx.events.filter((e) => e.type === 'badge.gained').length).toBeLessThanOrEqual(1)
  })

  it('live — a zombie afflicts a hero somewhere in the standard battle\'s first seeds', () => {
    let seen = 0
    for (let r = 0; r < 12 && !seen; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, mapId: 'map.open' })
      runBattle(ctx)
      seen += ctx.events.filter((e) => e.type === 'badge.gained' && e['badgeId'] === 'badge.rotting-flesh').length
    }
    expect(seen).toBeGreaterThan(0)
  })
})
