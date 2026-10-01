# engine — handoff 2026-10-01 06:21

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next content.fire-imp-flight, 252 of 300 landed · 25 await review · 12 pending
Now: kingdom.play-launcher — the playable opening. Landed: the game plays from a link — http://127.0.0.1:4230/play is the launcher (kingdom/PLAY.html, built from the sandbox's encounters): Orphanage, Lumberjack House, Bridge and Cavern Trail, each straight into the battle screen, plus a free battle and the recorded battles; the server answers /play; HBT-game-server.vbs in Andrew's Windows Startup folder starts it (tools/play-server.vbs) at every sign-in — started tonight, the old PLAY-OPENING.bat server window closed. Earlier this chat: viewer.true-3d-camera (one real 3D camera, no stretch, clicks by the camera's ray, no flat board before the scene). Suite green. Tried: nothing abandoned. Next: Andrew — play from http://127.0.0.1:4230/play; viewer.every-model.
New chat with Heroes of Blight and Tragic — engine: take the top of the queue (viewer.every-model)
  start engine
Last landing: 2026-10-01 05:34 (viewer.every-model). Previous chat ended: on a wrap, 2026-10-01 06:21
WRAP NOT COMMITTED: 2026-10-01 06:21 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: kingdom.play-launcher — the playable opening. Landed: the game plays from a link — http://127.0.0.1:4230/play is the launcher (kingdom/PLAY.html, built from the sandbox's encounters): Orphanage, Lumberjack House, Bridge and Cavern Trail, each straight into the battle screen, plus a free battle and the recorded battles; the server answers /play; HBT-game-server.vbs in Andrew's Windows Startup folder starts it (tools/play-server.vbs) at every sign-in — started tonight, the old PLAY-OPENING.bat server window closed. Earlier this chat: viewer.true-3d-camera (one real 3D camera, no stretch, clicks by the camera's ray, no flat board before the scene). Suite green. Tried: nothing abandoned. Next: Andrew — play from http://127.0.0.1:4230/play; viewer.every-model."
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

## The chat's commits since the last committed wrap (ee54cd6)

- fc384e4 2026-10-01 05:46 wrap: viewer.every-model — the playable opening. Landed: every unit of battles 1-3 is a 3D model — the Orphan Child, the School Teacher, the Lumberjack and his Wife in their own roster bodies (idle, w

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue (viewer.every-model)
```
start engine
```
