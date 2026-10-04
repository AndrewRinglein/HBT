// capability.burst-paints-ground (2026-10-04) — found landing fix.starting-kit-powers; engine DECISIONS.md
// 2026-10-03 'reported: the priest's Holy Texts has no heal in battle — three starting weapons lose their
// power on the way into the engine'. The Codex: Flame Burst — "Deal magic damage equal to your Magic to every
// unit in the blast, and those seven hexes become burning. It does not roll to hit, so it cannot crit, and
// allies caught in it burn too." ("The blast is the smaller half; the burning ground it leaves is the real
// payload.") Frost Nova — the same, "and those seven hexes become frost".
//
// The engine had both halves and no join: a burst names its hexes and painted nothing; ground was painted
// from a unit, never from a burst's centre. The join is one field on the burst profile — `paints`, a layer
// id — read by useBurst after its recipients are struck (and its Destroy has reached the props) and before
// settle, through paintGround, the one rule: a layer painted under a standing unit gives that layer's entry
// beat. The core names no layer and no power; fire and frost are the two instances, pure data.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { burstHexes, previewBurst, useBurst } from '../src/core/burst.js'
import { burstProfile, validateBurstAction } from '../src/core/burst-profile.js'
import { beginActivation, layerAt } from '../src/core/mutate.js'
import { valueOf } from '../src/core/status.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { BURSTS, ITEMS } from '../src/content/index.js'
import { LAYER, layerAppliesOnEnter, layerIdOf, layerOfId } from '../src/content/maps.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import type { ActionDef, BurstDef, Ctx } from '../src/core/types.js'
import { hexId } from './board16.js'

const FLAME = 'power.fire-staff.fireball'
const NOVA = 'power.frost-staff.frost-nova'
const STORM = 'power.lightning-staff.storm'
const EMBERWRIGHT = 'hero.base.mage-fire'
const SCHOLAR = 'hero.base.mage-thinking'
const IRON = 'hero.base.warrior-iron'
const KILN = 'showcase.kiln'
const VARIANTS = [[EMBERWRIGHT, FLAME, 'layer.burning', LAYER.BURNING], [SCHOLAR, NOVA, 'layer.frost', LAYER.FROST]] as const
/** The layer a burst paints, as its row says — read loosely so the file compiles before the field exists. */
const paintsOf = (id: string) => (BURSTS[id]?.burst as { paints?: string } | undefined)?.paints

/** A mage at (4,8); an ally and a zombie inside the seven hexes around (8,8); a zombie beside them; one far away. */
function rig(mageId: string, extra: Partial<Parameters<typeof createBattle>[0]> = {}) {
  const ctx = createBattle({
    scenarioId: 'probe.burst-paints-ground', replicate: 1, mapId: 'map.open',
    heroes: [mageId, IRON], heroHexes: [hexId(4, 8), hexId(8, 7)],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie'], enemyHexes: [hexId(8, 8), hexId(9, 8), hexId(15, 0)], enemyCount: 3,
    ...extra,
  })
  const mage = ctx.state.units.find((u) => u.typeId === mageId)!
  const ally = ctx.state.units.find((u) => u.typeId === IRON)!
  const [z1, z2, far] = ctx.state.units.filter((u) => u.typeId === 'unit.zombie')
  return { ctx, mage, ally, z1: z1!, z2: z2!, far: far!, centre: z1!.hex }
}
const painted = (ctx: Ctx, cause: string) => ctx.events.filter((e) => (e.type === 'layer.painted' || e.type === 'layer.cancelled') && e.causeId === cause)

describe('the rows: the ground is on the burst, and the gap is gone', () => {
  it.each(VARIANTS)('%s\'s %s paints %s — a field on its burst profile, and nothing else about the burst changed', (_mage, power, layer) => {
    expect(paintsOf(power)).toBe(layer)
    expect(BURSTS[power]).toMatchObject({
      range: 4, staminaCost: 3, cooldown: 0,
      burst: { shape: { kind: 'radius', radius: 1 }, side: 'any', packets: [{ id: 'base', amount: 0, stat: 'magic', damageType: 'magic' }] },
    })
    expect(BURSTS[power]!.gaps ?? []).toEqual([])
  })

  it('the two staffs name no gap any more', () => {
    expect(ITEMS['item.fire-staff']!.gaps ?? []).toEqual([])
    expect(ITEMS['item.frost-staff']!.gaps ?? []).toEqual([])
  })

  it('content\'s gap list no longer says a burst paints no ground', () => {
    const text = readFileSync(fileURLToPath(new URL('../../content/gen/enemy-pack-gaps.json', import.meta.url)), 'utf8')
    expect(text).not.toContain('a burst paints no ground')
    expect(text).not.toMatch(/(fire-staff\.fireball|frost-staff\.frost-nova): those seven hexes become/)
  })

  it('a burst that names no ground paints none: the Lightning Staff\'s Storm is unchanged', () => {
    expect(BURSTS[STORM]).toBeDefined()
    expect(paintsOf(STORM)).toBeUndefined()
  })
})

describe.each(VARIANTS)('%s casts %s', (mageId, power, layer, layerNo) => {
  it('deals its Magic damage and leaves the seven hexes painted — one layer.painted for each, cause the power', () => {
    const { ctx, mage, z1, z2, far, centre } = rig(mageId)
    const hexes = burstHexes(ctx, mage.hex, centre, BURSTS[power] as BurstDef)
    expect(hexes).toHaveLength(7)
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, centre, power)
    expect(z1.hp).toBe(z1.maxHp - mage.magic)
    expect(z2.hp).toBe(z2.maxHp - mage.magic)
    expect(far.hp).toBe(far.maxHp)
    const strokes = painted(ctx, power)
    expect(strokes.map((e) => e['hex']).sort((a, b) => (a as number) - (b as number))).toEqual(hexes)
    expect(strokes.every((e) => e.type === 'layer.painted' && e['layer'] === layerNo && e['after'] === layerNo)).toBe(true)
    for (const h of hexes) expect(layerIdOf(layerAt(ctx, h)), `hex ${h}`).toBe(layer)
    // and only those seven
    expect(ctx.state.layers!.filter((l) => l !== 0)).toHaveLength(7)
  })

  it('the ground is painted after the recipients are struck and before the burst settles', () => {
    const { ctx, mage, centre } = rig(mageId)
    beginActivation(ctx, mage.id, 'test')
    const from = ctx.events.length
    useBurst(ctx, mage.id, centre, power)
    const types = ctx.events.slice(from).filter((e) => e.causeId === power || e.type === 'layer.painted').map((e) => e.type)
    const lastStruck = types.lastIndexOf('burst.struck'), firstPaint = types.indexOf('layer.painted')
    expect(lastStruck).toBeGreaterThanOrEqual(0)
    expect(firstPaint).toBeGreaterThan(lastStruck)
  })

  it('the one ground rule: every standing unit on a painted hex takes that layer\'s entry beat — the ally and the caster\'s own side too', () => {
    const { ctx, mage, ally, z1, z2, far, centre } = rig(mageId)
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, centre, power)
    const beat = layerAppliesOnEnter(layerNo)
    for (const u of [ally, z1, z2]) for (const [status, n] of beat) expect(valueOf(u, status), `${u.typeId} ${status}`).toBe(n)
    for (const [status] of beat) {
      expect(valueOf(far, status), 'outside the seven hexes').toBe(0)
      expect(valueOf(mage, status), 'the caster stood outside its blast').toBe(0)
      expect(ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === layer).length).toBe(3)
    }
    // what the layer gives is the layer's row, not this test's: burning ground burns on entry
    if (layer === 'layer.burning') expect(beat).toEqual([['status.burn', 1]])
  })

  it('the preview says so: it names the ground and the hexes it will be painted on', () => {
    const { ctx, mage, centre } = rig(mageId)
    const p = previewBurst(ctx, mage.id, centre, power) as ReturnType<typeof previewBurst> & { paints?: { layer: string; hexes: number[] } }
    expect(p.paints).toEqual({ layer, hexes: p.hexes })
    expect(ctx.events.filter((e) => e.type === 'layer.painted')).toEqual([])   // a preview paints nothing
    expect(ctx.state.layers?.some((l) => l !== 0) ?? false).toBe(false)
  })

  it('burst.declared carries the ground, so the log says what the burst will leave', () => {
    const { ctx, mage, centre } = rig(mageId)
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, centre, power)
    expect(ctx.events.find((e) => e.type === 'burst.declared' && e.causeId === power)).toMatchObject({ paints: layer })
  })

  it('a shielded hex is painted too: the unit there is not struck, and still meets the ground it now stands on', () => {
    const { ctx, mage, z1, z2, centre } = rig(mageId)
    // a high prop on z2's hex shields it from the centre (the rig burst-resolution.test.ts uses)
    ctx.state.props = [{ id: 'prop.test.high', height: 'high', material: 1, footprint: { kind: 'hex', hexes: [z2.hex] } }]
    const hexes = burstHexes(ctx, mage.hex, centre, BURSTS[power] as BurstDef)
    expect(hexes).toContain(z2.hex)
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, centre, power)
    expect(ctx.events.some((e) => e.type === 'burst.shielded' && e.target === z2.id)).toBe(true)
    expect(z2.hp, 'shielded: no blast damage').toBe(z2.maxHp)
    expect(z1.hp).toBe(z1.maxHp - mage.magic)
    expect(painted(ctx, power).map((e) => e['hex']).sort((x, y) => (x as number) - (y as number))).toEqual(hexes)
    expect(layerIdOf(layerAt(ctx, z2.hex))).toBe(layer)
    for (const [status, n] of layerAppliesOnEnter(layerNo)) expect(valueOf(z2, status), `the shielded unit's ${status}`).toBe(n)
  })
})

describe('the two layers meet as ground always has', () => {
  it('Frost Nova onto ground a Flame Burst left burning leaves it bare — burning and frost cancel, hex for hex', () => {
    const { ctx, mage, centre } = rig(EMBERWRIGHT)
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, centre, FLAME)
    const hexes = burstHexes(ctx, mage.hex, centre, BURSTS[FLAME] as BurstDef)
    // the same hexes, a frost burst (the Scholar's row, cast by this mage for the test: grant it)
    mage.actions.push(NOVA)
    mage.stamina = mage.maxStamina
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, centre, NOVA)
    for (const h of hexes) expect(layerAt(ctx, h), `hex ${h}`).toBe(0)
    expect(painted(ctx, NOVA).every((e) => e.type === 'layer.cancelled')).toBe(true)
    expect(painted(ctx, NOVA)).toHaveLength(7)
  })

  it('a burst with no ground on its row paints nothing: Storm leaves the seven hexes as they were', () => {
    const { ctx, mage, centre } = rig(EMBERWRIGHT)
    mage.actions.push(STORM)
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, centre, STORM)
    expect(ctx.events.filter((e) => e.type === 'layer.painted' || e.type === 'layer.cancelled')).toEqual([])
    expect((previewBurst(ctx, mage.id, centre, STORM) as { paints?: unknown }).paints).toBeUndefined()
  })
})

describe('the field is validated at load and carried by a snapshot', () => {
  const base = { shape: { kind: 'radius', radius: 1 }, side: 'any', packets: [{ id: 'base', damageType: 'magic', amount: 0, stat: 'magic' }] }

  it('a burst profile may name the layer it paints; anything that is not a layer id is refused', () => {
    expect(() => burstProfile({ ...base, paints: 'layer.burning' })).not.toThrow()
    expect(() => burstProfile({ ...base, paints: 'layer.frost' })).not.toThrow()
    for (const bad of ['burning', '', 7, null, ['layer.burning'], 'status.burn', 'layer.']) expect(() => burstProfile({ ...base, paints: bad }), String(bad)).toThrow()
  })

  it('a layer that is not one of the ground layers fails loudly when the burst is used, never silently paints nothing', () => {
    expect(() => layerOfId('layer.lava-of-nowhere')).toThrow()
    const { ctx, mage, centre } = rig(EMBERWRIGHT)
    const rogue = { ...(BURSTS[FLAME] as BurstDef), id: 'power.test.rogue-ground', burst: { ...(BURSTS[FLAME] as BurstDef).burst, paints: 'layer.lava-of-nowhere' } } as unknown as ActionDef
    expect(() => validateBurstAction(rogue)).not.toThrow()   // the shape is a layer id; which layers exist is the ground's
    ;(ctx.actions as Record<string, ActionDef>)[rogue.id] = rogue
    mage.actions.push(rogue.id)
    beginActivation(ctx, mage.id, 'test')
    expect(() => useBurst(ctx, mage.id, centre, rogue.id)).toThrow(/unknown ground layer/)
  })

  it('a snapshot taken after a Flame Burst restores the burning ground, and the burst rows are part of what it is bound to', () => {
    const { ctx, mage, centre } = rig(EMBERWRIGHT)
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, centre, FLAME)
    const saved = saveBattle(ctx)
    const back = restoreBattle(saved, ctx)
    expect(back.state.layers).toEqual(ctx.state.layers)
    expect(back.state.layers!.filter((l) => l === LAYER.BURNING)).toHaveLength(7)
    // the same save against rows whose burst paints something else is refused: the field is content the snapshot is bound to
    const other = { ...ctx, actions: { ...ctx.actions, [FLAME]: { ...(ctx.actions[FLAME] as BurstDef), burst: { ...(ctx.actions[FLAME] as BurstDef).burst, paints: 'layer.frost' } } } } as unknown as Ctx
    expect(() => restoreBattle(saved, other)).toThrow(/content binding differs/)
  })
})

describe('in a real battle', () => {
  it('the Emberwright\'s Flame Burst leaves burning ground at the kiln, and units burn for standing in it', () => {
    expect(scenarioDef(KILN).heroes).toContain(EMBERWRIGHT)
    let strokes = 0, burned = 0
    for (let r = 0; r < 10 && !(strokes && burned); r++) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef(KILN)), replicate: r })
      runBattle(ctx)
      strokes += painted(ctx, FLAME).length
      burned += ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === 'layer.burning').length
    }
    expect(strokes, 'no Flame Burst painted ground in ten fights at the kiln').toBeGreaterThan(0)
    expect(burned, 'nobody burned for standing on it').toBeGreaterThan(0)
  })
})
