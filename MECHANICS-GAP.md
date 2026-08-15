# Mechanics Gap

*Snapshot, 2026-08-15. What the Combat Framework is missing.*

> **This is a snapshot, not a ninth live document.** `DOCS.md` says eight, and it is
> right: a gap list restates facts that belong somewhere else, and it starts rotting
> the day something ships. So the durable answers were moved out before this was
> written —
>
> - **what is built** now lives as a `Built?` column on every ladder and station
>   table in `COMBAT-SEQUENCE.md`, which is the document that already owns the order
>   of operations;
> - **every gap and every disagreement below** is a row in `.state/backlog.json`,
>   which is the thing the gate reads.
>
> This file is the readable version of those two, on one date. Archive it once
> enough of it is false.

Not content. **Mechanisms** — the stages, the slots, the hooks, the stations, the
cups. Every row below was checked against `src/` by reading the code, not by
remembering what we built, and every row cites the document that specifies it.

Three states, and the middle one is the dangerous one:

| | means |
|---|---|
| **built** | the code runs and a test asserts it |
| **slot** | the name exists in the engine — a hook, a station number, a stream, a field — and **nothing ever reaches it**. Wired, documented, silently dead |
| **absent** | no slot. The engine has never heard of it |

**`slot` is worse than `absent`.** An absent mechanic announces itself the moment
you look for it. A slot looks finished from every angle except the one that
matters, which is the exact shape of the two worst bugs this project has had —
the trigger that never fires and the baseline that could not move.

---

## The scoreboard

| | built | slot | absent |
|---|---|---|---|
| Hero stat sheet (§7) | 13 | 0 | **6** (+1 derived) |
| Trigger hooks (§5) | 8 | **1** | **4** |
| Accuracy stations | 4 | **3** | 0 (+1 retired) |
| Damage stations | 7 | **2** | 1 (+1 retired) |
| Dice cups | 5 | **9** | 0 |
| Statuses (§5) | 1 | 0 | **6** |
| Status *behaviour hooks* | 1 | **5** | 0 |
| Battle-setup rungs | 2 | 0 | **5** |
| Start-of-Turn rungs | 0 | 0 | **2** |
| Movement rungs | 2 | **4** | 0 |
| End-of-Activation rungs | 0 | **1** | **1** |
| End-of-Phase rungs | 4 (+1 half) | 0 | **2** |
| Per-hit steps | 10 | **1** | 0 |
| Victory outcomes | 3 | 0 | **2** |

Systems examined in § 6 below: **13**. Of those, one is correctly deferred (The
Hand), one is genuinely partial (the consequence stack), and one needs no engine
work at all (hordes). The other ten are absent.

---

## 1. The ladders

### 1.1 Battle setup — 2 of 7

| # | Rung | State | Source |
|---|---|---|---|
| 1 | Roll enemy count | **absent as a roll** — `opts.enemyCount` is a sweep axis you set, and the `enemy-count` cup has never been drawn | CS *Battle setup* |
| 2 | Roll wave composition | **absent** — all enemies are `zombie` | CS *Battle setup* |
| 3 | Roll placement | **built** — `sample(…'enemy-placement')` | |
| 4 | Place heroes | **built** — `sample(…'hero-deployment')`, obstacle-checked | |
| 5 | Reveal the battle condition | **absent** — no condition object exists | GD §4 *Battle conditions* |
| 6 | Fire `onEnter` → settle | **absent** — `onEnter` is not one of the nine hooks | GD §5 line 442 |
| 7 | Calculate vision and stealth | **absent** — no Vision stat | GD §4 *Vision…* |

**Deployment presets** are named in CS as the thing that keeps deployment from
swamping every measurement — *"clustered, spread, ranged-back, bad-start"* — and
there are none. Today deployment is pure cup, which is the case CS warns against.

### 1.2 Start of Turn — 0 of 2

| # | Rung | State |
|---|---|---|
| 1 | The wave schedule fires → `onEnter` → settle | **absent** |
| 2 | Victory check | **absent** — and now plainly so. Bleed-out used to run here and its settle checked victory as a side effect; with that rung moved to End of Hero Phase (Angela, 2026-08-15), Start of Turn does nothing at all |

Ranked as the least urgent gap on this page: End of Phase and settle both check
victory, so nothing can run long. It is listed because the ladder claims a rung
that is not there.

> **Open, and it is the phase/turn collision biting.** GD §9 gives the bleed-out
> counter as **"3-4 phases."** `advanceBleedOuts` runs once per **Turn**, and
> `BLEED_OUT_TURNS = 3` — so a downed hero currently has **six phases**, double
> what the design says. One of the two numbers is wrong and I am not guessing which.

### 1.3 Activation — movement, 2 of 6

Already carries its `Built?` column in CS. Restated for completeness:
1 points **built** · 2 attacks of opportunity **slot** · 3 enter and spend **built** ·
4 traps **slot** · 5 gain terrain status **slot** · 6 vision and stealth **slot**.

All four slots are literally comment lines in `movement.ts:100` and `:104`.

### 1.4 End of Activation — 0 of 2

| Rung | State | Source |
|---|---|---|
| Standing on a terrain status → gain a stack | **absent** — layer 2 does not exist | CS *End of Activation*; GD §4 line 352 |
| `onActivationEnd` triggers fire | **slot** — the hook is in `HOOKS`, validated, glossed, banned-alias documented, and **`fireTriggers(ctx, 'onActivationEnd', …)` appears nowhere in `src/`** | CS *Triggers* |

`onActivationEnd` is the single most finished-looking dead thing in the engine.
We renamed it off `turnEnd` last night, wrote it into the glossary, and never
called it.

### 1.5 End of Phase — 4½ of 7

| # | Rung | State |
|---|---|---|
| 1 | Auras resolve end-of-phase effects | **absent** — no aura type |
| 2 | Corpse effects | **absent** — nothing leaves a corpse |
| 3 | Statuses tick → settle | **built** — `tickStatuses` |
| 4 | Durations tick down | **half** — `StatMod.expiresAtTurn` is filtered lazily on read. Nothing counts it down, nothing emits an expiry event, so a modifier's last turn is invisible in the log |
| 4b | Bleed-out advances — **hero ladder only** | **built** 2026-08-15, moved here from Start of Turn (Angela) |
| 5 | Stamina regen | **built** |
| 6 | Victory check | **built** |

CS also says this ladder should be *"an ordered list of named rungs supplied by
config, not six hardcoded calls — so reordering it is a sweep axis rather than a
diff."* It is **four** straight-line calls in `battle.ts:41-59`, and nothing in
`Config` supplies a rung list. **The reorder sweep axis does not exist.**

`battle.ts:40`'s own docstring already says *"An ordered list of named rungs, so
reordering is a sweep axis."* A comment describing a mechanism the function below
it does not have — the same failure this document is about, sitting in the code
instead of in a document.

### 1.6 The per-hit sequence — 10 of 11

Everything Angela ruled on 2026-08-15 is built and asserted. The one gap:

| Step | State |
|---|---|
| 4 — crit roll, then `critBranch` *(damage or injury)*, then `critInjury` *(which one)* | **the roll is built; the branch and the table are absent.** `critChanceOf` returns `3 + surplus`; on a crit the engine always takes the damage branch (+50%). The coin flip and the six-injury chart in GD §4 line 215 have no code and no cup draw |

Also at this level, and **absent**: an Attack is exactly one Hit.
`AttackDef` has no `hits` field and `performAttack` resolves once — while
`GLOSSARY.md` and CS both define an Attack as *"one or more Hits."* Two switches
already stand ready for it (`multiAttackRetargets` answered, `recomputeStatsBetweenHits`
open) and there is nothing for them to switch.

---

## 2. The hero stat sheet — 13 of 19

GD §7 line 545 is the authority. Present on `Unit`: Strength · Precision ·
Accuracy · Reach · Dodge · Armor · Resist · Health · Magic · Spirit · Movement ·
Stamina max · Stamina regen.

| Missing stat | What it anchors | Source |
|---|---|---|
| **Crit** | crit chance from gear/badges/levels, on top of the base 3 | GD §4 line 188 |
| **Grit** | resistance to being crit — *flat subtraction* from the attacker's crit chance. Without it a boss cannot feel "armored against luck" | GD §4 line 191, 228 |
| **Vision** | the whole darkness/fog/stealth system; also *"Vision, not Accuracy, is what caps effective range"* | GD §4 line 236 |
| **Toughness** | wound capacity — minors beyond Toughness convert to a medium | GD §9 line 632 |
| **Resolute** | named on the sheet and by two injuries; no other mechanic reads it yet | GD §7 line 545 |
| **Item Slots** | accessories; docked by Crippled Leg / Missing Leg | GD §7 line 557 |
| *Deathbed Fighting* | **derived**, `20 + 5×Toughness + badges`. Blocked on Toughness | GD §7 line 545 |

The stat pipeline itself is ready for all seven — adding one is a `StatName`, a
`BASE` reader and a field. That is the cheap half. The systems they anchor are not.

---

## 3. Trigger hooks — 8 of 13

Fired and tested: `onAttack` `onMiss` `onHit` `onCrit` `onDamage` `onTakingDamage`
`onKill` `onDeath`.

| Hook | State | Note |
|---|---|---|
| `onActivationEnd` | **slot** | see 1.4 |
| `startOfBattle` | **absent** | GD §5 line 442 |
| `onEnter` | **absent** | GD §5 line 442. CS wants it at battle setup *and* at every wave arrival |
| `onWounded` | **absent** | GD §5 line 442. Blocked on wound levels existing at all |
| `onEquip` | **absent** | GD §5 line 442. Blocked on gear |

`onCrit` is ours — Angela added it 2026-08-15 and it is not in §5's list, so §5's
hook list needs the addition at the same time it needs `turnEnd` → `onActivationEnd`.

---

## 4. Stations

### 4.1 Accuracy — 4 of 8

Written today: `BASE` (+ a `BASE_MOD` row per stat modifier) · `RANGE` ·
`ADJACENT` · `TARGET_DODGE`.

| # | Station | State |
|---|---|---|
| 400 | TERRAIN | **retired on purpose** — terrain now arrives as `BASE_MOD` through the stat pipeline, with the same provenance. The constant is dead and should be deleted or commented as retired, because right now it reads as unbuilt |
| 500 | CONDITION — fog, snow, darkness | **slot** — nothing writes it. This is the station the whole battle-condition system lands on |
| 700 | SITUATIONAL | **slot** — nothing writes it. This is where **every** attack-level accuracy modifier goes: the AoO's −20, flight's −30, a Dagger Toss's −10, a Smite's +20. `AttackDef` has no `accuracy` field to feed it |
| 900 | FINAL | **slot** — the constant exists; the clamp happens in `preview()` and emits no ledger line of its own. *(The rest of the accuracy ledger IS now logged, as of 2026-08-15 — `attack.declared` carries `accLedger`. Until then it was computed and discarded.)* |

All four of those constants — `ACC.TERRAIN`, `ACC.CONDITION`, `ACC.SITUATIONAL`,
`ACC.FINAL` — appear nowhere in `src/` or `test/` outside their own declaration.

### 4.2 Damage — 7 of 10

Written today: `DECLARE` · `SOURCE_STAT` · `SOURCE_STATUS` · `CRIT` ·
`PROTECTION` · `MITIGATION` · `FLOOR`.

| # | Station | State |
|---|---|---|
| 300 | TERRAIN | **retired on purpose**, same as ACC.TERRAIN |
| 350 | POSITIONAL — flank | **slot**. GD §4 line 411 promises *"positional bonuses (flank = +damage, shown in preview)"*. Nothing computes facing or flanking |
| 850 | APPLY | **slot** — `applyDamage` is a mutator, not a ledger step, so `base + Σdeltas === applied + overkill` is asserted against the value rather than shown |
| — | **VS_TARGET** | **absent** — no station number is even reserved. Slayer bonuses (§8 line 589), *+2 vs undead*, and *"modifiers to damage based on target type / based on status on target"* all need it |

`DMG.TERRAIN`, `DMG.POSITIONAL` and `DMG.APPLY` likewise appear nowhere outside
their own declaration.

### 4.3 The second damage function

`ability.ts:resolvePowerDamage` is a **separate damage pipeline**. It runs
`DECLARE` → `SOURCE_STAT` → `MITIGATION` → `FLOOR` and skips `SOURCE_STATUS`,
`CRIT` and `PROTECTION`. *(Not POSITIONAL — the attack path does not run that one
either; it is a slot on both sides.)*

Consequences that are live right now: **Weakness would not reduce a power's
damage, and Protection would not absorb one.** Constitution Law 1 says one damage
function; there are two. This is the *"preview and resolution disagree"*
anti-pattern from GD §5 line 518 with the seam moved one level up.

Related and absent: GD §4 line 206 — *"Class powers that emulate an attack roll to
hit and therefore crit."* `AbilityDef` has no `rollsToHit`, so that whole class of
power is inexpressible.

---

## 5. Dice cups — 5 of 14

Drawn: `to-hit` · `crit` · `trigger` · `enemy-placement` · `hero-deployment`.

Declared in `STREAMS` and **never drawn once**:

| Stream | Waiting on |
|---|---|
| `crit-effect` | the crit branch + injury table |
| `deathbed` | the Deathbed Fighting roll (see 6.6) |
| `schedule` | the wave/event schedule |
| `wave` | wave composition |
| `enemy-count` | rolled enemy count |
| `terrain-event` | terrain events — *"more leverage on results than any other single roll"* |
| `card` | The Hand |
| `ai-tiebreak` | AI modes that can tie |
| `activation-order` | the `random` activation-order switch; today it is hardcoded to `fixed` |

The stream names being right is worth something — the key-collision assert will
catch a mis-keyed draw the day each one is used. But nine of fourteen cups being
empty is the honest measure of how much of the battle model is not yet running.

---

## 6. Systems with no slot at all

Ordered roughly by how much of the design leans on them.

### 6.1 Zones of control, attacks of opportunity, Disengage — **absent**

GD §4 lines 248-289, and it is the longest single mechanic in the design doc.
Needed: a threatened-hex derivation, the AoO attack itself (melee at −20 and −1
damage), **the movement-loss rule** (*"an attack of opportunity that connects also
costs the target half its damage in Movement"* — the rule GD calls the one that
makes the system bite), the Juggernaut exemption axis, and Disengage as a movement
action with its directly-opposite-hex geometry.

`movement.ts` walks the path one hex at a time specifically so this has somewhere
to go. The place is ready; nothing is in it.

### 6.2 Movement actions as a family — **absent**

GD §4 line 391: *Move (1 stamina) · Sprint (2, Movement +3) · Disengage (1, one hex).*
The engine has one hardcoded move: `MOVE_STAMINA_COST = 1`, budget = the
`movement` stat. Angela's own Rogue sheet writes the default as a content row
("move +0, cost 1"), which is the right shape and does not exist.

### 6.3 Vision, darkness, fog, stealth — **absent**

GD §4 lines 232-246. No Vision stat, no light level on a battle, no stealth flag
(the `flag` status shape names "stealthed" as its example and no status uses it),
no reveal effects. GD also states *"there is no line of sight"* — so the expensive
half is explicitly **not** wanted, which makes this cheaper than it looks.

Traps share this machinery (GD §5 line 495), so they are blocked on the same work.

### 6.4 Auras — **absent**

GD §5 lines 471-482. A radius around a unit granting stat modifiers while you are
inside, plus an optional end-of-phase effect that only fires if you are still
inside. Overlapping auras stack; radii are never modified by a stat.

Half of it is already proven: **terrain is an aura fixed to the ground**, and
`terrainMods()` is exactly the derived-not-stored pattern an aura needs. What is
missing is the unit-anchored version and End-of-Phase rung 1.

### 6.5 Terrain layers 2 and 3 — **absent**

Layer 1 (cost + occupancy modifiers) is **built**, trait-composed, and matches
GROUND-REQUIREMENTS §1.1.

- **Layer 2, status on the ground** — Burning · Frost · Curse · Damage. No spread,
  no decay, overwritten rather than stacked, and applied on **two** beats: on
  entering, and again at End of Activation. Neither beat exists.
- **Water strips status** — GD §4 line 313 gives water a job no other terrain has:
  −1 Burn on entry, −1 Burn and −1 Poison at End of Activation. Absent, and it is
  the mirror-image test case for layer 2.
- **Layer 3, objects** — mushrooms, consumed by heroes moving onto the hex.
- **Flight and Airwalk** — every hex costs 1, terrain status never triggers, AoO
  against you at −30 (Flight); entry-only status (Airwalk).

### 6.6 The consequence stack — **1 of 6**

GD §9. Built: a hero at 0 HP goes `downed` with a bleed-out counter.

| Step | State |
|---|---|
| Roll Deathbed Fighting at 0 | **absent** — no roll, no stat, and the `deathbed` cup and `deathbedOrdinal` field are both slots |
| **STAND** — fight on at the next wound level, take a mark | **absent** |
| **FALL** — downed, bleed-out visible | **built** |
| Stabilize-in-place (adjacent unit action) | **absent** — and GD calls it *"the standard save"* |
| Wound ladder Fresh → Wounded → Badly Wounded | **absent**. `lifeState` is `standing · downed · dead`; CS specifies `Standing · Downed · Stabilized · Dead` — **`stabilized` is not in the type** |
| Captured, injuries, marks | **absent** — all cross the battle/campaign seam |

Also **absent, and it inverts a live rule**: GD §9 line 610 — *"Enemies roll at +20
against downed heroes, but a hit only accelerates the bleed-out counter. It never
kills."* `canAttack` requires the target to be `standing`, so **the downed cannot
currently be attacked at all.** The safe direction, but not the rule.

### 6.7 The schedule — **absent**

GD §4 lines 97-107. Phase 1 is always Battle Start; usually one other authored
event; every other phase draws from an authored list. Drawable events include
adding enemies behind the heroes, fog, a hazard line, curse all heroes, nothing.

Everything about this is absent: no schedule object, no reinforcement arrival, no
event library, and the terrain-event shape library CS specifies (Band · Scatter ·
Half · Path · Disk/Ring) has no code. A battle today is one static roster fighting
to the death.

### 6.8 Victory conditions — 3 of 5, and the interesting two are missing

`Outcome` is `heroClear | wipe | capped`. CS specifies five:
**`objectiveMet` and `retreat` are absent from the type.**

GD §4 line 109: *conquest = board clear* (built), *defense = survive to phase N*
(absent). That second one is what makes Defend and Conquer feel different, and
there is no scenario-objective object to hold it.

### 6.9 Badges — **absent as a type**

GD §8. Two of the pieces exist independently: `StatMod` carries stat modifiers,
and `Trigger` carries triggers on any hook. What is missing is the **badge** that
bundles them, and `applyBadge` / `removeBadge`.

This is the one where the anti-pattern is already known: GD §5 line 516 —
*"badge removal never removes the badge's triggers."* `triggersFrom()` rebuilds a
unit's trigger list from its sources rather than removing in place, which is the
correct construction — it is just rebuilding from a list that no badge ever
changes. Badges also carry things nothing else can express yet: granting a class
power, granting tactic slots, deploy-cost modifiers, slayer bonuses, wound capacity.

### 6.10 The Hand — **deferred, correctly**

GD §6. Energy, a deck, draws, card actions. CS already rules the shape: *"a command
type at the commander level, not an option on the primary action."* The `card` cup
is reserved. Nothing else exists, and nothing else should yet.

### 6.11 Ability effects beyond damage — **absent**

Every ability in the engine deals damage; `AbilityDef` has `stat`/`bonus`/
`damageType` and nothing else. Missing: heal, apply status, remove status, **reduce**
a status by N (a different operation from removing it), and grant/revoke a trigger.

`canUsePower` contains `if (u.side === tg.side) return false` — abilities can only
target enemies, so **no ally-targeted ability is expressible.** `target.ts` already
holds the full vocabulary (self · unit · area, ally · enemy · any, radius, origin,
`requireTags`) and abilities do not use it. One vocabulary, two callers, and only
one of the callers has been wired.

### 6.12 Structures, civilians, hordes-as-content — **absent**

Player-built structures on owned hexes (GD §4 line 367). Civilians with 1 action
and no stamina (line 377). Hordes need **no engine work** — CS already rules that
every unit is an ordinary unit — but "fodder shares an AI policy" wants an AI mode
registry richer than the three modes that exist.

### 6.13 The battle/campaign seam — **absent**

XP per kill (3/6/9 by rank), the wound report, marks minting at battle's end,
`makeBattleResult` / `applyBattleResult`. GAME-ARCHITECTURE §4 specifies the seam;
`sim/score.ts` grades a battle for the harness, which is a different thing.

---

## 7. Statuses — the mechanism is ahead of the content

One status exists: `status.poison`.

GD §5 line 456 names six — Poison, Burn, Bleed, Regeneration, Weakness, Stunned —
plus Protection from the damage stations. Five of the six and Protection are
unpublished, so this is a **content** gap, not a mechanism gap, and it is session
1's call, not the engine's.

Of the six behaviour hooks a `StatusDef` can declare, **one runs** — `onPhaseEnd`,
declared by poison — and **five are slots**. That part *is* an engine finding.
Each of these is read by live code and declared by no status, so the path has
never executed with a real value:

| Behaviour | Read at | Waiting on |
|---|---|---|
| `reducesIncomingDamage` | `DMG.PROTECTION` (550), via `incomingAbsorb` | `status.protection` |
| `reducesOutgoingDamage` | `DMG.SOURCE_STATUS` (250), via `outgoingPenalty` | `status.weakness` |
| `blocksAction` | the turn loop, `isBlocked` | `status.stun` |
| `halvesHealing` | `heal()` — **and `heal()` itself is called from nowhere in `src/`**, only from a test. A slot behind a slot | `status.burn`, and an ability that heals |
| `decayPerPhase` | `tickStatuses` | nothing declares it; every status decays by the engine default of 1 |

Two smaller things:

- `status.poison` is declared **`shape: 'pool'`**, and the shape table in
  `core/status.ts` says poison is a **`counter`** (a pool is *"spent when something
  consumes it"* — protection, shields). `shape` is documentation and never
  branches, which is precisely why a wrong one sits there indefinitely.
- Nothing in the engine ever heals. `heal()` exists, is correct, halves for burn,
  emits its event — and no attack, ability, status or trigger calls it.

---

## 8. Where the engine and a document currently disagree

Separate list, because these are not gaps. These are two answers to one question,
and CS's own note says it: *"Two documents, opposite answers, and whichever a
session read first won."*

1. ~~**The adjacent-ranged penalty is on the wrong case.**~~ **RULED AND LANDED
   2026-08-15** (`178f608`). Angela: *"You cannot use a ranged attack on something
   adjacent. You can use a ranged attack on something not adjacent at −20."*
   Legality moved into `canAttack`; the penalty now reads the shooter's
   surroundings via `inMelee()`. Both halves had been wrong at once, which is why
   the old assertion passed — the penalty was always being paid by somebody.

   **It surfaced a second thing.** Gate 1 could not probe for `ADJACENT`, because
   **the accuracy ledger was computed and thrown away.** This document and
   `COMBAT-SEQUENCE.md` both said the accuracy roll carries a ledger; no event
   carried it, so no log could explain a hit chance. `attack.declared` now emits
   `accLedger`. Worth naming as its own class of gap: *a station nobody logs is
   indistinguishable from a station nobody runs*, and gate 1 is the thing that
   tells them apart.

2. **Two damage functions.** § 4.3 above. Law 1.

3. **`attributes` and `tags` both mean "what this unit is."** Content fills
   `attributes` (`zombie: attributes: ['undead']`); every reader — targeting,
   `requireTags`, the planned VS_TARGET station — uses `tags`, and no unit sets it.
   **So "target undead" finds no zombies today.** `attributes` is read nowhere in
   `src/`. One of the two fields should go; Law 11.

4. ~~**Bleed-out is 6 phases, the design says 3-4.**~~ **RULED AND LANDED
   2026-08-15** (`97ceb68`). Angela: *"Bleed Out counter should be five phases, but
   it only moves forward at the end of the hero phase."* The counter is 5 and the
   rung moved out of Start of Turn into End of Hero Phase — so the enemy phase, the
   one where nobody can reach her, no longer spends the clock.

5. **The downed cannot be attacked.** § 6.6 above.

6. **`Outcome` has 3 values, CS specifies 5.** § 6.8 above.

7. **The End-of-Phase ladder is hardcoded**, and CS says it must be config so
   reordering is a sweep axis. § 1.5 above.

8. **`GAME-DESIGN.md` §5 line 442 still says `turnEnd`**, and its hook list is
   missing `onCrit`. Both were ruled on 2026-08-15.

9. **`GAME-ARCHITECTURE.md` still says "The Projections"** in ten places
   (lines 68, 69, 70, 74, 88, 341, 484, 631, 632, 633). The rename to The Combat
   Framework missed the file.

10. **`ACC.TERRAIN` and `DMG.TERRAIN` are retired, not unbuilt** — they read as
    gaps in the station tables and are not. Worth a one-line comment so the next
    session doesn't "fix" them.

---

## 9. What this suggests, in order

Cheapest and least blocked first. Nothing here is a design ruling — every item is
a mechanism that a document already specifies.

**All of these are now backlog rows**, so the gate tracks them and this document
does not have to. `node tools/next.mjs` is the live version of this table.

| # | Backlog id | Why here |
|---|---|---|
| 1 | `fix.activation-end-fires` | A hook that exists and never fires is the worst state in the engine, and the fix is one call site plus a test |
| 2 | `fix.unit-tags` | Silent, live, and it makes `requireTags` real. Law 11 |
| 3 | `fix.one-damage-function` | Law 1. Protection and Weakness start working on powers the same hour |
| 4 | `station.accuracy-field` | Opens the station every later modifier needs — AoO, flight, Dagger Toss, Smite |
| 5 | `ability.effects` *(already queued)* | Turns abilities from damage-only into the effect vocabulary triggers already have. Unblocks every support class, and the first thing in the engine that heals |
| 6 | `movement.zone-of-control` + `movement.attack-of-opportunity` *(already queued)* | Biggest single design system with a prepared slot |
| 7 | `move.actions` *(already queued)* | Disengage is meaningless without 6; do them adjacent |
| 8 | `attack.multihit` *(already queued)* | Two switches are waiting on it |
| 9 | terrain layer 2 + `terrain.water-cleanses` *(queued)* | Fills movement rung 5 and End of Activation, and Water is its own mirror-image test case |
| 10 | `crit.branch-and-injuries` | Turns the `critEnabled` switch from a half-system into a real sweep axis |
| 11 | the schedule *(not yet a row)* | Largest change to what a battle *is*; everything above is measurable without it |

Items 1-4 are corrections rather than features and could land in one session.
6 and 11 are the two that change every balance number we have.

**Two need you, not a sweep** — both are marked `needsAngela` in the backlog:
`fix.adjacent-ranged` (which of the two rules moves) and `fix.bleedout-duration`
(is the counter in turns or in phases).

---

*Every claim above was read out of `src/` on 2026-08-15. Where a document and the
code disagree it is listed in § 8 rather than resolved — resolving one of those is
a design call, not an engine call.*
