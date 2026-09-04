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

**Regen** — Every class gains Stamina Regen exactly twice, taking it 1 to 3. Combat classes take it at L6 and L10. CIVILIANS TAKE IT AT L6 AND L9 — ruled 2026-09-03, "civilians all need stamina, they are supposed to be exactly the fucking same as other heroes" — at 9 rather than 10 only because the civilian tables put their biggest grant on the last row and Stamina Regen prices at 2.0, which would push five of the eleven civilian tables past the 6.6 row ceiling. There is no longer any class or civilian type that gains no Regen.

**Civilian** — REVERSED 2026-09-03. Civilians DO have a stamina bar and always did at level 1 — every civilian hero row already carried staminaMax 5 and staminaRegen 1, identical to the Eve heroes. What was missing was the progression: the level tables granted none, and three checkers plus this rules block forbade it. Civilians now gain +3 Stamina Max (L2, L4, L8) and +2 Stamina Regen (L6, L9), the same shape as the Ranger, Rogue, Mage, Priest and Paladin. That closes the 4.9-point gap the exemption used to cost and moves the civilian tables from the high 20s into the low 30s, at the bottom of the combat-class band. Item Slots remain the civilian signature — it still ends with more slots than any other class.

**Budget** — Each row is priced on the stat ladder: Armor/Resist and Stamina Regen 2.0 · Magic/Spirit 1.5 · Strength/Precision 1.0 · Movement 0.7 · Item Slots 0.67 · Health/Reach 0.5 · Toughness 0.4 · Dodge 0.3 · Stamina Max 0.3 · Accuracy/Crit/Luck/Vision 0.2 · Surge 0.15. Rows run 2.2 to 6.5; the dictated Warrior's own ceiling is L7 at 6.40. Classes land 30 to 40 across the whole run.

**Off Ladder** — Nothing is off the ladder any more. priced the last five 2026-08-20: Movement 0.7, Stamina Max 0.3, Stamina Regen 2.0, Surge 0.15, Toughness 0.4. (Movement re-ruled to 1.0 on 2026-09-02.) Stamina Regen at 2.0 is the one that reshapes these tables — it is as expensive as Armor and every class gets exactly two, CIVILIANS INCLUDED as of 2026-09-03.

**Movement** — Movement is granted sparingly and never to a Mage or a Priest. Warrior L4 · Rogue L3 and L6 · Ranger L6 · Civilian L9 · Paladin L10, because armour should be the last thing that learns to run. Ruled by 2026-08-20. Beast L3 and L7 — two, like the Rogue, because a Beast that cannot close is not a Beast.

**Item  Slots** — Every class gains Item Slots across the run except the BEAST, which is granted none at any level. That is the branch: a Civilian is what it carries and a Beast is what it is. The ~4 ladder points the Beast forgoes in slots come back as Health, Strength and Reach.

**Civilian Types** — Civilian TYPE tables, ruled 2026-09-03. A civilian levels by its type, not by the class: "We need some unique way to define the level-ups by the name of the civilian... Maiden and farmer are different in how they should level up." Each entry here is a full 10-row table under every rule a class table obeys — nothing at L1, the specialty at L2, the choice at L5, and never any stamina. A hero points at one with levelTable, authored in gen/civilian-rulings.json; a civilian with no pointer uses the class.civilian table. Several heroes may share one table — that is how a group of farmers stays one curve. Stamina is granted by the TYPE table, not the class table, for any civilian pointed at a type — the same as every other stat.

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

> Stamina, ruled 2026-09-03: +3 Stamina Max (L2, L4, L8) and +2 Stamina Regen (L6, L9), the same as the Ranger and the Rogue. This REVERSES the old shape of this table, which granted no stamina at any level on the belief that a civilian had no stamina bar — it always had one, 5 and 1, on every civilian hero row. What is still the civilian signature is Item Slots: six across the run, more than any other class. A civilian's power comes from what it is carrying as much as from what it is. The widest L5 list in the game, ten options, because a civilian with no primary stats is defined by what it has been through. Movement: +1 at level 9.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +1 Item Slots · +5 Accuracy · +1 Stamina Max | 2.5 |
| **3** | +1 Strength · +1 Health · +1 Item Slots · +3 Accuracy | 2.8 |
| **4** | +1 Precision · +1 Health · +1 Resist · +3 Dodge · +1 Stamina Max | 4.7 |
| **5** | +1 Item Slots · +3 Accuracy · +1 Luck<br>**CHOOSE ONE:** +2 Strength / +2 Precision / +5 Health / +15 Accuracy / +1 Armor / +1 Resist / +2 Magic / +2 Spirit / +10 Dodge / +8 Crit | 4.5 |
| **6** | +1 Health · +1 Item Slots · +1 Vision · +5 Accuracy · +2 Crit · +1 STAMINA REGEN | 4.8 |
| **7** | +1 Strength · +1 Precision · +1 Health · +3 Dodge | 3.4 |
| **8** | +1 Armor · +1 Item Slots · +3 Accuracy · +1 Luck · +1 Stamina Max | 3.8 |
| **9** | +1 Health · +1 Toughness · +5 Accuracy · +2 Crit · +2 Dodge · +1 Movement · +1 STAMINA REGEN | 5.6 |
| **10** | +1 Strength · +1 Precision · +1 Item Slots · +1 Health · +5 Accuracy | 4.2 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+29 Accuracy · +6 Item Slots · +2 STAMINA REGEN · +7 Health · +3 Strength · +3 Precision · +8 Dodge · +1 Resist · +1 Armor · +3 Stamina Max · +4 Crit · +1 Movement · +2 Luck · +1 Toughness · +1 Vision
no off-ladder grants
```

Ladder total across the run: **36.1**

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

> Dictated 2026-09-03. "A farmer subclass of a civilian... There are several farmers. All of the farmers should have these same level-ups." Bare stat names in the dictation are read as +1, matching every other table. THREE THINGS STILL SOFT: (1) L2 grants only Health and an Item Slot as dictated — the class-wide civilian table also grants +5 Accuracy at L2, and it is not yet ruled whether the Farmer drops it. (2) "Let's add another resist at level 4" is read as Resist +1 at L4, since the dictated L4 list carried none. (3) The L5 choice is "similar to that of a warrior" and is the Warrior's list verbatim; a Farmer-specific list has not been dictated. STAMINA, ruled 2026-09-03: +3 Stamina Max (L2, L4, L8) and +2 Stamina Regen (L6, L9), identical across all ten civilian types and the class table — "they are supposed to be exactly the fucking same as other heroes." It is the one part of a civilian type table that is not differentiated, deliberately.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +1 Item Slots · +1 Stamina Max | 1.5 |
| **3** | +1 Strength · +1 Health · +1 Item Slots · +5 Dodge · +5 Accuracy | 4.7 |
| **4** | +1 Precision · +1 Health · +1 Resist · +5 Crit · +2 Luck · +5 Accuracy · +1 Stamina Max | 6.2 |
| **5** | <br>**CHOOSE ONE:** +2 Strength / +5 Health / +15 Accuracy / +1 Resist / +1 Armor<br>*"A similar choice to that of a warrior" — the Warrior L5 list verbatim.* | 3.0 |
| **6** | +1 Strength · +1 Health · +5 Crit · +2 Luck · +5 Accuracy · +1 STAMINA REGEN | 5.9 |
| **7** | +1 Precision · +1 Health · +1 Item Slots · +2 Dodge · +3 Accuracy | 3.4 |
| **8** | +1 Strength · +1 Health · +5 Crit · +2 Luck · +3 Accuracy · +1 Stamina Max | 3.8 |
| **9** | +1 Precision · +1 Health · +1 Item Slots · +2 Dodge · +2 Accuracy · +1 STAMINA REGEN | 5.2 |
| **10** | +1 Health · +1 Resist · +5 Crit · +2 Luck · +2 Accuracy | 4.3 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+25 Accuracy · +8 Health · +2 Resist · +20 Crit · +2 STAMINA REGEN · +3 Strength · +3 Precision · +9 Dodge · +4 Item Slots · +8 Luck · +3 Stamina Max
no off-ladder grants
```

Ladder total across the run: **37.9**

---

## Apothecary

`civilian.apothecary` · **AUTHORED**

> Precision, Crit and Accuracy — she reads a body the way a fletcher reads a shaft. Dictated 2026-09-03: "a little more perception, crit gains, and accuracy." Resist rides along because the trade is her own stock. No Strength at all: she has never swung anything. Authored 2026-09-03 on Angela's call: "just make a call for each of the civilians and make some different rows, just so they're differentiated." Numbers SOFT. STAMINA, ruled 2026-09-03: +3 Stamina Max (L2, L4, L8) and +2 Stamina Regen (L6, L9), identical across all ten civilian types and the class table — "they are supposed to be exactly the fucking same as other heroes." It is the one part of a civilian type table that is not differentiated, deliberately.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +1 Item Slots · +1 Stamina Max | 1.5 |
| **3** | +5 Accuracy · +5 Crit · +1 Health · +1 Precision | 3.5 |
| **4** | +5 Accuracy · +5 Crit · +1 Health · +1 Resist · +1 Stamina Max | 4.8 |
| **5** | +3 Accuracy · +1 Item Slots<br>**CHOOSE ONE:** +2 Precision / +15 Accuracy / +8 Crit / +1 Resist / +5 Health<br>*The Warrior L5 list verbatim — ruled 2026-09-03: "for number 6, I was saying the L5 choice is the Warrior list." That closes the soft flag on every civilian type table.* | 4.3 |
| **6** | +5 Accuracy · +5 Crit · +1 Health · +2 Luck · +1 Precision · +1 STAMINA REGEN | 5.9 |
| **7** | +3 Accuracy · +5 Crit · +1 Health · +1 Item Slots · +1 Precision | 3.8 |
| **8** | +3 Accuracy · +5 Crit · +1 Health · +2 Luck · +1 Resist · +1 Stamina Max | 4.8 |
| **9** | +3 Accuracy · +5 Crit · +1 Health · +1 Item Slots · +1 Precision · +1 STAMINA REGEN | 5.8 |
| **10** | +3 Accuracy · +10 Crit · +1 Health · +2 Luck | 3.5 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+40 Crit · +30 Accuracy · +8 Health · +4 Precision · +2 Resist · +2 STAMINA REGEN · +4 Item Slots · +6 Luck · +3 Stamina Max
no off-ladder grants
```

Ladder total across the run: **37.8**

---

## Child

`civilian.child` · **AUTHORED**

> Luck and Dodge and nothing else — a child survives by being small, quick and unaccountably fortunate. The lowest Health gain in the game and no Strength whatever. Crit late, because a frightened child who lands a hit lands it somewhere terrible. Authored 2026-09-03 on Angela's call: "just make a call for each of the civilians and make some different rows, just so they're differentiated." Numbers SOFT. STAMINA, ruled 2026-09-03: +3 Stamina Max (L2, L4, L8) and +2 Stamina Regen (L6, L9), identical across all ten civilian types and the class table — "they are supposed to be exactly the fucking same as other heroes." It is the one part of a civilian type table that is not differentiated, deliberately.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +2 Luck · +1 Stamina Max | 1.2 |
| **3** | +3 Accuracy · +5 Dodge · +1 Health · +2 Luck | 3.0 |
| **4** | +5 Crit · +5 Dodge · +1 Health · +1 Item Slots · +3 Luck · +1 Stamina Max | 4.6 |
| **5** | +5 Dodge · +2 Luck<br>**CHOOSE ONE:** +10 Dodge / +5 Health / +8 Crit / +5 Luck / +15 Accuracy<br>*The Warrior L5 list verbatim — ruled 2026-09-03: "for number 6, I was saying the L5 choice is the Warrior list." That closes the soft flag on every civilian type table.* | 4.9 |
| **6** | +5 Crit · +5 Dodge · +1 Health · +3 Luck · +1 Precision · +1 STAMINA REGEN | 6.6 |
| **7** | +3 Accuracy · +5 Dodge · +1 Health · +1 Item Slots · +2 Luck | 3.7 |
| **8** | +5 Crit · +5 Dodge · +1 Health · +3 Luck · +1 Precision · +1 Stamina Max | 4.9 |
| **9** | +3 Accuracy · +5 Dodge · +1 Health · +1 Item Slots · +2 Luck · +1 STAMINA REGEN | 5.7 |
| **10** | +10 Crit · +5 Dodge · +1 Health · +4 Luck · +1 Precision | 5.8 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+40 Dodge · +25 Crit · +23 Luck · +8 Health · +2 STAMINA REGEN · +3 Precision · +3 Item Slots · +9 Accuracy · +3 Stamina Max
no off-ladder grants
```

Ladder total across the run: **40.3**

---

## Scholar

`civilian.scholar` · **AUTHORED**

> Magic, Spirit and Vision — the librarian, the lore keeper, the old wise man, the ship's astrologer. Frail: one Health a level and never any Strength. The only civilian type that gains Vision, because knowing where a thing is IS the contribution. Authored 2026-09-03 on Angela's call: "just make a call for each of the civilians and make some different rows, just so they're differentiated." Numbers SOFT. STAMINA, ruled 2026-09-03: +3 Stamina Max (L2, L4, L8) and +2 Stamina Regen (L6, L9), identical across all ten civilian types and the class table — "they are supposed to be exactly the fucking same as other heroes." It is the one part of a civilian type table that is not differentiated, deliberately.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +1 Vision · +1 Stamina Max | 1.0 |
| **3** | +3 Accuracy · +1 Health · +1 Magic · +1 Vision | 2.8 |
| **4** | +3 Accuracy · +1 Health · +1 Resist · +1 Spirit · +1 Stamina Max | 4.9 |
| **5** | +1 Item Slots · +1 Vision<br>**CHOOSE ONE:** +2 Magic / +2 Spirit / +1 Resist / +5 Health / +15 Accuracy<br>*The Warrior L5 list verbatim — ruled 2026-09-03: "for number 6, I was saying the L5 choice is the Warrior list." That closes the soft flag on every civilian type table.* | 3.9 |
| **6** | +3 Accuracy · +5 Crit · +1 Health · +1 Magic · +1 STAMINA REGEN | 5.6 |
| **7** | +3 Accuracy · +1 Health · +1 Item Slots · +1 Spirit | 3.3 |
| **8** | +5 Crit · +1 Health · +1 Magic · +1 Vision · +1 Stamina Max | 3.5 |
| **9** | +3 Accuracy · +1 Health · +1 Item Slots · +1 Spirit · +1 STAMINA REGEN | 5.3 |
| **10** | +3 Accuracy · +5 Crit · +1 Health · +1 Magic · +1 Resist | 5.6 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+4 Magic · +3 Spirit · +8 Health · +2 Resist · +2 STAMINA REGEN · +18 Accuracy · +15 Crit · +3 Item Slots · +3 Stamina Max · +4 Vision
no off-ladder grants
```

Ladder total across the run: **35.8**

---

## Crafter

`civilian.crafter` · **AUTHORED**

> Armor and Item Slots — the blacksmith, the runesmith, the cook. Makes things, wears what it makes, and carries more than anyone but the merchant. Strength early, Armor across the run, and the fewest Accuracy gains of any civilian: it was never aiming. Authored 2026-09-03 on Angela's call: "just make a call for each of the civilians and make some different rows, just so they're differentiated." Numbers SOFT. STAMINA, ruled 2026-09-03: +3 Stamina Max (L2, L4, L8) and +2 Stamina Regen (L6, L9), identical across all ten civilian types and the class table — "they are supposed to be exactly the fucking same as other heroes." It is the one part of a civilian type table that is not differentiated, deliberately.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +1 Item Slots · +1 Stamina Max | 1.5 |
| **3** | +1 Armor · +1 Health · +1 Item Slots · +1 Strength | 4.2 |
| **4** | +3 Accuracy · +1 Health · +1 Resist · +1 Stamina Max | 3.4 |
| **5** | +1 Item Slots · +1 Strength<br>**CHOOSE ONE:** +1 Armor / +2 Strength / +5 Health / +1 Resist / +8 Crit<br>*The Warrior L5 list verbatim — ruled 2026-09-03: "for number 6, I was saying the L5 choice is the Warrior list." That closes the soft flag on every civilian type table.* | 4.2 |
| **6** | +3 Accuracy · +1 Armor · +1 Health · +1 Strength · +1 STAMINA REGEN | 6.1 |
| **7** | +3 Accuracy · +1 Health · +1 Item Slots · +1 Toughness | 2.2 |
| **8** | +1 Armor · +5 Crit · +1 Health · +1 Strength · +1 Stamina Max | 4.8 |
| **9** | +3 Accuracy · +1 Health · +1 Item Slots · +1 Resist · +1 STAMINA REGEN | 5.8 |
| **10** | +1 Armor · +1 Health · +2 Luck · +1 Resist · +1 Strength | 5.9 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+4 Armor · +3 Resist · +5 Strength · +8 Health · +2 STAMINA REGEN · +5 Item Slots · +12 Accuracy · +5 Crit · +3 Stamina Max · +1 Toughness · +2 Luck
no off-ladder grants
```

Ladder total across the run: **37.9**

---

## Merchant

`civilian.merchant` · **AUTHORED**

> Item Slots above everything — the caravans, the silk merchant, the supply master. Seven slots across the run, the most in the game, and Luck to go with them: a merchant's power is entirely what is in the wagon. Movement at 9, because a caravan that cannot leave is loot. Authored 2026-09-03 on Angela's call: "just make a call for each of the civilians and make some different rows, just so they're differentiated." Numbers SOFT. STAMINA, ruled 2026-09-03: +3 Stamina Max (L2, L4, L8) and +2 Stamina Regen (L6, L9), identical across all ten civilian types and the class table — "they are supposed to be exactly the fucking same as other heroes." It is the one part of a civilian type table that is not differentiated, deliberately.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +1 Item Slots · +2 Luck · +1 Stamina Max | 1.9 |
| **3** | +3 Accuracy · +1 Health · +1 Item Slots · +3 Luck · +1 Precision | 3.4 |
| **4** | +3 Dodge · +1 Health · +1 Item Slots · +2 Luck · +1 Resist · +1 Stamina Max | 4.8 |
| **5** | +3 Accuracy · +1 Item Slots · +2 Luck<br>**CHOOSE ONE:** +5 Health / +15 Accuracy / +5 Luck / +10 Dodge / +1 Resist<br>*The Warrior L5 list verbatim — ruled 2026-09-03: "for number 6, I was saying the L5 choice is the Warrior list." That closes the soft flag on every civilian type table.* | 4.7 |
| **6** | +3 Accuracy · +1 Health · +1 Item Slots · +3 Luck · +1 Precision · +1 STAMINA REGEN | 5.4 |
| **7** | +1 Armor · +3 Dodge · +1 Health · +2 Luck · +1 Precision | 4.8 |
| **8** | +3 Accuracy · +1 Health · +1 Item Slots · +3 Luck · +1 Precision · +1 Stamina Max | 3.7 |
| **9** | +1 Health · +1 Item Slots · +2 Luck · +1 Movement · +1 STAMINA REGEN | 4.3 |
| **10** | +3 Accuracy · +5 Crit · +1 Health · +3 Luck · +1 Precision | 3.7 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+5 Precision · +7 Item Slots · +22 Luck · +8 Health · +2 STAMINA REGEN · +15 Accuracy · +1 Resist · +1 Armor · +6 Dodge · +5 Crit · +3 Stamina Max · +1 Movement
no off-ladder grants
```

Ladder total across the run: **36.5**

---

## Refugee

`civilian.refugee` · **AUTHORED**

> Health and Toughness and nothing that hurts anybody — the refugees, the desperate villagers, the cursed passengers, the ragtag survivors. The most Health of any civilian type and the least offence: it is built to still be standing, not to win. Authored 2026-09-03 on Angela's call: "just make a call for each of the civilians and make some different rows, just so they're differentiated." Numbers SOFT. STAMINA, ruled 2026-09-03: +3 Stamina Max (L2, L4, L8) and +2 Stamina Regen (L6, L9), identical across all ten civilian types and the class table — "they are supposed to be exactly the fucking same as other heroes." It is the one part of a civilian type table that is not differentiated, deliberately.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +2 Health · +1 Toughness · +1 Stamina Max | 1.7 |
| **3** | +1 Armor · +3 Dodge · +2 Health · +1 Toughness | 4.3 |
| **4** | +3 Accuracy · +2 Health · +1 Resist · +1 Strength · +1 Stamina Max | 4.9 |
| **5** | +3 Dodge · +1 Health · +1 Toughness<br>**CHOOSE ONE:** +5 Health / +1 Resist / +1 Armor / +10 Dodge / +15 Accuracy<br>*The Warrior L5 list verbatim — ruled 2026-09-03: "for number 6, I was saying the L5 choice is the Warrior list." That closes the soft flag on every civilian type table.* | 4.8 |
| **6** | +3 Accuracy · +1 Armor · +2 Health · +1 Toughness · +1 STAMINA REGEN | 6.0 |
| **7** | +3 Dodge · +2 Health · +1 Item Slots · +1 Strength | 3.6 |
| **8** | +3 Accuracy · +2 Health · +1 Resist · +1 Toughness · +1 Stamina Max | 4.3 |
| **9** | +1 Armor · +3 Dodge · +2 Health · +1 Item Slots · +1 STAMINA REGEN | 6.6 |
| **10** | +3 Accuracy · +2 Health · +2 Luck · +1 Strength · +1 Toughness | 3.4 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+17 Health · +3 Armor · +2 Resist · +2 STAMINA REGEN · +12 Dodge · +3 Strength · +6 Toughness · +12 Accuracy · +2 Item Slots · +3 Stamina Max · +2 Luck
no off-ladder grants
```

Ladder total across the run: **39.5**

---

## Militia

`civilian.militia` · **AUTHORED**

> The closest a civilian gets to a soldier — the militia, the guard, the badgered soldier. Strength, Armor and Accuracy in a straight line, and the only civilian type with Reach. Still no stamina: it holds a spear, it does not have training. Authored 2026-09-03 on Angela's call: "just make a call for each of the civilians and make some different rows, just so they're differentiated." Numbers SOFT. STAMINA, ruled 2026-09-03: +3 Stamina Max (L2, L4, L8) and +2 Stamina Regen (L6, L9), identical across all ten civilian types and the class table — "they are supposed to be exactly the fucking same as other heroes." It is the one part of a civilian type table that is not differentiated, deliberately.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +5 Accuracy · +1 Health · +1 Stamina Max | 1.8 |
| **3** | +5 Accuracy · +1 Armor · +1 Health · +1 Strength | 4.5 |
| **4** | +5 Accuracy · +1 Health · +1 Reach · +1 Stamina Max | 2.3 |
| **5** | +3 Accuracy · +1 Strength<br>**CHOOSE ONE:** +2 Strength / +1 Armor / +15 Accuracy / +5 Health / +1 Resist<br>*The Warrior L5 list verbatim — ruled 2026-09-03: "for number 6, I was saying the L5 choice is the Warrior list." That closes the soft flag on every civilian type table.* | 4.6 |
| **6** | +5 Accuracy · +1 Armor · +1 Health · +1 Strength · +1 STAMINA REGEN | 6.5 |
| **7** | +3 Accuracy · +5 Crit · +1 Health · +1 Item Slots | 2.8 |
| **8** | +3 Accuracy · +1 Armor · +1 Health · +1 Strength · +1 Stamina Max | 4.4 |
| **9** | +3 Accuracy · +1 Health · +1 Item Slots · +1 Resist · +1 STAMINA REGEN | 5.8 |
| **10** | +5 Accuracy · +5 Crit · +1 Health · +1 Resist · +1 Strength | 5.5 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+37 Accuracy · +3 Armor · +5 Strength · +8 Health · +2 STAMINA REGEN · +2 Resist · +10 Crit · +2 Item Slots · +3 Stamina Max · +1 Reach
no off-ladder grants
```

Ladder total across the run: **38.1**

---

## Sailor

`civilian.sailor` · **AUTHORED**

> Movement and Dodge — the deckhands, the catfolk crew, the cargo hold crew, the lost fishers. Two points of Movement across the run, the only civilian type to get a second, and Dodge on top: a sailor's whole trade is footing on a surface that will not hold still. Authored 2026-09-03 on Angela's call: "just make a call for each of the civilians and make some different rows, just so they're differentiated." Numbers SOFT. STAMINA, ruled 2026-09-03: +3 Stamina Max (L2, L4, L8) and +2 Stamina Regen (L6, L9), identical across all ten civilian types and the class table — "they are supposed to be exactly the fucking same as other heroes." It is the one part of a civilian type table that is not differentiated, deliberately.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +3 Accuracy · +3 Dodge · +1 Health · +1 Stamina Max | 2.3 |
| **3** | +3 Accuracy · +5 Dodge · +1 Health · +1 Strength | 3.6 |
| **4** | +3 Dodge · +1 Health · +1 Movement · +1 Precision · +1 Stamina Max | 3.4 |
| **5** | +3 Accuracy · +1 Item Slots · +1 Strength<br>**CHOOSE ONE:** +10 Dodge / +5 Health / +2 Strength / +15 Accuracy / +8 Crit<br>*The Warrior L5 list verbatim — ruled 2026-09-03: "for number 6, I was saying the L5 choice is the Warrior list." That closes the soft flag on every civilian type table.* | 5.3 |
| **6** | +3 Accuracy · +5 Dodge · +1 Health · +1 Strength · +1 STAMINA REGEN | 5.6 |
| **7** | +3 Dodge · +1 Health · +1 Item Slots · +1 Precision · +1 Reach | 3.6 |
| **8** | +3 Accuracy · +5 Dodge · +1 Health · +1 Movement · +1 Strength · +1 Stamina Max | 4.6 |
| **9** | +5 Crit · +3 Dodge · +1 Health · +1 Item Slots · +1 Strength · +1 STAMINA REGEN | 6.1 |
| **10** | +3 Accuracy · +5 Dodge · +1 Health · +2 Luck · +1 Precision | 4.0 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+32 Dodge · +5 Strength · +8 Health · +2 STAMINA REGEN · +18 Accuracy · +3 Precision · +3 Item Slots · +2 Movement · +5 Crit · +3 Stamina Max · +1 Reach · +2 Luck
no off-ladder grants
```

Ladder total across the run: **38.4**

---

## Bard

`civilian.bard` · **AUTHORED**

> Spirit and Luck — the bard and the ethereal bard, and nobody else. Spirit is the party-wide sum, so a bard levels the whole side rather than itself; the Luck is the only thing it keeps. The lowest Health of any type that is not a child. Authored 2026-09-03 on Angela's call: "just make a call for each of the civilians and make some different rows, just so they're differentiated." Numbers SOFT. STAMINA, ruled 2026-09-03: +3 Stamina Max (L2, L4, L8) and +2 Stamina Regen (L6, L9), identical across all ten civilian types and the class table — "they are supposed to be exactly the fucking same as other heroes." It is the one part of a civilian type table that is not differentiated, deliberately.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +2 Luck · +1 Stamina Max | 1.2 |
| **3** | +3 Accuracy · +1 Health · +2 Luck · +1 Precision · +1 Spirit | 4.0 |
| **4** | +3 Dodge · +1 Health · +1 Item Slots · +3 Luck · +1 Stamina Max | 3.0 |
| **5** | +2 Luck · +1 Spirit<br>**CHOOSE ONE:** +2 Spirit / +5 Luck / +5 Health / +15 Accuracy / +10 Dodge<br>*The Warrior L5 list verbatim — ruled 2026-09-03: "for number 6, I was saying the L5 choice is the Warrior list." That closes the soft flag on every civilian type table.* | 4.9 |
| **6** | +3 Accuracy · +1 Health · +3 Luck · +1 Precision · +1 STAMINA REGEN | 4.7 |
| **7** | +3 Dodge · +1 Health · +1 Item Slots · +1 Spirit | 3.6 |
| **8** | +5 Crit · +1 Health · +3 Luck · +1 Precision · +1 Stamina Max | 3.4 |
| **9** | +3 Accuracy · +1 Health · +1 Item Slots · +2 Luck · +1 STAMINA REGEN | 4.2 |
| **10** | +3 Accuracy · +5 Crit · +1 Health · +3 Luck · +1 Resist · +1 Spirit | 6.2 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+4 Spirit · +8 Health · +20 Luck · +2 STAMINA REGEN · +3 Precision · +12 Accuracy · +3 Item Slots · +10 Crit · +1 Resist · +6 Dodge · +3 Stamina Max
no off-ladder grants
```

Ladder total across the run: **35.1**

---

## Wife

`civilian.wife` · **AUTHORED**

> The wives — the ones who stayed and were still standing when it came through the door. Health and Resist above everything, a little Strength and Armor late, and Item Slots: she has the house. No Magic, no Spirit, almost no Dodge — she does not evade, she absorbs. Invented 2026-09-03 on Angela's call: "invent a table for Wife #3, Living Ghost, and Zombie Bride." Numbers SOFT. Stamina: +3 Max (L2, L4, L8), +2 Regen (L6, L9), same as every civilian type.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +1 Resist · +1 Stamina Max | 2.8 |
| **3** | +2 Health · +1 Precision · +1 Item Slots · +3 Accuracy | 3.3 |
| **4** | +1 Strength · +1 Health · +1 Resist · +1 Stamina Max | 3.8 |
| **5** | +1 Health · +1 Item Slots<br>**CHOOSE ONE:** +2 Strength / +5 Health / +15 Accuracy / +1 Resist / +1 Armor<br>*The Warrior L5 list verbatim — ruled 2026-09-03: "for number 6, I was saying the L5 choice is the Warrior list." That closes the soft flag on every civilian type table.* | 4.2 |
| **6** | +1 Armor · +2 Health · +3 Accuracy · +1 STAMINA REGEN | 5.6 |
| **7** | +1 Strength · +1 Health · +1 Item Slots · +3 Dodge · +5 Crit | 4.1 |
| **8** | +2 Health · +1 Resist · +3 Accuracy · +1 Stamina Max | 3.9 |
| **9** | +1 Armor · +1 Health · +1 Toughness · +1 STAMINA REGEN | 4.9 |
| **10** | +1 Strength · +2 Health · +1 Resist · +1 Item Slots · +3 Accuracy · +2 Luck | 5.7 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+4 Resist · +13 Health · +2 Armor · +2 STAMINA REGEN · +3 Strength · +4 Item Slots · +12 Accuracy · +1 Precision · +5 Crit · +3 Stamina Max · +3 Dodge · +1 Toughness · +2 Luck
no off-ladder grants
```

Ladder total across the run: **38.2**

---

## Living Ghost

`civilian.ghost` · **AUTHORED**

> Dodge, Spirit and Resist, and almost no body at all — the lowest Health in the game and not one point of Strength or Armor across ten levels. Forty-five Dodge, more than any other table: the whole design is that it is difficult to establish that she is there. Spirit because a ghost lifts the side rather than itself. Invented 2026-09-03 on Angela's call. Numbers SOFT. Stamina: +3 Max (L2, L4, L8), +2 Regen (L6, L9), same as every civilian type.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +1 Health · +5 Dodge · +1 Stamina Max | 2.3 |
| **3** | +1 Health · +5 Dodge · +1 Resist · +1 Vision | 4.2 |
| **4** | +1 Health · +5 Dodge · +1 Spirit · +1 Stamina Max | 3.8 |
| **5** | +5 Dodge · +1 Vision<br>**CHOOSE ONE:** +2 Strength / +5 Health / +15 Accuracy / +1 Resist / +1 Armor<br>*The Warrior L5 list verbatim — ruled 2026-09-03: "for number 6, I was saying the L5 choice is the Warrior list." That closes the soft flag on every civilian type table.* | 4.7 |
| **6** | +1 Health · +5 Dodge · +1 Resist · +1 STAMINA REGEN | 6.0 |
| **7** | +1 Health · +5 Dodge · +1 Spirit · +1 Item Slots | 4.2 |
| **8** | +1 Health · +5 Dodge · +1 Resist · +5 Crit · +1 Stamina Max | 5.3 |
| **9** | +5 Dodge · +1 Spirit · +1 Movement · +1 STAMINA REGEN | 5.7 |
| **10** | +1 Health · +5 Dodge · +1 Resist · +1 Spirit · +5 Crit | 6.5 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+45 Dodge · +4 Resist · +4 Spirit · +2 STAMINA REGEN · +7 Health · +10 Crit · +3 Stamina Max · +1 Movement · +1 Item Slots · +2 Vision
no off-ladder grants
```

Ladder total across the run: **42.7**

---

## Revenant

`civilian.revenant` · **AUTHORED**

> Toughness, Armor and Health, and not one point of Dodge — the Zombie Bride does not get out of the way, she is simply still there afterwards. The most Health of any table, eighteen across the run, and Strength late because something that does not feel it hits harder than it should. This is the armoured cousin of the Refugee, which takes Dodge instead. Invented 2026-09-03 on Angela's call. Numbers SOFT. Stamina: +3 Max (L2, L4, L8), +2 Regen (L6, L9), same as every civilian type.

| Lv | Grants | Ladder |
|---|---|---|
| **1** | *the starting line — no level-up happens here* | — |
| **2** | **CHOOSE YOUR SPECIALTY** · +2 Health · +1 Toughness · +1 Stamina Max | 1.7 |
| **3** | +1 Armor · +2 Health · +1 Toughness · +1 Strength | 4.4 |
| **4** | +2 Health · +1 Resist · +1 Toughness · +1 Stamina Max | 3.7 |
| **5** | +2 Health · +1 Toughness<br>**CHOOSE ONE:** +2 Strength / +5 Health / +15 Accuracy / +1 Resist / +1 Armor<br>*The Warrior L5 list verbatim — ruled 2026-09-03: "for number 6, I was saying the L5 choice is the Warrior list." That closes the soft flag on every civilian type table.* | 4.4 |
| **6** | +1 Armor · +2 Health · +1 Strength · +1 STAMINA REGEN | 6.0 |
| **7** | +2 Health · +1 Toughness · +1 Item Slots · +3 Accuracy | 2.7 |
| **8** | +1 Armor · +2 Health · +1 Resist · +1 Stamina Max | 5.3 |
| **9** | +2 Health · +1 Strength · +1 Toughness · +1 STAMINA REGEN | 4.4 |
| **10** | +1 Armor · +2 Health · +1 Strength · +1 Toughness · +3 Accuracy | 5.0 |

**At level 10**, before the L5 pick and before any badge, origin, item or specialty:

```
+18 Health · +4 Armor · +4 Strength · +2 Resist · +2 STAMINA REGEN · +7 Toughness · +6 Accuracy · +3 Stamina Max · +1 Item Slots
no off-ladder grants
```

Ladder total across the run: **37.6**

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
