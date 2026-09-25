// v2.structures — walls, towers and houses, as Andrew ruled 2026-09-24 (engine/DECISIONS.md,
// the three answers on them, verbatim there). What the item's `expect` asks, one describe each:
//   • the ruled numbers each appear as one ledger row naming the structure;
//   • the enemy's penalties apply only when the attacker is not in the same kind of structure;
//   • a non-hero cannot enter a tower;
//   • a unit reaches a wall top only through its stair facing;
//   • Block rolls read the added Block.
// Numbers asserted here are the ruling's own ("-20", "10 block", "-25", "15 blocks and 1
// armor", "+2 reach and +10 accuracy", "+1 reach and +5 accuracy", "-10", "5 dodge", "cost 2
// extra moves", "costs one extra") — copied, not chosen.
import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { canAttack, performAttack, preview, reachOf, resolveBlock } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { executeKnockback, executeMove, movePowerOf, pathTo, reachable } from '../src/core/movement.js'
import { runBattle } from '../src/core/battle.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { decodeEntries, moveCostOf, structureOf } from '../src/content/maps.js'
import { TERRAIN } from '../src/core/types.js'
import type { Ctx } from '../src/core/types.js'

const BOW = 'attack.test-ranger.bow'
const AXE = 'attack.test-warrior.axe'
const BITE = 'attack.test-zombie.bite'
const W = 7
const at = (row: number, col: number) => row * W + col
const blank = () => Array.from({ length: 5 }, () => '.'.repeat(W))
/** A 7×5 board; `paint` puts a glyph on a hex. */
const board = (paint: Record<number, string> = {}) => {
  const rows = blank().map((r) => r.split(''))
  for (const [h, g] of Object.entries(paint)) rows[Math.trunc(+h / W)]![+h % W] = g
  return rows.map((r) => r.join(''))
}
/**
 * One hero, one enemy. `byList` fields the enemy list as the enemy side whatever its row says,
 * so a test Ranger can shoot at a hero. Crits off, triggers and Block zeroed, HP deep.
 */
function rig(rows: string[], hero: [string, number], enemy: [string, number], entries?: [number, number][]): Ctx {
  const ctx = createBattle({
    replicate: 0, map: { id: 'test.map.structures-rig', name: 'Structures rig TEST', rows, ...(entries ? { entries } : {}) } as never,
    heroes: [hero[0]], enemies: [enemy[0]], heroHexes: [hero[1]], enemyHexes: [enemy[1]], sides: 'byList',
    cfg: { switches: { critEnabled: false } as never },
  })
  for (const u of ctx.state.units) { u.triggers = []; u.block = 0; u.rangedBlock = 0; u.hp = u.maxHp = 50 }
  return ctx
}
const rows = (p: ReturnType<typeof preview>, name: string) => p.accLedger.filter((r) => r.name === name)
/** The enemy (unit 1) attacks the hero (unit 0) standing at `hex`, on a board painted `paint`. */
const attackOn = (paint: Record<number, string>, hex: number, attacker: [string, number], attack: string) =>
  preview(rig(board(paint), ['test-warrior', hex], attacker), 1, 0, attack)

describe('each ruled number is one ledger row naming its structure', () => {
  const HERO = at(1, 2), BITER = at(1, 3), SHOOTER = at(1, 5)
  const open = attackOn({}, HERO, ['test-zombie', BITER], BITE)
  it('wall — the enemy −20 accuracy, and +10 Block', () => {
    const p = attackOn({ [HERO]: 'W' }, HERO, ['test-zombie', BITER], BITE)
    expect(rows(p, 'STRUCTURE')).toEqual([expect.objectContaining({ station: 425, effectId: 'terrain.wall', delta: -20 })])
    expect(p.accuracy).toBe(open.accuracy - 20)
    expect(p.blockChance).toBe(open.blockChance + 10)
  })
  it('wall — "the wall adds to both": +10 Ranged Block against a shot too', () => {
    const shotOpen = attackOn({}, HERO, ['test-ranger', SHOOTER], BOW)
    const p = attackOn({ [HERO]: 'W' }, HERO, ['test-ranger', SHOOTER], BOW)
    expect(p.blockChance).toBe(shotOpen.blockChance + 10)
    expect(p.accuracy).toBe(shotOpen.accuracy - 20)
  })
  it('tower — the enemy −25 (flat), +15 Block, +1 Armor on the hit', () => {
    const p = attackOn({ [HERO]: 'T' }, HERO, ['test-zombie', BITER], BITE)
    expect(rows(p, 'STRUCTURE')).toEqual([expect.objectContaining({ station: 425, effectId: 'terrain.tower', delta: -25 })])
    expect(p.accuracy).toBe(open.accuracy - 25)
    expect(p.blockChance).toBe(open.blockChance + 15)
    const armor = p.packetsOnHit[0]!.ledger.filter((r) => r.name === 'STRUCTURE_ARMOR')
    expect(armor).toEqual([expect.objectContaining({ station: 600, effectId: 'terrain.tower', delta: -1 })])
    expect(p.damageOnHit).toBe(Math.max(0, open.damageOnHit - 1))
  })
  it('tower — its +15 is Ranged Block as well (SWITCHES.md towerRangedBlock)', () => {
    const shotOpen = attackOn({}, HERO, ['test-ranger', SHOOTER], BOW)
    expect(attackOn({ [HERO]: 'T' }, HERO, ['test-ranger', SHOOTER], BOW).blockChance).toBe(shotOpen.blockChance + 15)
  })
  it('house — the enemy −10 accuracy, and +5 Dodge on its own row', () => {
    const p = attackOn({ [HERO]: 'H' }, HERO, ['test-zombie', BITER], BITE)
    expect(rows(p, 'STRUCTURE')).toEqual([expect.objectContaining({ station: 425, effectId: 'terrain.house', delta: -10 })])
    expect(rows(p, 'TARGET_DODGE').filter((r) => r.effectId === 'terrain.house')).toEqual([expect.objectContaining({ station: 600, delta: -5 })])
    expect(p.accuracy).toBe(open.accuracy - 15)
    expect(p.blockChance).toBe(open.blockChance)
  })
  it("the occupant's own: a wall +5 accuracy and +1 reach, a tower +10 and +2 — every attack, melee too", () => {
    const from = (glyph: string, hero: string, attack: string) => {
      const ctx = rig(board(glyph ? { [HERO]: glyph } : {}), [hero, HERO], ['test-zombie', at(4, 6)])
      return { ctx, p: preview(ctx, 0, 1, attack), reach: reachOf(ctx, ctx.state.units[0]!, ctx.actions[attack] as never) }
    }
    const axe = from('', 'test-warrior', AXE), bow = from('', 'test-ranger', BOW)
    const wallAxe = from('W', 'test-warrior', AXE), towerBow = from('T', 'test-ranger', BOW)
    expect(wallAxe.p.accLedger.filter((r) => r.effectId === 'terrain.wall')).toEqual([expect.objectContaining({ name: 'BASE_MOD', delta: 5 })])
    expect(wallAxe.reach).toBe(axe.reach + 1)
    expect(towerBow.p.accLedger.filter((r) => r.effectId === 'terrain.tower')).toEqual([expect.objectContaining({ name: 'BASE_MOD', delta: 10 })])
    expect(towerBow.reach).toBe(bow.reach + 2)
  })
  it('a Warrior up on a wall swings his axe at a zombie two hexes off; on open ground he cannot', () => {
    const two = at(1, 4)
    expect(canAttack(rig(board({ [HERO]: 'W' }), ['test-warrior', HERO], ['test-zombie', two]), 0, 1, AXE)).toBe(true)
    expect(canAttack(rig(board(), ['test-warrior', HERO], ['test-zombie', two]), 0, 1, AXE)).toBe(false)
  })
})

describe('the penalties apply only against an attacker who is not in the same kind of structure', () => {
  const HERO = at(1, 2), BITER = at(1, 3)
  const structure = (p: ReturnType<typeof preview>) => rows(p, 'STRUCTURE')
  it('a zombie up on the wall beside him: no −20, no +10 Block', () => {
    const p = attackOn({ [HERO]: 'W', [BITER]: 'W' }, HERO, ['test-zombie', BITER], BITE)
    const open = attackOn({ [BITER]: 'W' }, HERO, ['test-zombie', BITER], BITE)
    expect(structure(p)).toEqual([])
    expect(p.blockChance).toBe(open.blockChance)
  })
  it('"an enemy who is not in a wall or a tower": one in a tower does not suffer the wall', () => {
    expect(structure(attackOn({ [HERO]: 'W', [BITER]: 'T' }, HERO, ['test-zombie', BITER], BITE))).toEqual([])
  })
  it('but the tower is "not also in a tower" only: an enemy on a wall still suffers the tower', () => {
    const p = attackOn({ [HERO]: 'T', [BITER]: 'W' }, HERO, ['test-zombie', BITER], BITE)
    expect(structure(p)).toEqual([expect.objectContaining({ effectId: 'terrain.tower', delta: -25 })])
  })
  it('house against house: nothing; a house does not guard against a wall or a tower either way', () => {
    expect(structure(attackOn({ [HERO]: 'H', [BITER]: 'H' }, HERO, ['test-zombie', BITER], BITE))).toEqual([])
    expect(structure(attackOn({ [HERO]: 'H', [BITER]: 'W' }, HERO, ['test-zombie', BITER], BITE))).toEqual([expect.objectContaining({ effectId: 'terrain.house', delta: -10 })])
  })
})

describe('a non-hero cannot enter a tower', () => {
  const TOWER = at(1, 2)
  it('a zombie beside a tower cannot step in; a Ranger beside it can, for 3 move', () => {
    const z = rig(board({ [TOWER]: 'T' }), ['test-ranger', at(4, 6)], ['test-zombie', at(1, 3)])
    beginActivation(z, 1, 'test')
    const zr = reachable(z, z.state.units[1]!)
    expect(zr.get(at(1, 4))?.cost).toBe(1)   // it can move — just not in
    expect(zr.has(TOWER)).toBe(false)
    const h = rig(board({ [TOWER]: 'T' }), ['test-ranger', at(1, 3)], ['test-zombie', at(4, 6)])
    beginActivation(h, 0, 'test')
    expect(reachable(h, h.state.units[0]!).get(TOWER)?.cost).toBe(3)
    expect(moveCostOf(TERRAIN.TOWER)).toBe(3)
  })
  it('a zombie shoved at a tower collides with it — "a wall — 2", the tower named', () => {
    // the hero pushes the zombie one hex east, from col 1 through col 2 into the tower at col 3
    const ctx = rig(board({ [at(1, 3)]: 'T' }), ['test-warrior', at(1, 1)], ['test-zombie', at(1, 2)])
    const hp = ctx.state.units[1]!.hp
    expect(executeKnockback(ctx, 0, 1, 1, 'test.shove')).toBe(0)
    const blocked = ctx.events.find((e) => e.type === 'knockback.blocked')
    expect(blocked).toEqual(expect.objectContaining({ collidedWith: 'structure', blocker: 'terrain.tower', collisionValue: 2 }))
    expect(ctx.state.units[1]!.hp).toBe(hp - 2)
  })
  it('the zombies in the tower-and-wall scenario never set foot in the tower', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.structures']!))
    runBattle(ctx)
    const tower = 18
    const zombies = ctx.state.units.filter((u) => u.side === 'enemy').map((u) => u.id)
    expect(ctx.events.filter((e) => e.type === 'moved' && zombies.includes(e.actor as number) && (e as unknown as { to: number }).to === tower)).toEqual([])
  })
})

describe('a unit reaches a wall top only through its stair facing', () => {
  // A wall run down col 3 (rows 1–3); stairs on its middle hex, entered from the west (col 2).
  const WALL = [at(1, 3), at(2, 3), at(3, 3)], STAIR = at(2, 3), FOOT = at(2, 2)
  const paint = Object.fromEntries(WALL.map((h) => [h, 'W']))
  const walker = (hex: number, entries?: [number, number][]) => {
    const ctx = rig(board(paint), ['test-warrior', hex], ['test-zombie', at(4, 6)], entries)
    beginActivation(ctx, 0, 'test')
    return { ctx, reach: reachable(ctx, ctx.state.units[0]!) }
  }
  it('from the stair foot, up costs 2 — its ground and one extra', () => {
    expect(walker(FOOT, [[STAIR, FOOT]]).reach.get(STAIR)?.cost).toBe(2)
  })
  it('no stairs, no way up: a wall with no entry cannot be climbed from anywhere', () => {
    const { reach } = walker(FOOT)
    for (const h of WALL) expect(reach.has(h)).toBe(false)
  })
  it('from the far side the way up goes round to the stairs, never straight up the face', () => {
    const EAST = at(2, 4)
    const { reach } = walker(EAST, [[STAIR, FOOT]])
    expect(reach.has(STAIR)).toBe(false)   // five move cannot go round the wall and up
    const near = walker(at(3, 2), [[STAIR, FOOT]])
    expect(pathTo(near.reach, at(3, 2), STAIR)).toEqual([FOOT, STAIR])
  })
  // LAW 10 — 2026-09-25: this test asserted the provisional default `wallDescent` (down on any
  // side). Andrew then RULED the opposite (DECISIONS.md 2026-09-25): "You must leave the walls the
  // same way you came up." Rewritten to the ruling; the walk along the top is unchanged.
  it('along the top at 1 a hex (SWITCHES.md wallTopMove), and down only the way you came up', () => {
    expect(walker(FOOT, [[STAIR, FOOT]]).reach.get(at(1, 3))?.cost).toBe(3)
    const { ctx } = walker(STAIR, [[STAIR, FOOT]])
    const w = ctx.state.units[0]!
    expect(executeMove(ctx, 0, [at(2, 4)], movePowerOf(ctx, w, 'path')!)).toBe(0)   // not down the far face
    expect(executeMove(ctx, 0, [FOOT], movePowerOf(ctx, w, 'path')!)).toBe(1)       // down the stairs
    expect(w.hex).toBe(FOOT)
  })
  it('up on the wall, the ground below is reached only by the stairs; a push off the far face is a collision', () => {
    const up = walker(STAIR, [[STAIR, FOOT]])
    expect(up.reach.get(FOOT)?.cost).toBe(1)
    expect(up.reach.has(at(2, 4))).toBe(false)   // never straight off the far face (and round by the stairs is out of reach)
    const ctx = rig(board(paint), ['test-warrior', STAIR], ['test-zombie', FOOT], [[STAIR, FOOT]])
    executeKnockback(ctx, 1, 0, 1, 'test.shove')
    expect(ctx.events.find((e) => e.type === 'knockback.blocked')).toEqual(expect.objectContaining({ collidedWith: 'structure', blocker: 'terrain.wall' }))
    expect(ctx.state.units[0]!.hex).toBe(STAIR)
  })
  it('an entry must sit beside its hex, on a wall or a house, one per hex', () => {
    const b = { width: W, height: 5 }, t = board(paint).join('').split('').map((c) => (c === 'W' ? TERRAIN.WALL : TERRAIN.OPEN))
    expect(decodeEntries([[STAIR, FOOT]], b, t)).toEqual([[STAIR, FOOT]])
    expect(() => decodeEntries([[STAIR, at(0, 0)]], b, t)).toThrow(/not beside/)
    expect(() => decodeEntries([[STAIR, FOOT], [STAIR, at(2, 4)]], b, t)).toThrow(/ONE entry side/)
    expect(() => decodeEntries([[FOOT, at(2, 1)]], b, t)).toThrow(/not a wall or a house/)
  })
})

describe('houses: in through the door, and a unit inside can be shot from outside', () => {
  const HOUSE = at(2, 3), DOOR = at(2, 4)
  it('in only through the door, out only through it (SWITCHES.md houseExit)', () => {
    const ctx = rig(board({ [HOUSE]: 'H' }), ['test-warrior', at(2, 2)], ['test-zombie', at(4, 6)], [[HOUSE, DOOR]])
    beginActivation(ctx, 0, 'test')
    const reach = reachable(ctx, ctx.state.units[0]!)
    expect(pathTo(reach, at(2, 2), HOUSE).at(-2)).toBe(DOOR)
    const inside = rig(board({ [HOUSE]: 'H' }), ['test-warrior', HOUSE], ['test-zombie', at(4, 6)], [[HOUSE, DOOR]])
    beginActivation(inside, 0, 'test')
    const out = reachable(inside, inside.state.units[0]!)
    expect(out.get(DOOR)?.cost).toBe(1)
    expect(out.get(at(2, 2))?.cost).toBeGreaterThan(1)   // not straight out the west wall
  })
  it('shot from outside, yes; shot past, no — the house is a full obstruction to lines passing it', () => {
    const shooter = at(2, 0), behind = at(2, 5)
    const through = rig(board({ [HOUSE]: 'H' }), ['test-warrior', behind], ['test-ranger', shooter])
    expect(canAttack(through, 1, 0, BOW)).toBe(false)
    const clear = rig(board(), ['test-warrior', behind], ['test-ranger', shooter])
    expect(canAttack(clear, 1, 0, BOW)).toBe(true)
    const inside = rig(board({ [HOUSE]: 'H' }), ['test-warrior', HOUSE], ['test-ranger', shooter])
    expect(canAttack(inside, 1, 0, BOW)).toBe(true)
  })
  // LAW 10 — 2026-09-25: this test asserted the provisional default `structureLines` (a shooter
  // up on a wall sees over). Andrew then RULED the opposite (DECISIONS.md 2026-09-25): "Walls and
  // towers cannot shoot past other obstructions." Rewritten to the ruling.
  it('the tower "is just an obstruction for shooting past it" — and up on a wall or in a tower, no one shoots past it', () => {
    const shooter = at(2, 0), behind = at(2, 5)
    expect(canAttack(rig(board({ [HOUSE]: 'T' }), ['test-warrior', behind], ['test-ranger', shooter]), 1, 0, BOW)).toBe(false)
    expect(canAttack(rig(board({ [HOUSE]: 'T', [shooter]: 'W' }), ['test-warrior', behind], ['test-ranger', shooter]), 1, 0, BOW)).toBe(false)
    expect(canAttack(rig(board({ [HOUSE]: 'H', [shooter]: 'T' }), ['test-warrior', behind], ['test-ranger', shooter]), 1, 0, BOW)).toBe(false)
    // …and the shooter up there is still shot at, and shoots, where nothing stands between
    expect(canAttack(rig(board({ [shooter]: 'W' }), ['test-warrior', behind], ['test-ranger', shooter]), 1, 0, BOW)).toBe(true)
  })
})

describe('Block rolls read the added Block', () => {
  it('the Block cup a wall adds is ledgered, and the roll the attack makes is against it', () => {
    const ctx = rig(board({ [at(1, 2)]: 'W' }), ['test-warrior', at(1, 2)], ['test-zombie', at(1, 3)])
    const b = resolveBlock(ctx, ctx.state.units[0]!, 'melee', ctx.state.units[1]!)
    expect(b.ledger.filter((r) => r.source === 'terrain.wall')).toEqual([expect.objectContaining({ delta: 10 })])
    expect(b.chance).toBe(10)
    // twelve bites at him, each its own replicate: every Block roll is against 10, and it
    // blocks exactly when the roll is 10 or under
    const rolled: { chance: number; roll: number; blocked: boolean }[] = []
    for (let r = 0; r < 12; r++) {
      const c = createBattle({
        replicate: r, map: { id: 'test.map.structures-rig', name: 'Structures rig TEST', rows: board({ [at(1, 2)]: 'W' }) } as never,
        heroes: ['test-warrior'], enemies: ['test-zombie'], heroHexes: [at(1, 2)], enemyHexes: [at(1, 3)], cfg: { switches: { critEnabled: false } as never },
      })
      for (const u of c.state.units) { u.triggers = []; u.block = 0; u.rangedBlock = 0; u.hp = u.maxHp = 50 }
      beginActivation(c, 1, 'test')
      performAttack(c, 1, 0, BITE)
      for (const e of c.events) if (e.type === 'block.rolled') rolled.push(e as never)
    }
    expect(rolled.length).toBe(12)
    for (const e of rolled) {
      expect(e.chance).toBe(10)
      expect(e.blocked).toBe(e.roll <= 10)
    }
  })
  it('in the scenario, the zombie indoors is attacked through the house guard — the rows are in the log', () => {
    const run = createBattle(scenarioOptions(SCENARIOS['test.structures']!))
    runBattle(run)
    const houses = run.events.filter((e) => e.type === 'attack.declared' && JSON.stringify(e).includes('"terrain.house"'))
    expect(houses.length).toBeGreaterThan(0)
  })
  it('structureOf names each structure — and nothing else is one', () => {
    expect([TERRAIN.WALL, TERRAIN.TOWER, TERRAIN.HOUSE].map((t) => structureOf(t)?.id)).toEqual(['terrain.wall', 'terrain.tower', 'terrain.house'])
    expect([TERRAIN.OPEN, TERRAIN.WOODLAND, TERRAIN.RUINS].map((t) => structureOf(t))).toEqual([null, null, null])
  })
})

// Andrew, 2026-09-25 (DECISIONS.md "shooting along your own wall"): "You should be able to shoot on
// the same wall." The wall a unit stands on does not block its line; every OTHER structure does.
describe('an archer shoots along its own wall', () => {
  const run = (cols: number[], glyph = 'W') => Object.fromEntries(cols.map((c) => [at(2, c), glyph]))
  const shoots = (paint: Record<number, string>, from: number, to: number) =>
    canAttack(rig(board(paint), ['test-warrior', to], ['test-ranger', from]), 1, 0, BOW)
  it('along one unbroken wall, end to end: clear', () => {
    expect(shoots(run([1, 2, 3, 4, 5]), at(2, 1), at(2, 5))).toBe(true)
  })
  it('along its wall and off the end, at a unit on the ground beyond: clear', () => {
    expect(shoots(run([1, 2, 3, 4]), at(2, 1), at(2, 6))).toBe(true)
  })
  it('two separate walls with a third between: the third blocks — it is not the same wall', () => {
    expect(shoots(run([1, 3, 5]), at(2, 1), at(2, 5))).toBe(false)
  })
  it('a tower in the middle of the run breaks it: other obstructions still block', () => {
    expect(shoots({ ...run([1, 2, 4, 5]), [at(2, 3)]: 'T' }, at(2, 1), at(2, 5))).toBe(false)
  })
  it('a unit on the ground has no wall of its own: the same run between blocks its shot', () => {
    expect(shoots(run([2, 3, 4]), at(2, 1), at(2, 5))).toBe(false)
  })
})
