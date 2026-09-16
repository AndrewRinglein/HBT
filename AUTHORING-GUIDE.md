# HoBaT Content Authoring Guide

V2 attack packet schema and the two provisional migrated weapon riders are owned
by [V2-DAMAGE-PACKETS.md](V2-DAMAGE-PACKETS.md). Explicit V2 rulings supersede older
scalar-only damage descriptions below.

How to write an item, a power, a specialty or an enchantment for *Heroes of Blight
and Tragic*. Written 2026-08-17 against the settled rulings in
`2-ACTIONS-SETTLED.md` and `3-UNITS-SETTLED.md`, and against the harvested
Hell-TCG corpus in `extract/corpus-*.txt`.

**The one rule that governs everything else:** Hell-TCG had no to-hit roll, no map,
no stamina and no vision. Half its design vocabulary has no meaning here. **Names
port. Mechanics are rebuilt.**

---

## 1. The stat vocabulary — nineteen values, and what each is *for*

Never invent a stat. If a thing you want to write needs one that isn't here, it is
a tag or a status, not a stat.

| Stat | What it actually does | Typical grant | Notes for authors |
|---|---|---|---|
| **Strength** | melee damage only | +1 · +2 | **never** to-hit |
| **Precision** | ranged damage only | +1 · +2 | never to-hit |
| **Accuracy** | the core roll | +5 · +10 · −10 | **surplus over 100 becomes Crit at ÷4** — see §6 |
| **Crit** | chance to land one, base 3 | +2 · +3 · +5 | a veteran runs +30/+40 |
| **Luck** | flat subtraction from the **attacker's** crit chance | +3 · +5 | defensive only. was called Grit |
| **Reach** | **ranged weapons only** | +1 | rare, high-value. melee gains nothing |
| **Dodge** | flat to-hit penalty on the attacker | +5 · +10 · +15 | |
| **Vision** | a radius, base 6 | +1 · +3 | only bites in darkness, fog, stealth |
| **Armor** | flat mitigation, physical | +1 · +2 | floors at 0, never negative |
| **Resist** | flat mitigation, magic — **and burn/poison per tick** | +1 · +2 | **never** blocks bleed |
| **Health** | max. resets every Battle | +1 … +5 | the cheapest currency |
| **Magic** | scales off the **party-wide sum** | +1 · +2 | one Mage in a starting party → party Magic ≈ 2 |
| **Spirit** | scales off the **party-wide sum** | +1 · +2 | same |
| **Toughness** | injury capacity, and the base for Deathbed Fighting | +1 | very strong. campaign-tier |
| **Movement** | hexes per move action. heroes 5 | +1 · −1 · −2 | −1 is a real cost, not flavour |
| **Stamina Max** | the throttle. level-1 hero has 5 | +1 · +2 | |
| **Stamina Regen** | **the sacred stat.** hard-caps ~3 | +1 | almost never grant this |
| **Surge** | base = character level | rarely modified | grants another movement and primary action **inside the same Activation** |
| **Item Slots** | accessories beyond the two hands | +1 · +2 · −1 | |

**Deathbed Fighting** — derived AND grantable. Starts at `20 + 5×Toughness` (`20 + 5×Toughness + Σ`).
Items *may* grant a DBF modifier; it hangs on the item.
**Non-combat:** Corruption · Favor.

---

## 2. The tag vocabulary — closed, authored, validated at load

A **tag is a fact. A badge is a payload.** Tags are never authored onto a hero
directly — they are granted by class, origin, badge, specialty or template, and the
unit's tag set is derived from the union.

Hell-TCG's `TYPE_REGISTRY` (38 entries, with a `category` field) is the precedent
and validates the one-namespace design.

```
FORM      — authored on the ATTACK. What is in your hands. bow · crossbow · sword · dagger · axe · hammer · spear · polearm staff · shield · thrown · sling · improvised · chain · claw

MANNER    — authored on the ATTACK. How it behaves. melee · ranged · brawl · area · heal · stance · aura

ANCESTRY  — unit, granted by origin. elf · dwarf · human · catfolk · fae

ROLE      — unit, granted by specialty, badge or template. soldier · scholar · noble · outcast

CREATURE  — unit, enemy side. VISIBLE TO THE PLAYER — these are read and planned around, unlike attack tags which are meant to be invisible. undead · demon · beast · construct · giant · dragon · horror · elemental · plant · nightmare · vampire · werewolf

DERIVED   — never authored. Read off fields that already exist. physical / magic / true    ← damageType strength / precision / magic-scaling / spirit-scaling ← the stat field
```

**Rules.**
- **The punch is tagged `brawl` and `melee`.** Every hero has it. So "+3 to brawl" is a buff to everyone's floor attack — price it knowing that.
- **Tags overlap and stack additively.** A brawl attack is also melee, so "+2 melee" and "+3 brawl" both land. Intended, but it is how a player assembles +15.
- **A typo'd tag fails silently** — the modifier just never fires. One authored list, validated at content load, exactly like ids.
- **Damage type stays a FIELD, not a tag.** Mitigation is a three-way branch and an attack must have exactly one. The tag is derived from the field.

---

## 3. The shapes

```
item.<name> itemClass · tier · slots · hands · classRestriction · grants[] statModifiers · triggers · equipCost · persists · armorWeight · tags[]
attack.<weapon>.<name> range · stat · damage · stamina · accuracy · crit · targets hits · damageType · slayer · tags[] · triggers · cooldown
power.<owner>.<name> stamina · cooldown · warmup · free · targets · effects[] · tags[]
enchant.<name> appliesToTags[] · statModifiers · triggers · grants[]
specialty.<name> class · statModifiers · triggers · grants[] · powerPool[]
```

**Ids are lowercase, dot-separated, `^[a-z]+\.[a-z0-9.-]+$`.**
**Content references content by id. Never inline.** A longsword does not *contain*
an attack; it grants `attack.longsword.slash` by id.

---

## 4. Tiers and what a tier buys

| Tier | Means | Weapons | Armor | Rough budget |
|---|---|---|---|---|
| **0** | junk | **one** attack | no weight band | net negative or flat |
| **1** | purchasable / early found | **two** attacks | light · medium · heavy | ~2 points of upside |
| **2** | mid campaign | two, better | + a small trigger | ~4 points, or 2 + a trigger |
| **3** | rare, late | two + a power | + a real trigger | ~6 points, or a power |
| **4** | a handful only | signature | signature | breaks a rule on purpose |

**One point ≈** +1 Strength or Precision · +2 Health · +2 Reach · +2.5 Toughness ·
+6 Dodge · +6 Accuracy · +1 Movement · +3 Stamina Max · +5 Crit, Luck or Vision ·
+6.7 Surge.
**Worth more than one point:** Stamina Regen at 2.0; Armor, Resist, Magic and Spirit at 1.5 each.
*(Armor and Resist re-ruled from 2.0 to 1.5 on 2026-09-02.)*

### The stat value ladder — corrected again 2026-08-17

**One Strength or one Precision = 1 point.** Everything else prices against that.

| Stat | Per point | Note |
|---|---|---|
| **Armor · Resist** | **1.5 and RISING** | *(re-ruled 2026-09-02, down from 2.0 — but see the escalation note below)* half again a Strength **at the first point**. Each further point is worth more than the last |
| **Stamina Regen** | **2.0** | **the sacred stat, and now priced like one.** It hard-caps at 3, so there are only ever two of these to give |
| **Magic · Spirit** | **1.5** | more than Strength or Precision — about 3 Health |
| **Strength · Precision** | **1.0** | the unit |
| **Movement** | **1.0** | *(re-ruled 2026-09-02, up from 0.7)* the same as a Strength. A Movement grant is a real grant, and −1 is a real cost |
| **Item Slots** | **0.67** | about two-thirds of a Strength |
| **Health** | **0.5** | 2 Health ≈ 1 Strength. **Not the cheapest thing in the game** |
| **Reach** | **0.5** | about half a Precision |
| **Toughness** | **0.4** | injury capacity, and every point is +5 Deathbed Fighting |
| **Dodge** | **0.167** | *(re-ruled 2026-09-02)* **6 Dodge = 1 point**, the same rate as Accuracy — the two are priced alike |
| **Stamina Max** | **0.3** | cheap. Breadth, not power — it buys more small actions, not better ones |
| **Accuracy** | **0.167** | *(re-ruled 2026-09-02)* **6 Accuracy = 1 point** |
| **Crit · Luck · Vision** | **0.2** | not named in the 2026-09-02 ruling; unchanged pending one |
| **Surge** | **0.15** | the cheapest thing on the board. **Fine to modify** — it is not a sacred stat |

### Armor does not price linearly — the ladder number is a floor

**Ruled 2026-09-02:** *"it's also worth more and more the higher it goes… Movement is also worth 1."*

Armor and Resist are **flat mitigation**, so each point removes damage from *every* hit. Against
a board of small hits their value approaches total negation, and the curve steepens: **Armor 3
is worth considerably more than three times Armor 1.** The 1.5 in the table is the price of the
*first* point and a floor for the rest. A linear sum will always understate a high-Armor item,
and no amount of arithmetic will fix that — read the top of the armor curve by hand.

**The worked case is `item.patrocoleas-armor`** (tier 3 heavy: Armor 3, Resist 1, and Health −4,
Movement −2, Accuracy −10, Dodge −10). Summed linearly it prices below zero, and a review
flagged it as broken. It is not:

> *"Patroclus' armor has massive downside… it's only a tier 3, and it provides the highest
> armor modifier you can get. So if you really care about armor, it's still a good way to go,
> but it's not giving you a whole lot of bonus stats because of all the penalties."*

That is the intended shape of the piece. It sells **the highest Armor in the game** and charges
for it in everything else — a deliberate specialist, not a budget failure. An item may spend its
entire budget on one escalating stat.

**Nothing sits outside this table any more.** priced the last five on
2026-08-20: Movement 0.7 · Stamina Max 0.3 · Stamina Regen 2.0 · Surge 0.15 ·
Toughness 0.4. Only `deathbedFighting` has no entry, because it is derived rather
than granted — `20 + 5 × Toughness`, which prices a Toughness point at 5 Deathbed.

**Stamina Regen at 2.0 is the one that changes how you author.** It is now tied
with Armor and Resist as the most expensive thing in the game, and unlike them it
is capped at 3 — so across a whole ten-level run there are exactly **two** to
give. Never hand one out as filler.

**Two of these do not scale linearly, and it matters more than the numbers do.**

- **Accuracy loses value as you accumulate it.** Past 100 the surplus only converts to Crit at ÷4, so the hundredth point is worth a quarter of the first.
- **Dodge gains value as you accumulate it.** Each point is a flat penalty on every attacker, so it compounds. **+100 Accuracy would change little; +100 Dodge would break the game.** Treat large Dodge grants with far more suspicion than large
  Accuracy grants.

### A stat is worth far less to a class that does not use it

**This is the pricing rule that is easiest to get wrong.** Strength is melee damage
and Precision is ranged damage, so **+1 Strength on a Warrior is a real grant and
+1 Strength on a Ranger is nearly nothing.** An off-primary stat has to be handed
out in *quantity* before it changes anything.

That is not a reason to avoid it — it is how you build a hybrid. The Wayfinder is
a Ranger with **+2 Strength and +3 Health**, and that combination is what makes it
the branch that is fine once the enemy closes. Written as +1 Strength it would have
been a rounding error with a theme attached.

| Class | Primary | An off-primary grant must be roughly |
|---|---|---|
| Warrior · Paladin | Strength, Armor | doubled |
| Ranger | Precision, Reach | doubled |
| Rogue | Precision, Crit *(Strength if it wields daggers)* | doubled |
| Mage | Magic, Precision | doubled |
| Priest | Spirit, Precision | doubled |

### Accuracy is not worth a point, and this is the most common mispricing

**Corrected 2026-08-17 after a relic review.** Everything that reduces Accuracy
eats your Crit *before* it eats your hit chance. So for a veteran sitting above
100 Accuracy, **−N Accuracy is only −N/4 Crit** — −10 Accuracy is −2.5 Crit, which
is nothing. It bites hard on a rookie under 100 and barely at all on a veteran.

- **As an upside, +5 Accuracy is roughly one point.**
- **As a downside, Accuracy is worth about a quarter of that.** A cost of −20
  Accuracy is what it takes to pay for +2 Resist.
- **Never pay for a strong stat with a small Accuracy penalty.** +15 Crit for
  −10 Accuracy is a net +12.5 Crit — free, wearing a drawback's clothes.

### Movement is worth more than an Item Slot

They are not interchangeable. Prefer Movement as the *upside* and something other
than a slot as the downside.

### Never charge Item Slots on a relic, trinket or idol

**Those items already occupy a slot.** A relic that also costs −1 Item Slot is
really costing two, and nothing on the card says so.

**Who starts with what.** **Heroes start with TIER 1 weapons and TIER 0 armor.**
Civilians and other non-heroes start with tier 0 weapons. So tier-0 weapons are the
militia's kit, not the hero's — but every hero is wearing something bad, which is
what makes the Armoursmith the first building anyone cares about.

**A tier-0 item is allowed to be bad.** `item.rusted-plate` is −2 Movement,
−2 Stamina, −10 Accuracy, −5 Crit for +1 Armor. That is the point: the armoursmith
has to feel like a relief.

---

## 5. Per-kind rules

### Weapons
- **Tier 0 grants one attack. Tier 1+ grants two.** The two should be a *choice*, not a strict upgrade: cheap-and-reliable versus expensive-and-heavy is the shape.
  Longsword: Slash (str +1, 1 stam) or Stab (str +2, 2 stam, +5 acc, +3 crit).
- **Every attack carries form and manner tags.** A bow attack is `bow` + `ranged`.
- **Damage type belongs to the attack, not the class.** Staves deal magic, priest weapons deal true, everything else is physical.
- Two-handed costs two slots. One-handed costs one. Hands are two extra slots that only take weapons; there is no mechanical difference from inventory.
- **Class restriction is a hard gate**, not a bonus. A multi-class hero satisfies it if any of its classes match.

### Armor — the biggest upside in the game

**Ruled 2026-09-02, and it corrects a reading that had got into the design notes:**

> *"Armor is not a trade-off category. It is a massive upside category. It can have
> trade-offs. It is the single greatest stat gain that you can have. Then Idols and Blood
> Runes are also stat gains, but they are of a narrower dynamic and less than armor."*

So the category ladder for **stat gain** is:

```
Armor            the largest gain available. May carry a trade-off; is not defined by one.
Idols            a gain, narrower than armor, and less
Blood Runes      a gain, narrower than armor, and less
Relics           a SWAP — what it gives it takes back on another axis
Trinkets         an OPTION, not a number (rule.item-limits)
```

- An armor with **no downside is not a fault.** It is the category doing its job. Do not
  "fix" a clean armor by inventing a penalty for it, and do not read a missing negative as
  an authoring miss. What *is* a fault is an armor whose gain is small for its tier — a
  tier-2 heavy granting no Armor at all is the failure, not an armor granting Armor and
  Health for free.
- Trade-offs are a **tool for identity**, not a tax. Heavy paying Movement and Accuracy is
  what makes heavy feel heavy; it is not the price of being allowed to grant anything.
- **Nine base forms: three light, three medium, three heavy**, plus `item.basic-armor`.
  Heavy leans Armor and Health, light leans Dodge, Stamina and Luck.
- Armor is a dedicated slot and **costs no item slot** (ruled 2026-08-27) — one armor per
  unit, which is the limit that lets the gain be this large.
- Magic armor is a base plus an `enchant.*`.

*Superseded: this section previously read "every armor trades on a different axis, none is
simply better," which a 2026-09-02 review then used to flag four clean armors as broken.
They were not. The ladder above is the authority.*

### Trinkets
- **No stat modifiers and no attacks by default.** The payload is an *activated effect* or a triggered one. Unlimited per hero.
- This is where the weird things live: an aura, a once-per-turn heal, a status stripper, a crit multiplier.

### Deathbed Fighting, downed, and stabilising

```
A unit hits 0 Health
  → roll Deathbed Fighting
      PASS  → it keeps fighting, takes the WOUNDED badge, and returns to MAX Health
      FAIL  → it is DOWNED
```

**Downed is final for the Battle. You do not get back up.** No heal brings a downed
unit back — casting a heal on it does nothing. The wounded badge and the fresh bar
are what *passing* buys; failing has no second door.

A downed unit carries a **bleed-out counter**. So the only question left about a
downed hero is **are they bleeding out, or are they not.**

**Stabilising removes the bleed-out counter. That is all it does.**
It does not restore Health, it does not put them at 1, and it does not stand them
up. A stabilised hero is still on the ground and still out of the fight — they are
simply no longer on a clock.

So content in this area does exactly one of three things:
1. **Grants Deathbed Fighting** — makes the roll better. The strongest and most common. A +20 converts a likely death into a second full health bar.
2. **Stabilises** — removes the bleed-out counter from a downed ally.
3. **Nothing else.** Do not write auto-passes, re-rolls, drop-to-1-Health, or heals that revive. The roll is the only randomness the Consequence Stack allows.

**`[needs: carry]`** — picking a downed hero up and carrying them off the field does
not exist yet. It is the standard companion to stabilising and there is no content
for it. Do not write it until it does.

### Movement actions and bonus moves — two families, one slot

**An Activation spends exactly ONE movement choice.** A **movement action**, or your
**bonus move**. Never both.

**Movement actions read the Movement stat.** All of them start at your *effective*
Movement — the stat after Slow, after grants, after anything that speeds you up or slows
you down — and apply their own flat modifier:

```
distance = effective Movement + the action's modifier
```

| | Stamina | Distance |
|---|---|---|
| **Move** | 1 | **Movement** — pays terrain, **provokes** |
| **Flight** | 1 | **Movement** |
| **Flight (Swift)** | 0 | **Movement + 1** |
| **Flight (Labored)** | 2 | **Movement − 1** |

**Bonus moves never read the stat.** The number in the rule is the number, at Movement 3 or
Movement 8. One per base class by default:

| | Stamina | Cooldown | Distance | Extra | Class |
|---|---|---|---|---|---|
| **Leap** | 2 | 0 | **2 hexes** | +2 Strength until end of Turn | **Warrior** |
| **Side Roll** | 1 | 0 | 1 hex | — | **Rogue · Ranger** |
| **Sidestep** | 0 | **1** | 1 hex | — | **Paladin** |
| **Focus** | 0 | 0 | **none** | gain 1 Stamina | **Mage** |
| **Devotion** | 0 | 0 | **none** | −1 Stamina Max for the Battle, gain 2 Stamina | **Priest** |
| *(none)* | — | — | — | — | **Civilian · Beast · every enemy** |

Every bonus move that moves you **provokes nothing** and **ignores the destination's
terrain cost**. Each has exactly one drawback.

**When you write a new bonus move, three things are non-negotiable:** a fixed distance, the
sentence saying it does not add the Movement stat, and exactly one drawback. `audit.mjs`
checks all three, plus that no class ends up with two and that Civilian and Beast end up
with none.

**Zero hexes is a legal distance, and it is the caster answer.** Focus and Devotion do not
move you at all. 2026-08-21: *"it makes a much harsher penalty on mages and priests
who get engaged in melee."* A caught Mage may Focus and catch its breath, but **it is still
caught** — the choice each Activation is *reposition or refuel*, never both.

**Devotion is the only effect in the game that spends the end of a fight on the middle of
it.** −1 Stamina Max for the Battle, repeatable, until a level-1 Priest with Max 5 has no
bar at all. Do not copy that shape casually.

**These are the defaults, not the list.** Bonus moves are assigned per hero and there will
be more; this is what a class starts with.

**Slow does not touch a bonus move**, because Slow reduces the Movement stat and a bonus
move never reads it. A Warrior on Slow 3 still Leaps two hexes. That is a consequence of
the rule rather than a decision — flagged, not settled.

### Flight and Airwalk — two different things

**Flight is a POWER you are granted. Airwalk is a property you HAVE.** Ruled 2026-08-20:
nothing writes `flight: true` and nothing writes *"you have FLIGHT"* in a trigger. An item
or specialty that gives you flight **grants one of three movement powers**, and `audit.mjs`
fails on either of the old shapes.

| Power | Stamina | Distance |
|---|---|---|
| `power.flight-labored` | **2** | Movement **− 1** |
| `power.flight` | **1** | your full Movement |
| `power.flight-swift` | **0** | Movement **+ 1** |

All three are movement actions that spend the movement slot. They move **1 Movement per
hex** regardless of what the hex costs, pass **over units and obstructions**, and take
**nothing from the ground on the way** — no terrain cost, no trap, no hex status. Only the
hex you **land on** is a hex like any other, and everything about it applies normally.

`item.gale-shroud` grants the labored one, `item.wind-dancers-cloak` and
`specialty.winged-assassin` the standard one, `item.aegis-of-the-fleet` the swift one.

**AIRWALK is a standing property** and it covers only the hex you **END your Turn on** —
you take nothing from the ground you finish standing over. It does nothing about the hexes
you crossed to get there, which is the whole difference: flight is about the journey,
airwalk is about the destination.

### Stealth and reveal

**A stealthed unit cannot be seen and cannot be TARGETED by an attack.** That is
the whole protection, and it is narrower than it sounds:

- **Area effects still hit it.** A fireball does not need to see you.
- **Terrain still hits it.** Standing in fire while hidden still burns.
- **Auras still work, in both directions.** You keep yours and you are still inside theirs.
- **Stealth breaks the moment you use an attack or a power.** Not when you move.

So stealth is a **repositioning tool, not a defence**. You slip across a field that
would otherwise shoot you, and the instant you do anything you are visible again.
A stealth build is one that spends a Turn arriving and a Turn striking.

**Reveal** is its counter — a named effect that strips stealth from units in an
area or within a radius. Reveal content is worth writing because without it stealth
has no answer, and reveal is otherwise a dead effect.

Write stealth as `enters stealth` and reveal as `reveals stealthed units within N`.
Do not invent `untargetable` as a separate word; stealth already means that.

### Stat blending — the cheapest way to make an attack interesting

An attack that adds **a second stat** to its damage is more interesting than one
that adds a bigger number of the first. It also gives a class a reason to want a
stat it would otherwise ignore.

```
a heavy blade damage = Strength + Armor the slower you are, the harder you hit
a mystic spellblade your SWORD attacks add Magic the whole point of a spellblade
a priest's weapon damage = Precision + Spirit
```
This is the good version of the off-primary rule: rather than granting a Mage +2
Strength and hoping, give them an attack that spends the Magic they already have.

### Consuming the target's own status

A family worth using more than once, and it is what makes a status-heavy build pay
off twice. The attack adds **the status already on the target** to its damage:

```
add the target's WEAK to any brawl attack the martial artist
add the target's BURN to any magic attack
add the target's FROST to any magic attack
add the target's BLEED to any physical attack
```
It reads as "you find the wound and you put your thumb in it." Mechanically it
turns statuses from a slow clock into a burst, and it gives a party a reason to
have one hero who applies and another who cashes in.

**Whether it CONSUMES the status or merely reads it is a real design fork** — say
which in the row. Reading is safer; consuming is more dramatic and self-limiting.

### Immunity — where it sits in the status tick

**`immunity: { burn: 1 }`** means the status is reduced by 1 **before it resolves**,
not after. That ordering is the whole mechanic. The status's own −1 decay still
happens afterwards as normal, so it is not a second strip — it is the same strip
every status already gets, and immunity is simply first in the queue.

Burn, resolving on a hero with **Immunity to burn 1**:

```
1.  Burn goes down by 1          <- the immunity
2.  Healing is halved            <- burn's effect
3.  You take damage equal to your Burn
4.  Burn goes down by 1          <- the ordinary decay
```

**A hero holding Burn 1 with Immunity 1 takes nothing and their healing is not
halved**, because step 1 has already taken the last stack off. The status is gone
before it ever gets to act.

**Net effect: the status falls by N + 1 a Turn instead of 1**, and every point of
it that immunity eats is a point that never dealt damage. One point of Immunity
makes a unit substantially immune to that status. Price it as tier 2 or better, and
be careful with 2 against anything that stacks in ones.

**Immunity is not a block.** It accelerates the shedding; it does not stop the
status being applied. A big application still lands and still hurts on the way out.
A rule that says *"cannot gain new Poison"* is a different, harder mechanic and is
not in the game.

### Blood runes — **offensive**, one per hero, 3 mana crystals, re-paid on re-equip
- Slayer bonuses vs creature tags, on-kill triggers, flat Accuracy. Hell-TCG's
  `blood-runes.csv` already has `Required Class · Required Type · Adds Type` — the tag system, shipped.

### Idols — **defensive**, one per hero, **1 Faith per battle**, do not persist
- Because they are re-bought every fight, they should feel like insurance chosen against a known threat, not a permanent stat stick.

### Relics — **one good thing, one bad thing.** No cost. One per hero. Three tiers.
- Tier 3 ≈ double tier 1. The trade must be across *different* axes, or it is just a smaller number: `+1 Strength / −2 Health` is a relic; `+2 Str / −1 Str` is not.
- **A relic must be named as an OBJECT.** *Plague Survivor* and *Hunter's Instinct* describe a person, not a thing you can pick up and hand to someone else — those are `badge.*`. A relic is a censer, a torc, a lantern, a map case, a crown.
- **Hell-TCG's `relics.csv` is a different object** — strategic modifiers
  (trailblazing, scouting, draw). Harvest the *names*, not the mechanics.

### Consumables — single use per combat, tiers 1–3

### Enchantments — bolt onto a base item. **Max two per item.**
- `appliesToTags` is how they are scoped: `enchant.heavens-edge` applies to `melee`.
- An enchant that can sit on any weapon cannot be a weapon row. That is why they are their own kind.

### Powers
- **Name and what it does are the important part.** Numbers are soft.
- `cooldown N` = **skip N Turns.** CD 0 is usable again next Turn.
- **An ATTACK may carry a cooldown too**, and the field was missing from the shape line above
  until 2026-09-02 even though content was already using it. It is rare and it should be: an
  attack is what a weapon is *for*, so putting it on a timer is a strong statement. Three enemy
  attacks use it (Ghoul's Devour cd 3, Bone Dragon's Poison Line cd 3, Vampire Lord's Soul Rend
  cd 2) and exactly one weapon attack does — `attack.knight-shield.shield-slam`, cd 10. If an
  attack has no cooldown field it has no cooldown, which is the default and the right answer
  for nearly every weapon.
- `warmup N` = **skip the first N Turns of the Battle.** Same timer — at battle start, cooldown is set to warmup. Use it for abilities that should not be live before contact, since engagement lands on Turns 2–4.
- **Stamina: 1 for most, 2 for the powerful.** 0 for a stance you pay for once.
- **A free power does not consume the primary action, and free powers are uncapped.**
  Three free powers may all fire in one Turn.
- **A power's stat modifiers last the rest of the Battle** unless the row says otherwise. That makes buffs stances and debuffs permanent — price accordingly.
- Powers may carry tags and may modify by tag: *"+3 to all bow attacks"*,
  *"bow attacks gain onHit: burn 1"*.

### The two shapes a power may take — read this before writing one

**Ruled 2026-08-20: there are two, not three.** The old middle shape — *"your next melee
attack gains X"* — is gone. Nothing tracks which attack is next, and nothing checks what
form it turned out to be, so a modifier cannot be parked against a future swing.

**1 — A duration modifier on your attacks.**

```
Until the end of your next Turn, your attacks gain +5 Crit and add your Armor
to their damage, and heal you 2 on a hit.
```

No form qualifier. Not *melee* attacks, not *dagger* attacks — **your attacks**. The window
is the cost: you get a Turn of it, and what you swing inside that Turn is your business.
All 23 next-attack powers were rewritten into this shape.

**2 — A standalone effect**, and only if it does something a weapon cannot: an area, a
status, a heal, a stance, terrain, movement, Protection, a trigger granted for a window.

**A power may not simply be an attack.** If the text is *"melee attack at +2 Strength"* and
nothing else, delete it — the weapon already does that, and the power is competing with the
magic weapon the hero could have equipped instead, which is a competition it always loses.

**What a power may not ask about.** No `usable only if` gate on a Health threshold or an
event history — *"at or below half Health"*, *"after an ally has died this Battle"*,
*"on a Turn in which something died"* are all cut. No occurrence counting: no *first time*,
no Nth hit, no per-Turn tally. No ignoring a status — **Immunity N** is the mechanic that
does that. `audit.mjs` fails on every one of these.
### Specialties
- **More than three per class.** Folding Hell-TCG's 20 classes into HoBaT's 7 gives roughly 6–10 each.
- A specialty is a **branch, picked once at a level-up**. The hero *becomes* it.
- It carries: a small stat block, zero or more triggers, and **a pool of powers only it can offer**. Class gates which specialty lists you see; the specialty determines every class power you can subsequently access.
- **A specialty must play to its class's identity, not fight it.** A Ranger branch that wants you stationary and armoured is a Warrior wearing the wrong label. The
  Sentinel works as *−2 Movement / +4 Health / +2 Reach / +1 Precision* — slow, and shooting from further out than anyone alive — because that expresses "hold still" in the Ranger's own stats instead of borrowing the Warrior's.
- **A negative is allowed when it IS the identity.** Sentinel's −2 Movement and
  Berserker's −10 Accuracy are the point of those branches, not a tax on them. What the no-negatives rule forbids is the reflexive −5 Dodge stapled onto everything to make the arithmetic look balanced.
- **Three stat modifiers. One ability. No negatives.** Ruled 2026-08-17. Five stats and two triggers is more than a player can hold in their head while choosing between nine of them, and it makes every specialty read like every other one. The settled trio — Berserker, Shieldbearer, Leader — are the exception and keep their original blocks.
- **Vision is thematically tempting and mechanically quiet.** It only bites in darkness, fog and stealth-detection. Reach for **Surge, Crit and Luck** instead;
  Vision belongs to the one or two specialties whose whole point it is.
- **A specialty should change how you play, not just what your numbers are.**
  Berserker is +2 Strength and −2 Precision and −10 Accuracy *and* −1 Item Slot: it is a commitment, not an upgrade.

---

### Trigger hooks — the twelve, and where `onCrit` sits

```
startOfBattle · onAttack · onMiss · onHit · onCrit · onDodge · onDamage ·
onTakingDamage · onKill · onDeath · onEquip · onActivationEnd
```
plus **`aura`** and **`passive`**, which are standing properties rather than events.

**The attack order.** `onAttack` always fires. Then **`onMiss` or `onHit`**, never both.
Then **`onCrit`, only if it crit** — so `onCrit` always fires *after* its own `onHit`, and
an effect can hang on both. Then `onDamage`, only if damage actually landed; `onHit` fires
even when armour absorbed all of it.

### `onKill: destroy the corpse` — write it exactly this way

Ruled 2026-08-30, and going onto **badges, weapons and powers** alike (2026-09-02). The
mechanic is one line and the phrasing is fixed, because the effect vocabulary is a **census of
use** — a synonym is a new verb, and a new verb is a gap nobody meant to open:

```
onKill: destroy the corpse — no corpse is made
```

Not "destroys the body", not "leaves nothing", not "corpse denied". One phrasing.

**What it buys.** A destroyed corpse cannot be raised, summoned from, eaten or fed on — it
stops zombies rising, it stops the Escalating Demon, and it stops anything else that reads a
body. Denying corpses is the counter to the entire undead economy, which is why it is worth
a badge slot, an enchant or a power rather than being free. See `rule.corpses` for all four
denial routes, and note that **summons never leave a corpse** in the first place, so killing a
raised zombie needs no help.

**Carriers.** `badge.gravedigger` is the canonical one and fixed the wording. On a **weapon**
it belongs on the attack's `triggers` or on an enchant's, not in the item's prose. On a
**power**, it is an `onKill` trigger on the power row.

**`onCrit` was ratified 2026-08-20** and it had been in use before it was written down —
`enchant.bloodletting` is where it started. It matters more than a twelfth hook usually
would, because it is the answer to a question that kept producing bad content:

**There is no crit damage multiplier, and you must not invent one.** A crit is not a ×2,
so "your crits deal ×2.5 instead of ×2" is built on a number that does not exist. What you
write instead is an `onCrit` that **deals more crits**:

```
onCrit: deal 2 crits the strong version — item.tandras-blood-vial
onCrit: deal 1 crit the small version
```

### `onDodge` — the defender's hook

**Ratified 2026-08-20, and it needs a station that does not exist yet.**

`onMiss` and `onDodge` are not the same event and do not fire on the same unit:

- **`onMiss` fires on the ATTACKER.** You swung and you missed.
- **`onDodge` fires on the DEFENDER.** Their Dodge is the reason you missed.

**The test:** the attack missed, **and it would have hit had the target's Dodge been 0.**
That is computable — Dodge is already its own accuracy station (`600 TARGET_DODGE`) and the
roll already emits an `accLedger`, so the engine can say whether that row is what pushed
the roll under. A miss on a target with 0 Dodge is a miss and nothing more.

**Timing.** The attack resolves and settles as normal. `onDodge` fires **at the end of that
settlement**, then settles itself — like every other trigger, and never re-entrantly.

**The payload menu**, all seven authored into the set:

| Payload | Where it landed |
|---|---|
| gain +10 Dodge until the end of your next Turn | `item.ghost-thread-cloak` |
| gain +50 Dodge until the end of your next Turn | `item.cloak-of-ghostform` |
| heal 2 | `specialty.trickster` |
| gain +10 Accuracy for the rest of the Battle | `item.gale-shroud` |
| Surge Chance +30 | `item.wind-dancers-cloak` |
| the attacker takes 5 true damage | `enchant.riposte` |
| the attacker gains 3 Burn | `enchant.scalding-ward` |
| +10 Crit for the rest of the Battle | `item.rune-deathdealer` |

`item.rune-deathdealer` is worth reading on its own: **onDodge grants Crit and onCrit grants
Dodge.** The two new hooks feed each other, so a run of near misses sharpens you and a run of
crits makes you harder to touch. It is the first entry in the set where the two halves of a
build compound instead of trading off, and it is the shape to copy when you want a rune to
have a *direction* rather than a number.

**`onDodge` is also how you PRICE Dodge, and that is the more useful half.** Dodge gains
value as you stack it, so a big Dodge number has always been the hardest thing on the ladder
to sell. An `onDodge` cost fixes that: the more it works, the more it charges you.

```
item.wraithform-cloak    +40 Dodge · onDodge: take 2 true damage
a boss                  +100 Dodge · onDodge: take 1 true damage
```

That second line is the pattern for the bestiary. A unit that almost nothing can hit is
un-fun and unkillable; a unit that almost nothing can hit **and bleeds every time it proves
it** is a puzzle with an answer — keep swinging. Reach for this before you reach for
capping Dodge.

**The standard rider on a status enchantment** is that a crit delivers 2 more of whatever
status the enchantment already applies. All four now follow it:

| Enchantment | on hit | on crit |
|---|---|---|
| `enchant.fire` | apply 1 Burn | **apply 2 more Burn** |
| `enchant.frost` | apply 1 Frost | **apply 2 more Frost** |
| `enchant.venomous` | apply 1 Poison *(on damage)* | **apply 2 more Poison** |
| `enchant.bloodletting` | — | apply 2 Bleed |

**`onAttack` always fires, so an unconditional `onAttack` is not a trigger.** If the effect
is *"this attack has +15 Accuracy"* with no condition on it, that is a **stat line** wearing
a trigger's clothes — write it in `statModifiers` and delete the hook. A *conditional*
`onAttack` is real and stays: *"+10 Accuracy against a target at or below half Health"*,
*"+15 Accuracy and +10 Crit if an ally is adjacent to the target"*. Ruled 2026-08-20 off
`enchant.gale-arrows`, which branched on whether your Accuracy was under 100 — below it
gave +15 Accuracy, above it +3 Crit, and those are so nearly the same thing that a flat
**+20 Accuracy** does the job with no rule attached. `audit.mjs` fails on the pattern now.

Sources stack additively — two sources of the same trigger both fire, no dedup and no
priority.

### Say it once, in the words the function list uses

The vocabulary is in `FUNCTIONS.md`, generated from the content, and it is the whole of
what a rule may say. Two habits keep breaking it:

- **A cleanse has a size.** *"Remove all Burn"* is not a thing — write **remove N**. Thirty entries said *all* and every one of them now names a number, because *all* is unbounded and nothing else in the game is.
- **One wording per idea.** *"It does NOT provoke an attack of opportunity"*, *"this does not provoke attacks of opportunity"* and *"the movement provokes nothing"* were three ways to write one function. It is **provokes nothing**, everywhere.

And two things that are NOT separate functions, however they read:

- **Protection is a status.** There is no "grant Protection" — it is `apply a status`, same as Burn.
- **A kill is a HOOK, not a condition.** *"If it kills"* inside a description is `onKill` written the long way. Put it on the hook.

- **Statuses are proper nouns.** *Burn, Poison, Bleed, Weak, Stun, Frost, Regeneration,
  Protection, Karma.* Forty-one entries wrote them lowercase — *"gain 2 protection"*,
  *"apply weak 4"*, *"Immunity to burn 1"* — which reads as a description rather than a reference to the named thing. The lowercase verb is fine (*"allies caught in it burn too"*); the status is not. The **bleed-out counter** is deliberately lowercase: it is the downed clock, not the Bleed status, and capitalising it would say the wrong thing.
- **One duration wording.** *"for the Battle"* and *"for the rest of the Battle"* are the same duration written two ways. It is **for the rest of the Battle**.
- **The word is "ally".** Not *hero*. There is an `ally` targeting shape and there is no
  `hero` one, so a rule that says *"every hero within 6 hexes"* cannot name its own shape.
  *Hero* is fine in the commentary sentence, where it means a player character.
- **A hook goes in the triggers array.** *"Melee attack, strength +0, +30 Accuracy. onHit: apply weak 4"* is a trigger typed into prose. The description says what happens; the hook is a field.
- **The targets field wins.** Five entries had a radius in the field and a different radius in the sentence. If the sentence repeats the shape, it repeats the field's number — or, better, it does not repeat the shape at all.

### Ground layers are persistent, and a hex holds exactly one

Ruled 2026-08-20. There are four: **burning**, **frost**, **poisoned** and **darkness**.

- **No number.** A hex is burning or it is not. There is no *burning 2*.
- **No clock.** It does not tick down, it does not expire, and nothing remembers when it was lit. Once the ground is burning it stays burning.
- **One layer per hex.** Applying a different layer **replaces** the one already there.

That third point is the whole reason Quench works: frost puts out a fire because it *takes
the hex*, not because it carries a cancel clause. Ten entries used to say some version of
*"cancelling any burning already on them"* or *"burning 2 for two Turns"*. Both are gone —
the first restates `rule.ground-layers`, the second contradicts it.

**Ground layers are not statuses.** A unit gains **Frost**; a hex becomes **frost**. Same
word, two systems, and the capital letter is the only thing telling them apart. A status
has a magnitude and decays at End of Phase; a layer has neither and does not.

### Power is a stat, and it was already ruled

Ruled **2026-08-23** in `ENEMY-REVIEW.md` — not open, and not mine to ask about again.
**Power is an enemy stat**, close kin to Spirit and Magic: a pool the enemy side reads, and
which a fair number of enemy attacks scale off.

- **Power always resolves to an integer before it adds to anything**, rounded to nearest, 0.5 up. Half of 3 is 2; a third of 4 is 1.
- It is gained in **exactly three ways**: the battle **starts** with N (a difficulty dial); a unit contributes a **one-time** amount on arrival, which stays in the pool when it dies; or a **clock or condition escalates** it (an end-of-turn +1, a +2 on a kill). Only the third kind can be shut off by counterplay, which is what makes killing a battery a decision.
- Consumers read the pool; most contribute nothing back.

So `Precision + Power`, `Strength + ½ Power` and `Protection ⅓ Power` are all sound as
written. The engine has nothing yet; the design is closed.

### Afflictions are badges, not statuses

Ruled **2026-08-23** in `ENEMY-REVIEW.md`, and reconfirmed 2026-09-01. There are **exactly
four**: **Possession · Vampirism · Lycanthropy · Rotting Flesh**. They are **badges that get
added to a character**, not status effects — which is why `badge.possession` and
`badge.lycanthropy` already exist and there is no collision to resolve. When an affliction
badge lands on a hero, **the hero's art changes** to that affliction's portrait.

### Forced movement is Knockback and Pull

Ruled 2026-09-01, **reversing the 2026-08-20 cut**:

> *"Yep, I'm adding pull back in. It's a reversal."*

Two verbs, one axis: **Knockback** pushes directly away from the source, **Pull** draws
directly toward it, each taking a number of hexes. There is still no third verb. See
`rule.forced-movement`. Drive, and the zone-of-control clause on the Tower terrain, are
**not** covered by this reversal and remain open.

### Five more statuses, and a status is also a number

Ruled 2026-09-01. **Taunt, Dazed, Confusion, Root and Shadow are status effects.** The closed
list of ten becomes **fifteen**:

> burn · bleed · poison · protection · weak · stun · slow · frost · regeneration · karma ·
> **taunt · dazed · confusion · root · shadow**

Three are defined and settled; **Root and Shadow are named but have no effect text yet**, so
nothing may reference them until they do.

- **Root** stops movement outright — not a reduction, a stop — for as long as it lasts.

- **Taunt** cuts both ways by who applied it. A **hero** taunting an enemy makes that hero the enemy's priority target — it fixates. An **enemy** taunting a hero **takes the hero away from the player**: AI-driven, activates first, prioritises the taunter.
- **Dazed** takes control the same way, with **no** priority target.
- **Confusion** swaps an enemy's AI strategy for a different one.

And the second half, which is the part that changes how content can be written:

> *"All of them or status effects can also be used to change the scale of damage or effect."*

**A status magnitude is a value.** `Strength + 2 x the target's Root` is legal, and so is
scaling a heal, a duration or a chance off a status the target already carries. This holds for
every status, not a named few. See `rule.status-as-a-value`.

**Two things ruled out at the same time:**

- **Damage-*dealt* reduction exists only as the Weak status** — −1 damage per point, 35 uses. **No other content may do it**: mitigation is Armor, Resist and Protection, on the receiving side. Audit rule `reduces-damage-dealt` (which does not fire on Weak — checked). *Corrected 2026-09-02: this line previously read "reducing damage dealt does not exist," which is false with Weak in the game and would lead an author to conclude Weak is illegal. Saying where the mechanism lives is the better rule.*
- **Invisibility is Stealth.** Not a second system.

**Found while applying this:** the audit's closed status list had been **missing `slow`** ever
since Slow was ruled a status on 2026-08-20, so a condition testing for Slow read as unknown
vocabulary. Fixed.

### Nothing outlasts the Battle

Ruled 2026-08-31:

> *"There's no permanent past the end of battle for anything."*

The four durations already stop at `rest of the Battle`. This ruling says that ceiling is
**absolute**, and it applies to every kind of effect, not just statuses: a stat change, a
drain, a scar, a max-Health loss. There is no fifth duration above the fourth, and there is
no "and it carries into the next Battle."

*Permanent* may still be written inside an entry, but it can only ever mean **permanent
within this Battle** — which is what `rest of the Battle` already says, so prefer that
wording. The sweep that applied this ruling found the word doing real work in one place:
**33 ported Hell-TCG hero triggers used an action literally named `modifyStatPermanent`**,
now `modifyStatForBattle`. Three flavour lines said *forever* and were reworded (Siege
Crossbow, Ancient Ward, White Steel).

> **Engine note.** `modifyStatPermanent` was the ported action name. If the engine maps
> trigger actions by string, it needs the same rename or those 33 triggers stop resolving.

Two audit rules hold it: `claims-permanence-past-the-battle` and `permanent-action-name`.

### Every enemy states its attacks, and melee is the floor

Ruled 2026-08-30:

> *"Every enemy needs its attacks clearly defined. If it does not have a melee attack, an
> enemy has a basic melee S+0 damage attack."*

Two halves, and the first is the one that bites. **An enemy with no attack listed is
unfinished content**, not an enemy that cannot swing — so every enemy names its attacks by
id, and every id must resolve to an attack that exists in `hbt-content.json`. Referencing a
name the engine happens to know is not a definition; the sweep that applied this ruling found
**seventeen of twenty-one test units pointing at five ids the content had never defined**
(`attack.zombie.basic`, `attack.mage.staff`, `attack.mage.strike`, `attack.warrior.axe`,
`attack.ranger.bow`).

The second half is the backstop. **`attack.basic.melee`** — Strength +0, melee reach, 0
stamina, no accuracy modifier, one target — is carried by any enemy with no melee attack of
its own. A ranged enemy still has it, for when something closes. Nothing on the board is ever
unable to act.

Four audit rules hold it: `enemy-has-no-attacks`, `enemy-attack-id-does-not-resolve`,
`enemy-has-no-melee-attack`, and `basic-melee-attack-changed` — the last pins the floor at
melee / strength / +0 so it cannot drift.

### Toughness does not reduce damage

Ruled 2026-08-20, after I got it wrong. **Toughness is injury capacity and the base for
Deathbed Fighting.** It has nothing to do with a hit landing.

Damage is reduced by exactly three things:

- **Armor** — physical damage.
- **Resist** — magic damage.
- **Protection** — everything, from every source. It is the ONLY flat reducer, it is a status, and it is spent as it absorbs.

*"Take 1 less damage from every source"* is not a new mechanic to invent; it is Protection
written the long way. True damage skips Armor and Resist and is stopped only by Protection.

### A one-Turn Movement loss is the Slow status

Ruled 2026-08-20. Fourteen entries said *"the target loses N Movement on its next Turn"*,
in two different wordings, and every one of them asked the engine to remember whose next
Turn it was. It is **Slow N** now — a status like the rest, reducing Movement by its value
and losing 1 at End of Phase. Write **apply N Slow**.

### A cost is a number, not a formula

Ruled 2026-08-20. Two entries charged you *per unit of good done* — *"take 1 Burn for each
stack removed"*, *"take 2 true damage for each ally you healed"*. Both are gone.

The problem is not that it counts. It is that **the player cannot see the price before
committing**: the same power costs 2 in a thin fight and 8 in a good one, and the good one
is exactly when you want to use it. A cost belongs on the card as a number.

### The Beast carries nothing

Ruled 2026-08-20, when Beast became the eighth class. **The Beast is granted no Item Slots
at any level.** That is not a gap in the table; it is the branch.

The Civilian and the Beast are the two ends of one axis. The Civilian ends the run with
more Item Slots than anyone and the smallest stat line — it is what it carries. The Beast
gets none — it is what it is. Roughly four ladder points that other classes spend on slots
come back to the Beast as Health, Strength and Reach, which is why its L5 choice list has
Reach on it where every other class offers a slot.

Its attacks come from **natural weapons** — Fangs, Claws, Tail, Horns, Hooves, Breath. They
are ordinary weapon items with `slots: 0`, `hands: 0` and `classRestriction: class.beast`,
so they use the same weapon-to-attack machinery as a longsword and need no new mechanic.
Their form tags — `fang` · `claw` · `tail` · `horn` · `hoof` · `breath` — sit alongside
`axe` and `spear` in the same vocabulary.

### Every hero has a class, and no class has one member

Ruled 2026-08-20: *"change the Spirit to just be a Civilian so that there are no outliers on
classes."* Five heroes used to carry `class: null` — four Beasts and one Spirit. The Beasts
got a class built for them; the Spirit became a Civilian, because **one hero is not a
class.** `verify-codex.mjs` now fails if any hero is classless, if a hero points at a class
that does not exist, if a class has fewer than two heroes, or if a class has no level table.

### End of Activation runs ONCE per unit, however many times it surged

Ruled 2026-08-21. **An Activation is the totality of one unit's doing of things** — you
pick the unit, it moves, it takes its primary action, and when it is finished the
Activation is over. A **Surge** does not end it and start another; it grants another
movement and another primary action *inside the same Activation*, and the surge check sits
**above** the End of Activation ladder.

So an `onActivationEnd` effect fires **once per unit per Phase**. Fourteen entries hang off
that ladder and eleven of them are sustain — heal 1, heal 2, gain 2 Protection, remove 1
Weak and 1 Poison. Under the old ordering a surging hero got every one of them twice, on
top of the free stamina and the free go that the surge already hands out.

**Write End-of-Activation content as if it happens once, because it does.** If you want
something to scale with how much a hero did, that is a different hook — and probably a
counter, which does not exist.

### Vision does not go on a weapon

Armour, relics and trinkets may grant Vision. **A weapon or a weapon enchant may not** —
Vision is about what you can find, not about how hard you hit, and putting it on the
thing you swing reads as filler. Ruled 2026-08-20 off `enchant.ghost-slayer`, which
carried +1 Vision and now carries a bigger slayer and a kill trigger instead.

The other half of that ruling: **enemies do not have Vision at all**, so any effect that
takes Vision *off* an enemy does nothing. Three entries did — `item.tongue-of-xarveth`,
`power.shadowbound.dark-veil` and `power.apothecary.smoke-bomb` — and all three were cut.

### Targeting shapes — the authored list

An attack's `targets` is prose, but it must be one of these shapes. Anything else is a new
shape and needs building before it is authored against.

| Shape | Written as |
|---|---|
| single | *one enemy in melee reach* · *one enemy within N hexes* |
| **line of 2** | *one enemy in melee reach and the hex directly behind it* |
| **arc of 2** | *choose an adjacent hex; hit that hex and one hex adjacent to both you and it* |
| **arc of 3** | *choose an adjacent hex; hit that hex and the two hexes adjacent to both you and it* |
| blast | *one enemy within N hexes and every enemy adjacent to it* |
| all-adjacent | *every enemy adjacent to you* |
| multi-target | *up to N different enemies within M hexes* |
| ally | *one ally within N hexes* |

**Every hex in a multi-hex shape is its own attack.** It rolls separately, so it can miss
separately and crit separately. Ruled 2026-08-20 — that is what makes a three-hex cleave
worth three stamina rather than one attack with a bigger number.

**Spears and polearms reach the row behind the row**, which is the line-of-2 shape:
`attack.hunting-spear.thrust` and `attack.glaive.impale` both hit the hex behind the
target. **Swords sweep sideways**, which is the arc: `attack.greatsword.great-cleave` takes
three hexes, `attack.glaive.sweep` two. *All-adjacent* is the widest shape in the game and
should stay rare.

### There is no stacking limit

**Ruled 2026-08-20.** Nothing in the engine holds a counter that says *"you have taken this
bonus three times already."* So a repeating gain either stacks forever or it does not repeat.
Seven entries carried a cap and all seven lost it — Lucky Charm, Horror Breaker, Berserker
Blood, Avatar of War, Heart of Vyrmothax, Seer and Blessed Sufferer.

**What is still allowed** is a clamp computed **fresh inside one resolution**, because there
is nothing to remember:

- *"a dagger attack against each enemy whose hex you were adjacent to, to a maximum of three"*
  — a targeting shape, resolved and forgotten.
- *"2 extra damage for each 2 true damage taken so far, to a maximum of 8"* — a formula clamped when the attack resolves.
- *"+1 Resist for each enemy on the field with the demon or undead tag, to a maximum of +3"*
  — an aura recounted from the board every time it is read.

**What replaces a cap is the trigger.** Bound the gain by making it hard to earn rather than
by capping the total: `onKill` is bounded by how many things die, `onDodge` by how often they
miss. Of the seven that lost their caps, six hang on `onKill` or `onTakingDamage` and limit
themselves. **`specialty.seer` is the exception** — it fires `onHit` against one target and
is now the least self-limiting thing in the set. Worth a second look.

### Conditions — what an effect is allowed to ask about

A condition is legal when the engine can answer it by looking at **the acting unit and
its own six neighbours**, or at facts already on a unit's sheet. It is illegal when the
engine would have to remember something, or walk somebody else's neighbourhood.

**`adjacent to self` is an authorized condition, in two forms.** Ruled 2026-08-20.

```
adjacent-to-self: hero an ALLY is adjacent to you
adjacent-to-self: enemy an ENEMY is adjacent to you
```

Both are cheap: six hexes, checked against the unit that is acting. Everything already in
the set that reads *"every ally adjacent to you"*, *"any enemy that begins its Turn
adjacent to you"* or *"you may not use this if any enemy is adjacent to you"* is this
condition and stays.

**Adjacency to the TARGET is not the same question and is not authorized.** *"while the
target is adjacent to one of your allies"* asks the engine to walk a second unit's
neighbours and check the side of everything standing there — a different and more
expensive check, wearing the same word. `enchant.catch-them-off-guard` was cut for it.

**Per-target state is never authorized.** *"gain +10 Accuracy against that target until
you hit it, stacking"* requires a number remembered against one specific enemy, for the
rest of the battle, per attacker. `enchant.unerring` was cut for it. A stacking bonus is
fine when it lives on **you** — *"gain +5 Accuracy for the rest of the Battle, stacking"*
is one number on your own sheet and there are a dozen of those.

**The test, in one line: could a rule read only your sheet and your six neighbours?**
If yes it is a condition. If it needs a memory, a second unit's neighbourhood, or a
question the engine cannot currently answer, it is a mechanic — and a mechanic has to be
worth building before anything is authored against it.

## 6. The traps 1. **Accuracy is not a hit-rate stat past 100.** Surplus becomes Crit at ÷4, so
   +20 Accuracy on an already-reliable hero is +5 Crit. Everything that *reduces*
   Accuracy eats crit before it eats reliability.
2. **Reach only helps ranged.** A melee weapon granting Reach does nothing.
3. **Stamina Regen is sacred.** It hard-caps around 3. Granting it is a tier-3+ move.
4. **Magic and Spirit are party-wide sums** — but casters are rare, so a starting party has Magic ≈ 2 and Spirit ≈ 2. Do not price them as if every hero has 3.
5. **Bleed is never resisted.** Burn and poison are, per tick, separately. Two
   Resist neutralises two burn *and* two poison at once.
6. **Protection NEVER has a duration, and it STACKS with itself.** You grant a number and that is all. It decays 1 at End of Phase *and* is spent by the damage it absorbs, so five Protection is gone in five quiet Turns or one loud one.
   Writing *"Protection 5 until the end of your next Turn"* is a mistake — the decay already is the timer, and the clause makes it strictly worse than the same grant written plainly. **A second grant ADDS to whatever is left**; it never replaces or discards it. Ruled 2026-08-20 — `item.aether-crystal` claimed the opposite and was wrong, and `audit.mjs` now fails on any entry that says Protection does not stack.
7. **Karma is the only status that decays on an EVENT, not on the clock.** Ruled 2026-08-20. While you carry it, **every heal you receive is increased by your Karma** and **every point of damage you deal is increased by half your Karma, rounded down**.
   It does not tick down at End of Phase like the others — it is spent by killing.
   **Every unit in the game has, on kill, lose 1 Karma** (`rule.karma-decay` in
   `settled.json`, universal, not a power anyone takes). Nothing grants Karma yet, and that is fine: the status exists so content can be written against it.
8. **Frost cancels burn on application**, and amplifies incoming *physical* damage by its value. It is the anti-fire and the armour-shredder in one.
9. **Armor and Resist floor at zero.** Shred effects stop mattering at some point.
9. **Only attacks crit.** If it rolls to hit, it can crit; if it does not roll, it cannot. Area powers never crit.
10. **`startOfBattle` fires when the two sides are still far apart.** Allies deploy together, so *"every ally within 3 hexes gains +1 Armor"* at battle start is fine. **An enemy radius at battle start hits nobody** — *"2 Bleed to every enemy within 3 hexes"* is a trigger that never once fires. If an effect should reach enemies by distance, it is an **aura** (checked continuously) or it hangs off
    `onHit`. Same trap in a smaller form: a Vision snapshot taken at deployment reveals almost nothing, and a condition like *"if no enemy is within 4 hexes"* is trivially true at deployment and is therefore a free bonus, not a condition.
11. **There is no flanking.** It appears in no current design document. Positional advantage is expressed through **adjacency**, **zones of control and attacks of opportunity**, **knockback**, **Reach**, and **terrain that costs extra
    Movement** — all of which are real. Do not write "while flanking".
12. **The 0-stamina punch means there is never a dead turn** — so an ability that only matters when you have stamina is weaker than it reads.

---

## 7. Hell-TCG → HoBaT conversion

| Hell-TCG | HoBaT | Note |
|---|---|---|
| melee | Strength | damage only now |
| ranged | Precision | damage only now |
| health | Health | |
| armor · resist · dodge · reach · magic · spirit | same | |
| itemSlots | Item Slots | |
| maxAfflictions | **Toughness** | the injury-capacity stat, renamed |
| resolute | **CUT** | nothing defined it. rewrite any content that spends it |
| `ifClass: {Ranger: {...}}` | **`classRestriction`** | repealed as a bonus; it is a gate now |
| `Required Type` / `Adds Type` | **tags** | ports directly |
| `warmUp` | `warmup` | same meaning, now defined as a battle-start lockout |
| `cooldown` | `cooldown` | now defined as "skip N Turns" |
| row / column targeting | **hexes** | rewrite entirely — there are no rows |
| `grantDraws` · `grantActions` · faith · supplies | **cut or Kingdom-tier** | The Hand is deferred |

**No Hell-TCG equivalent exists for:** Accuracy · Crit · Luck · Vision · Movement ·
Stamina (max and regen) · Surge. **Those seven are what make this a different
game**, and every one of them has to be authored from nothing.

### All healing comes from one function

**The stations run in this order — ruled 2026-09-02:**

1. the **base heal**
2. **all bonuses** to healing are added, **Karma included**
3. **Burn halves** the result
4. what remains is **applied to Health**, and **half the applied amount is removed from Bleed** (nearest, 0.5 up)

Bonuses always land before the halving. Karma 3 on a Regeneration 4 tick, with Burn present,
heals `(4 + 3) ÷ 2 = 4` — and sheds 2 Bleed. Regeneration calls this function like everything
else, so a Regeneration tick is bonused, halved and Bleed-stripping exactly as a cast heal is.


Ruled 2026-09-02:

> *"Regeneration should CAUSE healing. Healing should all come from the same function."*

There is **one heal**. A power, an item, a trigger, a lifesteal rider and **Regeneration** all
call it — Regeneration is not a private path that happens to add health at End of Phase, it is
a caller like any other. So everything already true of healing is automatically true of a
Regeneration tick, and a new modifier is written **once** instead of once per source.

The stations on that function, as ruled so far:

| | |
|---|---|
| **Karma** raises the amount | *"every heal you receive is increased by your Karma"* |
| **Burn** halves the amount | *"halves all healing received while held"* |
| **Bleed removal** — pending §2.1b of `DESIGN-HANDOFF-2026-09-02.md` | healing received removes Bleed equal to half the healing |

**What this buys.** Three interactions that used to be separate special cases fall out of one
pipeline for free. A unit carrying Burn and Bleed that receives Regeneration 4 heals 2, not 4 —
and therefore sheds 1 Bleed, not 2. Nobody had to write that down; it is what the function does.

**What it costs.** The function needs a station ORDER, the way damage already has
`SOURCE_STATUS (250)` and `PROTECTION (550)`. Karma before Burn or Burn before Karma is a real
difference, and content will start to depend on it.

**Authoring consequence:** never write "this healing is not affected by X". If a heal should
behave differently, that is a change to the function or a new station on it — not an exception
written into one entry.

### Limits stop stacking; options need no limit

Ruled 2026-09-02. The per-unit limits on **Armor, Idols, Blood Runes and Relics** exist for one
reason, and it is not flavour:

> *"to prevent EVERY item slot from being additive in any direction. So I can't just add 5
> defensive things. Because the Trinkets mostly give options, they don't need that limit."*

So the authoring test for a new item is one question:

> **If it is additive, it belongs in a limited category. If it is an option, it can be a trinket.**

The content already holds this line. Of the 30 trinkets, **not one is a pure stat modifier**:
19 are usable actions (place traps, blink, heal an adjacent ally, enter stealth, reveal
stealth, hand an ally a Move) and 11 carry conditional triggers or an aura. That is unusual —
the category with no cap is normally where flat numbers accumulate.

**The consequence worth knowing:** because trinkets buy options and options cost slots, **item
slots are a coverage budget, not a power budget.** Another slot makes a hero more flexible, not
stronger, so slots can grow generously without inflating anything.

**The deliberate exception: status immunities.** Immunity to Burn 1, Poison 1, Weak 1, Frost 1
and the Hearthmother's pair are additive — and they stay trinkets on purpose, because they are
**conditional**:

> *"I intentionally had immunities as an exception, because they are useless often. I want it
> in planning. OK, I can use my immunity — on whom? Is a good, non-permanent choice in battle
> prep."*

An immunity is worth nothing most fights, so its value is not the number: it is the War Council
question of who should carry it against *this* encounter. That is a prep decision, not a stack.

Audit rule `trinket-is-a-stat-stick` enforces the test and exempts anything whose prose names
an immunity.

> **A rule that was written and removed the same day.** The mirror check — *a limited item that
> carries nothing additive is equally miscategorised* — is true as design and unenforceable as
> lint. Additive weight lives in `statModifiers`, in the `slayer{}` field, and in prose, so the
> check produced 8 false positives on its first run: the three slayer runes, and the idols
> whose weight is written as "Immunity to Burn 1" or "Protection equal to 2 + Spirit". It was
> removed. A rule that cries wolf is worse than no rule.
