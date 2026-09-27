# engine — handoff 2026-09-27 03:27

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next ai.encounter-rules, 196 of 229 landed · 22 await review · 6 pending
Now: ai.mode-change — the AI framework. Landed: a unit row carries aiChanges [{id, when, mode}] (when: hpBelow percent, or fromTurn), checked as the unit's Activation opens; each fires once in listed order and emits ai.mode naming its id as cause; variants on two test rows (test.rout-zombie.rout hpBelow 50 -> flee, test.late-zombie.charge fromTurn 3 -> dumb-melee), scenarios test.mode-change-a/-b; six switches (SWITCHES.md 'AI mode changes'). Passed every check first attempt. Eight shards green on tree eddb99d6da. Tried: shard 1/8 (integration kiting, 15 s) and 5/8 (audit hit rates, 30 s) time out at load 5-6 on 2 cores; the kiting test times the same on b3f5555 and HEAD (6-13 s, swings with load), so not the change; re-runs passed. Noticed: the gate records the commit id before amending its own commit (backlog says d2263f5, the landing is 9467984; ai.scorer the same); the gate appends gauntlet-log.jsonl after committing, leaving it modified; stale .git/index.lock from an earlier session (delete now allowed on the folder); pack.stamp.json is only written by publish.mjs, so mkenginepack leaves it stale; content's publication.test.mjs needs Edge, absent in the sandbox. Owed by Angela: which id kind a real (non-test) mode change uses — trigger.*, ai.* or other; no real unit carries one yet. Next: ai.encounter-rules.
New chat with Heroes of Blight and Tragic — engine: ai.encounter-rules, an encounter's overarching AI rules (anchoring, coordination)
  start engine
Last landing: 2026-09-27 02:52 (ai.mode-change). Previous chat ended: on a wrap, 2026-09-27 03:27
WRAP NOT COMMITTED: 2026-09-27 03:27 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: ai.mode-change — the AI framework. Landed: a unit row carries aiChanges [{id, when, mode}] (when: hpBelow percent, or fromTurn), checked as the unit's Activation opens; each fires once in listed order and emits ai.mode naming its id as cause; variants on two test rows (test.rout-zombie.rout hpBelow 50 -> flee, test.late-zombie.charge fromTurn 3 -> dumb-melee), scenarios test.mode-change-a/-b; six switches (SWITCHES.md 'AI mode changes'). Passed every check first attempt. Eight shards green on tree eddb99d6da. Tried: shard 1/8 (integration kiting, 15 s) and 5/8 (audit hit rates, 30 s) time out at load 5-6 on 2 cores; the kiting test times the same on b3f5555 and HEAD (6-13 s, swings with load), so not the change; re-runs passed. Noticed: the gate records the commit id before amending its own commit (backlog says d2263f5, the landing is 9467984; ai.scorer the same); the gate appends gauntlet-log.jsonl after committing, leaving it modified; stale .git/index.lock from an earlier session (delete now allowed on the folder); pack.stamp.json is only written by publish.mjs, so mkenginepack leaves it stale; content's publication.test.mjs needs Edge, absent in the sandbox. Owed by Angela: which id kind a real (non-test) mode change uses — trigger.*, ai.* or other; no real unit carries one yet. Next: ai.encounter-rules."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: ai.encounter-rules [ai · rule], then ai.sight [ai · rule], then fix.enemy-accuracy-mod [content · data] (+2 more)
Delegate: ai.encounter-rules [ai · rule] — not yet gated; ai.sight [ai · rule] — not yet gated; fix.enemy-accuracy-mod [content · data] — not yet gated; capability.charge [engine · rule] — not yet gated; capability.move-ignores-zoc [engine · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute
Calls since last wrap: none
Stack for ai.encounter-rules:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/
  src/ai · `system.ai-modes` is Angela's, not a chat's

## The chat's commits since the last committed wrap (fbe95a9)

- 9467984 2026-09-27 02:52 ai.mode-change: Ruled 2026-09-26 (DECISIONS.md 'the AI: a framework now...'): a unit's m
- b3f5555 2026-09-26 23:47 wrap: ai.scorer — the AI framework. Landed: the ten modes are data rows (src/content/ai-modes.ts, on ctx.aiModes: rules + target + anchor + weights in integer tiers) run through the scorer (src/ai/sco

## Next chat

New chat with Heroes of Blight and Tragic — engine: ai.encounter-rules, an encounter's overarching AI rules (anchoring, coordination)
```
start engine
```
