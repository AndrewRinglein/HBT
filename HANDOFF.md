# engine — handoff 2026-09-23 08:24

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next content.v2-shields, 154 of 189 landed · 1 await review · 13 sealed · 30 pending
Now: plumbing.shield-class - V2 R1 part 1, landed 3c28971 (seal withheld: two plumbing exemptions). Tried: made the gate fit Cowork - suite in four --shard commands, one suite run per landing, no post-land re-run, effect-size, audit-all or Game Builder rebuild inside it, --abandon runs no checks; abandoned R0 and the four August items the Codex replaced; filed R1 at the top. Next: content.v2-shields - author Kite, Round and Tower in the content package and publish the pack, then gate it here; kingdom loadout.ts must count shield class for hands too.
New chat with Heroes of Blight and Tragic — content: author the Kite, Round and Tower shields for engine item content.v2-shields and publish the pack
  start content
Last landing: 2026-09-23 08:24 (plumbing.shield-class). Previous chat ended: on a wrap, 2026-09-23 08:24
WRAP NOT COMMITTED: 2026-09-23 08:24 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: plumbing.shield-class - V2 R1 part 1, landed 3c28971 (seal withheld: two plumbing exemptions). Tried: made the gate fit Cowork - suite in four --shard commands, one suite run per landing, no post-land re-run, effect-size, audit-all or Game Builder rebuild inside it, --abandon runs no checks; abandoned R0 and the four August items the Codex replaced; filed R1 at the top. Next: content.v2-shields - author Kite, Round and Tower in the content package and publish the pack, then gate it here; kingdom loadout.ts must count shield class for hands too."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: content.v2-shields [content · data], then terrain.impassable-naming [naming · decision], then trigger.zombie.sap [content · trigger] (+19 more)
Delegate: content.v2-shields [content · data] — not yet gated; terrain.impassable-naming [naming · decision] — not yet gated; trigger.zombie.sap [content · trigger] — not yet gated; trigger.mage.kindle [content · trigger] — not yet gated; station.vs-target [engine · station] — not yet gated; move.actions [engine · rule] — not yet gated; fix.start-of-turn-victory [engine · plumbing] — not yet gated; fix.outcome-enum [engine · plumbing] — not yet gated; fix.phase-ladder-config [engine · plumbing] — not yet gated; fix.retired-stations [engine · plumbing] — not yet gated; crit.branch-and-injuries [engine · rule] — not yet gated; hook.on-enter [engine · plumbing] — not yet gated; tool.effect-size-rules [engine · plumbing] — not yet gated; viewer.hexvfx-path [engine · plumbing] — not yet gated; viewer.geometry [engine · plumbing] — 1 attempt(s); content.art-manifest [content · data] — not yet gated; viewer.styles [engine · plumbing] — not yet gated; sim.coverage [engine · plumbing] — not yet gated; seam.unit-mods [engine · plumbing] — not yet gated; seam.spare-weapons [engine · plumbing] — not yet gated; pack.derived-rows [content · data] — not yet gated; system.ai-modes [station · rule] — not yet gated
Blocked: content.v2-weapon-block needs content.v2-shields; content.mage-staff needs unit.brute; viewer.build needs viewer.geometry, content.art-manifest; viewer.board needs viewer.build, viewer.geometry; viewer.tile-state needs viewer.board; viewer.panel needs viewer.build; viewer.pump needs viewer.board, viewer.panel; viewer.log-transport needs viewer.pump
Calls since last wrap: none
Stack for content.v2-shields:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (3073f95)

- 3c28971 2026-09-23 01:24 plumbing.shield-class: V2 R1 part 1 - shield item class. itemClass 'shield' is a legal item cla
- 5bf80c3 2026-09-23 01:16 V2 R1 filed at the top of the queue: plumbing.shield-class, content.v2-shields, content.v2-weapon-block; add-item --first (Andrew, 2026-09-23)
- cbae9a3 2026-09-23 01:14 Abandoned unit.archer, unit.brute, ability.warrior.rally, ability.ranger.volley - superseded by the Codex (Andrew, 2026-09-23)
- bc4d3f0 2026-09-22 21:46 CLAUDE.md: --shard commands and Cowork timings; gate state from the shard runs
- 5c2e1a9 2026-09-22 21:38 Suite fits Cowork: workers capped at CPU count; two long battle tests get their own clocks (Law 10, reasons at the edit); shard output reads counts
- e7f1867 2026-09-22 21:22 gate: the test suite runs as four shard commands, each under Cowork's shell limit; the gate accepts the suite only when all four passed on the exact tree (Andrew, 2026-09-22)
- a03c7d3 2026-09-22 19:50 GAME-BUILDER.html rebuilt by review.mjs after the queue was cleared
- 53f35ab 2026-09-22 19:49 R0 abandoned, 57-landing review queue cleared, start stops printing it, engine CLAUDE.md matches the smaller gate; engine chats open without GBH (Andrew, 2026-09-22)
- 69b6858 2026-09-22 19:15 gate: cut the post-land re-run, effect-size, periodic audit-all and Game Builder rebuild from a landing; --abandon runs no checks (Andrew, 2026-09-22). Committed without the gate: the gate cannot finish a run in Cowork.
- df7bf73 2026-09-22 18:01 DECISIONS: 2026-09-22 ruling - gate drops typecheck, runs the full suite once
- badcea4 2026-09-21 16:00 CLAUDE.md: the real cause - a 178 s Cowork shell cap and a 1.4 ms-per-file mount, not the gate; and wrap.mjs commits add -A
- 79544c5 2026-09-21 15:59 wrap: plumbing.gate-recovery - V2 R0, still not landed, and no Cowork chat can land it. Tried: start ran; R0's nine files were already in place in engine/ and verified byte-identical to ../.scratch-r0

## Next chat

New chat with Heroes of Blight and Tragic — content: author the Kite, Round and Tower shields for engine item content.v2-shields and publish the pack
```
start content
```
