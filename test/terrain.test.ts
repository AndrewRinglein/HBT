import { describe, it, expect } from 'vitest'
import { MAPS, terrainOf, GLYPH, terrainIdOf, moveCostOf, TRAITS, TRAIT, IMPASSABLE, isPassable,
         accuracyBonusOf, reachBonusOf, dodgeBonusOf, armorBonusOf, resistBonusOf } from '../src/content/maps.js'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { effective, terrainMods } from '../src/core/stats.js'
import { stepCost, reachable, pathTo } from '../src/core/movement.js'
import { hexId } from '../src/core/hex.js'
import { resolveAccuracy } from '../src/core/pipeline.js'
import { ATTACKS } from '../src/content/index.js'
import { TERRAIN } from '../src/core/types.js'
import type { StatName } from '../src/core/stats.js'

const NEW_KINDS = [TERRAIN.FOREST, TERRAIN.ROCKY, TERRAIN.ROCKY_HILLS, TERRAIN.WATER, TERRAIN.OBSTACLE]
const ALL_KINDS = [TERRAIN.OPEN, TERRAIN.HILLS, ...NEW_KINDS]

function warriorOn(terrain: number) {
  const ctx = createCustomBattle(
    [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 8) }], { mapId: 'map.open' })
  ctx.state.terrain[ctx.state.units[0]!.hex] = terrain
  return { ctx, u: ctx.state.units[0]! }
}

describe('terrain.kinds — the seven are recognised', () => {
  it('every kind has a glyph and an id, and no glyph means two things', () => {
    // Count derived from the enum, not hardcoded (updated 2026-08-20 when
    // burning and poisoned ground grew the legend from 7 to 9 — the OLD
    // assertion was the correct failure, this is the correct fix).
    const KINDS = Object.values(TERRAIN).length
    const glyphs = Object.entries(GLYPH)
    expect(glyphs.length).toBe(KINDS)
    expect(new Set(glyphs.map(([, v]) => v)).size).toBe(KINDS)   // no two glyphs share a kind
    for (const t of Object.values(TERRAIN)) expect(terrainIdOf(t)).toMatch(/^terrain\.[a-z-]+$/)
    expect(new Set(Object.values(TERRAIN).map(terrainIdOf)).size).toBe(KINDS)
  })

  it('hills are `h` and only `h` — the old `^` is gone, not aliased', () => {
    expect(GLYPH['h']).toBe(TERRAIN.HILLS)
    expect(GLYPH['^']).toBeUndefined()
    for (const m of MAPS) for (const row of m.rows) expect(row).not.toContain('^')
  })

  it('every authored map still parses to a full board', () => {
    for (const m of MAPS) expect(terrainOf(m.id).length).toBe(256)
  })

  it('map.field carries real MAP-01 terrain, not a collapse to open/hills', () => {
    const kinds = new Set(terrainOf('map.field'))
    expect(kinds.size).toBeGreaterThan(2)
    for (const k of [TERRAIN.FOREST, TERRAIN.ROCKY, TERRAIN.WATER]) expect(kinds.has(k)).toBe(true)
  })

  it('an unknown glyph is still a loud failure, not a silent open hex', () => {
    const bad = { id: 'map.bad', name: 'x', note: '', rows: Array(16).fill('Q'.repeat(16)) }
    ;(MAPS as unknown as object[]).push(bad)
    expect(() => terrainOf('map.bad')).toThrow(/unknown glyph/)
    ;(MAPS as unknown as object[]).pop()
  })
})

// ─── the point of this item: it is PLUMBING. Nothing plays differently. ──────
describe('terrain.kinds — the new kinds carry no rules yet', () => {
  const STATS: StatName[] = ['accuracy', 'dodge', 'armor', 'resist', 'reach', 'movement']

  // RETIRED, twice, and the pattern is worth naming.
  //
  // terrain.kinds was PLUMBING: its claim was "these five kinds exist and change
  // nothing". terrain.movecost retired the cost half of that claim; terrain.modifiers
  // retired the stat half. Each successor item is the one thing allowed to break the
  // predecessor's neutrality assertion, and it says so in writing (Law 10).
  //
  // What survives is the claim no later item is allowed to break: an OBSTACLE grants
  // nothing, because nothing can ever stand on one.
  it('an obstacle grants no modifiers — nothing can stand on it to receive them', () => {
    const { ctx, u } = warriorOn(TERRAIN.OBSTACLE)
    expect(terrainMods(ctx, u)).toEqual([])
  })

  // RETIRED by terrain.modifiers — see the note above. The surviving claim is that
  // OPEN GROUND is the neutral element: it grants nothing, and every other terrain
  // is measured as a difference from it. That stays true no matter what lands next.
  it('open ground is the neutral element every other terrain is measured against', () => {
    const { ctx: openCtx, u: openU } = warriorOn(TERRAIN.OPEN)
    expect(terrainMods(openCtx, openU)).toEqual([])
    for (const s of STATS) expect(effective(openCtx, openU, s).value).toBe(effective(openCtx, openU, s).base)
  })

  it('hills still do what they always did — the conversion changed the glyph, not the rule', () => {
    const { ctx: o, u: ou } = warriorOn(TERRAIN.OPEN)
    const { ctx: h, u: hu } = warriorOn(TERRAIN.HILLS)
    expect(effective(h, hu, 'accuracy').value - effective(o, ou, 'accuracy').value).toBe(10)
    expect(effective(h, hu, 'reach').value - effective(o, ou, 'reach').value).toBe(2)
    expect(moveCostOf(TERRAIN.HILLS)).toBe(2)
  })

  it('nothing is impassable yet — that is terrain.passable, a separate item', () => {
    for (const t of ALL_KINDS) {
      const { ctx } = warriorOn(t)
      expect(Number.isFinite(stepCost(ctx, hexId(5, 5)))).toBe(true)
    }
  })
})

// ─── terrain.movecost ────────────────────────────────────────────────────────
describe('terrain.movecost — rough ground costs more', () => {
  it('every terrain declares what it is made of, none fall through to a default', () => {
    for (const t of ALL_KINDS) expect(TRAITS[t]).toBeDefined()
  })

  // The point of composing rather than assigning: a combination cannot drift from
  // its own parts. A hand-set number for Rocky Hill is always self-consistent and
  // therefore never catchable; this is.
  it('a combined terrain costs exactly the sum of its parts', () => {
    for (const t of ALL_KINDS) {
      if (!isPassable(t)) continue
      const fromTraits = 1 + TRAITS[t]!.reduce((n, k) => n + TRAIT[k].moveCost, 0)
        + (t === TERRAIN.FOREST ? 1 : 0)
      expect(moveCostOf(t)).toBe(fromTraits)
    }
    expect(moveCostOf(TERRAIN.ROCKY_HILLS))
      .toBe(moveCostOf(TERRAIN.ROCKY) + moveCostOf(TERRAIN.HILLS) - moveCostOf(TERRAIN.OPEN))
  })

  // ── GROUND-REQUIREMENTS.md §1.1, copied verbatim. This is the test that would
  // have caught the whole episode: the values are Angela's, stated in a document
  // that predates the engine work, and nothing here is a switch.
  it('matches GROUND-REQUIREMENTS.md §1.1 exactly', () => {
    const row = (t: number) => ({
      cost: isPassable(t) ? moveCostOf(t) : null,
      acc: accuracyBonusOf(t), reach: reachBonusOf(t),
      dodge: dodgeBonusOf(t), armor: armorBonusOf(t), resist: resistBonusOf(t),
    })
    expect(row(TERRAIN.OPEN)).toEqual({ cost: 1, acc: 0, reach: 0, dodge: 0, armor: 0, resist: 0 })
    expect(row(TERRAIN.FOREST)).toEqual({ cost: 2, acc: 0, reach: 0, dodge: 10, armor: 1, resist: 0 })
    expect(row(TERRAIN.HILLS)).toEqual({ cost: 2, acc: 10, reach: 2, dodge: 0, armor: 0, resist: 0 })
    expect(row(TERRAIN.ROCKY)).toEqual({ cost: 2, acc: -5, reach: 0, dodge: 0, armor: 1, resist: 1 })
    expect(row(TERRAIN.WATER)).toEqual({ cost: 2, acc: -10, reach: 0, dodge: 0, armor: 0, resist: 0 })
    // "composed" in §1.1 — rock plus a climb, both sets of modifiers
    expect(row(TERRAIN.ROCKY_HILLS)).toEqual({ cost: 3, acc: 5, reach: 2, dodge: 0, armor: 1, resist: 1 })
    expect(isPassable(TERRAIN.OBSTACLE)).toBe(false)
  })

  // The specific numbers are SWITCHES and moved once already (Angela set rocky-hills
  // to 3 and water to 2, having previously been 2 and 3). Asserting them as facts is
  // the finding-vs-rule mistake again — this test now asserts the ORDERING, which is
  // what "rough ground" actually means, and leaves the values to SWITCHES.md.
  it('open ground is the cheapest hex on the board, and nothing passable is free', () => {
    const open = moveCostOf(TERRAIN.OPEN)
    expect(open).toBe(1)
    for (const t of ALL_KINDS) {
      expect(moveCostOf(t)).toBeGreaterThanOrEqual(open)
      if (isPassable(t)) expect(moveCostOf(t)).toBeGreaterThan(0)
    }
  })

  it('a rocky climb is the most expensive passable hex — rock plus elevation', () => {
    const passable = ALL_KINDS.filter(isPassable)
    const worst = Math.max(...passable.map(moveCostOf))
    expect(moveCostOf(TERRAIN.ROCKY_HILLS)).toBe(worst)
    expect(moveCostOf(TERRAIN.ROCKY_HILLS)).toBeGreaterThan(moveCostOf(TERRAIN.ROCKY))
    expect(moveCostOf(TERRAIN.ROCKY_HILLS)).toBeGreaterThan(moveCostOf(TERRAIN.HILLS))
  })

  it('the same unit reaches strictly fewer hexes on map.field than on open ground', () => {
    const open = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }],
      [{ type: 'test-zombie', hex: hexId(0, 0) }], { mapId: 'map.open' })
    const field = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }],
      [{ type: 'test-zombie', hex: hexId(0, 0) }], { mapId: 'map.field' })
    for (const c of [open, field]) c.state.units[0]!.movePointsLeft = c.state.units[0]!.movement
    expect(reachable(field, field.state.units[0]!).size)
      .toBeLessThan(reachable(open, open.state.units[0]!).size)
  })

  // I first asserted "a slower unit loses proportionally more to rough ground".
  // That is an intuition, and the engine says it is FALSE: at move 4 the loss is
  // 48%, at move 6 it is 53%. A bigger budget reaches further into the outer ring,
  // and on this map the rough ground is out there — so the fast unit loses more of
  // what it would otherwise have gained. Asserting it would have been a finding
  // wearing a rule's clothes, the same mistake as expect(rangerDamage).toBe(0).
  //
  // The RULE that is actually true, and is what cost means: reaching any given hex
  // never becomes cheaper on rough ground.
  it('rough ground never makes a hex cheaper to reach than open ground does', () => {
    const mk = (mapId: string) => {
      const c = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }],
        [{ type: 'test-zombie', hex: hexId(0, 0) }], { mapId })
      c.state.units[0]!.movePointsLeft = 12
      return reachable(c, c.state.units[0]!)
    }
    const open = mk('map.open'), field = mk('map.field')
    let compared = 0
    for (const [hex, node] of field) {
      const o = open.get(hex)
      if (!o) continue
      expect(node.cost).toBeGreaterThanOrEqual(o.cost)
      compared++
    }
    expect(compared).toBeGreaterThan(40)
  })

  // RETIRED by terrain.passable. While movecost was the newest item, IMPASSABLE
  // existed but nothing used it — that was the claim. terrain.passable is the item
  // that makes obstacles use it. What survives is the part that stays true: every
  // terrain a unit can actually walk on costs a payable amount. (Law 10.)
  it('every passable terrain costs a payable amount', () => {
    expect(IMPASSABLE).toBeGreaterThan(50)
    for (const t of ALL_KINDS) {
      if (isPassable(t)) expect(moveCostOf(t)).toBeLessThan(IMPASSABLE)
      else expect(moveCostOf(t)).toBe(IMPASSABLE)
    }
  })
})

describe('terrain.movecost — the log says what was paid for', () => {
  it('every moved event names the terrain entered, not just a number', () => {
    const ctx = createBattle({ replicate: 4, enemyCount: 8, mapId: 'map.field' })
    runBattle(ctx)
    const moves = ctx.events.filter(e => e.type === 'moved')
    expect(moves.length).toBeGreaterThan(20)
    for (const m of moves) {
      expect(m['terrain'], 'a move with no terrain is a cost nobody can check').toMatch(/^terrain\./)
      // LAW 10 — 2026-08-25, exposed by the 16x16 board, wrong since movement.powers.
      // This asserted cost === the hex's move cost for EVERY moved event. A
      // SIDESTEP deliberately pays nothing ("the destination's terrain cost is
      // irrelevant", GAME-DESIGN §4, ruled 2026-08-17) and calls moveUnit with
      // cost 0, so the assertion was already false for any sidestep onto rough
      // ground — it simply never happened on the smaller board. The rule being
      // tested is "a PATH move pays the hex's cost", so the check now says that.
      if (m.causeId === 'power.move') {
        expect(m['cost']).toBe(moveCostOf(ctx.state.terrain[m['to'] as number]!))
      } else {
        expect(m['cost'], 'a half-step pays no movement points').toBe(0)
      }
    }
  })

  it('rough hexes really are being entered — the map is not decorative', () => {
    const ctx = createBattle({ replicate: 4, enemyCount: 8, mapId: 'map.field' })
    runBattle(ctx)
    const kinds = new Set(ctx.events.filter(e => e.type === 'moved').map(e => e['terrain']))
    expect(kinds.size).toBeGreaterThan(1)
    expect([...kinds].some(k => k !== 'terrain.open')).toBe(true)
  })
})

// ─── terrain.passable ────────────────────────────────────────────────────────
describe('terrain.passable — a wall is a wall', () => {
  it('obstacles are impassable; everything else is not', () => {
    expect(isPassable(TERRAIN.OBSTACLE)).toBe(false)
    for (const t of ALL_KINDS) if (t !== TERRAIN.OBSTACLE) expect(isPassable(t)).toBe(true)
    expect(moveCostOf(TERRAIN.OBSTACLE)).toBe(IMPASSABLE)
  })

  it('map.thicket actually contains obstacles — otherwise this item proves nothing', () => {
    const t = terrainOf('map.thicket')
    expect(t.filter(x => x === TERRAIN.OBSTACLE).length).toBeGreaterThan(0)
  })

  it('reachable() never offers an obstacle, and pathTo never routes through one', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(3, 12) }],
      [{ type: 'test-zombie', hex: hexId(0, 0) }], { mapId: 'map.thicket' })
    const u = ctx.state.units[0]!
    u.movePointsLeft = 12
    const reach = reachable(ctx, u)
    for (const [hex] of reach) expect(ctx.state.terrain[hex]).not.toBe(TERRAIN.OBSTACLE)
    for (const [hex] of reach) {
      for (const step of pathTo(reach, u.hex, hex)) expect(ctx.state.terrain[step]).not.toBe(TERRAIN.OBSTACLE)
    }
  })

  it('no unit enters an obstacle across 60 real battles', () => {
    let entered = 0, moves = 0
    for (let r = 0; r < 60; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, mapId: 'map.thicket' })
      runBattle(ctx)
      for (const e of ctx.events) {
        if (e.type !== 'moved') continue
        moves++
        if (ctx.state.terrain[e['to'] as number] === TERRAIN.OBSTACLE) entered++
      }
    }
    expect(moves).toBeGreaterThan(500)
    expect(entered).toBe(0)
  })

  it('battles on the obstacle map still end — a wall must not strand the AI', () => {
    let capped = 0
    for (let r = 0; r < 60; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, mapId: 'map.thicket' })
      runBattle(ctx)
      if (ctx.state.outcome === 'capped') capped++
    }
    expect(capped).toBe(0)
  })

  it('deployment refuses to place a unit inside a wall, loudly', () => {
    const walled = { id: 'map.walled', name: 'x', note: '',
      rows: ['x'.repeat(16), ...Array(15).fill('.'.repeat(16))] }
    ;(MAPS as unknown as object[]).push(walled)
    expect(() => createBattle({ replicate: 0, mapId: 'map.walled' }))
      .toThrow(/no passable hex on the enemy deployment row/)
    ;(MAPS as unknown as object[]).pop()
  })
})

// ─── terrain.modifiers ───────────────────────────────────────────────────────
describe('terrain.modifiers — the ground is just another modifier', () => {
  it('forest gives cover, water hurts, high ground helps — through the stat pipeline', () => {
    const base = warriorOn(TERRAIN.OPEN)
    const b = (s: StatName) => effective(base.ctx, base.u, s).value
    const on = (t: number, s: StatName) => { const { ctx, u } = warriorOn(t); return effective(ctx, u, s).value }

    expect(on(TERRAIN.FOREST, 'dodge') - b('dodge')).toBe(10)
    expect(on(TERRAIN.FOREST, 'armor') - b('armor')).toBe(1)
    expect(on(TERRAIN.ROCKY, 'armor') - b('armor')).toBe(1)
    expect(on(TERRAIN.ROCKY, 'resist') - b('resist')).toBe(1)
    expect(on(TERRAIN.WATER, 'accuracy') - b('accuracy')).toBe(-10)
    // composed: rocky's -5 plus hills' +10
    expect(on(TERRAIN.ROCKY_HILLS, 'accuracy') - b('accuracy')).toBe(5)
    expect(on(TERRAIN.ROCKY_HILLS, 'reach') - b('reach')).toBe(2)
  })

  it('every terrain modifier names itself in the ledger', () => {
    for (const t of [TERRAIN.FOREST, TERRAIN.ROCKY, TERRAIN.WATER, TERRAIN.ROCKY_HILLS]) {
      const { ctx, u } = warriorOn(t)
      const rows = terrainMods(ctx, u)
      expect(rows.length).toBeGreaterThan(0)
      for (const m of rows) expect(m.source).toBe(terrainIdOf(t))
    }
  })

  it('a modifier is still DERIVED — stepping off the ground drops it', () => {
    const { ctx, u } = warriorOn(TERRAIN.FOREST)
    expect(effective(ctx, u, 'dodge').value).toBeGreaterThan(0)
    ctx.state.terrain[u.hex] = TERRAIN.OPEN
    expect(effective(ctx, u, 'dodge').value).toBe(0)
    expect(terrainMods(ctx, u)).toEqual([])
  })

  it('cover actually lands in a real fight — a forest target is harder to hit', () => {
    const ctx = createCustomBattle([{ type: 'test-ranger', hex: hexId(5, 5) }],
      [{ type: 'test-zombie', hex: hexId(5, 8) }], { mapId: 'map.open' })
    const [r, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
    const open = resolveAccuracy(ctx, r, z, ATTACKS['attack.test-ranger.bow']!).value
    ctx.state.terrain[z.hex] = TERRAIN.FOREST
    const wooded = resolveAccuracy(ctx, r, z, ATTACKS['attack.test-ranger.bow']!).value
    expect(open - wooded).toBe(10)
  })

  it('no new pipeline station was added — terrain rides the stat pipeline', () => {
    const ctx = createCustomBattle([{ type: 'test-ranger', hex: hexId(5, 5) }],
      [{ type: 'test-zombie', hex: hexId(5, 8) }], { mapId: 'map.open' })
    ctx.state.terrain[ctx.state.units[0]!.hex] = TERRAIN.WATER
    const led = resolveAccuracy(ctx, ctx.state.units[0]!, ctx.state.units[1]!, ATTACKS['attack.test-ranger.bow']!).ledger
    expect(led.some(r => r.name === 'TERRAIN')).toBe(false)
    expect(led.some(r => r.effectId === 'terrain.water')).toBe(true)
  })

  it('only maps that CONTAIN the new terrain are affected', () => {
    // map.open and map.ridge hold nothing but open ground and hills, whose values
    // did not change — so a terrain-modifier item must leave them alone entirely.
    for (const mapId of ['map.open', 'map.ridge']) {
      const kinds = new Set(terrainOf(mapId))
      for (const k of kinds) expect([TERRAIN.OPEN, TERRAIN.HILLS]).toContain(k)
    }
  })
})
