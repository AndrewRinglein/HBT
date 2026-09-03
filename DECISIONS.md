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
