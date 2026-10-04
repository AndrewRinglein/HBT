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

## 2026-09-28 — the duplication review, ruled

The review (`engine/REVIEW-DUPLICATION-2026-09-28.md`) ran read-only at engine 5747e86, content 4bb0ae6, kingdom aa5eb36, viewer b9f5d41 and put 65 verified findings on a page (claude.ai artifact "Duplication Review 2026-09-28"; each finding cites the original, the duplicate and the landing that brought it). Andrew, asked for the calls only he could make:

“The ground table is an engine rule. Crit base 3 should be counted once. Let's do 2,515 XP by tier. A push does apply ground statuses. There should be no weapon that is zero-handed. The wound badge should weaken the hero in battle, which is either something you can start with or acquire if you trigger deathbed fighting. Everything else is fine as proposed.”

Ruled:

- **The ground table is an engine rule** (finding C6). terrain.ts keeps it, citing DECISIONS 2026-09-24; the Codex's layer list and FUNCTIONS.md are generated from the engine's export — five layers, `layer.weak` among them (C3).
- **Crit base 3 is counted once** (C1). The engine's 3 is the rule; the converter publishes each unit's authored crit minus 3.
- **XP per kill is 2 / 5 / 15 by tier** (K7) — dictated "2,515", read as the Codex's `xpByTier` 2/5/15.
- **A push applies ground statuses** (E4). Every ground beat runs on a push; SWITCHES `pushEntersGround` retires.
- **No weapon is zero-handed** (E13, K4). Every weapon takes at least one hand; the pack loader refuses `hands: 0`.
- **The Wounded badge weakens the hero in battle** (K10) — held from the start, or gained when the hero stands at Deathbed Fighting; the kingdom carries it into and out of battle.
- **Every other finding: fix as proposed** (64 of 65 Fix; C6 Keep). Filed as eight backlog items: `plumbing.vocabulary-export`, `tool.prior-art-audit`, `fix.ground-one-funnel`, `fix.one-effect-vocabulary`, `fix.codex-numbers`, `fix.one-hero-assembly`, `kingdom.reads-engine`, `viewer.reads-engine`.
- Readings taken under "as proposed", recorded here so they are checked: a unit the ground is painted under takes the entry beat, as the advancing band already does (E3); Codex class vision becomes a delta of 0 for every class, per the 2026-09-03 "everyone has a vision of 6" (C2). Still open, owed before `kingdom.reads-engine` lands (K16): where the XP thresholds to level 10 live, one campaign id scheme, and whether territory battles are Codex encounters.

## 2026-09-28 — the opening is tested with the player's party, not the Alpha Team; the prior-art audit also finds what the engine holds that belongs elsewhere

Andrew, told that `encounter.opening.gates` lost all 60 battles with four Alpha heroes (the third opening battle after the Bridge and the Cathedral), and asked whether the opening battles should be tested with four Alpha heroes or the party a player would have at that point, and whether to go on to `tool.prior-art-audit`:

“Opening battles should be tested with a party the player should have at that point. We need to move away from these alpha heroes.  Why is number 3 called "Tools Prior Art Audit"? Yes, we need to check features aren't copying something the engine already has, or that the engine had something that was supposed to be somewhere else and we need to remove it from the engine.”

Ruled:

- **An opening battle is tested with the party the player has at that point in the opening, not the Alpha Team.** The Alpha heroes leave the opening probes (`test.opening-*` in `src/content/scenarios.ts`). The prior art is the ruled 2026-09-03 "hero states" (above: `progression/PROGRESSION-SCHEDULE.json`'s roster "by position" is the party, loaded by `src/sim/progression.ts`) and the opening draft cadence (`GAME-ARCHITECTURE.md` §2.5: 1 drafted hero before battle 1, +2 after it, +1 after each until six), the civilians rescued (DECISIONS 2026-09-28 'answers to the 22 questions') and the Flaming Longsword after battle 2. The schedule was built 2026-09-03 for a 20-battle run that fields four heroes from battle 1; its opening positions do not match the cadence. Filed as `fix.opening-party`. The Bridge, the Gates and the Cathedral are re-tried on that party, not on the Alpha Team.
- **`tool.prior-art-audit` goes ahead** ("Yes"). Its scope is both directions: a new feature that copies something the engine already has, **and** something the engine holds that belongs in another package (content, kingdom, viewer), to be removed from the engine. The second direction is filed as `tool.wrong-home-audit`, beside it.

## 2026-09-28 — the opening's party levels up; the Flaming Longsword is a Warrior's or a Paladin's; the Bridge gives a reward

Andrew, told the win counts over 50 replicates on the drafted level-1 party (`fix.opening-party`: Orphanage 27, Lumberjack 36, Cavern Trail 7, Gates 0, Cathedral 0) and asked whether the heroes should level up in the opening or the Gates and Cathedral get weaker enemies, and whether the Flaming Longsword should go to the first hero whose class fights with swords:

“They need to be leveling up.  Battle 2 should be getting a flaming sword.   Yeah, the Flaming Longsword will hurt the priest, the ranger, or the mage. Really, it only is going to help the paladin or the warrior.   On battle 3, which is the bridge, we should be giving another reward, which can help, and the levels also should help. Also, the battles might be too hard, but let's see what happens when we do the proper upgrades.  The orphanage: only 27 of 50 win. Where's the death happening at the orphanage?  And is it against a certain type, like mage and priest are the ones that lose?”

Ruled:

- **The opening's heroes level up** between its battles. Overturns SWITCHES.md `openingPartyLevel` (level 1 throughout). How fast is not said; the rate is `fix.opening-upgrades`'s switch until ruled.
- **The Flaming Longsword is battle 2's reward** ("Battle 2 should be getting a flaming sword"), read as won at the Lumberjack and carried from the Bridge on, as built — KINGDOM-V2-2026-09-07.md "Sword after battle 2".
- **Only a Warrior or a Paladin takes the Flaming Longsword** ("it will hurt the priest, the ranger, or the mage. Really, it only is going to help the paladin or the warrior"). Overturns SWITCHES.md `openingCarriedHolder` (the first drafted hero).
- **Battle 3, the Bridge, gives another reward** "which can help" — carried from battle 4 on. What it is is not said; the standing reward is one item from three face-down cards (7-KINGDOM-SETTLED.md "Post-battle, reward, level-up": 25% weapon, 25% armor, 20% trinket, 10% idol, 10% Bloodrune, 10% relic).
- **No difficulty change yet:** "the battles might be too hard, but let's see what happens when we do the proper upgrades." The Gates and the Cathedral are re-tried after the upgrades.

Still asked (the next reply): whether "Battle 2 should be getting a flaming sword" means the sword is in hand during battle 2 itself; the rate of levelling. Filed as `fix.opening-upgrades`, at the top of the queue.

## 2026-09-28 — the Orphanage loses a Zombie at the start and a later one; every hero has at least 7 Health; the first hero gets positive modifiers

Andrew, shown the Orphanage by class (100 replicates, level 1: Rogues 1 of 25, Priests 3 of 13) and the rogues' numbers (Health 3–6, Armor 0; the thrown and shot rogues attack in about half their turns):

“Let's remove an early zombie and a later zombie. Let's increase the health of everybody to at least 7. If they're the first hero, they need to receive some positive stat modifiers.  Are these characters having no stat modifiers, no badges, nothing positive added to them?”

Ruled:

- **The Orphanage fields one Zombie at the start and one later arrival** — one of the two at (19,3)/(19,5) and one of the Turn 4 / Turn 5 arrivals go. Amends 'Battle 1 (Orphanage) redefined' (above). Which of each is not said: `fix.opening-first-battle`'s switch.
- **Every hero's Health is at least 7.** The Codex's Eve-of-Ruin rows below 7 (the four Rogues at 5; Rangers, Mages and Forest Elf at 5–6) rise to 7. Whether a kit's penalty (the Peddler's Vest's −2) may still field one below 7 is not said: switch, asked.
- **The first drafted hero receives positive stat modifiers.** Which and how many are not said: switch, asked.
- Answered in the same reply, not a ruling: at level 1 in the opening a hero fields only its row, its kit's modifiers (some negative — the Peddler's Vest −2 Health, −5 Dodge, −5 Accuracy; the Destroyed Mail +4 Health, −20 Accuracy) and `badge.hero`, which adds no stats (it carries only bleed-out). No level gains, specialty or class powers — the levelling ruled above is `fix.opening-upgrades`.

Filed as `fix.opening-first-battle`, at the top of the queue.

## 2026-09-28 — the first hero: Leadership, a 25% second badge, +2 Health, a Crucible stat point and a 30% second; the draft offers three with the Crucible's modifiers; the Peddler's Vest gives Health

Andrew, asked what the first hero's positive modifiers should be (proposed: +3 Health, +1 Armor, +10 Accuracy), then shown the Peddler's Vest's row, in four messages:

“The first hero should get one positive badge and a 25% chance of another positive badge.  They get 2 extra health.  They start with the leadership badge.  It may get one extra stat point, which could be two health if it's health, one extra stat point, according to the randomness that has been set in the Crucible.  And a 30% chance of another stat point”

“The Peddler's vest costs you 2 health, 5 dodge, and 5 accuracy. ?”

“I think it's supposed to be the other way around.   Gives you 2 health, but you lose 5 dodging, 5 accuracy.”

“There are supposed to be rules for the drafted heroes. You get your choice of one of three heroes.  Those heroes had randomized modifiers applied to them, and typically you would pick the best one. The first hero just gets all these positive modifiers. You're not drafting, you're just taking one. You don't get to see the stats.”

Ruled:

- **The first hero is taken, not drafted:** one hero, stats unseen, no pick. It gets all of: **the Leadership badge**; **a 25% chance of another positive badge**; **+2 Health**; **one extra stat point** rolled by the Crucible's randomness (`crucible/data/stat-pool.json`), a point of Health being **2 Health**; and **a 30% chance of another stat point**. Replaces the proposed +3 Health / +1 Armor / +10 Accuracy (the entry above). Reading: "one positive badge" and "the leadership badge" are the same badge.
- **Every later opening draft offers three heroes with the Crucible's randomized modifiers applied**, and the player "typically" picks the best one. Overturns SWITCHES.md `openingDraftPick` (a seeded take): the probe takes the best of the three. What "best" means is not said: switch.
- **The Peddler's Vest gives +2 Health** and costs −5 Dodge and −5 Accuracy (and keeps its +1 item slot). Corrects `content/gen/armor-enchants.json` (`health: -2`) and CODEX.md's row.
- Not found: **no Leadership badge exists** — not in `content/gen/badges.json` (234 rows) nor `crucible/data/badges.json` (43). The nearest is the Leadership **power** (`power.leader.leadership`: an aura, radius 5, +10 Accuracy, +1 Strength, +1 Resist). Asked.

`fix.opening-first-battle` is abandoned before any code (its first-hero default is superseded) and re-filed as `fix.opening-orphanage-lighter`, `content.hero-health-floor` and `fix.opening-first-hero`.

## 2026-09-28 — no Health minimum; the Peddler's Vest has no Health change; the first hero gets Leadership and a random positive badge; the draft pick is weighted; the first level-up comes after battle 2

Andrew, answering the four questions on the entry above (the Leadership badge, what "best" means, Health 7 as a row or fielded floor, civilians at 7):

“2. Some combination of those two things. It is better to get a tank early if you don't already have one, but there is also a weight to different stats. Not all stats are the same as good, and some are better for different classes. If you're a range class and you get precision, that's better. If you're a melee class and you get strength or health, that's better. Armor is always amazing. Resist is always amazing.  Just do a leadership badge and stick it on there for now. Don't worry about what it does.   Well, now your starting hero should always get +2 health, so that, I think, should put it at a 7 minimum.   No, there's no minimum health. I'm just referring to it from a practical standpoint.   No, don't try to do some kind of rule that there's some minimum 7 health. I'm just referring to starting battle. There's a big difference between 7 and 6 health.   The Peddler's Vest is giving you an item slot. The Peddler's Vest should just be -5 dodge, -5 accuracy, +1 item slot. No health change.   You get the leadership badge. You get a random positive badge. 25% chance of another positive badge. +2 health.   One stat point from the Crucible's randomness, a 30% chance of another stat point. Yes.   Right, we use the Crucible randomness, three heroes, and then use a weighted system for what you choose. If you do not already have a melee character, getting a melee character is better, but it's not absolutely better. They can have minus stat points, and a mage can have positives, so it should be weighed.   And we're going to start with the orphanage losing one at the start and one later arrival.   Number two: no, health is not set at 7 for every hero. No.   The opening battle won't be enough to get a level, but the second battle should.”

Ruled:

- **There is no Health minimum.** Withdraws "Every hero's Health is at least 7" (two entries above): no hero row changes. "I'm just referring to it from a practical standpoint" — the first hero's +2 Health is what puts it at 7 or more in practice.
- **The Peddler's Vest: −5 Dodge, −5 Accuracy, +1 item slot, no Health change.** Corrects the entry above (which recorded +2 Health) and `content/gen/armor-enchants.json`'s `health: -2`.
- **The first hero gets: the Leadership badge, a random positive badge, a 25% chance of another positive badge, +2 Health, one stat point from the Crucible's randomness, and a 30% chance of another stat point.** Corrects the entry above, which read Leadership as the one positive badge: they are two.
- **The Leadership badge is made now, with no effect** ("Just do a leadership badge and stick it on there for now. Don't worry about what it does.") — `badge.leadership`, a new instance of the badge kind.
- **The draft pick is weighted** — three heroes with the Crucible's randomness, chosen by weight, never by one absolute rule: a melee hero ("a tank") is worth more when the party has none yet, but not absolutely; a stat's worth depends on the class — Precision for a ranged class, Strength or Health for a melee class; **Armor and Resist are always amazing**; a hero's minus stat points count against it, a mage's plus points for it.
- **The Orphanage loses one Zombie at the start and one later arrival** — confirmed, first in the queue.
- **Levelling: the first battle is not enough for a level; the second battle is.** The rate after that is not said.

Re-filed (the three items filed from the entries above abandoned before any code): `content.peddlers-vest`, `fix.opening-draft-modifiers`, `fix.opening-levels-rewards`; `fix.opening-orphanage-lighter` stands.

## 2026-09-28 — the draft never repeats a class until all six are drafted; levels by XP at 20, 50, 100, 170, 270, 400

Andrew, on the draft and the levelling in the entries above:

“There's a very specific method of drafting. Until you've drafted all six of the starting classes, you never get a draft of the same class again.  So if your first hero is a warrior, on your next draft pool you will not see a warrior. Well, levels are determined by experience points, so for the first level, you need 20 experience points.   Then you need to get to 50, then 100.  Then 170.  270 400”

“Are the experience point rewards included in the game?”

Ruled:

- **Until all six starting classes are drafted, no draft offers a class already drafted.** A Warrior first means no Warrior in the next offer. With six drafts in the opening, the opening party is one of each class. The first hero, taken without a pick, counts.
- **Levels by XP: level 2 at 20 XP, level 3 at 50, level 4 at 100, level 5 at 170, level 6 at 270, level 7 at 400** (cumulative). Replaces the soft curve "20 · 100 · 250 · 500 · then scale out" (GLOSSARY.md "Level thresholds", SKELETON-SETTLED.md:114, `kingdom/src/content/levels.ts`).
- Answered, not a ruling: **the XP rewards are in the kingdom, not the engine.** `kingdom/src/core/reckoning.ts` gives each surviving hero-side unit `max(0, 15 − enemy phases) + 3 × kills`, one MVP +10 (a roll weighted by XP), and the dead nothing; quests pay their own XP (`kingdom/src/content/quests.ts`). The tier prices in `8-ENCOUNTERS-NOTES.md` (2 / 5 / 15 per kill) are not what the kingdom uses. With one drafted hero the Orphanage's MVP is nearly certain to be that hero — so the Orphanage alone may already reach 20, against "the opening battle won't be enough to get a level" (entry above). `fix.opening-levels` measures it and reports.

Re-filed: `fix.opening-draft` (replaces `fix.opening-draft-modifiers`) and `fix.opening-levels` (replaces `fix.opening-levels-rewards`), both abandoned before any code.

## 2026-09-28 — the Orphanage pays 20 XP no matter what: the first hero reaches level 2 after battle 1

Andrew, told that the kingdom's XP (3 a kill, the speed bonus, the MVP's +10) may already give the lone hero 20 XP at the Orphanage, against "the opening battle won't be enough to get a level":

“I think it's fine. Let's go and do a level. Make it so they get 20 XP no matter what, so they get a level, and then we'll do the level.”

Ruled:

- **The Orphanage pays 20 XP to the hero who fought it, whatever the battle's kills or length** — enough for level 2 (the curve above), so the first hero fields at level 2 from the Lumberjack on. Replaces "the opening battle won't be enough to get a level" (two entries above).
- **"then we'll do the level"** — the level-up is built now: `fix.opening-first-level`, at the top of the queue. A level-2 hero takes its specialty (chosen at the first level-up, `levels.json` rules) and its class table's level-2 grants. Which specialty a player would choose is not said: switch. The XP of the later battles stays `fix.opening-levels`'s, which now takes battle 1's as this fixed 20.

## 2026-09-29 — the Orphanage gains a Zombie on Turn 2 and one on Turn 3

Andrew, shown the lighter Orphanage (one Zombie at the start, one on Turn 4; won 90 of 100):

“Battle 1: Let's add a zombie on turn 2 and a zombie on turn 3.”

Ruled:

- **The Orphanage (battle 1) gains two arrivals: one Zombie on Turn 2 and one on Turn 3**, on top of the start's one Zombie at (19,3) and Turn 4's at (9,13) (entry 2026-09-28 'the Orphanage loses a Zombie at the start and a later one', built by `fix.opening-orphanage-lighter`). Four Zombies in all.
- Where each arrives is not said: switch (`fix.opening-orphanage-arrivals`).

Filed: `fix.opening-orphanage-arrivals`, next after `fix.opening-draft`.

## 2026-09-29 — the four afflictions: Vampirism rewritten, Cold Heart with it, deploy costs, Deathbed Fighting, Possession's Surge

Andrew, shown the four affliction rows as the pack carries them:

“Vampire: Deploying a vampire costs 3 faith.   Vampires only gain half experience points.   They get +2 strength, +1 precision, +3 health, +1 resist.   -1 spirit.   They gain on melee hit. They heal 2.   +1 magic.   They gain the power of flight.   Which uses movement +1  as a flight power   a lycanthrope hero also has a cost of 2 supplies to deploy.   Possessed hero costs 3 magic crystals to deploy.   Vampirism gives +15% to deathbed fighting.   Writing flesh gives +20%.   Possession gives -10.   Possession gives -10 to action surge per turn.”

“Vampires also gain the Cold Heart badge.   Cold Hard badge gives Immune to Karma 2, Immune to Cold 2, and +2 Health.”

Asked what four readings meant, the same day:

“Mana crystals is mana. It's supposed to be mana crystals, but I guess it's noted as mana.   Possession's first -10 is a deathbed roll? Yes. Writing flesh is Rotting Flesh?   We don't necessarily need to have one badge granting another. We can just have it so that when the affliction of Vampirism happens, it grants both Cold Heart and Vampirism.   I meant immune to Karma, too. As written, it is another type of status.   Immune to cold should be immune to frost, yes.   Well, immune to frost. We have some terminology thing here. It should also be cold resistance. Fire and burn are the same thing, so if you have fire resistance, it resists the burn status and fire. I guess this is immune to cold, and it resists both frost status and cold damage.   Cold Heart is only those who get afflicted.   Let's have the Vampirism flight cost 2. Stamina.”

Ruled:

- **Vampirism is +2 Strength, +1 Precision, +3 Health, +1 Resist, +1 Magic, −1 Spirit; on a melee hit, heal 2; +15 Deathbed Fighting; a flight power, Movement + 1, costing 2 Stamina; deploying the hero costs 3 Faith; the hero gains half experience.** Replaces the whole row ("+2 Strength · grants `power.vampirism.blood-drain` · `onDamage` (melee): heal 1"): the blood drain, never defined, is gone.
- **When Vampirism is inflicted, Cold Heart is granted with it** — one roll, two badges. Not a badge granting a badge. **Cold Heart is only for the afflicted**: enemy Vampires do not carry it.
- **Cold Heart: Immune to Karma, Immune to Cold, +2 Health.** "Karma 2 / Cold 2" was "too". Karma is the status. **Cold is an element like Fire**: fire resistance resists fire damage and the Burn status, so immunity to Cold is immunity to cold damage and the Frost status.
- **Lycanthropy: deploying the hero costs 2 Supplies.** Its stats are unchanged.
- **Rotting Flesh ("Writing flesh"): +20 Deathbed Fighting.** Its stats are unchanged.
- **Possession: −10 Deathbed Fighting; −10 Surge per turn; deploying the hero costs 3 Mana** ("magic crystals" / "mana crystals" is the currency the Glossary calls Mana, `currency.mana`). Its stats are unchanged.
- "+15%" is read as 15 points on the Deathbed Fighting chance (20 + 5 × Toughness, a percentage).

What the engine cannot yet do is a named gap on the badge row, never dropped: Deathbed Fighting from a badge, a badge's own hit-trigger (heal 2), immunity to a status, a cold damage type, deploy costs and half experience (the kingdom's).

Filed: `content.afflictions-revised`.

## 2026-09-29 — Possession's Surge loads at fielding; the Ghost inflicts Possession; Deathbed Fighting and Cold Heart's immunities are built

Andrew, asked (1) whether to build Deathbed Fighting from badges next, (2) whether to build status immunity and a cold damage type so Cold Heart does more than +2 Health, (3) whether ghosts should inflict Possession — and told its −10 Surge may need extra engine work mid-battle:

“The -10 surge per turn cannot be relevant until the next battle. It can be loaded on load. Ghost should inflict possession, and yes to 1 and 2.”

Ruled:

- **A badge's Surge is folded when the unit is fielded, never mid-battle.** A hero possessed in a fight gains the badge's other stats at once and its −10 Surge from the next battle on.
- **The Ghost inflicts Possession.** (Its rider already exists: Possess, 25%, SOFT — `content/gen/bestiary-riders.json`. The Ghost is not an authored enemy, so it is not in the engine pack.)
- **Build Deathbed Fighting from badges** (the entry above's +15 / +20 / −10).
- **Build status immunity and cold as an element**: Cold Heart's immunity to Karma, and to Cold — cold damage and the Frost status, as fire resistance covers fire damage and Burn.

## 2026-09-29 — the Ghost as the bestiary has it; Cold Resist; "Immune X 1" is a resistance of 1

Andrew, asked (1) "Should the Ghost go in with its bestiary numbers as-is (4 Strength, 5 Precision, 4 Health, 10 Dodge, Movement 5, Possess at 25%), or will you set its stats?", (2) "Should cold damage get its own resistance stat, like fire resistance, now that Cold is an element?", (3) "What does the '1' in 'Immune Frost 1', 'Immune poison 1' and 'Immune fire 1' mean: a resistance of 1, or something else?":

“Yes, yes, yes.”

Ruled:

- **The Ghost is authored from its bestiary row as-is**: Strength 4, Precision 5, Armor 0, Health 4, Reach 1, Resist 0, Dodge 10, Accuracy 85, Movement 5; its Possess inflicts Possession at 25% (the rider, `content/gen/bestiary-riders.json`). What the bestiary leaves unsaid (a damage with no number, a buff with no stat) is a switch or a named gap, never an invented value.
- **Cold is an element with its own resistance, Cold Resist, as Fire has Fire Resist.** Cold damage is a damage type; Cold Resist mitigates it; Cold Heart's immunity to Cold now covers cold damage too.
- **"Immune <element> 1" is a resistance of 1**: Immune Frost 1 is +1 Cold Resist, Immune poison 1 is +1 Poison Resist, Immune fire 1 (and Dragon Slayer's "immunen to fire 1") is +1 Fire Resist. ("Immune weak 1" names a status with no resistance stat: a named gap.)

Filed: `rule.cold-resist`, `content.immune-one-is-resist`, `content.ghost`.

## 2026-09-29 — the Ghost possesses on its Attack at 15%; every resistance works the one way, and it replaces immunity

Andrew, asked (1) when a Ghost should use Possess over Attack, (2) whether Cold Resist should also weaken the Frost status:

“We should move it to a chance on attack. Let's give it a 15% chance on attack.   So there is one way we're doing resistance. It should all be the same. I don't know why you're asking me this in five different ways. Every type of resistance should work the same. Replaces previous immunity”

Ruled:

- **The Ghost's Attack possesses at 15%** (on a hit). Possess — 0 damage, and now nothing else — is dropped from the row.
- **Resistance is the one way, and it is already ruled**: COMBAT-V2-DESIGN §8.2 (2026-09-07), "one resist, both forms" — an element's resist reduces that element's damage flatly, dealt directly or by its status's tick; it never shortens or refuses a status. Cold Resist works exactly as Fire Resist does. (Question 2 had its answer there; it should not have been asked.)
- **Immunity is replaced by resistance** — the V2 migration's own rule (2026-09-16, the immunity necklaces: "elemental immunity becomes flat named resistance"). The status-refusing, damage-zeroing immunity built earlier today (`rule.badge-immunity`) is removed. "Immune to <element or its status> N" is +N of the element's resist; with no number, +1, as the necklaces' one-for-one migration. A status with no element (Karma, Weak) has no resist: a named gap.

Filed: `content.ghost-possess-on-attack`, `rule.immunity-is-resistance`.

## 2026-09-29 — the playable opening: the first three battles first, one page, a local server

Andrew, asking for "the first six battles and the play map for the six battles playable, including the battle view being a playable UI … With updated 3D maps, UI, characters, and correct motions", answering twelve planning questions:

“One, yes.   To just build it from the sketch  3, yes. I don't know what you mean by demo layout. A lot of work has gone into the battle viewer. There are a lot of very specific things in that, so we might need to cover that in detail.   5. They can show slot tokens.   6. That is what enemy units need. Hero units need to be able to support their weapon's power.   It's okay if we don't have everything, but we should have most, and I want to get most in there so I can see what this looks like.   It's okay if we reuse some appearance outfits. Let's leave tactics out. One sitting is enough for now. 10. Yeah, let's do it on a local server.   Enemy turns play out in full animation. Have a double-speed button.   Yeah, I don't even think we need all six battles playable. Let's just get the first three all the way playable, get the visuals mostly there, and the right buttons.”

Ruled:

- **Target: the first three battles (Orphanage, Lumberjack House, Bridge) all the way playable**, visuals mostly there, the right buttons. Gates and Cathedral are not in this target.
- **One page, one loop:** the campaign map → draft and equip → battle → rewards → back to the map, built on the existing Battle Sandbox.
- **The Retaking Abbotown campaign map is built from Andrew's sketch** (IMG_5078): six sections, taken ones marked, the next one pointed to.
- **The 3D maps are the painted scenes** (Orphanage riverside and its siblings; the painted gate).
- **The battle screen is the battle viewer.** "A lot of work has gone into the battle viewer" — its specifics are to be covered with Andrew in detail before the playable screen is built. (Claude's "demo layout" question was about assets/battle-demo, a visual demo; it is not the battle screen.)
- **A unit with no 3D model shows its token** ("slot tokens" read as the unit's existing token art).
- **Motions: enemies need idle, move, attack, hit reaction and death. Heroes need those and whatever their weapon's powers need.** Not everything is required — "most", enough to see what it looks like. Reusing appearance outfits across heroes is fine.
- **No tactics** in this loop. **One sitting** — no save and quit. **Played on a local server.**
- **Enemy turns play out in full animation, with a double-speed button.**

Filed: nothing yet — the plan is written after the battle viewer is covered.

## 2026-09-29 — the playable battle screen: what sits under a unit, the downed, clicks, camera, End Turn, the activation that ends itself

Andrew, answering eleven questions on the battle viewer as the playable screen:

“I believe there is another mockup, a demo version that was created, that has a health bar and name underneath the units.   Also, some icons go there as well, but I don't believe we need poison or burn icons on the units because we can display that on the unit directly with a fire and poison.    Down units should use the dead 3D character lying on the ground.   Unconscious units should use that same thing but have a counter for bleeding out.    There should already be some kind of demo view of how we choose targets, how ores and targeting areas are displayed. What happens when you point over an enemy?   Protection should be represented by a bar underneath health.  Slow does not need representation on the character. It can just change the number that shows how much movement that character has.   Stun should be shown on a character. The painted 3D scenes turned into hex maps? Yes.   2, yes.   3, yes.   4, yes.   5, yes.  Also, if you click an enemy hero, you get them focused on the right-hand side.   6. It shows whoever you clicked last.   7. I don't know what you mean.  8 battlelog, yes.  9, yes.   10. You should be able to rotate around, but there should be a button to reset. You should be able to right-click to grab the map and move. You should be able to navigate, zoom, and tilt, and there should be a button somewhere where you just reset, and it goes back to the starting angled view.   There should be a button for "End whole turn," but a shadow popup. If you have anybody who has not acted, it should pop up and say, "Are you sure you want to end your turn? You have units that have not acted. If all your units act, then your turn just ends."   And by turn, I mean player phase.   When you perform your primary action and it is not a free primary action, after that action resolves, there's no button to end activation. Just when you do a non-free primary action, after it's resolved, that ends the activation, so we're saving a click for "End Unit."”

Ruled:

- **Under each unit: a Health bar and the unit's name, as in the battle demo's mockup, with a Protection bar beneath the Health bar.** Some icons go there too — **but not Poison or Burn**: those are shown on the body itself (the fire and poison effects).
- **Stun is shown on the character. Slow is not** — it only changes the unit's movement number.
- **A dead unit is its 3D model lying on the ground (the death motion's end). An unconscious (downed) unit is the same, with a bleed-out counter.**
- **The painted 3D scenes are the battle board**, turned into hex maps. (Retires "WebGL is NOT required", PLAYBACK-DESIGN.md:107, for these battles.)
- **3D characters keep the token's surroundings** (ring, shadow, the bars, the chips) — yes.
- **Moving and attacking on the board**: click a hex for a ghost, click again to confirm, right-click to step back — yes. **Actions are chosen from the action bar** — yes. **The hero who acts next is chosen by clicking it on the board** — yes.
- **The right-hand panel shows whoever was clicked last** — a hero, or an enemy clicked to inspect it. (Replaces "The panel is about whoever is acting … Not click-driven", PLAYBACK-DESIGN.md:114, for the playable screen.)
- **A battle log** — yes. **Zone-of-control hatching and the path preview** — build them.
- **Camera: rotate, zoom, tilt, and right-click-drag to move the map; a Reset button returns to the starting angled view.**
- **"End Turn" ends the Player Phase.** If a hero has not acted, a pop-up asks: "Are you sure you want to end your turn? You have units that have not acted." **When every hero has acted, the Player Phase ends by itself.**
- **A non-free primary action ends the unit's activation once it resolves** — no End Activation click after it. (A free primary action does not.)
- Question 7 (the "whose turn it is" look) was unclear; it is re-asked in plain words.

## 2026-09-29 — the playable screen: the acting mark, pointing at an enemy, the forecast

Andrew, asked which status display goes under a unit, what pointing at an enemy does with no attack chosen, whether the forecast shows on pointing, and which "this hero is acting" mark to use:

“Bobbing arrow overhead and the glowing disc under its feet with a sweep I really don't know until I see it, so just choose one. With no attack chosen, that's a good idea. Pointing at an enemy lights up where it can move in him. That's good.   The forecast should show yes. If you have your hero selected, you click your hero, and then you're mousing around. There's an arrow, and whenever you put it over something, it shows you”

Ruled:

- **The acting hero is marked by the glowing disc with a sweep under its feet and a bobbing arrow overhead** — Claude's choice on "just choose one"; to be seen and changed if wrong.
- **With no attack chosen, pointing at an enemy lights up where it can move and hit.**
- **The forecast shows on pointing:** with the hero selected (clicked), an arrow follows the pointer, and whatever it is over shows its forecast.
- The status display under a unit was not answered: default **compact icons** (`viewer/SWITCHES.md` statusUnderUnit).
- The work is ordered in `PLAYABLE-OPENING-PLAN.md`; its twelve items are filed at the top of the engine queue.

## 2026-09-30 — the End activation button stays

Andrew, asked whether the End activation button (kept by `viewer.play-chrome`, `viewer/SWITCHES.md` playChromeEndActivation) should stay for a hero who only moves, since the 2026-09-29 ruling removes the click after a non-free primary:

“Yeah, I suppose it should stay since you need to be able to end without doing another action.”

Ruled:

- **The End activation button stays** for a human hero who is acting — for ending an activation without doing another action (a hero that only moved, or used only a free primary). After a non-free primary it is still never needed: that ends the activation by itself (2026-09-29).

## 2026-09-30 — the fast process; the full process kept

Andrew: “So, with Start Engine and how I'm developing in this system, according to the documentation, it's doing a good job, but it's kind of slow. It's taken me like a week to build a bunch of things, and I would like to speed this up. What in this process is making it take so long? I don't think it needs as many tests of battles as it's doing.”

Shown the gauntlet log (199 landings, 84% passed the gate on the first try; the checks that failed most were the cheap ones, and the full suite caught 16 regressions in 120 runs) and that most of the remaining time in Cowork is the ~178 s command limit — the suite as eight shards, the gate resumed across calls — Andrew: “Okay, can we preserve the long process somewhere, but then update this to our new fast process?”

Ruled:

- **The full process is kept, restorable exactly:** the git tag `process-full-2026-09-30` (the engine repo at the wrap before this change), and `node tools/gate.mjs <id> --full`, which runs every per-item check as before.
- **Fast is the default.** A landing no longer runs the prior-art and wrong-home flags per item; `wrap` runs both over the whole tree, as flags that never block. The kill switch runs on the test files the item ADDED; an item that added none keeps every test file it touched, as before. Every other check is unchanged.
- **Outside Cowork the full suite is one command**, `node tools/gate.mjs --shard 1/1` (any complete set of shards is the suite, so `wrap` accepts it). The gate already has no budget in a terminal.
- Recommended, not ruled: engine chats run in Claude Code on Andrew's PC, where no command limit applies. Turning Cowork's cloud off does not remove the limit — its local workspace has the same one.

## 2026-09-30 — the Bridge's northern branch is walkable; the deck hexes marked X are deck

Andrew, shown that the painted Bridge scene's measured navigation stranded ten deck hexes of the northern branch (columns 24–29, rows 6–7) that the engine's map joins to the rest:

“Okay, all those purple tiles should be walkable terrain.”

Then, asked whether the seven deck hexes the ground proposal had marked X ("standing shafts") — (23,7) (29,7) (30,7) (32,7) on the northern branch, (28,11) (23,13) (18,14) on the southern — should be walkable deck too, since the scene has no shaft on any of them:

“Yes.”

Ruled:

- **Both branches of the Bridge are walkable from bank to bank, the northern branch included.** The ten stranded hexes are deck.
- **The seven hexes are bridge deck (B), not high obstacles.** The only standing shaft on the deck is (15,7); the other three are on the west bank at column 6.
- The scene follows the map: `tools/battle-atlas/build-abbotown-encounters.py` widens the deck edge under those hexes, leaves out the three low stone blocks that stood on the deck and keeps deck chips under 0.2 m; every other placement is unchanged. The measured navigation is one connected area. The prior scene is kept in `assets/terrain-3d/abbotown-encounters/prior-2026-09-30/`.
- Also shown, not ruled here: the scene's measurement flags the Orphanage water, the two houses, the west-edge dense forest and low cover, but those are the measurement's simple rule (water impassable, walls solid, foliage ignored, anything 0.22–1.77 m blocks), not the engine's. Andrew: the water is ankle-deep and stood in; units stand inside both houses **and the roof comes off when one is inside** (not yet built — no roof change on occupancy exists in the viewer or either scene); dense forest is a full obstruction.

## 2026-09-30 — encounter.opening.bridge-ai: park, abandon, re-file

Andrew, shown that the Bridge fix works (Battle 3 ends on all 100 seeds) but that `encounter.opening.bridge-ai` was filed with no `probeIds`, so gate 1 probes an id that is not a content id and can never pass, and asked how to land it:

“Park, abandon, re-file”

Ruled: the work is parked outside the tree, `encounter.opening.bridge-ai` is abandoned with that reason, and re-filed as `encounter.opening.bridge-ai-refiled` with `probeIds: ["encounter.opening.bridge"]`. Left open: `kingdom.opening-loop-three` still `needs` the abandoned id — no tool edits an existing item's `needs`, and the backlog is never hand-edited.

## 2026-09-30 — the Fire Imp flies

Andrew, told that the engine gives the Fire Imp no flight, so it walks in battle 3 (`content/gen/enemies-authored.json` unit.fire-imp has no `movePower`, while unit.imp has `"movePower": "flight"`):

“The Fire Imp does fly, yes. That was an oversight if it does not.”

Ruled: **the Fire Imp flies** — the same flight move as the Imp. The missing `movePower` is the oversight; the fix goes through the Codex (content), filed as `content.fire-imp-flight`. Not ruled here: the Poison Imp ("same as Fire Imp with poison throughout") also has no flight.

## 2026-09-30 — the battle is its own full screen; End Turn and End Activation lower right; a red targeting arrow; every 3D character

Andrew, having opened `kingdom/BATTLE-SANDBOX.html?play=encounter.opening.orphanage` (and battles 2 and 3) on the local server:

“Okay, you've got one screen with the ability to open the battle. It is the same as the battle. I want a fucking battle. It should be full screen. How can I experience this if you've got one screen that is both your launcher and your battle?”

“You've got End Turn and End Activation on the battle map. They shouldn't be. Put them in the lower right-hand corner.”

“The arrow for targeting should be red, not blue.”

“And there are no 3D characters in this. I want all the 3D characters and enemies and motions.”

Ruled:

- **The battle is its own screen, full screen.** The launcher (the sandbox's setup) and the battle are not one page view: opening a battle shows only the battle, filling the window.
- **End Turn and End Activation are not on the battle map; they sit in the lower right-hand corner of the screen.** (The End Activation button stays — 2026-09-30 'the End activation button stays' — it moves.)
- **The targeting arrow is red, not blue.**
- **Every 3D character, enemy and motion is in the battle.** None showed in Andrew's play of 2026-09-30 although viewer.opening-cast landed; that is a defect, not a choice.

## 2026-09-30 — a bunch of motions, not every one; the hero bodies we have are reused

Andrew, asked (1) whether the Skeleton Archer and the Soldier, which have no approved attack or flinch, may use the free-library motions already selected (the sword combo, a bow shot) for now, and (2) whether the battle should field the drafted classes wearing the hero bodies already built, or bodies should be built for the sandbox's Iron Dwarf, Hunter and Battle Chaplain:

“Yes, I don't really care about every single motion being in there. I want to see a bunch of motions in there.”

“We can reuse the hero bodies we already have.”

Ruled:

- **Yes — the selected free-library motions may be used on the Skeleton Archer, the Soldier and any look that lacks one.** Not every motion is required; many visible motions are. This loosens 2026-09-29's "what a look lacks is listed, never borrowed" (viewer.character-models) for the playable opening: a lacking motion is filled from the approved or selected motions where one fits, and is still listed where none does.
- **Every hero the battle fields wears one of the hero bodies already built** (the battle demo's archer, Oathblade, the female fitted bodies, the casters), reused across heroes and classes. No new hero bodies for the opening.


## 2026-09-30 — a true 3D battle: an orbit camera, every Orphanage unit its own model, no flash of another map

Andrew, having played `kingdom/BATTLE-SANDBOX.html?play=encounter.opening.orphanage` after viewer.battle-full-screen landed (his screenshot: the status line reads "Painted 3D · Orphanage"; the board shows the 3D riverside scene with the bridge, rocks and trees):

“When I maneuver the map, it stretches the 3D assets. These are supposed to be 3D assets. The heroes are not 3D assets. This is not a 3D map from either perspective.”

“Do you need to ask me questions? Do we need to go through a Q&A of what this should be?   The battle screen is sort of 2D, but if I rotate it one direction, it just stretches, and then the characters are 2D renderings of 3D assets.”

Asked four questions. His answers:

- How should the battle camera work? — chose **“True 3D orbit”** (offered as: “A real perspective camera: rotate all the way around, tilt, zoom and pan; terrain and characters seen correctly from any angle, like a 3D tactics game.”)
- What should a unit with no 3D model yet look like? — “Everything in Orphanage has a 3D model, so if you're not finding the 3D model, you're just not looking in the right place.   Ask me if there is anything missing in the model because we're not”
- What should the battle map itself be? — “These maps are supposed to be converted into 3D. I thought everything was converted into 3D. What do you mean by "painted 3D scenes"? We started with paintings. I thought we turned these into three-dimensional models.”
- What does the status line under the board start with? — “A different map loads for a blink of an eye, and then this map. That other map should not be loading.   This is the right map. We then have 2D assets on it as well, and it's not doing the right type of behavior for how we change perspective.”

Answered on the spot: "painted 3D scene" is only the code's name (viewer/src/painted.js) for the 3D model converted from the painting — `assets/terrain-3d/orphanage-riverside/scene.glb`; it is three-dimensional, and it is what loaded ("Painted 3D · Orphanage").

Ruled:

- **The battle camera is a true 3D orbit camera**: a real perspective camera that rotates all the way around, tilts, zooms and pans, with the terrain and the characters seen correctly from any angle. Today the board is a flat CSS plane and the WebGL layer copies that plane's tilt (viewer/src/terrain3d.js `clipMatrix` from the stage's CSS transform), which is why turning the board stretches the scene and the bodies. The ground marks (hexes, reach, path, the arrow), the bars and names under units, and every click follow the 3D camera.
- **The maps are 3D** — the 3D scenes converted from the paintings are the board, as ruled 2026-09-29.
- **Every unit in the Orphanage has a 3D model — find it; none stands as a 2D token.** The models are in `assets/characters/hero-transformations/player-roster/models/` (among them `orphan-child`, `school-teacher`, `warrior-iron`, the `ranger-*`, `priest-*`, `paladin-*`, `rogue-*`, `mage-*` and `warrior-*` bodies, `lumberjack`, `lumberjacks-wife`). This corrects viewer.opening-cast, which left the civilians (and the Lumberjack's Wife) on tokens as having no model. **If a model lacks something, ask Andrew.**
- **No 2D assets on the 3D map.**
- **No other map loads first.** The board that shows for a blink before the battle's own scene must not load; the battle's 3D map is the first thing seen.

## 2026-09-30 — the game plays from a link

Andrew, told after viewer.true-3d-camera landed to open `PLAY-OPENING.bat` to see it:

“Listen, I don't want to have to go dig for bat files. I want a way to play this game out of a link.”

Ruled:

- **The game is played by opening a link** — never by finding and running a .bat file. How (a hosted page, or the local server always running behind a bookmark) was asked the same evening; recorded below when answered.

Asked which kind of link (a hosted page on any device; a local link on this PC with the server started with Windows; both), Andrew chose **“Local link on this PC”**, and added:

“Make me a game launcher where I can play the various battles.”

Ruled:

- **A local link on this PC:** the game's server (tools/battle-atlas/serve.mjs, port 4230) starts with Windows, so the link always opens; no .bat to run.
- **A game launcher:** one page at that link lists the battles that can be played and opens each straight into the battle screen. Filed as `kingdom.play-launcher` (first in the queue).

## 2026-09-30 — the civilians are played; no 2D before the 3D bodies

Andrew, having played from http://127.0.0.1:4230/play:

“There's no movement for the child when I click on it, so the civilians, I think, aren't activating properly.   Also, two-dimensional images of other heroes are loading before the 3D images are loading. You still have some kind of legacy 2D other things loading, better than blinking out of existence.”

Ruled (the reading taken; 2026-08-26 "civilians are EXACTLY like heroes" is the prior ruling it rests on):

- **The civilians are played by the player, like the heroes.** In a battle the person plays, clicking the Orphan Child (or any of the encounter's civilians) starts its activation — reach, path, attack — as clicking a hero does; End Turn's pop-up counts them among those yet to act. Until now the sandbox left them to the AI (kingdom/src/core/sandbox.ts, an unrecorded choice). Filed `kingdom.civilians-played`.
- **No 2D picture stands in for a body that is still loading.** The battle opens when its 3D map and the 3D bodies of everyone on it are in; a unit that arrives later shows no token while its body loads. A token is drawn only where a body cannot be had (said in the status line, as before). Filed `viewer.bodies-before-board`.

## 2026-10-01 — always a playable link

Andrew, after the wrap of kingdom.civilians-played and viewer.bodies-before-board (whose reply did not repeat the link):

“Where is my playable link? It doesn't work. How can I fucking test things without a playable link? I always need a playable link.”

Ruled:

- **Every reply that ends work on the game gives the playable link, clickable, at the top** — http://127.0.0.1:4230/play (the launcher), and the battle the work touched (`http://127.0.0.1:4230/kingdom/BATTLE-SANDBOX.html?play=<encounter>`). A wrap's reply included.

## 2026-10-01 — the camera redesigned on the caravan preview; the caravan's fight; what is queued after it

Andrew, asking for the caravan handoff (`../ATLAS-COMBAT-INTEGRATION.md` "Caravan camera and surroundings: implementation handoff — 2026-10-01") to be implemented:

“Well, this isn't just a caravan handoff. This is a redesign of our camera fix. We need to redesign the camera.”

Ruled: **the accepted caravan camera is the camera of every battle**, not of the caravan alone — landed as viewer.tactical-camera (viewer `b7b66e8`/`dc09f82`; numbers in `../viewer/src/camera-policy.js`, readings in `../viewer/SWITCHES.md` "viewer.tactical-camera").

Andrew, while it was built (each queued after the camera, in this order, “This is a lot to queue up after what you're currently working on.” · “Please proceed very carefully through all of these items.”):

“Okay, when the characters are moving on the map, they're not actually walking or moving. They just slide across. The whole idea of adding in a walking animation is so they use it.”

“The characters are not holding weapons. The whole idea of having 3D weapons is so they're holding weapons.”

“Also, the special move Devotion for the priest did not work. I can't double-click on it or anything to make it trigger. I can only click a regular move or just use a regular move. I'm supposed to be selecting what I'm doing.”

“Also, these characters are faded, like they're ghost-like, because there are other competing things. The characters are the stars. They should not be faded, especially not one that's selected.”

“We also need a character selector bar above the screen, the way it is in the visual playback. You have all the heroes and enemies as tiny little cards above the screen. That should still be there. And I can use that to target things as well as clicking on them.”

“Also, there's a bug where the pointed indicators revealing other things that are off-map are pointing at things that are on-map. I start out looking at three heroes, and they have those bubbles pointing at them.” — fixed with the camera (viewer SWITCHES edgeBubbleInside).

“Also, I said we could use placeholders, but don't we have more 3D things we can use? We've done all kinds of different heads, all kinds of different armor. Maybe you're just seeing the fact that we have more rigged up for the one basic male model, but the idea is to rig this up. We have the things for everything, just about.”

Asked what the heroes fight on the caravan map so it can be played in the sandbox (Imps and Bloodhounds — a provisional fight using the creatures painted on the map: 2 Imps + 2 Bloodhounds from the far end of the road, heroes at the near end, ground fires burn and the corpse hexes are cursed (Weak); marked provisional until ruled · map only · Andrew dictates), Andrew chose **“Imps and Bloodhounds (Recommended)”**.

Ruled: **the caravan aftermath is fought, provisionally, by 2 Imps and 2 Bloodhounds from the far end of the road against the heroes at the near end; its seven ground fires are burning ground and its 31 corpse hexes cursed ground (Weak).** Which end is near, the hexes, and how many heroes are Claude's readings (engine SWITCHES.md, the caravan rows).

Andrew, later the same night (queued with the rest; the links and the icon answered at once with `../PLAY.vbs`):

“Neither of those links work. And the clickable icon you put on the desktop doesn't seem to load with the updates.”

“The walking isn't very well timed or spaced based on the number of tiles that are being moved. I don't know how we sync that up better.   You're supposed to select your movement type. It's okay if it's the top one by default.  Then you can't target without an ability selected. If I am on my primary action part of a unit's activation, I automatically have a red arrow, but what is that red arrow for? I have to click an attack type, and the red arrow should only extend as far as whatever its range is. If I click someone who has a punch, it should have range 1, and if I point my arrow further away, only one space should go because it's got range 1.  Also, we still don't have other heroes. I don't know if that's in your queue or not (the way they look), and we don't have weapons. I don't see any weapons.”

Ruled (the readings): **the movement type is chosen, the top one by default; no target is aimed until an attack is chosen; the aim arrow reaches no further than the chosen attack's range; the walk is timed to the hexes walked.** `../PLAY.vbs` stops any server on port 4230, starts this folder's, opens /play, and on its first run adds a Startup starter — the 2026-09-30 "starts with Windows", which had not been set up.

## 2026-10-01 — the afflictions at 0 Health: Vampirism and Lycanthropy transform on a Luck roll, Possession raises a Ghost, Rotting Flesh gains Fragile; the first-affliction pop-up

Andrew, in a planning chat the evening of 2026-10-01 (hand-off `tmp/andrew-rulings-2026-10-01.md`, now `archive/sessions/andrew-rulings-2026-10-01.md`):

“Okay new idea: rather than a bunch of the negative consequences for werewolves and vampire badge heroes   Specifically the costs to bring them into play, but maybe also some. I don't remember what all the negatives are.   When a vampire- or werewolf-badged player unit goes to zero health, rather than making a deathbed check, they are going to transform into a werewolf or a vampire.   When they do this they are going to make a luck check.  If they are successful at rolling their luck, the player retains control of the werewolf or vampire. They have typical werewolf and vampire attack powers, but they're a player unit. They're at full health and have all the powers. If they are reduced to zero again, they fall to the ground dead in their original form.   Oh wait, no, that won't work. They fall to the ground unconscious in their original form.  There is no deathbed fighting check. The second time they're reduced to zero, they are reduced to zero and then they have their number of turns until they bleed out.  Most of the time they're going to become another enemy unit for you to fight.   If the battlefield is retreated while they're transformed, they are the same things as if they were abandoned.   Now if they succeeded, their luck, they're a strong unit under your control.  And there are no negative consequences at the end of the battle. We created transforming motions for this.   Now for being possessed: if a possessed character is knocked unconscious, they're going to spawn a ghost.  It's going to stand up from their body.   And that ghost is separate from them so the ghost is just an enemy unit.   They are still bleeding out on the ground.   I guess for rotting flesh I want to add another stat, which is +5 to the bleed out timer. The first time someone gets any one of the four main status afflictions, we need to pop up before and after art for that character with an explanation of both:
They received a bunch of stat modifiers.
There are many drawbacks.
If they are taken to zero hit points, they will most likely transform into an enemy. That is true for three of them.
If you're possessed, a ghost is going to rise from your body. If you're undead, you're just going to fall down.
  I think, actually, if you're rotting flesh and you're taken to zero, you're going to gain a badge: Fragile. Gives you -1 maximum health.  So there's a permanent consequence every time you're taken down and it will just accumulate.   Whereas the other three provide threats to your party unless you make a luck roll, which point it ends up being a boon”

Asked clarifying questions, the same evening:

“Actually, I think I'm going to leave in those costs, so one, let's leave in   the luck stat is already a percentage, so it's just literally the percentage luck.  Someone who's stacked up luck might have 40. Someone might have 0.   3. Transformed hero went over to the enemy side, or not? If they went over to the enemy side, they have a bleed out. If they stayed on your side, they don't. They just die.  Because if it goes over to the enemy side, you basically need to beat them down, and then they're bleeding out. If they stay on your side, then it works a little bit like that, but fighting, they go to zero again. Character dies.   4. We're going to use the werewolf and vampire stats. No hero gear, just werewolf and vampire stats.   5. It can only happen once because there's no reversion.   Rotting flesh hero gets death in fighting. Fragile keeps stacking with no limit. … Possessed hero, correct. No deathbed roll. They just go down. They're bleeding out, and then a ghost with their image is going to appear. It's going to have ghost stats, and it will basically be summoned on their tile. There is a before/after pop-up mid-battle that will explain what just happened with the card art of both before and after.”

“1. They're back to their normal self.  Transformation is once per battle, but there's no reason to author "Transformation is once per battle" because you can't transform when you've already been transformed.   Most heroes do have before-and-after card art”

Ruled (the readings Andrew confirmed):

- **All four afflictions keep every 2026-09-29 drawback, deploy costs included** (“let's leave in”).
- **Vampirism / Lycanthropy, at 0 Health: no Deathbed Fighting roll.** The hero transforms into a Vampire / Werewolf — the bestiary's stats and powers, no hero gear — at full Health, and rolls Luck: the chance is the Luck stat as a percentage (Luck 40 = 40%; Luck 0 = always turns).
  - **Success:** a player unit. At 0 Health again, the hero dies (no bleed-out).
  - **Failure:** an enemy unit. Beaten to 0, it falls in the hero's original form and bleeds out (rescuable as any downed hero).
  - **Retreat while transformed = abandoned.**
  - **At battle end the hero is back to normal; no other consequence.** Once per battle by nature (no reversion mid-battle) — not authored as a rule.
- **Possession, at 0 Health: no Deathbed roll.** The hero goes down and bleeds out, and a **Ghost with the hero's image is summoned on their hex, with Ghost stats, as an enemy**.
- **Rotting Flesh, at 0 Health: Deathbed Fighting as normal (its +20 kept), and the hero gains the badge Fragile: −1 maximum Health, stacking with no limit, permanent.**
- **The first time a hero gains any of the four afflictions, a mid-battle pop-up shows the hero's card art before and after**, and explains the stat changes, the drawbacks, and what happens at 0 Health. Most heroes have before/after art.

Replaces, for afflicted heroes only: 2026-09-04 'Deathbed Fighting, REVERSED' — a Vampirism, Lycanthropy or Possession hero no longer rolls Deathbed Fighting at 0 Health, and a hero transformed on the player's side dies at 0 rather than bleeding out. 2026-09-29 'the four afflictions' stands in full (every stat, drawback and deploy cost); noted, not ruled: with no roll, the Vampirism +15 and Possession −10 Deathbed Fighting on those rows have nothing to act on.

Filed: `content.afflictions-at-zero`, `rule.afflictions-at-zero`, `viewer.affliction-pop-up` (below, 'the order').

## 2026-10-01 — bleed-out is a stat on every player unit, 5; Rotting Flesh +5

Andrew, the same chat:

“I guess for rotting flesh I want to add another stat, which is +5 to the bleed out timer.”

“No, the standard bleed out right now is 5. It should be an attribute on every player unit, so it should take it from 5 to 10.”

Ruled:

- **Bleed-out is a stat on every player unit, standard 5.** **Rotting Flesh: +5 bleed-out (10).**

Replaces: COMBAT-DESIGN.md §9's "a bleed-out counter starts, 3–4 phases" (now the stat; the document is updated). Keeps 2026-08-15 'Bleed-out: how long, and when does it resolve?' — five rounds — as the stat's standard value.

Filed: with the afflictions (`content.afflictions-at-zero`, `rule.afflictions-at-zero`).

## 2026-10-01 — the XCOM-style camera: one fixed angle and zoom, 90° turns, edge scroll, the character queue

Andrew, the same chat:

“Camera angle  When I go look at XCOM 2, which is a prestige game, best in class, the way it handles camera is that there's only one fixed zoom and angle.   When you mouse or point past the edge of a map, the map just scrolls. You don't need to grab and scroll the map.   Your characters are automatically selected in order.   You can zoom out or zoom in (in this case, I think, using the mouse wheel), but it snaps back to the standard zoom as soon as you stop pressing.   So it's only a temporary condition.  The way to rotate the screen is not through freehand rotation but through a fixed button. We'll just use the arrow keys, and it rotates the screen by 90°.  I think, to go along with the character focus, we're going to put a little character portrait in the lower-left-hand corner. That is the height of the current abilities.   You can look at different parts of the map by just looking around on the map, but if you click on any of the abilities below, it'll auto-center on your player unit.  We need a very high level of translucency for things that are blocking the camera view of the characters.   One character is automatically selected to start with and the map is centered on them.  When that character ends its activation, it goes to the next character and so we just have a queue of characters.   You can alter that by double-clicking on any character in the top mini-pane or on the map.   The end turn button needs to be way less prominent.   "End of activation" is used commonly. "End of turn" is used basically never.”

Asked:

“10. Yes, I want to fully replace the camera with an XCOM-style camera.   So no tilt, no free rotation. You only rotate by basically pressing a button. If you zoom in and zoom out, it has a snapback, so the zoom in and zoom out is actually pretty limited.   Yes, it should use the character bar from left to right with civilians included.”

Ruled (the readings Andrew confirmed):

- **XCOM-style: one fixed angle and zoom. No tilt, no free rotation. The arrow keys rotate 90 degrees.**
- **The mouse wheel zooms a limited amount and snaps back to standard when you stop.**
- **Pointing past the map edge scrolls the map; no grab-drag.**
- **One character is auto-selected at the start, the map centered on them; when its activation ends, the next in the character bar, left to right, civilians included. Double-click a character in the top bar or on the map to change it.**
- **A character portrait in the lower-left corner, as tall as the ability bar. Clicking an ability re-centers on the acting unit.**
- **Anything blocking the view of a character is highly translucent.**
- **End Turn far less prominent than End Activation.**

Replaces: 2026-09-29 'the playable battle screen' — "Camera: rotate, zoom, tilt, and right-click-drag to move the map; a Reset button returns to the starting angled view" and "The hero who acts next is chosen by clicking it on the board" (now the queue, changed by double-click); 2026-09-30 'a true 3D battle' — the orbit controls ("rotates all the way around, tilts, zooms and pans"; the 3D board and bodies seen in true perspective stay); 2026-10-01 'the camera redesigned on the caravan preview' — "the accepted caravan camera is the camera of every battle" (viewer.tactical-camera). 2026-09-30's End Turn and End Activation in the lower right stay; End Turn is made far less prominent.

Filed: `viewer.xcom-camera`, first in the viewer queue.

## 2026-10-01 — the movements: every one identified, only the ones needed now built; weapon swap and shield actions are now

Andrew, the same chat:

“To-do for player units We need a really wide range of movement options for the player units to support different items and different powers.   And particularly different weapons, the shield A drink can work if there is a potion in inventory that is a power that is used.  We still need the switch function for weapon swap.”

Asked:

“12. We do need to do two separate things: 1. Identify all of the movements. 2. The movements we need right now, because I really want to get a playable version of this that looks like what it's supposed to. Doing all of the movements is going to be in the way of that.”

“weapon swap and shield actions are part of what's needed now.”

Ruled (the readings Andrew confirmed):

- **Two separate items: (1) identify every movement the content needs; (2) build only the movements needed now for a playable battle — weapon swap and shield actions are in "now".** (Drinking a potion is not named as "now".)

What is already there: the engine's swap landed as `v2.loadout-swap` (dd468e3; `v2.swap` was closed as superseded by it) and the shield powers as `v2.shields` (aaf51a5); the sandbox offers the swap only on its form controls, not on the 3D board (`kingdom/src/ui/sandbox.ts:119`). `move.actions` was closed 2026-09-25 as superseded by `movement.powers`. So "now" is the swap and the shield actions played in the battle; the list of every movement is new.

Filed: `movement.swap-and-shields`, then `movement.inventory`, first in the engine queue.

## 2026-10-01 — one continuous run through the first six battles, saved, never the kingdom map

Andrew, the same chat:

“We need a continuous play experience that goes through the first six levels, including:
the first six fights with the map
your first hero selection
your drafting of the different heroes afterwards
the rewards set for these first six battles
It doesn't really have to touch the kingdom level. It does have to save correctly, but we're not leaving battle rewards or level. We're not ever going to the kingdom map in these first six fights.”

Asked:

“13. Yes, the retaking Abitame map.   13. Yes, you can continue from the next battle.   14. Some kind of typo. Basically, there should be battle rewards, experience points, levels, and equipping inside of our sixth loop.”

Ruled (the readings Andrew confirmed):

- **One continuous run through the first six battles on the Retaking Abbotown map** ("Abitame"): first hero selection, drafting, battle rewards, experience, levels, equipping; **never the kingdom map**; **it saves, and continues from the next battle.**

Replaces: 2026-09-29 'the playable opening' — "Target: the first three battles" (now six) and "One sitting — no save and quit" (now saved, continued from the next battle); with it `kingdom.opening-loop` (2026-09-28, "in one sitting") and `kingdom.opening-loop-three`.

Filed: `kingdom.opening-run-six` (below, 'the order').

## 2026-10-01 — the order: the camera and the movements first, then the six-battle run, then the afflictions

Andrew, the same chat:

“weapon swap and shield actions are part of what's needed now. Actually, the most important things are the camera and the movements. The affliction changes and the six battle runners are less important. Those are to get the whole cycle going, to get everything in there, but I need a camera and working battles. I think there are a lot of other UI changes that have to happen.”

Ruled, the queue order:

1. **Camera and working battles** — viewer queue: `viewer.xcom-camera` first, then the already queued `viewer.unit-card-bar`, `viewer.characters-unfaded`, `viewer.weapons-in-hand`, `viewer.real-bodies` — reordered to the order Andrew listed them (asked and answered “yes”, 2026-10-01). More UI changes are expected to follow.
2. **Movements needed now** — engine queue: `movement.swap-and-shields`, then `movement.inventory`.
3. **Six-battle run** — engine: Gates (`encounter.opening.gates`, landed), Bridge AI (`encounter.opening.bridge-ai-refiled`, landed, awaiting review), the Cathedral (`encounter.opening.cathedral`, next in the engine queue after the movements); then kingdom: `kingdom.opening-run-six`, which grows `kingdom.opening-loop-three` to six with saving and supersedes it and `kingdom.opening-loop` (both to be abandoned from a terminal; `kingdom.opening-loop-three` still needs the abandoned `encounter.opening.bridge-ai` and can never start).
4. **Affliction changes** — `content.afflictions-at-zero`, then `rule.afflictions-at-zero`, then `viewer.affliction-pop-up`.

## 2026-10-01 — the first look at the XCOM camera, the weapons and the bodies: heroes face right, enemies left; a little more zoom; the edge scroll

Andrew, in the viewer chat, after playing the sandbox (viewer.weapons-in-hand, viewer.xcom-camera, viewer.unit-card-bar, viewer.characters-unfaded landed):

“The enemies should be facing to the left, and the heroes should be facing to the right. Only one hero has a weapon, which is an axe. I see an axe, and I see a shield, and I see someone else with just a shield.    I think the zoom-in and zoom-out should go a little bit further than the 0.75 and 1.4, but that is approximately what I wanted. The pointing-to-scroll on the map does not work very well. If you point to the edge, you sometimes get some movement.”

Ruled (the readings, the viewer chat's; Andrew to confirm):

- **Heroes face right, enemies face left** — at rest, every body faces its side's way across the board (heroes east, toward the enemy; enemies west); civilians are the heroes' side. Walking it faces where it walks, striking it faces its target, and it turns back when it is idle again.
- **The wheel goes a little further** than 0.75×–1.4× of the standard zoom; it still springs back.
- **Pointing to scroll must work every time** the pointer is at the edge.

What he saw, measured the same evening (battle 1, the Orphanage): the Iron Dwarf holds the tower shield and the war axe, the Battle Chaplain the round shield — his Holy Texts have no 3D model (listed, not faked: viewer SWITCHES heldModels) — and the Hunter holds the longbow in his left hand, edge-on to the fixed camera, so it reads as a thin stick. Why the edge scroll seldom moved: on a board smaller than the view the pan was pinned to the board's middle (viewer SWITCHES cameraPanNoVoid), and the board's edge is not the screen's edge in the battle screen (the bar, the panel and the ability bar surround it).

Filed: `viewer.side-facing`, `viewer.xcom-camera-tuning` — first in the viewer queue.

Andrew, minutes later, the same chat:

“Every unit faces the direction it walks, and when a unit moves next to another unit, the unit, if it's an enemy, should turn to face them. If a zombie walks up to you, you turn to face the zombie. If you walk up to a zombie, it turns to face you. If someone then walks up from another hex, it turns to face them. You also turn to face anybody who attacks you.”

Ruled: **a body's facing is kept, not reset.** It starts facing its side's way (heroes right, enemies left); it faces where it walks; **when an enemy steps next to it, it turns to face that enemy** (the latest to arrive wins); **it turns to face anyone who attacks it**; striking, it faces its target. Replaces the reading above that a body "turns back when it is idle".

## 2026-10-01 — an enemy's crit chance stops at 0; the Bridge deck goes into the pack; the abandoned ids' dependants are repointed

Andrew, in the content chat, answering its questions after fix.codex-numbers and content.afflictions-at-zero combined:

“3. Enemy creatures stop at 0.  2. The engine chat's not finished.
4. Yes.1 Yes.”

The questions, as asked: (3) "Iron Colossus and Eyeblight now have a crit of −3. Should an enemy's crit stop at 0?"; (1) "Should I file the Bridge deck rebuild (the 2026-09-30 ruling) as a content item, so the pack and battle 3 get the walkable deck?"; (4) "Both afflictions items, `rule.afflictions-at-zero` and `kingdom.reads-engine`, still list the abandoned original ids as prerequisites, and no tool can repoint them. Should the engine chat fix those?"

Ruled:

- **An enemy creature's crit chance stops at 0.** Already how the engine works, so nothing is built: −3 is the published crit *modifier* (fix.codex-numbers publishes the authored total − CRIT_BASE, SWITCHES enemyCritIsTotal), and the chance is `max(0, CRIT_BASE + crit + gear + surplus − luck)` (src/core/pipeline.ts critChanceOf), so Iron Colossus and Eyeblight crit at 0, never below. The content chat's question named the modifier as if it were the chance.
- **The Bridge deck rebuild is filed as a content item** — content/gen/opening-maps.json already carries the walkable deck (content 57711eb, source only, from the 2026-09-30 ruling 'the Bridge's northern branch is walkable'); the pack and battle 3 follow through the pipeline. Filed: `content.bridge-deck-pack`.
- **The engine chat repoints the dependants of abandoned-and-re-filed items** — `rule.afflictions-at-zero` needs `content.afflictions-at-zero` (re-filed as `content.afflictions-at-zero-refiled`), `kingdom.reads-engine` needs `fix.codex-numbers` (re-filed as `fix.codex-numbers-refiled`); no tool edits an existing item's `needs` today, and the backlog is never hand-edited.

Not ruled (2): the content chat does not wrap while the engine chat is working — `wrap.mjs` writes the package's one Now line.

## 2026-10-01 — the approved male hero outfits come into the project

Andrew, in the viewer chat, answering its questions after viewer.real-bodies landed:

“Number two, yes, that's quite important.   1 yes, 3 yes.”

The question, as asked (2): "Should the six male heroes' approved outfits, stored outside the project, be brought into `assets/characters` so they can be bound?" The outfits are the approved hero outfits under `C:/Users/aring/.codex/visualizations/2026/09/21/01a0c621-e68f-7781-abe3-7b2ec04afda2/hero-outfits/` (`motion/`, approved-review/catalog.json), which viewer.real-bodies left unused (viewer SWITCHES `realBodiesMaleOutfits`) because the page streams only from the project root.

Ruled: **the approved male hero outfits are imported into `assets/characters`** (PRODUCTION-START.md's rules; only the approved files, not the 16 GB working folder) **and each hero bound to his own**, replacing the Oathblade stand-in. "Quite important." Filed: `viewer.male-hero-outfits`. (1) and (3) answered yes: merge the worker copy back after it, then wrap.

## 2026-10-01 — a shield power plays a raise-the-shield motion; the Leap report was the Orphanage

Andrew, in the engine chat, after movement.swap-and-shields landed with the shield powers' motion listed as missing (viewer SWITCHES `swapShieldMotions`):

“One, I did not. I have only played the orphanage.   When they play shield power, they should raise the shield animation.”

The questions, as asked: (1) "Did Andrew play the Lumberjack House before or after 8:23 pm tonight?"; (2) "When a hero uses a shield power, should they play a raise-the-shield animation? The one that exists today, on the Oathblade body, plays only when that character is hit."

Ruled:

- **Every shield power plays a raise-the-shield motion** — Shield Wall, Raise Guard, Turn Aside, Brace, Cover, Stand Tall. This answers viewer SWITCHES `swapShieldMotions` for the shield powers (the swap's draw/stow motion stays listed as missing). The one clip that exists is the Oathblade body's `shield_blockleft`, today bound as its hit reaction; the motion word it plays under is proposed by the item that builds it (`guard` was the word asked about), and a body with no such clip is listed, not faked (2026-09-30 'a bunch of motions').
- **The Leap report (viewer.live-stat-mods) came from the Orphanage, not the Lumberjack House** — Andrew has played only the Orphanage. The fix is in the battle screen every opening battle shares (kingdom BATTLE-SANDBOX.html rebuilt 2026-10-01 20:23, cc7a322), so it reaches the Orphanage too.

## 2026-10-01 — a self power fires on a double-click on its bar button; the Leap fix holds

Andrew, in the engine chat, playing the Orphanage after movement.swap-and-shields and viewer.live-stat-mods were combined:

“Okay, Leap Strength modifier seems to work. The two shield powers do not work. I click on them. I don't think it understands target. If I double-click on them or click on them and click on the hero, neither one of those does anything. I should be able to double-click on it in the bar and have it activate.”

Ruled:

- **A shield power — any power aimed at its own user — fires on a double-click on its button in the action bar.** movement.swap-and-shields shipped click-the-button-then-click-it-again (kingdom SWITCHES `playInputSelfPower`); in Andrew's play neither that, a double-click, nor clicking the button then the hero did anything. Filed: `fix.shield-power-double-click`.
- **The Leap's +2 Strength now shows and counts** (viewer.live-stat-mods, confirmed by play).

## 2026-10-02 — the fast zombie's danger marker reads 3, not its Charge's 4

Andrew, in the viewer chat, told that viewer.reads-engine retired the viewer's hand-typed danger table (finding V2) and the marker now reads each unit's first attack in the engine's order — 4 for the fast zombie, whose first attack is its Charge (Strength 3 + 1), against the 3 ruled 2026-09-01 ("zombies at 3") — and asked whether it stays 4 or a Codex field names each unit's signature attack (viewer SWITCHES `dangerFirstAttack`):

“You can change it to 3.”

Ruled:

- **The fast zombie's danger marker reads 3.** Read as: the marker reads the unit's first attack that is not a Charge, from the engine's own classification (static.json `actionKinds`); a unit whose only attacks are Charges keeps its first. No hand table returns and no Codex field is added. viewer SWITCHES `dangerFirstAttack` is settled by this entry. Filed: `fix.danger-skips-charge`.

## 2026-10-02 — the Net is a trinket with no hands; the orphans and the school teacher start with a knife

Andrew, in the engine chat, after fix.one-hero-assembly-refiled landed with two provisional switches put to him (engine SWITCHES `netIsAPower`, `arrivalKit`):

“The net is a trinket with zero hands.  The Orphanage, Orphanage, and the school teacher should start with a knife each.”

The questions, as asked: (1) "Is the Net a trinket with no hands?"; (2) "Should the civilians placed by encounters (the Orphanage orphans, the school teacher) get their default kit, even though that changes every opening battle?"

Ruled:

- **The Net (`item.net`) is a trinket with zero hands.** engine SWITCHES `netIsAPower` is settled by this entry, as provisional-landed in fix.one-hero-assembly-refiled.
- **The Orphanage's orphans (`hero.fixed.orphans`) and the school teacher (`hero.fixed.school-teacher`) each start with a knife, and field it.** Read as: the knife is `item.dagger` — no knife row exists, and the teacher's Codex kit already names the Dagger; the orphans' kit becomes the Dagger in place of the pile of rocks (content/gen/heroes.json). It is fielded wherever an encounter places them. The other placed civilians (school children, farmer, lumberjack and wife, the Supper's villagers) are not named and stay as they are; engine SWITCHES `arrivalKit` stands for them. Filed: `fix.orphans-teacher-knife`.

Andrew, on the follow-up questions ("Is the Dagger the knife you meant?" and "Should fix.orphans-teacher-knife go to the top of the queue?"):

“Dagger is fine.   Should go to the top of the list.”

- **The knife is `item.dagger`** — the reading above is confirmed; no knife row is made.
- **`fix.orphans-teacher-knife` is the top of the engine queue** (re-added with `add-item --first`).

## 2026-10-02 — the opening run keeps its five-hero party; the hard battles wait for playtesting

Andrew, in the kingdom chat, after kingdom.opening-run-six landed. The questions, as asked: (1) "Should growing the draft pool and the battle party beyond five heroes and four per battle be filed as its own item?"; (2) "Is it fine that the Bridge and the Gates are this hard for the opening party, or should that be looked at?"

“1. We can leave this alone for now.
2. Not a concern yet. I'm just trying to get functionality working, and then I'll test these battles and figure out how to tweak them.”

Ruled:

- **The opening run's party stays as it is: five heroes drafted, four deployed.** No item is filed to grow the kingdom's draft pool or the deploy limit. kingdom SWITCHES `openingRunPartyShort` stands as its default.
- **The difficulty of the Bridge and the Gates is not tuned now.** Functionality comes first; Andrew will playtest the opening battles and tune them himself. No balance item is filed from the page probe's finding that the engine's AI rarely wins them with this party.

## 2026-10-02 — a hero still turned when a battle is lost is lost; the opening's heroes level whenever their XP reaches it

Andrew, in the engine chat, after fix.opening-levels and rule.afflictions-at-zero-refiled-2 landed. The questions, as asked: (2) "Should the heroes drafted after battle 1 also reach a level by the end of battle 2? Today they average 11 XP, and at least one of them levels in only 14 of 50 runs." (3) "If a hero turns against you, is never beaten down, and the battle is lost, should it come home normal and unhurt, as built now (`turnedAtBattleEnd` in `engine/SWITCHES.md`), or be treated as lost?"

“3 treated as lost.”
“Whenever they reach a level”

Ruled:

- **A hero that ends a lost battle still turned to the enemy side is lost** — it does not come home. Overturns SWITCHES `turnedAtBattleEnd`'s "the Reckoning gives it no wound" for that hero; filed as `fix.turned-hero-lost`.
- **The opening's heroes level whenever their XP reaches the curve** (20, 50, 100, 170, 270, 400). No hero is owed a level by a given battle; the newly drafted heroes' 11 XP after the Lumberjack stands. Nothing is filed.

## 2026-10-03 — the hero card sits small, left of the action bar; the log collapses behind a button out of the way

Andrew, in the viewer chat, on a screenshot of the Orphanage battle screen (the portrait standing above the bar's left end beside an open log panel, the bar's three columns spanning the full width):

“This small hero card should be smaller, and it should be to the left of the move. We need to move the move, the powers, and the attacks a little bit more to the right, make them more condensed, and put that hero card to the left. Also, collapse and put an expandable log button somewhere out of the way, not on the screen.”

Ruled:

- **The hero card is smaller and sits to the left of the action bar, beside its Move column** — no longer above the bar. Refines 2026-10-01 'the first look at the XCOM camera' ("A character portrait in the lower-left corner, as tall as the ability bar"): still lower-left, now inside the bar's row, at most the bar's height.
- **The action bar's columns — moves, attacks, powers — shift right to make room and are more condensed.**
- **The log is collapsed by default; an expandable log button opens it, placed out of the way.** The open log panel no longer stands over the board. Where the button goes is the item's switch.
- Filed: `viewer.bar-card-and-log`.

## 2026-10-03 — the camera never shows white space; pointing at an edge scrolls

Andrew, in the viewer chat, on a screenshot of the Orphanage battle screen (the board filling the upper-left third, blank parchment to its right and below, the log panel open):

“I've got giant amounts of white space, and I can't seem to scroll the map by pointing. There's no reason to ever scroll into white space.”

Ruled:

- **The view never scrolls past the board into white space.** The board fills the battle area at every zoom the wheel allows; the pan stops at the board's edges. Overturns viewer SWITCHES `xcomRoam` (the view's centre may reach any point of the board, "past the board's edge the scene's ground, or its background, shows"), which was the viewer chat's default, not a ruling.
- **Pointing at an edge scrolls the map** whenever there is board beyond it — 2026-10-01's "pointing to scroll must work every time" still holds; the fix for it must not come from letting the view into the void (the reason `xcomRoam` retired `cameraPanNoVoid`). Read as: the standard zoom is never so far out that the whole board fits with room to spare, so there is always board to scroll to.
- Filed: `viewer.camera-no-void`, first in the viewer queue.

## 2026-10-03 — a hero starts its Activation with its basic move armed; the battle screen's turn-taking is to be redesigned

Andrew, in the viewer chat, playing the Orphanage (Turn 2, Hero Phase):

“In Hero Phase 2, I can't seem to change whose turn it is. I'm stuck on the orphan, and I can't choose somebody else. The orphan seems like he's kind of faded. This whole system is really glitchy and confusing. Can we discuss what the ideal behavior should be? … This is a horrific experience right now.”

“I think that the enemy did an attack, and then their attack probability was stuck on the screen when it became the hero's turn, so I couldn't figure out whose turn it was.”

“When a player unit is first activated, it should be like we clicked the basic first movement ability. They can choose a different movement ability, and then it will switch to that, but it should start activated with the basic movement ability. They don't have to go and click on it; they can literally just move on the map by double-clicking.”

Ruled:

- **A player unit starts its Activation with its basic movement ability already chosen**, as if its button had been clicked. Choosing another movement ability on the bar switches to it. Moving needs no click on the bar: a double-click on a hex moves there. Overturns kingdom SWITCHES `playQueueProposal` where it leaves the hero proposed and not begun.
- **The enemy's leftovers must not survive into the Hero Phase** — its hit chance stayed on screen after it attacked, so whose turn it was could not be told. A bug, not a design question.
- The rest of the selection behaviour is under discussion in this chat; its outcome is recorded below this entry when ruled.

Andrew, the same chat, on the proposal's third point (a single click only looks; the bar stays with the current hero):

“Okay, clicking on an enemy unit does not pull up their attacks in your bar. There is a unit who is activated. That portrait is next to all of the abilities. That's why we're putting it down there. While that unit is activated, those abilities just stay there. I click on an enemy, and the enemy just goes into the highlight on the right screen, but it doesn't change my actions that are available.”

Ruled:

- **The action bar and the portrait card beside it belong to the activated unit for its whole Activation.** Clicking any other unit — an enemy, or another hero — shows it in the right-hand panel only; the bar, its abilities and the card do not change. Overturns viewer `src/subject.js`'s rule that the bar follows whoever was clicked last, and 2026-09-29 'the playable battle screen' where it has the panel and the bar both follow the click.

## 2026-10-03 — the battle screen's turn-taking, ruled

Andrew, the same chat, answering the four questions on the proposed turn-taking (1 one current hero with one mark, cleared when its Activation ends; 2 a Hero Phase banner that clears the enemy's leftovers, the first un-acted hero begun with its basic move armed; 3 a single click only looks; 4 a double-click on another hero switches to it while the current one has done nothing; 5 every refusal says why in one line; 6 the next un-acted hero begins when an Activation ends, left to right, acted heroes greyed with a ✓; 7 heroes and enemies apart in the top bar):

“It just shows the path. You need to double-click or click it again so it shows the path. That way, you can also plan out your attacks from that spot. Yeah, let's create a separation between the heroes and the enemies so they don't get mixed up. There's just a divider in between that's clear. No, you may not switch to another hero and come back later to finish. You have to complete one hero's activation before you move on to the next. For yes”

Ruled:

- **A single click on a hex shows the path there; a double-click, or a second click on the same hex, moves.** While the path is shown, the attacks are planned from its end — the bar's hit chances and targets read from that hex.
- **The top bar keeps heroes and enemies apart, with a clear divider between them.**
- **No partial Activations.** A hero's Activation is finished before another hero's begins; there is no switching away and coming back. The engine already holds this (`src/core/commands.ts` `not-current-actor`); root `COMBAT-DESIGN.md:85` said otherwise ("partial moves (move A, act with B, finish A)") and is corrected to this entry.
- **The seven-point proposal is accepted** ("For yes", read as "four: yes"). With the earlier entries today: the bar and its card stay with the activated unit; a hero begins with its basic move armed; the enemy's hit chance and other leftovers clear before the Hero Phase.
- Filed: `viewer.turn-taking`, first in the viewer queue.

## 2026-10-03 — the civilians hold their dagger as a weapon, not baked into a body copy

Andrew, in the viewer chat, after reporting the Orphan Child and the School Teacher show no dagger on the battle screen (`fix.orphans-teacher-knife` put `item.dagger` in their kit, but viewer `tools/character-models.mjs` gives civilians no held props and its `HELD` map has no `item.dagger`). Asked whether to use the existing civilian-study `knife-v1` candidates — a copy of each body GLB with the knife embedded as rigid equipment and the Knife ready / walk / attack clips baked in:

“I just want to get this working. Do we have a model for a knife or a dagger? And then do we have a motion for a dagger stab?”

“No, we don't want to create a version with the knife painted into the hand. We want to use a knife or a dagger the way they're supposed to be used.”

Ruled:

- **A civilian's kit weapon is a separate held model in its hand, the way the heroes' kit is** (viewer `HELD`, SWITCHES `heldModels`): the item drives the model, so a changed kit changes what is held. `item.dagger` is drawn with the shared dagger model (weapon tester `dagger`, as `item.obsidian-fang-dagger` already is), fitted to each civilian body's right hand.
- **The per-body `knife-v1` GLBs are not used on the battle screen** — no body copy with the weapon built in. Their Knife attack motion source (civilian-study `run.json`) may be reused for the stab, on the unarmed body.
- **A civilian with a dagger stabs when it attacks.**
- Filed: `viewer.civilian-held-dagger`, last in the viewer queue.

## 2026-10-03 — switching heroes before one has acted keeps the sandbox's save-and-restore for now

Andrew, in the viewer chat, after `viewer.turn-taking` landed with the finding that the engine has no command to take back a begun Activation (the battle screen saves the battle before an Activation begins and restores it when the player switches to another hero; kingdom SWITCHES `turnSwitchUndo`). Asked whether the engine should get a proper "pick a different hero instead" action or keep the workaround:

“That workaround seems fine for now.”

Ruled:

- **kingdom SWITCHES `turnSwitchUndo` stands** — the save-and-restore is accepted for now. No engine `release-activation` command is filed.

## 2026-10-03 — a held weapon is gripped: the hand closes round it, for every body

Andrew, in the viewer chat, after `viewer.civilian-held-dagger` landed (worker copy) with the Orphan Child's and the School Teacher's dagger lying across an open palm (viewer SWITCHES `civilianGrasp`: the finger curl existed only in the excluded knife-v1 copies), asked whether the fingers should close round the dagger:

“We need to close the hands over the plate for everything, don't we?”

Ruled:

- **Every held weapon is gripped — the fingers close round it — on every body that holds one.** Read as: "the plate" is the handle the hand holds. An open palm under a held weapon is a defect, not a look; viewer SWITCHES `civilianGrasp` is overturned by this entry and the civilians' grip is closed as part of their dagger work.

## 2026-10-03 — the civilians' dagger attack: the Hook punch for now; a hand-keyed standing stab is made for review

Andrew, in the viewer chat. `viewer.civilian-held-dagger` landed (worker copy) playing the walk-assassinate clip, which he had already rejected for the civilians (civilian-study `run.json` sourceCorrection). Its replacement, ActorCore "Dagger Attack":

“I don't own that Dagger Attack, and it's too complex. Do we have some other option here?”

Shown the sword-and-shield `atk_stab` and the selected Hook punch (`Melee_Hook`):

“The problem with this is it's crouched with the dagger. It's like a fighting pose, and I don't think that works well for the dagger in a civilian.”

Asked (1) whether to make a simple hand-keyed standing stab for the Orphan Child and the School Teacher (dagger hand drawn back, thrust forward, about a second), reviewed before it is used, and (2) whether they keep the Hook punch with the dagger in hand until then:

“Sure, we can use that for now.”

Ruled:

- **Until the stab is approved, a civilian holding a dagger attacks with the selected Hook punch, dagger in hand.** The walk-assassinate clip is not played; viewer SWITCHES `civilianStab` is overturned by this entry.
- **A hand-keyed standing stab is made for the two civilian bodies** — upright, no fighting crouch, the dagger hand drawn back and thrust forward, about a second — as a review candidate. It is not wired into the battle screen until Andrew accepts it.
- With the entry above ('a held weapon is gripped'): their hand closes round the dagger.
- Filed: `viewer.civilian-dagger-grip-punch`.

## 2026-10-03 — the standing stab is shelved as is

Andrew, in the viewer chat, reviewing the hand-keyed standing stab candidate built in `viewer.civilian-dagger-grip-punch` (civilian-study `standing-stab/review.html`, five keys, Orphan Child and School Teacher):

“Yeah, there's a totally stiff body except for a hip pivot. We need a lot more lean and wind-up, a lot more body motion. Legs need movement.”

Then, before any rework began:

“Wait, but let's just stop this. Just leave it as is and move on to all the other viewer things, because this is just not important.”

Ruled:

- **The standing stab is shelved as is — not accepted, not reworked, not on the battle screen.** The feedback above stands as the note for whoever picks it up: more lean and wind-up, more body motion, legs moving. The Orphan Child and the School Teacher keep the closed grip and the Hook punch with the dagger in hand, as landed in `viewer.civilian-dagger-grip-punch`.
- No item is filed for the stab; the viewer queue moves on.

## 2026-10-03 — the affliction pop-up's 0-Health words and its drawbacks come from the engine

Andrew, in the viewer chat, after `viewer.affliction-pop-up` landed with two findings: the engine's `badge.gained` event does not carry the Codex's ruled 0-Health text, so the pop-up's "At 0 Health" paragraph is the viewer's own wording read off the rule's shape (viewer SWITCHES `afflictionZeroWords`), and the event does not say which written terms are drawbacks (viewer SWITCHES `afflictionDrawbacks`). Asked whether to queue a small engine job so that text and the drawbacks come from the engine:

“Okay, do it that way.”

Ruled:

- **The engine supplies the affliction's ruled 0-Health wording and marks which of its terms are drawbacks; the pop-up shows those and writes none of its own** (Viewer Constitution Law 0). viewer SWITCHES `afflictionZeroWords` and `afflictionDrawbacks` stand only until the item lands.
- Filed: `fix.affliction-pop-up-words` (engine queue).

## 2026-10-03 — the opening battles are watchable as computer-played replays

Andrew, in the viewer chat after its wrap, asked whether the viewer is set up to replay the opening battles (three of the six are in the replay library: `test.opening-orphanage`, `test.opening-lumberjack`, `test.opening-bridge`; the Gates, the Cathedral and the Cavern Trail are not):

“I want to be able to watch some of the replays of these initial battles.”

Asked whether he wants to watch back battles he played himself or computer-played recordings:

“Just the computer played recordings.”

Ruled:

- **The replay library carries a computer-played recording of each of the opening's six battles** (the engine plays both sides; `export-battle.mts`), current with the engine. Saving and replaying a battle the player played is not asked for.
- Filed: `viewer.opening-replays`.

## 2026-10-03 — the characters must stand out from the board: try 10% larger characters and 10% smaller hexes

Andrew, in the viewer chat after its wrap, looking at the battle screen on the painted Orphanage:

“Okay, the characters don't stand out enough against the backdrop. They look a little too small on the screen. I think I want to see it with 10% larger characters and 10% smaller hexes. And what else can we do to make the characters stand out more? We have a very colorful background. Is that part of the problem? Do we need more shadows? I don't know what we need.”

Ruled:

- **He wants to SEE the battle screen with characters 10% larger and hexes 10% smaller** — a look to judge, not yet the accepted default. Read as on-screen sizes: the standard view shows the board at 0.9×, and a body stands 1.1× its present on-screen height (so about 1.22× against its hex). viewer SWITCHES `modelScale` ("the roster's stature in the scene's own metres") is what this would overturn if accepted.
- **What else makes them stand out is open, and his to pick from what he is shown.** Found at the time: the bodies cast no shadow (viewer `src/models.js` `castShadow = false`), they are lit by the scene's own sun, and the painted ground is as bright and saturated as they are. Candidates to show him, each on its own switch: bodies casting shadows with a soft dark patch under the feet; the ground slightly darker and less saturated; a thin light rim on each body in its side's colour; a side-coloured base disc under every unit.
- Filed: `viewer.characters-stand-out`.

Andrew, minutes later, before any of it was built:

“Actually, let's change this to 30% bigger characters, 10% smaller hexes.”

- **Corrected: characters 30% larger, hexes 10% smaller.** The standard view shows the board at 0.9×, and a body stands 1.3× its present on-screen height (about 1.44× against its hex). This replaces the 1.1× above wherever it is read — including the text of `viewer.characters-stand-out`, filed with the first number (no tool edits a filed item's spec; this entry is the newer and wins, DISPLAY-RULES rule 22).

## 2026-10-03 — the cards above the battle: the fallen leave, a downed hero's card wears a first-aid mark

Andrew, in the viewer chat while `viewer.characters-stand-out` was being built:

“When an enemy goes down, they should no longer have their card above the battle. When a hero is dead, it's the same. When a hero is downed, their card on the battlefield should have a little first aid symbol in the upper right-hand corner.  If they're bleeding out”

Ruled:

- **An enemy that goes down has no card above the battle any more; a dead hero the same.** Today the card stays, greyed, with a ✝ (viewer `src/rail.js`, the `gone` chip) — this overturns that.
- **A downed hero keeps their card, with a little first-aid symbol in its upper right-hand corner.**
- **Open: the message ended at “If they're bleeding out”.** What a bleeding-out hero's card shows is not ruled; asked in the same chat. No item is filed until it is answered, so the item's text is whole.

## 2026-10-03 — card art for every weapon at tiers 0 and 1, then a model from each card; tier 0 plain, tier 1 normal with details

Andrew, in a new chat at the root:

> We need to create card art, whether it be for a simple item like a dagger or a more complicated magical item. We need card art for every weapon.  Type at the very least. […] we don't need all magical versions of all things, but we do need card art and then a model for every weapon type that we have […] First, we should create card art. That's a reference piece of material that is used when the item is selected and shown, and then we create a model out of that. Now, the tier 0 items should look fairly plain.   Tier 1 items should look normal but still have interesting details.

The weapons he named: wood axe, war axe, two-handed axe, giant axe, scythe, sickle, pair of daggers.

Asked four things — (1) every tier 0 and tier 1 weapon in the game plus the dictated ones that are missing, or one card per weapon family; (2) whether the 17 existing weapon cards stay; (3) whether the images are made through fal.ai from the chat or by Codex as last time; (4) whether Wood Axe and Sickle are tier 0 and Two-Handed Axe, Giant Axe and Scythe tier 1:

“You can leave the ones that are already there, but we should do all the rest of the ones mentioned in one.   Guess 3. Let's do it in Codex.   4, that's correct.”

Ruled:

- **Every weapon at tier 0 and tier 1 gets card art, and then a model made from that card.** The card is the reference shown when the item is selected. Not every magical version needs its own.
- **Tier 0 looks fairly plain. Tier 1 looks normal but still has interesting details.**
- **The 17 existing weapon cards stay as they are**; only the weapons without one are drawn.
- **Codex draws the cards**, as it drew the first 17.
- **Wood Axe and Sickle are tier 0; Two-Handed Axe (the Great Axe), Giant Axe and Scythe are tier 1.** They are still not rows (V2-SHIELDS-AND-WEAPONS-2026-09-20.md, sixth pass); this settles only their tier.
- Where it lives: `assets/characters/oathblade-armor/rebuild/candidates/weapon-card-references/prompts-v2.json` — 50 cards, with the choices made without asking listed in its `defaults` (one wood-axe card for `item.hand-axe` and the dictated Wood Axe; a paired weapon drawn once; no card for natural weapons; dictated weapons with no tier yet left out).

## 2026-10-03 — every civilian fields its kit by default when an encounter places it

Andrew, in the kingdom chat, watching a replay: "I see the lumberjack only punches. He's supposed to have a wood axe. Is the content authored one?" The content is authored — `hero.fixed.lumberjack-and-wife`'s kit is `item.lumberjack-axe` (Chop, Cleave) — but an encounter-placed civilian is fielded without its kit (engine SWITCHES `arrivalKit`), and the 2026-10-02 ruling named only the orphans and the school teacher. The questions, as asked: (1) "Should the Lumberjack field his axe when an encounter places him?"; (2) "Should his wife field her dagger and basic armor the same way?"; (3) "Should the rest of the placed civilians get their kits too (school children with rocks, the farmer with his pitchfork, the Supper's villagers with daggers), or only the ones you name?"

“Yes, all of the civilians, by default, should field their kit the first time they're loaded.   So all of them should get it.”

Ruled:

- **Every civilian an encounter places fields its Codex default kit, by default.** The Lumberjack fights with his axe, his wife with her dagger and basic armor, the school children with the pile of rocks, the farmer with the pitchfork, the Supper's villagers with their daggers. Read as: "the first time they're loaded" is the moment an encounter puts the civilian on the board, as a setup unit or a scheduled arrival. This replaces the 2026-10-02 entry's "the other placed civilians … stay as they are". engine SWITCHES `arrivalKit` is settled by this entry for civilians; `placedWithKitFlag`'s opt-in list (content `gen/civilian-rulings.json` `placedWithKit.ids`) is no longer how a civilian earns its kit. Enemies an encounter places are not named and stay as authored. Filed: `fix.civilians-field-kit`.

Andrew, on the follow-up question ("Should the civilian kit item go to the top of the engine queue?"):

“Yes.”

- **`fix.civilians-field-kit` is the top of the engine queue** (re-added with `add-item --first`).

Andrew, the same chat, on the entry's "Enemies an encounter places are not named and stay as authored":

“If enemies have weapons assigned, they need them also when they come into play.”

- **An enemy with weapons assigned fields them when it comes into play, the same as a civilian.** This replaces the line above it answers: the rule is one rule for every unit an encounter places — setup unit or scheduled arrival, civilian or enemy — a row that carries a kit fields it. Read as: today no bestiary row assigns a weapon (all 240 rows in content `hbt-content.json` are authored with their own attacks; none carries a kit or names an `item.*`), so no enemy changes in battle now; the rule holds for the first enemy that is given one. `fix.civilians-field-kit` carries it.

## 2026-10-03 — both war hammers; tiers for the rest of the dictated weapons

Andrew, same chat, asked (1) whether a two-handed war hammer should be drawn, since the existing war hammer card is one-handed and `item.war-hammer` is two-handed, and (2) whether short sword, giant sword, the three flails, pike and giant scythe get cards now and at which tier:

“One, we need both.   Short sword and green flail are both tier 0. Everything else is tier 1.”

Ruled:

- **Both war hammers are wanted: a one-handed and a two-handed.** The existing one-handed card stays; a two-handed card is drawn for `item.war-hammer`. The one-handed war hammer is not yet a row.
- **Short Sword and Grain Flail are tier 0. Giant Sword, War Flail, Two-Handed Flail, Pike and Giant Scythe are tier 1.** "Green flail" is read as the one-handed Grain Flail (V2-SHIELDS-AND-WEAPONS-2026-09-20.md, sixth pass, spells it both ways). They are still not rows; this settles only their tier.
- All eight get cards: `prompts-v2.json` now holds 58.

## 2026-10-03 — what the tiers mean: tier 0 substandard, tier 1 standard, enchantment from tier 2

Andrew, same chat, minutes later:

“Tier 0 is for weapons and armor that are substandard to start with.  Standard things you're going to buy and equip everyone with are tier 1.   Tier 2 is when you go into enchantment.”

Ruled:

- **Tier 0 is substandard weapons and armor, what you start with.**
- **Tier 1 is the standard gear you buy and equip everyone with.**
- **Enchantment begins at tier 2.** This agrees with 2-ACTIONS-SETTLED.md ("Tier 0 is the junk tier") and the 2026-09-28 entry (enchantments are tier 2).
- Read for the card art as: no tier 0 or tier 1 card shows enchantment, glow or magical light, mage and priest implements included; a staff shows its element through material, colour and shape (`prompts-v2.json` `tierLook` and `defaults`).

## 2026-10-03 — a weapon's attacks carry their motions: the motion is tied to the specific attack, not to the body

Andrew, in the kingdom chat, after the civilians' and enemies' kit ruling:

“I don't expect it's done this way right now, but weapons should have their animations assigned to them.   So if I give a skeleton an axe, the axe is tied to the motion.”

“I guess it's really the specific attacks that are tied to emotion.”

How it is today (engine `generated/movements.json`, viewer `tools/character-models.mjs` MOTIONS): the motion belongs to the body. Each body binds one clip per motion word; all 86 melee weapon attacks play the word `attack` — the same clip, `atk_slashdown`, on every one of the 21 hero bodies, an axe's Chop and Cleave alike — the 68 ranged ones play `ranged`, and 21 weapon attacks have no motion.

Ruled:

- **Each specific attack is tied to its motion, and a weapon brings its attacks' motions with it.** Read as: "emotion" is "a motion" (dictated). The motion is assigned on the attack (a weapon's Chop and its Cleave may differ), not chosen by the body that swings it; whoever is given the weapon — hero, civilian or enemy, "if I give a skeleton an axe" — plays that attack's motion. A body whose rig has no clip for an attack's motion is listed, not faked (2026-09-30 'a bunch of motions'). Which motion each attack gets is Andrew's to choose or approve by eye; making a clip for a rig is art's work. Filed: `viewer.attack-owns-motion`.

## 2026-10-03 — posted: which motions enemies and heroes need, and enemies of one type move together (questions out, no item filed yet)

Andrew, in the kingdom chat: "We have a bunch more things to add to the various queues. Ask me questions about what I'm posting." His post, whole:

“Most enemies only have: If they are a monster and have a different form, they're going to have an attack, potentially a ranged attack. They always need a melee attack but potentially a ranged attack. They might have a power use of some kind or a spell cast. They might have two. If they're a monster, they should have a move. They might need a flight that might be included in a move.

Monsters that have different forms just have a limited set of actions. There are humanoid enemies, and I think a zombie falls into the monster category. It's not holding weapons and moves in a unique way.   If they are a thing that moves like a human, they might have different weapons and can use a lot of the similar motions that the player units use.

The player units have their body type and their armor type.   Then they have what it is they're holding.  And what they're holding affects their motions a great deal.   It's different to move when you're holding a staff than it is when you're holding a sword and shield. In particular I think there is "shield" and "not shield."   And these are different titles, they're different movements, and they're different actions.   Now the attacks are very much determined by the weapon.  Every hero needs to be able to punch.   An attack with a variety of weapon attacks. There are quite a few. I think in one pack there are five and in another pack there are two or three. Different motions for a one-handed attack with a right-handed weapon   I actually want to use all of them because I want a variety in the attack motion.  Some of them are combos, and we can combine them for more advanced types of attacks. When there's a duplicate attack or an attack is shown twice, it shows 2.  But it does look better when they're a little bit more unique.   Now there's a whole class of weapons that are swinging weapons that are two-handed. There's no shield.   When you're wielding a shield, there are some shield motions. In particular there's getting hit when you're carrying a shield and then your shield is blocking something.   One of the other big divides here is whether or not a character is standing or floating.  There is a thing in the game called airwalk, which means you're floating. It is different from flight, which means you take off. You need a launching motion, a moving motion, and a landing motion.  Every type of hero needs flight. If you're floating, you're going to make your attacks from that position and cast your spells from it.   There are also special movements. Right now I have four and I don't think we have the motion set for leap properly.   But the special movements are roll, side flip, back flip.   The roll is a forward roll. Maybe we need to find a side roll. The idea is that you would turn to the side and then roll. A side flip means you would side flip and then land in another square, and a back flip means you would back flip and land in the square behind you. All those will be tied to different special movement actions.

During the enemy turn I would like for all of the enemies of a type to move at the same time.  What I mean by this is only the move actions. They can still be determined in the order they should have been determined, but we're just displaying it as if they're all moving at the same time. If I have five zombies on the board, all five of them will conduct the move action simultaneously.   We can then pause that if we need to because of attacks of opportunity.  Special free attacks, but all of the burn-by-terrain movement can happen simultaneously by unit type. If there are zombies and bloodhounds and zombies are going first, you might move 5 zombies all at the same time and 4 bloodhounds. The vampire would move on its own time.   We'll move all of the category, then have them perform actions if they have any. I move 5 zombies. If there are no attacks, it just skips the entire attack phase.   This post speeds things up and, I think, makes them visually more interesting.   But functionally it should be exactly the same.”

Kept here as posted so the words are not lost. Nothing is ruled or filed from it yet: the kingdom chat's questions are out, and the entries and items follow his answers. Already recorded and not re-asked: ART-NOTES.md 2026-10-02 'Spear hold, spear stab and dagger stab' (the hero coverage: weapon families, varied strikes for multi-attacks, flight, roll, flip and floating airwalk for every hero) and 'Airwalk staff casting' (a staff caster under airwalk floats and casts floating).

## 2026-10-03 — the characters stand out: the size change does it; shadows are kept; the other three do little

Andrew, in the viewer chat, after looking at `kingdom/CHARACTERS-STAND-OUT.html` (the five looks of `viewer.characters-stand-out` on the Orphanage):

“Okay, looks like the size change does it, and nothing else seems to help that much, but we should still have them have shadows. Can I see it with just the size changes and the shadows?”

Ruled:

- **The size look does it** — characters 30% larger, hexes 10% smaller.
- **The bodies should still cast shadows.**
- **The ground tone, the rim and the base disc do not help that much.** Not accepted; they stay off, as they are.
- **Not yet a default.** He asked to see size and shadows together first — shown at `BATTLE-SANDBOX.html?play=encounter.opening.orphanage&look=size,shadows`. The item that makes them the default is filed once he has seen that and said so.

## 2026-10-03 — size and shadows are the default; the bleeding-out card; switching heroes asks first; movement costs on the grid; a tooltip on every hex

Andrew, in the viewer chat, shown the Orphanage with only the size change and the shadows (`BATTLE-SANDBOX.html?play=encounter.opening.orphanage&look=size,shadows`) and asked "Having seen size and shadows together, should I make those two the default for every battle?":

“Answer to question one: yes.”

And, in the message before it, finishing the sentence the cards entry above left open ("If they're bleeding out") and adding three more:

“The hero card above the battle should show a first aid icon in the upper right-hand corner and the number of turns they have left.   Okay, when you double-click on a hero but you still have a hero primary activation left, it should pop up and say, "End activation of X hero and start activation of Y hero."  I instinctively want to double-click on a new hero when I'm done with the previous hero. The problem is, there needs to be some kind of check to make sure that I'm willing to end the activation of that other hero.   When the movement grid is up (the blue movement grid on the board), tiles that require extra movement points should have that movement cost, I think, maybe on them in gray.”

“Also, when I'm just pointing around the map, any hex I point at should have a little hover tooltip below it that says what the tile is and any special things about the tile, like: It costs 2 to move there. It will inflict burning on you. It's a water tile. Any questions?”

Ruled:

- **Size and shadows are the default for every battle**: characters 30% larger and hexes 10% smaller, and the bodies cast shadows. This overturns viewer SWITCHES `modelScale` (the roster's stature in the scene's own metres) and the bodies' `castShadow = false`. The ground tone, the rim and the base disc stay off ('the size change does it', above).
- **A bleeding-out hero's card above the battle shows the first-aid icon in its upper right-hand corner and the number of turns they have left.** This closes the open point of 'the cards above the battle' above. The number is the engine's bleed-out count, the one the board already draws over a downed body.
- **Double-clicking another hero while the current hero still has its primary action asks first:** a pop-up, "End activation of X hero and start activation of Y hero." Confirming ends X's Activation and begins Y's; X does not come back ('No partial Activations', this date). It is the check that he is willing to end the other hero's activation — he double-clicks the next hero by instinct when he is done with the last.
- **While the blue movement grid is up, a tile that costs extra movement points carries that cost, in grey.** Said as "I think, maybe": a look to judge.
- **Pointing at any hex shows a little tooltip below it: what the tile is and anything special about it** — what it costs to move there, what it inflicts, that it is water.
- Filed: `viewer.size-and-shadows-default` (first in the viewer queue), `viewer.fallen-cards-and-first-aid`, `viewer.switch-hero-asks`, `viewer.move-cost-on-grid`, `viewer.hex-tooltip`.

## 2026-10-03 — switching from a hero that has not acted is free; the hex tooltip describes the ground only

Andrew, in the viewer chat, answering the two questions on the items filed above (1 if the current hero has done nothing at all yet, does a double-click on another hero switch freely as today, or ask too; 2 does the hex tooltip also say who is standing on the tile, or only describe the ground):

“1. Yeah, switch freely if they haven't acted yet.  2. Yeah, just ground only.”

Ruled:

- **A hero that has not acted yet is switched away from freely** — no pop-up; the pop-up of `viewer.switch-hero-asks` is for a hero that has begun and still has its primary action. As the item was filed.
- **The hex tooltip describes the ground only** — never who stands on it. As `viewer.hex-tooltip` was filed.

## 2026-10-03 — the post's twelve questions answered: enemy and hero motions, the special moves' looks, enemies of one type move together

Andrew, in the kingdom chat, answering the twelve questions put to the post above. Each question as asked, then his words.

1. "Is the rule for sorting enemies simply that an enemy holding weapons moves like a human and uses the hero motions, and every other enemy (zombies included) is a monster with its own short list?" — “One, yes.”
2. "Is a monster's full list: standing, moving, one melee attack, getting hit and dying, plus a ranged attack, up to two power or spell motions, and flight only where that monster has them?" — “Monster full list. I guess there's also dodging and blocking sometimes, but we may not have those. It's a lot harder to animate the monsters.”
3. "…should a named attack (say Chop) always play its own swing, or pick at random from several swings assigned to it?" — “So, chop has its own swing, but I think some of those swings will have more than one choice, so it'll be random. In a lot of cases, I think, there'll just be one, but sometimes we'll be able to assign more than one because there's more than one option. It can just be random among the more than one option.”
4. "When one attack strikes twice, do you want two different swings played one after the other, instead of one swing with a "2" shown?" — “For yes, when an attack strikes twice, we want two different swings. Ideally, if there are two different swings, it's two different ones out of the choices, but there could easily be a hound attack that only has one attack and it attacks twice, so we have to just repeat it.”
5. "Is this the full list of "what they're holding" sets that each get their own stance and walk: weapon and shield, one-handed weapon alone, two-handed swinging weapon, staff, bow, two daggers, and empty hands?" — “In five, I think a spear is actually different than those, so I think add spear to that.  And I think we'll have a pole arm that has the same standing and walking, even though the swings are different, so pole arm and spear are the same.  There is also a wand or a holy item. I think that stance is not the same as the one-handed weapon alone.”
6. "With a shield, do you want two separate reactions: one where the shield blocks the blow, and a different one where the blow lands anyway?" — “6, yes.”
7. "Should a hero with Airwalk float for everything (standing, moving, attacking, casting, getting hit), not only when casting with a staff?" — “7. Yes, basically, a hero with air walk is floating all of the time.”
8. "Does "every type of hero needs flight" mean every hero body gets the three flight motions (launch, fly, land) now, even for heroes with no flight power today?" — “Yes, every type of hero needs flight because they can gain flight. There are magic items that give flight, and there are powers that give flight.”
9. "Are forward Roll, Side Flip and Back Flip new moves to add to the game's rules, or new looks for the four moves that exist…?" — “I think side flip is going to be side step. We already have a roll, like a roll sideways. We're going to use the roll for that, but you have to turn and then roll. I think we're going to add another movement power tied to backflip, just because it looks cool and it'll be another special move that people can unlock.” and, at the end: “Forward roll. We're going to use the forward roll as the side roll. Side flip is side step. We still need something for leap. I don't think we have one, and then we still need charging run.   Although charging run, we can just use a run.”
10. "For moving together, do zombies and fast zombies count as one group or two?" — “Zombies and fast zombies would count as two groups.”
11. "Is it fine for a zombie to be shown moving before an earlier zombie's attack plays, even though by the rules that attack came first?" — “11. Yeah, it's fine for it to be like, "All the zombies move, and then attacks play."”
12. "When a hero gets a free attack on one moving zombie, should the whole group freeze while it plays, or only that zombie?" — “12. I think a free attack stops all action and just plays out, so the whole group freezes.”

Ruled:

- **Enemies sort in two: one that holds weapons moves like a human and uses the hero motions; every other enemy, the zombie included, is a monster with a short list.**
- **A monster's list:** standing, moving, one melee attack, getting hit, dying; a ranged attack, up to two power or spell motions and flight only where it has them. Dodging and blocking are wanted "sometimes" and may not exist: read as optional, not listed as missing.
- **An attack has its own swing, and may be assigned more than one; the screen picks at random among them.** This completes 'a weapon's attacks carry their motions' above. An attack that strikes twice plays two different swings where it has two, and repeats its one swing where it has one (a hound). Read as: the pick is the screen's, never the engine's dice — the battle is unchanged.
- **The held sets, each with its own stance and walk:** weapon and shield · one-handed weapon alone · two-handed swinging weapon · spear or polearm (one stance and walk, different swings) · staff · wand or holy item · bow · two daggers · empty hands.
- **A shield has two reactions:** the shield blocks the blow; the blow lands anyway.
- **A hero with Airwalk floats all of the time** — standing, moving, attacking, casting, getting hit. Widens ART-NOTES 2026-10-02 'Airwalk staff casting'.
- **Every hero body gets flight — launch, fly, land** — because any hero can gain flight from an item or a power.
- **The special moves' looks:** Side Roll plays the forward roll, the hero turning to the side first; Sidestep plays the side flip; Charging Run plays a run; Leap has no motion yet and needs one. No forward Roll or Side Flip power is added.
- **Back Flip is a new movement power**, tied to the back flip, a special move a hero unlocks. Its rules (reach, cost, who unlocks it, what "behind" means — the engine holds no facing) are not ruled yet.
- **In the Enemy Phase the enemies of one unit type are shown moving at the same time, then that type's attacks play, then the next type.** Zombies and fast zombies are two groups. A free attack on a moving enemy freezes the whole group while it plays. Display only: the engine decides every activation in its own order and the result is exactly the same.

No item is filed from this entry yet: a second round of questions is out.

## 2026-10-03 — Back Flip's rules; enemies only move together; the motion work comes first

Andrew, in the kingdom chat, answering the second round. The questions as asked: (1) "Should Back Flip follow Side Roll's rules (one hex, provokes nothing, ignores terrain cost), only in a different direction?"; (2) "Since the rules don't track facing, should "behind" for Back Flip mean directly away from an enemy standing next to the hero?"; (3) "Who can unlock Back Flip, and what should it cost in stamina?"; (4) "If the rules have enemies acting in a mixed order (zombie, hound, zombie), should the screen still gather all the zombies into one group and show them first?"; (5) "Should allies of one type, such as the orphans, also move together on their turn, or is this for enemies only?"; (6) "Should the art needs go into the art queue as items to build, or be recorded as a coverage list in the art notes for you to schedule?"; (7) "Which should be built first: enemies moving together, or the motion work?"

“Let's create a backflip. Moves 1 hex back, provokes nothing, ignores terrain costs, and gives +20 dodge until the end of next activation.  2. Yes.   Should cost 1 stamina.  I guess backflip is just a visual element. We don't have to have it be related to an enemy. It's just moving into another square that's adjacent to you.   5 enemies only.   Motion work first.”

Ruled:

- **Back Flip is a movement power: move 1 hex, provoke nothing, ignore the destination's terrain cost, +20 Dodge until the end of the next Activation; 1 Stamina.** The destination is any adjacent hex: the "2. Yes" (away from an adjacent enemy) is replaced by his next words — the back flip "is just a visual element", "moving into another square that's adjacent to you". Read as: "the end of next activation" is the end of the hero's own next Activation, so the Dodge holds through the Enemy Phase between; a bonus move like Side Roll (it does not add the Movement stat); no cooldown, none being named. Not ruled: who unlocks it — no class is granted it until he says. Filed: `movement.back-flip`.
- **Only enemies move together.** Allies of one type (the orphans) keep moving one at a time.
- **The motion work is built before enemies moving together.**
- Not answered, defaults taken: (4) the screen gathers every enemy of a type into one group even when the engine's order is mixed, the groups in the order each type first acts — the builder's switch in `viewer.enemy-type-moves-together`; (6) the art needs are recorded as a coverage list in ART-NOTES.md (2026-10-03 'the motion coverage, ruled'), the art queue left empty until he says to fill it.

Filed from this entry and 'the post's twelve questions answered' above — engine queue: `movement.back-flip`; viewer queue, in this order after what was already there: `viewer.special-move-motions`, `viewer.shield-block-and-hit`, `viewer.airwalk-floats`, `viewer.enemy-type-moves-together`. `viewer.attack-owns-motion` (filed earlier today) now carries the several-swings rule.

## 2026-10-03 — Back Flip: cooldown 4, introduced in class powers; the art needs become art-queue items

Andrew, in the kingdom chat. The questions as asked: (1) "Who can unlock Back Flip? Until you say, no class gets it and it can only be used in the sandbox."; (2) "Should Back Flip have a cooldown or cost more than Side Roll, given it does everything Side Roll does plus the Dodge?"; (3) "Should the art needs (flight for every hero body, the nine held stances, a Leap motion, the monster list) become items in the art queue, or stay as the list in the art notes?"

“Let's give it a cooldown of 4.  Backflip will be introduced in class powers.   The art needs should become items in the art queue.”

Ruled:

- **Back Flip has a cooldown of 4.** With 'Back Flip's rules' above: 1 hex into any adjacent hex, provokes nothing, ignores terrain cost, +20 Dodge until the end of the next Activation, 1 Stamina, cooldown 4.
- **Back Flip is introduced in class powers.** Read as: a hero gets it as a class power, the way Sidestep, Side Roll and Leap are; which class or classes is not named yet, so `movement.back-flip` puts it in the pack granted to no class, and the class is his to name when the class powers are set.
- **The art needs are items in the art queue.** Filed, in this order: `art.hero-flight-motions`, `art.held-set-stances`, `art.leap-motion`, `art.monster-motion-lists` — the four asked about — and the rest of ART-NOTES.md 2026-10-03 'The motion coverage, ruled': `art.one-handed-swing-variety`, `art.airwalk-floating-motions`, `art.hit-reaction-not-block`. The 'defaults taken' line above (the art queue left empty) is replaced by this.

## 2026-10-03 — Back Flip is a general Rogue and Ranger class power

Andrew, in the kingdom chat, asked "Which class or classes get Back Flip?":

“Make it a general rogue and ranger class power.”

Ruled:

- **Back Flip is a general class power of the Rogue and the Ranger.** Read as: it is in each of those two classes' general pool — the pool a power grant draws its third offer from (content `levels.rules.draft`: "Each power grant offers three: two from the specialty, one from the general pool") — so a Rogue or Ranger unlocks it at a power grant, whatever its specialty; it is not a starting bonus move as Side Roll is (`class.rogue.bonusMove`). The same two classes Side Roll belongs to. This settles 'who unlocks it' in the two Back Flip entries above. `movement.back-flip` carries it.

## 2026-10-03 — the opening replays show the heroes winning; one recording of each; the fall warnings are drawn

Andrew, in the viewer chat while `viewer.opening-replays` was landing, told that on seed 0 the computer wins only the Lumberjack House and is wiped in the other five, and asked (1) whether the six recordings stay on seed 0 or move to seeds the heroes win, (2) whether to file a viewer item that draws the meteor and curse warning areas on the board, (3) whether to file an item that re-exports the other 29 library battles that no longer match the engine:

“Two, yes. One, I'd like to see one where the heroes win. I don't need huge numbers of library battles. I just need one of each.”

Ruled:

- **Each opening battle has one recording in the replay library, on a seed the heroes win.** The lowest winning seed of each, the party as `export-battle.mts --scenario test.opening-<name> --seed <n>` fields it: Orphanage 5, Lumberjack House 0, Bridge 24, Cavern Trail 1, Cathedral 1 (viewer `battles/library.json` records each).
- **The viewer draws the fall warnings** (the Cavern Trail's meteor fall, the Gates' curse strike — the areas marked and not yet landed). Filed: `viewer.area-fall-warning`.
- Not ruled, the builder's reading: question 3 is taken as answered by "I don't need huge numbers of library battles" — no item is filed to re-export the rest of the library.
- Left open, a finding: **the computer-played heroes never win the Gates** — seeds 0 to 399 of `test.opening-gates` all end in a wipe (the Bridge is first won on seed 24, after 24 wipes). The Gates' recording stays on seed 0, a loss, until a win exists to record.

## 2026-10-03 — everything in the viewer and in play is the 3D maps and the 3D characters

Andrew, in the viewer chat, having opened the Cavern Trail's recording (`viewer.opening-replays-refiled`) and found a flat hex board with 2D tokens where he expected the authored 3D map:

“I want everything in the viewer to be our three-dimensional maps and our three-dimensional characters. Everything in the play is to be that.”

And, with a pasted note of his own naming what must be in there — the six encounters, all of the enemies, all of the heroes, all of the weapons, all of the moves they have (“We want everything in there.”):

“Everything. Make a list of all the stuff that's not in there.”

Ruled:

- **Every battle, watched or played, is drawn on its 3D map with 3D characters** — the six opening encounters, every enemy, every hero, every weapon, every move they have. The flat hex board and the 2D tokens are not the product.
- **What stood on the day** (read from the viewer's own tools, not from memory): the battle screen binds a 3D scene for battles 1–3 only (`viewer/tools/painted-scenes.mjs` SCENES: Orphanage, Lumberjack House, Bridge), though scenes with the engine's exact hex grids are on disk for the Cavern Trail (`assets/terrain-3d/abbotown-encounters/cave`, 40×16), the Cathedral (`abbotown-encounters/cathedral`, 20×40) and the town the Gates stands in (`abbotown-complete`, 20×50, navigation but no `scene.glb`). Five enemies of battles 4–6 have no model bound (`character-models.mjs --list`: Zombie Hound, Werewolf, Bruiser Demon, Powerful Imp, Ghoul). Four heroes stand on a placeholder body, six kit items are held by nobody, and each bound character has five to seven motions against the 64 lines of `assets/characters/HERO-MOTION-LIST.md`.
- Filed, first in the viewer queue: `viewer.opening-scenes-four-to-six`. The missing enemy models, bodies, weapons and motions are the art area's; nothing is filed for them from this entry until he says which first.

## 2026-10-03 — do all of it: the maps, the enemies, the heroes, the weapons, the moves

Andrew, in the viewer chat, shown the list of what is not in the battle screen in 3D (three maps, five enemy models, four placeholder hero bodies, sixteen heads, six unheld kit items, the motions) and asked which the art area should take first:

“Do all of them. I want you to do all of them and then check to make sure it works. I'm literally giving you instruction by instruction for a whole set of things that have been defined. I want all of it. Ask me any questions you have now, and then do all of it.”

Ruled:

- **All of it is to be built, and each piece checked working in the battle screen.** Nothing on the list waits for a further go-ahead.
- The builder's order, not ruled: the three maps (`viewer.opening-scenes-four-to-six`), then the five missing enemies, the six unheld kit items, the four warrior bodies and the sixteen heads, then the motions (the seven art items already queued).
- Filed, art queue: `art.opening-enemy-models`, `art.kit-items-held`, `art.warrior-bodies`, `art.hero-own-heads`.
- Asked of him the same day, not yet answered: whether work not yet approved by eye may be shown in the battle screen marked as such; whether a body already owned may carry a new look for the Zombie Hound and the Powerful Imp; a spending limit for generated bodies; whether the eleven motions with no source are built or bought; whether the Gates' scene may be cut from the town model.

## 2026-10-03 — the opening run, audited: the first hero is chosen from three by description; the player chooses who deploys; idols and bloodrunes equip free; no class powers; a dead party is offered a replay

Andrew, in the kingdom chat: "we need to rig up a playable game that plays through all six initial battles and does all of the right steps ... All of the things that were defined for the first six battles ... all stitched together ... Level up. Rewards. Hero selection. Item equipping. All the battles." / "Check to see what is not done. Make a list of what needs to be done." The run (`kingdom.opening-run-six`, http://127.0.0.1:4230/play) was audited against every opening ruling; eleven gaps were listed, six of them with no item. The questions as asked: (1) "Your 2026-09-28 ruling says the first hero is given with no pick, but the run offers three to pick from; which do you want?"; (2) "Should the draft pool grow to six classes now, which reverses yesterday's "leave this alone for now"?"; (3) "Should the player choose which four heroes go into each battle?"; (4) "Should idols and bloodrunes be free to equip during the opening, or be left out of the opening's rewards?"; (5) "Should level-ups during the six battles grant class powers?"; (6) "When the whole party is dead, should the run end and offer a new one?"

“the first hero is chosen from 3, but no stats or badges shown, just a description.   2 what is missing classes?  3 yes  4 free  5 no  6 offer replay”

Ruled:

- **The first hero is chosen from three, shown by description only — no stats, no badges.** Replaces 2026-09-28 'the first hero: Leadership…' "The first hero is taken, not drafted: one hero, stats unseen, no pick"; kingdom SWITCHES `openingFirstHeroDraft` and `openingRunFirstHero` are settled by it on the pick. Its modifiers are not withdrawn: the chosen first hero still gets the Leadership badge, a random positive badge, a 25% chance of another, +2 Health, one Crucible stat point and a 30% chance of another (2026-09-28 'no Health minimum…'), which the run does not yet apply. Filed: `kingdom.opening-draft-modifiers`.
- **The player chooses which four heroes go into each battle.** Filed: `kingdom.opening-deploy-choice`.
- **Idols and bloodrunes are free to equip during the opening.** Filed: `kingdom.opening-free-equip`.
- **Level-ups during the six battles grant no class powers.** Nothing filed: the run already grants none.
- **When the whole party is dead the run offers a replay.** Read as: the battle that killed them is offered again with the party as it stood before it, as a lost battle is (2026-09-28: "a lost battle replayed with the same party"), so a run is never stranded. Filed: `kingdom.opening-party-dead-replay`.
- (2) is his question back — which classes are missing: the Rogue and the Mage (the pool is the Hunter, the Iron Dwarf, the Battle Chaplain, the Rune-Marked Ascetic and the Dawnblade; the pack holds four base heroes of each of the six classes). Not ruled yet; 2026-10-02 'the opening run keeps its five-hero party' stands until he answers.

The four items are first in the viewer and kingdom queue, in that order: his post makes the playable opening the work to do.

## 2026-10-03 — the opening draft pool is all 24 heroes, Rogues and Mages included; the switch pop-up is for any player unit

Andrew, in the kingdom chat. The questions as asked: (1) "Should the draft pool get Rogues and Mages now, so every draft offers three and the party ends as one of each class?"; (2) "If yes, should all 24 heroes be draftable, or a set you name?"

“1. Yes
2. Yes  I don't know if this feature got added into the queue or not, but if you double-click on a hero when you are halfway through a different hero's activation   and by hero, I just mean any player unit.  I move a player unit, but before I end activation, I double-click on another hero. It shows a pop-up that says, "End activation and activate X new hero."   And you can click yes or no.  This doesn't seem to have been added yet.”

Ruled:

- **The opening run's draft pool is all 24 base heroes — four of each of the six classes, the Rogues and the Mages included.** Replaces 2026-10-02 'the opening run keeps its five-hero party' ("We can leave this alone for now"): with 'the draft never repeats a class until all six are drafted' (2026-09-28) every draft offers three and the party ends as one of each class. Four still deploy. Filed: `kingdom.opening-draft-pool`, first in the viewer and kingdom queue.
- **The switch pop-up is for any player unit, not heroes only** ("by hero, I just mean any player unit"). The feature is in the queue and not built: `viewer.switch-hero-asks` (filed earlier today from 'switching heroes asks first'), whose pending spec now says any player unit — a civilian or ally the player controls as well as a hero.

## 2026-10-03 — the opening run: the Flaming Longsword waits for its taker; a lost battle pays no XP; a replay rolls new dice

Andrew, in the kingdom chat. The questions as asked: (1) "If the party has no Warrior or Paladin after battle 2, should the Flaming Longsword wait in the stash until one is drafted? (Today it's never offered again.)"; (2) "Should a lost battle pay any XP? (Today a lost Orphanage pays its 20 XP every time you replay it.)"; (3) "Should a replayed battle roll new dice? (Today it replays on the same dice.)"; (4) "Should a hero who dies during the six battles be replaced by an extra draft, or does the party just get smaller?"

“One, yes.   Now a lost battle offers a replay.   New dice.   If a hero dies, it should be replayed.”

Ruled:

- **The Flaming Longsword waits in the stash until a Warrior or Paladin is in the party.** With no living Warrior or Paladin able to take it after battle 2 it is kept, and offered when one can. Settles kingdom SWITCHES `openingItemTakers` on this point ("with none, nothing is offered and nobody carries it").
- **A lost battle pays no XP; it offers the replay.** Read as: "Now" is "No" (dictated), answering "Should a lost battle pay any XP?". The Orphanage's "20 XP no matter what" (2026-09-28) is paid when the Orphanage is won, whatever its kills or length, and never for a loss. Settles kingdom SWITCHES `openingFixedXp` on "on a loss too?".
- **A replayed battle rolls new dice.** Overturns kingdom SWITCHES `openingReplaySeed` (the same seed every replay).
- (4) is not ruled: "If a hero dies, it should be replayed" may be "replaced" (an extra draft), or may mean a battle in which a hero dies is replayed. Asked.

Filed: `kingdom.opening-sword-waits`, `kingdom.opening-replay-rules`.

## 2026-10-03 — the opening run: a battle in which a hero dies is replayed

Andrew, in the kingdom chat, asked which he meant by "If a hero dies, it should be replayed" — "did you mean the dead hero is *replaced* by an extra draft, or that a battle where a hero dies is *replayed*?":

“Battle: they died as a replayed”

Ruled:

- **In the opening run a battle in which a hero dies is replayed.** Read as: "the battle they died in is replayed" (dictated). A hero's death in one of the six battles is not kept: that battle is offered again, the party as it stood before it, on new dice (the entry above), and the run goes on only from a battle no hero died in. No hero is replaced by an extra draft, and the party does not get smaller. "Hero" is a drafted hero: a civilian dying is still "its own punishment" and not a loss (2026-09-28). 2026-10-02 'a hero still turned when a battle is lost is lost' is not spoken to and stands.
- This takes in the whole-party case ruled earlier today ("6 offer replay"): `kingdom.opening-party-dead-replay` is withdrawn before any code and replaced by `kingdom.opening-hero-death-replays`, in its place in the queue.

## 2026-10-03 — an attack's timing: the projectile leaves at the release, the target reacts at the blow, a miss is dodged, a hit shows a red slash

Andrew, in the kingdom chat, playing the opening run:

“Ranged attacks are not synced up well enough for the point at which the attack is launched compared to when the projectile animation then goes. Both the arrow and a priest cast were not synced up very well.   If you do a melee attack and miss, it's supposed to trigger a dodge animation if there is one. That should be synced up. Also, there's no red slash across the target that is part of a hit.   There is a hit animation: a zombie hit my warrior, and the recoil from being hit should be connected to the timing of the attack. What happens is the attack plays, maybe a third of a second later, the reaction plays, and the reaction should just be a little bit delayed behind the attack.”

How it is today (viewer `src/models.js`, `src/board.js`, `src/hexvfx.js`, `tools/character-models.mjs`): the target's hit reaction is started by the fold's flash when the damage lands, not by the attacker's clip; a shot's projectile is the board's own effect, not timed to the bow's or the cast's release; a miss shows the word (MISS, DODGE, COVER) and no body moves — there is no dodge motion word; the slash effects exist (`hexvfx.js` SLASH_STYLES) but are not drawn on the battle he played.

Ruled:

- **A ranged attack's projectile leaves at the moment the attack's motion releases it** — the arrow as the bow looses, the spell as the cast lets go — for every ranged attack and cast, not those two alone.
- **The target's reaction is tied to the attack's timing: it plays a little behind the blow**, not a third of a second after the attack has finished. One moment — the blow — drives the reaction, whoever attacks.
- **A melee attack that misses plays the target's dodge, where its body has one, timed to the blow.** A body with no dodge motion is listed, not faked (2026-09-30 'a bunch of motions').
- **A hit shows a red slash across the target**, at the blow.

Filed: `viewer.attack-impact-timing`, `viewer.miss-dodge-motion`, `viewer.hit-slash`.

## 2026-10-03 — every draft card shows the hero's card art; the Lumberjack's axe and his wife's knife are still missing

Andrew, in the kingdom chat, playing the opening run with the 24-hero pool and the draft modifiers in:

“Lumberjack is missing an axe. Lumberjack's wife is missing a knife.   Card art for heroes 2 and 3 didn't come through when I was selecting heroes for the battle.   Card art should be present when you're drafting, both the first time and the next ones.”

How it is today: the kingdom's card portraits (`kingdom/generated/art/hero-*.jpg`, made by `tools/prep-heroes.py`) exist for the five heroes of the old pool only, and the tool reads its ids off `hero('…')` literals that `kingdom.opening-draft-pool` replaced with the pack's rows — so 19 of the 24 heroes have a blank card wherever a card is shown (Equip); and the draft screen (`src/ui/draft.ts`) shows no art at all.

Ruled:

- **Card art is present when drafting — on the first draft and on every later one.** With 'the first hero is chosen from three by description only' (above): the first draft's cards show the art and the description, still no stats and no badges.
- **Every hero's card art comes through wherever its card is shown** — heroes 2 and 3 on the way to the battle were blank. Filed: `kingdom.opening-hero-card-art`, first in the viewer and kingdom queue.
- **The Lumberjack's axe and his wife's knife** are 'every civilian fields its kit by default' (2026-10-03, above), filed as `fix.civilians-field-kit` at the top of the engine queue and not built yet; the kingdom chat takes it next after the card art, since he has now reported it twice. Whether the weapon is also drawn in the hand is `art.kit-items-held` and `viewer.civilian-held-dagger`'s.

## 2026-10-03 — the action bar changes with the Activation: the new unit's moves, attacks and powers; the switch pop-up is still not built

Andrew, in the kingdom chat, playing the opening run:

“If I double-click on a hero, it looks like you haven't added in the double-click change-your-active-hero-with-a-popup-screen-in-between, saying, "Are you sure you want to end your activation and start this new hero?" That hasn't been implemented yet.    Also, until you've activated your move, it seems like you keep the moves of the previous character.  So when the activation changes, for whatever reason, the card art changes in the lower left, but the moves don't change. They need to change to the character's moves. And attacks and powers and all that”

Ruled:

- **When the Activation changes, for whatever reason, the action bar changes with it: the moves, attacks, powers and everything else on it are the newly activated unit's, at once** — not the previous unit's until a move is made. The card at the lower left already changes; the bar must change with it. This is what 'the battle screen's turn-taking, ruled' (2026-10-03: "the bar and its card stay with the activated unit") already says; `viewer.turn-taking` landed without it holding. Filed: `viewer.bar-follows-activation`.
- **The switch pop-up** ("End activation of X and start activation of Y?", yes or no, any player unit) is `viewer.switch-hero-asks`, filed earlier today and not built. Both are moved up the viewer and kingdom queue, next after the card art, ahead of the remaining opening-run items: they are in the way of playing a battle at all.

## 2026-10-03 — reported: two drafts between battles 1 and 2 where he expects one; the big yellow hex border (questions out)

Andrew, in the kingdom chat, playing the opening run:

“We're only supposed to have one draft between battles 1 and 2. I was getting two drafts.  There's a highlighting of a hex that happens where there's a big yellow border around the hex at some point during unit activation. I don't quite know what that's for visually.”

- **The drafts.** The run does what the standing ruling says: GAME-ARCHITECTURE.md:447-453, "The opening draft cadence — ruled 2026-08-23": "Draft **1 hero before battle 1** … After battle 1, draft **+2** — three drafted heroes … Then **+1 after each battle until six drafted heroes**" (kingdom `src/content/prologue.ts` DRAFT_CADENCE, `src/core/opening.ts` draftsOwedOf). His words now say one draft between battles 1 and 2. Cited to him and asked which stands, and whether it is one draft after every battle (a party of 2, 3, 4, 5, 6 at battles 2 to 6). Not changed until he answers.
- **The yellow border.** It is not a game mark: viewer `src/styles.css:569`, `.targetHex:focus-visible` — "Native targeting buttons retain a visible keyboard focus within the hex clip" — a 5-pixel yellow inner border on whichever target hex holds the keyboard focus, drawn by the browser once it judges the keyboard is in use. Told to him and asked whether it goes for mouse play. Nothing filed yet.

## 2026-10-03 — one draft after every battle; the yellow focus border goes; a death is tied to the strike; the slash on every damaging hit; a ranged miss is dodged too

Andrew, in the kingdom chat, answering the questions on the two entries above. As asked: (1) "Should the cadence change to one draft after every battle (party of 1, 2, 3, 4, 5, 6), replacing the 2026-08-23 ruling of two drafts after battle 1?"; (2) "Should the yellow focus border be removed, so only the game's own hex marks show?"; (3) "Should the red slash show on every hit that deals damage, ranged included, or only on melee hits?"; (4) "Should a ranged miss also play the target's dodge, or only melee misses?"

“Death animations are happening separately from the strike. They should be more closely connected, just like the other reactions.   One, yes.   That yellow focus border doesn't look good, so just remove it.  3. If it was already doing that, then keep doing it. Red slash on every damage range miss should also play the target's dodge.”

Ruled:

- **The opening draft cadence is one draft after every battle:** one hero before battle 1, then one more after each battle — a party of 1, 2, 3, 4, 5, 6 at battles 1 to 6. Replaces GAME-ARCHITECTURE.md:447-453 "After battle 1, draft **+2**" (ruled 2026-08-23); the rest of that entry (six drafted heroes, the tutorial draft then retires) stands. Filed: `kingdom.opening-draft-cadence`.
- **The yellow keyboard-focus border on a hex is removed** ("doesn't look good, so just remove it"). Filed: `viewer.no-hex-focus-border`.
- **A death is tied to the strike, like the other reactions** — it plays at the blow that killed, not separately after it. `viewer.attack-impact-timing` carries it.
- **The red slash is drawn on every hit that deals damage, ranged included** ("Red slash on every damage"; "If it was already doing that, then keep doing it" — the flat board's slash stays as it is). `viewer.hit-slash` carries it.
- **A ranged miss plays the target's dodge too**, as a melee miss does. `viewer.miss-dodge-motion` carries it.

## 2026-10-03 — clicking an off-screen bubble selects the unit and slides the screen just far enough to show its hex

Andrew, in the kingdom chat, playing the opening run:

“I should be able to click on one of the bubbles for a unit that's off-screen to both focus it and also scroll the screen over so they are visible, but only just to their hex. Don't focus on it or center the screen on it. Just slide over until they're visible.  Does that make sense?”

How it is today: the off-screen bubbles (viewer `src/board.js` "OFF-SCREEN UNIT INDICATORS", `.edgeBub`) are drawn at the screen's edge and do nothing when clicked.

Ruled:

- **A click on an off-screen unit's bubble selects that unit** — it becomes the unit looked at, as a click on its body or its card does ("focus it").
- **And the screen slides only as far as it takes for the unit's hex to be visible** — the least movement, the hex just inside the view; the camera does not centre on the unit and does not change its zoom or angle ("only just to their hex", "Don't … center the screen on it. Just slide over until they're visible").
- Read as: a bubble standing for several units selects the nearest of them and slides until that one's hex shows. Filed: `viewer.bubble-click-reveals`.

## 2026-10-03 — a player unit with nothing left it can do ends its Activation by itself: "No remaining actions possible."

Andrew, in the kingdom chat, playing the opening run:

“If a player unit completes its move and it has a remaining primary action  and there is no attack target in range, and no other powers it can use. You should just auto-end its turn and put a notification on the screen: "No remaining actions possible."”

Ruled:

- **When a player unit has made its move, still has its primary action, has no attack target in range and no other power it can use, its Activation ends by itself**, and the screen shows the notice **"No remaining actions possible."**
- Read as: the test is the engine's own — after a player unit acts, if the only command the engine would still accept from it is to end its Activation (no move left, no attack with a target, no power or item use it can pay for and aim), the battle screen sends that end itself and says why. A unit that can still do anything — a bonus move, a shield power, an item — is not ended. Any player unit, a civilian the player controls included. Filed: `viewer.auto-end-no-actions`.

## 2026-10-03 — the action bar: the moves grey slightly once the move is done, nothing else greys; every action shows all it does; the Soldier holds no sword

Andrew, in the kingdom chat, playing the opening run:

“There should be a slight graying out of the move actions after move actions are completed.  And I don't know how to visually separate them, but there should be a slight graying out of everything else when the movement actions haven't been done yet.  Also, some of the information and some of the actions are missing.   For example, a dagger giving you one protection is not shown in the dagger attack.”

Asked "Before a unit has moved, should its attacks and powers still be clickable while greyed (my reading), or locked until it moves?":

“Soldier 1 does not appear to be holding a sword.   Yes, they should still be usable before you've moved. However, if you do it, you'll lose your move, so I guess, actually, don't gray them out. Just gray the moves out after a move is done.”

Ruled:

- **Once a unit's move is done, the move actions on its bar are slightly greyed. Nothing else is greyed for not having moved yet** — his second message withdraws the first's "slight graying out of everything else when the movement actions haven't been done yet".
- **Attacks and powers are usable before the unit has moved; using one loses the move** ("if you do it, you'll lose your move"). Read as: the move is "done" when it is spent or lost, by the engine's own state — if the engine does not in fact take the move away after an action, that is a finding to bring him, not a viewer rule.
- **An action on the bar shows everything it does.** The dagger's Stab gives 1 Protection (CODEX.md:2671, "`onAttack` gain 1 Protection") and the bar's Stab does not say so; "some of the information and some of the actions are missing". Every attack, power and item use on the bar shows its effects, and every action the unit has is on the bar.
- **The Soldier should be holding a sword.** How it is today: `unit.soldier` stands on the approved strong skeleton and swings the sword motion with empty hands (viewer `tools/character-models.mjs`: `fill: { attack: 'sword', … }`, no held model); its row assigns no weapon item (its attacks are its own).

Filed: `viewer.bar-moves-grey-when-done`, `viewer.bar-shows-every-effect`, `viewer.enemy-held-weapons`.

## 2026-10-03 — card art on the level-up and reward screens; the specialty choice offers three, not nine

Andrew, in the kingdom chat, playing the opening run:

“Card art not showing in the level-up screen. Card art not showing in the reward screen for the flinging sword.   Also, you're supposed to only get a choice of three different specialty classes, not nine.”

How it is today: the level-up screen draws the hero's card from the same portraits the Equip screen uses, which exist for the old five-hero pool only (the entry 'every draft card shows the hero's card art' above); the kingdom holds no item card art at all (`kingdom/generated/art/index.json`: building cards and hero portraits, no items), so a reward card — the Flaming Longsword's included ("flinging", dictated) — is drawn without art; and the specialty choice at level 2 lists all nine of the class's specialties (content: nine per class).

Ruled:

- **The hero's card art shows on the level-up screen**, as everywhere its card is shown. `kingdom.opening-hero-card-art` carries it.
- **A reward's card art shows on the reward screen** — the Flaming Longsword's first. Filed: `kingdom.opening-reward-card-art`.
- **The specialty choice offers three different specialties, not all nine.** Read as: three of the class's nine, drawn for that hero from the run's own stream and the same when the page is reopened; which three is not said. Filed: `kingdom.opening-specialty-three`.

## 2026-10-03 — the civilians show on the victory screen; the specialty three are random; the battle's unit panel lists what the unit is equipped with

Andrew, in the kingdom chat, playing the opening run:

“The battle should show in this victory screen too. If they were wounded, if they died, they're in there too.”

Asked "did you mean the civilians should show on the victory screen, with their wounds and deaths, alongside the heroes?" and "Is a random three of the nine right for the specialty choice, or should the three be chosen some other way?":

“2, yes.   It's random: 3 of the 9.”

“This priest only has a verse attack.   It seems like he has nothing in his hands. I don't understand what he's equipped with. We need the items listed under the characters on the right in battle.”

How it is today: the victory screen (kingdom `src/ui/after.ts` recapScreen) shows the deployed heroes only, each with its wound or death mark, never the civilians who fought. The Battle Chaplain's kit is the Holy Texts (its attack is Verse; he also has Punch) — the holy item is not drawn in his hand (`art.kit-items-held`), and nothing on the battle screen says what a unit carries.

Ruled:

- **The civilians who fought show on the victory screen with the heroes — wounded or dead, they are there too** ("The battle", dictated, is the civilians). Filed: `kingdom.opening-recap-civilians`.
- **The specialty choice's three are random: three of the nine.** Confirms `kingdom.opening-specialty-three`'s default.
- **In battle, the panel on the right lists the unit's items under the character** — what it holds in each hand, its armor and what is in its item slots — so the player can see what a unit is equipped with. Filed: `viewer.panel-lists-items`.

## 2026-10-03 — the swap button says "Swap" and opens a rearranging of the unit's gear

Andrew, in the kingdom chat, playing the opening run:

“The button for swapping should say "Swap".  And when you press it, it should give you the option to rearrange your gear.”

Ruled:

- **The button for swapping reads "Swap".**
- **Pressing it gives the option to rearrange the unit's gear** — which of the things it carries goes in which hand — rather than making one fixed exchange. Read as: the choices offered and what a swap costs are the engine's own swap rules (movement.swap-and-shields); the screen offers every arrangement the engine allows and sends the one chosen. Filed: `viewer.swap-button-rearranges`.

Andrew, straight after, on the swap entry above:

“Just the enhanced gear, not adding gear that you didn't already have. Just the ability to swap hands with inventory”

- **The swap rearranges only what the unit already has: its hands with its own inventory.** No gear is added that it did not already carry ("enhanced", dictated, read as "in-hand"). `viewer.swap-button-rearranges` says so.

## 2026-10-03 — reported: the Fire Imp is not on its own model, and it burns itself at the end of every Activation (question out)

Andrew, in the kingdom chat, playing the opening run (the Bridge):

“The fire imp is not using the fire imp model. Also, it seems like it's dealing fire damage to itself every turn, or trying to do burn that's then being resisted. It means at the end of every turn, it has a damage reaction to itself. It's odd. I don't quite know what's causing that.”

- **The model.** viewer `tools/character-models.mjs:97` stands `unit.fire-imp` on the look `fire-imp` of the demo's winged imp; the reviewed Fire Imp look — the fire skin and flames, `assets/characters/winged-imp/fire-imp.html` and its `review/fire-imp-fire-flames-*` captures — is not what the battle shows. Filed: `viewer.fire-imp-own-model`.
- **The self-burn.** It is the Fire Imp's own row, not a fault in the playback: `unit.fire-imp` (content bestiary) carries the trigger `onActivationEnd` — "every unit within N hexes", range 2 — apply Burn 1. "Every unit within 2 hexes" counts the imp itself (distance 0) and its own side, so at the end of each of its Activations it applies Burn 1 to itself, its Fire Resist 2 takes it, and the screen shows the reaction. Whether the aura should spare the imp itself, or its allies too, is his to say: asked. Nothing is changed until he answers.

## 2026-10-03 — reported: the priest's Holy Texts has no heal in battle — three starting weapons lose their power on the way into the engine

Andrew, in the kingdom chat, playing the opening run with the Battle Chaplain:

“This priest only has a verse attack.   It seems like he has nothing in his hands. I don't understand what he's equipped with.”

“I don't get where this Holy Text came from. There's no starting hero that's supposed to have one single thing. I'm just a little bit confused.   Why doesn't he have the healing power? Why does he have an item that's supposed to be a tier 1 that only has one thing in it?”

Found, not ruled — he is right, and it is a gap, not the content:

- **The Holy Texts is the Battle Chaplain's own starting weapon**, and in the content it holds two things: `hero.base.priest-armored`'s kit is the Round Shield, the Holy Texts and the Pilgrim's Habit; `item.holy-texts` (tier 1) grants the attack **Verse** and the power **Mercy** — "Heal the target for 2 + half your Spirit", 2 Stamina, one ally within 4 hexes ("the hurt-or-heal choice is the tier-1 shape").
- **The engine's pack drops Mercy.** `content/gen/enemy-pack-gaps.json`: "item.holy-texts grants power.holy-texts.mercy — item power — shape unparsed"; the generated pack's Holy Texts grants Verse alone. So in battle he has Verse and Punch and no heal.
- **The same gap takes two more starting powers:** the Fire Staff's **Fireball** (the Emberwright, the Pyre Witch, the Crimson Sorceress) and the Frost Staff's **Frost Nova** (the Archive Scholar). The Holy Symbol's Heal does reach the engine. Of the 24 base heroes, six field a starting weapon with half of what it does.

Filed: `fix.starting-kit-powers`, first in the engine queue.

## 2026-10-03 — the Fire Imp's burn does not hit the imp itself; an end-of-Activation area burn shows an explosion of fire

Andrew, in the kingdom chat, asked "Should the Fire Imp's end-of-activation burn hit only your units, everyone except the imp itself, or stay as it is (everyone, itself included)?":

“It should not hit him. If it's an end-of-activation burn in a certain area, we need to create a VFX that goes along with that. So that should be an explosion of fire. We have the VFX for that.”

Ruled:

- **The Fire Imp's end-of-Activation burn does not hit the Fire Imp itself.** Read as: everyone else within 2 hexes still burns — other units of its own side included; only the imp is spared. Filed: `fix.fire-imp-burn-spares-self`.
- **An end-of-Activation burn over an area is shown: an explosion of fire over that area**, from the effects the project already has ("We have the VFX for that"). Filed: `viewer.area-trigger-burst`.

## 2026-10-03 — the Imp: Precision down by 1; its Blast burns half the time

Andrew, in the kingdom chat, playing the opening run (the Bridge):

“Change the regular imp's regular main attack to lower their precision by 1 and change it to a 50% chance of burn 2.”

How it is today (content bestiary `unit.imp`): Precision 4; its main attack Imp Blast — one enemy within 4 hexes, damage Precision + 0 — applies Burn 2 on every hit.

Ruled:

- **The Imp's Precision is 3** (4, lowered by 1). Read as: the stat on the Imp's row, which Imp Blast's damage reads — so the Blast deals 1 less; the Imp's Claw (Strength) is unchanged. The Fire Imp, the Poison Imp and the Powerful Imp are not named and stay as they are.
- **Imp Blast applies Burn 2 on a hit with a 50% chance**, not always.

Filed: `content.imp-blast-tuned`.

## 2026-10-03 — eleven tier 0 weapons nobody fields are cut: the nine the authoring pass invented, the Fishing Net and the Slingshot

Andrew, in a chat at the root, seeing weapon cards drawn for them:

“What are these broken bottle and cart chain items? I'm seeing items I don't know anything about being made.”

“They're improvised. What is that? I don't know where these things came from. They got hallucinated at some point. Are they part of some of someones kit?”

What he was shown. Each row's own `source` field says where it came from: nine in `content/gen/weapons.json` read "new (…)" — written by the authoring pass before the 2026-08-21 handoff so every weapon form had a tier 0 entry, not by him. None of the eleven below is in a hero, civilian or enemy kit, and none is Waystation stock; GEAR-DESIGN.md §2 gives tier 0 two sources only, "kits · the Waystation", the Forge's base shelf is tier 1 and the reward draw deals weapons at tier 3 — so none of them can reach a player. Told that the Hand Axe is the row the Wood Axe card was drawn against, and asked which of the eleven go:

“Yeah, remove all of those 11.”

Ruled:

- **Cut from the game, each with the attacks it grants:** `item.sharpened-stake`, `item.cart-chain`, `item.broken-bottle`, `item.carpenters-mallet`, `item.pot-lid`, `item.rusted-crossbow`, `item.trappers-claws`, `item.practice-sword`, `item.hand-axe` (the nine invented), `item.fishing-net` (`weapons.json`, "Hell-TCG name reused"; the Fishing Net a hero's power grants is a spell and stays) and `item.slingshot` (`settled-items.json`, "settled content", used by nothing). Read as: "remove" takes the rows out of the item sheet, not only out of the model queue — he was asked which of the two and answered "remove".
- **Their ten cards leave the tiered weapon card set and are not made into models.** The Wood Axe card stays: he named the Wood Axe himself (2026-10-03, 'card art for every weapon at tiers 0 and 1'); with `item.hand-axe` gone it is a dictated weapon with no row yet, like the Sickle. The card set's records (`prompts-v2.json`, `cards-v2.json`, `weapon-card-models/run.json`) are Codex's, mid-conversion when this was ruled; the line to give Codex was handed to him in the chat.
- **Not cut.** The other tier 0 weapons are fielded or sold: Dagger, Pitchfork and Pile of Rocks (hero and civilian kits), Club (an enemy), Pickaxe and Burning Torch (the Waystation, ruled 2026-09-02). The nine tier 1 rows the same pass wrote (War Axe, Hunting Spear, Glaive, Crossbow, Hand Crossbow, Throwing Knives, Shepherd's Sling, Iron Claws, War Hammer) were listed to him and not named: they are in kits, on the Forge's shelf, or bases for the tier 3 rewards.
- Tests that use a cut row as a fixture move to a row that stays (Law 10): engine `test/unit-mods.test.ts` and `test/damage-packets.test.ts`, `tools/compare-packet-transition.mts`, kingdom `test/isc-062.test.ts`, content `test/damage-packets.test.mjs`, and the test bestiary unit that fires `attack.rusted-crossbow.bolt`.

Filed: `content.unfielded-tier0-weapons-cut`, first in the content queue.

## 2026-10-03 — a tier 0 axe is supposed to exist and be in some kits: it is the Wood Axe, which is not yet a row (questions out)

Andrew, same chat at the root, after the cut landed (engine 2dd6390) and asked whether the Wood Axe card and model stay now that `item.hand-axe` is gone:

“There is supposed to be a tier 0 axe that is either a Hand Axe or a Wood Axe that is also in some kits. I don't know which one is which.”

Which is which, told to him:

- **The Wood Axe is his.** Dictated 2026-09-28 (`V2-SHIELDS-AND-WEAPONS-2026-09-20.md`, sixth pass, line 271): "The wood axe is one-handed, does strength damage, and on block it inflicts -15 block. It has -5 accuracy", 1 stamina; a second attack that "does 2 more damage and 5 more accuracy loss at stamina 2". Tier 0 (2026-10-03, 'card art for every weapon at tiers 0 and 1'). It has never been a row, and no kit names it.
- **The Hand Axe was the authoring pass's** (`item.hand-axe`, source "new (fills the axe form at tier 0)"): one-handed, one attack, Chop — Strength +2, -5 Accuracy, 2 stamina, +4 on a critical. It was in no kit, and it is the row cut above. It stood where the Wood Axe belongs, with numbers that were not his.
- **The only tier 0 axe in a kit today is the Lumberjack's Axe** (`item.lumberjack-axe`: two-handed, Chop and Cleave; the kit of `hero.fixed.lumberjack-and-wife`, dictated 2026-08-25) — the weapon he called "a wood axe" on 2026-10-03 ('every civilian fields its kit by default'). The only other axe in any kit is the War Axe, tier 1: the Warriors' start pool and `hero.base.warrior-iron` (`content/gen/kits.json`).

Ruled:

- **A tier 0 axe is wanted, and it is in some kits.** Read as: the Wood Axe — the name he dictated and the one he tiered. The cut of `item.hand-axe` stands; the Wood Axe is authored from his dictation, not by bringing that row back.
- **The Wood Axe card and its model stay** (read as following from the line above; the entry above already says the card stays). Codex's model list excluded it along with the ten (`weapon-card-models/run.json`, "Excluded by user from model production"); the line to restore it was handed to him in the chat.

Open, asked: which kits carry the Wood Axe; whether the Lumberjack's weapon is the one-handed Wood Axe or stays his own two-handed axe. Not filed until answered: the row and its kits are one item.

## 2026-10-03 — the Lumberjack keeps his two-handed axe; the Wood Axe waits; exact weapons are not the concern now

Andrew, same chat, answering the two questions above — (1) which kits carry the Wood Axe, (2) whether the Lumberjack carries it or keeps his own:

“1. I don't know, and I don't care.
2. I also just don't care. It's fine: two-handed lumberjack axe. I'm just trying to get through this shit. It really does not matter if we have exactly the right weapons. We're not in a balancing phase. I just want to get through this shit, so make a decision and clean these up. There was a whole bunch of items that didn't need to exist. They've been removed. I don't know what uses what here. Just make a decision and clean this shit up.”

Ruled:

- **The Lumberjack keeps his two-handed Lumberjack's Axe** (`item.lumberjack-axe`).
- **Which weapon sits in which kit is not his to be asked now: "We're not in a balancing phase."** A chat picks a default, records the switch and goes on.
- **The decision is the chat's** ("make a decision"), engine SWITCHES `woodAxeWaits`: the Wood Axe is not built now and no kit carries it. It stays a dictated weapon with no row, like the Sickle, the Short Sword and the Grain Flail, until the sixth pass's weapon families become rows. Its card stays in the set; its model is not made in this batch — Codex excluded the card from model production at his direct word, and that is left as it is. This replaces "the Wood Axe card and its model stay" in the two entries above as far as the model goes. Nothing is filed.
- **Cleaned up:** the content audit's accepted-findings entry for the Pot Lid went with its row (content cc67ac2); `2-ACTIONS-SETTLED.md` logs the Slingshot's removal (root 7dbbc77). Left, as records of their date: the notes files and older switches that name a cut row, the Stagger power's `source` note, and `crucible/data/kits.json` (the Crucible is unbuilt and its kits were superseded 2026-08-27).

## 2026-10-04 — no testing that the battles can be won until these items are done; the page tests play an overpowered party; faster landing

Andrew, in the kingdom chat, asked whether anything else would speed the queue up "without losing too much quality". The questions as asked: (1) "Should the page test play the run with an overpowered test party so it stops searching for winning seeds?"; (2) "Should the merge tool skip re-running suites that already passed on the exact same code when main hasn't moved?"; also offered: (3) more items per worker run before each merge; (4) a quiet machine and a still main folder.

“1. I'm okay forgoing all testing battle until we're done with all these items. Right now, I'm doing more views or experience testing.  So we can just skip all testing battles that aren't just done from a quality standpoint.   Okay, yes, yes, and yes. Okay, for 4, I'll shut down everything else.   If we need to, then one yes for remaining questions. Go ahead, overpowered power party. Party. 2 yes.”

Ruled:

- **Until the items now queued are done, nothing tests that the battles can be won.** He is testing the look and the experience, not the balance. The opening's page tests stop searching for seeds on which the computer wins: they play the run with an overpowered test party ("Go ahead, overpowered … party"), so any seed wins and every step between the battles is still proved. A test that exists only to show a battle is winnable by the computer's play is skipped until then, by name, with this entry cited; a test of a rule, a screen or the flow is not. Filed: `kingdom.page-test-strong-party`, first in the viewer and kingdom queue.
- **Yes to more items per worker run before each merge**, each still its own landing.
- **Yes to the merge tool skipping suites already passed on the exact same code when main has not moved** — taken up by the kingdom chat as a tooling change (GBH SWITCHES), only where it can be shown no test is skipped that the change could break.
- He shuts the other programs and chats down while the workers run.

## 2026-10-04 — a worker each for the viewer's items and the kingdom's, for this backlog; the items that wait on art go last

Andrew, in the kingdom chat. The questions as asked: (1) "Should I run a third worker, one for viewer items and one for kingdom items, setting aside the one-worker-per-area rule for this backlog?"; (2) "Should the art-dependent viewer items wait until the art exists?"

“1. Yes, let's split kingdom and viewer items.  We can not have those items be displayed properly for now. That's what I was working on in Codex, but it can wait. It's a little less critical.”

Ruled:

- **For this backlog the viewer's items and the kingdom's items each get their own worker, in their own copy** — three workers with the engine's. Sets aside DISPLAY-RULES.md rule 32's "never two in one area" (viewer and kingdom are one area there) for the items now queued; the rule itself is not rewritten. The two collide only on kingdom's generated pages, which are rebuilt at each merge (GBH SWITCHES `combine.mergeMainFirst`).
- **The viewer items that wait on art not yet made go to the end of the queue** ("We can not have those items be displayed properly for now … it can wait. It's a little less critical"): `viewer.attack-owns-motion`, `viewer.special-move-motions`, `viewer.shield-block-and-hit`, `viewer.airwalk-floats`, `viewer.miss-dodge-motion`, `viewer.fire-imp-own-model`, `viewer.enemy-held-weapons`. They stay filed; no worker takes them until he says or the art exists.

## 2026-10-04 — the basic attack is a weapon's first attack, and every free attack uses it without paying stamina — ruled 2026-09-28, never built

Andrew, in the kingdom chat, told that the Lumberjack, now holding his axe, still punches as his attack of opportunity (the engine takes the cheapest melee attack; Chop costs 1 Stamina, Punch none):

“There's supposed to be a basic attack for each character, and that basic attack is used on all three attacks.   Most weapons have a basic attack.   Chop should be the basic attack from Basic. Sword should be used for free attacks. This should be standard for all items they're equipped with. They're in your main hand or two hands if you're unequipped. One of Max's is a basic attack. It is the first attack.   It has a stamina cost, but that stamina cost is not triggered by special free attacks. Is this not the way it's currently implemented? Did this get lost somewhere in recording, or is it not been done yet, or is it been done incorrectly? Or is it not related to tier 0 items or civilians?”

“There were some typos in there. The words "sword" and "three" were typos.” — read: "used on all free attacks"; "Chop should be the basic attack … [It] should be used for free attacks."

The answer to his question: **it was recorded and never built.** 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' rules it (this file, "Special free attacks — counterattack, fend, the attack of opportunity — are one rule: the basic attack, no stamina, −20 Accuracy. The attack of opportunity changes to this rule (replacing the 2026-08-20 …)"), from his "we're changing attack of opportunity, so it's using the same rules as everything else. No stamina, uses the basic attack." No item was filed from that line. The engine still runs the 2026-08-20 rule it replaced: `src/core/movement.ts` `aooChoice` takes the holder's cheapest legal melee attack and the swing pays its stamina (`fix.aoo-pays-stamina`, 2026-09-04); the engine holds no "basic attack" at all, and no counterattack or fend. It has nothing to do with tier 0 items or civilians — every unit's attack of opportunity is chosen this way. The civilians' worker cited the 2026-08-20 entry as current (engine SWITCHES `placedKitAoo`); that was wrong, and so was the kingdom chat's relay of it.

Ruled (today's words, completing 2026-09-28):

- **Every character has a basic attack: the first attack of the weapon it holds** — in its main hand, or the weapon held in two hands; "Most weapons have a basic attack … It is the first attack." A unit holding no weapon has Punch. The Lumberjack's is Chop.
- **Every special free attack uses the basic attack** — the attack of opportunity now, the counterattack and the fend when they exist. "This should be standard for all items they're equipped with."
- **The basic attack has a stamina cost on the unit's own Activation; a special free attack does not pay it.**
- −20 Accuracy on a special free attack stands from 2026-09-28; he did not speak to it.

Filed: `rule.free-attack-is-basic-attack` (the attack of opportunity and the basic attack), and `capability.counterattack-and-fend` (ruled 2026-09-28, in no queue until now).
