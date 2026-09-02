// The kingdom's switches — every value here is a question nobody has answered,
// with the default that runs today. The questions are in ../SWITCHES.md; this
// file is the numbers. A value with a stated owner is NOT a switch and does not
// belong here — it belongs in the row that owns it, with the citation.

export const SWITCHES = {
  /** wound.fromDowned — the wound level a hero who went down and lived carries out of the slice's battle. */
  woundFromDowned: 1,
  /** salvage.perConquest — Salvage paid by a first Conquer. THE-KINGDOM.html's worked Week models 10; soft. */
  salvagePerConquest: 10,
  /** battle.supplies / battle.faith / battle.mana — what a won Engagement of any kind pays. THE-KINGDOM.html's worked Week: 6 · 4 · 3; soft. */
  battleSupplies: 6,
  battleFaith: 4,
  battleMana: 3,
  /** recruit.faith — what a recruit costs. Faith recruits (Law 18); the amount is unsaid (a reroll is 10). Soft. */
  recruitFaith: 10,
  /** gates.waived — building node gates (3 Mines, 1 Wellspring…) cannot be met on the four-Territory slice map; THIN-SLICE-REVIEW.md §G2: "waived or scaled". Waived. */
  buildingGatesWaived: true,
  /** shop.supplies — what one item on the Forge's shelf costs. Gear is unpriced (blocker 4); soft. */
  shopSupplies: 6,
  /** heal.faith — Field Surgery, "7 Faith to heal a wounded hero on the spot" (7-KINGDOM-NOTES.md:189, Andrew). */
  healFaith: 7,
  /** defend.chancePerTerritory — the weekly defend roll, per owned Territory. RULED 6% (THIN-SLICE-REVIEW.md §G2) — kept here only because the ruling itself says "Soft". */
  defendChancePerTerritory: 6,
  /** engagements.perStage — how many Engagements one Stage may put in front of you in a Week. "A hero does exactly one thing per Week" implies one; not literally ruled. */
  engagementsPerStage: 1,
  /** sanctuary.lostDefenceSupplies — what a failed defence of the Kingdom Territory costs, in Supplies. Unruled; soft. */
  sanctuaryLostDefenceSupplies: 5,
} as const
