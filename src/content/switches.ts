// The kingdom's switches — every value here is a question nobody has answered,
// with the default that runs today. The questions are in ../SWITCHES.md; this
// file is the numbers. A value with a stated owner is NOT a switch and does not
// belong here — it belongs in the row that owns it, with the citation.

export const SWITCHES = {
  /** wound.fromDowned — the wound level a hero who went down and lived carries out of the slice's battle. */
  woundFromDowned: 1,
  /** salvage.perConquest — Salvage paid by a first Conquer. Unruled; soft. */
  salvagePerConquest: 30,
} as const
