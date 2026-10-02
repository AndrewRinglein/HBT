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
import { HERO_KITS, KIT_SPECS, HERO_ITEM_SLOTS } from './generated/kits.js'

export type HeroRow = Hero

/** What the codex says a hero wears at entry, or null when it says nothing (G3, 2026-09-02). */
export function heroKitOf(id: string): readonly string[] | null {
  return HERO_KITS[id] ?? null
}

/** A hero with no content kit is refused by name — never fielded bare (ISC-053). */
export function assertKitted(id: string): void {
  if (!heroKitOf(id)) throw new Error(`hero '${id}' has no kit in the content (hbt-content.json heroes[].kit is null) — a hero enters wearing its kit or not at all; author the kit, do not draft the hero`)
}

// A row enters WEARING its kit: `equipped` at entry is the codex's list, verbatim
// (GEAR-DESIGN.md §1, "starting weapons and starting armor … are their own thing").
const hero = (id: string, name: string, cls: string, unitType: string): HeroRow => {
  const itemSlots = HERO_ITEM_SLOTS[id]
  if (itemSlots === undefined) throw new Error(`hero '${id}' has no itemSlots in the codex (heroes[].ported.itemSlots) — the slot model needs it`)
  return { id, name, classes: [cls], level: 1, xp: 0, wound: 0, lifeState: 'alive', badges: [], unitType, corruption: 0, equipped: [...(heroKitOf(id) ?? [])], itemSlots }
}

const RAW_HEROES: readonly HeroRow[] = [
  hero('hero.base.ranger-aggressive', 'Hunter', 'class.ranger', 'hero.base.ranger-aggressive'),
  hero('hero.base.warrior-iron', 'Iron Dwarf', 'class.warrior', 'hero.base.warrior-iron'),
  hero('hero.base.priest-armored', 'Battle Chaplain', 'class.priest', 'hero.base.priest-armored'),
  // Removed 2026-09-02 (Andrew: "Let's just remove those four alpha heroes"):
  // Oathblade, Sky Pirate, Dusk Hawk, Air Mage — alpha test units with no kit
  // in the content. This campaign pool remains intentionally limited pending
  // its own draft migration; the standalone sandbox already offers the Eve 24.
  // Lucius and Osric retain the existing campaign aliases here.
  hero('hero.base.priest-scantily', 'Lucius', 'class.priest', 'alpha-lucius'),
  hero('hero.base.paladin-shiney', 'Osric', 'class.paladin', 'alpha-osric'),
]

/** Civilians the prologue rescues — ordinary hero rows of class.civilian (ruled 2026-08-23). */
const RAW_CIVILIANS: readonly HeroRow[] = [
  hero('hero.fixed.orphans', 'Orphan Child', 'class.civilian', 'hero.fixed.orphans'),
  hero('hero.fixed.lumberjack-and-wife', 'Lumberjack', 'class.civilian', 'hero.fixed.lumberjack-and-wife'),
  hero('hero.fixed.farmer', 'Farmer', 'class.civilian', 'hero.fixed.farmer'),
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
  hero('hero.fixed.school-teacher', 'School Teacher', 'class.civilian', 'hero.fixed.school-teacher'),
  hero('hero.fixed.lumberjacks-wife', "Lumberjack's Wife", 'class.civilian', 'hero.fixed.lumberjacks-wife'),
]
export const RESCUABLE_CIVILIANS: readonly HeroRow[] = omitDisabled(RAW_RESCUABLE)

/**
 * Pool rows the codex gives no kit — a NAMED gap. tools/kit-gaps.mts writes it to
 * src/content/generated/kits-gaps.json (the root CONTENT-GAPS.md is the content
 * pipeline's own and is never hand-edited). Empty today; the alpha four were removed
 * for exactly this on 2026-09-02.
 */
export const KIT_GAPS: readonly string[] = [...RAW_HEROES, ...RAW_CIVILIANS].filter((h) => !heroKitOf(h.id)).map((h) => h.id)
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
