// viewer.prone-turn-only-stand-up — the host's half. Ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'playtest post: notices,
// target lines, item cards, arrows, move costs on hexes, knocked down, bodies, cursed ground, the first hero's positives' and
// 'the playtest post answered'): "Then, if you are downed, when it's that character's next turn, everything needs to be grayed
// out except 'stand up'." / "Stand-up is a special move that is only available if you were prone, and yes, it takes your move."
//
// The item: "What the engine allows is read from the engine (legal actions), never worked out in the viewer: if the engine
// today lets a prone unit do something other than stand, or does not charge the move for standing, that is the engine's to
// change — name it in the report and re-file it as an engine item rather than hide it in the bar."
//
// So the play input says ONE new thing to the bar, and it is the engine's answer: `standFirst` — while the acting unit is down
// (the engine grants it a stand: grantedActionIds holds a move that standsUp), every other action it is granted that the
// engine's one limits check (actionReady) refuses. The bar greys those and nothing else; a press on one is answered in words
// and changes nothing. A standing unit's fact is empty, and so is a unit's that has stood.
//
// What this file holds is true whatever the engine answers, so it stands when the engine's rule moves. What the engine answers
// TODAY is printed, not asserted (kingdom SWITCHES.md proneBarReadsTheEngine): it still takes a downed unit's attacks and
// powers (engine SWITCHES.md proneNoCrawl, ruled 2026-09-24: "primary actions … stay legal"), and a unit that has stood may
// still spend its primary action on a walk — both are the engine's to change, named in the report.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createSandbox, advanceSandbox, commandSandbox, sandboxChoices, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { encounterDef, isMove, isAttack, grantedActionIds, standsUp, actionReady, type BattleCommand } from '../src/engine.js'
import { applyStatus } from '../../engine/src/core/status.js'
import { kdbDownStatus } from '../../engine/src/core/kdb.js'

const LUMBERJACK = 'encounter.opening.lumberjack'
type U = Sandbox['ctx']['state']['units'][number]
function battle2() {
  const s = createSandbox({ mapId: encounterDef(LUMBERJACK).mapId!, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId: LUMBERJACK })
  advanceSandbox(s)
  const P = createPlayInput(() => s, (c: BattleCommand) => commandSandbox(s, c))
  const begin = (u: U) => { P.input({ kind: 'choose', id: u.id }); P.input({ kind: 'unit', id: u.id, hex: u.hex }); expect(s.ctx.battleCursor, `${u.name}'s Activation`).toMatchObject({ at: 'acting', actor: u.id }) }
  const wife = () => s.ctx.state.units.find((x) => x.typeId === 'hero.fixed.lumberjacks-wife')!
  const hero = () => s.ctx.state.units.find((x) => s.setup.heroUids!.includes(x.uid))!
  return { s, P, begin, wife, hero }
}
/** `u` knocked down by a Zombie — the status the engine's own knockdown roll applies, put on by the engine's own mutator. */
function knockDown(s: Sandbox, u: U) {
  const prone = kdbDownStatus(s.ctx)!, enemy = s.ctx.state.units.find((x) => x.side === 'enemy' && x.lifeState === 'standing')!
  applyStatus(s.ctx, u.id, prone, 1, 'viewer.prone-turn-only-stand-up', enemy.id)
  return { prone, stand: s.ctx.statuses[prone]!.prone!.standAction!, isProne: () => u.statuses.some((x) => x.id === prone && x.value > 0) }
}
const names = (s: Sandbox, ids: readonly string[]) => ids.map((id) => s.ctx.actions[id]!.name).join(', ') || 'none'
/** what the engine's limits check refuses `u` now, of what it grants it — the stand apart */
const refused = (s: Sandbox, u: U) => grantedActionIds(s.ctx, u).filter((id) => { const a = s.ctx.actions[id]!; return !standsUp(a) && !actionReady(s.ctx, u, a) })

describe('viewer.prone-turn-only-stand-up — the bar of a unit that is down is the engine\'s answer', () => {
  for (const who of ['wife', 'hero'] as const) {
    it(`battle 2, ${who === 'wife' ? 'the Lumberjack\'s Wife' : 'a hero of the party'} knocked down: Stand Up is granted and is not among the actions that wait on it; those are exactly what the engine's limits check refuses, every other move among them`, () => {
      const b = battle2(), u = who === 'wife' ? b.wife() : b.hero(), { s, P } = b
      const k = knockDown(s, u); b.begin(u)
      const granted = grantedActionIds(s.ctx, u), f = P.facts()
      expect(f.actor).toBe(u.id)
      expect(granted, 'the engine grants the stand while down').toContain(k.stand); expect(standsUp(s.ctx.actions[k.stand]!)).toBe(true)
      expect(f.standFirst, 'the fact is there').toBeDefined()
      expect(f.standFirst, 'the stand is never one of them').not.toContain(k.stand)
      expect([...f.standFirst!].sort(), 'exactly what the engine refuses').toEqual(refused(s, u).sort())
      const moves = granted.filter((id) => { const a = s.ctx.actions[id]!; return isMove(a) && !isAttack(a) && !standsUp(a) })
      expect(moves.length, 'it has a move besides the stand').toBeGreaterThan(0)
      for (const id of moves) expect(f.standFirst, `${s.ctx.actions[id]!.name} waits on the stand`).toContain(id)
      expect(f.moveDone ?? [], 'nothing is "done": it has not moved').toEqual([])
      // every action it is granted is on one side or the other, and the engine takes the stand
      expect(sandboxChoices(s).some((c) => c.command.actor === u.id && c.command.actionId === k.stand), 'the engine takes the stand now').toBe(true)
      const lit = granted.filter((id) => id !== k.stand && !f.standFirst!.includes(id))
      console.log(`  ${u.name}, down: Stand Up lit; greyed by the engine's answer — ${names(s, f.standFirst!)}; STILL LIT (the engine takes them from a unit that is down — engine SWITCHES proneNoCrawl, the engine's to change) — ${names(s, lit)}`)
    })
  }

  it('a press on an action that waits on the stand is answered in words and changes nothing; the press on Stand Up stands the unit, and then nothing waits', () => {
    const { s, P, begin, wife } = battle2(), u = wife()
    const k = knockDown(s, u); begin(u)
    const began = P.facts(), waits = began.standFirst!, from = s.ctx.events.length
    expect(began.slot, 'her Activation begins with the stand armed: the only movement the engine lists').toBe(k.stand)
    expect(waits.length).toBeGreaterThan(0)
    for (const id of waits) {
      expect(P.input({ kind: 'slot', actionId: id, unit: u.id }), 'the press is answered').toBe(true)
      const f = P.facts()
      expect(f.note, `${s.ctx.actions[id]!.name}: the refusal says why`).toBe(`Knocked down: ${s.ctx.actions[k.stand]!.name} first.`)
      expect(f.slot, 'it is not chosen: the screen is as her Activation began').toBe(began.slot); expect(f.slot).not.toBe(id)
      expect(f.ghost).toBeNull(); expect(f.reach).toEqual(began.reach); expect(f.aim).toBeNull(); expect(f.targets).toEqual(began.targets)
      expect(s.ctx.events.length, 'nothing happened').toBe(from); expect(k.isProne()).toBe(true)
    }
    expect(P.input({ kind: 'slot', actionId: k.stand, unit: u.id })).toBe(true)
    expect(k.isProne(), 'one press of Stand Up stands her').toBe(false)
    expect(u.moveUsed, 'standing took her move').toBe(true); expect(u.primaryUsed, 'and not her primary action').toBe(false)
    const f = P.facts()
    if (f.actor === u.id) {
      expect(f.standFirst ?? [], 'nothing waits on a stand once she has stood').toEqual([])
      expect(grantedActionIds(s.ctx, u), 'Stand Up is no longer granted').not.toContain(k.stand)
      const stillOffered = [...new Set(sandboxChoices(s).filter((c) => c.command.actor === u.id).map((c) => c.command.actionId))]
      const moves = u.actions.filter((id) => { const a = s.ctx.actions[id]!; return isMove(a) && !isAttack(a) })
      // "greyed as after any move": the moves the engine lists no further use of are the ones named done — the same reading as after a walk
      expect([...(f.moveDone ?? [])].sort()).toEqual(moves.filter((id) => !stillOffered.includes(id)).sort())
      console.log(`  ${u.name}, stood: moves named done — ${names(s, f.moveDone ?? [])}; moves the engine STILL TAKES after the stand, in her primary action (the engine's to change if "it takes your move" means she may not walk) — ${names(s, moves.filter((id) => stillOffered.includes(id)))}`)
    }
  })

  it('a standing unit: no Stand Up is granted, nothing waits on a stand, and the fact is the acting unit\'s only', () => {
    const { s, P, begin, hero, wife } = battle2(), u = hero()
    begin(u)
    expect(grantedActionIds(s.ctx, u).some((id) => standsUp(s.ctx.actions[id]!)), 'a standing unit is granted no stand').toBe(false)
    expect(P.facts().standFirst ?? []).toEqual([])
    // another unit knocked down while this one acts: the acting unit's bar is its own
    knockDown(s, wife())
    expect(P.facts().actor).toBe(u.id); expect(P.facts().standFirst ?? []).toEqual([])
  })

  it('the page: on the built battle screen, battle 2, a knocked-down unit\'s bar greys what the engine refuses and lights Stand Up; a standing unit\'s bar has no Stand Up', () => {
    const out = execFileSync(process.execPath, ['tools/prone-turn-only-stand-up.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/prone-turn-only-stand-up: .* passed/)
    for (const line of out.split('\n').filter((l) => /^  /.test(l))) console.log(line)
  }, 240000)
})
