# engine — handoff 2026-10-01 03:37

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next viewer.every-model, 250 of 299 landed · 24 await review · 13 pending
Now: viewer.true-3d-camera — the playable opening. Landed: the battle's camera is one real perspective camera — the 3D scene and the board (hex marks, the arrow, bars, names, floats, click targets) are drawn through it, so turning a full circle, tilting and zooming no longer stretch the scene or the bodies; a click or a point is the camera's ray against the board (the hex top or the body under the pointer, at any angle); nothing of the board shows before the battle's own 3D scene (a loading line instead of the flat board that flashed), and no WebGL 2 is said plainly; viewer tests painted-board, terrain-scene and verify's camera checks rewritten as rules, reasons at each edit; suite green. Tried: nothing abandoned. Next: Andrew — eyeball kingdom/BATTLE-SANDBOX.html?play=encounter.opening.orphanage (turn all the way round, tilt, zoom, click a hero and a hex); viewer.every-model.
New chat with Heroes of Blight and Tragic — engine: take the top of the queue (viewer.every-model)
  start engine
Last landing: 2026-10-01 03:25 (viewer.true-3d-camera). Previous chat ended: on a wrap, 2026-10-01 03:37
WRAP NOT COMMITTED: 2026-10-01 03:37 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: viewer.true-3d-camera — the playable opening. Landed: the battle's camera is one real perspective camera — the 3D scene and the board (hex marks, the arrow, bars, names, floats, click targets) are drawn through it, so turning a full circle, tilting and zooming no longer stretch the scene or the bodies; a click or a point is the camera's ray against the board (the hex top or the body under the pointer, at any angle); nothing of the board shows before the battle's own 3D scene (a loading line instead of the flat board that flashed), and no WebGL 2 is said plainly; viewer tests painted-board, terrain-scene and verify's camera checks rewritten as rules, reasons at each edit; suite green. Tried: nothing abandoned. Next: Andrew — eyeball kingdom/BATTLE-SANDBOX.html?play=encounter.opening.orphanage (turn all the way round, tilt, zoom, click a hero and a hex); viewer.every-model."
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

## The chat's commits since the last committed wrap (807653c)

- 4aeb89b 2026-10-01 03:25 gauntlet log: the viewer.true-3d-camera landing line
- e16c3de 2026-10-01 03:24 viewer.true-3d-camera: Ruled 2026-09-30 (Andrew, DECISIONS.md 'a true 3D battle: an orbit camer
- 13e55c0 2026-10-01 01:53 ruling 2026-09-30 (Andrew): a true 3D battle - an orbit camera, every Orphanage unit its own model, no flash of another map - 'When I maneuver the map, it stretches the 3D assets.' 'True 3D orbit.' 'Everything in Orphanage has a 3D model, so if you're not finding the 3D model, you're just not looking in the right place.' Filed viewer.true-3d-camera (first in the queue); viewer.every-model corrected to the player-roster models.
- 710ce06 2026-10-01 01:05 wrap: viewer.battle-full-screen — the playable opening. Landed: the battle is its own screen — BATTLE-SANDBOX.html?play= opens the battle alone, scaled to fill the window (no setup form, no launcher t

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue (viewer.every-model)
```
start engine
```
