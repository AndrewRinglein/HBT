# engine — handoff 2026-09-24 10:35

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next terrain.impassable-naming, 161 of 196 landed · 7 await review · 28 pending
Now: V2 R5 Thorns + terrain.impassable naming. Done: naming.terrain-impassable (5f99527, ruled by Andrew 2026-09-24, root 16dc33d), v2.thorns (88064ac: thorns stat, reflect on melee hit incl. armor-zero, collision 1+Thorns, V1 trigger retired); content 02f93ef; viewer 233bfb9 + page 8119a8e (test.thorns replay); kingdom 9c4af65 + pages ac126e6 (Thorns on the equip card and sandbox forecast). Tried: gate --abandon cannot run in Cowork (git checkout -- . refused by the mount), so the superseded terrain.impassable-naming item is still pending. Open for Angela: switches in SWITCHES.md 'V2 Thorns', the thorns hue, Bramble Guard's Codex text still says Thorns hits archers at any range. Known: content ship not run (Codex unchanged; publication tests need msedge). Next: V2 R6 hands, swaps and item instances.
New chat with Heroes of Blight and Tragic — engine: V2 R6 hands, swaps and item instances
  start engine
Last landing: 2026-09-24 09:34 (v2.thorns). Previous chat ended: on a wrap, 2026-09-24 10:35
WRAP NOT COMMITTED: 2026-09-24 10:35 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: V2 R5 Thorns + terrain.impassable naming. Done: naming.terrain-impassable (5f99527, ruled by Andrew 2026-09-24, root 16dc33d), v2.thorns (88064ac: thorns stat, reflect on melee hit incl. armor-zero, collision 1+Thorns, V1 trigger retired); content 02f93ef; viewer 233bfb9 + page 8119a8e (test.thorns replay); kingdom 9c4af65 + pages ac126e6 (Thorns on the equip card and sandbox forecast). Tried: gate --abandon cannot run in Cowork (git checkout -- . refused by the mount), so the superseded terrain.impassable-naming item is still pending. Open for Angela: switches in SWITCHES.md 'V2 Thorns', the thorns hue, Bramble Guard's Codex text still says Thorns hits archers at any range. Known: content ship not run (Codex unchanged; publication tests need msedge). Next: V2 R6 hands, swaps and item instances."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: terrain.impassable-naming [naming · decision], then trigger.zombie.sap [content · trigger], then trigger.mage.kindle [content · trigger] (+18 more)
Delegate: terrain.impassable-naming [naming · decision] — not yet gated; trigger.zombie.sap [content · trigger] — not yet gated; trigger.mage.kindle [content · trigger] — not yet gated; station.vs-target [engine · station] — not yet gated; move.actions [engine · rule] — not yet gated; fix.start-of-turn-victory [engine · plumbing] — not yet gated; fix.outcome-enum [engine · plumbing] — not yet gated; fix.phase-ladder-config [engine · plumbing] — not yet gated; fix.retired-stations [engine · plumbing] — not yet gated; crit.branch-and-injuries [engine · rule] — not yet gated; hook.on-enter [engine · plumbing] — not yet gated; tool.effect-size-rules [engine · plumbing] — not yet gated; viewer.hexvfx-path [engine · plumbing] — not yet gated; viewer.geometry [engine · plumbing] — 1 attempt(s); content.art-manifest [content · data] — not yet gated; viewer.styles [engine · plumbing] — not yet gated; sim.coverage [engine · plumbing] — not yet gated; seam.unit-mods [engine · plumbing] — not yet gated; seam.spare-weapons [engine · plumbing] — not yet gated; pack.derived-rows [content · data] — not yet gated; system.ai-modes [station · rule] — not yet gated
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
Stack for terrain.impassable-naming:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  GLOSSARY.md — a new kind is Angela's · DECISIONS.md

## The chat's commits since the last committed wrap (b731e12)

- 88064ac 2026-09-24 02:34 v2.thorns: V2 R5 (COMBAT-V2-DESIGN-2026-09-07 section 9.4, ruled 2026-09-07): Thorn
- 5f99527 2026-09-24 02:06 naming.terrain-impassable: Andrew, 2026-09-24: the impassable terrain kind is terrain.impassable. R
- 8de0e28 2026-09-24 01:45 wrap: V2 R3-R4 — prone, knockback collisions, KDB. Done: v2.prone (022b560), v2.knockback-collisions (eab6530, goldens e8b1fd8), v2.kdb (e0987b0); content b737132, 3ac8096, c231c92; viewer draws all t

## Next chat

New chat with Heroes of Blight and Tragic — engine: V2 R6 hands, swaps and item instances
```
start engine
```
