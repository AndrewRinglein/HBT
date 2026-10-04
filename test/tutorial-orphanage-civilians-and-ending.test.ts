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
// Law 10, 2026-10-04 (kingdom.tutorial-turns-in-battle-one; engine/DECISIONS.md 2026-10-04 'after the backlog run: …; battle 2's
// lessons' — Andrew: "Five taking turns was present in battle 1, but camera controls should stay."): the taking-turns lesson that
// battle 2 showed is battle 1's now, and the civilians' row (a) is the row that carries it — one lesson, not two (kingdom
// SWITCHES.md lessonTurnsRow). So (a) reads, as the rule: the first civilian to be activated WHILE ANOTHER UNIT HAS YET TO ACT
// shows three lines — 'The civilians are yours to move. Move them away from danger.' and the two taking-turns lines — with an
// arrow on that civilian and an arrow on the card of each unit that waits. The two tests below that held (a)'s two lines and its
// one arrow are rewritten to that, each with its note; (c1) and (c2) are untouched.
//
// Here: the three rows in the lesson table, and the runner showing each at its moment over a stand-in battle screen
// (test/lesson-stage.ts). The page half is tools/tutorial-orphanage-civilians-and-ending.verify.mjs, on the built page.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { LESSONS } from '../src/content/lessons.js'
import { lessonStage } from './lesson-stage.js'

const ORPHANAGE = 'encounter.opening.orphanage'
const row = (id: string) => LESSONS.find((r) => r.id === id) as unknown as Record<string, unknown> | undefined
const YOURS_WORDS = ['The civilians are yours to move. Move them away from danger.', 'Your units act one at a time: finish one Activation before the next begins.', 'Double-click another unit to switch to it, while the one acting has done nothing.']
const YOURS = 'lesson.orphanage.civilians-yours', PRIMARY = 'lesson.orphanage.primary-ends', END_TURN = 'lesson.orphanage.end-turn'

describe('kingdom.tutorial-orphanage-civilians-and-ending — the civilians are yours; a primary action ends the Activation; End Turn', () => {
  // Law 10, 2026-10-04 (kingdom.tutorial-turns-in-battle-one): (a)'s row read `point: { at: 'acting' }, words: ['The civilians are
  // yours to move.', 'Move them away from danger.']`. Its own words are kept, on one line; the two taking-turns lines moved from
  // battle 2 follow them; it waits for more than one unit to be left to activate; the second arrow is on the cards that wait.
  it('the three rows are in the lesson table: their words, their targets, what starts and ends each', () => {
    expect(row(YOURS), YOURS).toBeDefined(); expect(row(PRIMARY), PRIMARY).toBeDefined(); expect(row(END_TURN), END_TURN).toBeDefined()
    expect(row(YOURS)).toMatchObject({ encounterId: ORPHANAGE, starts: 'activation-begins', of: 'civilians', moreLeft: true, ends: 'time', point: [{ at: 'acting' }, { at: 'yet-to-act-cards' }],
      words: YOURS_WORDS })
    expect(row(PRIMARY)).toMatchObject({ encounterId: ORPHANAGE, starts: 'primary-ended', ends: 'time', words: ['A primary action ends that unit\'s Activation.'] })
    expect(row(PRIMARY)!['point']).toBeUndefined()
    expect(row(END_TURN)).toMatchObject({ encounterId: ORPHANAGE, starts: 'some-acted', ends: 'time', fromTurn: 2, point: { at: 'end-turn' },
      words: ['When all of your units have acted, the Enemy Phase begins.', 'End Turn begins it now: units that have not acted lose their Activation.'] })
  })

  // Law 10, 2026-10-04 (kingdom.tutorial-turns-in-battle-one): this read "the two lines and an arrow on that civilian" —
  // `toEqual(['The civilians are yours to move.', 'Move them away from danger.'])` and one arrow, `[{ unit: 2 }]`, with nobody
  // said to be waiting. As the rule: the other civilian has yet to act, the notice is the row's three lines, and a second arrow
  // is on the waiting civilian's card. Right away, in Turn 1, and not at a hero's Activation — as before.
  it('(a) the first civilian to be activated, another unit still to act: the three lines, an arrow on that civilian and one on the waiting unit\'s card — right away, in Turn 1; a hero\'s Activation does not start it', () => {
    const s = lessonStage().upTo(YOURS), L = s.lessons
    L.open(ORPHANAGE); s.battle.acting = 0; s.battle.yetToAct = [1, 2]; L.still(); expect(L.up, 'the hero is acting: not yet').toBe(null)
    s.battle.acting = 2; s.battle.yetToAct = [1]; L.still()
    expect(L.up).toBe(YOURS); expect(s.told.at(-1)!.words).toEqual(YOURS_WORDS); expect(s.told.at(-1)!.hold).toBe(false)
    expect(s.up().map((p) => p.target), 'an arrow on the civilian acting, and one on the card of the civilian that waits').toEqual([{ unit: 2 }, { card: 1 }])
    expect(L.waiting(), 'the player may act under it').toBe(false)
    s.told.at(-1)!.onDone!('time'); expect(L.up).toBe(null); expect(s.up()).toEqual([])
    s.battle.acting = 1; s.battle.yetToAct = []; L.still(); expect(L.up, 'the next civilian: not again').toBe(null)
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
