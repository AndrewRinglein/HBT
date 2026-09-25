# engine — handoff 2026-09-25 18:49

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next move.actions, 180 of 214 landed · 16 await review · 23 pending
Now: station.vs-target — damage bonuses that read the target: closed. Done: DMG.VS_TARGET at 400, before CRIT (SWITCHES vsTargetStation: the documents said 275, 400 and 500, and 500 is DMG.PRONE now); rules {tag or status, add, percent} on badges (every damage) and on held items (only the attacks that item grants). The Codex's 48 enchanted-weapon slayer maps compile to rules (content 3bd619e); the 8 bloodrune slayers stay named gaps, since a unit keeps no list of worn items (vsTargetWornItems). Test badges test.badge.bane-undead (+2 vs undead) and test.badge.bane-venom (+50% vs poisoned), scenarios test.vs-target-a/-b; landed clean 25c276c. fix.vs-target-worn-gap-text a4d5cd4 (content 1c7b7ec), FLAGGED for review: one assertion rewritten — the reworded bloodrune gap text rode unit.equipped and moved the progression-surge goldens on text alone; the old wording is back. Four shards green on tree 3b8e567e42. audit-all did not finish inside the Cowork 178 s ceiling — run it from a terminal. Tried: shard 2 timed out in additions.test.ts under load; the same tests time the same before and after (2.6 s, 16 s) and passed on rerun. Next: move.actions.
New chat with Heroes of Blight and Tragic — engine: move.actions, movement as a chosen action from a list
  start engine
Last landing: 2026-09-25 18:38 (fix.vs-target-worn-gap-text). Previous chat ended: on a wrap, 2026-09-25 18:49
WRAP NOT COMMITTED: 2026-09-25 18:49 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: station.vs-target — damage bonuses that read the target: closed. Done: DMG.VS_TARGET at 400, before CRIT (SWITCHES vsTargetStation: the documents said 275, 400 and 500, and 500 is DMG.PRONE now); rules {tag or status, add, percent} on badges (every damage) and on held items (only the attacks that item grants). The Codex's 48 enchanted-weapon slayer maps compile to rules (content 3bd619e); the 8 bloodrune slayers stay named gaps, since a unit keeps no list of worn items (vsTargetWornItems). Test badges test.badge.bane-undead (+2 vs undead) and test.badge.bane-venom (+50% vs poisoned), scenarios test.vs-target-a/-b; landed clean 25c276c. fix.vs-target-worn-gap-text a4d5cd4 (content 1c7b7ec), FLAGGED for review: one assertion rewritten — the reworded bloodrune gap text rode unit.equipped and moved the progression-surge goldens on text alone; the old wording is back. Four shards green on tree 3b8e567e42. audit-all did not finish inside the Cowork 178 s ceiling — run it from a terminal. Tried: shard 2 timed out in additions.test.ts under load; the same tests time the same before and after (2.6 s, 16 s) and passed on rerun. Next: move.actions."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: move.actions [engine · rule], then fix.start-of-turn-victory [engine · plumbing], then fix.outcome-enum [engine · plumbing] (+13 more)
Delegate: move.actions [engine · rule] — not yet gated; fix.start-of-turn-victory [engine · plumbing] — not yet gated; fix.outcome-enum [engine · plumbing] — not yet gated; fix.phase-ladder-config [engine · plumbing] — not yet gated; fix.retired-stations [engine · plumbing] — not yet gated; crit.branch-and-injuries [engine · rule] — not yet gated; hook.on-enter [engine · plumbing] — not yet gated; tool.effect-size-rules [engine · plumbing] — not yet gated; viewer.hexvfx-path [engine · plumbing] — not yet gated; viewer.geometry [engine · plumbing] — 1 attempt(s); content.art-manifest [content · data] — not yet gated; viewer.styles [engine · plumbing] — not yet gated; sim.coverage [engine · plumbing] — not yet gated; seam.unit-mods [engine · plumbing] — not yet gated; pack.derived-rows [content · data] — not yet gated; system.ai-modes [station · rule] — not yet gated
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
  vsTargetReach · 2026-09-25 · Which damage does a rule reach?
  vsTargetWornItems · 2026-09-25 · A slayer on a WORN item — the eight bloodrunes (Kairin, Deathdealer, Monster Slayer …)?
  vsTargetStacking · 2026-09-25 · A target matching several rules (a vampire tagged undead and vampire vs Holy Water's {undead 1, demon 1, vampire 1})?
  vsTargetPercent · 2026-09-25 · How does a percent rule round, and against what?
  vsTargetStatusCarried · 2026-09-25 · When does a target "carry" a status?
Stack for move.actions:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/

## The chat's commits since the last committed wrap (a9d815d)

- a4d5cd4 2026-09-25 18:38 fix.vs-target-worn-gap-text: station.vs-target (25c276c) reworded the gap on a WORN item's slayer (th
- 25c276c 2026-09-25 18:22 station.vs-target: DMG.VS_TARGET at 275: damage modifiers that read the TARGET -- its type/
- ed7cc90 2026-09-25 17:40 wrap: Atlas ground compile — the outdoor maps are playable in combat: closed. Done: trigger.zombie.sap abandoned as superseded by test.zombie.sap (a9cbbf5). Andrew ruled the Atlas ground compile is th

## Next chat

New chat with Heroes of Blight and Tragic — engine: move.actions, movement as a chosen action from a list
```
start engine
```
