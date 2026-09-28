# engine — handoff 2026-09-28 02:37

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next fix.raise-range, 202 of 232 landed · 2 await review · 3 pending
Now: capability.stealth — the stealth flag. Landed 2900fdc (backlog d16f7fa, content bad2999), clean: the Codex row status.stealth, its sentence the settled definition word for word (CODEX.md 475/1589), compiles through mkenginepack to five flags — hidesFromFoes, untargetable, breaksOnAttack, breaksOnPower, breaksOnReveal — with no clock. A stealthed unit cannot be aimed at by the other side's attacks or powers (canAttack, canUsePower; attacks of opportunity included) but areas and bursts still strike it; it breaks as its carrier's attack is declared or its power is used, never on a move, logged as status.expired with the attack or power as cause and broken set; a new effect kind, reveal, breaks it on enemies inside a power's area and nobody outside. Fourteen switches (SWITCHES.md, stealth*); aiSightLegality and aiSightStealthRow retired. Test test/stealth.test.ts; variants status.stealth and test.status.cloak (no power-break, a clock); kill switch fails without them; control battles unchanged. Tried: nothing abandoned. Noticed: audit-all.mjs cannot finish in Cowork (its full-suite step is unsharded and passes 178 s), so the batch-end audit did not run — eight shards green on 9623fb75ea stand in for its suite step; the git lock shim at $HOME/bin/git was missing again and was recreated; root CODEX.md not regenerated (the new row is a settled status, which the Codex markdown does not list). Next: fix.raise-range.
New chat with Heroes of Blight and Tragic — engine: fix.raise-range, the Necromancer's Raise reaches 10
  start engine
Last landing: 2026-09-28 02:15 (capability.stealth). Previous chat ended: on a wrap, 2026-09-28 02:37
WRAP NOT COMMITTED: 2026-09-28 02:37 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: capability.stealth — the stealth flag. Landed 2900fdc (backlog d16f7fa, content bad2999), clean: the Codex row status.stealth, its sentence the settled definition word for word (CODEX.md 475/1589), compiles through mkenginepack to five flags — hidesFromFoes, untargetable, breaksOnAttack, breaksOnPower, breaksOnReveal — with no clock. A stealthed unit cannot be aimed at by the other side's attacks or powers (canAttack, canUsePower; attacks of opportunity included) but areas and bursts still strike it; it breaks as its carrier's attack is declared or its power is used, never on a move, logged as status.expired with the attack or power as cause and broken set; a new effect kind, reveal, breaks it on enemies inside a power's area and nobody outside. Fourteen switches (SWITCHES.md, stealth*); aiSightLegality and aiSightStealthRow retired. Test test/stealth.test.ts; variants status.stealth and test.status.cloak (no power-break, a clock); kill switch fails without them; control battles unchanged. Tried: nothing abandoned. Noticed: audit-all.mjs cannot finish in Cowork (its full-suite step is unsharded and passes 178 s), so the batch-end audit did not run — eight shards green on 9623fb75ea stand in for its suite step; the git lock shim at $HOME/bin/git was missing again and was recreated; root CODEX.md not regenerated (the new row is a settled status, which the Codex markdown does not list). Next: fix.raise-range."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: fix.raise-range [content · data], then fix.surge-spend [engine · rule]
Delegate: fix.raise-range [content · data] — not yet gated; fix.surge-spend [engine · rule] — not yet gated
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
Stack for fix.raise-range:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (643938c)

- 492a953 2026-09-28 02:15 capability.stealth: Ruled 2026-09-27 (Andrew, DECISIONS.md 'stealth gets a Codex row and its
- d16f7fa 2026-09-28 02:13 backlog: capability.stealth names its probe and variants - the Codex row status.stealth (content bad2999) and test.status.cloak (the same flags minus breaksOnPower, with a clock; pure data), each live in the TEST scenarios test.stealth-a / -b - and declares no baseline change: the control battles carry no stealth.
- f234a6a 2026-09-28 01:56 wrap: capability.move-ignores-zoc — the enemy pack. Landed 954661b (probe 7d016f8, content 5afbde1), flagged for review: not provoking is a property of a movement power; the new Codex walk power.move-

## Next chat

New chat with Heroes of Blight and Tragic — engine: fix.raise-range, the Necromancer's Raise reaches 10
```
start engine
```
