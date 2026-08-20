# Framework update — review findings

*2026-08-20. Review only: nothing in `src/` changes on the strength of this document.*

**Direction of comparison, per ruling:** the Codex is the fresh layer. Engine and
design docs are diffed AGAINST `CODEX.md` §11–§13 and the `content/` censuses; a
divergence is by default a pending amendment to the older document.

Every finding is classified **built** (code runs, a test asserts it), **slot** (the
name exists, nothing reaches it), or **absent**. Every engine claim below was
re-verified today by reading `src/`, not by trusting `MECHANICS-GAP.md`.

Passes 3–5 (targeting · effects · the 33 capabilities) follow after Angela reads
passes 1–2.

---

## Pass 1 — Stats. Ladder of 19; engine has 13; six absent; two formulas short a term

### Built — 13 of 19

Strength · Precision · Magic · Spirit · Accuracy · Dodge · Armor · Resist ·
Movement · Reach · Health (`maxHp`) · Stamina Max · Stamina Regen.

All thirteen resolve through `effective()` with a ledger — never read raw. The
ladder's own semantics check out where they touch these: surplus Accuracy over 100
becomes Crit at ÷4 (verified in `critChanceOf`), Health resets every Battle by
construction (`makeUnit`), Movement heroes 5 / enemies 4 matches.

### Absent — 6 of 19

| Stat | Codex says | What its absence blocks | Notes |
|---|---|---|---|
| **Crit** | worth 0.2, base 3 | The `+ Crit from gear, badges, and levels` term of the §4 formula has nowhere to live | The *roll* is built; the *stat* is absent. Formula runs as `3 + surplus` only. |
| **Luck** | flat subtraction from the ATTACKER's crit chance | The `− target's Luck` term | **Slot, not absent** — `critChanceOf(ctx, attacker, target, finalAcc)` takes the target and ignores it. The seat is reserved; nothing sits in it. |
| **Vision** | radius, base 6 | Darkness, fog, stealth detection, and 4 Codex targetings of `one enemy within your Vision` | Whole subsystem absent (known, MECHANICS-GAP §6.3). |
| **Toughness** | worth 0.4 | Deathbed Fighting (`20 + 5×T + badges`) and injury capacity | The entire consequence stack has no input. |
| **Item Slots** | worth 0.67 | The loadout layer | No weapon/gear entity exists (known). |
| **Surge** | worth 0.15, **base value equals the character's level** | 2 specialties (reaver, bloodrage) | **Two stats deep**: Surge's base is Level, and Level is also absent. Cannot build Surge without building Level first. |

### Two mechanics hiding in the ladder's prose

1. **Resist mitigates burn and poison per tick — never bleed.** **RULED, Angela
   2026-08-20**, with the formula: per-tick damage = `max(0, value − Resist)`, and
   Resist never touches the status value itself — *"if I have 5 poison and 2 resist,
   I will take 3 damage. Then poison will go to 4."* The engine does the
   opposite of this: `status.poison.onPhaseEnd` calls `statusDamage` raw, and Resist
   is never consulted. This is not a missing number, it is a missing *step in the
   status tick*, and it is Constitution-relevant: status damage currently bypasses
   the damage pipeline entirely, so "Resist mitigates ticks" either adds a
   mitigation step to `tickStatuses` or routes ticks through a pipeline. Needs a
   per-status flag either way, because bleed is exempt by rule.
2. **Stamina Regen "hard-caps around 3."** No cap exists anywhere in the engine.
   "Around" is not a number — this is a **switch** (`staminaRegenCap`, default 3),
   not a decision to make silently.

### Design-doc amendments this pass produces (proposed, not applied)

- **Grit → Luck**, five occurrences in `GAME-DESIGN.md` (§0 table, §4 formula and
  crit prose ×3, §7 sheet). Ruled 2026-08-20.
- **Add Surge** to the §7 sheet, with its Level dependency stated.
- **Add the Resist-mitigates-ticks rule** to §5's status section, with the bleed
  exemption.
- The §7 sheet order should match the ladder's 19 so the two lists cannot drift in
  count again.

---

## Pass 2 — Hooks. Codex uses 14 names; nine are built; three are absent; two are not hooks at all

Codex §11 usage, against the engine's `HOOKS` and `GAME-DESIGN.md` §5's amended list:

| Codex name | Uses | Engine | Design doc | Verdict |
|---|---:|---|---|---|
| `onHit` | 67 | built | listed | — |
| `onKill` | 36 | built | listed | — |
| `startOfBattle` | 33 | **absent** | listed | **Third most-used hook in the corpus.** Also the mechanism "grant permanent triggers at load" needs (ruled 2026-08-15). Highest-leverage single addition in this review. |
| `onCrit` | 18 | built | **missing** | The engine's "extra" hook is vindicated — 18 uses. Amend §5's list to eleven; the open question from 2026-08-15 closes in the engine's favor. |
| `onTakingDamage` | 16 | built | listed | — |
| `onDamage` | 15 | built | listed | — |
| `passive` | 15 | — | — | **Not a hook.** See below. |
| `aura` | 13 | — | — | **Not a hook.** See below. |
| `onActivationEnd` | 10 | built | listed | — |
| `onDodge` | 9 | **absent** | **missing** | New, defined nowhere. See below. |
| `onAttack` | 8 | built | listed | — |
| `onMiss` | 5 | built | listed | — |
| `onEquip` | 2 | **absent** | listed | Blocked on the loadout layer existing at all. |
| `onDeath` | 2 | built | listed | — |

Retired hooks — `onEnter`, `onWounded`, `turnEnd` — have **zero** Codex uses.
Consistent everywhere; closed.

### `passive` and `aura` should not enter the Hook enum

A hook answers *when*. A passive answers *always* and an aura answers *where* —
different questions, and the engine already has the right homes for both:

- **`passive` (15 uses) is a standing stat modifier.** `Unit.mods` and the stat
  pipeline model it exactly — a `StatMod` with no expiry, granted at load. Encoding
  "always" as a trigger that must fire on some event is the bend-the-framework move
  this review exists to prevent. Authoring can keep writing `passive`; the loader
  translates it to mods, not to a trigger.
- **`aura` (13 uses) is the spatial subsystem** — radius, lends-while-inside,
  fires-at-activation-end-if-still-inside (§5). Absent today (MECHANICS-GAP §6.4)
  and has to be built as its own thing; 13 uses says it is worth building, not
  worth faking as a hook.

### `onDodge` needs a definition before it can exist

Nine uses, defined nowhere. The real question: does it fire on **any miss against
you**, or only when **Dodge caused the miss** — the roll would have hit before
`TARGET_DODGE` and missed after it? The strict reading is implementable today
because the accuracy ledger already carries the dodge delta per shot — the engine
can tell the two cases apart. But which one is the design is a **ruling**, not an
engineering choice. (If any-miss: it is `onMiss` with the owner flipped to the
defender, and cheap.)

### What this pass does NOT recommend

No hook is recommended for cutting. The least-used real hooks (`onEquip`,
`onDeath`, both 2) are load-bearing anyway — `onEquip` is the loadout layer's only
hook and `onDeath` anchors deathrattles.

---

## Pending

- **Pass 3 — Targeting:** 24 Codex shapes vs the unit-shaped `Targeting` model;
  hex-targeting is the expected headline. Checks `normtargets.mjs` first.
- **Pass 4 — Effects:** the Codex effect list vs `TriggerEffect`'s three kinds;
  `grant a stat for the Battle` at 166 uses is the expected headline.
- **Pass 5 — The 33 capabilities:** each routed to station / hook / mutator /
  subsystem / **cut**.
