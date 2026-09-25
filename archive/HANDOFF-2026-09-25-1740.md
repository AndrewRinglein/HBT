# engine — handoff 2026-09-25 17:40

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next station.vs-target, 178 of 213 landed · 15 await review · 24 pending
Now: Atlas ground compile — the outdoor maps are playable in combat: closed. Done: trigger.zombie.sap abandoned as superseded by test.zombie.sap (a9cbbf5). Andrew ruled the Atlas ground compile is the outdoor maps, not the three dungeon areas (all authored 'dungeon' floor, nothing to write) — DECISIONS c7236e1, 754439f. Root 90a8251: combat-compiler.mjs reads grounds from combat-profiles.json (trees woodland, tall grass/bushes/barberry/wheat/garden undergrowth, rivers water, bridges open, dense woodland x, houses terrain.house over authored building cells or footprintRadius with one door); 13 outdoor fieldings added, dungeon geometry unchanged (map ids moved: library grew 133 to 239); registry 16.5 MB. Probes: combat-ground.test.mjs 6 red then green, 12 compiler tests unchanged, 20 integration tests, kingdom Atlas seam 16/16, viewer Atlas tests green. SWITCHES 'Atlas ground compile' (f484ee4); Andrew 73d7ffc: landforms are not hills for now; greenway, stonecrown (AI caps every seed) and opening-4 (sides never meet) stay unfielded, no investigation. harvest and wellwood use legacy objects and are refused. Four shards green on tree 3c7de513b0, all run in Cowork. Tried: the integration test hung before regeneration because the stale registry produced a huge deepEqual diff; it compares engineCommit, so it goes stale on every engine commit until regenerated. Next: station.vs-target.
New chat with Heroes of Blight and Tragic — engine: station.vs-target, damage bonuses that read the target
  start engine
Last landing: 2026-09-25 11:25 (trigger.mage.kindle). Previous chat ended: on a wrap, 2026-09-25 17:40
WRAP NOT COMMITTED: 2026-09-25 17:40 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: Atlas ground compile — the outdoor maps are playable in combat: closed. Done: trigger.zombie.sap abandoned as superseded by test.zombie.sap (a9cbbf5). Andrew ruled the Atlas ground compile is the outdoor maps, not the three dungeon areas (all authored 'dungeon' floor, nothing to write) — DECISIONS c7236e1, 754439f. Root 90a8251: combat-compiler.mjs reads grounds from combat-profiles.json (trees woodland, tall grass/bushes/barberry/wheat/garden undergrowth, rivers water, bridges open, dense woodland x, houses terrain.house over authored building cells or footprintRadius with one door); 13 outdoor fieldings added, dungeon geometry unchanged (map ids moved: library grew 133 to 239); registry 16.5 MB. Probes: combat-ground.test.mjs 6 red then green, 12 compiler tests unchanged, 20 integration tests, kingdom Atlas seam 16/16, viewer Atlas tests green. SWITCHES 'Atlas ground compile' (f484ee4); Andrew 73d7ffc: landforms are not hills for now; greenway, stonecrown (AI caps every seed) and opening-4 (sides never meet) stay unfielded, no investigation. harvest and wellwood use legacy objects and are refused. Four shards green on tree 3c7de513b0, all run in Cowork. Tried: the integration test hung before regeneration because the stale registry produced a huge deepEqual diff; it compares engineCommit, so it goes stale on every engine commit until regenerated. Next: station.vs-target."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: station.vs-target [engine · station], then move.actions [engine · rule], then fix.start-of-turn-victory [engine · plumbing] (+14 more)
Delegate: station.vs-target [engine · station] — not yet gated; move.actions [engine · rule] — not yet gated; fix.start-of-turn-victory [engine · plumbing] — not yet gated; fix.outcome-enum [engine · plumbing] — not yet gated; fix.phase-ladder-config [engine · plumbing] — not yet gated; fix.retired-stations [engine · plumbing] — not yet gated; crit.branch-and-injuries [engine · rule] — not yet gated; hook.on-enter [engine · plumbing] — not yet gated; tool.effect-size-rules [engine · plumbing] — not yet gated; viewer.hexvfx-path [engine · plumbing] — not yet gated; viewer.geometry [engine · plumbing] — 1 attempt(s); content.art-manifest [content · data] — not yet gated; viewer.styles [engine · plumbing] — not yet gated; sim.coverage [engine · plumbing] — not yet gated; seam.unit-mods [engine · plumbing] — not yet gated; pack.derived-rows [content · data] — not yet gated; system.ai-modes [station · rule] — not yet gated
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
  atlasGroundOrder · 2026-09-25 · One hex carries two grounds (a bridge over a river; several trees and grass) — which?
  atlasBridgeOpen · 2026-09-25 · A bridge on a river hex?
  atlasDenseWoodland · 2026-09-25 · woodland-impassable ("seven rooted trees … close the spaces")?
  atlasGardenAndOrchard · 2026-09-25 · The vegetable garden and the orchard ladder, both authored concealment?
  atlasHouseCells · 2026-09-25 · Which hexes is a house?
  atlasHouseDoor · 2026-09-25 · Where is a house's one door?
  atlasProfileCrossingLowOnly · 2026-09-25 · A profile's +1 crossing cost on an asset authored as a full obstruction (opening-4's priory low wall)?
  atlasLandformsNotHills · 2026-09-25 · The outdoor maps' raised landforms (bluffs, ridges, rises)?
  atlasFieldedMaps · 2026-09-25 · Which outdoor maps get a combat fielding?
Stack for station.vs-target:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/

## The chat's commits since the last committed wrap (796f585)

- 73d7ffc 2026-09-25 17:06 DECISIONS: Atlas landforms are not hills for now; stalled outdoor maps stay unfielded (Andrew, 2026-09-25)
- f484ee4 2026-09-25 16:12 SWITCHES: Atlas ground compile defaults (outdoor maps, 2026-09-25)
- 754439f 2026-09-25 15:49 DECISIONS: the Atlas ground compile is the outdoor maps (Andrew, 2026-09-25)
- c7236e1 2026-09-25 15:45 DECISIONS: the Atlas ground compile writes into the three Atlas areas (Andrew, 2026-09-25)
- a9cbbf5 2026-09-25 13:01 Abandoned trigger.zombie.sap - superseded by test.zombie.sap (absorbed 2026-08-20 into the status.weakness landing; covered by test/weak.test.ts). Closed per the 2026-09-25 wrap's Next line.
- 5bf657e 2026-09-25 12:23 wrap: v2.structures — V2 R7 part 4, walls, towers and houses: closed. Done: v2.structures (baf122a, clean: structures are ground terrain.wall/tower/house, glyphs W T H, stairs and doors authored as ma

## Next chat

New chat with Heroes of Blight and Tragic — engine: station.vs-target, damage bonuses that read the target
```
start engine
```
