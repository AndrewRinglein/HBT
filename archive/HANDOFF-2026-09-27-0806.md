# engine — handoff 2026-09-27 08:06

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next fix.enemy-accuracy-mod, 198 of 229 landed · 22 await review · 4 pending
Now: ai.sight — the AI framework. Landed f5fb77f (content b04dad6): a status row may set hidesFromFoes; hiddenFrom (src/core/status.ts) takes such a unit out of every opposing AI's view — livingEnemies, nearestEnemy, the AI's action list, burst and area scoring, minEnemiesStruck hints — so it is never a target, a threat or a score; its own side still sees it. Variants test.status.veil (on a hero, -1 per Phase) and test.status.shroud (on an enemy, no clock) via test-veiled-osric / test-shrouded-zombie; scenarios test.sight-a/-b; seven switches (SWITCHES.md 'AI sight'). Passed every check first attempt; eight shards green on tree 97e769efff. Tried: the spec names a stealthed flag that does not exist — no stealth status in the engine or in the Codex's status rows — so the flag is proven on TEST statuses and targeting legality is unchanged (aiSightLegality); stealth itself ('cannot be targeted by an attack', breaks on an attack or a power, reveals, 'Stealth does not hold' — CODEX.md 475, 1589, 1840) is not on the backlog. Noticed: shard 1/8 timed out twice on integration.test.ts 'kiting works' (its own 15 s timeout; 7.3 s alone on this 2-CPU machine) and passed on the third run — 207 battles benchmarked old vs new showed no slowdown from this change; git on the mount ran through a lock-moving shim ($HOME/bin/git, kingdom/HANDOFF-2026-09-04.md §7); a scratch probe was parked at ../_to_delete/ai-sight-peek.mts; audit-all still cannot fit one call, the 8 shards stood in. Owed by Angela: a status.stealth row in the Codex, and whether to queue stealth as its own item. Next: fix.enemy-accuracy-mod.
New chat with Heroes of Blight and Tragic — engine: fix.enemy-accuracy-mod, carry each enemy attack's accuracy modifier into the engine pack
  start engine
Last landing: 2026-09-27 07:47 (ai.sight). Previous chat ended: on a wrap, 2026-09-27 08:06
WRAP NOT COMMITTED: 2026-09-27 08:06 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: ai.sight — the AI framework. Landed f5fb77f (content b04dad6): a status row may set hidesFromFoes; hiddenFrom (src/core/status.ts) takes such a unit out of every opposing AI's view — livingEnemies, nearestEnemy, the AI's action list, burst and area scoring, minEnemiesStruck hints — so it is never a target, a threat or a score; its own side still sees it. Variants test.status.veil (on a hero, -1 per Phase) and test.status.shroud (on an enemy, no clock) via test-veiled-osric / test-shrouded-zombie; scenarios test.sight-a/-b; seven switches (SWITCHES.md 'AI sight'). Passed every check first attempt; eight shards green on tree 97e769efff. Tried: the spec names a stealthed flag that does not exist — no stealth status in the engine or in the Codex's status rows — so the flag is proven on TEST statuses and targeting legality is unchanged (aiSightLegality); stealth itself ('cannot be targeted by an attack', breaks on an attack or a power, reveals, 'Stealth does not hold' — CODEX.md 475, 1589, 1840) is not on the backlog. Noticed: shard 1/8 timed out twice on integration.test.ts 'kiting works' (its own 15 s timeout; 7.3 s alone on this 2-CPU machine) and passed on the third run — 207 battles benchmarked old vs new showed no slowdown from this change; git on the mount ran through a lock-moving shim ($HOME/bin/git, kingdom/HANDOFF-2026-09-04.md §7); a scratch probe was parked at ../_to_delete/ai-sight-peek.mts; audit-all still cannot fit one call, the 8 shards stood in. Owed by Angela: a status.stealth row in the Codex, and whether to queue stealth as its own item. Next: fix.enemy-accuracy-mod."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: fix.enemy-accuracy-mod [content · data], then capability.charge [engine · rule], then capability.move-ignores-zoc [engine · rule]
Delegate: fix.enemy-accuracy-mod [content · data] — not yet gated; capability.charge [engine · rule] — not yet gated; capability.move-ignores-zoc [engine · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute
Calls since last wrap:
  aiSightLegality · 2026-09-27 · Does a hidden unit stop being a legal target for everyone, or only drop out of the AI's view?
  aiSightAllies · 2026-09-27 · Does a unit's own side see it?
  aiSightScoring · 2026-09-27 · A burst or area power would strike a hidden foe. Is that counted?
  aiSightTauntHidden · 2026-09-27 · A unit is taunted by a foe that is hidden from it.
  aiSightTraps · 2026-09-27 · "Invisible traps are likewise unseen."
  aiSightDarkness · 2026-09-27 · Does darkness now hide a unit from the AI too?
Stack for fix.enemy-accuracy-mod:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (9b622e8)

- f5fb77f 2026-09-27 07:47 ai.sight: Ruled 2026-09-26: the AI knows everything except stealthed units. The AI
- da91b60 2026-09-27 07:14 wrap: ai.encounter-rules — the AI framework. Landed 8b172d6 (content 82d43df): an encounter row carries aiRules (anchor, coordinate), bound to the units it fields as they arrive (ai.anchored / ai.coor

## Next chat

New chat with Heroes of Blight and Tragic — engine: fix.enemy-accuracy-mod, carry each enemy attack's accuracy modifier into the engine pack
```
start engine
```
