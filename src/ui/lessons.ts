// The lessons' runner — kingdom.tutorial-orphanage-first-move (2026-10-04; engine DECISIONS.md 2026-10-04 'the opening's
// tutorial: …, the Orphanage's lessons, …'). It shows the rows of content/lessons.ts over the battle on the screen with
// the battle screen's own three calls (viewer.tutorial-overlays: the gold notice `tell`, the arrow `point`, the camera's
// `look`), one row at a time, in the table's order. It names no battle, no unit and no hex: which battle is on the
// screen, who stands where, what the acting unit can reach and whether a row has been shown are the host's answers
// (ui/sandbox.ts), every one of them the engine's or the run's.
//
// The runner DRAWS and never sends a command: it asks the host to hold back the next Activation while a row that waits is
// up (the host begins it, with the same command, when the runner lets go), and nothing else — the battle's own record is
// the same with it and without it. A row is marked shown the moment it goes up (the host writes the reveal and saves the
// run), so a battle replayed after a loss, or continued from a save, shows it never again.
import type { LessonRow, LessonTarget } from '../content/lessons.js'

/** The battle screen's lesson calls (viewer src/overlays.js, on the mounted viewer). */
export type LessonViewer = {
  tell(words: string[], o?: { onDone?: (why: string) => void }): unknown
  clearTell(): unknown
  point(target: { unit: number } | { hex: number } | { action: string }, o?: { word?: string }): { clear(): unknown }
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
  /** the player's unit now acting, or null */
  acting(): number | null
  /** it has done nothing since its Activation began */
  fresh(): boolean
  /** it has moved in this Activation */
  moved(): boolean
  /** its basic move's action id (the slot on the bar), or null */
  basicMove(): string | null
  /** the hexes its chosen move can reach now — the blue grid; empty while no move is chosen */
  reach(): number[]
  seen(rowId: string): boolean
  mark(rowId: string): void
  /** the runner let something go: look again (begin the Activation it held, draw the facts) */
  wake(): void
}

export function createLessons(rows: readonly LessonRow[], host: LessonHost) {
  let battle: string | null = null
  /** an Activation has begun in this battle: the rows that start with the battle are over */
  let begun = false
  let up: { row: LessonRow; pointers: { clear(): unknown }[]; token: number; actor: number | null; from: number | null; gone: boolean } | null = null
  let token = 0

  const pending = (starts: LessonRow['starts']) => battle === null ? [] : rows.filter((r) => r.encounterId === battle && r.starts === starts && !host.seen(r.id))
  const fits = (row: LessonRow, actor: number) => row.of === undefined || host.units(row.of).includes(actor)

  /** what a row's target is on the board now, for the viewer's calls; none when the battle holds no such thing */
  function targets(at: LessonTarget): ({ unit: number } | { hex: number } | { action: string })[] {
    if (at === 'civilians') return host.units('civilians').map((unit) => ({ unit }))
    if (at === 'enemy' || at === 'hero') return host.units(at).slice(0, 1).map((unit) => ({ unit }))
    if (at === 'basic-move') { const action = host.basicMove(); return action === null ? [] : [{ action }] }
    /* 'reach-toward-civilians': of the hexes the blue grid draws, the one with the least distance to the civilians (the sum over
       them), then to the nearest enemy, then the lowest hex — the engine's reach and the engine's distance, never a typed hex */
    const civilians = host.units('civilians').map(host.hexOf), enemies = host.units('enemy').map(host.hexOf)
    const far = (h: number) => civilians.reduce((n, c) => n + host.distance(h, c), 0)
    const foe = (h: number) => enemies.length ? Math.min(...enemies.map((e) => host.distance(h, e))) : 0
    const best = [...host.reach()].sort((a, b) => far(a) - far(b) || foe(a) - foe(b) || a - b)[0]
    return best === undefined ? [] : [{ hex: best }]
  }

  function show(row: LessonRow, actor: number | null): void {
    const v = host.viewer(); if (!v) return
    host.mark(row.id)
    const my = ++token, pointers: { clear(): unknown }[] = []
    up = { row, pointers, token: my, actor, from: actor === null ? null : host.hexOf(actor), gone: false }
    const done = () => { if (up?.token === my) finish() }
    if (row.point) for (const [i, t] of targets(row.point.at).entries()) pointers.push(v.point(t, i === 0 && row.point.word ? { word: row.point.word } : {}))
    /* the board may drop what the row waits on — a seek (the host's Show current state), a fault: the row is then over the
       next time the board is still, never in the middle of the board's own work (it may be going away) */
    const gone = () => { if (up?.token === my) up.gone = true }
    if (row.words) v.tell([...row.words], { onDone: (why) => { if (row.ends !== 'time') return; if (why === 'time' || why === 'click') done(); else if (why === 'dropped') gone() } })
    const seen = row.look ? targets(row.look)[0] : undefined
    if (seen && 'unit' in seen) v.look(seen, { back: false, onDone: (why) => { if (row.ends !== 'look') return; if (why === 'held') done(); else if (why === 'dropped' || why === 'cancelled') gone() } })
    else if (row.ends === 'look') done()
  }

  /** the row that is up goes: its arrows, its notice if it still stands; the view comes back once the battle's opening rows are over */
  function finish(): void {
    const u = up; if (!u) return
    up = null; token++
    const v = host.viewer()
    for (const p of u.pointers) p.clear()
    if (v && u.row.words) v.clearTell()
    if (v && u.row.starts === 'battle-begins' && !pending('battle-begins').length) v.lookBack()
    host.wake()
  }

  /** has what the row waits for happened? (a row that waits on an acting unit also goes when that unit is no longer acting) */
  function over(u: NonNullable<typeof up>): boolean {
    if (u.actor !== null && host.acting() !== u.actor) return true
    if (u.row.ends === 'move-chosen') return host.reach().length > 0 || host.moved()
    if (u.row.ends === 'moved') return host.moved() || (u.actor !== null && host.hexOf(u.actor) !== u.from)
    return false
  }

  return {
    /** a battle is put on the screen: the encounter whose rows may show (null: none — a battle outside a run has no memory) */
    open(encounterId: string | null): void { up = null; token++; battle = encounterId; begun = false },
    /** while true the host begins no Activation and takes no order: a row that waits is up, or is about to be */
    waiting(): boolean { return up?.row.waits === true || (!begun && pending('battle-begins').length > 0) },
    /** the Activation about to begin for this unit begins with no move chosen */
    unarmed(unit: number | null): boolean { return unit !== null && pending('activation-begins').some((r) => r.unarmed === true && fits(r, unit)) },
    /** a click while a row that waits is up moves on to the next row */
    click(): boolean { if (up?.row.waits !== true) return false; finish(); return true },
    /** the host calls it whenever the board is still: the row that is up may be over; the next row may begin */
    still(): void {
      if (battle === null || !host.viewer()) return
      if (up) { if (up.gone || over(up)) finish(); return }
      const actor = host.acting()
      if (!begun && actor === null) { const row = pending('battle-begins')[0]; if (row) show(row, null); return }
      if (actor === null) return
      begun = true
      const row = (host.fresh() ? pending('activation-begins').find((r) => fits(r, actor)) : undefined)
        ?? (host.reach().length > 0 && !host.moved() ? pending('move-chosen').find((r) => fits(r, actor)) : undefined)
      if (row) show(row, actor)
    },
    /** the row that is up, for the page tests */
    get up(): string | null { return up?.row.id ?? null },
  }
}
export type Lessons = ReturnType<typeof createLessons>
