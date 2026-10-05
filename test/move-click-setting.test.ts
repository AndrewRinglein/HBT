// kingdom.move-click-setting — ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'the battle screen must feel smooth: …; one click
// or two to move is a setting'; asked "Should a move be one click on the hex, with the path shown as you point, instead of
// click and click again?" — "I don't think 4 is the problem." and then "Actually, I guess for number 4, let's have a setting
// where it can be either way, so I can just play with it either way.").
//
// Expect: "On the built page with the setting at 'One click' a single click on a hex in reach walks the Iron Dwarf there; a hex
// whose path draws a free attack takes a second click, with the line saying why; with it at 'Two clicks' the first click shows
// the ghost and the second walks, as today; the choice survives a reload and the next battle; a page test plays one move each
// way; the tutorial's first-move lesson passes with the default."
//
// The play input's half: the setting is the HOST's (read and kept by the functions it is handed — the browser's storage on
// the page, a plain object here); the input reads it at each click, says it in its facts (the viewer draws its control from
// that), and takes the change the viewer offers back. Whether a walk draws a free attack is the engine's forecast.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createSandbox, advanceSandbox, commandSandbox, sandboxChoices, type Sandbox } from '../src/core/sandbox.js'
import { createPlayInput, FREE_ATTACK_STOP, type MoveClick } from '../src/ui/play-input.js'
import { encounterDef, isAttack, isMove, grantedActionIds, type BattleCommand } from '../src/engine.js'

const ORPHANAGE = 'encounter.opening.orphanage', DWARF = 'hero.base.warrior-iron'
type U = Sandbox['ctx']['state']['units'][number]
/** the host's setting, as the page keeps it in the browser: one value, read and written through two functions */
const store = (first?: MoveClick) => { let v: MoveClick | undefined = first; const writes: MoveClick[] = []; return { get: () => v ?? 'two', set: (x: MoveClick) => { v = x; writes.push(x) }, writes } }
function battle1(setting: ReturnType<typeof store> | null) {
  const s = createSandbox({ mapId: encounterDef(ORPHANAGE).mapId!, heroes: [DWARF], enemies: [], seed: 1, encounterId: ORPHANAGE })
  advanceSandbox(s)
  const P = createPlayInput(() => s, (c: BattleCommand) => commandSandbox(s, c), null, setting ? { moveClick: setting.get, setMoveClick: setting.set } : null)
  const me = () => s.ctx.state.units.find((x) => x.typeId === DWARF)!
  const acting = () => (s.ctx.battleCursor?.at === 'acting' ? s.ctx.battleCursor.actor : null)
  const begin = (u: U) => { if (acting() === u.id) return; P.input({ kind: 'choose', id: u.id }); expect(acting(), `${u.name}'s Activation`).toBe(u.id) }
  const foes = () => s.ctx.state.units.filter((x) => x.side === 'enemy' && x.lifeState === 'standing')
  const near = (hex: number) => Math.min(...foes().map((f) => s.ctx.geo.distance(hex, f.hex)))
  const moved = () => s.ctx.events.filter((e) => e.type === 'moved' && e.actor === me().id).length
  const nextTurn = () => { for (let i = 0; i < 6 && acting() !== null; i++) P.input({ kind: 'end-activation' }); P.input({ kind: 'end-turn' }) }
  /** the hexes of the armed move's reach whose walk the engine forecasts a free attack on (the facts' provokes for the hex pointed at) */
  const provoking = () => P.facts().reach.filter((hex) => { P.input({ kind: 'point', hex }); return P.facts().provokes.length > 0 })
  return { s, P, me, begin, acting, near, moved, nextTurn, provoking }
}

describe('kingdom.move-click-setting — one click or two to move is a setting, two the default', () => {
  it('the default is two clicks, said in the facts: the first click on a hex in reach shows the ghost, the second walks — as before', () => {
    const b = battle1(store()), { s, P } = b, dwarf = b.me()
    b.begin(dwarf)
    expect(P.facts().moveClick).toBe('two')
    const hex = P.facts().reach[0]!, from = s.ctx.events.length
    expect(P.input({ kind: 'hex', hex })).toBe(true)
    expect(P.facts().ghost).toEqual({ unit: dwarf.id, hex }); expect(s.ctx.events.length, 'the first click plans; nobody has moved').toBe(from); expect(dwarf.hex).not.toBe(hex)
    expect(P.input({ kind: 'hex', hex })).toBe(true); expect(b.moved(), 'the second click walks').toBeGreaterThan(0)
  })

  it('a host that hands no setting gets today\'s way and no fact: nothing for the viewer to draw a control from', () => {
    const b = battle1(null), { s, P } = b, dwarf = b.me()
    b.begin(dwarf)
    expect(P.facts().moveClick).toBeUndefined()
    const hex = P.facts().reach[0]!, from = s.ctx.events.length
    P.input({ kind: 'hex', hex }); expect(s.ctx.events.length).toBe(from); expect(P.facts().ghost).toEqual({ unit: dwarf.id, hex })
    expect(P.input({ kind: 'move-click', clicks: 'one' }), 'with no setting there is nothing to change').toBe(false)
  })

  it('one click: a single click on a hex in reach walks the Iron Dwarf there at once', () => {
    const set = store('one'), b = battle1(set), { s, P } = b, dwarf = b.me()
    b.begin(dwarf)
    expect(P.facts().moveClick).toBe('one')
    // the path to the hex pointed at is already shown as the pointer moves, as it is in either way
    const hex = [...P.facts().reach].sort((x, y) => b.near(x) - b.near(y) || x - y)[0]!
    P.input({ kind: 'point', hex }); expect(P.facts().path.at(-1), 'the path is shown to the hex pointed at').toBe(hex); expect(P.facts().provokes, 'this walk draws no free attack').toEqual([])
    const before = b.moved()
    expect(P.input({ kind: 'hex', hex })).toBe(true)
    expect(b.moved(), 'one click walked').toBeGreaterThan(before); expect(P.facts().ghost, 'no ghost was left waiting').toBeNull()
    if (b.acting() === dwarf.id) expect(dwarf.moveUsed).toBe(true)
  })

  it('one click, and the engine forecasts a free attack on the walk: the first click only shows the path with where it provokes and one line saying why; the second click on the same hex walks it', () => {
    const set = store('one'), b = battle1(set), { s, P } = b
    /* the Dwarf closes with the Zombie Turn after Turn (one click a walk) until a walk from where it stands would draw a free attack */
    let risky: number[] = []
    for (let turn = 0; turn < 12 && !risky.length && !s.ctx.state.outcome; turn++) {
      b.begin(b.me()); risky = b.provoking(); if (risky.length) break
      const reach = P.facts().reach; expect(reach.length).toBeGreaterThan(0)
      P.input({ kind: 'hex', hex: [...reach].sort((x, y) => b.near(x) - b.near(y) || x - y)[0]! }); b.nextTurn()
    }
    expect(risky.length, 'a walk of the Dwarf\'s would draw a free attack').toBeGreaterThan(0)
    const dwarf = b.me(), hex = risky[0]!, from = s.ctx.events.length, at = dwarf.hex
    P.input({ kind: 'point', hex })   // the pointer is on the hex that is clicked
    expect(P.input({ kind: 'hex', hex })).toBe(true)
    // not walked: the path stays, the hexes it provokes on are marked, and one line says why
    expect(s.ctx.events.length, 'no free attack is taken by a slip').toBe(from); expect(dwarf.hex).toBe(at)
    let f = P.facts()
    expect(f.ghost).toEqual({ unit: dwarf.id, hex }); expect(f.path.at(-1)).toBe(hex); expect(f.provokes.length).toBeGreaterThan(0)
    expect(f.note).toBe(FREE_ATTACK_STOP); expect(FREE_ATTACK_STOP).toMatch(/free attack/); expect(FREE_ATTACK_STOP).toMatch(/again/)
    // the second click on the same hex walks, and the free attack is the engine's
    P.input({ kind: 'point', hex }); expect(P.input({ kind: 'hex', hex })).toBe(true)
    const after = s.ctx.events.slice(from)
    expect(after.some((e) => e.type === 'aoo.provoked' && e.target === dwarf.id), 'the walk was made and the free attack came').toBe(true)
    f = P.facts(); expect(f.note ?? '').not.toBe(FREE_ATTACK_STOP)
  })

  it('the setting is changed in the middle of a battle by the change the viewer offers back, kept by the host, and read at the next click; a value that is neither is refused', () => {
    const set = store(), b = battle1(set), { s, P } = b, dwarf = b.me()
    b.begin(dwarf)
    expect(P.input({ kind: 'move-click', clicks: 'one' })).toBe(true); expect(set.writes).toEqual(['one']); expect(P.facts().moveClick).toBe('one')
    expect(P.input({ kind: 'move-click', clicks: 'three' as never })).toBe(false); expect(set.writes).toEqual(['one'])
    // changing the setting is no order: nothing happened in the battle, the plan is as it was
    const from = s.ctx.events.length; expect(P.facts().actor).toBe(dwarf.id); expect(isMove(s.ctx.actions[P.facts().slot!]!)).toBe(true)
    const hex = P.facts().reach[0]!; P.input({ kind: 'hex', hex }); expect(s.ctx.events.length, 'one click now walks').toBeGreaterThan(from)
    // and back, for the next Activation
    expect(P.input({ kind: 'move-click', clicks: 'two' })).toBe(true); expect(set.writes).toEqual(['one', 'two']); expect(P.facts().moveClick).toBe('two')
    // another battle with the same host setting reads what was kept
    set.set('one'); const again = battle1(set); again.begin(again.me()); expect(again.P.facts().moveClick, 'the next battle reads the kept choice').toBe('one')
  })

  it('attacks are the same either way: choose, click the target, click again', () => {
    for (const way of ['one', 'two'] as const) {
      const b = battle1(store(way)), { s, P } = b
      // close in until the Dwarf, having walked, has an enemy in reach of its first attack
      let zombie: U | undefined
      for (let turn = 0; turn < 12 && !zombie && !s.ctx.state.outcome; turn++) {
        b.begin(b.me()); const reach = P.facts().reach; if (!reach.length) { b.nextTurn(); continue }
        const hex = [...reach].sort((x, y) => b.near(x) - b.near(y) || x - y)[0]!
        /* the walk: one click or two by the setting — and at one click a walk that draws a free attack takes its second (the ghost is left standing) */
        P.input({ kind: 'hex', hex }); if (way === 'two' || P.facts().ghost) P.input({ kind: 'hex', hex })
        const one = grantedActionIds(s.ctx, b.me()).find((id) => isAttack(s.ctx.actions[id]!))!
        const use = b.acting() === b.me().id ? sandboxChoices(s).find((c) => c.command.actor === b.me().id && c.command.actionId === one && 'target' in c.command) : undefined
        if (use && 'target' in use.command) zombie = s.ctx.state.units[use.command.target]!; else b.nextTurn()
      }
      expect(zombie, way + ': an enemy came into reach').toBeTruthy()
      const dwarf = b.me(), from = s.ctx.events.length
      expect(P.input({ kind: 'unit', id: zombie!.id, hex: zombie!.hex })).toBe(true); expect(s.ctx.events.length, way + ': the first click on the target only locks the aim').toBe(from); expect(P.facts().aim?.locked).toBe(true)
      expect(P.input({ kind: 'unit', id: zombie!.id, hex: zombie!.hex })).toBe(true)
      expect(s.ctx.events.slice(from).some((e) => e.type === 'attack.declared' && e.actor === dwarf.id), way + ': the second click strikes').toBe(true)
    }
  })

  it('the page: on the built battle screen a move is played each way, the control says which way it is set, and the choice survives a reload and the next battle', () => {
    const out = execFileSync(process.execPath, ['tools/move-click-setting.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/move-click-setting: .* passed/)
    for (const line of out.split('\n').filter((l) => /^  /.test(l))) console.log(line)
  }, 300000)
})
