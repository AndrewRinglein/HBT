// fix.burst-ground-class-powers (2026-10-04) — found landing capability.burst-paints-ground (SWITCHES.md
// burstGroundClassPowers): a burst can paint its hexes (BurstProfile.paints), the two staffs do, and two class
// powers whose Codex words name ground were "one authored field away (content only)":
//   Fireball (the Fire Master's) — "Deal 2 + Magic magic damage to every unit in the blast, plus every stack of
//     Burn that unit is already carrying — the blast CONSUMES that Burn — and then those seven hexes become burning."
//   Scorch (the Wyrmling's) — "Deal 2 + Magic magic damage to every unit in the blast, and those seven hexes
//     become burning."
// Content authors `paints` on each row's burst and reads the ground clause of its sentence, held both ways; no
// engine code. Fireball's other clause (the blast CONSUMES the Burn) stays a named gap. The three powers that
// change ground and deal nothing — Wake of Cinders, Quench, Nest — are not built (a burst needs a damage packet
// or a heal: SWITCHES.md burstGroundNotAPayload): they are named as gaps, on their rows and in CONTENT-GAPS.md.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { burstHexes, previewBurst, useBurst } from '../src/core/burst.js'
import { beginActivation, layerAt } from '../src/core/mutate.js'
import { valueOf } from '../src/core/status.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { ABILITIES, BURSTS } from '../src/content/index.js'
import { LAYER, layerAppliesOnEnter, layerIdOf } from '../src/content/maps.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import type { BurstDef, Ctx } from '../src/core/types.js'
import { hexId } from './board16.js'

const FIREBALL = 'power.fire-master.fireball'
const SCORCH = 'power.wyrmling.scorch'
const FLAME_BURST = 'power.fire-staff.fireball'
const GROUND_ONLY = [
  ['power.fire-master.wake-of-cinders', 'Wake of Cinders', 'burning'],
  ['power.grove-keeper.quench', 'Quench', 'frost'],
  ['power.broodmother.nest', 'Nest', 'poisoned'],
] as const
const EMBERWRIGHT = 'hero.base.mage-fire'
const IRON = 'hero.base.warrior-iron'
const PARTY = 'showcase.assembled-party'
/** The layer a burst paints, as its row says — read loosely so the file compiles whatever the row holds. */
const paintsOf = (id: string) => (BURSTS[id]?.burst as { paints?: string } | undefined)?.paints
const gapsOf = (id: string) => (BURSTS[id] as { gaps?: string[] } | undefined)?.gaps ?? []
const root = (p: string) => readFileSync(fileURLToPath(new URL('../../' + p, import.meta.url)), 'utf8')

/**
 * A Fire Master at (5,8) — the Emberwright at level 5, Fireball drafted, as showcase.assembled-party fields her —
 * an ally and a zombie inside the seven hexes around (8,8) — three hexes away, Scorch's reach — a zombie beside
 * them, one far away. Scorch is the Wyrmling's (class.beast, which no scenario fields): the same mage is handed
 * the row for the test. The zombies are given the Health to stand through the blast, so what the ground does to
 * a standing unit can be read.
 */
function rig(power: string) {
  const ctx = createBattle({
    scenarioId: 'probe.burst-ground-class-powers', replicate: 1, mapId: 'map.open',
    heroes: [EMBERWRIGHT, IRON], heroHexes: [hexId(5, 8), hexId(8, 7)],
    heroProgress: [{ level: 5, specialtyId: 'specialty.fire-master', levelFivePick: { magic: 2 }, powers: [FIREBALL] }, undefined],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie'], enemyHexes: [hexId(8, 8), hexId(9, 8), hexId(15, 0)], enemyCount: 3,
  })
  const mage = ctx.state.units.find((u) => u.typeId === EMBERWRIGHT)!
  const ally = ctx.state.units.find((u) => u.typeId === IRON)!
  const [z1, z2, far] = ctx.state.units.filter((u) => u.typeId === 'unit.zombie')
  if (!mage.actions.includes(power)) mage.actions.push(power)
  // both rows warm up for a Turn and cost 2: the test is about what the blast leaves, so it is cast on Turn 2 with Stamina to pay
  ctx.state.turn = 2
  mage.stamina = mage.maxStamina
  for (const z of [z1!, z2!, far!]) z.maxHp = z.hp = 60
  return { ctx, mage, ally, z1: z1!, z2: z2!, far: far!, centre: z1!.hex }
}
const painted = (ctx: Ctx, cause: string) => ctx.events.filter((e) => (e.type === 'layer.painted' || e.type === 'layer.cancelled') && e.causeId === cause)

describe('the rows: the ground is on the burst, and its gap is gone', () => {
  it.each([[FIREBALL, 6], [SCORCH, 3]] as const)('%s paints layer.burning — one field on its burst profile, and nothing else about the burst changed', (power, range) => {
    expect(paintsOf(power)).toBe('layer.burning')
    expect(BURSTS[power]).toMatchObject({
      range, staminaCost: 2, cooldown: 3, warmup: 1,
      burst: { shape: { kind: 'radius', radius: 1 }, side: 'any', packets: [{ id: 'base', amount: 2, stat: 'magic', damageType: 'magic' }] },
    })
    expect(gapsOf(power).filter((g) => /seven hexes become/.test(g))).toEqual([])
  })

  it('Scorch names no gap any more; Fireball still names the clause the engine cannot do — the blast consuming the Burn — and nothing about ground', () => {
    expect(gapsOf(SCORCH)).toEqual([])
    expect(gapsOf(FIREBALL)).toEqual([
      'rider: plus every stack of Burn that unit is already carrying — the blast CONSUMES that Burn',
      'unparsed: allies caught in it burn too',
    ])
  })

  it('content\'s gap list says the same', () => {
    const gaps = JSON.parse(root('content/gen/class-power-gaps.json')) as { classPowerGaps?: { power: string; what: string }[] } | { power: string; what: string }[]
    const rows = (Array.isArray(gaps) ? gaps : Object.values(gaps).find((v) => Array.isArray(v) && v.some((r) => r?.power))) as { power: string; what: string }[]
    const of = (power: string) => rows.filter((r) => r.power === power).map((r) => r.what)
    expect(of(SCORCH)).toEqual([])
    expect(of(FIREBALL)).toEqual(gapsOf(FIREBALL))
  })

  it('the authored rows carry the field, as the staffs\' rows do', () => {
    const power = (file: string, id: string) => (JSON.parse(root(`content/gen/${file}.json`)) as { powers: { id: string; burst?: { paints?: string } }[] }).powers.find((p) => p.id === id)!
    expect(power('mage', FIREBALL).burst?.paints).toBe('layer.burning')
    expect(power('beast', SCORCH).burst?.paints).toBe('layer.burning')
  })
})

describe.each([[FIREBALL, 'the Fire Master\'s Fireball'], [SCORCH, 'the Wyrmling\'s Scorch']] as const)('%s — %s', (power, _whose) => {
  it('deals its 2 + Magic and leaves the seven hexes burning — one layer.painted for each, cause the power', () => {
    const { ctx, mage, z1, z2, far, centre } = rig(power)
    const hexes = burstHexes(ctx, mage.hex, centre, BURSTS[power] as BurstDef)
    expect(hexes).toHaveLength(7)
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, centre, power)
    expect(z1.hp).toBe(z1.maxHp - (2 + mage.magic))
    expect(z2.hp).toBe(z2.maxHp - (2 + mage.magic))
    expect(far.hp).toBe(far.maxHp)
    const strokes = painted(ctx, power)
    expect(strokes.map((e) => e['hex']).sort((a, b) => (a as number) - (b as number))).toEqual(hexes)
    expect(strokes.every((e) => e.type === 'layer.painted' && e['layer'] === LAYER.BURNING && e['after'] === LAYER.BURNING)).toBe(true)
    for (const h of hexes) expect(layerIdOf(layerAt(ctx, h)), `hex ${h}`).toBe('layer.burning')
    expect(ctx.state.layers!.filter((l) => l !== 0)).toHaveLength(7)   // and only those seven
  })

  it('every unit standing on a hex it paints burns for it — the ally too ("allies caught in it burn too"), the caster outside it not', () => {
    const { ctx, mage, ally, z1, z2, far, centre } = rig(power)
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, centre, power)
    const beat = layerAppliesOnEnter(LAYER.BURNING)
    expect(beat).toEqual([['status.burn', 1]])
    for (const u of [ally, z1, z2]) expect(valueOf(u, 'status.burn'), u.typeId).toBe(1)
    expect(valueOf(far, 'status.burn'), 'outside the seven hexes').toBe(0)
    expect(valueOf(mage, 'status.burn'), 'the caster stood outside its blast').toBe(0)
    expect(ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === 'layer.burning')).toHaveLength(3)
  })

  it('the preview and the log say so before it lands: the ground and the hexes it will be painted on', () => {
    const { ctx, mage, centre } = rig(power)
    const p = previewBurst(ctx, mage.id, centre, power) as ReturnType<typeof previewBurst> & { paints?: { layer: string; hexes: number[] } }
    expect(p.paints).toEqual({ layer: 'layer.burning', hexes: p.hexes })
    expect(ctx.events.filter((e) => e.type === 'layer.painted')).toEqual([])   // a preview paints nothing
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, centre, power)
    expect(ctx.events.find((e) => e.type === 'burst.declared' && e.causeId === power)).toMatchObject({ paints: 'layer.burning' })
  })
})

describe('Fireball is the Fire Master\'s own power, not the staff\'s', () => {
  it('the Emberwright at level 5 holds both: the Fire Staff\'s Flame Burst and the Fire Master\'s Fireball, two rows, both leaving burning ground', () => {
    const { mage } = rig(FIREBALL)
    expect(mage.actions).toEqual(expect.arrayContaining([FIREBALL, FLAME_BURST]))
    expect(paintsOf(FLAME_BURST)).toBe('layer.burning')
    expect(BURSTS[FIREBALL]!.name).toBe('Fireball')
    expect((BURSTS[FIREBALL] as { source?: string }).source).toBe('class')
  })

  it('in a real battle: the assembled party\'s Fire Master throws it and the ground burns under whoever is standing there', () => {
    expect(scenarioDef(PARTY).heroProgress?.some((p) => p?.powers?.includes(FIREBALL))).toBe(true)
    let strokes = 0, burned = 0
    for (let r = 0; r < 10 && !(strokes && burned); r++) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef(PARTY)), replicate: r })
      runBattle(ctx)
      strokes += painted(ctx, FIREBALL).length
      burned += ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === 'layer.burning').length
    }
    expect(strokes, 'no Fireball painted ground in ten fights of the assembled party').toBeGreaterThan(0)
    expect(burned, 'nobody burned for standing on it').toBeGreaterThan(0)
  })
})

describe('the three powers that only change ground are named as gaps, not built', () => {
  it.each(GROUND_ONLY)('%s (%s) is no burst and does nothing in battle; its row says what it needs', (id) => {
    expect(BURSTS[id]).toBeUndefined()
    const row = ABILITIES[id] as { effects?: unknown[]; gaps?: string[] } | undefined
    expect(row, 'still a class power the engine knows by name').toBeDefined()
    expect(row!.effects).toEqual([])
    expect(row!.gaps).toEqual(expect.arrayContaining([expect.stringMatching(/^needs capability: ground as a burst's only payload — /), 'no effect compiled — the power is inert']))
  })

  it('CONTENT-GAPS.md lists the three by name under the one thing they need', () => {
    const line = root('CONTENT-GAPS.md').split('\n').find((l) => l.startsWith('**ground as a burst\'s only payload**'))
    expect(line, 'no such heading in CONTENT-GAPS.md').toBeDefined()
    expect(line).toMatch(/— 3 rows: /)
    for (const [, name] of GROUND_ONLY) expect(line).toContain(name)
    for (const name of ['Fireball', 'Scorch']) expect(line).not.toContain(name)
  })

  it('the authored rows say it: needsCapability, citing the engine\'s switch — and no burst profile', () => {
    const rows = [...(JSON.parse(root('content/gen/mage.json')) as { powers: Record<string, unknown>[] }).powers, ...(JSON.parse(root('content/gen/beast.json')) as { powers: Record<string, unknown>[] }).powers]
    for (const [id, , ground] of GROUND_ONLY) {
      const row = rows.find((p) => p['id'] === id)!
      expect(String(row['needsCapability']), id).toMatch(/^ground as a burst's only payload — .*burstGroundNotAPayload/)
      expect(row['burst'], id).toBeUndefined()
      expect(String(row['description']), id).toMatch(new RegExp(`^Those seven hexes become ${ground}\\.`))
    }
  })
})
