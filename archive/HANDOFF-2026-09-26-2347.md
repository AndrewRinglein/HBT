# engine — handoff 2026-09-26 23:47

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next ai.mode-change, 195 of 229 landed · 22 await review · 7 pending
Now: ai.scorer — the AI framework. Landed: the ten modes are data rows (src/content/ai-modes.ts, on ctx.aiModes: rules + target + anchor + weights in integer tiers) run through the scorer (src/ai/scorer.ts, considerations read from preview and the state); control battles byte-identical on all 23 maps; a second row with other weights changes a decision with no code; every AI action logs its top three plans with their numbers in ctx.aiLog, beside the event log (SWITCHES.md aiDecisionLogHome); action-row hints (aiHint: whenever, belowHalfHp, minEnemiesStruck) wired, none authored. Eight shards green on tree 50f526fa32. Tried: shards before --land do not count after it (the tree hash reads .state from the index, so the landing commit moves it); audit-all does not fit one Cowork call (killed after typecheck); audit.test.ts's 400-battle sample times out at load 5+ (not the scorer: 200 battles 27.5 s old code, 27.2 s new, same load). Noticed: the kite prices its staff by hand, not through preview (Law 1). Owed by content: the Colossus's use-whenever hint (ENEMY-REVIEW.md:352) and Codex publication of the nine ai.* ids. Next: ai.mode-change.
New chat with Heroes of Blight and Tragic — engine: ai.mode-change, a unit's mode changes mid-battle
  start engine
Last landing: 2026-09-26 23:24 (ai.scorer). Previous chat ended: on a wrap, 2026-09-26 23:47
WRAP NOT COMMITTED: 2026-09-26 23:47 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: ai.scorer — the AI framework. Landed: the ten modes are data rows (src/content/ai-modes.ts, on ctx.aiModes: rules + target + anchor + weights in integer tiers) run through the scorer (src/ai/scorer.ts, considerations read from preview and the state); control battles byte-identical on all 23 maps; a second row with other weights changes a decision with no code; every AI action logs its top three plans with their numbers in ctx.aiLog, beside the event log (SWITCHES.md aiDecisionLogHome); action-row hints (aiHint: whenever, belowHalfHp, minEnemiesStruck) wired, none authored. Eight shards green on tree 50f526fa32. Tried: shards before --land do not count after it (the tree hash reads .state from the index, so the landing commit moves it); audit-all does not fit one Cowork call (killed after typecheck); audit.test.ts's 400-battle sample times out at load 5+ (not the scorer: 200 battles 27.5 s old code, 27.2 s new, same load). Noticed: the kite prices its staff by hand, not through preview (Law 1). Owed by content: the Colossus's use-whenever hint (ENEMY-REVIEW.md:352) and Codex publication of the nine ai.* ids. Next: ai.mode-change."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: ai.mode-change [ai · rule], then ai.encounter-rules [ai · rule], then ai.sight [ai · rule] (+3 more)
Delegate: ai.mode-change [ai · rule] — not yet gated; ai.encounter-rules [ai · rule] — not yet gated; ai.sight [ai · rule] — not yet gated; fix.enemy-accuracy-mod [content · data] — not yet gated; capability.charge [engine · rule] — not yet gated; capability.move-ignores-zoc [engine · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute
Calls since last wrap:
  actionListSlot · 2026-09-26 · ai.action-list: does the list carry a slot on its entries — one entry per open slot for an either action — or leave the slot to the engine?
  actionListScope · 2026-09-26 · ai.action-list: are swap and end-cycle on the list?
  aiDecisionLogHome · 2026-09-26 · Where does the decision log (the top three plans, AI-DESIGN §5) live — in the event log, or beside it?
  aiModeRowShape · 2026-09-26 · What is a mode row — one weighted sum, or something else?
  aiRowsHome · 2026-09-26 · Where do the mode rows live until the Codex carries them?
  aiAttackChoiceTiers · 2026-09-26 · How does the aiAttackChoice switch reach the scorer?
  aiHintShape · 2026-09-26 · What can an action row's hint say?
  aiHintWhenever · 2026-09-26 · When is a use: 'whenever' action taken?
  aiLogRulePicks · 2026-09-26 · What does a choice made by a fixed rule (feast, a stance, the leap, the kite's power, the quarry's swing) log?
Stack for ai.mode-change:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/
  src/ai · `system.ai-modes` is Angela's, not a chat's

## The chat's commits since the last committed wrap (77e2141)

- e7c456b 2026-09-26 23:24 ai.scorer: AI-DESIGN.md §3B-D, ruled 2026-09-26: a mode is a unit type's characteri
- 0450503 2026-09-26 22:53 wrap: AI designed and ruled (Andrew 2026-09-26, DECISIONS.md four entries; AI-DESIGN.md): a mode per unit type = characteristic rules + scoring; units act alone unless an encounter rules otherwise; mo

## Next chat

New chat with Heroes of Blight and Tragic — engine: ai.mode-change, a unit's mode changes mid-battle
```
start engine
```
