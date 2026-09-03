// The hero pool — who can be drafted at the opening and who answers the Beacon
// after it. THIN: the Crucible is unbuilt, so these are fixed rows over unit
// rows the engine already fields.
//
// The prologue party is ruled from the Eve-of-Ruin 24 (engine/DECISIONS.md
// 2026-08-26: "pick a ranger of the 24 Eve, then a warrior and a preist, all
// from 24 eve" — Hunter, Iron Dwarf, Battle Chaplain), and the first hero is
// DRAFTED, stat-less, from three (GAME-ARCHITECTURE.md §2.5, SKELETON-SETTLED.md
// :93,124). So the pool's first three are those; the rest are the Eve heroes
// the fixture already carried, whose unit rows are still the ALPHA test kits
// until the pack fields the 24 by id — a content gap, named here.
// Civilians are not drafted ("When i draft at start, i AM ONLY DRAFTING HERO
// CLASSES"); they arrive by rescue — the prologue rows carry them.

import type { Hero } from '../core/campaign.js'
import { omitDisabled } from './disable.js'

export type HeroRow = Hero

const hero = (id: string, name: string, cls: string, unitType: string): HeroRow => ({
  id, name, classes: [cls], level: 1, xp: 0, wound: 0, lifeState: 'alive', badges: [], unitType, corruption: 0, equipped: [],
})

const RAW_HEROES: readonly HeroRow[] = [
  hero('hero.base.ranger-aggressive', 'Hunter', 'class.ranger', 'hero.base.ranger-aggressive'),
  hero('hero.base.warrior-iron', 'Iron Dwarf', 'class.warrior', 'hero.base.warrior-iron'),
  hero('hero.base.priest-armored', 'Battle Chaplain', 'class.priest', 'hero.base.priest-armored'),
  // Removed 2026-09-02 (Andrew: "Let's just remove those four alpha heroes"):
  // Oathblade, Sky Pirate, Dusk Hawk, Air Mage — alpha test units with no kit
  // in the content. The pool is short until the engine fields the rest of the
  // Eve 24 (engine backlog: content.field-eve-24); the opening drafts what the
  // pool holds. Lucius and Osric are Eve rows with kits, still fielded on
  // alpha unit rows until that lands.
  hero('hero.base.priest-scantily', 'Lucius', 'class.priest', 'alpha-lucius'),
  hero('hero.base.paladin-shiney', 'Osric', 'class.paladin', 'alpha-osric'),
]

/** Civilians the prologue rescues — ordinary hero rows of class.civilian (ruled 2026-08-23). */
const RAW_CIVILIANS: readonly HeroRow[] = [
  hero('hero.fixed.orphans', 'Orphan Child', 'class.civilian', 'hero.fixed.orphans'),
  hero('hero.fixed.lumberjack-and-wife', 'Lumberjack and Wife', 'class.civilian', 'hero.fixed.lumberjack-and-wife'),
  hero('hero.fixed.farmer', 'Farmer', 'class.civilian', 'hero.fixed.farmer'),
]

export const HERO_POOL: readonly HeroRow[] = omitDisabled(RAW_HEROES)
export const CIVILIANS: readonly HeroRow[] = omitDisabled(RAW_CIVILIANS)
/** The Beacon offers from the same pool, plus the civilians once the opening is done. */
export const RECRUITS: readonly HeroRow[] = [...HERO_POOL, ...CIVILIANS]
export type RecruitRow = HeroRow

export function heroRowOf(id: string): HeroRow {
  const row = RECRUITS.find((h) => h.id === id)
  if (!row) throw new Error(`unknown hero '${id}' — the pool is an explicit registry`)
  return row
}
