// The reveals the opening grants — rows. viewer.new-enemy-notice (2026-10-04; engine DECISIONS.md 2026-10-04 'the opening's
// tutorial: … new enemies are named …'): one reveal per ENEMY KIND met — `reveal.enemy.<kind>`, the kind being the engine's
// unit type (a Zombie and a Fast Zombie are two) — granted when the battle screen has shown that kind's "New enemy" notice.
import { UNITS } from '../engine.js'

/** Every enemy kind the engine has: its enemy-side unit types, in id order (Law 6). */
export const ENEMY_KINDS: readonly string[] = Object.values(UNITS as Record<string, { typeId: string; side: string }>).filter((u) => u.side === 'enemy').map((u) => u.typeId).sort()

/** The reveal that says an enemy kind has been met. */
export const enemyRevealOf = (typeId: string): string => 'reveal.enemy.' + typeId.replace(/^unit\./, '')

/**
 * The kinds a battle's own lesson introduces, so the battle screen does not announce them a second time: battle 1's
 * lesson names the Zombie ("It then zooms to the zombie on the map, points at it, and says \"Zombie.\"" —
 * kingdom.tutorial-orphanage-first-move). Such a kind is met when that battle is put on the screen.
 */
export const LESSON_INTRODUCES: Readonly<Record<string, readonly string[]>> = {
  'encounter.opening.orphanage': ['unit.zombie'],
}

/** The kinds a battle of this encounter should announce: every enemy kind not yet met, less its own lesson's. */
export function enemiesToAnnounce(revealed: readonly string[], encounterId: string | undefined): string[] {
  const own = new Set(encounterId ? LESSON_INTRODUCES[encounterId] ?? [] : [])
  return ENEMY_KINDS.filter((k) => !own.has(k) && !revealed.includes(enemyRevealOf(k)))
}
