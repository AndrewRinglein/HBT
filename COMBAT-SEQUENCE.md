# Combat Sequence

*Heroes of Blight and Tragic — the order in which everything happens.*

This is the engine's skeleton. It says **what stages exist and in what order**, not what the rules are. Anything genuinely arguable is marked as a **switch**, because the harness exists to answer those.

---

## Vocabulary

Fixed terms. Each word means exactly one thing.

| Term | Meaning |
|---|---|
| **Battle** | The whole fight, from setup to a victory condition. |
| **Turn** | One full cycle: Hero Phase, then Enemy Phase. **This is the numbered one.** |
| **Phase** | Hero Phase or Enemy Phase. Two per turn. |
| **Activation** | One unit's turn on the field. *Hero Activation* / *Enemy Activation*. |
| **Step** | One hex of movement inside an activation. |
| **Primary Action** | The unit's one action: attack or class power. **Not cards.** |
| **Card Play** | The commander plays a card from hand. Its own resources, not a unit's action. |
| **Attack** | One attack action. Contains one or more Hits. |
| **Hit** | One instance of damage resolution. |
| **Settle** | The resolution loop that runs after damage lands. |

> **Naming collision to resolve in GAME-DESIGN.md.** The wave schedule currently calls a full round a "phase" — *phase 5 adds a second necromancer, battles run ~9 phases.* Under this vocabulary those are **Turns**. One find-replace, and "phase" is free to mean the Hero/Enemy half everywhere.

**An Activation has exactly two parts: movement, then the primary action.** Either may be skipped.

**A Card Play is not an Activation and does not consume one.** Cards cost Energy plus a card action, come from the commander rather than a hero, and can be played between activations during the Hero Phase.

---

## Settle

The most important loop in the engine. Runs **any time damage lands**.

> Repeat until nothing changes:
> 1. Run any queued triggers.
> 2. Check the board — heroes at 0 HP roll Deathbed and stand or fall; enemies at 0 HP simply die and leave a corpse; expired bleed-outs resolve.
> 3. Apply everything found at once; queue any triggers that creates.

**Settle is never reentrant.** Damage applied by a trigger while a settle is running enqueues into *that* settle — it does not start a nested one. Without this rule, "runs any time damage lands" and "repeat until nothing changes" contradict each other the moment a trigger deals damage, and every effect module gets written against whichever answer its author assumed.

**Victory check runs inside settle**, so a battle can end the instant the board clears.

A hard iteration cap ends the battle and marks the run invalid rather than continuing quietly. (Constitution, Law 9.) Overflow is a bug, not a result — the battle does not get an outcome.

Worked example — a hit that kills:

```
damage applies
  → on-hit fires, on-damage fires
  → poison from on-hit lands
  → board check: target at 0 → enemy, so it dies → corpse
  → on-death fires → heals all enemies within 5-6
  → board check: nothing new
  → settled
```

---

## Battle setup

1. Roll enemy count *(dice cup)*
2. Roll wave composition *(dice cup)*
3. Roll placement *(dice cup)*
4. Place heroes
5. Reveal the battle condition
6. Fire `onEnter` triggers → **settle**
7. Calculate vision and stealth

---

## Start of Turn

1. The wave schedule fires — this turn's spawns arrive → `onEnter` → **settle**
2. Bleed-out counters advance on downed heroes → **settle**
3. Victory check

---

## Hero Phase

A sequence of **Hero Activations and Card Plays, interleaved**, in the order the player chooses. The simulator approximates the ordering with a switch: `random` · `best-first` · `fixed`. When random, it draws from its own dice cup.

Downed heroes do not activate.

### End of Hero Phase

The ladder is an **ordered list of named rungs supplied by config**, not six hardcoded calls — so reordering it is a sweep axis rather than a diff.

1. Auras resolve their end-of-phase effects on heroes still inside them
2. Corpse effects for heroes standing on a corpse
3. Hero statuses tick — poison, burn, regeneration, weakness, stun → **settle**
4. Hero durations tick down — protection, buffs, debuffs
5. Hero stamina regen
6. Victory check

---

## Enemy Phase

A sequence of Enemy Activations. Same shape as the Hero Phase without card plays. Enemies do not spend stamina.

### End of Enemy Phase

Same ladder as above, applied to enemies. No stamina regen.

---

## End of Turn

Victory check, including the turn cap.

---

## Activation

Movement, then the primary action.

### Movement — per step

| # | Rung | Built? |
|---|---|---|
| 1 | Check movement points — enough to enter? | **yes** |
| 2 | Attacks of opportunity fire → **settle** | *not yet* |
| 3 | Enter the hex, spend the points | **yes** |
| 4 | Traps → **settle** | *not yet* |
| 5 | Gain terrain status from the hex | *not yet* |
| 6 | Recalculate vision and stealth | *not yet* |

**The "Built?" column is not decoration.** This ladder was read as a description of
what the engine does, and four of its six rungs are reserved slots — `movement.ts`
has the comments marking where each goes, and nothing else. A sequence document that
does not say which rungs exist will be believed. Every ladder below carries the same
column for the same reason.

Repeat per hex. Vision and stealth recalculate after **every** step, after everything else in that step. Reveal auras (e.g. *reveal all stealth within 4*) are evaluated here too.

### Primary action

Attack or class power.

### End of Activation

If the unit is standing on a hex carrying a terrain status, **it gains a stack.**

This is the second of the two applications: once on entering during movement, once here. Move through a fire hex and you took one stack. Move onto it and stop, and you took two. The statuses themselves don't tick until End of Phase.

---

## Attack

An attack is a list of hits, resolved **one at a time**. Each hit runs the full cycle — damage, triggers, settle — before the next hit begins.

### Per hit

1. **`onAttack`** — fires the second the swing begins. It has nothing to do with
   hitting or missing, so it cannot be bundled with the hooks that do.
2. To-hit roll *(dice cup)* → hit or miss
3. On miss: `onMiss` → **settle** → done
4. Crit roll *(dice cup)*; on crit, `critBranch` *(damage or injury)* then `critInjury` *(which one)* — two cups, because the branch weights and the injury table are tuned independently
5. **`onCrit`**, if it crit — fires the instant the crit is confirmed, before the damage stations. A crit is a thing that happened, not a size of number
6. Run the damage stations
7. `onHit`
8. Apply the damage
9. If damage ≥ 1: **`onDamage`** *(the attacker's)* → **`onTakingDamage`** *(the **victim's** — its owner is the unit that was hit, so a retaliation aims back at the attacker)*
10. **`onKill`**, if the target died — *the **killer's** hook*
11. **Settle**

### `onDeath` is not in this list, on purpose

**`onKill` is in the attack sequence. `onDeath` is not.** The killer's hook belongs
to the swing; the victim's belongs to dying, and dying is not an attack.

A unit dies from a poison tick, from bleeding out on the Deathbed, from a trap, from
an aura — and every one of those routes ends in the same place: **`settle`**, which
is the only code that decides a unit is dead. So `onDeath` fires there, once, for
whoever died, whatever killed them.

Wiring it into `performAttack` as well would mean two firing sites for one event,
which is the same shape as two functions computing damage: they agree until they
don't, and the disagreement is a death that silently triggers nothing.

Two details that follow from living in `settle`:

- It fires **after** the whole sweep, so a trigger that reads the board sees every
  death in that round rather than a half-resolved one.
- Anything it causes is picked up by the next round of the same settle loop — the
  fixpoint already handles cascades, so a chain of death triggers needs no new
  machinery.

`onDeath` is also the one hook whose owner is **dead when it fires**, which the
engine has to except explicitly or the hook is wired, logged as absent, and silently
never fires.

> **CHANGED 2026-08-15 — `onAttack` moved from step 6 to step 1.** Angela: *"On
> Attack happens the second the attack starts. It has nothing to do with hitting or
> missing."* At step 6 it sat after `Apply`, and a miss exits at step 3 — so a missed
> swing never reached it, contradicting `GAME-DESIGN.md` §5 (*"onAttack — every
> swing, hit or miss"*). Two documents, opposite answers, and whichever a session
> read first won.
>
> This is load-bearing, not cosmetic: the Mage's 100% Burn on attack is compensation
> for a low hit chance. Under the old step 6 the Mage only burned what it already
> hit, and the compensation did not exist.
>
> **CHANGED 2026-08-15 — the tail is now explicit.** Angela: *"On attack triggers,
> roll to hit, on hit or on miss trigger, a variety of things happen with damage
> application. If damage is applied on damage triggers, then on taking damage
> triggers, then on kill triggers if there's a kill."* `onTakingDamage` was not in
> the sequence at all, and it is the one hook whose **owner is the victim** rather
> than the actor — worth stating, because every other hook on this list belongs to
> the unit that swung.

## Triggers

Nine hooks. **Most belong to the unit that acted; three do not**, and getting that
wrong is silent — a retaliation that hits the wrong unit still looks like it worked.

| Hook | Fires | Owner |
|---|---|---|
| `onAttack` | every swing, hit or miss | attacker |
| `onMiss` | the swing missed | attacker |
| `onHit` | connected, even if armor absorbed it all | attacker |
| `onCrit` | the crit is confirmed | attacker |
| `onDamage` | at least 1 damage got through | attacker |
| `onKill` | the target died | **killer** |
| `onTakingDamage` | it was hit | **victim** |
| `onDeath` | it died — fires from `settle`, not the attack | **victim** |
| `onActivationEnd` | the unit's go is over | the unit |

**`onActivationEnd`, never `turnEnd`.** A Turn is a Hero Phase plus an Enemy Phase;
a unit finishing its go is an Activation. On an eight-zombie board the two readings
differ by sixteen firings a turn against one. *(`GAME-DESIGN.md` §5 still says
`turnEnd` — it needs the same edit.)*

**A failed roll still logs.** `trigger.rolled` is emitted whether or not it fired.
A 20% trigger that leaves no line when it misses is indistinguishable from one that
was never wired in, and that ambiguity has already cost this project days once.

### Chance is a number; firing is a rung

The chance resolves through its own small station table, so a badge granting
"+10% trigger chance" has somewhere to land:

| # | Station |
|---|---|
| 100 | BASE — the authored percentage |
| 200 | SOURCE — the unit's own modifiers |
| 400 | SITUATIONAL |
| 900 | FINAL — clamp 0..100 |

`resolveTriggerChance` is pure and previewable. **Nothing rolls until `perform`** —
a roll inside a resolve would consume an RNG key during `preview()`, and the real
roll would then hit the key-collision assert.

### Targeting

One vocabulary, used by triggers **and** abilities. Two target languages in two files
is how "target" comes to mean two things.

```
select : self | unit | area
side   : ally | enemy | any
radius : area only. omitted = the whole side ("heal all rangers")
origin : area only. self = whirlwind (default) · target = cleave
requireTags : legality, not preference — "target undead" is NOT CASTABLE
              with no undead on the board, answered before stamina is spent
```

The actor **is** one of its own allies unless `excludeSelf` says otherwise.

An unknown select, side, origin or an empty tag **throws at load**. §5's first
"do not port" is Hell TCG's silent fallback, where a mistyped target quietly resolved
to the trigger's owner and every typo became a self-target.

### Accuracy stations

To-hit is now the core roll of the game and its **final output feeds the crit formula** — surplus Accuracy above 100 becomes Crit. So it needs the same treatment as damage: a spaced station table, and a ledger per roll.

| # | Station |
|---|---|
| 100 | BASE — the attacker's Accuracy |
| 200 | RANGE — −5 per hex past the first, for ranged |
| 300 | ADJACENT — −20 for firing while adjacent |
| 400 | TERRAIN — the target's occupied-hex modifier |
| 500 | CONDITION — fog, snow, darkness |
| 600 | TARGET_DODGE |
| 700 | SITUATIONAL — the design's open melee penalties land here |
| 900 | FINAL |

**Do not clamp the Accuracy value.** The *roll* clamps to 0–100; the value must not, because Crit reads `(final Accuracy − 100) ÷ 4`. Clamping the value silently kills Design Law 21 — the point-blank +10 crit the design promises becomes +0, and no test would catch it.

### Damage stations

Numbered with gaps on purpose. Ordering is a property of the **station**, not of the effect, and a new station can be inserted at 425 without renumbering anything.

| # | Station |
|---|---|
| 100 | DECLARE — the attack's base damage, type, and which stat it uses *(punch: −1, physical, Strength. Longsword: +1, physical, Strength.)* |
| 200 | SOURCE_STAT — add the unit's modified Strength or Precision |
| 300 | TERRAIN |
| 350 | POSITIONAL — flank |
| 450 | CRIT — the +50%, before all mitigation |
| 550 | PROTECTION — consumes; see below |
| 600 | MITIGATION — Armor (physical) or Resist (magic); true damage skips both |
| 700 | FLOOR at zero |
| 850 | APPLY |

**Protection is a depleting pool that also decays.** It is a status the hero carries — granted by an aura, a card, anything — not a question asked about the granter's position. It reduces incoming damage *and* is reduced by the damage it absorbs: `absorbed = min(protection, damage)`, then `protection -= absorbed`. On top of that it loses 1 at End of Phase. Damage burns it fast, time burns it slowly.

Because it is consumed, it must be **stored** — a derived "am I near the cleric right now?" check has no memory and cannot work. This is the general shape for shields and wards too.

**Switch:** `protectionStacking` — a pulse of 2 onto a hero holding 1 gives either 3 (add) or 2 (take highest). These behave very differently when a cleric pulses every phase.

**One rounding rule, everywhere:** integer division, truncated. The +50% is `(dmg * 3) / 2` floored — a 3-damage punch crits for 4, not 5. `roundUp` is a switch, because against armoured targets with multi-hit weapons it genuinely moves numbers.

Armor applies **per hit**, which is what makes split attacks a real tradeoff.

### A Hit is a structure, not a number

Each Hit carries an append-only ledger — one row per station that touched it: `{station, effectId, before, after, delta}`. The accuracy roll carries the same.

That is the whole mechanism behind *"how much damage did protection absorb"*: it's a `GROUP BY`, for every effect, forever, with no per-effect instrumentation. One assert per hit keeps it honest: `base + sum(deltas) === applied + overkill`.

Triggers are not stations. Damage resolves completely, then triggers fire.

**Switches:** `recomputeStatsBetweenHits` (does a strength gain from hit 1 apply to hit 2?) · `multiAttackRetargets` (if the target died, does hit 2 retarget or fizzle?)

---

## Death and the downed

**Enemies have no consequence stack.** Zero HP means dead, and the body becomes a corpse.

**Heroes** roll Deathbed at zero and either stand or fall.

**`lifeState` is an explicit field** — `Standing · Downed · Stabilized · Dead` — never inferred from `hp <= 0`. HP is clamped at 0 while Downed, and standing back up requires an explicit `reviveUnit` mutator. Without this, healing a downed hero for 4 leaves her flagged downed and bleeding out at 4 HP, and auto-standing on any heal makes a 1-point heal cancel the entire consequence stack.

**A downed hero** is deliberately simple in the first model:

- No stat modifiers, no triggers, no aura pulse.
- Bleed-out advances at Start of Turn.
- No activation.
- Hits on the downed accelerate bleed-out and never kill. *(Design Law 3.)*

**No statuses, deliberately.** Existing burn or poison simply stops applying while she is down. What matters is the counter and whether anyone reaches her in time.

*(Design Law 3's "the fire that got there first" is satisfied by fire being in the way of the rescue, not by fire burning the downed hero. And dropping a hero to shed a status is not an exploit worth guarding against — nobody takes a hero to zero to remove 3 burn.)*

---

## Hordes

**Every unit is an ordinary unit.** Its own stats, its own statuses, its own damage, its own full activation. There is no group entity, no shared health, no special case.

"Batched," in the design doc, means two things — and neither touches the engine:

- Fodder can **share an AI policy**, so forty zombies need one behaviour authored rather than forty.
- The renderer can **show them moving together**, which is what "seconds, not minutes" is about. That's the player's patience, not the rules.

At ~10ms a battle, forty real units cost nothing (Law 0), and per-unit dodge, terrain, crit injuries, per-hit armor and aura membership all just work.

**Corpses and downed heroes are battlefield objects**, on the same layer as mushrooms. They occupy a hex and can be interacted with — stabilizing, stretcher-carrying, ghouls savaging the downed, necromancers raising corpses.

---

## Victory checks

Three places:

1. Inside **settle**, whenever a unit goes down — the board can clear at any instant
2. At the end of each **Phase**, and at **End of Turn**
3. The **turn cap**

**The turn cap is always on, as a runaway guard — not as a balance lever.** Design Law 1 forbids per-mission turn timers, so the default sits high enough to never bite in a real fight (25), is per-scenario config, and does **not** mean "the enemy wins."

Outcomes are an enum: `heroClear · objectiveMet · wipe · retreat · capped`. A capped battle is recorded as `capped` and graded on board state and cost, never as invalid and never silently dropped — those long grinding fights are exactly the ones the horde was winning, so throwing them away tilts every number toward the heroes.

---

## Dice cups

to-hit · crit · crit effect · **trigger** · Deathbed Fighting · schedule event · wave composition · enemy count · enemy placement · **hero deployment** · terrain event · card draws · AI tiebreak · activation order (when random)

**The trigger cup's key carries the trigger's SLOT on its owner.** Two 20% triggers
on the same hit — a zombie with poison *and* weakness — would otherwise draw the same
key, return a bit-identical value, and always fire together: two 20% triggers
behaving as one. Verified at 4% both / 32% exactly one, which is what independence
looks like.

Every roll is addressed by **what it is**, never by **when it happened**. "Hero 7's second hit of her third activation" — not "roll #47," and **not** anything containing a turn number.

A key is `(persistent unit id, per-unit ordinal, what kind of roll)`. It may never contain turn, phase, or any global counter, because those are *outcomes* — every mechanic worth testing changes when things happen, so a turn-keyed roll breaks pairing hardest for exactly the treatments that work.

CI assertion: no two draws in one battle share a key tuple. Ten lines, catches the whole class.

### Simulation stand-ins

Anywhere the real game has a player decision, the simulator needs something to produce that command. The engine cannot tell the difference — a command is a command.

| Player decision | Simulation stand-in |
|---|---|
| Where heroes deploy | **hero deployment** cup, or an authored preset |
| Which hero to activate next | activation order switch |
| What that hero does | AI mode |
| Which card to play, and when | *(deferred — will need a commander policy)* |
| Whether to retreat | *(deferred)* |

> **Deployment deserves the same treatment maps got.** It is probably the largest single determinant of a 4v4 outcome — larger than most abilities under test — so pure randomness there can swamp the thing being measured. A few **authored presets per map** (clustered, spread, ranged-back, bad-start) turn it into a known, attributable condition, with the cup reserved for jitter within a preset and for the enemy side.

### Maps are not random

A map is **authored and vetted**, identified by id, and identical every time it loads. It carries base terrain, deployment zones, and spawn zones. It is a **config dimension**, not a dice cup — you choose it, you record it on every result row, and when something surprising happens you can open that board and look at it.

Testing across maps means running against a **fixed panel** — a chosen set covering the shapes that matter (open, corridor, chokepoint, split approach, hazard-heavy) — the same panel every time, so results stay comparable across weeks.

If a map generator is ever built, it is an **offline tool producing map files**, gated by human review. The engine only ever consumes finished maps.

### Terrain events

A schedule event can reshape the battlefield — curse a swath across the centre, rain fire on twenty scattered hexes, freeze half the board, run a jagged path of cursed ground corner to corner. These fire at setup or on a scheduled turn.

Two separate rolls: **schedule event** picks what happens, **terrain event** picks where it lands — orientation, offset, starting corner, scatter positions.

The shapes are a small library of pure functions, `(board, params, roll) → HexId[]`:

| Model | Parameters |
|---|---|
| **Band** | width, angle, offset from centre |
| **Scatter** | count |
| **Half** | split line, angle |
| **Path** | start corner, end corner, jaggedness |
| **Disk / Ring** | centre, radius |

The same library serves the control card tier — walls, fire lines, and traps are Band and Path at a smaller scale — so a fire line card and a rain of fire are one piece of code with different numbers.

> This cup has more leverage on results than any other single roll, because it reshapes the whole board at once. If it isn't addressed structurally (turn number plus event index), paired runs will face different weather and every comparison measures the terrain instead of the treatment.

---

## Open

- **Cards** are deferred, but they are a **command type at the commander level**, not an option on the primary action. Whether a card can be played mid-activation or only between activations is an open question.
- **Do corpses and downed heroes block movement?** They're objects on the hex; whether they cost extra to cross, block entirely, or are free is undecided.
- **Wind-ups / telegraphed charge-ups: not in the game.**
