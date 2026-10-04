// The opening's lessons — rows. kingdom.tutorial-orphanage-first-move (2026-10-04; engine DECISIONS.md 2026-10-04 'the opening's
// tutorial: the first hero's class line, no map before battle 1, the Orphanage's lessons, the camera shows what arrives, new
// enemies are named, a closer start'). Andrew: "The first thing when you go into this first battle is that there should be a
// notification message across the center that is gold and easy to see: \"Use your hero to protect the civilians.\" The camera
// zooms onto the civilians, and an arrow points at them and says \"Civilians.\" It then zooms to the zombie on the map, points
// at it, and says \"Zombie.\" It then zooms back to your hero and says \"Your Hero,\" and your hero is activated. We need an
// explanation: each of your units receives two actions per turn: a move and a primary action. \"Perform your move now.\" And
// we're going to point an arrow over at the move button. The standard move. After they press it we're going to put a
// message up that says, \"Move towards the zombie and the civilians,\" and points at a square. And then after they move, that
// goes away." / "the gold message doesn't stay up. It only lasts for a time."
//
// A lesson is a ROW: the step, its words, what it points at, what starts it, what ends it. One small runner (src/ui/lessons.ts)
// shows the rows of the battle on the screen and names no battle, no unit and no hex — so a later lesson is a row here, not
// code. A row names what it points at by what the thing IS in the battle (the civilians, the first enemy, the basic move's
// slot, the reachable hex nearest the civilians), never by a hex or a unit id, so it stays right when placements move.
// Which rows a run has shown is the run's memory: a reveal per row (core/reveal.ts, `campaign.revealed`, saved with the
// run — with the met enemies of content/reveals.ts), so a battle replayed after a loss, or continued from a save, shows
// none of them again. "Lesson", "notice", "pointer" and "look" are working words of the items, not Glossary names
// (kingdom SWITCHES.md lessonWords).

/** What a lesson's pointer or look goes to, said as what it is in the battle. */
export type LessonTarget =
  /** the units the encounter placed on the player's side — every one of them (a look goes to the first; they stand together) */
  | 'civilians'
  /** the first enemy standing on the board */
  | 'enemy'
  /** the party's first hero */
  | 'hero'
  /** the acting unit's basic move, on the action bar */
  | 'basic-move'
  /** of the hexes the acting unit's chosen move can reach now, the nearest to the civilians (then to the enemy) */
  | 'reach-toward-civilians'
  /** the unit now acting */
  | 'acting'
  /** on the action bar, the first of the acting unit's attacks the engine would take against an enemy now */
  | 'attack-slot'
  /** the two numbers under the first enemy: its movement, and the damage of its first attack */
  | 'enemy-move-number' | 'enemy-attack-number'
  /** the right-hand panel · the End Turn button */
  | 'panel' | 'end-turn'

/** What starts a row: the battle put on the screen (before anyone acts) · a unit's Activation begun · its move chosen on the bar ·
    an enemy in reach of one of the acting unit's attacks · a line of the battle's log just played (`event`) · the player
    clicked an enemy · a unit's Activation ended because its primary action resolved · some of the player's units have acted
    this Hero Phase and some have not. */
export type LessonStart = 'battle-begins' | 'activation-begins' | 'move-chosen' | 'attack-in-reach' | 'event' | 'enemy-clicked' | 'primary-ended' | 'some-acted'
/** What ends a row: its notice's time · its look, held · the acting unit's move chosen on the bar · the acting unit moved · the
    acting unit used its primary action. */
export type LessonEnd = 'time' | 'look' | 'move-chosen' | 'moved' | 'attacked'
/** An arrow, and the word it carries. */
export interface LessonPointer { readonly at: LessonTarget; readonly word?: string }

export interface LessonRow {
  /** `lesson.<battle>.<step>` — its reveal is `reveal.<id>` */
  readonly id: string
  /** the battle it is taught in: the encounter's id; absent — whichever battle of the run it first happens in */
  readonly encounterId?: string
  readonly starts: LessonStart
  readonly ends: LessonEnd
  /** whose Activation a row that waits on one is for: a hero of the party, or one of the encounter's civilians */
  readonly of?: 'hero' | 'civilians'
  /** the line of the battle's log a row that `starts` on an event waits for: its type, and its phase when the row names one */
  readonly event?: { readonly type: string; readonly phase?: string }
  /** not before this Turn */
  readonly fromTurn?: number
  /** the gold notice across the board's centre, one to three lines; it lasts for a time and goes by itself */
  readonly words?: readonly string[]
  /** where the view goes while the row is up */
  readonly look?: LessonTarget
  /** the arrow (or arrows), and the word it carries; an arrow that asks for an action stays until the action is done */
  readonly point?: LessonPointer | readonly LessonPointer[]
  /** while it is up the player cannot act, and a click moves on to the next row instead of waiting it out */
  readonly waits?: true
  /** the battle's playback waits under the notice, for its time: nothing is played on while the words are up */
  readonly holds?: true
  /** the Activation this row begins with has NO move chosen: the press on the bar is a real act (kingdom SWITCHES lessonMoveNotArmed) */
  readonly unarmed?: true
}

const ORPHANAGE = 'encounter.opening.orphanage'

export const LESSONS: readonly LessonRow[] = [
  // ── kingdom.tutorial-orphanage-first-move: battle 1's first lesson, steps 1 to 6 (7 is the end of 6: everything goes) ──
  { id: 'lesson.orphanage.protect', encounterId: ORPHANAGE, starts: 'battle-begins', ends: 'time', waits: true,
    words: ['Use your hero to protect the civilians.'] },
  { id: 'lesson.orphanage.civilians', encounterId: ORPHANAGE, starts: 'battle-begins', ends: 'look', waits: true,
    look: 'civilians', point: { at: 'civilians', word: 'Civilians' } },
  { id: 'lesson.orphanage.zombie', encounterId: ORPHANAGE, starts: 'battle-begins', ends: 'look', waits: true,
    look: 'enemy', point: { at: 'enemy', word: 'Zombie' } },
  { id: 'lesson.orphanage.hero', encounterId: ORPHANAGE, starts: 'battle-begins', ends: 'look', waits: true,
    look: 'hero', point: { at: 'hero', word: 'Your Hero' } },
  { id: 'lesson.orphanage.two-actions', encounterId: ORPHANAGE, starts: 'activation-begins', ends: 'move-chosen', of: 'hero', unarmed: true,
    words: ['Each of your units receives two actions per turn: a move and a primary action.', 'Perform your move now.'],
    point: { at: 'basic-move' } },
  { id: 'lesson.orphanage.move', encounterId: ORPHANAGE, starts: 'move-chosen', ends: 'moved', of: 'hero',
    words: ['Move towards the zombie and the civilians.'], point: { at: 'reach-toward-civilians' } },

  // ── kingdom.tutorial-orphanage-enemy-turn (2026-10-04; the same entry): "In this tutorial at some point, we need to say, \"Click on
  //    enemies to learn more about them.\" At some point we need to explain attacks when you're in range." / "The first time we have
  //    an enemy turn, we need to point at the enemy and pop up a golden notification that says, \"This is the enemy movement and this
  //    is their most common attack value.\" There are two arrows pointing at the two base enemy numbers. … It points to the right
  //    and says you can see all the details about this enemy on the right." / "At the end of the first enemy turn, we should
  //    describe the phases. At the end of the enemy phase, reinforcements and battle changes can occur. That notification should
  //    pop up before we start showing the extra zombie added." ──
  // (a) the first time an enemy is in reach of one of the hero's attacks, from where he stands or from the end of the path planned
  { id: 'lesson.orphanage.attack', encounterId: ORPHANAGE, starts: 'attack-in-reach', ends: 'attacked', of: 'hero',
    words: ['An enemy is in range.', 'Choose an attack, then click the enemy to see your chance to hit and the damage.', 'Click it again to attack.'],
    point: { at: 'attack-slot' } },
  // (b) as the first Enemy Phase begins, before the Zombie acts: the battle waits for the notice's time
  { id: 'lesson.orphanage.enemy-numbers', encounterId: ORPHANAGE, starts: 'event', event: { type: 'phase.begin', phase: 'enemy' }, ends: 'time', holds: true,
    words: ['This is the enemy movement and this is their most common attack value.', 'Click on enemies to learn more about them.'],
    look: 'enemy', point: [{ at: 'enemy-move-number' }, { at: 'enemy-attack-number' }] },
  // (c) the first time the player clicks an enemy
  { id: 'lesson.orphanage.enemy-panel', encounterId: ORPHANAGE, starts: 'enemy-clicked', ends: 'time',
    words: ['You can see all the details about this enemy on the right.'], point: { at: 'panel' } },
  // (d) when the first Enemy Phase has ended, before the Turn 2 Zombie is shown: the battle waits for the notice's time
  { id: 'lesson.orphanage.phases', encounterId: ORPHANAGE, starts: 'event', event: { type: 'turn.end' }, ends: 'time', holds: true,
    words: ['Each turn has a Hero Phase, when your units act, and an Enemy Phase, when the enemies act.', 'At the end of the enemy phase, reinforcements and battle changes can occur.'] },

]

/** The reveal that says a lesson's row has been shown in this run. */
export const lessonRevealOf = (id: string): string => 'reveal.' + id
