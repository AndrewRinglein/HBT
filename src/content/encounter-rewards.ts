// The opening's rewards — rows keyed by the engine's encounter id (kingdom.opening-rewards, kingdom.opening-loop-three
// part 3 of 4). The Reckoning and the reward step read a row by the Engagement's id; core never spells an encounter, an
// item or a class out. An Engagement with no row is paid as any battle is (the kingdom's XP formula, the standing
// one-of-three draw, the Week's fatigue).
//
// Ruled (engine/DECISIONS.md):
//   2026-09-28 'the Orphanage pays 20 XP no matter what': "Make it so they get 20 XP no matter what, so they get a
//     level" — the Orphanage pays 20 to each hero who fought it, whatever the battle's kills or length; with the
//     curve 20, 50, 100, 170, 270, 400 (src/content/levels.ts) that is level 2.
//   2026-09-28 'the opening's party levels up; the Flaming Longsword is a Warrior's or a Paladin's; the Bridge gives
//     a reward': "Battle 2 should be getting a flaming sword" · "it only is going to help the paladin or the warrior"
//     · "On battle 3, which is the bridge, we should be giving another reward" (the standing draw, 7-KINGDOM-SETTLED.md).
//   2026-09-28 'the reward after opening battle 2 is the standard tier-3 Flaming Longsword'.
//   2026-09-28 'answers to the 22 questions': "wounds apply, fatigue does not" — every opening battle; and "Any of these
//     six battles, you replay it if you lose it" (kingdom.opening-loop-three: `replayed`).
// KINGDOM-V2-2026-09-07.md "Opening onboarding and rewards": "Sword after battle 2; item choice starts after battle 3";
// battle 1 has no reward beyond its hero progression.
//
// Battles 4, 5 and 6 are paid by the standing draw ("item choice starts after battle 3") — kingdom SWITCHES.md
// openingLaterRewards; the Cathedral's row came with its engine encounter (kingdom.opening-run-six, openingCathedralReward).

import { omitDisabled } from './disable.js'

/** What a won battle offers: nothing, the standing one-of-three draw, or one item that a hero of one of `takers` carries. */
export type EncounterOffer =
  | { readonly kind: 'none' }
  | { readonly kind: 'draw' }
  | { readonly kind: 'item'; readonly itemId: string; readonly takers: readonly string[] }

export type EncounterRewardRow = {
  /** The engine encounter this row pays for — the Engagement's id. */
  readonly id: string
  readonly encounterId: string
  /** Each deployed hero who lives gains exactly this, whatever the outcome — the Reckoning's formula and MVP replaced. Absent: the formula. */
  readonly xp?: number
  readonly offer: EncounterOffer
  /** Does fighting it fatigue — the post-battle absences roll and the Week's fought list? */
  readonly fatigues: boolean
  /**
   * kingdom.opening-loop-three: is a lost one fought again? A replayed battle lost ends nothing and advances nothing — the
   * same battle is offered again, with the same party. DECISIONS.md 2026-09-28 'answers to the 22 questions': "Any of
   * these six battles, you replay it if you lose it."
   */
  readonly replayed: boolean
  readonly source: string
}

const RAW: readonly EncounterRewardRow[] = [
  { id: 'encounter.opening.orphanage', encounterId: 'encounter.opening.orphanage', xp: 20, offer: { kind: 'none' }, fatigues: false, replayed: true,
    source: "DECISIONS.md 2026-09-28 'the Orphanage pays 20 XP no matter what'; KINGDOM-V2 'Battle 1 has no additional reward beyond its hero progression'" },
  { id: 'encounter.opening.lumberjack', encounterId: 'encounter.opening.lumberjack', offer: { kind: 'item', itemId: 'item.longsword.flaming', takers: ['class.warrior', 'class.paladin'] }, fatigues: false, replayed: true,
    source: "DECISIONS.md 2026-09-28 'Battle 2 should be getting a flaming sword' · 'it only is going to help the paladin or the warrior' · 'the standard tier-3 Flaming Longsword'" },
  { id: 'encounter.opening.bridge', encounterId: 'encounter.opening.bridge', offer: { kind: 'draw' }, fatigues: false, replayed: true,
    source: "DECISIONS.md 2026-09-28 'On battle 3, which is the bridge, we should be giving another reward'; KINGDOM-V2 'item choice starts after battle 3'" },
  { id: 'encounter.opening.cavern-trail', encounterId: 'encounter.opening.cavern-trail', offer: { kind: 'draw' }, fatigues: false, replayed: true,
    source: "KINGDOM-V2 'item choice starts after battle 3'; DECISIONS.md 'wounds apply, fatigue does not'" },
  { id: 'encounter.opening.gates', encounterId: 'encounter.opening.gates', offer: { kind: 'draw' }, fatigues: false, replayed: true,
    source: "KINGDOM-V2 'item choice starts after battle 3'; DECISIONS.md 'wounds apply, fatigue does not'" },
  // kingdom.opening-run-six: battle 6 joined the engine (encounter.opening.cathedral); paid as battles 4 and 5 are
  // (kingdom SWITCHES.md openingCathedralReward)
  { id: 'encounter.opening.cathedral', encounterId: 'encounter.opening.cathedral', offer: { kind: 'draw' }, fatigues: false, replayed: true,
    source: "KINGDOM-V2 'item choice starts after battle 3'; DECISIONS.md 'wounds apply, fatigue does not' · 2026-10-01 'there should be battle rewards, experience points, levels, and equipping inside of our sixth loop'" },
]

export const ENCOUNTER_REWARDS: readonly EncounterRewardRow[] = omitDisabled(RAW)

/** The row for an Engagement, or null — an Engagement without one is paid as any battle is. */
export function encounterRewardOf(engagementId: string): EncounterRewardRow | null {
  return ENCOUNTER_REWARDS.find((r) => r.encounterId === engagementId) ?? null
}
