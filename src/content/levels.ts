// Level thresholds — GLOSSARY.md, SKELETON-SETTLED.md:114, ruled 2026-08-23:
// "20 · 100 · 250 · 500 · then scale out — all soft." Index = the level a hero
// REACHES at that XP; level 1 is where everyone starts. The units session owns
// landing the curve (3-UNITS-SETTLED.md); these are the ruled soft numbers.

export const LEVEL_THRESHOLDS: readonly number[] = [0, 0, 20, 100, 250, 500]

/** The XP a hero needs to reach `level`, or null past the ruled curve. */
export function xpForLevel(level: number): number | null {
  return LEVEL_THRESHOLDS[level] ?? null
}
