---
name: run-sweep
description: Run a comparison in The Combat Framework and report what it means — does a change help, and how much. Use after a mechanic has passed verification, or to compare AI modes, enemy counts, wave schedules, or maps. Covers paired dice, the map panel, reading result shape, and the traps that make small-sample results look real when they are not.
---

# Run a sweep

Gates 4 and 5. **Only run this on something the gate has landed** — `node tools/gate.mjs <id>` must have passed. Sweeping an unverified mechanic measures a bug, and the resulting number is indistinguishable from a real one.

*(Said `pnpm verify` until 2026-08-21. That command never existed; the Iron Gauntlet replaced it. The project is npm, not pnpm.)*

---

## The shape of every sweep

> Run battle X. Change exactly one thing. Run it again **on the same dice**. Diff the scoreboard.

That holds whether you're testing an effect, an enemy, a wave schedule, a map, or an AI mode. The subject changes; the machinery doesn't.

```
npm run sweep <n>                        # n replicates; src/cli/sweep.ts
npx tsx tools/effect-size.mts <id>       # paired WITH vs WITHOUT, one id
```

A **rule** item has no content row to disable, so its backlog row declares `effectSwitch` —
the switch values its WITHOUT arm runs with (`movement.zone-of-control`: `{"zoneOfControl": false}`,
`station.crit`: `{"critEnabled": false}`). `effect-size.mts <id>` uses it and says so on its
second line; a value equal to the default is refused (tool.effect-size-rules, 2026-09-25).

## Four rules

**1. Same dice on both arms.** Baseline and treatment share seeds. Same to-hit rolls, same terrain event, same placement, same wave draws. The only difference is the thing you changed. Unpaired arms at these sample sizes tell you nothing.

**2. One change per comparison.** Not statistical fussiness — if two things changed, the diff cannot say which one did it, and you'll re-run anyway.

**3. Baseline runs alongside, every time.** Never compare against a stored result from last week. The engine will have changed — a fix, an AI tweak, a stat adjustment — and any of it gets silently credited to your new thing. At 10ms a battle, re-running the baseline is free.

**4. Run the map panel, not one map.** A radius-3 aura covers the whole party on open ground and reaches two allies in a corridor. That's a 4× swing from identical code. One map tells you what an effect is worth *there*.

## Gate 4 — does it point the right way?

Sign only. A handful of paired runs. Did damage taken go down when you added protection? Did the new enemy actually make the fight harder?

Cheap, fast, and where most iteration should live. If the sign is wrong, stop — something is broken, and no amount of sample size fixes a wrong sign.

## Gate 5 — how much?

The full scoreboard, across the panel:

- damage dealt and taken, by unit and by source
- kills both ways
- outcome (`heroClear · objectiveMet · wipe · retreat · capped`) and turn count
- heroes downed, stood, killed; wound levels at the end
- stamina spent, and the turn it ran out

**A win with three crippled heroes is a bad outcome.** Win rate is a weak measure for this game; cost is the real one. Report the outcome *and* what it cost.

---

## Read the shape, not the average

Across ten maps you get ten numbers, and their pattern is the finding:

| Pattern | Meaning |
|---|---|
| Helps everywhere, similar size | **Reliable.** Price it and move on. |
| Helps hugely on a few, nothing elsewhere | **Situational.** Either a build-around or a trap that reads strong in the shop. |
| Helps on some, **hurts** on others | The most interesting result available — and an average erases it completely. |

Always report per-map. Never lead with the mean.

---

## Four traps

**Zero variance.** If every run of an arm gives an identical result, the sample size is 1 no matter how many battles you ran — and the dashboard will render it as *"no difference, tightly estimated,"* the most confident possible statement about nothing. Check that within-arm results actually differ before reporting anything. If they don't, that IS the finding: this scenario can't discriminate, and the fight is decided at deployment.

**Small samples flatter you.** Ten runs is a *screen*, not an answer. 7-of-10 versus 5-of-10 is noise. Report screening results as *candidate, unconfirmed*, and confirm anything you'd act on at a larger n — which costs seconds.

**Dropping the ugly runs biases everything.** Capped and invalid battles are disproportionately the ones the horde was winning. Never silently exclude them. Report them as their own outcome, and if their rate differs between arms, say so — that difference may be the whole result.

**The AI is inside every number.** An ability the AI never chooses reads as weak, and that's a fact about the AI. Before calling something weak, check whether it was ever *selected*. If usage is near zero, report NO DATA and the reason — never "weak."

---

## Report

```
Question:   <what was being asked>
Change:     <the one thing that differed>
Panel:      <n maps>, <n paired runs each>

Per map:    <map> baseline → treatment  (the metric that matters)
Shape:      reliable | situational | mixed
Cost:       heroes downed / killed / wound levels, both arms
Usage:      how often the AI actually chose it

Verdict:    one sentence
Caveats:    zero-variance arms, capped runs, near-zero usage, anything unconfirmed
```

Lead with the verdict and the shape. The tables are for when she wants to dig.
