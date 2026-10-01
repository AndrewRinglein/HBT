# engine — handoff 2026-10-01 05:46

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next content.fire-imp-flight, 252 of 300 landed · 25 await review · 12 pending
Now: viewer.every-model — the playable opening. Landed: every unit of battles 1-3 is a 3D model — the Orphan Child, the School Teacher, the Lumberjack and his Wife in their own roster bodies (idle, walk, flinch, death; the Hook punch); the Skeleton Archer and the Soldier strike with the selected sword combination and flinch with the head-hit, the Skeleton Archer draws the demo archer's bow shot; the Imps flinch with their own getHit; a borrowed motion plays on the body's own bone lengths (models.js borrowClip); the Zombies alone lack a flinch (no selected one fits their rig) and recoil; tests that asserted civilian tokens rewritten as rules, landed flagged; suite green 2418. Tried: nothing abandoned. Next: Andrew — eyeball http://127.0.0.1:4230/kingdom/BATTLE-SANDBOX.html?play=encounter.opening.orphanage (and .lumberjack, .bridge); answer the Zombie flinch question; content.fire-imp-flight.
New chat with Heroes of Blight and Tragic — engine: take the top of the queue
  start engine
Last landing: 2026-10-01 05:34 (viewer.every-model). Previous chat ended: on a wrap, 2026-10-01 05:46
WRAP NOT COMMITTED: 2026-10-01 05:46 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: viewer.every-model — the playable opening. Landed: every unit of battles 1-3 is a 3D model — the Orphan Child, the School Teacher, the Lumberjack and his Wife in their own roster bodies (idle, walk, flinch, death; the Hook punch); the Skeleton Archer and the Soldier strike with the selected sword combination and flinch with the head-hit, the Skeleton Archer draws the demo archer's bow shot; the Imps flinch with their own getHit; a borrowed motion plays on the body's own bone lengths (models.js borrowClip); the Zombies alone lack a flinch (no selected one fits their rig) and recoil; tests that asserted civilian tokens rewritten as rules, landed flagged; suite green 2418. Tried: nothing abandoned. Next: Andrew — eyeball http://127.0.0.1:4230/kingdom/BATTLE-SANDBOX.html?play=encounter.opening.orphanage (and .lumberjack, .bridge); answer the Zombie flinch question; content.fire-imp-flight."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: content.fire-imp-flight [content · data], then kingdom.abbotown-map [kingdom · plumbing], then encounter.opening.gates [engine · data] (+6 more)
Delegate: content.fire-imp-flight [content · data] — not yet gated; kingdom.abbotown-map [kingdom · plumbing] — not yet gated; encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; fix.one-effect-vocabulary [engine · plumbing] — not yet gated; fix.codex-numbers [content · numbers] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated; fix.opening-levels [engine · data] — not yet gated
Blocked: kingdom.opening-loop-three needs kingdom.abbotown-map, encounter.opening.bridge-ai; kingdom.opening-loop needs encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers
Calls since last wrap: none
Stack for content.fire-imp-flight:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (c282776)

- 2659382 2026-10-01 05:34 gauntlet log: the viewer.every-model landing line
- 112b59e 2026-10-01 05:34 viewer.every-model: Ruled 2026-09-30 (Andrew, DECISIONS.md 'the battle is its own full scree
- c52fec2 2026-10-01 05:05 gauntlet log: the kingdom.play-launcher landing line
- 6b6d549 2026-10-01 05:05 kingdom.play-launcher: Ruled 2026-09-30 (Andrew, DECISIONS.md 'the game plays from a link'): 'I
- 665f4a7 2026-10-01 04:58 ruling 2026-09-30 (Andrew): a local link on this PC; a game launcher - 'Local link on this PC' · 'Make me a game launcher where I can play the various battles.' Filed kingdom.play-launcher (first in the queue).
- edd5d4b 2026-10-01 04:56 ruling 2026-09-30 (Andrew): the game plays from a link - 'I don't want to have to go dig for bat files. I want a way to play this game out of a link.'
- c1bca78 2026-10-01 03:37 wrap: viewer.true-3d-camera — the playable opening. Landed: the battle's camera is one real perspective camera — the 3D scene and the board (hex marks, the arrow, bars, names, floats, click targets) a

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue
```
start engine
```
