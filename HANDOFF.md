# engine — handoff 2026-09-29 05:40

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next encounter.opening.gates, 223 of 260 landed · 10 await review · 8 pending
Now: the opening's party — 1 landed this chat: fix.opening-party (flagged for review: Law 10 WIN-replicate edits with reasons at the lines, and two capture-tool clones). The six opening scenarios field the party drafted per replicate from progression/OPENING-PARTY.json (1·3·4·5·6·6 Eve-24 heroes at level 1 on their own kits, the Flaming Longsword from the Bridge on); no Alpha hero remains in an opening scenario. Wins over 50 replicates on that party: Orphanage 27, Lumberjack 36, Cavern Trail 7, Gates 0 (0 of 200), Cathedral 0. Tried: the Gates and Cathedral rows from tmp/ authored and reverted again (still pending, rows kept in tmp/). Noticed: progression/build-schedule.mjs no longer reproduces the 20-battle schedule from today's content/gen (battle 1 differs), so --opening writes only OPENING-PARTY.json; audit-all does not fit a Cowork call (it runs the whole suite at once). Suite green as 8 shards, 2300 tests. Next: Andrew's call on the opening's difficulty (level-1 parties lose the Gates and the Cathedral every time), then the Gates and the Cathedral.
New chat with Heroes of Blight and Tragic — engine: Andrew's call on the opening's difficulty, then the Gates and the Cathedral
  start engine
Last landing: 2026-09-29 05:21 (fix.opening-party). Previous chat ended: on a wrap, 2026-09-29 05:40
WRAP NOT COMMITTED: 2026-09-29 05:40 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: the opening's party — 1 landed this chat: fix.opening-party (flagged for review: Law 10 WIN-replicate edits with reasons at the lines, and two capture-tool clones). The six opening scenarios field the party drafted per replicate from progression/OPENING-PARTY.json (1·3·4·5·6·6 Eve-24 heroes at level 1 on their own kits, the Flaming Longsword from the Bridge on); no Alpha hero remains in an opening scenario. Wins over 50 replicates on that party: Orphanage 27, Lumberjack 36, Cavern Trail 7, Gates 0 (0 of 200), Cathedral 0. Tried: the Gates and Cathedral rows from tmp/ authored and reverted again (still pending, rows kept in tmp/). Noticed: progression/build-schedule.mjs no longer reproduces the 20-battle schedule from today's content/gen (battle 1 differs), so --opening writes only OPENING-PARTY.json; audit-all does not fit a Cowork call (it runs the whole suite at once). Suite green as 8 shards, 2300 tests. Next: Andrew's call on the opening's difficulty (level-1 parties lose the Gates and the Cathedral every time), then the Gates and the Cathedral."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: encounter.opening.gates [engine · data], then encounter.opening.cathedral [engine · data], then fix.one-effect-vocabulary [engine · plumbing] (+3 more)
Delegate: encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; fix.one-effect-vocabulary [engine · plumbing] — not yet gated; fix.codex-numbers [content · numbers] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated
Blocked: kingdom.opening-loop needs encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers
Calls since last wrap:
  openingDraftPick · 2026-09-29 · Which of the three offers does the test draft, and who is offered?
  openingPool · 2026-09-29 · Which heroes can be drafted?
  openingCarriedHolder · 2026-09-29 · Who holds the Flaming Longsword from the Bridge on?
  openingBetweenBattles · 2026-09-29 · Do wounds or item rewards carry between opening battles in the probe?
  openingScenarioReplicate · 2026-09-29 · How does a sweep over replicates of an opening scenario get each replicate's party?
Stack for encounter.opening.gates:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (8bdaec9)

- bb4829d 2026-09-29 05:21 gauntlet log: the fix.opening-party landing line
- 6b87095 2026-09-29 05:21 fix.opening-party: Ruled 2026-09-28 (Andrew, DECISIONS.md 'the opening is tested with the p
- 94f1479 2026-09-29 04:49 wrap: prior-art audit, both directions — 2 landed this chat: tool.prior-art-audit (clean; .state/inventory.json baseline: 774 look-alike lists, 58 second homes, 42 funnel bypasses, 50 clones; jscpd in

## Next chat

New chat with Heroes of Blight and Tragic — engine: Andrew's call on the opening's difficulty, then the Gates and the Cathedral
```
start engine
```
