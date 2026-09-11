# Kingdom switches

The mirror of `engine/SWITCHES.md`, at the strategic altitude — created
2026-09-01 with the first switch, per `THIN-SLICE-IMPLEMENTATION.md` §10.
Ambiguity gets exposed, not decided. Each row is a question a sweep or Andrew
can answer; the default is what runs today (`src/content/switches.ts`).

**Answered switches keep their code path** so the alternative stays sweepable,
but the default freezes. **A value with a stated owner is not a switch** — if a
document names it, the row cites the document and this table never sees it.

| switch | question | default | status |
|---|---|---|---|
| `wound.fromDowned` | A hero who went down and lived — what wound level do they carry out? The Deathbed (which would decide it) is OUT of the slice; `KINGDOM-DESIGN.md` §9 names the levels (Wounded · Badly Wounded · Severe) but not the mapping. | `1` — Wounded | open |
| `defend.chancePerTerritory` | The weekly defend roll — RULED 6% per owned Territory, one roll (THIN-SLICE-REVIEW.md §G2), and the ruling itself says "Soft." Here so a sweep can move it; the default IS the ruling. | `6` | ruled, soft |
| `engagements.perStage` | After a Conquer is fought, may the same Stage offer another this Week? "A hero does exactly one thing per Week" (KINGDOM-DESIGN.md §3) and "at most one defense per Week" (§G2) both point at one; a second conquest with whoever is left is not literally ruled out. | `1` | open |
| `sanctuary.lostDefenceSupplies` | A failed defence of the Kingdom Territory "costs resources and wounded heroes instead" (SKELETON-SETTLED.md:81). Which resources, how many — unsaid. | `5` Supplies | open — soft |
| `salvage.perConquest` | How much Salvage does a first Conquer pay? Only Conquer pays it (SKELETON-SETTLED.md:104) and never twice (:108). `THE-KINGDOM.html`'s worked Week models 10 against trees of 123–270. | `10` | open — soft |
| `battle.supplies` · `battle.faith` · `battle.mana` | What a won Engagement of any kind pays in the three shop currencies (7-KINGDOM-SETTLED.md: "Quest, Defend and Conquer all pay Supplies · Faith · Mana"). `THE-KINGDOM.html`'s worked Week: 6 · 4 · 3. | `6 · 4 · 3` | open — soft |
| `recruit.faith` | What one recruit costs. Faith recruits (Law 18); a recruit *reroll* is 10 (`THE-KINGDOM.html`); the recruit itself is unpriced. | `10` | open — soft |
| `gates.waived` | Building node gates name Territory nodes the four-Territory slice map cannot supply (the Forge's 3 Mines against one). THIN-SLICE-REVIEW.md §G2: "waived or scaled." Waived; the rows keep the real gates. | `true` | ruled — slice only |
| ~~`shop.supplies`~~ → `shop.suppliesMin` · `shop.suppliesMax` | A shelf item's Supplies, rolled once per item on `cup.forge`. "Weapons and armor cost between 10 and 20 supplies" (Andrew 2026-09-02); the flat 6 is retired. | `10` · `20` | open — soft |
| `forge.tradein.result` | The trade-in's tier-up: drawn on `cup.forge` from every row a tier up, or chosen. Unsaid. | `drawn` | open |
| `forge.tradein.sameTier` | Must the three burned share a tier, or does any tier below the target count? Unsaid. | `true` | open |
| `shop.supplies` (retired) | What one item on the Forge's shelf costs in Supplies. Gear is unpriced (THIN-SLICE-IMPLEMENTATION.md §9 blocker 4). | `6` | open — soft |
| `prologue.paysRenown` | Do the opening's five battles pay Renown? `STATE.md` lists it open ("whether those battles pay Renown"); the Charter's clock is +1 per Engagement won with no exception written. | `true` | open |
| `quest.faith` · `quest.odds` | The one authored quest's pay and its chance of coming home. Quests pay Faith (7-KINGDOM-SETTLED.md); `resolveQuestOdds` is "the % on screen" (GAME-ARCHITECTURE.md §2.6); neither number is written anywhere. | `8` · `100` | open — soft |
| `seam.spareWeapons` | A weapon carried past the hands, in an item slot, still grants attacks (ruled 2026-09-02; `equip.spareGrants` in GEAR-IMPLEMENTATION.md §3). The engine's `applyItems` counts hands over every weapon handed over and refuses a third — engine gap `seam.spare-weapons`, filed 2026-09-03. Until it lands: leave the spare behind at fielding and say so on the battle screen, or hand it over and let the engine refuse? | `left-behind` | open — engine gap |
| `rewards.includeWaystation` | The reward draw deals classes at tiers (25/25/20/10/10/10; weapons and armor at 3, the rest at 1 — 7-KINGDOM-SETTLED.md 2026-09-02). May it deal a row the Waystation sells for Supplies — a potion, a torch, a one-use trinket? The ruling names classes and tiers, not shops. | `false` | open |
| `levelup.specialtyRequired` | The specialty is offered once, at the first level-up (codex `levels.rules`; GEAR-DESIGN.md §7 "specialization once at level 2"). Must it be named to take the level, or may a hero level without one and never get the offer again? | `false` — declinable | open |
| `heal.faith` | Field Surgery at the Chapel — Andrew: "maybe 7 faith to heal your hero immediately" (7-KINGDOM-NOTES.md:189). Not a switch so much as a number waiting for a sweep. | `7` | ruled, soft |

## Notes

- The XP proposal's pieces are owned, not switched: 15 − enemy phases
  (SKELETON-NOTES.md B6), 3 per kill at rank 1 (3-UNITS-SETTLED.md), +10 to
  the MVP by weighted roll (B7). Enemy rank is not on the unit rows yet, so
  every kill pays the rank-1 bounty — a gap for the content lane, not a switch.


## V2 Week spine — provisional choices, 2026-09-11

- Field and City are the two saved halves. Field saves `conquest`, `defense`, then `quests`; City services share one activity guard and may be used in any order.
- Skipping Conquest adds 12 percentage points to the existing 6% per owned Territory defense chance, capped at 100%. Attempting a Conquest counts even if it loses. The castle cannot be declined.
- One assignment per hero replaces both V1 slots. `field` and `city` remain availability query contexts, not separate capacity. Fighting can continue in the same Field half; any participation blocks City work, including recovery even if Exhausted. Undo before a battle does not mark participation.
- Noncombat work resolves when City closes. One Week of Rest clears Fatigued and Exhausted and is released at that Week boundary; it does not expire passively. Multiweek generic assignments count down at boundaries and resolve only on their last City close.
- A quest dispatched in Week N for D Weeks stays exclusive through Week N+D Conquest and Defense and resolves in that Field's quest step. Rewards and release happen together. Existing Escort report retained; new quests/encounters follow.
- Ordinary battles pull each surviving participant independently at 20%, with existing badge multipliers. A one-Week story drawn in Week N expires entering Week N+1 City, after the next Field. Existing stories all use one Week; their data now supports longer durations. Pulls merge, so another battle cannot erase an earlier absence. No pulls during the prologue in this stage.
- Fatigue rolls/stat penalties and dungeon-exit deferral remain following stages. Wound services retain interim one-level healing and old prices/durations; Prayer retains 4+1 per Abbey until the recovery/economy stage. No Farm, Delve, Gather or automatic territory Supplies income remains.
- V2 saves require the full cursor and explicitly reject V1; no cursor backfill migration is retained.
