// viewer.play-chrome (PLAYABLE-OPENING-PLAN.md item 8; DECISIONS.md 2026-09-29 "the playable opening" and "the playable
// battle screen"). Expect: "Battle 1 plays start to finish in the new screen: End Turn and its pop-up, 2x speed, the log;
// an eyeball check for Andrew." The kingdom's play input (../kingdom/src/ui/play-input.ts) turns the battle screen's
// clicks and its End Turn / End activation buttons into the engine's own commands; ../kingdom/tools/play-chrome-probe.mts
// plays the Orphanage start to finish that way. This asks the ENGINE's side of it: the pop-up's list is heroesYetToAct,
// End Turn is end-player-phase and forgoes exactly those heroes before the Enemy Phase plays, a Player Phase in which
// every hero acted ends with no End Turn, and no activation needs an End activation click after a paid primary
// (rule.primary-ends-activation). The 2x button and the log are the viewer's (../viewer/tools/play-chrome.test.mjs).
// Runs the probe in a child process; imports no kingdom code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'

type Record = {
  encounter: string, mapId: string
  ask: { turn: number, shownUids: number[], engineUids: number[], forgoneUids: number[], enemyActivationsAfter: number, turnAfter: number, cursorAfter: string | null }
  turns: { turn: number, endTurnPresses: number, heroActivations: number, heroPhaseEnded: boolean }[]
  primaries: { turn: number, actor: number, closedBySelf: boolean, surged: boolean }[]
  endActivationsAfterPrimary: number, endActivations: number, commands: { [kind: string]: number }
  outcome: string | null, turn: number, lastEvent: string | null
}
const record = (): Record => JSON.parse(execFileSync(process.execPath, ['../engine/node_modules/tsx/dist/cli.mjs', '../kingdom/tools/play-chrome-probe.mts'], { encoding: 'utf8', maxBuffer: 1 << 24 }))

describe('battle 1 played start to finish from the battle screen: End Turn, its pop-up, the phase that ends by itself', () => {
  const r = record()
  it('the Orphanage, on its own map', () => { expect([r.encounter, r.mapId]).toEqual(['encounter.opening.orphanage', 'map.opening.orphanage']) })
  it('End Turn with heroes yet to act: the pop-up names heroesYetToAct; end-player-phase forgoes exactly them, then the Enemy Phase plays', () => {
    expect(r.ask.turn).toBe(1)
    expect(r.ask.shownUids.length).toBeGreaterThan(0)
    expect(r.ask.shownUids).toEqual(r.ask.engineUids)
    expect([...r.ask.forgoneUids].sort()).toEqual([...r.ask.engineUids].sort())
    expect(r.ask.enemyActivationsAfter).toBeGreaterThan(0)
    expect([r.ask.turnAfter, r.ask.cursorAfter]).toEqual([2, 'selecting'])
    expect(r.commands['end-player-phase']).toBe(1)
  })
  it('a Player Phase in which every hero acted ends by itself — no End Turn', () => {
    const played = r.turns.filter((t) => t.turn > 1 && t.heroPhaseEnded)
    expect(played.length).toBeGreaterThan(0)
    for (const t of played) { expect(t.endTurnPresses).toBe(0); expect(t.heroActivations).toBeGreaterThan(0) }
  })
  it('a paid primary ends the activation by itself: no End activation click after one', () => {
    expect(r.primaries.length).toBeGreaterThan(0)
    for (const p of r.primaries) expect(p.closedBySelf).toBe(true)
    expect(r.endActivationsAfterPrimary).toBe(0)
  })
  it('start to finish: the battle reaches its outcome, every command from the screen', () => {
    expect(r.outcome).not.toBeNull()
    expect(r.lastEvent).toBe('battle.end')
    expect(Object.keys(r.commands).sort()).toEqual(['action', 'end-cycle', 'end-player-phase', 'select-activation'])
  })
})
