# Combat Framework — project instructions

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

npm test   npm run typecheck   npm run battle <n> [--map=id]   npm run sweep <n>
```

**The gate decides whether an item passed, not you.** Never write `status` into
`.state/backlog.json` by hand — only the gate does. Adding many mechanics in a row
is the `batch-add` skill.

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

## When a rule is ambiguous

**Don't decide it — expose it as a switch** and let a sweep answer it. Record it in `SWITCHES.md` with its question and default. When a sweep answers it, record the answer and date; keep the other code path so it stays sweepable.

This is the project's core working principle. Adding a switch is always better than guessing, and always better than asking Angela to rule on something the simulator could tell her.

---

## What to bring to Angela

**Bring her:** data from gate 5; a gate that failed for a design reason ("the aura reaches nobody in this formation"); a genuine fork in the road.

**Don't bring her:** anything a switch can absorb; a gate that failed for a code reason — fix it; a request to decide a number that a sweep could measure.
