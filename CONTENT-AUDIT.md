# Rogue 1 and Priest 1 — what fits, what doesn't

*Audit, 2026-08-15. Every atom in the two stat blocks, checked against what the
engine actually does. Nothing here is built.*

---

## The short version

Those two classes are **ten new mechanisms**, not two content rows. Most of the stat
lines drop straight in; almost every *action* needs something the engine hasn't got.

| | count |
|---|---|
| Fits today, no engine change | 9 |
| Needs a new **field** (small) | 3 |
| Needs a new **mechanism** (real work) | 8 |
| Blocked on a published status | 1 |
| Values I'd have to invent — **won't** | 17 |

That last row is the important one. I can't build either class without inventing
seventeen numbers, and inventing numbers is what we spent this evening undoing.

---

## 1. Fits today — drops straight in

| Content | Why it fits |
|---|---|
| Rogue stat block: Str 4 · Pre 4 · armor 0 · **dodge 15** · move 6 · accuracy 90 | every field exists on `UnitDef` |
| Priest stat block: Str 2 · Pre 3 · armor 0 · **resist 1** · move 5 · accuracy 80 | same |
| **Dagger Stab** — melee, Str +0, 1 stam | ordinary `AttackDef` |
| **Punch (Priest)** — Str −1, 0 stam | ordinary `AttackDef`; the shared `attack.punch` is already Str −1 |
| **Holy Blast** — ranged 5, Pre +1, 1 stam | ordinary ranged `AttackDef` |
| **Smite** — melee, Str +2, **true** damage, 2 stam | `DamageType` already has `true`, and true damage already skips mitigation |
| **Class power cooldowns** — CD 7, CD 3 | `AbilityDef.cooldown` exists |
| **Class power stamina** — 1 stam | `AbilityDef.staminaCost` exists |
| **Move +0, cost 1** | the current default move |

### One oddity worth naming: `reach -1`

`reach` exists, but the engine applies hero Reach to **ranged only** —
`a.kind === 'ranged' ? a.reach + stat(reach) : a.reach`. So a Rogue at reach −1 gets
**Dagger Toss range reduced by 1** and **Dagger Stab unaffected**.

Is that what −1 means for a Rogue? "Short arms, throws badly, stabs the same" is
coherent. So is "−1 to everything, and melee reach 1 becomes 0, meaning it can't
attack at all" — which would be a bug rather than a design. **Confirm.**

---

## 2. Needs a new field — small, mechanical

| Content | What it needs |
|---|---|
| Dagger Toss **−10 accuracy**, Double Toss **−20**, Smite **+20** | `AttackDef.accuracy?: number`, applied at `ACC.SITUATIONAL` (700), which is already reserved and empty |
| Priest "**deals true damage**" as a class trait | either every Priest attack states `damageType: 'true'` (data, no engine change) or units get a damage-type override (engine change). **Prefer the first** — a per-attack statement is greppable and can't silently apply to something you didn't mean |
| Smite **+2 vs undead** | the `DMG.VS_TARGET` station (275) already proposed, **plus** `tags: ['undead']` on unit defs. The tag half is Bestiary's call, not the engine's |

---

## 3. Needs a new mechanism — real work

### 3.1 Multi-hit attacks — *Double Toss throws 2 dagger attacks*

One Attack containing two Hits. The **vocabulary already allows it** — the glossary
says *"Attack: one attack action. Contains one or more Hits"* — and `SWITCHES.md`
already carries the question it raises:

> `multiAttackRetargets` — If the target dies, does hit 2 retarget or fizzle? · fizzle · open

But `performAttack` resolves exactly one hit. This needs: a `hits: number` on
`AttackDef`, a loop, a per-hit ordinal in the RNG key (or both daggers share a
to-hit roll — the same correlation bug as the two 20% triggers), and the retarget
switch answered.

**Also: does each hit roll to-hit separately?** Two daggers at −20 that both hit or
both miss is a very different weapon from two independent −20 rolls.

### 3.2 Movement actions — *Sprint: move +3, costs 2*

Movement is currently hardcoded: one move per activation, fixed stamina cost, budget
= `movement`. Sprint is a **second movement mode** with its own cost and bonus, which
means movement becomes content: a `move.*` kind with `bonus` and `staminaCost`, and
the AI needs to choose between them.

Your own "move +0 cost 1" line says you already think of the default move as a
content row. That's the right shape; the engine doesn't have it.

### 3.3 The Spirit stat — *heal for 6 + 2×Spirit*

**Spirit does not exist in the engine.** It's named once in `../GAME-DESIGN.md` §5 —
*"effects that scale off Magic or Spirit use the party-wide sum"* — and nowhere else.

Two consequences:
- It's a new `StatName`, a new `UnitDef` field, and a new `BASE` reader.
- Per §5 it is **party-wide summed**, like Magic. So Heal Ally is
  `6 + 2 × partySpiritSum`, not the Priest's own Spirit. With one Priest they agree;
  with two they don't. `partyMagicSum` already exists and generalises.

**And the Priest's stat block doesn't give a Spirit value.** The heal can't be built
without it.

### 3.4 Ally-targeted abilities — *Heal Ally*

`canUsePower` currently contains:

```ts
if (u.side === tg.side) return false
```

Abilities can **only** target enemies. Heal Ally is impossible as written. This needs
a `target: 'enemy' | 'ally' | 'self' | 'any'` on `AbilityDef`, the legality check
inverted per-ability, and the AI taught that a friendly target is a legal choice —
which is a new AI mode (`ai.mode.support` is already on the backlog).

### 3.5 Healing as an ability effect

`heal()` exists in `status.ts`, but no ability calls it — every ability deals damage.
`AbilityDef` has `stat`/`bonus`/`damageType` and nothing else. This needs abilities
to have an **effect** rather than always being damage — the same shape the trigger
layer just got (`status.apply` / `status.remove` / `damage`), which is a good sign:
one effect vocabulary, two callers.

### 3.6 Partial status removal — *remove bleed and poison = spirit*

The trigger layer's `status.remove` removes a status **entirely**. This removes
**N points** of it, where N is Spirit. Different operation — closer to healing than
to cleansing. Needs `status.reduce` alongside `status.remove`.

Also ambiguous: Spirit points off *each* status, or Spirit points split between them?

### 3.7 Abilities that grant triggers — *Poison Knives: gain trigger on damage 1 poison*

This is a power whose effect is **modifying the unit's own trigger list**. New, and it
lands directly on a §5 anti-pattern:

> **Badge removal never removes the badge's triggers** — the removal branch is an
> empty loop. Removing an affliction leaves its triggers attached for the rest of combat.

So granting must be reversible by construction. Questions: does the grant last the
rest of the battle, or until the cooldown comes back? What's the granted trigger's
chance — 100%? And it needs a `source` so it can be found and removed.

### 3.8 `DMG.VS_TARGET` and unit tags — *+2 vs undead*

Already written up in `TRIGGER-NOTES.md` §2. A station, not a trigger. Blocked on
somebody deciding that a zombie is `undead`, which is session 6's call.

---

## 4. Blocked on publication

**`status.bleed`.** Heal Ally removes it. §5 defines it — *"Bleed: flat 2 damage, its
value is a turn counter, not a magnitude"* — but it is not published in
`../1-EFFECTS-SETTLED.md`, same as weakness and burn.

Note it's the *odd* status: poison and regeneration use their value as both magnitude
and timer; bleed's value is **only** a timer and the damage is flat. That's a
different shape, and it should be shaped deliberately rather than assumed.

`status.poison`, used by both Poison Knives and Heal Ally, **is** published. Fine.

---

## 5. Seventeen values I would have to invent

I'm listing these rather than filling them in.

**Rogue** — maxHp · resist · magic · Spirit · maxStamina · staminaRegen · role
(melee/ranged/support) · AI mode
**Priest** — maxHp · dodge · magic · Spirit · maxStamina · staminaRegen · role · AI mode

**And nine ambiguities in what you sent:**

1. **Dagger Toss stamina** — you wrote "stam 0, stam 1". Which?
2. **Dagger Toss range** — a thrown dagger's reach isn't given. 3? 4?
3. **Holy Blast damage type** — the Priest "deals true damage"; is Holy Blast true, or
   is only Smite?
4. **Double Toss** — one to-hit roll for both daggers, or two?
5. **Poison Knives duration** — rest of battle, or until CD refreshes?
6. **Poison Knives chance** — 100%, or does it inherit a percentage?
7. **Heal Ally "within 6+reach"** — the Priest's reach isn't in its stat block.
8. **"remove bleed and poison = spirit"** — Spirit points off each, or split?
9. **`reach -1`** — ranged only (engine's current rule), or everything?

---

## What I'd do next

**Nothing on this list is blocked by the engine being wrong.** Every gap is either a
field, a mechanism, or a number you haven't stated — and the mechanisms are mostly
generalisations of things that already exist:

- ability effects ← the trigger effect vocabulary, already built
- `partySpiritSum` ← `partyMagicSum`, already built and tested
- accuracy modifier ← `ACC.SITUATIONAL`, already reserved
- `status.reduce` ← sits beside `status.remove`

**Suggested order**, cheapest and least blocked first:

| # | Item | Unblocks |
|---|---|---|
| 1 | `stat.spirit` + `partySpiritSum` | anything Priest |
| 2 | `attack.accuracy` field at `ACC.SITUATIONAL` | Dagger Toss, Double Toss, Smite |
| 3 | `ability.effects` — abilities get the trigger effect vocabulary | Heal Ally, Poison Knives |
| 4 | `ability.targeting` — enemy/ally/self | Heal Ally |
| 5 | `attack.multihit` + answer `multiAttackRetargets` | Double Toss |
| 6 | `move.actions` — movement as content | Sprint |
| 7 | `trigger.granted` — powers that add and remove triggers | Poison Knives |
| 8 | `station.vs-target` + unit tags | Smite's +2 vs undead |

1–4 would let the **Priest exist except for `+2 vs undead`**. 1, 2, 5 would let the
**Rogue exist except for Poison Knives**. Neither can land until the missing numbers
and the nine ambiguities are yours rather than mine.
