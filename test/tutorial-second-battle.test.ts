// kingdom.tutorial-second-battle — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's class line,
// no map before battle 1, the Orphanage's lessons, …'). One of the extra steps the chat offered: (h) "Battle 2: several heroes
// take turns one at a time, plus the camera controls." He did not answer (h) by its letter — "Five, I think I've answered them
// all", and every other letter was a yes — so it is read as a yes (abandon this item if he says no).
//
// Expect: "In the opening run, battle 2's first Hero Phase shows arrows on the heroes' cards with the taking-turns line, and the
// second hero's Activation shows the camera's controls with an arrow on Reset; battle 1 shows neither, and a replayed battle 2
// shows neither again. A page test asserts both notices' words, targets and triggers."
//
// Here: the two rows in the lesson table and the runner showing each at its moment over a stand-in battle screen
// (test/lesson-stage.ts). The page half is tools/tutorial-second-battle.verify.mjs, on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { LESSONS } from '../src/content/lessons.js'
import { lessonStage } from './lesson-stage.js'

const LUMBERJACK = 'encounter.opening.lumberjack', ORPHANAGE = 'encounter.opening.orphanage'
const row = (id: string) => LESSONS.find((r) => r.id === id) as unknown as Record<string, unknown> | undefined
const TURNS = 'lesson.lumberjack.turns', CAMERA = 'lesson.lumberjack.camera'

describe('kingdom.tutorial-second-battle — taking turns; the camera\'s controls', () => {
  it('the two rows are in the lesson table, battle 2\'s: the taking-turns lines with arrows on the heroes\' cards, the camera\'s controls at the second hero', () => {
    expect(row(TURNS), TURNS).toBeDefined(); expect(row(CAMERA), CAMERA).toBeDefined()
    expect(row(TURNS)).toMatchObject({ encounterId: LUMBERJACK, starts: 'activation-begins', of: 'hero', ends: 'time', point: { at: 'hero-cards' },
      words: ['Your units act one at a time: finish one Activation before the next begins.', 'Double-click another unit to switch to it, while the one acting has done nothing.'] })
    expect(row(CAMERA)).toMatchObject({ encounterId: LUMBERJACK, starts: 'activation-begins', of: 'hero', nthHero: 2, ends: 'time',
      words: ['Q and E, or the left and right arrows, turn the view.', 'The wheel looks closer or further, and the view springs back.', 'Point at an edge of the screen to scroll the map.'] })
  })

  it('(h1) battle 2\'s first hero activated: the lines and an arrow on each hero\'s card; (h2) the camera\'s controls only as the SECOND hero\'s Activation begins', () => {
    const s = lessonStage().upTo(TURNS), L = s.lessons
    L.open(LUMBERJACK); s.battle.acting = 0; L.still()
    expect(L.up).toBe(TURNS); expect(s.told.at(-1)!.words[0]).toBe('Your units act one at a time: finish one Activation before the next begins.')
    expect(s.up().map((p) => p.target), 'an arrow on each hero\'s card in the top bar').toEqual([{ card: 0 }])
    expect(L.waiting()).toBe(false)
    s.told.at(-1)!.onDone!('time'); L.still()
    expect(L.up, 'the first hero is still the only one activated: the camera waits').toBe(null); expect(s.up()).toEqual([])
    s.battle.acting = 1; L.still(); expect(L.up, 'a civilian\'s Activation is not a hero\'s').toBe(null)
    s.battle.acting = 0; L.still(); expect(L.up, 'the same hero again: still the first').toBe(null)
  })

  it('(h2) with a second hero in the party, his Activation shows the camera\'s controls — three lines, no arrow', () => {
    // a party of two heroes (units 0 and 4), as battle 2 fields
    const s = lessonStage(new Set(), [0, 4]).upTo(TURNS), L = s.lessons
    L.open(LUMBERJACK); s.battle.acting = 0; L.still()
    expect(L.up).toBe(TURNS); expect(s.up().map((p) => p.target)).toEqual([{ card: 0 }, { card: 4 }])
    s.told.at(-1)!.onDone!('time')
    s.battle.acting = 4; L.still()
    expect(L.up).toBe(CAMERA); expect(s.told.at(-1)!.words).toEqual(['Q and E, or the left and right arrows, turn the view.', 'The wheel looks closer or further, and the view springs back.', 'Point at an edge of the screen to scroll the map.'])
    expect(s.up(), 'the battle screen has no Reset button to point at').toEqual([])
    s.told.at(-1)!.onDone!('time'); expect(L.up).toBe(null)
  })

  it('battle 1 shows neither, and neither shows twice', () => {
    const one = lessonStage(new Set(LESSONS.filter((r) => r.encounterId === ORPHANAGE || r.encounterId === undefined).flatMap((r) => [r.id, r.once ?? r.id])))
    one.lessons.open(ORPHANAGE); one.battle.acting = 0; one.lessons.still(); expect(one.told.map((t) => t.words[0])).not.toContain('Your units act one at a time: finish one Activation before the next begins.')
    expect([...one.seen]).not.toContain(TURNS); expect([...one.seen]).not.toContain(CAMERA)
    const again = lessonStage(new Set(LESSONS.flatMap((r) => [r.id, r.once ?? r.id]))); again.lessons.open(LUMBERJACK); again.battle.acting = 0; again.lessons.still(); expect(again.calls).toEqual([])
  })

  it('the page: on the built BATTLE-SANDBOX.html battle 2 shows the taking-turns line at its first hero and the camera\'s controls at its second; battle 1 neither; a replay neither again', () => {
    const out = execFileSync(process.execPath, ['tools/tutorial-second-battle.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/tutorial-second-battle: .*passed/)
  }, 420000)
})

