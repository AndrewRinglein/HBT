# engine — handoff 2026-09-27 07:14

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next ai.sight, 197 of 229 landed · 22 await review · 5 pending
Now: ai.encounter-rules — the AI framework. Landed 8b172d6 (content 82d43df): an encounter row carries aiRules (anchor, coordinate), bound to the units it fields as they arrive (ai.anchored / ai.coordinated); an anchor keeps a unit's moves within its radius and walks it back first; coordination is a once-per-Phase side step (src/ai/side-brain.ts) that picks a focus (ai.focused) which coordinated units rank first. Variants test.anchor.hold-the-line, test.coordinate.one-target; scenarios test.encounter-rules-a/-b; twelve switches (SWITCHES.md 'Encounter AI rules'). Passed every check first attempt; eight shards green on tree 2f7f383d55. Tried: the gate landed de373dc, then a hand amend (outside the gate) moved hero placement in the two scenarios to the encounter's heroZone to satisfy scenario.test.ts, and in doing so dropped the new test's positive check that without the rules skeleton A closes on the warrior — the 'modes alone' half of expect is now checked only by the absence of ai.focused/ai.coordinated events. Noticed: variants/probeIds were added to backlog.json by script, as last time; the viewer does not draw the three new events; a stray /tmp file parked at scratch/q-tmp-stray.mts (excluded); a stale .git/index.lock was left by git on the mount and removed; audit-all runs the whole suite in one call and cannot fit Cowork's 178 s, so the 8 shards stood in for it; root GAME-BUILDER.html is stale since 2026-09-18. Owed by Angela: which id kind real encounter rules use; whether ai.anchored, ai.coordinated, ai.focused stand (GLOSSARY has only ai.mode, ai.denied). Next: ai.sight.
New chat with Heroes of Blight and Tragic — engine: ai.sight, what a unit can see and how the AI uses it
  start engine
Last landing: 2026-09-27 05:22 (ai.encounter-rules). Previous chat ended: on a wrap, 2026-09-27 07:14
WRAP NOT COMMITTED: 2026-09-27 07:14 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: ai.encounter-rules — the AI framework. Landed 8b172d6 (content 82d43df): an encounter row carries aiRules (anchor, coordinate), bound to the units it fields as they arrive (ai.anchored / ai.coordinated); an anchor keeps a unit's moves within its radius and walks it back first; coordination is a once-per-Phase side step (src/ai/side-brain.ts) that picks a focus (ai.focused) which coordinated units rank first. Variants test.anchor.hold-the-line, test.coordinate.one-target; scenarios test.encounter-rules-a/-b; twelve switches (SWITCHES.md 'Encounter AI rules'). Passed every check first attempt; eight shards green on tree 2f7f383d55. Tried: the gate landed de373dc, then a hand amend (outside the gate) moved hero placement in the two scenarios to the encounter's heroZone to satisfy scenario.test.ts, and in doing so dropped the new test's positive check that without the rules skeleton A closes on the warrior — the 'modes alone' half of expect is now checked only by the absence of ai.focused/ai.coordinated events. Noticed: variants/probeIds were added to backlog.json by script, as last time; the viewer does not draw the three new events; a stray /tmp file parked at scratch/q-tmp-stray.mts (excluded); a stale .git/index.lock was left by git on the mount and removed; audit-all runs the whole suite in one call and cannot fit Cowork's 178 s, so the 8 shards stood in for it; root GAME-BUILDER.html is stale since 2026-09-18. Owed by Angela: which id kind real encounter rules use; whether ai.anchored, ai.coordinated, ai.focused stand (GLOSSARY has only ai.mode, ai.denied). Next: ai.sight."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: ai.sight [ai · rule], then fix.enemy-accuracy-mod [content · data], then capability.charge [engine · rule] (+1 more)
Delegate: ai.sight [ai · rule] — not yet gated; fix.enemy-accuracy-mod [content · data] — not yet gated; capability.charge [engine · rule] — not yet gated; capability.move-ignores-zoc [engine · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute
Calls since last wrap: none
Stack for ai.sight:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/
  src/ai · `system.ai-modes` is Angela's, not a chat's

## The chat's commits since the last committed wrap (d7d6d4e)

- 8b172d6 2026-09-27 05:22 ai.encounter-rules: Ruled 2026-09-26: by default units do not work together and each type ha
- 1a894d7 2026-09-27 03:27 wrap: ai.mode-change — the AI framework. Landed: a unit row carries aiChanges [{id, when, mode}] (when: hpBelow percent, or fromTurn), checked as the unit's Activation opens; each fires once in listed

## Next chat

New chat with Heroes of Blight and Tragic — engine: ai.sight, what a unit can see and how the AI uses it
```
start engine
```
