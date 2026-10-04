// kingdom.tutorial-orphanage-first-move — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's
// class line, no map before battle 1, the Orphanage's lessons, the camera shows what arrives, new enemies are named, a closer
// start'): "there should be a notification message across the center that is gold and easy to see: \"Use your hero to protect
// the civilians.\" The camera zooms onto the civilians, and an arrow points at them and says \"Civilians.\" It then zooms to the
// zombie on the map, points at it, and says \"Zombie.\" It then zooms back to your hero and says \"Your Hero,\" and your hero is
// activated. … \"Perform your move now.\" And we're going to point an arrow over at the move button. … After they press it we're
// going to put a message up that says, \"Move towards the zombie and the civilians,\" and points at a square. And then after
// they move, that goes away." Asked whether the lesson should just point rather than wait for a press: "1, no."
//
// Expect: "At http://127.0.0.1:4230/play a new run's Orphanage opens with the gold line …; the view visits the civilians
// ('Civilians'), the Zombie ('Zombie') and the hero ('Your Hero'); the hero's Activation begins with no move chosen; the
// two-actions line and 'Perform your move now.' show with an arrow on the basic move's slot until it is pressed; then the blue
// grid and 'Move towards the zombie and the civilians.' with an arrow on a hex; all of it is gone once the hero has moved. A
// page test walks the steps in order …"
//
// Here: the lesson TABLE (src/content/lessons.ts) holds the ruled words; the RUNNER (src/ui/lessons.ts) shows rows in the
// table's order over a stand-in battle screen, holds the Activation back while a row waits, asks for an unarmed Activation,
// points at the reach hex nearest the civilians, shows a row once, names no battle and sends no command; and the play input
// begins an Activation with no move chosen when asked. The page half is tools/tutorial-orphanage-first-move.verify.mjs, on
// the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// the table and the runner are the item's own: absent before it, and the probe is red test by test, not at its import
const TABLE = await import('../src/content/lessons.js' as string).catch(() => ({})) as { LESSONS?: Row[]; lessonRevealOf?: (id: string) => string }
const RUNNER = await import('../src/ui/lessons.js' as string).catch(() => ({})) as { createLessons?: (rows: readonly Row[], host: Host) => Lessons }
type Row = { id: string; encounterId: string; starts: string; ends: string; of?: string; words?: string[]; look?: string; point?: { at: string; word?: string }; waits?: true; unarmed?: true }
type Lessons = { open(id: string | null): void; waiting(): boolean; unarmed(unit: number | null): boolean; click(): boolean; still(): void; readonly up: string | null }
type Host = Record<string, (...a: never[]) => unknown>

const ORPHANAGE = 'encounter.opening.orphanage'
const rows = () => (TABLE.LESSONS ?? []).filter((r) => r.encounterId === ORPHANAGE).slice(0, 6)

/** A stand-in battle screen and battle: what the runner calls is kept; the test plays the notice's time and the look's end. */
function stage(seen = new Set<string>()) {
  const calls: string[] = [], told: { words: string[]; onDone: ((why: string) => void) | undefined }[] = [], looks: { unit: number; back: boolean | undefined; onDone: ((why: string) => void) | undefined }[] = []
  const pointers: { target: unknown; word: string | undefined; up: boolean }[] = []
  const battle = { acting: null as number | null, fresh: true, moved: false, reach: [] as number[], hex: { 0: 110, 1: 32, 2: 53, 3: 76 } as Record<number, number> }
  let wakes = 0
  const viewer = {
    tell: (words: string[], o: { onDone?: (why: string) => void } = {}) => { calls.push('tell'); told.push({ words, onDone: o.onDone }); return {} },
    clearTell: () => { calls.push('clearTell'); return true },
    point: (target: unknown, o: { word?: string } = {}) => { const p = { target, word: o.word, up: true }; pointers.push(p); calls.push('point'); return { clear: () => { p.up = false } } },
    look: (target: { unit: number }, o: { back?: boolean; onDone?: (why: string) => void } = {}) => { calls.push('look'); looks.push({ unit: target.unit, back: o.back, onDone: o.onDone }); return {} },
    lookBack: () => { calls.push('lookBack'); return true },
  }
  const host = {
    viewer: () => viewer,
    units: (which: string) => which === 'civilians' ? [1, 2] : which === 'enemy' ? [3] : [0],
    hexOf: (unit: number) => battle.hex[unit]!,
    // a 20-wide board, distance as a plain grid's — the runner only compares what it is given
    distance: (a: number, b: number) => Math.abs(a % 20 - b % 20) + Math.abs(Math.floor(a / 20) - Math.floor(b / 20)),
    acting: () => battle.acting, fresh: () => battle.fresh, moved: () => battle.moved,
    basicMove: () => battle.acting === null ? null : 'move.walk',
    turn: () => 1, attacked: () => false, attackInReach: () => null, acted: () => ({ done: 0, left: 0 }), provoker: () => null, isPlayers: () => true,
    reach: () => battle.reach,
    seen: (id: string) => seen.has(id), mark: (id: string) => { seen.add(id) },
    wake: () => { wakes++; lessons.still() },
  }
  const lessons = RUNNER.createLessons!(TABLE.LESSONS!, host as unknown as Host)
  return { lessons, calls, told, looks, pointers, battle, seen, wakes: () => wakes, up: () => pointers.filter((p) => p.up) }
}

describe('kingdom.tutorial-orphanage-first-move — the Orphanage\'s first lesson', () => {
  it('the lesson table holds the ruled words, each row its target, what starts it and what ends it', () => {
    expect(Array.isArray(TABLE.LESSONS), 'src/content/lessons.ts LESSONS').toBe(true)
    const [protect, civilians, zombie, hero, two, move] = rows()
    expect(rows().map((r) => r.id)).toEqual(['lesson.orphanage.protect', 'lesson.orphanage.civilians', 'lesson.orphanage.zombie', 'lesson.orphanage.hero', 'lesson.orphanage.two-actions', 'lesson.orphanage.move'])
    expect(protect!.words).toEqual(['Use your hero to protect the civilians.'])
    expect([civilians!.point, civilians!.look]).toEqual([{ at: 'civilians', word: 'Civilians' }, 'civilians'])
    expect([zombie!.point, zombie!.look]).toEqual([{ at: 'enemy', word: 'Zombie' }, 'enemy'])
    expect([hero!.point, hero!.look]).toEqual([{ at: 'hero', word: 'Your Hero' }, 'hero'])
    expect(two!.words).toEqual(['Each of your units receives two actions per turn: a move and a primary action.', 'Perform your move now.'])
    expect(two!.point).toEqual({ at: 'basic-move' })
    expect(move!.words).toEqual(['Move towards the zombie and the civilians.'])
    expect(move!.point).toEqual({ at: 'reach-toward-civilians' })
    // steps 1 to 4 come with the battle and the player cannot act during them; 5 waits for the press, 6 for the move
    for (const r of [protect, civilians, zombie, hero]) { expect(r!.starts).toBe('battle-begins'); expect(r!.waits).toBe(true) }
    expect([protect!.ends, civilians!.ends, zombie!.ends, hero!.ends]).toEqual(['time', 'look', 'look', 'look'])
    expect([two!.starts, two!.ends, two!.unarmed, two!.waits]).toEqual(['activation-begins', 'move-chosen', true, undefined])
    expect([move!.starts, move!.ends, move!.unarmed]).toEqual(['move-chosen', 'moved', undefined])
    // a row names what it points at by what it is, never by a hex or a unit id
    for (const r of TABLE.LESSONS!) expect(JSON.stringify(r), r.id).not.toMatch(/"(hex|unit|col|row)":\s*\d/)
    expect(TABLE.lessonRevealOf!('lesson.orphanage.protect')).toBe('reveal.lesson.orphanage.protect')
  })

  it('the runner shows the rows in the table\'s order: the gold line, the civilians, the Zombie, the hero — and holds the Activation back until the fourth is over', () => {
    expect(typeof RUNNER.createLessons, 'src/ui/lessons.ts createLessons').toBe('function')
    const s = stage(), L = s.lessons
    L.open(ORPHANAGE)
    expect(L.waiting(), 'the battle\'s opening rows are to come: no Activation begins').toBe(true)
    L.still()
    expect(L.up).toBe('lesson.orphanage.protect'); expect(s.told.at(-1)!.words).toEqual(['Use your hero to protect the civilians.']); expect(s.up()).toEqual([])
    L.still(); expect(s.told.length, 'a row that is up is not shown twice').toBe(1)
    s.told.at(-1)!.onDone!('time')                                       // the notice's time is over
    expect(L.up).toBe('lesson.orphanage.civilians'); expect(s.wakes()).toBe(1)
    expect(s.looks.at(-1)).toMatchObject({ unit: 1, back: false }); expect(s.up().map((p) => [p.target, p.word])).toEqual([[{ unit: 1 }, 'Civilians'], [{ unit: 2 }, undefined]])
    expect(L.waiting()).toBe(true)
    s.looks.at(-1)!.onDone!('held')
    expect(L.up).toBe('lesson.orphanage.zombie'); expect(s.looks.at(-1)!.unit).toBe(3); expect(s.up().map((p) => [p.target, p.word])).toEqual([[{ unit: 3 }, 'Zombie']])
    // a click moves on instead of waiting the look out
    expect(L.click()).toBe(true)
    expect(L.up).toBe('lesson.orphanage.hero'); expect(s.looks.at(-1)!.unit).toBe(0); expect(s.up().map((p) => [p.target, p.word])).toEqual([[{ unit: 0 }, 'Your Hero']])
    s.looks.at(-2)!.onDone!('replaced')                                  // the look that was cut short says so: nothing moves
    expect(L.up).toBe('lesson.orphanage.hero'); expect(L.waiting()).toBe(true)
    expect(s.calls).not.toContain('lookBack')
    s.looks.at(-1)!.onDone!('held')
    expect(L.up).toBe(null); expect(s.up()).toEqual([]); expect(s.calls.at(-1), 'the view is sent back once the opening rows are over').toBe('lookBack')
    expect(L.waiting(), 'and only then may the Activation begin').toBe(false)
    expect(L.click(), 'a click is the player\'s again').toBe(false)
  })

  it('the hero\'s Activation is asked for with no move chosen; the arrow stays on the basic move until it is chosen, then on the reach hex nearest the civilians until the hero has moved', () => {
    const s = stage(new Set(['lesson.orphanage.protect', 'lesson.orphanage.civilians', 'lesson.orphanage.zombie', 'lesson.orphanage.hero'])), L = s.lessons
    L.open(ORPHANAGE)
    expect(L.waiting()).toBe(false)
    expect(L.unarmed(0), 'the hero\'s Activation begins with no move chosen').toBe(true)
    expect(L.unarmed(1), 'a civilian\'s does not').toBe(false); expect(L.unarmed(null)).toBe(false)
    s.battle.acting = 0; L.still()
    expect(L.up).toBe('lesson.orphanage.two-actions'); expect(s.told.at(-1)!.words).toEqual(['Each of your units receives two actions per turn: a move and a primary action.', 'Perform your move now.'])
    expect(s.up().map((p) => p.target)).toEqual([{ action: 'move.walk' }])
    s.told.at(-1)!.onDone!('time'); L.still()
    expect(L.up, 'the words go after their time; the arrow that asks for the press stays').toBe('lesson.orphanage.two-actions'); expect(s.up().length).toBe(1)
    // the press: a move is chosen — the blue grid is the engine's reach
    s.battle.reach = [90, 91, 71, 72, 52, 111]; L.still()
    expect(L.up).toBe('lesson.orphanage.move'); expect(s.told.at(-1)!.words).toEqual(['Move towards the zombie and the civilians.'])
    // civilians on hexes 32 and 53: of the reach, hex 52 is nearest both (the least total distance)
    const total = (h: number) => [32, 53].reduce((n, c) => n + Math.abs(h % 20 - c % 20) + Math.abs(Math.floor(h / 20) - Math.floor(c / 20)), 0)
    expect(Math.min(...s.battle.reach.map(total))).toBe(total(52))
    expect(s.up().map((p) => p.target)).toEqual([{ hex: 52 }])
    L.still(); expect(s.up().length).toBe(1)
    s.battle.moved = true; s.battle.fresh = false; s.battle.reach = []; L.still()
    expect(L.up, 'the hero has moved: everything of the lesson goes').toBe(null); expect(s.up()).toEqual([]); expect(s.calls.at(-1)).toBe('clearTell')
    expect(L.unarmed(0), 'the next Activation is armed as in any battle').toBe(false)
    L.still(); expect(s.told.length).toBe(2)
  })

  it('a row shows once in a run: a battle whose rows are all marked shows none, holds nothing back and arms the move', () => {
    const s = stage(), L = s.lessons
    L.open(ORPHANAGE); L.still(); expect([...s.seen]).toEqual(['lesson.orphanage.protect'])       // marked the moment it goes up
    const all = new Set(rows().map((r) => r.id)), again = stage(all)
    again.lessons.open(ORPHANAGE)
    expect(again.lessons.waiting()).toBe(false); expect(again.lessons.unarmed(0)).toBe(false)
    again.lessons.still(); again.battle.acting = 0; again.lessons.still(); again.battle.reach = [90]; again.lessons.still()
    expect(again.calls).toEqual([]); expect(again.lessons.up).toBe(null)
    // another battle's board, and a battle outside a run, show nothing
    const other = stage(); other.lessons.open('encounter.opening.lumberjack'); other.lessons.still(); expect(other.lessons.waiting()).toBe(false); expect(other.calls).toEqual([])
    const none = stage(); none.lessons.open(null); none.lessons.still(); expect(none.lessons.waiting()).toBe(false); expect(none.calls).toEqual([])
  })

  it('the runner names no battle and sends no command; the play input begins an Activation with no move chosen only when asked', () => {
    const strip = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    const runner = strip('src/ui/lessons.ts')
    expect(runner, 'no battle, unit or enemy is named in the runner').not.toMatch(/encounter\.|orphanage|zombie|lumberjack|unit\.[a-z]/i)
    expect(runner, 'it sends no command').not.toMatch(/commandSandbox|select-activation|end-cycle|kind:\s*'action'|runPlay/)
    expect(runner).not.toMatch(/Math\.random|Date\.now/)
    const input = strip('src/ui/play-input.ts')
    expect(input, 'next() takes the lesson\'s ask').toMatch(/unarmed/)
    const page = strip('src/ui/sandbox.ts')
    expect(page).toMatch(/lessons\.waiting\(\)/); expect(page).toMatch(/lessons\.unarmed\(/); expect(page).toMatch(/lessonRevealOf/)
  })

  it('the page: on the built BATTLE-SANDBOX.html a new run\'s Orphanage walks the lesson step by step; a replayed battle shows none of it', () => {
    const out = execFileSync(process.execPath, ['tools/tutorial-orphanage-first-move.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/tutorial-orphanage-first-move: .*passed/)
  }, 240000)
})
