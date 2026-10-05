// A class's standard hero, and how one hero differs from it — kingdom.first-hero-own-positives-negatives (2026-10-05).
//
// Ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'the playtest post answered: …, the first hero's own positives and negatives'):
// "It should show its positives and negatives compared to a standard hero of that type. It should say one line about what it
// is, like a ranger, and then it should do something similar to what you have there, but just about the positives and
// negatives it has, stats, and badges."
//
// WHERE THE STANDARD COMES FROM. The content has no row that is "the standard ranger": a class's row (codex classes[].
// derivedBase) holds only the stats derived by class — Accuracy, Crit, Luck, Vision, Movement, Stamina — and every base hero of
// the class has exactly those. The rest (Strength, Precision, Armor, Health, Reach, Magic, Spirit, Resist, Toughness, Item
// Slots) live on the four base heroes of the class, which shared one stat block until each was set apart "by at least a stat
// point or a badge" (content/gen/eve-differentiation.json, ruled 2026-08-22). So the standard is read back from them: stat by
// stat, the value MOST of the class's base heroes have on their bare rows — the engine's unit rows, before any kit — and, when
// two values are as common as each other, the lower. Nothing is typed here; a hero added to a class moves its standard
// (kingdom SWITCHES.md firstHeroStandard — the other side is the Crucible's class template).
//
// A hero's OWN badges are the ones its row carries that the other heroes of its class do not all carry. The engine's rows
// carry only the badge every hero has today, so no base hero has a badge of its own yet (SWITCHES.md firstHeroOwnBadges).

import { HERO_POOL, type HeroRow } from './heroes.js'
import { STAT_LABEL } from './stat-labels.js'
import { UNITS } from '../engine.js'

/** Item Slots is the campaign's own quantity, on the kingdom's hero row; every other stat is the engine's unit row's. */
const SLOTS = 'itemSlots'
const unitOf = (h: HeroRow): Readonly<Record<string, unknown>> => {
  const u = UNITS[h.unitType] as unknown as Readonly<Record<string, unknown>> | undefined
  if (!u) throw new Error(`${h.id} fields as '${h.unitType}', which is no engine unit — no stats to compare`)
  return u
}
/** A hero's bare value of a stat: its unit row's number (absent = 0), or its row's item slots. */
const valueOf = (h: HeroRow, stat: string): number => { if (stat === SLOTS) return h.itemSlots; const v = unitOf(h)[stat]; return typeof v === 'number' ? v : 0 }
const badgesOf = (h: HeroRow): string[] => [...new Set([...((unitOf(h)['badges'] as readonly string[] | undefined) ?? []), ...h.badges])]

/** The base heroes of a class — the pool's rows whose class it is. Refused loudly for a class the pool has no hero of. */
export function classHeroesOf(classId: string): HeroRow[] {
  const rows = HERO_POOL.filter((h) => h.classes.includes(classId))
  if (!rows.length) throw new Error(`no base hero of '${classId}' in the pool — a class with no hero has no standard`)
  return rows
}

/** Every stat the class's heroes carry a number for, in the label table's order, then any other by name (Law 6). */
function statsOf(rows: readonly HeroRow[]): string[] {
  const seen = new Set<string>([SLOTS])
  for (const h of rows) for (const [k, v] of Object.entries(unitOf(h))) if (typeof v === 'number') seen.add(k)
  const labelled = Object.keys(STAT_LABEL).filter((k) => seen.has(k))
  return [...labelled, ...[...seen].filter((k) => !labelled.includes(k)).sort()]
}

/** The standard hero of a class: stat by stat, the value most of its base heroes have; a tie goes to the lower. Pure. */
export function classStandardOf(classId: string): Readonly<Record<string, number>> {
  const rows = classHeroesOf(classId), out: Record<string, number> = {}
  for (const stat of statsOf(rows)) {
    const count: Record<string, number> = {}
    for (const h of rows) { const v = valueOf(h, stat); count[v] = (count[v] ?? 0) + 1 }
    const most = Math.max(...Object.values(count))
    out[stat] = Math.min(...Object.keys(count).filter((v) => count[v] === most).map(Number))
  }
  return out
}

export type OwnDifferences = {
  /** The class the hero is compared within — the first of its classes the pool has heroes of. */
  readonly classId: string
  /** Each stat that is not the standard's, with how far above (+) or below (−) it is; the standard's own order. Never a zero. */
  readonly stats: readonly { readonly stat: string; readonly amount: number }[]
  /** The badges on its row that not every hero of its class carries. */
  readonly badges: readonly string[]
}

/** How this hero differs from the standard hero of its class: its own stats above and below, and its own badges. Pure. */
export function ownDifferencesOf(h: HeroRow): OwnDifferences {
  const classId = h.classes.find((c) => HERO_POOL.some((x) => x.classes.includes(c)))
  if (!classId) throw new Error(`${h.id} is of no class the pool has heroes of ([${h.classes.join(', ')}]) — nothing to compare it with`)
  const rows = classHeroesOf(classId), standard = classStandardOf(classId)
  const stats = Object.keys(standard).map((stat) => ({ stat, amount: valueOf(h, stat) - standard[stat]! })).filter((d) => d.amount !== 0)
  const badges = badgesOf(h).filter((b) => !rows.every((x) => badgesOf(x).includes(b))).sort()
  return { classId, stats, badges }
}
