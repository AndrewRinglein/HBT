// The lessons' runner — kingdom.tutorial-orphanage-first-move (2026-10-04; engine DECISIONS.md 2026-10-04 'the opening's
// tutorial: …, the Orphanage's lessons, …'). It shows the rows of content/lessons.ts over the battle on the screen with
// the battle screen's own three calls (viewer.tutorial-overlays: the gold notice `tell`, the arrow `point`, the camera's
// `look`), in the table's order. It names no battle, no unit and no hex: which battle is on the screen, who stands
// where, what the acting unit can reach and whether a row has been shown are the host's answers (ui/sandbox.ts), every
// one of them the engine's or the run's.
//
// The runner DRAWS and never sends a command: it asks the host to hold back the next Activation while a row that waits is
// up (the host begins it, with the same command, when the runner lets go), a notice that makes the battle wait holds the
// board's own playback for its time, and nothing else — the battle's own record is the same with it and without it. A
// row is marked shown the moment it goes up (the host writes the reveal and saves the run), so a battle replayed after a
// loss, or continued from a save, shows it never again.
//
// What starts a row is one of a few plain moments, each the host's to report: the battle put on the screen; a unit's
// Activation begun; something true of the board when it is still (a move chosen, an enemy in reach, some units acted);
// something the player did (`happened`); a line of the battle's log just played (`played`). Later lessons are rows.
import { lessonKeyOf, type LessonRow, type LessonTarget, type LessonPointer } from '../content/lessons.js'

type Aim = { unit: number; part?: string } | { hex: number } | { action: string } | { ui: string } | { card: number }
/** The battle screen's lesson calls (viewer src/overlays.js, on the mounted viewer). */
export type LessonViewer = {
  tell(words: string[], o?: { hold?: boolean; onDone?: (why: string) => void }): unknown
  clearTell(): unknown
  point(target: Aim, o?: { word?: string }): { clear(): unknown }
  look(target: { unit: number }, o?: { back?: boolean; onDone?: (why: string) => void }): unknown
  lookBack(o?: { onDone?: (why: string) => void }): unknown
}
/** What the runner asks its host. Unit ids and hexes are the engine's; nothing here is worked out by the host but which is which. */
export type LessonHost = {
  viewer(): LessonViewer | null
  /** the standing units a target names now, lowest id first: the encounter's own player-side units, the enemies, the party's heroes */
  units(which: 'civilians' | 'enemy' | 'hero'): number[]
  hexOf(unit: number): number
  /** the engine's distance between two hexes */
  distance(a: number, b: number): number
  /** the battle's Turn */
  turn(): number
  /** the player's unit now acting, or null */
  acting(): number | null
  /** it has done nothing since its Activation began */
  fresh(): boolean
  /** it has moved in this Activation */
  moved(): boolean
  /** it has used its primary action */
  attacked(): boolean
  /** its basic move's action id (the slot on the bar), or null */
  basicMove(): string | null
  /** the hexes its chosen move can reach now — the blue grid; empty while no move is chosen */
  reach(): number[]
  /** the first of its attacks the engine would take against an enemy now — from where it stands or from the end of the path planned — or null */
  attackInReach(): string | null
  /** this Hero Phase: how many of the player's units have acted, how many have yet to */
  acted(): { done: number; left: number }
  /** the enemy that would strike the acting unit on the path it has planned (the engine's forecast of the walk), or null */
  provoker(): number | null
  /** is this unit the player's — a hero of the party or one of the encounter's civilians */
  isPlayers(unit: number): boolean
  seen(rowId: string): boolean
  mark(rowId: string): void
  /** the runner let something go: look again (begin the Activation it held, draw the facts) */
  wake(): void
}
type Up = { row: LessonRow; pointers: { clear(): unknown }[]; token: number; actor: number | null; from: number | null; gone: boolean; telling: boolean; asked: boolean }

export function createLessons(rows: readonly LessonRow[], host: LessonHost) {
  let battle: string | null = null, open = false
  /** an Activation has begun in this battle: the rows that start with the battle are over */
  let begun = false
  let ups: Up[] = []
  let token = 0
  /** what the player did, waiting for a still board to be answered */
  const did = new Set<string>()

  /* a row of a screen between battles is the page's own to show (ui/sandbox.ts screenLine): it never goes up over a battle */
  const mine = (r: LessonRow) => open && r.starts !== 'screen' && (r.encounterId === undefined || r.encounterId === battle) && !host.seen(lessonKeyOf(r))
  const pending = (starts: LessonRow['starts']) => rows.filter((r) => r.starts === starts && mine(r))
  const fits = (row: LessonRow, actor: number | null) => row.of === undefined || (actor !== null && host.units(row.of).includes(actor))
  const due = (row: LessonRow) => row.fromTurn === undefined || host.turn() >= row.fromTurn
  const pointersOf = (row: LessonRow): readonly LessonPointer[] => row.point === undefined ? [] : Array.isArray(row.point) ? row.point : [row.point as LessonPointer]

  /** what a row's target is on the board now, for the viewer's calls; none when the battle holds no such thing */
  function targets(at: LessonTarget, actor: number | null, struck: number | null = null): Aim[] {
    if (at === 'struck' || at === 'struck-health' || at === 'struck-protection') return struck === null ? [] : [at === 'struck' ? { unit: struck } : { unit: struck, part: at === 'struck-health' ? 'health' : 'protection' }]
    if (at === 'struck-card') return struck === null ? [] : [{ card: struck }]
    if (at === 'provoker') { const unit = host.provoker(); return unit === null ? [] : [{ unit }] }
    if (at === 'civilians') return host.units('civilians').map((unit) => ({ unit }))
    if (at === 'enemy' || at === 'hero') return host.units(at).slice(0, 1).map((unit) => ({ unit }))
    if (at === 'enemy-move-number' || at === 'enemy-attack-number') return host.units('enemy').slice(0, 1).map((unit) => ({ unit, part: at === 'enemy-move-number' ? 'move' : 'attack' }))
    if (at === 'acting') return actor === null ? [] : [{ unit: actor }]
    if (at === 'basic-move') { const action = host.basicMove(); return action === null ? [] : [{ action }] }
    if (at === 'attack-slot') { const action = host.attackInReach(); return action === null ? [] : [{ action }] }
    if (at === 'panel' || at === 'end-turn' || at === 'stamina') return [{ ui: at }]
    /* 'reach-toward-civilians': of the hexes the blue grid draws, the one with the least distance to the civilians (the sum over
       them), then to the nearest enemy, then the lowest hex — the engine's reach and the engine's distance, never a typed hex */
    const civilians = host.units('civilians').map(host.hexOf), enemies = host.units('enemy').map(host.hexOf)
    const far = (h: number) => civilians.reduce((n, c) => n + host.distance(h, c), 0)
    const foe = (h: number) => enemies.length ? Math.min(...enemies.map((e) => host.distance(h, e))) : 0
    const best = [...host.reach()].sort((a, b) => far(a) - far(b) || foe(a) - foe(b) || a - b)[0]
    return best === undefined ? [] : [{ hex: best }]
  }

  function show(row: LessonRow, actor: number | null, struck: number | null = null): void {
    const v = host.viewer(); if (!v) return
    host.mark(lessonKeyOf(row))
    const my = ++token, pointers: { clear(): unknown }[] = []
    const u: Up = { row, pointers, token: my, actor, from: actor === null ? null : host.hexOf(actor), gone: false, telling: false, asked: false }
    ups.push(u)
    const live = () => ups.includes(u)
    const done = () => { if (live()) finish(u) }
    /* the board may drop what the row waits on — a seek (the host's Show current state), a fault: the row is then over the
       next time the board is still, never in the middle of the board's own work (it may be going away) */
    const gone = () => { if (live()) u.gone = true }
    for (const p of pointersOf(row)) for (const [i, t] of targets(p.at, actor, struck).entries()) pointers.push(v.point(t, i === 0 && p.word ? { word: p.word } : {}))
    /* a notice ends by its time, by a click on it, when the next notice takes its place or when it is cleared; one notice stands
       at a time, so the row knows whether the words on the screen are still its own */
    if (row.words) { u.telling = true
      v.tell([...row.words], { ...(row.holds ? { hold: true } : {}), onDone: (why) => { u.telling = false; if (row.ends !== 'time') return; if (why === 'time' || why === 'click' || why === 'replaced' || why === 'cleared') done(); else if (why === 'dropped') gone() } }) }
    const seen = row.look ? targets(row.look, actor, struck)[0] : undefined
    if (seen && 'unit' in seen) v.look({ unit: seen.unit }, { back: false, onDone: (why) => { if (row.ends !== 'look') return; if (why === 'held') done(); else if (why === 'dropped' || why === 'cancelled') gone() } })
    else if (row.ends === 'look') done()
  }

  /** a row that is up goes: its arrows, its notice if it still stands; the view comes back once the looks it was part of are over */
  function finish(u: Up): void {
    if (!ups.includes(u)) return
    ups = ups.filter((x) => x !== u)
    const v = host.viewer()
    for (const p of u.pointers) p.clear()
    if (v && u.telling) v.clearTell()
    if (v && u.row.look && !(u.row.starts === 'battle-begins' && pending('battle-begins').length)) v.lookBack()
    host.wake()
  }

  /** has what the row waits for happened? (a row that waits on an acting unit also goes when that unit is no longer acting) */
  function over(u: Up): boolean {
    if (u.gone) return true
    if (u.row.ends === 'time' || u.row.ends === 'look') return false
    if (u.actor !== null && host.acting() !== u.actor) return true
    if (u.row.starts === 'path-provokes' && host.provoker() === null) return true   // the path was taken back, or walked
    if (u.row.ends === 'move-chosen') return host.reach().length > 0 || host.moved()
    if (u.row.ends === 'moved') return host.moved() || (u.actor !== null && host.hexOf(u.actor) !== u.from)
    if (u.row.ends === 'attacked') return host.attacked()
    return false
  }
  /** a row whose words are still to be read, or that holds the player back: no other row goes up over it */
  const reading = () => ups.some((u) => u.row.waits === true || u.row.holds === true || u.row.ends === 'time' || u.row.ends === 'look')

  /** the row the still board is ready for, in the table's order */
  function next(): { row: LessonRow; actor: number | null } | null {
    const actor = host.acting()
    if (!begun && actor === null) { const row = pending('battle-begins')[0]; return row ? { row, actor: null } : null }
    if (actor !== null) begun = true
    for (const row of rows) {
      if (!mine(row) || !due(row) || !fits(row, actor) || ups.some((u) => u.row === row)) continue
      if (row.starts === 'activation-begins') { if (actor !== null && host.fresh()) return { row, actor } }
      else if (row.starts === 'move-chosen') { if (actor !== null && host.reach().length > 0 && !host.moved()) return { row, actor } }
      else if (row.starts === 'attack-in-reach') { if (actor !== null && !host.attacked() && host.attackInReach() !== null) return { row, actor } }
      else if (row.starts === 'path-provokes') { if (actor !== null && host.provoker() !== null) return { row, actor } }
      else if (row.starts === 'some-acted') { const a = host.acted(); if (a.done > 0 && a.left > 0) return { row, actor: null } }
      else if (row.starts !== 'battle-begins' && row.starts !== 'event' && did.has(row.starts)) { did.delete(row.starts); return { row, actor: null } }
    }
    return null
  }

  return {
    /** a battle is put on the screen: the encounter whose rows may show; `inRun` false — a battle outside a run has no memory, and shows none */
    open(encounterId: string | null, inRun = encounterId !== null): void { ups = []; token++; did.clear(); battle = encounterId; open = inRun; begun = false },
    /** while true the host begins no Activation and takes no order: a row that waits is up, or is about to be */
    waiting(): boolean { return ups.some((u) => u.row.waits === true) || (!begun && pending('battle-begins').length > 0) },
    /** the Activation about to begin for this unit begins with no move chosen */
    unarmed(unit: number | null): boolean { return unit !== null && pending('activation-begins').some((r) => r.unarmed === true && due(r) && fits(r, unit)) },
    /** a click while a row that waits is up moves on to the next row */
    click(): boolean { const u = ups.find((x) => x.row.waits === true); if (!u) return false; finish(u); return true },
    /** the player did something a row may start on (the host's word for it: a row's `starts`) */
    happened(what: string): void { if (rows.some((r) => r.starts === what && mine(r))) did.add(what) },
    /** a line of the battle's log has just been played on the board: a row that starts on it goes up now, and may hold the playback */
    played(e: { type: string; phase?: string | undefined; target?: number | null | undefined } | null): void {
      if (!e || !host.viewer()) return
      const struck = typeof e.target === 'number' ? e.target : null
      const row = pending('event').find((r) => r.event !== undefined && r.event.type === e.type && (r.event.phase === undefined || r.event.phase === e.phase)
        && (r.event.of === undefined || (struck !== null && host.isPlayers(struck))) && due(r))
      if (row) show(row, null, struck)
    },
    /** the player confirmed a walk a row warns of: true — it is held this once (the path stays shown; the next click walks) */
    holdsBack(): boolean { const u = ups.find((x) => x.row.asks === true && !x.asked); if (!u) return false; u.asked = true; return true },
    /** the host calls it whenever the board is still: rows that are up may be over; the next row may begin */
    still(): void {
      if (!open || !host.viewer()) return
      const ended = ups.find(over)
      if (ended) { finish(ended); return }
      if (reading()) return
      const n = next(); if (n) show(n.row, n.actor)
    },
    /** the rows that are up, for the page tests: the first, and all */
    get up(): string | null { return ups[0]?.row.id ?? null },
    get all(): string[] { return ups.map((u) => u.row.id) },
  }
}
export type Lessons = ReturnType<typeof createLessons>
