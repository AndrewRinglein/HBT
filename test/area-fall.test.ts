// encounter.area-fall (2026-09-28): a telegraphed area fall — one mechanism for two rulings
// (DECISIONS.md 2026-09-28: the Hunt's meteor fall, "seven 7-hex areas marked at the end of the
// Enemy Phase, landing after the next Player Phase: burning ground, 2 fire damage and 2 Burn";
// the Gates' curse strikes "falling like the meteors: 3 Weak to everyone inside and the area
// becomes cursed ground"). A terrain event (COMBAT-SEQUENCE.md "Terrain events"): a Scatter of
// radius-1 Disks on the terrain-event cup. The two instances here are TEST rows with the rulings'
// numbers (content/test/encounters.json): test.fall.meteor and test.fall.curse.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { advanceBattle, completeActionCycle, runBattle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { executeAction, legalActions } from '../src/core/commands.js'
import { passableHexes } from '../src/core/props.js'
import { fallCentres, scatterAreas } from '../src/core/encounter.js'
import { draw } from '../src/core/rng.js'
import { encounterDef, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { layerOfId, takesEntry } from '../src/content/maps.js'
import type { Ctx, Event } from '../src/core/types.js'

const METEOR = 'test.area-fall-meteor', CURSE = 'test.area-fall-curse'
const field = (scenario: string, replicate = 0) => createBattle({ ...scenarioOptions(scenarioDef(scenario)), replicate })
const run = (scenario: string, replicate = 0) => { const ctx = field(scenario, replicate); runBattle(ctx); return ctx }
const one = (ctx: Ctx, type: string) => { const es = ctx.events.filter((e) => e.type === type); expect(es, type).toHaveLength(1); return es[0]! }
const at = (ctx: Ctx, e: Event) => ctx.events.indexOf(e)
const phaseEnd = (ctx: Ctx, side: string, turn: number) => ctx.events.findIndex((e) => e.type === 'phase.end.done' && e['side'] === side && e.turn === turn)

describe('encounter.area-fall — marked at the end of Turn 4, landing after Turn 5\'s Player Phase', () => {
  it.each([[METEOR, 'test.fall.meteor'], [CURSE, 'test.fall.curse']])('%s: seven 7-hex areas are marked as Turn 4\'s Enemy Phase ends; nothing lands until Turn 5\'s Player Phase has ended', (scenario, fall) => {
    const ctx = run(scenario)
    const marked = one(ctx, 'area.marked'), landed = one(ctx, 'area.landed')
    expect([marked.causeId, marked['turn'], marked['lands']]).toEqual([fall, 4, 5])
    const areas = marked['areas'] as number[][]
    expect(areas).toHaveLength(7)
    for (const a of areas) expect(a).toHaveLength(7)
    expect(new Set(areas.map((a) => a[0])).size).toBe(7) // centres distinct
    expect(at(ctx, marked)).toBeGreaterThan(phaseEnd(ctx, 'enemy', 4))
    expect(at(ctx, marked)).toBeLessThan(ctx.events.findIndex((e) => e.type === 'turn.begin' && e['turn'] === 5))
    expect(at(ctx, landed)).toBeGreaterThan(phaseEnd(ctx, 'hero', 5))
    expect(at(ctx, landed)).toBeLessThan(ctx.events.findIndex((e) => e.type === 'phase.begin' && e['phase'] === 'enemy' && e.turn === 5))
    // nothing of the fall touched the board before it landed
    expect(ctx.events.slice(0, at(ctx, landed)).filter((e) => e.causeId === fall && e.type !== 'area.marked')).toEqual([])
    expect(landed['areas']).toEqual(areas)
  })

  it('every marked centre is a hex a unit can move to, with its six neighbours on the board', () => {
    for (const r of [0, 1, 2, 3]) {
      const ctx = field(METEOR, r)
      const passable = passableHexes(ctx)
      for (const c of scatterAreas(ctx, fallCentres(ctx), 7, (a) => draw(ctx.rng, 'terrain-event', 0, a)).map((a) => a[0]!)) {
        expect(passable(c)).toBe(true)
        expect(takesEntry(ctx.state.terrain[c]!)).toBe(false)
        expect(ctx.geo.neighboursOf(c)).toHaveLength(6)
      }
    }
  })

  /**
   * Scripted Turn 5: as it begins, hero A, hero B and an enemy are put on the centres of three
   * marked areas; A walks out of every area in its Activation, B stays; enemies do not act before
   * the fall lands. Every other Activation is the AI's.
   */
  function scripted(scenario: string) {
    const ctx = field(scenario)
    let placed = false, walkedOut = false
    const [a, b] = [0, 1]
    let enemy = -1
    const inside = () => new Set(((ctx.state.encounter?.marked ?? [])[0]?.areas ?? []).flat())
    while (true) {
      const next = advanceBattle(ctx)
      if (next.kind === 'complete') break
      if (!placed && ctx.state.encounter?.marked?.length) {
        const areas = ctx.state.encounter.marked[0]!.areas
        enemy = ctx.state.units.find((u) => u.side === 'enemy' && u.lifeState === 'standing')!.id
        const units = ctx.state.units
        const centres = areas.map((x) => x[0]!).filter((h) => !units.some((u) => u.lifeState !== 'dead' && u.hex === h))
        units[a]!.hex = centres[0]!; units[b]!.hex = centres[1]!; units[enemy]!.hex = centres[2]!
        placed = true
      }
      if (placed && ctx.state.turn === 5 && ctx.state.phase === 'hero' && (next.actor === a || next.actor === b)) {
        if (next.actor === a && !walkedOut) {
          const out = inside()
          const move = legalActions(ctx, a).find((q) => q.actionId === 'power.move' && 'destination' in q && !out.has(q.destination))
          expect(move, 'hero A can walk out of every marked area').toBeDefined()
          expect(executeAction(ctx, move)).toEqual({ ok: true })
          walkedOut = true
        }
        completeActionCycle(ctx) // B idles inside; A has walked out and does nothing more
        continue
      }
      runActivation(ctx, next.actor)
      completeActionCycle(ctx)
    }
    return { ctx, a, b, enemy, walkedOut }
  }
  const fromFall = (ctx: Ctx, fall: string, unit: number) => ctx.events.filter((e) => e.causeId === fall && (e['target'] === unit || e.actor === unit || e['unit'] === unit) && (e.type === 'damage.applied' || e.type === 'status.applied'))

  it('the meteor: a hero who walked out takes nothing; a hero left inside and an enemy inside each take 2 fire and 2 Burn', () => {
    const { ctx, a, b, enemy, walkedOut } = scripted(METEOR)
    expect(walkedOut).toBe(true)
    const landed = one(ctx, 'area.landed')
    expect(landed['hit']).not.toContain(a)
    expect(landed['hit']).toEqual(expect.arrayContaining([b, enemy]))
    expect(fromFall(ctx, 'test.fall.meteor', a)).toEqual([])
    for (const u of [b, enemy]) {
      const got = fromFall(ctx, 'test.fall.meteor', u)
      const dmg = got.find((e) => e.type === 'damage.applied')!
      expect([dmg['damageType'], dmg['amount'] ?? dmg['value']]).toEqual(['fire', 2])
      expect(got.filter((e) => e.type === 'status.applied').map((e) => [e['statusId'], e['value'] ?? e['amount']])).toEqual([['status.burn', 2]])
    }
  })

  it('the curse: a hero who walked out takes nothing; a hero left inside and an enemy inside each take 3 Weak and no damage', () => {
    const { ctx, a, b, enemy } = scripted(CURSE)
    expect(fromFall(ctx, 'test.fall.curse', a)).toEqual([])
    for (const u of [b, enemy]) {
      const got = fromFall(ctx, 'test.fall.curse', u)
      expect(got.filter((e) => e.type === 'damage.applied')).toEqual([])
      expect(got.map((e) => [e['statusId'], e['value'] ?? e['amount']])).toEqual([['status.weak', 3]])
    }
  })

  it.each([[METEOR, 'layer.burning'], [CURSE, 'layer.weak']])('%s: all seven hexes of every area carry %s afterwards', (scenario, layer) => {
    const ctx = run(scenario)
    const areas = one(ctx, 'area.landed')['areas'] as number[][]
    const painted = ctx.events.filter((e) => e.type === 'layer.painted' && e.causeId === (scenario === METEOR ? 'test.fall.meteor' : 'test.fall.curse'))
    const hexes = [...new Set(areas.flat())].sort((x, y) => x - y)
    expect(painted.map((e) => e['hex'])).toEqual(hexes)
    for (const e of painted) expect(e['layer']).toBe(layerOfId(layer))
  })

  it('the same seed marks the same hexes; a different seed, different ones', () => {
    const areasOf = (r: number) => one(run(METEOR, r), 'area.marked')['areas']
    expect(areasOf(0)).toEqual(areasOf(0))
    expect(areasOf(1)).not.toEqual(areasOf(0))
  })

  it('over 200 seeds the centres sit measurably nearer the middle than a uniform pick', () => {
    const ctx0 = field(METEOR, 0), g = ctx0.geo
    const middle = g.hexId(Math.floor((g.board.width - 1) / 2), Math.floor((g.board.height - 1) / 2))
    const candidates = fallCentres(ctx0)
    const uniformSum = candidates.reduce((s, h) => s + g.distance(h, middle), 0)
    let chosenSum = 0, chosen = 0
    for (let r = 0; r < 200; r++) {
      const ctx = field(METEOR, r)
      for (const a of scatterAreas(ctx, fallCentres(ctx), 7, (i) => draw(ctx.rng, 'terrain-event', 0, i))) { chosenSum += g.distance(a[0]!, middle); chosen++ }
    }
    // mean chosen < mean uniform, compared without division (Law 7): chosenSum/chosen < uniformSum/candidates
    expect(chosenSum * candidates.length).toBeLessThan(uniformSum * chosen)
    // and by a margin, not a hair: at least a tenth nearer
    expect(chosenSum * candidates.length * 10).toBeLessThan(uniformSum * chosen * 9)
  })

  it('the fall is the encounter row\'s: the meteor and the curse are two data rows on one mechanism', () => {
    const meteor = encounterDef('test.encounter.meteor-fall').falls!, curse = encounterDef('test.encounter.curse-strike').falls!
    expect(meteor.map((f) => [f.id, f.turn, f.areas, f.layer, f.damage, f.damageType, f.applies])).toEqual([['test.fall.meteor', 4, 7, 'layer.burning', 2, 'fire', [['status.burn', 2]]]])
    expect(curse.map((f) => [f.id, f.turn, f.areas, f.layer, f.damage, f.applies])).toEqual([['test.fall.curse', 4, 7, 'layer.weak', undefined, [['status.weak', 3]]]])
  })
})
