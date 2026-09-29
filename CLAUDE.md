# The Combat Framework — engine instructions

Combat engine and simulation harness for *Heroes of Blight and Tragic*.

**Read `COMBAT-FRAMEWORK.md` first** if you don't know what this project is.
`COMBAT-SEQUENCE.md` has the order of operations. `ENGINE-CONSTITUTION.md` has the laws —
read it before writing engine code.

**How every chat behaves is `../DISPLAY-RULES.md`** — one list, Angela's, numbered
1–39, for how a chat talks to her, starts, works, uses subagents and wraps. It applies
here in full, and this file may add a rule but never loosen one. Cut to this 2026-09-06
(`../../GBH/CARRYOVER.md` items 3 and 8); everything the list already says is gone from here
and the old text is in git. What is left is the engine's own: its words, its laws, its
commands, its gauntlet, its stack, its traps.

---

## Vocabulary — use these words, no others

**Battle** → **Turn** (one Hero Phase + one Enemy Phase; the numbered one) → **Phase** →
**Activation** (**the totality of one unit's doing of things** — movement, then primary
action; a Surge grants another of each *inside the same Activation*, and the End of
Activation ladder runs **once**. Ruled 2026-08-21) → **Step** / **Primary Action** →
**Attack** → **Hit**

**Settle** is the repeat-until-nothing-changes loop after damage lands.
**Card Play** is commander-level and is *not* a Primary Action.

Never use `round` — it means Turn. Never use `phase` to mean a full turn.

---

## The laws, in short

Full text and enforcement in `ENGINE-CONSTITUTION.md`. Do not violate these to make
something faster.

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
node tools/start.mjs                   `start engine` — where the package is, rendered
node tools/wrap.mjs "<now line>" --next "<which chat, what it does>" "<its first line>"
                                       `wrap` — Now line, count, HANDOFF.md, STATE-ROW.md, one commit

node tools/next.mjs                    the next backlog item that is ready
node tools/gate.mjs --shard <k>/4      run a quarter of the test suite (k = 1..4), one command
                                       each — once per chat; wrap refuses until a complete set
                                       passed on the exact tree. In Cowork run --shard <k>/8
                                       (k = 1..8) instead: any complete set counts
node tools/gate.mjs --shards-green     exit 0 only if a complete set of shards passed on this tree
node tools/gate.mjs <id>               run the gates, change nothing. Each check is recorded
                                       against the tree; in Cowork it stops at 150 s (--budget <s>)
                                       with INCOMPLETE, exit 3 — repeat the same command until it
                                       finishes. --fresh re-runs every check
node tools/gate.mjs <id> --land        commit, only if every gate passed on this tree (recorded or
                                       fresh) — in Cowork, repeat it until it lands
node tools/gate.mjs <id> --abandon "<why>"   give up, revert, record why — runs no checks
node tools/gate.mjs --count            the one count line — start and wrap print it verbatim
node tools/report.mjs                  what landed, abandoned, or needs review
node tools/review.mjs <id> --ok "..."  record Angela's verdict on a flagged landing (--all for the queue)
node tools/decided.mjs "<question>"    is it already ruled on? --scan <doc> for every question in one

npm test   npm run typecheck   npm run battle <n> [--map=id]   npm run sweep <n>
npm run proving <plan.json> [--out dir] [--force]   THE PROVING — squads, fixtures and subjects
                                       → paired results and a flip-rate ranking (PROVING-PLAN.md)

node tools/game-builder.mjs            rebuild GAME-BUILDER.html — run it when you want to look
node tools/audit-all.mjs               the full-tree audit — on its own, never inside a landing
node tools/prior-art.mjs [--item]      what is new since .state/inventory.json (--write: audit-all's run;
                                       --root <dir> --fresh: a whole tree with no baseline). jscpd lives in
                                       tools/jscpd: npm ci --prefix tools/jscpd
node tools/wrong-home.mjs [--item]     what the engine holds that another package owns (--write: the
                                       removal list, generated/wrong-home.{json,md})
npx tsx tools/effect-size.mts <id>     WITH-vs-WITHOUT battles for one mechanism — on its own
```

Run from the **HBT folder**, by hand, never by any gate:

```
node ../GBH/tools/state-rows.mjs --root .   assemble root STATE.md's rows · --check · --init
```

**THE GAME BUILDER** — `GAME-BUILDER.html`, double-click it. The gauntlet's running log:
every landing, every failed check, and the questions inbox. Data:
`.state/gauntlet-log.jsonl` (the gate appends one line per run) and `.state/questions.md`
(the human inbox — add and answer questions there; the page re-renders when
`game-builder.mjs` runs). It is the thing Angela looks at, so it is what an eyeball check links to.

**The gate decides whether an item passed, not you.** Never write `status` into
`.state/backlog.json` by hand — the only writers are the gate and `tools/review.mjs`,
which records Angela's verdict on flagged landings (run it only when she has actually
reviewed and said so, quoting her words; it clears the flag). Adding many mechanics in a row is the `batch-add` skill.

## The Iron Gauntlet

The gate's checks, each pass or fail. **No seal and no exemptions** (Andrew,
2026-09-23, `DECISIONS.md` "less process per feature"). Flags still print and go in the
ledger; a landing that edited existing tests still lands `done-needs-review` (Law 10).

A landing runs: typecheck, **the item's own tests** (the test files it touched), the
control battles, and the checks below. The full suite runs **once per chat**, as the four
`--shard` commands, and `wrap` refuses until a complete set (four, or `k/8` in Cowork) passed on the final tree.

- **Appears in a battle** — probes the id (or `probeIds`). Engine-only plumbing with no
  `probeIds` skips it as not applicable.
- **Kill switch** — the item's tests re-run with its content disabled (`CF_DISABLE_IDS`,
  the seam in `src/content/disable.ts`) and must FAIL. Engine-only plumbing skips it.
- **Hardcode scan** — added `src/core` lines may not contain content-instance ids or
  creature-tag literals. Core knows mechanisms; only content knows names.
- **Generalization** — a mechanism-shaped item declares `variants`: 2+ ids proving the
  second instance is pure data, each probed live in a battle.
- **Consequence** — `changesBaseline: true` with byte-identical control battles FAILS.
- **Naming** — unknown id kinds block (declare them in `GLOSSARY.md` first); banned
  vocabulary flags.
- **Prior art** — a flag, not a gate (tool.prior-art-audit, 2026-09-28). What the item changed in all
  four packages (uncommitted) against the tree: a new vocabulary sharing 75% of another file's list, a new
  function or constant another file already declares, a new call around a ruled funnel
  (`tools/prior-art-funnels.json`), a jscpd clone on an added line. Any of them holds the landing as
  `done-needs-review` unless the spec has a `Prior art:` line naming what it resembles and why it is not
  the same. `node tools/prior-art.mjs --item` shows it before the gate does.
- **Wrong home** — a flag (tool.wrong-home-audit, 2026-09-28). The item's changed engine files: a content
  row or a content number typed in, a content name read by core/ai/sim, a campaign quantity, a display
  colour. Lands `done-needs-review` unless the spec has an `Engine rule:` line naming the ruling. The whole
  list of what to move out is `generated/wrong-home.md` (`node tools/wrong-home.mjs --write`).
- **Nothing left out of the commit** — `--land` refuses if an ignored file under `src/`,
  `test/` or `tools/` could have fed a pass the commit would not carry.

**One backlog item per feature, not one per layer** — sized to fit one chat, carried
across engine, content and kingdom (each package commits in its own repository).

State lives on disk (`.state/backlog.json`, `.state/ledger.md`, `.state/baseline.hash`), so
a fresh session resumes exactly where the last one stopped.

## Stack

Which files to open for which kind of item — read by `tools/start.mjs`, printed as *Stack
for `<id>`* for the top item of the queue. The `Item` column is `any`, a backlog `kind`, a
backlog `shape`, or an item id. Nothing else at start; every other file is opened by the
item that needs it.

| Item | Open |
|---|---|
| any | the item's `spec` and `expect` — `node tools/next.mjs` — before any source file |
| any | ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming |
| any | `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything |
| rule trigger modifier pool counter station | COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/ |
| data numbers content | **the design folder — grep it for the id first** (below) · src/content · its registry array |
| naming decision | GLOSSARY.md — a new kind is Angela's · DECISIONS.md |
| plumbing | src/core and the mutator that owns the field · test/ — the probe before the prose |
| ai | src/ai · `system.ai-modes` is Angela's, not a chat's |
| viewer.geometry viewer.build viewer.board viewer.tile-state viewer.panel viewer.pump viewer.log-transport viewer.styles viewer.hexvfx-path | EVENTS-FOR-THE-VIEWER-2026-09-03.md · ../viewer/CLAUDE.md |
| proving.rank proving.page | PROVING-PLAN.md · ../content/proving/ |

## Start and wrap

**An engine chat opens with the Heroes of Blight and Tragic folder only** — not GBH,
so GBH's `CLAUDE.md` does not load into it (Andrew, 2026-09-22). Its label is
`New chat with Heroes of Blight and Tragic — engine: <what it does>`. Nothing the engine
runs reads GBH; only `state-rows.mjs`, run by hand, lives there.

`start engine` runs `node tools/start.mjs`; `wrap` runs
`node tools/wrap.mjs "<now line>" --next "<label>" "<first line>"`. The rules for both are
`../DISPLAY-RULES.md` §Starting and §Wrapping. What `start.mjs` prints: the count line
verbatim from the gate, the Now line, the next chat the last wrap named, how the previous
chat ended, `Yours:`, `Queue:`, `Delegate:`, `Blocked:`, `Calls since last wrap:`, and the
stack for the top item (the table above). `wrap.mjs` writes `.state/now.json`,
`.state/wraps.json`, `HANDOFF.md` (the previous one to `archive/`) and `STATE-ROW.md`, then
commits — and it refuses a wrap that does not name the next chat and its first line.

---

## Where things live

**There is no `packages/` directory** — the tree is `src/`, and always has been.

```
src/core         rules. imports nothing.
src/content      units, weapons, effects, maps, moves, statuses
src/ai           behaviour modes
src/sim          batch runner
src/view         text renderer (the battle viewer is the sibling package ../viewer/ —
                 tools/replay/ is the superseded rig, awaiting deletion)
src/cli          battle and sweep entry points
tools/           the gate, start, wrap, the probes, the Game Builder
                 (tools/replay/ and build-replay.mjs: superseded 2026-09-02, to delete)
.state/          the gauntlet's memory — backlog, ledger, baselines, the Now line, the wraps
archive/         old handoffs. Never read.
```

**Generated here, never hand-edited:** anything under `generated/`, `GAME-BUILDER.html`,
`.state/backlog.json`, `.state/ledger.md`, `.state/gauntlet-log.jsonl`,
`.state/gauntlet.json`, `.state/baseline.hash` (the gate's), `.state/inventory.json` (the prior-art audit's), `generated/wrong-home.{json,md}`, and `.state/now.json`,
`.state/wraps.json`, `HANDOFF.md`, `STATE-ROW.md` (the wrap's). Regenerate; never edit.

## Adding anything touches four places

1. The thing itself — a code module or a data row
2. Its registry entry — an explicit array, never a decorator or import side-effect
3. Its verify scenario — a scripted micro-battle with asserted numbers
4. `SWITCHES.md`, if it introduced a question you chose not to answer

Use the `add-and-verify` skill. Don't improvise the loop.

## The engine's traps

**Before any new mechanism, name what already does it.** Search the engine's tables and seams
(`src/core`, `src/content/terrain.ts`, `statuses.ts`, the trigger hooks) and `../content/FUNCTIONS.md`
for the concept, not the word — then write in the item's `spec` which existing mechanism it
extends, or that none exists and where you looked. A second way of doing an existing thing passes
every gate check. (`terrain.cursed`, 2026-09-28: a new terrain id for cursed ground while
`layer.weak` already was it under the one ground-status shape ruled 2026-09-03 — abandoned before
code. Andrew: "just create a whole new thing for something that already existed in the wrong way.")

**Before writing ANY content value: find its owner.** Grep the design folder for the id
first — `../VFX/GROUND-REQUIREMENTS.md`, `../GAME-DESIGN.md`, `../GAME-ARCHITECTURE.md`,
the numbered `*-SETTLED.md` files, `MAP-01/map.md`. The engine folder is not where content
is decided.

```
grep -rn "terrain.rocky" .. --include=*.md
```

**A `null` in a data file does not mean undecided.** `MAP-01/map.json` has `moveCost: null`
with a note saying these are design decisions — that means *not in this file*, not *nobody
has chosen*. **A value with a stated owner is not a switch:** if a document names it, copy
it and cite the document in a comment. `SWITCHES.md` is for questions nobody has answered;
putting an answered one there is how it stops being checked. (Seven terrain rows were
invented on 2026-08-14 while that table sat one directory up, dated a day and a half
earlier. Three were wrong and went into a balance sweep.)

**`node tools/decided.mjs` is a step, not a habit.** Run it on every plan or notes document
before it ships (`--scan MY-PLAN.md`). A rule you have to remember is not a mechanism: the
multi-attack question was settled in `COMBAT-SEQUENCE.md` line 155, litigated by Angela,
and re-asked as open the next day.

**A Cowork call dies at ~178 s, so the gate resumes across calls.** Cowork's shell kills
every command at ~178 s whatever timeout is asked for (a bare `sleep 200` died at
177,998 ms), and a backgrounded process dies with its call. Nothing in this repo sets that
limit. Since `tool.gate-fits-cowork` (2026-09-26) the gate records each check against the
exact tree in `.state/gate-progress.json` and, in Cowork, stops between checks at 150 s
with `INCOMPLETE` (exit 3; no attempt, no log line, no landing): **repeat the same
`gate.mjs <id>` or `--land` command until it finishes.** Run the suite as
`--shard k/8`, k = 1..8. A single check still has to fit one call: the mounted folder
costs ~1.4 ms per file stat, and a cold `tsc --noEmit` took 160 s on 2026-09-21 (5.6 s
warm the next day). The mount-unlink trap is in the root `CLAUDE.md`.

**`wrap.mjs` commits `git add -A`**, exactly as the gate does. Wrap with an ungated
item's files in the tree and the wrap commits them (`e89e3a7` swept R0's nine files on
2026-09-21; undone in `79544c5`). **Park work in progress outside the tree before
`wrap`, not only before a landing.**
