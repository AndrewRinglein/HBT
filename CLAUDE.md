# The Combat Framework — project instructions

Combat engine and simulation harness for *Heroes of Blight and Tragic*.

**Read `COMBAT-FRAMEWORK.md` first** if you don't know what this project is. `COMBAT-SEQUENCE.md` has the order of operations. `ENGINE-CONSTITUTION.md` has the laws — read it before writing engine code.

---

## Vocabulary — use these words, no others

**Battle** → **Turn** (one Hero Phase + one Enemy Phase; the numbered one) → **Phase** → **Activation** (one unit's move + primary action) → **Step** / **Primary Action** → **Attack** → **Hit**

**Settle** is the repeat-until-nothing-changes loop after damage lands.
**Card Play** is commander-level and is *not* a Primary Action.

Never use `round` — it means Turn. Never use `phase` to mean a full turn.

---

## The laws, in short

Full text and enforcement in `ENGINE-CONSTITUTION.md`. Do not violate these to make something faster.

0. **Speed is not a value here.** ~10ms a battle. No optimization without a measurement.
1. One damage function. The AI, the preview, the tooltip and the resolution all run it.
2. One legality function. Every quantity the AI needs comes from `preview()`.
3. Every state change goes through a mutator, and every mutator emits an event.
4. No randomness except a named stream, keyed by *what the roll is* — never by turn.
5. The engine imports nothing. **5b.** State is plain data — no classes, no Maps, no closures.
6. Order is always explicit. Every sort ends in a tiebreaker that cannot tie.
7. Integers only in combat math.
8. No caching without a proven invalidation test.
9. Never swallow a failure. Stop, mark the run invalid, say so loudly.
10. A failing test is a finding. Weakening one requires a written reason.
11. Don't invent a field when one exists — except `lifeState`, which is always its own field.
12. Everything has an id; every log line names its cause.
13. The vocabulary above is fixed.

---

## Commands

```
node tools/next.mjs                    the next backlog item that is ready
node tools/gate.mjs <id>               run the gates, change nothing
node tools/gate.mjs <id> --land        commit, only if every gate passes
node tools/gate.mjs <id> --abandon     give up, revert, record why
node tools/report.mjs                  what landed, abandoned, or needs review
node tools/review.mjs <id> --ok "..."  record Angela's verdict on a flagged landing (--all for the queue)

npm test   npm run typecheck   npm run battle <n> [--map=id]   npm run sweep <n>

node tools/game-builder.mjs           rebuild GAME-BUILDER.html (the gate does this after every run)
node tools/audit-all.mjs              the Iron Gauntlet's full-tree audit
```

**THE GAME BUILDER** — `GAME-BUILDER.html`, double-click it. The gauntlet's
running log: every landing, every failed check, seals, and the questions inbox.
Data: `.state/gauntlet-log.jsonl` (the gate appends one line per run) and
`.state/questions.md` (the human inbox — add and answer questions there; the
page re-renders on the next gate run).

**The gate decides whether an item passed, not you.** Never write `status` into
`.state/backlog.json` by hand — the only writers are the gate and
`tools/review.mjs`, which records ANGELA's verdict on flagged landings (run it
only when she has actually reviewed and said so, quoting her words; it clears
the flag but never rewrites the gate's seal history). Adding many mechanics in a row
is the `batch-add` skill.

## The Iron Gauntlet

The gate's full check suite plus what runs around it. **`⛓ IRON GAUNTLET: PASSED`
prints only when every check passed, no flag warned, and no exemption was taken** —
anything less still lands (flags exist so the loop cannot deadlock) but the seal is
withheld and the ledger says why. The verdict is written onto the backlog item as
`gauntlet`.

- **Kill switch** — the item's tests re-run with its content disabled
  (`CF_DISABLE_IDS`, the seam in `src/content/disable.ts`) and must FAIL. A test
  that passes either way is tautological.
- **Hardcode scan** — added `src/core` lines may not contain content-instance ids
  or creature-tag literals. Core knows mechanisms; only content knows names.
- **Generalization** — a mechanism-shaped item declares `variants`: 2+ ids proving
  the second instance is pure data, each probed live in a battle.
- **Consequence** — `changesBaseline: true` with byte-identical control battles
  FAILS, and consequential mechanisms get a paired WITH-vs-WITHOUT effect
  measurement (`npx tsx tools/effect-size.mts <id>`) recorded in the ledger.
- **Naming** — unknown id kinds block (declare them in `GLOSSARY.md` first);
  banned vocabulary flags.
- **Post-land audit** — tests and baselines re-run FROM THE COMMITTED TREE; on
  disagreement the landing is auto-reverted.
- **Periodic full audit** — `node tools/audit-all.mjs`, run automatically every
  10th landing and at the end of every batch: the whole tree, not the delta.

Every exemption (`unreachable`, `coreLiteralAllow`, `generalizationExempt`,
`killSwitchExempt`) demands a written reason, prints SKIP not PASS, flags the
landing for review, and withholds the seal. The escape hatches exist; they are
deliberately expensive.

State lives on disk (`.state/backlog.json`, `.state/ledger.md`,
`.state/baseline.hash`), so a fresh session resumes exactly where the last one
stopped.

## Where things live

```
packages/core        rules. imports nothing.
packages/content     units, weapons, effects, maps, encounters
packages/ai          behaviour modes
packages/sim         batch runner
packages/analysis    logs → database → dashboard
packages/view        renderer (later)
tools/               verify, sweep
```

---

## Adding anything touches four places

1. The thing itself — a code module or a data row
2. Its registry entry — an explicit array, never a decorator or import side-effect
3. Its verify scenario — a scripted micro-battle with asserted numbers
4. `SWITCHES.md`, if it introduced a question you chose not to answer

Use the `add-and-verify` skill. Don't improvise the loop.

---

## Never hand-edit

Anything under `generated/`. Regenerate it.

---

## Before writing ANY content value: find its owner

**Grep the design folder for the id first.** `../VFX/GROUND-REQUIREMENTS.md`,
`../GAME-DESIGN.md`, `../GAME-ARCHITECTURE.md`, the numbered `*-SETTLED.md` files,
and `MAP-01/map.md` are all content sources. The engine folder is not where content
is decided.

```
grep -rn "terrain.rocky" .. --include=*.md
```

**A `null` in a data file does not mean undecided.** `MAP-01/map.json` has
`moveCost: null` with a note saying these are design decisions — that means *not in
this file*, not *nobody has chosen*. The numbers were in
`VFX/GROUND-REQUIREMENTS.md` §1.1 the whole time.

This is not hypothetical: seven terrain rows were invented on 2026-08-14 while that
table sat one directory up, dated a day and a half earlier. Three were wrong, they
went into a balance sweep, and the wrong numbers were reported to Angela as findings.

**A value with a stated owner is not a switch.** If a document names it, copy it and
cite the document in a comment. `SWITCHES.md` is for questions nobody has answered —
putting an answered one there is how it stops being checked.

---

## Before ASKING a question: check whether it was already ruled on

```
node tools/decided.mjs "does a multi-attack resolve one hit at a time"
node tools/decided.mjs --scan MY-PLAN.md      # every question in a doc at once
```

**Run this on every plan or notes document before it ships.** Not as a habit — as a
step, the same way the gate is a step.

`COMBAT-SEQUENCE.md` line 155 has said since the framework was built: *"An attack is
a list of hits, resolved one at a time. Each hit runs the full cycle — damage,
triggers, settle — before the next hit begins."* Angela litigated it then. It was
re-asked as an open question on 2026-08-15 — hours after the rule above about
grepping the design folder was added to this file.

**A rule you have to remember is not a mechanism.** The rule failed within a day. The
tool runs in a second and reads every document, including the ones you forgot exist.

Asking a settled question is not a small cost. It spends the one thing the person has
that you do not — the memory of having already decided — and it makes them wonder
what else is being re-litigated silently.

---

## When a rule is ambiguous

**Don't decide it — expose it as a switch** and let a sweep answer it. Record it in `SWITCHES.md` with its question and default. When a sweep answers it, record the answer and date; keep the other code path so it stays sweepable.

This is the project's core working principle. Adding a switch is always better than guessing, and always better than asking Angela to rule on something the simulator could tell her.

---

## What to bring to Angela

**Bring her:** data from gate 5; a gate that failed for a design reason ("the aura reaches nobody in this formation"); a genuine fork in the road.

**Don't bring her:** anything a switch can absorb; a gate that failed for a code reason — fix it; a request to decide a number that a sweep could measure.
