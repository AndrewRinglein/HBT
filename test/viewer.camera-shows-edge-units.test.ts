// viewer.camera-shows-edge-units (engine backlog; engine DECISIONS.md 2026-10-04 'the view may slide past the board's edge to
// show a unit on an edge column'). Andrew, asked "For edge units, should the view be allowed to slide a little past the
// board's edge so they show fully?": "1 yes". The engine's side — nothing of it changes: where units stand and arrive is its
// own, and it is why the bound had to move. Held here: on the Orphanage the first Zombie stands on the board's last column,
// the Turn 2 arrival comes in on the last column and the Turn 3 arrival on the first — hexes the camera, held to the
// board's edge, could not show whole (viewer SWITCHES arrivalsEdgeColumn, bubbleEdgeHex, lookBound: found by
// viewer.arrivals-camera and viewer.bubble-click-reveals). The viewer's half (../viewer/tools/camera-shows-edge-units.test.mjs)
// measures the new bound on the page at 1920 x 1080 and at the kingdom's battle area; the sandbox's half
// (../kingdom/tools/camera-shows-edge-units.verify.mjs) on the built BATTLE-SANDBOX.html; and
// ../kingdom/tools/camera-shows-edge-units.shot.mjs saves the browser's own picture of each of the four edges (not a gate
// test: it needs a browser). NEEDS REVIEW: the older page tests that held "never past the board's edge" are rewritten as
// the rule, each with a dated note (camera-no-void, true-3d-camera, arrivals-camera, bubble-click-reveals,
// tutorial-overlays; kingdom tools/arrivals-camera.verify.mjs). Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { runBattle } from '../../engine/src/core/battle.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

const page = (file: string) => execFileSync(process.execPath, ['--test', '--test-reporter=tap', file], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })

describe('the view may pass the board\'s edge to show a unit on an edge column', () => {
  it('the engine: on the Orphanage units stand and arrive on the board\'s first and last columns', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1)), g = ctx.geo, last = g.board.width - 1
    const zombie = ctx.state.units.find((u) => u.side === 'enemy')!
    // Law 10, combine 2026-10-04 (viewer master cf11722 with this copy's engine fix.opening-orphanage-closer-start; engine DECISIONS.md
    // 2026-10-04 '… a closer start': "bring the zombie left, maybe 3 squares"): was `expect(g.colOf(zombie.hex)).toBe(last)` — the
    // first Zombie stood on the last column, (19,3); by the ruling it stands three hexes left, on (16,3). The units that
    // stand on the board's first and last columns are the schedule's arrivals, held below as they were.
    expect([g.colOf(zombie.hex), g.rowOf(zombie.hex)]).toEqual([last - 3, 3])
    runBattle(ctx)
    // (the same note: on the closer start this battle can be over before Turn 2 — the hero reaches the first Zombie at once — so
    // the arrivals are read from the same battle fielded to see its schedule out, the engine's own switch
    // boardClearWaitsForSchedule, as test/viewer.arrivals-camera.test.ts fields it. A fielding choice, not the rule.)
    const seen = createBattle({ ...scenarioOptions(scenarioDef('test.opening-orphanage'), 1), cfg: { switches: { boardClearWaitsForSchedule: true } } } as Parameters<typeof createBattle>[0]); runBattle(seen)
    const arrivals = seen.events.filter((e) => e.type === 'unit.enter' && (e as { arrived?: unknown }).arrived).map((e) => ({ turn: e.turn, col: g.colOf((e as unknown as { hex: number }).hex) }))
    expect(arrivals.find((a) => a.turn === 2)!.col).toBe(last)
    expect(arrivals.find((a) => a.turn === 3)!.col).toBe(0)
  })
  it('the viewer page: every hex of the rim whole after the slide, the bound no wider than they need, the corners by scrolling, the Orphanage\'s own arrivals whole — at 1920 x 1080 and at the kingdom\'s battle area', () => {
    const out = page('tools/camera-shows-edge-units.test.mjs')
    expect(out).toMatch(/# pass 7/); expect(out).toMatch(/# fail 0/)
  }, 600000)
  it('the viewer page: the older tests of the camera\'s bound, rewritten as the rule (camera-no-void, arrivals-camera, bubble-click-reveals)', () => {
    for (const [file, n] of [['tools/camera-no-void.test.mjs', 3], ['tools/arrivals-camera.test.mjs', 5], ['tools/bubble-click-reveals.test.mjs', 6]] as const) {
      const out = page(file); expect(out, file).toMatch(new RegExp(`# pass ${n}\\b`)); expect(out, file).toMatch(/# fail 0/) }
  }, 600000)
  it('the sandbox: on the built BATTLE-SANDBOX.html (the Orphanage) the rim\'s hexes come whole into view, the corners by scrolling, the view inside its one bound', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/camera-shows-edge-units.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/camera-shows-edge-units.verify.mjs', 'scratch/camera-shows-edge-units.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/camera-shows-edge-units: .*passed/)
    const arrival = execFileSync(process.execPath, ['tools/arrivals-camera.verify.mjs', 'scratch/camera-shows-edge-units.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(arrival).toMatch(/the arrival's own hex is whole in the view/)
  }, 300000)
})
