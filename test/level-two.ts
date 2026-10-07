// rule.special-moves-unlock-at-level-two (engine item, 2026-10-06; engine/DECISIONS.md 'a hero's special moves unlock at level
// 2, ruled: all of them, every hero …'): a hero has its class's special move from level 2. A test that is about a special
// move - choosing it from the bar, the gesture it keeps - fields the sandbox's own heroes as campaign rows at level 2, each
// with the first specialty of its class (the engine fields no level-2 hero without one). Nothing else is chosen.
import { SANDBOX_HEROES } from '../src/content/sandbox.js'
import { specialtiesOf } from '../src/content/progress.js'

export function levelTwoRows(ids: readonly string[]) {
  return ids.map((id) => { const h = structuredClone(SANDBOX_HEROES.find((x) => x.id === id)!); return { ...h, level: 2, specialty: specialtiesOf(h.classes[0]!)[0]!.id } })
}
