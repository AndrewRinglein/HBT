# Framework update — review findings

*2026-08-20. Review only: nothing in `src/` changes on the strength of this document.*

**Direction of comparison, per ruling:** the Codex is the fresh layer. Engine and
design docs are diffed AGAINST `CODEX.md` §11–§13 and the `content/` censuses; a
divergence is by default a pending amendment to the older document.

Every finding is classified **built** (code runs, a test asserts it), **slot** (the
name exists, nothing reaches it), or **absent**. Every engine claim below was
re-verified today by reading `src/`, not by trusting `MECHANICS-GAP.md`.

All five passes are complete. Every open design question raised by the review has
since been ruled and is marked inline.

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
2. ~~Stamina Regen cap~~ — **withdrawn. RULED 2026-08-20: no cap.** The ladder's
   "hard-caps around 3" is the stale text; Codex-side amendment.

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
| `onEquip` | 2 | **absent** | listed | **RETIRED, ruled 2026-08-20** — units start fully equipped, so equip-time IS battle-start. The 2 uses reword to `startOfBattle`. |
| `onDeath` | 2 | built | listed | — |

Retired hooks — `onEnter`, `onWounded`, `turnEnd`, and now `onEquip` — closed.

**With `onEquip` retired, the lists converge exactly:** the engine's nine built
hooks plus `startOfBattle` are the complete set of ten. One hook to build, zero to
delete, and the design list and the engine agree for the first time.

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

No further cuts. `onDeath` (2 uses) stays — it anchors deathrattles.

---

## Pass 3 — Targeting. The vocabulary is already locked; the engine needs three extensions and one structural one

**First finding, and it removes a feared workstream: phrasing drift is solved.**
`content/normtargets.mjs` holds a locked canonical vocabulary — a closed regex of
legal shapes, a normalizer that rewrites everything else into them, idempotent by
construction. The engine's loader will receive a **closed list of ~28 shapes**, not
free prose. It also states a rule that confirms the excludeSelf ruling from the
content side: *"ally always INCLUDES YOURSELF unless the shape says 'you and'."*

The shapes fall into six families against the engine's `Targeting`
(select self·unit·area × side × radius × origin × requireTags, returning unit ids):

| Family | Shapes (uses) | Engine today |
|---|---|---|
| **Unit-in-radius** | self (121) · one enemy in melee reach (89) · one enemy/ally within N (132) · allies/enemies/every unit within N (63) · every enemy adjacent to you (4) | **Expressible now.** ~409 of ~460 targeting uses — the model already covers the bulk. |
| **Count-capped** | up to N enemies/allies within M (15) | **CUT, ruled 2026-08-20** — "things are either area of effect... or it's targeting a unit." The 15 rows reword content-side; no engine work. |
| **LifeState-filtered** | one downed ally within N (4) | Needs a lifeState filter on `Targeting`. Thin, and `fix.downed-targetable` is already open. |
| **Hex-targeted** | a hex within N (8) · a hex + every adjacent (13) · three hexes within N (3) · your own hex (2) · a hex (1) | **Structural.** `resolveTargets` returns unit ids; these target ground. Needed by fireball-style placement and the whole terrain-status layer. Targets must become units *or* hexes. |
| **Directional** | arcs of 2/3 (3) · lines of 2 (2) · hex directly behind the target (2) · adjacent-to-both templates (3) | New geometry — `hex.ts` has distance only, no direction/facing math. Small in uses, distinctive in feel (cleaves, impales). |
| **Derived-radius & path** | within your Vision (5+) · the hexes you leave this Turn · every enemy you pass | Vision-radius needs the Vision stat (pass 1). Path shapes couple targeting to the move just made — new, 2 canonical shapes, powers like fel-rush. |

**Recommendation:** extend `Targeting` with a lifeState filter (cheap, immediate);
design the hex-target extension as one change serving both
targeting and the terrain-status layer; treat directional templates and path
targeting as their own small geometry module. Nothing here suggests cutting — even
the one-use shapes are weapon identity (glaive, halberd).

---

## Pass 4 — Effects. Thirty-one effect kinds in the corpus; the engine has three

`TriggerEffect` today: `status.apply` · `status.remove` · `damage`. The Codex §11
effects table, routed:

| Route | Effect kinds (uses) |
|---|---|
| **Built** | deal TRUE/MAGIC/PHYSICAL damage (86) · apply a status (138, gated on the statuses existing) · read the party-wide sum (23 — `ValueSpec.partyMagic/partySpirit`, verified) |
| **Thin extension** — mechanism exists, effect kind missing | **grant a stat (226 across four durations)** — `StatMod` is built and waiting; no effect writes one · heal (86) · remove N of a status (45 — `status.reduce`, already in the backlog) · regain stamina (13 — mutator exists) · take damage yourself / lose a stat (18 — self-targeted existing kinds) · stabilise a downed ally (5 — `setLifeState` exists; rules needed) |
| **One shared mechanism** | move yourself (29) + Knockback N (3) + move WITHOUT provoking (11) → a forced/free movement effect family · Immunity N (12) → a gate in `applyStatus` that consumes charges · consume the target's status (7) → read-then-remove, atomic · Thorns N (11) → a status carrying an `onTakingDamage` trigger — falls out of statuses-carry-triggers |
| **Subsystem** | grant an aura (28) · reveal/break/enter stealth (22) · place a trap (15) · set a ground layer (12) |
| **Withdrawn — legacy, ruled 2026-08-20** | ~~grant Flight (2)~~ — Flight is a movement type carried by the move or power itself, never granted as a status. **Full model ruled 2026-08-20:** a flight move is targeted and atomic — click the destination, jump there as one motion, skipping terrain effects and impassability in between; only the destination must be viable; the move ends on landing; **landing is real** (the tile's end-of-activation effects fire). Engine shape: `moveUnit` straight to the hex, zero Steps, no path, no ZoC provoke along the way, legality = range + destination viability. **Airwalk** is the persistent condition suppressing the occupied tile's end-of-activation effects — a check in the ground rung; **Flight + Airwalk compose** — fly there, land on nothing. |
| **Loadout-dependent** | deal damage, type from the weapon (14) · change damage type / `damageTypeOverride` (4) · slayer bonus (1 — the VS_TARGET station) |
| **Surge system** | grant Surge Chance (7) |
| **Campaign seam** | raise the party-wide sum permanently is battle-tier, but corruption (2) and `deathbedFighting` as a modifier target (1) write campaign state — defer with the seam |

**Three structural findings bigger than any single effect:**

1. **Effects need a `condition`.** The corpus conditions — *target has tag X* (15),
   *target carries a status* (9), *you are in stealth* (2) — plus the whole
   SUSPECT-CLAUSES branch list (*"apply 5 Burn if the target is demon, otherwise
   2"*) have no home: `Trigger` has no condition field at all.
2. **Effects need to be a list.** A power like deep-cut chains stat grant + rider
   grant in one activation; `Trigger` holds exactly one effect.
3. **Durations are four canonical points; the engine has one.** *Rest of the Battle*
   (170) · *end of your next Turn* (40) · *start of your next Turn* (8) · *end of
   the Turn* (2). `StatMod.expiresAtTurn` is turn-granular only — start-vs-end
   distinctions need phase-granular expiry. Small change, touches every temporary
   effect.

**Statuses: the corpus runs ten, the design doc lists six, the engine has one.**
burn (79) · bleed (63) · poison (52) · protection (40) · weak (38) · stun (22) ·
**slow (19)** · **frost (14)** · regeneration (6) · **karma (4)**. Slow, frost and
karma are new since §5's table (karma with its own decay rule, `rule.karma-decay`).
Proposed amendment: §5's status table grows to ten rows — Codex is fresh.

---

## Pass 5 — The 33 capabilities, routed

**The Codex's own ban list does a third of this pass's work.** §11 ends with
twenty *"Not available — do not write these"* rules, and they are the content layer
meeting the framework halfway: no occurrence counting, no event history, no
per-target memory, no state gates, no reading turn order. Capabilities the census
still counts but the ban list forbids are **moot** — no engine work, and the census
needs regenerating to confirm they were reworded out.

| Route | Capabilities |
|---|---|
| **Moot — banned at the content layer** | did-not-move / did-not-attack (2 — banned: *"nothing reads what you chose not to do"*, despite `moveUsed`/`primaryUsed` existing in the engine) · forced move other than Knockback (1 — banned outright) |
| **Already expressible** | read the party-wide sum (28) · scale off a stat with a multiplier (8 — `ValueSpec.mult/div`, fixed truncating rounding keeps Law 7) · thorns (9, via statuses-carry-triggers) · measure a stat from another unit (1 — a `ValueSpec` read) |
| **One shared mechanism serves many** | **modify an attack you have not made (24)** — the ban list forbids next-attack counters, and the corpus rewording (*"until the end of your next Turn, your attacks gain…"*) shows what it became: **duration-scoped attack modifiers**, which is the trigger-grant + stat-grant machinery with expiry. The single most connected finding in the review: it needs `trigger.grant` (ruled 2026-08-15), durations (pass 4), and nothing else new. · move another unit (8) + knockback (3) → the movement-effect family · immunity to a status (12) → the `applyStatus` gate · consume a status (11) |
| **Subsystem: Vision** (~40 uses — the largest) | stealth enter (6) · break/reveal (11) · see through darkness/fog (6) · Vision-radius targeting · traps are stealth objects. One subsystem, most-referenced absent thing in the corpus. |
| **Subsystem: ground** (~30) | place terrain (3) · status on a hex (4) · set ground layer (12) · place a trap (12). Same hex-target extension as pass 3. |
| **Subsystem: auras** (~41) | grant mid-battle (2) + the rest of the aura vocabulary. Fixed radii, lends-not-gives, stacking — §5 rules are complete; nothing exists. |
| **Subsystem: turn economy** | free activation (2) · act out of turn (4) — touches the activation ladder, the most order-sensitive code in the engine. Recommend last. |
| **Withdrawn — census artifact** | ~~copy or steal an effect (19)~~ — `/steal/` in `oneoffs.mjs:51` substring-matches "stealth" (+ the names Soul Stealer, Life Steal). The capability does not exist. Proposed one-line fix: `\bsteal\b`; regenerate the census. |
| **Ruled 2026-08-20** | **Combat resources**: Faith, mana crystals and supply are usable as costs and gains inside combat — "charge a campaign resource" is battle-tier vocabulary, and the "second resource bar" (8) is most likely these commander resources in power costs (confirm at census regen). · **Summoning stays** — only the scheduling is open; near-term consequence is just that roster code must not assume a fixed-size unit array. · **onDodge**: fires only when the miss roll lands in the dodge-sized band at the deep end of the miss range — one roll, no second cup; engine mapping `miss AND roll > 100 − dodge`. |
| **Campaign seam — defer** | grant a badge (1) · corruption (2) |
| **Cut — ruled 2026-08-20** | prevent damage entirely (1 — Protection-as-a-pool is the only damage-prevention mechanic) · pass through occupied hexes (7 — several rows likely reword as flight-type moves, which jump rather than pass through). Charge-a-campaign-resource moved up: combat-usable per the resources ruling. |

### Reconciliation items — the fresh layer disagrees with itself in three places

1. Census counts *did-not-move/did-not-attack* (2) and *forced move, not knockback*
   (1); the ban list forbids both. Same build date. Regenerate the census or rewrite
   the two rows.
2. **RESOLVED 2026-08-20: ZoC is a board rule**; the ban only keeps it out of
   content. Full AoO flow ruled and recorded in DECISIONS.md — provoke on
   conventional movement while in ZoC, defender chooses the attack, −20 at the
   SITUATIONAL station, and on damage `floor(damage/2)` comes off the mover's
   remaining move points. *Move WITHOUT provoking* (11) is the exemption flag.
3. Modifiers may name `deathbedFighting` (1 use) — a **derived** stat by ruling
   (`20 + 5×Toughness + badges`). Either it stops being derived, or the enchant
   rewords to +Toughness, or badges-adding-DBF is exactly the `+ badges` term.
   Probably the third; worth one sentence of confirmation.

---

## What the update actually is — six workstreams

Ordered by leverage per unit of risk, none started until you approve:

1. **The effect layer grows up** — effect kinds (stat.grant, heal, reduce, stamina,
   stabilise), conditions, effect lists, four-point durations, `trigger.grant`, the
   `startOfBattle` hook, statuses-carry-triggers, and the ten statuses with the
   Resist tick rule. Unlocks ~700 corpus uses; mostly built on machinery that
   already exists.
2. **Targeting extensions** — maxTargets, lifeState filter, hex targets,
   directional templates, path shapes.
3. **The loadout layer** — weapons carrying attacks, slots, onEquip, VS_TARGET
   station, damage-type-from-weapon. Prerequisite for Crucible output.
4. **Vision** — the stat plus darkness/fog/stealth/traps-as-hidden-objects.
5. **Ground** — terrain status layer + traps, sharing pass 3's hex-target work.
6. **Auras.**

Plus three one-line engine fixes already implied by rulings: Luck into
`critChanceOf` (the slot is reserved), the Crit stat term, and the Resist tick
mitigation with the 5-vs-2 verify table.

**Held out deliberately:** turn economy (act out of turn / free activation) until
the six above land; summoning until Angela schedules it (it stays in the game —
roster code just must not assume a fixed-size unit array); badge-grant and
corruption writes at the campaign seam. The former "needs design" list is empty:
copy/steal was a census artifact, the second resource bar resolved to the three
combat-usable commander resources, and onDodge is ruled.

**Workstream 2 gains the AoO flow** (ruled 2026-08-20): ZoC-as-adjacency, the
provoke check on conventional movement, the defender's attack-choice policy for
the AI, −20 at SITUATIONAL, and the half-damage-floor subtraction from
`movePointsLeft` mid-move — the one place a full attack pipeline runs inside a
move.
