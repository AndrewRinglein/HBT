# Combat Sequence

*Heroes of Blight and Tragic — the order in which everything happens.*

This is the engine's skeleton. It says **what stages exist and in what order**, not what the rules are. Anything genuinely arguable is marked as a **switch**, because the harness exists to answer those.

**Every ladder and station table below carries a `Built?` column.** This document describes the *design's* sequence, and most of it is not yet code — without the column a reader assumes the whole thing runs. `MECHANICS-GAP.md` holds the same answer organised by system, plus the list of places where this document and the engine currently disagree.

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

| # | Rung | Built? |
|---|---|---|
| 1 | Roll enemy count *(dice cup)* | *not yet* — the roster is a fixed array |
| 2 | Roll wave composition *(dice cup)* | *not yet* |
| 3 | Roll placement *(dice cup)* | **yes** |
| 4 | Place heroes | **yes** |
| 5 | Reveal the battle condition | *not yet* |
| 6 | Fire `startOfBattle` triggers → **settle** | *not yet* — `onEnter` was retired 2026-08-15; this rung is the `startOfBattle` firing point, and also where permanent triggers granted at load first act (ruled 2026-08-15) |
| 7 | Calculate vision and stealth | *not yet* — there is no Vision stat |

---

## Start of Turn

| # | Rung | Built? |
|---|---|---|
| 1 | The wave schedule fires — this turn's spawns arrive → their `startOfBattle` fires (a spawn's battle starts when it arrives; `onEnter` is retired) → **settle** | *not yet* |
| 2 | Victory check | *not directly* — it happens only inside the settle another rung runs, so with nothing else happening, Start of Turn checks nothing |

> **CHANGED 2026-08-15 — bleed-out left this ladder.** Angela: *"Bleed Out counter should be five phases, but it only moves forward at the end of the hero phase."* It advanced here, once per Turn, at 3. It is now 5 and lives at End of Hero Phase — see rung 4b there. The rung moved, not just the number: a counter that ticks on both phases and a counter that ticks on one are different rescue windows, and only one of them is what was asked for.

---

## Hero Phase

A sequence of **Hero Activations and Card Plays, interleaved**, in the order the player chooses. The simulator approximates the ordering with a switch: `random` · `best-first` · `fixed`. When random, it draws from its own dice cup.

Downed heroes do not activate.

**As a Phase begins — the side step** *(built 2026-09-26, `ai.encounter-rules`; AI-DESIGN.md §4)*:
after `phase.begin` and before the Phase's first Activation, each coordinate rule of the running
encounter whose bound units stand on this side picks the side's focus (`ai.focused`). With no
encounter rule nothing runs. The Enemy Phase opens the same way. SWITCHES.md "Encounter AI rules".

### End of Hero Phase

The ladder is an **ordered list of named rungs supplied by config**, not six hardcoded calls — so reordering it is a sweep axis rather than a diff. *(Built 2026-09-25, fix.phase-ladder-config: `cfg.switches.endOfPhaseLadder` orders the built rungs — 4b, 5, 6 — and `phaseRungLog` names each in the log. SWITCHES.md.)*

| # | Rung | Built? |
|---|---|---|
| 1 | Auras resolve their end-of-phase effects on heroes still inside them | *not yet* — there is no aura type |
| 2 | Corpse effects for heroes standing on a corpse | *not yet* — nothing leaves a corpse |
| 3 | ~~Hero statuses tick~~ — **MOVED to the End of Activation ladder.** RULED 2026-08-26 (DECISIONS.md, verbatim from a replay finding): *"statuses are supposed to resolve at the end of each unit's activation... a unit can die at the end of its activation."* The phase ladder no longer touches statuses | **removed** |
| 4 | Hero durations tick down — travel with the per-activation status pass; `StatMod.expiresAtTurn` is filtered lazily on read | **half** |
| 4b | **Bleed-out counters advance on downed heroes → settle** | **yes** — hero phase only |
| 5 | Hero stamina regen | **yes** |
| 6 | Victory check | **yes** |

**Rung 4b is on the hero ladder and only the hero ladder.** Angela, 2026-08-15: *"Bleed Out counter should be five phases, but it only moves forward at the end of the hero phase."* So a downed hero has **five hero phases**, and the enemy phase — the one where nobody can reach her — does not spend the clock. Enemy-phase End of Phase runs the same ladder without this rung.

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

**An Activation is the TOTALITY of one unit's doing of things.** Ruled by Angela,
2026-08-21: *"You activate a unit by double-clicking on it. Now you get to do stuff.
You're going to do a bunch of stuff. When you're done, your activation is over. It is not
per power."*

```
Activation
  ├── movement, then the primary action
  ├── SURGE CHECK          heroes only; enemies never surge
  │      Surge Chance += Surge, roll against it (100 or more: no roll, it surges)
  │      HIT  -> gain 1 + Stamina Regen stamina, Surge Chance −= 100,
  │              go again from movement — STILL THE SAME ACTIVATION
  │      MISS -> Surge Chance persists; fall through
  └── End of Activation    ONCE, however many times you surged
```

**The surge check sits BEFORE the End of Activation ladder, and that is the whole point
of this section.** Angela: *"The end of activation shouldn't be triggering twice in a
single unit's doing of things… the action surge happens before all the stat effects that
are supposed to happen at the end of activation."*

**What this fixes.** The previous reading — Activation = *"movement, then the primary
action"*, with the surge check hanging off End of Activation — made a surged hero run the
End of Activation ladder **twice**. That is not a rounding error:

- `onActivationEnd` triggers fired twice, so a Pacer-style *"gain 1 Protection at end of
  activation"* paid double for surging.
- The **twelve** content effects on this ladder — the four immunity necklaces, `enchant.damned`,
  `item.healing-charm`, water stripping Poison — all cleansed twice.
- The terrain stack was taken at the hex you stopped on *mid-surge*, then again at the hex
  you finally stopped on, so a hero who surged out of a fire hex took the stack for a hex
  it had already left.

Under the corrected order every one of those happens **exactly once per unit per Phase**,
at the hex the unit finally stops on, no matter how many Activations' worth of doing it
packed into the one Activation.

**A surged Activation can surge again** — from what the Surge left (fix.surge-spend,
2026-09-28; SWITCHES.md `surgeRelinkReadsLeftover`): 150 surges, keeps 50, and the next
link rolls against 50 + `Surge`. Below 100 a Surge leaves 0 (`surgeSpendFloorsAtZero`), so
the next link is only as likely as `Surge` itself — at level 1 that is 1%.

**A stunned unit skips movement and primary action, AND the surge check** — there is
nothing to repeat, and a stunned hero winning a free Activation it cannot use is not a
thing anyone means. **The End of Activation ladder still runs**, which is what makes
`status.stun` cost exactly N Activations and not N Activations plus N ticks.
*(That last clause is a reading, not a dictation — flagged for Angela.)*

### Movement — per step

| # | Rung | Built? |
|---|---|---|
| 1 | Check movement points — enough to enter? | **yes** |
| 2 | Attacks of opportunity fire → **settle** | **yes** — leaving a zone of control draws each holder's **special free attack** (rule.free-attack-is-basic-attack, 2026-10-04): its basic attack — the first action of the weapon in hand, when that is a melee attack — else its own unarmed attack (Punch), through THE attack function as a reaction: no Stamina asked for or spent, −20 Accuracy (`FREE_ATTACK`, a named row of the accuracy ladder), the declared line marked `free`. A hit ends the mover's movement. `src/core/free-attack.ts` |
| 5b | **Fend** → **settle** | **yes** — capability.counterattack-and-fend (2026-10-04): after the mover has entered a hex and met its ground, each standing enemy whose zone of control it has just walked INTO (it was outside that zone on the hex before) and whose `fend` stat is above 0 makes its special free attack on it — the same free attack as rung 2, plus its `fendAccuracy`; once per fender per walk; a hit ends the movement on that hex. A sidestep, a flight and a walk that ignores zones of control draw none. |
| 3 | Enter the hex, spend the points | **yes** |
| 4 | Traps → **settle** | *not yet* |
| 5 | Gain terrain status from the hex | *not yet* |
| 6 | Recalculate vision and stealth | *not yet* |

**The "Built?" column is not decoration.** This ladder was read as a description of
what the engine does, and four of its six rungs are reserved slots — `movement.ts`
has the comments marking where each goes, and nothing else. A sequence document that
does not say which rungs exist will be believed. Every ladder and station table in
this document now carries the same column for the same reason — added 2026-08-15,
when the claim that they already did turned out to be true of this ladder only.

Repeat per hex. Vision and stealth recalculate after **every** step, after everything else in that step. Reveal auras (e.g. *reveal all stealth within 4*) are evaluated here too.

**An Activation is one move action and one primary action, in that order** (rule.one-move-action-one-primary-action, 2026-10-06;
DECISIONS.md 2026-10-06 "an Activation is one move action and one primary action, in that order; …": "All the player units get two actions: a move action and a primary action, in that order, every time they get activated. You shouldn't need to additionally author something of 'Oh, there's only one move action.' … That's fundamentally how this was built: there's a move action and a primary action."). **Built: yes.**
One rule, in the one slot resolution (`action.ts resolveActionSlot`), for every unit: a **move-class action** — a unit's
Move, every special move, the stand: a movement that is not a charge — is only ever taken as the **move action**. The
primary action never takes one: not asked for, and not as a fallback once the move action is spent (until this date a
walk, or a second movement power, could be taken "as its primary"). Once the move action is spent no move-class action is
legal in that action cycle, refused with `movement-slot-closed` — **except the rest of the walk that is that move action**:
a walk begun (a hex entered) and stopped short may be walked on with the movement left, in the same move action, spending
no primary action and with no bonus movement a second time. The primary action ends the action cycle, as it did
(rule.primary-ends-activation), so the order is the structure's own: after it nothing is legal; a unit may skip either
action. A Surge reopens the cycle whole. This **subsumes** the two paragraphs below — the walked unit's other movements
and the stood unit's every movement are closed by the slot itself (`closedByWalk` and `Unit.stood` are gone) — and
corrects one clause of the first: the rest of a walk cut short is the move action still, **not** the primary action. The
2026-08 law "there are two actions in every activation: movement and primary … structurally identical" stands for limits,
costs, cooldowns and uses (an action is one type), and is narrowed in this one way: a move goes in the move action.

**A prone unit only stands, and standing is its one move** (rule.prone-only-stand-up, 2026-10-05; DECISIONS.md 2026-10-05 "a
prone unit only stands; Stand Up is its one move; …": asked whether a knocked-down unit should be refused its attacks and
powers too until it stands — "yes, it cannot use attacks or powers until it stands."; asked whether it may walk after Stand
Up — "No, you only perform one move action."). **Built: yes.** A unit holding a status that carries the prone rule is
refused **every action but the stand that status grants** — by the one limits check (`action.ts actionReady`), so the
action list, the computer and a special free attack all follow; the command checks give it its own reason, `actor-prone`.
It makes no special free attack while down (it already held no zone of control, and going down already took the
counterattack or fend it had up; one on its own row or gear is not made either). The stand marks the unit `stood`
(`mutate.ts standUp`), and from then until that action cycle is over **no movement is accepted from it, its walk
included** — refused by the one movement legality with `movement-slot-closed`, as after a walk. Its attacks and powers
open the moment it stands. A charge is one of the unit's attacks, as under the walked rule. The fact is cleared where
`walked` is: at the start of an Activation, at its end, and by a Surge. A unit knocked down after its movement action is
spent cannot stand in that cycle and does nothing more in it.

**A unit that has walked has moved** (rule.walked-unit-has-moved, 2026-10-04; DECISIONS.md 2026-10-04 "after the backlog run: …
moves are refused once a unit has walked …": asked "Once a unit has walked, should Leap and Side Roll grey out and be
refused?" — "2 yes"; with 2026-10-03 "Just gray the moves out after a move is done"). **Built: yes.** A unit's *walk* is its
first path-shaped movement, in its own order (`action.ts walkOf`). The step that enters a hex with it (rung 3) marks the
unit `walked`, and from then until that action cycle is over **no other movement is accepted from it** — a Leap, a Side
Roll, a Sidestep, a Back Flip, a Charging Run, a flight, a zero-hex move — refused by the one movement legality
(`movement.ts movementReason`) with `movement-slot-closed`, the refusal a spent movement slot gives. **The walk itself is
not closed:** the rest of a walk cut short may still be walked (as the primary action, as before). A movement used
*before* any walk marks nothing and closes nothing: what follows it is the action-slot rule's, unchanged. A walk that
enters no hex (stopped on its first step by an attack of opportunity) is no walk. The fact is cleared at the start of an
Activation, at its end, and by a Surge ("go again from movement"). A charge is one of the unit's attacks and is not a
movement here.

### Primary action

Attack or class power.

**Counterattack** (capability.counterattack-and-fend, 2026-10-04; DECISIONS.md 2026-09-28: "set off by being attacked, not by
being hit, blocked, or dodged" — "once per enemy action … all three of their attacks will resolve, and then you will get your
one counterattack"). After an attack made on the attacker's own Activation has resolved WHOLE — every hit, its KDB check, its
Destroy — and settled: if it was a melee attack, the attacker still stands beside the unit it attacked, and that unit still
stands with its `counterattack` stat above 0, the unit makes its special free attack on the attacker (the basic attack, no
Stamina, −20 Accuracy, plus its `counterattackAccuracy`), then settle. A burst is not an attack and draws none; a special
free attack (an attack of opportunity, a fend, a counterattack) is never answered.

**A special free attack that is up is replaced, and can be lost** (rule.counterattack-replaced-and-lost, 2026-10-04;
DECISIONS.md 2026-09-28, the Armory Ledger's rules: "A new counterattack replaces the old one. Knocked down, knocked back or
moved by an enemy's power: it is lost."). **Built: yes.** A counterattack or a fend a unit has *up* is the stored modifiers
a power put on that kind's stat and on its Accuracy stat (`special-free-attacks.ts`); a number on the unit's own row or gear
is not one of them.
- **Replaced.** A power that grants the kind first takes away the one its receiver has up — before any of the power's own
  effects (`ability.ts performEffects`): the kind's two stats, and every other modifier the older grant put on with the same
  source and the same lifetime (its riders). The newer power's numbers stand alone — never a sum.
- **Lost.** A unit that goes prone (`status.ts`, at `unit.proned`), or is put on another hex by anything but its own movement
  (`mutate.ts knockUnit` — the one mutator for it; a push that moved it nowhere loses nothing), loses the kind's two stats.
  What else the power gave stays until its own end.
- Each modifier that goes is one `statmod.expired` line — after the line that caused it, under that line's cause — carrying
  `reason` (`replaced`, `knocked-down`, `knocked-back`) and `lost` (the kind). A counterattack and a fend are two things:
  putting one up leaves the other; a knock takes both.

**A timed effect is a status** (capability.effect-lasts-activations, 2026-10-05; DECISIONS.md 2026-10-04 'his 28 reward weapons
read back …': "We need: … time / number of activations for a duration"). **Built: yes.** A status row may LEND its holder, while
it is above 0: triggers (fired as the holder's own, after its own in the roll's slot order — a chance, a tag requirement and a
scaled value as on any trigger), flat stat changes, and a stat DOUBLED — that stat's own value, as the unit was fielded, added
to it once (an add; Law 7). And it may COUNT DOWN by something other than the Phase (such a row has no Phase decay): by its
holder's Activations (rung 0 of End of Activation, below), or by its holder's attacks — 1 after each attack made, every hit of
it resolved, and only an attack that carries the row's tag when it names one (`pipeline.ts performAttack`). A row with
neither lasts the Battle. A power puts one on with the existing "apply a status" effect; renewed, it returns to its count
(`stacking: 'highest'`). Nothing new is logged: `status.applied`, `status.reduced`, `status.expired`.

### Surge check

| # | Rung | Built? |
|---|---|---|
| 1 | `Surge Chance += Surge`, roll against it. **Heroes only** | *not yet* — Surge is a stat with no roll behind it |
| 2 | On a hit: `+1 + Stamina Regen` stamina, **`Surge Chance −= 100`** (it does not empty; 150 surges without a roll and keeps 50 — ruled 2026-09-27, Andrew, DECISIONS.md "Surge: a pool that pays 100 per Surge"), **loop back to movement**. Below 100 it stops at 0 (SWITCHES.md `surgeSpendFloorsAtZero`); the amount carries to the next check and the next Turn; `surge.checked` and `surge.hit` log it `before` and `after` | **yes** — fix.surge-spend, 2026-09-28 |

**This runs before End of Activation, not after it.** Ruled 2026-08-21. Putting it after
is what made the ladder below fire twice for a surging hero.

### End of Activation

**Runs exactly ONCE per unit per Phase**, after the surge loop has finished — not once per
movement-and-action cycle.

| # | Rung | Built? |
|---|---|---|
| 0 | **The statuses counted by Activations lose one** — each status the unit holds whose row says `countsDown: 'activation'`, by 1, in status-id order; one put on (or renewed) during this very Activation is not counted ("your NEXT 3 Activations") | **yes** — capability.effect-lasts-activations, 2026-10-05. First of the rungs, so "until the end of your third Activation" ends exactly here. `status.ts countDownByActivation` |
| 1 | Standing on a hex carrying a terrain status → **gain a stack** (strips first, then applies) | **yes** — the two-beat rhythm since 2026-08-20 |
| 2 | `onActivationEnd` triggers fire | *not yet* — **the hook exists and is never called.** `fireTriggers(ctx, 'onActivationEnd', …)` appears nowhere in `src/` |
| 3 | **THE STATUS TICK** — damage, healing, decay, expiry, per unit → **settle** | **yes** — RULED 2026-08-26, moved here from End of Phase. Runs after the terrain rungs (reach water and Burn is shed before it deals this activation's damage; stand on embers and you catch before you cook). A unit can die at the end of its own activation. When Surge lands, the whole ladder waits for the surge loop (2026-08-21): a surged unit never ticks twice |

Rung 1 is the second of the two applications: once on entering during movement, once here. Move through a fire hex and you took one stack. Move onto it and stop, and you took two. **"Stop" means where you finally stop** — a hero who surges and moves on has not stopped. The statuses themselves don't tick until End of Phase.

Rung 2 is the reason this ladder needed the column. `onActivationEnd` is in `HOOKS`, is validated, is in the glossary, and has a written ruling banning `turnEnd` as its name — and nothing fires it. A hook in that state is indistinguishable from a working one until a piece of content depends on it.

---

## Attack

An attack is a list of hits, resolved **one at a time**. Each hit runs the full cycle — damage, triggers, settle — before the next hit begins.

### V2 Block first cup (2026-09-18)

Before the per-hit ladder below, a legal hit freezes the defender's effective
Block (melee) or Ranged Block (ranged), rolls its separate cup, and emits
`block.rolled`. Zero/suppressed chance logs a null roll without drawing.
Unconditional `onAttack` still fires next. A successful block then fires defender
`onBlock`, attacker `onBlock`, attacker `onMiss`, and returns to the caller's
settlement; accuracy, criticals and weapon damage are skipped. Failed Block
continues at the accuracy rung. Each multihit and reaction uses this same path;
bursts do not. Stun uses explicit `blocksBlock`, independent of `blocksAction`.
See V2-BLOCK.md and SWITCHES.md for provisional details and verification.

### Per hit

| # | Step | Built? |
|---|---|---|
| 1 | **`onAttack`** — fires the second the swing begins. It has nothing to do with hitting or missing, so it cannot be bundled with the hooks that do | **yes** |
| 2 | To-hit roll *(dice cup)* → hit or miss | **yes** |
| 3 | On miss: `onMiss` → **settle** → done | **yes** |
| 4 | Crit roll *(dice cup)*; on crit, `critBranch` *(damage or injury)* then `critInjury` *(which one)* — two cups, because the branch weights and the injury table are tuned independently | **yes** — station.crit 2026-08-27: `crit-branch` flips per victim side (critChartSplit, 25/50 chart share), `crit-effect` rolls evenly among the ten ruled chart rows (`rollCritEffect`), and `critEnabled` defaults ON |
| 5 | **`onCrit`**, if it crit — fires the instant the crit is confirmed, before the damage stations. A crit is a thing that happened, not a size of number | **yes** |
| 6 | Run the damage stations | **yes** — 7 of 10, see below |
| 7 | `onHit` | **yes** |
| 8 | Apply the damage | **yes** |
| 9 | If damage ≥ 1: **`onDamage`** *(the attacker's)* → **`onTakingDamage`** *(the **victim's** — its owner is the unit that was hit, so a retaliation aims back at the attacker)* | **yes** |
| 9b | **Thorns** — a connecting **melee** hit on a unit with Thorns N, made by an attacker **in the next hex**, costs the attacker N true damage (not gated on damage dealt). The adjacency is read as the hit lands, before anything the hit does can move either unit — the number the preview gave | **yes** — v2.thorns 2026-09-24; the adjacency is rule.counterattack-replaced-and-lost, 2026-10-04 (the Armory Ledger's rules: Thorns needs a hit from an adjacent melee attacker — a melee attack that reaches two hexes, from a wall or a tower, is out of the spikes' reach). `src/core/thorns.ts` |
| 10 | **`onKill`**, if the target died — *the **killer's** hook* | **yes** |
| 11 | **Settle** | **yes** |

An attack may author multiple hits. Each resolves and settles before the next;
the first pays once, and later hits stop when attacker/target no longer stands.
Aggregate connection means any hit connected; per-hit results remain available.

### Hex-targeted bursts

V2 sections 4/7/15/18 retire area attacks. Their replacement is a separate
hex-targeted action with no attack hooks or hit/crit/block rolls. See the
V2 burst resolution ladder below and V2-BURSTS.md for current behavior
and verification; the old attack-based path survives only in Git history.

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

**A trigger may be scoped, and the scope is read before anything rolls** (`trigger.ts fireTriggers`). `onlyWithAttack` (2026-08-20):
it fires only when the cause IS that attack. `onlyWithTag` (capability.unit-trigger-with-tag, 2026-10-04; DECISIONS.md "after the
backlog run: … a trigger on the hero with a tag requirement …": "it only triggers when you're using something that has the tag
melee"): it fires only when the cause is an action that carries that tag — the tag is in the action row's `tags` (an attack's own
Codex tags and its weapon's, written by the pack compiler), and a row that states none carries its kind, melee or ranged
(`action.ts carriesTag`, the one reader). **Built: yes.** With both, both must hold; with neither, every attack of the unit, as
always. A scoped trigger that does not apply is not rolled and logs nothing: it was never in question. On a cause that is no
action (the end of an Activation, a death) a scoped trigger never fires.

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
excludeSelf : area only. true = "every OTHER unit within N" — the one acting is not in its own area
requireTags : legality, not preference — "target undead" is NOT CASTABLE
              with no undead on the board, answered before stamina is spent
```

**The actor is always one of its own allies. There is no opt-out.** *(Angela, 2026-08-15: "I don't think we're ever gonna use exclude self. Because it's already either including or excluding heroes or things by target, but I don't think self will ever be one of those.")* An `excludeSelf` flag existed and was deleted — side and `requireTags` are the two axes an effect discriminates on, and "everyone but me" is not a third one. **Side still never excludes the actor. Since 2026-10-03 one opt-out exists, stated on the row: an area's `excludeSelf: true`** *(Andrew, DECISIONS.md "the Fire Imp's burn does not hit the imp itself": "It should not hit him.")* — the Codex phrase "every other unit within N hexes"; everyone else in the area still takes the effect, the owner's own side included. The Fire Imp's end-of-Activation Burn is the row that authors it (fix.fire-imp-burn-spares-self).

An unknown select, side, origin or an empty tag **throws at load**. §5's first
"do not port" is Hell TCG's silent fallback, where a mistyped target quietly resolved
to the trigger's owner and every typo became a self-target.

### Accuracy stations

To-hit is now the core roll of the game and its **final output feeds the crit formula** — surplus Accuracy above 100 becomes Crit. So it needs the same treatment as damage: a spaced station table, and a ledger per roll.

| # | Station | Built? |
|---|---|---|
| 100 | BASE — the attacker's Accuracy | **yes**, plus a `BASE_MOD` row per stat modifier |
| 200 | RANGE — −5 per hex past the first, for ranged | **yes** |
| 300 | ADJACENT — −20 for firing while **you** are adjacent to an enemy | **yes** — see the ruling below |
| 400 | TERRAIN — the target's occupied-hex modifier | **yes, revived 2026-09-24 (v2.ground-table)** — V2 concealment, COMBAT-V2 §3.2: the ground the *target* stands in, by attack kind (grass/wheat/bush −10 ranged; woodland −15 ranged, −7 melee). Same rung, row `ELEVATION`: the *shooter's* hills, +10 to ranged attacks only (v2.retire-forest-hills, Andrew 2026-09-24). The remaining occupant stat mods (rocky, ruins, water, marsh, desert) still arrive as `BASE_MOD` |
| 425 | STRUCTURE — the target's wall (−20), tower (−25 flat) or house (−10), against an enemy not in the same kind of structure | **yes, 2026-09-25 (v2.structures)** — Andrew, DECISIONS.md 2026-09-24. Every attack kind. One `STRUCTURE` row naming the structure. The same guard adds the house's +5 Dodge as its own `TARGET_DODGE` row (600), the wall's +10 / tower's +15 to Block **and** Ranged Block (a ledger row in `resolveBlock`, which the Block roll reads), and the tower's +1 Armor as a `STRUCTURE_ARMOR` row at MITIGATION (600). The occupant's own +5 (wall) / +10 (tower) accuracy arrives as `BASE_MOD`; its +1 / +2 reach at `reachOf`, for every attack |
| 450 | OBSTRUCTION — −5 per thin-obstruction hex a **ranged** shot enters | **yes, 2026-09-24 (v2.thin-obstruction)** — every hex the shot passes through AND the target's own, never the shooter's (Andrew, DECISIONS.md "the ground table, re-ruled"). One `THIN_OBSTRUCTION` row per hex, naming it. Every woodland hex is one. The same thin obstructions cut Vision by 1 each between a unit and a hex (`vision.ts` `withinSight`) |
| 500 | CONDITION — fog, snow, darkness | **half** — `TARGET_DOWNED` (+20 against a downed hero, fix.downed-targetable) writes here; fog, snow and darkness do not yet. This is where the whole battle-condition system lands |
| 600 | TARGET_DODGE | **yes** — and, against a special free attack only, the row `FREE_ATTACK_DODGE`: the target's `freeAttackDodge` stat, naming the unit (capability.free-attack-accuracy, 2026-10-04) |
| 700 | SITUATIONAL — the design's open melee penalties land here | *not yet* — and it is where **every** attack-level accuracy modifier goes: the AoO's −20, flight's −30, a per-attack ±. `AttackDef` has no `accuracy` field to feed it |
| 700 | SITUATIONAL, the special free attack's rows — a counterattack, a fend, an attack of opportunity (`mode: 'reaction'`) | **yes** — in this order: `FREE_ATTACK` −20 (rule.free-attack-is-basic-attack); `FREE_ATTACK_BONUS`, the kind's own Accuracy stat — `counterattackAccuracy` or `fendAccuracy`, what a power lends and what gear carries ("'+10 counterattack' on a weapon is +10 Accuracy on your counterattacks"), one row for their sum, naming the kind's rule; `FREE_ATTACK_ACCURACY`, the attacker's `freeAttackAccuracy` stat — every special free attack, the attack of opportunity included ("Bonuses 'to special attacks' … apply to all three") — capability.free-attack-accuracy, 2026-10-04 (DECISIONS.md 2026-09-28, the Armory Ledger's rules). They add; nothing replaces anything |
| 900 | FINAL | *not yet as a row* — the clamp happens in `preview()` and emits no ledger line |

> **RULED 2026-08-15.** Angela: *"You cannot use a ranged attack on something adjacent. You can use a ranged attack on something not adjacent at −20."* Matching `GAME-DESIGN.md` §4.
>
> Two separate rules, and they live in two separate places:
>
> - **Legality** — a ranged attack may not target a unit at distance 1. Answered in `canAttack`, so the shot does not exist rather than being a bad shot. The shooter falls back to a melee option.
> - **Penalty** — −20 when a living enemy is adjacent to the **shooter**, whatever the shooter is aiming at. It reads the shooter's surroundings, never the target's distance.
>
> The engine had this inside out: it charged the −20 for shooting the adjacent enemy — the shot that is now illegal — and charged nothing for shooting *past* one, which is the entire case the rule exists for. **Both halves were wrong at once, which is why no test caught it: the penalty was always being paid by somebody.**
>
> A second thing fell out of fixing it. `ADJACENT` could not be probed for, because **the accuracy ledger was computed and never emitted** — this document said *"the accuracy roll carries the same [ledger]"* and no event carried it, so no log could say why a hit chance was what it was. `attack.declared` now carries `accLedger`. A station nobody logs is indistinguishable from a station nobody runs.

**Do not clamp the Accuracy value.** The *roll* clamps to 0–100; the value must not, because Crit reads `(final Accuracy − 100) ÷ 4`. Clamping the value silently kills Design Law 21 — the point-blank +10 crit the design promises becomes +0, and no test would catch it.

### Damage stations

Numbered with gaps on purpose. Ordering is a property of the **station**, not of the effect, and a new station can be inserted at 425 without renumbering anything.

| # | Station | Built? |
|---|---|---|
| 100 | DECLARE — the attack's base damage, type, and which stat it uses *(punch: −1, physical, Strength. Longsword: +1, physical, Strength.)* | **yes** |
| 200 | SOURCE_STAT — add the unit's modified Strength or Precision | **yes** |
| 200 | SOURCE_STAT, the rest of the sum — an attack's damage is a **sum of terms**: its own stat counted as many times as its row says (`statMult`: "twice your Precision"), then one row `SOURCE_STAT_ADDED` per added term (`addsStats`: a stat times a whole multiple over a divisor of 1 or 2, rounded nearest with 0.5 up). **Magic and Spirit are the party's** — the side's total, the number every "the party's Magic" reads — and the row names it `party.magic`; any other stat is the attacker's own, resolved. One damage of the attack's type: mitigation comes off the whole sum once | **yes** — capability.damage-from-two-stats, 2026-10-05 (DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We do need that."; 'the Force Staff is Precision plus half Magic, as magic damage'). `pipeline.ts resolveSourceDamage` |
| 250 | SOURCE_STATUS — what the attacker carries that lowers its own damage | **yes** as a station; **no status declares `reducesOutgoingDamage`**, so it has never run with a live value |
| 300 | TERRAIN | **retired** — terrain moved into the stat pipeline; nothing writes a damage row here. (ACC.TERRAIN, retired with it, was revived for V2 concealment 2026-09-24.) `UNWIRED_STATIONS` in `pipeline.ts` names every station with no writer, `retired` or `notYet`, and `test/station-tables.test.ts` holds it to the code |
| 350 | POSITIONAL — flank | *not yet* — nothing computes facing or flanking |
| 400 | **VS_TARGET** — slayer bonuses, *+2 vs undead*, damage by target type (a tag) or by status on the target. Reserved 2026-08-20; built 2026-09-25 at **400**, before CRIT so a crit multiplies it (the amendment's 500 kept the reason "crit-amplified" and is now `DMG.PRONE`'s) — SWITCHES.md `vsTargetStation`. One ledger row per matching rule, naming the badge or item. A flat add only — no percentages (Andrew 2026-09-25, DECISIONS.md) | **yes** — badges, held items, and worn items (the bloodrunes, `loadout.worn`, since fix.vs-target-worn-and-flat 2026-09-25); bursts not yet (`vsTargetReach`) |
| 450 | CRIT — the +50%, before all mitigation | **yes**, behind the `critEnabled` switch |
| 550 | PROTECTION — consumes; see below | **yes** as a station; **no status declares `reducesIncomingDamage`**, so it has never run with a live value |
| 600 | MITIGATION — Armor (physical) or Resist (magic); true damage skips both | **yes** |
| 700 | FLOOR at zero | **yes** |
| 850 | APPLY | *not yet as a row* — `applyDamage` is a mutator, not a ledger step |

> **`usePower` does not run this table.** `ability.ts:resolvePowerDamage` is a second damage pipeline: DECLARE → SOURCE_STAT → MITIGATION → FLOOR, skipping SOURCE_STATUS, POSITIONAL, CRIT and PROTECTION. So Weakness would not reduce a power's damage and Protection would not absorb one. Constitution Law 1 says one damage function; there are two.

**Protection is a depleting pool that also decays.** It is a status the hero carries — granted by an aura, a card, anything — not a question asked about the granter's position. It reduces incoming damage *and* is reduced by the damage it absorbs: `absorbed = min(protection, damage)`, then `protection -= absorbed`. On top of that it loses 1 at End of Phase. Damage burns it fast, time burns it slowly.

Because it is consumed, it must be **stored** — a derived "am I near the cleric right now?" check has no memory and cannot work. This is the general shape for shields and wards too.

**Switch:** `protectionStacking` — a pulse of 2 onto a hero holding 1 gives either 3 (add) or 2 (take highest). These behave very differently when a cleric pulses every phase.

**One rounding rule, everywhere:** integer division, truncated. The +50% is `(dmg * 3) / 2` floored — a 3-damage punch crits for 4, not 5. `roundUp` is a switch, because against armoured targets with multi-hit weapons it genuinely moves numbers.

Armor applies **per hit**, which is what makes split attacks a real tradeoff.

### A Hit is a structure, not a number

Each Hit carries an append-only ledger — one row per station that touched it: `{station, effectId, before, after, delta}`. The accuracy roll carries the same.

That is the whole mechanism behind *"how much damage did protection absorb"*: it's a `GROUP BY`, for every effect, forever, with no per-effect instrumentation. One assert per hit keeps it honest: `base + sum(deltas) === applied + overkill`.

Triggers are not stations. Damage resolves completely, then triggers fire.

**Status ticks are mitigated by Resist** *(ruled 2026-08-20)*: per-tick damage =
`max(0, value − Resist)` for Burn and Poison — **never Bleed** — and Resist never
touches the status value, which decays on its own clock. The canonical verify
scenario, 5 Poison vs 2 Resist: take 3, 2, 1, 0, 0 as the value walks 5→4→3→2→1→0.
A resisted status runs its full clock. Built: `statusDamage` mitigates by the
row's `tickDamageType` (magic → Resist, physical → Armor, true → nothing;
fix.status-damage-types 2026-08-27).

**Bleed is a magnitude that healing cures** *(Codex S41/S43, ruled; engine
fix.bleed-magnitude 2026-09-02)*: the tick is TRUE damage equal to the value —
the old flat 2 is gone — and every heal the unit receives removes Bleed equal to
half the healing, rounded nearest with 0.5 up, inside the one heal mutator.
Burn halves the heal first, so a burning unit sheds a quarter. Regeneration is
healing, so its tick sheds too. Which base the half is taken from at full
health is `bleedShedFromLanded` (SWITCHES.md).

**Switches:** `recomputeStatsBetweenHits` (does a strength gain from hit 1 apply to hit 2?) · `multiAttackRetargets` (if the target died, does hit 2 retarget or fizzle?)

---

## Death and the downed

**Enemies have no consequence stack.** Zero HP means dead, and the body becomes a corpse.

**Heroes** roll Deathbed at zero and either stand or fall.

**An afflicted hero's 0-Health rule comes first** *(Andrew, DECISIONS.md 2026-10-01 'the afflictions at 0 Health'; rule.afflictions-at-zero-refiled, 2026-10-02)*: Vampirism and Lycanthropy roll no Deathbed — the hero becomes the Vampire or Werewolf at full Health and rolls Luck (kept: a player unit that dies at 0 again; failed: an enemy unit that, beaten to 0, falls in the hero's form and bleeds out); Possession rolls no Deathbed — the hero goes down and bleeds out and a Ghost rises beside it as an enemy; Rotting Flesh rolls as normal and gains Fragile on every zero. A hero still transformed when the battle ends is itself again. The bleed-out counter is the unit's stat — 5, plus its bleed-out (Rotting Flesh +5).

**`lifeState` is an explicit field** — `Standing · Downed · Stabilized · Dead` — never inferred from `hp <= 0`. HP is clamped at 0 while Downed, and standing back up requires an explicit `reviveUnit` mutator. Without this, healing a downed hero for 4 leaves her flagged downed and bleeding out at 4 HP, and auto-standing on any heal makes a 1-point heal cancel the entire consequence stack.

**A downed hero** is deliberately simple in the first model:

- No stat modifiers, no triggers, no aura pulse.
- **Bleed-out advances at End of Hero Phase, and nowhere else. The counter is 5.** *(Angela, 2026-08-15. Was 3, at Start of Turn.)*
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

Fourteen cups. **Five have ever been drawn.**

| Drawn today | Declared in `STREAMS`, never drawn |
|---|---|
| to-hit · crit · **trigger** · enemy placement · **hero deployment** | crit effect · Deathbed Fighting · schedule event · wave composition · enemy count · terrain event · card draws · AI tiebreak · activation order |

The names being right is worth something — the key-collision assert will catch a mis-keyed draw the day each one is first used. But nine empty cups is the honest measure of how much of the battle model is not yet running, and a reader of this section would otherwise assume all fourteen were live.

**The trigger cup's key carries the trigger's SLOT on its owner.** Two 20% triggers
on the same hit — a zombie with poison *and* weakness — would otherwise draw the same
key, return a bit-identical value, and always fire together: two 20% triggers
behaving as one. Verified at 4% both / 32% exactly one, which is what independence
looks like.

**`onDodge` draws no cup** *(ruled 2026-08-20)*: it reads the existing to-hit
roll. A miss whose roll lands in the dodge-sized band at the deep end of the miss
range — engine convention: `miss AND roll > 100 − dodge` — was caused by Dodge and
fires the hook. One roll, one cup, never a second.

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

### Items are applied at fielding (2026-09-02, seam.items-per-unit)

Ruled 2026-09-02 (Andrew): *"the items should go into battle … They define what
attacks they have. They modify stats."* A hero row is BARE — the Codex body,
Punch and its own riders — and carries `defaultItems`, the Codex kit. At
fielding, `applyItems` (one function; `fieldedDef` and the battle share it)
applies the kit `BattleOptions.heroItems` hands over, else the default:
attacks are the items' grants in item order then the row's own; powers the
same; triggers the row's then the items', sourced by the item; stat deltas fold
additively; role follows the kit and ai follows it unless the row authored one.
The log carries one `unit.equipped` per (unit, item) after `unit.enter`.
Refused loudly: an unknown item, more than two hands of weapons, two armors, a
mismatched list. Enemies carry no items.

**A unit an encounter places fields the kit its row carries (2026-10-03, fix.civilians-field-kit).**
Ruled 2026-10-03 (Andrew, DECISIONS.md 'every civilian fields its kit by default when an encounter
places it'): *"all of the civilians, by default, should field their kit the first time they're
loaded"* · *"If enemies have weapons assigned, they need them also when they come into play."* An
encounter's setup unit and a scheduled arrival go through the same assembler (`fieldArrival`): a row
with `defaultItems` fields them — one `unit.equipped` per item after its `unit.enter`, as a hero's —
and a row with none is fielded authored whole. No bestiary row carries a kit today, so "Enemies carry
no items" above still describes every enemy; it is no longer a rule. A listed enemy (a battle's
`enemies`) and a form (a hero transformed at 0 Health) are assembled authored whole, as before.
SWITCHES.md "fix.civilians-field-kit".

**Per-unit mods, after the items (2026-09-25, seam.unit-mods).** `BattleOptions.heroMods`,
parallel to `heroes`, carries the numbers the kingdom resolved for one fielded hero — its set
bonuses (GEAR-DESIGN.md §5): stat mods naming their source, stored as StatMods so the stat
ledger names the set (Max Health, Max Stamina and Regen fold onto the unit's fields), and
+damage on one carried weapon, a `WEAPON_BONUS` row at DECLARE for that weapon's attacks while
it is in hand. One `unit.modified` per (unit, source), after the unit's badge lines. Absent =
nothing changes. SWITCHES.md "Per-unit mods at fielding".


## V2 burst resolution (2026-09-16)

COMBAT-V2-DESIGN sections 4/7/15/18 supersede legacy arc/blast attacks. A burst command names a centre hex. Validate range, hex visibility, high LOS, floor and shared action limits before spending anything. Freeze origin, shape hexes, source packets and eligible stable UIDs/recipient geometry; spend the action once and emit burst.declared. In UID order, skip recipients already dead/zero, emit shielding for high intersections, otherwise apply one stacked low-prop attenuation budget across ordered damage packets. Positive exposed payload invokes defender onBurst once; its actual effects precede planning. Stable authored burstScale saves floor covered source damage. Shared Frost (once), Protection and each typed defense resolve the actual rung. Spend pools once, apply ordered packets, then healing; emit exact burst.struck facts. After the last recipient, Destroy reaches every prop touching the shape; then a burst whose profile names a ground layer (`paints`, capability.burst-paints-ground, 2026-10-04) paints every hex of its shape through `paintGround` — shielded or not, a unit there or not — and each standing unit on a painted hex takes that layer's entry beat. Settle after the complete burst, retaining onDeath and ordinary battle-result XP. There is no attack hook, hit/crit/block roll, or burst KDB in this stage.

Public previews never execute future onBurst hooks: numbers are current-state/conditional. See V2-BURSTS.md for explicit zero/negative exposure, endpoint cover, moved targets, new summons, caster death, Taunt/Powers Locked, mixed damage/healing and packet-source policy.
