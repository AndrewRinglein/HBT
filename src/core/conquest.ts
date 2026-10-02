// A conquest map's progress — KINGDOM-V2-2026-09-07.md "Conquest maps and expedition selection": the sections are taken
// in a fixed order, "with no route choice"; "After a victory, return to the progress map: the reclaimed section lights
// up … and a red arrow highlights the next section." (kingdom.abbotown-map, engine DECISIONS.md 2026-09-29.)
//
// Pure and plain: a map is its sections' ids in order; what is taken is a list of those ids. The next is the first
// section in order not yet taken; every other untaken section is locked. Names no content instance — the map's rows
// are src/content/conquest.ts.

export type SectionState = 'taken' | 'next' | 'locked'

/** Each section's state, in the map's order. */
export function conquestProgress(order: readonly string[], taken: readonly string[]): { id: string; state: SectionState }[] {
  const next = order.find((id) => !taken.includes(id))
  return order.map((id) => ({ id, state: taken.includes(id) ? 'taken' : id === next ? 'next' : 'locked' }))
}

/** The next section, or null once every section is taken. */
export function nextSection(order: readonly string[], taken: readonly string[]): string | null {
  return order.find((id) => !taken.includes(id)) ?? null
}

/** A won battle takes its section only when that section is the next one; the result is in the map's order. */
export function takeSection(order: readonly string[], taken: readonly string[], won: string): string[] {
  const now = order.filter((id) => taken.includes(id))
  return won === nextSection(order, taken) ? order.filter((id) => now.includes(id) || id === won) : now
}

/**
 * Whether a battle's outcome is a hero win: the board cleared, or the encounter's objective met (engine Outcome,
 * COMBAT-SEQUENCE "heroClear · objectiveMet · wipe · retreat · capped"; objectiveFailed is the encounter's loss).
 * kingdom SWITCHES.md conquestWin.
 */
export function wonOutcome(outcome: string | null | undefined): boolean {
  return outcome === 'heroClear' || outcome === 'objectiveMet'
}
