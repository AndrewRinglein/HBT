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
