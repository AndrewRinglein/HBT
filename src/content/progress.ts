// Progress — the level tables and specialties, as the kingdom reads them. GEAR-DESIGN.md §7 (level-up: "no power
// choice, all level modifiers, specialization once at level 2") · hbt-content.json levels.rules.
//
// kingdom.reads-engine (2026-10-02; engine DECISIONS.md "the duplication review, ruled", findings K1 K15): the rows
// are the ENGINE's — its LEVELS (the class tables and the civilian TYPE tables, each row's grants with the class
// freebie folded in, in the engine's stat names) and its SPECIALTIES — read through src/engine.ts. The kingdom kept
// a generated copy of the class tables only, so a Farmer levelled on the class table here and on civilian.farmer in
// battle. The specialty is chosen at the engine's SPECIALTY_LEVEL. What the engine does not carry — a specialty's
// intent line and its campaign stat words (itemSlots) — is generated (src/content/generated/progress.ts).
//
// What a level grants is folded onto the unit by the ENGINE at fielding (applyProgress, hero assembly 2026-09-03);
// the kingdom records the level, the specialty and the level-5 pick, shows the grants, and hands the engine
// `heroProgress`. The one grant the kingdom itself applies is itemSlots, which is the slot model's number and not a
// battle stat.

import { SPECIALTY_WORDS, MOVE_LINES } from './generated/progress.js'
import { omitDisabled } from './disable.js'
import { LEVELS, SPECIALTIES as ENGINE_SPECIALTIES, SPECIALTY_LEVEL, UNITS, ACTIONS } from '../engine.js'

export type LevelRow = {
  readonly level: number
  /** In the engine's stat names, the table's freebie included; `itemSlots` is the campaign's. */
  readonly grants: Readonly<Record<string, number>>
  /** The specialty is chosen at this level — the engine's SPECIALTY_LEVEL, the first level-up, for every table. */
  readonly specialty: boolean
  /** A pick of one of these, alongside the grants — the codex: level 5, every table. */
  readonly choice?: readonly Readonly<Record<string, number>>[]
}
export type SpecialtyRow = { readonly id: string; readonly name: string; readonly classId: string; readonly intent: string; readonly statModifiers: Readonly<Record<string, number>> }

const WORDS: ReadonlyMap<string, (typeof SPECIALTY_WORDS)[number]> = new Map(SPECIALTY_WORDS.map((w) => [w.id, w]))

export const SPECIALTIES: readonly SpecialtyRow[] = omitDisabled(Object.values(ENGINE_SPECIALTIES).map((s) => {
  const w = WORDS.get(s.id)
  return { id: s.id, name: s.name, classId: s.class, intent: w?.intent ?? '', statModifiers: { ...s.statModifiers, ...(w?.campaignMods ?? {}) } }
}).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)))

/** The row for reaching `level` on table `tableId` (a class, or a civilian's type — the engine's levelTableOf). */
export function levelRowOf(tableId: string, level: number): LevelRow {
  const t = LEVELS[tableId]
  if (!t) throw new Error(`no level table '${tableId}' — the engine's are ${Object.keys(LEVELS).join(', ')}`)
  const r = t.rows.find((x) => x.level === level)
  if (!r) throw new Error(`${tableId} has no level ${level} — its table runs 1 to ${t.rows[t.rows.length - 1]?.level}`)
  return { level: r.level, grants: { ...r.grants }, specialty: r.level === SPECIALTY_LEVEL, ...(r.choice ? { choice: r.choice } : {}) }
}

/**
 * How many specialties the specialty choice offers. Ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'card art on the level-up
 * and reward screens; the specialty choice offers three, not nine': "you're supposed to only get a choice of three
 * different specialty classes, not nine."; 'the civilians show on the victory screen; the specialty three are random; …':
 * "It's random: 3 of the 9."). The number is this row's; the draw is core's (core/rewards.ts specialtyOfferOf).
 * kingdom.opening-specialty-three.
 */
export const SPECIALTY_OFFER = 3

/** The specialties a hero of `classId` may hold — the engine's rule: the specialty's class is the hero's class. */
export const specialtiesOf = (classId: string): SpecialtyRow[] => SPECIALTIES.filter((s) => s.classId === classId)

export function specialtyOf(id: string): SpecialtyRow {
  const s = SPECIALTIES.find((x) => x.id === id)
  if (!s) throw new Error(`unknown specialty '${id}'`)
  return s
}

/** A movement a level unlocks: the engine's id and name, and the Codex's one line of what it does ('' where it gives none). */
export type MoveUnlocked = { readonly id: string; readonly name: string; readonly line: string }
/**
 * rule.special-moves-unlock-at-level-two (engine item, 2026-10-06; engine/DECISIONS.md 'a hero's special moves unlock at level
 * 2, ruled: all of them, every hero, enemies and civilians unchanged, named on the level-up screen'): the movements a unit
 * gains on reaching `level` — read from the ENGINE's row (its `moveLevels`: the level each movement it lists is granted
 * at), in the row's own order. The kingdom rules nothing here; it names what the engine grants. The line is the Codex's,
 * by the unit's class (generated MOVE_LINES). A row that names no level — a civilian, an enemy — unlocks none.
 */
export function movesUnlockedAt(unitType: string, level: number): MoveUnlocked[] {
  const def = UNITS[unitType]
  if (!def?.moveLevels) return []
  const classes = (def.tags ?? []).filter((t) => t.startsWith('class.'))
  return def.moves.filter((m) => def.moveLevels![m] === level).map((id) => ({
    id, name: ACTIONS[id]?.name ?? id,
    line: MOVE_LINES.find((r) => r.moveId === id && classes.includes(r.classId))?.line ?? '',
  }))
}
