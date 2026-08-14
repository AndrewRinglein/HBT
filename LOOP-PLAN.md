# Terrain and ZoC — how to run these in a loop

*Plan, 2026-08-13. Answers one question: how do we land these six items unattended
and know each one actually worked? Archive it once they're through.*

---

## These are two different kinds of work

They look like one list. They are not, and running them the same way is how the
second one hurts you.

| | Terrain | ZoC / AoO |
|---|---|---|
| What it is | **data** — rows | **a rule** in the movement ladder |
| Blast radius | the hex a unit stands on | every path every unit takes |
| Can it break the AI? | no | **yes, silently** |
| Existing machinery | the stat pipeline, built for this | none |
| Loop | tight, mostly automatic | one at a time, eyes on |

Terrain modifiers should be almost free. The stat pipeline landed precisely so that
"forest gives +10 dodge and +1 armor" is a row in `terrainMods()` and not a new
station. **If terrain needs a pipeline change, the design is wrong, not the item.**

ZoC is the opposite: it changes what movement *means*, and it lands damage in the
middle of a move.

---

## Six items, in this order

```
terrain.kinds          plumbing only — no rules. Must be behaviour-neutral.
  ├── terrain.movecost      moveCostOf gains cases
  ├── terrain.passable      obstacles block; first terrain that can strand a unit
  └── terrain.modifiers     the stat-pipeline rows — the cheap one
movement.zone-of-control    movement stops inside an enemy ZoC
  └── movement.attack-of-opportunity   leaving provokes; damage lands mid-move
```

Already queued in `.state/backlog.json` in this order, with `needs` wired, so
`node tools/next.mjs` walks them correctly.

**`terrain.kinds` first, alone, with no rules attached.** It adds five terrain types
and five glyphs and changes nothing about how anything plays. That makes it the one
item in the batch with a **provable** success condition: all four original baselines
must come out **byte-identical**, because no existing map contains a new glyph. If a
baseline moves, plumbing leaked into behaviour and you find out while the change is
five lines instead of five hundred.

That's the same trick as the map rename and the five renderer fields: **separate the
change that shouldn't do anything from the change that should, and prove the first
one didn't.**

---

## The AI stays blind — and that has one consequence you must build for

Angela's call: the AI does not account for ZoC or AoO yet. It keeps its current
scoring, picks destinations as though neither exists, and eats the consequences.
Fine — but it produces a specific hazard.

**`reachable()` will offer hexes the unit cannot actually reach.** The AI picks one,
`executeMove` walks the path, ZoC stops it three hexes early, and the unit ends its
activation somewhere it never chose.

That is correct behaviour and an invisible failure at the same time. It is the exact
shape of the bug that cost the most time on this project already — a unit doing
something with no trace in the log. So:

> **Every truncated move emits `move.stopped` naming what stopped it.**
> No silent early exits. This is a hard gate, not a nicety.

Same for AoO: it lands damage inside `executeMove`'s per-step loop, so `settle` can
fire mid-move, a unit can die between two steps, and victory can trigger mid-activation.
`executeMove` already has `if (u.lifeState !== 'standing') break`. That line stops
being incidental and becomes load-bearing — it needs its own test.

---

## The loop

Per item, unattended, via the `batch-add` skill:

```
node tools/next.mjs                 what's ready
   … implement …
node tools/gate.mjs <id>            check. changes nothing. iterate here.
node tools/gate.mjs <id> --land     commit, only if every gate passes
node tools/gate.mjs <id> --abandon  give up, revert, record why
```

The gate decides, not the model. Seven checks today: dependencies landed, typecheck,
full suite, **gate 1 — the id appears in a real battle**, brought its own tests,
existing tests untouched (flags, doesn't block), control battles unchanged.

---

## Three gates these items need that don't exist yet

The current seven catch *broken*. They do not catch **pointless** or **quietly
degrading**, and both are live risks here.

### A. "It made a difference" — paired CRN differential

A terrain modifier can land, appear in the log, pass every test, and change nothing
measurable. Gate 1 proves it *fired*; nothing proves it *mattered*.

Add: run N battles with the feature on and off, **same seeds both arms** (common
random numbers, so the only difference is the treatment), and assert the outcome
distribution actually moved.

```
gate 5 — measurable:  hero win rate | damage taken | turns-to-clear
                      moved by more than noise across 200 paired battles
```

An item that fails this isn't broken — it's **content that doesn't earn its place**,
which is the Massive Strike finding arriving before you ship it instead of after.
It should land flagged, not blocked; the answer is usually "the number is too small,"
which is a switch to sweep, not a bug to fix.

### B. "No silent stops" — the invisible-behaviour gate

Assert that every activation whose movement ended early has an event explaining why.
Concretely: for every `move.begin` where the unit travelled fewer hexes than planned,
there is a `move.stopped` (or `life.*`) at that seq.

**This is the one gate written specifically because the AI is blind.** Without it,
ZoC lands looking perfect and produces a log nobody can read.

### C. "The AI didn't get dumber" — degradation guard

ZoC will make units stop short. Some of that is the mechanic; some would be a bug.
Cheap invariants, all measurable in the existing sweep:

- `capped` outcomes stay near zero — battles still end
- idle activations don't spike (they sit near 30% today; a jump means units are stuck)
- no unit ends a battle having never moved and never acted
- turns-to-clear doesn't run away

These are **thresholds against today's numbers, not absolutes.** Record the current
values before starting; that's the control arm.

---

## What to sweep rather than decide

`map.json` leaves `moveCost`, `coverBonus`, `modifiers` and water passability null
**on purpose** — its own note says they're design decisions, not generated data.
Don't fill them in by choosing. Each goes in `SWITCHES.md` with a default and gets
answered by a sweep:

| Switch | Default | The question |
|---|---|---|
| `terrain.forest.moveCost` | 2 | does slow cover beat fast cover? |
| `terrain.forest.dodge` | +10 | enough to change target selection? |
| `terrain.water.passable` | cost 3 | a barrier, or a tax? |
| `terrain.water.accuracy` | −10 | worth modelling at all? |
| `zoc.stopsOnEntry` | true | stop on entering, or on leaving? |
| `aoo.oncePerEnemy` | true | per enemy, or per activation? |

Six switches is six sweeps, and each is minutes. Deciding them by taste is how the
baseline stops meaning anything by month three.

---

## The honest risk

Terrain will go through the loop cleanly. It's data, the pipeline is built, and the
worst case is a modifier too small to matter — which gate A catches and a sweep fixes.

**ZoC and AoO should not be run unattended in the same batch.** They change every
path in the game, and the AI is deliberately not defending itself. Land
`terrain.*` in a batch; then do the two movement items one at a time, watching, with
a sweep after each. The loop is for work whose failure modes you already know.
