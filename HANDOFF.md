# engine — handoff 2026-09-30 20:00

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next viewer.opening-cast, 247 of 295 landed · 24 await review · 12 pending
Now: encounter.opening.bridge-ai-refiled — the playable opening. Landed (flagged for review): the Bridge stalled because the ranged-kite ladder put safety ahead of a shot, so flying Imps never found a hex both safe and in range; a kiter with no melee ally now plays a positionAlone ladder (a shot first) and clearShot reads line of sight; Battle 3 ends on all 100 seeds, heroes win 1-2%; control battles unchanged; suite green 2396. Tried: encounter.opening.bridge-ai abandoned (filed without probeIds) and re-filed, ruled 2026-09-30. Next: Andrew — the Bridge's difficulty and kingdom.opening-loop-three's dependency on the abandoned id; viewer.opening-cast.
New chat with Heroes of Blight and Tragic — engine: take the top of the queue (viewer.opening-cast)
  start engine
Last landing: 2026-09-30 19:47 (encounter.opening.bridge-ai-refiled). Previous chat ended: on a wrap, 2026-09-30 20:00
WRAP NOT COMMITTED: 2026-09-30 20:00 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: encounter.opening.bridge-ai-refiled — the playable opening. Landed (flagged for review): the Bridge stalled because the ranged-kite ladder put safety ahead of a shot, so flying Imps never found a hex both safe and in range; a kiter with no melee ally now plays a positionAlone ladder (a shot first) and clearShot reads line of sight; Battle 3 ends on all 100 seeds, heroes win 1-2%; control battles unchanged; suite green 2396. Tried: encounter.opening.bridge-ai abandoned (filed without probeIds) and re-filed, ruled 2026-09-30. Next: Andrew — the Bridge's difficulty and kingdom.opening-loop-three's dependency on the abandoned id; viewer.opening-cast."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: viewer.opening-cast [viewer · plumbing], then kingdom.abbotown-map [kingdom · plumbing], then encounter.opening.gates [engine · data] (+6 more)
Delegate: viewer.opening-cast [viewer · plumbing] — not yet gated; kingdom.abbotown-map [kingdom · plumbing] — not yet gated; encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; fix.one-effect-vocabulary [engine · plumbing] — not yet gated; fix.codex-numbers [content · numbers] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated; fix.opening-levels [engine · data] — not yet gated
Blocked: kingdom.opening-loop-three needs kingdom.abbotown-map, viewer.opening-cast, encounter.opening.bridge-ai; kingdom.opening-loop needs encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers
Calls since last wrap:
  openingHeroZonesBridge · 2026-09-30 · The Bridge heroes?
  plannedHexProvokes · 2026-09-30 · What does the forecast do with an attack of opportunity on the planned path — roll it, assume it hits (the walk stops), or assume it misses?
  plannedHexWalk · 2026-09-30 · Is the planned hex placed, or walked?
  threatQuery · 2026-09-30 · "Pointing at an enemy lights up where it can move and hit": moved with what budget, hit with which attacks, onto which hexes?
  aiKiteAlone · 2026-09-30 · A kiter that can never be both safe and in a shot — what does it do?
Stack for viewer.opening-cast:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  src/core and the mutator that owns the field · test/ — the probe before the prose

## The chat's commits since the last committed wrap (4a8e329)

- 39985cd 2026-09-30 19:47 encounter.opening.bridge-ai-refiled: Re-files encounter.opening.bridge-ai (abandoned 2026-09-30: filed withou
- c76cd38 2026-09-30 19:43 ruling 2026-09-30 (Andrew): encounter.opening.bridge-ai - park, abandon, re-file as encounter.opening.bridge-ai-refiled with probeIds encounter.opening.bridge
- 335957a 2026-09-30 10:36 ruling 2026-09-30 (Andrew): the Bridge's northern branch is walkable; the deck hexes marked X are deck - 'Okay, all those purple tiles should be walkable terrain.' / 'Yes.'
- f424f3f 2026-09-30 09:37 wrap: the fast process — engine harness. Landed tool.fast-process: the gate is fast by default (prior-art and wrong-home run once at wrap, the kill switch re-runs only added test files), --full and th

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue (viewer.opening-cast)
```
start engine
```
