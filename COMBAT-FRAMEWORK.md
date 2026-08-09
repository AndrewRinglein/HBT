# The Combat Framework

*The combat system for Heroes of Blight and Tragic — engine, simulator, and the apparatus for finding out whether the game is any good.*

> *"Casualties: within projections. The projections were grim."* — the Chronicler
>
> *(This line named the system before the rename. Kept because
> it is still the best one-line statement of what the simulator is for.)*

**Start here.** This is the entry point. The other two documents are reference.

---

## What this is

One combat engine, used three ways.

The engine takes **commands** — *move this hero along this path, attack that unit, play this card, end phase* — and emits **events**: *hit for 7, poison applied, hero fell.* It has no idea whether those commands came from an AI or a mouse.

| | Commands come from | Events go to |
|---|---|---|
| **Simulating** | AI | a log |
| **Watching** | AI | the screen |
| **Playing** | a human | the screen |

That's the whole design. Poison gets written once; the sweep tests it, watch mode shows it, the game plays it. There is no porting step because there is nothing to port.

The point of the simulator is that **design and balance are most of the work**, and simulating a thousand battles answers in minutes what playing them answers in months.

---

## The parts

| Package | What it holds |
|---|---|
| **core** | The rules. State, commands, events, the stations, settle, the ladders. Imports nothing. |
| **content** | Units, weapons, effects, maps, encounters. Mostly data; effects are code modules. |
| **ai** | Behaviour modes that turn a board into commands. |
| **sim** | Runs battles in bulk, varies one thing, writes logs. |
| **analysis** | Turns logs into a dashboard and a queryable database. |
| **view** | Draws a battle from its event stream. Later. |

`core` is the only one nothing else may reach into sideways. Everything imports it; it imports nothing.

---

## The four shapes

Every status in the game is one of four things. Get these right and poison, burn, protection, regeneration, weakness, stun, dazed, and the ninety effects that don't exist yet are all just rows of data.

| Shape | Behaviour | Examples |
|---|---|---|
| **Modifier** | A number that changes something while it's there | Weakness, stat buffs, aura bonuses |
| **Pool** | A quantity that gets **spent** when something consumes it | Protection, shields |
| **Counter** | Ticks down, does something each tick | Poison, burn, regeneration, stun, bleed-out |
| **Flag** | On or off | Stealthed, dazed, airwalking |

Each status declares **how it stacks** (add · take highest · independent · refresh) and **what it does at End of Phase**. Both are data, not code.

A Pool is the shape that forced a structural decision: the damage pipeline needs stations that *spend* something, not only stations that subtract. Protection reduces a hit and is reduced by it.

**Anything can grant a status** — an aura, a hit, terrain, a card, a trigger, a badge, an item. The granter is recorded so damage can be attributed back to it, but it never affects ordering.

---

## Two kinds of listener

The distinction that keeps a hundred interacting effects tractable.

**Things that change a number** slot into a numbered station in the accuracy or damage pipeline. Ordering is a property of the station, never of the effect.

**Things that make something happen** — apply poison, heal allies, spawn a corpse — go in a queue and run afterward.

> **Nothing interrupts a hit in progress.** Triggers queue and fire between hits, never inside one.

Where a trigger came from — weapon, trinket, class power, badge — is a label for the receipt, not a factor in ordering. By the time a battle starts, a hero simply has a list of listeners.

---

## Adding something

The loop this system exists to make fast:

1. Write the effect as a code module, or the unit as a data row.
2. Run one battle. **Does it appear in the log at all?** If not, it isn't wired in.
3. Run the same battle twice on identical dice, with and without. **Did it push the right way?**
4. Run it across the map panel. **How much, and is it reliable or situational?**

Steps 2 and 3 are nearly free and are where most iteration lives. Step 3 is the only one that needs real sample sizes.

**Change one thing per comparison.** Not for statistical formality — because if you change two, the result can't tell you which one did it.

---

## Testing, in three levels

**Did it get added?** One battle, no comparison. Every effect and unit has an id, and every log line names its cause, so this is the same check for everything: count the lines mentioning that id. Zero means it never fired. It also tells you *which* kind of nothing — never wired, wired but never triggered, or triggered and did nothing.

**Did it help the right side?** Same battle, same dice, one thing changed. You're reading the sign, not the size.

**How much did it move the battle?** The scoreboard, across the map panel. Damage dealt and taken by source, kills both ways, win or loss, turns, heroes downed and stood and killed, wound levels, stamina spent and when it ran out.

Read the *shape* of the results across maps, not the average. Helps everywhere by a similar amount means reliable. Helps hugely on three maps and not at all on seven means situational. Helps on some and hurts on others is the most interesting result available, and an average would erase it.

---

## What isn't random

**Maps are authored and vetted.** A map id is a map, identical every load. Testing across maps means a fixed panel spanning different shapes, run the same way every time, so a surprising result can be investigated by opening that board and looking at it.

**Deployment should mostly be authored too** — a few presets per map, since where heroes start is probably the largest single determinant of a fight.

Randomness lives in the named cups, and nowhere else.

---

## When a rule is ambiguous

**Don't decide it. Expose it as a switch.**

Whether protection is additive or take-highest, whether a strength gain mid-attack applies to the second hit, whether stamina regenerates per phase or per activation — these are questions the simulator exists to answer. Writing them down as decisions in advance defeats the purpose.

The one discipline: a switch that has been answered records its answer, and the default freezes. The alternative keeps its code path so it stays sweepable. Without that, "baseline" stops meaning anything by month three.

---

## The documents

| | |
|---|---|
| **COMBAT-FRAMEWORK.md** | This file. What the system is. |
| **COMBAT-SEQUENCE.md** | The order everything happens in. Vocabulary, stations, ladders, cups. |
| **ENGINE-CONSTITUTION.md** | Laws the code must obey. Read before writing any. |
| **GAME-DESIGN.md** | The game itself. The engine serves this, never the reverse. |
| **HARNESS-DESIGN.md** | Research snapshot. Superseded in places — background only. |

---

## Vocabulary

Battle · **Turn** (one Hero Phase + one Enemy Phase — the numbered one) · **Phase** · **Activation** (one unit's move + primary action) · **Step** · **Primary Action** (not cards) · **Card Play** (commander-level, its own resources) · **Attack** → **Hits** · **Settle**

---

## Settled, and open

**Settled — don't churn on these.** The engine never knows who's playing. Settle is a repeat-until-nothing-changes loop with the victory check inside it. Triggers are not stations. Movement resolves per step. Every roll is addressed by what it is, never when it happened. Maps are config, not dice. State is plain data.

**Open.** Whether stamina goes in the first build. The rest is content, which is exactly what this thing is built to absorb without redesign.
