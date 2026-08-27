// Flight — the atomic jump. Angela 2026-08-20 (GAME-DESIGN §Movement
// keywords, rewritten): "Click the destination hex and fly there as one
// motion: no square-by-square movement, every terrain effect and impassable
// hex in between is skipped, and only the destination needs to be viable...
// Landing is real." The ladder is Codex-published the same day: "labored 2
// stamina and Movement -1, standard 1 stamina and full Movement, swift 0
// stamina and Movement +1." The only grantor today is the BENCHED Green Drake
// (her dictated block: "a flight movement power that moves +0 and costs 1
// stamina") — so every battle here is a custom battle, like the rest of the
// beast pen.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { runBattle, endOfActivation } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'
import { applyStatus } from '../src/core/status.js'
import { executeFlight, executeMove, flightLandings, flightRange, pathTo, reachable } from '../src/core/movement.js'
import { MOVES } from '../src/content/moves.js'
import { UNITS } from '../src/content/index.js'
import { hexId, neighboursOf, distance } from '../src/core/hex.js'

const valueOf = (u: { statuses: { id: string; value: number }[] }, id: string) =>
  u.statuses.find((s) => s.id === id)?.value ?? 0

describe('the ladder is data — three rows, one shape', () => {
  it('labored / standard / swift carry the Codex costs and modifiers', () => {
    expect(MOVES['power.flight']).toMatchObject({ shape: 'flight', staminaCost: 1, budgetMod: 0 })
    expect(MOVES['power.flight-swift']).toMatchObject({ shape: 'flight', staminaCost: 0, budgetMod: 1 })
    expect(MOVES['power.flight-labored']).toMatchObject({ shape: 'flight', staminaCost: 2, budgetMod: -1 })
  })
  it('the drake grants the standard rung, wings before feet, and no half-step (beasts get neither)', () => {
    expect(UNITS['green-drake']!.moves).toEqual(['power.flight', 'power.move'])
  })
  it('the rungs change the range, pure data: 5 points fly 4 / 5 / 6', () => {
    const ctx = createCustomBattle(
      [{ type: 'green-drake', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(11, 11) }],
    )
    const d = ctx.state.units[0]!
    beginActivation(ctx, d.id, 'test')
    expect(flightRange(d, MOVES['power.flight-labored']!)).toBe(4)
    expect(flightRange(d, MOVES['power.flight']!)).toBe(5)
    expect(flightRange(d, MOVES['power.flight-swift']!)).toBe(6)
  })
})

describe('zero Steps — the ground between is never touched', () => {
  it('flying across the ember band catches nothing; walking the same line catches 2', () => {
    // test.map.embers rows 4-5 are the full-width burning band. Same start,
    // same destination, the only difference is the CHOICE of movement power.
    const fly = createCustomBattle(
      [{ type: 'green-drake', hex: hexId(3, 3) }],
      [{ type: 'zombie', hex: hexId(11, 11) }],
      { mapId: 'test.map.embers' },
    )
    const fd = fly.state.units[0]!
    beginActivation(fly, fd.id, 'test')
    expect(executeFlight(fly, fd.id, hexId(3, 6), MOVES['power.flight']!)).toBe(true)
    expect(fd.hex).toBe(hexId(3, 6))
    expect(valueOf(fd, 'status.burn'), 'no entry beat fired in the air').toBe(0)
    expect(fly.events.filter((e) => e.type === 'status.applied' && e.causeId === 'terrain.burning')).toHaveLength(0)

    const walk = createCustomBattle(
      [{ type: 'green-drake', hex: hexId(3, 3) }],
      [{ type: 'zombie', hex: hexId(11, 11) }],
      { mapId: 'test.map.embers' },
    )
    const wd = walk.state.units[0]!
    beginActivation(walk, wd.id, 'test')
    executeMove(walk, wd.id, pathTo(reachable(walk, wd), wd.hex, hexId(3, 6)), MOVES['power.move']!)
    expect(valueOf(wd, 'status.burn'), 'the walker splashes through both ember rows').toBe(2)
  })

  it('flying over water sheds no Burn — the wash is an entry beat, and flight has no entries', () => {
    // Land BEYOND the band: the jump crosses rows 4-5 (embers map has no
    // water, so use a synthetic check on the thicket river instead: the drake
    // carries Burn, jumps a water-adjacent line, and keeps every stack).
    const ctx = createCustomBattle(
      [{ type: 'green-drake', hex: hexId(3, 3) }],
      [{ type: 'zombie', hex: hexId(11, 11) }],
      { mapId: 'map.thicket' },
    )
    const d = ctx.state.units[0]!
    applyStatus(ctx, d.id, 'status.burn', 3, 'test')
    beginActivation(ctx, d.id, 'test')
    const landings = flightLandings(ctx, d, MOVES['power.flight']!)
    const far = landings.filter((h) => distance(h, d.hex) >= 3).sort((a, b) => a - b)[0]!
    executeFlight(ctx, d.id, far, MOVES['power.flight']!)
    expect(valueOf(d, 'status.burn'), 'nothing between start and landing was entered').toBe(3)
    expect(ctx.events.filter((e) => e.type === 'status.reduced' && e.causeId === 'terrain.water')).toHaveLength(0)
  })

  it('boxed in by six zombies, the walk is dead and the wings are not', () => {
    const centre = hexId(6, 6)
    const ctx = createCustomBattle(
      [{ type: 'green-drake', hex: centre }],
      neighboursOf(centre).map((h) => ({ type: 'zombie', hex: h })),
    )
    const d = ctx.state.units[0]!
    beginActivation(ctx, d.id, 'test')
    expect(reachable(ctx, d).size, 'no path out on foot').toBe(0)
    const landings = flightLandings(ctx, d, MOVES['power.flight']!)
    expect(landings.length, 'the air is open').toBeGreaterThan(0)
    const out = landings.filter((h) => distance(h, centre) === 2).sort((a, b) => a - b)[0]!
    expect(executeFlight(ctx, d.id, out, MOVES['power.flight']!)).toBe(true)
    expect(d.hex).toBe(out)
  })
})

describe('landing is real', () => {
  it('the landing hex fires its End-of-Activation rung — embers catch AFTER you land on them', () => {
    const ctx = createCustomBattle(
      [{ type: 'green-drake', hex: hexId(3, 3) }],
      [{ type: 'zombie', hex: hexId(11, 11) }],
      { mapId: 'test.map.embers' },
    )
    const d = ctx.state.units[0]!
    beginActivation(ctx, d.id, 'test')
    executeFlight(ctx, d.id, hexId(3, 4), MOVES['power.flight']!)   // land IN the band
    expect(valueOf(d, 'status.burn'), 'the touchdown itself is not an entry beat').toBe(0)
    const hpBefore = d.hp
    endOfActivation(ctx, d.id)
    // LAW 10 — 2026-08-26 (fix.status-tick-timing): the EoA ladder now ends
    // with the unit's own status tick, so the landing burn catches (applies 1),
    // COOKS (deals its damage this very activation — "catch before you cook"),
    // and decays to 0 in the same ladder run. The claim under test is
    // unchanged: the landing hex is a hex like any other and its EoA rung
    // fires. The evidence moves from a lingering value to the event trail.
    expect(ctx.events.some((e) => e.type === 'status.applied'
      && e['statusId'] === 'status.burn' && e.causeId === 'terrain.burning'),
      'the landing hex must apply its burn').toBe(true)
    // The drake carries Resist 1, and the ruled tick-resist (2026-08-20) says
    // per-tick damage = max(0, value − Resist) — so this 1-burn tick deals 0
    // to THIS unit, correctly. A resisted status still runs its full clock:
    // the tick happened (the value decayed), the damage was blanked by Resist.
    expect(hpBefore - d.hp, 'Resist 1 blanks a 1-burn tick').toBe(0)
    expect(valueOf(d, 'status.burn'), 'and it still decays on its own clock').toBe(0)
  })

  it('flight costs its stamina and one movement slot, and the point store never goes negative', () => {
    const ctx = createCustomBattle(
      [{ type: 'green-drake', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(11, 11) }],
    )
    const d = ctx.state.units[0]!
    beginActivation(ctx, d.id, 'test')
    const stam = d.stamina
    // Swift can jump one hex past the store (budget +1); the extra hex is the
    // power's, not the store's.
    const dest = flightLandings(ctx, d, MOVES['power.flight-swift']!)
      .filter((h) => distance(h, d.hex) === 6).sort((a, b) => a - b)[0]!
    executeFlight(ctx, d.id, dest, MOVES['power.flight-swift']!)
    expect(d.stamina, 'swift is free').toBe(stam)
    expect(d.moveUsed).toBe(true)
    expect(d.movePointsLeft).toBe(0)
    const mv = ctx.events.find((e) => e.type === 'moved' && e.causeId === 'power.flight-swift')!
    expect(mv['cost'], 'the store paid its 5; the rung paid the 6th').toBe(5)
  })
})

describe('the AI chooses the wings when they win', () => {
  it('a kiting drake flies in real battles on broken ground', () => {
    // The RULE: flight is a live CHOICE, not dead data — across a handful of
    // custom battles on the terrain-heavy map, the drake's kite AI uses it.
    // Which seeds fly is a finding; that some do is the rule. Disabling
    // power.flight grounds the drake and fails this test (kill-switch).
    let flew = 0
    for (let r = 0; r < 8; r++) {
      const ctx = createCustomBattle(
        [{ type: 'green-drake', hex: hexId(2, 10) }],
        [{ type: 'zombie', hex: hexId(4, 1) }, { type: 'zombie', hex: hexId(8, 1) },
         { type: 'zombie', hex: hexId(6, 2) }, { type: 'zombie', hex: hexId(10, 2) }],
        { mapId: 'map.thicket', replicate: r },
      )
      runBattle(ctx)
      flew += ctx.events.filter((e) => e.type === 'move.begin' && e.causeId === 'power.flight').length
    }
    expect(flew).toBeGreaterThan(0)
  })
})
