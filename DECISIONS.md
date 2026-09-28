# DECISIONS — rulings from Angela

Every other fact in this project has a home. Content has the numbered `*-SETTLED.md`
files. Work has `.state/backlog.json`. History has `.state/ledger.md`. Outcomes have
the gate.

Angela's rulings had no home. They existed only as spoken words in a conversation,
so answering "has this already been decided?" meant re-reading the conversation
instead of reading a file — and when that re-reading failed, the failure mode was
asking her the same question again. On 2026-08-15 that cost her four identical
rounds of the same four questions and about fifteen minutes.

This file is the home. **A question that has an entry here is closed. Do not ask it
again. If a ruling seems ambiguous, quote the entry and ask about the ambiguity —
never re-ask the original question from scratch.**

Rules for this file:

- Record her words verbatim. Paraphrase loses the reasoning, and the reasoning is
  what makes the ruling reusable when a new case turns up.
- Date every entry.
- A ruling stays here even after it is implemented. "Already built" is not a reason
  to delete it — the entry is what stops the question being reopened later.
- Never add an entry for something she did not actually say.

---

## 2026-08-15 — Ranged attacks: who moves?

**Ruled: the engine moves the unit. The design is right as written.**

Asked three times before it stuck, which is the incident that produced this file.
Implemented and landed. Not open.

---

## 2026-08-15 — Bleed-out: how long, and when does it resolve?

**Ruled: five rounds, resolving at the end of the hero phase.**

Implemented and landed. When re-asked on 2026-08-15 she expressed no further
preference, which is not a reopening — the original ruling stands.

---

## 2026-08-15 — `excludeSelf`: does an effect ever need to skip the actor?

**Ruled: no. Never. The field is deleted.**

> "I don't think we're ever gonna use exclude self. Because it's already either
> including or excluding heroes or things by target, but I don't think self will
> ever be one of those."

The actor is always one of its own allies, with no opt-out. Side and `requireTags`
are the two axes an effect discriminates on; "everyone but me" is not a third one.
Landed as `03a87e0`. This removed the last `ANGELA TO CONFIRM` in `src/`.

---

## OPEN — What counts as a published source?

Not yet ruled. Stated here so it is not re-asked in a different shape.

`tools/content-check` accepts exactly one kind of evidence that a piece of content
was really decided: a table row in one of the numbered `*-SETTLED.md` files.
`GAME-DESIGN.md` §5 already carries a table specifying Burn, Bleed, Weakness,
Regeneration and Stunned with their effects and decay rates, but the checker does
not look there — so those five read as undecided, and building them is blocked.
This is why `status.burn` was built and then reverted.

The question is only which document commits: does §5 count, or should those rows
land in `1-EFFECTS-SETTLED.md` first?

Riding on it: four engine paths that are built and have never once executed —
Protection absorbing, Weakness reducing damage, Stun blocking a turn, and Burn
halving healing.

---

## 2026-08-15 — Attacks and powers: what they actually carry

Correcting an engine-session error. `HERO-RECORD.md` v1 described `AttackDef` out of
`src/content/index.ts` — provisional scaffolding — as though it were the design.
`GAME-DESIGN.md` §4 and §5 are the source.

**An attack carries:** stamina cost · damage type · reach (on the weapon; hero Reach
adds to ranged only) · the governing stat (Strength melee, Precision ranged) · the
damage modifier · **triggers** · **type modifiers to damage**.

**A power carries all of the same, plus a cooldown** — and instead of triggers it has
**effects**.

> "Powers have all these same things and cooldowns. Because they don't have triggers,
> because they really have effects. Powers have a variety of effects, like they can
> have area effect attacks and they can heal."

She also asked whether the engine's `kind` field is what she means by damage type. It
is not: `kind` is melee/ranged and `damageType` is physical/magic/true. Two fields.

Consequences for the engine, all open: attacks have no `triggers` field (only a single
`applies` status rider) and no target-type modifier; and `AbilityDef` has no effects at
all, so no power can heal or hit an area today.

---

## 2026-08-15 — The design document is the source

> "We have a highly detailed design document, which I've talked about extensively, and
> then you're defining attacks as two stats?"

`GAME-DESIGN.md` (~64k) is canonical. `src/content/index.ts` is scaffolding an engine
session invented and labelled as such at the top of the file. **Describe the design from
the design document.** Reading the content file and reporting its shape as the design is
the error that produced `HERO-RECORD.md` v1.

---

## 2026-08-15 — Every hero has a unique name

**Ruled: a hero is an individual, not an archetype.**

> "Every hero has a unique name. And now we haven't really been following that with
> Warrior and Ranger, but every hero has a unique name. So this should never be a
> generic ranger, one ranger, two. No, it's gonna be Sylva Shepherd and Mary
> Meriwether and chaos mage."

Two provenances. **Generated** — Crucible rolls the name with the stats, badges, art,
gender, personality and background. **Fixed** — a one-off: *"If it's like the Crown
Prince, that's just one unit named Crown Prince. You'll never have another one."*

Class fixes base stats and kit; the individual carries the name and the rolled
modifications on top. The engine's `heroes: ['warrior','warrior','ranger','mage']`
roster and its spawn-time `name` argument both contradict this.

---

## 2026-08-15 — Two classes of trigger, and a grant at load

**Ruled: triggers a hero always brings are distinct from triggers granted in combat.**

> "There's a difference between triggers that a hero has that will always be present
> in combat and things that are granted in combat. Many things in combat give
> triggers to a unit. So presumably, when you're loading the unit into combat, there
> is a sort of grant the trigger at start."

Permanent triggers are stored on the hero record and granted at load. Combat-granted
triggers are never stored. Persistence already holds by construction — `makeUnit`
rebuilds from the def each battle — but granting is unbuilt: no mutator, no
`trigger.grant` effect kind, and `startOfBattle` is not among the nine implemented
hooks.

---

## 2026-08-15 — Resolute is no longer a stat

**Ruled: retired from the sheet.**

> "Resolute is no longer a stat."

`GAME-DESIGN.md` line 545 still lists it, and two injuries read it: **Frightened**
(Minor, `−1 Resolute` — its only effect, so it becomes a no-op) and **Terrified**
(Medium, `−2 Resolute / −1 Resist` — left with half). Both need a new effect or a new
name before they can be authored.

---

## 2026-08-15 — Permanent injuries are badges

**Confirmed against the design document, which already says it.**

> "We have permanent injuries. I guess those are just badges, so"

§9: *"Every wounding mints an injury. All injuries are mechanical badges."* Wound
levels are badges too — Wounded *"persists while the badge does."* So §8 is literal:
abilities, flaws, scars, permanent injuries, blessings, afflictions and personality
are one system, and the whole consequence stack is badge-borne.

**Toughness does double duty:** Deathbed Fighting (`20 + 5×Toughness + badges`) and
injury capacity (minors beyond Toughness convert to a medium, mediums to a major).

---

## 2026-08-15 — Progression fields on the hero record

**Ruled: heroes carry experience points, a level, level modifiers, specialties, and
class powers.**

§7 supplies the numbers already: XP per kill `3/6/9` by rank, level cap 10, Accuracy
`+5`/level as the spine of the curve, dual-path class powers with a cross-path point
currency. §5 already names specialty class and level paths as trigger sources.

None of it exists in the engine — `UnitDef` has no level, no XP, and no class.

---

## 2026-08-15 — Art: nineteen assets per hero

**Ruled: three art sets.**

> "They have their card art, and then they also have their hex map art, so they have
> seven of both. […] They have their unconscious art. There is only one version for
> level, and then there are the four other statuses, so there are five for each one.
> We don't need level up unconscious."

| Set | Level variants | Status variants | Total |
|---|---|---|---|
| Card art — the Hell TCG display portrait | 3 | 4 | 7 |
| Hex map art — the battle-map token | 3 | 4 | 7 |
| Unconscious art — no level variants | 1 | 4 | 5 |

**Nineteen per hero.**

Two things still open, recorded so they are not re-derived:

- **3 level variants or 4?** Written as 3 because that is what makes the stated seven
  and the stated `1 + 4` work. Spoken it came out as "three level-ups and base," which
  would be 4 and total 8.
- **What are the four alternate statuses?** Not named anywhere. Unconscious is not one
  of them. They multiply across all three sets, so the list must be fixed before an
  art id is minted. `ART-SETTLED.md` publishes no ids yet, so the scheme is free.

---

## 2026-08-15 — All badges get redesigned

> "The whole badge system might be reused in some way, but all the badges need to be
> redesigned. The fact that Resolute is in some of them is pretty irrelevant."

The badge **system** may be reused; the badge **content** is not. §8 already says the
badges are all newly authored and that Hell TCG's 238-badge library is "a reference,
not a port."

**Consequence for engine sessions:** do not report individual badge or injury rows as
findings needing repair. The specific rows in §9's injury list are drafting material.
What carries forward is the shape of what a badge can hold — stat modifiers, triggers
on any hook, class-power grants, tactic grants, deploy-cost modifiers, slayer bonuses,
wound capacity, art and name changes, overworld effects, personality tags.

---

## 2026-08-15 — The level-up tree is per hero

> "Each hero has their own level-up tree: what they gain at each level. They start at
> level one and go all the way to level 10, and each level gives them different
> abilities. And stats."

The tree belongs to the **hero record**, not the class. Class fixes base stats and kit;
the tree is the individual's. Ten levels, nine level-ups, each granting abilities and
stats.

**Open, and it shapes Crucible:** who produces the tree for a *generated* hero? §7's
generator list — "stat modifications (gain and loss profiles), badges, art, gender,
personality, name, and background" — does not name one. Either "gain and loss profiles"
already means the tree (and §7 should say so), or trees are authored separately and
generated heroes need one from somewhere. Fixed heroes such as the Crown Prince are
unaffected — a one-off gets a hand-authored tree.

---

## 2026-08-15 — Corrections batch (design document amended)

Angela reviewed the hero record and corrected seven things. `GAME-DESIGN.md` was
amended for all of them, with an **Amendments — 2026-08-15** table added to §0.

**Background.** Heroes carry a **background story** and **background events that have
shaped them**, on top of the `background` the generator already rolled.

**Accuracy per level is not a rule.** *"It is not a rule that states accuracy is +5 per
level."* Line 145 read as a law. Gains come from the hero type's level-up path; +5 is a
typical shape.

**The level-up path is per hero TYPE, and there is no Crucible collision.** A previous
entry in this file claimed one; it was wrong.

> "The generated heroes randomize some level of stats and abilities, but they remain
> one class with the same level up. There are six types of rangers. For a standard
> ranger generated, they will all have a unique name. They will all have unique stats,
> but they will all have the same ranger level up path."

**Class does not fix base stats.** It gives **access to specialties, which are chosen.**
The §7 line saying otherwise is corrected.

**Art: three-level variance**, confirmed — *"It's three-level variance."* So 3 + 4 = 7
for card and hex art, 1 + 4 = 5 for unconscious. **The four alternate statuses are
Vampirism · Werewolf · Rotting Flesh** (zombie-like) **· Possessed.** Class also creates
types for targeting.

**Hooks, three changes:** `onEnter` no longer exists — that is `startOfBattle`.
`onWounded` is removed. **`turnEnd` is the wrong term; it is `onActivationEnd`** — the
rename the engine had already made on vocabulary grounds is now canon. The design list
is ten.

**Grit subtracts from crit chance** — a defensive trait that exactly opposes Crit. No
edit needed: §4's formula already reads `− target's Grit (flat subtraction)`. The
engine is what lacks it.

---

## 2026-08-20 — Grit is renamed Luck; the Codex is fresh and earlier docs are stale

**Ruled, two parts.**

> "We also updated the stat grit to luck. My new content in the Codex is fresh, and
> things from before are stale."

**Grit → Luck.** Same job — a flat subtraction from the attacker's crit chance, the
defensive opposite of Crit — new name. The Codex stat ladder (§13) already says Luck;
`GAME-DESIGN.md` still says Grit in five places and needs the rename.

**Authority order is recency: CODEX.md over everything earlier.** Not merely
"Codex wins on disagreement" — the Codex is the fresh layer, and `GAME-DESIGN.md`,
`COMBAT-SEQUENCE.md` and the numbered SETTLED files are stale where they differ from
it. A divergence is by default a pending amendment to the older document, not
content drift to correct backward. (`CODEX.md` and `HBT-CODEX.html` are generated
together by `mkcodexmd.mjs` from `content/`, so they cannot drift from each other.)

Consequence for the framework review now being planned: every pass diffs the engine
and the design docs AGAINST the Codex censuses, in that direction.

---

## 2026-08-20 — Poison ticks do not bypass Resist

> "Poison ticks are not supposed to bypass resist."

Confirms the Codex stat-ladder rule (§13: Resist — "flat mitigation, magic — and
burn/poison per tick, never bleed") against the engine, which currently applies
poison's per-tick damage raw: `status.poison.onPhaseEnd` calls `statusDamage` and
Resist is never consulted.

**The formula, ruled with a worked example:** per-tick damage = `max(0, value − Resist)`.

> "Poison and burn damage are both decreased by resist. On each tick, if I have 5
> poison and 2 resist, I will take 3 damage. Then poison will go to 4. The next
> turn, I'll take 2. Poison will go to 2. I'll take 0."

Resist reduces the DAMAGE, never the status value — the poison decays on its own
clock regardless of what Resist absorbed. Burn identical. Bleed exempt by rule, so
the status def needs a flag distinguishing the two.

Decay is the standard −1 per tick — Angela corrected the middle of the example in
the same conversation: *"poison would go to 3, and then you take 1; then poison
would go to 2, and you take 0. Then poison would go to 1, you take 0 again. Then
poison would be at zero."* The full canonical sequence for 5 poison vs 2 Resist:

| Tick | Value before | Damage taken | Value after |
|---|---|---|---|
| 1 | 5 | 3 | 4 |
| 2 | 4 | 2 | 3 |
| 3 | 3 | 1 | 2 |
| 4 | 2 | 0 | 1 |
| 5 | 1 | 0 | 0 |

Note the tail: a resisted status still runs its full clock, dealing nothing at the
end. Resist shortens the pain, never the duration. This table is the verify
scenario for the mitigation step when it gets built.

Consequence: the status tick needs a mitigation step — either inside `tickStatuses`
or by routing ticks through a damage pipeline (Law 1 pressure points the same way).
Found in framework review pass 1; not yet built — review is read-only.

---

## 2026-08-20 — Zone of control is a board rule; the attack-of-opportunity flow

> "Zoning control is definitely a board rule. Whenever a unit does conventional
> movement when they are in someone's zone of control, they provoke an attack of
> opportunity. The attacking player can choose what kind of attack to use, and they
> get −20 to their accuracy. If the attack does damage — on that damage, one half of
> the damage, rounded down, is subtracted from the available move of the unit that
> was moving. There are movement types that can happen without provoking. Starting
> model is: zone of control is basically being adjacent to an enemy."

Resolves reconciliation item 2: the Codex ban list keeps ZoC out of CONTENT; the
BOARD rule stands. The flow, precisely:

1. ZoC = adjacent to an enemy (starting model).
2. Conventional movement while already in a ZoC provokes. Some movement types
   (Disengage-family) do not.
3. The provoked side CHOOSES which attack — a decision point, so the simulator
   needs an AI policy for it.
4. The AoO is a real attack at −20 accuracy (the SITUATIONAL station, 700, exactly
   where COMBAT-SEQUENCE.md reserved it).
5. If damage lands: `floor(damage / 2)` is subtracted from the mover's REMAINING
   move points. `Unit.movePointsLeft` already exists — the flow interrupts a move
   mid-step, resolves a full attack pipeline, then resumes with less movement.

"Move WITHOUT provoking" (11 corpus uses) is the exemption flag on movement types.

---

## 2026-08-20 — Faith, mana crystals, and supply are usable inside combat

> "We do have resources of faith, mana crystals, and supply that should be capable
> of being used as a cost or as a gain inside combat."

Re-routes two pass-5 findings at once: "charge a campaign resource" is NOT
seam-deferred — costs and gains in the three campaign currencies are battle-tier
vocabulary. And the census's "second resource bar" (8 uses) is most likely these
commander-level resources appearing in power costs, not a new per-unit bar — to be
confirmed when the census regenerates.

---

## 2026-08-20 — Summoning stays in the game; build-now vs defer is open

> "We are going to use summoning. I don't know if it should be cut now for
> simplicity or flushed out so that we're more complete."

The capability is permanent; only the scheduling is open. Engine consequence
regardless of timing: code written for the loadout/roster work must not bake in a
fixed-size unit array — mid-battle unit addition (uid allocation, AI assignment,
activation ordering for a unit that arrived late) becomes possible later without a
migration.

---

## 2026-08-20 — onDodge fires only when Dodge caused the miss, read off the one roll

> "It's literally if your dodge stat caused the miss. If I have a 25 dodge stat and
> you have a 75 accuracy, and you attack, we need that one dice cup to roll. If the
> low numbers are missing, then the lowest numbers that are below the dodge mean
> the dodge caused the miss."

One roll, one cup — never a second dodge roll. The die has a dodge-owned band of
size = the target's effective Dodge, sitting at the deep end of the miss range. A
miss whose roll lands in that band fires onDodge; any other miss does not.

Engine mapping (engine hits on roll ≤ chance, so its miss end is the HIGH numbers):
onDodge fires when the attack missed AND `roll > 100 − dodge`. Her example — 75
accuracy, 25 dodge, final 50: rolls 51–75 miss plain, rolls 76–100 miss by dodge.
Probability of onDodge given a swing = dodge/100 whenever accuracy covers the rest,
which matches "the lowest numbers below the dodge" exactly.

---

## 2026-08-20 — "Copy or steal an effect" does not exist; it is a census bug

Angela: "I actually don't even know what you're talking about for copy, steal, and
effect." She is right — the capability is an artifact. `content/oneoffs.mjs:51`
counts `/gain it yourself|copy|steal/i`, and `steal` substring-matches every
occurrence of "stealth", plus the names "Soul Stealer" and "Life Steal". The 19
uses are stealth vocabulary double-counted. Proposed fix (not applied — review is
read-only): `\bsteal\b` in place of `steal`, then regenerate the census. The
pass-5 "needs design" entry for this capability is withdrawn.

---

## 2026-08-20 — Corrections batch two: the review's edges trimmed

**No stamina regen cap.** "No need for a stamina regen cap." The proposed
`staminaRegenCap` switch is withdrawn before it existed. The Codex ladder's
"hard-caps around 3" is the stale text — Codex-side amendment.

**`passive` is just a modifier.** "It's just a modifier." Confirms the pass-2
routing: the loader writes a `StatMod`, never a trigger. The remaining work is
content-side vocabulary — the function list should stop presenting `passive` as a
trigger hook.

**`onEquip` is legacy and is retired.** "There's no reason for unequip. It is not
doing anything because you start with all your items equipped." Units enter battle
fully equipped, so equip-time IS battle-start: the two corpus uses
(velans-ferryman-coin, vigils-shield) reword to `startOfBattle`. With this, the
design hook list and the engine converge exactly: the engine's nine built hooks
plus `startOfBattle` are the complete set of ten. `onEquip` joins `onEnter`,
`onWounded` and `turnEnd` in the retired list.

**Count-capped targeting is cut.** "Things are either area of effect, and they're
included in that, or it's targeting a unit." No `maxTargets` field. The 15 "up to N
within M" corpus rows reword to an area shape or a single-unit shape — content-side
rewrite, no engine work.

**"Grant Flight" is a legacy error.** "There's no granting flight. Flight is a
movement type triggered by a movement or a power" — a property of the move being
made, carried by the movement action or power itself, never a status hung on a
unit. The 2 corpus uses reword.

**Airwalk is the thing that persists — and it is distinct from Flight.**

> "Airwalk prevents you from triggering anything on the ground during your end of
> turn. And it is a condition that just persists. You might have airwalk for 4
> turns, or you might have airwalk with no turn limits, and then that unit is not
> going to trigger anything at the end of activation for whatever tile they're
> standing on."

So: Flight = per-move property (pathing). Airwalk = persistent condition, optionally
duration-limited, that suppresses the occupied tile's end-of-activation effects.
Engine shape: a condition consulted by the end-of-activation ground step — cheap
once the ground layer exists, and the suppression check belongs in the ladder rung
that fires tile effects, not in the tile.

---

## 2026-08-20 — Both remaining cut candidates are cut; Flight's full movement model

**Cut: prevent damage entirely** (1 use). "We don't need to prevent damage
entirely." Protection-as-a-pool is the only damage-prevention mechanic.

**Cut: pass through occupied hexes** (7 uses). "We sort of don't need to pass
through occupied hexes." The rows likely reword — several are probably flight-type
moves, which cover the need by jumping rather than passing through.

**Flight, the complete model:**

> "When you do a flight movement, you move to the hex that you target. It's a
> one-movement. You don't get to move square by square. You ignore all of the
> terrain effects in between. You ignore impassable terrain. You just need a viable
> square that you fly to. And then your movement is over... You then land on that
> square, which will trigger things at your end of activation. That is how Airwalk
> is different. If you have both, then you also wouldn't land on anything."

Precisely:

1. **Targeted, atomic.** Click the destination hex; the move happens as one jump.
   No square-by-square control, no partial flight.
2. **Everything between is skipped** — terrain effects AND impassability. Only the
   destination must be viable (in range, landable).
3. **The move ends on landing.** Flight consumes the movement.
4. **Landing is real.** The destination tile's end-of-activation effects fire
   normally — flying onto burning ground burns you at end of activation.
5. **Flight + Airwalk compose:** fly there, and land on nothing — the destination
   tile's end-of-activation effects are suppressed too.

Engine shape: a flight move is `moveUnit` straight to the target hex with no path —
no per-Step iteration, no ZoC provoke along the way (there is no "along the way"),
no movement-cost sum; legality is only range + destination viability. The Step
vocabulary does not apply to it: a flight move contains zero Steps. Airwalk stays
where the previous ruling put it — a check in the ground rung — and Flight never
touches that rung for intermediate hexes because it never occupies them.

**Conflict found by `decided.mjs` in the same turn:** `GAME-DESIGN.md` §4 line 373
carries the OLD Flight — per-hex movement at cost 1 per hex, terrain surcharges
ignored, interceptable mid-crossing ("clipped out of the sky"), and AoO against
fliers at an additional −30. Today's ruling replaces that mechanic wholesale:
atomic jump, no per-hex anything, no mid-crossing interception possible, and
landing DOES fire the tile. Fresh over stale — line 373 joins the amendment list.
Two details of the old text die with it unless deliberately kept: the −30 AoO
rider against fliers, and "terrain status never triggers" (superseded by "landing
is real"). The old Airwalk line ("still triggers status on entry, avoids the
end-of-turn effect") also needs rewording to the end-of-activation phrasing.

One question this leaves genuinely open (not decided here): does a flight move
that BEGINS inside an enemy's zone of control provoke, or is flight one of the
non-provoking movement types? The AoO ruling says conventional movement provokes
and some movement types do not; flight is presumably in the second group, but
presumably is not a ruling.

---

## 2026-08-20 — Flight and zones of control

> "You ignore zones of control while you were flying, but if you start a flight
> movement while you were in a zone of control, that will provoke. But only as you
> move out of your first square. Later, as you move through nearby other enemies,
> they will not additionally provoke."

One provoke, maximum, per flight move: at the moment of leaving the starting hex,
if that hex was in a zone of control. The flight path provokes nothing — consistent
with the atomic model, where intermediate hexes are never occupied. GAME-DESIGN §4
already grants Flight −30 against attacks of opportunity; under this ruling that
modifier has exactly one place to apply, the launch provoke.

---

## 2026-08-20 — Five answers: the testing lane, the Codex as source, counters, the AoO refined, DBF clarified

**The testing lane.** "Invent enemies with the right-shaped abilities for each
thing that we're testing. We can also invent other testing abilities for heroes.
Just make sure we mark them as testing and put them in content." Convention: the
id kind is `test` (test.warrior.second-wind). Test rows live in content/ beside
real rows, are excluded from the published-source contract, and never ship.

**The Codex is a published source for content-check** — "yes, before changes,
because you might need to make changes as we go." A row in CODEX.md is a decision
even though the Codex may still change. This unblocks status.burn (79 Codex uses)
and retires most of the INVENTED backlog: mage bolt, the staff, terrain
forest/hills/water and status.poison all resolve to Codex rows.

**Statuses are COUNTERS.** "I personally like poison, burn and all these status
effects being counters. Because they do also count, they tick down. They are an
accumulation of everything that's added into it, and then they tick down."
Resolves the pool-vs-counter vocabulary clash in the engine's favor: counter =
accumulates, ticks, decays (poison, burn, regeneration); pool stays reserved for
spent-when-consumed (protection). 1-EFFECTS-SETTLED's two 'pool' rows are the
stale text and get a CHANGED entry.

**The attack of opportunity, final form.** "The old text: minus 1 damage, we can
remove that. The attacker chooses one of their attacks. They do pay stamina for
it. It could have a cooldown, and if it was on cooldown, they can't use it. They
choose their attack. That attack has a −20 accuracy." So: −1 damage struck; the
provoked unit chooses among its LEGAL attacks — stamina is paid as normal, an
attack on cooldown cannot be chosen (attacks may carry cooldowns) — at −20.

**Deathbed Fighting, clarified.** "It has a calculated percentage total that gets
rolled when you hit zero health." Derived at the moment of the roll — base 20 +
5×Toughness + everything badges and enchants add. So enchant.enduring's
+1 deathbedFighting is simply an input to that calculation, not a write to a
stored stat. The inbox question dissolves: modifiers naming deathbedFighting are
legitimate terms of the formula.

---

## 2026-08-20 — The Burning Zombie, burn, and water

> "You could create a burning zombie and mix them in with the other zombies. We
> could do, on taking damage, the zombie deals 1 burn to its attacker. I think we
> also need to add in terrain, so you figure out what makes sense."

Landed, both through the Iron Gauntlet:

**status.burn** (⛓ SEAL PASSED, 9b9229a) — poison's tick, Resist-mitigated, PLUS
halves all healing (the gate lives inside applyHealing, the one heal mutator — a
dormant second heal path with its own halving math was found and collapsed into a
delegate). Source: **unit.zombie-burning**, same stat line as the zombie, whose
sear (trigger.zombie-burning.sear, onTakingDamage 100%) deals 1 Burn to the
attacker. Mixed one per four via FIRST_BATTLE.enemies — which also deleted a
'zombie' literal hardcoded in core setup that had ignored the declared roster
entirely. Published in 6-BESTIARY-SETTLED. One emergent rule found and stated as
a switch (burnHalvingReadLive): a Burn that expires by decay mid-tick releases
that same phase's Regeneration from halving.

**terrain.water-cleanses** (landed a44a94a, 2 honest exemptions) — water strips as
TRAIT DATA on `wet`: 1 Burn on entry; 1 Burn, 1 Poison, 1 Regeneration at End of
Activation. GD §4 and 1-EFFECTS-SETTLED disagree on the strip list (burn+poison
vs poison+regen); implemented as the union, flagged in the inbox (waterStripList).
This birthed the **End of Activation ladder** (was 0 of 2 rungs): rung 1 terrain
strips → settle; rung 2 reserved as Airwalk's check-point. Runs for blocked units
too — a stunned hero in the river still soaks. The §4 ordering promise holds and
is tested: reach water and Burn is shed BEFORE it ticks that turn.

---

## 2026-08-20 — Water does not strip Regeneration

> "Regeneration is not stripped EOA by water."

Closes the waterStripList question: GAME-DESIGN §4 was exact all along — water
strips 1 Burn on entry, and 1 Burn + 1 Poison at End of Activation. Nothing else.
The 1-EFFECTS-SETTLED prose ("Both are stripped by water") was the stale text and
now carries a CHANGED entry. Landed as fix.water-regen (97229ec): a regenerating
unit standing in the river keeps every point of its healing.

## 2026-08-20 — flagged-landing review: all clear through the showcase batch
Angela, reviewing the withheld seals: **"Every seal I read was reasonable."**
All 20 flagged landings cleared via `tools/review.mjs` (built this session —
the human-verdict half of the flag mechanism). The gate's seal history is
untouched; review records the verdict, it never rewrites the verdict.

## 2026-08-20 — the Beast pen are PLAYER beasts; the Codex is where content changes land
Angela: **"These beasts were meant to be player beasts, but these stat blocks
were not designed by me. So Spirit Snake is supposed to be a hero unit."** And,
on where such changes belong: **"This should be updated inside of the codex,
inside of our source of truth, not hard-coded somewhere."** Rulings applied via
`content/settled.json` hero rulings (a new overlay assemble.mjs applies onto the
ported blocks), regenerated through her pipeline (assemble → build-viewer →
mkcodexmd, PROBLEMS: 0).

**Spirit Snake (dictated block):** Health 4 · Dodge 50 · Move 8 · Accuracy 110 ·
Armor 0 · Resist 2 · Strength 2 · Precision 0 · Magic 0 · Spirit 0 · Stamina 8;
venom applies 3 Poison on hit. **"It has zero item slots. It needs zero item
slots. And there are no weapon slots either."** Fielding: **built but benched** —
hero-side, out of the default party until parties are assembled.

**Green Drake (dictated block):** Health 12 · Armor 2 · Resist 1 · Strength 4 ·
Precision 3 · Magic 0 · Spirit 0 · Accuracy 65; reach 2. Two movement powers:
**Flight** (+0 movement, 1 Stamina) and regular (movement 5, 1 Stamina). Attacks:
**Poison Breath** (precision magic damage, on hit 3 Poison, 2 Stamina) and a
disambiguated bite, **Snap** (strength damage, on hit 1 Poison, 1 Stamina).
Benched with the snake. Flight waits on backlog `movement.flight`.

**Shadow Hound Puppy:** pulled from the horde, benched-provisional, pending her
block.

## 2026-08-20 — the standard battle reads from the Codex: the test cohort
Angela: **"I would like to use heroes that are being tracked in our overall
Codex... we don't want two warriors. We want one of the warriors changed into a
rogue, but we want these to be stored the way heroes should be stored. Let's
create an entire test class of heroes and a test class of enemies, where we're
going to read from the data and it's clearly differentiated text. We're not
hardcoding."** Then: **"Let's just do six heroes, so we'll always have one of
each. Our standard test will run against six heroes, one of each class."**

Her picks (copied into tweakable test clones, originals untouched): Warrior —
**Oathblade I**; Rogue — **Sky Pirate I** (she recalled it "starts with
regeneration"; the data says its special is Cutlass and Plunder — on damage,
bleed — and she said "it's fine"); Ranger — **Dusk Hawk I**; Mage — **Air
Mage**; Priest — **Lucius** ("give me the scantily clad priest, whatever number
he is" — priest-scantily 1); Paladin — **Osric** ("give me the shiny paladin. I
think that's one" — paladin-shiney 1). Weapons: **"Stats first, weapons next."**
Enemies: **"Add a bestiary to the Codex"** — the test zombies seeded it.

Mechanism: settled.json `testCohort` → assemble.mjs clone resolution →
mkenginepack.mjs → engine `generated/pack.ts` (never hand-edited) → loud loader.
Riders travelled with unchanged ids; first retirement taken:
test.ranger.serrated-arrows → the Sky Pirate's published Cutlass bleed.
Old dictated defs are unfielded fixtures until `test.fixture-migration`.

## 2026-08-21 — movement is content, not code
Angela: **"Movement is supposed to be a type of activation. There are different
abilities in movement, like the sidestep, the regular move, or the flight.
Movement is a choice, and that movement choice can have a modifier. It can cost
stamina. It shouldn't be hard-coded. It should be content-driven."** Player side.

Enemy side, her current thinking (stated tentatively): **"I don't know if we
want to follow the same model on the enemy side, since we don't have stamina,
and I think they're just going to have movement. They don't need to have more
than one. I think they're just going to have one type of movement that an enemy
always uses. That still might be a flight movement or not flight movement."**
This supersedes the enemy half of the 2026-08-17 Sidestep ruling ("Every unit
has it, enemies included") — enemies now carry exactly ONE movement power in
their data row, which may or may not be Flight. Flagged to her in-chat the same
day; the hero half (every hero starts with Move and Sidestep) stands.

State of the engine when she ruled (honest audit): the movement BUDGET and
terrain step costs were already data; the move ACTION was not — one built-in
walk per activation, `MOVE_STAMINA_COST = 1` as an engine constant, enemies
exempted by a maxStamina>0 conditional. No sidestep, sprint, or flight existed
in the engine. Backlog: `movement.powers` (the architecture), then
`movement.flight` rides on it.

### Addendum, same day — the Codex chat ruled further while this landed
Merged from content/settled.json (the other session, Angela 2026-08-21), and
they partially supersede the morning entry above:

- **Sidestep has a cooldown**: *"it does break this statement of 'it's always
  available.' No, it's available every other turn."* → `power.sidestep`, free,
  cooldown 1, granted to **Warrior / Mage / Priest / Paladin**.
- **Side Roll** is the split's other half: 1 Stamina, no cooldown, **Rogues
  and Rangers take it instead of Sidestep**. So "every hero starts with Move
  and Sidestep" is now "Move plus the class's half-step".
- **Beasts and Civilians get neither** half-step.
- **Enemies lose Sidestep entirely** — consistent with her ruling here that an
  enemy row carries exactly ONE movement power.
- The **flight ladder** is Codex-published: labored (2 Stam, Move −1),
  standard (1 Stam, +0 — the drake's dictated power), swift (0 Stam, +1,
  granted by item.aegis-of-the-fleet).

Landed accordingly: `movement.powers` (ba09f6a) and `movement.flight`
(a61228f), both flagged for her review. NOTE: settled.json was clobbered from
a stale snapshot by the other session a second time (testCohort, hero rulings,
drake attacks, Drake's Maw erased); restored by merging git HEAD with their
additions — nothing of theirs was lost. The re-stage-before-writing protocol
still stands.

---

## 2026-08-21 — the Shadow Hound Puppy is a hero; so was every beast in the pen

> "Shadow Hound Puppy is supposed to be a hero, not an enemy. All of those
> initial beasts, of which there were only a couple, were meant to be heroes."

Closes the last open side in the Beast pen. The 2026-08-20 ruling ("these beasts
were meant to be player beasts... Spirit Snake is supposed to be a hero unit")
was applied to the snake and the drake by `fix.beast-pen-hero-correction`
(a4822ab); the puppy kept `side: 'enemy'` from its ported block, so the file
carried a comment reading *"the Beast pen are PLAYER beasts"* directly above a
field saying `enemy`. This ruling makes the field agree with the comment.

**Discovered by the gate, not by reading.** `scenario.export` added a check that
a unit fielded on a side must be the side its row declares — it threw when
`showcase.beasts` listed the puppy as a hero, which is what surfaced the
contradiction. Before that check, `makeUnit` read `def.side` and would have
placed it on the enemy side without a word.

**What this does NOT settle: its stat block.** The numbers are still the ported
Codex §10 row, still provisional, still awaiting her dictated block (the snake
and drake precedent). One consequence is immediate and worth stating rather than
papering over:

- The row carries `maxStamina: 0` — an ENEMY property; enemies do not run
  stamina. Its only attack, `attack.fangs.bite`, costs 1 Stamina.
- So as a hero with 0 Stamina, **the puppy can move but can never attack.**
- The snake precedent is the shape of the fix: Angela dictated Stamina 8 for the
  Spirit Snake, and `SWITCHES.md brawlStaminaCost` was answered "the Spirit Snake
  is a hero and pays it."

A stamina figure has NOT been invented here ("copy, don't invent"). The puppy
stays benched, where a hero who cannot attack costs nothing, and the number waits
for her block.

**Codex note.** Unlike the snake and the drake, the puppy has no row in
`content/settled.json` at all — it exists only as a hand-typed def in
`engine/src/content/index.ts`. So this ruling could not be recorded in the Codex
source and applied through the pipeline the way the 2026-08-20 beast rulings
were. That is a content gap, not a preference.

---

## 2026-08-25 — the battle board is 16 × 16

> "we are settling on 16 by 16"

Supersedes both of the numbers that were live, which disagreed with each other
and with the spec:

- the **engine** ran **12 × 12 = 144 hexes**, written in the very first commit
  (`2a6516a`, "baseline: engine, four passes, 83 tests") and never revisited.
  `BASE-MAP-SPEC.md` calls HoMM3's 165 hexes *"far too small for 8 heroes + 3
  civilians + a 40-body tide"* — so the engine was below the size the spec had
  already rejected, and below even its own **tutorial 14 × 10** preset.
- `BASE-MAP-SPEC.md` argued for **24 × 16**, and `VFX/GROUND-REQUIREMENTS.md`
  §85 listed the ladder tutorial 14×10 · skirmish 18×12 · standard 24×16 ·
  siege 30×20.
- `VFX/BATTLE-SCREEN-V1.html` carried `COLS:12, ROWS:12` — the visual reference
  had been conformed **down** to the engine's abbreviated board rather than the
  engine being brought up to the spec, which is why the two looked consistent
  while both were wrong.

**16 × 16 = 256 hexes.** Between the skirmish and standard presets, and square,
which keeps the nine deployment zones the prologue battles use
(`player-edge · mid · far-edge · left · right · left-mid · right-mid ·
behind-player · every-side`) meaningfully distinct — on 12 × 12 `left-mid` and
`mid` were two or three hexes apart and `behind-player` barely existed.

This moves every control-battle hash by construction. That is the point of the
change, not a side effect: `changesBaseline: true`.

**Owed with it:** `BASE-MAP-SPEC.md` still argues 24 × 16 and
`GROUND-REQUIREMENTS.md` still lists the four presets; both now predate this
ruling. The viewer side (`BATTLE-SCREEN-V1.html` `LAYOUT`, `PLAYBACK-DESIGN.md`
§7.2's `1600 × 1188 board px` extent arithmetic) is owned by the battle-playback
thread and must follow — `field-geometry.mts` derives from `hex.ts`, so the
engine half propagates on its own.

---

## 2026-08-26 — civilians act; they are not statues

> "Orphans, lumberjack and wife and farmer, as ordinary heroes, and they don't
> do anything. That doesn't make any sense now. We have a plan for a number of
> initial civilians, and they do things. They're just like the other heroes."

Corrects the reading I had taken from the G2 note ("civilians are ordinary hero
definitions — identical stats"). The identical-definition half stands; the
do-nothing half was my invention and is dead. Civilians field as ordinary
heroes WITH their Codex behaviour — stats, actions, AI like any hero. The
`content.civilians` backlog row is respecified accordingly; their rows come
from the Codex civilian class, not from a stripped-down stub.

---

## 2026-08-26 — the prologue party comes from the Eve-of-Ruin 24

> "pick a ranger of the 24 Eve, then a warrior and a preist, all from 24 eve"

Battle 1 fields the ranger; battle 2 fields all three. The specific picks were
delegated ("pick") and constrained to the Eve-of-Ruin campaign roster; taken
first-of-class at tier 0: Hunter (hero.base.ranger-aggressive), Iron Dwarf
(hero.base.warrior-iron), Battle Chaplain (hero.base.priest-armored). The
picks are mine under his constraint and are cheap to swap; the constraint is
his and is not.

---

## 2026-08-26 — statuses resolve at the end of each unit's ACTIVATION, not the phase

> "In watching a replay, I have noticed that the end of the total phase is when
> status damage is being applied, and it is supposed to be at the end of an
> activation. What I see in one of these battle maps is a bunch of zombies
> walking onto fiery terrain. I can see in the visual playback the application
> of the burn. Then the enemy phase continues, and at the end of the enemy
> phase, I'm seeing all the burn get applied to the zombies one at a time at
> the end of the total phase (not at the end of their individual activation).
> Statuses are supposed to resolve at the end of each unit's activation. This
> means: end turn effects, healing effects, status damage, lowering of status,
> application of immunity, things that are supposed to wear off by a time
> clock. This is important because a unit can die at the end of its activation.
> Also, Surge skips all of the other end-of-turn effects, healing effects, and
> status effects. Surge is tested first because if you get a Surge, you get to
> do more things, but you don't take damage from status twice."

Supersedes the End-of-Phase ladder's rung 3 ("Hero statuses tick — poison,
burn, regeneration... at End of Phase"), which was the design as written in
COMBAT-SEQUENCE.md — the engine implemented the document faithfully and the
document was wrong. The status tick (damage, healing/regeneration, decay,
expiry) is a rung of the END OF ACTIVATION ladder, per unit, after the terrain
strips/applies. Consequences: a unit can die at the end of its own activation
(settle runs there); the water promise ("reach water and Burn is shed BEFORE
it ticks") now holds per-activation; the Surge ordering already ruled on
2026-08-21 (surge check BEFORE the EoA ladder, ladder runs ONCE) is re-affirmed
— a surged unit never ticks twice. Each unit still ticks exactly once per Turn;
the timing moves, not the frequency. Bleed-out is NOT a status and stays at
End of Hero Phase per the 2026-08-15 ruling.

---

## 2026-08-26 — the range penalty starts at the FOURTH tile

> "no ranged penalty up to 3 tiles away, and the range penalty starts at the
> 4th tile. On the 4th tile, you get -5 accuracy. On the 5th tile, you get
> -10. On the 6th tile, you get -15."

Supersedes the original RANGE station rule (−5 per hex past the FIRST). The
formula is −5 × (distance − 3), floor at distance 4 — so 2 and 3 tiles are
free, 4 is −5, 5 is −10, 6 is −15, and so on linearly. Unchanged by this
ruling: ranged cannot target an adjacent enemy at all (legality, 2026-08-15),
and the −20 for firing while YOU are adjacent to an enemy is its own station.

---

## 2026-08-26 — civilians are EXACTLY like heroes (stamina included)

> "This is not true. Civilians are exactly like heroes."

Corrects my converter's reading in the same session: I had treated the
civilian rows' `staminaMax: 0` as "civilians opt out of the hero throttle
like enemies" and zeroed their attack costs. Wrong. Civilians run stamina like
any hero; the 0 in their derived rows is stale derivation, not design. Applied
as the documented level-1 hero baseline (COMBAT-DESIGN.md:461 — "Level-1 hero:
Max 5, Regen 1") — copied, not invented — and their attacks cost what their
rows author (the Farmer PAYS 1 for the pitchfork jab).

---

## 2026-08-27 — the Alpha Team lands; switch to using these heroes

> "The Alpha Team is landed (S31) — six heroes in settled.json alphaTeam,
> exported into the engine pack as its own alphaTeam section: … Same stat
> bodies as the test cohort (copied programmatically), test statuses translated
> (ward→protection, hobble→slow, enfeeble→weak), movement powers derived from
> class, and Punch arrives via the universalToAllUnits flag — the first
> converter pass to honor it. Arcane Bolt is gone; the mage's power is the
> staff's. Nine honest gaps where the engine can't yet express the rows: the
> Halberd's push, Cleave landing single-target, four crit fields, and the three
> item powers (Storm, Heal, Block — AbilityDef can only speak bolt-shaped
> blasts). … I want to switch to using these heroes, so let's use the Iron
> Gauntlet skill and update to read these heroes from where they should be, and
> then we need to close the gap on what's missing."

The full kit table (class, kit, attacks, riders per hero) is in the content
repo, S31. Engine consequence: the pack loader reads the `alphaTeam` section
and the `alpha-` id family joins test- / unit.* / hero.* as a declared family.
NOTE recorded with the landing: S31's "copied programmatically" stat bodies
did NOT travel — settled.json carried `ported: {}` / `derivedBase: {}` with
the true source only in `copyOf`; fixed in the converter (content 0b20516) by
resolving copyOf through the Codex. Compilation, not invention.

"Switch to using these heroes" is sequenced: (A) they enter and verify
(content.alpha-team), (B) the gaps close as engine capabilities, (C) the
default cohort flips to the alpha six — a changesBaseline item, taken last so
half-expressed kits are never baked into every control baseline.

---

## 2026-08-27 — the Critical Injury Chart, complete specification

> "Critical Injury Chart — complete specification and landing instructions
> (rulings of 2026-08-20 through 2026-08-27; COMBAT-DESIGN.md to-hit/crit
> section is the authority)
> A crit resolves in two rolls, each from its own named stream per Law 4 —
> propose cup.crit-branch and cup.crit-effect. The attack's normal damage
> always lands first. Then the branch flip: on heads, an additional +50%
> damage applied before Armor, Resist, and Protection; on tails, roll evenly
> among the ten injuries below — normal damage still lands, plus the effect.
> The intent is literally a coin and a d10. One chart for all damage types,
> fully symmetric: enemies crit heroes and heroes crit enemies, and everything
> can be crippled. Every chart effect is battle-only and clears when the fight
> ends — permanence belongs exclusively to the Deathbed pipeline, and the
> chart never produces an injury.* badge; that connection deliberately does
> not exist. The entry-point function name is fixed in GLOSSARY.md as
> rollCritEffect.
> How to act on it: the chart is ruled data, not a content kind (decided
> 2026-08-27) — it lands as a plain critChart block in content/settled.json
> alongside testCohort/alphaTeam, is exported through mkenginepack.mjs into
> the generated pack, and the engine folds it from there like everything else.
> No chart.* ids, no registry, no §8 row. Each row carries a small stable key
> so event-log lines can name their cause (Law 12) — keys, not content ids.
> Engine work goes through the Iron Gauntlet as usual. Two known gaps to name
> rather than solve inline: Knocked Sprawling's push is forced movement, the
> same gap the Halberd's Hack sits in — drop the push with a named gap and
> land the rest of the row if forced movement isn't built yet; and item.bracer
> (multiplies chart rolls) needs a with/without-replacement rule before it can
> land — not part of this pass. Stat losses floor where the row says 'minimum
> 0'; nothing else floors.
>
> blinded / Blinded / −4 Vision, −30 Accuracy
> leg-crippled / Leg Crippled / −3 Movement
> arm-crippled / Arm Crippled / −2 Strength, −2 Precision
> bleeding / Bleeding / gain 5 Bleed
> dazed / Dazed / loses access to class powers, 3 turns
> stunned / Stunned / gain 1 Stun and 3 Weak
> knocked-sprawling / Knocked Sprawling / pushed 1 hex, gain 2 Slow, −50 Surge
> winded / Winded / lose 4 Stamina, to a minimum of 0
> guard-broken / Guard Broken / −2 Armor, −1 Resist, −10 Dodge, all to a minimum of 0
> nerve-struck / Nerve Struck / −2 Max Health
>
> We want to implement crits. Use the Iron Gauntlet. Here's the crit chart."

Landing note (this session): forced movement IS built as of today
(capability.knockback, ef7e2b1) — Knocked Sprawling's push therefore LANDS
rather than gapping. The −4 Vision half of Blinded (no vision model — gap
L-3a) and the −50 Surge half of Knocked Sprawling (no surge quantity in the
engine yet) are the named gaps of this pass, alongside item.bracer which is
explicitly out of scope. "Nothing else floors" is read literally: Nerve
Struck's −2 Max Health does not floor, and a unit whose Max Health reaches 0
dies of it — kept sweepable as the critMaxHealthFloor switch.

---

## 2026-08-27 — the crit branch is 50/50, every row reachable, and criticals stack

> "It doesn't need to literally be a coin. Let's hold off on the 25, 50,
> 50/50. That is a different concept. I don't understand. We don't want a die
> 10. We want all the things that are there, wounded and bleeding, to be
> capable of being rolled. That's some kind of dice constraint. We want all of
> the things being rolled and all of the effects to have an even chance. It
> should be a 50% chance of just a damage boost and a 50% chance of one of the
> effects. And you probably didn't realize this, but there is also an ability
> to have more than one critical happen at once. There are some powers and
> things that basically say, 'Do two criticals' or 'Do three criticals,' so
> you need to account for that as well."

Read as three rulings:

1. **The branch flip is 50/50 for everyone.** The 2026-08-22 per-side split
   (75/25 vs heroes) is HELD OFF — "that is a different concept" — not
   overturned as a concept; both share switches stay sweepable and now default
   50. The critChartSplit entry in SWITCHES.md records this supersession.
2. **Every chart row must be genuinely capable of being rolled, evenly.** The
   even d-N over the rows was already the code; what made Winded and Bleeding
   unreachable was the dice-universe constraint — the crit-effect draw was
   keyed (attacker uid, attack ordinal) only, and the 25-replicate panel
   reuses those pairs, so a fixed hash excluded rows across the whole panel.
   The roll now also carries the TARGET's uid: a more structural key (this
   attacker's Nth critical against THIS victim), a wider universe, every row
   reachable in play.
3. **Multiple criticals at once are real** — "do two criticals" / "do three
   criticals". Each critical flips its own branch and rolls its own effect:
   heads stack as +50% each before mitigation; tails each roll a row
   (independently — with replacement, the multiCritReplacement switch, which
   is also item.bracer's open question). The engine capability is a crit
   count; the Codex powers that grant one land when their rows are authored.

---

## 2026-08-27 — status damage carries a damage type

> "Status damage from poison and burn is magic damage. It should be blue. It
> gets reduced by resist. Bleed damage is true damage. Thorns damage that is
> dealt is true damage."

Poison and burn ticks are MAGIC damage — resist reduces them, and the viewer
paints them blue like any magic damage. Bleed's tick is TRUE damage — nothing
reduces it. Thorns (retaliation damage a struck unit deals back) is TRUE
damage. The tick's type is a STATUS ROW field, not a hardcoded name list.

---

## 2026-09-02 — the control battles field the Alpha Team (step one)

Context: the 2026-09-02 engine review found the standard battles — the eight
control baselines every balance number comes from — still fielding the
`test-*` cohort (Codex clones with test-lane weapons and riders) while the
real Alpha Team sat loaded and unused. Andrew's goal, in his words:

> "The goal here is to use the engine to do balance testing, but also to
> build features and test… We're not testing features if we're not pulling
> them from the right way. When you hardcode something, it sort of tests the
> features, but it doesn't really test it all the way."

Three steps were proposed: (1) point the main battles at real content — flip
the standard battles to the Alpha Team; (2) statuses and moves through the
pack; (3) a `content/test/` delta receptacle for probe content. Ruled:

> "Yes, proceed with step one."

Engine consequence: `FIRST_BATTLE.heroes` becomes the six `alpha-*` ids. This
is sequence step (C) of the 2026-08-27 Alpha Team ruling ("the default cohort
flips to the alpha six — a changesBaseline item, taken last"). It keeps the
2026-08-20 ruling intact — "Our standard test will run against six heroes,
one of each class" — the Alpha Team IS six heroes, one of each class, and the
test cohort were clones of exactly these six. The enemy side of the standard
battle (three test-zombies and a burning one) is NOT flipped by this ruling;
it is the next question, not this one. Steps two and three stay open.

---

## 2026-09-02 — step two: the Codex owns the status rows; Dazed is two things

Asked, in plain English, before any step-two code: *"Step 2 makes the engine
read its 15 status rows from the Codex instead of its own hand-typed list. But
the rulebook file (tools/approved-kinds.json) currently says statuses BELONG TO
THE ENGINE… May I change that line so the RULE is: the Codex owns the status
rows (the words and numbers), the engine owns only the behaviour code that
reads them?"*

> "Yes — Codex owns the rows"

Consequence: `tools/approved-kinds.json` `status` moves from family `engine`
to family `content`, note "rows are content; behaviour is engine". A status
edit in the Codex reaches every battle through the pack, the way heroes and
attacks already do. `engine/src/content/statuses.ts` keeps only the `test.*`
rows and the hook code.

Asked: *"'Dazed' has two different meanings, both in your words. Your crit
chart (Aug 27) says: 'dazed — loses access to class powers, 3 turns.' The
Codex status row (Sep 1) says: 'Takes the unit out of its owner's control and
hands it to the AI.' … Which is Dazed?"*

> "This is a problem with just ambiguity. It does two different things: there
> is a critical effect, and then there is a status effect. Do we need to
> disambiguate this right now, or can you account for that?"

Accounted for without a ruling — two ids. `status.dazed` keeps the Codex
meaning (control handed to the AI; in the simulator every unit is AI-driven
already, so the engine carries it as a recorded status with no behaviour of
its own). The chart's Dazed row applies a SEPARATE status for "loses access to
class powers, 3 turns" — placeholder id `status.powers-locked`, a plain
descriptive name chosen so nothing is invented; it is renameable in one place
(the Codex row and the chart compile) whenever Andrew names it. The chart row
itself keeps its dictated key, name and text.

---

## 2026-09-02 — structure first; features wait

Asked whether the six unbuilt Codex statuses should be built now, and what to
call the chart's powers-lock status:

> "You can leave 'dazed loses access to class powers' as just a note. We don't
> need to do that right now. In regards to question one, I really want all the
> structure, everything to be correct. We don't need all of the features built.
> How much are you working on all the individual features right now? We're not
> testing them, so I don't think they're actually working. I thought you were
> just working on the structure and the architecture, and where we're pulling
> from content and pulling from items."

Consequence: `status.powers-locked` stays a placeholder with a note, no rename
asked for. The six statuses (Karma, Taunt, Confusion, Root, Frost, Shadow),
Pray, Charging Run and the four dead attacks stay NAMED GAPS. Engine work is
structure only until told otherwise: where content is read from, the test
receptacle, the enemy side of the standard battle, items per unit. A Codex row
the engine cannot behave for is listed as a gap, never built to make it fit
(fix.bleed-magnitude, landed the same day, was the wrong call by this
standard and is recorded as such in the ledger).

---

## 2026-09-02 — three answers after the standard battle went authored

**The test horde.** Asked: *"The standard test battle is now real heroes vs
the Codex's real Zombies, and it's a walkover: four zombies fall in under
three turns, 100 times out of 100, and a hero almost never goes down… What
should the standard test horde be?"*

> "Keep the zombies"

Consequence: `FIRST_BATTLE.enemies` stays the authored Zombie ×3 + Burning
Zombie, one per four. Tests that need pressure field twelve to sixteen and say
so. The walkover is a finding about the game, recorded, not a knob turned.

**The enemy special moves.** Asked whether to approve the `move.*` id kind
(Charge, Close Bite, Clobber — eight rows the engine cannot run):

> "I don't exactly know what you mean by 'move star.' Yes, I do want to have
> these special moves: charge, close, bite, clobber, that start with moves."

Consequence: `move` is an approved content kind in
`tools/approved-kinds.json` — an enemy's special move. The NAME is settled;
the mechanism is feature work and stays a named gap until asked for.

**The beasts.** Asked when the Spirit Snake, Shadow Hound Puppy and Green
Drake — the last hand-typed units in the engine — get their Codex rows:

> "Later — leave them for now"

Consequence: they stay in `src/content/index.ts`, marked as waiting on their
rows (`content.beasts`, not scheduled).

---

## 2026-09-03 — the feature run: four answers before an unattended batch

Angela, at the start of an eleven-hour Iron Gauntlet run ("I want to work
through without pausing to ask questions. I want to work through all of the
combat backlog. If something can't be gotten to work, it can be skipped for
now. Try three attempts to get something to work"). Each was put as a yes/no
with a recommended default; the answer is the option she chose, quoted as
offered.

**Structure only, superseded.** Asked whether today's run supersedes the
2026-09-02 ruling *"we don't need all of the features built"* and opens the
deliberately-unbuilt list (six statuses, Pray, Charging Run, charges and
activated items, the `move.*` mechanism, stat-less attacks, Vision, Surge):

> "Yes — build them all"

Consequence: the do-not-build list in `HANDOFF-2026-09-03.md` §6 is open. The
2026-09-02 entry above stands as a record of what was true then.

**P11, the encounter format.** Asked whether it is approved as written in
`ENCOUNTERS-ENGINE-HANDOFF.md` §1 (id · map or ordered map list · requirements
· standing · setup · phase-keyed schedule · salvation · win/loss · civilians):

> "Approved as written"

Consequence: `encounter.runner` is unblocked; `questions.md`'s P11 entry moves
to ANSWERED. The 24 authored encounters are the run's test bed.

**New kinds, by policy.** Asked how to handle prefixes no existing kind covers
(auras, corpses, ground layers, cooldowns) when nobody can be asked mid-run:

> "Propose and record"

Consequence: this session proposes ids per `GLOSSARY.md` conventions and
records them in `tools/approved-kinds.json` with the note *approved by policy,
Angela 2026-09-03*. Each is listed in the run's handoff for a look afterwards.

**The hero states.** Asked whether `progression/PROGRESSION-SCHEDULE.json`'s
roster at all twenty battle indices is the party, matched to each encounter's
campaign position:

> "Yes, all twenty by position"

Consequence: a loader turns a battle index's fielded roster into `heroItems`
for `createBattle`; encounters run against the roster at their position.

## 2026-09-03 — the feature run, second set: fourteen questions, Angela verbatim

Put after reading `ENCOUNTERS-ENGINE-HANDOFF.md` §4–6, `MECHANICS-GAP.md` §6/§9,
`content/gen/encounters.json` and `progression/PROGRESSION-SCHEDULE.json`. Her
answer in full, then the consequence per question. Unmentioned questions take
the default that was offered (noted).

> "I would rather we are actually assembling the units so that we know that the
> way that we're getting things into the units is still correct. I know that's
> maybe outside of the mandate of the engine. I guess we could just use the
> revised stat block, but it has to also have the abilities in it. Enemies spawn
> first. Then heroes spawn and heroes act. Let's skip the dungeon. Let's skip
> salvation. We can skip retreat. We should include the deathbed roll. And then
> we don't need to include stabilization. If the bleed-out turns past, then
> we'll count the hero as dead. Otherwise, they're counted as wounded. The base
> visibility that should be revealed from darkness is 6, so it's basically
> everyone has a vision of 6, even though the stat is 0. So versus fog, it
> would be a 3. Taunt makes the hero target that unit. It can keep its same AI,
> like melee or ranged. 12. Yes, Lycanthropy begins. The Werewolf badge: the
> Lord Werewolf's aura buffs an afflicted hero. Yes. Yeah, we'll need all those
> AI modes. Oh yeah, we don't have badges incorporated in Heroes, so we're going
> to skip badges for this one. I guess some of the enemies have badges. We need
> to use those."

Then, as two yes/no follow-ups (answer is the option chosen):

- The corpus — *"Read the NOTES file, ship the 8 authored rows"*: a one-time
  exception to the never-another-session's-NOTES rule. The eight encounter-session
  rows go into `content/gen/encounters.json` with provenance; the ten dictated
  set-pieces (phases only) do not.
- Assembly — *"Derive, compare, report"*: heroes are built through `fieldedDef()`
  from level + specialty + items + powers; the schedule's stat block is the
  oracle; a mismatch is a finding, never a patch.

Consequences, by question:

1. Corpus — the eight authored rows ship; run against 6 + 8 = 14.
2. Hero kit — enchant rows (`content.enchant-rows`) and hero powers land before
   the loader, so a hero fields with abilities. Her words: *"it has to also have
   the abilities in it."*
3. Assembly — derive through `fieldedDef()`, compare to the schedule, report.
4. Spawn timing — *"Enemies spawn first. Then heroes spawn and heroes act."*
   A phase's arrivals resolve before the hero phase. Not a switch; ruled.
5. Two units on one hex — default: shunt to the nearest free hex by the Law 6
   tiebreaker, with an event naming the displacement. (Unmentioned.)
6. Dungeon — skipped. `map` as an ordered list is refused at load with a
   named gap.
7. Salvation — skipped; the field is read and ignored, recorded as a gap.
8. Retreat — skipped; `retreat: true` rows run without it.
9. Consequence stack — the Deathbed roll is built; stabilisation is not. A hero
   whose bleed-out runs out is dead; a downed hero still bleeding at battle end
   is wounded. `lifeState` gains nothing; `stabilized` is not added.
10. Vision — effective Vision is 6 + stat (0) + modifiers; in fog it is 3, i.e.
    the halving applies to the base. Whether bonuses halve too stays a switch
    (`(6+bonus)÷2` default vs `3+bonus`). Targeting what you cannot see: default
    no, as a switch. (Unmentioned.)
11. Taunt — the hero targets the taunter and keeps its own AI mode. Not a
    control transfer; a forced target.
12. Lycanthropy — the badge grants the `werewolf` type; the Lord Werewolf's aura
    buffs the afflicted hero. Intended.
13. AI modes — all six (defender, support, focused fire, value hunter, follow,
    hunter).
14. Badges — no hero badges this run. Enemy badges on authored rows are used;
    that means the badge type exists, applied at fielding for enemies only.

## 2026-09-03 — the downed, confirmed after the run

Angela reviewed `fix.downed-targetable` (canAttack accepts a downed target;
+20 at the CONDITION station; a hit deals no damage, cannot crit, and moves
the bleed-out counter one step, never below 1; the AI takes a downed target
only when nothing standing is in reach — `aiAttacksDowned`, default
`whenNoStanding`). She first read it as wrong ("a player unit that is down is
inert and cannot be targeted"), was shown COMBAT-DESIGN.md line 871
("Enemies roll at +20 against downed heroes — but a hit only accelerates the
bleed-out counter. It never kills"), and ruled:

> "Actually, that's all pretty reasonable. If it has no other target, it
> attacks and costs a turn. That's reasonable. We can leave that as it is."

Consequence: the landing stands as built; `aiAttacksDowned` keeps its default
(the downed are a finisher's target only when nothing stands in reach) and
stays sweepable; COMBAT-DESIGN §13 is confirmed, not amended.

## 2026-09-03 — the retroactive questions, answered

Asked after the run for the assumptions made under "don't pause to ask".
Angela, verbatim:

> "Battle ends when there are no enemies remaining, so victory can be
> achieved early."

Consequence: `boardClearWaitsForSchedule` defaults to **off**. A cleared
board is a win whatever the schedule still owes. The switch stays for sweeps.

> "3. Correct. Frost is added first because it adds to the damage total."

Consequence: `frostBeforeProtection` stays on; the reason is recorded.

> "5 is reasonable. It's also one of the reasons for warm-up. It's very
> common that the first turn doesn't have action, so it kind of becomes a
> free use if you've got a battle of long power, but if you add a warm-up 3,
> now you have to make a decision while you're actually engaged. That's just
> one of the reasons for warm-up."

Consequence: the opening-stance rule stands; warmup is the designer's lever.

> "Frost Ground is supposed to behave like Burning Ground. When you step on
> it, you gain a frost, and if you're there at the end of the turn, you gain
> a frost. The same as all of the statuses that are on the ground are
> supposed to be the same: weak, burning, frost, and poison. They all do the
> same thing: when you step on them, you gain one, and if you're there at the
> end of activation, you gain one. The rationale is that walking across it
> gives you one, but you also don't want to hang out on it. You have to keep
> moving."

Consequence: ONE shape for every ground status — +1 on entry, +1 at End of
Activation. Frost ground gains its entry beat; poisoned ground becomes
1 Poison / 1 Poison (it was 2 Poison + 1 Weak at End of Activation from the
Creeping Blight row — `5-GROUND-SETTLED.md` `terrain.poisoned` is superseded
by this ruling and the content chat should bring the row current); a `weak`
ground layer joins burning, frost, poisoned and darkness (a new INSTANCE of
the approved `layer` kind — `layer.weak`).

> "Not quite sure what you mean by 'nine surrounded heroes.' 'You are
> surrounded' is flavor text for why you can't retreat."

Consequence: no deployment zone is implied by the name; the row stays as it
is. The civilians dying on every seed is a finding about the row, not a bug.

> "The reason Prologue 1 reads Heroes 1 is some kind of error, but the idea
> in the actual game is that when you're in Prologue 1, you have one hero.
> That's kind of irrelevant from your standpoint. That's just what should be
> being fed in an actual game."

Consequence: the runner keeps reading `heroes: N` as a deployment zone only;
the count is the kingdom's to feed.

> "We do need to unify on battle or encounter, or it'll create problems
> later."

Consequence: unified on **`encounter.*`** — the GLOSSARY's word
(`encounter.bandits.raid` is its own example). The six `battle.*` rows are
renamed (`encounter.prologue-1` … `-5`, `encounter.horrors-of-the-night`);
`battle` leaves `tools/approved-kinds.json`.

> "A player unit that would go down but makes their deathbed standing roll is
> supposed to gain the Wounded badge. The wounded badge should already be
> there. Gives a number of penalties."

Consequence: the in-battle wound level IS the Wounded badge's penalties
applied in the battle (COMBAT-DESIGN §13's numbers). The badge itself is
minted by the kingdom from the `deathbed.stood` line — badges are not an
engine type yet. When they are, the wound level should be read off the badge.

> "for number 16, I don't know how you're assigning order. It's fine to keep
> the order in this case. This is a change for later."

Consequence: a taunted hero acts in normal activation order for now;
"activates first" is deferred.

> "There is something similar to the ghoul corpse eat because it removes a
> corpse and then does something. The shade, which is animating a corpse,
> also destroys the corpse. At least it should."

Consequence: `corpse.eat`, `corpse.raise` and `corpse.consume` are one family
— remove a corpse, then do something. Embody (the Shade, an owed row) joins
it and must remove the corpse it animates.

## 2026-09-03 — after watching Supper seed 5 in the viewer

Angela, verbatim:

> "It's supposed to be: if you make a regular move action and you move out
> of a ZOC, it triggers it, so if you just run away, they get an AOE."

Checked against the export: that is the rule the engine runs — every hero
move that BEGAN adjacent to a standing enemy provoked (t3 the Emberwright
from Ghoul 6; t7 the Chaplain from two zombies; t8 from four), every move
that began clear provoked nothing, and the Hunter's side-roll (a sidestep,
never provokes, ruled 2026-08-17) did not. What she saw was the viewer,
which does not yet fold arrivals, shunts or corpses (EVENTS-FOR-THE-VIEWER
§1–3) and so draws some units where they no longer are. No engine change.

> "Also, in this battle specifically, the civilians should have a flight
> mindset for the first three turns."

Consequence: an AI mode `flee` (move to the reachable hex farthest from the
nearest enemy; never attack) and an encounter field `civilianAi: {mode,
untilTurn}` that overrides every civilian's mode until that Turn ends —
Supper carries `{mode: 'flee', untilTurn: 3}`. After Turn 3 they fight as
their rows say.

## 2026-09-03 — board formats (planning; nothing built yet)

Angela, verbatim:

> "We're going to be switching the player start zone to the left of the map
> and the enemy's typical start zone to the right of the map, but that is
> content authoring. ... Heroes start on the left, and enemies start on the
> right. That is the default configuration. I will update that in content.
> Now I want to be able to have different map dimensions, so a map that is 8
> high and 16 wide for a dungeon segment. 16x16 is a standard engagement.
> 24/24 is like a horde engagement." · "I guess we also want to be able to
> support 8x8, like a dueling format." · "We can do a per-width formula."
> · "Every encounter needs to have its map size specified and then needs to
> have its placement according to the map structure."

Consequences: board size is the map's, not a constant — four formats
(8×8 duel, 16×8 dungeon segment, 16×16 standard, 24×24 horde); the default
orientation is heroes WEST, enemies EAST (content moves the existing rows);
hex ids stay `row × width + col` (per-width — a hex's number is meaningful
only on its own board); every encounter names its map size and places to it.
The plan is in the chat of 2026-09-03 evening and in HANDOFF-2026-09-03b.md §7
once work starts.

## 2026-09-03 (late) — the Proving, ruled from PROVING-PLAN.md §8

Angela, verbatim:

> "Proving sounds good. Flip rate first. Well, I want to do several different
> baselines. I also want to be able to do enemies against enemies and heroes
> against heroes. So we can actually test four zombies against four zombies,
> and what we're testing is: what does initiative matter? And then we can swap
> in one elf in place of a zombie. I'd like to be able to test. We don't need
> to mix heroes and enemies, but it would be slightly convenient if we could.
> Gives us better control groups. I guess maybe we can't because of power and
> magic and faith. When you ask me for levels, I actually want to build a test
> plan that covers lots of different things. I'm worried you're going to make
> rulings here of 'Oh, we're only doing this.' I don't just want to do level 1,
> level 5, level 10. Item fit is going to be a little bit tricky. Only classes
> that can wield it. There's no reason to test on something that can't. I want
> to be able to view these battles, but I also want some dashboards showing me
> a power ranking. I want every single unit to have a power ranking. I want to
> give every item a power ranking. These will change as the AIs get smarter and
> if we test things in more of the right conditions, but it's still just right
> out of the blue that it is going to do something. Summons shouldn't be in
> because they are a product of what summoned them. Civilians and beasts are
> in. But we cannot do Beast for now. I don't know what you mean by seeds. We
> actually don't need a ton of seeds to determine something. We can literally
> run 5 of something, and we'll know how it stands. If we have an even battle
> and we switch in a unit and we run it 5 times, that tells us what's going to
> happen. We do also need some map rotations. Because the power rankings will
> be a little bit different based on terrain, not a huge difference, I would
> say that we run one seed five times on five different maps: one time on a
> map, another time on a map, another time on a map, another time on a map,
> another time on a map. There are five maps, there are five runs, and that's
> one seed. I think that gives us one power ranking for a unit. I don't think
> we need more than that. This lets us do more."

Consequences, as read by the engine session:

- **`proving` is a kind** (by policy — propose and record; `tools/approved-kinds.json`).
- **Flip rate is the power score.** Margin and tempo are reported beside it.
- **A subject's ranking is five paired battles: one RNG seed, five 16×8 maps.**
  Flip rate is therefore in fifths. The plan file may name more, but the
  default is five. Seats are a plan option, not a default sweep.
- **Baselines are plural and are content** — a plan file names its squads;
  the rig never hardcodes one.
- **Mirror matches** (four zombies vs four zombies, heroes vs heroes) are in
  scope. Today `createBattle` refuses a row fielded on the other side
  (`setup.ts checkSides`); the rig needs a fielding option that overrides the
  row's side. Angela's own caveat stands and becomes a switch: the side-keyed
  rules (stamina and surge are hero-only, the power pool and arrival power are
  enemy-side, deathbed stands differ) make a mirror match approximately fair,
  not exactly. Record which rules a side-overridden unit follows in
  `SWITCHES.md` before the first mirror plan runs.
- **Levels: no v1 restriction.** The plans cover "lots of different things";
  `grow` takes any `HeroProgress`, and the plan files decide which.
- **Items are rated only on classes that can wield them.** Mis-fits are not
  run and not listed as invalid — they are simply not subjects.
- **Summons are out. Civilians are in. Beasts are in but not yet.**
- **Both views:** the ranking dashboards (every unit, every item) and a way to
  open any pair in the Battle Viewer.
- Still open from §8: **Q6** (enemies equippable at fielding — the flaming-axe
  dwarf) and **Q8** (where the page lives).

## 2026-09-03 (late) — the Proving's last two questions

Angela, verbatim:

> "Enemies are not equipable at fielding. Why are we trying to power rank that?
> Has nothing to do with ultimate game balance. Yeah, let's create a proving
> HTML at the root beside the game builder."

Closed: no `enemyItems`; the item ladder is hero-side only — the "dwarf with a
flaming axe" was a hero (the Eve warriors are dwarfs), misread by the engine
session as an enemy. The ranking page is `PROVING.html` at the project root,
generated by an engine tool the way `GAME-BUILDER.html` is. PROVING-PLAN.md §8
is empty.

## 2026-09-04 — the group-A review pass, and five rulings that came out of it

Angela reviewed the 24 flagged landings whose tests changed. Four cleared. The rest
produced rulings that are larger than the items that prompted them.

### Beasts are a hero class

> "Beasts are a classification of heroes. They are another class type."

And on `fix.shadow-hound-hero-side`:

> "I don't know that there should be an individual rule for Shadowhelm Puppy when
> it's a beast."

Closed: there is no per-creature correction. `fix.beast-pen-hero-correction` and
`fix.shadow-hound-hero-side` are one thing — a class, not two patches. Both stay
unreviewed until beasts are a class type rather than a list of side-flips.

### Movement is one of two activations

> "Movement powers and attacks are all different types of activations. The main
> characteristic difference between movement and everything else is that you
> basically get two activations: one falls into the movement category, and then
> there's one that falls into the other category."

**Vocabulary collision, unresolved — needs Angela.** `GLOSSARY.md` and root
`CLAUDE.md` define **Activation** as *"the totality of one unit's doing of things —
movement, then primary action"*, i.e. ONE activation containing both. Her words say
**two** activations, one per category. The mechanism she describes matches what is
built; only the word disagrees. Either the glossary changes or a second word is
minted. Do not paper over it.

### The Alpha Team is not content

> "We should not be using this content, alpha team. It was a one-off creation of the
> engine. We need to be doing things in a different way."

Closed: `content.alpha-team` and `content.alpha-flip` are **rejected**, not approved.
Consequences to work out, not assumed: the standard battle (`FIRST_BATTLE`,
`baseline.6v4`) fields the six alpha heroes today, `STATE.md` records ALPHA TEAM as
landed content (S31), and the control-battle baselines hash that roster.

### Knockback is not capped at one

> "We want to be able to have knockback that is greater than one."

Closed: `capability.knockback` landed with distance capped at the triggering value.
`STATE.md` lists "knockback 2" as unbuilt by choice — that choice is reversed.

### Uses, cooldown, warmup and cost are limits on ANY ability

> "Some things are just activated and don't have a cooldown or a warm-up, but
> cooldown, warm-up, and uses are all limitations on uses of any ability. And they
> should be able to relate to any type of ability, be it a movement, be it an
> attack, be it a power, be it an ability given by an item. All of these can have
> uses, cooldown, warmup, and costs, like stamina."

Closed: this is a generalization, not a fix. `capability.charges` built uses for
items and `capability.enemy-action-cooldown` built cooldown/warmup for enemy
actions. The ruling is that **one set of limitation fields belongs on every ability
kind** — movement, attack, power, item-granted — alongside stamina cost.

### A hero fields the items ASSIGNED to it, never a default kit

> "Yes, a hero's row is its codex body plus its kit stat modifiers. But we can't
> read just from that because, both in simulations and in the actual game, it isn't
> a kit that stays with them. It's what items have been assigned to that specific
> hero."

And on `seam.items-per-unit`:

> "It seems like we're incomplete in what we're doing here. We cannot just use the
> default set of the kit. We have to use the items that are assigned to the hero."

Closed: `content.field-eve-24` and `seam.items-per-unit` are **incomplete**, not
approved. The kit is a starting assignment, not an identity. Note the kingdom
already models this — `hero.equipped` is what it fields — so the seam exists on one
side only.

### Cleared in this pass

- `movement.powers` — *"2 is a yes."*
- `test.fixture-migration` — *"Nothing to judge, okay?"*
- `fix.cohort-drift` — *"There was an update to these special movement powers that
  was valid. S17 has a bunch of different things. Those are valid."*
- `capability.area-attack` — *"Yes, an attack can declare an area arc."*

### Still open from this pass

- `content.test-cohort` — *"a really complicated answer because we're creating
  things for the proving grounds. It's not as simple as what's being asserted
  here."* Not a yes. The cohort and the Proving's subjects are the same question.
- `capability.item-powers` and `station.crit` — *"I don't really understand the
  question in 10 … I don't know what four crit fields are … I don't understand 11."*
  Re-put to her in her own vocabulary, not the test's. She added: *"We do want to be
  able to have multiple scalable things added into different powers and attacks."*

## 2026-09-04 — deployment: the default, the exceptions, and the player's choice

Reviewing `board.deploy-edges`. Approved, and then widened. Angela, verbatim:

> "24 is correct, but also, encounters will specify locations all over the board.
> There is a default state. This relates to content more than anything else, which
> is heroes left, enemies right, but the specifics can be dictated by individual
> squares and, say, 'enemy enters here.'
>
> Also, the heroes have a setup in the actual game where they choose the squares
> they are on, and there are modifiers in an individual hero to their deployment,
> which lets them deploy further out in the field. This is currently present in
> some of the badges called 'deploy'.
>
> The rule of deploy edges is the default backup, but there are conditions under
> which enemies get deployed anywhere. During actual gameplay, not during simulated
> gameplay, the player will choose which edge square a unit is deployed on, and
> it'll take into account its deployment number, which will let it deploy further
> into the field."

Closed, in four parts:

1. **Deploy edges is a fallback, not the rule.** Heroes left, enemies right is the
   default a battle uses when its encounter says nothing. It is not the model.
2. **Placement is content.** An encounter names squares — *"enemy enters here"* —
   anywhere on the board, and that overrides the default. This belongs with the
   encounter rows, not in the board code.
3. **A hero carries a deployment number**, and it is already partly authored: the
   `badge.*` rows called *deploy* are this. The number decides how far forward that
   hero may start.
4. **Setup is a player step in the game and not in the sim.** In real play the
   player picks the square, bounded by the hero's deployment number. A simulated
   battle has no chooser, so it falls back to the default — which is exactly why
   the default has to exist and why it is not the whole answer.

**Owed, not assumed:** whether the deploy badges already carry a usable number or
only prose; whether `encounter.*` rows have a slot for per-square placement today
(the P11 shape has hex placement, so probably yes); and what a simulated battle does
when an encounter names hero squares — obey them, or ignore them as a player choice.

## 2026-09-04 — Activation: one activation, two actions, structurally identical

Resolves the collision flagged earlier the same day. Angela, verbatim:

> "There are two actions in every activation: movement and primary. However,
> structurally, movement and primary are identical. They can both do any of the same
> things. Because you can have a movement that's an attack, and you can have a
> primary that's a movement…"

**The vocabulary is settled and `GLOSSARY.md` was right.** One **Activation**,
containing two **actions**. Her earlier *"you basically get two activations"* was
loose speech, corrected here. Nothing in the glossary changes; no new word is minted.

**What is new, and it is structural.** Movement and primary are not two different
kinds of thing. They are **two slots**, and either slot can hold any ability — a
movement power, an attack, a power, an item-granted ability. A movement that is an
attack is legal. A primary that is a movement is legal. The only difference between
the slots is which one you are spending, not what may go in it.

This lands directly beside the 2026-09-04 ruling that uses, cooldown, warmup and
cost are limits on *any* ability kind. Together they say the same thing from two
directions: **ability is one type; slot and limit are properties of it, not
sub-species of it.**

**Owed, not assumed:** the engine models these as separate paths today
(`executeMove` takes a movement power; `bestAttack` picks a primary). Whether the
two collapse into one mechanism, or stay two call sites over one vocabulary, is an
engine design question — not settled here. Angela's sentence ended mid-thought
("that's functionally…"); if there was more, it is not recorded.

## 2026-09-04 — ONE ACTION TYPE. The third and clearest statement.

Angela, verbatim, reviewing `capability.item-powers`:

> "Item granted powers can be any shape. All of the actions can be any shape.
> Whether they're an item granted power, a class power, an attack, an innate ability
> someone has, or a movement ability, all of them can have any of those shapes. All
> of them should be capable of doing all of the same things. Move 3, do damage, give
> a buff, have a cooldown, like any of these things. Or one use."

*(Her word "buff" — `GLOSSARY.md` says **status**. Quoted verbatim above; use
"status" in code and documents.)*

**This is the same ruling she has now given three times from three directions on one
day**, and together they are a single design law:

1. **Slot** — *"there are two actions in every activation: movement and primary.
   However, structurally, movement and primary are identical. They can both do any of
   the same things."*
2. **Limit** — *"cooldown, warm-up, and uses are all limitations on uses of any
   ability … be it a movement, be it an attack, be it a power, be it an ability given
   by an item. All of these can have uses, cooldown, warmup, and costs, like stamina."*
3. **Source and effect** — the quote above.

**The law: there is ONE action type.** Where it came from (item, class, innate,
weapon, movement) is a property. What it does (move 3, damage, apply a status) is a
property. What limits it (uses, cooldown, warmup, stamina, slot) is a property. None
of these makes it a different kind of thing.

**Consequence, owed and large:** the engine has `AttackDef`, `AbilityDef` and
`MoveDef` as separate shapes with separate call sites (`executeMove`, `bestAttack`).
This ruling says they are one vocabulary. Whether they collapse into one type or stay
three views over one set of fields is an engine design question — but "an item power
can't do that because it's an item power" is no longer a valid answer.

## 2026-09-04 — Crit is a modifier, a count, and a trigger

Angela, verbatim, correcting the question as put:

> "Yes, it's right that a weapon doesn't carry its own crit chance. It carries a
> modifier to crit, so it has a plus or minus, and it can roll more than one crit at
> once. Yes. And it can have an on-crit trigger of +4 damage or knockback 1. So a
> single action could have a +10% crit, do double crits, and on crit knockback 1."

Closed. Three separate properties, and an action may carry all three at once:

1. **A crit modifier** — plus *or minus*, applied to the base chance. Not its own
   chance. (The engine already models it this way: `crit?: number`, *"the weapon's
   flat addition to crit chance"*. The field is right; the question was put wrong.)
2. **A crit count** — more than one critical from one hit (`critCount`).
3. **An on-crit trigger** — an effect that fires because it crit: *"+4 damage or
   knockback 1"*.

`station.crit` and `station.crit-count` are approved. The **on-crit trigger** is the
part to check exists as a general hook rather than as the specific Knocked Sprawling
row — and it is an instance of the ONE ACTION TYPE law above, not a crit feature.

## 2026-09-04 — The hard-coded test cohort is retired; the Proving replaces it

Angela, verbatim, on `content.test-cohort`:

> "I think that test cohort should probably be deleted because we're doing things in
> a different way and in a more complete and concrete way. These are hard-coded, so
> they're not really testing the proper way to assemble a hero."

And on `content.enemy-flip`:

> "Yes to content enemy flip, and we're going to be creating a whole new proving
> ground series of test cases and moving away from the initial hard-coded test cases
> that the engine did."

Closed, and it is one ruling with two halves:

- **Away from engine inventions.** `content.enemy-flip` is **approved** — the standard
  battle fights the Codex's own Zombie, not a placeholder the engine made up. Same
  direction as rejecting the Alpha Team.
- **Away from hard-coded fixtures.** `content.test-cohort` is **not approved — retire
  it.** Six hand-built clones do not exercise hero assembly, which is now levels,
  specialties, kits, assigned items and progress. The replacement is the **Proving's
  test cases**, built from real assembly.

**Owed:** `test.fixture-migration` (already cleared) moved ~25 test files onto the
cohort. Retiring the cohort moves them again. That is a real cost and it belongs in
the Proving's plan, not in a fix.

## 2026-09-04 — Zone of Control is a THREAT, not a stop. Reverses what landed.

Angela, verbatim, reviewing `movement.zone-of-control`:

> "There is an error in zone of control. An enemy zone of control does not stop you
> from moving. I have seen it in the replayer show held. An enemy zone of control is
> just a threat. If you don't stop moving, you're going to get whacked. Zone of
> control is only a threat.
>
> A unit with a 0 strength value or 0% to hit for melee has no practical zone of
> control. It still has its own control, so if you moved, it might still attack you
> and trigger a miss.
>
> There is no held. There is 'you attempt to move when you're in a zone of control,
> and you get hit, and you lose movement, and you can no longer move.' That can
> happen."

**`movement.zone-of-control` is NOT approved. It landed with the wrong rule.** Its
spec says *"a unit that ENTERS a hex inside an enemy ZoC stops there — it may enter,
then its movement ends."* That is a hard stop. The rule is:

1. **ZoC never stops movement by itself.** It is a threat and nothing more.
2. **Moving inside it provokes an attack.** The attack may hit or miss.
3. **A hit is what ends movement** — you lose your movement and can no longer move.
   A miss costs nothing. So stopping is a *consequence*, not a rule.
4. **A unit that cannot practically hit has no practical ZoC** — 0 Strength, or 0%
   to hit in melee. It still *has* one, and moving through may still provoke an
   attack that misses.
5. **"Held" is wrong and it is on screen.** She has seen the viewer render *held*.
   Owed to the viewer thread as well as the engine.

Note `movement.attack-of-opportunity` (cleared in group E as correct) is the
mechanism this rule actually wants — provoke on leaving. Between them the engine has
the pieces; the ZoC item put a stop where a threat belongs.

## 2026-09-04 — The battle ends immediately. Nothing settles after it.

Angela, verbatim, reviewing `fix.post-end-ladder`:

> "After battle end, there is no settling or end of activation. If a hero kills the
> last enemy but has poison on it that would kill it at the end of activation, that
> poison does not hit. The battle ends immediately when the last enemy is killed.
> This will actually happen a lot."

Approved, and stated as a rule: **`battle.end` is terminal.** No Settle, no End of
Activation ladder, no status tick, no regeneration, no death that would have happened
a beat later. The last enemy dying ends it mid-Activation and everything queued
behind that moment is discarded.

## 2026-09-04 — Flight and walking are the two ordinary movements

Angela, verbatim, on `movement.flight`:

> "Flight rides on movement powers. It is not a thing independent of movement.
> Basically, there are two basic movement types. The two common movement types are
> flight and walking. Then there are different special moves that ignore zones of
> control or do something very specific. But the two most common moves are walking
> and flight."

Approved. Flight is not a unit property or a separate system — it is one of the two
ordinary movement actions, beside walking. Everything else (leap, sidestep, focus,
devotion) is a special move. Consistent with the ONE ACTION TYPE law recorded above.

## 2026-09-04 — The AI is far short of what the game needs

Angela, verbatim, across four items:

> On `ai.mode.defender` and `ai.mode.support`: "These should be noted inside of
> different units if they're not already supported, and then at a later point in
> time, we're going to build them. There are quite a few AI modes we need."

> On `ai.civilian-flight`: "AI civilian flight is an AI mode that we need."

> On `ai.attack-choice`: "No, we need to have AI that's capable of choosing other
> things other than a basic attack. This is a very nuanced and significant update
> that's needed."

> On `fix.enemy-ai-role`: "Again, we need much more in terms of the AI for units.
> You're taking a very simple look at it, so I think 15 is no."

**`ai.attack-choice` and `fix.enemy-ai-role` are NOT approved.** Both treat AI
behaviour as a small fix; it is a system that has not been designed. The modes that
exist are noted per unit as gaps until then. **Six AI modes is not the target.**

## 2026-09-04 — The power pool is much larger, and enemies use the one action type too

Angela, verbatim, on `capability.power-pool`:

> "There's a much bigger power pool, I think, than 28. And again, attacks, movements,
> and powers are really all just actions. For enemies, too."

The count is wrong and the framing is wrong. **The ONE ACTION TYPE law applies to
enemies exactly as it applies to heroes** — an enemy's attacks, movements and powers
are one kind of thing. Not approved as scoped.

## 2026-09-04 — Enemies carry uses, cooldown, warmup; cost is unresolved

Angela, verbatim, on `capability.enemy-action-cooldown`:

> "Yes, enemies need use cooldown warm-up. Enemies do need cost also, because there
> are some that are lower power. I don't know if that's a cost, though, or just a
> stat change."

Approved for uses, cooldown and warmup. **Open:** whether an enemy's lower power is
expressed as a *cost* (stamina-like, spent per use) or as a *stat*. Not decided —
Angela explicitly left it open. A switch, not a guess.

## 2026-09-04 — How a ruling gets tracked: work, documents, and the link between them

Angela: *"I don't know how they get recorded into the roadmap because they are
corrections. Updating based on documentation. We should be recording these so they're
being visualized in the way that's going to be visualized inside of our new tool."*

**A correction is not an epic.** `ROADMAP.md` answers *how far along is the game* —
eighteen large things that do not move. A ruling that reverses shipped behaviour is
not one of those; it is **work**, and work already has a home in
`.state/backlog.json`, written by the gate, with a status the gate owns.

So corrections go in the backlog. Nothing new is needed there. **What was missing is
the link:** a ruling and the work it caused had no connection, so nobody could answer
*"what did the 2026-09-04 rulings create, and is any of it done?"*

**A ruling has three consequences, and each is now trackable:**

| | What it is | Where it lives |
|---|---|---|
| **Work** | items the ruling creates or invalidates | `.state/backlog.json`, new field **`ruling:`** naming this entry |
| **Documents** | text the ruling makes wrong | a **`Sweep:`** line on the ruling, naming the strings |
| **Decision** | the ruling itself | this file, dated, verbatim |

`ruling:` landed today on the four items below. `Sweep:` is prose on these entries
until `id-sweep.mjs --scan` exists to drain it (`ROADMAP.md` Track C).

**GBH renders the chain, it does not own it.** A ruling shows its created work and
its unswept documents because both point back at it. That is the whole visualisation:
*3 rulings have unswept documents · 4 items open from 2026-09-04.*

### Work created by the 2026-09-04 rulings

- `fix.zoc-threat-not-stop` — reverses `movement.zone-of-control`
- `fix.knockback-beyond-one` — reverses "unbuilt by choice"
- `refactor.one-action-type` — the law stated three times
- `system.ai-modes` — design first, with Angela, before any further mode

### Sweep — documents these rulings made wrong, unswept as of 2026-09-04

- **"ALPHA TEAM" · "alpha-oathblade"** → `STATE.md` (records it landed, S31) ·
  `content/settled.json` · `engine/test/fixtures/folded-heroes.json` ·
  `viewer/battles/map_duel-8_s1.json` · `map_dungeon-16x8_s1.json` ·
  `map_field_s3.json` · `map_flanks_s2.json` — **four replayable battles are fought
  by a rejected roster**
- **"knockback 2"** → `STATE.md`:18 (under *unbuilt by choice*) ·
  `engine/HANDOFF-2026-09-03b.md`:82
- **"test cohort" · "STANDARD TEST SIX"** → `CONTENT-OWNERSHIP.md` ·
  `ENEMY-REVIEW.md` · `engine/HANDOFF.md`
- **ZoC "stops there" · "move.stopped" · "the ZoC hold"** → `engine/src/core/movement.ts`:198
  (the code comment states the wrong rule) · `viewer/src/board.js`:453 (renders the hold) ·
  `viewer/src/theme.js`:55 · the `movement.zone-of-control` spec · whatever
  `COMBAT-DESIGN.md` says. *("held" alone was the first sweep string and hit 338 lines
  of "withheld" and Crucible dialogue — a sweep string has to be specific to the thing.)*
- **"51 flagged landings"** → `STATE.md`:18 — it is 17 now, and 60 were reviewed
  2026-09-04

## 2026-09-04 — Deathbed Fighting, REVERSED: no stands, the Hero badge, Wounded is the one and only second chance

Angela, verbatim (after the engine session laid out the ladder as built —
Fresh → Wounded → Badly Wounded → final fall, heroes two stands, death only by
bleed-out — and COMBAT-DESIGN §13 as written):

> "Okay, yeah, there are no stands. We need to remove that. There is a badge
> that all heroes start with. That is invisible on a hero called Hero. It is
> not on civilians unless expressly said so. Only those with the badge Hero
> 'bleed out.' A civilian who goes down and doesn't have the hero badge is just
> dead and a corpse. Now any player unit rolls deathbed fighting. Unless they
> have the badge 'Wounded'. If they are wounded, then they just die. When a
> player succeeds at deathbed fighting and they are not wounded (because they
> didn't get a chance to roll if they were wounded), they immediately gain
> Wounded. Wounded gives: -10 accuracy, -10 dodge, -1 strength, -1 precision,
> -2 max HP. When a player succeeds at deathbed fighting, they gain 1 stamina
> and 1 equal to whatever their stamina recovery is. So typically, they gain 2
> stamina. When they succeed at deathbed fighting, I think they need a skull
> in their status bar. To show they're on death's door and they get placed at
> maximum hit points. Which is too low compared to what it was a minute ago.
> If they're at death's door, they're on a deathbed fighting, and they get
> reduced to zero, they die. They do not bleed out."

What this reverses: COMBAT-DESIGN §13's stand ladder ("civilians get one
stand, heroes two", Badly Wounded, "dead is only ever the clock running
out"), capability.deathbed as landed 2026-09-03 (`stands`, `woundLevel`, the
−1-to-everything / −2 Max Stamina penalties), and the 2026-09-03 answer that
the badge is minted after the battle — Wounded is applied IN battle, on the
unit, the moment the roll succeeds. Badges become an engine type with this:
`badge.hero` (invisible; every hero; a civilian only when its row says so)
and `badge.wounded` (the penalties above; the skull). Sweep owed:
COMBAT-DESIGN §13, capability.deathbed's tests and SWITCHES entries, the
kingdom's after-battle Wounded minting (it reads `deathbed.stood`), the
viewer's wound-level rendering (VISUAL-BATTLE-UPDATES §3.2 "dripping blood"
→ a skull), 4-BADGES-SETTLED's `badge.wounded` row ("prose only").
Questions asked the same message; answers below when they come.

### Same day — the answers

Angela, verbatim: "1 in 4, correct. 5, it cannot overflow. Stamina gains and
healing never overflow. The hero badge does nothing else. Enemies are
unchanged. We also need to be able to add the badges of the afflictions.
Vampires, werewolves, and undead sometimes afflict their targets with a
badge. Same with ghosts and things that can add possession."

Closed, against the questions as put:
1. A Hero-badge unit that FAILS the roll is downed and bleeds out as today; a
   unit without the badge that fails is dead and a corpse — no downed state.
2. Wounded is a badge and persists: a hero fielded already Wounded dies at 0
   with no roll. The kingdom hands the badge list over at fielding, like items.
3. The chance stays 20 + 5 × Toughness.
4. The old penalties are replaced entirely by −10 Accuracy, −10 Dodge,
   −1 Strength, −1 Precision, −2 Max HP.
5. The 1 + Stamina Regen gain is capped at Max Stamina — and the general law:
   stamina gains and healing never overflow.
6. `badge.hero` does nothing but "bleeds out instead of dying on a failed
   roll". Invisible.
7. Enemies unchanged: dead at 0, no roll.
8. Badges are an engine type from here, content owns the rows — and the same
   mechanism carries the AFFLICTIONS: a vampire, a werewolf, an undead can
   afflict a target with a badge; a ghost (and anything that possesses) adds
   possession. An affliction is a badge applied by a trigger in battle.

## 2026-09-04 — Missing art never breaks a ship

Angela, verbatim (on the content audit refusing to write the pack over one
card painting where the convention is four, and a `.jpg` row over `.png` files):

> "We will eventually have four paintings, but it's fine to have one. Things
> shouldn't break if we are missing art."

Consequence: art is never a shipping gate. A hero with one painting ships; a
row whose art file is missing ships with the gap named. `content/audit.mjs`'s
art findings (`hero-has-a-partial-level-set`, `declared-art-file-does-not-exist`,
`art-path-does-not-resolve`) may report but may not count against `expect.mjs`'s
total that decides whether the pack is written.

## 2026-09-04 — The Proving's first pass: kits, level 1, initiative, no AIs yet

Angela, verbatim, ruling on session 9's draft test plan (`9-PROVING-NOTES.md` §6):

> "Control hero's kits — heroes should not exist without kits. They're punching
> people. We will eventually be changing the items of the heroes, but we can start
> with just their default kits. We will eventually change level, but we'll start
> with level 1. I don't know what you mean by 'one what you need,' but I want to
> measure initiative. If there's deathbed fighting, that will change the hero side,
> and the hero side has the limitation of stamina. So, can we just field enemies
> against enemies? Let's just get this working for pass one and question six. AI
> subjects. Eventually, we're going to do all of both, but this cannot be in the
> first plan. First, let's power rank everything, and then we can start to change
> AIs and see if that moves power ranking."

Consequences, as read by session 9:

- **Every hero in the Proving fights in its start kit** — the control heroes and every
  substituted hero alike. A bare hero is not a subject. This does not reopen the
  2026-09-04 "never a default kit" ruling: the plan file still ASSIGNS each seat its
  items explicitly; the row's `defaultItems` is what it assigns. Item rotation is a
  later pass.
- **Level 1 for every unit in pass one.** `grow` is a later pass.
- **Initiative is measured with enemies against enemies** — the hero-side rules
  (Deathbed Fighting, stamina) are exactly what she wants kept out of it. Today a
  zombie fielded on the west side FOLLOWS THE HERO RULES (`SWITCHES.md
  mirrorSideRules`, default `fielded`), so "enemies against enemies" does not yet
  give her the clean measurement; the `row` arm (a zombie stays a zombie wherever it
  stands) is what does. Engine work, filed by session 9.
- **Saturation (question six): pass one has no rung ladder.** A subject that wins all
  five is top of its ladder; a subject that loses all five is bottom. Read from
  "let's just get this working for pass one" — a reading, not her words.
- **AI subjects are not in the first plan.** Power rank everything first; AI changes
  are then measured against those rankings.

## 2026-09-04 — The Proving's pass two: second controls and levels first, then AIs; items wait on the AI

Angela, verbatim, on session 9's proposed order for pass two (second controls ·
levels · items · AI modes):

> "I don't know that we have sophisticated enough AI to correctly use items, so I
> think we need a plan for 1 and 2. Then plan for 4. Yeah, go ahead and write the next
> plans so they're waiting when the engine gets there."

Consequences: pass two is **a second control per side** and **levels**; pass three is
**AI modes as subjects**; **items as subjects wait** until the AI can use them — an
item ladder run by an AI that cannot use the item measures the AI, not the item. The
plan files are written ahead of the engine and sit in `content/proving/` until it
arrives (`9-PROVING-SETTLED.md` §7).
## 2026-09-05 — The Proving's score is the VICTORY RATE, not the flip rate

Angela, verbatim, on opening the first `PROVING.html`:

> "What the hell is up with these power rankings? You've got an orphan child that
> loses every fight and has a 3 and a 5. You've got a bone dragon that wins every
> fight as a 3 out of 5, and a fire imp at the highest. I don't understand. The
> power ranking should be based on the victory rate in the battle. It doesn't
> appear to have any association with that."

What happened: the 2026-09-03 ruling said "how much they move the needle", and the
rig scored the flip RATE — a flip in either direction counted, so a unit that turned
three control wins into losses scored 3/5 beside one that turned three losses into
wins. That is reversed. **Power is the victory rate: of the five pairs, how many the
subject's side WON with the subject in.** The control's wins sit beside it (the
needle's direction is the difference), swing is the tiebreak (from the subject's
side, signed), then id. The flip count stays on the page as a column — it still
says the unit mattered — but it is not the score. `proving.rank` re-sorts;
`PROVING.html` re-renders; no battle re-runs.
## 2026-09-10 — V2 migration authorized; standalone combat and expedition consequences

User, verbatim, on the playable target:

> In V2, we should have the ability to simulate a battle in a different way, where we have all of the UI elements, the ability to press buttons, and the ability to have me play as the heroes against the enemies. We don't need to have this flow entirely from the game state, but it does need to consume a game state where I can maybe just set the heroes that are playing. We're using some standard kits and heroes. It doesn't even need phases. It can just have the enemies there.

The follow-up confirmed that the sandbox skips campaign/preparation screens; hero/enemy combat turns and activations remain. The kingdom outcome picker remains a fast flow-testing adapter. Runtime assets are 3D terrain with existing 2D hero/monster artwork. Preserve the current Battle Atlas maps and user edits.

User, verbatim, answering the seven preflight questions:

> One, yes.  2, yes.  3 no-supplies every week   there is starvation without conquest.   But also, there'll be quests that can give you supplies.   Dungeon fatigue not available happens only after the expedition ends. Yes. Even though there are all these non-combat phases, we only get combat resolution, we only get rewards, and we only get exhaustion (all of that) when you're done with the dungeon, by either winning or retreating.  Rest takes 1 week and clears both fatigue and exhaustion, yes.   Yes, exhausted they can receive recovery assignments.   No, we don't really need to save anything from V1. It's fine. We're not going back to V1.  Seven. No, this is the only chat working on this.  Okay, again, any questions before you begin?

Consequences of those answers:

- Migration includes the standalone playable battle sandbox and all V2 combat, viewer, content, kingdom and dungeon adaptations. Full kingdom-to-combat launch wiring is not required for the sandbox milestone.
- Unspecified mechanics and tuning may be resolved with documented provisional decisions; explicit authored rulings win. Implement clearly authored but nonfunctional content without pretending unwritten content is authored.
- No weekly Supplies income. Conquest and authored quest rewards supply the purse; lack of conquest can cause starvation.
- Dungeon combat consequences, reward presentation, XP/level-up and fatigue/unavailability are deferred until expedition completion or retreat (wipe also terminates the expedition under the existing dungeon rule). Intermediate battles still settle local damage, casualties and persistent run-state changes.
- Rest takes one Week and clears Fatigued and Exhausted. Exhausted heroes may receive recovery assignments.
- No V1 save compatibility is required; no V1 runtime fallback is needed.
- This is the sole active development chat. Work item by item through verification and commits without routine clarification pauses.

### Sweep

The root V2 combat, kingdom, dungeon and impact-map documents own the corresponding design and migration details. Older V1 documents describe the old executable baseline only and cannot veto the authorized V2 changes. New map dimensions/authoring intent come from assets/battle-atlas/MAP_DESIGN_RULES.md; renderer meshes never substitute for authored combat footprints.
## 2026-09-10 — The first two quests

User, verbatim:

> We can have the two first quests that are going to happen in the game that are available:
>
> 1. Rescue a civilian, and it requires you to send three people.  And the second one is recover supplies.   And you have to send one hero.   The one hero quest will give 5 experience points, take 1 week, and get 10 supplies.   Rescue a civilian gives everybody 3 experience points, and you get a random civilian that you rescue.   The supplies have a 5% chance of turning into a combat encounter unless you send two other units along with the hero.

Implementation reading: Rescue a Civilian sends three roster people and grants each participant 3 XP plus one randomly selected civilian on success. Recover Supplies requires a hero, lasts one Week, awards that hero 5 XP and the campaign 10 Supplies on success. Zero or one escort retains the 5% combat chance; two additional units remove that risk. Quest encounters use exactly the dispatched party. Provisional defaults: rescue also lasts one Week; rescue has no encounter roll; supply escorts receive no additional fixed XP unless another authored reward grants it; a supply encounter must be won to receive the successful quest payout. The kingdom's data/switches own these defaults, not engine combat rules.

### 2026-09-10 — Positive movement allowance implementation

Under the authorized V2 migration, `fix.movement-plans` corrects the mismatch between
reachable paths and actual walks. A path action's budget modifier belongs to that
action: its positive allowance is spent once across the path, before the unit's
remaining activation points. Negative modifiers cap the path without rewriting the
Movement stat. A `moved` event keeps the full terrain cost and separately names
`bonusPaid` when the power paid part of it. An opportunity hit cancels the whole
move. Rejected complete paths and repeated spent-slot calls spend nothing.
Two test-only flat-file rows and `showcase.movement-bonuses` exercise different
allowances; this does not publish Sprint as player content. The old command clamp
test is replaced by full-execution assertions. Historical cursor hashes are retained;
new scenarios compare current automatic/suspended/restored drivers. Snapshot rules
advance to `v2-migration.2`. AI selection, interchangeable slots and Surge refresh
remain separately gated work.

### 2026-09-11 — Surge lifecycle correction

The V2 loop reopens movement/primary choices with the allowance sampled at the
original activation start. Slow applied mid-activation waits for the next activation;
current Root still forbids displacement. A new action-blocking status prevents a
further Surge. This does not fire a second activation-start or end ladder. Winning
inside a Surge ends at `battle.end`, as does a win during the final actor's end ladder.
The former silent eight-cycle stop becomes a provisional technical guard of 256
cycles: overflow throws an invalid-run error, never a battle outcome or phase advance.
Snapshot rules become `v2-migration.3` and retain the sampled movement allowance.

The parent commit `03ab367` was compared against this correction for all 450 control
battles: exactly 37 lose a trailing `phase.end.begin`; state (apart from event count),
RNG draws and results are identical. Evidence: `scratch/verify-surge-controls.mts` and
`scratch/surge-control-comparison.json`. The gate is explicitly authorized to update
those control hashes at landing. Nine historical scenario hashes also encode the
corrected Surge/terminal behavior; their old fixture remains unchanged as history,
while their tests assert current driver parity, final event and concrete Surge rules.
All unaffected historical scenario assertions remain in force.

The stronger final-event check additionally found a cancelled second hit emitted
after a winning first hit, and encounter result metadata emitted after its final
battle event. Multi-hit resolution now stops immediately on outcome; encounter
win/loss details precede `battle.end`. The authored flight-ladder probe needed two
explicit test-only ranged fliers to actually use both movement choices; a registry
entry without live use did not pass the gate. These rows live in content/test/.

### 2026-09-11 — Shared AI command adapter

`fix.ai-shared-commands` removes the AI's direct attack/power/movement execution
and its separate sidestep geometry. All ten modes use shared action validation,
movement destinations and execution. A selected command rejected at execution is
a loud invariant failure, never a silently skipped action. Existing scoring and
tie breaks remain; illegal candidates are filtered before lowest-health selection.
Zero-range recovery can be chosen for its rider when stamina is missing, even
without a better neighbouring hex. Root and an already spent slot are rechecked;
a cached hunter target cannot override current Taunt. Snapshot rules become
`v2-migration.4` because continuing the AI now follows this corrected policy.

The comparison against `6577a7b` covers 450 controls plus 26 registered scenarios.
123 event streams change, including four scenarios; 13 complete result records
differ. The first divergence in 44 battles is an old attack after an opportunity
hit applied Stun: the shared validator correctly refuses it. Another 78 first
divergences are previously omitted zero-distance Focus/Devotion recovery; the
remaining case selects an available legal shot instead of idling over an illegal
lowest-health candidate. Evidence and representative event prefixes are in
`scratch/ai-transition-comparison.json`. These are rule/selection corrections,
not a balance result. The gate may update control hashes at landing. The old
historical fixture stays unchanged; three additionally affected historical cases
now assert current driver parity and are covered by the new rule tests.

Test-runner evidence for this stage: the full suite twice reported six default
five-second timeouts. Four workers reduced this to two, and both remaining cases
also timed out with a single worker (the two-build replay test took 5.86 seconds).
The suite now caps file workers at four. The six repeatedly affected integration
tests (three multi-battle audits and three multi-process exports) receive explicit
30-second budgets; all other default budgets remain unchanged. Battle counts,
statistical thresholds, byte equality and all assertions are unchanged. Failed-run
evidence remains in `scratch/ai-full-suite.log`,
`scratch/ai-suite-four-workers.log` and `scratch/ai-isolated-expensive.log`.

## 2026-09-11 — V2 unit identities (implementation decision)

Unit array indices identify positions in the battle record; `uid` identifies the
unit for named random streams and trusted controller ownership. Both setup paths
accept aligned `heroUids` and `enemyUids` lists. An absent list or undefined entry
requests automatic allocation. Reserve every explicit identity before allocating
either roster. Duplicates across either side, mismatched lists and invalid values
are errors, never silent renumbering. Inputs remain unchanged.

Identity values are unsigned 32-bit integers, including zero: `rng.ts` hashes four
bytes per numeric key, so a larger safe integer would alias after truncation.
Snapshots validate the same bound. Ordinary automatic identities retain their
100/200 starting ranges; a collision advances to an unused value. Arrivals search
from 300 against the current units and corpses, including dead units, rather than
inferring identity from an arrival count or capturing a counter across reloads.
Snapshot rules advance to `v2-migration.5` for the changed allocation behavior.

The pre-change 102-unit setup reproduced 101 distinct identities (duplicate 200).
All 26 new regression cases failed before implementation, for the intended
identity, validation and ownership assertions, then passed afterward. Coverage
includes both setup paths, unsigned boundaries, frozen inputs, later explicit
reservations, sparse/dead arrivals, restored arrival parity, public controller
ownership and unchanged attack RNG when the same roster is reordered with stable
identities. `scratch/unit-identities-red.log` preserves the red run. This
allocator-only implementation passed its first full gate (971 tests) with
unchanged control hashes.

Independent review then reproduced a related pre-existing violation: trigger
rolls used the target's array index rather than its identity. Four further
regressions failed for reordered targets and the absent-target/index-zero alias.
Trigger keys now contain owner UID, target UID, an explicit target-presence
field, invocation ordinal, trigger slot and optional key tag. The presence field
keeps both UID zero and UID 4294967295 distinct from no target; null and undefined
both mean no target. The existing death-trigger tests caught the null case
during the correction, and remain unchanged. All 62 identity/trigger tests pass.
The stage now explicitly declares changed baselines before gate verification;
before/after battle comparisons record their impact. This corrects deterministic
identity, not a balance tuning decision.

The expanded transition comparison covers 479 battles (450 controls, 26 authored
scenarios and three progression cases). 478 event streams differ; every first
difference is a trigger roll with the same cause. 34 complete result records
differ; this is not a count of victory flips or a balance claim. The unchanged
case retains exact events, state and RNG. Evidence is in
`scratch/identity-transition-comparison.json` and its reproducible script.

The first expanded full suite found 15 historical cursor hashes and one rare-roll
fixture stale (959 passed, 16 failed). The original historical fixture remains
byte-identical. A separate `battle-cursor-identities.json` freezes all 30 current
cases, and both automatic and suspended drivers must match those expectations.
The old affliction smoke assumed a 2% success in the first twelve standard seeds;
the corrected keys produce none there. Replicate 29 is now an explicit live
fixture asserting roll 1 at chance 2 and its single subsequent badge grant.
No trigger chances, battle inputs or mechanics were tuned to preserve old rolls.
All 70 focused identity, affliction and cursor regressions pass before full gate.

The expanded gate passed all 975 tests but rejected three type errors in the new
trigger probes: `target` instead of `select`, and an omitted required nullable
target. Corrected the test API usage, made the target effect guaranteed and
asserted its actual status grant. Typecheck and all 30 identity tests pass. A
fresh counterfactual restores only the old trigger keys temporarily: all four
typed identity probes fail, then the corrected source is restored. Evidence:
`scratch/unit-identities-trigger-counterfactual-red.log`. No check was skipped.

## 2026-09-11 — Game Builder audit-only batches (infrastructure repair)

Direct rebuilding after the identity audit exposed an existing renderer crash:
consecutive batch-end records create an empty closed batch, but its date read
`runs[0].at`. Gate/audit hooks suppress renderer exceptions, leaving both HTML
copies stale. Four isolated CLI fixtures reproduced three failures: consecutive
boundaries crash, audit-only records disappear, and a failed audit is hidden.

Keep every closed batch and its stable ID, label, timestamp and artifacts; only
the unstarted trailing batch is omitted. Render its audit result explicitly,
including FAILED, and use the marker timestamp when there are no runs. No
ledger history or human read/review state is rewritten. This offline renderer
cannot be exercised or disabled by a battle content ID; its two structural
exemptions are recorded on the item, and its seal must remain withheld.

## 2026-09-11 — Flight bonus payment (V2 correctness repair)

The authorized movement contract spends a power's positive allowance locally,
before drawing activation movement. A one-hex jump with a +3 bonus instead
increased the store from 5 to 7; the old subtraction produced negative payment.
The same defect with +5 increased it to 9. Payment is now the nonnegative excess
of flight distance over the power modifier. Negative modifiers remain penalties;
the existing -1/0/+1 flight ladder has identical accounting. No gameplay tuning
changed. Two new TEST-only authored carriers use +3/+5 bonuses through the normal
content publisher and registered battle scenario (`showcase.flight-bonuses`).

Six of 17 initial probes failed on actual resource accounting, including reload
and every-destination checks. All 17 pass after correction: short jumps, bonus
boundaries, full range, occupied destination refusal, once-only movement slot,
saved state, Surge reset and the existing ladder. The first standalone typecheck
caught use of ES2023 `findLast` in the new test; the test now uses supported array
methods, with its assertions unchanged. Snapshot rules advance to v2-migration.6
because the executable resource semantics changed. Evidence is retained in
`scratch/flight-budget-red.log` and `scratch/flight-budget-green.log`.

## 2026-09-11 — Authored action-slot legality and AI continuation

V2 migration authorization implements the existing single-action ruling: profile
determines effects, authored `slot` determines allowed opportunity. Both
`byProfile` and `any` honor restrictions; the switch chooses only the default
preference. Missing slot means either. An explicit command selects movement or
primary; primary ends earlier movement and closes the public action cycle.
Free actions precede primary and pay resources without a slot; reactions bypass
activation slots while paying resources. No alternate V1 legality path is added.

Provisional AI policy retains current modes/previews and uses a transient decision
context: choose each free ID once per cycle, continue on successful choices,
stop on idle/no progress/closed primary. Its finite action bound throws rather
than silently returning a truncated simulation. Details and red evidence are in
V2-AUTHORED-SLOTS.md. Slot/save/Surge state uses existing fields; snapshot rules .7
reject older executable semantics rather than migrate them.

Intentional historical-test revisions retain all cost, AoO, floor and state/RNG
assertions: request an explicitly spent slot; complete the direct driver cycle
before public snapshot parity; grant Swift Flight before executing it; begin a
new activation before each repeated Devotion; require unpaid Leap to be an exact
no-op. The old unsupported-any assertion is replaced by its newly supported
behavior. These edits remain flagged for human review, not self-approved.

Universal action expenditure events are deliberately the next item. They need a
metadata-only control transition with evidence; this item adds no conditional
event workaround and makes no claim that passive replay infers explicit slots.

## 2026-09-11 — Universal action expenditure event

The authorized replay contract emits `action.spent` once in central payment for
every action, including free, reaction and zero-cost actions. It records the
actual resolved slot and resulting flags after resource/cooldown/use payment,
before the action's effect. No profile/config branch suppresses the event.
The existing `activation.begin` and `surge.hit` events authoritatively reset both
flags to false; their payloads and all other prior events remain unchanged.
Snapshot rules advance to .8, with no V1 compatibility path.

All 25 initial probes failed for absent expenditure metadata, then passed with
the central emission. The intended baseline change is metadata only. The
comparison extracts committed `b0a80f6` and requires exact events, state, RNG,
cursor and result after removing only action.spent and normalizing event seq and
state.seq. Original and identity goldens remain; a separate event-contract golden
covers the current corpus. Authoritative shape/timing/reset documentation belongs
to EVENTS-FOR-THE-VIEWER-2026-09-03.md §14, not a competing event specification.

## 2026-09-11 — Authored board dimensions beyond presets

V2 migration now follows authored map dimensions through content assembly,
compilation, loading, geometry, setup and saves. The four historical FORMATS
keep their sizes and names as convenience labels. Provisional limit: width and
height are positive safe integers and their product is at most 10,000 cells,
aligned with the atlas's ceiling. Validation precedes geometry cache lookup and
allocation, so numeric strings cannot alias a warmed numeric cache entry.
Snapshot rules advance to .9 and reject invalid/oversized/inconsistent boards.

Flat TEST maps/encounters at 20×10 and 40×40 prove transport through the normal
publisher. They are technical open-board fixtures, not user maps or visually
approved terrain. TEST maps append after the old 18 controls; existing control
hashes must remain exact and only the two new map keys are added. Neither user
map/art bytes nor the four preset sizes change. LOS, props, atlas conversion and
inline setup remain separate stages.

Initial probes recorded 14 engine failures/14 passes and 16 content failures/16
passes. A malformed-row test parameterization was corrected and re-run before
loader implementation. Later probes caught coercible IDs/missing names, invalid
encounter coordinates and null encounter boards; their red logs are retained.
A coherent 10,100-cell snapshot passes under the counterfactual prior 1,000,000
limit and is rejected under the shared 10,000-cell bound. No enormous allocation
is used as a negative probe. The first publication dry run timed out in an
unchanged browser click check; its cause is unconfirmed. A normal retry passed
21 tabs with zero page errors/verification failures. No timeout/assertion was
weakened and no publication preceded the passing check.

Final evidence: content `e8a9ebc` passed 73 tests and normal publication changed
only the engine pack and stamp among 11 outputs. Engine `589e01e` landed after
the recorded historical preset/registry assertion repairs; 1,139 tests and the
separate full audit passed. Original 18 control hashes are exact and only two
TEST map controls were added. The seal remains withheld for the gate's two
warning categories. Details and retained evidence: `V2-AUTHORED-BOARDS.md`.

## 2026-09-11 — Direct authored maps in production setup

The authorized map input uses `BattleOptions.map` through the same production
unit/kit/identity/action path. The row is strict plain data, bounded and decoded
by the same map helper as registry rows. Unknown fields reject; no map registry
is mutated. A provided mapId or encounter map identity/board must agree with the
direct row. Direct `map.loaded` records detached exact initial base terrain for
replay, with its contract in EVENTS-FOR-THE-VIEWER-2026-09-03.md §15. Snapshot
rules are .10; restore validates the new payload independently of mutable terrain.

Initial placement now reserves explicit positions and actual encounter-zone or
rolled heroes before enemy deployment. Spill skips lines exhausted by occupants,
retains physical-wall rejection, and stops at the board boundary. These
corrections prevent initial overlaps; encounter
arrival shunting remains. A 530-battle old-source comparison proves unchanged
state/events/full RNG/cursor/results for all existing scenarios and 500 controls;
all 20 baseline hashes are exact. No unused zone sample writes RNG state.
Probes, intermediate failures and remaining stage status: V2-DIRECT-MAP.md.

Final verification: source `24dfacf`, full and committed-tree checks plus the
separate batch audit passed 1,200 tests and all 20 controls. The single ruling
warning remains recorded with a withheld seal; no historical tests were edited.
`V2-DIRECT-MAP.md` records the completed evidence and remaining viewer/terrain work.

## 2026-09-11 — Existing high cells block attack lines

Authorized V2 §4 replaces the old range-only attack line for authored x cells:
ordinary and reaction attacks, including melee reach, use one exact full-cell
predicate in canAttack. Radius vision and auras remain unchanged. Closed tangent
contact and measured geometry limits are provisional choices in SWITCHES.md.
Immutable all-pairs bitsets and per-blocker reverse lists precompute at setup
and restore, and detect current terrain edits before queries. Forks share only
immutable geometry; no cache or resource diagnostic is serialized. Snapshot
rules advance to .11. Geometry works for all pairs, without weapon-range caps.

Obstacle-bearing battle controls intentionally change; obstacle-free controls
must retain exact events, state, RNG and results. The old-source comparison and
existing cursor fixtures preserve historical evidence rather than rewriting
prior goldens: all current scenario/progression cases remained exact. Technical
evidence/status lives in V2-HIGH-CELL-LOS.md.
Arbitrary prop footprints, edges, cover, destruction commands, area secondary
propagation and power.damage/burst shielding remain subsequent V2 work.

## 2026-09-11 — canonical static high props, authorized V2 implementation

terrain.authored-high-props adds one map/battle-scoped prop owner and normalizes
raw x once; it does not preserve a second terrain-obstacle runtime branch. Every
movement/landing/placement/arrival/knockback/LOS consumer reads the canonical
footprint union. Materials and resource policy are provisional in SWITCHES.md.
Snapshot rules advance to .12, and map.loaded carries detached initial props.
Viewer registered-map presentation and Kingdom drawing migrate atomically;
unknown/direct-dimension viewer initialization remains a separately recorded
dependency. No user maps/art change. Text boards consume direct initial facts.
The V2 receipt records red evidence, representation fixture changes, old-source
comparison, package publication and final gate status. Human visual acceptance
remains separate. Existing LOS/tooling verdicts are not rewritten.

## 2026-09-11 — readonly viewer direct-map initialization

Authorized V2 migration item viewer.direct-map-initialization prepares exact initial
map facts before mounting/dropping a battle. Registry fallback requires matching
identity and dimensions and only applies when exact terrain is omitted. Initial
facts are required; no V1 mount API branch. All events remain available to fold.
The engine owns presentation geometry and exact distance access; static quadratic
byte tables are retired. Combat/state/event contracts and .12 rules do not change.
Implementation evidence and remaining verification: V2-VIEWER-DIRECT-MAP.md.

## 2026-09-11 - passive viewer runtime metadata isolation

Authorized item viewer.runtime-metadata moves the existing terrain metadata
implementation to a registry-free leaf and makes viewer static-tool catalog
reads explicit and lazy through its single engine door. The passive page checks
actual emitted modules; required catalog validation still runs for generators.
No rule/table duplication, purity declaration or snapshot/event change.
Measurements, boundaries and verification belong to V2-RUNTIME-METADATA.md.

## 2026-09-15 — authored floor and finite high geometry prerequisite

The user again requests the approved Battle Atlas scenes in the actual game and
battle viewer, with movement, cover and line-of-sight rules authoritative in the
engine. Item terrain.authored-geometry supplies generic floor masks and finite
convex high props before the external Atlas adapter binds real battles to scenes.
The provisional integer transport, padding and resource policies are recorded
in SWITCHES.md. Core imports no catalog or renderer; no user maps or art change.
Snapshot rules advance to .13. Existing maps without these optional facts retain
their event bytes and full-hex semantics. Low cover and destruction remain separate.

Historical tests receive explicit hex-kind guards/type narrowing because the
footprint is now a union; all their previous assertions remain. These edits still
carry the gate's review flag. Technical checks do not establish visual acceptance.


## 2026-09-15 — low cover prerequisite for authored Atlas battles

Implementation of the existing COMBAT-V2-DESIGN §3/§5 ruling now accepts generic
low props alongside high props, supplies directional target-end cover through the
shared attack pipeline, and charges explicitly authored low-edge path crossings.
This is not a new user ruling. Contact, station, overlap and resource choices are
provisional and recorded in SWITCHES.md. Existing free sidestep/flight/forced-move
budget semantics remain. Snapshot rules advance to .14. Powers and old area
attacks are unchanged; burst migration and destruction remain separate. Core
imports no Atlas assets or renderer. See V2-LOW-COVER.md for verification status.


## 2026-09-16 — dumb-melee contact correction (implementation)

Authorized V2 follow-up fix.ai-melee-contact ranks equal-distance path destinations
by actual movement cost, path length and hex ID. The first contact is retained
when further walking adds no closeness. Existing AoO timing and intentional AI
blindness to its risk are preserved. Snapshot rules advance to .15. The dedicated
receipt records pre-change Atlas states, meaningful red probes and scoped control
changes; this is an implementation decision, not a new user ruling.


## 2026-09-16 — human activation choice (implementation)

Authorized V2 plumbing.activation-choice adds an engine-owned selection boundary
before beginActivation for the human sandbox. Stable-UID policy and the strict
command API govern eligibility; the host never edits or reorders the cursor.
Automatic simulation remains fixed-order. Mixed control and automatic resume
choices are provisional in SWITCHES.md. Snapshot rules advance to .16. This is
implementation of the authorized playable target, not a new user ruling.


## 2026-09-16 — named elemental defenses (authorized V2 implementation)

COMBAT-V2-DESIGN sections 8/18 supersede magic resistance for Burn/Poison and
accelerated fire/poison immunity decay. This item introduces explicit flat fireResist,
poisonResist and shadowResist, default 0, across typed attacks/powers/status/trigger
HP damage and authored stat transport. Protection's existing attack ordering is
preserved. Provisional content magnitude, signed-defense and Shadow-growth treatment
are recorded in SWITCHES.md; this records implementation, not a new user ruling.

## 2026-09-16 — universal Protection coverage

V2 section 18 extends the existing station-550 ordering to every typed HP damage
path: attack/power, tick, trigger and explicit selfDamage. Pure absorption and
flat defense resolution precede caller-owned pool spending and the raw HP mutator.
Max HP clamping and Shadow obliteration are state changes, not typed damage.
Self-damage previews expose resolved damage and actual HP loss separately using
real fork events. Snapshot rules advance to .18. This is authorized implementation,
not an additional user ruling.

## 2026-09-17 — finish V2 in small verified stages

Andrew: “Okay, let's do everything else in very small stages, testing each stage to make sure it's effective. Let's make sure we do a build loop here where we're going to build a stage. We're going to test it very thoroughly. We're going to compare it against what we think it's supposed to be there, against the roadmap, against V1. If it doesn't seem accurate, we're going to rebuild it, and you're going to continue through everything remaining. You're not going to stop to ask questions, but you can ask me questions now.”

Implementation interpretation: continue the authorized migration through bounded build/test/repair loops without routine questions. Compare against roadmap and historical behavior; explicit V2 rulings supersede retired V1 mechanics. No blocking unanswered question remains at this checkpoint.


## 2026-09-18 — V2 Block implementation

Authorized item rule.block implements COMBAT-V2-DESIGN section6 with independent
Block/Ranged Block stats, the first incoming-hit cup, reciprocal onBlock hooks,
preview and persistent incoming ordinals. Explicit blocksBlock lets authored
Stun suppress defense without conflating every activation lock with Stun.
Snapshot rules advance to .21. Timing/default/downed/AI choices are provisional
in SWITCHES; this is implementation, not a new user ruling. Shield/class content
and presentation adoption remain separate. V2-BLOCK.md owns verification.

## 2026-09-22 — the gate gets smaller: no typecheck, one full suite

Andrew: “How do we get the commands to a smaller size? What have we added that is breaking this rule?”

Andrew: “We'll remove type check too. Seems like three full test suites early on is unnecessary.”

Context: one `gate.mjs --land` ran decided-check, `tsc --noEmit`, the full vitest suite, a battle probe, 22 control battles, content check, variant probes, the kill switch, commit, the full suite again and the control battles again (post-land audit), effect-size battles and, every 10th landing, audit-all — all in one command, past Cowork's 178 s shell limit. Ruling: the gate drops the typecheck, and runs the full test suite once. How the post-land re-run is replaced, and what that means for R0 (plumbing.gate-recovery, which exists to recover from that re-run failing), is recorded when decided.

## 2026-09-22 — typecheck stays; the gate and the start get smaller

Andrew: “Okay, I thought type check was something else. What don't we need in this process that is consuming brain and time?”

Andrew: “Okay, we can keep the type check. We can do all four of the things that you're recommending: Keep the type check. Cut the post-land pre-run. Clear the 57 landing review queue in one go. Stop printing at every start. Stop auto-loading GBH's Claude MD and engine chats.”

This supersedes the entry above on the typecheck: it stays in the gate. The four recommendations answered yes were: (1) keep the typecheck; (2) cut the post-land re-run of the full suite and the control battles, the effect-size battles, the every-10th-landing audit-all and the Game Builder rebuild out of the landing, and abandon R0 (plumbing.gate-recovery), which exists only to recover from the post-land re-run failing; (3) clear the review queue in one go and stop printing it at every start; (4) stop auto-loading GBH's CLAUDE.md into engine chats and keep each trap in one place.

## 2026-09-22 — the test suite runs in four parts

Andrew: “Why don't we split the test suite into four parts and then continue? Let's get work done here.”

The gate's full-suite check is split into four shards (vitest `--shard=k/4`), each run as its own command so each fits under Cowork's ~178 s shell limit. The gate accepts the suite only when all four passed on the exact tree being gated.

## 2026-09-23 — the August items the Codex replaced are abandoned; V2 R1 goes to the top

Andrew: “Answer question 1, yes, and continue.”

The question was: abandon the August items the Codex has replaced (Skeleton Archer, Ghoul Brute, Rally, Volley), after checking each against the Codex first, and put V2 R1 (shields) at the top of the queue. Checked 2026-09-23: the Codex fields the Skeleton Archer as unit.skeletal-archer (5 HP, 1 armour, 75 accuracy, movement 4 — not the backlog's 6/0/70/3); it has no Ghoul Brute (its ghoul is unit.ghoul, 9 HP, 0 armour, 90 accuracy, movement 6); and neither the Warrior's nor the Ranger's specialties carry a Rally or a Volley power.

## 2026-09-23 — less process per feature

Andrew: “Man, we are just not making any progress. This is so fricking slow. Do I just have way too much validation going on? I have literally used 30 commands, and we have not even gotten through shields.”

Andrew, asked for recommendations on four questions and given them: “Yes.”

Ruled, as recommended:
1. One chat carries a whole feature across engine, content and kingdom. Each package still commits in its own repository. "New chat after a wrap" stays; "new chat on every package switch" goes (DISPLAY-RULES.md rule 38).
2. A landing runs the item's own tests, typecheck and the control battles. The full suite runs once per chat, as the four shards, and `wrap` refuses to finish until all four passed on the final tree.
3. One backlog item per feature, not one per layer — sized to fit one chat. V2 shields is one item: shield class (landed), the three shields, weapon Block, and the kingdom's hands rule.
4. The seal and the exemptions go. The checks stay as pass or fail; engine-only work skips "appears in a battle" instead of taking an exemption.

The next engine chat makes these four changes first, then lands V2 shields end to end.

## 2026-09-23 — the kingdom gate fits a Cowork command

Andrew, told the kingdom landing could not finish in Cowork and asked to run it himself: “Okay, no, I'm not running any fucking thing. We have to shorten the check to make it so you can do it.”

Ruled: the kingdom gate takes the engine's shape from “less process per feature” above. The full suite runs as four shards (`node tools/gate.mjs --shard k/4`, from `kingdom/`), each recorded against the exact tree; a landing requires all four green on that tree and runs only typecheck, the claimed probes and the static checks. The separate every-P-tier-probe sweep and the post-land audit are cut — the P-tier probes are test files, so the shards run them.

Andrew, same chat, on letting `v2.shields-hands` also re-close ISC-003 (reopened by a fixture regeneration that this item repaired): “Okay, one is fine.”

## 2026-09-24 — the impassable terrain is `terrain.impassable`

Andrew, asked whether the impassable terrain is `terrain.impassable` (GROUND-REQUIREMENTS.md §1.1) or `terrain.obstacle` (the engine): “Terrain impassable.   And then continue. Do V2 R5 thorns.”

Ruled: the id is `terrain.impassable`; `terrain.obstacle` is retired everywhere (GLOSSARY.md "Settled, 2026-09-24"). The reserved prop shorthand `prop.obstacle.<hex>` is a different kind and is not renamed. The engine constant `TERRAIN.OBSTACLE` becomes `TERRAIN.IMPASSABLE`. This chat then takes V2 R5 Thorns.

## 2026-09-24 — Fast Hands and Slow Hands

Andrew, asked for the values of the two swapCost badges (COMBAT-V2-DESIGN-2026-09-07 §11.2): “The values for fast hands and slow hands are to reduce the stamina cost or increase the stamina cost by 1 for item swapping.  The value is fast hands -1 stamina and slow hands +1 stamina to item swap.”

Ruled: Fast Hands is swapCost −1; Slow Hands is swapCost +1. The TEST rows `test.badge.fast-hands` and `test.badge.slow-hands` (content 359cf85) already carry these values. The campaign badges are not yet authored in the Codex; when they are, they copy these numbers.

## 2026-09-24 — abandon works in Cowork

Andrew, asked whether to change the abandon tool so a Cowork chat can abandon items (overwrite each file back in place instead of deleting it): “One, yes.”

Ruled: `--abandon` (engine and kingdom `tools/gate.mjs`) reverts through `tools/revert-tree.mjs`: a tracked file that differs from HEAD is overwritten in place with HEAD's copy; a file HEAD does not have is moved into `<git dir>/_abandoned/<stamp>/`, never deleted; `.state`, `tools`, `scratch` and `node_modules` are left alone, as `git clean` spared them. The first three abandons ran under it the same day: v2.swap, terrain.impassable-naming, seam.spare-weapons. (A tooling choice belongs in GBH's SWITCHES.md, rule 18; GBH is not mounted in this chat, so it is recorded here and in the commit.)

## 2026-09-24 — the V2 defaults, reviewed

Andrew, shown the gameplay defaults from SWITCHES.md (swap: swapAi, swapHealthClamp, swapLimits; KDB: kdbBackDistance, kdbBursts, kdbBothOrder, standFirmAnyPush, kdbAgileIsTheBadge, kdbBadgeCarriers, kdbStrengthFloor; prone: proneNoCrawl, proneNoExpiry, proneAiStandsFirst; collisions: knockbackProtectionAbsorbs, knockbackFloorIsObstruction; Thorns: thornsOnKillingBlow, thornsDownedTarget, thornsPerHit; shields and weapons: weaponBlockFamilies, axeOnAnyBlock, weaponFirePoison, shieldPowerNames, shieldPowerNumbers; and the older V2 sections — the elemental resistance migration, V2 bursts, ordered attack packets): “All of those I reviewed and are fine.”

Ruled: each of those defaults stands as written in SWITCHES.md; their rows now read **ruled**. Three rows describe content not yet authored (kdbBadgeCarriers — no campaign unit carries Stand Firm or Giant yet; kdbStrengthFloor — 0-Strength rows not yet raised to 2; weaponFirePoison — no fire or poison on weapons yet): the present state is accepted, and the content remains to be written.

## 2026-09-24 — the ground table, re-ruled

Andrew, shown the V2 ground table as landed in `v2.ground-table` (COMBAT-V2-DESIGN-2026-09-07 §3.2) and asked about Atlas lava/rivers, trees, brush, meadow and rocky:

“They're not supposed to be impassable. They're supposed to be damaging terrain, like burning terrain, like fire.   I don't know if the lava stats have been fully defined.   Stepping into lava should inflict one burn.   Cost 2 movement points.  And inflict 3 fire damage.   Being in lava at the end of your activation should inflict 1 burn and inflict 3 fire damage.   Rivers are just water.   From a terrain standpoint, trees are supposed to be woodland, and high brush and barberry are supposed to become high bush. I don't know what that terrain is exactly, but it's a little bit of cover.   Open meadow floor, grass, and plains are all supposed to be the same. I don't know where that -10 range came from. No, there's no modifier. They have no modifier: 1 movement point, no modifier.   Rocky ground should do what it used to do. I actually want to change to create a new high thin obstruction.   Every tile of woodland is a high thin obstruction. If you shoot through a tile that is woodland, you get -5 range.  Things like signs, or an upright body of a villager, a tree, these things will all be thin, upright obstructions.  Actually, they're also going to reduce vision by one.  There is a full obstruction. If you get enough trees together, really dense trees, it becomes a full obstruction.  Or a pillar or a rock, those things can be full obstructions.   Bush should not have the +1 to move through.   Grass and wheat should not have -10 accuracy.   All right, should we go over all of the training modifiers?”

(The −10 was COMBAT-V2-DESIGN-2026-09-07.md:151–152.) Then, shown the whole terrain table and ten questions:

“No, grass/wheat has no -10 range against you. Oh, you mean tall grass/wheat? Okay, yeah, that is the same as bush.   There are quite a few different open terrains, some of which are called grass, but you mean like tall grass.   Okay, bush is just the same thing as tall grass and wheat. It's one move, -10 ranged against you.  There's no more forest. Low cover props are when you're next to them versus enemies that cross over it.  Woodland cost to move into   Woodland does not give -15 ranged and 7 melee when you're in it. It's a benefit to be in it.   Number 3: It is per hex. Target's own hex does not count.   High bush and all the other types of bushes and tall wheat and grass and all that do not do that tall thinning destruction of -5.   5. Yes, it can, and the -5 shooting in does apply. 6, correct.   Basically, there can be a tree that is a full obstruction, there can be a rock that's a full obstruction, or a house, or anything. It is always the same, so it doesn't really matter what the material is for a full obstruction. It just always behaves the same, but it can have different visual elements that create that full obstruction.  All of these things: wheat, grass, reeds. There's a bunch of different ones that are all the same, so we should just come up with one standardized name for all of them. They're all just different aesthetics for the same thing.   Hills are going to have +10 accuracy and +1 reach.   Water does keep its 2 move and -10 accuracy for the unit standing in it, but the move does not affect you standing in it. The move is when you move into water. It costs you 2.   Being in water has no effect on your movement. Any other terrain questions.  We do also have walls and towers.   And houses”

Ruled (supersedes COMBAT-V2-DESIGN-2026-09-07 §3.2's rows and, for rocky, §18's retirement of rocky's modifiers):

- **Open ground** — meadow floor, short grass, plains: one ground. 1 move, no modifier.
- **Tall vegetation** — tall grass, wheat, reeds, bush, high brush, barberry: ONE ground, many looks. 1 move to enter, −10 ranged accuracy against the unit standing in it. No thin-obstruction −5. One standardized name to be chosen.
- **Woodland** — every woodland hex is a high thin obstruction: −5 ranged per woodland hex a shot passes through, the target's own hex not counted; reduces vision by one. It does NOT give its occupant −15 ranged / −7 melee. (Its move cost: not stated.)
- **Thin upright obstructions** — trees, signs, an upright villager's body. A unit may stand in the hex. Each reduces vision by one.
- **Full obstruction** — dense trees, a pillar, a rock, a house: always behaves the same, whatever it looks like.
- **Lava** — damaging, passable ground, like burning ground. Entering costs 2 move and deals 3 fire and 1 Burn; at the occupant's end of activation, 3 fire and 1 Burn.
- **Water** — rivers are water. Entering costs 2 move; −10 accuracy for the unit standing in it; no other effect on movement. Burn/Poison strips unchanged.
- **Rocky** — as it was (v1: 2 move, −5 accuracy, +1 Armor, +1 Resist for the occupant).
- **Hills** — +10 accuracy, +1 reach.
- **Forest** (v1, +10 Dodge, +1 Armor) — gone.
- **Low cover** — applies when you are next to it against enemies whose attack crosses it (as built, v2.cover).

Not yet ruled, asked the same chat: woodland's move cost; what standing in woodland gives; whether a thin obstruction in the target's own hex counts (Q3 said no for woodland, Q5 said "the -5 shooting in does apply"); the standard name; whether hills' bonus is ranged only (§3.3); whether material still sets a full obstruction's destroy tier (§12, v2.prop-destroy); walls, towers and houses.

Andrew, same chat, answering the nine open questions (woodland cost, standing in woodland, own-hex thin obstructions, the name, hills, thin-obstruction cost, material, walls/towers/houses):

“Woodland costs 2 to move into.   Standing in woodland gives others who are targeting you a -15/-7. It's defensive training.   A thin obstruction in your own hex does not count against your own shot, only against those who are shooting you or people who are shooting through the hex.  Okay, let's call it tall vegetation undergrowth.  Reach only applies to range attacks, but let's make the 10 accuracy. It's only 10 ranged accuracy.   Send obstruction is free to move on to   material still decides how many hits to destroy, yes.   Now, do you not have the definition for houses, towers, and walls?”

Ruled (read with the two messages above; this one corrects them where they differ):

- **Woodland** — 2 move to enter. A unit standing in woodland: −15 ranged / −7 melee accuracy against it ("defensive terrain"). Every woodland hex is also a thin obstruction.
- **Thin obstruction, whose hex it counts in** — it never counts against a shot from its own hex. It counts against every shot INTO its hex (the target's own hex counts) and every shot passing THROUGH it: −5 ranged each. Free to move onto ("Send obstruction" = thin obstruction).
- **Undergrowth** — the one name for tall vegetation (tall grass, wheat, reeds, bush, high brush, barberry): 1 move, −10 ranged accuracy against the unit standing in it.
- **Hills** — +10 accuracy and +1 reach, both ranged attacks only (COMBAT-V2 §3.3 as written).
- **Material** — still decides how many hits destroy a prop (COMBAT-V2 §12, v2.prop-destroy); a full obstruction otherwise behaves the same whatever it looks like.

Andrew, same chat, shown DESIGN-DUMP-CLEANED.md §5 (the 2026-08-30 dictation: Building, Wall, Tower, Ruins, Marsh, Desert — never ruled) and asked whether its numbers stand:

“Oh, I do also want ruins, marsh, and desert too, yes.   Okay, a wall is a full obstruction.   Is something you can stand on  when you stand on it and you have an enemy who's not in a wall or a tower   they have -20 accuracy, and you get 10 block.  If you are in a tower and you have an enemy who is not also in a tower   they get -25% accuracy. You get 15 blocks and 1 armor.   Being in a tower also gives you +2 reach and +10 accuracy.   Being on a wall gives you +1 reach and +5 accuracy.    Being in a house if your enemy is not also in a house   they get -10 accuracy, and you get 5 dodge.   A marsh.   Cost 2 to move in.   Removes one fire at the end of activation.   Gives -5 accuracy and -10 dodge to whoever is in it.   Desert.   Gives -5 dodge. To whom's in it? .   Ruins behave like rocky ground.   Towers are also full of obstructions to those who are not in it.   Wall and tower do not apply to range attacks only.   Oh, getting up on a wall requires moving upstairs.   Imagine that there is a character on a wall. Another character runs up to the wall. They can attack the person on the wall, but they can't move up next to them on the wall unless there are stairs that let them go up.   Towers are for heroes only.  Any more questions?”

Ruled (supersedes DESIGN-DUMP-CLEANED §5's numbers where they differ):

- **Wall** — a full obstruction that can be stood on. Getting up needs stairs; a unit at its foot can attack the unit on top but cannot step up beside it. On a wall, against an enemy not on a wall or in a tower: the enemy −20 accuracy, you +10 Block. Standing on a wall: +1 reach, +5 accuracy. All attacks, not ranged only.
- **Tower** — heroes only. A full obstruction to those not in it. In a tower, against an enemy not also in a tower: the enemy −25% accuracy, you +15 Block and +1 Armor. Being in a tower: +2 reach, +10 accuracy. All attacks, not ranged only.
- **House** — in a house, against an enemy not also in a house: the enemy −10 accuracy, you +5 Dodge.
- **Marsh** — 2 move to enter; removes 1 Burn at end of activation; −5 accuracy and −10 Dodge to whoever is in it.
- **Desert** — −5 Dodge (to the unit in it).
- **Ruins** — behave like rocky ground.
- The dictation's −1 / −2 damage against wall, tower and building occupants, and its tower +3 reach / +15 accuracy, are not in this ruling — superseded.

Andrew, same chat, answering nine follow-ups (tower −25 flat or percent; Block or Ranged Block; tower entry; attacking into a tower; ZoC into a tower; enemies on walls; stairs and wall-top movement; houses; Climber on ruins):

“1. It's a flat number. The wall adds to both. I think let's have the tower cost 2 extra moves. Yeah, that works. It's just sort of like a door. A hero can move into it, but it costs 2 extra moves, so it costs a total of 3 moves for a hero to go into a tower. It's in the tower. Things can still attack it in the tower.   The tower is just an obstruction for shooting past it for other people, so it doesn't really have any effect on the person who's in the tower or the people who attack the person who's in the tower.   I think, actually, the zone control should reach into the tower. It's simpler. It's just the same because then leaving the tower is still, yeah, so I think we can still have zone controls.  Enemies can stand on walls.   So, I guess we should have a stair tile on the wall. There can be a wall that has stairs on it, and when there is, it costs one extra movement to move. You can only do it from one direction. There is one facing on the wall tile, one facing that has stairs or a ladder. If you move into the wall from that direction, it costs one extra, and you can move up on top of the wall.   Yeah, into a house through a doorhouse  when you are in a house, you can be shot from outside the house.   Climber badge will help on ruins the way it does in rocky ground. Yes, it should.”

Ruled:

- **Tower** — the −25 is flat. Entering costs 2 extra move (3 in all), "sort of like a door"; a hero only. Units outside can attack the hero inside normally; the tower obstructs only shots PASSING it. Zones of control reach into a tower as anywhere else.
- **Wall** — the +10 Block adds to both Block and Ranged Block. Enemies can stand on walls. A wall hex may carry stairs (or a ladder) on ONE facing: entering the wall hex from that side costs 1 extra move and puts you on top; from any other side you cannot go up.
- **House** — entered through a door. A unit in a house can be shot from outside.
- **Ruins** — the Climber badge helps on ruins as on rocky ground.

## 2026-09-24 — thin obstructions are a third kind of prop

Andrew, asked (v2.thin-obstruction) whether a sign, a single tree or an upright body is authored as a third kind of prop — a height `thin` beside `high` and `low`, walkable, −5 to shots entering its hex and −1 Vision, exactly like a woodland hex:

“Yes, it's a third kind of prop.”

Ruled: a prop's height is `high`, `low` or `thin`. A thin prop is a thin obstruction (see "the ground table, re-ruled" above). The name `thin` was the one put to him; he did not offer another. He asked in the same message to go over what counts as ground versus a prop, and how traps, bodies, graves, houses, walls and towers are structured — open, not ruled here.

Andrew, same chat, shown how a hex is held today (one ground, at most one painted surface effect, floor, any number of props high or low, corpses) and asked whether a hex should carry several surface effects at once:

“No, I think the surface effects just one, or it's confusing.   Okay, I understand the way that you are describing these things. From this standpoint, I think there is a new high thin prop.   If you were in a tile with a high thin prop -5 ranged attack you  and anything shooting through that: there's both -1 vision and -5 range to shoot through it.  If you are on it, you have no penalty.”

Ruled:

- **Surface effects** — one per hex, as built. Not a stack.
- **High thin prop** — a third kind of prop (height `thin` in data; "high thin prop" in speech). A unit in its hex: ranged attacks against it take −5. A shot passing through its hex: −5, and −1 Vision through it. The unit standing on it takes no penalty to its own shots. The same rule woodland's thin obstruction follows.

## 2026-09-24 — structures first, the ground-versus-props talk after

Andrew, at `start engine`, asked whether to go over ground versus props (traps, graves, bridges, cursed ground — not in the engine) before walls, towers and houses are built, or to build `v2.structures` now as ruled:

“Let's do what you have now. Just build the walls, towers, and houses. Is there anything else left to do after this?”

Ruled: `v2.structures` is built now, as ruled 2026-09-24 above; the ground-versus-props talk comes after it. How a structure is authored — a ground, with its stairs or door on the map (SWITCHES.md `structureAsGround`, `structureEntries`) — is the default that talk may overturn.

## 2026-09-25 — walls and towers do not shoot over; down the way you came up

Andrew, shown the `v2.structures` defaults (SWITCHES.md `wallDescent`: down from a wall on any side; `structureLines`: a unit on a wall or in a tower shoots, and is shot, over every structure between):

“To know walls and towers can't shoot past other obstructions and you're showing me to leave the walls in the same way you came up.”

Then, restating it a minute later:

“Walls and towers cannot shoot past other obstructions. You must leave the walls the same way you came up.”

Ruled:

- **Lines** — standing on a wall or in a tower gives no line over other obstructions. A wall, tower or house hex blocks every attack line passing through it, whoever is at either end; only the line's own two ends never block. Supersedes the `structureLines` height exception.
- **Leaving a wall** — only the way you came up: back down across its stairs side. Supersedes `wallDescent` (any side).

## 2026-09-25 — shooting along your own wall; Mage Kindle is wanted

Andrew, asked (1) whether to close `trigger.zombie.sap` and `trigger.mage.kindle` or build Kindle as its backlog row describes ("Mage: 100% onAttack — every swing, hit or miss — apply status.burn to target, value = ceil(partyMagicSum / 5)"), and (2) whether an archer on a wall should be able to shoot along its own wall, or be blocked by the next wall hex (the 2026-09-25 lines ruling above):

“Build Kindle is described.   Two is a great point. You should be able to shoot on the same wall.”

Ruled:

- **Mage Kindle** — build it as described (backlog `trigger.mage.kindle`). Zombie Sap was not answered; it stays as the backlog note has it (absorbed into the Weakness landing as `test.zombie.sap`).
- **The same wall** — the wall a unit stands on does not block its line: a shot along the wall top, or one that clips the next hex of that wall, is clear. Every OTHER wall, tower or house between still blocks (the 2026-09-25 ruling above stands).

## 2026-09-25 — shooting a unit on a wall; Kindle stays off the Codex Mages

Andrew, asked (1) whether the real Mage heroes in the Codex should carry Kindle too (it is built on the test Mage only, `test.mage.kindle`), and (2) whether an archer on the ground may shoot along a wall top at a unit standing on it, or only the unit on the wall gets the clear shot (SWITCHES.md `sameWallBothEnds`):

“2. Any range unit on the ground can shoot a unit on a wall. They just can't shoot past the wall to a unit that is obstructed by it. I don't know the answer. If the Mage, don't add anything to the Mage heroes in Codex. We'll add it later. If needed.”

Ruled:

- **Shooting a unit on a wall** — any ranged unit on the ground can shoot a unit on a wall; it cannot shoot past the wall to a unit the wall obstructs. As built (`v2.structures-same-wall`): the wall a line's end stands on does not block that line, from either end; every other wall, tower or house between still does. `sameWallBothEnds` is ruled.
- **Kindle on the Codex Mages** — do not add it. The test Mage alone carries it; "We'll add it later. If needed."

## 2026-09-25 — the Atlas ground compile writes into the three Atlas areas

Andrew, asked what "the Atlas ground compile" (the 2026-09-25 wrap's Next line; no backlog item or document defined it) should do — suggested: have the Atlas compiler write the new grounds and the wall, tower and house structures into the three Atlas areas — or skip it for `station.vs-target`:

“Write it into the three atlas areas.”

Ruled:

- **The Atlas ground compile** — build it: the Atlas combat compiler writes the V2 grounds and the wall, tower and house structures into the three Atlas areas (the frozen Priory, Angled Halls and Buried Pilgrimage fieldings, `ATLAS-COMBAT-INTEGRATION.md`). One backlog item, ahead of `station.vs-target`.

## 2026-09-25 — the Atlas ground compile is the outdoor maps

Andrew, told that the three Atlas combat areas (Priory, Angled Halls, Buried Pilgrimage) are dungeons whose every hex is authored `"dungeon"` floor, so writing the V2 grounds into them changes nothing; that the outdoor Atlas maps carry trees, bushes, tall wheat and houses but cannot be compiled for combat (the compiler refuses their `concealment` placements); and asked "Should I make the outdoor maps playable in combat, with trees as woodland, bushes and wheat as tall vegetation, and houses as houses, instead of changing the three dungeon maps?":

“Yes, make the outdoor maps playable in combat.”

Ruled (supersedes the entry above on where the compile writes):

- **The Atlas ground compile** — compiles the outdoor Atlas maps for combat: trees → `terrain.woodland`, bushes, barberry and tall wheat → `terrain.undergrowth` (tall vegetation), houses → `terrain.house`, per the 2026-09-24 ground table. The three dungeon areas stay as they are.

## 2026-09-25 — Atlas raised ground is not hills; the stalled outdoor maps stay unfielded

Andrew, asked (1) "The outdoor maps have raised ground like bluffs and ridges; should those count as hills in combat (+10 ranged accuracy, +1 reach), or stay just for looks?" and (2) "Do you want someone to look into why fights on greenway, stonecrown and opening-4 never finish, so those maps can be added too?":

“One no for now. 2, no.”

Ruled:

- **Atlas landforms** — not hills, for now: bluffs, ridges and rises stay presentation only. SWITCHES.md `atlasLandformsNotHills` is ruled.
- **greenway, stonecrown, opening-4** — no investigation; they stay compiled but unfielded. SWITCHES.md `atlasFieldedMaps` is ruled.


## 2026-09-25 — damage vs target: no percentages, added before the critical multiplier, bloodrunes count, both tags apply

Andrew, told that `station.vs-target` landed with a "+50% vs poisoned" test rule (the backlog item's expect), the station before the critical, worn-item (bloodrune) slayer left as a gap, and every matching rule applying; and asked (1) "Should a damage-vs-target bonus be multiplied by a critical hit, or added after it?", (2) "Should bloodrunes' slayer bonuses work next?", (3) "Holy Water against a vampire that is also undead — both (+2) or only the best (+1)?":

“I don't know what that +50% damage versus poison came from. There had been no percentage modifiers to damage under things that I have authored.   With the exception of critical hit, the initial damage should be resolved, then the roll for critical hit. There can then be bonus damage. There are things that can trigger on critical hit.  Then, after all of that, we roll the critical hit, and that can create a multiplier.  So you're not applying the damage versus target at some later stage. You're applying it earlier when all the other damage types are being applied.   Bloodrune Slayer bonus happens: the damage versus target bonus. That's typically what a lot of those are.   If a weapon's bonus matches the target twice (holy water against vampire and undead), apply both.”

Ruled:

- **No percentage damage modifiers** — nothing authored modifies damage by a percentage; the critical hit is the only multiplier. The "+50% vs poisoned" was an engine session's example (backlog `station.vs-target` expect, from TRIGGER-NOTES), never authored. A `vsTarget` rule is a flat `add` only; the `percent` field goes (SWITCHES.md `vsTargetPercent` is superseded).
- **Order** — damage vs target is added with the other damage, before the critical multiplier: `DMG.VS_TARGET` 400, before `CRIT` 450, stands. SWITCHES.md `vsTargetStation` is ruled.
- **Bloodrunes** — a bloodrune's slayer is a damage-vs-target bonus and works. SWITCHES.md `vsTargetWornItems` (a named gap) is superseded; backlog `fix.vs-target-worn-and-flat` builds it.
- **One weapon matching a target twice** — both apply (Holy Water vs a vampire that is also undead: +1 and +1). SWITCHES.md `vsTargetStacking` is ruled.
- **Open, asked** — "bonus damage … then we roll the critical hit, and that can create a multiplier" may mean bonus damage packets (the Hand Axe's +4 on a critical, the Bane Blade's +6) are multiplied too; today they are not (`V2-DAMAGE-PACKETS.md` lines 9–10: secondary values do not repeat the critical multiplier). Not changed until answered.


## 2026-09-25 — bonus damage packets and the critical: as built; a bloodrune's slayer reaches everything

Andrew, asked (1) "Did you mean on-critical bonus damage (the Hand Axe's +4 on a critical, the Bane Blade's +6) should also be multiplied by the critical? Right now it isn't (V2-DAMAGE-PACKETS.md, lines 9–10)" and (2) "Should a bloodrune's slayer bonus apply to every attack and power the hero makes, the way a badge's does?":

“I don't have strong opinions one way or another for the bonus damage before or after the critical multiplier.  So if you've already done it one way, that's fine.   2, yes.”

Ruled:

- **Bonus damage packets and the critical** — stay as built: secondary packets are not multiplied by the critical (`V2-DAMAGE-PACKETS.md` lines 9–10). The open question in the entry above is closed.
- **A worn item's damage vs target (bloodrune slayer)** — reaches every attack and power the hero makes, the way a badge's does. The default named in backlog `fix.vs-target-worn-and-flat` is ruled.


## 2026-09-25 — Sprint: no one has it for now; three queue items closed as delivered

Andrew, asked (1) "Should I close `fix.start-of-turn-victory`, `fix.outcome-enum` and `hook.on-enter` as already done by `a6ec245`, the way `v2.swap` and `trigger.zombie.sap` were closed?" and (2) "Should anyone get Sprint, or should it be cut? The 15 Aug note on the item gives it to the Rogue, but the Codex from 21 Aug gives the Rogue Side Roll instead, and `COMBAT-DESIGN.md` line 525 marks it "Not ruled."":

“One, yes.   Rogue side roll. No one gets sprint for now.”

Ruled:

- **`fix.start-of-turn-victory`, `fix.outcome-enum`, `hook.on-enter`** — closed as superseded by `encounter.runner` (`a6ec245`, 2026-09-03), whose backlog note says it carries all three with their assertions in `test/encounter-runner.test.ts`.
- **The Rogue's movement** — Move and Side Roll, as the Codex has it (2026-08-21). The 2026-08-15 "Rogue Sprint" in backlog `move.actions` is superseded.
- **Sprint** — no one gets it, for now. No Codex row, no grantor. `COMBAT-DESIGN.md` line 525's "Not ruled" is answered. `move.actions` closes: movement chosen from a list landed as `movement.powers` (`ba09f6a`), `pack.moves` and `fix.movement-plans`, and Sprint was its only remaining content.

## 2026-09-25 — the engine's viewer items close; the viewer package owns the battle screen

Andrew, asked (1) "Should I close the nine engine `viewer.*` items (hexvfx-path, geometry, build, board, tile-state, panel, pump, log-transport, styles) as replaced by the viewer package, and move what's still unfinished (their own effects for stun, slow and protection, and ground that stays burning or frozen) to the viewer package's work list?", (2) "May I delete the empty `assets/vfx/` folder and change that one doc line to point at `viewer/src/hexvfx.js`?", (3) "`content.art-manifest` (one art file keyed by Codex ID, with each unit's aspect and height) was written for the same old viewer build. Should I close it too, or keep it as content work?":

“1. Yes
2. Yes
3. Close it.”

Ruled:

- **`viewer.hexvfx-path`, `viewer.geometry`, `viewer.build`, `viewer.board`, `viewer.tile-state`, `viewer.panel`, `viewer.pump`, `viewer.log-transport`, `viewer.styles`** — closed as superseded by the `viewer/` package (its own repository since 2026-09-02, `THREE-PACKAGES-PLAN.md`). The rows were written 2026-08-21 against `VFX/hexVFX.js` and `build-replay.mjs`, neither of which exists now; the library is `viewer/src/hexvfx.js`.
- **Still unfinished, carried to the viewer's work list** (`VFX/VISUAL-BATTLE-UPDATES.md` §4): stun, slow and protection still borrow the shadow, frost and weak hexVFX styles (`viewer/src/theme.js` line 89). Ground that stays burning, frozen, poisoned or dark was found already drawn (`viewer/src/board.js`, "the painted ground layers", 2026-09-03), so nothing is carried for `viewer.tile-state`.
- **`assets/vfx/`** — the empty folder is deleted and `VFX/BATTLE-SCREEN-VFX-DECISIONS.md` points at `viewer/src/hexvfx.js`.
- **`content.art-manifest`** — closed.

## 2026-09-25 — masterwork: one-handers and shields too

Andrew, reading the wrap's note that `item.longsword.masterwork` cannot exist because masterwork is "two-handers and armor only" (GEAR-DESIGN.md §3; SWITCHES.md `longswordMasterwork`):

“Masterwork should not only apply to two-handed armor. It can also apply to a shield. It can also apply to a one-hander.”

Ruled:

- **Masterwork** applies to tier-1 two-handers, one-handers, shields and armor. GEAR-DESIGN.md §3 line "two-handers and armor only" is replaced, and "No shield is ever masterwork or enchanted" now reads that a shield may be masterwork (it is still never enchanted — not ruled otherwise).
- **What masterwork gives is unchanged** — +1 Max Stamina, ×1.5 Supplies, tier 2. The ruling widens which items can be masterwork, nothing else.
- **Owed:** `fix.masterwork-scope` — content's `mkenginepack.mjs` and the kingdom's `tools/mk-items.mjs` both hard-code "two-handers and armor, never a shield"; both change, and `item.longsword.masterwork` then exists, as `pack.derived-rows` originally expected.

## 2026-09-26 — the AI: modes per unit type, scoring inside them, encounter rules on top

Andrew, asked from `AI-DESIGN.md` §10 (`system.ai-modes`): (1) "Should each unit weigh all its options by score (a mode is a set of weights you tune as data), instead of following a fixed list of rules per mode as it does today?" (2) "In the balance simulations, should heroes play as well as the engine can, or like a typical player?" (3) "When an enemy has a buff or a heal, should the row say when to use it, should the engine work out what it is worth, or both?" (4) "Should enemy sides coordinate by default (one shared target, screen the back line), or only the factions and units you mark?":

“1 we need to use a mix of both things.   We're going to play as well as the engine can.  3. It's going to be both.  We can use simplified versions early on, but we're going to use simulation eventually to figure out more ideal AI behavior.   However, a bunch of these behaviors will be based on characteristics.   There will be units that are dumb, like zombies. There will be units that prioritize the defense of other units.   There will also be scoring in terms of what abilities to use when and who to attack.    There's going to need to be some group coordination. In some instances, we might have to anchor units into a single location or give them other goals that might not be inherent to that unit all the time.   So, unfortunately, the answer to all these questions is all of these things. Sometimes they will work together. By default, they will not work together. By default, we basically have a mode for each type of unit.   But we can have some overarching rules that could apply based on an encounter.”

Ruled:

- **Rules and scoring, both.** A unit's behaviour is its characteristics (fixed rules — a zombie is dumb; some units prioritise defending others) plus scoring of which ability to use when and whom to attack.
- **Heroes in the simulator play as well as the engine can.**
- **Ability use: both** the row's own guidance and the engine's valuation. Simplified versions early; simulation later to find better behaviour.
- **By default, one mode per type of unit, and units do not work together.**
- **Encounter rules on top:** an encounter may impose overarching rules — group coordination, anchoring units to a location, or goals not inherent to the unit.
- `AI-DESIGN.md` is rewritten to this ruling; `system.ai-modes` `expect` ("an AI design exists that Angela has ruled on") is met by this entry.

## 2026-09-26 — the AI: a framework now; modes can change; no intent shown; the AI sees all but the stealthed

Andrew, asked from `AI-DESIGN.md` §10: (1) "Can a unit's mode change mid-battle, like a brute that runs when badly hurt or a boss that fights differently below half health?" (2) "Should players see what an enemy is about to do before it acts, or only find out when it moves?" (3) "Should the AI know only what a player could know (the odds, not the dice roll), or may it see everything?":

“I guess the answer is, to one, yes. You have to understand that the AI behavior is going to be a massive component in this game, massive. We're not trying to address all of that right now. We do need a framework. The logic of the game has to support us having all of these things in AI.   There's no current projection planned.  3. No, the AI is going to know everything because it's going to allow us to behave a little bit more intelligently. The players also really get to know everything because they can click on a unit and see all of its stats. In theory, a player (except for stealth units and later phases that haven't been revealed) has full insight into everything on the battlefield. They can conventionally click an enemy, see all of their powers, and see all of their stats.  But in the interest of trying to get the AI smarter, we need to have the AI know everything. Except for stealth units.   Stealthed.”

Ruled:

- **A unit's mode can change mid-battle.**
- **Scope now: the framework, not the behaviours.** AI behaviour is "a massive component in this game"; the engine's logic must support all of it, but it is not all built now.
- **No enemy-intent projection is planned.**
- **The AI knows everything, except stealthed units.** Players see nearly everything too (any unit's stats and powers), except stealth units and later phases not yet revealed.
- *Reading, not ruled:* "everything" is taken literally — the AI also knows unrevealed later phases. Hero traps are "invisible to enemies" in `COMBAT-DESIGN.md` line 704 and share the stealth machinery; whether the AI sees them is asked, not assumed.

## 2026-09-26 — the AI does not see an invisible trap; system.ai-modes closes as delivered

Andrew, asked (1) "Does the AI see the players' traps, given that `COMBAT-DESIGN.md` line 704 says hero traps are invisible to enemies?" (2) "Should I close the design item (`system.ai-modes`) as done now that you've ruled on the design, so the queue moves to the legal-actions list next?":

“Yeah, if it's truly invisible, if there's a trap that is invisible, they won't see it.   I think two, yes.”

Ruled:

- **An invisible trap is not seen by the AI.** The AI knows everything except stealthed units and invisible traps (`COMBAT-DESIGN.md` line 704 stands).
- **`system.ai-modes` closes as delivered** — the design is `AI-DESIGN.md`, ruled in the three 2026-09-26 entries above; the work continues as `ai.action-list`, `pack.enemy-actions`, `ai.scorer`, `ai.mode-change`, `ai.encounter-rules`, `ai.sight`.

## 2026-09-26 — no balance adjustments now; features first

Andrew, asked "Hellhounds biting twice now wipes the party in The Kiln by Turn 5, before the fire reaches anyone. Should The Kiln get easier, or should the fire's test prove the fire in a smaller scripted battle instead?":

“v we're not working on balance adjustments. We're trying to get all the features in.”

Ruled:

- **No balance adjustments now; the work is getting every feature in.** The Kiln is not made easier.
- A test whose claim is a mechanism, and which failed only because a battle's outcome moved, proves the mechanism on a scripted battle instead (Law 10, flagged) — `fix.kiln-fire-test`.

## 2026-09-27 — stealth gets a Codex row and its own backlog item

Andrew, asked after ai.sight landed (1) "Should the Codex get a real stealth status row, using the settled wording at CODEX.md line 475 ('you cannot be seen and cannot be targeted by an attack…')?" (2) "Should stealth be queued as its own backlog item, covering the targeting rule, breaking on an attack or a power, and reveal effects?":

“1. Yes
2. Yes”

Ruled:

- **The Codex gets a `status.stealth` row**, its sentence copied from the settled stealth definition (`CODEX.md` line 475: "you cannot be seen and cannot be targeted by an attack. Area effects, terrain and auras all still reach you. It breaks the moment you use an attack or a power, and whenever a reveal effect finds you — moving never breaks it"). Copy, don't invent: any field that definition does not give is a switch, not a guess.
- **Stealth is queued as its own item, `capability.stealth`**: the targeting rule, breaking on an attack or a power, and reveal effects. It builds on ai.sight's `hidesFromFoes`.

## 2026-09-27 — the Necromancer's Raise reaches 10

Andrew, asked "The Necromancer's Raise has no range on its row. Compiled as 2 (its aura's radius — the encounter session's reading). Rule it.":

“Give the necromancer a raise of 10 range.”

Ruled:

- **The Necromancer's Raise has range 10** — a corpse within 10 hexes can be raised as a Zombie. The number lives on the Codex row (`content/gen/enemies-authored.json`, the Raise trigger's `range`), not in the converter; `SWITCHES.md` `corpseRaiseRadius` (the assumed 2) is retired by this. Queued as `fix.raise-range`.

## 2026-09-27 — Surge: a pool that pays 100 per Surge

Andrew, asked what the difference is between the progression schedule and the Codex on Surge:

“There is a stat which is surge gain per turn, then you have your amount of surge because lots of things can give you surge or take away surge.   And then, during the end step, you roll against your surge to see if it's used. If it's used, it should take away 100. If you have 150 surge, automatically you're going to have a surge activation, and you're going to lose 100 and still have 50.”

Ruled:

- **Surge is two things: a stat, the Surge gained each Turn, and the unit's amount of Surge** (the engine's `surge` and `surgeChance`), which other things may raise or lower (Knocked Sprawling's −50 Surge is one).
- **The check rolls against the amount. A Surge that happens takes away 100** — it does not empty the amount. 150 Surge surges automatically and keeps 50. The engine today sets the amount to 0 on a Surge (`src/core/battle.ts`, COMBAT-SEQUENCE.md Surge check rung 2) — that changes. Queued as `fix.surge-spend`.
- **Not ruled here:** how much Surge a hero gains each Turn — the Codex says it equals the level, the schedule says 0 + specialty. Still open, in the questions inbox.

## 2026-09-28 — a Surge below 100 stops at 0

Andrew, asked "Are you happy for a Surge below 100 to stop at 0 rather than go negative (`surgeSpendFloorsAtZero`)?":

“yes, surge should stop at zero if it goes negative.”

Ruled:

- **A Surge that happens below 100 leaves the amount at 0, never below.** SWITCHES.md `surgeSpendFloorsAtZero` (default on, built by `fix.surge-spend`) is answered: on.

## 2026-09-28 — the staff-vs-bow check runs against the Codex's armored enemies

Andrew, asked "Should the staff-vs-bow check run against the Codex's armored enemies, like the Skeleton and Bruiser Demon, instead of the Ghoul Brute that was cut?":

“One, yes.”

Ruled:

- **`content.mage-staff` no longer waits on `unit.brute`** (closed as superseded 2026-09-23). It sweeps staff against bow on the Codex's armored enemies (13 bestiary rows carry armor > 0 today — `unit.skeleton` 1, `unit.bruiser-demon` 4 among them) and on an unarmored one.

## 2026-09-28 — Kingdom waits behind the first six battles

Andrew, planning Kingdom and the weapon mechanics, on `KINGDOM-V2-2026-09-07.md`'s opening (six missions on the Retaking Abbotown conquest map, 2026-09-27):

“I kind of like to postpone the Kingdom beyond those six stages until after we get a playable loop through the first six battles, rewards, and all the things that are happening in those six battles. We can postpone all of the other Kingdom stages other than the ones that relate to this first six.”

Ruled:

- **The next Kingdom target is a playable loop through the opening's six battles** — the battles, their rewards, and everything that happens in and between them.
- **Every other Kingdom stage is postponed** until that loop plays: V2-ROADMAP.md R9's items that the opening does not use, and the post-opening Kingdom (expedition selection, conquest regions, dungeons). What the six battles need is scoped by the questions asked the same night.
- The same night's weapon, counterattack and enchantment dictation is recorded verbatim in `V2-SHIELDS-AND-WEAPONS-2026-09-20.md` (sixth pass); it is not yet ruled into rows.

## 2026-09-28 — counterattack, special free attacks, the opening six, shields, custom weapons (answers to the 22 questions)

Andrew, answering the 22 numbered questions put to him on the weapon dictation (V2-SHIELDS-AND-WEAPONS-2026-09-20.md sixth pass) and the opening loop:

> Crap, that was a really big misunderstanding and counterattack. No.  Counterattack is set off by being attacked, not by being hit, blocked, or dodged.      We need to settle on all the weapons because a bunch of these are going to replace weapons, but there are also some weapon classes that were not covered here. There are some like daggers, throwing knives, bows, and everything. We need one master weapon list now, which removes the weapons that have been replaced and keeps the ones that have not, so I can approve all of them. Orphanage
>
> * village outskirts
> * lumberjack house
> * bridge
> * cavern
> * trail
> * gates
> * cathedral
> * town
>
>  Yes. Yep, I think we're going to switch to the key battles. Any of these six battles, you replay it if you lose it. We're going to have wounds, but not fatigue.   We're going to pick up civilians. We're going to have two civilians in the orphanage: an orphan child and the school teacher. We're going to have two civilians in Battle 2, and I think that'll be it. I think we'll just have four civilians in the beginning.  Yeah, counterattack and counterattack are the same thing. Let's use counterattack. You can counterattack once per enemy action, so if that enemy action is three attacks, all three of their attacks will resolve, and then you will get your one counterattack.   Yep, we're changing attack of opportunity, so it's using the same rules as everything else. No stamina, uses the basic attack.  Until the end of next turn. Yep, Counter Strike and Spear Fend are very similar in that regard. One is triggered by attacking, and one is triggered by moving into your zone of control.   And fumble damage is the same as attack of opportunity. Yes, it can stop you from moving.  I gave a longsword two different second powers: free attacks. I think you just kind of misheard me. The counter strike is with +10 accuracy. That's the one it has. Costs 2 stamina.   13, correct?  For the most part, they're going to replace the weapons, but let's make a list, and I want to be able to look at all of them in one place.   A weapon enchantment giving strength should actually just give damage to the weapon, so the weapon damage should go up.  Crit and accuracy relate to that weapon's attacks.   Stamina, luck, block, dodge, and armor can all be conveyed. Those are all defensive or endurance.  I want a list of all the weapons for 16. Let's keep Tower getting -1. Let's update to these numbers, but let's change Kite to +20 + 5, and let's add in that -1 max stamina to Tower.  In general, use all the things I just put in there.   The round shell has both powers.   Yeah, we'll have:
>
> * Iron Round
> * Iron Knight
> * Iron Tower
> * Iron Kite no, you misunderstand enchantments. Enchantments are tier 2. Beyond that, there are custom weapons that are tier 3, 4, 5, 6. That's what these are. When I say enchantments, what I mean is there's a weapon, a longsword. It's a tier 5 flaming longsword. We have a bunch of those. Go and come up with names for them that don't have names.

Ruled (read against the numbered questions; anything uncertain is listed under "Still asked"):

- **Counterattack is the one name** (not counterstrike). It is set off by **being attacked** by an adjacent melee attacker — not by being hit, blocked or dodged. **Once per enemy action**: every attack of that action resolves, then the one counterattack.
- **Special free attacks — counterattack, fend, the attack of opportunity — are one rule:** the basic attack, **no stamina**, −20 Accuracy. **The attack of opportunity changes to this rule** (replacing the 2026-08-20 "the attacker chooses one of their attacks … they do pay stamina").
- **Fend** lasts **until the end of your next turn**, like a counterattack power; it is triggered by an enemy moving into your zone of control. Its damage works as the attack of opportunity's does: **it can stop the mover**.
- **The longsword's second power: counterattack with +10 Accuracy, until the end of your next turn, 2 Stamina.** There is no "free attacks with its other attack" power.
- **Sweeps:** "the target to their left" is the next hex around the attacker, as the attacker sees it — confirmed.
- **Weapons:** for the most part the new families replace the existing weapons; **one master weapon list**, replaced weapons removed and the rest kept — daggers, throwing knives, bows and every class the dictation did not cover — for Andrew to approve in one place.
- **What a weapon's enchantment or custom tier may convey:** Strength becomes **the weapon's damage** (its attacks go up); **Crit and Accuracy apply to that weapon's attacks**; **Stamina, Luck, Block, Dodge and Armor may be conveyed** to the wielder ("defensive or endurance").
- **Shields: the sixth-pass numbers stand, except Kite is +20 Block / +5 Ranged Block; Tower keeps −1 max Stamina.** "In general, use all the things I just put in there." The **Knight shield** is a fourth shield. **The Round shield has both powers.** **Iron is a version of each: Iron Round, Iron Knight, Iron Tower, Iron Kite.**
- **Enchantments are tier 2. Tiers 3–6 are custom weapons** — e.g. "a tier 5 flaming longsword" — and the dictated series are those custom weapons. Unnamed ones get names proposed by this chat.
- **The opening:** a lost opening battle is **replayed**; **wounds apply, fatigue does not**; **four civilians** in the opening — two in the Orphanage (an orphan child and the school teacher), two in battle 2.

Still asked (the next reply): the location list names nine places for six battles; "switch to the key battles"; whether the dictated on-block, on-dodge and on-melee-hit counterattacks (the bow staff's "counterstrike on block", the Retaliator's "free special attack on block") are retired by "set off by being attacked".

## 2026-09-28 — the opening's six battles, in order

Andrew, asked "Your battle list names nine places (Orphanage, Village Outskirts, Lumberjack House, Bridge, Cavern, Trail, Gates, Cathedral, Town); is the opening nine battles now, or which six are the battles?":

> Okay, Village Outskirts is being replaced by Lumberjack House.  There's no town.  It's just:
>
> * orphanage
> * lumberjack
> * bridge
> *
> * gates
> * cathedral I have a specifically designed hex map already for each one of those. Cavern and Trail is one.

Ruled:

- **The opening is six battles, in this order: Orphanage → Lumberjack House → Bridge → Cavern Trail → Gates → Cathedral.** Lumberjack House replaces Village Outskirts; Cavern and Trail are one battle; there is no Town battle.
- **Each of the six has its own specifically designed hex map already** (Andrew). The provisional order read from IMG_5078.jpeg in KINGDOM-V2-2026-09-07.md (2026-09-27) is superseded.

## 2026-09-28 — custom weapons are series across base weapons; the flaming longsword; new relics and bloodrunes

Andrew, asked "Is each custom weapon a single item (one Flaming Longsword), or a series that can sit on many base weapons?", "The existing named weapons at tier 2 and up … do they stay as their own weapons?" and "Is the fixed flaming sword the party gets after battle 2 the tier-3 Flaming Longsword?":

> The idea is that now each custom weapon is a series of different weapons. For example, there could be:
>
> * a flaming axe
> * a flaming longsword
> * a tier 3 flaming axe
> * a tier 4 flaming sword
> * a tier 5 flaming halberd these will be rewards that you can pull. Although you basically pull for weapons and shields, you pull tier 3.   They can stay at tier 2 for right now, the ones that are already tier 2.  Yeah, let's do a flaming long sword, standard tier 3. Yes, that's what you're going to get after battle 2.    I've also got a couple of new relics:
>    * A tier 1 relic gives -2 health but +10 melee block and +5 range block.
>    * A tier 1 relic gives -10 accuracy but +22 special attack accuracy.  Then I have tier 2 versions of these:
>       * The first one: -2 health, -1 armor, and you gain 20 melee block and 20 range block.
>       * The tier 2 version of the second one: you get -15 accuracy, but you get +40 to special attack accuracy.  Then I have some Bloodrune:
>          * 1 on kill, gain 5 melee block
>          * 1 on kill, gain 10 range block
>          * 1 on block, gain 1 strength
>          * 1 on block, gain 2 precision
>          * 1 on miss, gain bloodlust and lose 2 stamina

Ruled:

- **Each custom weapon is a series across base weapons** — a Flaming Axe, a Flaming Longsword, a Flaming Halberd — at tiers 3 to 6. They are rewards drawn in the reward pull; "you basically pull for weapons and shields, you pull tier 3."
- **The existing named tier-2 weapons stay at tier 2 for now.**
- **The reward after opening battle 2 is the standard tier-3 Flaming Longsword.**
- **New relics:** tier 1: −2 Health, +10 Block, +5 Ranged Block; tier 1: −10 Accuracy, +22 Accuracy on special free attacks. Their tier 2 versions: −2 Health, −1 Armor, +20 Block, +20 Ranged Block; −15 Accuracy, +40 Accuracy on special free attacks.
- **New bloodrunes** (read as tier 1): on kill, +5 Block; on kill, +10 Ranged Block; on block, +1 Strength; on block, +2 Precision; on miss, gain Bloodlust and lose 2 Stamina.
- Names, durations and what "gain Bloodlust" gives (CODEX.md 1198 has Bloodlust as a Berserker stance power) are asked back, not assumed.

## 2026-09-28 — two new trinkets: counterattack and fend on demand

Andrew, the same night:

> Then I have two trinkets:
>
> 1. Granting Firestrike, Counterstrike: free use, stamina 1, until the end of your next turn, gain Counterattack, cooldown 7.
> 2. Granting Fend Attack: free use till the end of your next turn, gain Fend Attack, cooldown 7, cost 1 stamina. Those are both trinkets.

Ruled:

- **Trinket 1 grants a power:** free use, 1 Stamina, cooldown 7 — gain Counterattack until the end of your next turn.
- **Trinket 2 grants a power:** free use, 1 Stamina, cooldown 7 — gain Fend until the end of your next turn.
- "Free use" is read as a free action (it spends neither the movement nor the primary action). What "Firestrike" names in the first is asked back, not assumed.

## 2026-09-28 — the Armory Ledger is approved for now

Andrew, on the Armory Ledger (every weapon, shield, custom tier 3–6 series, tier-2 enchantment, relic, bloodrune and trinket from that night, 148 rows; the page's defaults answer the questions flagged on its rows):

“Okay, all of these armors and weapons that you sent me are going to be approved for now. We're going to revisit it later when we're dealing with balance.”

Ruled:

- **Every row of the Armory Ledger is approved as shown**, including the names and readings Claude proposed and the defaults its row questions state. **It is revisited at balance**, not before.

## 2026-09-28 — the opening's maps: whole size, the painted gate, ground types by letter; the first two battles are clear-the-map

Andrew, asked which Gates map, whether the big maps are used whole, whether Claude or he assigns ground types, and what counts as a rescue:

> Why don't you show me all the maps you have in a viewer? Yeah, all these maps should be sized to the right size.  It should be the more recent Abbotitown gate painted.  And the maps should be capable of aligning pretty well with low cover, terrain, trees, and all the various terrain. It looks like it traces back pretty well, but we can discuss each of the maps. You should assign each ground type and then give me a preview map with a letter for what each of the ground types is, and I can just verify that's what I think that's supposed to be.  The rescue battles aren't really defined differently. I think for both of these first two battles, we're going to have victory be "kill all the enemies, clear the map of all enemies."

Ruled:

- **The six opening maps are used at their own size** (Orphanage 20×14, Lumberjack House 20×14, Bridge 40×20, Cavern Trail 40×16, Gates 50×20, Cathedral 20×40).
- **Gates is `assets/battle-atlas/maps/abbotown-gate-painted.json`**, the more recent painted gate.
- **Claude assigns every hex's ground type** from each scene (low cover, trees, water, walls, all of it), and shows a preview with **a letter per hex** for Andrew to verify, map by map.
- **Battles 1 and 2 (Orphanage, Lumberjack House): victory is clearing the map of every enemy.** A rescue battle is not a different kind of battle.

## 2026-09-28 — cursed ground gives Weak; the cave mouth; bank boulders; which rivers are deep

Andrew, asked what cursed ground does, whether units can enter the cave mouth, whether the riverbank boulders block movement, and whether the rivers are deep:

> Cursed ground is a ground mechanic.  You should have records on what that does. When you move onto it, you gain 1 week at the end of activation. If you're on it, you also gain 1 week. I think the couple of tiles that you can see, you can move into the cavern, but you can't go any deeper.  The boulders on the riverbank should be low cover. The river in the Orphanage is like a regular water tile. All those are water tiles. The bridge in Cavern is too deep to cross.

Ruled:

- **Cursed ground is a ground mechanic: moving onto it gives 1 Weak at the end of that activation, and ending an activation on it gives 1 Weak.** "Week" is read as **Weak** (status.weak), the status the ground carries — a dictation reading, confirmed back to Andrew. The records it lands on: COMBAT-DESIGN.md 700 (the terrain status layer carries Curse, "applied once on entry and again at the occupant's end of turn") and VFX/GROUND-REQUIREMENTS.md 60 (`status.curse` "named in the terrain layer, defined nowhere"); the corpse and grave tiles are cursed ground (AFTERMATH.md 2026-09-23).
- **Cavern Trail: the few cave-mouth hexes you can see are enterable; nothing deeper.**
- **Riverbank boulders are low cover.**
- **The Orphanage's river and lake are ordinary water (terrain.water).** The river on the Bridge and Cavern Trail maps is too deep to cross ("The bridge in Cavern is too deep to cross", read as both of those rivers).

## 2026-09-28 — Battle 1 (Orphanage) redefined; battle 2's civilians are two units

Andrew, given the five old opening encounters in full to redefine them for the new maps:

> We'll change the two zombies and a child to two zombies, an orphan child, and a school teacher. The orphan child and school teacher should be in two of the hexes to the left of the house, right next to the house. Zombies are going to start on the right edge.   No retreat because you're surrounded.   Turn 4, we're going to have a zombie arrive from the bottom edge to the immediate left of the water. Turn 5, we're going to have a zombie arrive from the left edge, center.   Second battle is Lumberjack and wife. They're two different units.

Ruled:

- **Battle 1, Orphanage** (was "Two Zombies and a Child"): **two Zombies, an Orphan Child and a School Teacher.** The Orphan Child and the School Teacher (civilians) stand in two hexes immediately left of the orphanage, right next to it. **The two Zombies start on the right (east) edge.** **No retreat — you are surrounded.** **Turn 4: one Zombie arrives from the bottom edge, immediately left of the water. Turn 5: one Zombie arrives from the left edge, centre.** Victory is clearing the map (ruled earlier the same night).
- **Battle 2, Lumberjack House: the two civilians are the Lumberjack and his Wife, two separate units.** (The old Surrounded fielded them as one grouped unit with a Farmer.)
- Exact hexes are Claude's reading of these words on the Orphanage map, shown on the Abbotown Ground Check page for Andrew to check: civilians (12,1) and (13,2); Zombies (19,3) and (19,5); Turn 4 arrival (9,13); Turn 5 arrival (0,6). Not stated and asked: the hero's start hex and whether the old ten-turn loss limit stays.

## 2026-09-28 — civilians dying is its own punishment; battle 2's start

Andrew, the same minute:

> Now, there's no failing the objective if units die. The units dying is their own punishment. Start is 3 zombies on the right. Lumberjack and wife start 6 squares in on the trail.

Ruled:

- **A civilian dying does not fail the battle.** "The units dying is their own punishment." (Supersedes the old Surrounded rule that either objective civilian's death failed the objective; read as holding for the opening's civilians generally.)
- **Battle 2, Lumberjack House: the start is three Zombies on the right (east) edge. The Lumberjack and his Wife start six hexes in along the trail.**
- The rest of battle 2's schedule stands as revised 2026-09-21 (ENCOUNTER_DESIGN_CONCEPT.md): Turn 1, end of the Enemy Phase, one Skeletal Archer from the bottom edge; Turn 3, one Skeletal Archer from the top and one from behind the heroes; Turn 4, three Fast Zombies; Turn 5, one Soldier Undead from behind the heroes. No retreat. Victory: clear the map.
- Exact hexes are Claude's reading, shown on the Abbotown Ground Check for Andrew to check: "six in along the trail" counted from where the cart track enters at the lower-left, Lumberjack (5,9) and Wife (6,9); Zombies (19,3), (19,4), (19,8) — the east-edge hexes that are not graves or forest.

## 2026-09-28 — battle 2's final schedule; the Schoolhouse goes; battle 3 (Bridge); battle 4 (Cavern Trail) is the Hunt

Andrew, continuing to redefine the opening encounters for the six maps:

> Okay, we'll start with 3 zombies, and then the same turn 1, the same turn 3. We're going to skip turn 4. On turn 5, we're going to be the same.   No retreat. You're surrounded.  And we already have a map here.   Okay, now the schoolhouse battle is gone.   The bridge battle will have four imps on the far side.   Turn 2: they'll get a fire amp on the far side.
>
> * Turn 4: one more amp on the far side.
> * Turn 5: one fire amp on the far side.  No loss at turn 12.   The next battle can be the hunt, but let's turn it into three bloodhounds and one hellhound to start.   On turn 4, we're going to have 4 zombie hounds behind the heroes.  Turn 7, we'll have one hero, one werewolf from in front.
>
> No, wait, let's bring that werewolf out of the cavern, so it's going to appear in one of the inside cave squares.

Ruled:

- **Battle 2, Lumberjack House — final schedule.** Start: three Zombies (east edge). Turn 1, end of the Enemy Phase: one Skeletal Archer from the bottom edge. Turn 3: one Skeletal Archer from the top and one from behind the heroes. **Turn 4: nothing** (the three Fast Zombies are cut). Turn 5: one Soldier Undead from behind the heroes. Seven enemies in all. No retreat — you are surrounded. Map: lumberjack-forest, as built.
- **The Schoolhouse battle is gone.**
- **Battle 3, Bridge.** Start: **four Imps on the far side.** **Turn 2: one Fire Imp, far side. Turn 4: one Imp, far side. Turn 5: one Fire Imp, far side.** Seven enemies. **No loss at turn 12** — no time limit. ("amp" is read as Imp.)
- **Battle 4, Cavern Trail, is the Hunt, reworked.** Start: **three Bloodhounds and one Hellhound.** **Turn 4: four Zombie Hounds behind the heroes.** **Turn 7: one Werewolf, appearing in one of the cave-mouth hexes** (Andrew's correction the same minute: "bring that werewolf out of the cavern"; it replaces "from in front"). Eight enemies.
- Not stated, carried as defaults: victory in battles 3 and 4 is clearing the map, as in battles 1 and 2; retreat in battles 3 and 4 is not addressed. Exact hexes are Claude's reading on the Abbotown Ground Check: the heroes enter from the west on both maps, so "far side" is the east bank (Bridge) and "behind the heroes" the west edge (Cavern Trail).

## 2026-09-28 — a meteor fall on Turn 4: seven marked areas, then burning ground

Andrew, the same night:

> In this battle, phase 4, we're going to bring down some fiery meteorites. Let's bring down 7 of them.   What happens is, during the enemy end of phase, 7 areas get painted with something that looks kind of like an aura. We have a VFX for this. It's 7 tiles around, just the edge, soft and red. After the next player phase is over, the meteorites land, creating burning ground and damage and setting people on fire.

Ruled:

- **A meteor fall on Turn 4: seven fiery meteorites.** At the end of the Enemy Phase, **seven areas are marked**, each **seven hexes** (a hex and the six around it), shown by an aura-like marking on **the area's outer edge only, soft and red**. **After the next Player Phase ends, the meteorites land: the areas become burning ground, and everyone in them takes damage and is set on fire (Burn).** The telegraph gives the heroes one Player Phase to get out.
- The visual already exists as a candidate: "Skyfall", a one-turn coloured warning, descending meteor and fire impact, with a 7-hex option (VFX/README.md 56; assets/characters/oathblade-armor/rebuild/candidates/meteor-strikes/). Its approval and game integration are pending.
- "In this battle" follows the Hunt on the Cavern Trail (battle 4) in the same dictation; which battle it belongs to is asked back. Not stated: how the seven areas are placed, the damage, the Burn amount, and whether enemies are hit too.

## 2026-09-28 — the meteor fall: Cavern Trail, burning ground, 2 fire and 2 Burn, centred toward the middle; the Orphanage has no turn limit

Andrew, answering which battle, how much, and how the areas are placed:

> Hunt on the Cavern Trail.  It sets all ground ablaze. So all tiles become having the burning ground effect.   It also inflicts 2 burn and 2 fire damage on any unit in that area.   The seven areas are placed at random, but I want a randomization that makes it more towards the middle.  And in this case, the center hex should always be a viable move hex. Don't put it in the impassable water or above the rocks.   Orphanage shall not keep its old lost after 10 turns.

Ruled:

- **The meteor fall belongs to battle 4, the Hunt on the Cavern Trail** (Turn 4).
- **Every hex of a landed area becomes burning ground** (terrain.burning), all seven hexes.
- **Every unit in a landed area takes 2 fire damage and 2 Burn** — "any unit", so enemies too.
- **The seven areas are placed at random, weighted toward the middle of the map.** **Each area's centre hex is always a hex a unit can move to** — never the impassable deep water, never on the cliff rocks. Its six surrounding hexes are not constrained by this ruling.
- **The Orphanage has no turn limit** (the old "lost after the 10th turn" is dropped).
- Not stated: whether two areas may overlap (asked or defaulted when the item is built); the random stream is named by what it rolls (Law 4).

## 2026-09-28 — Gates is the Curse; the Cathedral has a Necromancer raising the dead

Andrew, asked whether Gates uses the old Curse encounter and what is in the Cathedral:

> Gates should use the old cursing counter, yeah?   I want a necromancer who's going to raise a lot of these bodies from the dead.   I'm not sure what else makes sense in there.

Ruled:

- **Battle 5, Gates, uses the old Curse encounter** ("cursing counter" read as the Curse encounter), as revised 2026-09-21: six defenders already in position — two Bruiser Demons, two Poison Imps, one Powerful Imp, one Lieutenant Demon; curse strikes from Turn 4 (the struck hex and the hexes around it: Weak to everything there, and cursed ground); two Imps on Turn 7, one from the top and one from the bottom; kill all enemies to win; retreating is a loss. On the Gates map the heroes come up the approach from the south, so "top" is the abbey (north) end and "bottom" is behind them.
- **Battle 6, Cathedral: a Necromancer who raises many of the bodies.** The Cathedral's remains (33 hexes of them on the Ground Check) are raisable corpses; the Necromancer's Raise reaches 10 (ruled 2026-09-27).
- The rest of the Cathedral encounter is open — Andrew: "I'm not sure what else makes sense in there." Claude proposes; nothing further is ruled here.

## 2026-09-28 — no cut-off hexes; the Lumberjack and Wife on the road

Andrew, checking the Ground Check:

> See a flaw in the Orphanage map? There are two movable forest squares behind a bunch that are not. What happens if a player enters on one of those movable squares and they can't move forward? There are two more that need to be turned into impassable.
>
> I see the same flaw on one square. It's column 1, row 3, 4-square. Needs to be impassable.
>
> Lumberjack and wife should be in column 13 on the road.

Ruled:

- **No passable hex may be cut off from the rest of its map.** Orphanage (0,8) and (0,10), woodland behind dense forest, become dense forest; Lumberjack House "column 1, row 3" — one-based, hex (0,2) — becomes dense forest. The Ground Check now fills every cut-off pocket on all six maps; none remain.
- **Battle 2: the Lumberjack and his Wife start in column 13 on the road** — (13,4) and (13,5), the road hexes in column 13 below the cottage door. Supersedes "six in along the trail" as Claude placed it.

## 2026-09-28 — the Cathedral encounter; Gates' curse strikes fall like the meteors; no Gates turn limit

Andrew, answering the Cathedral and Gates questions:

> Let's have the necromancer raise two per turn. Let's do the rest of the things you proposed.  Gates' curses do fall that same way, yep.   The meteor should hit, and everybody in the blast area should get 3 weak, and then weak should be applied on the ground.  Date no longer needs a term 15 fail.   When the body is raised, the cursed ground stays.   I like your proposal. The skeleton archer is up on the altar.

Ruled:

- **Battle 6, Cathedral — as Claude proposed, with Andrew's changes.** The **Necromancer raises two bodies per turn** (reach 10). Start: the Necromancer at the altar on the raised sanctuary, **two Skeletons**, and **one Skeleton Archer up on the altar**. **Turn 5: two Ghouls through the side doors**; they eat corpses, healing themselves and denying the Necromancer bodies. The remains are cursed ground; **a raised body's cursed ground stays**. Win: clear the map; killing the Necromancer stops the raising.
- **Battle 5, Gates — the curse strikes fall the same way as the meteors:** seven 7-hex areas marked at the end of the Enemy Phase, landing after the next Player Phase, placed at random weighted to the middle with a centre a unit can move to. **Everyone in a landed area gets 3 Weak, and the area becomes cursed ground** ("weak should be applied on the ground": cursed ground, which gives Weak). From Turn 4, as the Curse had it.
- **Gates has no turn limit** ("Date" read as Gates; the old 15-turn loss is dropped).
- Not stated: whether the curse strikes repeat after Turn 4 (the meteor fall is once, on Turn 4; read the same way unless Andrew says otherwise); the Ghouls' side-door hexes and the defenders' exact positions are Claude's reading on the Ground Check.

## 2026-09-28 — the Lumberjack's Wife and the Undead Soldier, dictated

Andrew, asked for the two opening units the pack does not have (backlog `content.opening-units`: "The Lumberjack's Wife has no stats anywhere …" and "Battle 2's Soldier Undead has no stats either …"):

> Wife,  2 str, 2 pre, 65 accuracy, 6 health, 10 dodge, armed with knife and basic armor, move 5.   Undead Soldier,  str 4 pre 3, health 9 armor 1, accuracy 70, move 4, immune bleed 1.  armed wth longsword looking weapon.  Slice: Str.   (looks like soldier art)

Ruled:

- **The Lumberjack's Wife** (civilian, her own unit beside the Lumberjack): **Strength 2, Precision 2, Accuracy 65, Health 6, Dodge 10, Movement 5; armed with a knife and basic armor.** "Knife" is read as `item.dagger`, the knife every civilian already carries (ruled 2026-09-05; the Codex has no `item.knife`); "basic armor" is `item.basic-armor`. Anything not dictated (armor stat, stamina, crit, luck, vision, toughness) follows the civilian rows' existing defaults, not new numbers.
- **The Undead Soldier** (battle 2's "Soldier Undead"): **Strength 4, Precision 3, Health 9, Armor 1, Accuracy 70, Movement 4; immune to Bleed (`immunity: {bleed: 1}`, the Codex's existing immunity shape); armed with a longsword-looking weapon; its attack is Slice, damage Strength. Its art looks like the Soldier's.** Read as **a new enemy row**, not a rewrite of `unit.soldier` (Strength 5, Armor 2, Health 10, Accuracy 62), which other encounters field and which keeps its numbers; the Undead Soldier reuses the Soldier's art.
- Both land through `content.opening-units`, authored in the Codex and published; that item is no longer blocked.

## 2026-09-28 — battle 2's Undead Soldier is the existing Soldier

Andrew, on the entry above (the Undead Soldier read as a new enemy row beside `unit.soldier`):

“Let's just use the existing soldier as the undead soldier.”

Ruled:

- **Battle 2's Undead Soldier is `unit.soldier`, the Codex's existing Soldier (type Undead), as it stands** — Strength 5, Armor 2, Health 10, Accuracy 62, Movement 4, its own three attacks and art. **No new enemy row is made.** The Undead Soldier stat block dictated minutes earlier (Strength 4, Precision 3, Health 9, Armor 1, Accuracy 70, immune Bleed 1, Slice) is superseded and not built. `unit.soldier` is not yet in the published pack (Codex `authored: false`); `content.opening-units` publishes it.
- The Lumberjack's Wife stands as dictated above.

## 2026-09-28 — cursed ground is the Weak ground layer, the one ground-status shape

Andrew, on the backlog item `terrain.cursed` (a new terrain id for cursed ground, with its entry Weak deferred to End of Activation):

“So, terrain cursed. We don't already have terrain burning or terrain anything else. I want to make sure we're just following the same structure that was planned for all the various ground effects.”

Ruled:

- **Cursed ground is `layer.weak`**, the ground layer already built for it (capability.ground-layers; added 2026-09-03 above, "a `weak` ground layer joins burning, frost, poisoned and darkness"). **No new terrain id.** It follows the one shape every ground status has (Angela, 2026-09-03, above: "when you step on them, you gain one, and if you're there at the end of activation, you gain one"): +1 Weak on entering, +1 Weak at End of Activation, painted one per hex like the others.
- The opening's cursed hexes (the Ground Check's `*`), the curse strikes' landed areas and the Cathedral's remains are all painted `layer.weak`; the meteor fall's landed areas are painted `layer.burning`. The backlog item `terrain.cursed` is abandoned before any code, and the items that named it now name the layers.
- Read against the same day's "When you move onto it, you gain 1 week at the end of activation": taken as the one shape, spoken loosely, not a different timing for Weak alone. Confirmed by Andrew the same minute: “It's the same as all the other ones.”

## 2026-09-28 — a whole-project review for duplicated mechanisms; name the prior art before building

Andrew, after `terrain.cursed` was abandoned:

“I want to review the structure of all the changes that have been made to make sure we stayed in the fashion that was initially designed, with content being authored separate from the engine, without duplicating functions. The thing you just tried to do is the number one problem. … How can we thoroughly check all the revisions for problems like this?”

Shown a four-pass review (inventory, duplicates, content in code, independent verification) and asked whether it covers all four packages and whether the findings go on a page he rules on: “Questions 1 and 2, yes, and let's do it. … I want to continue on our work, so should we split this into two different chats?”

Ruled:

- **A read-only review of all four packages** (engine, kingdom, viewer, content tools) for duplicated mechanisms and content living in code, by concept across the whole tree. The brief is `engine/REVIEW-DUPLICATION-2026-09-28.md`.
- **Findings go on a page Andrew rules on line by line**; nothing is fixed or filed until he has.
- **Two chats:** the review runs in its own chat, writing nothing inside a package tree; building the opening loop continues in the engine chat.
- **Before any new mechanism, the item names the existing mechanism it extends, or says none exists and where it looked** — added to engine/CLAUDE.md's traps the same day.
