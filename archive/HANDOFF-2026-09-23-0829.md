# engine — handoff 2026-09-23 08:29

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next content.v2-shields, 154 of 189 landed · 1 await review · 13 sealed · 30 pending
Now: Process ruling 2026-09-23 recorded in DECISIONS.md, not yet built. Tried: nothing further after the previous wrap. Next: make the four changes - one chat per feature across packages (DISPLAY-RULES rule 38), landing runs item tests + typecheck + control battles only, wrap refuses without all four shards green, one item per feature (merge content.v2-shields and content.v2-weapon-block and the kingdom hands rule into one V2 shields item), drop seals and exemptions - then land V2 shields end to end.
New chat with Heroes of Blight and Tragic — engine: make the four process changes Andrew approved, then land V2 shields end to end across engine, content and kingdom
  start engine
Last landing: 2026-09-23 08:24 (plumbing.shield-class). Previous chat ended: on a wrap, 2026-09-23 08:29
WRAP NOT COMMITTED: 2026-09-23 08:29 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: Process ruling 2026-09-23 recorded in DECISIONS.md, not yet built. Tried: nothing further after the previous wrap. Next: make the four changes - one chat per feature across packages (DISPLAY-RULES rule 38), landing runs item tests + typecheck + control battles only, wrap refuses without all four shards green, one item per feature (merge content.v2-shields and content.v2-weapon-block and the kingdom hands rule into one V2 shields item), drop seals and exemptions - then land V2 shields end to end."
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

## The chat's commits since the last committed wrap (d2e0ed1)

- be26f68 2026-09-23 01:29 DECISIONS: 2026-09-23 - less process per feature (Andrew: yes to all four)
- 89525eb 2026-09-23 01:24 wrap: plumbing.shield-class - V2 R1 part 1, landed 3c28971 (seal withheld: two plumbing exemptions). Tried: made the gate fit Cowork - suite in four --shard commands, one suite run per landing, no pos

## Next chat

New chat with Heroes of Blight and Tragic — engine: make the four process changes Andrew approved, then land V2 shields end to end across engine, content and kingdom
```
start engine
```
