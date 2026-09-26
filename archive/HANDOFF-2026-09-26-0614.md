# engine — handoff 2026-09-26 06:14

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next system.ai-modes, 188 of 216 landed · 18 await review · 2 pending
Now: fix.masterwork-scope landed clean across three packages (Andrew 2026-09-25: masterwork for tier-1 two-handers, one-handers, shields and armor; shields still never enchanted): engine f6cfb29 (test/fix-masterwork-scope.test.ts red 4/5 before, green after), content 21532e5 (mkenginepack rule widened), kingdom aa5eb36 (mk-items rule widened; ISC-058 restated to the ruling under LAW 10, re-seen red, green), root c1013f7 (GEAR-IMPLEMENTATION ISC-058 Truth). 53 masterwork ids in each package, both directions. Four engine shards green on tree 7cb93a3336. Kingdom shards: only the three sandbox-build tests fail, pre-existing: viewer/generated/static.json stamped at engine 250e161 (56 commits stale) - owed to the viewer: re-dump static and fields at a clean engine. audit-all still times out in Cowork. Still owed from pack.derived-rows: weapon-enchant rows carry hero stats and Far/Long bow-only vs GEAR-DESIGN §3 (2026-09-05); mkenginepack tier-3 rule drops an enchant's damage bonus (Law 9); kingdom FieldedMods to heroMods; viewer does not fold unit.modified. Next: system.ai-modes, design-first with Angela; content.mage-staff waits on unit.brute.
New chat with Heroes of Blight and Tragic — engine: system.ai-modes, the AI modes design with Angela
  start engine
Last landing: 2026-09-26 05:44 (fix.masterwork-scope). Previous chat ended: on a wrap, 2026-09-26 06:14
WRAP NOT COMMITTED: 2026-09-26 06:14 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: fix.masterwork-scope landed clean across three packages (Andrew 2026-09-25: masterwork for tier-1 two-handers, one-handers, shields and armor; shields still never enchanted): engine f6cfb29 (test/fix-masterwork-scope.test.ts red 4/5 before, green after), content 21532e5 (mkenginepack rule widened), kingdom aa5eb36 (mk-items rule widened; ISC-058 restated to the ruling under LAW 10, re-seen red, green), root c1013f7 (GEAR-IMPLEMENTATION ISC-058 Truth). 53 masterwork ids in each package, both directions. Four engine shards green on tree 7cb93a3336. Kingdom shards: only the three sandbox-build tests fail, pre-existing: viewer/generated/static.json stamped at engine 250e161 (56 commits stale) - owed to the viewer: re-dump static and fields at a clean engine. audit-all still times out in Cowork. Still owed from pack.derived-rows: weapon-enchant rows carry hero stats and Far/Long bow-only vs GEAR-DESIGN §3 (2026-09-05); mkenginepack tier-3 rule drops an enchant's damage bonus (Law 9); kingdom FieldedMods to heroMods; viewer does not fold unit.modified. Next: system.ai-modes, design-first with Angela; content.mage-staff waits on unit.brute."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: system.ai-modes [station · rule]
Delegate: system.ai-modes [station · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute
Calls since last wrap: none
Stack for system.ai-modes:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/

## The chat's commits since the last committed wrap (ea2991f)

- f6cfb29 2026-09-26 05:44 fix.masterwork-scope: Andrew 2026-09-25 (DECISIONS.md, 'masterwork: one-handers and shields to
- 4b41fd0 2026-09-26 05:36 wrap: Masterwork ruled wider (Andrew 2026-09-25, DECISIONS 8c3691d; GEAR-DESIGN §3 root 14981dd): tier-1 two-handers, one-handers, shields and armor; +1 Max Stamina unchanged; shields still never ench

## Next chat

New chat with Heroes of Blight and Tragic — engine: system.ai-modes, the AI modes design with Angela
```
start engine
```
