# engine — handoff 2026-10-02 13:50

*Produced by tools/handoff.mjs from .state/now.json, which tools/wrap.mjs writes. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs printed and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next fix.opening-levels, 289 of 334 landed · 40 await review · 5 pending
Now: fix.one-hero-assembly, kingdom.reads-engine, fix.orphans-teacher-knife — the duplication review's engine and kingdom halves, and Andrew's knives. Landed and combined into main: fix.one-hero-assembly-refiled (one assembler fieldedDef, one stat fold, one handsOf, one enterUnit; every weapon takes a hand; the Net a trinket with no hands — Andrew 2026-10-02), kingdom.reads-engine (the kingdom reads levels, items, set bonuses, hands, XP 2/5/15, classes, Fatigued and the Net's one use from the engine; K5 left, kingdom.opening-run-six retires it) and fix.orphans-teacher-knife-refiled (orphans and the school teacher field the Dagger wherever placed; Andrew 2026-10-02 'Dagger is fine'). All three flagged done-needs-review for edited tests. Tried: two items re-filed because they were declared to move control battles that never field them; kingdom.reads-engine landed before K16 was ruled (DECISIONS.md 3246) — that chat's brief told the worker never to stop. Asked Andrew, unanswered: K16's three (XP thresholds to level 10, one campaign id scheme, territory battles as Codex encounters) and Fatigued's -1 Max Stamina. The opening run is harder under 2 XP a kill (Bridge kills the Dawnblade; the Orphanage rescues no orphan). Next: fix.opening-levels.
New chat with Heroes of Blight and Tragic — engine: take the top of the queue (fix.opening-levels), then rule.afflictions-at-zero
  start engine
Last landing: 2026-10-02 13:32 (fix.orphans-teacher-knife-refiled). Previous chat ended: on a wrap, 2026-10-02 13:50
Ungated since last wrap: 10
  4ead971 2026-10-02 06:32 Andrew Ring — .state/shards.json: the whole suite (--shard 1/1, 2476 passed) passed on tree 7a112b4df8 (2026-10-02
  754cb49 2026-10-02 05:44 Andrew Ring — Merge branch 'master' into worker/engine
  749dacf 2026-10-02 04:29 Andrew Ring — combine: engine master cfc6a1a into this copy
  cfc6a1a 2026-10-02 03:25 Andrew Ring — fix.orphans-teacher-knife to the top of the engine queue; the knife is the Dagger (Andrew, 2026-10-0
  af2a027 2026-10-02 03:24 Andrew Ring — add-item: fix.orphans-teacher-knife filed (Andrew, 2026-10-02, DECISIONS 'the Net is a trinket with 
  74b31b4 2026-10-02 03:24 Andrew Ring — DECISIONS.md: the Net is a trinket with no hands; the orphans and the school teacher start with a kn
  b89b68f 2026-10-02 02:16 Andrew Ring — combine: engine master 803aa78 into this copy
  803aa78 2026-10-02 02:14 Andrew Ring — .state/shards.json: the whole suite (--shard 1/1) passed on tree f6f09083a1 (2026-10-02, after fix.d
  b1b99d3 2026-10-02 02:10 Andrew Ring — combine: engine master e000d59 into this copy
  41b7e96 2026-10-02 01:50 Andrew Ring — combine: engine master 36a0db8 into this copy
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: fix.opening-levels [engine · data], then rule.afflictions-at-zero [engine · rule], then viewer.shield-guard-motion [viewer · plumbing]
Delegate: fix.opening-levels [engine · data] — not yet gated; rule.afflictions-at-zero [engine · rule] — not yet gated; viewer.shield-guard-motion [viewer · plumbing] — not yet gated
Blocked: kingdom.opening-loop needs encounter.opening.bridge; viewer.affliction-pop-up needs rule.afflictions-at-zero
Calls since last wrap:
  fieldedDefSignature · 2026-10-02 · fieldedDef takes {items, stowed, used, progress, badges, heroMods} — what of the callers that pass (typeId, items, progress) (kingdom/src/ui/equip.ts, kingdom tests, 20-odd engine tests)?
  heroModsInPreview · 2026-10-02 · Does fieldedDef fold heroMods (set bonuses) into the def it returns?
  arrivalKit · 2026-10-02 · An encounter's setup unit or scheduled arrival goes through the one assembler — with its row's Codex default kit, or authored whole as before?
  zeroHandsScope · 2026-10-02 · "The pack loader refuses hands 0" — every item, or the held ones?
  foldWritesAuthored · 2026-10-02 · The three copies of the stat write-back left a row's authored optional stat (crit, luck, toughness, swapCost …) at its old value when a fold brought it back to its unfolded value. The one fold?
  unitLabel · 2026-10-02 · createBattle title-cased the whole typeId, an arrival only its last segment. Which label?
  assemblyLogLines · 2026-10-02 · With one assembler and one announcement, an enemy row's own badges and a fixture hero's kit and badges get their unit.badged / unit.equipped lines. Keep the old silence?
  fieldedPreviewMods · 2026-10-02 · The Equip card must show the battle's numbers for a set-bonus hero (K3), and fieldedDef does not fold heroMods (heroModsInPreview). How does a preview read them?
  usesPerBattleMax · 2026-10-02 · An item's uses for the kingdom (K8) when its powers carry different counts?
  netUsesOnAttack · 2026-10-02 · The Net (netIsAPower: a trinket) is one-use, but its only grant is an attack and it authors no active of its own. Where do its uses go?
  placedWithKitFlag · 2026-10-02 · The ruling names two rows that field their kit when an encounter places them; the core may not name a content instance. How does the one assembler know?
  placedWithKitEveryEncounter · 2026-10-02 · "wherever an encounter places them" — the Orphanage only, or the prologue rows too (prologue-1's orphans, prologue-3's teacher)?
  orphansKnifeRefiled · 2026-10-02 · fix.orphans-teacher-knife was filed with changesBaseline true ("the opening's control battles move"), but the gate's control battles (tools/baseline.mts, MAP_PANEL) field no Orphan Child, School Teacher or encounter-placed civilian, so they stay byte-identical and the consequence check can never pass. Land how?
Stack for fix.opening-levels:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last wrap (e1d6720)

- 4ead971 2026-10-02 06:32 .state/shards.json: the whole suite (--shard 1/1, 2476 passed) passed on tree 7a112b4df8 (2026-10-02, fix.orphans-teacher-knife-refiled, landed in 94d75e7)
- 94d75e7 2026-10-02 06:32 fix.orphans-teacher-knife-refiled: Re-files fix.orphans-teacher-knife (abandoned 2026-10-02: filed with cha
- 754cb49 2026-10-02 05:44 Merge branch 'master' into worker/engine
- 3e5274e 2026-10-02 05:35 kingdom.reads-engine: Duplication review 2026-09-28, findings K1-K18 and V10 (kingdom half). A
- 749dacf 2026-10-02 04:29 combine: engine master cfc6a1a into this copy
- 7659129 2026-10-02 04:28 kingdom.opening-run-six: Ruled 2026-10-01 (Andrew, engine/DECISIONS.md 'one continuous run throug
- cfc6a1a 2026-10-02 03:25 fix.orphans-teacher-knife to the top of the engine queue; the knife is the Dagger (Andrew, 2026-10-02: "Dagger is fine. Should go to the top of the list.")
- af2a027 2026-10-02 03:24 add-item: fix.orphans-teacher-knife filed (Andrew, 2026-10-02, DECISIONS 'the Net is a trinket with no hands; the orphans and the school teacher start with a knife')
- 74b31b4 2026-10-02 03:24 DECISIONS.md: the Net is a trinket with no hands; the orphans and the school teacher start with a knife (Andrew, 2026-10-02)
- b89b68f 2026-10-02 02:16 combine: engine master 803aa78 into this copy
- 803aa78 2026-10-02 02:14 .state/shards.json: the whole suite (--shard 1/1) passed on tree f6f09083a1 (2026-10-02, after fix.danger-skips-charge combined)
- b1b99d3 2026-10-02 02:10 combine: engine master e000d59 into this copy
- 41b7e96 2026-10-02 01:50 combine: engine master 36a0db8 into this copy
- 0892a82 2026-10-02 01:47 fix.one-hero-assembly-refiled: Re-files fix.one-hero-assembly (abandoned 2026-10-02: filed with changes

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue (fix.opening-levels), then rule.afflictions-at-zero
```
start engine
```
