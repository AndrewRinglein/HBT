# engine — handoff 2026-10-02 03:33

*Produced by tools/handoff.mjs from .state/now.json, which tools/wrap.mjs writes. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs printed and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next movement.swap-and-shields, 269 of 322 landed · 30 await review · 16 pending
Now: encounter.opening.gates, encounter.opening.cathedral, fix.one-effect-vocabulary, fix.turn-mods-expire, viewer.live-stat-mods — the opening's battles 5 and 6, one effect vocabulary, and Andrew's Leap report. Landed: Gates (the Curse: six defenders, the curse strike on Turn 4, two Imps on Turn 7) and Cathedral (the Necromancer raising two a turn over the 33 remains, Ghouls on Turn 5) — both 0 wins on the level-1 party, as recorded before the upgrades; one Effect union and one applyEffect for triggers, powers, move riders and chart rows, one dealDirectDamage, one packet planner, legacy power fields retired, C20 end of Activation (Frenzy Potion, Charging Run), Creeping Blight paints layer.poisoned, the Lieutenant Demon's +1 Health aura now works; a Turn-long mod leaves with statmod.expired; the stat window shows sheet + live modifiers (Move 4, Accuracy 55%, Max HP 16 for the Iron Dwarf, Strength 6 after a Leap) and attack numbers move with them. Combined from HBT-worker-engine; every suite green. Tried: nothing abandoned. Next: Andrew - which 'modifier log' did not show the Leap (the panel's Modifiers list, the battle log, or the attack forecast)?; then the queue's top, movement.swap-and-shields.
New chat with Heroes of Blight and Tragic — engine: take the top of the queue (movement.swap-and-shields, then fix.one-hero-assembly)
  start engine
Last landing: 2026-10-02 03:23 (viewer.live-stat-mods). Previous chat ended: on a wrap, 2026-10-02 03:33
Ungated since last wrap: 26
  7ceef6d 2026-10-01 19:49 Andrew Ring — combine: engine master 2293446 into this copy
  46741f1 2026-10-01 19:49 Andrew Ring — combine: engine master 64224bc into this copy (fix.one-effect-vocabulary's worker). Conflicts: tools
  2293446 2026-10-01 19:41 Andrew Ring — .state/shards.json: the gate's shard record for the current tree (combine and suite runs, 2026-10-01
  9ace124 2026-10-01 19:28 Andrew Ring — DECISIONS.md: Andrew - facing is kept: a unit faces where it walks, turns to face an enemy that step
  64224bc 2026-10-01 19:25 Andrew Ring — DECISIONS.md: Andrew's first look at the XCOM camera, the weapons and the bodies (2026-10-01) - hero
  de74bb4 2026-10-01 18:50 Andrew Ring — combine: engine master fc485ad into this copy
  6608e05 2026-10-01 18:40 Andrew Ring — combine: engine master ab6db71 into this copy
  1172405 2026-10-01 18:40 Andrew Ring — tools/prior-art.mjs: jscpd finds clones on Windows - clonesOf calls jscpd's detectClones API in a ch
  0f89150 2026-10-01 18:03 Andrew Ring — test: opening-party counts five opening scenarios - Gates joined as battle 5
  da304d0 2026-10-01 17:52 Andrew Ring — combine: engine master c1db5b7 into this copy
  7cf0693 2026-10-01 17:47 Andrew Ring — gate: a viewer or kingdom item's tests may already be committed in its package (its gate builds from
  f1a69e1 2026-10-01 17:45 Andrew Ring — DECISIONS.md: Andrew's 2026-10-01 rulings - the afflictions at 0 Health, bleed-out as a stat, the XC
  05bbdc2 2026-10-01 17:40 Andrew Ring — gate: a viewer or kingdom item's tests run with --dir test (a filter alone also matched parked copie
  7d28496 2026-10-01 17:38 Andrew Ring — prior-art: call jscpd's library from the root with relative, forward-slash paths — its CLI resolved 
  b5d1013 2026-10-01 17:36 Andrew Ring — encounter.opening.cathedral follow-up: Law 10, opening-party.test.ts's list of opening scenarios gai
  94aaf0d 2026-10-01 17:22 Andrew Ring — gate: the ignored-files pathspec in double quotes — execSync runs cmd.exe on Windows, which passes s
  817b791 2026-10-01 17:19 Andrew Ring — gate: a viewer or kingdom item's own tests are read, run and hashed in that package's test/ — since 
  b5f084c 2026-10-01 15:40 Andrew Ring — tools/engine-modules.mjs: find the engine's installed libraries from any copy of the folder (HOBAT_E
  33c3f8b 2026-10-01 15:37 Andrew Ring — Move the viewer and kingdom page tests out of engine/test: six to viewer/test, seven to kingdom/test
  c76fe55 2026-10-01 15:34 Andrew Ring — .gitattributes: ledger.md and gauntlet-log.jsonl merge as a union — both workers' appended lines are
  b792bd6 2026-10-01 15:33 Andrew Ring — gate and wrap commit only the files the item touched, never git add -A (tools/commit-only.mjs) (Andr
  2a33aa7 2026-10-01 15:31 Andrew Ring — One to-do list and one gate progress file per area: .state/backlog.<area>.json and .state/gate-progr
  803cede 2026-10-01 15:21 Andrew Ring — start.mjs: list every commit since the last wrap that did not go through the gate (not authored by c
  0b4523f 2026-10-01 15:21 Andrew Ring — wrap writes only .state/now.json; tools/handoff.mjs produces HANDOFF.md and STATE-ROW.md from it — n
  9892083 2026-10-01 15:19 Andrew Ring — gate: the landing's gauntlet-log line goes into the landing commit (logged before the amend), not a 
  49b7dca 2026-10-01 15:18 Andrew Ring — tools/code-stamp.mjs: the engine's code stamp — a hash of src/, the two tools the viewer runs and th
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: movement.swap-and-shields [movement · plumbing], then fix.one-hero-assembly [engine · plumbing], then fix.opening-levels [engine · data] (+6 more)
Delegate: movement.swap-and-shields [movement · plumbing] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; fix.opening-levels [engine · data] — not yet gated; viewer.side-facing [viewer · plumbing] — not yet gated; viewer.xcom-camera-tuning [viewer · plumbing] — not yet gated; viewer.real-bodies [viewer · plumbing] — not yet gated; kingdom.abbotown-map [kingdom · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated; content.afflictions-at-zero [content · data] — not yet gated
Blocked: movement.inventory needs movement.swap-and-shields; kingdom.opening-loop needs encounter.opening.bridge; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers; rule.afflictions-at-zero needs content.afflictions-at-zero; kingdom.opening-loop-three needs kingdom.abbotown-map, encounter.opening.bridge-ai; kingdom.opening-run-six needs kingdom.abbotown-map; viewer.affliction-pop-up needs rule.afflictions-at-zero
Calls since last wrap: none
Stack for movement.swap-and-shields:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  src/core and the mutator that owns the field · test/ — the probe before the prose

## The chat's commits since the last wrap (7d6e8bd)

- 4f92b86 2026-10-01 20:23 viewer.live-stat-mods: Reported 2026-10-01 (Andrew, playing the Lumberjack House): "The Leap fr
- 3d96849 2026-10-01 20:16 fix.turn-mods-expire: Reported 2026-10-01 (Andrew, playing the Lumberjack House): the Warrior'
- 7ceef6d 2026-10-01 19:49 combine: engine master 2293446 into this copy
- 46741f1 2026-10-01 19:49 combine: engine master 64224bc into this copy (fix.one-effect-vocabulary's worker). Conflicts: tools/prior-art.mjs takes master's jscpd fix (1172405, the same fix as this copy's 7d28496); opening-party.test.ts keeps master's Gates line and adds the Cathedral; SWITCHES.md keeps both sections; battle-cursor.test.ts layers one-effect over fix.codex-numbers (fixture re-captured over battle-cursor-codex-numbers.json: test.opening-gates also moves, the Lieutenant Demon's aura); .state/baseline.hash and generated/vocabulary.json regenerated; the pack rebuilt from the merged content. Engine suite: 2425 pass.
- 2293446 2026-10-01 19:41 .state/shards.json: the gate's shard record for the current tree (combine and suite runs, 2026-10-01)
- 9ace124 2026-10-01 19:28 DECISIONS.md: Andrew - facing is kept: a unit faces where it walks, turns to face an enemy that steps next to it (the latest wins) and anyone who attacks it (2026-10-01); viewer.side-facing's spec follows
- 64224bc 2026-10-01 19:25 DECISIONS.md: Andrew's first look at the XCOM camera, the weapons and the bodies (2026-10-01) - heroes face right, enemies left; the wheel a little further; the edge scroll must work; their items filed (viewer.side-facing, viewer.xcom-camera-tuning)
- ad2c738 2026-10-01 19:00 fix.one-effect-vocabulary: Duplication review 2026-09-28, findings E5 E6 E7 E8 C7 C13 C14 C20. One
- de74bb4 2026-10-01 18:50 combine: engine master fc485ad into this copy
- fc485ad 2026-10-01 18:47 viewer.characters-unfaded: Ruled 2026-10-01 (Andrew, DECISIONS.md 'the camera redesigned on the car
- 6608e05 2026-10-01 18:40 combine: engine master ab6db71 into this copy
- 1172405 2026-10-01 18:40 tools/prior-art.mjs: jscpd finds clones on Windows - clonesOf calls jscpd's detectClones API in a child, not the CLI's --config
- ab6db71 2026-10-01 18:38 viewer.unit-card-bar: Ruled 2026-10-01 (Andrew, DECISIONS.md 'the camera redesigned on the car
- 47fb74c 2026-10-01 18:25 viewer.xcom-camera: Ruled 2026-10-01 (Andrew, engine/DECISIONS.md 'the XCOM-style camera'):
- 0f89150 2026-10-01 18:03 test: opening-party counts five opening scenarios - Gates joined as battle 5
- da304d0 2026-10-01 17:52 combine: engine master c1db5b7 into this copy
- ed8812e 2026-10-01 17:52 fix.codex-numbers-refiled: Re-files fix.codex-numbers (abandoned 2026-10-01: filed without probeIds
- c1db5b7 2026-10-01 17:48 viewer.weapons-in-hand: Ruled 2026-10-01 (Andrew, DECISIONS.md 'the camera redesigned on the car
- 7cf0693 2026-10-01 17:47 gate: a viewer or kingdom item's tests may already be committed in its package (its gate builds from that commit) - that package's commits naming the item count as touched for its own tests, brought-its-own-tests, existing-tests-untouched and the kill switch (GBH SWITCHES gate.testsHome)
- f1a69e1 2026-10-01 17:45 DECISIONS.md: Andrew's 2026-10-01 rulings - the afflictions at 0 Health, bleed-out as a stat, the XCOM-style camera, the movements, the six-battle run, the order; their items filed
- 05bbdc2 2026-10-01 17:40 gate: a viewer or kingdom item's tests run with --dir test (a filter alone also matched parked copies under scratch/), and their diagnostics stay in engine/runs, not in the package's tree the gate is hashing (GBH SWITCHES gate.testsHome)
- 7d28496 2026-10-01 17:38 prior-art: call jscpd's library from the root with relative, forward-slash paths — its CLI resolved the config's paths to absolute backslashed ones, which its glob read as escapes, so on Windows it matched no file, wrote no report, and the clone check (and test/prior-art.test.ts 'jscpd finds a function copied into another package') failed with ENOENT on jscpd-report.json on Andrew's PC.
- b5d1013 2026-10-01 17:36 encounter.opening.cathedral follow-up: Law 10, opening-party.test.ts's list of opening scenarios gains test.opening-gates and test.opening-cathedral (battles 5 and 6, positions 5 and 6) — the list grows as the Bridge's did on 2026-09-30, and every assertion on it (an opening position, no named heroes, no Alpha hero over five replicates) now runs on both. The fast gate ran only each item's own tests; the full suite found it.
- 37242d7 2026-10-01 17:28 encounter.opening.cathedral: Battle 6, Cathedral (DECISIONS.md 2026-09-28 'the Cathedral encounter').
- 817b21d 2026-10-01 17:22 encounter.opening.gates: Battle 5, Gates - the old Curse encounter (DECISIONS.md 2026-09-28 'Gate
- 94aaf0d 2026-10-01 17:22 gate: the ignored-files pathspec in double quotes — execSync runs cmd.exe on Windows, which passes single quotes through literally, so git refused ':!tools/jscpd/node_modules' as an invalid path and every --land on Andrew's PC was refused with that error as its "ignored files" list. Double quotes work in cmd and sh alike.
- 817b791 2026-10-01 17:19 gate: a viewer or kingdom item's own tests are read, run and hashed in that package's test/ — since 33c3f8b moved them there, no such item could pass 'brought its own tests' (GBH SWITCHES gate.testsHome)
- b5f084c 2026-10-01 15:40 tools/engine-modules.mjs: find the engine's installed libraries from any copy of the folder (HOBAT_ENGINE_MODULES, this copy, the main worktree, a local clone's origin) and link engine/node_modules to them (Andrew, 2026-10-01)
- 33c3f8b 2026-10-01 15:37 Move the viewer and kingdom page tests out of engine/test: six to viewer/test, seven to kingdom/test (Andrew, 2026-10-01)
- c76fe55 2026-10-01 15:34 .gitattributes: ledger.md and gauntlet-log.jsonl merge as a union — both workers' appended lines are kept, no conflict (Andrew, 2026-10-01)
- b792bd6 2026-10-01 15:33 gate and wrap commit only the files the item touched, never git add -A (tools/commit-only.mjs) (Andrew, 2026-10-01)
- 2a33aa7 2026-10-01 15:31 One to-do list and one gate progress file per area: .state/backlog.<area>.json and .state/gate-progress.<area>.json for engine, viewer-kingdom, content, art (tools/backlog.mjs) — so workers in different areas never write the same list (Andrew, 2026-10-01)
- 803cede 2026-10-01 15:21 start.mjs: list every commit since the last wrap that did not go through the gate (not authored by combat-framework) (Andrew, 2026-10-01)
- 0b4523f 2026-10-01 15:21 wrap writes only .state/now.json; tools/handoff.mjs produces HANDOFF.md and STATE-ROW.md from it — no archive copy and no wraps.json, git holds both (Andrew, 2026-10-01)
- 9892083 2026-10-01 15:19 gate: the landing's gauntlet-log line goes into the landing commit (logged before the amend), not a commit of its own (Andrew, 2026-10-01)
- 49b7dca 2026-10-01 15:18 tools/code-stamp.mjs: the engine's code stamp — a hash of src/, the two tools the viewer runs and the lockfile at HEAD; export-battle stamps it instead of HEAD, so a ruling re-exports byte-identical battles (Andrew, 2026-10-01)

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue (movement.swap-and-shields, then fix.one-hero-assembly)
```
start engine
```
