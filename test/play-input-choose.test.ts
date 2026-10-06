// engine DECISIONS.md 2026-10-01 (Andrew): "You're supposed to select your movement type. It's okay if it's the top one by
// default.  Then you can't target without an ability selected. If I am on my primary action part of a unit's activation, I
// automatically have a red arrow, but what is that red arrow for? I have to click an attack type, and the red arrow should
// only extend as far as whatever its range is. If I click someone who has a punch, it should have range 1, and if I point my
// arrow further away, only one space should go because it's got range 1." · "the special move Devotion for the priest did
// not work. I can't double-click on it or anything to make it trigger." The play input (src/ui/play-input.ts) asked about
// each; every number is the engine's (its validated choices, reachOf, its own events).
import { describe, it, expect } from 'vitest'
import { levelTwoRows } from './level-two.js'
import { createSandbox, advanceSandbox, commandSandbox, sandboxActivationChoices, sandboxChoices, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { actionReach, isAttack, isMove } from '../src/engine.js'

// Law 10, 2026-10-06 — rule.special-moves-unlock-at-level-two (engine item; engine DECISIONS.md 2026-10-06 'a hero's special moves
// unlock at level 2, ruled: all of them, every hero …'): the Priest has his Devotion from level 2, and two tests here choose it from
// the bar. The sandbox's three heroes are fielded as campaign rows at level 2 (test/level-two.ts); what is held of choosing is
// unchanged. The line was the same without `heroRows`.
const start = () => { const s = createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [...SANDBOX_DEFAULT.heroes], heroRows: levelTwoRows(SANDBOX_DEFAULT.heroes), enemies: [], seed: 1, encounterId: 'encounter.opening.orphanage' }); advanceSandbox(s); return s }
/** a sandbox with the hero of this type acting, and a play input on it */
function acting(type: RegExp) {
  const s = start(), P = createPlayInput(() => s, (c) => commandSandbox(s, c))
  const h = s.ctx.state.units.find((u) => u.side === 'hero' && type.test(u.typeId) && sandboxActivationChoices(s).some((c) => c.uid === u.uid))!
  /* Law 10 (viewer.xcom-camera, 2026-10-01): engine DECISIONS.md 2026-10-01 'the XCOM-style camera', Andrew: "Double-click a character in the top bar or on the map to change it" — a hero other than the one proposed is picked by a double-click (choose), then clicked; a click alone no longer starts any hero but the proposed one */
  expect(P.input({ kind: 'choose', id: h.id })).toBe(true)
  expect(P.input({ kind: 'unit', id: h.id, hex: h.hex })).toBe(true)
  expect(s.ctx.battleCursor?.actor).toBe(h.id)
  return { s, P, h }
}
const moveSlotFirst = (s: Sandbox, actor: number) => s.ctx.state.units[actor]!.actions.find((id) => isMove(s.ctx.actions[id]!) && sandboxChoices(s).some((c) => c.command.actor === actor && c.command.actionId === id && c.command.slot === 'movement' && 'destination' in c.command))

describe('choosing what the hero does', () => {
  it('the movement type is the top one by default, lit, and another may be chosen', () => {
    const { s, P, h } = acting(/warrior/)
    expect(P.facts().slot).toBe(moveSlotFirst(s, h.id))
  })
  /* Law 10, 2026-10-05 — kingdom.attack-one-armed-after-move (engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: …;
     attack one is chosen after a move; …', Andrew: "after you move, we should auto-select your basic attack or your attack one …
     so you don't have to select your attack to then start turning on the map."). This test was
       'no action chosen, no arrow: pointing anywhere draws none; once its movement is spent it still draws none'
     and ended  expect(P.facts().reach).toEqual([]); expect(P.facts().aim).toBeNull()  after the walk. "No action chosen, no
     arrow" (2026-10-01) stands and is held as it was, before the walk and again once the choice is taken back; what the ruling
     changes is that after the walk an action IS chosen — the unit's attack one — so its arrow is drawn. */
  it('no action chosen, no arrow: pointing anywhere draws none; once it has moved its attack one is chosen by itself, and with that taken back pointing draws none again', () => {
    const { s, P, h } = acting(/warrior/)
    const far = s.ctx.state.units.find((u) => u.side === 'enemy')!.hex
    P.input({ kind: 'point', hex: far }); expect(P.facts().aim).toBeNull()
    /* spend the movement: walk one hex */
    const step = P.facts().reach.find((x) => s.ctx.geo.distance(x, h.hex) === 1)!
    P.input({ kind: 'hex', hex: step }); P.input({ kind: 'hex', hex: step })
    expect(s.ctx.state.units[h.id]!.hex).toBe(step)
    P.input({ kind: 'point', hex: far })
    const one = s.ctx.state.units[h.id]!.actions.find((id) => isAttack(s.ctx.actions[id]!))!
    expect(P.facts().reach).toEqual([]); expect(P.facts().slot, 'attack one is chosen by itself').toBe(one); expect(P.facts().aim, 'so its arrow is drawn').not.toBeNull()
    /* taken back (a right-click): no action chosen, no arrow */
    expect(P.input({ kind: 'back' })).toBe(true); P.input({ kind: 'point', hex: far })
    expect(P.facts().slot).toBeNull(); expect(P.facts().aim).toBeNull()
  })
  it('an attack chosen, the arrow reaches no further than its reach — the engine\'s — toward the pointer', () => {
    const { s, P, h } = acting(/warrior/)
    const u = s.ctx.state.units[h.id]!, melee = u.actions.find((id) => isAttack(s.ctx.actions[id]!) && actionReach(s.ctx, u.id, id) === 1)!
    expect(melee, 'the hero has a reach-1 attack').toBeTruthy()
    expect(P.input({ kind: 'slot', actionId: melee, unit: h.id })).toBe(true)
    const g = s.ctx.geo, far = [...Array(g.hexCount).keys()].find((x) => g.distance(h.hex, x) === 6)!
    P.input({ kind: 'point', hex: far })
    const aim = P.facts().aim!
    expect(aim.from).toBe(h.hex); expect(g.distance(aim.from, aim.to)).toBe(1)
    /* toward the pointer: no hex one step out is nearer it */
    for (let x = 0; x < g.hexCount; x++) if (g.distance(h.hex, x) === 1) expect(g.distance(x, far)).toBeGreaterThanOrEqual(g.distance(aim.to, far))
    /* within reach the arrow ends where the pointer is */
    const near = [...Array(g.hexCount).keys()].find((x) => g.distance(h.hex, x) === 1)!
    P.input({ kind: 'point', hex: near }); expect(P.facts().aim!.to).toBe(near)
  })
  it('Devotion is used from the bar: chosen once it is planned on the Priest\'s own hex, chosen again it is used', () => {
    const { s, P, h } = acting(/priest/)
    const u = s.ctx.state.units[h.id]!
    expect(u.actions).toContain('power.devotion')
    const before = { stam: u.stamina, max: u.maxStamina, seq: s.ctx.state.seq }
    expect(P.input({ kind: 'slot', actionId: 'power.devotion', unit: h.id })).toBe(true)
    expect(P.facts().ghost).toEqual({ unit: h.id, hex: h.hex }); expect(P.facts().note).toMatch(/Devotion: click it again/)
    expect(s.ctx.state.seq).toBe(before.seq)
    expect(P.input({ kind: 'slot', actionId: 'power.devotion', unit: h.id })).toBe(true)
    expect(s.ctx.events.some((e) => e.type === 'move.begin' && e.causeId === 'power.devotion' && e.actor === h.id)).toBe(true)
    expect(s.ctx.state.units[h.id]!.maxStamina).toBe(before.max - 1)
    expect(s.ctx.state.units[h.id]!.hex).toBe(h.hex)
  })
  it('Devotion is also used by clicking the Priest after choosing it', () => {
    const { s, P, h } = acting(/priest/)
    P.input({ kind: 'slot', actionId: 'power.devotion', unit: h.id })
    expect(P.input({ kind: 'unit', id: h.id, hex: h.hex })).toBe(true)
    expect(s.ctx.events.some((e) => e.type === 'move.begin' && e.causeId === 'power.devotion' && e.actor === h.id)).toBe(true)
  })
})
