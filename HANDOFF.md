# engine — handoff 2026-10-01 20:17

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next viewer.walk-in-step, 258 of 310 landed · 26 await review · 16 pending
Now: viewer.tactical-camera, encounter.caravan-aftermath, viewer.caravan-scene — the camera redesigned, the caravan fielded. Landed: content.fire-imp-flight (the Fire Imp flies); the accepted caravan camera for every battle (40° start, 40–75° tactical, Lower/Raise 10°, Q/E 60°, Overhead, Inspect, Whole map, Focus selected unit; off-screen bubbles only for units wholly out of view); the caravan aftermath playable on its painted scene with its surroundings, fires and cursed fog (provisional fight: 2 Bloodhounds + 2 Imps); battle controls (no aim arrow until an attack is chosen, the arrow stops at its reach - fix.aim-reach; Devotion used from the bar); PLAY.vbs starts the game server and adds it to Startup; viewer gate tests split in two; fix.suite-after-caravan rewrote 7 stale tests (review); suite green. Tried: nothing abandoned; kingdom 5b97243's message wrongly claimed four shards green - corrected in 859530c. Next: Andrew - double-click PLAY.vbs and play the Caravan from http://127.0.0.1:4230/play; then viewer.walk-in-step and the rest of Andrew's queue.
New chat with Heroes of Blight and Tragic — engine: take the top of the queue (viewer.walk-in-step, then Andrew's queue)
  start engine
Last landing: 2026-10-01 20:05 (fix.suite-after-caravan). Previous chat ended: on a wrap, 2026-10-01 20:17
WRAP NOT COMMITTED: 2026-10-01 20:17 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: viewer.tactical-camera, encounter.caravan-aftermath, viewer.caravan-scene — the camera redesigned, the caravan fielded. Landed: content.fire-imp-flight (the Fire Imp flies); the accepted caravan camera for every battle (40° start, 40–75° tactical, Lower/Raise 10°, Q/E 60°, Overhead, Inspect, Whole map, Focus selected unit; off-screen bubbles only for units wholly out of view); the caravan aftermath playable on its painted scene with its surroundings, fires and cursed fog (provisional fight: 2 Bloodhounds + 2 Imps); battle controls (no aim arrow until an attack is chosen, the arrow stops at its reach - fix.aim-reach; Devotion used from the bar); PLAY.vbs starts the game server and adds it to Startup; viewer gate tests split in two; fix.suite-after-caravan rewrote 7 stale tests (review); suite green. Tried: nothing abandoned; kingdom 5b97243's message wrongly claimed four shards green - corrected in 859530c. Next: Andrew - double-click PLAY.vbs and play the Caravan from http://127.0.0.1:4230/play; then viewer.walk-in-step and the rest of Andrew's queue."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: viewer.walk-in-step [viewer · plumbing], then viewer.weapons-in-hand [viewer · plumbing], then viewer.characters-unfaded [viewer · plumbing] (+10 more)
Delegate: viewer.walk-in-step [viewer · plumbing] — not yet gated; viewer.weapons-in-hand [viewer · plumbing] — not yet gated; viewer.characters-unfaded [viewer · plumbing] — not yet gated; viewer.unit-card-bar [viewer · plumbing] — not yet gated; viewer.real-bodies [viewer · plumbing] — not yet gated; kingdom.abbotown-map [kingdom · plumbing] — not yet gated; encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; fix.one-effect-vocabulary [engine · plumbing] — not yet gated; fix.codex-numbers [content · numbers] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated; fix.opening-levels [engine · data] — not yet gated
Blocked: kingdom.opening-loop-three needs kingdom.abbotown-map, encounter.opening.bridge-ai; kingdom.opening-loop needs encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers
Calls since last wrap:
  caravanZones · 2026-10-01 · Where do the caravan's sides start?
  caravanBlocked · 2026-10-01 · The scene measures 13 obstructed hexes and 5 standing pockets walled off by wreckage. In the engine?
Stack for viewer.walk-in-step:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  src/core and the mutator that owns the field · test/ — the probe before the prose

## The chat's commits since the last committed wrap (009e271)

- af5c7f9 2026-10-01 20:05 gauntlet log: the fix.suite-after-caravan landing line
- 06ce40e 2026-10-01 20:05 fix.suite-after-caravan: The once-per-chat suite (2026-10-01) found seven tests pinned to the wor
- e949fba 2026-10-01 12:10 gauntlet log: the fix.aim-reach landing line
- f6e3854 2026-10-01 12:10 fix.aim-reach: Ruled 2026-10-01 (Andrew, DECISIONS.md 'the links and the icon; choose t
- ae106da 2026-10-01 10:45 gauntlet log: the encounter.caravan-aftermath landing line
- 467817f 2026-10-01 10:45 encounter.caravan-aftermath: Ruled 2026-10-01 (Andrew, DECISIONS.md 'the camera redesigned on the car
- f871510 2026-10-01 10:39 ruling 2026-10-01 (Andrew): the links and the icon; choose the movement type; no aim before an attack is chosen; the arrow reaches the attack's range; walk timed to the hexes
- 9c22a6b 2026-10-01 10:29 ruling 2026-10-01 (Andrew): the camera redesigned on the caravan preview for every battle; the queue after it (walk, weapons, Devotion, unfaded characters, the card bar, real bodies); the caravan's provisional fight - 2 Imps + 2 Bloodhounds
- 46ac462 2026-10-01 08:35 gauntlet log: the content.fire-imp-flight landing line
- a0874ff 2026-10-01 08:35 content.fire-imp-flight: Ruled 2026-09-30 (Andrew, DECISIONS.md 'the Fire Imp flies'): 'The Fire
- 86fa8f4 2026-10-01 08:24 ruling 2026-10-01 (Andrew): always a playable link - 'I always need a playable link.'
- ee423e2 2026-10-01 08:16 wrap: kingdom.civilians-played, viewer.bodies-before-board — the playable opening. Landed: the civilians are the player's (the Orphan Child and the School Teacher are clicked to act and walked like he

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue (viewer.walk-in-step, then Andrew's queue)
```
start engine
```
