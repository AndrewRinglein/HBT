// kingdom.tutorial-skip — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's class line, no map
// before battle 1, the Orphanage's lessons, …'). One of the extra steps the chat offered, as offered and as answered: (i) "A
// \"Skip tutorial\" button for someone who has played before." — "I, we need to do yep."
//
// Expect: "In a new run's Orphanage a 'Skip tutorial' button shows beside the first lesson; pressing it and answering Yes removes
// the lesson, the hero is activated at once, and no lesson shows for the rest of the run - while battle 2's 'New enemy' notice
// still does; a second new run shows the tutorial again. A page test asserts each of those."
//
// Here: the runner's skip — everything it has on the screen goes, and it holds nothing back afterwards; and the page's source
// marks every row of the table. The page half is tools/tutorial-skip.verify.mjs, on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { LESSONS } from '../src/content/lessons.js'
import { lessonStage } from './lesson-stage.js'

const ORPHANAGE = 'encounter.opening.orphanage'
type Skippable = { skip?: () => void }

describe('kingdom.tutorial-skip — a Skip tutorial button', () => {
  it('skipping clears what a lesson has on the screen — the notice, the arrows, the look — and nothing is held back once every row is marked shown', () => {
    const s = lessonStage(), L = s.lessons as typeof s.lessons & Skippable
    expect(typeof L.skip, 'src/ui/lessons.ts skip').toBe('function')
    L.open(ORPHANAGE); L.still(); s.told.at(-1)!.onDone!('time')                      // the gold line, then the civilians' look with its arrows
    expect(L.up).toBe('lesson.orphanage.civilians'); expect(s.up().length).toBe(2); expect(L.waiting()).toBe(true)
    // Yes: the page marks every row of the table as shown, then tells the runner
    for (const r of LESSONS) s.seen.add(r.once ?? r.id)
    L.skip!()
    expect(L.up).toBe(null); expect(L.all).toEqual([]); expect(s.up(), 'no arrow is left').toEqual([]); expect(s.calls.at(-1), 'the view is sent back').toBe('lookBack')
    expect(L.waiting(), 'the Activation the lesson held back may begin').toBe(false); expect(L.unarmed(0), 'armed as in any battle').toBe(false)
    // nothing shows for the rest of the run
    const before = s.calls.length
    s.battle.acting = 0; L.still(); s.battle.reach = [90]; L.still(); L.happened('enemy-clicked'); L.still(); L.played({ type: 'phase.begin', phase: 'enemy' }); L.played({ type: 'damage.applied', target: 0 })
    s.battle.turn = 3; L.still(); L.open('encounter.opening.lumberjack'); L.still()
    expect(s.calls.length, 'no notice, arrow or look after the skip').toBe(before)
  })

  it('a notice that is up when the tutorial is skipped is cleared; a row whose words had already gone clears nothing that is not its own', () => {
    const s = lessonStage(), L = s.lessons as typeof s.lessons & Skippable
    L.open(ORPHANAGE); L.still(); expect(L.up).toBe('lesson.orphanage.protect')
    for (const r of LESSONS) s.seen.add(r.once ?? r.id)
    L.skip!(); expect(s.calls.at(-1), 'the gold line is cleared').toBe('clearTell'); expect(L.up).toBe(null)
    s.told.at(-1)!.onDone!('cleared'); expect(L.up, 'its own end changes nothing').toBe(null); expect(L.waiting()).toBe(false)
  })

  it('the page marks every row of the table and keeps the features of every battle: the source', () => {
    const src = readFileSync('src/ui/sandbox.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(src).toMatch(/Skip tutorial/); expect(src).toMatch(/Skip every tutorial message for this run\?/)
    const skip = src.slice(src.indexOf('function skipTutorial'), src.indexOf('function runPlay'))
    expect(skip, 'every row of the lesson table is marked shown').toMatch(/for\(const row of LESSONS\)/); expect(skip).toMatch(/performReveal/); expect(skip).toMatch(/persist\(\)/)
    expect(skip, 'the met enemies are not touched: "New enemy" still shows').not.toMatch(/enemyRevealOf|newEnemies|ENEMY_KINDS/)
  })

  it('the page: on the built BATTLE-SANDBOX.html the button shows beside the first lesson, asks once, and on Yes no lesson shows again in the run — "New enemy" still does; a new run has the tutorial again', () => {
    const out = execFileSync(process.execPath, ['tools/tutorial-skip.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/tutorial-skip: .*passed/)
  }, 420000)
})
