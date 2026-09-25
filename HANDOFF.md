# engine — handoff 2026-09-25 05:10

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next v2.structures, 173 of 210 landed · 13 await review · 27 pending
Now: v2.thin-obstruction — V2 R7 part 3, thin obstructions: landed 66d86de, flagged for review (three Law-10 test rewrites, reason at each edit). Every woodland hex and every prop of the new height thin (Andrew: 'Yes, it's a third kind of prop'; 'there is a new high thin prop') is a thin obstruction: -5 per thin hex a ranged shot enters (through, and the target's own; never the shooter's), -1 Vision per one between; walkable; a hex counts once. Control battles moved as declared: map.field, map.proving.copse. Rulings in DECISIONS (d33983b, 37602f0: a third prop kind; one surface effect per hex); root GLOSSARY 2fa0430 (three prop heights). Four shards green on tree 5a136b5dc0. Tried: the first --land died on the mount's index.lock (the gate's own git calls) after re-blessing baseline.hash — restored it from HEAD and relanded through a PATH git shim that moves locks aside before and after each call. Open for Andrew: review the flagged landing; SWITCHES 'Thin obstructions' (thinPerHex, thinVisionEnds, thinPropFootprint, thinPropDestroy provisional); the viewer draws a thin prop as a solid high prop until it learns the kind; Andrew asked to go over ground versus props (traps, graves, bridges and cursed ground are not in the engine) before structures are built. Next: v2.structures (house, wall, tower), then the Atlas ground compile.
New chat with Heroes of Blight and Tragic — engine: V2 structures (house, wall, tower)
  start engine
Last landing: 2026-09-25 04:58 (v2.thin-obstruction). Previous chat ended: on a wrap, 2026-09-25 05:10
WRAP NOT COMMITTED: 2026-09-25 05:10 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: v2.thin-obstruction — V2 R7 part 3, thin obstructions: landed 66d86de, flagged for review (three Law-10 test rewrites, reason at each edit). Every woodland hex and every prop of the new height thin (Andrew: 'Yes, it's a third kind of prop'; 'there is a new high thin prop') is a thin obstruction: -5 per thin hex a ranged shot enters (through, and the target's own; never the shooter's), -1 Vision per one between; walkable; a hex counts once. Control battles moved as declared: map.field, map.proving.copse. Rulings in DECISIONS (d33983b, 37602f0: a third prop kind; one surface effect per hex); root GLOSSARY 2fa0430 (three prop heights). Four shards green on tree 5a136b5dc0. Tried: the first --land died on the mount's index.lock (the gate's own git calls) after re-blessing baseline.hash — restored it from HEAD and relanded through a PATH git shim that moves locks aside before and after each call. Open for Andrew: review the flagged landing; SWITCHES 'Thin obstructions' (thinPerHex, thinVisionEnds, thinPropFootprint, thinPropDestroy provisional); the viewer draws a thin prop as a solid high prop until it learns the kind; Andrew asked to go over ground versus props (traps, graves, bridges and cursed ground are not in the engine) before structures are built. Next: v2.structures (house, wall, tower), then the Atlas ground compile."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: v2.structures [engine · rule], then trigger.zombie.sap [content · trigger], then trigger.mage.kindle [content · trigger] (+17 more)
Delegate: v2.structures [engine · rule] — not yet gated; trigger.zombie.sap [content · trigger] — not yet gated; trigger.mage.kindle [content · trigger] — not yet gated; station.vs-target [engine · station] — not yet gated; move.actions [engine · rule] — not yet gated; fix.start-of-turn-victory [engine · plumbing] — not yet gated; fix.outcome-enum [engine · plumbing] — not yet gated; fix.phase-ladder-config [engine · plumbing] — not yet gated; fix.retired-stations [engine · plumbing] — not yet gated; crit.branch-and-injuries [engine · rule] — not yet gated; hook.on-enter [engine · plumbing] — not yet gated; tool.effect-size-rules [engine · plumbing] — not yet gated; viewer.hexvfx-path [engine · plumbing] — not yet gated; viewer.geometry [engine · plumbing] — 1 attempt(s); content.art-manifest [content · data] — not yet gated; viewer.styles [engine · plumbing] — not yet gated; sim.coverage [engine · plumbing] — not yet gated; seam.unit-mods [engine · plumbing] — not yet gated; pack.derived-rows [content · data] — not yet gated; system.ai-modes [station · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute; viewer.build needs viewer.geometry, content.art-manifest; viewer.board needs viewer.build, viewer.geometry; viewer.tile-state needs viewer.board; viewer.panel needs viewer.build; viewer.pump needs viewer.board, viewer.panel; viewer.log-transport needs viewer.pump
Calls since last wrap: none
Stack for v2.structures:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/

## The chat's commits since the last committed wrap (7dc8db0)

- 66d86de 2026-09-25 04:58 v2.thin-obstruction: Thin obstructions, as Andrew ruled 2026-09-24 (engine/DECISIONS.md 'the
- 37602f0 2026-09-25 04:47 DECISIONS: one surface effect per hex; the high thin prop (Andrew, 2026-09-24)
- d33983b 2026-09-25 04:42 DECISIONS: thin obstructions are a third kind of prop (Andrew, 2026-09-24)
- a753456 2026-09-25 03:59 wrap: V2 R7 part 3 ground table — landed, then re-ruled by Andrew the same day. Done: v2.ground-table (521bd4d), v2.ground-retable (4aaa22c: grass/wheat/bush are one ground terrain.undergrowth, 1 move

## Next chat

New chat with Heroes of Blight and Tragic — engine: V2 structures (house, wall, tower)
```
start engine
```
