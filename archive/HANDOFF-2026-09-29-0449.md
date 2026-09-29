# engine — handoff 2026-09-29 04:49

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next fix.opening-party, 222 of 260 landed · 9 await review · 9 pending
Now: prior-art audit, both directions — 2 landed this chat: tool.prior-art-audit (clean; .state/inventory.json baseline: 774 look-alike lists, 58 second homes, 42 funnel bypasses, 50 clones; jscpd in tools/jscpd), tool.wrong-home-audit (clean; generated/wrong-home.md lists 17 to move out of the engine). Ruled (Andrew): the opening is tested with the player's party, not the Alpha Team; filed fix.opening-party and tool.wrong-home-audit. Tried: encounter.opening.gates authored and reverted, still pending (0 wins in 60 with four Alpha heroes; row kept in tmp/encounter.opening.gates-authored-2026-09-29.json). Noticed: the tooling switches sit in engine SWITCHES.md because GBH is not in this chat; pipeline.ts ledger names enemies unit.unit.<id>. Suite green as 8 shards, 2294 tests. Next: fix.opening-party, then the Gates and Cathedral re-tried on that party.
New chat with Heroes of Blight and Tragic — engine: the opening's party, then the Gates and the Cathedral on it
  start engine
Last landing: 2026-09-29 03:22 (tool.wrong-home-audit). Previous chat ended: on a wrap, 2026-09-29 04:49
WRAP NOT COMMITTED: 2026-09-29 04:49 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: prior-art audit, both directions — 2 landed this chat: tool.prior-art-audit (clean; .state/inventory.json baseline: 774 look-alike lists, 58 second homes, 42 funnel bypasses, 50 clones; jscpd in tools/jscpd), tool.wrong-home-audit (clean; generated/wrong-home.md lists 17 to move out of the engine). Ruled (Andrew): the opening is tested with the player's party, not the Alpha Team; filed fix.opening-party and tool.wrong-home-audit. Tried: encounter.opening.gates authored and reverted, still pending (0 wins in 60 with four Alpha heroes; row kept in tmp/encounter.opening.gates-authored-2026-09-29.json). Noticed: the tooling switches sit in engine SWITCHES.md because GBH is not in this chat; pipeline.ts ledger names enemies unit.unit.<id>. Suite green as 8 shards, 2294 tests. Next: fix.opening-party, then the Gates and Cathedral re-tried on that party."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: fix.opening-party [engine · data], then encounter.opening.gates [engine · data], then encounter.opening.cathedral [engine · data] (+4 more)
Delegate: fix.opening-party [engine · data] — not yet gated; encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; fix.one-effect-vocabulary [engine · plumbing] — not yet gated; fix.codex-numbers [content · numbers] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated
Blocked: kingdom.opening-loop needs encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers
Calls since last wrap: none
Stack for fix.opening-party:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (40b644e)

- 03faf80 2026-09-29 03:22 gauntlet log: the tool.wrong-home-audit landing line
- 639b31d 2026-09-29 03:22 tool.wrong-home-audit: Ruled 2026-09-28 (Andrew, DECISIONS.md same entry): the prior-art audit
- f77b1fb 2026-09-29 03:13 gauntlet log: the tool.prior-art-audit landing line
- e7ae877 2026-09-29 03:13 tool.prior-art-audit: Duplication review 2026-09-28, the prevention (page section 'Prevention'
- 118e855 2026-09-29 02:51 ruling 2026-09-28 (Andrew): the opening is tested with the player's party, not the Alpha Team - 'We need to move away from these alpha heroes.' The prior-art audit checks both directions. backlog: fix.opening-party, tool.wrong-home-audit
- 3128060 2026-09-29 02:00 wrap: duplication review, first three, and the kingdom's encounter battles — 4 landed this chat: plumbing.vocabulary-export (declared control change: the one stat map compiles Blinded's -4 Vision), fi

## Next chat

New chat with Heroes of Blight and Tragic — engine: the opening's party, then the Gates and the Cathedral on it
```
start engine
```
