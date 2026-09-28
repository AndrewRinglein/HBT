# engine — handoff 2026-09-28 07:56

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next content.mage-staff, 204 of 232 landed · 3 await review · 1 pending
Now: planning — the opening loop and V2 weapons, designed (no code). After landing fix.raise-range (d8030cc) and fix.surge-spend (9e5d05e, flagged) earlier this chat, Andrew ruled the next target: a playable loop through the opening's six battles; every other Kingdom stage postponed. All rulings verbatim in DECISIONS.md 2026-09-28. Weapons: the V2-SHIELDS-AND-WEAPONS sixth-pass dictation (counterattack, special free attacks = basic attack at -20 with no stamina and the attack of opportunity changed to it, fend, Strength 7 giant weapons, sweeps, flails ignoring Block, shields tower/round/kite/knight plus iron versions, tier-2 enchantments, tier 3-6 custom weapon series, relics, bloodrunes, trinkets) is approved for now in the Armory Ledger artifact, revisited at balance. The six battles: Orphanage, Lumberjack House, Bridge, Cavern Trail, Gates, Cathedral, each on its own map at its own size; Claude's per-hex ground letters in assets/battle-atlas/opening-ground-proposal-2026-09-28.json, checked by Andrew in the Abbotown Ground Check artifact; cursed ground gives 1 Weak on entering and at end of activation on it. All six encounters defined in assets/battle-atlas/ENCOUNTER_DESIGN_CONCEPT.md 2026-09-28 (meteor fall on the Hunt, curse strikes on Gates, Necromancer raising two a turn in the Cathedral). content.mage-staff unblocked (armored Codex enemies). Tried: nothing abandoned. Noticed: the gate's kill switch skips probe ids without a dot (test-surge-*); none of the six maps is combat-compiled yet (only the three dungeon Atlas areas are); large scene GLBs cannot be staged to the cloud, so Bridge, Cave and Cathedral have no top-down render; the git lock shim was recreated at $HOME/bin/git. Next: cut the opening loop into backlog items across engine, content and kingdom.
New chat with Heroes of Blight and Tragic — engine: cut the opening loop into build items
  start engine
Last landing: 2026-09-28 03:47 (fix.surge-spend). Previous chat ended: on a wrap, 2026-09-28 07:56
WRAP NOT COMMITTED: 2026-09-28 07:56 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: planning — the opening loop and V2 weapons, designed (no code). After landing fix.raise-range (d8030cc) and fix.surge-spend (9e5d05e, flagged) earlier this chat, Andrew ruled the next target: a playable loop through the opening's six battles; every other Kingdom stage postponed. All rulings verbatim in DECISIONS.md 2026-09-28. Weapons: the V2-SHIELDS-AND-WEAPONS sixth-pass dictation (counterattack, special free attacks = basic attack at -20 with no stamina and the attack of opportunity changed to it, fend, Strength 7 giant weapons, sweeps, flails ignoring Block, shields tower/round/kite/knight plus iron versions, tier-2 enchantments, tier 3-6 custom weapon series, relics, bloodrunes, trinkets) is approved for now in the Armory Ledger artifact, revisited at balance. The six battles: Orphanage, Lumberjack House, Bridge, Cavern Trail, Gates, Cathedral, each on its own map at its own size; Claude's per-hex ground letters in assets/battle-atlas/opening-ground-proposal-2026-09-28.json, checked by Andrew in the Abbotown Ground Check artifact; cursed ground gives 1 Weak on entering and at end of activation on it. All six encounters defined in assets/battle-atlas/ENCOUNTER_DESIGN_CONCEPT.md 2026-09-28 (meteor fall on the Hunt, curse strikes on Gates, Necromancer raising two a turn in the Cathedral). content.mage-staff unblocked (armored Codex enemies). Tried: nothing abandoned. Noticed: the gate's kill switch skips probe ids without a dot (test-surge-*); none of the six maps is combat-compiled yet (only the three dungeon Atlas areas are); large scene GLBs cannot be staged to the cloud, so Bridge, Cave and Cathedral have no top-down render; the git lock shim was recreated at $HOME/bin/git. Next: cut the opening loop into backlog items across engine, content and kingdom."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: content.mage-staff [content · numbers]
Delegate: content.mage-staff [content · numbers] — not yet gated
Calls since last wrap:
  aiSightLegality · 2026-09-28 · Does a hidden unit stop being a legal target for everyone, or only drop out of the AI's view?
  ignoresZocOnThePower · 2026-09-28 · Is "ignores ZoC" a property of the unit or of its movement power?
  ignoresZocRowName · 2026-09-28 · The Codex had no power row for the hounds' walk. What is it called?
  ignoresZocWalkCopiesMove · 2026-09-28 · Its stamina, cooldown and costs?
  ignoresZocPathOnly · 2026-09-28 · Can a sidestep or a flight carry ignoresZoc?
  ignoresZocLogs · 2026-09-28 · What does the log say when a walk ignores a zone?
  ignoresZocCharge · 2026-09-28 · Does a charge's walk read the property?
  stealthNoClock · 2026-09-28 · How long does stealth last?
  stealthStacking · 2026-09-28 · Stealth applied to a unit already in it?
  stealthFlags · 2026-09-28 · One flag or several?
  stealthPowerAim · 2026-09-28 · "Cannot be targeted by an attack" — may a power be aimed at a stealthed foe?
  stealthOwnSide · 2026-09-28 · May its own side still aim at it (a heal on a stealthed ally)?
  stealthReaction · 2026-09-28 · Attacks of opportunity?
  stealthBreakMoment · 2026-09-28 · When, inside an attack, does it break?
  stealthBurst · 2026-09-28 · A burst: attack or power?
  stealthMovement · 2026-09-28 · "Moving never breaks it" — what about a movement power (Blink, Shadow Dance's walk) or a power used in the movement slot?
  stealthRevealShape · 2026-09-28 · What is a reveal effect in the engine, and where is its radius?
  stealthRevealSide · 2026-09-28 · Does a reveal break its caster's own side's stealth?
  stealthBrokenLog · 2026-09-28 · What does the log say when it breaks?
  stealthMoveOntoHex · 2026-09-28 · COMBAT-DESIGN.md 265: "Attempting to move onto its hex stops the movement: 'You moved into a hidden object.'"
  surgeSpendFloorsAtZero · 2026-09-28 · A Surge that happens below 100 — take away 100 below zero, or stop at 0?
  surgeRelinkReadsLeftover · 2026-09-28 · Does a second Surge check in the same Activation check the leftover?
  surgeAutomaticNoRoll · 2026-09-28 · "Automatically … a surge activation" — is a roll still drawn at 100 or more?
  surgeAmountEvents · 2026-09-28 · How do the events show the amount before and after?
Stack for content.mage-staff:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (6da1774)

- 44fa002 2026-09-28 07:37 ruling 2026-09-28 (Andrew): Cathedral - Necromancer raises two per turn, two Skeletons, Skeleton Archer on the altar, two Ghouls turn 5, raised bodies keep their cursed ground; Gates curse strikes fall like the meteors (3 Weak, cursed ground); no Gates turn limit
- b04e616 2026-09-28 07:33 ruling 2026-09-28 (Andrew): no cut-off passable hexes (Orphanage 0,8 and 0,10; Lumberjack 0,2 become dense forest); Lumberjack and Wife start in column 13 on the road
- cf0fcc0 2026-09-28 07:30 ruling 2026-09-28 (Andrew): battle 5 Gates uses the old Curse encounter; battle 6 Cathedral has a Necromancer raising the remains; the rest of the Cathedral is open
- fcda139 2026-09-28 07:26 ruling 2026-09-28 (Andrew): meteor fall is the Hunt's (Cavern Trail) - areas become burning ground, 2 fire damage and 2 Burn to any unit in them, placed at random weighted to the middle with a movable centre hex; the Orphanage has no turn limit
- 1f4caf2 2026-09-28 07:22 ruling 2026-09-28 (Andrew): a Turn 4 meteor fall - seven 7-hex areas marked at the end of the Enemy Phase, landing after the next Player Phase as burning ground, damage and Burn
- 3acc2ab 2026-09-28 07:20 ruling 2026-09-28 (Andrew): battle 2 final schedule (turn 4 cut); Schoolhouse gone; battle 3 Bridge - four Imps, Fire Imp t2, Imp t4, Fire Imp t5, no time limit; battle 4 Cavern Trail is the Hunt - 3 Bloodhounds, 1 Hellhound, 4 Zombie Hounds behind t4, Werewolf from the cave t7
- ffe83fb 2026-09-28 07:19 ruling 2026-09-28 (Andrew): a civilian dying does not fail the battle; battle 2 starts three Zombies on the east edge, Lumberjack and Wife six hexes in on the trail
- 048028a 2026-09-28 07:17 ruling 2026-09-28 (Andrew): battle 1 Orphanage - two Zombies from the east edge, Orphan Child and School Teacher beside the orphanage, no retreat, Zombie arrivals turn 4 and 5; battle 2's Lumberjack and Wife are two units
- d58d141 2026-09-28 07:09 ruling 2026-09-28 (Andrew): cursed ground gives 1 Weak on entering and at end of activation on it; cave mouth enterable, no deeper; bank boulders low cover; Orphanage water is ordinary water, Bridge and Cavern rivers too deep
- 7499d97 2026-09-28 06:52 ruling 2026-09-28 (Andrew): opening maps at their own size; Gates is abbotown-gate-painted; Claude assigns ground types with a lettered preview; battles 1 and 2 are clear-the-map
- b6cc781 2026-09-28 06:42 ruling 2026-09-28 (Andrew): the Armory Ledger approved for now, revisited at balance
- 4a106c3 2026-09-28 06:41 ruling 2026-09-28 (Andrew): two trinkets - a free-use power granting Counterattack, and one granting Fend, until the end of your next turn (1 Stamina, cooldown 7) - verbatim
- e822582 2026-09-28 06:40 ruling 2026-09-28 (Andrew): custom weapons are series across base weapons (tiers 3-6, reward pulls); named tier-2 weapons stay tier 2; the battle-2 reward is the tier-3 Flaming Longsword; two new relics with tier-2 versions; five new bloodrunes - verbatim
- 95eaf1c 2026-09-28 06:37 ruling 2026-09-28 (Andrew): the opening's six battles - Orphanage, Lumberjack House, Bridge, Cavern Trail, Gates, Cathedral; each has its own designed hex map
- 2a9d273 2026-09-28 06:26 ruling 2026-09-28 (Andrew): answers to the 22 weapon/opening questions, verbatim - counterattack one name, set off by being attacked, once per enemy action; special free attacks one rule (basic attack, no stamina, -20), AoO changed to it; fend; longsword power; weapon conveyances; shields; iron versions; tiers 3-6 are custom weapons; the opening replays losses, wounds not fatigue, four civilians
- 41e6f80 2026-09-28 06:15 ruling 2026-09-28 (Andrew): Kingdom waits behind a playable loop through the opening's six battles; every other Kingdom stage postponed. Weapon dictation recorded in V2-SHIELDS-AND-WEAPONS sixth pass.
- 9a22773 2026-09-28 05:04 ruling 2026-09-28 (Andrew): content.mage-staff runs against the Codex's armored enemies - 'One, yes.' DECISIONS.md entry; the backlog item drops needs unit.brute (closed as superseded 2026-09-23) and names the armored rows. Status untouched.
- a640c5b 2026-09-28 05:01 ruling 2026-09-28 (Andrew): a Surge below 100 stops at 0 - 'yes, surge should stop at zero if it goes negative.' DECISIONS.md entry; SWITCHES.md surgeSpendFloorsAtZero answered (on, as built by fix.surge-spend). No code change.
- 3814a5e 2026-09-28 04:09 wrap: fix.raise-range and fix.surge-spend — two rulings of 2026-09-27. fix.raise-range landed d8030cc (backlog 3883bf4, content 4bb0ae6), clean: mkenginepack compiles the Necromancer's Raise with its

## Next chat

New chat with Heroes of Blight and Tragic — engine: cut the opening loop into build items
```
start engine
```
