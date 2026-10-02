// The hero pool — who can be drafted at the opening and who answers the Beacon
// after it. THIN: the Crucible is unbuilt, so these are fixed rows over unit
// rows the engine already fields.
//
// The prologue party is ruled from the Eve-of-Ruin 24 (engine/DECISIONS.md
// 2026-08-26: "pick a ranger of the 24 Eve, then a warrior and a preist, all
// from 24 eve" — Hunter, Iron Dwarf, Battle Chaplain), and the first hero is
// DRAFTED, stat-less, from three (GAME-ARCHITECTURE.md §2.5, SKELETON-SETTLED.md
// :93,124). So the pool's first three are those; the rest are the Eve heroes
// the campaign fixture already carried. The standalone sandbox now uses all
// 24 canonical base IDs; migration of this campaign draft pool remains separate.
// Civilians are not drafted ("When i draft at start, i AM ONLY DRAFTING HERO
// CLASSES"); they arrive by rescue — the prologue rows carry them.

import type { Hero } from '../core/campaign.js'
import { omitDisabled } from './disable.js'
import { KIT_SPECS, HERO_ITEM_SLOTS } from './generated/kits.js'
import { UNITS, type UnitDef } from '../engine.js'

export type HeroRow = Hero

/**
 * What a hero wears at entry — its engine row's defaultItems (the codex kit the pack compiled), or null when the
 * row carries none (G3, 2026-09-02). kingdom.reads-engine (review finding K15): the kingdom read the kits from its own
 * generated copy of the codex; the engine's row is the one the battle fields.
 */
export function heroKitOf(unitType: string): readonly string[] | null {
  return UNITS[unitType]?.defaultItems ?? null
}

/** Every hero row's kit, by unit — the engine rows' defaultItems. */
export const HERO_KITS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  Object.keys(UNITS).sort().flatMap((id) => { const kit = heroKitOf(id); return kit && id.startsWith('hero.') ? [[id, kit]] : [] }))

/**
 * A hero row as the campaign holds it, built from its ENGINE row — kingdom.reads-engine (review finding K9: heroes.ts
 * typed the names, classes and unit types by hand, one stale and two fused from different rows). The name is the row's,
 * the class its one class.* tag, the kit its defaultItems, the item slots the codex's (a campaign quantity, generated).
 * Loud on a row without a kit, slots, name or a single class (sandboxHeroesOf, the same builder).
 */
export function heroOfRow(id: string, units: Readonly<Record<string, UnitDef>> = UNITS, slots: Readonly<Record<string, number>> = HERO_ITEM_SLOTS): HeroRow {
  const unit = units[id]
  if (!unit) throw new Error(`hero '${id}' has no engine row`)
  const kit = unit.defaultItems, itemSlots = slots[id]
  if (!kit || !kit.length) throw new Error(`hero '${id}' has no authored kit`)
  if (itemSlots === undefined || !Number.isInteger(itemSlots) || itemSlots < 0) throw new Error(`hero '${id}' has no valid authored itemSlots`)
  const classes = unit.tags?.filter((t) => t.startsWith('class.')) ?? []
  if (classes.length !== 1) throw new Error(`hero '${id}' requires one authored class tag`)
  if (!unit.name?.trim()) throw new Error(`hero '${id}' has no authored name`)
  return { id, name: unit.name, classes: [...classes], unitType: id, equipped: [...kit], itemSlots, level: 1, xp: 0, wound: 0, lifeState: 'alive', badges: [], corruption: 0 }
}

/** A hero with no content kit is refused by name — never fielded bare (ISC-053). */
export function assertKitted(id: string): void {
  if (!heroKitOf(id)) throw new Error(`hero '${id}' has no kit in the content (hbt-content.json heroes[].kit is null) — a hero enters wearing its kit or not at all; author the kit, do not draft the hero`)
}

// A row enters WEARING its kit: `equipped` at entry is its engine row's defaultItems, verbatim (GEAR-DESIGN.md §1,
// "starting weapons and starting armor … are their own thing").
const hero = (id: string): HeroRow => heroOfRow(id)

const RAW_HEROES: readonly HeroRow[] = [
  hero('hero.base.ranger-aggressive'),   // Hunter
  hero('hero.base.warrior-iron'),        // Iron Dwarf
  hero('hero.base.priest-armored'),      // Battle Chaplain
  // Removed 2026-09-02 (Andrew: "Let's just remove those four alpha heroes"):
  // Oathblade, Sky Pirate, Dusk Hawk, Air Mage — alpha test units with no kit
  // in the content. This campaign pool remains intentionally limited pending
  // its own draft migration; the standalone sandbox already offers the Eve 24.
  // kingdom.reads-engine (review finding K9): "Lucius" and "Osric" were the alpha TEST clones' names on these two rows'
  // bodies (alpha-lucius, alpha-osric — engine DECISIONS.md 2026-08-20: "copied into tweakable test clones, originals
  // untouched"), with the rows' own kits: one hero fused from two rows. They are their own rows now, by the rows' names
  // (Rune-Marked Ascetic, Dawnblade) — kingdom SWITCHES.md poolHeroesAreRows.
  hero('hero.base.priest-scantily'),
  hero('hero.base.paladin-shiney'),
]

/** Civilians the prologue rescues — ordinary hero rows of class.civilian (ruled 2026-08-23). */
const RAW_CIVILIANS: readonly HeroRow[] = [
  hero('hero.fixed.orphans'),              // Orphan Child
  hero('hero.fixed.lumberjack-and-wife'),   // Lumberjack (the row's name since 2026-09; "Lumberjack and Wife" was a stale copy)
  hero('hero.fixed.farmer'),               // Farmer
]

export const HERO_POOL: readonly HeroRow[] = omitDisabled(RAW_HEROES)
export const CIVILIANS: readonly HeroRow[] = omitDisabled(RAW_CIVILIANS)

/**
 * kingdom.opening-loop-three: the civilians an opening encounter fields, as the rows they join the roster as when they
 * are rescued — engine DECISIONS.md 2026-09-28 'answers to the 22 questions': "We're going to pick up civilians. We're
 * going to have two civilians in the orphanage: an orphan child and the school teacher. We're going to have two
 * civilians in Battle 2". Matched by the engine unit an encounter fields (`unitType`); the names are the engine's own
 * unit names. Kept apart from CIVILIANS, which the quests' rescue draw and the Beacon read (kingdom SWITCHES.md
 * openingRescueRows).
 */
const RAW_RESCUABLE: readonly HeroRow[] = [
  ...RAW_CIVILIANS,
  hero('hero.fixed.school-teacher'),
  hero('hero.fixed.lumberjacks-wife'),
]
export const RESCUABLE_CIVILIANS: readonly HeroRow[] = omitDisabled(RAW_RESCUABLE)

/**
 * Pool rows the codex gives no kit — a NAMED gap. tools/kit-gaps.mts writes it to
 * src/content/generated/kits-gaps.json (the root CONTENT-GAPS.md is the content
 * pipeline's own and is never hand-edited). Empty today; the alpha four were removed
 * for exactly this on 2026-09-02.
 */
export const KIT_GAPS: readonly string[] = [...RAW_HEROES, ...RAW_CIVILIANS].filter((h) => !heroKitOf(h.unitType)).map((h) => h.id)
/** Pool rows whose kit is only pinned — the class draw the kingdom does not roll. None today. */
export const KIT_SPEC_IDS: readonly string[] = KIT_SPECS.filter((k) => [...RAW_HEROES, ...RAW_CIVILIANS].some((h) => h.id === k.id)).map((k) => k.id)
/** The Beacon offers from the same pool, plus the civilians once the opening is done. */
export const RECRUITS: readonly HeroRow[] = [...HERO_POOL, ...CIVILIANS]
export type RecruitRow = HeroRow

export function heroRowOf(id: string): HeroRow {
  const row = RECRUITS.find((h) => h.id === id)
  if (!row) throw new Error(`unknown hero '${id}' — the pool is an explicit registry`)
  return row
}
