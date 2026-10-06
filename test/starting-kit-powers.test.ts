// fix.starting-kit-powers (2026-10-04) — reported 2026-10-03 (Andrew, DECISIONS.md "reported: the priest's Holy
// Texts has no heal in battle — three starting weapons lose their power on the way into the engine"): "This priest
// only has a verse attack." / "Why doesn't he have the healing power? Why does he have an item that's supposed to
// be a tier 1 that only has one thing in it?"
//
// Three starting weapons granted an attack and a power in the Codex, and the engine's pack carried the attack
// alone ("item power — shape unparsed"). Each reaches the engine now as a second instance of a shape it already
// speaks, with no engine code:
//   Mercy       "Heal the target for 2 + half your Spirit." — the Holy Symbol's Heal shape (a heal effect on one
//               ally, ValueSpec partySpirit), with the ValueSpec's own `div` for the half, rounded down as the
//               Codex's other halves say (Benediction, Heaven's Edge: "half your Spirit, rounded down" —
//               SWITCHES.md mercyHalfRoundsDown).
//   Flame Burst "Deal magic damage equal to your Magic to every unit in the blast" — the Lightning Staff's Storm
//   Frost Nova  shape (a hex-targeted burst, radius 1, any side, one Magic packet).
// What the engine still lacks is named on the rows, never rounded: a burst paints no ground, so "those seven hexes
// become burning / frost" is a gap on the two staffs (filed: capability.burst-paints-ground).
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { canUsePower, previewPower, usePower } from '../src/core/ability.js'
import { canUseBurst, previewBurst, useBurst } from '../src/core/burst.js'
import { partySpiritSum } from '../src/core/trigger.js'
import { ABILITIES, BURSTS, ITEMS } from '../src/content/index.js'
import { createBattle, fieldedDef } from '../src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'
import { hexId } from './board16.js'

const MERCY = 'power.holy-texts.mercy'
const FLAME = 'power.fire-staff.fireball'
const NOVA = 'power.frost-staff.frost-nova'
const CHAPLAIN = 'hero.base.priest-armored'
const MENDICANT = 'hero.base.priest-pauper'
const EMBERWRIGHT = 'hero.base.mage-fire'
const SCHOLAR = 'hero.base.mage-thinking'
const IRON = 'hero.base.warrior-iron'
const CARAVAN = 'test.caravan-aftermath'
const KILN = 'showcase.kiln'

describe('the pack carries the three powers, each in its Codex words', () => {
  it('Mercy: one ally within 4 hexes, 2 Stamina, heal 2 + half the party\'s Spirit (rounded down)', () => {
    expect(ITEMS['item.holy-texts']!.abilities).toEqual([MERCY])
    expect(ITEMS['item.holy-texts']!.grants).toEqual(['attack.holy-texts.verse'])
    expect(ABILITIES[MERCY]).toMatchObject({
      name: 'Mercy', range: 4, staminaCost: 2, cooldown: 0, target: { select: 'unit', side: 'ally' },
      effects: [{ kind: 'heal', amount: { scale: 'partySpirit', base: 2, mult: 1, div: 2, round: 'down' } }],
    })
    expect(ITEMS['item.holy-texts']!.gaps ?? []).toEqual([])
  })

  it('Flame Burst and Frost Nova: a hex within 4 and every hex adjacent to it, 3 Stamina, Magic + 0 magic damage to every unit', () => {
    for (const [item, power, name] of [['item.fire-staff', FLAME, 'Flame Burst'], ['item.frost-staff', NOVA, 'Frost Nova']] as const) {
      expect(ITEMS[item]!.abilities, item).toEqual([power])
      expect(BURSTS[power], power).toMatchObject({
        name, range: 4, staminaCost: 3, cooldown: 0,
        burst: { shape: { kind: 'radius', radius: 1 }, side: 'any', packets: [{ id: 'base', amount: 0, stat: 'magic', damageType: 'magic' }] },
      })
    }
  })

  // LAW 10 — rewritten 2026-10-04 by capability.burst-paints-ground, as a RULE, not the frozen text. This read
  // "what the engine cannot do yet is named on the two staffs: a burst paints no ground" and held each staff's
  // `gaps` to the one sentence naming that missing capability. The claim under test was never the sentence: it
  // was "the ground clause of each Codex row is never silently dropped" — named as a gap while the engine could
  // not do it. The engine does it now (the burst's own `paints`; test/burst-paints-ground.test.ts holds what it
  // does), so the same claim reads: the clause is on the burst, and the staff names no gap for it.
  it('the ground clause of each staff is never dropped: it is on the burst, and the staff names no gap for it', () => {
    expect((BURSTS[FLAME]!.burst as { paints?: string }).paints).toBe('layer.burning')
    expect((BURSTS[NOVA]!.burst as { paints?: string }).paints).toBe('layer.frost')
    expect((ITEMS['item.fire-staff']!.gaps ?? []).filter((g) => g.includes('those seven hexes'))).toEqual([])
    expect((ITEMS['item.frost-staff']!.gaps ?? []).filter((g) => g.includes('those seven hexes'))).toEqual([])
    expect(ITEMS['item.fire-staff']!.gaps ?? []).toEqual([])
    expect(ITEMS['item.frost-staff']!.gaps ?? []).toEqual([])
  })

  it('content\'s gap list no longer says any of the three is unparsed', () => {
    const gaps = JSON.parse(readFileSync(fileURLToPath(new URL('../../content/gen/enemy-pack-gaps.json', import.meta.url)), 'utf8')) as { gaps?: { what: string; needs: string }[] } | { what: string; needs: string }[]
    const rows = Array.isArray(gaps) ? gaps : (gaps.gaps ?? [])
    expect(rows.length).toBeGreaterThan(0)
    for (const power of [MERCY, FLAME, NOVA]) {
      expect(rows.filter((r) => r.what.includes(power) && /unparsed|no authored row/.test(r.needs)), power).toEqual([])
    }
  })
})

describe('the six heroes field the whole weapon', () => {
  it('the Battle Chaplain and the Barefoot Mendicant have Mercy on their sheets beside Verse', () => {
    for (const id of [CHAPLAIN, MENDICANT]) {
      const def = fieldedDef(id)
      expect(def.abilities, id).toContain(MERCY)
      expect(def.attacks, id).toContain('attack.holy-texts.verse')
    }
  })

  it('the three Fire Staff mages have Flame Burst and the Archive Scholar has Frost Nova', () => {
    for (const id of [EMBERWRIGHT, 'hero.base.mage-fireaura', 'hero.base.mage-sexy']) expect(fieldedDef(id).abilities, id).toContain(FLAME)
    expect(fieldedDef(SCHOLAR).abilities).toContain(NOVA)
  })
})

describe('Mercy in battle — the Battle Chaplain heals an ally within 4 hexes for 2 + half his Spirit at 2 Stamina', () => {
  // the chaplain at column 4; an ally 4 hexes off (legal) or 5 hexes off (out of reach); a zombie far away
  const rig = (allyCol: number) => createBattle({
    scenarioId: 'probe.starting-kit-powers', replicate: 1, mapId: 'map.open',
    heroes: [CHAPLAIN, IRON], heroHexes: [hexId(4, 8), hexId(allyCol, 8)],
    enemies: ['unit.zombie'], enemyHexes: [hexId(15, 0)], enemyCount: 1,
  })
  const cast = (ctx: ReturnType<typeof rig>) => ({
    priest: ctx.state.units.find((u) => u.typeId === CHAPLAIN)!,
    ally: ctx.state.units.find((u) => u.typeId === IRON)!,
    zombie: ctx.state.units.find((u) => u.typeId === 'unit.zombie')!,
  })

  it('heals 2 + half the party\'s Spirit and spends 2 Stamina', () => {
    const ctx = rig(8)
    const { priest, ally } = cast(ctx)
    expect(ctx.geo.distance(priest.hex, ally.hex)).toBe(4)
    ally.hp = 1
    const spirit = partySpiritSum(ctx, 'hero')
    expect(spirit).toBeGreaterThan(0)
    const expected = 2 + Math.floor(spirit / 2)
    expect(previewPower(ctx, priest.id, ally.id, MERCY).heal).toBe(expected)
    beginActivation(ctx, priest.id, 'test')
    const stamina = priest.stamina
    usePower(ctx, priest.id, ally.id, MERCY)
    expect(ally.hp).toBe(Math.min(ally.maxHp, 1 + expected))
    expect(priest.stamina).toBe(stamina - 2)
    const ev = ctx.events.find((e) => e.type === 'heal.applied' && e.causeId === MERCY)!
    expect(ev['asked']).toBe(expected)
    expect(ctx.events.some((e) => e.type === 'power.used' && e['abilityId'] === MERCY)).toBe(true)
  })

  it('half an odd Spirit rounds down: Spirit 3 heals 3, Spirit 5 heals 4, Spirit 0 still heals the 2', () => {
    for (const [spirit, heal] of [[3, 3], [5, 4], [0, 2], [1, 2], [4, 4]] as const) {
      const ctx = rig(8)
      const { priest, ally } = cast(ctx)
      for (const u of ctx.state.units) if (u.side === 'hero') u.spirit = 0
      priest.spirit = spirit
      ally.hp = 1
      expect(previewPower(ctx, priest.id, ally.id, MERCY).heal, `Spirit ${spirit}`).toBe(heal)
    }
  })

  it('legality: an ally within 4 hexes yes, at 5 hexes no, an enemy never', () => {
    const near = rig(8), far = rig(9)
    expect(canUsePower(near, cast(near).priest.id, cast(near).ally.id, MERCY)).toBe(true)
    expect(far.geo.distance(cast(far).priest.hex, cast(far).ally.hex)).toBe(5)
    expect(canUsePower(far, cast(far).priest.id, cast(far).ally.id, MERCY)).toBe(false)
    expect(canUsePower(near, cast(near).priest.id, cast(near).zombie.id, MERCY)).toBe(false)
  })

  it('it runs: the Chaplain plays Mercy in a real battle — a heal lands, and nobody taught the AI (it plays the Heal shape)', () => {
    // the caravan's fight fields the Battle Chaplain with his kit (scenarios.ts test.caravan-aftermath)
    expect(scenarioDef(CARAVAN).heroes).toContain(CHAPLAIN)
    let healed = false
    // Restated 2026-10-06 (rule.surge-is-at-least-level and rule.special-moves-unlock-at-level-two (DECISIONS.md 2026-10-06 'everyone gains Surge equal to its level at the least …', 'a hero's special moves unlock at level 2, ruled …')): every fight at the caravan is another battle now. It read ten
    // fights (`r < 10`) and its message said so; the fights are read from 0 upward until Mercy heals someone - the 48th
    // (replicate 47) is the first. Nothing here asks who wins.
    for (let r = 0; r < 60 && !healed; r++) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef(CARAVAN)), replicate: r })
      runBattle(ctx)
      healed = ctx.events.some((e) => e.type === 'heal.applied' && e.causeId === MERCY && (e['amount'] as number) > 0)
    }
    expect(healed, 'Mercy healed someone in one of sixty fights at the caravan').toBe(true)
  })
})

describe('Flame Burst and Frost Nova in battle — Magic damage to every unit in the seven hexes, no roll', () => {
  for (const [mageId, power] of [[EMBERWRIGHT, FLAME], [SCHOLAR, NOVA]] as const) {
    it(`${power}: strikes every standing unit in the blast, the ally too, for the caster's Magic, at 3 Stamina`, () => {
      const ctx = createBattle({
        scenarioId: 'probe.starting-kit-powers', replicate: 1, mapId: 'map.open',
        heroes: [mageId, IRON], heroHexes: [hexId(4, 8), hexId(8, 7)],
        enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie'], enemyHexes: [hexId(8, 8), hexId(9, 8), hexId(15, 0)], enemyCount: 3,
      })
      const mage = ctx.state.units.find((u) => u.typeId === mageId)!
      const ally = ctx.state.units.find((u) => u.typeId === IRON)!
      const [z1, z2, z3] = ctx.state.units.filter((u) => u.typeId === 'unit.zombie')
      const centre = z1!.hex
      expect(ctx.geo.distance(mage.hex, centre)).toBe(4)
      expect(ctx.geo.distance(centre, ally.hex)).toBe(1)
      expect(mage.magic).toBeGreaterThan(0)
      const struck = previewBurst(ctx, mage.id, centre, power).targets.map((t) => t.id).sort((a, b) => a - b)
      expect(struck).toEqual([ally.id, z1!.id, z2!.id].sort((a, b) => a - b))
      beginActivation(ctx, mage.id, 'test')
      const stamina = mage.stamina
      useBurst(ctx, mage.id, centre, power)
      expect(mage.stamina).toBe(stamina - 3)
      expect(z1!.hp).toBe(z1!.maxHp - mage.magic)   // a zombie has no Resist: the whole of the caster's Magic
      expect(z2!.hp).toBe(z2!.maxHp - mage.magic)
      expect(z3!.hp, 'outside the seven hexes').toBe(z3!.maxHp)
      expect(ally.hp, '"to every unit in the blast" — the ally too').toBeLessThan(ally.maxHp)
      expect(ctx.events.filter((e) => e.type === 'burst.struck' && e.causeId === power).length).toBe(3)
      expect(ctx.events.some((e) => e.type === 'attack.declared' && e.causeId === power), 'it does not roll to hit').toBe(false)
    })

    it(`${power}: a hex 5 away is out of reach`, () => {
      const ctx = createBattle({
        scenarioId: 'probe.starting-kit-powers', replicate: 1, mapId: 'map.open',
        heroes: [mageId], heroHexes: [hexId(4, 8)], enemies: ['unit.zombie'], enemyHexes: [hexId(9, 8)], enemyCount: 1,
      })
      const mage = ctx.state.units.find((u) => u.typeId === mageId)!
      beginActivation(ctx, mage.id, 'test')
      expect(canUseBurst(ctx, mage.id, hexId(8, 8), power)).toBe(true)
      expect(canUseBurst(ctx, mage.id, hexId(9, 8), power)).toBe(false)
    })
  }

  it('it runs: the Emberwright plays Flame Burst in a real battle — nobody taught the AI (it plays the burst shape)', () => {
    expect(scenarioDef(KILN).heroes).toContain(EMBERWRIGHT)
    let struck = false
    for (let r = 0; r < 10 && !struck; r++) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef(KILN)), replicate: r })
      runBattle(ctx)
      struck = ctx.events.some((e) => e.type === 'burst.struck' && e.causeId === FLAME && (e['applied'] as number) > 0)
    }
    expect(struck, 'Flame Burst struck someone in one of ten fights at the kiln').toBe(true)
  })
})
