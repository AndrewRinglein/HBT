# engine — handoff 2026-09-30 22:55

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next kingdom.abbotown-map, 248 of 295 landed · 24 await review · 11 pending
Now: viewer.opening-cast — the playable opening. Landed: battles 2 and 3 in the new screen — Skeleton Archer, the Soldier (Armored Skeleton), Imps flying (the demo's winged imp), heroes in the demo's archer (Ranger) or Oathblade (every other class) outfit, civilians on their tokens; a body with no strike or shot leans and the board flies the arrow; suite green 2402. Tried: nothing abandoned. Next: Andrew — eyeball battles 2 and 3 in kingdom/BATTLE-SANDBOX.html; the Fire Imp has no flight in the engine, so it walks; the Lumberjack's Wife has no art; kingdom.abbotown-map.
New chat with Heroes of Blight and Tragic — engine: take the top of the queue (kingdom.abbotown-map)
  start engine
Last landing: 2026-09-30 22:10 (viewer.opening-cast). Previous chat ended: on a wrap, 2026-09-30 22:55
WRAP NOT COMMITTED: 2026-09-30 22:55 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: viewer.opening-cast — the playable opening. Landed: battles 2 and 3 in the new screen — Skeleton Archer, the Soldier (Armored Skeleton), Imps flying (the demo's winged imp), heroes in the demo's archer (Ranger) or Oathblade (every other class) outfit, civilians on their tokens; a body with no strike or shot leans and the board flies the arrow; suite green 2402. Tried: nothing abandoned. Next: Andrew — eyeball battles 2 and 3 in kingdom/BATTLE-SANDBOX.html; the Fire Imp has no flight in the engine, so it walks; the Lumberjack's Wife has no art; kingdom.abbotown-map."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: kingdom.abbotown-map [kingdom · plumbing], then encounter.opening.gates [engine · data], then encounter.opening.cathedral [engine · data] (+5 more)
Delegate: kingdom.abbotown-map [kingdom · plumbing] — not yet gated; encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; fix.one-effect-vocabulary [engine · plumbing] — not yet gated; fix.codex-numbers [content · numbers] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated; fix.opening-levels [engine · data] — not yet gated
Blocked: kingdom.opening-loop-three needs kingdom.abbotown-map, encounter.opening.bridge-ai; kingdom.opening-loop needs encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers
Calls since last wrap:
  openingHeroZonesBridge · 2026-09-30 · The Bridge heroes?
  plannedHexProvokes · 2026-09-30 · What does the forecast do with an attack of opportunity on the planned path — roll it, assume it hits (the walk stops), or assume it misses?
  plannedHexWalk · 2026-09-30 · Is the planned hex placed, or walked?
  threatQuery · 2026-09-30 · "Pointing at an enemy lights up where it can move and hit": moved with what budget, hit with which attacks, onto which hexes?
  aiKiteAlone · 2026-09-30 · A kiter that can never be both safe and in a shot — what does it do?
Stack for kingdom.abbotown-map:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  src/core and the mutator that owns the field · test/ — the probe before the prose

## The chat's commits since the last committed wrap (51afeb9)

- 651a60e 2026-09-30 22:11 gauntlet log: the viewer.opening-cast landing line
- ea4fe03 2026-09-30 22:10 viewer.opening-cast: PLAYABLE-OPENING-PLAN.md item 10. Battles 2 and 3's cast in the new scre
- a281811 2026-09-30 20:00 wrap: encounter.opening.bridge-ai-refiled — the playable opening. Landed (flagged for review): the Bridge stalled because the ranged-kite ladder put safety ahead of a shot, so flying Imps never found

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue (kingdom.abbotown-map)
```
start engine
```
