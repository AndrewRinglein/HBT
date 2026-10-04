// kingdom.tutorial-free-attack-and-downed — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's
// class line, no map before battle 1, the Orphanage's lessons, …'). Two of the extra steps the chat offered, as offered and as
// answered: (d) "Walking away from an enemy draws a free attack, shown the first time it would happen." — "We need to do D the
// first time you try to do it."; (f) "The first time a hero goes down: bleeding out and first aid." — "F, yes."
//
// Expect: "In the opening run, the first path planned away from an adjacent enemy shows the free-attack line with an arrow on that
// enemy and waits for one more click before the unit walks; the first of the player's units to go down gets an arrow on its
// bleed-out counter and the line that explains it. A page test asserts each notice's words, target and trigger, that the first
// provoking move needed the extra click and the second did not, and that neither lesson shows twice in a run."
//
// Here: the two rows in the lesson table and the runner showing each at its moment over a stand-in battle screen
// (test/lesson-stage.ts). The page half is tools/tutorial-free-attack-and-downed.verify.mjs, on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { LESSONS } from '../src/content/lessons.js'
import { lessonStage } from './lesson-stage.js'

const row = (id: string) => LESSONS.find((r) => r.id === id) as unknown as Record<string, unknown> | undefined
const FREE = 'lesson.free-attack', DOWNED = 'lesson.downed'

describe('kingdom.tutorial-free-attack-and-downed — the free attack, told before the blow; a unit that goes down', () => {
  it('the two rows are in the lesson table, for whichever battle of the run they first happen in', () => {
    expect(row(FREE), FREE).toBeDefined(); expect(row(DOWNED), DOWNED).toBeDefined()
    expect(row(FREE)).toMatchObject({ starts: 'path-provokes', ends: 'moved', asks: true, point: { at: 'provoker' },
      words: ['Moving away from an enemy beside you gives it a free attack.', 'Click the hex again to move anyway.'] })
    expect(row(DOWNED)).toMatchObject({ starts: 'event', event: { type: 'life.downed', of: 'player' }, ends: 'time', holds: true, look: 'struck', point: { at: 'struck-card' } })
    expect((row(DOWNED)!['words'] as string[])[0]).toBe('This unit is down and bleeding out.'); expect((row(DOWNED)!['words'] as string[]).length).toBe(3)
    expect(row(FREE)!['encounterId']).toBeUndefined(); expect(row(DOWNED)!['encounterId']).toBeUndefined()
  })

  it('(d) the first path planned that would draw a free attack: the line, an arrow on the enemy that would strike — and the walk is held once, then goes', () => {
    const s = lessonStage().upTo(FREE), L = s.lessons
    L.open('encounter.opening.lumberjack'); s.seen.add('lesson.stamina'); s.battle.acting = 0; s.battle.fresh = false; s.battle.reach = [90, 91]
    L.still(); expect(L.up, 'no path that provokes: nothing').toBe(null); expect(L.holdsBack(), 'and no walk is held').toBe(false)
    s.battle.provoker = 3; L.still()
    expect(L.up).toBe(FREE); expect(s.told.at(-1)!.words).toEqual(['Moving away from an enemy beside you gives it a free attack.', 'Click the hex again to move anyway.'])
    expect(s.up().map((p) => p.target), 'the arrow is on the enemy that would strike').toEqual([{ unit: 3 }])
    expect(L.waiting(), 'the player is not locked: he may take the path back').toBe(false)
    expect(L.holdsBack(), 'the click that would walk is held: the player is told before the blow').toBe(true)
    expect(L.holdsBack(), 'one more click walks').toBe(false)
    s.battle.moved = true; s.battle.provoker = null; L.still()
    expect(L.up).toBe(null); expect(s.up()).toEqual([])
    // the second provoking path: no line, no held click
    s.battle.moved = false; s.battle.provoker = 3; L.still(); expect(L.up).toBe(null); expect(L.holdsBack()).toBe(false)
  })

  it('(d) a path taken back before it is walked ends the row; it is not told again', () => {
    const s = lessonStage().upTo(FREE), L = s.lessons
    L.open('encounter.opening.orphanage'); s.battle.acting = 0; s.battle.fresh = false; s.battle.provoker = 3; L.still(); expect(L.up).toBe(FREE)
    s.battle.provoker = null; L.still(); expect(L.up, 'the path was taken back').toBe(null); expect(s.up()).toEqual([])
    s.battle.provoker = 3; L.still(); expect(L.up).toBe(null); expect(L.holdsBack()).toBe(false)
  })

  it('(f) the first of the player\'s units to go down: the view on it, an arrow on its card, the three lines — held; an enemy going down does not start it', () => {
    const s = lessonStage().upTo(DOWNED), L = s.lessons
    L.open('encounter.opening.bridge')
    L.played({ type: 'life.downed', target: 3 }); expect(L.up, 'an enemy went down: not the player\'s').toBe(null)
    L.played({ type: 'life.dead', target: 1 }); expect(L.up, 'a unit that dies outright is not down').toBe(null)
    L.played({ type: 'life.downed', target: 1 })
    expect(L.up).toBe(DOWNED); expect(s.told.at(-1)!.hold).toBe(true); expect(s.told.at(-1)!.words[0]).toBe('This unit is down and bleeding out.')
    expect(s.looks.at(-1)!.unit).toBe(1); expect(s.up().map((p) => p.target)).toEqual([{ card: 1 }])
    s.told.at(-1)!.onDone!('time'); expect(L.up).toBe(null); expect(s.up()).toEqual([])
    L.played({ type: 'life.downed', target: 0 }); expect(L.up, 'once in a run').toBe(null)
  })

  it('the page: on the built BATTLE-SANDBOX.html the first provoking path waits for one more click and the second does not; a downed unit is explained', () => {
    const out = execFileSync(process.execPath, ['tools/tutorial-free-attack-and-downed.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/tutorial-free-attack-and-downed: .*passed/)
  }, 480000)
})
