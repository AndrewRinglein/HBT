// kingdom.tutorial-orphanage-civilians-and-ending — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first
// hero's class line, no map before battle 1, the Orphanage's lessons, …'). Two of the extra steps the chat offered, as offered and
// as answered: (a) "Civilians are yours to move: \"Move the civilians away from danger.\"" — "we should do A right away."; (c) "A
// hero's turn ends after its primary action, and what End Turn does." — "Okay, we need to do C." And: "we don't want to
// front-load every single thing into the first couple of turns."
//
// Expect: "In a new run's Orphanage, the first civilian to be activated shows 'The civilians are yours to move. Move them away
// from danger.' with an arrow on it; the hero's first primary action is followed by the line that a primary action ends the
// Activation; in Turn 2 an arrow sits on End Turn with its line. A page test asserts each notice's words, target and trigger,
// that (c2) does not show in Turn 1, and that a replayed battle shows none of them."
//
// Here: the three rows in the lesson table, and the runner showing each at its moment over a stand-in battle screen
// (test/lesson-stage.ts). The page half is tools/tutorial-orphanage-civilians-and-ending.verify.mjs, on the built page.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { LESSONS } from '../src/content/lessons.js'
import { lessonStage } from './lesson-stage.js'

const ORPHANAGE = 'encounter.opening.orphanage'
const row = (id: string) => LESSONS.find((r) => r.id === id) as unknown as Record<string, unknown> | undefined
const YOURS = 'lesson.orphanage.civilians-yours', PRIMARY = 'lesson.orphanage.primary-ends', END_TURN = 'lesson.orphanage.end-turn'

describe('kingdom.tutorial-orphanage-civilians-and-ending — the civilians are yours; a primary action ends the Activation; End Turn', () => {
  it('the three rows are in the lesson table: their words, their targets, what starts and ends each', () => {
    expect(row(YOURS), YOURS).toBeDefined(); expect(row(PRIMARY), PRIMARY).toBeDefined(); expect(row(END_TURN), END_TURN).toBeDefined()
    expect(row(YOURS)).toMatchObject({ encounterId: ORPHANAGE, starts: 'activation-begins', of: 'civilians', ends: 'time', point: { at: 'acting' },
      words: ['The civilians are yours to move.', 'Move them away from danger.'] })
    expect(row(PRIMARY)).toMatchObject({ encounterId: ORPHANAGE, starts: 'primary-ended', ends: 'time', words: ['A primary action ends that unit\'s Activation.'] })
    expect(row(PRIMARY)!['point']).toBeUndefined()
    expect(row(END_TURN)).toMatchObject({ encounterId: ORPHANAGE, starts: 'some-acted', ends: 'time', fromTurn: 2, point: { at: 'end-turn' },
      words: ['When all of your units have acted, the Enemy Phase begins.', 'End Turn begins it now: units that have not acted lose their Activation.'] })
  })

  it('(a) the first civilian to be activated: the two lines and an arrow on that civilian — right away, in Turn 1; a hero\'s Activation does not start it', () => {
    const s = lessonStage().upTo(YOURS), L = s.lessons
    L.open(ORPHANAGE); s.battle.acting = 0; L.still(); expect(L.up, 'the hero is acting: not yet').toBe(null)
    s.battle.acting = 2; L.still()
    expect(L.up).toBe(YOURS); expect(s.told.at(-1)!.words).toEqual(['The civilians are yours to move.', 'Move them away from danger.']); expect(s.told.at(-1)!.hold).toBe(false)
    expect(s.up().map((p) => p.target), 'the arrow is on the civilian acting').toEqual([{ unit: 2 }])
    expect(L.waiting(), 'the player may act under it').toBe(false)
    s.told.at(-1)!.onDone!('time'); expect(L.up).toBe(null); expect(s.up()).toEqual([])
    s.battle.acting = 1; L.still(); expect(L.up, 'the next civilian: not again').toBe(null)
  })

  it('(c1) a unit\'s Activation ended by its primary action: the line, once the board is still; (c2) End Turn\'s line with its arrow — in Turn 2, once one unit has acted and another has not, never in Turn 1', () => {
    const s = lessonStage().upTo(PRIMARY), L = s.lessons
    L.open(ORPHANAGE); s.battle.acting = 1; s.battle.fresh = true
    // Turn 1: one unit has acted, others have not — End Turn's line does not show in Turn 1
    s.battle.acted = { done: 1, left: 2 }; L.still(); expect(L.up, 'Turn 1 is not crowded').toBe(null)
    L.happened('primary-ended'); L.still()
    expect(L.up).toBe(PRIMARY); expect(s.told.at(-1)!.words).toEqual(['A primary action ends that unit\'s Activation.']); expect(s.up()).toEqual([])
    L.still(); expect(s.told.length, 'one row\'s words at a time').toBe(1)
    s.told.at(-1)!.onDone!('time'); expect(L.up, 'still Turn 1: End Turn\'s line waits').toBe(null)
    // Turn 2, the first unit acting: nobody has acted yet
    s.battle.turn = 2; s.battle.acted = { done: 0, left: 3 }; L.still(); expect(L.up).toBe(null)
    s.battle.acted = { done: 1, left: 2 }; L.still()
    expect(L.up).toBe(END_TURN); expect(s.up().map((p) => p.target)).toEqual([{ ui: 'end-turn' }])
    expect(s.told.at(-1)!.words).toEqual(['When all of your units have acted, the Enemy Phase begins.', 'End Turn begins it now: units that have not acted lose their Activation.'])
    s.told.at(-1)!.onDone!('time'); expect(L.up).toBe(null); expect(s.up()).toEqual([])
    L.happened('primary-ended'); L.still(); expect(L.up, 'each once').toBe(null)
    // everybody has acted, or nobody has: nothing to say about End Turn
    const all = lessonStage().upTo(END_TURN); all.lessons.open(ORPHANAGE); all.battle.turn = 2; all.battle.acting = 2; all.battle.acted = { done: 2, left: 0 }; all.lessons.still(); expect(all.lessons.up).toBe(null)
  })

  it('the page: on the built BATTLE-SANDBOX.html the three lessons show at their moments in a new run\'s Orphanage; a replayed battle shows none', () => {
    const out = execFileSync(process.execPath, ['tools/tutorial-orphanage-civilians-and-ending.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/tutorial-orphanage-civilians-and-ending: .*passed/)
  }, 300000)
})
