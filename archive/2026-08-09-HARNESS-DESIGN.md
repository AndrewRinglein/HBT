*Snapshot, 2026-08-09. Superseded where it disagrees with the live set.
Kept for the reasoning, not the recommendations.*

---

# Combat Simulation Harness — Design Research
**Heroes of Blight and Tragic · 2026-08-09**

Synthesized from 10 parallel research agents (rules-core architecture, effect systems, hex/movement, tactical AI, simulation statistics, balance metrics, mechanic verification, content pipeline, tech stack, observability), one architect synthesis, and three adversarial critiques (rules-correctness, experimental methodology, solo-dev pragmatics).

---

## 0. The verdict in one paragraph

Roughly five decisions in this design are load-bearing and effectively irreversible; the rest is scaffolding for a problem you will have at effect #60, not effect #0. The architect proposed about four months of build before the first outcome distribution prints. All three critics independently said the same thing: **the spine is right, the size is wrong.** The recommendation below keeps the five irreversible decisions, ships a walking skeleton in week one that answers "do 4 heroes beat 5 zombies," and defers everything whose consumer doesn't exist yet.

The second finding is less comfortable. Your two jobs are not equally solved. **Job 1 — proving Claude coded a mechanic correctly — is genuinely nailed** by the damage ledger, per-phase state snapshots, and metamorphic testing; that part of the research is unusually strong and you should take it as designed. **Job 2 — measuring balance impact — has real threats to validity** that no amount of engineering fixes: the AI is a confound baked into every number, n=10 is a screening tier and not an answer, and every finding is conditional on the one map you tested it on. Those are addressed with method, not code, and they're spelled out in §6.

---

## 1. The five things that are irreversible — do these on day one

Everything else in this document can be added later at modest cost. These five cannot.

### 1.1 Hash-derived named RNG streams (not a sequential generator)

This is the single highest-leverage decision in the project, and every researcher converged on it independently.

```ts
draw(ctx, stream, ...structuralKeys) = splitmix32(fnv1a(rootSeed, STREAM_ID[stream], ...keys))
```

Keys are **structural**, never sequential counters. `draw('deathbed', uid, deathbedOrdinal, woundLevel)`, not `rng.next()`.

Why it matters: with a single sequential generator, an agent measured that adding one poison tick turned baseline draws `[60,44,8]` into `[60,85,6]` — every subsequent draw shifted. With named streams keyed structurally, the same insertion left every other stream bit-identical. Without this, **adding any mechanic silently invalidates every prior sweep baseline**, and Common Random Numbers (§6.2) — the entire basis of the small-n strategy — is worthless.

`rootSeed = hash(scenarioId, variantId, replicateIndex)`, so arm A and arm B at replicate *i* are guaranteed to face the same dice.

> **Three key-design bugs the critics caught.** Fix all three before writing the RNG module:
> 1. **Keys must be unique per roll.** `draw('deathbed', unitId, turn, woundLevel)` returns a bit-identical result if a unit hits 0 HP twice in the same turn at the same wound level — which a healer arm exists to create. A hero who stands, gets healed, and drops again gets the identical roll with probability 1. Add a per-unit monotonic `deathbedOrdinal` to the key. Then add a CI assertion that no two draws in a battle share a key tuple — ten lines that catch this class across every future stream.
> 2. **`turn` is an outcome, not a structural key.** Every mechanic worth testing changes *when* things happen. If protection delays a hero's first drop from turn 6 to turn 8, keying on turn means she draws a completely different Deathbed roll — so the pairing breaks hardest for exactly the treatments that work. Key on ordinal, not turn.
> 3. **UnitId as a dense array index is not stable across arms.** If a treatment changes what dies, it changes what spawns, which renumbers everything downstream. Split identity from storage: `UnitId` stays the array index, but RNG keys use a persistent `uid` derived from the pre-rolled scenario manifest (scenario slot for deployed units, `(waveTurn, slotIndex, poolOrdinal)` for spawns).

### 1.2 Plain-data state, cloned once per command

State is a plain-data tree — integer ids, typed arrays, no class instances, no closures. `apply()` deep-clones with a hand-written cloner, mutates the copy, returns `{state, events}`.

Agent-measured on Node 22 with a realistic 20-unit board: hand-written clone **7.1µs**, `structuredClone` 366µs, JSON round-trip 187µs, immer `produce()` 9.67µs for one field and 432µs for 200. Cloning once per command and mutating freely is ~400× cheaper than immer-per-mutation and still gives you a pure `apply`, free snapshot undo, free lookahead forks, and free counterfactual re-runs.

The one-way door here isn't the cloning strategy — it's **"State must be plain data."** That property is what makes save/load, worker transfer, DB storage, and replay all reduce to one test (serialize → deserialize → checksum unchanged). It's free today and a multi-week rewrite after 100 effects.

### 1.3 Every mutation goes through a facade that emits an event

`dealDamage`, `setHp`, `moveUnit`, `addModifier`, `spendStamina`, `killUnit`, `spawnUnit`, `placeHazard`. Effect code never touches `state.units[i].hp` directly.

This is what makes the event log **complete by construction**, which is the precondition for the visual replay you want soon. Keep the cheap enforcement always on: `fold(events since tick N) === tick N+1` at every phase boundary catches unlogged mutations for near-zero cost.

> Skip the write-barrier Proxy in sweeps. A Proxy intercepting every property write is a 10–50× slowdown on the hottest path; it will get disabled within a week and never re-enabled. Run it in `verify <effect>` and the golden scenarios only, and record `barrier_enabled` in run provenance so a sweep can't claim verification it didn't run.

### 1.4 The damage stage table and the attribution ledger

A closed, spaced enum — `DECLARE 100 · SOURCE_STAT 150 · SOURCE_FLAT 200 · POSITIONAL 300 · TYPE_CONVERSION 350 · TARGET_VULNERABILITY 450 · EVASION 500 · PROTECTION 550 · MITIGATION_FLAT 600 · FLOOR 700 · CAP 750 · SHIELD_POOL 800 · APPLY 850 · POST 900` — where **ordering is a property of the stage, not of the effect.**

Each `Hit` carries an append-only ledger: `{stage, effectId, effectInstanceId, grantorUnitId, before, after, delta, declined?}`. Zero-delta consultations are logged too.

This is what answers your literal question — *"how much damage was actually absorbed by protection"* — as a SQL `GROUP BY` rather than an instrumentation project, for every future effect, with zero extra code. WoW is the cautionary tale: Blizzard had to bolt on a separate `SPELL_ABSORBED` event after the fact, and their `absorbed` field is documented as "informational only, do not sum."

Engine assert on every hit: `raw + Σledger.delta === applied + overkill`.

Bans that cost you nothing given deterministic damage: **no floats, no percentages, no multiplicative aggregation** in the mitigation bands. Percentages (Deathbed Fighting) are integer basis points. Unreal's GAS is the warning here — its `((Base+Add)*Mult)/Div` with summed multipliers gives two ×1.5 mods as ×2.0 and two ×5 mods as ×9. Documented, unfixable, and exactly the class of silent wrongness that poisons balance data.

> **Add one verb.** The pipeline mutators (`reduce`/`increase`/`convertType`/`decline`) can't express dodge-as-charges. `reduce(9)` on a 9-damage hit produces a 0-damage hit that still runs APPLY, still fires `onDamaged`, still writes a `damage_events` row that shows up in attribution as a real hit. Add `hit.negate(effectId)` as a terminal verb emitting `HitNegated` with its own row type — countable, never summed into damage totals.

### 1.5 `seed_id` as a first-class column, arms joined pairwise

Store results as `(sweep_id, config_id, seed_id, arm_id, metric, value)`. Every comparison JOINs on `seed_id`.

An unpaired mean cannot be recovered into a paired one after the fact. This is a schema decision, and it's the one that makes n=10 defensible at all.

---

## 2. Stack: TypeScript monorepo

**Recommendation: TypeScript on Node 24 LTS, pnpm workspaces.** Runner-up: C# class-library core + Godot 4, viable only if you abandon browser delivery — Godot 4 C# cannot export to web at all.

Performance is explicitly *not* the argument. An agent-built structurally-realistic 8-unit sim ran 1,000 battles in 18.3ms without logging, 25.7ms with a complete per-event log. A hex flood-fill is ~1.1µs. Throughput was never going to be your constraint.

The argument is that **four of your six deliverables become the same artifact set** — headless sim, HTML dashboard, visual replay, and the eventual web client — sharing one type system and one `BattleEvent` definition, with zero serialization bridges. Change the event schema and `tsc` breaks the dashboard and the replay viewer immediately. Every other option introduces at least one language boundary, and each boundary is a place where AI-written code silently disagrees with itself.

Secondary but real: TypeScript gives Claude three independent machine-readable error channels to self-correct against (`tsc --noEmit`, Vitest watch, ESLint). Godot+GDScript has the worst agent ergonomics of any option — models reliably emit Godot 3 syntax into Godot 4 projects, GDScript's optional typing catches none of it, and an agent can't see the scene tree. Rust/Bevy buys correctness the invariant layer already provides, while pre-1.0 churn makes the agent's knowledge stale by construction.

Determinism is fully achievable in JS: integer arithmetic is exact to 2^53 and the spec mandates exact IEEE-754 for `+ - * /`. Ban floats and `Math.pow/sin/cos/sqrt` in core, which your deterministic-damage design makes free.

**Concrete:** TS 5.x strict + `noUncheckedIndexedAccess`; branded types for `UnitId`/`HexId`/`EffectId`; Vitest 3 + fast-check; Zod v4 at boundaries only; NDJSON gzipped logs; DuckDB for analytics; Observable Plot for charts; PixiJS v8 + React 19 when the renderer lands. `dependency-cruiser` boundary so `core` can't import `node:*`, `fs`, `Math.random`, `Date`, or any sibling package.

A Python stats layer is deferred, not rejected — data lands in Parquet, so adding scipy later costs zero engine changes.

---

## 3. Rules rulings you need to make — these are design decisions, not engineering ones

The research surfaced a set of questions that look like implementation details but are actually yours to decide, and each one changes the numbers the harness will produce. **Rule on these in writing before M2.**

| # | Question | Recommended ruling | Why it matters |
|---|---|---|---|
| 1 | Does the turn-end ladder run **once per round** or **once per phase**? | Once per round, at end of enemy phase. Stamina regen is the only per-side item. | If it runs at both boundaries, heroes regen 2/round against a frozen law of Regen 1 — the throttle the whole game is balanced around is 2× loose, and every "is this worth 3 stamina" conclusion is wrong. Poison ticks twice. Protection decays 2 and pulses 2. |
| 2 | Does protection **DECAY before PULSE** or after? | DECAY (50) before PULSE (60), stacking HIGHEST. | Same code, different number: DECAY-first gives steady state 2 with a clean 2→1→0 falloff on leaving the aura; PULSE-first gives steady state 1. |
| 3 | Is protection a **time-decaying flat reducer** or a **depleting pool**? | Time-decaying reducer (stage 550, commutative with armor). | A depleting pool is non-commutative and forces a documented consume order across dodge charges, protection, and card shields. Decide now — switching later is a ledger-semantics change. |
| 4 | Do **instant** grants (a card) and **pulsed** grants (the aura) have the same duration? | Yes — modifiers carry `grantedAtRound`, DECAY skips anything granted this round. | Otherwise a card's protection is worth a full turn less than the cleric's identical grant at the same TP budget, and the budget model flags the card as underpowered forever. |
| 5 | **Downed units:** do they occupy the hex for pathing, project ZoC, count toward surround-count flanking, keep firing their own `turnEnd` triggers? Does hazard damage advance the bleed counter or kill outright? | Needs a full table. | Hordes plus a downed body is the most common board state in the game, and the fodder flow field has no defined behavior around one. |
| 6 | What happens when a downed unit is **healed**? | `lifeState: {Standing, Downed, Stabilized, Dead}` as an explicit field; hp clamped at 0 while Downed; explicit `reviveUnit` mutator. | Infer downed-ness from the hp scalar and both branches break: heal-to-4 leaves her flagged downed and bleeding out at 4 HP; auto-stand-on-hp>0 means a 1-point heal cancels the whole consequence stack and makes stabilize-in-place pointless. |
| 7 | On a Deathbed **STAND**, does overkill carry into the fresh bar? | Needs a ruling. | A 20-damage hit on a 4-HP Wounded hero is either survivable or instantly re-lethal. The conservation assert is satisfied by both readings. |
| 8 | **Wound-level stat deltas and the Deathbed Fighting formula** | Need actual numbers before M1. | Together they form a death-spiral feedback loop that will dominate outcome variance more than any effect you're testing. |
| 9 | Are **attacks of opportunity** capped per round? | Add `reactionsPerRound`, default 1, as a sweep axis (0/1/unlimited). | Uncapped: four zombies in a line generate 16 AoOs in one player phase against a six-hero roster (~100 damage). Then the AI stops repositioning entirely and your movement-mode findings are about a rules gap. |
| 10 | Does **ZoC stop movement on entry**, or only provoke on leave? | Provoke on leave; do not stop on entry. | Stop-on-entry zeroes remaining MP, which directly breaks "move A, act with B, finish A" — your frozen signature rule. Keep both as per-unit flags so the alternative stays sweepable. |
| 11 | **Victory timing:** board clear at any instant, or clear *and* schedule exhausted? And is a turn-cap timeout a LOSS or INVALID? | Needs a ruling; recommend timeout = attrition loss, never INVALID. | Quarantining timeouts biases every sample toward decisive fights — grindy near-losses are exactly the battles the horde was winning (see §6.4). |

Two more that are engineering-side but need your sign-off because they change measured outcomes:

- **Flanking should be surround-count, not opposite-hex.** Only 3 of 6 neighbour pairs are opposite, so opposite-hex flanking almost never fires. Battle Brothers' `bonus × (adjacentEnemies − 1)` is what makes fodder numerically threatening, which is the entire point of the horde pillar.
- **No line of sight, ever.** 26.8% of hex lines at distance 2–7 on a 15×15 board flip result depending on the sign of a floating-point nudge. Your design doc already froze "no LoS ambiguity" — treat it as a law, gate ranged on hex distance, and make every AoE a precomputed integer offset template.

---

## 4. Architecture, condensed

The parts that survived all three critiques.

**Resolution kernel.** Adopt MTG's state-based-action fixpoint (rule 704.3): after every command and after every trigger resolution, check all board conditions (0 HP → Deathbed, bleed-out expiry, hazard, corpse creation, wound transition, modifier expiry), apply all that apply simultaneously as one batch, repeat until equilibrium. Hard cap at 64 rounds emitting `RuleLoopOverflow`. Your consequence stack, hazards, corpses, and 8 hooks are mutually recursive — ad-hoc "check deaths after each attack" produces double-deaths and triggers firing on stale boards.

> **Move must be atomic per step.** If `apply()` runs the fixpoint only after a whole Move command completes, a Ranger who takes an AoO to 0 HP mid-path keeps walking three more hexes and falls on the wrong side of the fire hazard, four hexes from the ally who was going to stabilize her. Store the intended path in the journal, consume one step per `apply()`, return `movementInterrupted`.

**Effect registries.** Split replacement effects from reactions — this is the one structural correction to your frozen 8-hook list, and it's a one-way door. `onTakingDamage` is a *replacement* (it changes how much damage lands); `onKill`/`onDeath` are *reactions*. On one flat bus, order equals registration order and "how much did protection absorb" becomes structurally unanswerable. Rename to `MODIFY_INCOMING_DAMAGE` (pipeline) and add a distinct `onDamaged` (trigger).

Two registries carry nearly all the benefit — **PIPELINE** (declares a stage, frozen context with no mutators) and **TRIGGERED** (your 8 hooks, queued, may mutate). The architect proposed four; both the rules critic and the pragmatist said collapse CONTINUOUS into modifiers and treat state-based as engine code. Take the two.

Trigger queue: built from all eligible triggers, ordered by `(hookPhase, activeSideFirst, unitId, instanceOrdinal)`, **immutable once the first entry begins resolving**, with new triggers going into a fresh queue. Each entry captures a payload snapshot and supplies `stillApplies(payload, state)`, re-checked immediately before resolution — emit `TriggerFizzled` with a reason on false. Without this, four elites dying simultaneously to a Firewall, each with "onDeath: adjacent ally gains +2," has three defensible outcomes and none of them is written down.

**Never store derived stats.** State holds base stats plus an ordered modifier list; `effective(unit, stat, state)` is a pure function. This is what makes job 1 nearly free — *"why is protection 3?"* is a diff of the modifier list, not a debugging session — and it structurally prevents the #1 bug class in AI-written aura code (`for ally in radius: ally.protection += 2`, which drifts upward and is invisible until turn 8).

**Fodder needs more than the architect gave it.** `FodderGroup` as specified has a scalar `hpPerMember` and no modifier storage, which means the horde — the majority of bodies on the board — structurally cannot hold protection, poison, dodge charges, or wound levels. The necromancer's aura pulses to twelve adjacent zombies and lands nowhere; the sweep then reports "poison underperforms against hordes." Give it a per-member HP array from day one, a group-level modifier list plus a sparse per-member overlay, and make `addModifier` take a `Targetable` so the compiler forces the fodder branch.

**Telemetry: three tiers.**
1. `events` — thin envelope + JSON payload, with `cause_seq` pointing at the causing event. That makes the log a causal DAG, which is the only cheap way to answer "how much damage did the Firewall *ultimately* cause including burn ticks and trigger chains," and it gives the future renderer its nested animation beats.
2. `damage_events` — one row per hit, fully typed: `raw_base, stat_bonus, flank_bonus, armor_absorbed, protection_absorbed, dodge_charges_consumed, final_damage, overkill, hp_before, hp_after, was_lethal, root_cause_unit_id`.
3. `modifier_ticks` — **long, not wide**: `(battle_id, turn, phase, unit_id, effect_id, instance_id, source_unit_id, stat, value, expires_turn)`, one row per live modifier per boundary. The architect proposed wide per-mechanic columns (`protection_value`, `dodge_charges`, …); that's a hundred schema migrations, and every prior sweep reports the new column as NULL — indistinguishable from "the effect never fired," which is the exact silent failure the whole harness exists to prevent. Long-form answers *"protection on turns 1/2/3"* identically for effect #1 and effect #100.

`root_cause_unit_id` is what stops every debuffer hero from reading as worthless — without it, poison shows as a big damage source and the hero who applied it shows near zero.

**Replay reads the log. Never re-simulate from seed.** Store both a ~2KB header (setup, seed, command list, `rulesVersion`, `contentHash`) and the full event stream, but the renderer only ever touches the stream. Re-simulation is a CI job that asserts the hash still matches.

The reasoning is decisive: the engine changes weekly under AI-driven edits, and a seed replay of a battle saved three weeks ago renders a *different, plausible-looking* fight with no error at all. Wesnoth's OOS bug class is exactly this. Free activation order amplifies it — any AI scoring tweak reorders activations and desyncs even with identical damage rules.

Building the **text/ASCII renderer first, purely from events**, is what proves the log is complete enough for pixels — months before the pixels exist. That's the real reason it's worth doing properly now.

---

## 5. AI: the confound you have to manage

Modes as versioned data, not subclasses: `{id, semver, weights, curves, vetoes, selection, knowledgeFilter}`, hashed into `mode_hash` and stamped on every run. XCOM 2 ships exactly this — its Aggressive/Defensive/Flanking/Fanatic profiles are literally different weight vectors over ~9 shared considerations.

Scoring is **additive with multiplicative vetoes**, not Dave Mark's multiplicative IAUS. Multiplicative scores are non-attributable — you can't say "threat contributed −3.2 to this hex" — and per-consideration attribution is exactly what job 1 needs.

Six things the critics changed:

1. **Don't put StabilizeDowned in a lower priority band than Attack.** That hardcodes the single most interesting decision in your consequence stack out of the search space. A hero adjacent to a bleeding body with `bleed_remaining=1` will always attack for 5 damage and let her die — permanently. Put Attack, ClassPower, and StabilizeDowned in *one* band and let utility separate them, with `bleedRemaining` and `allyValue` as considerations. Keep bands only for genuinely incomparable things.

2. **Don't compute `damageOut` via a speculative `core.apply` on a cloned state.** That puts a 7.1µs clone plus the full fixpoint inside the scoring loop — roughly 14 seconds per battle instead of 10ms, which invalidates the entire throughput assumption the confirmation tier rests on. Give the scorer a pure `previewDamage()` that runs only the stage table, and assert per-battle that preview equals actual for every executed attack.

3. **`killSecured` should be a gate, not a weight.** Under deterministic damage the score surface is a staircase, and an 85%-of-best randomization band routinely contains a guaranteed kill and a non-kill. Randomizing there manufactures variance by throwing away lethal — which isn't player-relevant variance, it's the AI being bad in exactly the moments that decide battles. Source battle variance from the *scenario* (deployment jitter, wave draws, hazard placement, card shuffle), not from policy noise.

4. **Stamina reserve must be an explicit swept parameter.** A greedy one-action-at-a-time loop has no mechanism to save stamina across turns, so a 4-cost class power is structurally unreachable — it needs four consecutive turns of choosing nothing, and Attack always outscores nothing. The harness will report the ability as weak, and the conclusion will be about the scorer. Make `{reserveFor, targetStamina, patienceTurns}` a mode parameter.

5. **Hero policy and enemy policy must be crossed, not laddered together.** Otherwise "the sign survived the policy ladder" confounds *my heroes played better* with *the zombies played worse.*

6. **Add a human-like arm, permanently.** The global candidate-action loop re-scores after every atomic action, which means the engine solves the interleaving problem near-optimally every single battle. The optimal line — Hero A weak-attacks to strip a dodge charge, B partially moves to flank and strips the second, C lands the charged hit, A finishes its interrupted move — gets found every time. A human finds it maybe one time in five. Every mechanic whose value is unlocked by exact multi-unit sequencing is therefore over-valued relative to shipped play, and the TP budget model gets calibrated to a player who doesn't exist. The arm: probability *p* that a unit must complete its activation before another may act, decision noise scaled to the top1–top2 margin, and a per-turn cap on distinct units touched.

Also worth knowing: **partial moves don't emerge for free** from the global loop. They only emerge if "spend 2 of A's 5 MP toward hex X" is an enumerable candidate. For v1, enumerate full-move-to-hex only and instrument a `partial_moves_used` counter. When it reads 0 across a sweep, print *"AI does not exercise partial moves — no conclusions about activation order are available"* rather than a number.

**Always ship RANDOM and PASSIVE control arms.** Random is the cheapest known detector for "this fight has no decision content." Passive turns your frozen law *waiting is never safe* into a regression test that runs forever.

---

## 6. The statistics reality check

### 6.1 n=10 is a screening tier, not an answer

At n=10 unpaired, power to detect a 50%→70% win-rate shift is **15%**. A 7/10 result has a Wilson interval of [0.40, 0.89]. The default workflow — run 10, read the win rate, conclude — is a false-discovery machine.

The good news is that the n=10 figure was chosen under a throughput assumption that measurement disproved. **100,000 battles is roughly 15 minutes on 8 cores.** There is no reason to buy noise. Keep n=10 for screening, where cheapness is the point, and spend real samples on confirmation at n=100–200.

Standard shape per feature: A/A determinism check → stage-1 screen at n=10 paired (rows rendered **"candidate, unconfirmed"** and never quotable) → stage-2 confirmation on the 3–6 largest effects at n=100–200 paired.

### 6.2 Common Random Numbers, and how it silently fails

Run both arms on identical seed blocks and join on `seed_id`. The payoff is exactly `1/(1−ρ)`: at ρ=0.8, n=15 does the work of n=64.

But CRN's failure mode is that it presents as *"pairing didn't help much"* rather than as an error. Three ways it breaks here:

- **The wave manifest becomes a function of the treatment.** If the per-slot pressure budget is evaluated against live board state, arm A (two fodder died turn 4, budget has slack) draws 1 Brute while arm B (protection kept them alive) draws 3 Ghouls — three bodies, three triggers, three corpses for the necromancer. Structurally different fights, attributed to protection. **Fix: pre-roll the entire wave manifest at `createBattle` from `(scenarioId, rootSeed)` only — turn, slot, archetype, spawn hex — freeze it into State, hash it, and make cross-arm hash inequality a hard sweep failure.** If adaptive pressure is a design goal, it becomes its own declared axis, never a hidden dependency in every other comparison.
- **`ai.tiebreak` keyed on a global `decisionOrdinal`** reintroduces exactly the mutable counter the RNG design bans, on the primary experimental axis. Key on `(turn, phase, unitId, actionsTakenByThisUnit, candidateSetHash)` so a new consideration only changes draws for decisions whose candidate set actually changed.
- **Quarantined runs.** If a sweep re-draws replacement seeds for INVALID runs, the seed block is no longer identical across arms and pairing silently breaks — for exactly the configs that stress the engine hardest.

Display ρ per comparison on the dashboard. It legitimately collapses near damage breakpoints, which is exactly where the interesting questions live, so it must be visible rather than assumed.

### 6.3 Win rate is the wrong primary metric

Riot's own retrospective documents the failure: the champions that broke the game sat at 52–53% and never tripped the threshold. In a game whose promise is *heroes are permanent-but-scarred*, a win with three crippled heroes is arguably worse than a loss.

Use a graded **Cost of Victory** — permanent deaths, injuries minted, end wound levels, civilians lost, non-refundable resources, turns — computed for wins *and* losses, reported as `{P(clear), median CoV, full histogram}`. Continuous margin metrics measured 1.8–2.4× more statistically powerful than binary win/loss at identical n.

Store the raw component counts on every run row so CoV can be recomputed retroactively under new weights. But **don't ship three weight profiles yet** — at 4v4 there are no civilians, no injuries, and no economy, so four of six terms are structurally zero and all three profiles produce identical rankings. Compute CoV as a SQL view with one default weighting. When there are enough non-zero components to matter, the better tool than three profiles is solving for the critical ratio: *"protection wins iff you value a permanent death at more than 2.7 injuries"* is designer-actionable; a "weight-sensitive" badge isn't.

### 6.4 Three ways the numbers can be confidently wrong

**Zero-variance collapse.** Deterministic rules + argmax AI + fixed seed = ten byte-identical battles, so n=10 is secretly n=1 and every within-arm SD is exactly 0. The dashboard then renders "no difference, tightly estimated" — the most confident possible statement about nothing. Asserting that log hashes are *distinct* is too weak; it passes trivially when a cosmetic reposition differs. **Assert nonzero within-arm variance on the declared primary metric**, and on zero variance mark the comparison DEGENERATE, refuse to emit an interval, and surface it as the finding: *"this scenario cannot discriminate — the fight is decided at deployment."*

**Informative censoring.** Loop overflows, cascade-depth breaches, and turn caps all happen when the board is saturated with fodder, corpses, and onDeath chains — i.e. in battles the horde is *winning*. Deleting them biases every number toward the heroes. If 30 of 1,000 runs quarantine and 26 were heading to a wipe, P(clear) rises from 0.61 to 0.63 and whatever shipped that week gets credit for a censoring artifact. **Treat INVALID as a competing outcome, never a deletion:** report the point estimate alongside bounds with all invalids counted as losses, then as wins. If the bounds straddle the comparison, the sweep is inconclusive by construction.

**Ablation measures substitution, not value.** Remove poison and the AI spends the freed stamina on basic attacks, so the delta is ~2% and poison reads as worthless. Every ablation needs a paired **equal-cost replacement arm** — swap the effect for a calibration anchor like "deal 6 for 1 stamina" rather than for nothing.

### 6.5 Geometry is a factor, and right now it isn't in the design at all

Every number the harness produces is conditional on one hex layout and one deployment. Spatial mechanics — radius auras, ZoC, flow fields, surround-count flanking, hazards — have effect sizes that are almost entirely a function of geometry.

Concretely: a radius-3 protection aura on an open 15×15 covers 37 hexes, all seven heroes sit inside it every turn, steady-state protection 2, measured TP matches declared, verdict "correctly budgeted." On a corridor map the party strings out over 8 hexes and the aura reaches 2 allies; measured TP is 0.4. Same effect, same code, a 4× difference in measured value.

**Make map archetype a randomized blocking factor** with at least 8 layouts (open, corridor, chokepoint, split-approach, hazard-heavy, corpse-dense, ranged-dominant, deployment-disadvantage), paired across arms on map id. Report every effect as main effect *plus* map interaction, and auto-label anything whose interaction variance exceeds its main effect as SITUATIONAL.

### 6.6 What to cut from the statistics

All three critics flagged the same over-engineering. Cut now, revisit if a real need appears:

- **D-optimal designs** → full factorial over 3–4 pre-registered factors. At ~10ms/battle, 108 cells × n=50 is under a minute and every cell is directly readable.
- **Robbins-Monro root-finding** → plain bisection, or just run the grid. For an integer axis with ~12 interesting values, 12 × 30 = 360 battles takes seconds and **the shape of the curve is the finding**. Stochastic approximation also assumes monotonicity you don't have: going from 6 to 7 zombies can make heroes do *better*, because 7 bodies cluster tightly enough for a disk(1) AoE to hit three instead of two. RM converges to a point on the wrong side of the dip and reports it with a tight interval.
- **Stream-Sobol variance attribution** → freeze one stream at a time (6 arms × 200 battles). Same bar chart, trivially explainable.
- **Benjamini-Hochberg** → redundant once you have one pre-registered primary metric, mandatory stage-2 confirmation, and seed-block-B replication. Report effect sizes with intervals and the minimum detectable effect per cell; drop p-values.
- **CVaR-20 at n=10** is the mean of the worst two runs. Make it structurally unavailable below n=100.

And **ban the bare "N zombies is the tipping point" headline.** Pressure buys a *bundle*, and the pool draw picks the bundle stochastically — 11.4 pressure is either 11 batched fodder (one group, zero triggers, surround-count pressure) or 5 fodder plus an elite (2 triggers, an onDeath corpse burst feeding the necromancer), and P(clear) differs by ~25 points between them. Run the finder once per **frozen composition template** and report `(composition, pressure*, derived count)` triples.

---

## 7. Revised build order

The architect's plan put the first outcome distribution at week 8. This one puts it at week 1.

### Week 1 — Walking skeleton (~1,200 lines)

Axial hex board · move + attack + EndPhase · flat armor per hit · HP→0 → Deathbed roll → downed with bleed counter · hash-derived named RNG streams · mutator facade · NDJSON event log · a 60-line `for (seed of 0..99) runBattle()` printing win rate, median turns, and hero deaths as a **terminal table**.

Nothing else. No registries, no manifest, no DuckDB, no dashboard.

This answers "do 4 heroes beat 5 zombies," and it's the milestone that keeps the project honest — everything downstream has to earn its place against a thing that already works.

### Week 2 — Determinism spine + text replay

Hand-written `cloneState` + `checksum` · command journal + `rewindTo` · ASCII board renderer and L3 combat log **rendered from events only** · CI: double-run same seed → byte-identical log; serialize/deserialize preserves checksum; id-permutation isomorphism; the lint boundary on `core`.

The text renderer is the load-bearing part. If it can't describe the battle from events alone, the future PixiJS renderer can't either — and finding that out now costs days instead of re-running every historical sweep.

Also: insert a new RNG draw and assert every other stream is bit-identical. That's the CRN mechanism proving itself.

### Weeks 3–5 — Protection and poison through the effect contract

Two registries · the damage stage table · the turn-end ladder with your §3 rulings · the trigger queue with `stillApplies` · the ledger with the conservation assert · a **5-field** manifest (`id, registry, hook-or-stage, cadence, stacking, writes`).

Then exactly two effects. Protection is the right first one because it exercises every hard edge at once — pulse-vs-continuous, DECAY/PULSE ordering, HIGHEST stacking, aura membership correctness, per-hit attribution. If the contract survives protection and poison together it will survive 98 more; if the manifest feels like ceremony with two effects written, it's wrong, and it's cheap to change now.

Ship the verify gate alongside: engine invariants, ~5 metamorphic relations, 3 oracle scenarios per effect, a hand truth table derived from the design doc text with each row citing its clause.

### Weeks 6–7 — Sweep runner, DuckDB, dashboard v1

Worker threads · paired seed blocks with ρ displayed · **three dashboard panels only**: provenance header with a red banner if invariants fired, arm comparison as a strip plot with all ten runs visible as dots, and the mechanic-verification small-multiples.

Then run the honesty battery: A/A determinism, 200-seed noise floor, one-stream-at-a-time variance attribution, and a full seed-block-B replication of every finding so far. If block A and block B disagree, everything at n=10 is noise and the budget policy changes on the spot.

Skip the ingest pipeline at first — `duckdb -c "SELECT ... FROM read_json_auto('runs/*/events.jsonl')"` needs zero code. Build `sweep.duckdb` with `COMMENT ON` and `EXAMPLES.sql` when a raw query first takes more than ten seconds.

### Weeks 8–10 — AI modes and the policy ladder

Global candidate-action loop · additive scoring with veto gates · four modes plus RANDOM, PASSIVE, and the human-like arm · crossed hero×enemy policy factors · the `decisions` table.

Then re-run every headline finding across policy rungs. This converts an unanswerable absolute question (*is my AI strong?*) into a cheap relative one (*does the sign of the effect survive?*).

### Weeks 11+ — Hordes and waves · designed experiments · content pipeline · visual replay

In that order. Visual replay is deliberately last: it retires no unknown the earlier milestones didn't already answer, and building it sooner would freeze the event schema before the effect library had stressed it.

---

## 8. What to cut, and what's missing

**Cut from the architect's plan** (all three critics agreed):

State-expanded Pareto pathfinding (its consumers are the M8 UI and a lookahead AI that doesn't exist) · the CONTINUOUS registry · manifest fields 6–15 · the 5,000-pair nightly order fuzzer (the `reads`/`writes` declarations already prune to a few dozen genuinely overlapping pairs) · logging the full candidate set on every decision (~1.16B evaluations per sweep would dwarf every other artifact — log the chosen action's vector and the top1–top2 margin, full sets only under `--explain`) · SKELETON.json's 100 slots before there are 15 effects to fit budget coefficients against · every downstream stack decision (PixiJS, React, Tauri, Supabase) · dashboard panels 4–10 · refusal to pool across `content_hash` (you edit content daily; the override becomes reflexive within a week, at which point the guardrail is worse than absent — hash per-effect subsets instead).

One test to drop as specified: **hex mirror symmetry will fail on a correct engine** as soon as the AI is in the loop, because tie-break comparators end in `hexId` and `hexId` ordering isn't mirror-equivariant. Restrict it to scripted-action micro-scenarios with no AI — which is where directional bugs actually live (flank counting, aura disks, cone rotation).

Similarly, the "batched fodder must produce identical event streams to a naive per-unit resolver" test **cannot pass**, because batching isn't only an optimization — the shared brain makes one flow-field decision while per-unit AI scores each member separately. Split the claim: assert byte-identical streams for *scripted* actions (which catches flank/ZoC/hazard/AoE drift, the real risk), and assert bounded *properties* for behavior.

**Missing entirely, and needed early:**

- **The sweep config format.** The harness is a function from *a question* to *runs*, and the artifact encoding a question — what axes exist, how `config_id` and `arm_id` derive, how a variation diffs against baseline — appears nowhere. It's the first file you'll need.
- **Content.** No zombie stat block, no hero classes, no class powers, no ability list. At 4v4 with deterministic damage, **the content is the experiment** — whether a zombie has 8 HP and 3 armor or 12 HP and 0 armor changes every conclusion more than any AI mode does.
- **A card-play policy.** Cards are a listed sweep axis and the Energy economy is fully specified, but nothing decides which card to play or whether to bank toward a 3-cost. A greedy policy always plays the 1-cost first and never reaches 3 Energy, so the ultimate tier is untested by construction. Every sweep before this exists measures a game with one of its five pillars inert.
- **A hidden-information model.** An omniscient enemy plays around cards that haven't been played, which zeroes out the entire denial/surprise class. A commander banking Energy for a 3-cost Firewall finds the flow field already routing around a wall that doesn't exist yet — measured impact 0, and the leaderboard recommends cutting denial cards.
- **A human calibration loop.** Nothing in the plan ever compares a simulated outcome to you actually playing. The harness can be internally consistent, invariant-clean, replication-stable, and externally wrong forever. Cheapest fix: after each milestone, play 5 battles on the same seeds the sweep used and draw your CoV distribution as a reference line on the dashboard.
- **Pre-registration.** One primary metric, hypothesis, predicted direction, exclusion rule — written and hashed into the sweep row *before* the runner starts. "Run 10, look, run more if interesting" is the garden of forking paths regardless of how good the pairing is.

---

## 9. What I'd decide next

Three things gate the walking skeleton, and they're all yours:

1. **The §3 rules table** — particularly the turn-end cadence (#1), the downed-unit table (#5–7), and the wound-level numbers (#8). The cadence question alone is a 2× error on the stat your entire game is balanced around.
2. **Starting content** — one zombie stat block, four hero classes with real numbers. This is the experiment; the engine is just the apparatus.
3. **Whether protection or poison is effect #1.** Protection stresses more edges and is the better contract test; poison is simpler and gets you to a real balance question a few days sooner.

Everything else can be decided by the harness once it exists — which is, after all, the point.
