# engine — handoff 2026-09-26 04:09

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next system.ai-modes, 187 of 215 landed · 18 await review · 2 pending
Now: viewer.* (9) and content.art-manifest closed as superseded by the viewer package on Andrew's ruling (DECISIONS 33597a3; empty assets/vfx deleted, native stun/slow/protection effects carried to VFX/VISUAL-BATTLE-UPDATES §4, root 66da833). Landed: sim.coverage 1625c8c and seam.unit-mods 9541224, every gate PASS; pack.derived-rows 0bddb52 FLAGGED (one test filter line, no assertion moved) with content 9ecd110. Four shards green on tree 601e6149f8. audit-all timed out again in Cowork (full suite in one command); its parts run by hand: shards green, control battles match golden, core scan clean, 44 grandfathered INVENTED. Owed, from pack.derived-rows: content's weapon-enchant rows still carry hero stats and Far/Long still bow-only against GEAR-DESIGN §3 (2026-09-05); the tier-3 rule in mkenginepack silently drops an enchant's damage bonus (Law 9: item.longsword.destroying, rooting, hobbling); the kingdom's FieldedMods needs converting to heroMods; the viewer does not fold unit.modified. Queue: system.ai-modes is design-first with Angela; content.mage-staff waits on unit.brute. Next: design the AI with Angela.
New chat with Heroes of Blight and Tragic — engine: system.ai-modes, the AI design with Angela
  start engine
Last landing: 2026-09-26 03:57 (pack.derived-rows). Previous chat ended: on a wrap, 2026-09-26 04:09
WRAP NOT COMMITTED: 2026-09-26 04:09 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: viewer.* (9) and content.art-manifest closed as superseded by the viewer package on Andrew's ruling (DECISIONS 33597a3; empty assets/vfx deleted, native stun/slow/protection effects carried to VFX/VISUAL-BATTLE-UPDATES §4, root 66da833). Landed: sim.coverage 1625c8c and seam.unit-mods 9541224, every gate PASS; pack.derived-rows 0bddb52 FLAGGED (one test filter line, no assertion moved) with content 9ecd110. Four shards green on tree 601e6149f8. audit-all timed out again in Cowork (full suite in one command); its parts run by hand: shards green, control battles match golden, core scan clean, 44 grandfathered INVENTED. Owed, from pack.derived-rows: content's weapon-enchant rows still carry hero stats and Far/Long still bow-only against GEAR-DESIGN §3 (2026-09-05); the tier-3 rule in mkenginepack silently drops an enchant's damage bonus (Law 9: item.longsword.destroying, rooting, hobbling); the kingdom's FieldedMods needs converting to heroMods; the viewer does not fold unit.modified. Queue: system.ai-modes is design-first with Angela; content.mage-staff waits on unit.brute. Next: design the AI with Angela."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: system.ai-modes [station · rule]
Delegate: system.ai-modes [station · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute
Calls since last wrap: none
Stack for system.ai-modes:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/

## The chat's commits since the last committed wrap (fc2826b)

- 0bddb52 2026-09-26 03:57 pack.derived-rows: Filed from the kingdom session 2026-09-03 (seam.loadout, G9). The kingdo
- 9541224 2026-09-26 03:38 seam.unit-mods: GEAR-IMPLEMENTATION.md §1. Set bonuses (GEAR-DESIGN.md §5) are resolved
- 1625c8c 2026-09-26 03:20 sim.coverage: A sweep reports WHAT IT NEVER TOUCHED. For a run, split the content the
- d93394e 2026-09-26 00:46 backlog: content.art-manifest closed as superseded by the viewer package (Andrew 2026-09-25)
- d34445c 2026-09-26 00:46 backlog: viewer.styles closed as superseded by the viewer package (Andrew 2026-09-25)
- 35eef34 2026-09-26 00:46 backlog: viewer.log-transport closed as superseded by the viewer package (Andrew 2026-09-25)
- 7edaecd 2026-09-26 00:46 backlog: viewer.pump closed as superseded by the viewer package (Andrew 2026-09-25)
- 6f6ad4e 2026-09-26 00:46 backlog: viewer.panel closed as superseded by the viewer package (Andrew 2026-09-25)
- 353f008 2026-09-26 00:46 backlog: viewer.tile-state closed as superseded by the viewer package (Andrew 2026-09-25)
- 4b402a7 2026-09-26 00:46 backlog: viewer.board closed as superseded by the viewer package (Andrew 2026-09-25)
- 2d4380e 2026-09-26 00:46 backlog: viewer.build closed as superseded by the viewer package (Andrew 2026-09-25)
- f388565 2026-09-26 00:46 backlog: viewer.geometry closed as superseded by the viewer package (Andrew 2026-09-25)
- 7b4cb4b 2026-09-26 00:46 backlog: viewer.hexvfx-path closed as superseded by the viewer package (Andrew 2026-09-25)
- 33597a3 2026-09-26 00:45 DECISIONS: the engine's viewer items close; the viewer package owns the battle screen (Andrew 2026-09-25)
- 5cdc33d 2026-09-25 23:37 wrap: fix.phase-ladder-config, fix.retired-stations, tool.effect-size-rules — landed 426c3c8, 87bca9c, 65e6587; every gate PASS, none flagged. Closed as superseded on Andrew's ruling (DECISIONS 37ebf5

## Next chat

New chat with Heroes of Blight and Tragic — engine: system.ai-modes, the AI design with Angela
```
start engine
```
