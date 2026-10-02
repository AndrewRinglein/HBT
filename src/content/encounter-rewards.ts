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
//   2026-09-28 'answers to the 22 questions': "wounds apply, fatigue does not" — every opening battle.
// KINGDOM-V2-2026-09-07.md "Opening onboarding and rewards": "Sword after battle 2; item choice starts after battle 3";
// battle 1 has no reward beyond its hero progression.
//
// The Cathedral (battle 6) has no engine encounter yet; its row comes with it. Battles 4 and 5 are paid by the
// standing draw ("item choice starts after battle 3") — kingdom SWITCHES.md openingLaterRewards.

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
  readonly source: string
}

const RAW: readonly EncounterRewardRow[] = [
  { id: 'encounter.opening.orphanage', encounterId: 'encounter.opening.orphanage', xp: 20, offer: { kind: 'none' }, fatigues: false,
    source: "DECISIONS.md 2026-09-28 'the Orphanage pays 20 XP no matter what'; KINGDOM-V2 'Battle 1 has no additional reward beyond its hero progression'" },
  { id: 'encounter.opening.lumberjack', encounterId: 'encounter.opening.lumberjack', offer: { kind: 'item', itemId: 'item.longsword.flaming', takers: ['class.warrior', 'class.paladin'] }, fatigues: false,
    source: "DECISIONS.md 2026-09-28 'Battle 2 should be getting a flaming sword' · 'it only is going to help the paladin or the warrior' · 'the standard tier-3 Flaming Longsword'" },
  { id: 'encounter.opening.bridge', encounterId: 'encounter.opening.bridge', offer: { kind: 'draw' }, fatigues: false,
    source: "DECISIONS.md 2026-09-28 'On battle 3, which is the bridge, we should be giving another reward'; KINGDOM-V2 'item choice starts after battle 3'" },
  { id: 'encounter.opening.cavern-trail', encounterId: 'encounter.opening.cavern-trail', offer: { kind: 'draw' }, fatigues: false,
    source: "KINGDOM-V2 'item choice starts after battle 3'; DECISIONS.md 'wounds apply, fatigue does not'" },
  { id: 'encounter.opening.gates', encounterId: 'encounter.opening.gates', offer: { kind: 'draw' }, fatigues: false,
    source: "KINGDOM-V2 'item choice starts after battle 3'; DECISIONS.md 'wounds apply, fatigue does not'" },
]

export const ENCOUNTER_REWARDS: readonly EncounterRewardRow[] = omitDisabled(RAW)

/** The row for an Engagement, or null — an Engagement without one is paid as any battle is. */
export function encounterRewardOf(engagementId: string): EncounterRewardRow | null {
  return ENCOUNTER_REWARDS.find((r) => r.encounterId === engagementId) ?? null
}
