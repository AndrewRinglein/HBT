---
name: add-and-verify
description: Add a new effect, unit, map, or AI mode to The Combat Framework and prove it works before any balance conclusion is drawn. Use whenever adding, changing, or fixing game content or mechanics — poison, protection, a new enemy, a terrain event, a behaviour mode. Covers the five verification gates and the failure triage.
---

# Add and verify

One loop for everything. Only step 3 differs by type.

**Never skip a gate. Stop at the first failure.** A mechanic that hasn't passed Gate 2 must not be swept — you would be measuring a bug, and the number would look completely legitimate.

---

## 1. State it in one sentence

Write what it does, in the terms of `COMBAT-SEQUENCE.md`, before writing code.

> *Protection: a pool the hero carries. Reduces incoming damage at station 550 and is reduced by what it absorbs. Loses 1 at End of Phase. Additive when granted again.*

If you can't write that sentence, you don't know what you're building yet. Ask.

## 2. Pick the shape

**Four shapes, and every status is one of them:**

| Shape | Behaviour |
|---|---|
| **Modifier** | A number that changes something while present |
| **Pool** | A quantity spent when something consumes it |
| **Counter** | Ticks down, acts each tick |
| **Flag** | On or off |

Then name: which **station** (if it touches a number in the accuracy or damage pipeline), which **hook** (if it reacts to something), which **ladder rung** (if it acts at End of Activation / End of Phase / Start of Turn), and how it **stacks**.

**If the shape is a mechanism (rule · station · trigger · modifier · pool · counter), declare its `variants` on the backlog item before writing code**: two or more ids that exercise the SAME mechanism with different data. +2 vs demons proves nothing; +2 vs demons and +4 vs undead proves a system. The gate probes every variant in a live battle and rejects any variant whose id appears in `src/core` — the second instance must be pure data. Picking the variants FIRST is the point: it forces the parameterization to exist before the temptation to hardcode does. If a mechanism truly cannot have a second instance, `generalizationExempt` takes a written reason and flags the landing for review.

**Never put a content name in engine code.** The gate scans every added `src/core` line for content-instance ids and creature-tag literals and fails on sight. A genuine board rule (zone of control is the canonical exception) takes `coreLiteralAllow` with a written reason and lands flagged.

If the thing doesn't fit one of the four shapes, stop and say so — that's an architecture question, not a content one.

## 3. Write it

**An effect** → a row in `src/content/` (statuses.ts, moves.ts, index.ts as the kind demands), plus its registry entry. *(Was `packages/content/effects/` — no `packages/` directory has ever existed. Corrected 2026-08-21.)*

- Changes a number in flight → declare a **station**. It may only adjust the value; it cannot mutate the world.
- Makes something happen → declare a **hook**. It is queued and runs after the damage resolves — never inside it.

**A unit** (hero or enemy) → a data row. Stats, weapons, triggers by id, AI mode. No code.

**A map** → terrain layers, deployment zones, spawn zones. Add it to the panel only if it covers a shape the panel lacks.

**A battlefield event** → pick a shape generator (Band, Scatter, Half, Path, Disk) plus parameters and the status it writes. Don't write bespoke geometry — extend the library if the shape is genuinely new.

**An AI mode** → a weight set over existing considerations. Adding a *consideration* is an engine change and needs its own verification; adding a *mode* is data.

Registry entries are explicit arrays. Never decorators, never import side-effects — load order becomes a hidden global that changes tie-breaks between runs.

## 4. Gate 1 — does it exist?

> **`pnpm verify` never existed.** It was the pre-gauntlet command and is dead.
> `tools/gate.mjs` now runs gates 1–3 below *and* the Iron Gauntlet's own checks
> — kill switch, hardcode scan, generalization, consequence, naming, post-land
> audit. See the `iron-gauntlet` skill for the loop this sits inside.
> Corrected 2026-08-21.

```
node tools/gate.mjs <id>          # check only, changes nothing
npx tsx tools/probe.mts <id>      # gate 1 on its own, if you want just this
```

Run one battle, search the log for the id. Three distinct failures, and the log distinguishes them:

| What you see | What it means |
|---|---|
| No lines at all | Not wired in. Check the registry entry. |
| Consulted, did nothing | Its condition never became true. Check the trigger predicate, radius, or targeting. |
| Fired, nothing changed | The logic is wrong. Check the station or mutator. |

## 5. Gate 2 — is it correct?

A scripted micro-battle with known numbers, asserting **specific values at specific moments**.

> Protection is 2 at end of turn 1, 1 at end of turn 2, 0 at end of turn 3. Total absorbed across the fight is exactly 5. The aura reached exactly the 4 units within radius and no others.

At least three scenarios: the minimal case, a boundary (0, maximum, the turn it expires, exactly at radius versus one hex beyond), and one interaction with something already shipped.

This is the gate that proves the code matches the intent. It is the reason the harness exists. Do not weaken an assertion to make it pass — that's Law 10.

## 6. Gate 3 — did it break anything else?

Re-run the baseline battle with the new thing **absent**. The event log must be byte-identical to before your change.

If it differs, the new code is leaking into paths it shouldn't touch. Find out why before continuing — this is the cheapest bug you will ever catch.

## 7. Gates 4 and 5 — does it help, and how much?

Hand off to the `run-sweep` skill.

---

## Triage: what to fix and what to escalate

**Fix it yourself** — anything mechanical. Wrong registry entry, wrong station, wrong hook, wrong predicate, an assertion that reveals a real bug.

**Add a switch** — anything ambiguous. If the spec doesn't say whether protection is additive or take-highest, whether a mid-attack strength gain applies to the second hit, whether corpses block movement: add it to `SWITCHES.md` with a default and keep going. Do not stall, and do not ask.

**Escalate to Angela** — only these:

- The thing doesn't fit the four shapes, or needs a new station or ladder rung
- A gate fails for a *design* reason, not a code reason — *"the aura reaches nobody in this formation"*
- It contradicts `GAME-DESIGN.md`
- Verifying it would require breaking a law in `ENGINE-CONSTITUTION.md`

Everything else is yours.

---

## Report when done

```
<id> — one line of what it does
Gate 1 exists        PASS   (n log lines)
Gate 2 correct       PASS   (n scenarios, key asserted values)
Gate 3 no leak       PASS   (baseline unchanged)
Switches added:      <id> = <default>   (if any)
Ready to sweep.
```
