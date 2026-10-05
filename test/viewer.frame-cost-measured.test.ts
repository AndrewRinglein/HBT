// viewer.frame-cost-measured (engine backlog; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: the speed
// first; …' — Andrew: "The game still feels clutzy … I want this to feel smooth like a AAA game."). The root chat timed one
// frame of the battle screen by hand; "No tool says so, so nothing holds it." The tool is tools/frame-cost.mjs: it opens the
// built page in real Chrome and prints, a battle a row, the draw calls and the triangles a frame split by pass (the shadow map,
// the scene, the bodies' canvas) and the script time of one call of src/terrain3d.js frame() with the see-through check and
// without it — with nothing moving, and again while the view scrolls. It asserts nothing by itself: the three items after it
// each name the column they bring down. This test runs it on ONE battle (the Bridge, the lightest) and reads every column.
// Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

type Pass = { all: number; shadow: number; scene: number; bodies: number; other?: number }
type Measure = { frames: number; ms: { median: number; min: number; max: number }; draws: Pass; triangles: Pass; checks?: number }
type Row = { battle: string; flat?: boolean; note?: string; board: { w: number; h: number }; gpu: string; loadMs: number; still: { withCheck: Measure; withoutCheck: Measure }; scrolling: { withCheck: Measure; withoutCheck: Measure }; pageErrors?: string[] }
const PAGE = '../kingdom/BATTLE-SANDBOX.html'

describe('viewer.frame-cost-measured — the tool that says what a frame costs', () => {
  it('the tool is in the viewer\'s tools, and the package\'s command list names it', () => {
    expect(existsSync('tools/frame-cost.mjs')).toBe(true)
    expect(readFileSync('CLAUDE.md', 'utf8')).toMatch(/node tools\/frame-cost\.mjs/)
  })

  it('run on the Bridge it prints one row, and every column of it reads: draw calls and triangles by pass, script ms with the see-through check and without, still and scrolling, each over 30 frames or more', () => {
    expect(existsSync(PAGE), 'the built page the tool opens').toBe(true)
    const out = execFileSync(process.execPath, ['tools/frame-cost.mjs', 'bridge', '--json'], { encoding: 'utf8', maxBuffer: 1 << 24, timeout: 280000 })
    const got = JSON.parse(out) as { page: string; window: { w: number; h: number }; frames: number; rows: Row[] }
    expect(got.page).toBe('kingdom/BATTLE-SANDBOX.html')
    expect(got.window).toEqual({ w: 1920, h: 1080 })
    expect(got.frames).toBeGreaterThanOrEqual(30)
    expect(got.rows.map((r) => r.battle), 'the short name is its encounter').toEqual(['encounter.opening.bridge'])
    const row = got.rows[0]!
    expect(row.flat, row.note).toBeFalsy()
    expect(row.pageErrors ?? [], 'no page error while it measured').toEqual([])
    expect(row.board.w).toBeGreaterThan(0); expect(row.board.h).toBeGreaterThan(0)
    expect(row.board.w, 'the board is part of the 1920 px window').toBeLessThan(1920)
    expect(typeof row.gpu).toBe('string'); expect(row.gpu.length).toBeGreaterThan(1)
    const whole = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0
    for (const [when, pair] of [['still', row.still], ['scrolling', row.scrolling]] as const) {
      for (const [which, m] of [['with the check', pair.withCheck], ['without it', pair.withoutCheck]] as const) {
        const at = `${when}, ${which}`
        expect(m.frames, at).toBeGreaterThanOrEqual(30)
        // script ms: a number of milliseconds, its lowest and highest about its median
        expect(m.ms.median, at).toBeGreaterThan(0)
        expect(m.ms.min, at).toBeLessThanOrEqual(m.ms.median); expect(m.ms.max, at).toBeGreaterThanOrEqual(m.ms.median)
        expect(m.ms.max, `${at}: one frame's script, in ms`).toBeLessThan(60000)
        // draw calls and triangles, split by pass, and the passes add up
        for (const [what, p] of [['draw calls', m.draws], ['triangles', m.triangles]] as const) {
          for (const k of ['all', 'shadow', 'scene', 'bodies'] as const) expect(whole(p[k]), `${at}: ${what}, ${k} = ${p[k]}`).toBe(true)
          expect(p.all, `${at}: ${what} add up over the passes`).toBe(p.shadow + p.scene + p.bodies + (p.other ?? 0))
        }
      }
      // a triangle count goes with its draw calls: a pass that drew nothing drew no triangle
      for (const m of [pair.withCheck, pair.withoutCheck]) for (const k of ['shadow', 'scene', 'bodies'] as const) if (m.draws[k] === 0) expect(m.triangles[k]).toBe(0)
    }
    // while the view scrolls every frame is drawn: the scene and the bodies both
    expect(row.scrolling.withoutCheck.draws.scene).toBeGreaterThan(0)
    expect(row.scrolling.withoutCheck.draws.bodies).toBeGreaterThan(0)
    expect(row.scrolling.withoutCheck.triangles.all).toBeGreaterThan(100000)
  }, 290000)
})
