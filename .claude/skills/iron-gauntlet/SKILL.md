---
name: iron-gauntlet
description: Iron Gauntlet — the landing loop for the Heroes of Blight and Tragic combat engine. Use ONLY when working inside that project's engine/ folder — adding or fixing a game mechanic, status, unit, terrain, trigger, ability, AI mode or movement power; running tools/gate.mjs, tools/next.mjs or tools/audit-all.mjs; or landing, abandoning or reviewing an item in .state/backlog.json. Covers the gate, the pre-flight checks, the exemption discipline, the stopping rules, and which sibling skill to hand off to. Not applicable to any other project.
---

# The Iron Gauntlet

**Everything lands through the gate. You do not decide whether an item passed —
`node tools/gate.mjs <id>` decides, and its exit code is not arguable.**

This skill is the spine. The details live in four sibling skills in
`engine/.claude/skills/`; **read the relevant one from disk before you start** —
they are the source of truth and this file deliberately does not copy them.

| You are about to | Read |
|---|---|
| add or fix one mechanic | `add-and-verify/SKILL.md` |
| work many backlog items in a row | `batch-add/SKILL.md` |
| measure whether it helped | `run-sweep/SKILL.md` |
| watch a battle / prove it is visible | `visual-replay/SKILL.md` |

---

## 0. Where the commands run

All of these run from `engine/`. **npm, not pnpm.** There has never been a
`verify` script — `pnpm verify` is dead and any doc still saying it is stale.

```
node tools/next.mjs                      what is ready
node tools/gate.mjs <id>                 check — changes nothing
node tools/gate.mjs <id> --land          land it, only if every gate passes
node tools/gate.mjs <id> --abandon       give up, revert the tree, record why
node tools/report.mjs                    landed / abandoned / needs review
node tools/review.mjs <id> --ok "..."    record ANGELA's verdict, her words only
node tools/audit-all.mjs --label "..."   full-tree audit — MANDATORY at batch end
node tools/decided.mjs "question"        BEFORE asking anything
npm test        npm run typecheck        npm run sweep <n>
```

**The suite needs a POSIX shell** for two child-process tests. Fixed 2026-08-21
so `cmd.exe` works too, but Git Bash or a Linux sandbox is the tested path. If
`vitest` cannot start, the Linux binaries may be missing — see `HANDOFF.md`.

---

## 1. Pre-flight — three checks, every time, before writing anything

These are steps, not habits. Both failure modes below have already cost this
project real days.

1. **`node tools/decided.mjs "<your question>"`** — before asking anyone
   anything, and on every plan document before it ships (`--scan FILE.md`).
   Asking a settled question spends the one thing the person has that you do
   not: the memory of having already decided it.
2. **Grep for the owner before typing any number.**
   `grep -rn "<id>" .. --include=*.md`. A value with a stated owner is not a
   switch. Seven terrain rows were invented on 2026-08-14 while the real table
   sat one directory up; three were wrong and went into a balance sweep.
3. **Read the laws if you are touching `src/`** — `ENGINE-CONSTITUTION.md`, and
   `COMBAT-SEQUENCE.md` for the order of operations. Every ladder there carries
   a `Built?` column; a rung marked *not yet* is a reserved slot, not behaviour.

**Ambiguity becomes a switch, never a question.** Pick a default, add it to
`SWITCHES.md` with its question, keep going. A switch is always better than a
guess and always better than asking Angela something a sweep could answer.

---

## 2. The loop

```
1.  node tools/next.mjs                   read the item — spec, expect, shape
2.  implement it                          four places: the thing, its registry
                                          entry, its verify scenario, SWITCHES.md
3.  node tools/gate.mjs <id>              check only
4.  FAIL?  fix, go to 3.  Max 4 attempts.
    After 4:  node tools/gate.mjs <id> --abandon
5.  PASS?  node tools/gate.mjs <id> --land
6.  next item
```

**One item, one gate run, one commit, one ledger entry.** Never batch several
items into one gate run — when something breaks three items later you need to
know which commit did it.

---

## 3. What the gate checks

Eleven checks. Seven block; the rest flag.

| check | blocks? | means |
|---|---|---|
| dependencies landed | yes | everything in `needs` is done |
| typecheck | yes | `tsc --noEmit` clean |
| full test suite | yes | **every** test, not just the new ones |
| gate 1 — id appears in a real battle | yes | genuinely wired in, and it did something |
| brought its own tests | yes | an item with no test cannot land |
| control battles unchanged | yes | unless the item declares `changesBaseline: true` |
| content has a published source | flags | the id exists in the Codex / a SETTLED file |
| hardcode scan | yes | no content-instance ids or creature tags in `src/core` |
| generalizes | yes | 2+ `variants`, each probed live; the second is pure data |
| naming | yes | new id kinds must be declared in `GLOSSARY.md` first |
| kill switch | yes | the item's tests must **FAIL** with its content disabled |

**The kill switch is the one that catches self-deception.** A test that passes
with the content switched off would have passed before the feature existed.

**`⛓ IRON GAUNTLET: PASSED` prints only when every check passed, nothing
flagged, and no exemption was taken.** Anything less still lands — flags exist
so the loop cannot deadlock — but the seal is withheld and the ledger says why.

---

## 4. Exemptions cost something

`unreachable` · `coreLiteralAllow` · `generalizationExempt` · `killSwitchExempt`

Each demands a written reason of 20+ characters, prints **SKIP** not PASS, flags
the landing for review, and withholds the seal. They exist for genuine
structural cases — the benched drake is the precedent.

**Never spend an exemption to keep moving.** If a check keeps failing, abandon
the item and record why. An abandoned item is a finding; a laundered one is a
landmine.

---

## 5. Things you must never do

- **Never hand-edit `status` in `.state/backlog.json`.** Only the gate and
  `tools/review.mjs` write it.
- **Never weaken an assertion to pass a gate** (Law 10). If a test fails, the
  first hypothesis is that your change is wrong. If a test is genuinely stale,
  rewrite it as a *rule* rather than a *number* — that lands flagged, which is
  the correct outcome. Write the reason in a comment at the edit.
- **Never run `review.mjs` on your own work.** It records *Angela's* verdict, in
  her words, and only after she has actually reviewed.
- **Never regenerate by hand** anything under `generated/`, or `CONTENT-GAPS.md`.
- **Never put a content name in `src/core`.** Core knows mechanisms; only
  content knows names.

---

## 6. Stop and report if

- the same item fails four times — abandon it, out loud
- two consecutive items abandon — something structural is wrong
- a control-battle hash moves on an item that did not declare it — that is a
  leak, and the next item will build on top of it
- a gate **errors** rather than failing — the harness itself is broken
- a piece of content needs something the engine cannot express — that goes in
  `CONTENT-GAPS.md`. Do not build a bespoke hook so one row fits.

Otherwise run to the end without checking in.

---

## 7. At the end of a batch

1. **`node tools/audit-all.mjs --label "<what this batch was>"`** — mandatory,
   whatever the count. The gate runs it automatically every 10th landing; batch
   end is the other required moment.
2. `node tools/report.mjs` — landed, abandoned, flagged.
3. Report **the seal per item**. Ten landings with three withheld seals is a
   different result from ten clean ones, and the summary must show it.
4. Ship both copies of `GAME-BUILDER.html` (engine/ and project root) whenever
   the gate rebuilt it.

---

## 8. What goes to Angela

**Bring her:** gate-5 data; a gate that failed for a *design* reason ("the aura
reaches nobody in this formation"); a genuine fork; content that needs a
capability the engine does not have.

**Do not bring her:** anything a switch absorbs; a gate that failed for a code
reason — fix it; a number a sweep could measure; anything `decided.mjs` answers.

She dictates content in plain speech. **Transcribe it VERBATIM** into
`DECISIONS.md` and the Codex — never paraphrase, never invent an adjacent value.
"Copy, don't invent." When she corrects you, the correction is a ruling: record
it. All content changes go through the Codex, the source of truth — never
hardcoded somewhere.
