# The hero record — design truth vs. what the engine implements

Rewritten 2026-08-15. **The first version of this file was wrong.** It documented
`src/content/index.ts` — the scaffolding an engine session invented to have
something to run the harness against — and presented it as the authoring shape.
It is not. `GAME-DESIGN.md` is the source, and this file is now written from it.

Read §1 for what a hero IS. Read §4 before building Crucible: the engine
implements roughly half of the sheet, and the half it is missing is the half
Crucible produces.

---

## 1. The hero sheet — GAME-DESIGN §7

**Strength · Precision · Accuracy · Crit · Grit · Reach · Dodge · Vision · Armor ·
Resist · Health · Magic · Spirit · Toughness · Resolute · Movement · Stamina
(max/regen) · Item Slots**

Plus:

- **Deathbed Fighting** — derived, `20 + 5×Toughness + badges`. Not stored.
- **Corruption / Favor** — non-combat.
- **Type** — class, plus Civilian.
- **Unique name.**
- **Triggers** — see §3.
- **Badges** — see §5. A hero's whole history lives here.
- **Loadout** — main hand + off hand · 1 armor · X accessories (Item Slots).

Banned: initiative. Dodge and hero Crit are stats again, in new forms.

Notes that change how the record is built:

- **Accuracy and Crit are read in the shot preview, not tracked.**
- **Reach, Vision and Grit are near-invisible** — they set what is legal, what is
  lit, and what luck can do to you. They surface as overlays, not numbers.
- **Hero Reach adds only to ranged weapons.** Melee gets nothing from it.
- **Strength and Precision no longer affect whether you hit — only how hard.**

---

## 2. Attacks and powers — GAME-DESIGN §4 and §5

**A hero gets a move and one primary action. The primary action is an attack or a
power.**

**Attacks belong to weapons, not to heroes.** A typical weapon carries **two
attacks** — two distinct options in the attack menu, of which the primary action
spends one. Levelling widens the menu rather than granting extra swings. Every hero
has a **punch at 0 stamina**, the floor that guarantees no dead turns.

**Damage = weapon base + stat bonus.** Strength for melee, Precision for ranged.
**Weapons carry the majority of the number and define the attack kit.**

An attack carries:

| | |
|---|---|
| **Stamina cost** | The throttle. Punch is 0. |
| **Damage type** | `physical` / `magic` / `true` |
| **Reach** | On the weapon. Longsword 1, longbow 6, sniper bow 9. Hero Reach adds to *ranged* only. |
| **Governing stat** | Strength (melee) or Precision (ranged) — carries the damage, not the to-hit. |
| **Damage modifier** | The weapon's own base, added to the stat. |
| **Triggers** | On any hook. A flaming bow is `onHit: apply 2 Burn`. |
| **Type modifiers to damage** | Slayer-style bonuses read off the *target's* type. |

Priced tradeoffs, all §4: **split attacks** (armor applies per hit), **self-cost
attacks**, **positional bonuses** (flank = +damage, shown in preview),
**charge-ups**. Crits, if added, are **weapon properties — upside only**.

**Powers carry all of the above, plus a cooldown** — and instead of triggers they
have **effects**. A power's effect can be **area**, and can **heal**; the trigger
vocabulary is `status.apply` / `status.remove` / `status.reduce` / `damage` /
`heal`, over the full targeting model.

> Angela, 2026-08-15: *"Powers have all these same things and cooldowns. Because
> they don't have triggers, because they really have effects. Powers have a variety
> of effects, like they can have area effect attacks and they can heal."*

### The damage preview contract

**The attack menu shows final damage, every modifier already baked in** — not base,
not a formula. Moving the cursor onto a target **updates the number for that
target**: its armor, resist, vulnerable, position. Nothing is discovered after
committing.

This has a hard engineering consequence, stated in §5 as lesson 4 of "do not port":
**preview and resolution must be the same code path. Not similar. The same.**

---

## 3. Triggers — GAME-DESIGN §5

Twelve hooks:

`startOfBattle` · `onEnter` · `onAttack` · `onMiss` · `onHit` · `onDamage` ·
`onTakingDamage` · `onKill` · `onDeath` · `onWounded` · `onEquip` · `turnEnd`

**The rule: `onAttack` always. Then `onMiss` or `onHit`. Then `onDamage` only if
damage landed.** `onHit` fires even if armor absorbed all of it.

**Sources** — base class, specialty class, items, class powers, badges, origins,
level paths. They **stack additively. No dedup, no priority**; two sources of the
same trigger both fire.

> Minor inconsistency worth resolving: §7's hero paragraph lists a nine-hook set
> that omits `onHit`, `startOfBattle` and `onEquip`. §5's list is the fuller one and
> is treated here as authoritative.

---

## 4. ⚠ What the engine actually implements

`UnitDef` in `src/core/types.ts` is roughly half the sheet. This is the gap
Crucible runs into.

**On the sheet, present in the engine:** Strength, Precision, Accuracy, Dodge,
Reach, Armor, Resist, Health (`maxHp`), Magic, Spirit, Movement, Stamina (max +
regen).

**On the sheet, MISSING from the engine:**

| Missing | Consequence |
|---|---|
| **Crit** | §4's crit branch and the six-injury table are unbuilt (`crit.branch-and-injuries`). |
| **Grit** | Nothing reads it. |
| **Vision** | No vision, darkness, fog or stealth layer at all. |
| **Toughness** | So **Deathbed Fighting cannot be derived** — the whole consequence stack (§9) has no input. |
| **Resolute** | Nothing reads it. |
| **Item Slots / loadout** | **No weapon entity exists.** See below. |
| **Badges** | The entire persistent-history system (§8) is absent. |
| **Type / class** | `role` (melee/ranged/support) is an AI hint, not a class. |
| **Unique name** | Assigned at spawn, not stored on the record. |
| **Level / XP** | Absent. |
| **Corruption / Favor** | Absent. |

**The structural one: there is no weapon.** The design says attacks come from
equipped weapons — main hand and off hand, each carrying two attacks and its own
Reach. The engine hangs a flat list of attack ids directly off the unit:

```ts
attacks: ['attack.warrior.massive', 'attack.warrior.axe', 'attack.punch']
```

No main hand, no off hand, no armor slot, no accessories. So a hero cannot currently
be equipped, gear cannot carry Reach or +Accuracy, and `onEquip` has nothing to fire
on. **For Crucible this is the load-bearing gap**, because a generated hero's kit is
gear, and gear is where the design puts the majority of the damage number.

**Also missing on attacks/powers:** attacks have no `triggers` field (only a single
`applies` status rider) and no type-modifier hook (`station.vs-target`, open).
Powers have **no effects at all** — `AbilityDef` is a single-target damage row, so
**no power can heal or hit an area today** (`ability.effects`, open). The targeting
model *does* already support area and type filters; abilities simply do not reach it.

---

## 5. Crucible — GAME-DESIGN §7

The spec, verbatim in substance:

- **Heroes are randomized when you get them.** Ported in spirit from Hell TCG.
- The generator rolls **stat modifications (gain and loss profiles), badges, art,
  gender, personality, name, and background.**
- **Class fixes base stats and kit.**
- **Rerolling a recruit costs 10 Faith.**
- **Attaching a special origin costs 10 Mana**, unlocked by a building.
  *[OPEN: which building; whether the 10 Mana is repeatable per recruit or once.]*
- **One hero per strategic turn**, in the Buy phase.
- *[OPEN: a refreshing stock of candidates, or a single take-it-or-reroll offer.]*

**Origins are the composition layer** — a generation-time script that can grant
stats, badges, triggers, spells, tactics, class powers and run-level effects.

> **They are consumed at attachment. A hero has no "origin" object afterward, only
> what it left behind.**

That sentence decides the save format: **origin effects must be baked into the hero
record at generation.** There is no origin id to re-resolve on load, and a saved
hero must be complete on its own.

Badge rules that constrain generation: **a fresh recruit rolls 0–2 badges, skewed
good.** Bad badges arrive later as scars and injuries from play. **Origin badges are
immutable; earned badges are mutable** — curable at the Hospice, cleansable at the
Chapel.

---

## 6. Nothing is published yet

`2-ACTIONS-SETTLED.md` — the file that publishes `attack.*`, `power.*`, `item.*`
and `card.*` — **has an empty `## Ids` section.** Not one action is published.

That is why `content-check` reports 10 INVENTED ids covering every attack in the
game. The scaffolding in `src/content/index.ts` says so itself at the top: no
balance conclusion drawn from those numbers is a finding about the game.

So Crucible is not filling a gap in a populated system. **It is the first
publication of actions and heroes.** Whatever shape it emits should write the
SETTLED rows and the engine content from one source, so the two cannot drift.
