// rule.special-moves-unlock-at-level-two (2026-10-06; DECISIONS.md 'a hero's special moves unlock at level 2, ruled …'): a
// hero has its class's special move from level 2. A test that is about a special move - what it does, what closes it, what
// drafting adds beside it - fields its hero at level 2 with this record: the level, and the first specialty of the hero's
// class in the registry's order (the engine fields no level-2 hero without one). Nothing else is chosen.
import { SPECIALTIES, UNITS } from '../src/content/index.js'
import type { HeroProgress } from '../src/core/types.js'

export function levelTwo(typeId: string, more: Partial<HeroProgress> = {}): HeroProgress {
  const cls = (UNITS[typeId]?.tags ?? []).find((t) => t.startsWith('class.'))
  const specialtyId = Object.values(SPECIALTIES).find((s) => s.class === cls)?.id
  if (!specialtyId) throw new Error(`levelTwo: '${typeId}' has no class with a specialty`)
  return { level: 2, specialtyId, ...more }
}
