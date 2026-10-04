// The hero pool — who can be drafted at the opening and who answers the Beacon
// after it. THIN: the Crucible is unbuilt, so these are fixed rows over unit
// rows the engine already fields.
//
// The pool is the Eve-of-Ruin 24 — every base hero the engine pack holds (its
// hero.base.* rows), four of each of Warrior, Ranger, Rogue, Mage, Priest and
// Paladin. Ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the opening draft pool
// is all 24 heroes, Rogues and Mages included'): "Should the draft pool get Rogues
// and Mages now, so every draft offers three and the party ends as one of each
// class?" — "1. Yes"; "should all 24 heroes be draftable, or a set you name?" —
// "2. Yes" (kingdom.opening-draft-pool). The first hero is DRAFTED, stat-less,
// from three (GAME-ARCHITECTURE.md §2.5, SKELETON-SETTLED.md :93,124). The rows
// are read from the engine pack, the ones the standalone sandbox fields
// (content/sandbox.ts) — never typed here (kingdom SWITCHES.md openingPoolIsThePack).
// Until 2026-10-03 the pool was five of them, of four classes (Hunter, Iron Dwarf,
// Battle Chaplain, Rune-Marked Ascetic, Dawnblade).
// Civilians are not drafted ("When i draft at start, i AM ONLY DRAFTING HERO
// CLASSES"); they arrive by rescue — the prologue rows carry them.

import type { Hero } from '../core/campaign.js'
import { omitDisabled } from './disable.js'
import { KIT_SPECS, HERO_ITEM_SLOTS } from './generated/kits.js'
import { UNITS, type UnitDef } from '../engine.js'
import { HERO_DESCRIPTIONS } from './generated/descriptions.js'

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

/** The engine pack's base heroes — the Eve 24 — by id, sorted. The one place the pool and the sandbox read them from. */
export function baseHeroIdsOf(units: Readonly<Record<string, UnitDef>> = UNITS): string[] {
  return Object.keys(units).filter((id) => id.startsWith('hero.base.')).sort()
}

/** A base hero left out of the pool: its row carries no kit. Named, never fielded bare (ISC-053). */
export type UnkittedHero = { readonly id: string; readonly name: string }

/**
 * The draft pool, from the engine pack: every base hero that enters wearing a kit, as its campaign row — and the ones
 * whose row has no kit, left out and named (kingdom.opening-draft-pool: "A hero whose row has no kit in the content is not
 * drafted and is listed by name (assertKitted), never fielded bare"). Every other fault in a row — no item slots, no name,
 * not one class — is still refused loudly (heroOfRow).
 */
export function heroPoolOf(units: Readonly<Record<string, UnitDef>> = UNITS, slots: Readonly<Record<string, number>> = HERO_ITEM_SLOTS): { pool: HeroRow[]; unkitted: UnkittedHero[] } {
  const pool: HeroRow[] = [], unkitted: UnkittedHero[] = []
  for (const id of baseHeroIdsOf(units)) {
    if (units[id]!.defaultItems?.length) pool.push(heroOfRow(id, units, slots))
    else unkitted.push({ id, name: units[id]!.name ?? id })
  }
  return { pool, unkitted }
}

// Removed 2026-09-02 (Andrew: "Let's just remove those four alpha heroes"): Oathblade, Sky Pirate, Dusk Hawk, Air Mage —
// alpha test units with no kit in the content; they are not base rows and are not in the pool.
// kingdom.reads-engine (review finding K9): "Lucius" and "Osric" were the alpha TEST clones' names on two base rows' bodies;
// each pool hero is its own row, by the row's name (kingdom SWITCHES.md poolHeroesAreRows).
const BASE = heroPoolOf()
const RAW_HEROES: readonly HeroRow[] = BASE.pool
/** The base heroes the draft leaves out for want of a kit, by name. None today — all 24 enter wearing one. */
export const UNKITTED_HEROES: readonly UnkittedHero[] = BASE.unkitted

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
 * for exactly this on 2026-09-02. kingdom.opening-draft-pool: a base hero left out of
 * the pool for want of a kit (UNKITTED_HEROES) is a gap named here too.
 */
export const KIT_GAPS: readonly string[] = [...UNKITTED_HEROES.map((h) => h.id), ...[...RAW_HEROES, ...RAW_CIVILIANS].filter((h) => !heroKitOf(h.unitType)).map((h) => h.id)]
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

/**
 * Who a hero is, in the codex's words — its backstory and its quote — or null when the codex gives none
 * (kingdom.opening-draft-modifiers: the first draft shows a description and nothing else; ruled 2026-10-03, Andrew,
 * engine/DECISIONS.md 'the opening run, audited': "no stats or badges shown, just a description"). Words only — no stat,
 * no badge, no kit. Generated from the codex by tools/mk-descriptions.mjs; the engine's unit rows carry no such words.
 */
export function heroDescriptionOf(id: string): { readonly description: string; readonly quote: string } | null {
  const row = HERO_DESCRIPTIONS.find((d) => d.id === id)
  return row ? { description: row.description, quote: row.quote } : null
}
