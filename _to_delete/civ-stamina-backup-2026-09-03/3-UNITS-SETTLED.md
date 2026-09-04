# Units & Progression — settled surface

**Published.** Sessions 4 and ART read this file, and never `3-UNITS-NOTES.md`.
Only shaped entries appear here: id, shape, one line of intent. Nothing provisional.

Kinds: hero classes · tiers · stat lines · level curve · specialty.* · civilians

---

## CHANGED

Renames and removals, newest first, with the date. Downstream sessions check here
before anything else — an id that changes after publication is a breaking change
for every session that referenced it.

**2026-08-19 — ALL SEVEN LEVEL TABLES EXIST.** Written to `content/LEVEL-TABLES.md`,
machine-readable at `content/gen/levels.json`, rendered in the Codex under **Level
Tables**, and linted by `content/audit.mjs`. Warrior 1–10 and Ranger 2–6 are the
dictated numbers, transcribed unchanged. Ranger 7–10 and the whole of Rogue, Mage,
Priest, Paladin and Civilian are **authored against the stat value ladder** and are
marked as such row by row — nobody has said those numbers out loud yet.

Four rulings were needed to make the seven tables agree with each other:

1. **The specialty is picked at level 2, for every class.** The Warrior dump said
   *"the first level up for a warrior, they choose their specialty"*; the Ranger table
   says level 2 outright; the class-power rule says *"at level two you choose a class
   specialty"*. All three agree once *first level-up* is read as the 1→2 transition,
   which it is — **level 1 is the starting line, not a level-up**, and no class grants
   anything at level 1.
2. **Level 5 is the choice level for every class**, and the choice is always paired
   with a small flat grant. Both dictated tables do it that way.
3. **Stamina Regen is granted exactly twice — level 6 and level 10** — taking it 1→3.
   The Warrior does this explicitly; the Ranger's dictated L6 grant fits it. **Civilian
   is the exception and never gains it**, because a Civilian has no stamina bar; it is
   granted no Stamina Max either, and gets Item Slots instead — six across the run,
   more than any other class.
4. **The Warrior L5 choice list was dictated without magnitudes** (five bare stat
   names). Magnitudes are copied from the Ranger L5 list, which is the only place any
   were given. Flagged in the table, not silently invented.

**2026-08-19 — `Disengage` is removed everywhere; `Sidestep` replaces it.** Ruled
2026-08-17, applied to the documents today: `../GAME-DESIGN.md` §4 (the escape-valve
section rewritten, the movement table, the stamina line), `injury.missing-leg`'s action
veto in four files, and `engine/MECHANICS-GAP.md`. **Sprint survives in §4 with no
source that grants it** — Angela ruled a hero starts with *two* movement abilities,
Move and Sidestep, so Sprint needs either a grantor or a cut. Not ruled.

**2026-08-17 — RULED BY ANGELA, from the Actions chat. Two entries here are now wrong.**

1. **The class is `class.warrior`, not `class.soldier`.** The rename is reversed.
   **Soldier is a badge** — a classification a hero can hold regardless of class.
2. **Level-up tables are PER CLASS — seven of them.** The "Progression" table below
   says *"per hero type, not per class and not per specialty"*. That is overruled.
   Angela dictated Warrior 1–10 and Ranger 2–6 as class tables; they are transcribed
   in full in `../2-ACTIONS-NOTES.md`. Five classes still owe a table.
3. **The four-class roster is superseded by seven** — ranger · warrior · rogue ·
   priest · mage · paladin · civilian. **The port is unblocked**: Priest, Mage and
   Paladin now have somewhere to land, so the fifteen orphaned templates and half
   the generative art are no longer stranded.

**2026-08-15 — `Grit` → `Luck`.** Same stat, same job. Never published under the
old name; listed here because `GAME-DESIGN.md` §4 used it throughout.

**2026-08-15 — `Resolute` removed.** No replacement. Any badge or injury written
against it has nothing to modify.

**2026-08-15 — `turnEnd` → `onActivationEnd`.** A Turn is two Phases; a unit's go
is an Activation. On an eight-unit board that is 16 firings a turn versus 1.

**2026-08-15 — `onEnter`, `onWounded`, `onEquip`… ** see the hook list below; the
design list and the engine list still disagree by two.

---

## The stat sheet

**Nineteen stored values, eighteen lines.** This is the authoring surface: a badge
or item that grants a modifier names one of these.

| Stat | Does |
|---|---|
| **Strength** | Melee damage only — never to-hit |
| **Precision** | Ranged damage only — never to-hit |
| **Accuracy** | The core roll. Surplus over 100 becomes Crit at ÷4 |
| **Crit** | Chance to land one. Base 3 |
| **Luck** | Flat subtraction from the **attacker's** crit chance |
| **Reach** | Adds to **ranged** weapons only. Melee gains nothing |
| **Dodge** | A flat to-hit penalty on the attacker |
| **Vision** | A radius. Caps effective range in darkness and fog |
| **Armor** | Flat mitigation, physical |
| **Resist** | Flat mitigation, magic and status |
| **Health** | Max. Resets after every Battle |
| **Magic** | Scales off the **party-wide sum**, not the acting unit |
| **Spirit** | Scales off the **party-wide sum**, not the acting unit |
| **Toughness** | Injury capacity, and the base for Deathbed Fighting |
| **Movement** | Hexes per move action |
| **Stamina** | Max · Regen. Regen hard-caps ~3 |
| **Surge** | Base value **equals the character's level** |
| **Item Slots** | Accessories, beyond the two hands |

**Derived, never stored:** Deathbed Fighting — starts at `20 + 5×Toughness`, then
added to by badges, gear and origins. Every modifier hangs on the thing granting
it, so the value is always recomputed.

**Non-combat:** Corruption · Favor.

**Combat-only, never leaves the Battle:** current Health · current Stamina ·
**Surge Chance**.

**Crit and Luck are not symmetric and must not be merged.** A veteran carries
+30/+40 Crit; that number is meaningless defensively. Heroes run wide Crit and
small Luck; bosses run high Luck and selectively high Crit. Attacks may carry
Luck modifiers, which is how the offensive side reaches Luck without merging.

---

## Surge

```
Surge          a stat. Base value = character level.
Surge Chance   combat state. Starts 0. Literally a percentage.

BEFORE the End of Activation ladder, not after it:
    Surge Chance += Surge
    roll against Surge Chance          guaranteed at 100
    success → gain 1 + Stamina Regen stamina
              Surge Chance resets to 0
              go again from movement — STILL THE SAME ACTIVATION
    failure → Surge Chance persists, fall through to End of Activation
```

**The check sits above the ladder. Ruled 2026-08-21**, correcting *"at every End of
Activation"* — which put it below, and made a surging hero run the whole End of Activation
ladder **twice**. Fourteen live entries hang off that ladder and eleven of them are
sustain, so the old ordering doubled a surging hero's healing, Protection and cleansing on
top of the free stamina and the free go. **The ladder runs once per unit per Phase, however
many times you surged.**

**Heroes only.** A surged Activation can surge again, from a zeroed pool.
Level 1 surges every ~12 Activations; level 10 every ~4. Needs a named Cup
(`cup.surge`) and mutators for the pool and its reset.

**Do not confuse with the card `Action Surge`** (§6, 3 Energy). Different thing.

---

## Trigger hooks

**The design list is ten.** `onEnter`, `onWounded` and the old `turnEnd` are gone.

```
startOfBattle · onAttack · onMiss · onHit · onDamage · onTakingDamage ·
onKill · onDeath · onEquip · onActivationEnd
```

**2026-08-20 — two hooks added, bringing the list to twelve.**

```
startOfBattle · onAttack · onMiss · onHit · onCrit · onDodge · onDamage ·
onTakingDamage · onKill · onDeath · onEquip · onActivationEnd
```

- **`onCrit`** had been in use before it was written down (`enchant.bloodletting`).
  Ratified. It fires after its own `onHit`, only when the attack crit.
- **`onDodge` is new and NEEDS ENGINE WORK — see the requirement below.** It fires on the
  **defender**, not the attacker, which is what makes it a different event from `onMiss`.

Rule: `onAttack` always. Then `onMiss` **or** `onHit`. Then `onDamage` only if
damage landed. `onHit` fires even if armor absorbed all of it.

Sources stack **additively** — no dedup, no priority; two sources of the same
trigger both fire.

**Two classes of trigger.** *Permanent* triggers are stored on the hero record and
granted when the unit loads into combat. *Granted in combat* triggers are never
stored and evaporate when the Battle ends.

---

## Classes

**A unit may hold more than one class.** `ifClass` matches **ANY** of them, scoped
to items equipped.

```
ranger · warrior · rogue · priest · mage · paladin · civilian
```
*(Ruled 2026-08-17. Warrior, not Soldier — Soldier is a badge. The four-class list
below is superseded and the port is no longer blocked.)*

**Civilian is a class, not a separate kind of thing.** Civilians take Assignments,
level, carry badges and specialize like any other unit. There is no separate pool.

**Class does not fix base stats.** What a class gives is *access to specialties*.

**! The port supplies six classes and four are declared.** Hell-TCG's 30
generative templates span Priest · Mage · Paladin · Warrior · Rogue · Ranger.
Warrior maps to Soldier; Rogue and Ranger land clean; **Priest, Mage and Paladin
have nowhere to go — fifteen templates, half the port and half the generative
art.** ~~Civilian has no generative template at all. Unresolved; do not build
against the four-class list until it is.~~

**RESOLVED 2026-09-03 — Civilian is generative, exactly like the Eve 24.**

> *"The civilians are the exact same as the 24 Eve heroes. They need the same hero
> rows. They need to put it through art. It's just exactly the same. They just have a
> different designation: a civilian versus the class."*

So a civilian generative unit is an **`hero.base.*` row in the Eve shape** — the same
fields, the same art contract, the same pipeline — and the only difference is
`class: "class.civilian"`. Concretely, matching `hero.base.warrior-iron`:

| Field | Value |
|---|---|
| `id` | `hero.base.civilian-<slug>` |
| `path` | `base` |
| `class` | `class.civilian` |
| `templateId` | `template.base.civilian-<slug>` |
| `templateName` · `subtype` | `Eve Civilian` |
| `art` | `art/heroes/<slug>/card/l1.png` |
| `levelArt` | four entries, l1–l4 — the same art at four LEVELS, not four heroes |
| `hexArt` | the cutouts for that slug |
| `namePool` | as the Eve rows carry |

**This is what unblocks art.** `mkthumbs.mjs` builds `art/manifest.json` by walking
`hbt-content.json` → `heroes.heroes` and collecting the variants each row owns from
`art`, `levelArt` and `hexArt`. **A hero with no row gets no manifest entry, no thumb,
and renders as nothing in the Codex** — which is exactly what happened to the Eve 24
before 2026-08-22. Art on disk is not enough; the row is the index.

**Naming authority:** ids under `hero.base.civilian-*` and `template.base.civilian-*`
are hereby published as a family. A new civilian slug does not need a fresh ruling —
it needs to follow this shape.

---

## Progression

| | |
|---|---|
| **XP** | 3 / 6 / 9 per kill by rank |
| **Level** | 1 to 10 |
| **Level-up path** | ~~Per hero type~~ → **PER CLASS. Seven tables.** Ruled 2026-08-17 |
| **Specialization** | Two-step, once, at a level-up |

**Specialization is a two-step choice.** *Which of your classes do you want to
specialize in?* — a multi-class hero is offered all of them — then a specialty
from that class's list. **The specialization, not the class, determines every
class power the hero can subsequently access**, plus any granted by badges. A
multi-class hero draws from one pool, not several.

Between level 1 and the specialty pick a hero has **no class powers at all** —
starting abilities, origin abilities and attacks only. Survivable because the
0-stamina punch guarantees no dead turn.

**Accuracy +5/level is a typical shape, not a rule.** Gains come from the type's
path. Reach is a rare high-value grant; Stamina Max grows often, Regen almost
never.

---

## Art — nineteen assets per hero

| Set | Level variants | Status variants | Total |
|---|---|---|---|
| **Card art** — the 2:3 display portrait | 3 | 4 | **7** |
| **Hex map art** — the battle-map token | 3 | 4 | **7** |
| **Unconscious art** — does **not** vary by level | 1 | 4 | **5** |

**Level bands: 1–3 · 4–6 · 7–10.**

**The four alternate statuses:** Vampirism · Werewolf · Rotting Flesh (the zombie
form) · Possessed. Unconscious is not one of them — it is its own set.

**A status overrides the level band totally.** A level-7 vampire shows vampire
art, not tier-3 art. No merge.

**Art is keyed on the template, not the hero.** Hell-TCG's `artSlug` is one per
template with variants beneath it, which is why a generated hero costs no new art.
**Thirty generative templates → thirty generative art sets.** Fixed heroes carry
one name and one art each; the fixed count is not yet established.

---

## The port

Hell-TCG heroes are **re-created**, not merely referenced: art, animation,
generation conventions and names carry over; stat blocks and abilities are
recreated similar to what they were, translated into this design.

```
                    Priest  Mage  Paladin  Warrior  Rogue  Ranger   total
Eve of Ruin            1      1      1        1       1      1        6
Shadows in the Sand    2      2      2        2       2      2       12
Skyship                2      2      2        2       2      2       12
                                                                     30
```

Templates live in `data/shadowsHeroTypes.js` and `data/skyshipHeroes.js`; fixed
heroes live in `src/state/heroData.js` (98 defs, 54 of them Civilian). **They are
different objects in different files.**

**What the port cannot supply.** Eleven of eighteen stats translate. **Six do
not exist in Hell-TCG at all** — Accuracy, Crit, Luck, Vision, Movement and both
Stamina values — because it had no to-hit roll, no map, no throttle and no vision
layer. Templates carry level rows 2–4 only; **rows 5–10 are new**. About a third
of every stat block and six of ten level rows are authored from nothing, thirty
times over.

**This reverses a standing instruction.** `CLAUDE.md`, `GAME-DESIGN.md` §8 and
session 4's brief all say Hell-TCG instances are *not* ported. Those need editing
before they mislead another session.

---

## Ids

**Nothing is published.** No id in this session has an authorized kind:

```
! class.*            new prefix — GAME-ARCHITECTURE.md §8 has no unit-ish row
! hero template      needs a kind and a name
! stat.*             badges grant stat modifiers, so stats need stable ids
  specialty.*        AUTHORIZED (§8, owner The Crucible) — no instances decided
```

Sessions 4 and ART may build against **the stat names, the hook list, the art
scheme and the progression shape above**, all of which are stable. They may not
yet reference a class, template or stat by id.


---

# THE HERO SCHEMA

Written 2026-08-17 from `../GAME-DESIGN.md` §7-§9, `../GAME-ARCHITECTURE.md` §1 and
§4.2, this file's stat sheet, and the rulings in `../2-ACTIONS-SETTLED.md`.

**Three objects, not one.** `../GAME-ARCHITECTURE.md` §1's three tiers of state say
where each lives and what is allowed to change it. Getting this split wrong is how a
hero ends up a vampire in the fight and human in the Reckoning.

```
HeroDefinition   immutable    written once by the Crucible, or authored
Hero             Campaign     what play changes. The save.
Unit             Battle       built at load, discarded with the BattleState
```

Plain data throughout — Constitution Law 5b. No classes, no Maps, no closures.

## The stat block — 19 stored values

Used identically on a definition (base), a level row, and a computed unit.

```ts
interface StatBlock {
  strength:     number   // melee damage only, never to-hit
  precision:    number   // ranged damage only, never to-hit
  accuracy:     number   // the core roll. surplus over 100 becomes Crit at ÷4
  crit:         number   // base 3
  luck:         number   // flat subtraction from the ATTACKER's crit chance
  reach:        number   // ranged weapons only
  dodge:        number   // flat to-hit penalty on the attacker
  vision:       number   // a radius. base 6
  armor:        number   // flat mitigation, physical
  resist:       number   // flat mitigation, magic — and burn/poison per tick, never bleed
  health:       number   // MAX. current health is battle-only
  magic:        number   // scales off the PARTY-WIDE SUM
  spirit:       number   // scales off the PARTY-WIDE SUM
  toughness:    number   // injury capacity, and the base for Deathbed Fighting
  movement:     number   // hexes per move action. heroes 5, enemies 4
  staminaMax:   number
  staminaRegen: number   // hard-caps ~3. the sacred stat
  surge:        number   // base value EQUALS the character's level
  itemSlots:    number   // accessories, beyond the two hands
}
```

**Not in the block, deliberately:**
- `deathbedFighting` — **derived, never stored**: `20 + 5×toughness + Σ modifiers`,
  and every modifier hangs on the badge, item or origin granting it.
- `corruption` · `favor` — non-combat, on the Hero record, not the stat block.
- `health` and `stamina` *current* — battle-only.
- `surgeChance` — battle-only.

## Tier 1 — `HeroDefinition`. Immutable.

```ts
interface HeroDefinition {
  id:                 HeroDefinitionId   // ! kind not yet authorized — see OPEN
  name:               string
  classes:            ClassId[]          // class.warrior · class.ranger · …
  artSlug:            string             // ONE per definition. variants hang beneath it,
                                         // which is why a generated hero costs no new art
  baseStats:          StatBlock
  originIds:          OriginId[]         // IMMUTABLE badges. rolled at generation,
                                         // never removed. separate from earned badges
  guaranteedBadgeIds: BadgeId[]
  startingItems:      ItemInstance[]
  startingAbilityIds: AbilityId[]        // starting + origin abilities: "the same thing
                                         // from a different source"
  triggers:           TriggerRef[]
  tags:               TagId[]            // template-level. a militia civilian carries
                                         // tag.soldier without a specialty granting it
  deployCost:         ResourceBundle
}
```

## Tier 2 — `Hero`. The Campaign record. The only thing play mutates.

```ts
interface Hero {
  id:             HeroId              // unique. you own only one of any hero
  definitionId:   HeroDefinitionId
  level:          number              // 1..10
  xp:             number              // 3/6/9 per kill by enemy rank
  specializedIn:  ClassId | null      // which of your classes you specialized in
  specialtyId:    SpecialtyId | null  // null until the level-up pick
  badgeIds:       BadgeId[]           // EARNED and mutable. injury.* lives here too —
                                      // §4.2: "there is no separate injury list"
  items:          ItemInstance[]
  wound:          'fresh' | 'wounded' | 'badly-wounded'
  corruption:     number
  favor:          number
}
```

**Six mutable fields and two lists. That is the whole of what play changes** — which
is what makes the definition safely immutable and the save small.

**`wound` is a level, not a badge and not a status.** It is the field `commitmentOf`
reads to answer whether a hero can be sent anywhere this Week, and it also applies
**in battle** as stat deltas (`../GAME-DESIGN.md` §9: −1 all stats except Armor,
Resist, Toughness, Item Slots; −2 Max Health and Max Stamina; doubled at Badly
Wounded). Something translates it at `makeBattleState`.

## Items — an item is no longer an id

```ts
interface ItemInstance {
  baseId:     ItemId        // item.longbow
  enchantIds: EnchantId[]   // max 2. "a flaming Heaven's Edge"
}
```

Magic bolts onto a base rather than being authored as a combination, because
rows-per-combination scales as bases × enchants × enchants. **This is a save-format
change** reaching the Crucible and the roster, not only content.

## Tier 3 — `Unit`. Battle only. Built at load, discarded with the battle.

```ts
interface Unit {
  unitId:        UnitId
  heroId:        HeroId | null        // null for enemies and civilians off-roster
  definitionId:  HeroDefinitionId
  side:          'hero' | 'enemy'

  computedStats: StatBlock            // DERIVED at load, recomputed on change
  health:        number               // current
  stamina:       number               // current
  surgeChance:   number               // starts 0. literally a percentage

  lifeState:     'standing' | 'downed' | 'stabilized' | 'dead'   // Law 11: always
                                      // its own field, never inferred from hp <= 0
  bleedOut:      number               // counts down while downed

  hex:           HexId
  activated:     boolean              // re-activation clears this — Surge and
                                      // power.leader.command both need it

  statuses:      StatusEntry[]        // one entry per status id, values ADDITIVE:
                                      // burn 2 then burn 3 is burn 5, not two entries
  cooldowns:     Record<AbilityId, number>   // warmup sets this at battle start
  badgeIds:      BadgeId[]            // LIVE. a hero can become a vampire mid-fight
  triggers:      TriggerRef[]         // merged from every source. stack additively,
                                      // no dedup, no priority
}

interface StatusEntry { id: StatusId; value: number }
```

## Derived — computed, never stored

```ts
statsOf(hero)      → StatBlock
    definition.baseStats
  + the class level path, rows 1..hero.level      ← PER CLASS. seven tables.
  + specialty modifiers
  + origin modifiers
  + badge modifiers (including injuries, and the wound level)
  + item modifiers + enchant modifiers
  ! ORDER IS UNDECIDED — see OPEN

tagsOf(unit)       → TagId[]
    union of tags granted by class, origins, badges, specialty and template.
    NEVER stored. Deriving it means removing a badge removes its tags, which is
    exactly the Hell-TCG bug §5 tells us not to port.

deathbedFightingOf(hero) → number
    20 + 5×toughness + Σ modifiers from badges, items and origins

surgeOf(unit)      → number     // = level, plus modifiers
```

## OPEN — this schema cannot land until these are answered

1. **`HeroDefinition` has no authorized kind.** `../GAME-ARCHITECTURE.md` §8 has no
   row for it. `hero.*`? And is a fixed hero the same kind as a generated template?
2. **Is multi-class still live?** `../GAME-DESIGN.md` §7 publishes *"a unit may hold
   more than one class"*, and `classes: ClassId[]` above assumes it. But Soldier —
   the example that motivated it — is now a badge. If nothing else crosses class
   lines, this collapses to a scalar and `specializedIn` becomes unnecessary.
3. **In what order do stat modifiers apply?** Additive throughout is fine, but
   nothing says so, and one multiplicative modifier makes order load-bearing.
   `modifierStacking` is now a row in `engine/SWITCHES.md`.
4. ~~**Five classes owe a level table.**~~ **CLOSED 2026-08-19** — all seven exist in
   `content/LEVEL-TABLES.md` and `content/gen/levels.json`. What is still owed is
   *confirmation*: Ranger 7–10, Rogue, Mage, Priest, Paladin and Civilian are authored
   against the ladder, not dictated. Every authored row is marked.
5. **The four status shapes are defined twice and the definitions disagree.**
   `engine/COMBAT-FRAMEWORK.md` says a *pool* is spent when consumed and calls
   poison a *counter*; `../1-EFFECTS-SETTLED.md` says a pool's value is both
   magnitude and timer and publishes poison as a *pool*. `StatusEntry` above works
   either way, but content cannot be authored against both.
