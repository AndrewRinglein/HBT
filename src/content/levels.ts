// Level thresholds — ruled 2026-09-28 (Andrew, engine/DECISIONS.md 'levels by XP at 20, 50, 100, 170, 270, 400'):
// "levels are determined by experience points, so for the first level, you need 20 experience points. Then you
// need to get to 50, then 100. Then 170. 270 400" — cumulative; GLOSSARY.md "Level thresholds" carries the same row.
// Replaces the soft curve "20 · 100 · 250 · 500 · then scale out" (SKELETON-SETTLED.md:114, ruled 2026-08-23).
// Index = the level a hero REACHES at that XP; level 1 is where everyone starts. Past level 7 the curve is not ruled.

export const LEVEL_THRESHOLDS: readonly number[] = [0, 0, 20, 50, 100, 170, 270, 400]

/** The XP a hero needs to reach `level`, or null past the ruled curve. */
export function xpForLevel(level: number): number | null {
  return LEVEL_THRESHOLDS[level] ?? null
}
