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
  /** shop.suppliesMin / shop.suppliesMax — a shelf item's Supplies, rolled once per item on cup.forge: "weapons and armor cost between 10 and 20 supplies" (2026-09-02). Soft. */
  shopSuppliesMin: 10,
  shopSuppliesMax: 20,
  /** forge.tradein.result — the tier-up is drawn on cup.forge, or chosen from the tier above. Unsaid. */
  tradeInResult: 'drawn' as 'drawn' | 'chosen',
  /** forge.tradein.sameTier — the three must share a tier (true), or any tier below the target counts. Unsaid. */
  tradeInSameTier: true,
  /** prologue.paysRenown — do the opening's battles tick the Charter's clock? STATE.md lists it open ("whether those battles pay Renown"). Yes by default: a won Engagement is a won Engagement. */
  prologuePaysRenown: true,
  /** quest.faith — what the one authored quest pays. Quests pay Faith; the amount is unsaid. Soft. */
  questFaith: 8,
  /** quest.odds — the tutorial quest's chance of success, in whole percent. Unsaid; the slice's one quest always comes home. */
  questOdds: 100,
  /** heal.faith — Field Surgery, "7 Faith to heal a wounded hero on the spot" (7-KINGDOM-NOTES.md:189, Andrew). */
  healFaith: 7,
  /** defend.chancePerTerritory — the weekly defend roll, per owned Territory. RULED 6% (THIN-SLICE-REVIEW.md §G2) — kept here only because the ruling itself says "Soft". */
  defendChancePerTerritory: 6,
  /** V2: additional percentage points when Conquest is skipped; provisional. */
  defendSkippedConquestBonus: 12,
  /** engagements.perStage — how many Engagements one Stage may put in front of you in a Week. "A hero does exactly one thing per Week" implies one; not literally ruled. */
  engagementsPerStage: 1,
  /** sanctuary.lostDefenceSupplies — what a failed defence of the Kingdom Territory costs, in Supplies. Unruled; soft. */
  sanctuaryLostDefenceSupplies: 5,
  /** rewards.includeWaystation — may the reward draw deal a row the Waystation sells (a one-use potion, a torch)? The odds name classes and tiers, not shops; unsaid. */
  rewardsIncludeWaystation: false,
  /** rewards.hellTcgRowsOffered — may the reward draw deal the rows the item review could not class as Andrew's or a chat's (six from Hell-TCG unchanged, three relics with no known author — src/content/authored-items.ts AUTHORSHIP_UNDECIDED)? Off until he says (kingdom.rewards-only-authored, 2026-10-04). */
  rewardsHellTcgRowsOffered: false,
  /** rewards.derivedRowsOffered — may the reward draw deal a row that is not itself on his list but is MADE of rows that are: a listed base carrying a listed attribute (a tier-3 Forge row)? RULED on, 2026-10-04 (Andrew, engine/DECISIONS.md 'rewards: one of his bases carrying one of his attributes is his; …': asked "should a row made of one of your bases carrying one of your attributes count as yours" — "1 yes"; kingdom.rewards-derived-rows-offered). The other side, off — only an id on the list is dealt — is how kingdom.rewards-only-authored landed it; its code path is kept. */
  rewardsDerivedRowsOffered: true,
  /** rewards.emptyClass — a class of the odds table with no row left to deal: 'spread' rolls the card among the classes that have one, their weights kept in proportion; 'left-out' rolls the whole table and deals no card when it lands on an empty class (kingdom.rewards-only-authored, 2026-10-04). */
  rewardsEmptyClass: 'spread' as 'spread' | 'left-out',
  /** levelup.specialtyRequired — "specialization once at level 2" (GEAR-DESIGN.md §7): must the first level-up NAME a specialty, or is the offer declinable (a level taken without one passes it up for good)? Unsaid. */
  levelUpSpecialtyRequired: false,
} as const
