# Level tables — eight classes, and the civilian types

**Owner: session 3 (Units).** Written 2026-08-19 from the verbatim dictation in
`2-ACTIONS-NOTES.md` (Warrior 1–10, Ranger 2–6) and the stat value ladder.
Machine-readable source of truth: `content/gen/levels.json`. Rendered in the Codex
under **Level Tables**. `content/audit.mjs` enforces every rule below.

---

## The rules

**Level cap** — 10

**L1** — Level 1 is the starting line, not a level-up. No class grants anything at L1.

**Specialty** — The specialty is chosen at the FIRST level-up — reaching level 2 — for every class. This resolves the dictated conflict: the Warrior dump said 'the first level up for a warrior, they choose their specialty', the Ranger table says L2 explicitly, and the class-power rule says 'at level two you choose a class specialty'. All three agree once 'first level-up' is read as the 1 to 2 transition.

**Draft** — Each power grant offers three: two from the specialty, one from the general pool.

**Choice Level** — Level 5 is the choice level for every class. One pick from the list, plus a small flat grant alongside it. Both dictated tables pair the choice with something flat, so all seven do.

**Regen** — Every class gains Stamina Regen exactly twice — once at L6, once at L10 — taking it 1 to 3. Civilian is the exception and gains it never.

**Civilian** — Civilian has no stamina bar, so it is granted no Stamina Max and no Stamina Regen at any level. Its power comes from Item Slots and gear instead — it ends with more slots than any other class. Now that Stamina Regen prices at 2.0, that exemption costs the Civilian 4.9 points across the run and it is the whole reason it totals 30.5 against the Warrior's 39.2.

**Budget** — Each row is priced on the stat ladder: Armor/Resist and Stamina Regen 2.0 · Magic/Spirit 1.5 · Strength/Precision 1.0 · Movement 0.7 · Item Slots 0.67 · Health/Reach 0.5 · Toughness 0.4 · Dodge 0.3 · Stamina Max 0.3 · Accuracy/Crit/Luck/Vision 0.2 · Surge 0.15. Rows run 2.2 to 6.5; the dictated Warrior's own ceiling is L7 at 6.40. Classes land 30 to 40 across the whole run.

**Off Ladder** — Nothing is off the ladder any more. priced the last five 2026-08-20: Movement 0.7, Stamina Max 0.3, Stamina Regen 2.0, Surge 0.15, Toughness 0.4. Stamina Regen at 2.0 is the one that reshapes these tables — it is as expensive as Armor, every class gets exactly two, and Civilian gets none.

**Movement** — Movement is granted sparingly and never to a Mage or a Priest. Warrior L4 · Rogue L3 and L6 · Ranger L6 · Civilian L9 · Paladin L10, because armour should be the last thing that learns to run. Ruled by 2026-08-20. Beast L3 and L7 — two, like the Rogue, because a Beast that cannot close is not a Beast.

**Item  Slots** — Every class gains Item Slots across the run except the BEAST, which is granted none at any level. That is the branch: a Civilian is what it carries and a Beast is what it is. The ~4 ladder points the Beast forgoes in slots come back as Health, Strength and Reach.

**Civilian Types** — Civilian TYPE tables, ruled 2026-09-03. A civilian levels by its type, not by the class: "We need some unique way to define the level-ups by the name of the civilian... Maiden and farmer are different in how they should level up." Each entry here is a full 10-row table under every rule a class table obeys — nothing at L1, the specialty at L2, the choice at L5, and never any stamina. A hero points at one with levelTable, authored in gen/civilian-rulings.json; a civilian with no pointer uses the class.civilian table. Several heroes may share one table — that is how a group of farmers stays one curve.

---

## Warrior

`class.warrior` · **DICTATED 1-10, verbatim**

> Every level grants +1 Health in addition to what is listed. The item-slot class: five slots across the run, more than anyone. Movement: +1 at level 4.

**Per-level freebie: +1 Health at every level**, in addition to what each row lists.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +1 Stamina Max · +1 Item Slots · +5 Accuracy | 2.5 |
| **3** | +1 Health · +1 Strength · +1 Item Slots · +2 Crit | 2.6 |
| **4** | +1 Health · +1 Precision · +1 Reach · +1 Stamina Max · +1 Resist · +5 Dodge · +1 Movement | 6.5 |
| **5** | +1 Health<br>**CHOOSE ONE:** +2 Strength / +5 Health / +15 Accuracy / +1 Resist / +1 Armor<br>*Dictated as a bare list of five stat names — 'they definitely get a choice of a bunch of big things'. Magnitudes set to match the Ranger's dictated L5 list, which is the only place magnitudes were given.* | 3.5 |
| **6** | +1 Health · +1 STAMINA REGEN · +1 Item Slots · +5 Accuracy · +2 Luck | 4.6 |
| **7** | +1 Health · +1 Strength · +1 Precision · +1 Armor · +1 Stamina Max · +2 Crit · +5 Dodge | 6.7 |
| **8** | +1 Health · +1 Strength · +1 Item Slots · +4 Accuracy · +1 Crit · +2 Dodge | 3.8 |
| **9** | +1 Health · +1 Precision · +1 Reach · +1 Stamina Max · +5 Dodge · +2 Luck | 4.2 |
| **10** | +1 Health · +1 Strength · +1 STAMINA REGEN · +1 Item Slots · +5 Accuracy · +2 Crit | 5.6 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+17 Dodge · +9 Health · +4 Strength · +2 STAMINA REGEN · +19 Accuracy · +5 Item Slots · +3 Precision · +1 Resist · +1 Armor · +7 Crit · +4 Stamina Max · +2 Reach · +4 Luck · +1 Movement
no off-ladder grants
```

Ladder total across the run: **39.9**

---

## Ranger

`class.ranger` · **DICTATED 2-6 · AUTHORED 7-10**

> No per-level freebie — 'unlike Warrior, who got one health at every level, Rangers do not get that'. Reach is the Ranger's stat: four grants, twice anyone else. Movement: +1 at level 6.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Precision · +1 Resist · +5 Accuracy · +3 Dodge | 4.9 |
| **3** | +1 Strength · +1 Reach · +1 Health · +1 Stamina Max · +1 Resist · +1 Item Slots · +3 Crit | 5.6 |
| **4** | +1 Precision · +1 Health · +7 Accuracy · +2 Dodge · +1 Luck | 3.7 |
| **5** | +1 Stamina Max · +2 Accuracy · +1 Crit · +1 Dodge · +1 Luck<br>**CHOOSE ONE:** +2 Precision / +5 Health / +15 Accuracy / +1 Armor / +1 Resist / +2 Magic / +8 Crit<br>*Dictated with magnitudes — the only L5 list that was.* | 4.4 |
| **6** | +1 Strength · +1 Reach · +1 STAMINA REGEN · +5 Dodge · +1 Movement | 5.7 |
| **7** | +1 Precision · +1 Reach · +1 Vision · +5 Accuracy · +3 Dodge<br>*authored — not dictated* | 3.6 |
| **8** | +1 Strength · +1 Item Slots · +1 Stamina Max · +3 Crit · +2 Dodge<br>*authored — not dictated* | 3.2 |
| **9** | +1 Precision · +1 Health · +1 Vision · +5 Accuracy · +2 Dodge · +1 Luck<br>*authored — not dictated* | 3.5 |
| **10** | +1 Precision · +1 Reach · +1 STAMINA REGEN · +1 Item Slots · +5 Dodge · +2 Crit<br>*authored — not dictated* | 6.1 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+23 Dodge · +5 Precision · +24 Accuracy · +2 Resist · +2 STAMINA REGEN · +3 Strength · +3 Item Slots · +4 Reach · +9 Crit · +3 Health · +3 Stamina Max · +1 Movement · +3 Luck · +2 Vision
no off-ladder grants
```

Ladder total across the run: **40.6**

---

## Rogue

`class.rogue` · **AUTHORED**

> Crit and Dodge in volume — both price cheap on the ladder, which is exactly right for a class that wins by landing one hit and not being there for the answer. Ends at 27% crit, the highest in the game. Two Health grants total: the squishiest hero on the board. Movement: +1 at level 3 and 6.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Precision · +1 Stamina Max · +5 Accuracy · +3 Dodge · +2 Crit | 3.6 |
| **3** | +1 Strength · +1 Item Slots · +1 Health · +3 Crit · +3 Dodge · +1 Movement | 4.4 |
| **4** | +1 Precision · +1 Stamina Max · +5 Accuracy · +4 Crit · +2 Luck | 3.5 |
| **5** | +1 Item Slots · +2 Accuracy · +2 Crit<br>**CHOOSE ONE:** +2 Precision / +2 Strength / +10 Crit / +10 Dodge / +5 Health / +1 Resist / +15 Accuracy | 4.5 |
| **6** | +1 Precision · +1 STAMINA REGEN · +5 Dodge · +3 Crit · +1 Movement | 5.8 |
| **7** | +1 Strength · +1 Precision · +1 Item Slots · +5 Accuracy · +3 Crit | 4.3 |
| **8** | +1 Precision · +1 Stamina Max · +1 Vision · +5 Dodge · +2 Luck | 3.4 |
| **9** | +1 Strength · +1 Health · +1 Item Slots · +5 Accuracy · +4 Crit · +2 Dodge | 4.6 |
| **10** | +1 Precision · +1 STAMINA REGEN · +1 Resist · +3 Dodge · +3 Crit<br>*The single Resist grant of the run — a rogue with no Resist at all is free food for any mage, and this is the cheapest place to fix that.* | 6.5 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+21 Dodge · +6 Precision · +24 Crit · +22 Accuracy · +2 STAMINA REGEN · +3 Strength · +4 Item Slots · +1 Resist · +2 Movement · +2 Health · +3 Stamina Max · +4 Luck · +1 Vision
no off-ladder grants
```

Ladder total across the run: **40.5**

---

## Mage

`class.mage` · **AUTHORED**

> Four Magic grants, rationed against the Warrior's four Strength — Magic prices at 1.5 because it scales off the party-wide sum. Precision matters too: staves scale their basic attacks off it. Never granted Armor at any level; the L5 choice is the only way a Mage gets any. Never gains Movement.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Magic · +1 Stamina Max · +5 Accuracy · +1 Vision | 3.0 |
| **3** | +1 Precision · +1 Health · +1 Resist · +1 Item Slots · +2 Crit | 4.6 |
| **4** | +1 Magic · +1 Stamina Max · +5 Accuracy · +3 Dodge | 3.7 |
| **5** | +1 Item Slots · +2 Accuracy · +1 Dodge<br>**CHOOSE ONE:** +2 Magic / +2 Precision / +5 Health / +15 Accuracy / +1 Armor / +1 Resist / +2 Vision | 4.4 |
| **6** | +1 Precision · +1 STAMINA REGEN · +1 Vision · +5 Accuracy | 4.2 |
| **7** | +1 Magic · +1 Resist · +1 Stamina Max · +2 Crit | 4.2 |
| **8** | +1 Precision · +1 Health · +1 Item Slots · +5 Accuracy · +3 Dodge | 4.1 |
| **9** | +1 Precision · +1 Vision · +5 Accuracy · +2 Crit · +2 Dodge | 3.2 |
| **10** | +1 Magic · +1 STAMINA REGEN · +1 Precision · +1 Item Slots · +5 Accuracy | 6.2 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+32 Accuracy · +4 Magic · +5 Precision · +2 Resist · +2 STAMINA REGEN · +9 Dodge · +4 Item Slots · +6 Crit · +2 Health · +3 Stamina Max · +3 Vision
no off-ladder grants
```

Ladder total across the run: **37.5**

---

## Priest

`class.priest` · **AUTHORED**

> Accuracy at every single level and four Crit across the whole run — 'hits soft, hits reliably' written as numbers. Five Health grants and two Toughness make it the second-hardest thing to kill, which it has to be: it is the only class standing between a fallen hero and the clock. Never gains Movement.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Spirit · +1 Health · +1 Stamina Max · +5 Accuracy | 3.3 |
| **3** | +1 Precision · +1 Resist · +1 Item Slots · +1 Health · +3 Accuracy | 4.8 |
| **4** | +1 Spirit · +1 Stamina Max · +5 Accuracy · +1 Toughness | 3.2 |
| **5** | +1 Item Slots · +3 Accuracy · +1 Dodge<br>**CHOOSE ONE:** +2 Spirit / +2 Precision / +5 Health / +15 Accuracy / +1 Armor / +1 Resist / +20 Deathbed Fighting<br>*The Deathbed option is the only place on any table where a level grants Deathbed Fighting directly. Deathbed is derived, 20 + 5x Toughness, so this is a flat modifier hanging off the level row, exactly as a badge would.* | 4.6 |
| **6** | +1 Precision · +1 STAMINA REGEN · +1 Health · +5 Accuracy | 4.5 |
| **7** | +1 Spirit · +1 Resist · +1 Stamina Max · +2 Crit | 4.2 |
| **8** | +1 Precision · +1 Health · +1 Item Slots · +5 Accuracy · +2 Dodge | 3.8 |
| **9** | +1 Spirit · +1 Toughness · +5 Accuracy · +2 Dodge · +1 Luck | 3.7 |
| **10** | +1 Precision · +1 STAMINA REGEN · +1 Health · +1 Item Slots · +5 Accuracy · +2 Crit | 5.6 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+36 Accuracy · +4 Spirit · +4 Precision · +2 Resist · +2 STAMINA REGEN · +4 Item Slots · +5 Health · +5 Dodge · +3 Stamina Max · +2 Toughness · +4 Crit · +1 Luck
no off-ladder grants
```

Ladder total across the run: **37.6**

---

## Paladin

`class.paladin` · **AUTHORED · Luck added by 2026-08-20**

> Three Armor and two Resist — five points of mitigation against the Warrior's two, and the reason every row is short. Armor and Resist are the two most expensive things on the ladder at 2.0, so the Paladin buys them by going without breadth: two Item Slots, one Dodge grant, four Crit. Health at every level from 2 upward is the Paladin's answer to the Warrior's freebie. Movement: +1 at level 10. Luck at 5, 7 and 9 for +5 total — the anti-crit stat on the class that is built to be hit.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Armor · +1 Health · +5 Accuracy | 3.5 |
| **3** | +1 Strength · +1 Health · +1 Stamina Max · +1 Item Slots · +2 Crit | 2.9 |
| **4** | +1 Resist · +1 Health · +1 Toughness · +3 Accuracy | 3.5 |
| **5** | +1 Health · +1 Stamina Max · +2 Accuracy · +2 Luck<br>**CHOOSE ONE:** +2 Strength / +1 Armor / +1 Resist / +5 Health / +2 Spirit / +15 Accuracy | 4.6 |
| **6** | +1 Strength · +1 STAMINA REGEN · +1 Health · +1 Toughness · +3 Accuracy | 4.5 |
| **7** | +1 Armor · +1 Health · +1 Stamina Max · +2 Crit · +2 Luck | 3.6 |
| **8** | +1 Strength · +1 Health · +1 Item Slots · +5 Accuracy · +1 Toughness | 3.6 |
| **9** | +1 Resist · +1 Health · +3 Accuracy · +2 Dodge · +1 Luck | 3.9 |
| **10** | +1 Strength · +1 STAMINA REGEN · +1 Armor · +1 Health · +1 Accuracy · +1 Movement | 6.4 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+3 Armor · +9 Health · +22 Accuracy · +4 Strength · +2 Resist · +2 STAMINA REGEN · +2 Item Slots · +3 Toughness · +5 Luck · +3 Stamina Max · +4 Crit · +1 Movement · +2 Dodge
no off-ladder grants
```

Ladder total across the run: **36.4**

---

## Civilian

`class.civilian` · **AUTHORED**

> No Stamina Max and no Stamina Regen at any level — a civilian has no stamina bar, and that absence is the whole shape of the table. What it gets instead is Item Slots: six across the run, more than any other class. A civilian's power comes from what it is carrying, not from what it is. The widest L5 list in the game, ten options, because a civilian with no primary stats is defined by what it has been through. Movement: +1 at level 9.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +1 Item Slots · +5 Accuracy | 2.2 |
| **3** | +1 Strength · +1 Health · +1 Item Slots · +3 Accuracy | 2.8 |
| **4** | +1 Precision · +1 Health · +1 Resist · +3 Dodge | 4.4 |
| **5** | +1 Item Slots · +3 Accuracy · +1 Luck<br>**CHOOSE ONE:** +2 Strength / +2 Precision / +5 Health / +15 Accuracy / +1 Armor / +1 Resist / +2 Magic / +2 Spirit / +10 Dodge / +8 Crit | 4.5 |
| **6** | +1 Health · +1 Item Slots · +1 Vision · +5 Accuracy · +2 Crit | 2.8 |
| **7** | +1 Strength · +1 Precision · +1 Health · +3 Dodge | 3.4 |
| **8** | +1 Armor · +1 Item Slots · +3 Accuracy · +1 Luck | 3.5 |
| **9** | +1 Health · +1 Toughness · +5 Accuracy · +2 Crit · +2 Dodge · +1 Movement | 3.6 |
| **10** | +1 Strength · +1 Precision · +1 Item Slots · +1 Health · +5 Accuracy | 4.2 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+29 Accuracy · +6 Item Slots · +7 Health · +3 Strength · +3 Precision · +8 Dodge · +1 Resist · +1 Armor · +4 Crit · +1 Movement · +2 Luck · +1 Toughness · +1 Vision
no off-ladder grants
```

Ladder total across the run: **31.2**

---

## Beast

`class.beast` · **undefined**

> undefined

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +2 Health · +1 Strength · +1 Stamina Max · +5 Accuracy | 3.3 |
| **3** | +2 Health · +1 Movement · +1 Toughness · +3 Crit | 2.7 |
| **4** | +2 Health · +1 Strength · +1 Armor · +5 Dodge | 5.5 |
| **5** | +2 Health<br>**CHOOSE ONE:** +2 Strength / +6 Health / +1 Armor / +1 Resist / +1 Reach / +15 Dodge<br>*No Item Slot option, because the Beast never gets one. Reach is on the list instead — it is the stat that changes how a Beast plays.* | 5.5 |
| **6** | +2 Health · +1 STAMINA REGEN · +1 Reach · +5 Accuracy | 4.5 |
| **7** | +2 Health · +1 Strength · +1 Movement · +1 Toughness · +3 Crit | 3.7 |
| **8** | +2 Health · +1 Precision · +1 Resist · +5 Dodge | 5.5 |
| **9** | +2 Health · +1 Strength · +1 Reach · +1 Stamina Max · +3 Luck | 3.4 |
| **10** | +2 Health · +1 STAMINA REGEN · +1 Armor · +5 Accuracy | 6.0 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+18 Health · +4 Strength · +2 Armor · +2 STAMINA REGEN · +15 Accuracy · +10 Dodge · +1 Resist · +2 Movement · +6 Crit · +2 Reach · +1 Precision · +2 Toughness · +3 Luck · +2 Stamina Max
no off-ladder grants
```

Ladder total across the run: **40.1**

---

## Farmer

`civilian.farmer` · **AUTHORED**

> Dictated 2026-09-03. "A farmer subclass of a civilian... There are several farmers. All of the farmers should have these same level-ups." Bare stat names in the dictation are read as +1, matching every other table. THREE THINGS STILL SOFT: (1) L2 grants only Health and an Item Slot as dictated — the class-wide civilian table also grants +5 Accuracy at L2, and it is not yet ruled whether the Farmer drops it. (2) "Let's add another resist at level 4" is read as Resist +1 at L4, since the dictated L4 list carried none. (3) The L5 choice is "similar to that of a warrior" and is the Warrior's list verbatim; a Farmer-specific list has not been dictated.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +1 Item Slots | 1.2 |
| **3** | +1 Strength · +1 Health · +1 Item Slots · +5 Dodge · +5 Accuracy | 4.7 |
| **4** | +1 Precision · +1 Health · +1 Resist · +5 Crit · +2 Luck · +5 Accuracy | 5.9 |
| **5** | <br>**CHOOSE ONE:** +2 Strength / +5 Health / +15 Accuracy / +1 Resist / +1 Armor<br>*"A similar choice to that of a warrior" — the Warrior L5 list verbatim.* | 3.0 |
| **6** | +1 Strength · +1 Health · +5 Crit · +2 Luck · +5 Accuracy | 3.9 |
| **7** | +1 Precision · +1 Health · +1 Item Slots · +2 Dodge · +3 Accuracy | 3.4 |
| **8** | +1 Strength · +1 Health · +5 Crit · +2 Luck · +3 Accuracy | 3.5 |
| **9** | +1 Precision · +1 Health · +1 Item Slots · +2 Dodge · +2 Accuracy | 3.2 |
| **10** | +1 Health · +1 Resist · +5 Crit · +2 Luck · +2 Accuracy | 4.3 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+25 Accuracy · +8 Health · +2 Resist · +20 Crit · +3 Strength · +3 Precision · +9 Dodge · +4 Item Slots · +8 Luck
no off-ladder grants
```

Ladder total across the run: **33.0**

---

## What is still owed

1. **Ranger 7–10, Rogue, Mage, Priest, Paladin and Civilian are authored, not dictated.**
   They are built to the ladder and to the shape of the two tables gave, but
 nobody has said these numbers out loud. Every authored row is marked in the Codex.
2. **The Warrior L5 choice list had no magnitudes** — it was dictated as five bare stat
 names. The magnitudes here are copied from the Ranger L5 list, which is the only
 place any were given.
3. **Sprint.** ruled that a hero starts with two movement abilities, Move and
   Sidestep. Sprint is still in `GAME-DESIGN.md` §4 with no source that grants it.
   Either it needs a grantor or it needs cutting.
4. **Specialty counts.** Every class has nine specialties, so the L2 pick is a nine-way
 choice for everyone. Whether that is right per class is not settled.
