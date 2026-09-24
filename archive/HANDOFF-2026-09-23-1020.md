# engine — handoff 2026-09-23 10:20

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next terrain.impassable-naming, 155 of 190 landed · 2 await review · 28 pending
Now: v2.shields — V2 R1. Done: the four process changes (landing = item tests + typecheck + control battles; wrap needs 4 green shards; one item per feature; no seals/exemptions); content shipped (content e312098: Kite/Round/Tower, six powers, sword/dagger Block, axe onBlock); engine landed aaf51a5 (flagged: 10 test files edited under Law 10 for the retired Knight Shield). Kingdom half v2.shields-hands is written, red recorded and green in its own tests but NOT landed and NOT committed (kingdom working tree): its full suite has two failures that predate it (isc-003 Atlas scene; sandbox-ui needs viewer metadata regenerated for the new engine commit) and its gate does not fit Cowork's 178 s. audit-all also does not fit. Next: regenerate viewer metadata, fix isc-003, then land v2.shields-hands from a terminal.
New chat with Heroes of Blight and Tragic — kingdom: regenerate the viewer metadata, fix isc-003, land v2.shields-hands
  start kingdom
Last landing: 2026-09-23 10:02 (v2.shields). Previous chat ended: on a wrap, 2026-09-23 10:20
WRAP NOT COMMITTED: 2026-09-23 10:20 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: v2.shields — V2 R1. Done: the four process changes (landing = item tests + typecheck + control battles; wrap needs 4 green shards; one item per feature; no seals/exemptions); content shipped (content e312098: Kite/Round/Tower, six powers, sword/dagger Block, axe onBlock); engine landed aaf51a5 (flagged: 10 test files edited under Law 10 for the retired Knight Shield). Kingdom half v2.shields-hands is written, red recorded and green in its own tests but NOT landed and NOT committed (kingdom working tree): its full suite has two failures that predate it (isc-003 Atlas scene; sandbox-ui needs viewer metadata regenerated for the new engine commit) and its gate does not fit Cowork's 178 s. audit-all also does not fit. Next: regenerate viewer metadata, fix isc-003, then land v2.shields-hands from a terminal."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: terrain.impassable-naming [naming · decision], then trigger.zombie.sap [content · trigger], then trigger.mage.kindle [content · trigger] (+18 more)
Delegate: terrain.impassable-naming [naming · decision] — not yet gated; trigger.zombie.sap [content · trigger] — not yet gated; trigger.mage.kindle [content · trigger] — not yet gated; station.vs-target [engine · station] — not yet gated; move.actions [engine · rule] — not yet gated; fix.start-of-turn-victory [engine · plumbing] — not yet gated; fix.outcome-enum [engine · plumbing] — not yet gated; fix.phase-ladder-config [engine · plumbing] — not yet gated; fix.retired-stations [engine · plumbing] — not yet gated; crit.branch-and-injuries [engine · rule] — not yet gated; hook.on-enter [engine · plumbing] — not yet gated; tool.effect-size-rules [engine · plumbing] — not yet gated; viewer.hexvfx-path [engine · plumbing] — not yet gated; viewer.geometry [engine · plumbing] — 1 attempt(s); content.art-manifest [content · data] — not yet gated; viewer.styles [engine · plumbing] — not yet gated; sim.coverage [engine · plumbing] — not yet gated; seam.unit-mods [engine · plumbing] — not yet gated; seam.spare-weapons [engine · plumbing] — not yet gated; pack.derived-rows [content · data] — not yet gated; system.ai-modes [station · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute; viewer.build needs viewer.geometry, content.art-manifest; viewer.board needs viewer.build, viewer.geometry; viewer.tile-state needs viewer.board; viewer.panel needs viewer.build; viewer.pump needs viewer.board, viewer.panel; viewer.log-transport needs viewer.pump
Calls since last wrap: none
Stack for terrain.impassable-naming:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  GLOSSARY.md — a new kind is Angela's · DECISIONS.md

## The chat's commits since the last committed wrap (17c8d2c)

- 4789cbd 2026-09-23 03:02 v2.shields: V2 R1, the whole feature in one item (Andrew, 2026-09-23: one item per f
- 882cacf 2026-09-23 02:19 v2.shields filed first: one item for V2 shields end to end; content.v2-shields and content.v2-weapon-block abandoned as merged (Andrew, 2026-09-23)
- fba0fab 2026-09-23 02:18 Process 2026-09-23 (Andrew, DECISIONS 'less process per feature'): landing runs item tests + typecheck + control battles; full suite once per chat as four shards, wrap refuses without them (--shards-green); seal and exemptions removed, engine-only plumbing skips appears-in-battle and kill switch
- 7c48c0b 2026-09-23 01:29 wrap: Process ruling 2026-09-23 recorded in DECISIONS.md, not yet built. Tried: nothing further after the previous wrap. Next: make the four changes - one chat per feature across packages (DISPLAY-RUL

## Next chat

New chat with Heroes of Blight and Tragic — kingdom: regenerate the viewer metadata, fix isc-003, land v2.shields-hands
```
start kingdom
```
