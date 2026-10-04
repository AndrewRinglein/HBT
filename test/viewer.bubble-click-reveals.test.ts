// viewer.bubble-click-reveals (engine backlog; engine DECISIONS.md 2026-10-03 'clicking an off-screen bubble selects the unit
// and slides the screen just far enough to show its hex'). Andrew: "I should be able to click on one of the bubbles for a unit
// that's off-screen to both focus it and also scroll the screen over so they are visible, but only just to their hex. Don't
// focus on it or center the screen on it. Just slide over until they're visible." The engine's side — and nothing new is
// asked of it: where a unit stands is the log's (unit.enter, moved), and looking at a unit or sliding the view is no command.
// The Orphanage's Turn 3 arrival enters on the board's first column, far from the party — the unit a bubble stands for
// (since 2026-10-04; until then the battle OPENED with a Zombie on the last column — the Law 10 note at the test). The
// viewer's half (../viewer/tools/bubble-click-reveals.test.mjs) clicks the bubble on the page; the sandbox's half
// (../kingdom/tools/bubble-click-reveals.verify.mjs) clicks it on the built BATTLE-SANDBOX.html and reads the engine's battle
// before and after. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { runBattle } from '../../engine/src/core/battle.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('a click on an off-screen unit\'s bubble selects it and slides the view to its hex', () => {
  // Law 10, 2026-10-04 (engine fix.opening-orphanage-closer-start; engine DECISIONS.md 2026-10-04 '… a closer start': "bring the hero
  // forward to the end of the bridge and bring the zombie left, maybe 3 squares"). This read
  //   it('the engine: the Orphanage opens with a Zombie on the board\'s last column, far from the party', () => {
  //     const zombie = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!, heroes = …
  //     expect(g.colOf(zombie.hex)).toBe(g.board.width - 1)
  //     for (const h of heroes) expect(g.distance(h.hex, zombie.hex)).toBeGreaterThan(5)
  //     expect(ctx.events.find((e) => e.type === 'unit.enter' && e.actor === zombie.id)).toMatchObject({ hex: zombie.hex })
  // — the old start. By the ruling the starting Zombie stands at (16,3), seven hexes from the hero and on the screen with
  // him. The unit a bubble stands for is still the engine's and still where its log says: the Zombie the schedule brings
  // in at the Start of Turn 3 on the board's FIRST column, far from where the party starts. Same three facts, of that unit.
  it('the engine: at the Start of Turn 3 the Orphanage brings a Zombie in on the board\'s first column, far from the party', () => {
    const opts = scenarioOptions(scenarioDef('test.opening-orphanage'), 1)
    const ctx = createBattle(opts), g = ctx.geo
    const starting = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!, heroes = ctx.state.units.filter((u) => u.side === 'hero')
    // the closer start, as ruled: the starting Zombie is not on an edge column any more
    expect([g.colOf(starting.hex), g.rowOf(starting.hex)]).toEqual([16, 3])
    const third = opts.encounter!.schedule!.find((s) => s.phase === 3)!.spawn[0]!
    expect(third.unit).toBe('unit.zombie'); expect(third.at!.col).toBe(0)
    const hex = g.hexId(third.at!.col, third.at!.row)
    for (const h of heroes) expect(g.distance(h.hex, hex)).toBeGreaterThan(5)
    // … and when it comes, the log says where it stands (a battle fielded to see its schedule out — engine test/opening-helpers.ts)
    const seen = createBattle({ ...opts, cfg: { switches: { boardClearWaitsForSchedule: true } } } as Parameters<typeof createBattle>[0]); runBattle(seen)
    expect(seen.events.find((e) => e.type === 'unit.enter' && e.turn === 3 && e['arrived'])).toMatchObject({ typeId: 'unit.zombie', hex })
  })
  it('the viewer page: the bubble is a button; a click selects its unit and slides the view the least distance that shows its hex', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/bubble-click-reveals.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 6/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, on the built BATTLE-SANDBOX.html (the Orphanage) — and the engine\'s battle is untouched by the click', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/bubble-click-reveals.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/bubble-click-reveals.verify.mjs', 'scratch/bubble-click-reveals.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/bubble-click-reveals: .*passed/)
  }, 170000)
})
