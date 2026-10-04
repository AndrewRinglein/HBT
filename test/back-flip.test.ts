// movement.back-flip — Andrew, 2026-10-03 (DECISIONS.md "Back Flip's rules; enemies only move
// together; the motion work comes first"): "Let's create a backflip. Moves 1 hex back, provokes
// nothing, ignores terrain costs, and gives +20 dodge until the end of next activation." /
// "Should cost 1 stamina." / "It's just moving into another square that's adjacent to you."
// The same day: "Let's give it a cooldown of 4. Backflip will be introduced in class powers." and
// "Make it a general rogue and ranger class power."
//
// So: power.back-flip is a movement power, a second instance of the bonus move Side Roll already
// is (one hex, sidestep-shaped, provokes nothing, the destination's cost irrelevant, never the
// Movement stat), priced 1 Stamina with a cooldown of 4, whose rider is the stat modifier Raise
// Guard already carries — "until the end of your next Activation" — on Dodge. It is in the general
// pool of the Rogue and of the Ranger and of no other class; a hero of either class who drafts it
// at a power grant fields it; no hero starts with it.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createBattle, fieldedDef } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation, endActivation, expireActivationMods } from '../src/core/mutate.js'
import { executeSidestep, movementOptions, stepCost, usableMoves } from '../src/core/movement.js'
import { effective } from '../src/core/stats.js'
import * as content from '../src/content/index.js'
import { MOVES } from '../src/content/moves.js'
import { MAPS } from '../src/content/maps.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx } from '../src/core/types.js'
import { hexId, neighboursOf } from './board16.js'

const BF = 'power.back-flip'
const RANGER = 'hero.base.ranger-ranger', ROGUE = 'hero.base.rogue-rose', WARRIOR = 'hero.base.warrior-iron'
const DRAFTED = { level: 1, powers: [BF] } as const
const UNITS = content.UNITS
/** The general pool as the content index publishes it — each class's general class powers. */
const GENERAL_POOL = (content as unknown as { GENERAL_POOL?: Readonly<Record<string, readonly string[]>> }).GENERAL_POOL

/** One hero who drafted Back Flip, alone against one zombie, placed by hand. */
function rig(hero: string, heroHex: number, enemyHex: number, mapId = 'map.open'): Ctx {
  return createBattle({ replicate: 0, mapId, heroes: [hero], heroHexes: [heroHex], enemies: ['test-zombie'], enemyHexes: [enemyHex], enemyCount: 1, heroProgress: [DRAFTED], strict: true })
}
/** One Activation of unit `id`, then its end — the ladder's own order. */
function activate(ctx: Ctx, id: number, during?: () => void) {
  beginActivation(ctx, id, 'test'); during?.(); endActivation(ctx, id, 'test'); expireActivationMods(ctx, id, 'activation.end')
}

describe('the row is the Codex row — data, not code', () => {
  it('Back Flip: 1 Stamina, cooldown 4, one hex, +20 Dodge until the end of the user\'s next Activation', () => {
    expect(MOVES[BF]).toMatchObject({
      id: BF, name: 'Back Flip', staminaCost: 1, cooldown: 4,
      move: { shape: 'sidestep', stepRange: 1, budgetMod: 0 },
      effects: [{ kind: 'statMod', stat: 'dodge', value: 20, until: 'endOfNextActivation' }],
    })
    expect(MOVES[BF]!.effects).toHaveLength(1)
  })

  it('it is a second instance of the bonus move Side Roll already is: the same movement profile, nothing new in it', () => {
    expect(MOVES[BF]!.move).toEqual(MOVES['power.side-roll']!.move)
    expect(Object.keys(MOVES[BF]!).sort()).toEqual([...Object.keys(MOVES['power.side-roll']!), 'effects'].sort())
  })

  it('Side Roll and Sidestep are unchanged', () => {
    expect(MOVES['power.side-roll']).toMatchObject({ staminaCost: 1, cooldown: 0, move: { shape: 'sidestep', stepRange: 1 } })
    expect(MOVES['power.side-roll']!.effects).toBeUndefined()
    expect(MOVES['power.sidestep']).toMatchObject({ staminaCost: 0, cooldown: 1, move: { shape: 'sidestep', stepRange: 1 } })
    expect(MOVES['power.sidestep']!.effects).toBeUndefined()
  })

  it('the Codex authors it beside Sidestep, Side Roll and Leap, as a bonus move in two classes\' general pool and nobody\'s starting move', () => {
    const settled = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'settled.json'), 'utf8')) as { powers: { id: string; [k: string]: unknown }[] }
    const row = settled.powers.find((p) => p.id === BF)
    expect(row, 'settled.json has no power.back-flip row').toBeDefined()
    expect(row).toMatchObject({ name: 'Back Flip', stamina: 1, cooldown: 4, movementAction: true, bonusMove: true, generalPoolOf: ['class.rogue', 'class.ranger'] })
    expect(row!['grantedToClasses'] ?? []).toEqual([])
    const ids = settled.powers.map((p) => p.id)
    expect(ids.indexOf(BF)).toBe(ids.indexOf('power.side-roll') + 1)
    const classes = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'gen', 'classes.json'), 'utf8')) as { classes: { id: string; bonusMove?: string | null }[] }
    expect(classes.classes.find((c) => c.id === 'class.rogue')!.bonusMove).toBe('power.side-roll')
    expect(classes.classes.find((c) => c.id === 'class.ranger')!.bonusMove).toBe('power.side-roll')
  })
})

describe('who has it: the Rogue\'s and the Ranger\'s general pool, and nobody from the start', () => {
  it('it is in the general pool of the Rogue and of the Ranger, and of no other class', () => {
    expect(GENERAL_POOL, 'the content index publishes no general pool').toBeDefined()
    expect(GENERAL_POOL!['class.rogue']).toContain(BF)
    expect(GENERAL_POOL!['class.ranger']).toContain(BF)
    expect(Object.entries(GENERAL_POOL!).filter(([, ids]) => ids.includes(BF)).map(([c]) => c).sort()).toEqual(['class.ranger', 'class.rogue'])
  })

  it('no hero starts with it — no unit row carries it, so no existing battle moves', () => {
    expect(Object.values(UNITS).filter((u) => u.moves.includes(BF) || u.abilities.includes(BF)).map((u) => u.typeId)).toEqual([])
  })

  it('a Rogue or a Ranger who drafted it at a power grant fields it — beside its walk and its Side Roll, whatever its specialty', () => {
    for (const hero of [RANGER, ROGUE]) {
      const def = fieldedDef(hero, { progress: DRAFTED })
      expect(def.moves, hero).toContain(BF)
      expect(def.moves, hero).toContain('power.side-roll')
      expect(def.moves[0], hero + ' walks first').toBe(UNITS[hero]!.moves[0])
      expect(def.abilities, hero + ': a movement power is not a primary-action power').not.toContain(BF)
      expect(fieldedDef(hero).moves, hero + ' undrafted').toEqual(UNITS[hero]!.moves)
    }
    const specialised = fieldedDef(ROGUE, { progress: { level: 2, specialtyId: 'specialty.assassin', powers: [BF] } })
    expect(specialised.moves).toContain(BF)
  })

  it('a class whose general pool does not hold it cannot draft it, and a Ranger cannot draft another class\'s move', () => {
    expect(() => fieldedDef(WARRIOR, { progress: DRAFTED })).toThrow(/general pool/)
    expect(() => fieldedDef(RANGER, { progress: { level: 1, powers: ['power.leap'] } })).toThrow(/general pool/)
  })
})

describe('what it does', () => {
  it('spends 1 Stamina and moves exactly 1 hex into any open adjacent hex — out of a zone of control, provoking nothing', () => {
    const at = hexId(5, 5), foe = hexId(6, 5)
    const ctx = rig(RANGER, at, foe)
    const r = ctx.state.units[0]!
    expect(ctx.geo.distance(at, foe)).toBe(1)
    beginActivation(ctx, r.id, 'test')
    const open = neighboursOf(at).filter((h) => h !== foe).sort((a, b) => a - b)
    expect(movementOptions(ctx, r.id, BF).map((p) => p.destination).sort((a, b) => a - b), 'any adjacent hex, and only those').toEqual(open)
    const to = open.find((h) => ctx.geo.distance(h, foe) === 2)!
    const stam = r.stamina
    expect(executeSidestep(ctx, r.id, to, MOVES[BF]!)).toBe(true)
    expect(r.hex).toBe(to)
    expect(r.stamina).toBe(stam - 1)
    expect(ctx.events.filter((e) => e.type === 'aoo.provoked' || e.type === 'attack.declared')).toEqual([])
    expect(() => executeSidestep(rigged(), 0, hexId(8, 5), MOVES[BF]!)).toThrow(/exactly 1 hex/)
    function rigged() { const c = rig(RANGER, hexId(5, 5), hexId(12, 12)); beginActivation(c, 0, 'test'); return c }
  })

  it('whatever the destination costs: onto ground a walk could not afford, with no movement points left', () => {
    const map = MAPS.find((m) => m.id === 'map.thicket')!
    const probe = rig(RANGER, hexId(0, 0), hexId(15, 15), map.id)
    let from = -1, to = -1
    for (let h = 0; h < probe.geo.hexCount && to < 0; h++) {
      if (stepCost(probe, h) !== 1 || h === hexId(0, 0) || h === hexId(15, 15)) continue
      const costly = probe.geo.neighboursOf(h).find((n) => Number.isFinite(stepCost(probe, n, h)) && stepCost(probe, n, h) >= 2 && n !== hexId(15, 15))
      if (costly !== undefined) { from = h; to = costly }
    }
    expect(to, 'map.thicket has no hex costing 2 or more beside an open one').toBeGreaterThanOrEqual(0)
    const ctx = rig(RANGER, from, hexId(15, 15), map.id)
    const r = ctx.state.units[0]!
    beginActivation(ctx, r.id, 'test')
    r.movePointsLeft = 0
    expect(stepCost(ctx, to, from)).toBeGreaterThanOrEqual(2)
    expect(movementOptions(ctx, r.id, BF).map((p) => p.destination)).toContain(to)
    expect(executeSidestep(ctx, r.id, to, MOVES[BF]!)).toBe(true)
    const mv = ctx.events.find((e) => e.type === 'moved' && e.causeId === BF)!
    expect(mv['cost'], 'the destination\'s terrain cost is irrelevant').toBe(0)
    expect(r.hex).toBe(to)
  })

  it('+20 Dodge until the end of its own next Activation — through the Enemy Phase between — then no longer', () => {
    const ctx = rig(ROGUE, hexId(5, 5), hexId(12, 12))
    const r = ctx.state.units[0]!
    const base = effective(ctx, r, 'dodge').value
    activate(ctx, r.id, () => {
      executeSidestep(ctx, r.id, hexId(6, 5), MOVES[BF]!)
      expect(effective(ctx, r, 'dodge').value, 'at once').toBe(base + 20)
    })
    expect(effective(ctx, r, 'dodge').value, 'after the Activation it was used in').toBe(base + 20)
    const added = ctx.events.filter((e) => e.type === 'statmod.added' && e.causeId === BF)
    expect(added).toHaveLength(1)
    expect(added[0]).toMatchObject({ stat: 'dodge', value: 20 })
    // the Enemy Phase between: the zombie acts, the Turn turns
    activate(ctx, 1)
    ctx.state.turn += 1
    expect(effective(ctx, r, 'dodge').value, 'through the Enemy Phase and into the next Turn').toBe(base + 20)
    activate(ctx, r.id, () => {
      expect(effective(ctx, r, 'dodge').value, 'during its next Activation').toBe(base + 20)
    })
    expect(effective(ctx, r, 'dodge').value, 'once its next Activation has ended').toBe(base)
    expect(r.mods.filter((m) => m.source === BF)).toEqual([])
  })

  it('cannot be used again until its cooldown of 4 has run; Side Roll is still there every Turn', () => {
    const ctx = rig(RANGER, hexId(5, 5), hexId(12, 12))
    const r = ctx.state.units[0]!
    ctx.state.turn = 3
    beginActivation(ctx, r.id, 'test')
    expect(usableMoves(ctx, r).map((m) => m.id)).toContain(BF)
    executeSidestep(ctx, r.id, hexId(6, 5), MOVES[BF]!)
    const ids = () => { beginActivation(ctx, r.id, 'test'); return usableMoves(ctx, r).map((m) => m.id) }
    for (const turn of [4, 5, 6, 7]) {
      ctx.state.turn = turn
      r.stamina = r.maxStamina
      expect(ids(), `Turn ${turn}: down`).not.toContain(BF)
      expect(ids(), `Turn ${turn}: Side Roll has no cooldown`).toContain('power.side-roll')
    }
    ctx.state.turn = 8
    expect(ids(), 'Turn 8: the four Turns have run').toContain(BF)
  })

  it('it is the Activation\'s movement: it takes the movement slot, as Side Roll does, and is itself down at once', () => {
    // A second movement may still take the PRIMARY slot (action slots: a movement is 'either') — that is the
    // engine's rule for every movement power and Back Flip does not change it.
    const ctx = rig(RANGER, hexId(5, 5), hexId(12, 12))
    const r = ctx.state.units[0]!
    beginActivation(ctx, r.id, 'test')
    expect(r.moveUsed).toBe(false)
    executeSidestep(ctx, r.id, hexId(6, 5), MOVES[BF]!)
    expect(r.moveUsed).toBe(true)
    expect(ctx.events.find((e) => e.type === 'action.spent' && e.causeId === BF)).toMatchObject({ slot: 'movement' })
    const walk = r.actions.find((a) => ctx.actions[a]?.move?.shape === 'path')!
    expect(movementOptions(ctx, r.id, 'power.side-roll', 'movement'), 'no second movement in the movement slot').toEqual([])
    expect(movementOptions(ctx, r.id, walk, 'movement')).toEqual([])
    expect(movementOptions(ctx, r.id, BF), 'on cooldown').toEqual([])
  })
})

describe('in a real battle', () => {
  it('a Ranger who drafted it uses it — the fielding test.back-flip — and gains the Dodge', () => {
    const s = SCENARIOS['test.back-flip']
    expect(s, 'no scenario test.back-flip is registered').toBeDefined()
    expect(s!.heroProgress?.some((p) => p?.powers?.includes(BF))).toBe(true)
    const ctx = createBattle(scenarioOptions(s!))
    runBattle(ctx)
    const flips = ctx.events.filter((e) => e.type === 'moved' && e.causeId === BF)
    expect(flips.length, 'nobody back-flipped').toBeGreaterThan(0)
    expect(flips.every((e) => e['cost'] === 0)).toBe(true)
    expect(ctx.events.filter((e) => e.type === 'statmod.added' && e.causeId === BF && e['stat'] === 'dodge' && e['value'] === 20).length).toBe(flips.length)
  })

  it('and on the standard panel, where nobody drafted it, nobody uses it', () => {
    for (const replicate of [0, 1, 2]) {
      const ctx = createBattle({ replicate })
      runBattle(ctx)
      expect(ctx.events.filter((e) => e.causeId === BF)).toEqual([])
    }
  })
})
