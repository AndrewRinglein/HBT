# engine — handoff 2026-10-01 21:54

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next viewer.weapons-in-hand, 259 of 310 landed · 26 await review · 15 pending
Now: viewer.walk-in-step — the walk in step with the hexes. Landed: every 3D body plays its walk clip for the whole traversal, its stride timed to the ground it covers (the standing foot now slides ~0.05 of the body's speed, was ~0.9); a walk takes 600 ms per hex and grows with the walk (was 320-900 ms whatever its length, so the clips never got past their first step); the Imps fly at the same pace; the viewer page and data re-dumped, the kingdom's BATTLE-SANDBOX.html and SLICE.html republished; suite green. Tried: nothing abandoned. Next: Andrew - play a battle from http://127.0.0.1:4230/play and judge the pace (viewer SWITCHES walkPace, 600 ms a hex: the zombies' and armoured heroes' slow walk clips play about 8x fast); then viewer.weapons-in-hand and the rest of Andrew's queue.
New chat with Heroes of Blight and Tragic — engine: take the top of the queue (viewer.weapons-in-hand, then Andrew's queue)
  start engine
Last landing: 2026-10-01 20:58 (viewer.walk-in-step). Previous chat ended: on a wrap, 2026-10-01 21:54
WRAP NOT COMMITTED: 2026-10-01 21:54 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: viewer.walk-in-step — the walk in step with the hexes. Landed: every 3D body plays its walk clip for the whole traversal, its stride timed to the ground it covers (the standing foot now slides ~0.05 of the body's speed, was ~0.9); a walk takes 600 ms per hex and grows with the walk (was 320-900 ms whatever its length, so the clips never got past their first step); the Imps fly at the same pace; the viewer page and data re-dumped, the kingdom's BATTLE-SANDBOX.html and SLICE.html republished; suite green. Tried: nothing abandoned. Next: Andrew - play a battle from http://127.0.0.1:4230/play and judge the pace (viewer SWITCHES walkPace, 600 ms a hex: the zombies' and armoured heroes' slow walk clips play about 8x fast); then viewer.weapons-in-hand and the rest of Andrew's queue."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: viewer.weapons-in-hand [viewer · plumbing], then viewer.characters-unfaded [viewer · plumbing], then viewer.unit-card-bar [viewer · plumbing] (+9 more)
Delegate: viewer.weapons-in-hand [viewer · plumbing] — not yet gated; viewer.characters-unfaded [viewer · plumbing] — not yet gated; viewer.unit-card-bar [viewer · plumbing] — not yet gated; viewer.real-bodies [viewer · plumbing] — not yet gated; kingdom.abbotown-map [kingdom · plumbing] — not yet gated; encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; fix.one-effect-vocabulary [engine · plumbing] — not yet gated; fix.codex-numbers [content · numbers] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated; fix.opening-levels [engine · data] — not yet gated
Blocked: kingdom.opening-loop-three needs kingdom.abbotown-map, encounter.opening.bridge-ai; kingdom.opening-loop needs encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers
Calls since last wrap:
  caravanZones · 2026-10-01 · Where do the caravan's sides start?
  caravanBlocked · 2026-10-01 · The scene measures 13 obstructed hexes and 5 standing pockets walled off by wreckage. In the engine?
Stack for viewer.weapons-in-hand:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  src/core and the mutator that owns the field · test/ — the probe before the prose

## The chat's commits since the last committed wrap (3af673e)

- 265927f 2026-10-01 20:58 gauntlet log: the viewer.walk-in-step landing line
- 32d3385 2026-10-01 20:58 viewer.walk-in-step: Ruled 2026-10-01 (Andrew, DECISIONS.md 'the camera redesigned on the car
- 96bd208 2026-10-01 20:17 wrap: viewer.tactical-camera, encounter.caravan-aftermath, viewer.caravan-scene — the camera redesigned, the caravan fielded. Landed: content.fire-imp-flight (the Fire Imp flies); the accepted caravan

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue (viewer.weapons-in-hand, then Andrew's queue)
```
start engine
```
