# engine — handoff 2026-09-30 07:55

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next encounter.opening.bridge-ai, 245 of 293 landed · 23 await review · 13 pending
Now: the playable opening, Milestone 1 — engine, viewer, kingdom. Landed rule.primary-ends-activation, command.end-player-phase, preview.from-planned-hex, viewer.painted-board, viewer.character-models, viewer.under-unit, viewer.play-input, viewer.play-chrome (four flagged for review on prior art, no Prior art: line in their specs); battle 1 plays with the mouse on the painted scene, unseen in a real browser; ruled 2026-09-30 the End activation button stays; suite green 2379. Tried: nothing abandoned. Next: Andrew plays battle 1 (the eyeball check); encounter.opening.bridge-ai; the painted scenes disagree with the engine on walkable hexes (103 Orphanage, 5 Lumberjack, 20 Bridge) — content's; no weapon swap in the opening battles yet.
New chat with Heroes of Blight and Tragic — engine: take the top of the queue (encounter.opening.bridge-ai)
  start engine
Last landing: 2026-09-30 07:12 (viewer.play-chrome). Previous chat ended: on a wrap, 2026-09-30 07:55
WRAP NOT COMMITTED: 2026-09-30 07:55 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: the playable opening, Milestone 1 — engine, viewer, kingdom. Landed rule.primary-ends-activation, command.end-player-phase, preview.from-planned-hex, viewer.painted-board, viewer.character-models, viewer.under-unit, viewer.play-input, viewer.play-chrome (four flagged for review on prior art, no Prior art: line in their specs); battle 1 plays with the mouse on the painted scene, unseen in a real browser; ruled 2026-09-30 the End activation button stays; suite green 2379. Tried: nothing abandoned. Next: Andrew plays battle 1 (the eyeball check); encounter.opening.bridge-ai; the painted scenes disagree with the engine on walkable hexes (103 Orphanage, 5 Lumberjack, 20 Bridge) — content's; no weapon swap in the opening battles yet."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: encounter.opening.bridge-ai [engine · data], then viewer.opening-cast [viewer · plumbing], then kingdom.abbotown-map [kingdom · plumbing] (+7 more)
Delegate: encounter.opening.bridge-ai [engine · data] — not yet gated; viewer.opening-cast [viewer · plumbing] — not yet gated; kingdom.abbotown-map [kingdom · plumbing] — not yet gated; encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; fix.one-effect-vocabulary [engine · plumbing] — not yet gated; fix.codex-numbers [content · numbers] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated; fix.opening-levels [engine · data] — not yet gated
Blocked: kingdom.opening-loop-three needs kingdom.abbotown-map, viewer.opening-cast, encounter.opening.bridge-ai; kingdom.opening-loop needs encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers
Calls since last wrap:
  plannedHexProvokes · 2026-09-30 · What does the forecast do with an attack of opportunity on the planned path — roll it, assume it hits (the walk stops), or assume it misses?
  plannedHexWalk · 2026-09-30 · Is the planned hex placed, or walked?
  threatQuery · 2026-09-30 · "Pointing at an enemy lights up where it can move and hit": moved with what budget, hit with which attacks, onto which hexes?
Stack for encounter.opening.bridge-ai:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (fa86b36)

- 97c1a3f 2026-09-30 07:43 ruling 2026-09-30 (Andrew): the End activation button stays - 'Yeah, I suppose it should stay since you need to be able to end without doing another action.'
- 05cca69 2026-09-30 07:12 gauntlet log: the viewer.play-chrome landing line
- 339d8c0 2026-09-30 07:12 viewer.play-chrome: PLAYABLE-OPENING-PLAN.md item 8. Ruled 2026-09-29: an End Turn button en
- 40511e2 2026-09-30 06:33 gauntlet log: the viewer.play-input landing line
- a781b97 2026-09-30 06:33 viewer.play-input: PLAYABLE-OPENING-PLAN.md item 7. Ruled 2026-09-29: click a hero to act;
- 5413792 2026-09-30 05:58 gauntlet log: the viewer.under-unit landing line
- ed2baa9 2026-09-30 05:58 viewer.under-unit: PLAYABLE-OPENING-PLAN.md item 6. Ruled 2026-09-29: under each unit its n
- 0836839 2026-09-30 05:30 gauntlet log: the viewer.character-models landing line
- 3f210d4 2026-09-30 05:29 viewer.character-models: PLAYABLE-OPENING-PLAN.md item 5. Ruled 2026-09-29: units are 3D models w
- 34ff593 2026-09-30 04:47 gauntlet log: the viewer.painted-board landing line
- 6361208 2026-09-30 04:46 viewer.painted-board: PLAYABLE-OPENING-PLAN.md item 4. Ruled 2026-09-29: the painted 3D scenes
- ccbb374 2026-09-30 04:11 gauntlet log: the preview.from-planned-hex landing line
- aaacea8 2026-09-30 04:11 preview.from-planned-hex: PLAYABLE-OPENING-PLAN.md item 3. The ghost ('click a hex for a ghost, cl
- 29e3869 2026-09-30 03:45 gauntlet log: the command.end-player-phase landing line
- ad3f1cb 2026-09-30 03:45 command.end-player-phase: PLAYABLE-OPENING-PLAN.md item 2. Ruled 2026-09-29: 'There should be a bu
- 94eacdf 2026-09-30 03:29 gauntlet log: the rule.primary-ends-activation landing line
- 4d4d349 2026-09-30 03:28 rule.primary-ends-activation: PLAYABLE-OPENING-PLAN.md item 1. Ruled 2026-09-29 (Andrew, DECISIONS.md
- d80cded 2026-09-30 03:16 The playable opening: four rulings (2026-09-29, Andrew) and PLAYABLE-OPENING-PLAN.md's twelve items filed at the top of the queue (rule.primary-ends-activation first).
- 6ff97f8 2026-09-30 02:21 wrap: afflictions revised, badge rules, cold, Ghost — engine. Landed content.afflictions-revised, fix.badge-surge-at-fielding, rule.badge-deathbed-fighting, rule.badge-immunity (then removed), rule.co

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue (encounter.opening.bridge-ai)
```
start engine
```
