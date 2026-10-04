// kingdom.tutorial-orphanage-enemy-turn — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's
// class line, no map before battle 1, the Orphanage's lessons, …'): "In this tutorial at some point, we need to say, \"Click on
// enemies to learn more about them.\" At some point we need to explain attacks when you're in range." / "The first time we have
// an enemy turn, we need to point at the enemy and pop up a golden notification that says, \"This is the enemy movement and this
// is their most common attack value.\" There are two arrows pointing at the two base enemy numbers. … It points to the right and
// says you can see all the details about this enemy on the right." / "At the end of the first enemy turn, we should describe the
// phases. At the end of the enemy phase, reinforcements and battle changes can occur. That notification should pop up before
// we start showing the extra zombie added."
//
// Expect: "In a new run's Orphanage: the first time the Zombie is in reach, an attack notice shows and an arrow stays on the
// attack's slot until the hero attacks; as the first Enemy Phase begins the view is on the Zombie with the two-numbers line, an
// arrow on each number, and 'Click on enemies to learn more about them.'; the first click on an enemy shows the panel line with
// an arrow at the right-hand panel; after the Enemy Phase the phases notice shows, and only after it has gone does the Turn 2
// Zombie drop in. A page test asserts each notice's words, the two pointers' targets, that the Zombie does not act while (b)
// is up, that the arrival's drop-in comes after (d) has gone, and that a replayed battle shows none of them."
//
// Here: the four rows in the lesson table, and the runner showing each at its moment over a stand-in battle screen
// (test/lesson-stage.ts). The page half is tools/tutorial-orphanage-enemy-turn.verify.mjs, on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { LESSONS } from '../src/content/lessons.js'
import { lessonStage } from './lesson-stage.js'

const ORPHANAGE = 'encounter.opening.orphanage'
const row = (id: string) => LESSONS.find((r) => r.id === id) as unknown as Record<string, unknown> | undefined
const ATTACK = 'lesson.orphanage.attack', NUMBERS = 'lesson.orphanage.enemy-numbers', PANEL = 'lesson.orphanage.enemy-panel', PHASES = 'lesson.orphanage.phases'

describe('kingdom.tutorial-orphanage-enemy-turn — attacks in reach, the enemy\'s two numbers, the panel, the phases', () => {
  it('the four rows are in the lesson table: their words, their targets, what starts and ends each', () => {
    expect(row(ATTACK), ATTACK).toBeDefined(); expect(row(NUMBERS), NUMBERS).toBeDefined(); expect(row(PANEL), PANEL).toBeDefined(); expect(row(PHASES), PHASES).toBeDefined()
    expect(row(ATTACK)).toMatchObject({ encounterId: ORPHANAGE, starts: 'attack-in-reach', ends: 'attacked', of: 'hero', point: { at: 'attack-slot' },
      words: ['An enemy is in range.', 'Choose an attack, then click the enemy to see your chance to hit and the damage.', 'Click it again to attack.'] })
    expect(row(NUMBERS)).toMatchObject({ encounterId: ORPHANAGE, starts: 'event', event: { type: 'phase.begin', phase: 'enemy' }, ends: 'time', holds: true, look: 'enemy',
      point: [{ at: 'enemy-move-number' }, { at: 'enemy-attack-number' }],
      words: ['This is the enemy movement and this is their most common attack value.', 'Click on enemies to learn more about them.'] })
    expect(row(PANEL)).toMatchObject({ encounterId: ORPHANAGE, starts: 'enemy-clicked', ends: 'time', point: { at: 'panel' }, words: ['You can see all the details about this enemy on the right.'] })
    expect(row(PHASES)).toMatchObject({ encounterId: ORPHANAGE, starts: 'event', event: { type: 'turn.end' }, ends: 'time', holds: true })
    expect((row(PHASES)!['words'] as string[])[1]).toBe('At the end of the enemy phase, reinforcements and battle changes can occur.')
    expect((row(PHASES)!['words'] as string[])[0]).toMatch(/Hero Phase.*Enemy Phase/)
    // every gold notice is one to three lines (the battle screen's own limit)
    for (const r of LESSONS) if (r.words) { expect(r.words.length, r.id).toBeGreaterThanOrEqual(1); expect(r.words.length, r.id).toBeLessThanOrEqual(3) }
  })

  it('(a) the first time an enemy is in reach of the hero\'s attack: the notice, and an arrow on that attack\'s slot until the hero has attacked', () => {
    const s = lessonStage().upTo(ATTACK), L = s.lessons
    L.open(ORPHANAGE); s.battle.acting = 0; s.battle.fresh = false; s.battle.moved = true
    L.still(); expect(L.up, 'no enemy in reach: nothing').toBe(null)
    s.battle.attackInReach = 'attack.sword.slash'; L.still()
    expect(L.up).toBe(ATTACK); expect(s.told.at(-1)!.words[0]).toBe('An enemy is in range.'); expect(s.told.at(-1)!.hold).toBe(false)
    expect(s.up().map((p) => p.target)).toEqual([{ action: 'attack.sword.slash' }])
    s.told.at(-1)!.onDone!('time'); L.still()
    expect(L.up, 'the words go; the arrow stays until the attack is made').toBe(ATTACK); expect(s.up().length).toBe(1)
    s.battle.attacked = true; L.still()
    expect(L.up).toBe(null); expect(s.up()).toEqual([])
    // a civilian's Activation with an enemy in reach is not the hero's: the row is for the hero
    const c = lessonStage().upTo(ATTACK); c.seen.add('lesson.orphanage.civilians-yours'); c.lessons.open(ORPHANAGE); c.battle.acting = 1; c.battle.fresh = false; c.battle.attackInReach = 'attack.dagger.stab'; c.lessons.still()
    expect(c.lessons.up).toBe(null)
  })

  it('(b) as the first Enemy Phase begins: the view on the enemy, an arrow on each of its two numbers, the two lines — and the battle\'s playback waits under them', () => {
    const s = lessonStage().upTo(NUMBERS), L = s.lessons
    L.open(ORPHANAGE)
    L.played({ type: 'phase.begin', phase: 'hero' }); L.played({ type: 'activation.begin', phase: 'enemy' }); expect(L.up, 'not the Hero Phase, not another line').toBe(null)
    L.played({ type: 'phase.begin', phase: 'enemy' })
    expect(L.up).toBe(NUMBERS)
    expect(s.told.at(-1)).toMatchObject({ hold: true, words: ['This is the enemy movement and this is their most common attack value.', 'Click on enemies to learn more about them.'] })
    expect(s.looks.at(-1)!.unit).toBe(3)
    expect(s.up().map((p) => p.target)).toEqual([{ unit: 3, part: 'move' }, { unit: 3, part: 'attack' }])
    s.looks.at(-1)!.onDone!('held'); expect(L.up, 'the look held: the notice still has its time').toBe(NUMBERS)
    s.told.at(-1)!.onDone!('time')
    expect(L.up).toBe(null); expect(s.up()).toEqual([]); expect(s.calls.at(-1), 'the view goes back').toBe('lookBack')
    L.played({ type: 'phase.begin', phase: 'enemy' }); expect(L.up, 'the next Enemy Phase: not again').toBe(null)
  })

  it('(c) the first click on an enemy: the panel line, an arrow at the right-hand panel; (d) the first Turn\'s end: the phases, held before the next Turn is shown', () => {
    const s = lessonStage().upTo(PANEL), L = s.lessons
    L.open(ORPHANAGE); s.battle.acting = 0; s.battle.fresh = false
    L.still(); expect(L.up).toBe(null)
    L.happened('enemy-clicked'); L.still()
    expect(L.up).toBe(PANEL); expect(s.told.at(-1)!.words).toEqual(['You can see all the details about this enemy on the right.']); expect(s.up().map((p) => p.target)).toEqual([{ ui: 'panel' }])
    s.told.at(-1)!.onDone!('time'); expect(L.up).toBe(null); expect(s.up()).toEqual([])
    L.happened('enemy-clicked'); L.still(); expect(L.up, 'once').toBe(null)
    L.played({ type: 'turn.end', phase: 'enemy' })
    expect(L.up).toBe(PHASES); expect(s.told.at(-1)!.hold, 'the next Turn\'s arrival waits under it').toBe(true)
    expect(s.told.at(-1)!.words).toEqual(['Each turn has a Hero Phase, when your units act, and an Enemy Phase, when the enemies act.', 'At the end of the enemy phase, reinforcements and battle changes can occur.'])
    s.told.at(-1)!.onDone!('click'); expect(L.up, 'a click on the words ends them sooner').toBe(null)
    L.played({ type: 'turn.end', phase: 'enemy' }); expect(L.up).toBe(null)
  })

  it('none of them in another battle, outside a run, or once shown', () => {
    const other = lessonStage(); other.lessons.open('encounter.opening.lumberjack'); other.battle.acting = 0; other.battle.attackInReach = 'attack.x'
    other.lessons.played({ type: 'phase.begin', phase: 'enemy' }); other.lessons.happened('enemy-clicked'); other.lessons.played({ type: 'turn.end' }); other.lessons.still()
    expect(other.calls).toEqual([])
    const free = lessonStage(); free.lessons.open(ORPHANAGE, false); free.lessons.played({ type: 'phase.begin', phase: 'enemy' }); free.lessons.still(); expect(free.calls).toEqual([]); expect(free.lessons.waiting()).toBe(false)
    const again = lessonStage(new Set(LESSONS.map((r) => r.id))); again.lessons.open(ORPHANAGE); again.battle.acting = 0; again.battle.attackInReach = 'attack.x'
    again.lessons.played({ type: 'phase.begin', phase: 'enemy' }); again.lessons.happened('enemy-clicked'); again.lessons.played({ type: 'turn.end' }); again.lessons.still()
    expect(again.calls).toEqual([])
  })

  it('the page: on the built BATTLE-SANDBOX.html the four lessons show at their moments in a new run\'s Orphanage; a replayed battle shows none', () => {
    const out = execFileSync(process.execPath, ['tools/tutorial-orphanage-enemy-turn.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/tutorial-orphanage-enemy-turn: .*passed/)
  }, 300000)
})
