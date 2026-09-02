// The kingdom's switches — every value here is a question nobody has answered,
// with the default that runs today. The questions are in ../SWITCHES.md; this
// file is the numbers. A value with a stated owner is NOT a switch and does not
// belong here — it belongs in the row that owns it, with the citation.

export const SWITCHES = {
  /** wound.fromDowned — the wound level a hero who went down and lived carries out of the slice's battle. */
  woundFromDowned: 1,
  /** salvage.perConquest — Salvage paid by a first Conquer. Unruled; soft. */
  salvagePerConquest: 30,
  /** defend.chancePerTerritory — the weekly defend roll, per owned Territory. RULED 6% (THIN-SLICE-REVIEW.md §G2) — kept here only because the ruling itself says "Soft". */
  defendChancePerTerritory: 6,
  /** engagements.perStage — how many Engagements one Stage may put in front of you in a Week. "A hero does exactly one thing per Week" implies one; not literally ruled. */
  engagementsPerStage: 1,
  /** sanctuary.lostDefenceSupplies — what a failed defence of the Kingdom Territory costs, in Supplies. Unruled; soft. */
  sanctuaryLostDefenceSupplies: 5,
} as const
