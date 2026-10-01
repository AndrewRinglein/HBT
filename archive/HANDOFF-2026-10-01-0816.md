# engine — handoff 2026-10-01 08:16

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next content.fire-imp-flight, 254 of 302 landed · 25 await review · 12 pending
Now: kingdom.civilians-played, viewer.bodies-before-board — the playable opening. Landed: the civilians are the player's (the Orphan Child and the School Teacher are clicked to act and walked like heroes; End Turn names them); no 2D token stands in for a 3D body - the battle opens when the 3D map and every body on it are in (about a minute on Andrew's PC for the Orphanage), and a later arrival shows no token while its body loads; suite green. Tried: nothing abandoned. Next: Andrew — play the Orphanage from http://127.0.0.1:4230/play: click the Orphan Child; another chat landed viewer.every-model meanwhile (two engine chats at once — rule 35).
New chat with Heroes of Blight and Tragic — engine: take the top of the queue
  start engine
Last landing: 2026-10-01 07:21 (viewer.bodies-before-board). Previous chat ended: on a wrap, 2026-10-01 08:16
WRAP NOT COMMITTED: 2026-10-01 08:16 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: kingdom.civilians-played, viewer.bodies-before-board — the playable opening. Landed: the civilians are the player's (the Orphan Child and the School Teacher are clicked to act and walked like heroes; End Turn names them); no 2D token stands in for a 3D body - the battle opens when the 3D map and every body on it are in (about a minute on Andrew's PC for the Orphanage), and a later arrival shows no token while its body loads; suite green. Tried: nothing abandoned. Next: Andrew — play the Orphanage from http://127.0.0.1:4230/play: click the Orphan Child; another chat landed viewer.every-model meanwhile (two engine chats at once — rule 35)."
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

## The chat's commits since the last committed wrap (94429ca)

- 7dd6787 2026-10-01 07:21 gauntlet log: the viewer.bodies-before-board landing line
- ccd82a8 2026-10-01 07:21 viewer.bodies-before-board: Ruled 2026-09-30 (Andrew, DECISIONS.md 'the civilians are played; no 2D
- fcc8420 2026-10-01 07:19 gauntlet log: the kingdom.civilians-played landing line
- 5330665 2026-10-01 07:19 kingdom.civilians-played: Ruled 2026-09-30 (Andrew, DECISIONS.md 'the civilians are played; no 2D
- f88b59e 2026-10-01 06:46 ruling 2026-09-30 (Andrew): the civilians are played; no 2D before the 3D bodies - 'There's no movement for the child when I click on it' · 'two-dimensional images of other heroes are loading before the 3D images are loading'. Filed kingdom.civilians-played and viewer.bodies-before-board (first in the queue).
- 2ed1b61 2026-10-01 06:22 wrap: kingdom.play-launcher — the playable opening. Landed: the game plays from a link — http://127.0.0.1:4230/play is the launcher (kingdom/PLAY.html, built from the sandbox's encounters): Orphanage,

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue
```
start engine
```
