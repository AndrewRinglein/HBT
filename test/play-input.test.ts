// viewer.play-input (PLAYABLE-OPENING-PLAN.md item 7; DECISIONS.md 2026-09-29 "the playable battle screen" and "the
// playable screen: the acting mark, pointing at an enemy, the forecast"). Expect: "Andrew can move and attack in battle 1
// with the mouse alone; the forecast shown equals what lands; right-click undoes a stage; no dropdown is needed."
// The kingdom's play input (../kingdom/src/ui/play-input.ts) turns clicks into the engine's own commands and hands the
// viewer what to draw; ../kingdom/tools/play-input-probe.mts plays the Orphanage with clicks and pointing only and
// records what the screen was told and what the engine then did. This asks the ENGINE's side of it: the threat shown is
// threatOf's, the walk is the path shown, and the attack the engine declares — and the Health it leaves — is the
// forecast the player saw from the ghost (previewFrom, preview.from-planned-hex). Runs the probe in a child process;
// imports no kingdom code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'

type Attack = { fromGhost: boolean, target: number, shown: { hit: number, dmg: number, hpAfter: number | null, lethal: boolean }, declared: { hitChance: number, damageOnHit: number },
  hit: boolean, crit: boolean, landed: { hpAfter: number } | null, backCleared: boolean, engineFromGhost: { hitChance: number, damageOnHit: number } | null }
type Record = { encounter: string, mapId: string, threat: { shown: { move: number[], hit: number[] }, engine: { move: number[], hit: number[] } },
  selected: { actor: number | null }, move: { reach: number[], path: number[], provokes: number[], ghost: number | null, afterBack: number | null, confirmedAt: number, engineAt: number, engineProvokes: number[], pathFromEngine: number[] },
  attacks: Attack[], endActivations: number }
const record = (): Record => JSON.parse(execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', '../kingdom/tools/play-input-probe.mts'], { encoding: 'utf8', maxBuffer: 1 << 24 }))

describe('battle 1 played with the mouse: what the screen showed is what the engine did', () => {
  const r = record()
  it('the Orphanage, on its own map', () => { expect([r.encounter, r.mapId]).toEqual(['encounter.opening.orphanage', 'map.opening.orphanage']) })
  it('pointing at an enemy lights threatOf\'s own hexes', () => { expect(r.threat.shown).toEqual(r.threat.engine) })
  it('a click starts the activation; ghost, right-click back, ghost, confirm: the walk is the path shown, its provokes forecastFrom\'s', () => {
    expect(r.selected.actor).not.toBeNull()
    expect([r.move.ghost, r.move.afterBack, r.move.engineAt]).toEqual([r.move.confirmedAt, null, r.move.confirmedAt])
    expect(r.move.path.slice(1)).toEqual(r.move.pathFromEngine)
    expect(r.move.provokes).toEqual([...new Set(r.move.engineProvokes)].sort((a, b) => a - b))
  })
  it('the forecast shown equals what lands', () => {
    expect(r.attacks.length).toBeGreaterThanOrEqual(2)
    for (const a of r.attacks) {
      expect([a.shown.hit, a.shown.dmg]).toEqual([a.declared.hitChance, a.declared.damageOnHit])
      if (a.fromGhost) expect(a.engineFromGhost).toEqual(a.declared)
      expect(a.backCleared).toBe(true)
    }
    const landed = r.attacks.filter((a) => a.hit && !a.crit && a.landed)
    expect(landed.some((a) => a.fromGhost)).toBe(true)
    for (const a of landed) expect(a.landed!.hpAfter).toBe(a.shown.hpAfter)
  })
})
