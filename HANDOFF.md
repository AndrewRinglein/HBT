# engine — handoff 2026-10-01 01:05

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next viewer.every-model, 249 of 298 landed · 24 await review · 13 pending
Now: viewer.battle-full-screen — the playable opening. Landed: the battle is its own screen — BATTLE-SANDBOX.html?play= opens the battle alone, scaled to fill the window (no setup form, no launcher text; a small Launcher button goes to the setup view and back); End Turn and End activation moved off the map into the screen's lower right-hand corner; the targeting arrow and its numbers are red; suite green 2406. Tried: nothing abandoned. Next: Andrew — eyeball kingdom/BATTLE-SANDBOX.html?play=encounter.opening.orphanage; viewer.every-model (the 3D characters Andrew did not see).
New chat with Heroes of Blight and Tragic — engine: take the top of the queue (viewer.every-model)
  start engine
Last landing: 2026-10-01 00:50 (viewer.battle-full-screen). Previous chat ended: on a wrap, 2026-10-01 01:05
WRAP NOT COMMITTED: 2026-10-01 01:05 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: viewer.battle-full-screen — the playable opening. Landed: the battle is its own screen — BATTLE-SANDBOX.html?play= opens the battle alone, scaled to fill the window (no setup form, no launcher text; a small Launcher button goes to the setup view and back); End Turn and End activation moved off the map into the screen's lower right-hand corner; the targeting arrow and its numbers are red; suite green 2406. Tried: nothing abandoned. Next: Andrew — eyeball kingdom/BATTLE-SANDBOX.html?play=encounter.opening.orphanage; viewer.every-model (the 3D characters Andrew did not see)."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: viewer.every-model [viewer · plumbing], then content.fire-imp-flight [content · data], then kingdom.abbotown-map [kingdom · plumbing] (+7 more)
Delegate: viewer.every-model [viewer · plumbing] — not yet gated; content.fire-imp-flight [content · data] — not yet gated; kingdom.abbotown-map [kingdom · plumbing] — not yet gated; encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; fix.one-effect-vocabulary [engine · plumbing] — not yet gated; fix.codex-numbers [content · numbers] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated; fix.opening-levels [engine · data] — not yet gated
Blocked: kingdom.opening-loop-three needs kingdom.abbotown-map, encounter.opening.bridge-ai; kingdom.opening-loop needs encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers
Calls since last wrap: none
Stack for viewer.every-model:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  src/core and the mutator that owns the field · test/ — the probe before the prose

## The chat's commits since the last committed wrap (51afeb9)

- 057a25c 2026-10-01 00:50 gauntlet log: the viewer.battle-full-screen landing line
- c5be8e9 2026-10-01 00:50 viewer.battle-full-screen: Ruled 2026-09-30 (Andrew, DECISIONS.md 'the battle is its own full scree
- c794e35 2026-10-01 00:13 ruling 2026-09-30 (Andrew): a bunch of motions, not every one; the hero bodies we have are reused - 'Yes, I don't really care about every single motion being in there. I want to see a bunch of motions in there.' 'We can reuse the hero bodies we already have.' (viewer.every-model)
- 11394c3 2026-10-01 00:11 ruling 2026-09-30 (Andrew): the battle is its own full screen; End Turn and End Activation lower right; a red targeting arrow; every 3D character. Filed viewer.battle-full-screen and viewer.every-model (first in the queue).
- 9374fcc 2026-09-30 23:48 ruling 2026-09-30 (Andrew): the Fire Imp flies - 'The Fire Imp does fly, yes. That was an oversight if it does not.' Filed content.fire-imp-flight (first in the queue).
- cb00ed8 2026-09-30 22:55 wrap: viewer.opening-cast — the playable opening. Landed: battles 2 and 3 in the new screen — Skeleton Archer, the Soldier (Armored Skeleton), Imps flying (the demo's winged imp), heroes in the demo's archer (Ranger) or Oathblade (every other class) outfit, civilians on their tokens; a body with no strike or shot leans and the board flies the arrow; suite green 2402. Tried: nothing abandoned. Next: Andrew — eyeball battles 2 and 3 in kingdom/BATTLE-SANDBOX.html; the Fire Imp has no flight in the engine, so it walks; the Lumberjack's Wife has no art; kingdom.abbotown-map.
- 651a60e 2026-09-30 22:11 gauntlet log: the viewer.opening-cast landing line
- ea4fe03 2026-09-30 22:10 viewer.opening-cast: PLAYABLE-OPENING-PLAN.md item 10. Battles 2 and 3's cast in the new scre
- a281811 2026-09-30 20:00 wrap: encounter.opening.bridge-ai-refiled — the playable opening. Landed (flagged for review): the Bridge stalled because the ranged-kite ladder put safety ahead of a shot, so flying Imps never found

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue (viewer.every-model)
```
start engine
```
