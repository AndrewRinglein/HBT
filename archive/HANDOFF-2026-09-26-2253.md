# engine — handoff 2026-09-26 22:53

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next ai.scorer, 194 of 229 landed · 22 await review · 8 pending
Now: AI designed and ruled (Andrew 2026-09-26, DECISIONS.md four entries; AI-DESIGN.md): a mode per unit type = characteristic rules + scoring; units act alone unless an encounter rules otherwise; modes can change mid-battle; heroes play as well as the engine can; the AI sees all but stealthed units and invisible traps; no intent shown; framework now, behaviours over time; no balance adjustments, features first. Landed: ai.action-list (legalActions; all ten modes read it; control battles identical), pack.enemy-actions (Close Bite x3, Clobber, Buff, flight for seven; flagged: eight tests rewritten as rules), fix.kiln-fire-test, tool.gate-fits-cowork (the gate resumes across calls; --shard k/N; a chat lands itself), fix.terrain-test-timeouts, tool.cowork-test-timeout (30 s test timeout in Cowork only). system.ai-modes closed as delivered. Filed: ai.scorer, ai.mode-change, ai.encounter-rules, ai.sight, capability.charge, capability.move-ignores-zoc, fix.enemy-accuracy-mod. Eight shards green on tree 4138a51760. Buff is on the Colossus's list but unused until ai.scorer.
New chat with Heroes of Blight and Tragic — engine: ai.scorer, the AI scoring framework
  start engine
Last landing: 2026-09-26 22:43 (tool.cowork-test-timeout). Previous chat ended: on a wrap, 2026-09-26 22:53
WRAP NOT COMMITTED: 2026-09-26 22:53 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: AI designed and ruled (Andrew 2026-09-26, DECISIONS.md four entries; AI-DESIGN.md): a mode per unit type = characteristic rules + scoring; units act alone unless an encounter rules otherwise; modes can change mid-battle; heroes play as well as the engine can; the AI sees all but stealthed units and invisible traps; no intent shown; framework now, behaviours over time; no balance adjustments, features first. Landed: ai.action-list (legalActions; all ten modes read it; control battles identical), pack.enemy-actions (Close Bite x3, Clobber, Buff, flight for seven; flagged: eight tests rewritten as rules), fix.kiln-fire-test, tool.gate-fits-cowork (the gate resumes across calls; --shard k/N; a chat lands itself), fix.terrain-test-timeouts, tool.cowork-test-timeout (30 s test timeout in Cowork only). system.ai-modes closed as delivered. Filed: ai.scorer, ai.mode-change, ai.encounter-rules, ai.sight, capability.charge, capability.move-ignores-zoc, fix.enemy-accuracy-mod. Eight shards green on tree 4138a51760. Buff is on the Colossus's list but unused until ai.scorer."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: ai.scorer [ai · rule], then ai.sight [ai · rule], then fix.enemy-accuracy-mod [content · data] (+2 more)
Delegate: ai.scorer [ai · rule] — not yet gated; ai.sight [ai · rule] — not yet gated; fix.enemy-accuracy-mod [content · data] — not yet gated; capability.charge [engine · rule] — not yet gated; capability.move-ignores-zoc [engine · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute; ai.mode-change needs ai.scorer; ai.encounter-rules needs ai.scorer
Calls since last wrap:
  actionListSlot · 2026-09-26 · ai.action-list: does the list carry a slot on its entries — one entry per open slot for an either action — or leave the slot to the engine?
  actionListScope · 2026-09-26 · ai.action-list: are swap and end-cycle on the list?
Stack for ai.scorer:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/
  src/ai · `system.ai-modes` is Angela's, not a chat's

## The chat's commits since the last committed wrap (57ccee3)

- dbc4e83 2026-09-26 22:43 tool.cowork-test-timeout: Andrew 2026-09-26 ('Do you need me for this? ... Can you do these functi
- e564ca4 2026-09-26 22:42 backlog: filed tool.cowork-test-timeout (Andrew 2026-09-26)
- 6c1c641 2026-09-26 20:48 fix.terrain-test-timeouts: Found landing tool.gate-fits-cowork 2026-09-26: shard 8/8 fails in Cowor
- e5b693f 2026-09-26 20:47 backlog: filed fix.terrain-test-timeouts (2026-09-26)
- cbd9186 2026-09-26 20:33 tool.gate-fits-cowork: Andrew 2026-09-26 ('Add it'): a chat must be able to land and run the sh
- 1c0550a 2026-09-26 12:32 fix.kiln-fire-test: Andrew 2026-09-26 (DECISIONS.md 'no balance adjustments now; features fi
- a7bcd32 2026-09-26 19:30 backlog: fix.kiln-fire-test is plumbing, not a rule - a test-only fix has no content to probe, vary or switch off (filed wrong 2026-09-26)
- 8e15401 2026-09-26 19:21 backlog: filed tool.gate-fits-cowork - a chat lands and runs the shards itself (Andrew 2026-09-26: 'Add it')
- d24fc03 2026-09-26 18:47 DECISIONS: no balance adjustments now; features first (Andrew 2026-09-26). Filed fix.kiln-fire-test
- bd0177c 2026-09-26 11:30 pack.enemy-actions: AI-DESIGN.md §7 step 2. Enemies use the one action type (DECISIONS.md 20
- f4c889a 2026-09-26 08:54 backlog: filed fix.enemy-accuracy-mod, capability.charge, capability.move-ignores-zoc - what pack.enemy-actions found and could not carry (2026-09-26)
- 58f0bd7 2026-09-26 08:29 backlog: pack.enemy-actions names its probes (the three Close Bites) and declares no baseline change - the control battles field none of its units (Zombie x3 + Burning Zombie, src/content/index.ts:303)
- 2b7fd06 2026-09-26 00:45 ai.action-list: AI-DESIGN.md §3A, ruled 2026-09-26 (DECISIONS.md 'the AI: modes per unit
- 1d15fba 2026-09-26 07:10 backlog: system.ai-modes closed as delivered - the design is AI-DESIGN.md (Andrew 2026-09-26)
- 0d048df 2026-09-26 07:10 DECISIONS: the AI does not see an invisible trap; system.ai-modes closes as delivered (Andrew 2026-09-26); ai.sight spec carries the trap ruling
- 969fa54 2026-09-26 07:08 DECISIONS: the AI - a framework now; modes can change mid-battle; no intent shown; the AI sees all but the stealthed (Andrew 2026-09-26). Filed ai.action-list, pack.enemy-actions, ai.scorer, ai.mode-change, ai.encounter-rules, ai.sight
- f49a438 2026-09-26 07:03 DECISIONS: the AI - modes per unit type, scoring inside them, encounter rules on top (Andrew 2026-09-26); AI-DESIGN.md written to the ruling (system.ai-modes)
- 4ca0380 2026-09-26 06:14 wrap: fix.masterwork-scope landed clean across three packages (Andrew 2026-09-25: masterwork for tier-1 two-handers, one-handers, shields and armor; shields still never enchanted): engine f6cfb29 (tes

## Next chat

New chat with Heroes of Blight and Tragic — engine: ai.scorer, the AI scoring framework
```
start engine
```
