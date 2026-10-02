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

## V2 R7 — aiming an attack at a prop in the sandbox (2026-09-24)

Engine v2.prop-attack (e049b15, COMBAT-V2 §12.2 "Props can be targeted directly"): an attack
with Destroy may be aimed at a prop's hex as the action `{ hex }`. `src/core/sandbox.ts`
(`sandboxChoices`), `src/ui/sandbox.ts` (label, board click), the door `src/engine.ts`
(`propAttackHexes`, read-only). Probe `test/sandbox-prop-attack.test.ts` (red 2 of 3,
prop-attack-red.log; green 3 of 3). The shared viewer folds the events (viewer 5188c1d).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `sandboxPropAims` | Where do prop hexes appear? | **After the unit targets, in the same Aim list, one per hex the engine's `propAttackHexes` lists, per open slot**, labelled `Prop at hex N (col, row)`; a board click on that hex picks it, as for a burst centre. | The engine lists and validates (Law 2); the host only labels. | provisional — 2026-09-24 |
| `sandboxPropForecast` | What forecast does a prop aim show? | **None** (`preview: null`): the blow always connects and deals no damage (engine propAttackConnects); the log's prop.struck / prop.damaged lines say what happened. | There is no engine forecast for it to copy. | provisional — 2026-09-24 |
| `sandboxPropNoHero` | No sandbox hero carries Destroy yet. | **The aims appear only when a fielded hero's attack does;** the probe fields the engine's TEST Chopper through the same sandbox functions. No hero is given Destroy here. | Destroy on campaign gear is content (R12), not the host's to invent. | provisional — 2026-09-24 |


## viewer.play-input — the mouse on the battle screen (2026-09-30)

Engine backlog viewer.play-input (PLAYABLE-OPENING-PLAN.md item 7); ruled 2026-09-29, engine DECISIONS.md "the playable
battle screen" (click a hero to act; actions from the action bar; click a hex for a ghost, click again to confirm;
right-click steps back; the panel shows whoever was clicked last; ZoC hatching and the path preview) and "the playable
screen: the acting mark, pointing at an enemy, the forecast" (with nothing chosen, pointing at an enemy lights up where
it can move and hit; with the hero selected an arrow follows the pointer and whatever it is over shows its forecast).
`src/ui/play-input.ts` (the play input), `src/ui/sandbox.ts` (wired to the shared viewer's `setPlay`/`onPlay`), the
door `src/engine.ts` (forecastFrom, previewFrom, threatOf, zocHoldersAt — read-only). Probes `test/play-input.test.ts`,
`test/sandbox-play-ui.test.ts` (tools/play-input-probe.mts, tools/sandbox-play.verify.mjs) and engine
`test/play-input.test.ts`. The viewer's half is viewer SWITCHES.md "viewer.play-input".

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `playInputDefaultMove` | With a hero clicked and nothing chosen on the bar, what does a hex click do? | **Plan the hero's first move that has a legal hex in the MOVEMENT slot** (its reach is lit as soon as it acts). A move spent as the primary (a second move) is chosen on the bar. | UI-BUILD-NOTES §5 step 1, "Select a unit → reachable ground highlights"; "Order is fixed: a move, then a primary action". Spending the primary on a walk by default would end the activation unasked (rule.primary-ends-activation). | provisional — 2026-09-30 |
| `playInputConfirm` | What confirms? | **A second click on the same thing: the ghost's hex walks there; a target clicked once is aimed (the arrow stays on it), clicked again it fires.** No confirm button, no double-click. | UI-BUILD-NOTES §5 "Confirm", preference 1: "Second click on the target confirms. Click to aim, click to fire — zero new verbs." | provisional — 2026-09-30 |
| `playInputBack` | What does each right-click take back, and what when there is nothing? | **The aimed target, then the ghost, then the chosen action — one per press; with nothing left it does nothing** (a begun activation is the engine's; there is no command to un-begin it). Esc is the same. | UI-BUILD-NOTES §5: "First press clears the target. Second clears the move and phantom." The chosen action is the next stage down. | provisional — 2026-09-30 |
| `playInputWalkThenAct` | Ghost placed, attack confirmed: what if the walk goes wrong? | **The walk is sent first; the attack only if the hero arrived on the ghost's hex and the engine's forecast from there is the one shown. Otherwise the walk stands and the player is told ("The walk ended short of the ghost; choose again." / "The forecast changed on the way; look again before you confirm.").** | The ghost's forecast walks on as if every attack of opportunity missed (engine SWITCHES plannedHexProvokes); a hit stops the walk, and firing a different attack than the one shown would break "the forecast shown equals what lands". | provisional — 2026-09-30 |
| `playInputNotch` | Where does the notch on the target's Health bar sit? | **At the target's Health less the HP each packet of preview()'s `packetsOnHit` would take (their `applied`, from the ghost previewFrom's); the skull when that reaches 0.** The numbers beside the arrow are preview()'s `hitChance` and `damageOnHit` — the ones attack.declared carries. | The engine's preview names the HP each packet takes and nothing more; the sum of the engine's own per-packet numbers is the only arithmetic, and the probe checks it against damage.applied's `hpAfter` on every hit. | provisional — 2026-09-30 |
| `playInputPowers` | A power, burst or blow at a prop is chosen: what is shown? | **Its legal targets (the engine's action list, from the ghost too) and the arrow; no numbers** — the forecast numbers are drawn for attacks only in this item. Bursts keep the dropdown's footprint forecast. | preview() is the attack forecast the ruling names ("hit chance, damage, the notch or skull"); previewPower and previewBurst have other shapes, for a later look. | provisional — 2026-09-30 |
| `playInputThreatWho` | "Pointing at an enemy" — which units? | **Any standing unit not on the heroes' side** (not the encounter's civilians), while nothing is chosen on the bar — in the Hero Phase whether or not a hero is acting. | The ruling says "an enemy"; civilians are the heroes' side. | provisional — 2026-09-30 |
| `playInputOpenOn` | How does Andrew open battle 1 straight onto the board? | **`BATTLE-SANDBOX.html?play=<encounter id>&heroes=<hero id>,…`** fields that encounter at once; without it the page opens on the setup form as before. | The plan's target is "played on a local server"; the dropdowns are retired for these battles in viewer.play-chrome. | provisional — 2026-09-30 |

## viewer.play-chrome — End Turn, End activation, the dropdowns retired (2026-09-30)

Engine backlog viewer.play-chrome (PLAYABLE-OPENING-PLAN.md item 8: "End Turn with its pop-up, 2× speed, battle log; the
Sandbox's dropdowns retired for these battles"); ruled 2026-09-29, engine DECISIONS.md "the playable battle screen" (End
Turn ends the Player Phase, the pop-up when a hero has not acted, the phase ends by itself when all have; no End
Activation click after a non-free primary). `src/ui/play-input.ts` (`ending()`, the `end-turn` / `end-activation`
inputs), `src/ui/sandbox.ts` (the ending handed to the viewer; the board-only battle), the door `src/engine.ts`
(heroesYetToAct, read-only). Probes `test/play-chrome.test.ts` (tools/play-chrome-probe.mts — battle 1 start to finish
from the screen), `test/sandbox-chrome-ui.test.ts` (tools/sandbox-chrome.verify.mjs, the built page) and engine
`test/play-chrome.test.ts`. The viewer's half (the buttons, the pop-up, 2×, the log) is viewer SWITCHES.md
"viewer.play-chrome".

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `playChromeEnding` | When are End Turn and End activation offered, and with whose list? | **End Turn whenever the engine's `validateBattleCommand` would take `end-player-phase` now, with `heroesYetToAct` (as unit ids) for the pop-up; End activation whenever it would take `end-cycle` from the human hero acting.** Nothing while the resolved actions play, after a fault or at the outcome (the plan facts are withdrawn, as before). | Every legality from the engine (Law 2); the query was built for this pop-up (engine command.end-player-phase). | provisional — 2026-09-30 |
| `playChromeBoardOnly` | Which battles are "these battles", and which controls go? | **Every encounter battle (a `?play=` battle or the Encounter control) — every sandbox encounter is an opening one (content/sandbox.ts `SANDBOX_ENCOUNTERS`). Gone: the hero, action, target and swap dropdowns, Activate hero, Execute and the sandbox's End activation; kept: the heading, the marked-fall note, errors, "Show current state" while actions play, the board help, the setup form and Save/Replay.** A free (Atlas) battle keeps every control. | The plan names the opening battles (`map.opening.*` / `encounter.opening.*`); the free battles are the testing bench the dropdowns serve. | provisional — 2026-09-30 |
| `playChromeSwapLeftOut` | The swap dropdown goes with the others: how does a hero swap in battle 1? | **It does not, in this item.** Every opening hero is offered a swap (at least "Nothing in hand"), but the ruled screen has no swap control; it is a named gap for a later board affordance, not kept as a lone dropdown. | "The Sandbox's dropdowns retired for these battles"; the opening's heroes start holding their kit. | provisional — 2026-09-30 |
| `playChromeVerifyTurns` | The encounter verify passed a Turn by choosing and ending each hero with the dropdown and End activation, now retired. | **It passes a Turn with the screen's End Turn, the pop-up answered** (tools/sandbox-encounter.verify.mjs; Law 10 reason at the lines). The heroes still do nothing; each forgone hero runs its End of Activation ladder (engine SWITCHES forgoneActivationRunsLadder). | The controls it drove no longer exist for encounter battles; End Turn is the ruled way to pass a Phase. | provisional — 2026-09-30 |

## Campaign afflictions enter battle — 2026-09-30

The user's transformation ruling requires existing afflictions to survive deployment. `makeBattleState` copies each deployed hero's persistent badges in deployment order, and `battleOptionsOf` passes them through the engine's existing `heroBadges` seam. No afflictions are granted by presentation. Empty unaffected deployments retain their previous options shape. Probe: `test/affliction-fielding.test.ts` (red: missing heroBadges; green: engine fielded units retain the proper badges).

Only badge IDs recognized by the engine's read-only `BADGES` registry cross this seam; campaign-only story badges such as `badge.responsible` stay on the campaign hero. Filtering also applies to restored EngagementSpecs. The expanded probe first reproduced the story-badge regression, then passed alongside all 39 ISC047 quest tests after the correction.

## viewer.battle-full-screen — the battle is its own screen (2026-09-30)

Andrew (engine DECISIONS.md 2026-09-30 "the battle is its own full screen; End Turn and End Activation lower right; a red
targeting arrow"): "I want a fucking battle. It should be full screen. How can I experience this if you've got one screen
that is both your launcher and your battle?" `src/ui/sandbox.ts` has two views; `src/ui/battle-surface.ts` takes
`layout.fill`. Probes `test/sandbox-full-screen-ui.test.ts` (tools/sandbox-full-screen.verify.mjs, the built page) and
engine `test/battle-full-screen.test.ts`. The viewer's half (End Turn and End activation in the corner, the red arrow) is
viewer SWITCHES.md `playChromeHome` and `playLook`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `battleViewWhich` | Which battles open as their own full-window view? | **Every encounter battle — a `?play=` battle, or Start with an Encounter chosen.** A free (Atlas) battle keeps the launcher page with its dropdowns and Execute. | The ruling is about the opening's battles, which are the encounter battles (playChromeBoardOnly); a free battle is played with the launcher's own controls, which live on the launcher page. | provisional — 2026-09-30 |
| `battleViewFit` | How does a 1920x1080 battle fill a window of another shape? | **Scaled to the largest size that fits the window whole — up as well as down — and centred; the rest is the screen's own black.** Nothing is cropped and nothing scrolls. | "Full screen": the whole battle screen is always visible; stretching would distort the hexes and cropping would hide the panel or the bar. | provisional — 2026-09-30 |
| `battleViewSays` | What of the sandbox's own text shows in the battle view? | **Only what must be said: an error, a stopped battle, or the outcome** — the commands box, floated over the battle, with "Back to the launcher" at the outcome. The heading, the help line and "Show current state" do not show; the screen's own top bar names the Turn and Phase. | "No launcher text"; Law 9 still holds — a failure is never hidden. | provisional — 2026-09-30 |
| `battleViewLauncher` | How does one get from the battle to the launcher and back? | **A small Launcher button at the window's top right; the launcher shows "Return to the battle" while an encounter battle is in progress, and hides the board.** Save and Replay are in the launcher. | "The launcher stays a separate view": it is reachable, but not on the battle screen. | provisional — 2026-09-30 |

## kingdom.play-launcher — the game launcher at /play (2026-09-30)

Engine backlog kingdom.play-launcher; ruled 2026-09-30, engine DECISIONS.md "the game plays from a link" ("Local link on
this PC"; "Make me a game launcher where I can play the various battles"). `tools/build-launcher.mjs` → `PLAY.html`;
`../tools/battle-atlas/serve.mjs` (`/play`); probes `tools/play-launcher.verify.mjs` and engine `test/play-launcher.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `launcherAddress` | Which link? | **http://127.0.0.1:4230/play** — the server the battles already need (tools/battle-atlas/serve.mjs) answers `/play` with `kingdom/PLAY.html`; `/` stays the Battle Atlas. | One short address on the one server; nothing else moves. | provisional — 2026-09-30 |
| `launcherBattles` | Which battles, in what order? | **Every encounter the sandbox may play (`SANDBOX_ENCOUNTERS`), in the opening's order (the engine scenario's `openingPosition`)**, each card opening `BATTLE-SANDBOX.html?play=<id>` with the sandbox's default heroes; then a free battle (the sandbox's own setup) and the recorded battles (`viewer/BATTLE-VIEWER.html`). | The sandbox's list is the playable one; a new encounter appears on the next build. | provisional — 2026-09-30 |
| `launcherCard` | What does a card say? | **Battle N, the name, the foes (the engine's units, counted, with how many arrive later) and who to protect (its civilians)**, over its 3D map's review render (`<scene>/review.png`, else the scene family's `review/<scene>.png`, as the opening ground proposal names the scene). A battle not yet on its 3D map in the battle screen says so on its picture ("flat board for now"). | Facts from their owners; the picture is the map's own render. | provisional — 2026-09-30 |

## kingdom.civilians-played — the civilians are the player's (2026-09-30)

Engine backlog kingdom.civilians-played; ruled 2026-09-30, engine DECISIONS.md "the civilians are played; no 2D before the
3D bodies" ("There's no movement for the child when I click on it"; 2026-08-26 "Civilians are exactly like heroes").
`src/core/sandbox.ts` (playerPolicy); probes `tools/sandbox-civilians.verify.mjs` and engine `test/civilians-played.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `civiliansPlayed` | Which units does the player play? | **Every unit fielded on the heroes' side at the battle's start — the drafted heroes and the encounter's civilians** (a new battle and a restored save alike). A civilian that arrives by schedule later is the AI's (none does in the opening's four). | The ruling; arrivals are not yet asked about. | provisional — 2026-09-30 |

## viewer.caravan-scene — 2026-10-01

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `sandboxCaravan` | May the caravan aftermath be played from the sandbox and the launcher? | **Yes — `SANDBOX_EXTRA_ENCOUNTERS` names it beside the opening's battles;** it has no place in the opening, so its launcher card says "Encounter" and comes after them. | Ruled 2026-10-01 (engine DECISIONS.md "the caravan's fight"): "so it can be played in the sandbox". | provisional — 2026-10-01 |
| `launcherCaravanPicture` | The caravan has no `review.png`. Its card's picture? | **`review-tactical-surroundings.png`** — the accepted presentation's render, which the scene's `production.json` presentationRevision records. | The picture is the map's own render (launcherCard). | provisional — 2026-10-01 |

## the battle controls — 2026-10-01

Andrew (engine DECISIONS.md 2026-10-01): "You're supposed to select your movement type. It's okay if it's the top one by default.  Then you can't target without an ability selected. … the red arrow should only extend as far as whatever its range is." · "the special move Devotion for the priest did not work. I can't double-click on it or anything to make it trigger."

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `playInputAimReach` | When is the aim arrow drawn, and how long is it? | **Only with an action chosen on the bar** (none drawn otherwise, movement spent or not). **It ends at the pointer when the pointer is within the action's reach — an attack's is the engine's `actionReach` (its reachOf read from where the hero would stand; engine fix.aim-reach), anything else its row's range — else at the hex within that reach nearest the pointer** (the farther of a tie, then the lower id). An attack may be chosen with nothing in reach: its arrow still shows its reach, the note says so, right-click takes it back. | The ruling; "nothing in reach" used to refuse the choice, which left no way to see the reach. | provisional — 2026-10-01 |
| `playInputStandStill` | A movement power that goes nowhere (Devotion: its only legal use is the hero's own hex)? | **Chosen on the bar it is planned at once on the hero's own hex, with the note "Devotion: click it again, or the hero, to use it."; chosen again, or the hero clicked, it is used.** | The plan-then-confirm of every other move, with nothing to aim at; the old path (click the hero's own hex under its body, twice, nothing shown) was invisible. | provisional — 2026-10-01 |

## viewer.xcom-camera — 2026-10-01 (the queue)

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `playQueueProposal` | "One character is auto-selected": begun by the engine, or proposed? | **Proposed (src/ui/play-input.ts `proposal()`): shown and centred, never begun on its own; its first order — a click on it, or an action on its bar — runs `select-activation`, then the action.** | The engine has no command to take a begun activation back, and beginning runs its start (beginActivation); a double-click to change it must still be possible. | Default |
| `playQueueOrder` | Which order is "the character bar, left to right"? | **Ascending unit id among the heroes the engine lets begin (sandboxActivationChoices), civilians included; after an activation ends, the next to the right of the one that acted, round to the left end.** | viewer.unit-card-bar's bar is the board's unit order until it lands (the backlog note). | Default |
| `playQueueClick` | What does a single click on another hero do while one is proposed? | **It only looks at it (the panel and portrait); a double-click (`choose`) makes it the next; a click on the proposed hero begins it.** | "Double-click a character … to change it." Before this, a click on any hero began it. | Default |

## movement.swap-and-shields — the swap and the shield powers on the board (2026-10-01)

Engine DECISIONS.md 2026-10-01 'the movements' (Andrew: "weapon swap and shield actions are part of what's needed now").
Probe: engine `test/movement-swap-and-shields.test.ts` over `tools/swap-shields.verify.mjs` (the built sandbox played through
its own DOM); the play input's half: `test/swap-shields-play.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `playInputSwap` | How is the swap offered on the board? | **The play facts carry `swap: {cost, choices: [{label}], why}` — the sandbox's own `sandboxSwapChoices` (every hand list `validateBattleCommand` takes, carried order, the item names joined by " + "), the engine's `swapCostOf`, and with none to make the engine's reason; a click is `{kind:'swap', index, unit}` and runs that choice's own `swap` command. A refused click leaves the note "Swap: <the engine's reason>.". After a swap the plan (chosen action, ghost, aim) is cleared.** | One list, the one the form's swap control already shows (`sandboxSwapControl`); the host decides nothing (Law 2). A swap changes the hero's actions, so a plan made before it may name one it no longer has. | Default |
| `playInputSwapActing` | May the swap be chosen on a hero only proposed (not yet begun)? | **No — the swap is on the bar once the hero acts (a click on it, or any action on its bar, begins it).** | The engine validates a swap only for the hero acting; listing one before would mean guessing its legality. | Default |
| `playInputSelfPower` | How is a power aimed at the hero alone (the shields' Lock Shields, Raise Guard, Turn Aside, Bear Down, Cover, Stand Tall — the row's `target.select` is `self`) used from the bar? | **As `playInputStandStill`: chosen on the bar it is aimed at the hero at once, with the note "<name>: click it again, or the hero, to use it."; chosen again, or the hero clicked, it is used.** | Before, the only way was a click on the hero's own body, twice, with nothing shown — the arrow has no length from a hex to itself. | Default |
