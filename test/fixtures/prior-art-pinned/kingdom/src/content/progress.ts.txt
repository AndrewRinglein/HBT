// Progress — the codex's level tables and specialties, as the kingdom reads them.
// GEAR-DESIGN.md §7 (level-up: "no power choice, all level modifiers,
// specialization once at level 2") · hbt-content.json levels.rules.
//
// The rows are GENERATED (src/content/generated/progress.ts, by
// tools/mk-progress.mjs); this file gives them their shape and lookups. What a
// level grants is folded onto the unit by the ENGINE at fielding (applyProgress,
// hero assembly 2026-09-03) from the same codex rows — the kingdom records the
// level, the specialty and the level-5 pick, shows the grants, and hands the
// engine `heroProgress`. The one grant the kingdom itself applies is itemSlots,
// which is the slot model's number and not a battle stat.

import { LEVEL_TABLES, SPECIALTY_ROWS } from './generated/progress.js'
import { omitDisabled } from './disable.js'

export type LevelRow = {
  readonly level: number
  readonly grants: Readonly<Record<string, number>>
  /** The specialty is chosen at this level — the codex: the first level-up, 1 → 2, for every class. */
  readonly specialty: boolean
  /** A pick of one of these, alongside the grants — the codex: level 5, every class. */
  readonly choice?: readonly Readonly<Record<string, number>>[]
}
export type LevelTable = { readonly id: string; readonly name: string; readonly freebie: Readonly<Record<string, number>>; readonly rows: readonly LevelRow[] }
export type SpecialtyRow = { readonly id: string; readonly name: string; readonly classId: string; readonly intent: string; readonly statModifiers: Readonly<Record<string, number>>; readonly powers: readonly string[] }

export const TABLES: readonly LevelTable[] = omitDisabled(LEVEL_TABLES)
export const SPECIALTIES: readonly SpecialtyRow[] = omitDisabled(SPECIALTY_ROWS)

export function levelTableOf(classId: string): LevelTable {
  const t = TABLES.find((x) => x.id === classId)
  if (!t) throw new Error(`no level table for '${classId}' — the codex's levels.classes has ${TABLES.map((x) => x.id).join(', ')}`)
  return t
}

/** The row for reaching `level` — its grants plus the class freebie every level pays. */
export function levelRowOf(classId: string, level: number): LevelRow {
  const t = levelTableOf(classId)
  const r = t.rows.find((x) => x.level === level)
  if (!r) throw new Error(`${classId} has no level ${level} — its table runs 1 to ${t.rows[t.rows.length - 1]?.level}`)
  const grants: Record<string, number> = { ...r.grants }
  for (const [k, n] of Object.entries(t.freebie)) grants[k] = (grants[k] ?? 0) + n
  return { ...r, grants }
}

export const specialtiesOf = (classId: string): SpecialtyRow[] => SPECIALTIES.filter((s) => s.classId === classId)

export function specialtyOf(id: string): SpecialtyRow {
  const s = SPECIALTIES.find((x) => x.id === id)
  if (!s) throw new Error(`unknown specialty '${id}'`)
  return s
}
