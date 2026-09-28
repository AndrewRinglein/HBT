# engine — handoff 2026-09-28 04:09

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — queue blocked — 1 pending, every one waiting on another, 204 of 232 landed · 3 await review · 1 pending
Now: fix.raise-range and fix.surge-spend — two rulings of 2026-09-27. fix.raise-range landed d8030cc (backlog 3883bf4, content 4bb0ae6), clean: mkenginepack compiles the Necromancer's Raise with its Codex row's own range (10) instead of the constant 2; a Raise row with no range is a named gap ('content: range unstated'), never a default; corpseRaiseRadius retired; test/raise-range.test.ts reads every reach from the row; probe trigger.necromancer.raise went from 7 to 15 state changes. fix.surge-spend landed 9e5d05e (backlog 5e419cd), FLAGGED for review: a Surge takes away 100 (SURGE_COST) instead of emptying the amount; 100 or more surges without a roll (roll null, automatic); surge.checked and surge.hit carry before/after; switches surgeSpendFloorsAtZero (default on — below 100 stops at 0, so the control battles are byte-identical) and surgeRelinkReadsLeftover (default on); COMBAT-SEQUENCE Surge rung 2 rewritten; variants test-surge-labored / test-surge-swift; flagged because test/battle-cursor.test.ts gained the surge-spend fixture layer (nine cases whose heroes make Surge checks moved: event fields, and legacy-surge-cap draws no roll). Eight shards green on b33f74538f. Tried: nothing abandoned. Noticed: the gate's kill switch skipped fix.surge-spend as 'engine plumbing' because its probe ids (test-surge-*) carry no dot — run by hand, all 11 surge-spend tests fail with both rows disabled; audit-all.mjs still cannot finish in Cowork (unsharded suite); shard 1/8 timed out twice at load 5 (integration kiting test 16 s vs 15 s limit; same time before and after the change) and passed on the third run; the viewer log prints 'rolled null' for an automatic Surge; the git lock shim at $HOME/bin/git was missing again and was recreated. Next: the queue is empty — content.mage-staff waits on unit.brute, which was closed as superseded 2026-09-23.
New chat with Heroes of Blight and Tragic — engine: the queue is empty — review the three flagged landings and unblock content.mage-staff
  start engine
Last landing: 2026-09-28 03:47 (fix.surge-spend). Previous chat ended: on a wrap, 2026-09-28 04:09
WRAP NOT COMMITTED: 2026-09-28 04:09 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: fix.raise-range and fix.surge-spend — two rulings of 2026-09-27. fix.raise-range landed d8030cc (backlog 3883bf4, content 4bb0ae6), clean: mkenginepack compiles the Necromancer's Raise with its Codex row's own range (10) instead of the constant 2; a Raise row with no range is a named gap ('content: range unstated'), never a default; corpseRaiseRadius retired; test/raise-range.test.ts reads every reach from the row; probe trigger.necromancer.raise went from 7 to 15 state changes. fix.surge-spend landed 9e5d05e (backlog 5e419cd), FLAGGED for review: a Surge takes away 100 (SURGE_COST) instead of emptying the amount; 100 or more surges without a roll (roll null, automatic); surge.checked and surge.hit carry before/after; switches surgeSpendFloorsAtZero (default on — below 100 stops at 0, so the control battles are byte-identical) and surgeRelinkReadsLeftover (default on); COMBAT-SEQUENCE Surge rung 2 rewritten; variants test-surge-labored / test-surge-swift; flagged because test/battle-cursor.test.ts gained the surge-spend fixture layer (nine cases whose heroes make Surge checks moved: event fields, and legacy-surge-cap draws no roll). Eight shards green on b33f74538f. Tried: nothing abandoned. Noticed: the gate's kill switch skipped fix.surge-spend as 'engine plumbing' because its probe ids (test-surge-*) carry no dot — run by hand, all 11 surge-spend tests fail with both rows disabled; audit-all.mjs still cannot finish in Cowork (unsharded suite); shard 1/8 timed out twice at load 5 (integration kiting test 16 s vs 15 s limit; same time before and after the change) and passed on the third run; the viewer log prints 'rolled null' for an automatic Surge; the git lock shim at $HOME/bin/git was missing again and was recreated. Next: the queue is empty — content.mage-staff waits on unit.brute, which was closed as superseded 2026-09-23."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: empty
Delegate: none
Blocked: content.mage-staff needs unit.brute
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

## The chat's commits since the last committed wrap (e1ca337)

- 9e5d05e 2026-09-28 03:47 fix.surge-spend: Ruled 2026-09-27 (Andrew, DECISIONS.md 'Surge: a pool that pays 100 per
- 5e419cd 2026-09-28 03:39 backlog: fix.surge-spend names its probe and variants - test-surge-labored (Surge 10) and test-surge-swift (Surge 20), the two TEST hero rows content/test/units.json already carries (pure data), each live in showcase.surge-flight-ladder (18 and 34 log lines); the tests read each row's Surge. changesBaseline to be measured, not declared yet.
- d8030cc 2026-09-28 03:36 fix.raise-range: Ruled 2026-09-27 (Andrew, DECISIONS.md 'the Necromancer's Raise reaches
- 3883bf4 2026-09-28 03:32 backlog: fix.raise-range names its probe - trigger.necromancer.raise, the compiled Raise, live where a Necromancer fights (the Supper scenario; 17 log lines, 7 changed state before the fix) - and declares no baseline change: the control battles field no Necromancer.
- a9a0ad1 2026-09-28 02:37 wrap: capability.stealth — the stealth flag. Landed 2900fdc (backlog d16f7fa, content bad2999), clean: the Codex row status.stealth, its sentence the settled definition word for word (CODEX.md 475/158

## Next chat

New chat with Heroes of Blight and Tragic — engine: the queue is empty — review the three flagged landings and unblock content.mage-staff
```
start engine
```
