// A stand-in battle screen and battle for the lessons' runner (src/ui/lessons.ts) — what the kingdom.tutorial-* tests share.
// What the runner calls on the battle screen is kept (the notices told, the arrows up, the looks); the test plays a notice's
// time, a look's end and the battle's facts by hand. Not a test file: the tests import it.
import { LESSONS } from '../src/content/lessons.js'
import { createLessons } from '../src/ui/lessons.js'

export type Told = { words: string[]; hold: boolean; onDone: ((why: string) => void) | undefined }
export function lessonStage(seen = new Set<string>(), party: number[] = [0]) {
  const calls: string[] = [], told: Told[] = [], looks: { unit: number; onDone: ((why: string) => void) | undefined }[] = []
  const pointers: { target: unknown; word: string | undefined; up: boolean }[] = []
  /** the battle as the host would answer it: units 0 the hero (and 4, when the party is two), 1 and 2 the civilians, 3 the enemy, on a 20-wide board */
  const battle = { turn: 1, acting: null as number | null, fresh: true, moved: false, attacked: false, reach: [] as number[], attackInReach: null as string | null, provoker: null as number | null,
    /** kingdom.tutorial-turns-in-battle-one: the player's other units that have yet to act this Hero Phase — not the one acting (the test says who) */
    yetToAct: [] as number[],
    acted: { done: 0, left: 0 }, hex: { 0: 110, 1: 32, 2: 53, 3: 76, 4: 111 } as Record<number, number> }
  let wakes = 0
  const viewer = {
    tell: (words: string[], o: { hold?: boolean; onDone?: (why: string) => void } = {}) => { calls.push('tell'); told.push({ words, hold: o.hold === true, onDone: o.onDone }); return {} },
    clearTell: () => { calls.push('clearTell'); return true },
    point: (target: unknown, o: { word?: string } = {}) => { const p = { target, word: o.word, up: true }; pointers.push(p); calls.push('point'); return { clear: () => { p.up = false } } },
    look: (target: { unit: number }, o: { onDone?: (why: string) => void } = {}) => { calls.push('look'); looks.push({ unit: target.unit, onDone: o.onDone }); return {} },
    lookBack: () => { calls.push('lookBack'); return true },
  }
  const lessons = createLessons(LESSONS, {
    viewer: () => viewer,
    units: (which) => which === 'civilians' ? [1, 2] : which === 'enemy' ? [3] : party,
    hexOf: (unit) => battle.hex[unit]!,
    distance: (a, b) => Math.abs(a % 20 - b % 20) + Math.abs(Math.floor(a / 20) - Math.floor(b / 20)),
    turn: () => battle.turn, acting: () => battle.acting, fresh: () => battle.fresh, moved: () => battle.moved, attacked: () => battle.attacked,
    basicMove: () => battle.acting === null ? null : 'move.walk', reach: () => battle.reach, attackInReach: () => battle.attackInReach, acted: () => battle.acted, yetToAct: () => battle.yetToAct, provoker: () => battle.provoker, isPlayers: (unit) => unit !== 3,
    seen: (id) => seen.has(id), mark: (id) => { seen.add(id) },
    wake: () => { wakes++; lessons.still() },
  })
  return { lessons, calls, told, looks, pointers, battle, seen, wakes: () => wakes, up: () => pointers.filter((p) => p.up),
    /** every row before `id` in the table marked shown, so the runner is ready for `id` */
    upTo(id: string) { for (const r of LESSONS) { if (r.id === id) break; seen.add(r.once ?? r.id) } return this } }
}
export const rowOf = (id: string) => { const r = LESSONS.find((x) => x.id === id); if (!r) throw new Error('no lesson row ' + id); return r }
