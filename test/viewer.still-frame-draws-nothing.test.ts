// viewer.still-frame-draws-nothing (engine backlog; split out of viewer.scene-drawn-in-few-calls by the home chat 2026-10-05;
// engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: the speed first; …' — Andrew: "I want this to feel smooth
// like a AAA game."). The three parts of that item that change no pixel: (1) a frame in which nothing changed draws nothing —
// no scene pass, no shadow pass, no bodies' canvas; (2) the bodies' canvas takes depth only from the scene pieces that can hide
// a body, not from all of the scenery; (3) the scene's pieces are listed once instead of walked twice every frame.
// Its one hard condition: "What counts as 'changed' must include everything that can move a pixel: the camera, a body's motion
// or idle, an effect, a notice, a highlight or mark, the fog or a ground fire, a hover - if any of these is live the frame
// draws; the page must never show a stale frame."
// Expect: "With the clock held and nothing live, a frame issues 0 draw calls …; with bodies idling, the Orphanage's frame is at
// or under the measured 1,139 draw calls; the frame-cost tool's two-way compare finds 0 differing pixels …; moving the camera,
// starting an effect, showing a notice or hovering a hex each draws the very next frame (a page test for each)".
//
// The sources' half is ../viewer/tools/still-frame-draws-nothing.test.mjs (run here). The page's half is the frame-cost tool
// in real Chrome on a sandbox page built here from these sources — the Orphanage (bodies on a still scene) and the Caravan (a
// scene whose fog and ground fires move): the clock is the tool's to hold, so each live thing is started by hand with
// nothing else moving, and the very next frame is read.
// Imports no page code.
import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

type Pass = { all: number; shadow: number; scene: number; bodies: number }
type Measure = { frames: number; draws: Pass; triangles: Pass }
type Live = { held: number; camera: number; afterCamera: number; idle: number; afterIdle: number; effect: { first: number; next: number; ended: number; after: number } | null; notice: { atOnce: boolean; nextFrame: boolean }; hover: { tip: boolean; words: string } }
type Row = { battle: string; flat?: boolean; note?: string; still: { withCheck: Measure; withoutCheck: Measure }; scrolling: { withCheck: Measure; withoutCheck: Measure }; held: Measure; live: Live
  shadow?: { views: number; bodies: number; pixels: number; depth?: { pieces: number; differing: number; worst: number } }; pageErrors?: string[] }

describe('viewer.still-frame-draws-nothing', () => {
  it('the sources: the scene listed once; the pieces that can hide a body never fewer than do; a frame in which nothing changed not drawn, and drawn for each thing that changes', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/still-frame-draws-nothing.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
  }, 170000)

  describe('the built page in real Chrome', () => {
    let orphanage: Row, caravan: Row
    beforeAll(() => {
      mkdirSync('../kingdom/scratch', { recursive: true })
      execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/still-frame-draws-nothing.html'], { cwd: '../kingdom', stdio: 'pipe' })
      const out = execFileSync(process.execPath, ['tools/frame-cost.mjs', 'orphanage', 'caravan-aftermath', '--json', '--page', '../kingdom/scratch/still-frame-draws-nothing.html'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, timeout: 560000 })
      const rows = (JSON.parse(out) as { rows: Row[] }).rows
      expect(rows.map((r) => r.battle)).toEqual(['encounter.opening.orphanage', 'encounter.caravan-aftermath'])
      for (const r of rows) { expect(r.flat, r.note).toBeFalsy(); expect(r.pageErrors ?? [], r.battle).toEqual([]) }
      ;[orphanage, caravan] = rows as [Row, Row]
    }, 780000)

    it('the clock held and nothing live: a frame issues 0 draw calls — no scene pass, no shadow pass, no bodies\' canvas', () => {
      expect(orphanage.held.frames).toBeGreaterThanOrEqual(30)
      expect(orphanage.held.draws).toEqual({ all: 0, shadow: 0, scene: 0, bodies: 0 })
      expect(orphanage.live.held).toBe(0)
    })

    it('the camera moved: drawn the very next frame, and not the one after', () => {
      expect(orphanage.live.camera, 'draw calls on the frame after the view moved').toBeGreaterThan(100)
      expect(orphanage.live.afterCamera, 'and then nothing live again').toBe(0)
    })

    it('a body\'s idle: time passed with bodies on the board — drawn that frame; with bodies idling the Orphanage\'s frame is at or under 1,139 draw calls', () => {
      expect(orphanage.live.idle, 'draw calls on a frame 16 ms on').toBeGreaterThan(100)
      expect(orphanage.live.afterIdle, 'the clock held again').toBe(0)
      for (const m of [orphanage.still.withCheck, orphanage.still.withoutCheck]) {
        expect(m.draws.all, 'the Orphanage, bodies idling').toBeGreaterThan(0)
        expect(m.draws.all, 'the Orphanage, bodies idling: at or under the measured 1,139 (it was 1,531)').toBeLessThanOrEqual(1139 + 60)
        expect(m.draws.shadow, 'the bodies\' shadows are drawn').toBeGreaterThan(0); expect(m.draws.bodies, 'and the bodies').toBeGreaterThan(0)
      }
    })

    it('the fog and the ground fires: a scene that moves by itself is drawn on every frame, the clock held or not', () => {
      expect(caravan.held.draws.scene, 'the Caravan\'s scene pass with the clock held').toBeGreaterThan(100)
      expect(caravan.live.held, 'and on the frame read by hand').toBeGreaterThan(100)
    })

    it('an effect started: its layer draws it the very next frame, goes on drawing it, and stops when it is done', () => {
      expect(orphanage.live.effect, 'the page has its effects layer').toBeTruthy()
      const e = orphanage.live.effect!
      expect(e.first, 'drawn on the frame after it was started — the clock held, the 3D frame drawing nothing').toBe(1)
      expect(e.next, 'and on the next').toBe(2)
      expect(e.ended, 'through its time').toBeGreaterThan(10)
      expect(e.after, 'and no more once it is done').toBe(e.ended)
    })

    it('a notice shown: on the page at once and on the very next frame', () => {
      expect(orphanage.live.notice).toEqual({ atOnce: true, nextFrame: true })
    })

    it('a hex hovered: its tip shows by the very next frame', () => {
      expect(orphanage.live.hover.tip, `the tip on the hex under the pointer ("${orphanage.live.hover.words}")`).toBe(true)
    })

    it('the picture: the bodies\' canvas draws a few dozen pieces for depth where it drew every solid piece, and the two canvases are the same in every pixel both ways', () => {
      for (const r of [orphanage, caravan]) {
        expect(r.shadow?.depth, `${r.battle}: the page says how the bodies' depth is taken`).toBeTruthy()
        expect(r.shadow!.bodies, `${r.battle}: bodies are in every view compared`).toBeGreaterThan(1000)
        expect([r.shadow!.depth!.differing, r.shadow!.depth!.worst], `${r.battle}: pixels that differ; by how much`).toEqual([0, 0])
      }
      for (const m of [orphanage.still.withCheck, orphanage.still.withoutCheck, orphanage.scrolling.withoutCheck]) expect(m.draws.bodies, 'the Orphanage\'s bodies\' canvas: it was 498').toBeLessThan(250)
      expect(orphanage.shadow!.depth!.pieces, 'pieces in the depth pass, at the most over the round').toBeLessThan(250)
    })
  })
})
