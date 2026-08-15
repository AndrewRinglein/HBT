# Triggers — implementation plan

*Plan, 2026-08-14. Three separable pieces: a hook mechanism, a randomness cup, and
three content rows. Two of the three content rows are blocked, and the reason is the
point of the exercise.*

---

## Before anything: this is already specified, and I nearly missed it again

`GAME-DESIGN.md` §5 defines the whole trigger contract — hooks, firing order,
stacking, and the exact statuses involved. Reading it changed four things I would
otherwise have built wrong. Quoted rather than paraphrased, because that is the
habit that failed last time:

> **An attack now has four distinct moments, because attacks can miss.**
>
> | Hook | Fires when |
> |---|---|
> | **onAttack** | Every swing, **hit or miss** |
> | **onMiss** | Only when the attack misses |
> | **onHit** | The attack connected — **even if armor absorbed all of it** |
> | **onDamage** | At least 1 damage got through mitigation |
>
> **The rule: `onAttack` always. Then `onMiss` or `onHit`. Then `onDamage` only if
> damage landed.**

And two laws that change the implementation outright:

> **Sources.** Triggers arrive from base class, specialty class, items, class powers,
> badges, origins, and level paths — and they **stack additively**. No dedup, no
> priority; two sources of the same trigger both fire.

> **Scaling law:** effects that scale off **Magic or Spirit use the party-wide sum**;
> every other stat scales off the acting unit alone.

That second one directly hits your Mage row — see Part 3.

---

## Part 1 — the mechanism

### It is a rung, not a station (mostly)

By this project's own vocabulary a **Station** is a numbered slot in the accuracy or
damage pipeline: it changes a number. A **Rung** is a named step in a ladder: it
makes something happen. A trigger doesn't modify damage — it fires an effect. So the
firing is a **rung**.

But the *chance* is a number, and it will not stay fixed: §5 says triggers come from
badges, items and origins, which means something will eventually read "+10% trigger
chance". So the chance gets its own small resolve function with stations, exactly
like accuracy:

```
TRG.BASE       100   the authored percentage
TRG.SOURCE     200   the unit's own modifiers
TRG.SITUATION  400   reserved
TRG.FINAL      900   clamp 0..100
```

**So it is both, and the split matters:** `resolveTriggerChance()` is pure and
previewable; `fireTriggers()` mutates and rolls. Same `resolveX` / `performX` pair
as everything else, which is what keeps preview honest.

### Triggers belong to the UNIT, not the attack

Today there is an `applies` rider on `AttackDef`:

```ts
readonly applies?: { readonly statusId: string; readonly value: number }
```

The zombie uses it to apply poison 2. It is a 100%, `onHit`, single-status trigger
with no chance and no hook — the ancestor of what you're asking for, hardcoded.

§5 says triggers arrive from class, items, powers, badges, origins. That is a
**unit-level** list, not a property of a weapon. So:

```ts
type Trigger = {
  id: string                    // trigger.zombie.rot  — greppable, logged
  hook: 'onAttack' | 'onMiss' | 'onHit' | 'onDamage' | ...
  chance: number                // percent, integer (Law 7)
  effect: TriggerEffect         // what it does
  source: string                // which class/item/badge granted it (§5: no dedup)
}
```

and `Unit.triggers: Trigger[]`, assembled at `makeUnit` from its sources. `applies`
is migrated to a trigger and then **deleted** — one mechanism, not two.

### Where the hooks fire

`performAttack` in `pipeline.ts` already has the exact shape §5 describes; the hooks
drop into the seams that exist:

```
  spendStamina / markPrimaryUsed
  emit attack.declared
→ FIRE onAttack                       every swing
  roll to-hit
  if miss:  emit attack.miss
→   FIRE onMiss   → settle
    return
  emit attack.hit
→ FIRE onHit                          even if fully absorbed
  applyDamage
→ FIRE onDamage                       only if applied > 0
  settle
```

`onDamage` reads `applied`, which `applyDamage` already computes as
`Math.min(amount, hpBefore)` — so "at least 1 got through" is available without new
plumbing. Absorbed-to-zero already distinguishes itself.

### Ordering

§5 says *no dedup, no priority — both fire*. That governs the effects. It does not
excuse a nondeterministic **roll order**, which Law 6 does govern. Triggers sort by
`(hook, source, id)`, and the key includes a slot index, so adding a trigger to a
unit cannot perturb another trigger's roll.

### Events

```
trigger.rolled   { triggerId, hook, chance, roll, fired }
trigger.fired    { triggerId, hook, effect, target }
```

**Both, always — including the failures.** A 20% trigger that doesn't fire must
leave a trace, or "is this wired in?" is unanswerable and gate 1 can't see it. This
is the `activation.idle` lesson: a thing that did nothing used to leave no log line,
and it cost days.

---

## Part 2 — the cup

One new stream, `'trigger'`, added to `STREAMS` in `rng.ts`.

### The key is the whole problem

You are asking for **two separate 20% triggers on the same hit**. If both roll with
the same key they return a **bit-identical value** — the RNG is hash-derived, not
sequential — and poison and weakness would *always* fire together. Two 20% triggers
would behave as one, and every sweep would report a correlation that isn't in the
design.

This is precisely the Slay the Spire correlated-stream bug the RNG was built to
avoid, and it would arrive through the front door.

```
draw(rng, 'trigger', attacker.uid, target.uid, activationOrdinal, attackOrdinal, slot)
                                                                                 ^^^^
                                                          the trigger's index on the unit
```

**The engine already refuses to get this wrong.** `draw()` in strict mode keeps a
`seen` map and throws on a repeated key:

> *RNG key collision: … was drawn twice. A repeated key returns a bit-identical
> value, which silently turns a random mechanic deterministic.*

So the failure mode is a loud crash in strict runs, not a silent correlation. The
test to write is the direct one: give a unit two identical 20% triggers, run 2000
hits, assert both-fired ≈ 4% rather than ≈ 20%.

### The preview hazard

`preview()` runs the *real* pipeline — that is Law 1, and it is why previewing is
trustworthy. If a trigger rolled during `resolve`, preview would consume the key,
and the real roll would then hit the collision assert and throw.

**So triggers roll in `perform` only.** `resolveTriggerChance()` returns the
percentage and its ledger, and the AI can read it for scoring; nothing rolls until
the attack actually happens. This is worth stating as a rule rather than a habit,
because the next person to add a random rider will reach for `resolve` first.

---

## Part 3 — the content, and why two thirds of it cannot land

### What you asked for

| Unit | Hook | Chance | Effect |
|---|---|---|---|
| Zombie | onDamage | 20% | `status.poison` 1 |
| Zombie | onDamage | 20% | `status.weakness` 1 |
| Mage | onAttack? | 100% | `status.burn`, value = Magic ÷ 5, round up |

### Blocked: only one of the three statuses is published

`content-check` says:

```
status.poison        PUBLISHED   1-EFFECTS-SETTLED.md
status.weakness      not published anywhere
status.burn          NAMED in 1-EFFECTS-SETTLED.md — "not yet shaped,
                     so do not reference it from another session yet"
```

Both are fully defined in `GAME-DESIGN.md` §5 — *Weakness: −1 damage per point,
reduces damage dealt, not the Strength and Precision stats*; *Burn: damage equal to
its value, and halves all healing*. So the design exists. It has not been
**published** into the Effects contract, and `status.burn` carries an explicit
instruction not to reference it.

I removed `status.burn` from the engine four commits ago for exactly this reason.
Building it back to serve this trigger would be the same error with a better excuse.

**So the split is:**

- **Buildable now:** the mechanism, the cup, and the zombie's poison trigger —
  poison is published, and this replaces the hardcoded `applies` rider with the real
  one. That is a complete, gateable item.
- **Blocked on Effects:** the weakness trigger and the whole Mage row.

### The Magic scaling is not what it looks like

§5, stated as a law:

> effects that scale off **Magic or Spirit use the party-wide sum**

So the Mage's Burn is not `ceil(mage.magic / 5)`. It is `ceil(partyMagicSum / 5)` —
and with one Mage at Magic 2 those happen to give the same answer, **1**. They stop
agreeing the moment a second Mage is on the field, and the bug would look like a
content error rather than a missing law.

That needs a `partyMagicSum(ctx, side)` reader, and §5 also names its mirror:
*"Power is the enemy's Magic — a single global scalar for the whole enemy side."*
Worth building both together, or the symmetry gets bolted on later.

Value shape, as data rather than a formula string:

```ts
{ statusId: 'status.burn', value: { scale: 'partyMagic', div: 5, round: 'up' } }
```

Greppable, no expression parser, and the rounding is explicit — Law 7.

---

## Four questions I am not going to answer for you

**1. Mage Burn on `onAttack` or `onHit`?** You said "on attack". §5's canonical
example is the opposite case, stated directly: *"A flaming bow burns on `onHit`, not
`onAttack` — miss and nothing catches fire."* On `onAttack` the Mage burns the target
even when the bolt misses. That may be intended for a spell rather than a bow — but
it contradicts the document's own worked example, so I want it from you.

**2. Is `GAME-DESIGN.md` §5 publication?** It defines Burn and Weakness completely.
`1-EFFECTS-SETTLED.md` says burn is unshaped. Which wins? This is the structural
question underneath all three items, and it will recur for every content row from
here: **is the contract the SETTLED files only, or is GAME-DESIGN also contract?**
My read is that GAME-DESIGN is the *design* and SETTLED is the *published surface* —
so Effects still has to publish the rows — but that is your call, and
`content-check` should encode whichever answer you give.

**3. Two 20% triggers — independent?** I am assuming yes: 4% chance both fire, 32%
chance exactly one does. The alternative (one roll, both effects) is a different
mechanic and would need saying.

**4. Does a 20% trigger roll at all if it cannot do anything** — target already
dead, or already holds the status at cap? I would roll anyway and log
`fired: true, applied: false`, so the rate stays measurable. Cheap either way, but
it changes what a sweep counts.

---

## Sequence

| # | Item | Depends on |
|---|---|---|
| 1 | `trigger.mechanism` — hooks, `Unit.triggers`, resolve/fire split, events | — |
| 2 | `trigger.cup` — the stream, the key, the independence test | 1 |
| 3 | `trigger.zombie.rot` — 20% poison 1 onDamage, replacing `applies` | 1, 2 |
| 4 | `stat.party-sums` — party Magic sum and enemy Power | — |
| 5 | `trigger.zombie.sap` — 20% weakness 1 onDamage | **status.weakness published** |
| 6 | `trigger.mage.kindle` — 100% burn onAttack/onHit | **status.burn published**, 4 |

1–3 can go through the loop tonight. 4 is independent and worth doing early because
it is a law, not a feature. 5 and 6 sit in the backlog marked blocked, and
`content-check` will keep saying so until Effects publishes.
