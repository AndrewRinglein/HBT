# engine — handoff 2026-09-24 11:45

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next v2.swap, 163 of 199 landed · 9 await review · 29 pending
Now: V2 R6 hands, swaps and item instances — engine half. Done: v2.loadout (4910771: hands and stowed as item instances, heroStowed, two longswords legal, flagged — one Law 10 test edit), v2.loadout-swap (dd78ff1: swapCost stat default 1, canSwap/performSwap, swap battle command, loadout.swapped, Surge reopens, enemies never, AI never swaps; TEST badges fast-hands/slow-hands, scenario test.swap; flagged — one Law 10 test edit); kingdom 2a24984 (stowed handed to the engine, SWITCHES.spareWeapons deleted); content 359cf85; viewer 75537a2 + 9e26aa6 (static stamps). Tried: v2.swap was filed with changesBaseline and no variants, so it was re-filed as v2.loadout-swap. Open for Andrew, from a terminal: abandon v2.swap, seam.spare-weapons and terrain.impassable-naming (the mount refuses git checkout). Open for Angela: SWITCHES.md 'V2 loadout' and 'V2 swap' defaults, especially swapAi (the AI never swaps), and the campaign Fast/Slow Hands values. Next: R6 UI and uses — the viewer folds and logs loadout.swapped, the kingdom sandbox offers the swap to a human hero, item-instance uses and spent state.
New chat with Heroes of Blight and Tragic — engine: V2 R6 swap UI and item uses
  start engine
Last landing: 2026-09-24 11:36 (v2.loadout-swap). Previous chat ended: on a wrap, 2026-09-24 11:45
WRAP NOT COMMITTED: 2026-09-24 11:45 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: V2 R6 hands, swaps and item instances — engine half. Done: v2.loadout (4910771: hands and stowed as item instances, heroStowed, two longswords legal, flagged — one Law 10 test edit), v2.loadout-swap (dd78ff1: swapCost stat default 1, canSwap/performSwap, swap battle command, loadout.swapped, Surge reopens, enemies never, AI never swaps; TEST badges fast-hands/slow-hands, scenario test.swap; flagged — one Law 10 test edit); kingdom 2a24984 (stowed handed to the engine, SWITCHES.spareWeapons deleted); content 359cf85; viewer 75537a2 + 9e26aa6 (static stamps). Tried: v2.swap was filed with changesBaseline and no variants, so it was re-filed as v2.loadout-swap. Open for Andrew, from a terminal: abandon v2.swap, seam.spare-weapons and terrain.impassable-naming (the mount refuses git checkout). Open for Angela: SWITCHES.md 'V2 loadout' and 'V2 swap' defaults, especially swapAi (the AI never swaps), and the campaign Fast/Slow Hands values. Next: R6 UI and uses — the viewer folds and logs loadout.swapped, the kingdom sandbox offers the swap to a human hero, item-instance uses and spent state."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: v2.swap [engine · rule], then terrain.impassable-naming [naming · decision], then trigger.zombie.sap [content · trigger] (+19 more)
Delegate: v2.swap [engine · rule] — 1 attempt(s); terrain.impassable-naming [naming · decision] — not yet gated; trigger.zombie.sap [content · trigger] — not yet gated; trigger.mage.kindle [content · trigger] — not yet gated; station.vs-target [engine · station] — not yet gated; move.actions [engine · rule] — not yet gated; fix.start-of-turn-victory [engine · plumbing] — not yet gated; fix.outcome-enum [engine · plumbing] — not yet gated; fix.phase-ladder-config [engine · plumbing] — not yet gated; fix.retired-stations [engine · plumbing] — not yet gated; crit.branch-and-injuries [engine · rule] — not yet gated; hook.on-enter [engine · plumbing] — not yet gated; tool.effect-size-rules [engine · plumbing] — not yet gated; viewer.hexvfx-path [engine · plumbing] — not yet gated; viewer.geometry [engine · plumbing] — 1 attempt(s); content.art-manifest [content · data] — not yet gated; viewer.styles [engine · plumbing] — not yet gated; sim.coverage [engine · plumbing] — not yet gated; seam.unit-mods [engine · plumbing] — not yet gated; seam.spare-weapons [engine · plumbing] — not yet gated; pack.derived-rows [content · data] — not yet gated; system.ai-modes [station · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute; viewer.build needs viewer.geometry, content.art-manifest; viewer.board needs viewer.build, viewer.geometry; viewer.tile-state needs viewer.board; viewer.panel needs viewer.build; viewer.pump needs viewer.board, viewer.panel; viewer.log-transport needs viewer.pump
Calls since last wrap:
  knockbackThornsZero · 2026-09-24 · A unit's collision value is 1 + its Thorns. What is its Thorns?
  thornsIsAStat · 2026-09-24 · Where does the magnitude live?
  thornsProtectionAbsorbs · 2026-09-24 · Does the attacker's Protection absorb Thorns damage?
  thornsOnKillingBlow · 2026-09-24 · Does a unit the hit kills still reflect?
  thornsDownedTarget · 2026-09-24 · Does a hit on a DOWNED thorned unit reflect?
  thornsAttackerDown · 2026-09-24 · An attacker already not standing?
  thornsPerHit · 2026-09-24 · A multi-hit attack? An attack of opportunity?
  thornsNoHooks · 2026-09-24 · Does the reflected damage fire hooks (onTakingDamage, onKill …) or KDB?
  thornsCause · 2026-09-24 · What does the log name as the cause?
  thornsPreview · 2026-09-24 · What does preview say?
  thornsContentScope · 2026-09-24 · Which content carries the magnitude now?
  loadoutInstanceId · 2026-09-24 · What names one carried item?
  loadoutStowedClasses · 2026-09-24 · What may be stowed?
  loadoutStowedLog · 2026-09-24 · Where does the log name a stowed item?
  loadoutScheduleStowed · 2026-09-24 · Does the progression schedule's stowed weapon (rosterOptionsOf().stowed) ride into the battle?
  swapAi · 2026-09-24 · Does an AI-controlled hero ever swap?
  swapShape · 2026-09-24 · What does a swap name?
  swapHealthClamp · 2026-09-24 · A Health (or Stamina) maximum that leaves the hands? A higher one that arrives?
  swapLimits · 2026-09-24 · Does a power that leaves and returns keep its cooldown and uses?
  swapAiMode · 2026-09-24 · Does the unit's role / AI mode follow the swap?
  swapMovePoints · 2026-09-24 · Does a Movement modifier that arrives mid-activation change this activation's movement points?
  swapCostFloor · 2026-09-24 · swapCost folded below 0?
  swapCause · 2026-09-24 · What cause does loadout.swapped name?
Stack for v2.swap:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/

## The chat's commits since the last committed wrap (1d7c4dd)

- dd78ff1 2026-09-24 04:36 v2.loadout-swap: V2 R6 part 2 (COMBAT-V2-DESIGN-2026-09-07 section 11.2, ruled 2026-09-07
- 4910771 2026-09-24 04:04 v2.loadout: V2 R6 part 1 (COMBAT-V2-DESIGN-2026-09-07 section 11.1, ruled 2026-09-07
- 5591538 2026-09-24 03:35 wrap: V2 R5 Thorns + terrain.impassable naming. Done: naming.terrain-impassable (5f99527, ruled by Andrew 2026-09-24, root 16dc33d), v2.thorns (88064ac: thorns stat, reflect on melee hit incl. armor-z

## Next chat

New chat with Heroes of Blight and Tragic — engine: V2 R6 swap UI and item uses
```
start engine
```
