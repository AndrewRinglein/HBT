---
name: batch-add
description: Work through the backlog of mechanics in The Projections one item at a time, unattended — implement, run the blocking gate, fix or abandon, land, repeat. Use when adding many effects, statuses, units, terrain types, abilities or AI modes in a row without a human in the loop.
---

# Batch add

Work `.state/backlog.json` top to bottom. One item at a time, all the way through, then the next.

**You do not decide whether an item passed.** `tools/gate.mjs` decides, and its exit code is not arguable. Never mark an item done by editing the backlog yourself — only the gate writes status.

---

## The loop, per item

```
1.  read the item          node tools/next.mjs
2.  implement it
3.  write its tests        test/<something>.test.ts  — NEW file, or new blocks in one
4.  node tools/gate.mjs <id>              # check only, changes nothing
5.  FAIL?  fix and go to 4.  Up to 4 attempts.
    After 4:  node tools/gate.mjs <id> --abandon
6.  PASS?  node tools/gate.mjs <id> --land
7.  next item
```

Do not batch several items into one gate run. One item, one commit, one ledger entry. When something breaks three items later, you need to know which commit did it.

---

## What the gate checks

| gate | blocks? | what it means |
|---|---|---|
| dependencies landed | yes | items in `needs` are done |
| typecheck | yes | `tsc --noEmit` clean |
| full test suite | yes | **every** test, not just the new ones |
| the id appears in a real battle | yes | Gate 1 — it is genuinely wired in and did something |
| brought its own tests | yes | an item with no test cannot land |
| existing tests untouched | **no — flags** | lands, but marked `done-needs-review`, with the diff in the ledger |
| control battles unchanged | yes | unless the item sets `changesBaseline: true` |

The test-edit check flags rather than blocks on purpose: blocking would deadlock the loop every time a stale test legitimately needs updating, and silently allowing it is how a loop launders a failure into a pass. So it lands, loudly, and a human reads the flagged list afterwards.

---

## Rules that matter

**A status needs a source.** A mechanic nothing ever applies cannot pass Gate 1, no matter how correct the code is. If the backlog row does not name a source, add one, and say so in the item's `spec` — do not quietly invent it.

**Declare it if it changes the control battles.** There is one hash per control map (`map.open`, `map.ridge`, `map.flanks`, `map.highlands`). Anything touching an existing unit, attack, or map will move at least one of them, and *which* ones moved is diagnostic — a terrain change that also moves `map.open` is a leak, because `map.open` has no terrain. That is legitimate — set `"changesBaseline": true` on the row. Leaving it undeclared is what the check is for.

**Test the rule, not the number.** `expect(rangerDamage).toBe(0)` is a *finding*; it will be false the moment the game legitimately changes, and then the loop stalls on it. `expect(rangerDamage).toBeLessThan(warriorDamage / 10)` is a *rule* and survives. Findings belong in the sweep report, never in an assertion.

**Never weaken an assertion to make a gate pass.** If a test fails, the first hypothesis is that the change is wrong. If a test is genuinely stale, rewrite it as a rule (above) — that lands flagged, which is the correct outcome.

**Ambiguity becomes a switch, not a question.** If the spec does not say whether something stacks additively or takes the highest, pick a default, add a row to `SWITCHES.md`, and keep going. Do not stop to ask.

---

## Where the four shapes go

Every status is one of these. Pick before writing code.

| shape | behaviour | goes in |
|---|---|---|
| **counter** | ticks down, acts each tick | `onPhaseEnd` in `content/statuses.ts` |
| **pool** | spent when consumed | a damage station + `decayPools` |
| **modifier** | a number that changes something | `reducesOutgoingDamage`-style flag |
| **flag** | on or off | `blocksAction`-style flag |

Units, enemies and maps are **data**. Abilities are a row in `ABILITIES` plus, if novel, a function. Terrain is a row in `content/maps.ts`.

---

## Stopping

Stop and report — do not keep going — if any of these happen:

- The same item fails four times. Abandon it and move on; do not abandon silently.
- Two consecutive items abandon. Something structural is wrong.
- The control-battle hash changes on an item that did not declare it. That means a leak, and the next item will build on top of it.
- A gate errors rather than failing (the harness itself is broken).

Otherwise run to the end of the backlog without checking in.

---

## When the backlog is done

1. `node tools/report.mjs` — what landed, what was abandoned, what is flagged.
2. Re-run the sweep and rebuild the dashboard so the numbers match the new content.
3. Report: items landed, items abandoned and why, items flagged for review, and any switch you added.
