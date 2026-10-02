# engine — handoff 2026-10-02 07:45

*Produced by tools/handoff.mjs from .state/now.json, which tools/wrap.mjs writes. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs printed and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next fix.one-hero-assembly, 283 of 330 landed · 36 await review · 9 pending
Now: movement.swap-and-shields, movement.inventory, fix.shield-power-double-click, plus add-item --repoint — the movements Andrew asked for now, the list of all of them, and his shield-power report. Landed: the weapon/shield swap on the board's bar (swapCost paid, a second swap refused, the log names it); the six shield powers fire from the bar on a double-click, or button then hero (the first click's playback swallowed the second; a looked-at hero's bar ignored clicks — the earlier test drove a fake page); engine/generated/movements.md, 'Missing: 357 of 521 movements'; add-item --repoint moved three dependants off abandoned ids (rule.afflictions-at-zero now in the queue). Andrew ruled: the Leap fix holds (report was the Orphanage); every shield power plays a raise-the-shield motion (filed viewer.shield-guard-motion); a self power fires on a double-click. Combined from HBT-worker-engine; every suite green. Tried: nothing abandoned; combine failed three times on 5 s test timeouts under load from other chats (task suggested). Next: Andrew to try the shield powers in the Orphanage; then the queue's top, fix.one-hero-assembly.
New chat with Heroes of Blight and Tragic — engine: take the top of the queue (fix.one-hero-assembly, then fix.opening-levels)
  start engine
Last landing: 2026-10-02 06:19 (fix.shield-power-double-click). Previous chat ended: on a wrap, 2026-10-02 07:45
Ungated since last wrap: 27
  e2e78ed 2026-10-01 23:33 Andrew Ring — .state/shards.json: the engine suite (1/1) passed on the merged tree b5b478d095 (fix.shield-power-do
  a3f41c5 2026-10-01 23:22 Andrew Ring — combine: engine master 6ae3895 into this copy
  ab7c1ee 2026-10-01 23:22 Andrew Ring — .state/shards.json: the engine suite (1/1) passed on tree 6820a1637e after fix.shield-power-double-c
  6ae3895 2026-10-01 23:06 Andrew Ring — generated/movements.{json,md} regenerated (npx tsx tools/movements.mts) on the combined copy
  a399fb5 2026-10-01 23:01 Andrew Ring — combine: engine master 5f5a128 into this copy
  0431b7a 2026-10-01 22:48 Andrew Ring — combine: engine master 8bda948 into this copy
  5f5a128 2026-10-01 22:40 Andrew Ring — combine: engine master 8bda948 into this copy
  16ce210 2026-10-01 22:39 Andrew Ring — .state/shards.json: the whole suite (--shard 1/1) passed on tree bad62064ce after movement.inventory
  8bda948 2026-10-01 22:36 Andrew Ring — DECISIONS.md: Andrew's 2026-10-01 play report - a self power fires on a double-click on its bar butt
  b91a3f7 2026-10-01 22:30 Andrew Ring — DECISIONS.md: Andrew's 2026-10-01 answers in the engine chat - every shield power plays a raise-the-
  b68912b 2026-10-01 22:29 Andrew Ring — DECISIONS.md: Andrew - the approved male hero outfits come into the project, 'quite important' (2026
  8bd0f64 2026-10-01 22:19 Andrew Ring — combine: engine master a8594f2 into this copy
  a8594f2 2026-10-01 22:04 Andrew Ring — combine: engine master 841e60b into this copy
  b3d6169 2026-10-01 22:01 Andrew Ring — combine: engine master 841e60b into this copy
  007ac44 2026-10-01 22:00 Andrew Ring — .state/shards.json: the whole suite (--shard 1/1) passed on tree a5b77d0fd9 after movement.swap-and-
  841e60b 2026-10-01 21:56 Andrew Ring — tools/add-item.mjs --repoint <abandoned> <refiled>: a pending item's needs move from an abandoned id
  2b1443a 2026-10-01 21:54 Andrew Ring — combine: engine master 29916c1 into this copy
  29916c1 2026-10-01 21:54 Andrew Ring — DECISIONS.md: Andrew's 2026-10-01 answers to the content chat - an enemy's crit chance stops at 0 (a
  b29645e 2026-10-01 21:42 Andrew Ring — combine: engine master 78e999f into this copy (content.afflictions-at-zero-refiled's worker). Confli
  6614e62 2026-10-01 21:36 Andrew Ring — Merge main (master) into worker/kingdom
  47f5775 2026-10-01 21:35 Andrew Ring — kingdom.opening-loop-three: the gate's check records - check passed on attempt 1 (2026-10-02 02:37, 
  78e999f 2026-10-01 21:34 Andrew Ring — .state/shards.json: the whole suite (--shard 1/1) passed on tree 0b8427f (2026-10-02)
  4a1e0c4 2026-10-01 19:37 Andrew Ring — combine: engine master 9ace124 into this copy
  ed81366 2026-10-01 19:28 Andrew Ring — combine: engine master 64224bc into this copy
  2230e4c 2026-10-01 18:48 Andrew Ring — Merge main (master) into worker/kingdom
  c2cad4c 2026-10-01 18:06 Andrew Ring — backlog.viewer-kingdom: kingdom.opening-loop-three split into four - kingdom.sandbox-campaign-heroes
  91753b3 2026-10-01 17:55 Andrew Ring — Merge main (c1db5b7) into worker/kingdom: gate-progress.viewer-kingdom.json takes main's record (a l
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: fix.one-hero-assembly [engine · plumbing], then fix.opening-levels [engine · data], then rule.afflictions-at-zero [engine · rule] (+3 more)
Delegate: fix.one-hero-assembly [engine · plumbing] — not yet gated; fix.opening-levels [engine · data] — not yet gated; rule.afflictions-at-zero [engine · rule] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated; kingdom.opening-run-six [kingdom · plumbing] — not yet gated; viewer.shield-guard-motion [viewer · plumbing] — not yet gated
Blocked: kingdom.opening-loop needs encounter.opening.bridge; kingdom.reads-engine needs fix.one-hero-assembly; viewer.affliction-pop-up needs rule.afflictions-at-zero
Calls since last wrap: none
Stack for fix.one-hero-assembly:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  src/core and the mutator that owns the field · test/ — the probe before the prose

## The chat's commits since the last wrap (1bd20f0)

- e2e78ed 2026-10-01 23:33 .state/shards.json: the engine suite (1/1) passed on the merged tree b5b478d095 (fix.shield-power-double-click)
- a3f41c5 2026-10-01 23:22 combine: engine master 6ae3895 into this copy
- ab7c1ee 2026-10-01 23:22 .state/shards.json: the engine suite (1/1) passed on tree 6820a1637e after fix.shield-power-double-click
- b6518a0 2026-10-01 23:19 fix.shield-power-double-click: Ruled 2026-10-01 (Andrew, engine/DECISIONS.md 'a self power fires on a d
- 6ae3895 2026-10-01 23:06 generated/movements.{json,md} regenerated (npx tsx tools/movements.mts) on the combined copy
- a399fb5 2026-10-01 23:01 combine: engine master 5f5a128 into this copy
- 0431b7a 2026-10-01 22:48 combine: engine master 8bda948 into this copy
- 2eaa1b8 2026-10-01 22:46 viewer.male-hero-outfits: Ruled 2026-10-01 (Andrew, DECISIONS.md 'the approved male hero outfits c
- 5f5a128 2026-10-01 22:40 combine: engine master 8bda948 into this copy
- 16ce210 2026-10-01 22:39 .state/shards.json: the whole suite (--shard 1/1) passed on tree bad62064ce after movement.inventory
- 779104a 2026-10-01 22:37 movement.inventory: Ruled 2026-10-01 (Andrew, engine/DECISIONS.md 'the movements'): 'We need
- 8bda948 2026-10-01 22:36 DECISIONS.md: Andrew's 2026-10-01 play report - a self power fires on a double-click on its bar button (filed fix.shield-power-double-click, top of the queue); the Leap fix holds
- b91a3f7 2026-10-01 22:30 DECISIONS.md: Andrew's 2026-10-01 answers in the engine chat - every shield power plays a raise-the-shield motion (filed viewer.shield-guard-motion); the Leap report came from the Orphanage, not the Lumberjack House
- b68912b 2026-10-01 22:29 DECISIONS.md: Andrew - the approved male hero outfits come into the project, 'quite important' (2026-10-01); filed viewer.male-hero-outfits at the top of the viewer-kingdom queue
- 8bd0f64 2026-10-01 22:19 combine: engine master a8594f2 into this copy
- 89dcded 2026-10-01 22:17 viewer.real-bodies: Ruled 2026-10-01 (Andrew, DECISIONS.md 'the camera redesigned on the car
- a8594f2 2026-10-01 22:04 combine: engine master 841e60b into this copy
- 1f58af4 2026-10-01 22:03 content.bridge-deck-pack: Ruled 2026-09-30 (DECISIONS.md 'the Bridge's northern branch is walkable
- b3d6169 2026-10-01 22:01 combine: engine master 841e60b into this copy
- 007ac44 2026-10-01 22:00 .state/shards.json: the whole suite (--shard 1/1) passed on tree a5b77d0fd9 after movement.swap-and-shields
- b309bd2 2026-10-01 21:57 movement.swap-and-shields: Ruled 2026-10-01 (Andrew, engine/DECISIONS.md 'the movements'): 'weapon
- 841e60b 2026-10-01 21:56 tools/add-item.mjs --repoint <abandoned> <refiled>: a pending item's needs move from an abandoned id to its re-filed one (Andrew, 2026-10-01, DECISIONS 'the abandoned ids' dependants are repointed')
- 2b1443a 2026-10-01 21:54 combine: engine master 29916c1 into this copy
- 29916c1 2026-10-01 21:54 DECISIONS.md: Andrew's 2026-10-01 answers to the content chat - an enemy's crit chance stops at 0 (already the engine's floor; nothing built), the Bridge deck goes into the pack (filed content.bridge-deck-pack), the engine chat repoints the abandoned ids' dependants
- dd3b0d9 2026-10-01 21:50 viewer.xcom-camera-tuning: Ruled 2026-10-01 (Andrew, DECISIONS.md 'the first look at the XCOM camer
- e7e1b45 2026-10-01 21:47 viewer.side-facing: Ruled 2026-10-01 (Andrew, DECISIONS.md 'the first look at the XCOM camer
- b29645e 2026-10-01 21:42 combine: engine master 78e999f into this copy (content.afflictions-at-zero-refiled's worker). Conflicts resolved:
- aca491d 2026-10-01 21:38 kingdom.opening-loop-three: PLAYABLE-OPENING-PLAN.md item 12. Ruled 2026-09-29: one page, one sittin
- 6614e62 2026-10-01 21:36 Merge main (master) into worker/kingdom
- 47f5775 2026-10-01 21:35 kingdom.opening-loop-three: the gate's check records - check passed on attempt 1 (2026-10-02 02:37, 16 checks recorded in gate-progress.viewer-kingdom.json; gauntlet-log line appended). Check only: the item is not landed (no --land run); its kingdom work is kingdom be35831 on worker/kingdom.
- 78e999f 2026-10-01 21:34 .state/shards.json: the whole suite (--shard 1/1) passed on tree 0b8427f (2026-10-02)
- 4a1e0c4 2026-10-01 19:37 combine: engine master 9ace124 into this copy
- ed81366 2026-10-01 19:28 combine: engine master 64224bc into this copy
- ea43b1e 2026-10-01 19:18 content.afflictions-at-zero-refiled: Re-files content.afflictions-at-zero (abandoned 2026-10-01: filed withou
- 2230e4c 2026-10-01 18:48 Merge main (master) into worker/kingdom
- 88e47ec 2026-10-01 18:47 kingdom.opening-rewards: kingdom.opening-loop-three, part 3 of 4. The opening's rewards as ruled
- 06b9dfb 2026-10-01 18:27 kingdom.encounter-result-fold: kingdom.opening-loop-three, part 2 of 4; V2-ROADMAP.md R8 (the battle-to
- bb21347 2026-10-01 18:10 kingdom.sandbox-campaign-heroes: kingdom.opening-loop-three, part 1 of 4 (filed 2026-10-01 by the kingdom
- c2cad4c 2026-10-01 18:06 backlog.viewer-kingdom: kingdom.opening-loop-three split into four - kingdom.sandbox-campaign-heroes, kingdom.encounter-result-fold (V2-ROADMAP R8 for encounters), kingdom.opening-rewards, and the page chain; its needs re-pointed from the abandoned encounter.opening.bridge-ai to encounter.opening.bridge-ai-refiled
- 91753b3 2026-10-01 17:55 Merge main (c1db5b7) into worker/kingdom: gate-progress.viewer-kingdom.json takes main's record (a landing's scratch progress, cleared on landing)
- ccdc42f 2026-10-01 17:53 kingdom.abbotown-map: PLAYABLE-OPENING-PLAN.md item 11. Ruled 2026-09-29: the Retaking Abbotow

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue (fix.one-hero-assembly, then fix.opening-levels)
```
start engine
```
