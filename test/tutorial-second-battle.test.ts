// kingdom.tutorial-second-battle — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's class line,
// no map before battle 1, the Orphanage's lessons, …'). One of the extra steps the chat offered: (h) "Battle 2: several heroes
// take turns one at a time, plus the camera controls." He did not answer (h) by its letter — "Five, I think I've answered them
// all", and every other letter was a yes — so it was read as a yes.
//
// Law 10, 2026-10-04 (kingdom.tutorial-turns-in-battle-one; engine/DECISIONS.md 2026-10-04 'after the backlog run: …; battle 2's
// lessons'): he has answered it since — "Five taking turns was present in battle 1, but camera controls should stay." So (h1),
// the taking-turns lesson, is battle 1's now (the civilians' row carries it: test/tutorial-turns-in-battle-one.test.ts,
// test/tutorial-orphanage-civilians-and-ending.test.ts) and battle 2 does not show it; (h2), the camera's controls, stays in
// battle 2 as it was. This file read "battle 2's first Hero Phase shows arrows on the heroes' cards with the taking-turns
// line … battle 1 shows neither"; each test below that held (h1) in battle 2 is rewritten as the rule, with its own note.
//
// Expect, as ruled now: battle 2's first Hero Phase says nothing of taking turns; the second hero's Activation shows the camera's
// controls; battle 1 does not show the camera's controls, and a replayed battle 2 shows them never again. A page test asserts the
// camera notice's words and trigger, and where the taking-turns lesson shows.
//
// Here: battle 2's rows in the lesson table and the runner showing the camera's at its moment over a stand-in battle screen
// (test/lesson-stage.ts). The page half is tools/tutorial-second-battle.verify.mjs, on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { LESSONS } from '../src/content/lessons.js'
import { lessonStage } from './lesson-stage.js'

const LUMBERJACK = 'encounter.opening.lumberjack', ORPHANAGE = 'encounter.opening.orphanage'
const row = (id: string) => LESSONS.find((r) => r.id === id) as unknown as Record<string, unknown> | undefined
const TURNS = 'lesson.lumberjack.turns', CAMERA = 'lesson.lumberjack.camera'
const TURNS_LINE = 'Your units act one at a time: finish one Activation before the next begins.'
/** a run that has been shown everything that is not battle 2's own (Stamina among it): what is left to show is battle 2's rows */
const beforeBattleTwo = () => new Set(LESSONS.filter((r) => r.encounterId !== LUMBERJACK).map((r) => r.once ?? r.id))

describe('kingdom.tutorial-second-battle — the camera\'s controls (taking turns is battle 1\'s)', () => {
  // Law 10, 2026-10-04 (kingdom.tutorial-turns-in-battle-one): this held TWO rows of battle 2 — `lesson.lumberjack.turns` with its
  // two lines and `point: { at: 'hero-cards' }`, and the camera's. The taking-turns row is taken out of battle 2 by the ruling;
  // the camera's row is held exactly as it was.
  // LAW 10 — viewer.zoom-stays, 2026-10-05 (engine DECISIONS.md 'the battle screen must feel smooth: … The wheel's zoom stays where it is left, far enough out to see the whole board', Andrew: "2 yes" — overturning 2026-10-01 "snaps back to standard when you stop"): the two
  // word lists below read "The wheel looks closer or further, and the view springs back." as their second line; the screen's wheel no longer springs back, and the lesson is "the
  // camera's controls as the screen really has them" — so the line is the rule's own now.
  it('the camera\'s row is in the lesson table, battle 2\'s, at the second hero; battle 2 holds no taking-turns row', () => {
    expect(row(TURNS), 'taking turns is battle 1\'s lesson').toBeUndefined(); expect(row(CAMERA), CAMERA).toBeDefined()
    expect(LESSONS.filter((r) => r.encounterId === LUMBERJACK && (r.words ?? []).includes(TURNS_LINE))).toEqual([])
    expect(row(CAMERA)).toMatchObject({ encounterId: LUMBERJACK, starts: 'activation-begins', of: 'hero', nthHero: 2, ends: 'time',
      words: ['Q and E, or the left and right arrows, turn the view.', 'The wheel zooms in and out, and the view stays where you leave it.', 'Point at an edge of the screen to scroll the map.'] })
  })

  // Law 10, 2026-10-04 (kingdom.tutorial-turns-in-battle-one): this read "(h1) battle 2's first hero activated: the lines and an
  // arrow on each hero's card" — `expect(L.up).toBe(TURNS)` with the arrow on `{ card: 0 }`. By the ruling battle 2's first hero
  // shows nothing of it; what is kept is everything the test held of the camera: it waits for the SECOND hero.
  it('(h1, moved) battle 2\'s first hero activated: nothing about taking turns, no arrow on a card; (h2) the camera\'s controls only as the SECOND hero\'s Activation begins', () => {
    const s = lessonStage(beforeBattleTwo()), L = s.lessons
    L.open(LUMBERJACK); s.battle.acting = 0; s.battle.yetToAct = [1, 2]; L.still()
    expect(L.up, 'battle 2\'s first hero: no lesson of battle 2 is due').toBe(null); expect(s.told).toEqual([]); expect(s.up()).toEqual([])
    expect(L.waiting()).toBe(false)
    s.battle.acting = 1; s.battle.yetToAct = [2]; L.still(); expect(L.up, 'a civilian\'s Activation is not a hero\'s').toBe(null)
    s.battle.acting = 0; L.still(); expect(L.up, 'the same hero again: still the first').toBe(null)
    expect(s.calls, 'the first hero is still the only one activated: the camera waits').toEqual([])
  })

  // Law 10, 2026-10-04 (kingdom.tutorial-turns-in-battle-one): the first half of this test saw the taking-turns row go up at the
  // first hero with arrows on `{ card: 0 }, { card: 4 }` before the camera's; that half is gone with the row. The camera's half
  // is as it was.
  it('(h2) with a second hero in the party, his Activation shows the camera\'s controls — three lines, no arrow', () => {
    // a party of two heroes (units 0 and 4), as battle 2 fields
    const s = lessonStage(beforeBattleTwo(), [0, 4]), L = s.lessons
    L.open(LUMBERJACK); s.battle.acting = 0; s.battle.yetToAct = [1, 2, 4]; L.still()
    expect(L.up, 'the first hero: nothing').toBe(null); expect(s.up()).toEqual([])
    s.battle.acting = 4; s.battle.yetToAct = [1, 2]; L.still()
    expect(L.up).toBe(CAMERA); expect(s.told.at(-1)!.words).toEqual(['Q and E, or the left and right arrows, turn the view.', 'The wheel zooms in and out, and the view stays where you leave it.', 'Point at an edge of the screen to scroll the map.'])
    expect(s.up(), 'the battle screen has no Reset button to point at').toEqual([])
    s.told.at(-1)!.onDone!('time'); expect(L.up).toBe(null)
    expect(s.told.length, 'one notice in battle 2\'s lesson: the camera\'s').toBe(1)
  })

  // Law 10, 2026-10-04 (kingdom.tutorial-turns-in-battle-one): this read "battle 1 shows neither" and held that battle 1 never
  // told the taking-turns line. Battle 1 is where it is told now (the civilians' row); what stays true is said of the camera's
  // row: battle 1 does not show it, and nothing of battle 2 shows twice.
  it('battle 1 does not show the camera\'s controls, and battle 2 shows nothing twice', () => {
    const one = lessonStage(new Set(), [0, 4]); one.lessons.open(ORPHANAGE)
    for (const [acting, yetToAct] of [[0, [1, 2, 4]], [4, [1, 2]], [1, [2]], [2, []]] as const) {
      one.battle.acting = acting; one.battle.yetToAct = [...yetToAct]; one.lessons.still()
      for (const t of one.told.splice(0)) t.onDone?.('time')
    }
    expect([...one.seen], 'the camera\'s controls are battle 2\'s').not.toContain(CAMERA); expect([...one.seen]).not.toContain(TURNS)
    const again = lessonStage(new Set(LESSONS.flatMap((r) => [r.id, r.once ?? r.id])), [0, 4]); again.lessons.open(LUMBERJACK)
    again.battle.acting = 0; again.lessons.still(); again.battle.acting = 4; again.lessons.still(); expect(again.calls).toEqual([])
  })

  it('the page: on the built BATTLE-SANDBOX.html battle 1 shows the taking-turns line at its first civilian and battle 2 does not; battle 2 shows the camera\'s controls at its second hero; a replay shows them never again', () => {
    const out = execFileSync(process.execPath, ['tools/tutorial-second-battle.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/tutorial-second-battle: .*passed/)
  }, 420000)
})
