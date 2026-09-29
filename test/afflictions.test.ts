// badge.afflictions (2026-09-04). Angela: "We also need to be able to add the
// badges of the afflictions. Vampires, werewolves, and undead sometimes afflict
// their targets with a badge. Same with ghosts and things that can add
// possession." The bestiary's "inflict an affliction" riders (a named gap since
// 2026-08-26) compile to badge.grant triggers; the badge is the Codex's row.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'
import { performAttack } from '../src/core/pipeline.js'
import { effective } from '../src/core/stats.js'
import { BADGES, UNITS } from '../src/content/index.js'
import { hexId } from './board16.js'

const ROT = 'trigger.zombie.afflict-rotting-flesh', LYC = 'trigger.werewolf.afflict-lycanthropy', VAMP = 'trigger.vampire.afflict-vampirism'

describe('the riders compile', () => {
  // was: 'five bestiary riders are …' — pack.enemy-actions (2026-09-26): every authored rider, however many
  it('every bestiary affliction rider is a badge.grant trigger at its authored chance, naming a Codex badge row', () => {
    const all = Object.values(UNITS).flatMap((u) => (u.triggers ?? []).map((t) => ({ unit: u.typeId, ...t })))
    const grants = all.filter((t) => t.effect.kind === 'badge.grant')
    // LAW 10 — pack.enemy-actions (2026-09-26): the pack now carries the enemy special moves, and the
    // Zombie Hound's Close Bite authors its own rotting-flesh rider, so the riders are six, not five.
    // The claim was never "five": it is that every "inflict an affliction" rider the bestiary authors on
    // a row's own attack or special move compiles to one badge.grant on that unit, scoped to that
    // action, at its authored hook and chance, naming badge.<affliction>. Derived from the Codex rows now.
    // was: expect(grants.map((t) => t.id).sort()).toEqual([ROT, VAMP, LYC, 'trigger.vampire-lord.afflict-vampirism', 'trigger.zombie-hound.afflict-rotting-flesh'].sort())
    type SrcTrig = { hook: string; chance?: number; effects?: { effect: string; affliction?: string }[] }
    type SrcAct = { id?: string; triggers?: SrcTrig[] }
    const codex = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8')) as
      { bestiary: { id: string; attacks?: SrcAct[]; moves?: (string | { id: string; attack?: { triggers?: SrcTrig[] } })[] }[] }
    const key = (unit: string, action: string, hook: string, chance: number, badge: string) => `${unit}|${action}|${hook}|${chance}|${badge}`
    const authored = codex.bestiary.flatMap((u) => [
      ...(u.attacks ?? []).filter((a) => a.id).map((a) => ({ action: a.id!, triggers: a.triggers ?? [] })),
      ...(u.moves ?? []).flatMap((m) => typeof m === 'object' && m.attack ? [{ action: m.id, triggers: m.attack.triggers ?? [] }] : []),
    ].flatMap(({ action, triggers }) => triggers.flatMap((t) => (t.effects ?? []).filter((e) => e.effect === 'inflict an affliction')
      .map((e) => key(u.id, action, t.hook, t.chance ?? 100, `badge.${e.affliction}`)))))
    expect(authored).toContain(key('unit.zombie-hound', 'move.zombie-hound.close-bite', 'onDamage', 2, 'badge.rotting-flesh'))
    expect(grants.map((t) => key(t.unit, t.onlyWithAttack!, t.hook, t.chance, (t.effect as { badgeId: string }).badgeId)).sort()).toEqual(authored.sort())
    expect(grants.map((t) => t.id)).toEqual(expect.arrayContaining([ROT, VAMP, LYC]))
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

  it('live — an authored 2% zombie trigger grants Rotting Flesh when its roll succeeds', () => {
    // Law 10, fix.unit-identities: trigger rolls now key on stable target UID.
    // The first twelve standard seeds no longer happen to include a 2% success.
    // Keep a real-battle fixture with a measured success; assert the roll and
    // resulting grant together instead of treating twelve seeds as a guarantee.
    // Law 10, 2026-09-23 (v2.shields): Block went live on the heroes and replicate 29's
    // success moved. The seed is found, not pinned — the first replicate on this fixture
    // whose 2% roll succeeds. The roll is asserted as a rule (a success at 2% is a roll of
    // 1 or 2), no longer the one seed's exact 1; every other assertion is unchanged.
    let ctx = createBattle({ replicate: 0, enemyCount: 8, mapId: 'map.open' })
    let fired: typeof ctx.events = []
    for (let r = 0; r < 200 && fired.length === 0; r++) {
      ctx = createBattle({ replicate: r, enemyCount: 8, mapId: 'map.open' })
      runBattle(ctx)
      fired = ctx.events.filter(e => e.type === 'trigger.rolled' && e.causeId === ROT && e['fired'])
    }
    expect(fired).toHaveLength(1)
    expect(fired[0]).toMatchObject({ chance: 2 })
    expect(fired[0]!['roll'] as number).toBeLessThanOrEqual(2)
    const gained = ctx.events.filter(e => e.type === 'badge.gained' && e['badgeId'] === 'badge.rotting-flesh')
    expect(gained).toHaveLength(1)
    expect(gained[0]!.seq).toBeGreaterThan(fired[0]!.seq)
  })
})

// content.afflictions-revised (2026-09-29, Andrew, DECISIONS.md 'the four afflictions'):
// "They get +2 strength, +1 precision, +3 health, +1 resist. -1 spirit. ... +1 magic. They gain
// the power of flight. Which uses movement +1" · "Let's have the Vampirism flight cost 2. Stamina."
// · "when the affliction of Vampirism happens, it grants both Cold Heart and Vampirism" · "Cold
// Hard badge gives Immune to Karma 2, Immune to Cold 2, and +2 Health" · "Cold Heart is only those
// who get afflicted." · "Possession gives -10 to action surge per turn."
describe('the afflictions as revised 2026-09-29', () => {
  const BITE = 'attack.vampire.bite'
  function bitten() {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'unit.vampire', hex: hexId(5, 6) }], { cfg: { switches: { critEnabled: false } as never } })
    const w = ctx.state.units[0]!, v = ctx.state.units[1]!
    w.hp = 999; w.maxHp = 999
    v.mods.push({ stat: 'accuracy', op: 'add', value: 200, source: 'test', scope: 'unit' })
    return { ctx, w, v }
  }

  it('one Vampire bite that afflicts grants Vampirism AND Cold Heart on the one roll, and a later bite grants neither again', () => {
    const { ctx, w, v } = bitten()
    const before = { str: effective(ctx, w, 'strength').value, pre: effective(ctx, w, 'precision').value, res: effective(ctx, w, 'resist').value, mag: effective(ctx, w, 'magic').value, spi: effective(ctx, w, 'spirit').value, maxHp: w.maxHp }
    let i = 0
    for (; i < 80 && !w.badges.includes('badge.vampirism'); i++) { beginActivation(ctx, v.id, 'test'); performAttack(ctx, v.id, w.id, BITE) }
    expect(w.badges).toContain('badge.vampirism')
    expect(w.badges).toContain('badge.cold-heart')
    const fired = ctx.events.filter((e) => e.type === 'trigger.rolled' && e.causeId === VAMP && e['fired'])
    expect(fired).toHaveLength(1)   // one roll …
    const gained = ctx.events.filter((e) => e.type === 'badge.gained')
    expect(gained.map((e) => e['badgeId'])).toEqual(['badge.vampirism', 'badge.cold-heart'])   // … two badges, the affliction first
    for (const g of gained) expect(g.causeId).toBe(VAMP)
    // +2 Strength, +1 Precision, +1 Resist, +1 Magic, −1 Spirit; +3 Health (Vampirism) and +2 (Cold Heart)
    expect(effective(ctx, w, 'strength').value).toBe(before.str + 2)
    expect(effective(ctx, w, 'precision').value).toBe(before.pre + 1)
    expect(effective(ctx, w, 'resist').value).toBe(before.res + 1)
    expect(effective(ctx, w, 'magic').value).toBe(before.mag + 1)
    expect(effective(ctx, w, 'spirit').value).toBe(before.spi - 1)
    expect(w.maxHp).toBe(before.maxHp + 5)
    // the flight joins the hero's actions
    expect(w.actions).toContain('power.flight-vampiric')
    for (let k = 0; k < 60; k++) { beginActivation(ctx, v.id, 'test'); performAttack(ctx, v.id, w.id, BITE) }
    expect(w.badges.filter((b) => b === 'badge.cold-heart')).toHaveLength(1)
    expect(ctx.events.filter((e) => e.type === 'badge.gained')).toHaveLength(2)
  })

  it('every Vampirism rider carries Cold Heart with it; no other affliction does, and no enemy carries Cold Heart', () => {
    const grants = Object.values(UNITS).flatMap((u) => u.triggers ?? []).filter((t) => t.effect.kind === 'badge.grant')
    const vamp = grants.filter((t) => (t.effect as { badgeId: string }).badgeId === 'badge.vampirism')
    expect(vamp.length).toBeGreaterThanOrEqual(2)   // the Vampire and the Vampire Lord
    for (const t of vamp) expect((t.effect as { withBadgeIds?: string[] }).withBadgeIds).toEqual(['badge.cold-heart'])
    for (const t of grants.filter((g) => !vamp.includes(g))) expect((t.effect as { withBadgeIds?: string[] }).withBadgeIds).toBeUndefined()
    for (const u of Object.values(UNITS)) expect(u.badges ?? [], u.typeId).not.toContain('badge.cold-heart')
  })

  it('the rows carry the ruled numbers; what the engine cannot yet do is a named gap, never dropped', () => {
    expect(BADGES['badge.vampirism']!.statModifiers).toEqual({ strength: 2, precision: 1, maxHp: 3, resist: 1, magic: 1, spirit: -1 })
    expect(BADGES['badge.vampirism']!.grants).toEqual(['power.flight-vampiric'])
    expect(BADGES['badge.vampirism']!.gaps).toEqual(expect.arrayContaining(['on a melee hit: heal 2', '+15 Deathbed Fighting', 'deploying the hero costs 3 Faith', 'the hero gains half experience']))
    expect(BADGES['badge.cold-heart']!.statModifiers).toEqual({ maxHp: 2 })
    expect(BADGES['badge.cold-heart']!.gaps).toEqual(expect.arrayContaining(['immune to Karma', 'immune to Cold (cold damage and the Frost status)']))
    expect(BADGES['badge.possession']!.statModifiers).toEqual({ magic: 2, resist: 1, vision: 3, surge: -10 })
    expect(BADGES['badge.possession']!.gaps).toEqual(expect.arrayContaining(['−10 Deathbed Fighting', 'deploying the hero costs 3 Mana']))
    expect(BADGES['badge.rotting-flesh']!.gaps).toContain('+20 Deathbed Fighting')
    expect(BADGES['badge.lycanthropy']!.gaps).toContain('deploying the hero costs 2 Supplies')
  })
})
