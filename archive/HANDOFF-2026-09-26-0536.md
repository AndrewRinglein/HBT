# engine — handoff 2026-09-26 05:36

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next fix.masterwork-scope, 187 of 216 landed · 18 await review · 3 pending
Now: Masterwork ruled wider (Andrew 2026-09-25, DECISIONS 8c3691d; GEAR-DESIGN §3 root 14981dd): tier-1 two-handers, one-handers, shields and armor; +1 Max Stamina unchanged; shields still never enchanted. Filed fix.masterwork-scope at the top of the queue: content/mkenginepack.mjs and the kingdom's tools/mk-items.mjs both still hard-code two-handers and armor, never a shield; SWITCHES longswordMasterwork superseded. Earlier this chat: viewer.* (9) and content.art-manifest closed (DECISIONS 33597a3); sim.coverage 1625c8c and seam.unit-mods 9541224 landed clean; pack.derived-rows 0bddb52 landed FLAGGED (one test filter line) with content 9ecd110. Four shards green on tree 1084a1d48f; audit-all still times out in Cowork, its parts run by hand and green. Owed from pack.derived-rows: weapon-enchant rows still carry hero stats and Far/Long bow-only vs GEAR-DESIGN §3 (2026-09-05); mkenginepack's tier-3 rule silently drops an enchant's damage bonus (Law 9); kingdom FieldedMods to heroMods; viewer does not fold unit.modified. system.ai-modes is design-first with Angela; content.mage-staff waits on unit.brute. Next: fix.masterwork-scope, engine pack and kingdom generator together.
New chat with Heroes of Blight and Tragic — engine: fix.masterwork-scope, masterwork for one-handers and shields
  start engine
Last landing: 2026-09-26 03:57 (pack.derived-rows). Previous chat ended: on a wrap, 2026-09-26 05:36
WRAP NOT COMMITTED: 2026-09-26 05:36 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: Masterwork ruled wider (Andrew 2026-09-25, DECISIONS 8c3691d; GEAR-DESIGN §3 root 14981dd): tier-1 two-handers, one-handers, shields and armor; +1 Max Stamina unchanged; shields still never enchanted. Filed fix.masterwork-scope at the top of the queue: content/mkenginepack.mjs and the kingdom's tools/mk-items.mjs both still hard-code two-handers and armor, never a shield; SWITCHES longswordMasterwork superseded. Earlier this chat: viewer.* (9) and content.art-manifest closed (DECISIONS 33597a3); sim.coverage 1625c8c and seam.unit-mods 9541224 landed clean; pack.derived-rows 0bddb52 landed FLAGGED (one test filter line) with content 9ecd110. Four shards green on tree 1084a1d48f; audit-all still times out in Cowork, its parts run by hand and green. Owed from pack.derived-rows: weapon-enchant rows still carry hero stats and Far/Long bow-only vs GEAR-DESIGN §3 (2026-09-05); mkenginepack's tier-3 rule silently drops an enchant's damage bonus (Law 9); kingdom FieldedMods to heroMods; viewer does not fold unit.modified. system.ai-modes is design-first with Angela; content.mage-staff waits on unit.brute. Next: fix.masterwork-scope, engine pack and kingdom generator together."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: fix.masterwork-scope [content · data], then system.ai-modes [station · rule]
Delegate: fix.masterwork-scope [content · data] — not yet gated; system.ai-modes [station · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute
Calls since last wrap: none
Stack for fix.masterwork-scope:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (d1b2191)

- 8c3691d 2026-09-26 05:27 DECISIONS: masterwork applies to one-handers and shields too (Andrew 2026-09-25); fix.masterwork-scope filed; longswordMasterwork superseded
- c3d67c7 2026-09-26 04:09 wrap: viewer.* (9) and content.art-manifest closed as superseded by the viewer package on Andrew's ruling (DECISIONS 33597a3; empty assets/vfx deleted, native stun/slow/protection effects carried to V

## Next chat

New chat with Heroes of Blight and Tragic — engine: fix.masterwork-scope, masterwork for one-handers and shields
```
start engine
```
