// kingdom.tutorial-bars-and-stamina — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's class
// line, no map before battle 1, the Orphanage's lessons, …'). Two of the extra steps the chat offered, as offered and as answered:
// (b) "What the Health and Protection bars under a unit mean." — "B should happen as soon as damage is inflicted."; (e) "Attacks
// cost Stamina." — "We need to explain E at some point, but we don't want to front-load every single thing into the first couple
// of turns. I think we can do stamina on turn 3 or turn 4."
//
// Expect: "In a new run's Orphanage, the first blow that deals damage is followed by an arrow on the struck unit's bars and the
// line that names Health and Protection; nothing about Stamina shows on Turns 1 and 2; on Turn 3 an arrow sits on the stamina strip
// with its line. A page test asserts both notices' words, targets and triggers, that (e) shows in battle 2 when battle 1 ended
// before Turn 3, and that neither shows twice in a run."
//
// Here: the rows in the lesson table and the runner showing each at its moment over a stand-in battle screen
// (test/lesson-stage.ts). The page half is tools/tutorial-bars-and-stamina.verify.mjs, on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { LESSONS } from '../src/content/lessons.js'
import { lessonStage } from './lesson-stage.js'

const ORPHANAGE = 'encounter.opening.orphanage', LUMBERJACK = 'encounter.opening.lumberjack'
const row = (id: string) => LESSONS.find((r) => r.id === id) as unknown as Record<string, unknown> | undefined
const BARS = 'lesson.bars', STAMINA = 'lesson.orphanage.stamina', STAMINA2 = 'lesson.lumberjack.stamina'
const WORDS = ['Attacks and powers cost Stamina — the strip beside the action bar.', 'What an action costs is shown on its slot.', 'Stamina comes back at the end of each Hero Phase.']

describe('kingdom.tutorial-bars-and-stamina — the two bars at the first damage; Stamina on Turn 3', () => {
  it('the rows are in the lesson table: the bars in whichever battle the first damage is; Stamina in the Orphanage from Turn 3, or in battle 2 — one lesson, told once', () => {
    expect(row(BARS), BARS).toBeDefined(); expect(row(STAMINA), STAMINA).toBeDefined(); expect(row(STAMINA2), STAMINA2).toBeDefined()
    expect(row(BARS)).toMatchObject({ starts: 'event', event: { type: 'damage.applied' }, ends: 'time', holds: true, look: 'struck', point: [{ at: 'struck-health' }, { at: 'struck-protection' }],
      words: ['Under each unit: its Health bar, and beneath it its Protection.', 'A blow takes from Protection first; what is left comes off Health.'] })
    expect(row(BARS)!['encounterId']).toBeUndefined()
    expect(row(STAMINA)).toMatchObject({ once: 'lesson.stamina', encounterId: ORPHANAGE, starts: 'activation-begins', of: 'hero', fromTurn: 3, ends: 'time', point: { at: 'stamina' }, words: WORDS })
    expect(row(STAMINA2)).toMatchObject({ once: 'lesson.stamina', encounterId: LUMBERJACK, starts: 'activation-begins', of: 'hero', ends: 'time', point: { at: 'stamina' }, words: WORDS })
    expect(row(STAMINA2)!['fromTurn']).toBeUndefined()
  })

  it('(b) the first line of damage the board plays: the view on the unit struck, an arrow on each of its two bars, the two lines — held; in any battle of the run, once', () => {
    const s = lessonStage().upTo(BARS), L = s.lessons
    L.open(LUMBERJACK)
    L.played({ type: 'attack.hit', target: 2 }); expect(L.up, 'a hit is not yet damage').toBe(null)
    L.played({ type: 'damage.applied', phase: 'enemy', target: 2 })
    expect(L.up).toBe(BARS); expect(s.told.at(-1)).toMatchObject({ hold: true, words: ['Under each unit: its Health bar, and beneath it its Protection.', 'A blow takes from Protection first; what is left comes off Health.'] })
    expect(s.looks.at(-1)!.unit).toBe(2); expect(s.up().map((p) => p.target)).toEqual([{ unit: 2, part: 'health' }, { unit: 2, part: 'protection' }])
    s.told.at(-1)!.onDone!('time'); expect(L.up).toBe(null); expect(s.up()).toEqual([]); expect(s.calls.at(-1)).toBe('lookBack')
    L.played({ type: 'damage.applied', target: 3 }); expect(L.up, 'the next blow: not again').toBe(null)
    expect([...s.seen]).toContain('lesson.bars')
  })

  it('(e) Stamina: nothing on Turns 1 and 2 of the Orphanage; on Turn 3 as the hero\'s Activation begins, an arrow on the stamina strip', () => {
    const s = lessonStage().upTo(STAMINA), L = s.lessons
    L.open(ORPHANAGE); s.battle.acting = 0
    for (const turn of [1, 2]) { s.battle.turn = turn; L.still(); expect(L.up, `Turn ${turn}: nothing about Stamina`).toBe(null); expect(s.calls).toEqual([]) }
    s.battle.turn = 3; s.battle.acting = 1; L.still(); expect(L.up, 'a civilian\'s Activation: not it').toBe(null)
    s.battle.acting = 0; L.still()
    expect(L.up).toBe(STAMINA); expect(s.told.at(-1)!.words).toEqual(WORDS); expect(s.told.at(-1)!.hold).toBe(false); expect(s.up().map((p) => p.target)).toEqual([{ ui: 'stamina' }])
    expect([...s.seen], 'remembered as the one lesson').toContain('lesson.stamina')
    s.told.at(-1)!.onDone!('time'); expect(L.up).toBe(null)
    // … and battle 2 does not tell it again
    // Law 10, 2026-10-04 (kingdom.tutorial-second-battle; engine DECISIONS.md 2026-10-04 'the opening's tutorial: …'): this read
    //   L.open(LUMBERJACK); …; L.still(); expect(L.up).toBe(null)
    // — nothing at all went up in battle 2, true while Stamina's was battle 2's only row. Battle 2 has its own lessons now, so
    // what this test holds is said of Stamina: its words are told once, and battle 2 does not tell them again.
    L.open(LUMBERJACK); s.battle.turn = 1; s.battle.acting = 0; s.battle.fresh = true; L.still()
    expect(L.all).not.toContain(STAMINA2); expect(s.told.filter((t) => t.words[0] === WORDS[0]).length, 'Stamina is told once').toBe(1)
  })

  it('battle 1 over before Turn 3: Stamina is told on the first hero Activation of battle 2 — and not again in the Orphanage', () => {
    const s = lessonStage().upTo(STAMINA), L = s.lessons
    L.open(LUMBERJACK); s.battle.turn = 1; s.battle.acting = 0; L.still()
    expect(L.up).toBe(STAMINA2); expect(s.told.at(-1)!.words).toEqual(WORDS); expect(s.up().map((p) => p.target)).toEqual([{ ui: 'stamina' }])
    s.told.at(-1)!.onDone!('time')
    L.open(ORPHANAGE); s.battle.turn = 3; s.battle.acting = 0; L.still(); expect(L.up, 'one lesson, told once').toBe(null)
  })

  it('the page: on the built BATTLE-SANDBOX.html the bars show at the first damage and Stamina on Turn 3, or in battle 2 when battle 1 ended before it; neither twice in a run', () => {
    const out = execFileSync(process.execPath, ['tools/tutorial-bars-and-stamina.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/tutorial-bars-and-stamina: .*passed/)
  }, 420000)
})
