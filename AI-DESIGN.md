# AI design — how a unit decides what to do

**Ruled 2026-09-26 by Andrew** — `DECISIONS.md` "the AI: modes per unit type, scoring
inside them, encounter rules on top", verbatim there. Backlog item `system.ai-modes`. Where
this file and that entry disagree, the entry wins.

The one question this answers: **on its Activation, how does a unit choose its movement and
its action?**

---

## 1. Where we are

- `src/ai/modes.ts` holds ten modes written as hand rules, not scores ("Utility scoring comes
  later", modes.ts:1-3): flee, dumb-melee, melee-aggressive, ranged-kite, defender, support,
  focused-fire, value-hunter, follow, hunter.
- Targeting is lowest HP, ties to lower id (modes.ts:52-58). The AI reads only
  `damageOnHit` from `preview()` — not hit chance, crit, block, thorns or riders
  (modes.ts:130, 185, 420). It is blind to zone of control, attacks of opportunity, cover,
  line of sight, ground and structures (SWITCHES.md:403, 1003, 1035, 1075).
- There is no list of legal actions; each mode builds its own candidates.
- Enemies have **one** ability between the 33 authored units (`power.ghoul.eat-corpse`).
  The bestiary has 240 units and 155 buff/heal/debuff/ability rows with no lane to use them;
  the pack drops enemy special moves, flight and cooldowns (mkenginepack.mjs:499-533).
- A unit's mode is assigned by counting its attacks — "Mechanical mapping, not design"
  (mkenginepack.mjs:583-595). Nothing fielded uses defender, focused-fire, value-hunter or
  follow.

Angela, 2026-09-04 (DECISIONS.md "The AI is far short of what the game needs"): the AI must
choose "other things other than a basic attack"; "Six AI modes is not the target." And the
ONE ACTION TYPE law applies to enemies: "attacks, movements, and powers are really all just
actions. For enemies, too."

## 2. The design in one sentence

**Every unit type has a mode: fixed rules from its characteristics (a zombie is dumb; some
units defend others) plus scoring of which action to take and whom to attack, priced from
`preview()`. Units act alone by default; an encounter may lay rules on top — coordination,
an anchor, a goal the unit would not have on its own.** A mode is data; the things it weighs
are engine.

## 3. The parts

**A. The action list.** One engine function returns every legal action for a unit right now:
movement (walk, flight, leap, special moves), attacks, powers, abilities, items — the one
action type, heroes and enemies alike. Uses, cooldown and warmup gate it (approved for
enemies, DECISIONS.md 2026-09-04). A *plan* is a destination hex plus the action taken from
it (plus the second pair a Surge grants).

**B. Considerations — engine, each verified like any mechanic.** Each returns a number from
`preview()` (Laws 1 and 2), so the AI never does its own arithmetic:

| # | Consideration | What it measures |
|---|---|---|
| 1 | expected damage | hit chance × damage, with crit and block — replaces `damageOnHit` alone |
| 2 | kill | chance this plan takes a target down |
| 3 | healing value | HP restored, weighted toward someone about to go down |
| 4 | buff / debuff value | what a status is worth over its duration (question 3) |
| 5 | danger | what the other side can deal to me on that hex next Phase |
| 6 | path cost | attacks of opportunity the path provokes (Law 2 already names this) |
| 7 | ground | cover, line of sight, hazards, structures — V2's "different day" |
| 8 | anchor | distance to what the mode cares about: an ally, a range band, an objective |
| 9 | target preference | lowest HP, biggest threat, healer first, the hunter's lock, taunt |
| 10 | side plan | agrees with the side's chosen target (focus fire) |
| 11 | friendly fire | allies caught in an area |
| 12 | overkill | wasted damage — or, for the Shredder, a kill it wants to avoid |

**C. Modes — data rows, `ai.*`** (the kind is already in GLOSSARY.md, e.g. `ai.ranged-kite`).
By default one per type of unit (ruled). A mode is its characteristics as hard rules ("dumb —
nearest enemy, basic attack", "never attacks", "defends others first") plus weights over the
considerations, a target preference and an anchor. A dumb mode may switch most scoring off. The ten modes become ten rows; a new mode is a
new row, no code. The modes wanted so far (8-ENCOUNTERS-NOTES.md §4 and the `AI` column of
`csv/HBT-enemies.csv`): artillery, defender, focused fire, value hunter, follow, hunter,
hybrid, and the brute / archer / shaman / soldier archetypes of COMBAT-DESIGN.md:592.

**D. Action hints — on the action's own row.** Ruled: ability use is *both* the row's
guidance and the engine's valuation — simplified first, simulation later to find better
behaviour. A designer can steer one action without touching a mode: "use whenever available" (Iron Colossus Buff, ENEMY-REVIEW.md:352),
"only below half HP", "only with 2+ enemies in the area".

**E. Overrides stay on top**, as today: Confusion, Dazed, Taunt, civilian flight, a prone
unit stands first.

## 4. Encounter rules and the side brain

**Ruled: by default units do not work together.** An encounter may impose overarching rules:
group coordination, anchoring units to a location, or goals not inherent to the unit. These
are authored on the encounter row (`encounter.*`), not on the unit.

When an encounter turns coordination on, once per Phase before any Activation that side picks
a focus target and hands out jobs (screen the back line, flank, hold). This is where fodder's "shared-brain AI" (COMBAT-DESIGN.md:504) lives, and
later the named villain who "taunts, adapts, and remembers" (:596).

## 5. Legible, and explainable

COMBAT-DESIGN.md:592 wants "Legible archetype AI, per faction" — a player learns what brutes,
archers and shamans do. Scoring serves that: the mode's weights *are* the archetype. Every
decision logs its top three plans with the numbers behind each (Law 12), so the viewer can
show why a unit did what it did.

**Default, unless ruled otherwise:** no variety — the same situation always gets the same
move, ties broken by id (Law 6). If variety is wanted later, it comes from the `ai-tiebreak`
stream that is already declared and unused (rng.ts:26).

## 6. Heroes

The same system drives heroes in the simulator (DECISIONS.md:1105 — "every unit is AI-driven
already"). A human-controlled hero has no mode in play (SWITCHES.md:913). Hero modes are rows
too. **Ruled: in the simulator, heroes play as well as the engine can.**

## 7. Build order — each step one backlog item through the gate

1. **The action list.** Today's modes switch to reading it. Control battles unchanged.
2. **The enemy ability lane.** Uses, cooldown, warmup; restore what the pack drops — Colossus
   Charge / Clobber / Buff, the hounds' Close Bite, flight.
3. **The scorer**, with considerations 1, 2, 3, 8, 9; the ten modes rewritten as rows.
   Changes the baseline, declared.
4. Considerations 4, 5, 6 — buffs, danger, attacks of opportunity.
5. Encounter rules — coordination, anchors, goals — and the side brain.
6. Consideration 7 — ground, cover, line of sight.
7. Items (DECISIONS.md:2040-2046 waits on this).

Then the per-unit modes are authored as rows, in the Codex, not in the engine.

## 8. Not in this design

Enemy cost versus stat stays open (DECISIONS.md 2026-09-04) — nothing here needs it.
Learning or adapting across battles is later, on top of the side brain.

## 9. Noticed while writing this

`ai.attack-choice` and `fix.enemy-ai-role` are marked done in `.state/backlog.json` though
DECISIONS.md:1840 says both are NOT approved.

## 10. Answered 2026-09-26

The four questions of the draft are answered in `DECISIONS.md` (same date). Open, asked the
same night: whether a mode can change mid-battle, whether players see enemy intent before it
acts, and whether the AI may see what a player cannot.
