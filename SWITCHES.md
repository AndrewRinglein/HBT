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

## V2 opening quests — provisional choices, 2026-09-11

- Rescue a Civilian takes exactly three distinct eligible roster people for one Week, with zero combat risk. All three gain 3 fixed quest XP and one randomly selected ordinary civilian joins. The eligible pool is the existing three fieldable CIVILIANS rows, not every published kit.
- Each rescued reward is a fresh instance identified by the dispatched run. Repeating an archetype grants another person, with independent kit/badge/class arrays and a saved templateId for portraits. Earned rescues may exceed the paid-recruit cap; they do not consume the Week's purchased-recruit allowance.
- Recover Supplies takes an explicitly designated hero and zero to two escorts for one Week. Fixed quest rewards are 10 Supplies and 5 XP for that surviving lead only. Other hero-class escorts cannot claim that XP. A dead lead receives no fixed XP; a victorious surviving party still recovers the Supplies.
- Combat risk is 5% with zero or one escort, zero with two. Provisional encounter: map.open with two unit.zombie enemies. This is tunable encounter content, not a balance claim. Named stream keys distinguish combat, success and civilian selection. Outcomes are prepared once and saved.
- Combat retains normal surviving combat XP, MVP and victory Renown, separately from fixed quest XP. Defeat/retreat has no success reward. Quest battles do not grant generic currency loot or an item draft. The outcome picker still controls battle results and consequences; existing post-battle absence handling applies. Dungeon deferral and fatigue remain later stages.
- Due quests process in authored order: Rescue, Supplies, then retained Escort. A saved report requires acknowledgment before paying/releasing; a saved battle keeps exactly the dispatched roster and pays/releases inside applyBattleResult. Pending outcomes block entering City; completed runs cannot pay again. Quest XP that earns a level presents eligible heroes before continuing the Field.
- Escort retains two Weeks, its existing Faith reward and success odds, but now uses the same visible report acknowledgment. The original quest minimum-only requirements field is removed; staffing is the sole authority.

## V2 Block presentation — provisional wording, 2026-09-23

- **blockForecastWording** (item `v2.block-presentation`). Question: what do the sandbox forecast and the replay log call the engine's three chances? Default: `blockChance` is "Block chance"; `hitChance`, which the engine computes as accuracy *given* the attack is not blocked (V2-HANDOFF.md), is "Hit chance if not blocked"; `connectionChanceBps` is "Chance to connect", shown as a percent by moving the decimal point in the engine's basis points (7250 → 72.5%), never recomputed. The log line reads "block B% · hit H% if not blocked · connects C%". Reason: the bare "Hit chance" showed conditional accuracy as if it were the whole story. Exports older than the engine's Block fields keep the old "hit H%" line. Angela to correct the words.
- The panel shows Block and Ranged Block beside Dodge, as percentages, only for a unit that has either (innate, or from a shield's `unit.equipped` mods) — the same rule the elemental resists already follow.

## V2 R6 swap — the sandbox Swap command, 2026-09-24

The rule is COMBAT-V2-DESIGN-2026-09-07.md §11.2; engine v2.loadout-swap dd78ff1 (`swap` battle
command, canSwap inside validateBattleCommand, swapCostOf). `src/core/sandbox.ts`
sandboxSwapChoices, `src/ui/sandbox.ts` swapControl; probes `test/sandbox-swap.test.ts` and
`tools/sandbox-swap.verify.mjs` (run by `test/sandbox-swap-ui.test.ts`).

- **sandboxSwapOrder** (item V2 R6 swap UI). Question: a swap names the hands in order (first =
  right hand); which orders does the sandbox offer? Default: **one option per set of carried
  instances, in carried order (hands, then stowed)** — every set is a candidate and the engine's
  validateBattleCommand keeps the legal ones; the reversed order of the same set is not offered.
  Reason: nothing in the engine reads hand order yet, and doubling every option buries the choice.
  Provisional, 2026-09-24.
- **sandboxSwapControl** (item V2 R6 swap UI). Question: hide or disable an illegal swap? Default:
  **hidden** while choosing a hero, for anyone not human-controlled, and for a hero carrying no
  loadout; **shown disabled with the engine's own reason** ("Swap unavailable: …", the
  `illegal-swap:` prefix dropped) when the hero carries a loadout but no swap is legal (already
  swapped, primary spent, not enough stamina). The reason shown is the first refused candidate
  other than the hands already held. The button names the engine's swapCostOf. Reason: the player
  should see why the swap went away, in the engine's words (Law 2). Provisional, 2026-09-24.
- **sandboxSwapNoSpares** (item V2 R6 swap UI). Question: sandbox heroes field their standard kits,
  which stow nothing — should the setup form add a spare weapon? Default: **no**; the Swap offers
  what is carried (stow a hand item, drop to Punch, take the stowed item back at a later
  activation). Reason: a spare-weapon picker is a new setup surface and a content choice, not this
  item. Provisional, 2026-09-24.
- **instanceIsSlot** (item V2 R6 item uses, engine v2.item-uses cdb2233). Question: the kingdom has
  no item-instance ids — what is one instance? Default: **a hero's equipped slot** (index into
  `hero.equipped`); `instanceSlotsOf` maps the engine's instance ordinal (fielded, then stowed)
  to it. Reason: `equipped` is the placement list the engine's instances are numbered from; R8's
  result seam may supply stable ids and this yields. Provisional, 2026-09-24.
- **heroUsedRecord** (item V2 R6 item uses). Question: where does the save keep each instance's
  spent uses? Default: **`hero.used`, parallel to `equipped`, absent when nothing is spent**,
  written only by `applyInstanceUse` (which also adds each use to `cursor.spent`, so ISC-061's
  Waystation record and restock are unchanged in shape) and cleared by `applyRestock` as the
  Battle is left. Reason: DUNGEON-MODE 2026-09-10 "Persist … spent item instances"; the
  impact map's "per-hero spent items"; an optional field leaves every existing save valid.
  Provisional, 2026-09-24.
- **itemUsesFoldFromLog** (item V2 R6 item uses). Question: how does the result learn what each
  instance spent? Default: **folded from `charge.spent`'s `instanceId`** (the engine's
  `<uid>/<n>`, matched against the hero's own uid, loud on any other); `result.itemUses` lists only
  instances that paid; `resolveEngagement` checks the fold against the engine's own
  `BattleResult.itemUses`. The outcome panel's result carries none. Reason: the fold reads only
  the log (seam.ts); the engine's report is the Law 3 cross-check. Provisional, 2026-09-24.
- **usedBlocksUnequip** (item V2 R6 item uses). Question: may an instance with spent uses be
  unequipped? Default: **refused** until the restock clears it; equipping appends a whole slot.
  Reason: moving it to the stash would lose or launder its count. Normal play never meets it (the
  restock runs before any equip session); R11's mid-dungeon equip decides otherwise if it must.
  Provisional, 2026-09-24.
