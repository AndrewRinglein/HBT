// kingdom.tutorial-after-battle-lines — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's class
// line, no map before battle 1, the Orphanage's lessons, …'). One of the extra steps the chat offered, as offered and as answered:
// (g) "One line each, the first time, on the XP, level-up, reward and equip screens." — "Yep, we need tutorials there."
//
// Expect: "In a new run, the recap after the Orphanage shows a gold line saying what it is; so do the rewards, the first level-up,
// the first Equip and the first Who goes; none of them shows it the second time that screen comes up. A page test asserts one
// line on each screen's first showing, read from the lesson table, and none on its second."
//
// Here: the five rows in the lesson table (src/content/lessons.ts) and the one function that says whether a screen still owes
// its line. The page half is tools/tutorial-after-battle-lines.verify.mjs, on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import * as TABLE from '../src/content/lessons.js'
import { lessonStage } from './lesson-stage.js'

type Row = { id: string; starts: string; ends: string; screen?: string; words?: readonly string[]; encounterId?: string }
const rows = (TABLE.LESSONS as readonly Row[]).filter((r) => r.starts === 'screen')
const screenLessonOf = (TABLE as unknown as { screenLessonOf?: (screen: string, seen: (key: string) => boolean) => Row | null }).screenLessonOf
const SCREENS = ['recap', 'rewards', 'level-up', 'equip', 'who-goes']

describe('kingdom.tutorial-after-battle-lines — one gold line on each screen between the battles, the first time', () => {
  it('the lesson table holds one row for each of the five screens: one line of words, for no battle in particular', () => {
    expect(rows.map((r) => r.screen).sort()).toEqual([...SCREENS].sort())
    for (const r of rows) {
      expect(r.id).toBe('lesson.screen.' + r.screen); expect(r.ends).toBe('screen'); expect(r.encounterId, r.id).toBeUndefined()
      expect(r.words!.length, r.id + ': one line').toBe(1); expect(r.words![0]!.length).toBeGreaterThan(20)
    }
    const words = Object.fromEntries(rows.map((r) => [r.screen, r.words![0]]))
    expect(words['recap']).toMatch(/XP/); expect(words['rewards']).toMatch(/one reward/i); expect(words['rewards']).toMatch(/carries/)
    expect(words['level-up']).toMatch(/level/i); expect(words['level-up']).toMatch(/kept/)
    expect(words['equip']).toMatch(/slot/); expect(words['who-goes']).toMatch(/who fights/i); expect(words['who-goes']).toMatch(/limit/)
  })

  it('a screen owes its line until the run has shown it, and never after', () => {
    expect(typeof screenLessonOf, 'src/content/lessons.ts screenLessonOf').toBe('function')
    const seen = new Set<string>()
    for (const screen of SCREENS) {
      const row = screenLessonOf!(screen, (k) => seen.has(k)); expect(row?.id).toBe('lesson.screen.' + screen)
      seen.add(row!.id)
      expect(screenLessonOf!(screen, (k) => seen.has(k)), screen + ': the second time, none').toBe(null)
    }
    expect(screenLessonOf!('draft', () => false), 'a screen with no row has no line').toBe(null)
  })

  it('the battle\'s runner has no part in them: a screen\'s row never goes up over a battle', () => {
    const s = lessonStage(new Set((TABLE.LESSONS as readonly Row[]).filter((r) => r.starts !== 'screen').flatMap((r) => [r.id, (r as { once?: string }).once ?? r.id])))
    s.lessons.open('encounter.opening.orphanage'); s.battle.acting = 0; s.lessons.happened('screen'); s.lessons.still(); s.lessons.played({ type: 'screen' })
    expect(s.calls).toEqual([]); expect(s.lessons.up).toBe(null); expect(s.lessons.waiting()).toBe(false)
  })

  it('the page: on the built BATTLE-SANDBOX.html each screen\'s first showing carries its line and its second none', () => {
    const out = execFileSync(process.execPath, ['tools/tutorial-after-battle-lines.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/tutorial-after-battle-lines: .*passed/)
  }, 420000)
})
