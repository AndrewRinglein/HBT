// Wound levels — KINGDOM-DESIGN.md §9 "Wound levels — temporary, measured in
// days at Sanctuary": Wounded, Badly Wounded, and "Severe wounds make a hero
// unavailable on the strategic map." A wound is a LEVEL on hero.wound
// (GAME-ARCHITECTURE.md §4.2), replaced not accumulated. The durations are not
// ruled and are not here.
//
// What a wound does IN BATTLE is the Codex's badge.wounded (engine DECISIONS.md 2026-09-28: "The wound badge should
// weaken the hero in battle, which is either something you can start with or acquire if you trigger deathbed
// fighting") — fielded through the seam (seam.ts fieldedBadges: wound ≥ 1 → the engine's Wounded rule badge), and a
// hero who stands again at the Deathbed leaves the battle Wounded (reckoning.ts). kingdom.reads-engine (review
// finding K10): this file cited its own penalty ("−1 to most stats, −2 Max Health and Max Stamina") beside the
// badge's; the badge's row is the one owner.

export type WoundRow = { readonly level: number; readonly name: string; readonly deploys: boolean }

export const WOUNDS: readonly WoundRow[] = [
  { level: 0, name: 'whole', deploys: true },
  { level: 1, name: 'Wounded', deploys: true },
  { level: 2, name: 'Badly Wounded', deploys: true },
  { level: 3, name: 'Severe', deploys: false },
]

/** The first level that keeps a hero off the field — §9's "Severe". */
export const WOUND_UNAVAILABLE = WOUNDS.find((w) => !w.deploys)!.level

export function woundNameOf(level: number): string {
  return WOUNDS.find((w) => w.level === level)?.name ?? `wound ${level}`
}
