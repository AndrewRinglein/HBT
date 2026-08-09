*Snapshot, 2026-08-09. Superseded where it disagrees with the live set.
Kept for the reasoning, not the recommendations.*

---

# The four patterns, checked against what we built

A response you got elsewhere named four industry patterns for exactly this problem:
**ECS · stat modifier pipeline · deterministic simulation · data-driven content**,
plus a warning — *don't build combat as special-cased code and retrofit the unified
pipeline later.*

I researched all four properly. Scorecard first, then the detail.

| Pattern | Where we stand |
|---|---|
| Deterministic simulation | **Have it, and go further than the advice** |
| Data-driven content | **Have it, in the shape the evidence supports** |
| ECS | **Deliberately don't — and the research says don't** |
| Stat modifier pipeline | **Half of it. This is the real gap.** |

---

## 1. ECS — the one piece of advice I'd reject

The advice was reasonable and the reasoning behind it is mostly wrong, in a way
that's well documented.

**Overwatch is the cited proof and it doesn't prove what it's used to prove.** ~12
players at 60 Hz — nowhere near an entity count where cache locality decides
anything. Ford's own framing is decoupling and netcode isolation, not performance.
And the determinism claim is backwards: Blizzard said explicitly they are *not*
100% deterministic, use state replication with partial rollback, and built a
**prediction-mismatch debugger** precisely because divergence happens. If you've
read "Overwatch's ECS gave them determinism," that's the thing to unlearn.

**The case against ECS for turn-based is specific, and one argument is fatal for
us.** From practitioners who tried it:

> *Systems executed "in reverse order to their code definition — but only
> sometimes." Am I crazy for thinking this is a complete deal breaker?*
> — Jach, *You might not need ECS*

Turn-based combat **is** resolution order. Does the shield check happen before or
after the poison tick; does an on-death trigger fire before the killer's second
hit. In ECS that order lives in a system schedule, at a distance from the rules it
governs. Our entire design is the opposite — stations spaced by 50, a named ladder,
a settle loop, sorted iteration with tiebreakers that can't tie. Making that
implicit would undo the most valuable property we have.

Sherratt (*Modifying ECS for Turn-Based Games*) independently reached the same
place and ended up **keeping component storage and throwing away the systems**.

**And nobody in the genre uses it.** XCOM 2: ability templates composed of
polymorphic strategy objects (`AbilityCosts`, `AbilityToHitCalc`, `AbilityTargetEffects`,
`AbilityTriggers`) over an append-only `XComGameStateHistory`. Battle Brothers:
Squirrel classes with inheritance. Into the Breach: C++ with Lua. No ECS anywhere.

**The important part: we already have what ECS is praised for, by another route.**
Plain-data state (Law 5b), engine imports nothing (Law 5), every mutation through
a facade (Law 3). Headless, serializable, testable in isolation — without a
scheduler. That was the actual goal; ECS is one way to get there and not the
cheapest one at our scale.

> Worth stealing from XCOM 2 instead: **ability templates + immutable state
> history**. That's how it gets save/replay/rewind, and it's much closer to what
> we're building than ECS is.

---

## 2. The stat modifier pipeline — the real gap

This is the one to act on. **We have a damage pipeline. We do not have a stat pipeline.**

Our stations resolve *a hit*. But `unit.strength` is a raw number, and the cracks
have already started:

- **Terrain accuracy** is an accuracy station (`ACC.TERRAIN`), not a stat modifier
- **Hero Reach** is added ad hoc inside `reachOf()`
- **Weakness** reduces damage dealt at `DMG.SOURCE_STATUS` rather than touching Strength
- **Wound levels** — your design doc's "−1 all stats" — have nowhere to live
- **Gear** (+2 Strength), **badges**, **auras** — same

Each of those is currently a special case at the point of use. That is precisely
the thing the warning at the end of that response is about, and I should be
straight with you: **my own earlier research told me this and I didn't build it.**
`HARNESS-DESIGN.md` says "never store derived stats in State — store base stats plus
an ordered list of modifiers." I recommended it, the first battle didn't need it,
and I moved on. The retrofit gets worse with every content item.

### What the research says to copy, and what to avoid

**Avoid GAS's aggregation.** Its multiply bucket is literally `1 + Σ(mᵢ − 1)`, so
two ×1.5 modifiers give **×2.0, not ×2.25**. The formula only behaves for
magnitudes in [1,2); `5, 5` gives 9. Epic finally added `MultiplyCompound` in UE 5.5
— and the most-cited GAS reference still tells people to fork the engine, because
the ecosystem hasn't caught up.

**We are already immune, by accident of a good law.** Constitution Law 7 bans
multiplicative aggregation and floats outright. That single line rules out the most
famous stat-pipeline bug in the industry.

**Path of Exile's real lesson isn't "additive vs multiplicative."** It's **scope**:
local flat → local increased → local more → global flat → global increased →
global more. Six stages, applied in order. A weapon's local "+5 physical" is scaled
by that weapon's local "+20% increased physical"; a ring's "+5 to attacks" is not.
That distinction is the source of most player confusion *and* most implementation
bugs when people copy the pattern. If you ever have gear-local versus hero-global
modifiers — and you will, the moment weapons carry bonuses — you need both scopes.

PoE also enforces **vocabulary discipline**: "increased/reduced" always means the
additive bucket, "more/less" always means multiplicative, everywhere, so a player
can classify any modifier by reading it. That's a design rule worth copying whole.

**XCOM 2's cautionary tale is the one that maps most directly onto us.** Its UI path
(`GetStatModifiers`) re-derives stat contributions separately from the authoritative
path (`GetCurrentStat`), and they disagree whenever multiplicative modifiers exist.
The Community Highlander ships a corrected version that literally logs
`"GetStatModifiers Mismatch!"` when the two disagree.

That is **exactly** Constitution Law 1 — one damage function, preview is a dry run
of it, assert the applied number equals the preview branch that occurred. We have
the guard XCOM had to retrofit. It should extend to stats when the stat pipeline lands.

**One design call to make:** GAS caches attributes and recomputes on dirty, with a
whole apparatus for dependency graphs and batching. At our scale — tens of
microseconds — **recompute on read** is correct, and Law 8 already says so. The one
hazard is re-entrancy: if a modifier on Strength reads Damage, a pull model loops
forever. Guard it or forbid cross-stat modifier dependencies.

---

## 3. Deterministic simulation — we exceed the advice

The advice said: fixed timestep, seeded RNG, no wall-clock, replay inputs, assert a
state hash.

**Fixed timestep doesn't translate.** Its whole job is removing variable `dt` from
the state transition. A turn-based game has no timestep — we have that property by
construction, not by effort. Likewise gone: float accumulation over 10⁵ ticks,
x87-vs-SSE, FMA contraction, frame pacing, rollback netcode.

**What genuinely survives is where all the real bugs actually are** — and none of
them are about timesteps:

| Requirement | Real-world failure | Us |
|---|---|---|
| Total ordering of every mutation | Factorio desynced because **Lua table iteration order** changed after save/load | Law 6 — sorted iteration, tiebreakers that can't tie |
| RNG call-count discipline | Age of Empires: *"programmers were not used to writing code that used the same number of calls to random"* | **Structurally impossible for us** — see below |
| Derived state persisted or recomputed identically | Factorio desynced on a **cached unit speed recomputed on load** | Law 8 — no caching without a proven invalidation test |
| Sim/presentation separation | | Renderer reads events only |
| Hash at multiple granularities | AoE checksummed world, objects, pathfinding, targeting **separately**, so a mismatch localises | **Gap — we have one global hash** |
| Seed + commit as the repro artefact | TigerBeetle stores both; a seed alone dangles the moment code changes | Partial — ledger records the sha |

**Where we're ahead of the advice.** "Seeded RNG" leaves you exposed to the AoE bug:
insert one draw and everything downstream shifts. Our streams are keyed
*structurally* — `(rootSeed, streamId, uid, ordinal)` hashed through FNV-1a into
splitmix32 — so call count and call order are irrelevant by construction. That's the
counter-based approach from the Random123 line of work, and it's what makes paired
A/B runs possible at all.

**The check worth running, which I did.** Slay the Spire shipped correlated streams
**twice**. StS1 seeded all twelve streams identically, so they emitted the same bits
— if your first combat isn't a Cultist, your first `?` room *must* be an event.
StS2 used `runSeed + hash(name)` and still correlated, because `System.Random`'s
first output is nearly linear in its seed. Named streams are necessary and **not
sufficient**; the derivation is a separate correctness problem.

I added `test/rng-independence.test.ts` — five tests covering pairwise stream
collision, conditional skew between streams, neighbouring-seed correlation, key
avalanche, and fixed draw count. All pass. Ours uses a full hash-and-avalanche per
draw, which is the recommended construction rather than the one that shipped broken.

**One rule worth writing down:** acceptance-rejection sampling consumes a *variable*
number of draws and silently desynchronises paired runs. "Roll until you get a card
you don't have" breaks CRN; "shuffle a fixed pool, take the top" doesn't. We're
clean today — `sample()` scores every candidate once and sorts.

**And the thing the advice omits entirely:** reproducibility is a *debugging*
property. Comparing two balance arms needs *statistical* machinery — many seeds,
paired runs with genuinely synchronised streams, and a paired test. Ten runs on a
fixed seed is a sample of size one wearing a lab coat. That distinction is the
entire basis of how our sweeps work, and it isn't in the four patterns at all.

---

## 4. Data-driven content — we're in the shape the evidence supports

The advice: abilities/items/effects as data (JSON/tables) rather than code.

**The evidence is more equivocal than that, and the closest comparable is on our side.**

- **Slay the Spire** — the nearest genre reference, commercially successful, heavily
  modded — uses **plain Java classes with hard-coded constants** and a `use()`
  method. Only display strings are externalised.
- **SabberStone** (Hearthstone) uses an **embedded combinator DSL in the host
  language** — task objects composed in C#. Declarative to read, type-checked,
  debuggable, no parser.
- **Fireplace** splits it explicitly: **XML for stats, Python classes for behaviour.**
- **Forge** (MTG) is a genuine external DSL — and it needed a variable system
  (`SVar:`), an interpreter, a documentation site, and a community of specialists.
  20,000 cards is what amortises that.

**The named failure mode is the Configuration Complexity Clock** (Hadlow): hard-coded
→ config file → XML schema → rules engine → custom DSL → *hard-coded again*. His
verdict after shipping one: *"we're back where we started four years ago, hard
coding everything, except now in a much crappier language."*

**The tripwire is precise:** the moment content authoring needs conditionals, loops,
local variables, arithmetic over another object's state, or explicit ordering — your
data has become a programming language and you now owe it tooling.

Our split — units, maps, encounters and status *rows* as data; effect *behaviour* as
small code modules — is Fireplace's split and RimWorld's split, and it's the one the
research calls highest-leverage for a small team. The `params`-may-not-contain-
behaviour rule in the harness design is exactly the tripwire, written down in advance.

---

## 5. The warning at the end — half heeded

> *"The mistake to warn him off: building combat as special-cased code first and
> trying to retrofit the unified pipeline later. That retrofit is famously miserable —
> every studio that's done it has the scars."*

**Damage: heeded.** The station table and the per-hit ledger existed before the first
battle ran. Terrain, crit, status penalties and absorption all slotted into it
without touching the resolver.

**Stats: not heeted.** Terrain accuracy, hero Reach, weakness and (soon) gear, wounds
and badges are each special-cased at the point of use. That's the retrofit being
warned about, in miniature, and it gets more expensive with every content item.

---

## What I'd actually do

**1. Build `effective(unit, stat)` before gear, wounds, or badges land.** Base value
plus an ordered modifier list, resolved on read, with the same provenance ledger the
damage pipeline has. Integers and additive only — Law 7 already bans the GAS trap.
Decide the scope split (item-local vs unit-global) now, because PoE says that's where
the bugs live.

**2. Split the baseline hash by subsystem.** One global hash tells us *something*
changed. AoE checksummed world, objects, pathfinding and targeting separately so a
mismatch localises. Cheap, and it makes the guard diagnostic instead of just alarming.

**3. Record seed + commit together as the repro artefact.** A seed alone dangles the
moment the code changes — TigerBeetle stores both for exactly this reason, and the
correct response to a found bug is to convert it into a test that survives refactoring.

**4. Add swarm testing to the sweep.** Groce et al. found **42% more distinct crash
bugs** by randomising *which features are available per run* rather than always using
the full set. Translated: a sweep that always fields the full roster and the full
status list will rarely produce the three-effect interaction that breaks the
resolver. Randomise the available pool, not just the draws.

**5. Keep rejecting ECS.** On the record, with reasons.
