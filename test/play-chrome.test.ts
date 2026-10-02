// viewer.play-chrome (PLAYABLE-OPENING-PLAN.md item 8; engine DECISIONS.md 2026-09-29 "the playable opening" and "the
// playable battle screen"). Expect: "Battle 1 plays start to finish in the new screen: End Turn and its pop-up, 2x speed,
// the log." tools/play-chrome-probe.mts plays the Orphanage start to finish through the play input; this asks that the
// ending the viewer is handed (End Turn, who has not acted, End activation) is the engine's, and what it does.
import { describe, it, expect } from 'vitest'
import { playChromeProbe } from '../tools/play-chrome-probe.mjs'
import { createSandbox, advanceSandbox, commandSandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { heroesYetToAct } from '../src/engine.js'

const r = playChromeProbe()
const orphanage = () => { const s = createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId: 'encounter.opening.orphanage' }); advanceSandbox(s); return s }

describe('battle 1 from the battle screen, start to finish', () => {
  it('End Turn asked with heroes yet to act names the engine\'s heroesYetToAct and forgoes exactly them', () => {
    expect(r.ask.shownUids).toEqual(r.ask.engineUids); expect(r.ask.shownUids.length).toBeGreaterThan(0)
    expect([...r.ask.forgoneUids].sort()).toEqual([...r.ask.engineUids].sort())
    expect(r.ask.enemyActivationsAfter).toBeGreaterThan(0); expect(r.ask.turnAfter).toBe(2)
  })
  it('a Player Phase where every hero acted ends without End Turn', () => {
    const played = r.turns.filter((t) => t.turn > 1 && t.heroPhaseEnded)
    expect(played.length).toBeGreaterThan(0); for (const t of played) expect(t.endTurnPresses).toBe(0)
  })
  it('no End activation after a paid primary', () => {
    expect(r.primaries.every((p) => p.closedBySelf)).toBe(true); expect(r.endActivationsAfterPrimary).toBe(0)
  })
  it('reaches the outcome', () => { expect(r.outcome).not.toBeNull(); expect(r.lastEvent).toBe('battle.end') })
})

describe('the ending handed to the viewer', () => {
  it('choosing a hero: End Turn with every hero yet to act, no End activation', () => {
    const s = orphanage(), P = createPlayInput(() => s, () => ({ ok: true }))
    const e = P.ending()
    expect(s.ctx.battleCursor?.at).toBe('selecting')
    expect(e.endTurn?.yetToAct.map((id) => s.ctx.state.units[id]!.uid)).toEqual(heroesYetToAct(s.ctx, s.policy))
    expect(e.endTurn?.yetToAct.length).toBe(s.policy.humanUnitUids.length)
    expect(e.endActivation).toBe(false)
  })
  it('a hero acting: End activation, the others still yet to act; the buttons send the engine\'s end-cycle and end-player-phase', () => {
    const s = orphanage(), sent: string[] = []
    const P = createPlayInput(() => s, (c) => { sent.push(c.kind); return commandSandbox(s, c) })
    const first = s.ctx.state.units.find((u) => u.uid === s.policy.humanUnitUids[0])!
    /* Law 10 (viewer.xcom-camera, 2026-10-01): engine DECISIONS.md 2026-10-01 'the XCOM-style camera', Andrew: "Double-click a character in the top bar or on the map to change it" — a hero other than the one proposed is picked by a double-click (choose), then clicked; a click alone no longer starts any hero but the proposed one */
    P.input({ kind: 'choose', id: first.id }); P.input({ kind: 'unit', id: first.id, hex: first.hex })
    expect(s.ctx.battleCursor?.actor).toBe(first.id)
    const e = P.ending()
    expect(e.endActivation).toBe(true)
    expect(e.endTurn?.yetToAct.map((id) => s.ctx.state.units[id]!.uid)).toEqual(heroesYetToAct(s.ctx, s.policy))
    expect(e.endTurn?.yetToAct).not.toContain(first.id)
    expect(P.input({ kind: 'end-activation' })).toBe(true)
    expect(s.ctx.battleCursor?.at).toBe('selecting'); expect(P.ending().endActivation).toBe(false)
    expect(P.input({ kind: 'end-activation' })).toBe(false)
    const left = heroesYetToAct(s.ctx, s.policy)
    const before = s.ctx.events.length
    expect(P.input({ kind: 'end-turn' })).toBe(true)
    expect(sent).toEqual(['select-activation', 'end-cycle', 'end-player-phase'])
    expect(s.ctx.events.slice(before).filter((x) => x.type === 'activation.forgone').map((x) => x['unitUid'])).toEqual(left)
    expect(s.ctx.state.turn).toBe(2)
  })
  it('nothing to end at the outcome or with no battle', () => {
    const P = createPlayInput(() => null, () => ({ ok: true }))
    expect(P.ending()).toEqual({ endTurn: null, endActivation: false })
    expect(P.input({ kind: 'end-turn' })).toBe(false)
  })
})
