// The recruit pool — the Beacon, THIN. 7-KINGDOM-SETTLED.md: Faith buys
// recruits; the Beacon stocks the pool and is "standing at Sanctuary." Until
// the Crucible generates heroes, the pool is a few of the engine's fielded
// hero rows that the fixture does not already carry — real kits, real names
// (content/settled.json). Recruitment runs at one a Week (KINGDOM-DESIGN.md
// §3, "Recruit — one hero per turn").

import type { Hero } from '../core/campaign.js'
import { omitDisabled } from './disable.js'

export type RecruitRow = Hero

const recruit = (id: string, name: string, cls: string, unitType: string): RecruitRow => ({
  id, name, classes: [cls], level: 1, xp: 0, wound: 0, lifeState: 'alive', badges: [], unitType, corruption: 0,
})

const RAW_RECRUITS: readonly RecruitRow[] = [
  recruit('hero.base.ranger-aggressive', 'Aggressive Ranger', 'class.ranger', 'hero.base.ranger-aggressive'),
  recruit('hero.base.warrior-iron', 'Iron Dwarf', 'class.warrior', 'hero.base.warrior-iron'),
  recruit('hero.fixed.farmer', 'Farmer', 'class.civilian', 'hero.fixed.farmer'),
  recruit('hero.fixed.lumberjack-and-wife', 'Lumberjack and Wife', 'class.civilian', 'hero.fixed.lumberjack-and-wife'),
]

export const RECRUITS: readonly RecruitRow[] = omitDisabled(RAW_RECRUITS)
