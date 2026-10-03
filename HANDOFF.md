# engine — handoff 2026-10-03 05:12

*Produced by tools/handoff.mjs from .state/now.json, which tools/wrap.mjs writes. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs printed and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next fix.affliction-pop-up-words, 300 of 344 landed · 43 await review · 2 pending
Now: viewer.turn-taking, viewer.civilian-held-dagger, viewer.camera-no-void, viewer.civilian-dagger-grip-punch, viewer.bar-card-and-log, fix.turned-hero-lost, viewer.affliction-pop-up — the battle screen's turn-taking and the viewer queue, emptied. Landed in the viewer-and-kingdom worker copy and combined into main (root a30192d, engine suite 2499, viewer every gate part, kingdom 416, content 142). Tried: the civilians' dagger as a separate held model with a closed grip and the Hook punch (the walk-assassinate stab was rejected; the hand-keyed standing stab is shelved as is, DECISIONS 2026-10-03); a CRLF checkout in main broke the grasp record's hash after the combine, pinned LF by civilian-study .gitattributes. Flagged for review: viewer.civilian-held-dagger, viewer.affliction-pop-up (a timeout edit in each item's own new test). Next: fix.affliction-pop-up-words — the engine supplies the pop-up's 0-Health words and marks the drawbacks.
New chat with Heroes of Blight and Tragic — engine: fix.affliction-pop-up-words, the affliction pop-up's 0-Health words and drawbacks come from the engine
  start engine
Last landing: 2026-10-03 04:18 (viewer.affliction-pop-up). Previous chat ended: on a wrap, 2026-10-03 05:12
Ungated since last wrap: 14
  a9da04f 2026-10-02 22:08 Andrew Ring — .state/shards.json: the whole suite (--shard 1/1, 2499 passed) passed on tree c25797daeb (2026-10-03
  362e180 2026-10-02 22:02 Andrew Ring — DECISIONS.md: the affliction pop-up's 0-Health words and its drawbacks come from the engine (Andrew,
  2511063 2026-10-02 21:20 Andrew Ring — combine: engine master 152b414 into this copy
  152b414 2026-10-02 20:19 Andrew Ring — DECISIONS.md: the standing stab is shelved as is; the queue moves on (Andrew, 2026-10-03)
  b0e7053 2026-10-02 20:19 Andrew Ring — DECISIONS.md: the standing stab needs lean, wind-up and legs (Andrew, 2026-10-03)
  5a05f9b 2026-10-02 19:22 Andrew Ring — DECISIONS.md: the civilians' dagger attack is the Hook punch for now; a hand-keyed standing stab is 
  e8f0d90 2026-10-02 19:11 Andrew Ring — DECISIONS.md: a held weapon is gripped, the hand closes round it, for every body (Andrew, 2026-10-03
  0229d5c 2026-10-02 18:24 Andrew Ring — DECISIONS.md: switching heroes before one has acted keeps the sandbox's save-and-restore for now (An
  80928f3 2026-10-02 19:22 Andrew Ring — DECISIONS.md: the civilians' dagger attack is the Hook punch for now; a hand-keyed standing stab is 
  886f5c3 2026-10-02 19:11 Andrew Ring — DECISIONS.md: a held weapon is gripped, the hand closes round it, for every body (Andrew, 2026-10-03
  52afd7d 2026-10-02 18:24 Andrew Ring — DECISIONS.md: switching heroes before one has acted keeps the sandbox's save-and-restore for now (An
  33a71e7 2026-10-02 17:57 Andrew Ring — DECISIONS.md: the civilians hold their dagger as a weapon, not baked into a body copy (Andrew, 2026-
  5a6ef22 2026-10-02 17:57 Andrew Ring — DECISIONS.md: the civilians hold their dagger as a weapon, not baked into a body copy (Andrew, 2026-
  3d3851d 2026-10-02 17:39 Andrew Ring — .state/shards.json: the whole suite (--shard 1/1, 2499 passed) passed on tree 7eb99fd56b (2026-10-02
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: fix.affliction-pop-up-words [engine · plumbing]
Delegate: fix.affliction-pop-up-words [engine · plumbing] — not yet gated
Blocked: kingdom.opening-loop needs encounter.opening.bridge
Calls since last wrap: none
Stack for fix.affliction-pop-up-words:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  src/core and the mutator that owns the field · test/ — the probe before the prose

## The chat's commits since the last wrap (618db0f)

- a9da04f 2026-10-02 22:08 .state/shards.json: the whole suite (--shard 1/1, 2499 passed) passed on tree c25797daeb (2026-10-03, main after the combine of the viewer worker copy; root a30192d, viewer fc08d2b, kingdom 8d6706d)
- 362e180 2026-10-02 22:02 DECISIONS.md: the affliction pop-up's 0-Health words and its drawbacks come from the engine (Andrew, 2026-10-03) — filed fix.affliction-pop-up-words
- 2511063 2026-10-02 21:20 combine: engine master 152b414 into this copy
- 92f7ca8 2026-10-02 21:18 viewer.affliction-pop-up: Ruled 2026-10-01 (Andrew, engine/DECISIONS.md 'the afflictions at 0 Heal
- 038b7af 2026-10-02 20:32 fix.turned-hero-lost: Ruled 2026-10-02 (Andrew, engine/DECISIONS.md 'a hero still turned when
- 258e094 2026-10-02 20:25 viewer.bar-card-and-log: Ruled 2026-10-03 (Andrew, engine DECISIONS.md 'the hero card sits small,
- 152b414 2026-10-02 20:19 DECISIONS.md: the standing stab is shelved as is; the queue moves on (Andrew, 2026-10-03)
- b0e7053 2026-10-02 20:19 DECISIONS.md: the standing stab needs lean, wind-up and legs (Andrew, 2026-10-03)
- 0ac8a1a 2026-10-02 20:04 viewer.civilian-dagger-grip-punch: Ruled 2026-10-03 (Andrew, engine DECISIONS.md 'a held weapon is gripped:
- 5a05f9b 2026-10-02 19:22 DECISIONS.md: the civilians' dagger attack is the Hook punch for now; a hand-keyed standing stab is made for review (Andrew, 2026-10-03) — filed viewer.civilian-dagger-grip-punch
- e8f0d90 2026-10-02 19:11 DECISIONS.md: a held weapon is gripped, the hand closes round it, for every body (Andrew, 2026-10-03)
- 0229d5c 2026-10-02 18:24 DECISIONS.md: switching heroes before one has acted keeps the sandbox's save-and-restore for now (Andrew, 2026-10-03)
- 80928f3 2026-10-02 19:22 DECISIONS.md: the civilians' dagger attack is the Hook punch for now; a hand-keyed standing stab is made for review (Andrew, 2026-10-03) — filed viewer.civilian-dagger-grip-punch
- 359e2ab 2026-10-02 19:21 viewer.camera-no-void: Ruled 2026-10-03 (Andrew, engine DECISIONS.md 'the camera never shows wh
- 886f5c3 2026-10-02 19:11 DECISIONS.md: a held weapon is gripped, the hand closes round it, for every body (Andrew, 2026-10-03)
- dd8a35a 2026-10-02 18:45 viewer.civilian-held-dagger: Ruled 2026-10-03 (Andrew, engine DECISIONS.md 'the civilians hold their
- 52afd7d 2026-10-02 18:24 DECISIONS.md: switching heroes before one has acted keeps the sandbox's save-and-restore for now (Andrew, 2026-10-03)
- 33a71e7 2026-10-02 17:57 DECISIONS.md: the civilians hold their dagger as a weapon, not baked into a body copy (Andrew, 2026-10-03) — filed viewer.civilian-held-dagger
- 838900c 2026-10-02 18:21 viewer.turn-taking: Ruled 2026-10-03 (Andrew, engine DECISIONS.md 'a hero starts its Activat
- 5a6ef22 2026-10-02 17:57 DECISIONS.md: the civilians hold their dagger as a weapon, not baked into a body copy (Andrew, 2026-10-03) — filed viewer.civilian-held-dagger
- 3d3851d 2026-10-02 17:39 .state/shards.json: the whole suite (--shard 1/1, 2499 passed) passed on tree 7eb99fd56b (2026-10-02, the wrap of fix.opening-levels and rule.afflictions-at-zero-refiled-2)

## Next chat

New chat with Heroes of Blight and Tragic — engine: fix.affliction-pop-up-words, the affliction pop-up's 0-Health words and drawbacks come from the engine
```
start engine
```
