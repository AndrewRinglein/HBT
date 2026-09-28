# engine — handoff 2026-09-28 17:32

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next content.mage-staff, 204 of 247 landed · 3 await review · 15 pending
Now: planning — the opening loop cut into 15 backlog items (3599457), no code. Items: map.opening-six, encounter.area-fall, capability.placed-remains, fix.raise-two, content.opening-units, content.flaming-longsword, six encounter.opening.* rows, kingdom.encounter-battles, kingdom.opening-loop. Rulings this chat (DECISIONS.md 2026-09-28): the Lumberjack's Wife's stats dictated; battle 2's Undead Soldier is the existing unit.soldier (dictated block superseded); cursed ground is layer.weak, the one ground-status shape - terrain.cursed abandoned before code; a read-only whole-project review for duplicated mechanisms and content in code, in its own chat (brief engine/REVIEW-DUPLICATION-2026-09-28.md); engine/CLAUDE.md trap: name the prior art before any new mechanism. Tried: terrain.cursed (abandoned: duplicated layer.weak). Noticed: shard 1/8 timed out twice under outside machine load (gate 1 integration tests, 6-8 s alone, 15 s limit), passed on the third run; the git lock shim is at $HOME/bin/git this session. Next: content.mage-staff, then the opening loop in queue order, naming the existing mechanism each item extends.
New chat with Heroes of Blight and Tragic — engine: build the opening loop
  start engine
Last landing: 2026-09-28 03:47 (fix.surge-spend). Previous chat ended: on a wrap, 2026-09-28 17:32
WRAP NOT COMMITTED: 2026-09-28 17:32 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: planning — the opening loop cut into 15 backlog items (3599457), no code. Items: map.opening-six, encounter.area-fall, capability.placed-remains, fix.raise-two, content.opening-units, content.flaming-longsword, six encounter.opening.* rows, kingdom.encounter-battles, kingdom.opening-loop. Rulings this chat (DECISIONS.md 2026-09-28): the Lumberjack's Wife's stats dictated; battle 2's Undead Soldier is the existing unit.soldier (dictated block superseded); cursed ground is layer.weak, the one ground-status shape - terrain.cursed abandoned before code; a read-only whole-project review for duplicated mechanisms and content in code, in its own chat (brief engine/REVIEW-DUPLICATION-2026-09-28.md); engine/CLAUDE.md trap: name the prior art before any new mechanism. Tried: terrain.cursed (abandoned: duplicated layer.weak). Noticed: shard 1/8 timed out twice under outside machine load (gate 1 integration tests, 6-8 s alone, 15 s limit), passed on the third run; the git lock shim is at $HOME/bin/git this session. Next: content.mage-staff, then the opening loop in queue order, naming the existing mechanism each item extends."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: content.mage-staff [content · numbers], then map.opening-six [engine · data], then encounter.area-fall [engine · rule] (+3 more)
Delegate: content.mage-staff [content · numbers] — not yet gated; map.opening-six [engine · data] — not yet gated; encounter.area-fall [engine · rule] — not yet gated; capability.placed-remains [engine · rule] — not yet gated; content.opening-units [content · data] — not yet gated; content.flaming-longsword [content · data] — not yet gated
Blocked: fix.raise-two needs capability.placed-remains; encounter.opening.orphanage needs map.opening-six; encounter.opening.lumberjack needs map.opening-six, content.opening-units; encounter.opening.bridge needs map.opening-six; encounter.opening.cavern-trail needs map.opening-six, encounter.area-fall; encounter.opening.gates needs map.opening-six, encounter.area-fall; encounter.opening.cathedral needs map.opening-six, capability.placed-remains, fix.raise-two; kingdom.encounter-battles needs encounter.opening.orphanage; kingdom.opening-loop needs kingdom.encounter-battles, encounter.opening.lumberjack, encounter.opening.bridge, encounter.opening.cavern-trail, encounter.opening.gates, encounter.opening.cathedral, content.flaming-longsword
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

## The chat's commits since the last committed wrap (9eeb58a)

- 4e5b839 2026-09-28 17:18 ruling 2026-09-28 (Andrew): a read-only whole-project review for duplicated mechanisms and content in code, in its own chat (brief REVIEW-DUPLICATION-2026-09-28.md); CLAUDE.md trap: name the prior art before any new mechanism
- 1cb8162 2026-09-28 17:13 ruling 2026-09-28 (Andrew): cursed ground's timing is the same as every other ground status - 'It's the same as all the other ones.'
- 89932ea 2026-09-28 17:11 abandon terrain.cursed: ledger and gauntlet log (superseded by layer.weak, ruling 2026-09-28)
- 03c5dbb 2026-09-28 17:11 ruling 2026-09-28 (Andrew): cursed ground is layer.weak, the one ground-status shape - 'follow the same structure that was planned for all the various ground effects.' terrain.cursed abandoned before code; map.opening-six, encounter.area-fall, capability.placed-remains and the Gates and Cathedral encounters now paint layer.weak / layer.burning.
- 59790d1 2026-09-28 17:10 ruling 2026-09-28 (Andrew): battle 2's Undead Soldier is the existing unit.soldier - 'Let's just use the existing soldier as the undead soldier.' The dictated Undead Soldier block is superseded; content.opening-units publishes unit.soldier as it stands. Status untouched.
- 116218d 2026-09-28 17:07 ruling 2026-09-28 (Andrew): the Lumberjack's Wife (Str 2, Pre 2, Acc 65, Health 6, Dodge 10, Move 5, knife and basic armor) and the Undead Soldier (Str 4, Pre 3, Health 9, Armor 1, Acc 70, Move 4, immune Bleed 1, longsword-looking weapon, Slice: Str, soldier art) - verbatim. content.opening-units unblocked; status untouched.
- 3599457 2026-09-28 08:16 backlog: cut the opening loop into 15 items (2026-09-28 rulings) - map.opening-six, terrain.cursed, encounter.area-fall, capability.placed-remains, fix.raise-two, content.opening-units, content.flaming-longsword, six encounter.opening.* rows, kingdom.encounter-battles, kingdom.opening-loop. Status untouched; added by tools/add-item.mjs.
- 846afd9 2026-09-28 07:56 wrap: planning — the opening loop and V2 weapons, designed (no code). After landing fix.raise-range (d8030cc) and fix.surge-spend (9e5d05e, flagged) earlier this chat, Andrew ruled the next target: a

## Next chat

New chat with Heroes of Blight and Tragic — engine: build the opening loop
```
start engine
```
