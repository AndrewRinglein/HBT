# engine — handoff 2026-09-25 12:23

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next trigger.zombie.sap, 178 of 213 landed · 15 await review · 25 pending
Now: v2.structures — V2 R7 part 4, walls, towers and houses: closed. Done: v2.structures (baf122a, clean: structures are ground terrain.wall/tower/house, glyphs W T H, stairs and doors authored as map entries [hex, entered-from hex]; guard rows STRUCTURE 425, Block and Ranged Block, house Dodge, tower STRUCTURE_ARMOR; reach at reachOf for every attack; tower heroes only, 3 move), fix.structures-line-speed (7e1c102: the line check had made AI battles 3-4% slower, now none), v2.structures-reruled (7c5c447, flagged: Andrew 2026-09-25 'Walls and towers cannot shoot past other obstructions. You must leave the walls the same way you came up.'), v2.structures-same-wall (11e7c53, flagged: 'You should be able to shoot on the same wall' — either end's own wall run is clear, walls only), trigger.mage.kindle (c95da75, clean: test.mage.kindle on test-mage, Burn = ceil(party Magic / 5) every swing; content 7193ecf; Andrew: do not add it to the Codex Mages). Rulings in DECISIONS c3c71f5, 0dfb909, 4137096, 377bc02, ed30406. Four shards green on tree 729320c5ee (shard 3 from Andrew's terminal — it overruns Cowork's 178 s; alpha-flip and zombie-rot timed out once at 5 s under load, then passed). Tried: Cowork git needs the lock shim on PATH; the fix.structures-line-speed --land was killed after its commit, so its gauntlet-log landed line is missing (commit, backlog and ledger are complete). Open for Andrew: review the two flagged landings; SWITCHES Structures (structureAsGround and the provisional rows); content chat to publish terrain.wall/tower/house; the viewer does not know structures, stairs or doors; trigger.zombie.sap is stale (absorbed into test.zombie.sap), close it; the ground-versus-props talk. Next: close trigger.zombie.sap, then the Atlas ground compile.
New chat with Heroes of Blight and Tragic — engine: close Zombie Sap, then the Atlas ground compile
  start engine
Last landing: 2026-09-25 11:25 (trigger.mage.kindle). Previous chat ended: on a wrap, 2026-09-25 12:23
WRAP NOT COMMITTED: 2026-09-25 12:23 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: v2.structures — V2 R7 part 4, walls, towers and houses: closed. Done: v2.structures (baf122a, clean: structures are ground terrain.wall/tower/house, glyphs W T H, stairs and doors authored as map entries [hex, entered-from hex]; guard rows STRUCTURE 425, Block and Ranged Block, house Dodge, tower STRUCTURE_ARMOR; reach at reachOf for every attack; tower heroes only, 3 move), fix.structures-line-speed (7e1c102: the line check had made AI battles 3-4% slower, now none), v2.structures-reruled (7c5c447, flagged: Andrew 2026-09-25 'Walls and towers cannot shoot past other obstructions. You must leave the walls the same way you came up.'), v2.structures-same-wall (11e7c53, flagged: 'You should be able to shoot on the same wall' — either end's own wall run is clear, walls only), trigger.mage.kindle (c95da75, clean: test.mage.kindle on test-mage, Burn = ceil(party Magic / 5) every swing; content 7193ecf; Andrew: do not add it to the Codex Mages). Rulings in DECISIONS c3c71f5, 0dfb909, 4137096, 377bc02, ed30406. Four shards green on tree 729320c5ee (shard 3 from Andrew's terminal — it overruns Cowork's 178 s; alpha-flip and zombie-rot timed out once at 5 s under load, then passed). Tried: Cowork git needs the lock shim on PATH; the fix.structures-line-speed --land was killed after its commit, so its gauntlet-log landed line is missing (commit, backlog and ledger are complete). Open for Andrew: review the two flagged landings; SWITCHES Structures (structureAsGround and the provisional rows); content chat to publish terrain.wall/tower/house; the viewer does not know structures, stairs or doors; trigger.zombie.sap is stale (absorbed into test.zombie.sap), close it; the ground-versus-props talk. Next: close trigger.zombie.sap, then the Atlas ground compile."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: trigger.zombie.sap [content · trigger], then station.vs-target [engine · station], then move.actions [engine · rule] (+15 more)
Delegate: trigger.zombie.sap [content · trigger] — not yet gated; station.vs-target [engine · station] — not yet gated; move.actions [engine · rule] — not yet gated; fix.start-of-turn-victory [engine · plumbing] — not yet gated; fix.outcome-enum [engine · plumbing] — not yet gated; fix.phase-ladder-config [engine · plumbing] — not yet gated; fix.retired-stations [engine · plumbing] — not yet gated; crit.branch-and-injuries [engine · rule] — not yet gated; hook.on-enter [engine · plumbing] — not yet gated; tool.effect-size-rules [engine · plumbing] — not yet gated; viewer.hexvfx-path [engine · plumbing] — not yet gated; viewer.geometry [engine · plumbing] — 1 attempt(s); content.art-manifest [content · data] — not yet gated; viewer.styles [engine · plumbing] — not yet gated; sim.coverage [engine · plumbing] — not yet gated; seam.unit-mods [engine · plumbing] — not yet gated; pack.derived-rows [content · data] — not yet gated; system.ai-modes [station · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute; viewer.build needs viewer.geometry, content.art-manifest; viewer.board needs viewer.build, viewer.geometry; viewer.tile-state needs viewer.board; viewer.panel needs viewer.build; viewer.pump needs viewer.board, viewer.panel; viewer.log-transport needs viewer.pump
Calls since last wrap:
  structureAsGround · 2026-09-25 · Is a wall, tower or house a ground or a prop?
  structureGlyphs · 2026-09-25 · Which map glyphs?
  structureEntries · 2026-09-25 · How are the stairs and the door authored?
  wallTopMove · 2026-09-25 · Moving along a wall top?
  wallDescent · 2026-09-25 · Coming DOWN from a wall — only by the stairs?
  towerRangedBlock · 2026-09-25 · Does the tower's +15 Block also add to Ranged Block?
  doorFacing · 2026-09-25 · The door's facing and cost?
  houseExit · 2026-09-25 · Out of a house — any side, or only the door?
  towerSide · 2026-09-25 · "Towers are for heroes only" — heroes by allegiance or by rules?
  structurePlacement · 2026-09-25 · Do deployment, authored hexes and arrivals obey the entry and hero-only rules?
  structureFlight · 2026-09-25 · Where can a flier land?
  structureLines · 2026-09-25 · What does a structure do to attack lines?
  sameWallBothEnds · 2026-09-25 · "Shoot on the same wall" — whose wall is clear: the shooter's only, or either end's?
  sameWallOnly · 2026-09-25 · Does the same rule clear a tower's or a house's own other hexes?
  structureVision · 2026-09-25 · Do structures cut Vision?
  structureGuardScope · 2026-09-25 · Which attacks does the guard (the enemy's −N, the Block, Dodge and Armor) answer?
  structureArmorPenetration · 2026-09-25 · Can armour penetration take the tower's +1 Armor?
  structureReach · 2026-09-25 · Is the structure's reach the Reach stat?
  structureCollision · 2026-09-25 · A push a structure refuses (a wall's face, a house wall, a tower for a non-hero)?
  structureKillSwitch · 2026-09-25 · What does CF_DISABLE_IDS=terrain.wall silence?
  structureAi · 2026-09-25 · Does the AI seek walls and towers?
Stack for trigger.zombie.sap:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (17c0ed7)

- ed30406 2026-09-25 11:32 DECISIONS: shooting a unit on a wall; Kindle stays off the Codex Mages (Andrew, 2026-09-25). SWITCHES sameWallBothEnds ruled.
- c95da75 2026-09-25 11:25 trigger.mage.kindle: Mage: 100% onAttack -- every swing, hit or miss -- apply status.burn to
- 11e7c53 2026-09-25 11:16 v2.structures-same-wall: Andrew, 2026-09-25 (engine/DECISIONS.md 'shooting along your own wall',
- 377bc02 2026-09-25 11:11 DECISIONS: shooting along your own wall; Mage Kindle is wanted (Andrew, 2026-09-25)
- 7c5c447 2026-09-25 07:22 v2.structures-reruled: Two v2.structures defaults, re-ruled by Andrew 2026-09-25 (engine/DECISI
- 4137096 2026-09-25 07:16 DECISIONS: Andrew's restatement, verbatim (2026-09-25)
- 0dfb909 2026-09-25 07:16 DECISIONS: walls and towers do not shoot over; down the way you came up (Andrew, 2026-09-25)
- 7e1c102 2026-09-25 06:54 fix.structures-line-speed: v2.structures (landed baf122a) made the attack-line legality question re
- baf122a 2026-09-25 06:38 v2.structures: Walls, towers and houses, as Andrew ruled 2026-09-24 (engine/DECISIONS.m
- c3c71f5 2026-09-25 06:33 DECISIONS: structures first, the ground-versus-props talk after (Andrew, 2026-09-24)
- 8387a96 2026-09-25 05:10 wrap: v2.thin-obstruction — V2 R7 part 3, thin obstructions: landed 66d86de, flagged for review (three Law-10 test rewrites, reason at each edit). Every woodland hex and every prop of the new height t

## Next chat

New chat with Heroes of Blight and Tragic — engine: close Zombie Sap, then the Atlas ground compile
```
start engine
```
