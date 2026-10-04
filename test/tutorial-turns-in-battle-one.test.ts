// kingdom.tutorial-turns-in-battle-one — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'after the backlog run: the yellow target
// ring goes; …; battle 2's lessons'). Asked whether battle 2's lesson (taking turns, camera controls) stays: "Five taking turns
// was present in battle 1, but camera controls should stay." Ruled: "Battle 2's lesson: taking turns belongs to battle 1 … the
// camera controls lesson stays in battle 2."
//
// Expect: "At http://127.0.0.1:4230/play the taking-turns lesson shows in the Orphanage the first time more than one of the
// player's units can be activated, and not in the Lumberjack House; the camera controls lesson still shows in the Lumberjack
// House at the second hero; Skip tutorial still ends them all; the page test asserts where each shows."
//
// Here: ONE row of the lesson table carries taking turns — the civilians' row of battle 1 (kingdom SWITCHES.md
// lessonTurnsRow) — and the runner shows it at its moment over a stand-in battle screen (test/lesson-stage.ts). The page
// half is tools/tutorial-second-battle.verify.mjs (battle 1 shows it, battle 2 does not, the camera's controls at battle 2's
// second hero) and tools/tutorial-orphanage-civilians-and-ending.verify.mjs (its words and its arrows in the Orphanage),
// each run by its own test on the built BATTLE-SANDBOX.html; Skip is tools/tutorial-skip.verify.mjs, which marks every row.
import { describe, it, expect } from 'vitest'
import { LESSONS, lessonKeyOf } from '../src/content/lessons.js'
import { lessonStage } from './lesson-stage.js'

const ORPHANAGE = 'encounter.opening.orphanage', LUMBERJACK = 'encounter.opening.lumberjack'
const row = (id: string) => LESSONS.find((r) => r.id === id) as unknown as Record<string, unknown> | undefined
const YOURS = 'lesson.orphanage.civilians-yours', CAMERA = 'lesson.lumberjack.camera', STAMINA2 = 'lesson.lumberjack.stamina'
const TURNS = ['Your units act one at a time: finish one Activation before the next begins.', 'Double-click another unit to switch to it, while the one acting has done nothing.']
const WORDS = ['The civilians are yours to move. Move them away from danger.', ...TURNS]
const saysTurns = (words: readonly string[] | undefined) => (words ?? []).some((w) => /one at a time|switch to it/i.test(w))

describe('kingdom.tutorial-turns-in-battle-one — taking turns is battle 1\'s lesson; the camera\'s controls stay in battle 2', () => {
  it('the table: one row says how the units take turns — the civilians\' row of battle 1; no row of battle 2 says it; the camera\'s row is battle 2\'s as it was', () => {
    expect(LESSONS.filter((r) => saysTurns(r.words)).map((r) => r.id), 'one lesson, not two saying the same thing').toEqual([YOURS])
    expect(row('lesson.lumberjack.turns'), 'battle 2\'s taking-turns row is gone').toBeUndefined()
    expect(row(YOURS)).toMatchObject({ encounterId: ORPHANAGE, starts: 'activation-begins', of: 'civilians', moreLeft: true, ends: 'time', words: WORDS,
      point: [{ at: 'acting' }, { at: 'yet-to-act-cards' }] })
    expect((row(YOURS)!['words'] as string[]).length, 'a notice is one to three lines').toBeLessThanOrEqual(3)
    expect(LESSONS.filter((r) => r.encounterId === LUMBERJACK).map((r) => r.id), 'battle 2\'s rows: Stamina when it is still owed, and the camera\'s controls').toEqual([STAMINA2, CAMERA])
    expect(row(CAMERA)).toMatchObject({ encounterId: LUMBERJACK, starts: 'activation-begins', of: 'hero', nthHero: 2, ends: 'time',
      words: ['Q and E, or the left and right arrows, turn the view.', 'The wheel looks closer or further, and the view springs back.', 'Point at an edge of the screen to scroll the map.'] })
  })

  it('battle 1: the first civilian activated while another unit has yet to act — the three lines, an arrow on that civilian and one on the card of each unit that waits', () => {
    const s = lessonStage().upTo(YOURS), L = s.lessons
    L.open(ORPHANAGE)
    // the hero's own Activation, the two civilians waiting: not the hero's lesson (his first Activation is the first move's)
    s.battle.acting = 0; s.battle.yetToAct = [1, 2]; L.still(); expect(L.up, 'the hero is acting: not yet').toBe(null)
    // the hero done, the first civilian begun, the other still to act: more than one unit is left to activate
    s.battle.acting = 1; s.battle.yetToAct = [2]; L.still()
    expect(L.up).toBe(YOURS); expect(s.told.at(-1)!.words).toEqual(WORDS); expect(s.told.at(-1)!.hold).toBe(false)
    expect(s.up().map((p) => p.target), 'the civilian acting, and the card of the unit that waits').toEqual([{ unit: 1 }, { card: 2 }])
    expect(L.waiting(), 'the player may act under it').toBe(false)
    expect([...s.seen]).toContain(YOURS)
    s.told.at(-1)!.onDone!('time'); expect(L.up).toBe(null); expect(s.up()).toEqual([])
    s.battle.acting = 2; s.battle.yetToAct = []; L.still(); expect(L.up, 'the next civilian: not again').toBe(null)
    expect(s.told.length, 'told once').toBe(1)
  })

  it('it waits for a choice to be there: a civilian activated with nobody else left to act does not show it; the next time more than one unit is left, it shows — every waiting unit\'s card pointed at', () => {
    const s = lessonStage().upTo(YOURS), L = s.lessons
    L.open(ORPHANAGE)
    s.battle.acting = 2; s.battle.yetToAct = []; L.still()
    expect(L.up, 'the last unit of the Hero Phase: there is nobody to switch to').toBe(null); expect(s.calls).toEqual([]); expect([...s.seen]).not.toContain(YOURS)
    // the next Hero Phase, the player switched to a civilian first: the hero and the other civilian wait
    s.battle.turn = 2; s.battle.acting = 1; s.battle.yetToAct = [0, 2]; L.still()
    expect(L.up).toBe(YOURS); expect(s.told.at(-1)!.words).toEqual(WORDS)
    expect(s.up().map((p) => p.target)).toEqual([{ unit: 1 }, { card: 0 }, { card: 2 }])
  })

  it('battle 2 does not show it: not at its first hero, not at its second, not to a run that never saw battle 1\'s — the camera\'s controls still show at the second hero', () => {
    // a run that saw all of battle 1's lessons, Stamina among them: battle 2, two heroes (units 0 and 4)
    const seen = new Set(LESSONS.filter((r) => r.encounterId === ORPHANAGE || r.encounterId === undefined).map(lessonKeyOf))
    const s = lessonStage(seen, [0, 4]), L = s.lessons
    L.open(LUMBERJACK); s.battle.acting = 0; s.battle.yetToAct = [1, 2, 4]; L.still()
    expect(L.up, 'battle 2\'s first hero, three units waiting: nothing about taking turns').toBe(null); expect(s.calls).toEqual([])
    s.battle.acting = 1; s.battle.yetToAct = [2, 4]; L.still(); expect(L.up, 'a civilian of battle 2: the civilians\' row is battle 1\'s').toBe(null)
    s.battle.acting = 4; s.battle.yetToAct = [2]; L.still()
    expect(L.up).toBe(CAMERA); expect(s.told.at(-1)!.words[0]).toBe('Q and E, or the left and right arrows, turn the view.'); expect(s.up(), 'no arrow').toEqual([])
    s.told.at(-1)!.onDone!('time'); expect(L.up).toBe(null)
    expect(s.told.filter((t) => saysTurns(t.words)), 'battle 2 said nothing of taking turns').toEqual([])
    // a run whose battle 1 ended before a civilian was ever activated: battle 2 still does not teach it (the row is battle 1's)
    const fresh = lessonStage(new Set(), [0, 4]), F = fresh.lessons
    F.open(LUMBERJACK); fresh.battle.acting = 0; fresh.battle.yetToAct = [1, 2, 4]; F.still()
    expect(F.up, 'Stamina, still owed, is battle 2\'s first').toBe(STAMINA2); fresh.told.at(-1)!.onDone!('time')
    fresh.battle.acting = 1; fresh.battle.yetToAct = [2, 4]; F.still(); fresh.battle.acting = 4; fresh.battle.yetToAct = [2]; F.still()
    expect(F.up).toBe(CAMERA); expect(fresh.told.filter((t) => saysTurns(t.words))).toEqual([]); expect([...fresh.seen]).not.toContain(YOURS)
  })

  it('Skip tutorial still ends it: while the row is up, skipping clears its notice and both arrows, and every row\'s key is one that Skip marks shown', () => {
    const s = lessonStage().upTo(YOURS), L = s.lessons
    L.open(ORPHANAGE); s.battle.acting = 1; s.battle.yetToAct = [2]; L.still(); expect(L.up).toBe(YOURS); expect(s.up().length).toBe(2)
    L.skip()
    expect(L.all).toEqual([]); expect(s.up(), 'its arrows are gone').toEqual([]); expect(s.calls).toContain('clearTell')
    // what Skip marks is every row's key (src/ui/sandbox.ts skipTutorial): the table holds no key for a taking-turns row of battle 2
    expect(LESSONS.map(lessonKeyOf)).not.toContain('lesson.lumberjack.turns'); expect(LESSONS.map(lessonKeyOf)).toContain(YOURS)
  })
})
