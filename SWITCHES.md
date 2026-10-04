# Switches

Ambiguity gets exposed, not decided. Each row is a question the simulation can
answer; the default is what runs today.

**A tooling ambiguity does not belong here** — how a tool reads a file, prints a line
or decides a shape goes in `../../GBH/SWITCHES.md`. Ruled 2026-09-06, Angela: *"tooling
ambiguity should go into GBH."* This file is for questions a battle can answer.

**Answered switches keep their code path** so the alternative stays sweepable, but
the default freezes and the baseline uses it. Without recording the answers,
"baseline" stops meaning anything by month three.

| switch | question | default | status |
|---|---|---|---|
| `critEnabled` | Is the crit system live? | `false` | open |
| `rangerPunchesWhenAdjacent` | Adjacent ranger: punch, or back off and shoot? | back off | open |
| `moveCostPerHex` | Does stamina cost per hex, or per move action? | per action | open |
| `recomputeStatsBetweenHits` | Does a stat gain from hit 1 apply to hit 2? | no | open |
| `multiAttackRetargets` | If the target dies, does hit 2 retarget or fizzle? | **fizzle — answered by Angela 2026-08-15** | answered |
| `multiAttackResolution` | Do the hits of a multi-attack resolve together or one at a time? | **fully, one at a time — answered 2026-08-15** | answered |
| `powerRollsToHit` | Do class powers roll to hit (and so crit)? | no — auto-hit | **not implemented** |
| `critChartSplit` | On a crit: plain damage bonus, or a chart effect — how often each, per side? | **heroes hit 75/25, enemies hit 50/50 — answered by Angela 2026-08-22** | answered |
| `statusDecayRung` | Does a status decay at the tick rung, or at the later duration rung? | tick — act and decay in one pass | open |
| `absorbSpendOrder` | Which absorbing status pays first when several are held? | id order | open |
| `activationOrder` | Fixed by unit id, random, or best-first? | fixed | open |
| ~~all `terrain.*` values~~ | ~~cost and cover~~ | **NOT SWITCHES — specified in `GROUND-REQUIREMENTS.md` §1.1** | closed |
| `terrain.forest.cover` | Does forest hide you (+dodge), armour you (+armor), or both? | +10 dodge, +1 armor | open |
| `terrain.rocky.cover` | Is broken ground cover, or just slow? | +5 dodge | open |
| `terrain.water.penalty` | Does wading cost accuracy, or only movement? | −10 acc, −5 dodge | open |
| `hazardOnDowned` | Does terrain reach a downed hero? | not modelled — statuses LAND on the downed but never tick (corrected 2026-09-04, FINDING 44) | answered |
| `protectionStacking` | A pulse of 2 onto a hero holding 1 gives 3 or 2? | additive | answered |

## Notes

**`hazardOnDowned`** — corrected 2026-09-04 (FINDING 44): the old sentence said
"downed carry no statuses"; they do — `applyStatus` has no `lifeState` guard and
80 poisons in 220 audited battles landed on the downed (the zombie's claw on a
bleeding hero, then its rider). They never tick (`tickUnitStatuses` skips the
non-standing) and, with no stands (fix.deathbed-no-stands), a downed unit never
returns to a state where they could matter. The sentence is corrected rather
than the mutator guarded: a guard would be a rule ("the downed cannot be
poisoned") nobody has ruled, and the log lines are true.

**`statusDecayRung`** — `COMBAT-SEQUENCE.md` puts status ticks at rung 3 and
duration decay at rung 5, with a settle between. For a damage-over-time the damage
and the duration are the *same number*, so which rung owns the −1 is genuinely
ambiguous. Today both happen in one pass at rung 3. It makes no observable
difference until something can read or restore a status value between the two
rungs — a cleanse, an antidote, a refresh — at which point it decides whether that
effect gets one more tick out of the status or not.

**`absorbSpendOrder`** — with one absorbing status it cannot matter. With two of
different durations it decides whether you spend the one about to expire or the
one that would have lasted. Worth answering before a second shield exists.


## Multi-attack, answered 2026-08-15

> *"We need to fully resolve the first attack. There is no new target for the second
> attack, but there are things that can trigger out of the first attack that can be
> relevant to the second attack ... if the target is no longer there because the
> attack was killed, then there are no more attacks against it."*

Three rulings in one, and the third has teeth:

1. **Each hit resolves completely before the next begins** — damage, triggers,
   settle, all of it.
2. **No retargeting.** A multi-attack names one target and keeps it.
3. **Hit 2 must be re-resolved from scratch, not reused.** Hit 1 can apply poison,
   and a `DMG.VS_TARGET` station reads the target's statuses — so caching hit 1's
   preview and replaying it would compute hit 2 against a target that no longer
   exists in that state. **A multi-attack is a loop over full resolutions, never one
   resolution applied twice.**

Remaining hits are cancelled the moment the target stops standing.

## These were never switches — they were already specified

**2026-08-14, corrected.** The section below said I had invented terrain values and
should not have. That was true but incomplete. The values were **already written
down**, by Angela, in `GROUND-REQUIREMENTS.md` §1.1, dated 2026-08-13 — a day and a
half before the engine work — in the same folder, in a file named for the subject.

I never opened it. I read `MAP-01/map.json`, saw `moveCost: null` with the note
"design decisions, not generated data", and read that as *nobody has decided*. It
meant *not in this file*.

Three of the seven rows I shipped were wrong against that table, not one:

| row | §1.1 says | I shipped |
|---|---|---|
| `terrain.rocky` | cost 2 · **−5 Acc, +1 Armor, +1 Resist** | cost 2 · +5 Dodge |
| `terrain.water` | cost 2 · −10 Acc · **strips Burn/Poison** | cost 3 · −10 Acc, −5 Dodge |
| `terrain.rocky-hills` | cost 3 · **composed** | cost 2 · +10 Acc, +2 Reach |

**The rule this leaves behind:** before writing any content value, grep the design
folder for its id. `terrain.rocky` would have landed on §1.1 immediately. A value
with a stated owner is not an open question, and must never appear in this file.

### Still not built, from §1.1

- **Water strips Burn and Poison.** No mechanic exists for terrain removing a status.
- ~~**The impassable terrain's two names.**~~ **Answered 2026-09-24** (Andrew): it is
  `terrain.impassable`, per §1.1. See DECISIONS.md and GLOSSARY.md "Settled, 2026-09-24".

## The original note, kept because a decision you reversed is still a decision

**2026-08-14.** `terrain.movecost` shipped with forest 2, rocky 2, rocky-hills 2,
water 3. Those numbers were mine. They were labelled switches, which reads as
"deferred", but a default nobody sweeps is a decision — and these went straight into
a balance sweep and got quoted back as findings.

Worse, `rocky-hills` was assigned a number by hand. It is rock **and** a climb, so
its cost is definitionally its components: 1 + 1 + 1 = 3. A hand-set number for a
combination is always self-consistent and therefore never catchable — nothing can
disagree with it. Composing it from traits means the combination cannot drift from
its parts, and there is a test that fails if it ever does.

**The rule this leaves behind:** a switch may carry a default only when no
composition exists. If a value is the sum, product or consequence of other values,
it is derived, not switched — and putting it in this table is how it stops being
checked.

## burnHalvingReadLive

**Question.** During the End-of-Phase tick, is "healing halved while Burn is
present" read LIVE (a Burn that expired earlier in the same tick no longer
halves) or from a SNAPSHOT taken before any status resolved?

**Default: live.** It falls out of the one-pass, id-sorted resolution (Law 6)
with zero extra state: Burn 1 deals its last tick, expires, and a Regeneration
resolving later that phase heals in full. Deterministic and stated in
test/burn.test.ts. The snapshot reading would need a pre-pass; build it only if
a sweep shows the difference matters. *(2026-08-20, found landing status.burn.)*

## slowReadAtActivationStart

**Question.** Slow applied MID-activation (a future attack-of-opportunity or
retaliation rider) — does it cut the CURRENT activation's remaining points, or
only the next one's?

**Default: next activation only.** The reducesMovement read happens exactly once,
in `beginActivation` — one consumption site, no mid-move re-budgeting. The AoO's
own move-point bite (half the damage, rounded down — ruled) is a separate
mechanism and must not double-dip through Slow. *(2026-08-20, landing
status.slow.)*

## slowVsEffectiveMovement

**Question.** When Movement StatMods exist (a Limp badge, gear), does Slow
subtract from BASE Movement or from effective Movement?

**Default: base.** `beginActivation` reads `u.movement` raw today — nothing else
reaches movePointsLeft yet, so the two readings are indistinguishable. The flip
point is when beginActivation adopts the stat pipeline (`effective(…,'movement')`);
re-decide with a sweep then. *(2026-08-20, landing status.slow.)*

## poisonedGroundTiming

**Question.** The Codex says poisoned ground hits units that "begin their Turn"
on it; the engine's tile-effects rung is End of Activation (where Airwalk was
ruled to check, and where burning fires per the Flight ruling). Begin-of-
activation, or End of Activation?

**Default: End of Activation** — one consumption site for ALL ground applies;
the rung Airwalk gates already exists. The fork is real: under EoA, a unit that
walks onto poisoned ground and stops is hit this Turn while one that starts
there and leaves escapes; under begin-of-Turn, exactly the reverse. A sweep can
price the difference. *(2026-08-20, landing terrain.burning-ground.)*

## beastAccuracy

**Question.** What Accuracy does a Beast-class enemy baseline at? The Codex
class derivation prices every class (Priest and Ranger 80 … Civilian 70) but
never Beast.

**Default: 70** — the Civilian "untrained" tier; a beast aims with instinct, not
drill. Sweepable the day the Codex prices Beast. *(2026-08-20, landing the Beast
pen.)*

**ANSWERED for the fixed beasts, 2026-08-20:** Angela dictated per-hero
accuracies (Spirit Snake 110, Green Drake 65). The 70 default stands only for
future beasts she has not priced.

## brawlStaminaCost

**Question.** Do natural-weapon attacks (Fangs, Breath) cost their Codex Stam
when the wielder runs a stamina bar?

**Default: 0 while only enemies wield them** — GAME-DESIGN rules enemies
costless ("the tireless dead versus the winded living"). Revisit when a
hero-side Beast lands. *(2026-08-20, landing the Beast pen.)*

**ANSWERED 2026-08-20, same day:** a hero-side Beast landed (Angela's Spirit
Snake redesign). Fangs cost their Codex Stam 1; the drake's Breath costs 2 and
Snap costs 1, all dictated. No enemy wields a natural weapon in the standard
battles any more, so the 0-stamina-enemy conflict never arises; if one ever
does, enemies-don't-run-stamina wins and the cost is waived enemy-side.

## sidestepUnderFullSlow

**Question.** Can a unit Slowed to 0 movement points still Sidestep / Side
Roll? The published Sidestep rule says the destination's terrain cost is
irrelevant, and Slow's rule says a 0-point unit "still acts from where it
stands" — neither says whether the half-step survives full Slow.

**Default: YES** — a sidestep-shaped power never consults the movement-point
budget at all (the slot is the price, not the points), so full Slow does not
block it. This reads the "terrain cost is irrelevant" clause as "points are
not this power's currency". The other path (require 1 point) stays one line
away in `executeSidestep` if a sweep or a ruling wants it. *(2026-08-21,
landing movement.powers.)*

## aiLeapToAdjacent

**Question.** When a melee unit's leap lands adjacent to its target and it can
still afford its preferred attack, should the AI leap instead of walking — is
the rider (+2 Strength on the swing it enables) worth 2 Stamina?

**Default: on.** Added 2026-08-25 with movement.bonus-actions; the switch
exists because the trade is a number a sweep can measure, not a conviction.

## leapCrossesIntermediateHex

**Question.** Leap moves exactly 2 hexes. Does the hex between fire its entry
ground beat (burning ground sears as you pass), or does the leap clear it?

**Default: cleared** — the entry beat fires at the destination only, matching
the Codex text's silence and the flight precedent ("only the destination needs
to be viable"). The other reading costs a code path when a sweep wants it.

## critChartSplit

**Question.** When a crit lands, how often is it a plain damage bonus versus a
roll on the effect chart? And is the split the same when a hero is hit as when
an enemy is?

**Answered by Angela, 2026-08-22 — and it is two numbers, not one.** Her words:
"there is a switch, different on players and enemies. crits to heroes 75% 25%,
Enemies 50/50, for the 50% damage increase vs the effects."

- **Crits against heroes: 75% damage bonus / 25% chart effect.** Effects the
  player suffers stay rare enough to stay frightening; the damage-only outcome
  is the merciful one and does real work as a relief valve.
- **Crits against enemies: 50% / 50%.** Effects the player inflicts are pure
  tactical upside — enemies carry nothing past the battle — so the effect
  slice is fat.

Both splits keep their code path and stay sweepable (metrics: hero effect-crits
per battle, and later take-home injuries per battle and bench occupancy, once
the harness runs Weeks). Depends on `critEnabled`; the roll that picks
damage-vs-effect is its own named stream, keyed by the crit, never by turn.

**Related, NOT settled here:** the same 2026-08-22 discussion moved toward the
hero-side effect chart being severity-ordered, with only its deepest results
persisting into the curable injury track. That would overturn COMBAT-DESIGN
Law 22 ("crits never mint permanence") and must land as a dated ruling in
COMBAT-DESIGN.md, not hide in a switch. Until that ruling is written, all
chart effects remain battle-scoped.

## areaHitsAllies — do area attacks strike allies in the shape?
Added 2026-08-27 (capability.area-attack). Default **true**: Storm's authored
text says "to every unit in the blast" — EVERY unit. The Cleave text names
hexes, not sides, and the arc through a melee scrum will sooner or later catch
a friend. Question for a sweep: does friendly fire on area attacks change hero
win rates enough to matter, and does the game feel better with it on?

## aiAreaThroughAllies — may the AI swing an area attack through its own allies?
Added 2026-08-27 (capability.area-attack). Default **false**: the AI only
swings wide when at least two enemies and NO ally stand in the shape. With
areaHitsAllies on, turning this on makes the AI accept friendly-fire trades.
Question for a sweep: does an AI willing to clip one ally for two enemies win
more battles than one that never does?

## knockbackBlocked — what happens when the push has nowhere to go?
Added 2026-08-27 (capability.knockback). The authored text ("push the target
1 hex directly away from you") says nothing about walls, the board edge,
impassable terrain, or an occupied hex — 1-EFFECTS-NOTES.md flags exactly this
("no rules for walls, impassable hexes, occupied hexes"). Default: **the push
stops where it is blocked** — a partial push travels what it can, a fully
blocked push fizzles in place with `knockback.blocked` logged and its reason
named. The unexplored branch (collision damage, or damage-on-fizzle) is not
built; if a sweep or a ruling wants slam-into-wall damage, that is a new
effect, not a flip of this switch.

**RETIRED 2026-09-23 (v2.knockback-collisions).** Ruled 2026-09-07 in
COMBAT-V2-DESIGN-2026-09-07.md §9.3: a stopped push is a collision — true damage
to the mover = the blocker's collision value × remaining knockback points. The
fizzle is gone; the defaults that landing took are in "V2 knockback collisions"
at the end of this file.

## healIncludesSelf — is the priest his own ally?
Added 2026-08-27 (capability.item-powers). Heal targets "one ally within 6
hexes"; whether that includes the caster is unstated. Default **true** — the
common reading. A sweep can ask whether self-healing priests outlive parties
whose priest must be healed by someone else.

## critChartShareVsHeroes / critChartShareVsEnemies — the branch flip's weights
Added 2026-08-27 (station.crit) carrying critChartSplit's 2026-08-22 per-side
answer; RE-RULED the same day (fix.crit-branch-even): "It should be a 50%
chance of just a damage boost and a 50% chance of one of the effects", and the
per-side asymmetry is HELD OFF — "that is a different concept". Both default
**50** now. The two switches stay so a sweep (or the revived per-side concept)
can move them without an engine change.

## critMaxHealthFloorsAtOne — can Nerve Struck kill?
Added 2026-08-27 (station.crit). The dictation: "Stat losses floor where the
row says 'minimum 0'; nothing else floors." Read literally, Nerve Struck's
−2 Max Health does not floor, and a unit whose Max Health reaches 0 dies of
the strike. Default **false** (the literal reading); the merciful floor-at-1
path is kept for a sweep — metric: deaths by nerve-strike per hundred battles.

## multiCritWithReplacement — can "do two criticals" land the same injury twice?
Added 2026-08-27 (station.crit-count). Ruled the same day: "there is also an
ability to have more than one critical happen at once... 'Do two criticals' or
'Do three criticals'." When two or more of those criticals come up tails,
each rolls the chart — WITH replacement by default (a doubled Bleeding simply
stacks; the simplest reading). The without-replacement path re-draws repeats
on a salted key and is fully built, because item.bracer ("multiplies chart
rolls") was explicitly parked on this exact question — when Andrew answers it
for the bracer, this switch is the one that moves.

## bleedShedFromLanded — which "healing" sheds Bleed?
Added 2026-09-02 (fix.bleed-magnitude). Codex S41/S43, ruled: healing cures
Bleed by HALF the healing, "rounded nearest, 0.5 up", and Burn halves the heal
first. The one thing the ruling leaves open is the BASE when the unit is at or
near full health: half of what actually landed on the bar (default, true — S43
says "half the APPLIED amount"), or half of what was asked after Burn's halving
(false — a full-health unit can still be cured). They differ only at the cap.
Both paths are built in `applyHealing`; a sweep on healers-vs-bleeders answers it.

## items.foldOrLedger — do item stat deltas fold silently or show in the ledger?
Noted 2026-09-02 (seam.items-per-unit, ITEMS-PLAN.md §5). Items fold their
stat modifiers additively into the fielded def — the arithmetic the converter
did at pack time, moved to fielding, so the invariant (no heroItems ⇒ the
same unit) holds. The alternative is StatMods with scope 'item' and source =
the item id, so a ledger line names the cause per stat (Law 12). NOT BUILT as
a switch yet: fold is the only path today, and `unit.equipped` already names
what each item put on the unit. When a reviewer wants the per-stat cause in a
damage ledger, this is the switch to add; a sweep cannot answer it — it is a
readability question, and it is not a question for Angela.

## downedHitBleedTicks — how hard does a hit on the downed push the counter?
Added 2026-09-03 (fix.downed-targetable). GAME-DESIGN §9, ruled: "Enemies roll
at +20 against downed heroes, but a hit only accelerates the bleed-out counter.
It never kills." *Accelerates* is not a number. Default **1** step per hit —
the smallest reading; the counter never drops below 1 by a hit, because the
kill belongs to the End-of-Hero-Phase rung alone (that half is the ruling, not
a switch). A sweep on rescue windows answers whether 1 is too gentle.

## aiAttacksDowned — when does the AI swing at a downed hero?
Added 2026-09-03 (fix.downed-targetable). The downed are legal targets now;
whether an enemy TAKES one is the AI's call, and the design never says.
`never` · `whenNoStanding` (default — the downed are a finisher's target, only
when nothing standing is in reach) · `always` (the finisher: a downed hero in
reach is struck before anyone standing, which is what "the zombies swarm the
fallen" would mean). Default chosen for the mildest change to the control
battles; a sweep on hero deaths per battle is the measurement.

## aiKiteHoldsAtPowerRange — does the kite close to a power's range?
Added 2026-09-03 (ability.effects), found on the progression roster: the
Emberwright's +3 Reach put her staff at 7 hexes and the kite held there, so
Fireball (range 6) was never once legal across twenty battles — dead content
by positioning. Default **on**: while an enemy-aimed power is ready and
affordable, the hold distance is the shorter of weapon reach and that power's
range. Off = weapon reach, the old rule. Whether closing three hexes to throw
a fireball is worth the melee exposure is a sweep's question.

## boardClearWaitsForSchedule — is an empty board a win before the last wave?
Added 2026-09-03 (encounter.runner). Surrounded (battle.prologue-2) opens with
four zombies and owes four more waves through Turn 5; on one seed the party
killed the four by Turn 2 and the board was "clear". Default **on**: heroClear
waits until every schedule row has fired. Off: the old rule, a cleared board
is a cleared board. The wipe check is unaffected either way. A sweep on
prologue outcomes decides whether the waiting changes anything but the label.

## aiAttackChoice — which attack does the AI swing?
Added 2026-09-03 (ai.attack-choice). `declared` (default): the first affordable
attack in the unit's declared order — the rule since the first battle, under
which the Sky Pirate's Javelin Throw and Dagger Stab, Osric's Longsword Stab
and Shield Slam, and the Ghoul's Devour never fire (integration.test computes
the structurally-dead list from the rows). `bestDamage`: the legal attack with
the highest previewed damage on hit, ties to the earlier listing. Riders (a
stun, a self-Protection) are not priced by either — a third policy's question.
`npm run sweep` on the eight control battles answers which the AI should use.

**Open question, added 2026-09-04 (FINDING 42, the log-invariant audit):** under
`declared` the AI swung for a PREVIEWED 0 damage 530 times in 220 battles — the
dumb-melee's 3-point claw into Osric's Block (Protection 5), Lucius's Wrath at
range into a shielded zombie. Nothing in either arm asks "is the number zero".
For the zombie there is no better choice; for Lucius a Punch or a step was. The
question a third arm would answer: **skip a 0 preview when another action
exists** (`declaredNonZero`: the first affordable attack whose previewed damage
on hit is > 0, falling back to the declared order when none is). Not built —
the AI is undesigned by ruling (Andrew 2026-09-04, `system.ai-modes` waits on a
design), and a sweep of `declared` vs `bestDamage` has not run yet either.

## zoneOfControl — are zones of control and attacks of opportunity live?
Added 2026-09-03 (movement.zone-of-control, movement.attack-of-opportunity).
Ruled by GAME-DESIGN §4 and Angela 2026-08-13, so the default is **on**; the
switch exists because it is the largest single change to every balance number
the engine has, and the paired sweep wants the pre-ZoC arm. The AI is blind to
both by the same ruling — that is not a switch. Re-ruled 2026-09-04
(fix.zoc-threat-not-stop): the zone never stops a mover by itself — leaving a
hex inside it provokes the swing, and only a HIT ends the move. No held.

## aiEatsBeforeBiting — does the Ghoul eat before it bites?
Added 2026-09-03 (capability.corpses). Eat Corpse is a self-power; the AI has to
decide when. Default **on**: a body in reach is eaten before the swing, because
Supper's whole design is a Ghoul "that has eaten three villagers is Strength 10
on 21 Health". Off: it eats only when it has nothing to bite. A sweep on
Supper answers whether the feast or the bite kills more heroes.

## corpseRaiseRadius — how far does the Necromancer's Raise reach?
Added 2026-09-03 (capability.corpses). The authored row states no range; the
encounter session assumed its aura's 2 and named it as open (8-ENCOUNTERS E1).
Compiled as 2 for now — a converter constant, not yet a Config switch; the row
is where the number should live once ruled.

**RETIRED 2026-09-28 (fix.raise-range).** Ruled 2026-09-27 (Andrew, DECISIONS.md
"the Necromancer's Raise reaches 10"): *"Give the necromancer a raise of 10 range."* The
number lives on the Codex row (the Raise trigger's `range`, 10); `content/mkenginepack.mjs`
reads it and no longer compiles a constant. A Raise row with no range is a named gap
(`content/gen/enemy-pack-gaps.json`, needs `content: range unstated`), never a default.
Probe: `test/raise-range.test.ts`.

## frostLayerStack — what does frost GROUND put on its occupant?
Added 2026-09-03 (capability.ground-layers). rule.ground-layers names frost as
a layer and status.frost is shaped, but no row says what standing on frost
ground does. Compiled as Frost 1 at End of Activation — the mirror of burning
ground's Burn 1 — as a constant in `maps.ts` LAYER_TRAITS, not yet a Config
switch. Rime's design ("heroes carrying Frost 2–3 from the band") is the sweep.

## targetUnseen — can you target what you cannot see?
Added 2026-09-03 (capability.vision). COMBAT-DESIGN §4 leaves it OPEN and
assumes no; default **false** (no). True lets a unit attack into the dark at
full range, which makes darkness a movement problem only. Fog's order of
operations (§4's other OPEN) is not built: there is no fog row yet.

## actionSlots — may either of the Activation's two actions spend any action?
Added 2026-09-04 (refactor.one-action-type). Ruled 2026-09-04: "structurally,
movement and primary are identical. They can both do any of the same things."
Implemented 2026-09-11 by capability.authored-slots under authorized V2 migration.
The action carries `slot` (movement · primary · either; absent = either), and
both policies enforce that restriction. `byProfile`, the default, prefers
movement for movement profiles and primary for attacks/powers; an incompatible
preference falls back to an open authored-compatible slot. `any` prefers the
earliest compatible slot. A caller may explicitly request movement or primary.
Primary closes earlier movement. Free actions spend no slot but precede primary;
reactions bypass activation-slot order and retain resource costs.

Provisional AI policy: existing modes continue after successful choices until
primary, an idle decision or no progress. Each free action ID is chosen at most
once per cycle by the AI, not a new human/core usage limit. The finite budget is
two paid opportunities plus all free registry IDs; exceeding it throws. Full
contract and historical-test changes: `V2-AUTHORED-SLOTS.md`. Universal expenditure
events remain the immediately following item; no conditional replay fallback.

## mirrorSideRules — which side's rules does a unit fielded against its row follow?
Added 2026-09-04 (proving.side-override). Ruled 2026-09-03 (the Proving):
mirror matches are in scope — "four zombies against four zombies, and what
we're testing is: what does initiative matter?" — and Angela's own caveat in
the same breath: "I guess maybe we can't because of power and magic and
faith." The side-keyed rules are: the hero side runs stamina and Surge and
rolls Deathbed Fighting at 0 (and bleeds out, with the Hero badge); the enemy
side runs the Power pool and dies at 0. Default **`fielded`**: an overridden
unit follows the rules of the side it is fielded on — a zombie among the
heroes rolls Deathbed Fighting; a hero among the enemies dies at 0 and gains
Power on arrival. **`row` built 2026-09-04 (proving.mirror-row-rules)** — a
unit follows its own ROW's rules wherever it stands: `Unit.rowSide` is set at
fielding, `rulesSideOf()` (`side.ts`) is the one reader, and the side-keyed
RULES read it — dies-at-0 vs Deathbed Fighting and bleed-out, Surge, the Power
pool (arrival, `power.gain`, `powerScale`, `valueOf` scale power), the crit
chart's "vs heroes" share. ALLEGIANCE never does: allies, targets, phases,
victory, stamina regen at your own phase's end, who lights the darkness, the
party sums — those are the fielded side. Angela 2026-09-04 (via session 9,
DECISIONS "The Proving's first pass"): "If there's deathbed fighting, that will
change the hero side, and the hero side has the limitation of stamina. So, can
we just field enemies against enemies?" — `row` is what makes that clean.
One pool, still: under `row` an enemy-row unit on EITHER side feeds and reads
`state.power` — symmetric in a mirror, a distortion in a mixed fielding; note
it in the plan. The first mirror sweep (20 seeds, four zombies each way,
`showcase.mirror-zombies`, `fielded`) came out 8–12 AGAINST the side with
initiative. Re-run 2026-09-04 at 40 seeds: `fielded` 16–24, **`row` 13–27** —
with the hero-side rules removed the side WITH initiative still loses, so it
is not the rules: under the dumb-melee AI the first mover closes the distance,
spends its Activation arriving, and the other side swings first. Initiative
is a liability for a melee mirror; the Proving's `initiative` plan is
measuring the AI's approach as much as the first move — say so in its note.

## maxHpGainFillsBar — does a max-HP gain mid-battle raise the bar with the cap?
Added 2026-09-04 (FINDINGS 37, the horde's `capped`). `gainMaxHp` raises `hp`
by the same amount — written for Fortify's "+3 Health for the rest of the
Battle", where the gain is meant to be felt now. badge.afflictions routes a
badge's `maxHp` through the same function, so a zombie's Rotting Flesh (+8)
heals the hero it just clawed by 8 on the hit that afflicted him. Default
**true** (as built). False: the cap rises, the bar does not — an affliction is
room, not health. Not yet a Config switch; the function is the one place to
put it. A sweep on `test.map.horde-24` at its format's 24 bodies (gate 5 plays
it at 8 — FINDINGS 37) answers what the fill costs the horde.

## maxBoardCells — authored map resource ceiling

Added 2026-09-11 for V2 authored dimensions. Provisional **10,000 cells**,
matching the atlas ceiling; positive safe-integer width and height are required.
This is an input/allocation limit, not a battlefield size recommendation.
`MAX_BOARD_CELLS` in core/hex.ts and content/map-schema.mjs enforce the same
contract before geometry construction, compilation/publication and save restore.
The four named FORMATS remain convenience sizes. Raising this limit requires
new bounded validation and geometry evidence; it is not a per-battle Config knob.

## highCellContact — exact closed-hex attack lines

Added 2026-09-11 for V2 high-cell LOS. Provisional **closed contact blocks**:
touching a high cell's edge or vertex blocks in either direction, including
melee reach beyond one hex. Vision/auras remain radius rules. The integer affine
SAT and independent segment/edge oracle test this choice without rounding.

## highCellResources — precomputed all-pairs geometry limits

Added 2026-09-11. Provisional limits in core/los.ts: **1,024,000,000 pair/cell
tests**, **16,000,000 reverse entries**, **64 MiB shared immutable cache**.
The 10,000-cell input ceiling is not unconditional dense-LOS support. Reject
unsupported geometry loudly; never omit blockers or approximate rays. Full
dimensions and sorted blockers identify tables; forks share only immutable data.
The cache cap counts estimated retained table bytes, conservatively counting
shared reverse arrays again. Live contexts may retain evicted tables separately.

The initial 128-million work proposal rejected 40×40 with 600 blockers. Real
engine measurements justified raising it: cold 7.746s / warm-open 7.434s,
767,520,000 exact tests, 12,548,301 reverse entries and 50,396,736 estimated
bytes. Cold/warm 40×40/64 took 0.825s/0.773s. An open 100×100 table takes
80 estimated bytes and no pair bitset. A 100×100 board with 21 blockers
rejects before geometry allocation; 40×40 with 801 exceeds the work cap too.
Incremental removal checks existing exact reverse lists, and addition computes
only new blocker lists. Bounds do not depend on cache history. See receipt and
benchmark logs for exact shapes; this is a resource policy, not authored tuning.

## terrain.authored-high-props — canonical static footprints (2026-09-11)

Provisional: authored `x` becomes OPEN ground plus high material-3
`prop.obstacle.<hex>`. Explicit props retain underlying ground, use map/battle
scoped `prop.*` IDs and material 1/2/3. Footprints contain distinct full hexes;
different props may overlap, blockage is their union. Total footprint references
are bounded at 10,000 including shorthand. Reserved shorthand IDs cannot be authored.
No material-dependent destruction behavior, low cover, edges or props commands
are implied. Numeric OBSTACLE remains an authoring token, forbidden in saved
canonical ground and initial map facts. One prepared immutable occupancy view
per synchronous operation observes any changed footprints at its next boundary.
Existing LOS limits remain unchanged. The 40×40/600 benchmark compares actual
setup, sidestep and path enumeration against 038304f; details in the receipt.

## terrain.authored-geometry — floor and finite convex footprints (2026-09-15)

Provisional transport: an optional exact-length boolean `floor` mask says which
cell centers support standing/landing. Absent means complete floor. Missing floor
blocks placement, arrivals, walking and knockback destinations, but never attack
lines. Flight retains its existing destination-only contract; it can cross gaps
and high props but cannot land on either. This is not a new flight altitude rule.

A high prop may instead have `footprint: {kind:'polygon', vertices, movementPadding}`.
Vertices are integer `[x,y]` pairs in the existing odd-r affine plane at scale 1000:
cell centers are `[1000*(2*col+row%2),3000*row]`. Finite thickness is authored;
zero-area shapes are rejected, never silently thickened. Each polygon is strictly
convex with 3–32 vertices, clockwise or counterclockwise. Concave shapes require
multiple explicitly authored convex parts. Closed tangent contact blocks.

Physical attack geometry uses those vertices without padding. Movement clearance
is separately authored as an integer `movementPadding` (zero permitted), measured
using `distance²=3*dx²+dy²`. This expresses the Atlas metric without square roots:
one affine y unit is 0.00075 meters, and 0.48 meters corresponds to 640 units.
This is an input contract, not an automatic body radius or universal 0.48 rule.
Walking, nonzero sidesteps and knockback reject center segments within the padding;
placement/arrival/flight only require their destination point to be clear.

Resource bounds: absolute coordinate ≤40,000,000, movement padding ≤100,000,
8192 total polygon vertices, alongside the existing 10,000 full-hex references.
LOS keeps the existing all-pairs bitset/reverse-list cache: polygon keys include
every vertex and padding; its work budget counts a polygon's vertex count.
Invalidation retains unchanged reverse lists and recomputes pairs affected by
removed/changed polygons. Floor does not enter the attack cache. These limits
are resource policies; they do not authorize resizing or simplifying user maps.

Orientation uses exact Number integer products only when the absolute-product sum
fits Number.MAX_SAFE_INTEGER, otherwise BigInt. Weighted squared clearance uses
BigInt throughout. No trigonometry or geometry quantization happens in combat;
the external map compiler must quantize its authored transforms once.


## terrain.low-cover — directional physical cover (2026-09-15)

V2 §3/§5 owns low props, ranged −20 accuracy/−1 damage, melee −1 damage,
attack-kind classification, and cap one. Generic `Prop`/`AuthoredProp` now carry
height `low | high`; strict HighProp aliases remain for high-only callers.
Low full hexes and convex physical polygons are passable and do not block LOS.
Their movementPadding is transported/validated but does not create cover or blockage.

Provisional exact contact: intersect the physical attack segment with the target
cell or a ray-crossed immediately adjacent cell. For polygons the SAME intersection
must lie inside that target region: distant portions of a long wall never count.
Remove the closed source-cell portion from eligible contact; source-own cover
cannot penalize the attacker. All remaining closed tangent contact counts, including
a one-point physical contact. BigInt rational clipping performs no division or
rounding. Full-hex props use the same cell boundary geometry as existing LOS.

Provisional stations: ranged ACC.COVER 575 subtracts 20 before target Dodge;
DMG.COVER 525 subtracts exactly one AFTER critical multiplication and BEFORE
Frost/Protection/Armor/Resist. The existing final floor prevents negative damage.
Legacy area attacks and abilities retain their existing behavior; V2 burst work
remains separate. Shared preview, ordinary attacks and reactions use these stations.
Covered misses carry coverPenalty 20, boolean cover, and missCause. A roll in the
highest Dodge points of 1–100 is attributed to dodge first. Otherwise a miss is
cover-caused exactly when adding back the 20 accuracy would hit; remaining misses
are accuracy-caused. Uncovered event objects remain unchanged. No onDodge hook or
prop destruction is introduced; future destruction must occur after this resolution.

Provisional edge policy: optional `crossingCost:1` is allowed only on a low polygon.
Absent means zero. It explicitly identifies a low edge rather than guessing that
every crate is a wall. Each distinct authored edge intersected by a neighbor-center
path step adds one movement point; closed tangent contact counts, including a step
inside a broad edge. Overlapping distinct edge props sum, while attack cover still
caps at one. The authoring adapter owns whether compound parts represent distinct
edges. Path-shaped movement pays; explicit free sidestep, destination-only flight,
and forced knockback keep their existing no-ground-budget semantics.

All directed cover pairs and adjacent crossing costs are precomputed. Complete
prop data plus board dimensions key immutable derived tables. Unchanged reverse
lists are reused; removal/edits revisit affected directed pairs, without clearing
another overlapping prop. Per-operation movement cost snapshots avoid rescanning
props inside Dijkstra. Actual walking refreshes at each step boundary for triggers.
The resource policy is 1,024,000,000 conservative geometry work units, 16,000,000
reverse entries and a 64 MiB shared LRU budget. Physical-overlap candidate cells
bound pair work without approximating shapes. Reused reverse lists count toward
the same complete-table work limit as cold setup. Snapshots contain only plain
facts; rules version .14 invalidates prior behavior snapshots.


## 2026-09-16 — dumb-melee contact ties

For equal remaining distance to the nearest target, dumb melee prefers the lower
actual path movement-point cost, then fewer path steps, then lower destination
hex ID. Both cost and path come from the engine movement planner; low-edge and
weighted-ground costs participate. This is a provisional deterministic policy
for the authorized contact correction, not opportunity-risk scoring. It does
not change target choice, Dijkstra routing ties, other modes, free sidesteps,
or reactions: moving again while already adjacent can still provoke normally.


## 2026-09-16 — trusted human activation choice

A trusted ControlPolicy lists stable unit UIDs independently of allegiance. A
controlled driver pauses before beginActivation when the next captured phase
actor is standing, unblocked and human-owned. The strict select-activation
command chooses one remaining eligible human by UID and expected event sequence;
only the engine moves that actor to the next queue position and emits
activation.selected. Begin hooks, resources and Surge have not run at selection.

Provisional mixed-control policy: remaining humans can choose their relative
order when a human slot is reached; AI actors retain their relative order. Dead
actors are skipped, blocked actors retain their normal end ladder, ownership
overrides stay authoritative, and new arrivals cannot join the captured queue.
Surge remains the same activation/actor without another selection.

The automatic driver supplies no policy, retains fixed order and emits no
selection events. Restoring a pending selection into that driver resumes its
remaining queue in fixed order; it does not deadlock or invent a human command.
Pending/accepted-but-not-begun snapshots retain the queue, reject spent actors
reintroduced after an activation begin, and use rules version .16. Session
ownership is trusted external configuration, not client command data.

Current production mechanics never change Unit.side after construction. An
AI-control status changes ownership only; captured-phase restore/fork supports
that reachable transition. Existing cursor-side snapshot validation remains and
rejects a forged allegiance change. A future allegiance-changing mechanic must
define captured-side history before such snapshots become supported; this item
does not relax side validation for arbitrary host edits.


## 2026-09-16 — elemental resistance migration

- `elementalResistanceMagnitude`: provisional one-for-one conversion of authored fire/poison
  immunity magnitude into a flat stat. Fire/poison necklaces give 1; Hearthmother gives 1
  each; Fire Ward gives 2 fireResist and keeps its separate 1 resist; Imp/Powerful Imp give 1
  fireResist; Fire Imp gives 2 fireResist; Poison Imp gives 2 poisonResist; Poison Master
  gains 3 poisonResist in place of its passive, retaining its other authored stats.
  These values are tuning, not full immunity. Stable content IDs stay unchanged.
- `signedDamageDefense`: preserve the attack pipeline's signed effective-defense rule
  across typed HP damage: a negative defense increases damage. This explicitly replaces
  the old status-only clamp at zero; neither a second formula nor a duration change.
- `shadowGrowthIsNotHpDamage`: retain the authored Shadow growth/obliteration condition
  provisionally. V2 section 8 names Shadow status damage but supplies no HP tick amount
  or replacement growth rule. Shadow Resist mitigates typed shadow HP damage, including
  any explicitly authored damaging-status row. It does not reduce the current growth
  counter or stop obliteration. No existing Shadow HP tick is claimed.

## 2026-09-16 — Protection for all typed damage

- `protectionBeforeDefense`: retain the existing attack ordering for every typed
  HP damage path. Even a negative defense is applied after raw absorption; the
  signed-defense amplification remains consistent with the attack pipeline.
- `selfDamageIsDamage`: authored effects explicitly saying to take typed damage
  use Protection and their named defense. No separate health-cost mechanic was
  found or invented. Max HP changes and Shadow obliteration do not consume pools.
- `selfDamagePreview`: resolved self damage includes possible overkill; actual
  self HP loss is reported separately. Both come from real fork events in effect
  order, including pools consumed by preceding effects.

## 2026-09-16 — Ordered attack packets (provisional details)

- `packetProtectionReservation`: plan all packets at the damage rung using one
  pool, spend the reservation before onHit, then apply planned HP after onHit.
  This preserves the specific hook rung while fixing double absorption. Hooks
  use only unreserved Protection; newly added pools do not rewrite the plan.
- `packetCriticalEligibility`: hit riders include confirmed crits; crit riders
  fire once per hit, including injury-only and multiple-critical branches.
- `packetHookForecast`: public previews describe current state without predicting
  random onAttack/onCrit hooks. Internal live damage conservation captures its
  expectation after those hooks at the damage rung, preserving declared accuracy.
- `packetFrostOnce`: the first eligible physical packet receives the hit's one
  Frost contribution. An elemental base cannot suppress a later physical rider's
  contribution; subsequent physical packets do not repeat it.
- `packetPenetrationSignedArmor`: effective Armor minus `min(pen,max(0,Armor))`;
  physical packets only. Preserve existing negative vulnerability and never make
  an attack weaker by adding penetration. Elemental penetration does not exist.
- `packetAtomicHit`: resolve all eligible packets without intervening settlement;
  attribute remaining damage as overkill after HP reaches zero. Hook-killed
  targets receive zero packet HP damage and no duplicate attack damage/kill hook.
  No nonlethal damage flag or per-packet XP is introduced.
- `authoredCritPacketInterpretation`: Hand Axe '+4 damage' and Bane Blade 'deal 6
  more damage' onCrit are provisionally physical AND separately mitigated flat
  packets. Neither assumption is a user ruling; Armor applies to base and rider.
  Verbatim original source wording remains in content, with visible review notes.


## V2 bursts — provisional migration policy (2026-09-16)

See V2-BURSTS.md for the frozen source/roster/geometry lifecycle and exact tests. Existing arc wedges and Storm radius one retain IDs, costs, range and scaling, with explicit any-side metadata. Side/tag filters use allegiance. One per-target low-cover budget is allocated in packet order. onBurst eligibility uses positive declared payload after cover, before Frost/defenses; saves floor each packet before the shared Protection/defense tail. Frost applies once per target and honors frostBeforeProtection. Mixed damage/healing settles after the full burst. Taunt applies to unit targeting; Powers Locked covers bursts. Old areaHitsAllies is replaced by each burst's side field; aiBurstThroughAllies remains an AI preference only, never legality. No attack hooks, crit, block or burst KDB are implied.
# V2 Block implementation choices — 2026-09-18

`rule.block` implements COMBAT-V2-DESIGN §6. Sparse `block` and `rangedBlock`
default to0; effective values are clamped to0..100 only at the cup. Gear, badges,
progression and ordinary stat modifiers add through existing stat ownership.
No shield numbers are chosen here.

The cup is the first random resolution of each legal hit, before unconditional
`onAttack`. Its result is frozen: onAttack stat/status changes affect later hits,
not that cup. Successful block then fires defender onBlock, attacker onBlock,
attacker onMiss, in that order. It does not emit an accuracy-miss event, draw
accuracy/crit, resolve packets, or spend Protection. Hook effects remain real;
blocking a weapon does not suppress its unconditional onAttack effects.

Zero/suppressed chance records `block.rolled` with `roll:null` and no RNG draw.
Every legal incoming hit nevertheless increments a defender-local ordinal.
Positive chances use the appended block stream with defender UID/ordinal.
Reciprocal onBlock trigger keys append the appended hook index and role0
(defender/incoming ordinal) or1 (attacker/attack ordinal). Existing indices stay.
Stun explicitly carries generic `blocksBlock`; `blocksAction` alone does not.
Only stun is specified as an exception in §6: downed units provisionally retain
Block, and blocked hits do not accelerate bleed-out. Prone is a later mechanic.

Preview `hitChance` remains accuracy conditional on passing Block;
`connectionChanceBps` is `(100-blockChance)*hitChance`, integer basis points
(10,000=certainty). These are current-state forecasts, not predictions of random
hooks. AI bestDamage/burstIfUseful still use damageOnHit and are not Block-aware
optimizers; changing that policy belongs to a separate measured AI stage.

For multihit AttackResult, hit means ANY connected hit; damage is the sum and
blocked means all resolved hits blocked. `hits` retains exact per-hit results.
Other legacy scalar fields describe the final hit; that roll can be null even
when an earlier hit connected. Movement uses aggregate hit for AoO stopping;
prior-adjacency timing is unchanged. No Block applies to bursts.

# V2 shield powers and item identity — provisional numbers, 2026-09-20

Angela ruled the three shields' stats and said of the powers: *"I gave an estimation of what
to do. Can you fill in the rest?"* — so the numbers below are a switch, not a ruling. The
dated record that owns them is `../V2-SHIELDS-AND-WEAPONS-2026-09-20.md`, fourth pass. Her
correction outranks this entry whenever it comes; R1 runs these so battles can answer.

| switch | question | default | status |
|---|---|---|---|
| `shieldPowerNumbers` | What do the two powers per shield give, and at what cost? | Round: Turn Aside +10/+10 at 1 stamina, cd 2; Brace +5/+5 +1 Armor at 1, cd 3. Kite: Shield Wall +15 Block +1 Armor at 1, cd 3; Raise Guard +10/+10 at 1, cd 4. Tower: Cover +20/+20 +1 Armor at 2, cd 4; Stand Tall +25 Ranged Block +2 Armor at 2, cd 5. All until end of next activation. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `towerShieldIdReuse` | Does the new Tower shield re-author `item.tower-shield` in place, or take a new id? | **re-author `item.tower-shield` in place — answered by Angela 2026-09-20** (*"Yeah, the new tower shield. Rewrite the tower shield."*); Kite and Round are new ids | answered |
| `retiredShieldGrants` | What becomes of pot-lid's and holy-shield's non-Block grants (Armor, Accuracy, Resist, Health, aura), carried by no kit? | **left exactly as authored — answered by Angela 2026-09-20** (*"Just leave them as is"*): both items keep every grant, receive no Block or Ranged Block, and stay outside R1's shield class | answered |

Reasons for the defaults: costs sit inside the ladder every one of the engine's 339 powers
already uses (stamina 0 to 2, cooldown 0 to 6), and against the shield powers being retired —
Knight Block 1 and 3, Tower Cover 1 and 3, Stand Tall 2 and 4. Ordering follows her words:
Round cheapest, Tower dearest and strongest, Kite between. Each shield's second power covers
its own gap, so Kite's Raise Guard buys back the ranged block its +5 lacks. Re-authoring
`item.tower-shield` keeps the name it still carries and matches R1's own instruction to
re-author Tower Cover rather than invent a kind; `power.knight-shield.block` and
`power.buckler.block-and-dodge` retire with the items that grant them.

## V2 shields and weapon Block — defaults taken landing v2.shields (2026-09-23)

| Switch | Question | Default | Status |
|---|---|---|---|
| `weaponBlockFamilies` | Which weapons are "swords" and "knives and daggers" for weapon Block? | By tag, never by name: `blade` or `sword` → +5 one-handed, +10 two-handed; `dagger` → +5 (the two-handed Daggers pair included). The Rapier (`exotic`) and the Throwing Knives (`thrown`) carry neither tag and get none. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `axeOnAnyBlock` | Does the axe's −20 fire when a weapon's Block blocks, or only a shield's? | Any block (V2-SHIELDS-AND-WEAPONS open item 4's stated default). The axe's trigger is the ATTACKER's (`role: 'attacker'`); an axe-holder who blocks strips nothing. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `axeStripVsSwap` | The ruling accepts that swapping to another shield restores its bonus. | Not built: swaps are R6. Today the −20 is a battle-long mod on the unit, so no swap can restore anything. | open until R6 |
| `shieldPowerLifetime` | What is "until the end of your next Activation"? | The holder's next Activation: the mod carries the holder's activationOrdinal + 1 and is removed (`statmod.expired`) at that Activation's end. Mid-activation the actor's own next one; on anyone else, their next one. | provisional |
| `maceImpact` | Maces and hammers +2 Impact. | **Authored 2026-09-23 with v2.kdb**: `impact: 2` on the seven attacks of the four `hammer`-tagged weapons (iron mace, war hammer, carpenter's mallet, hammer of justice) in content gen/weapons.json. Ruled, so not a switch any more. | answered — V2-SHIELDS-AND-WEAPONS 2026-09-20 |
| `weaponFirePoison` | Fire on maces and hammers; fire and poison on "weapons of the appropriate type". | **Not authored.** Neither the weapons nor the amounts are stated (open item 3); inventing both across the catalog is the invented-rows trap. Angela's to name. | **as it stands, accepted** — Andrew 2026-09-24 (DECISIONS.md); the content is still to author |
| `shieldPowerNames` | Kite's "Shield Wall" and Round's "Brace" collide with existing names (the Shieldbearer's Shield Wall power; an attack called Brace) — the Codex audit refuses duplicates. | Published as **Lock Shields** (`power.kite-shield.shield-wall`) and **Bear Down** (`power.round-shield.brace`); ids unchanged. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |

## V2 prone and standing — defaults taken landing v2.prone (2026-09-23)

The rules are COMBAT-V2-DESIGN-2026-09-07.md §10 (ruled); the numbers live on the Codex row
`status.prone`. What §10 does not answer, R3 answers with these defaults (Andrew chose R3,
2026-09-23; the defaults were set by the chat that landed it):

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `proneNoCrawl` | May a prone unit move (crawl) without standing? | **No.** While prone the only legal movement action is the stand action (`action.ts` actionReady); primary actions — attacks at −10/−1, powers — stay legal. | §10 prices a knockdown as "a turn's movement"; a crawl would make it cheaper than the design says. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `proneNoExpiry` | Does Prone wear off on its own? | **No.** `decayPerPhase` 0; only standing (the stand action, or a `stand` effect) removes it. Death leaves it on the body, where it reads nothing. | §10 names standing as the way up and gives no clock. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `proneStacking` | What does a second application do to a prone unit? | Nothing: the row stacks `highest` (value stays 1) and `unit.proned` fires only on the transition. | §9.2: "KDB has no effect on a unit that is already prone." | provisional — 2026-09-23 |
| `proneAirwalkFact` | Airwalk is "suspended" while prone — but the engine has no Airwalk (pack.ts: "engine never fires it"). | **Not implemented.** `airwalkSuspended(ctx, u)` (status.ts) is true while prone; whoever implements Airwalk must read it so a prone unit triggers the traps and ground effects of its hex. | Nothing to suspend yet; the fact is real and readable so the Airwalk item cannot miss it. | content gap — for the Airwalk item |
| `proneAiStandsFirst` | What does a prone AI unit do? | Spends its movement action standing, then chooses its primary as usual (`runActivation`). | The roadmap's AI probe; standing is free of AoO and costs only the slot a prone unit cannot otherwise use. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `proneStationOrder` | Where do the ±accuracy and ±damage rows sit? | Accuracy at ACC.PRONE 550 (after CONDITION, before COVER and TARGET_DODGE); the −10 Dodge is a derived stat mod read by `effective(dodge)` (source = the status id); damage at DMG.PRONE 500, flat after the crit multiplier and before cover, on attacks only (powers and bursts are not attacks). | Mirrors cover, the other flat V2 attack modifier; +1 is not multiplied by a crit. | provisional — 2026-09-23 |
| `proneTestSource` | What knocks a unit down before KDB (R4)? | Only test content: `test-trip-a` applies `status.prone`, `test-trip-b` applies `test.status.floored`, both through the generic `status.apply` trigger (scenarios `test.prone-a`, `test.prone-b`). Since v2.kdb (2026-09-23) KDB's "down" knocks units down in every battle; the trippers stay as test rows. | KDB is R4. | superseded by v2.kdb — 2026-09-23 |

## V2 knockback collisions — defaults taken landing v2.knockback-collisions (2026-09-23)

The rules are COMBAT-V2-DESIGN-2026-09-07.md §9.3 and the consuming-props paragraph after it
(ruled 2026-09-07). V2 R4 part 1 (geometry and collisions; the KDB roll is the next item).
What the documents do not answer, these defaults answer:

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `knockbackLineFromRange` | Which way does a push go when its origin is not adjacent (a ranged shot, a reach attack)? | The straight line from the pusher's hex through the target's, continued: the target's neighbour nearest the ideal point `target + (target − pusher)/distance`, compared exactly in integer cube space (`hex.ts stepAwayFrom`). After the first hex the push continues in that one direction. An adjacent origin gives exactly the V1 hex. | §9.3 rules knockback "from any source"; a straight continuation is the only reading that reduces to V1 at range 1. | provisional — 2026-09-23 |
| `knockbackVertexTiebreak` | The line runs exactly through a vertex (two neighbours equally near). Which one? | The first in the fixed direction order **E, NE, NW, W, SW, SE** (counter-clockwise from east; the geometry's DIRS order). | Board-independent (works when a candidate is off the board) and deterministic (Law 6). Tested both ways (`v2-knockback-collisions.test.ts`). | provisional — 2026-09-23 |
| `knockbackBurstOrigin` | A burst's push — from the burst centre or the caster? | Not reachable yet: no burst carries a knockback. Every push today reads the PUSHER's hex (earth-blast is a single-target ranged attack in the engine). When a burst gets one, pass its centre as the origin. | Nothing to decide against. | open — for the first burst with a push |
| `knockbackProtectionAbsorbs` | Does Protection absorb collision damage? Armor? | **Protection yes, Armor and resists no.** The collision is `true` damage through `flatDamage`, which spends Protection first (the pool is spent through `spendAbsorb`). | §7 rules Protection "absorbs everything"; true damage ignores mitigation. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `knockbackNeverFeedsKdb` | Can collision damage trigger a KDB roll? | **No, by construction**: it is true damage and KDB reads physical damage only (§9.1). No code; the probe landed with v2.kdb (`v2-kdb.test.ts`, "collision damage is true"). | §9.1 margin = physical damage dealt + Impact. | note — probed 2026-09-23 |
| `knockbackThornsZero` | A unit's collision value is 1 + its Thorns. What is its Thorns? | **0 for every unit.** The engine has no Thorns magnitude — Thorns today is a V1 per-activation trigger (`trigger.*.thorns`, e.g. the test golem's), not a stat or status. `unitCollisionValue` (movement.ts) is the one reader; R5 re-rules Thorns as a magnitude and fills it in. `collisionValue` is not yet a foldable unit stat. | §9.4 re-rules Thorns in R5. | **answered 2026-09-24 by v2.thorns** — the collision value is 1 + the `thorns` stat |
| `knockbackFloorIsObstruction` | A push into a hex with no floor (the `floor` mask false) — what does it strike? | A basic obstruction (**2**), like the map edge; `collidedWith: 'floor'`. A pit that swallows is a PROP with `consumes`, not a missing floor. | The documents name the pit as a prop; a missing floor is the board's edge by another name. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `knockbackDeadMoverNoDamage` | The push's own hit already took the mover to 0 Health (settle has not run yet). Does the collision still hurt? | **No collision damage** to a mover that is not standing or has 0 Health; the push is still resolved and logged as before. So a well only consumes a unit ITS collision killed. | "takes the unit if the collision kills it". | provisional — 2026-09-23 |
| `knockbackPropFields` | Where do a prop's collision value and `consumes` live? | On the prop row, authored in content (`map-schema.mjs` validateProps; engine `decodeProps`): `collisionValue` integer 0..100 on a HIGH prop (absent = 2), `consumes: true` on a HIGH prop or absent. Only high props stop a push. | §9.3: "authored on props"; "one boolean on the prop row". | provisional — 2026-09-23 |
| `knockbackTestProps` | No well or pit exists in content. | TEST props only: `prop.test.well` (3, consumes) and `prop.test.boulder` (4) on `test.map.well-shove` (content test/maps.json), live in scenario `test.knockback-well`. The real well is content for later. | Existing `prop` kind; no new id kind. | until the real well |

## V2 KDB — defaults taken landing v2.kdb (2026-09-23)

The rules are COMBAT-V2-DESIGN-2026-09-07.md §9.1, §9.2, §9.5 and §15.4 (ruled 2026-09-07):
physical damage only; margin = (physical damage dealt + Impact) − Strength; chance =
margin × 15%, no cap; dealt is post-armor, post-Protection; Impact counts at 0 damage;
40% back · 40% down · 20% both; no effect on a prone unit; Stand Firm, Agile, Giant.
Engine `src/core/kdb.ts`; one event, `kdb.rolled`. V2 R4 part 2 (Andrew's chat). What the
documents do not answer, these defaults answer:

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `kdbBackDistance` | How far does a KDB "back" push? | **1 hex** (`KDB_BACK_HEXES`). §9 rules collisions "× remaining knockback points" but no distance for KDB's own push. | The V1 knockback and every authored push are 1; nothing in §9 says more. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `kdbDirection` | Which way does a KDB push go? | **Away from the attacker** through `executeKnockback` — part 1's straight line and vertex tiebreak (`knockbackLineFromRange`, `knockbackVertexTiebreak`), non-adjacent origins (a ranged hit) included. A burst's KDB also pushes from the CASTER (not the burst centre, where a target on the centre hex would have no line). | One line rule for every push. | provisional — 2026-09-23 |
| `kdbOrder` | Where does KDB sit in an attack, relative to the crit chart's own `push` row? (Impact map §8 item 14: "needs a ruling".) | **Once per connecting attack, after all its damage and its crit-chart rows** (`performAttack`, after the last hit). The chart's `push` resolves first and KDB sees the result — a unit the chart made prone is then immune. A multi-hit attack makes ONE check after its hits (and their settles). A miss, a block, or a hit on the downed makes none. | The chart is part of the hit; KDB reads what the attack did. | provisional — Angela to rule |
| `kdbMultiPacket` | "Physical damage dealt" for an attack of several packets or hits? | **The sum of the physical packets' applied HP** (`physicalApplied` on damage.applied), across every hit of the attack. Magic/elemental/true packets on the same hit add nothing. An attack is eligible only if a hit it landed carried a physical packet (a 0-damage physical packet counts — Impact at 0). | §9.1 "physical damage dealt"; applied is what landed. | provisional — 2026-09-23 |
| `kdbBursts` | Can burst damage cause KDB? (§16 item 2 is the open lever.) | **Yes, per recipient**, when its plan carried a physical packet: margin from that recipient's applied physical HP plus the burst row's `impact` (absent = 0). Keyed (recipient uid, caster uid, caster's burst ordinal, kind 1). `previewBurst` reports each target's `kdbChance`. No campaign burst authors Impact. | §9.1 says physical damage, not attacks; bursts are the one open question and 0 Impact is the neutral reading. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `kdbKeys` | What addresses the two rolls? | `kdb-occurs` and `kdb-type` share the key: attacks (target uid, target's incoming-attack ordinal after the attack, 0); bursts as above with kind 1. Never a turn or phase. A chance of 0 draws nothing. | §15.4 "(persistent unit id, per-unit ordinal, kind of roll)". | provisional — 2026-09-23 |
| `kdbBothOrder` | "Both": which first? | **Back, then down**: the unit lands, then falls. A push whose collision takes it to 0 Health is not then knocked down. | A pushed unit falls where it stops. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `kdbImmuneNoRoll` | Does an immune target still roll? | **Prone** (§9.2) and **Stand Firm** (both flags): no roll, no draw; `kdb.rolled` still says why (`immune: 'prone' \| 'standFirm'`, chance 0). **Agile** (down only) and **Immovable** (back only) still roll: the forbidden half is dropped (`suppressedBy`), so Agile's "both" is back only and its "down" does nothing. | §9.2 "no effect"; §9.5 "cannot be knocked back or down at all". | provisional — 2026-09-23 |
| `standFirmAnyPush` | Does "cannot be knocked back" stop pushes that are not KDB (the halberd's Hack, the crit chart's Knocked Sprawling)? | **Yes**: `executeKnockback` refuses a unit carrying `cannotBeKnockedBack`, logging `knockback.blocked` with reason 'cannot be knocked back' and the badges (`by`); no collision. | §9.5 "at all"; §9.3 applies to "all knockback from any source". | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `kdbBadgeFlags` | Where do Stand Firm, Agile, Giant live? | Badge `flags` on Codex rows (existing kind): `cannotBeKnockedBack` and `cannotBeKnockedDown`, compiled from the payload phrases "cannot be knocked back or down" (both), "cannot be knocked down", "immune to knockback" (back). New rows `badge.stand-firm`, `badge.giant` (its "other things" a named gap). | Impact map §2.2: "Stand Firm / Agile / Giant as BadgeDef.flags". | provisional — 2026-09-23 |
| `kdbAgileIsTheBadge` | §9.5 names Agile as new, but `badge.agile` (Dodge and Roll, +8 Dodge) already exists. One Agile or two? | **One**: the existing row gains "cannot be knocked down". `badge.immovable` ("immune to knockback", Shieldbearer) reads as back-only. | Two badges with one name is what the Codex audit refuses. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `kdbBadgeCarriers` | Which units carry Stand Firm or Giant? | **None yet** outside TEST units (`test-kdb-firm`, `test-kdb-giant`, `test-kdb-agile`): §9.5 says "everything immovable" without a list. | Inventing carriers is the invented-rows trap. | **as it stands, accepted** — Andrew 2026-09-24 (DECISIONS.md); the content is still to author |
| `kdbDownStatusFlag` | Which status is "down"? | The one prone status content marks `kdbDown: true` (`status.prone`); core reads the flag. None marked: `kdb.rolled` carries a named `gap` and nothing is applied. | Core never names a status id. | provisional — 2026-09-23 |
| `kdbStrengthFloor` | §9.1: "anything at 0 Strength moves to 2 in the migration." | **Not done here**: it is a content migration of unit rows, not KDB's rule. | Separate content item. | **as it stands, accepted** — Andrew 2026-09-24 (DECISIONS.md); the content is still to author |

## V2 Thorns — defaults taken landing v2.thorns (2026-09-24)

The rule is COMBAT-V2-DESIGN-2026-09-07.md §9.4 (ruled 2026-09-07): Thorns is a magnitude,
not a tick; Thorns N deals N true damage to any melee attacker that hits — armor-zero
included — never on a miss, a block, a ranged attack or a burst; adds N to the collision
value; does nothing when its holder attacks. True damage: DECISIONS.md 2026-08-27. Engine
`src/core/thorns.ts`; the `thorns` stat; one event, `thorns.reflected`. V2 R5 (Andrew's
chat, 2026-09-24). What the documents do not answer, these defaults answer:

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `thornsIsAStat` | Where does the magnitude live? | **The `thorns` stat** — folded at fielding from items, badges and specialties (like `vision`), open to stored and derived modifiers; 0 on a bare body; read never below 0. | §9.4 "a magnitude"; §9.3 already calls collision value "a stat … foldable". One stat, not a status or a trigger. | provisional — 2026-09-24 |
| `thornsProtectionAbsorbs` | Does the attacker's Protection absorb Thorns damage? | **Yes; Armor and the resists do not** (true damage). | The collision precedent, `knockbackProtectionAbsorbs`. | provisional — 2026-09-24 |
| `thornsOnKillingBlow` | Does a unit the hit kills still reflect? | **Yes.** | §9.4 names the hit, not the survivor: "any melee attacker that hits it". | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `thornsDownedTarget` | Does a hit on a DOWNED thorned unit reflect? | **No.** That hit runs no damage rung (it advances the bleed-out counter only, fix.downed-targetable). | A downed body is out of the fight; the downed-hit path is not the damage path. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `thornsAttackerDown` | An attacker already not standing? | **Takes nothing.** | Nothing to hurt; the same guard as the collision's mover. | provisional — 2026-09-24 |
| `thornsPerHit` | A multi-hit attack? An attack of opportunity? | **Each connecting melee hit reflects**, reactions included (they are melee attacks). A multi-hit attack stops when the attacker falls, as it already did. | "Any melee attacker that hits it" — per hit. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `thornsNoHooks` | Does the reflected damage fire hooks (onTakingDamage, onKill …) or KDB? | **No.** It is not a hit; true damage never feeds KDB. | Two thorned units cannot ping-pong (the "reciprocal effects settle safely" evidence), and §9.4 "nothing when it attacks". | provisional — 2026-09-24 |
| `thornsCause` | What does the log name as the cause? | **The melee attack whose hit set it off** — `thorns.reflected` and its `damage.applied` (`thorns: true`) both carry that attack id. The magnitude's sources are the fielding lines (`unit.equipped`, `unit.badged`). | The unit keeps no per-item provenance after folding; the attack is the true cause (Law 12). | provisional — 2026-09-24 |
| `thornsPreview` | What does preview say? | **`thornsOnHit`** — the target's Thorns for a melee attack, 0 for ranged and on a downed target. The attacker's Protection is not subtracted. | Law 2: the AI and UI read the number from preview. | provisional — 2026-09-24 |
| `thornsContentScope` | Which content carries the magnitude now? | **Every row the compiler can read exactly**: items whose trigger is "Thorns N" (Tomb Sentinel's Blade 3, Stormweave 2, Armor of Thorns 3, Wreath 3), the five `enchant.thorned` rows (2), `badge.thorned-hide` (1). Scorpion Carapace and Scorpion Shield (Thorns plus a Poison/Bleed rider) stay gaps; `badge.cursed-vengeance` (conditional), passive Thorns on bestiary and specialty rows, Bramble Guard, Crown of Thorns and Molten Scales are not in the engine pack yet — R12. | Compile exact sentences only; a rider nobody parsed is a gap, not a guess. | provisional — 2026-09-24 |

## V2 loadout — defaults taken landing v2.loadout (2026-09-24)

The rule is COMBAT-V2-DESIGN-2026-09-07.md §11.1 (ruled 2026-09-07): only what is in the
hands grants; a weapon in an item slot is swap fodder; §6.1 "Two longswords is 10"; §15.2
"`unit.equipped` now means *in hand*". Engine `src/core/items.ts` `loadoutOf`; the unit's
`loadout`; `BattleOptions.heroStowed`. V2 R6 part 1 (Andrew's chat, 2026-09-24).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `loadoutInstanceId` | What names one carried item? | **`<unit uid>/<n>`**, n counting the items handed (in order) then the stowed. Unique in the battle because uid is. | Law 12: everything has an id. The kingdom has no instance ids yet (hero.equipped is a list of row ids); R8's result seam may supply its own and this default then yields. | provisional — 2026-09-24 |
| `loadoutStowedClasses` | What may be stowed? | **Weapon and shield class only**; anything else in `heroStowed` is refused loudly. | §11.1: "every other item class works normally from its own slot" — a stowed trinket has no meaning. | provisional — 2026-09-24 |
| `loadoutStowedLog` | Where does the log name a stowed item? | **On `unit.enter`, as `stowed`** (instances), only when there is one. `unit.equipped` stays in-hand only. | §15.2; no new event name for a thing that does nothing until a swap. | provisional — 2026-09-24 |
| `loadoutScheduleStowed` | Does the progression schedule's stowed weapon (`rosterOptionsOf().stowed`) ride into the battle? | **Not yet** — it is still reported, not fielded. | It would move the progression fixtures twice (here and at the swap); it rides in with v2.swap, when it can do something. | provisional — 2026-09-24 |

## V2 swap — defaults taken landing v2.swap (2026-09-24)

The rule is COMBAT-V2-DESIGN-2026-09-07.md §11.2 (ruled 2026-09-07): one swap per
activation, only before the primary action, costs `swapCost` stamina (a foldable stat,
default 1), a Surge reopens it, enemies do not swap. Engine `src/core/swap.ts` (`canSwap`,
`performSwap`), the `swap` battle command, the event `loadout.swapped`. TEST content:
`test.badge.fast-hands` (swapCost −1), `test.badge.slow-hands` (+1), scenario `test.swap`.
V2 R6 part 2 (Andrew's chat, 2026-09-24).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `swapAi` | Does an AI-controlled hero ever swap? | **No.** A swap is a command a human-controlled hero issues; no AI mode chooses one. | When the AI should swap is an AI-mode decision, and `system.ai-modes` is Angela's. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `swapShape` | What does a swap name? | **The instances to hold afterwards**, in hand order; everything else carried is stowed. Emptying a hand is legal; "nothing changes" is refused. | One verb covers swap one, swap both and drop to Punch; §11.1 "Punch is always available". | provisional — 2026-09-24 |
| `swapHealthClamp` | A Health (or Stamina) maximum that leaves the hands? A higher one that arrives? | **A lower maximum clamps current Health/Stamina; a higher one does not heal.** | Swapping must not be a heal. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `swapLimits` | Does a power that leaves and returns keep its cooldown and uses? | **Yes.** Uses are seeded once, the first time the power is in hand; cooldowns are never reset or seeded by a swap. | Otherwise swapping cycles cooldowns and charges. | **ruled** — Andrew 2026-09-24, "reviewed and fine" (DECISIONS.md) |
| `swapAiMode` | Does the unit's role / AI mode follow the swap? | **No** — it stays what the fielded kit set. | Moot while the AI never swaps (`swapAi`); a human-controlled hero has no AI mode in play. | provisional — 2026-09-24 |
| `swapMovePoints` | Does a Movement modifier that arrives mid-activation change this activation's movement points? | **No** — movement points are read once at activation start (as Slow is, `slowReadAtActivationStart`). The next activation reads the new Movement. | One read point for movement. | provisional — 2026-09-24 |
| `swapCostFloor` | swapCost folded below 0? | **Read as 0** — a swap never pays the unit. | Same floor as Thorns. | provisional — 2026-09-24 |
| `swapCause` | What cause does loadout.swapped name? | **`engine`**, as `surge.hit` does; the unit is the actor and the instances are named in the event. | No content row causes a swap. | provisional — 2026-09-24 |

## V2 item uses — defaults taken landing v2.item-uses (2026-09-24)

The sources: V2-ROADMAP.md R6 ("Duplicate item instances remain distinct … save/result/replay
preserve instances and uses"); V2-IMPACT-MAP-2026-09-07 §12.2 (`applyItems` skips items marked
spent; the battle output hands back items spent); DUNGEON-MODE-2026-09-07.md §4 ("The layer
marks each one-time-use (or limited-use) item as spent; the re-field skips it") and its
2026-09-10 ruling ("Persist … spent item instances in dungeon-run state"); GEAR-DESIGN.md §4
(the uses column — `uses 1` on the Waystation rows). Engine `src/core/items.ts`
`itemUsesOf` / `canPayFrom` / `instanceUsesLeft`, the unit's `itemUses`,
`BattleOptions.heroItemsUsed`, `BattleResult.itemUses`. TEST scenario `test.item-uses`.
V2 R6 part 3 (Andrew's chat, 2026-09-24).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `itemUsesSource` | Where does an instance's use count come from? | **The granted power's `uses`** (the Codex field already compiled onto the power row); no second copy on the engine's item row. | Law 11 — one field. The kingdom's `itemOf().uses` is generated from the same Codex rows. | provisional — 2026-09-24 |
| `itemUsesPool` | A unit carries two instances granting the same power? | **Each instance brings its own uses**; the power's `usesLeft` is the row's own uses (a power the bare row or a badge grants) plus what every instance in reach can pay. Two Healing Potions are two drinks. | R6 acceptance: duplicates stay distinct. Before this the power's count was seeded once, so the second potion was dead weight. | provisional — 2026-09-24 |
| `itemUsesPayOrder` | Which instance pays a use? | **The first instance in reach with a use left, in instance order** (`<uid>/<n>`, lowest n first); the row's own uses pay only after every instance is empty. | Law 6: explicit order with a tiebreak that cannot tie; spending the item first leaves the most for a restore that rebuilds the row. | provisional — 2026-09-24 |
| `itemUsesReach` | Can a stowed weapon or shield pay a use? | **No** — a held-class instance pays only while in hand; a trinket always. The instance keeps its count while stowed and brings it back when swapped in. | §11.1: only the hands grant. `swapLimits` (ruled): uses are never reset by a swap. | provisional — 2026-09-24 |
| `itemUsesEvent` | What event names the instance? | **`charge.spent` gains `instanceId`, `itemId`, `instanceLeft`** when an instance paid; `instanceLeft: 0` means that instance is spent. No new event name; `power.exhausted` still fires when the power has nothing left. | A new event name is a new name (rule 21); the existing line already means "a use was spent". GLOSSARY's `item.spent` is the kingdom's strategic event. | provisional — 2026-09-24 |
| `itemUsesIncoming` | How does a fielding hand in uses already spent? | **`heroItemsUsed`**: per hero, one count per carried instance, handed then stowed (the order that numbers instanceIds). A count on a permanent item, past the power's uses, or a list of the wrong length is refused loudly. | Law 9. The kingdom and R11's dungeon both know the order; it is `loadoutInstanceId`'s. | provisional — 2026-09-24 |
| `itemUsesSpentFielding` | What happens to an instance handed in with no uses left? | **It is carried spent**: not folded (no stats, attacks, powers or triggers), not in hand or stowed, no `unit.equipped`; named on `unit.enter` as `spent` (instance ids) and kept in `itemUses` with `left: 0`. | DUNGEON-MODE §4 "the re-field skips it" — copied, not chosen. What stays chosen is where the log names it (as `stowed` is named, `loadoutStowedLog`). | provisional — 2026-09-24 |
| `itemUsesMultiPower` | An item granting two powers with uses — how does an incoming count apply? | **The one count applies to each of its powers**; the instance is spent when all are empty. | No such row exists; the simplest reading until one does. | provisional — 2026-09-24 |
| `itemUsesResult` | What does the result report? | **`itemUses`: one row per (instance, power) — unit, instanceId, itemId, power, `used` this battle, `left` after** — for every carried instance with uses, the spent-on-arrival included. Absent when no unit carries one; `usesSpent` (per power) is unchanged. | R11 needs the whole per-instance state out; an absent field keeps every older result byte-identical. | provisional — 2026-09-24 |

## V2 prop destruction — defaults taken landing v2.prop-destroy (2026-09-24)

The sources: COMBAT-V2-DESIGN-2026-09-07 §12 (materials and steps, applying destroy, results,
timing, scope — ruled 2026-09-07) and §15.1 (`prop.damaged`, `prop.destroyed`). Engine
`src/core/mutate.ts` `damageProp`, `src/core/props.ts` `propsTouching`, `destroy` on attack
and burst profiles, `Prop.steps`. TEST scenario `test.prop-destroy`. V2 R7 part 1
(Andrew's chat, 2026-09-24). Direct hex targeting, burning variants, hazards and
concealment are later R7 parts.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `propDestroyStruckHex` | Which props does a single-target attack strike? | **Every prop in or touching the target's hex as the attack is declared** — a hex footprint holding it, or a polygon (an edge) touching its cell, boundary included. A KDB push after the blow does not move it. | §12.2: "applies one step to whatever is in the hex it strikes"; the burst rule's "every hex and every edge touching" read the same way for one hex, so one helper serves both. | provisional — 2026-09-24 |
| `propDestroyPerAttack` | A multi-hit attack with Destroy N — N per hit, or once? | **Once per attack**, if any hit connected. | §12.4 puts the change "at the end of the attack's resolution"; KDB (kdbMultiPacket) is also one check per attack. | provisional — 2026-09-24 |
| `propDestroyConnect` | What counts as a miss for "Misses do not destroy"? | **A miss or a Block on every hit.** A hit that deals 0 damage still connects and destroys. | Block is a miss line (§6.2, `attack.missed`); Destroy is not damage. | provisional — 2026-09-24 |
| `propDestroyOverflow` | Destroy 3 on a tier-1 prop — do the extra steps carry? | **No — steps past the tier are lost**, including into a high prop's low remnant. | §12.2 "Destroy is a step count": each application is steps to *this* prop; a fireball opening a castle wall in one cast would contradict "you need to hit it three times". | provisional — 2026-09-24 |
| `propDestroyRemnant` | What is left when high cover falls? | **The same id and footprint as a LOW prop, same tier, intact** (steps 0); `collisionValue` and `consumes` go (they belong to high props); a polygon keeps its padding and gains no `crossingCost`. A destroyed low prop leaves nothing and leaves `state.props`. | §12.3 "Destroyed high cover leaves low cover"; per-prop authored leavings (rubble, fire) are not authored yet — when they are, they override this. | provisional — 2026-09-24 |
| `propDestroyBurstShield` | Does a burst destroy props where its damage was shielded, or with no unit present? | **Yes — every prop touching the shape**, shielded or not, occupied or not. | §12.2 "applies destroy to every hex and every edge touching the shape — including the outer boundary edges. That is what lets a fireball open a room." | provisional — 2026-09-24 |
| `propDestroyAfterOutcome` | An attack that ends the battle — does it still destroy? | **No** — nothing is applied once the outcome is set (matches KDB on a multi-hit). | Nothing reads the board after the end; no event after `battle.end`. | provisional — 2026-09-24 |
| `propDestroyRulesVersion` | Does the snapshot rules version move? | **No** — `steps` is optional, so every existing save stays valid; R3–R6 did not move it either. | Law 10: `block.test.ts` pins `.21`. | provisional — 2026-09-24 |

## V2 attacking a prop — defaults taken landing v2.prop-attack (2026-09-24)

The source: COMBAT-V2-DESIGN-2026-09-07 §12.2 ("Props can be targeted directly. A hex is a
legal target for a destroy-carrying effect, with no unit in it"), ruled 2026-09-07. Engine
`src/core/prop-attack.ts` (`canAttackHex`, `propAttackHexes`, `attackProp`) and the `hex`
action request in `src/core/commands.ts`. Bursts already take any hex as their centre, so
this is the attack half. V2 R7 part 2 (Andrew's chat, 2026-09-24).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `propAttackWho` | Which attacks may be aimed at a hex? | **Only an attack row with Destroy 1 or more.** | §12.2: "a legal target for a destroy-carrying effect". | provisional — 2026-09-24 |
| `propAttackWhere` | Which hexes? | **A hex holding a prop or touched by one (an edge), with no living unit (standing or downed) in it**, in reach, in sight, a ranged attack not adjacent — the same distance and vision rules as an attack on a unit. | "with no unit in it"; where a unit stands, the unit is the target and the prop is struck by that attack (v2.prop-destroy). | provisional — 2026-09-24 |
| `propAttackLine` | Does the prop being struck block the line to itself? | **No — the struck props are reached, not crossed;** every other high prop blocks the line as it blocks any attack line (§4). Same cell and polygon tests as burst shielding. | Otherwise a high prop could never be hit by a single attack, and §12.2's "you need to hit it three times" would be unreachable. | provisional — 2026-09-24 |
| `propAttackConnects` | Does a blow at a prop roll to hit? | **No — it always connects:** no accuracy, Block, crit, damage, KDB, Thorns or hooks, and no dice drawn. | A prop has no Dodge, no Block and no Health; "Misses do not destroy" is about blows aimed at units. | provisional — 2026-09-24 |
| `propAttackPays` | What does it cost? | **Exactly what the attack costs** — the same `spendAction` (slot, stamina, cooldown, uses). | One action type (refactor.one-action-type). | provisional — 2026-09-24 |
| `propAttackEvent` | What does the log say? | **`prop.struck`** `{ actor, hex, attackId, kind, destroy, props, distance }`, then `prop.damaged` / `prop.destroyed` per prop. Not `attack.declared`: that event names a target unit and its accuracy ledger, and every reader assumes both. | §15.1 has no event for a blow at a prop; `noun.verb-past` as the section asks. | provisional — 2026-09-24 |
| `propAttackForced` | A taunted unit? | **Cannot aim at a prop** while a taunt names a standing enemy (`forced-target`). | A taunt forces the target of attacks (capability.taunt). | provisional — 2026-09-24 |
| `propAttackAi` | Does the AI ever attack a prop? | **No, not yet** — a command only, like the swap (swapAi). The AI's use of destruction is R12 (AI decisions). | §0 defers the AI's depth on cover and LOS ("different problem, different day"). | provisional — 2026-09-24 |

## V2 ground table — defaults taken landing v2.ground-table (2026-09-24)

The source: COMBAT-V2-DESIGN-2026-09-07 §3.2 (tiles — ruled 2026-09-07; woodland and lava
added 2026-09-07). Engine `src/content/terrain.ts` (the rows, `accuracyAgainstOf`,
`hazardOf`), `src/core/ground.ts` (`enterGround`, `applyGroundHazard`), accuracy rung
TERRAIN 400 in `src/core/pipeline.ts`. TEST scenario `test.ground-table`. V2 R7 part 3
(Andrew's chat, 2026-09-24). The numbers are copied, not switches. Rocky (§16 item 2a) is
unruled and not built; water is unchanged.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `groundGlyphs` | Which map glyphs author the V2 grounds? | **`u` undergrowth, `o` woodland, `l` lava, `m` marsh, `d` desert, `n` ruins** (v2.ground-retable; `g` and `y` retired with grass and wheat). | No document assigns them; none collides with MAP-01's legend (`. h f r R w x b p`). The Atlas adapter compiles to numbers and never reads these. | provisional — 2026-09-24 |
| `concealmentRung` | Where on the accuracy ladder does "−10 ranged accuracy against you" land? | **TERRAIN (400), revived**: read off the TARGET's ground, by the attack's kind; one ledger row naming the terrain. | COMBAT-SEQUENCE's row 400 is "the target's occupied-hex modifier" — exactly this; v1 retired it into BASE_MOD because v1 terrain modified its *occupant's* stats. | provisional — 2026-09-24 |
| `concealmentShooterGround` | Does the shooter's own ground change its aim? | **No.** Only the target's ground; grass under the archer does nothing to the shot. | §3.2: "Standing in it … against you". | provisional — 2026-09-24 |
| `concealmentScope` | Which attacks does it reach? | **Every attack that rolls to hit** — an attack of opportunity included (it is a melee attack). Bursts do not roll, so it never touches them. | One accuracy function (Law 2). | provisional — 2026-09-24 |
| `pushEntersGround` | A push that carries a unit into a hex — which ground beats run? | **The V2 hazard only, on the hex the push leaves it in**, before any collision cost. Water does not wash a pushed unit and burning ground does not sear it (unchanged). | §3.2 rules it for lava only: "Being knocked into lava is *entering* it, not a collision". Widening it to the v1 grounds would move battles on ford/field/floodplain on no ruling. | **RETIRED 2026-09-28 by ruling** — Andrew: "A push does apply ground statuses." (DECISIONS.md "the duplication review, ruled"). fix.ground-one-funnel: a push runs every ground beat (strips, applies, the layer, the hazard) on the hex it leaves the mover in (`pushGroundLandingHex`). |
| `hazardDamageFirst` | Lava's two parts — which first? | **Re-read 2026-09-28 (fix.ground-one-funnel): the 1 Burn, then the 3 fire.** Lava's Burn is the one ground shape now (`appliesOnEnter` / `appliesOnActivationEnd`, review E4), so it runs in the funnel's order — strips, applies, the painted layer, then the hazard's damage — at a step, a sidestep, a push and End of Activation alike. (This row once said "the 2 Burn"; the ruled number is 1.) | Andrew's own order, 2026-09-24: "Stepping into lava should inflict one burn. … And inflict 3 fire damage." One funnel for every ground. | provisional — 2026-09-28 |
| `hazardThroughProtection` | Does Protection absorb lava's damage? | **Yes**, then Fire Resist — the same path a Burn tick takes (`statusDamage`). | §8.2 "the 3 is direct fire vs Fire Resist"; Protection absorbs everything (§18 "Not retired"). | provisional — 2026-09-24 |
| `hazardZeroLine` | Fire Resist 3 in lava — is there a line? | **Yes: `damage.applied` amount 0, `resisted` 3, `hazard: true`, caused by `terrain.lava`.** | Law 12: every log line names its cause, and "walks through untouched" is worth seeing. | provisional — 2026-09-24 |
| `hazardDownedOccupant` | Does lava hurt a downed unit lying in it? | **No** — only a standing unit meets the hazard. | End of Activation already skips the downed; the entry beats need a mover. | provisional — 2026-09-24 |
| `hazardKillsMidWalk` | Lava that takes a walker to 0? | **Settle at once; a unit no longer standing stops there.** | The attack-of-opportunity precedent (`settle(ctx, 'movement.aoo')` mid-move). | provisional — 2026-09-24 |
| `groundBurnsAway` | Undergrowth (was grass, wheat, bush) is "material tier 1 (burns away)" in §3.2 — built? | **Not yet.** The tier is not on the rows. | Burning props are unruled (what ignites, how long, what it does) — the same open question the prop-destruction wrap left. | open — 2026-09-24 |
| `groundAi` | Does the AI seek concealment or avoid lava? | **No.** It sees concealment only as a worse hit chance in `preview()`; it paths through lava as it paths through burning ground. | `system.ai-modes` is Angela's, not a chat's. | provisional — 2026-09-24 |

**Re-ruled the same day (v2.ground-retable).** Andrew replaced §3.2's rows — `engine/DECISIONS.md`
"2026-09-24 — the ground table, re-ruled", verbatim: grass, wheat and bush are one ground,
`terrain.undergrowth` (1 move, −10 ranged against); lava costs 2 and gives 1 Burn on each beat;
marsh, desert and ruins added; forest retired, hills ranged-only (v2.retire-forest-hills);
woodland is also a thin obstruction (v2.thin-obstruction). The rows below still stand where the
ruling is silent.

§18's retirement of "terrain as the cover system" — ruled by Andrew 2026-09-24 and landed in
v2.retire-forest-hills: forest is gone (woodland took its number 2 and glyph `f`); hills are +10
accuracy and +1 reach, ranged only (an ELEVATION row at rung 400); rocky KEEPS its v1 modifiers
("Rocky ground should do what it used to do"), and ruins share them. A finding, not a switch: a **sidestep** has never
run the painted layer's entry beat (a step does); kept exactly as it was. **Resolved 2026-09-28 by
fix.ground-one-funnel** (review E1): a sidestep goes through `enterGround` like every other entry.

## Thin obstructions — defaults taken building v2.thin-obstruction (2026-09-24)

The source: `engine/DECISIONS.md` "2026-09-24 — the ground table, re-ruled" (Andrew, verbatim
there). Engine `src/content/terrain.ts` (`thin` on the woodland row, `THIN_OBSTRUCTION`,
`isThinGround`), `src/core/obstruction.ts` (`thinObstructionsOnLine`), accuracy rung OBSTRUCTION
450 in `src/core/pipeline.ts`, `withinSight` in `src/core/vision.ts`. The −5 and the −1 are copied,
not switches; which hexes count for a shot is ruled ("does not count against your own shot, only
against those who are shooting you or people who are shooting through the hex").

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `thinRung` | Where on the accuracy ladder does the −5 land? | **A new rung, OBSTRUCTION (450)**, between TERRAIN and CONDITION: one row per thin hex entered, each naming its terrain. | It is neither the target's ground (400: a thin hex *between* counts too) nor low cover (575: a prop by the target). Accuracy is additive, so the rung decides only where the row sits in the ledger. | provisional — 2026-09-24 |
| `thinPassesThrough` | When does a shot "pass through" a hex? | **The attack-line geometry's own exact test** (`los.ts` `segmentCrossesCell`) — closed contact counts, so a line grazing a hex's edge or corner enters it. | One geometry: the same rule a high prop blocks by. A second, looser "passes through" would disagree with LoS on the same line. | provisional — 2026-09-24 |
| `thinScope` | Which attacks pay it? | **Ranged attacks only**, at the one accuracy function. Melee (reach 2 included), attacks of opportunity and bursts never. | The ruling: "If you shoot through a tile … you get -5 range"; bursts do not roll to hit. | provisional — 2026-09-24 |
| `thinVisionEnds` | "Each thin obstruction **between** a unit and a hex cuts its vision by 1" — do the two end hexes count? | **No.** Only hexes strictly between; the viewer's own and the far hex never count, so a unit standing in woodland is not itself hidden by its own tree. Same "passes through" test as the shot. | "Between" read literally. The shot rule counts the target's hex because Andrew said so for shots; nothing says so for sight. | provisional — 2026-09-24 |
| `thinVisionFloor` | Can thin obstructions cut Vision below 1? | **No** — floored at 1, as Vision always is (COMBAT-DESIGN §4: "floored at 1 — always"). An adjacent hex has nothing between, so it is always within sight. | The existing floor, applied to the one number. | provisional — 2026-09-24 |
| `thinVisionReach` | Where does the cut apply? | **Everywhere Vision is read** — `canSee`, `canSeeHex`, and the hero phase's lighting (`withinSight`). Vision matters only in darkness today. | One reader for "within sight", so targeting and lighting cannot disagree. | provisional — 2026-09-24 |
| `thinAi` | Does the AI avoid shooting through woodland? | **No new behaviour.** It sees the −5 only as a worse hit chance in `preview()`. | `system.ai-modes` is Angela's, not a chat's. | provisional — 2026-09-24 |
| `thinProp` | How is a thin obstruction that is not woodland (a sign, a tree, an upright body) authored? | **A prop of height `thin`** — the "high thin prop". | RULED — Andrew, 2026-09-24: "Yes, it's a third kind of prop." · "I think there is a new high thin prop" (DECISIONS.md "thin obstructions are a third kind of prop"). | ruled — 2026-09-24 |
| `thinPerHex` | A hex that is woodland AND holds a sign (or two signs) — −5 once or twice? | **Once.** A hex is thin or it is not; the row names the ground first, else the lowest prop id. | The spec counts "each thin-obstruction HEX it enters"; Andrew: "-5 per woodland hex". | provisional — 2026-09-24 |
| `thinPropFootprint` | May a thin prop be a drawn shape (polygon) like a fence? | **No — whole hexes only**; a polygon thin prop is refused at decode. | The rule counts hexes entered; a shape would need a second "passes through" nobody has ruled. | provisional — 2026-09-24 |
| `thinPropDestroy` | Can a thin prop be struck, and what is left? | **Like any prop**: struck with a Destroy attack when no unit stands in its hex, its material sets the hits, and it leaves **nothing** (only a high prop leaves low cover). | Andrew: "material still decides how many hits to destroy"; a sign has no rubble to leave. | provisional — 2026-09-24 |

## Structures — defaults taken building v2.structures (2026-09-25)

The source: `engine/DECISIONS.md` "2026-09-24 — the ground table, re-ruled", Andrew's three answers
on walls, towers and houses (verbatim there). Engine `src/content/terrain.ts` (`STRUCTURE`, the
`W`/`T`/`H` rows of `EXTRA`), `src/core/structure.ts` (every reader), accuracy rung STRUCTURE 425,
Block in `resolveBlock`, Armor as a `STRUCTURE_ARMOR` row at MITIGATION 600, reach in `reachOf`,
lines in `los.ts` `attackLineClear`. The numbers are copied, not switches: wall −20 / +10 Block and
Ranged Block / +5 accuracy / +1 reach, stairs +1 move; tower −25 flat / +15 Block / +1 Armor / +10
accuracy / +2 reach / 3 move to enter / heroes only; house −10 / +5 Dodge. Andrew asked to go over
ground versus props before these were built; he then said to build what is ruled (2026-09-25), so the
first row below is the one that talk may overturn.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `structureAsGround` | Is a wall, tower or house a ground or a prop? | **A ground** — `terrain.wall`, `terrain.tower`, `terrain.house` — one per hex, with the entry sides on the map. | A prop's height is `high`, `low` or `thin` (ruled); a fourth height nobody ruled would be the bigger invention. Ground already carries per-hex move cost and occupant stats. Andrew's ground-versus-props talk is still owed. | provisional — 2026-09-25 |
| `structureGlyphs` | Which map glyphs? | **`W` wall, `T` tower, `H` house.** | No document assigns them (as `groundGlyphs`). | provisional — 2026-09-25 |
| `structureEntries` | How are the stairs and the door authored? | **`entries` on the map: `[structure hex, the adjacent hex it is entered from]`**, at most one per hex, only on a wall or a house; refused loudly otherwise. | "There is one facing on the wall tile" — one side, named by the hex across it, needs no direction encoding. | provisional — 2026-09-25 |
| `wallTopMove` | Moving along a wall top? | **The ground's normal cost, 1 a hex** — and wall to tower, tower to wall, counts as along the top (no entry side; the tower's own 3 is still paid). | The default queued with the item. | provisional — 2026-09-25 |
| `wallDescent` | Coming DOWN from a wall — only by the stairs? | **Only the way you came up** — back across its stairs side, at the destination's normal cost. A push off any other face is a collision with the wall. | RULED — Andrew, 2026-09-25: "You must leave the walls the same way you came up." (DECISIONS.md) | ruled — 2026-09-25 |
| `towerRangedBlock` | Does the tower's +15 Block also add to Ranged Block? | **Yes, both**, as the wall. | The default queued with the item. | provisional — 2026-09-25 |
| `doorFacing` | The door's facing and cost? | **One side, like stairs; no extra cost.** | The default queued with the item. | provisional — 2026-09-25 |
| `houseExit` | Out of a house — any side, or only the door? | **Only through the door.** A house is a full obstruction otherwise. | "entered through a door"; walls do not open outward either. | provisional — 2026-09-25 |
| `towerSide` | "Towers are for heroes only" — heroes by allegiance or by rules? | **By rules** (`rulesSideOf`): under `mirrorSideRules: row` a zombie fielded on the hero side still cannot enter. | Being a hero is a rule, as Deathbed Fighting is. | provisional — 2026-09-25 |
| `structurePlacement` | Do deployment, authored hexes and arrivals obey the entry and hero-only rules? | **No — placement reads the board only.** An authored hex is trusted; a map should not put a tower on an enemy deploy edge. | Placement is authoring, not movement; keeps every existing placement path unchanged. | provisional — 2026-09-25 |
| `structureFlight` | Where can a flier land? | **On a wall top or in a house as anyone may stand there; in a tower only a hero.** Flight crosses no side, so no entry is needed. | Flight has zero Steps (as for ground entry beats). | provisional — 2026-09-25 |
| `structureLines` | What does a structure do to attack lines? | **A wall, tower or house hex blocks every attack line passing THROUGH it** (the thin obstructions' exact geometry, `segmentCrossesCell`), whoever stands at either end; never the line's own two ends, so the occupant is attacked and attacks. No one shoots over. | RULED — Andrew, 2026-09-25: "Walls and towers cannot shoot past other obstructions." (DECISIONS.md). Then (same day): "You should be able to shoot on the same wall." — the rest of the wall an end stands on does not block (below). | ruled — 2026-09-25 |
| `sameWallBothEnds` | "Shoot on the same wall" — whose wall is clear: the shooter's only, or either end's? | **Either end's.** A shot INTO a unit on a wall is as clear of that wall as its shot out; every other wall, tower or house between still blocks. "Same wall" = wall hexes connected to the end's hex through other wall hexes. | RULED — Andrew, 2026-09-25: "Any range unit on the ground can shoot a unit on a wall. They just can't shoot past the wall to a unit that is obstructed by it." (DECISIONS.md) | ruled — 2026-09-25 |
| `sameWallOnly` | Does the same rule clear a tower's or a house's own other hexes? | **No — walls only** (`clearAlongOwnRun` is true on the wall row alone). A tower in a wall run breaks it. | The ruling names the wall; "Walls and towers cannot shoot past other obstructions" stands for everything else. | provisional — 2026-09-25 |
| `structureVision` | Do structures cut Vision? | **No.** Only thin obstructions do today. | Nothing ruled says so. | provisional — 2026-09-25 |
| `structureGuardScope` | Which attacks does the guard (the enemy's −N, the Block, Dodge and Armor) answer? | **Every attack an enemy makes at the occupant** — melee, ranged, attacks of opportunity — and the Armor also a power's damage (the one damage function). **Bursts: none** (they do not roll to hit or Block, and read no guard). | "Wall and tower do not apply to range attacks only." | provisional — 2026-09-25 |
| `structureArmorPenetration` | Can armour penetration take the tower's +1 Armor? | **Yes** — it is Armor. One `STRUCTURE_ARMOR` row names the tower. | One Armor number, one rule. | provisional — 2026-09-25 |
| `structureReach` | Is the structure's reach the Reach stat? | **No** — it is added at `reachOf` to every attack; the Reach stat stays ranged-only (hills, ruled). | "do not apply to range attacks only" against hills' "Reach only applies to range attacks". | provisional — 2026-09-25 |
| `structureCollision` | A push a structure refuses (a wall's face, a house wall, a tower for a non-hero)? | **A collision with the structure**: `collidedWith: 'structure'`, the structure named, value **2**. | COMBAT-V2 §9.3's table: "A basic obstruction — a big rock, a wall, the map edge — 2". | provisional — 2026-09-25 |
| `structureKillSwitch` | What does `CF_DISABLE_IDS=terrain.wall` silence? | **Every structure reader** (entry, lines, reach, guard, occupant accuracy). The tower's 3-move entry stays — it is the ground's cost, as woodland's 2. | The seam's shape for ground (`off()` in terrain.ts). | provisional — 2026-09-25 |
| `structureAi` | Does the AI seek walls and towers? | **No new behaviour.** It meets them through `reachable` and `preview()` only. | `system.ai-modes` is Angela's, not a chat's. | provisional — 2026-09-25 |

## Atlas ground compile — defaults taken compiling the outdoor maps (2026-09-25)

The source: `engine/DECISIONS.md` "2026-09-25 — the Atlas ground compile is the outdoor maps" (Andrew:
"Yes, make the outdoor maps playable in combat") and the 2026-09-24 ground table it applies. Root
`tools/battle-atlas/combat-compiler.mjs` (grounds, structures), `tools/battle-atlas/combat-profiles.json`
(`policy.grounds`, `policy.groundOrder`, one `ground` / `structure` / `decoration` profile per asset —
names live there, never in code), probes `tools/battle-atlas/combat-ground.test.mjs` and the last test of
`combat-integration.test.mts`. Ruled, so not switches: trees → woodland, tall grass / bushes / barberry /
wheat → tall vegetation (`terrain.undergrowth`), rivers → water, dense trees → a full obstruction, houses →
`terrain.house`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `atlasGroundOrder` | One hex carries two grounds (a bridge over a river; several trees and grass) — which? | **The first of `impassable, open, water, woodland, undergrowth`**; a house over all of them. | A bridge deck is walked on; a tree hex with grass under it is woodland; the stronger obstruction wins. | provisional — 2026-09-25 |
| `atlasBridgeOpen` | A bridge on a river hex? | **Open ground** (1 move, no modifier). | "Rivers are just water"; the bridge is the way across it. | provisional — 2026-09-25 |
| `atlasDenseWoodland` | `woodland-impassable` ("seven rooted trees … close the spaces")? | **A full-obstruction hex** (glyph `x`). | "If you get enough trees together, really dense trees, it becomes a full obstruction." | provisional — 2026-09-25 |
| `atlasGardenAndOrchard` | The vegetable garden and the orchard ladder, both authored `concealment`? | **Garden → tall vegetation; orchard ladder and baskets → decoration, no ground.** | The garden hides like any tall planting; a ladder and baskets hide nobody. | provisional — 2026-09-25 |
| `atlasHouseCells` | Which hexes is a house? | **The map's authored building cells** (`town.buildings[].cells`, Willowmarket), **else every hex within its authored `footprintRadius`** (opening maps: 7 hexes). | The model's own interior sits half a hex off its lot on odd rows; the authored lot is what the map drew. | provisional — 2026-09-25 |
| `atlasHouseDoor` | Where is a house's one door? | **The recorded door opening, else the middle of the model's front (+z) face**, turned by its rotation: the house hex nearest it, entered from the outside hex nearest it. A front that faces off the board (a town-edge house) opens on the nearest side that exists, and the compile says so. | Only the cottage records its door (+z); every house here is built on the cottage. | provisional — 2026-09-25 |
| `atlasProfileCrossingLowOnly` | A profile's +1 crossing cost on an asset authored as a full obstruction (opening-4's priory low wall)? | **Applies to low placements only**; the obstruction stays a full obstruction. A cost on the placement itself stays strict. | The author's role for that placement wins over the asset's default. | provisional — 2026-09-25 |
| `atlasLandformsNotHills` | The outdoor maps' raised landforms (bluffs, ridges, rises)? | **Presentation only — not hills.** | "Heights remain presentation data" (`ATLAS-COMBAT-INTEGRATION.md`); nobody has ruled which rises are hills. | **ruled** — 2026-09-25, Andrew: “One no for now.” |
| `atlasFieldedMaps` | Which outdoor maps get a combat fielding? | **The 13 whose battle finishes.** Not fielded: `greenway`, `stonecrown` (every seed 0–9 hits the 25-turn cap), `opening-4` (the sides never meet — no hit on any seed); `harvest`, `wellwood` (legacy objects; the compiler refuses them). | A fielding must finish a real battle (the integration test). Why the AI stalls there is an AI question. | **ruled** — 2026-09-25, Andrew: “2, no.” (no investigation) |


## Damage vs target — defaults taken building station.vs-target (2026-09-25)

`DMG.VS_TARGET`: damage modifiers that read the TARGET — what it IS (a tag on its row) or what it
CARRIES (a status). A `vsTarget` list of rules `{tag | status, add}` on a badge or an item
(`src/core/types.ts` VsTargetRule), read in `resolveDamage` (`src/core/pipeline.ts` vsTargetRules).
The Codex's slayer maps (`{demon: 3}`) compile to `{tag, add}` rules (`content/mkenginepack.mjs`),
held and worn items alike (fix.vs-target-worn-and-flat, 2026-09-25: no `percent`; worn items are
read from `loadout.worn`). Probes: `test/vs-target.test.ts`; instances `test.badge.bane-undead`,
`test.badge.bane-venom` (+3 vs poisoned, flat), `item.rune-kairin`, `item.rune-vampire-hunter`
(scenario `test.vs-target-c`).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `vsTargetStation` | Which number? The backlog says 275, MECHANICS-GAP 400, COMBAT-SEQUENCE 500. | **400 — after SOURCE_STATUS 250, before CRIT 450.** | The 2026-08-20 ruling put it at 400 "so a crit multiplies it"; its same-day amendment moved it to 500 but kept the reason "(the bonus is crit-amplified)" — only a slot before CRIT gives that. 500 is `DMG.PRONE` since v2.prone (`proneStationOrder`). ENGINE-REVIEW-2026-09-02 #6 asked for one number. | **ruled** — Andrew 2026-09-25 (DECISIONS.md): "You're applying it earlier when all the other damage types are being applied." |
| `vsTargetReach` | Which damage does a rule reach? | **A badge's rules: every damage the unit deals through `resolveDamage` — attacks and powers. A held item's rules: only the actions that item grants, while it is in hand; the same item held twice counts once. A worn item's rules (a bloodrune): every damage, like a badge's.** Bursts (`finishDamage` direct) and secondary packets are not reached. | The enchant is on the weapon ("Demon Slayer greatsword"); a badge is on the hero. Bursts freeze their source before any target is known. | provisional — 2026-09-25 (held items, badges, bursts). **Worn items ruled** — Andrew 2026-09-25 (DECISIONS.md): "Should a bloodrune's slayer bonus apply to every attack and power the hero makes, the way a badge's does?" — "2, yes." |
| `vsTargetWornItems` | A slayer on a WORN item — the eight bloodrunes (Kairin, Deathdealer, Monster Slayer …)? | **A named gap on the item row, no rule compiled.** | The engine keeps no list of worn items on a unit (only `loadout.hands`); a rule nothing reads would be dead data. Needs its own item (a worn-item list on the unit — a snapshot change). | **superseded** — Andrew 2026-09-25 (DECISIONS.md): "Bloodrune Slayer bonus happens." Built by fix.vs-target-worn-and-flat. |
| `vsTargetStacking` | A target matching several rules (a vampire tagged `undead` and `vampire` vs Holy Water's `{undead 1, demon 1, vampire 1}`)? | **Every matching rule applies, one ledger row each** — badges in the order the unit carries them, then held items in hand order, rules in row order. | The simplest reading that names every source (Law 12); Perfect Hunter's "every slayer bonus you have from any source" reads as sources adding. | **ruled** — Andrew 2026-09-25 (DECISIONS.md): "If a weapon's bonus matches the target twice … apply both." |
| `vsTargetPercent` | How does a percent rule round, and against what? | **`trunc(running value × percent ÷ 100)`, added before the rule's flat `add`.** | Law 7's one rounding rule; the running value at 400 is the attack's size before crit. | **superseded** — Andrew 2026-09-25 (DECISIONS.md): "There had been no percentage modifiers to damage." `percent` is removed by fix.vs-target-worn-and-flat. |
| `vsTargetStatusCarried` | When does a target "carry" a status? | **Value > 0.** | The same test every status reader uses (`blocksBlock`). | provisional — 2026-09-25 |
| `vsTargetWornTwice` | The same worn item carried twice (two Kai'rin runes) — does its slayer count once or twice? | **Twice: one ledger row per worn instance, in handed order.** Order across sources: badges, then held items, then worn items. | A worn instance's stats already fold once per instance (`applyItems`, v2.loadout "the same row twice is two instances"); a held item counts once only because one attack is made with one weapon. Two worn runes are two sources. Whether the kingdom lets a hero wear two of one rune is its legality, not the engine's. | provisional — 2026-09-25 (fix.vs-target-worn-and-flat) |
| `wornLoadoutShape` | Where does the unit keep its worn items? | **`loadout.worn`: ItemInstance[] (instanceId, itemId) of the non-held items handed in, spent ones left out, absent when empty.** | Law 11 — the loadout already names what a hero carries, as instances (Law 12); absent-when-empty keeps every weapons-only hero's snapshot unchanged. Never swapped (`performSwap` reads hands and stowed only). | provisional — 2026-09-25 (fix.vs-target-worn-and-flat) |


## End of Phase ladder — defaults taken building fix.phase-ladder-config (2026-09-25)

COMBAT-SEQUENCE §End of Hero Phase: the ladder is "an ordered list of named rungs supplied by
config". `cfg.switches.endOfPhaseLadder` names the built rungs (`END_OF_PHASE_RUNGS`,
`src/core/types.ts`: `bleedOut` 4b, `staminaRegen` 5, `victoryCheck` 6); `endOfPhase()`
(`src/core/battle.ts`) runs them in that order. Probes: `test/phase-ladder.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `endOfPhaseLadder` | In what order do the End of Phase rungs run, and may a sweep drop or repeat one? | **`['bleedOut', 'staminaRegen', 'victoryCheck']`. A ladder must name every built rung exactly once; anything else is refused at the first End of Phase and on restore (Law 9).** Bleed-out stays hero-ladder only wherever it sits. | The document's order and the order `battle.ts` always ran — control battles byte-identical. Reordering is the sweep axis the document asks for; dropping a rung would be a different rule, not an order. | provisional — 2026-09-25 |
| `phaseRungLog` | Does each rung log a line naming itself? | **Off. On, every rung that runs emits `phase.rung` `{side, rung}` before it acts.** | The item asks that "the log names each rung"; always-on would add a line to every battle and move the control battles and every frozen cursor fixture for a log-only change. A sweep that reorders turns it on. | provisional — 2026-09-25 |

## Sweep coverage report — defaults taken building sim.coverage (2026-09-25)

`src/sim/coverage.ts` reads a finished log and splits what the fielded roster could reach into
exercised and never-used; `src/sim/sweep.ts` (`runSweep`) merges it across a sweep and
`npm run sweep -- <n> --coverage` prints it. A measurement, not a rule — nothing in `src/core`,
`src/content` or `src/ai` imports `src/sim`. Probes: `test/coverage-sweep.test.ts`. (`../GBH/SWITCHES.md`,
where a tooling switch belongs, is not on this machine's mount; recorded here instead.)

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `sweepCoverageReport` | Does every sweep print the coverage report, or only on request? | **On request: `--coverage` (or npm's `npm_config_coverage`). `runSweep` returns `coverage: null` without it.** | The battles are byte-identical either way (asserted); opt-in keeps the sweep's existing output unchanged for every reader that parses it. | provisional — 2026-09-25 |
| `coverageReachableScope` | What counts as REACHABLE, and what as EXERCISED? | **Reachable: registered actions and triggers held by units on the field at battle end (arrivals included; a granted id with no registry row — the kill-switch seam — is not reachable), plus terrain in the map census. Exercised: any log line names it as `causeId`, `source`, `statusId`, `actionId`, `attackId`, `abilityId`, `moveId`, or moved-onto terrain; a trigger that rolled and did not fire counts. Across a sweep: union of reachable, union of exercised.** | The roster actually fielded, not the whole registry — "the Codex has 300 powers and you used 2" says nothing about the run. One battle blind is normal; the report names what NO battle touched. | provisional — 2026-09-25 |
| `coverageMageBoltName` | The item's expect names `power.mage.bolt`, which left the registry on 2026-09-02 (test.fixture-migration). What stands in? | **The standard mage's staff content (`attack.lightning-staff.*`, `power.lightning-staff.storm`): the test asserts every one is reachable and classified, and the standard 20-battle sweep names `power.lightning-staff.storm` as never used.** | "power.mage.bolt-class" reads as the mage's bolt kit; the lightning staff is what the standard mage carries today. | provisional — 2026-09-25 |

## Per-unit mods at fielding — defaults taken building seam.unit-mods (2026-09-25)

GEAR-IMPLEMENTATION.md §1: the kingdom resolves set bonuses (GEAR-DESIGN.md §5) when it builds
the hero and hands the engine numbers. `BattleOptions.heroMods` (parallel to heroes / heroItems;
`UnitMods` in `src/core/types.ts`) is checked in `setup.ts` (`checkUnitMods`) and applied by
the mutator `applyUnitMods` (`src/core/mutate.ts`); the weapon row is written in
`resolveSourceDamage` (`src/core/pipeline.ts`). Probes: `test/unit-mods.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `unitModsSource` | What is a mod's `source` — must it be an id of a declared kind? | **An opaque, non-empty label the caller names (the kingdom's set); the engine checks only that it is present, mints no ids and knows no set.** Tests use the item's own `set.ring` / `set.plate` / `set.slaying`. | GEAR-DESIGN.md §5 (resolved 2026-09-03): a set is a TAG plus a `setBonus`, "not a new kind" — there is no `set.*` kind in GLOSSARY.md or `tools/approved-kinds.json`, and none is needed: nothing in `src/content` carries a set id. What label the kingdom sends (the tag, the paying item) is the kingdom's to choose. | provisional — 2026-09-25 |
| `unitModsPoolStats` | A mod on Max Health, Max Stamina or Stamina Regen — the three stats the rules read off the unit's field, not through `effective()`? | **Folded onto the unit's own field at fielding; current Health and Stamina rise with their maxima (the hero enters full). Every other stat is a stored StatMod (scope `unit`, source = the set), so the stat ledger names it.** A pool driven below its floor (Max Health < 1, Max Stamina or Regen < 0) is refused. | A StatMod on those three would be inert — silently (Law 9). `grantBadge` already moves Max Health and Max Stamina by their own mutators for the same reason; `unit.modified` carries the new `maxHp`/`hp`/`maxStamina`/`stamina`/`staminaRegen` so the log replays (Law 3). | provisional — 2026-09-25 |
| `unitModsWeaponStation` | Where does a weapon's set +damage enter the damage pipeline, and what does it reach? | **A `WEAPON_BONUS` row at DMG.DECLARE (100), right after the declared number — before the stat, VS_TARGET and CRIT, so a crit multiplies it. Attacks only (not powers, not bursts); only attacks the item grants; only while the item is in hand (a stowed weapon's bonus waits for the swap). One row per bonus, named by its source; an item held twice counts once.** | "+1 Damage on this weapon" is the weapon's own damage, which DECLARE owns. The hand-and-grants test is the held item's reach at VS_TARGET (`vsTargetReach`). No new station number — the damage table is unchanged. | provisional — 2026-09-25 |
| `unitModsWeaponField` | Where does the unit keep a weapon's +damage? | **`Unit.weaponBonuses: {itemId, damage, source}[]`, absent when none (snapshots unchanged), validated on restore.** | Law 11 checked: `StatMod` scope `item` exists but carries no item id, and there is no damage stat; items fold no attack modifiers in the engine. A list keyed by item is the smallest plain-data shape (Law 5b). | provisional — 2026-09-25 |
| `unitModsEventGrain` | One `unit.modified` per what? | **Per (unit, source), sources in the order first handed (stats, then attacks), after the unit's enter, equipped, grown and badged lines. Zero values dropped; a source with nothing left emits nothing.** | The item's "each emits unit.modified naming the set"; one line per source mirrors `unit.equipped` per item and `unit.badged` per badge. Handed order is the kingdom's placement order — explicit (Law 6). | provisional — 2026-09-25 |
| `forgeEnchantPayload` | pack.derived-rows: where does a buyable WEAPON enchant's number land — on the hero's stat (the codex rows and `kingdom/tools/mk-items.mjs`, as landed 2026-09-02) or on the weapon's attacks? | **On the weapon's attacks: copied attack rows `<attack id>.<enchant>` (Hit → `accuracy`, Crit → `crit`, Reach → `reach`, Damage → `bonus`); the enchanted row grants the copies. An armor enchant stays the item's `statModifiers`. A granted burst is not copied and is a named gap on the row (Greatsword's Great Cleave, Halberd's Cleave).** | The owners disagree and the newer dated ruling wins: GEAR-DESIGN.md §3, 2026-09-05 (Angela): *"All of the modifiers from weapons and range weapons are only on the attack … Keen does not give +6 hit. It gives +6 hit on the weapon attacks."* Route (a) of ITEMS-PLAN.md §6. The codex's weapon-enchant rows still carry `statModifiers` and the kingdom's cards still show a hero stat — that turning is owed by content (settled-items.json) and the kingdom. | provisional — 2026-09-25 |
| `forgeRowsWhichExist` | pack.derived-rows: which Forge rows exist — the 2026-09-05 ruling's "Far and Long on ranged weapons, not bows only", or the codex's `appliesToTags`? | **The codex's `appliesToTags`, read by the kingdom's `applies` copied verbatim (Far and Long on bows today): the engine holds exactly the kingdom's 30 masterwork and 173 enchanted ids.** | One rule over one codex keeps one owner per row. The ruling's widening is a DATA change to `enchant.far` / `enchant.long` in settled-items.json that both generators follow when it lands; choosing which tags count as "ranged" here would fork the ids from the kingdom's. | provisional — 2026-09-25 |
| `longswordMasterwork` | pack.derived-rows' expect and variant name `item.longsword.masterwork`, but the Longsword is one-handed. | **No such row. Masterwork is "two-handers and armor only" (GEAR-DESIGN.md §3) and neither package makes it; the +1 Max Stamina claim is proved on `item.greatsword.masterwork` and `item.studded-leather.masterwork`.** | The design doc owns the rule; a backlog row's example is not an owner. | **superseded 2026-09-25 by Andrew's ruling: masterwork also applies to one-handers and shields (DECISIONS.md) — `item.longsword.masterwork` is owed, `fix.masterwork-scope`** — landed by it: both generators widened, 53 masterwork rows in each package |
| `actionListSlot` | ai.action-list: does the list carry a `slot` on its entries — one entry per open slot for an `either` action — or leave the slot to the engine? | **No `slot` on any entry: the engine's own slot resolution (`resolveActionSlot`, the `actionSlots` switch) applies, exactly as for every request the AI has ever sent.** | The modes never name a slot, and "every action a mode takes is on the list" is the item's expect. A list doubled per slot would be a second question for the scorer (AI-DESIGN §7 step 3) to own, and `validateAction` already accepts an explicit slot when a caller wants one. | provisional — 2026-09-26 |
| `actionListScope` | ai.action-list: are `swap` and `end-cycle` on the list? | **No. The list is `ActionRequest`s — what `validateAction`/`executeAction` take. `swap` and `end-cycle` are session commands (`BattleCommand`), and no mode uses either.** | The item names the adapter the entries must pass. Items are on the list the way the engine has them: an item's power is a granted action on the unit (capability.item-powers, v2.item-uses). | provisional — 2026-09-26 |
| `closeBiteStartingAdjacent` | pack.enemy-actions: the hounds' Close Bite is "a *move action* when starting adjacent" (8-ENCOUNTERS-NOTES.md:690, ENEMY-REVIEW.md:276). Adjacent when the Activation starts, or when the move action is taken? | **When the move action is taken: Close Bite (and Clobber) compile to a melee attack with `slot: movement`, and nothing more.** The movement slot is spent before any walk and must come before the primary, so the attack is only legal from the hex the unit started the action on — the rule is the slot, not a new condition field. A unit that walked has spent its move action and cannot Close Bite; one that starts adjacent may Close Bite and then Bite on its primary ("multi-bite when adjacent", ENEMY-REVIEW.md:275). Moved in between by something that is not its move action (knockback, a Surge's second pair) — it bites from where it stands. | Pure data on the one action type (DECISIONS.md 2026-09-04); no bespoke "starting adjacent" hook. | provisional — 2026-09-26 |
| `flierOrdinaryMove` | pack.enemy-actions: an enemy's ONE movement power may be flight (DECISIONS.md 2026-08-21), but the melee modes closed only by walking. Does a flight-only unit fly where a walker walks? | **Yes: `ordinaryMove` in src/ai/modes.ts is the unit's walk, and — only for a unit granted no walk at all — its flight.** A unit granted any walk behaves exactly as before, including its fallbacks when it cannot pay. | Without it the Bone Dragon (dumb-melee, flight only) stood on its deploy hex. Choosing *where* to fly is still each mode's rule; the scorer (ai.scorer) replaces this. | provisional — 2026-09-26 |

## The AI scorer — defaults taken building ai.scorer (2026-09-26)

AI-DESIGN.md §3B-D. The ten modes are rows (`src/content/ai-modes.ts`, on `ctx.aiModes`); the
scorer and its considerations are `src/ai/scorer.ts`; the procedures a row's `rules` names stay
in `src/ai/modes.ts`. Probes: `test/ai-scorer.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `aiDecisionLogHome` | Where does the decision log (the top three plans, AI-DESIGN §5) live — in the event log, or beside it? | **Beside it: `ctx.aiLog`, one line per action the AI takes (`AiDecision` in `src/core/types.ts`), each with `at` — the index in `ctx.events` where that action's own events begin.** Not saved in a battle snapshot. | The item's expect requires byte-identical control battles, and the control hash is the event log (`tools/baseline.mts`): a decision line in `ctx.events` moves every hash. The viewer reads `ctx.aiLog` when a viewer item carries it across. | provisional — 2026-09-26 |
| `aiModeRowShape` | What is a mode row — one weighted sum, or something else? | **`rules` (the fixed procedure) + `target` (whom to attack) + `anchor` (what movement is measured against) + `weights` (tiers per choice: move, position, value, heal, burst). A TIER is consideration → integer weight, summed; tiers compare in order; a full tie keeps the order the plans were listed in (Law 6).** | The ten modes were ladders (the kite: safe, then a shot, then height, then spacing) and one weighted sum cannot reproduce a ladder number for number. One tier *is* a plain weighted sum, so both are data. A procedure asking for a choice its row lacks stops loudly (Law 9). | provisional — 2026-09-26 |
| `aiRowsHome` | Where do the mode rows live until the Codex carries them? | **`src/content/ai-modes.ts`, keyed bare (`dumb-melee`, what a unit's `ai` holds), id `ai.<name>`, through the kill-switch seam; registry order is the Confusion order.** | AI-DESIGN §7: "the per-unit modes are authored as rows, in the Codex, not in the engine" — that lane is later. Until then content holds them, and core never names one. | provisional — 2026-09-26 |
| `aiAttackChoiceTiers` | How does the `aiAttackChoice` switch reach the scorer? | **As the attack tier: `bestDamage` = `[{damage: 1}]`; `declared` = no tier, so the declared order decides.** The switch stays a switch, not a row field. | It was a switch before this item, answered by a sweep, not by a mode. | provisional — 2026-09-26 |
| `aiHintShape` | What can an action row's hint say? | **`aiHint: { use?: 'whenever', belowHalfHp?: true, minEnemiesStruck?: n }`** — the three examples of AI-DESIGN §3D. A hint only narrows or forces; it adds no number. No content row carries one yet. | Copied from the design's three examples, nothing adjacent invented. The Colossus's "use whenever available" (ENEMY-REVIEW.md:352) is content's to author on its row. | provisional — 2026-09-26 |
| `aiHintWhenever` | When is a `use: 'whenever'` action taken? | **At the first choice it can be: a movement-slot action as the Activation opens, before any walk; any other at the primary, before the swing.** The first such action in the unit's declared order, at itself if it may be, else at the row's preferred target. | The Colossus's Buff is a movement-slot action, so the primary alone would never reach it. The engine's slot rules still apply: after the Buff a unit may walk on its primary. | provisional — 2026-09-26 |
| `aiLogRulePicks` | What does a choice made by a fixed rule (feast, a stance, the leap, the kite's power, the quarry's swing) log? | **The one plan the rule took, with no score.** Scored choices (whom to attack, where to move, the kite's hex, the value hunter, heals, bursts) log up to three with their numbers. | A rule does not rank alternatives; logging invented runners-up would be a second opinion the unit never had. | provisional — 2026-09-26 |

Noticed building it, not changed (byte-identity): the kite's power-versus-staff check
(`rangedKite`, "A power beats a staff shot") prices the staff as `bonus + stat` by hand,
not through `preview()` — a Law 1 departure that predates the scorer.

## AI mode changes — defaults taken building ai.mode-change (2026-09-26)

AI-DESIGN.md §3E; DECISIONS.md 2026-09-26 "the AI: a framework now; modes can change": "a unit's
mode can change mid-battle — a brute that runs when badly hurt, a boss that fights differently below
half health. The condition and the new mode are data on the unit's row." The row field is `aiChanges`
(`AiModeChange` in `src/core/types.ts`); the check is `runActivation` in `src/ai/modes.ts`; the
mutator is `changeAiMode` (`src/core/mutate.ts`). Probes: `test/ai-mode-change.test.ts`, on two TEST
rows (content/test/units.json: `test-rout-zombie`, `test-late-zombie`) and scenarios
`test.mode-change-a` / `-b`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `aiModeChangeShape` | What does a row say to change its mode? | **`aiChanges: [{ id, when, mode }]` on the unit row, in listed order. `mode` is a mode row's key (bare, as a unit's `ai`); `id` is the change's own id, the `causeId` of its `ai.mode` line and what the kill-switch seam disables (like a trigger's). A TEST row's ids are the test family (`test.*`); a Codex row's id kind is not chosen here.** | The ruling puts the condition and the new mode on the row. An id per change is what makes the log name the cause (Law 12) and the seam reach it. No new id kind was minted: the test rows use `test.*`; which kind a Codex change carries (`trigger.*`, `ai.*`, another) is a naming decision left for Angela when content authors the first one. | provisional — 2026-09-26 |
| `aiModeChangeConditions` | Which conditions can a change name? | **`hpBelow` — Health below that integer percent of max Health (hp × 100 < maxHp × hpBelow; 50 is "below half", exactly half does not count) — and `fromTurn` — the Turn is that one or later. Every condition named must hold; a change must name at least one. Checked at load.** | "Badly hurt" and "below half health" are the ruling's two examples, both Health. `fromTurn` is the second, different condition the item's expect asks for, and the smallest one the state already holds. Others (an ally falls, a phase is revealed) are added when content needs them — each a new key, no new mechanism. | provisional — 2026-09-26 |
| `aiModeChangeWhen` | When is a change checked? | **As the unit's own Activation opens, before it chooses anything (after the stand-still checks: a downed, blocked or already-acted unit is not checked until it acts).** Whatever moved the state — a hit, a poison tick, a heal, the Turn — counts as it stands then. | A mode only matters when the unit chooses. One check point keeps the log's order simple: the change line comes right before that Activation's own `ai.mode` line. | provisional — 2026-09-26 |
| `aiModeChangeOnce` | Does a change undo itself when its condition stops holding (a routed brute healed back to full)? | **No. A change happens once and leaves the unit's list; the new mode stays for the Battle.** A row that wants to change back authors a second change. | "A brute that runs when badly hurt" does not stop running because a priest healed it — and a mode that flickered each Activation would not be legible (AI-DESIGN §5). | provisional — 2026-09-26 |
| `aiModeChangeOrder` | Two changes hold at once (one heavy hit takes a unit past two thresholds). | **Every change that holds happens, in listed order, each with its own `ai.mode` line; the last is the mode the unit plays.** | Listed order is explicit (Law 6), and the unit ends where its row says it should be for the state it is in, rather than one Activation behind. | provisional — 2026-09-26 |
| `aiModeChangeUnder` | How does a change sit with the modes that stand in on top — the civilians' flight override, Confusion? | **A change rewrites the unit's own mode (`ai`). An override still stands in until its Turn ends, and Confusion still swaps on top of whatever the unit's mode now is.** | Both were ruled as temporary stand-ins over the unit's mode; the change is to the unit's mode itself. | provisional — 2026-09-26 |

## Encounter AI rules — defaults taken building ai.encounter-rules (2026-09-26)

AI-DESIGN.md §4; DECISIONS.md 2026-09-26 "the AI: modes per unit type, scoring inside them, encounter
rules on top": "By default, they will not work together … we can have some overarching rules that could
apply based on an encounter." The row field is `aiRules` on the encounter (`EncounterAiRule` in
`src/core/types.ts`); binding is `bindAiRules` (`src/core/encounter.ts`, mutator `bindAiRule`); the
anchor and the focus are read in `src/ai/modes.ts`; the side step is `src/ai/side-brain.ts` (mutator
`setAiFocus`). Probes: `test/ai-encounter-rules.test.ts`, on two TEST encounter rows
(content/test/encounters.json: `test.encounter.anchor-hold`, `test.encounter.coordinated-pack`) and
scenarios `test.encounter-rules-a` / `-b`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `encounterAiRulesShape` | What does an encounter row say to lay an AI rule on its units? | **`aiRules: [{ id, rule, units?, … }]` on the encounter row, in listed order. `rule` is `anchor` (`at: {col,row}`, `radius`) or `coordinate` (`focus`: tiers). `id` is the rule's cause id and what the kill-switch seam disables. A TEST row's ids are the test family (`test.*`); a Codex row's id kind is not chosen here.** | The ruling puts the rules on the encounter, not the unit. An id per rule makes every line it causes name it (Law 12). No kind was minted, as with `aiModeChangeShape`: which kind a Codex rule carries is a naming decision for Angela. | provisional — 2026-09-26 |
| `encounterRuleBinding` | Which units does a rule govern, and when? | **The units the encounter itself fields (setup and schedule), bound as each arrives: a rule naming `units` binds those unit types; a rule naming none binds every enemy-side unit it fields. A unit raised or summoned mid-battle by another power is not bound.** | "Authored on the encounter row" — the encounter's own units are what it can speak for. Binding at arrival makes the rule state on the unit (`aiRules`), logged (`ai.anchored` / `ai.coordinated`), so a save carries it. | provisional — 2026-09-26 |
| `encounterAnchorReach` | What does an anchor forbid? | **A move may not END farther than `radius` from the anchor hex; a unit already outside may only end no farther than it stands. Attacks, powers and bursts are not limited; a push can still carry the unit out.** | "Anchor units into a single location" is about where the unit stands. Filtering the action list the AI reads means every mode obeys it with no mode knowing. | provisional — 2026-09-26 |
| `encounterAnchorReturn` | A unit outside its anchor (arrived there, knocked out). | **As its Activation opens, it walks back first — its ordinary move (else a sidestep) to the allowed hex nearest the anchor — a rule, logged `rule.return-to-anchor`, then its mode plays the primary.** | An anchor that only stopped the unit drifting further would leave a knocked-back guard standing wherever it landed. | provisional — 2026-09-26 |
| `encounterSideStepWhen` | When does the side step run, and for whom? | **As each Phase begins, after `phase.begin` and before its first Activation, for the side whose Phase it is: every coordinate rule with a standing bound unit of that side picks afresh, in the row's order, logged `ai.focused`. A rule whose bound units have all fallen picks nothing.** | AI-DESIGN §4: "once per Phase before any Activation that side picks a focus target". Picking afresh each Phase keeps it legible: the log says each Phase whom the pack is after. | provisional — 2026-09-26 |
| `encounterFocusTiers` | How does a side rank its focus? | **By the rule's `focus` tiers through the scorer, over the side's standing enemies listed by id (a full tie: the lower id). Only `targetHealth` and `missing` — numbers of the target alone — may be named; checked at load.** | The side step has no action to preview, so considerations that price an action (damage, heal) cannot be read honestly (Laws 1–2). Others join when a side-level consideration exists. | provisional — 2026-09-26 |
| `encounterFocusFrom` | Whose view is the side's pick measured from? | **The lowest-id standing unit the rule binds on that side; its enemies (a Taunt narrows them, as for any unit) are the candidates.** | The scorer measures from a unit; the lowest id is an explicit, untieable choice (Law 6). | provisional — 2026-09-26 |
| `encounterFocusTier` | How does a coordinated unit's scoring read the focus? | **Its row's target tiers gain a first tier, `sidePlan` (AI-DESIGN §3B #10: 1 on the focus, else 0); its own preference breaks the rest. The decision log shows the term.** | "Coordinated units' scoring reads" the side step (the item's spec); a tier ahead of the row's own is the smallest change that makes the focus win whenever it is a legal target. | provisional — 2026-09-26 |
| `encounterFocusSteers` | Does coordination move the unit, or only choose its swing? | **Both, for a mode that closes on an enemy (anchor `nearest-enemy`, `target`, `quarry`): it closes on the focus while the focus stands. Modes anchored to allies or to a range band (`ward`, `lead`, `away`, `range-band`) move as before and only their target choice reads the focus.** | "Its units share a target": a dumb skeleton that swings at the focus only when it happens to be adjacent shares nothing. The rule is overarching by design — the encounter chose to coordinate them. | provisional — 2026-09-26 |
| `encounterFocusFallen` | The focus falls mid-Phase. | **The coordinated units play their own modes until the next side step; there is no re-pick mid-Phase.** | Once per Phase is the ruling's cadence; the next Phase picks again. | provisional — 2026-09-26 |
| `encounterJobs` | Jobs (screen the back line, flank, hold) and goals beyond an anchor. | **Not built. The side step hands out a focus only; the anchor is the one location goal.** | Scope now is the framework (DECISIONS.md 2026-09-26). Each job is a new rule kind — data plus one consideration — when content asks for it. | provisional — 2026-09-26 |
| `encounterRuleEvents` | What are the new log lines called? | **`ai.anchored` and `ai.coordinated` (a unit bound, the rule as cause) and `ai.focused` (the side's pick, the rule as cause). Proposed names in the `ai.*` event family; GLOSSARY.md lists only `ai.mode` and `ai.denied`, and the viewer does not draw these yet.** | Every state change emits an event (Law 3). The names follow the `<noun>.<verb-past>` grammar; they are Angela's to confirm. | provisional — 2026-09-26 |

## AI sight — defaults taken building ai.sight (2026-09-27)

Ruled 2026-09-26 (Andrew; DECISIONS.md, the AI framework): "the AI knows everything except stealthed
units." The flag is `hidesFromFoes` on a status row (`StatusDef`, `src/core/status.ts`); the one
reader is `hiddenFrom` (same file), and the AI reads it through `livingEnemies` / `nearestEnemy`
(`src/core/movement.ts`) and its action list, burst and area scoring (`src/ai/modes.ts`). Probes:
`test/ai-sight.test.ts`, on two TEST statuses (content/test/statuses.json: `test.status.veil`,
`test.status.shroud`), two TEST units (`test-veiled-osric`, `test-shrouded-zombie`) and scenarios
`test.sight-a` / `-b`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `aiSightStealthRow` | The spec names "the stealthed flag (src/core/status.ts)" — there is no stealth status in the engine or the Codex's status rows. What carries it? | **A behaviour flag, `hidesFromFoes`, that any status row may set; proven on two TEST statuses. No `status.stealth` row is written here.** | The Codex owns status rows (Andrew 2026-09-02, "Codex owns the rows") and its stealth sentence is settled (CODEX.md 475, 1589: "you cannot be seen and cannot be targeted by an attack … It breaks the moment you use an attack or a power, and whenever a reveal effect finds you — moving never breaks it"). The row, and the phrase that compiles it in mkenginepack, come with stealth itself. | **retired — 2026-09-28, capability.stealth**: the Codex row `status.stealth` now exists and compiles to `hidesFromFoes` plus the stealth flags (see "Stealth" below). |
| `aiSightLegality` | Does a hidden unit stop being a legal target for everyone, or only drop out of the AI's view? | **Only the AI's view. `canAttack` / `legalActions` are unchanged; the AI never chooses what it cannot see. "Cannot be targeted by an attack", breaking on an attack or a power, reveals and "Stealth does not hold" (CODEX.md 1840) are stealth's own item.** | The item's spec is the AI's view ("excludes … from targets, threats and scoring"). Legality touches every hero command and the preview; it belongs to the item that builds stealth whole. | **retired — 2026-09-28, capability.stealth**: legality is now the status row's `untargetable` flag, read by `canAttack` / `canUsePower` (see "Stealth" below). `hidesFromFoes` alone is still the AI's view only (the Veil and the Shroud). |
| `aiSightAllies` | Does a unit's own side see it? | **Yes. Hidden means hidden from the OTHER side only.** | "Hero traps are invisible to enemies; enemy traps are invisible to heroes" (COMBAT-DESIGN.md 704) — the same machinery, one-sided. | provisional — 2026-09-27 |
| `aiSightScoring` | A burst or area power would strike a hidden foe. Is that counted? | **Not counted. The area still strikes it (CODEX.md: "Area effects, terrain and auras all still reach you"); the AI's forecast, `minEnemiesStruck` hints and area picks count only the foes it can see.** | "Excludes … from scoring." The AI does not aim at what it cannot know is there; a hit that lands anyway is luck, not a plan. | provisional — 2026-09-27 |
| `aiSightTauntHidden` | A unit is taunted by a foe that is hidden from it. | **Its candidate list is empty: it must target the taunter and cannot see it, so it chooses no enemy.** | Taunt narrows the list to the taunter (capability.taunt); sight removes the taunter. Falling back to other targets would break the taunt; seeing the taunter would break the sight rule. | provisional — 2026-09-27 |
| `aiSightTraps` | "Invisible traps are likewise unseen." | **Nothing to hide yet — traps are not built (src/core/movement.ts, "traps — none in the baseline"). When they are, a trap is hidden from the side that did not lay it, through the same reader.** | No trap exists for the AI to see. | provisional — 2026-09-27 |
| `aiSightDarkness` | Does darkness now hide a unit from the AI too? | **No. The AI knows everything except hidden units — darkness and Vision still govern targeting legality (`canSee`, SWITCHES.md targetUnseen) as before, but the AI's view of positions, stats and threats is whole.** | The ruling names one exception, stealth. | provisional — 2026-09-27 |

## Enemy accuracy modifiers — defaults taken building fix.enemy-accuracy-mod (2026-09-27)

The regular enemy-attack lane of `content/mkenginepack.mjs` now carries a bestiary row's
`accuracyMod` onto `AttackDef.attack.accuracy` (station.accuracy-field), as the special-move lane
already did. Probe: `test/enemy-accuracy-mod.test.ts`, every number read from the Codex row.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `accuracyModSameAsOverride` | A unit's attack is a `sameAs` reference that carries fields of its own (an `accuracyMod`, say). Merge them over the source row, or not? | **Not merged: the source row ships as it is, and each extra field is a named gap in `content/gen/enemy-pack-gaps.json` (`content: sameAs override`).** | Law 9 — never drop silently — without inventing an override rule nobody has ruled on. No row does this today (the Burning Zombie's reference carries only its id). | provisional — 2026-09-27 |

## Charge — defaults taken building capability.charge (2026-09-27)

A charge is an action carrying a move profile AND an attack profile (`isCharge`, `src/core/action.ts`) — the
one-action-type ruling's "Move 3, do damage". Aimed at a unit; `src/core/charge.ts` plans the walk and resolves
it through the one step loop (`walkSteps`, `src/core/movement.ts`) and then `performAttack`. The Codex rows
(`move.fast-zombie.charge`, `move.iron-colossus.charge`) compile through `content/mkenginepack.mjs`, carrying the
row's `hexes`; the Iron Colossus's `noPrimaryAction` is carried as the row's own field. Probe:
`test/charge.test.ts`, every number read from the Codex row; scenarios `test.charge-a` / `-b`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `chargeHexesArePoints` | "Move N hexes and attack": hexes, or movement points? | **Movement points, as any walk: terrain costs apply, and a charge walks at most `hexes` and never more than the unit has left (a Slowed unit charges shorter).** | One walk, one cost rule (COMBAT-DESIGN.md 466: "Move 5 … five open hexes, or two forest"). On open ground the two readings agree. | provisional — 2026-09-27 |
| `chargeNeedsDistance` | Can a unit charge a target already in reach? | **No. The target must be out of the attack's reach where the charger stands; a charge closes distance.** | Otherwise a unit beside its target "charges" by shuffling to another adjacent hex, provoking for nothing. The unit's plain attack covers the adjacent case. | provisional — 2026-09-27 |
| `chargeLanding` | Where does the walk end, and must it be a straight line? | **On the cheapest reachable hex (fewest movement points) from which the attack would strike, ties to the lower hex id (Law 6). Any path — no straight line.** | The enemy rows say nothing of a line; Heroic Charge's "in a straight line" (CODEX.md 1236) is that hero power's own clause, for when hero charges are built. | provisional — 2026-09-27 |
| `chargeHumanLanding` | A human-controlled charger: who picks the landing hex? | **The planner, as for the AI. The request names the target only; there is no landing field.** | Every Charge row today is an enemy's. A landing choice for heroes is a request-shape change for the item that builds hero charges. | provisional — 2026-09-27 |
| `chargeProvokes` | Does the charge's walk provoke attacks of opportunity? | **Yes, exactly as any walk — it is the same step loop.** | Holy Charge says "It provokes nothing — you are not leaving the line" (CODEX.md 1252): the exception is written on the row, so the rule is that a charge provokes. | provisional — 2026-09-27 |
| `chargeShortWalk` | The walk is cut short (a hit from an attack of opportunity ends movement; the charger falls). | **The blow lands if it is legal from where the charger stopped; otherwise nothing strikes, the charge is still spent (slot and cooldown), and the log says `attack.cancelled`, reason `charge fell short`.** | One action, one spend: a charge that is interrupted was still used. Striking from an illegal hex would break canAttack (Law 2). | provisional — 2026-09-27 |
| `chargeNoReaction` | Can a charge be the attack a unit makes as an attack of opportunity? | **No. `canAttack` refuses a charge in reaction mode; the unit reacts with its other melee.** | A reaction does not walk, and a charge is a walk and a blow. | provisional — 2026-09-27 |
| `aiChargeRule` | When does the AI charge? | **dumb-melee: when its target is out of reach and a charge at it is on the action list, it charges instead of walking — the first such charge in declared order — and then plays its primary as usual. A charge is never chosen as "whatever is in reach" (the swing at the primary).** | The two carriers (Fast Zombie, Iron Colossus) run dumb-melee. Other modes reach a charge only through the action list if their own rules pick it; a mode-specific rule comes with the first carrier that needs it. | provisional — 2026-09-27 |
| `noPrimaryActionScope` | What does `noPrimaryAction` close? | **The primary slot, for every action. A free action still resolves in the movement slot. The unit's walk (either-slot) spends the movement slot or nothing, so one action is the whole Activation; a human-controlled unit with the flag ends its cycle with end-cycle.** | ENEMY-REVIEW.md:348, "has no primary action at all; it is entirely movement powers". | provisional — 2026-09-27 |

## Walks that ignore zones of control — defaults taken building capability.move-ignores-zoc (2026-09-28)

The hounds "ignore ZOC (the move-WITHOUT-provoking machinery, as a property of their movement — distinct
from Juggernaut, which eats the AOO and refuses the slow)" (ENEMY-REVIEW.md:276-278). Zone of control stays
the board rule (DECISIONS.md 2026-08-20); what does not provoke is the movement power: `MoveProfile.ignoresZoc`
(`src/core/types.ts`), read by the one step loop (`walkSteps`, `src/core/movement.ts`) from the action that
walks. The Codex row `power.move-ignoring-zoc` (content `settled.json`) says "Ignores zones of control" and
`content/mkenginepack.mjs` compiles that sentence; a bestiary row marked `moveIgnoresZOC` walks with it.
Probe: `test/move-ignores-zoc.test.ts`, every row read from the Codex.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `ignoresZocOnThePower` | Is "ignores ZoC" a property of the unit or of its movement power? | **Of the movement power (`MoveProfile.ignoresZoc`). The hound rows keep `moveIgnoresZOC: true`, and the converter hands such a row the one Codex walk that carries the property — found by what it is (a plain walk, `ignoresZoc`, no budget change, no riders), never by name. None or several is a named gap; so is a `moveIgnoresZOC` row that also names a movement power of its own.** | The ruling says "as a property of their movement", and the item says "a property a movement power row can carry". The unit rows are the ruling's record and are not rewritten. | provisional — 2026-09-28 |
| `ignoresZocRowName` | The Codex had no power row for the hounds' walk. What is it called? | **`power.move-ignoring-zoc`, "Move, Ignoring Zones of Control", granted (by the `moveIgnoresZOC` rows), description "Move up to your Movement, hex by hex, paying each hex's terrain cost. Ignores zones of control: it provokes nothing."** | A plain descriptive name under the existing `power.` kind, worded like Move and Sidestep ("It provokes nothing") so the Codex vocabulary counts it as `move WITHOUT provoking`. Angela's to rename; a rename is data. | provisional — 2026-09-28 |
| `ignoresZocWalkCopiesMove` | Its stamina, cooldown and costs? | **Copied from `power.move`: 1 Stamina, no cooldown, terrain costs paid hex by hex.** | It is Move with one property changed. Enemies run no stamina, so the 1 costs a hound nothing. | provisional — 2026-09-28 |
| `ignoresZocPathOnly` | Can a sidestep or a flight carry `ignoresZoc`? | **No — the loader refuses it and the converter names it a gap. Path-shaped walks only.** | A sidestep already provokes nothing (GAME-DESIGN §4). Flight has its own rule (COMBAT-DESIGN.md 477: a flight provokes once, at launch — not built today). | provisional — 2026-09-28 |
| `ignoresZocLogs` | What does the log say when a walk ignores a zone? | **`zoc.ignored`, caused by the walking action, naming the mover, the holder and the hex left — once per holder per walk, as an attack of opportunity would have been.** | Law 12: the zone was there and something chose to ignore it; a silent skip would read as "no zone". Not a state change, so not in `ACTED`. | provisional — 2026-09-28 |
| `ignoresZocCharge` | Does a charge's walk read the property? | **Yes, by the same read: `walkSteps` asks the walking action's own move profile, and a charge walks under its own id. No Charge row carries it today.** | One step loop, one read. Holy Charge's "It provokes nothing" (CODEX.md 1252) is a hero row not yet built; when it is, the property is its data. | provisional — 2026-09-28 |
| `ignoresZocAiBlind` | Does the AI plan around it? | **No change. The AI is blind to attacks of opportunity by ruling (Angela 2026-08-13), so a hound walks where it would have walked; it simply draws nothing on the way out.** | The hunter's pathing is unchanged; only the step loop's answer differs. | provisional — 2026-09-28 |

## Stealth — defaults taken building capability.stealth (2026-09-28)

Ruled 2026-09-27 (Andrew, DECISIONS.md "stealth gets a Codex row and its own backlog item"): the Codex row
`status.stealth` (content `settled.json`), its sentence the settled definition (CODEX.md 475, 1589): "you
cannot be seen and cannot be targeted by an attack. Area effects, terrain and auras all still reach you. It
breaks the moment you use an attack or a power, and whenever a reveal effect finds you — moving never breaks
it." `content/mkenginepack.mjs` compiles that sentence to five flags on `StatusDef` (`src/core/status.ts`):
`hidesFromFoes` (ai.sight's), `untargetable` (read by `untargetableBy` in `canAttack` and `canUsePower`),
and `breaksOnAttack` / `breaksOnPower` / `breaksOnReveal` (read by `breakStatuses`, `src/core/mutate.ts`,
called from `performAttack`, `attackProp`, `usePower`, `useBurst` and the `reveal` effect kind). Probe:
`test/stealth.test.ts`, on the Codex row and a second TEST row, `test.status.cloak` (content/test/statuses.json:
the same flags minus breaking on a power, with a clock), TEST units `test-stealthed-osric` /
`test-cloaked-zombie`, TEST power `power.test-lantern`, scenarios `test.stealth-a` / `-b`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `stealthRowSentence` | The ruling says copy the definition; the status rows' house rule (2026-09-02) is ONE third-person sentence. Which? | **The definition word for word — second person, three sentences — with only a capital first letter and a closing full stop.** | The 2026-09-27 ruling is newer and names this row: "its sentence copied from that definition. Copy, don't invent." Rewording it into one sentence would be inventing. | provisional — 2026-09-28 |
| `stealthNoClock` | How long does stealth last? | **No clock: `decay` "No clock: it lasts until it breaks." (decayPerPhase 0).** | The definition gives only what breaks it; neither the Assassin's opener nor Vanish in Shadow / Melt Away names a duration. "Stealth does not hold" (CODEX.md 1840) is the universal rule that erodes it, and is not in this item. | provisional — 2026-09-28 |
| `stealthStacking` | Stealth applied to a unit already in it? | **On or off: the higher value holds (`stacking: 'highest'`), so re-entering changes nothing.** | A flag has no magnitude (the Prone precedent, `proneStacking`). | provisional — 2026-09-28 |
| `stealthFlags` | One flag or several? | **One per clause the engine acts on: `hidesFromFoes`, `untargetable`, `breaksOnAttack`, `breaksOnPower`, `breaksOnReveal`. "Area effects, terrain and auras all still reach you" and "moving never breaks it" need no flag — nothing that reaches or moves reads one.** | The Cloak drops `breaksOnPower` and keeps the rest, which proves each clause is data. | provisional — 2026-09-28 |
| `stealthPowerAim` | "Cannot be targeted by an attack" — may a power be aimed at a stealthed foe? | **No, when the power is AIMED at it: a one-unit power, an area centred on it (`origin: 'target'`), or the legacy single-target bolt. An area from the caster and a burst centred on a hex are aimed at nobody and still strike it.** | The same definition says it "cannot be seen" — nothing aims at what it cannot see — and COMBAT-DESIGN.md 265 says a stealth unit "cannot be targeted". "Area effects … still reach you" is the stated exception. | provisional — 2026-09-28 |
| `stealthOwnSide` | May its own side still aim at it (a heal on a stealthed ally)? | **Yes. Untargetable by the OTHER side only, like `hidesFromFoes` (`aiSightAllies`).** | An attack on one's own side is never legal anyway; a heal is not an attack. | provisional — 2026-09-28 |
| `stealthReaction` | Attacks of opportunity? | **None against a stealthed unit — a reaction is an attack and `canAttack` refuses it. One made BY a stealthed unit breaks its stealth like any attack.** | "Cannot be targeted by an attack" and "breaks the moment you use an attack" draw no line at reactions. | provisional — 2026-09-28 |
| `stealthBreakMoment` | When, inside an attack, does it break? | **As the attack is declared, before the roll — one line before `attack.declared`; a multi-hit attack breaks it once; a charge's walk does not break it, its blow does.** | "The moment you use an attack." The parked Assassin clause ("an attack made out of stealth gains +15 Crit; making it breaks stealth", CODEX.md 479) reads the same way. | provisional — 2026-09-28 |
| `stealthBurst` | A burst: attack or power? | **Whichever its row is: a burst on an attack row breaks as an attack, on a power row as a power.** | Both break Stealth; only a row like the Cloak, which keeps one flag and not the other, can tell them apart. | provisional — 2026-09-28 |
| `stealthMovement` | "Moving never breaks it" — what about a movement power (Blink, Shadow Dance's walk) or a power used in the movement slot? | **A movement action (a move profile — Move, Sidestep, flight, Blink when it compiles as a move) never breaks it. A power spent from the movement slot is still a power and breaks it.** | The Codex separates moving from using a power; the slot a power is paid from does not make it a move. | provisional — 2026-09-28 |
| `stealthRevealShape` | What is a reveal effect in the engine, and where is its radius? | **An effect kind `reveal` with no fields: on each resolved target of the other side, every status with `breaksOnReveal` is broken. The radius is the power's own area targeting (the one targeting vocabulary); proven on the TEST power `power.test-lantern` (radius 3 from the caster).** | "An effect kind that breaks stealth on units of the other side within a radius" (the item's spec). The kind's name is the Codex's word ("a reveal effect"); a name is Angela's to change. Compiling the Codex reveal rows (Flush Them Out, Spectral Sight, Second Sight, Raise the Torch, Flare, Brilliant Torch, Scouting) is later work — several key on Vision, a hex or an aura, which the area targeting does not yet say. | provisional — 2026-09-28 |
| `stealthRevealSide` | Does a reveal break its caster's own side's stealth? | **No — only units of the other side. A reveal is not an attack or a power used BY the revealed unit, so it breaks only `breaksOnReveal`.** | Every Codex reveal names enemies or "stealthed units" from the caster's view; "Stealth does not hold" is the only rule that reaches either side, and it is its own item. | provisional — 2026-09-28 |
| `stealthBrokenLog` | What does the log say when it breaks? | **`status.expired`, the attack, power or reveal as its cause, with `broken: 'attack' \| 'power' \| 'reveal'`. No new event name; the viewer already drops a status on `status.expired`.** | Law 12 (the line names its cause) with nothing new for the viewer to learn. | provisional — 2026-09-28 |
| `stealthMoveOntoHex` | COMBAT-DESIGN.md 265: "Attempting to move onto its hex stops the movement: 'You moved into a hidden object.'" | **Not built. A stealthed unit fills its hex like any unit, and the planner routes around it.** | Not in the item's spec or the Codex definition; it is a movement rule for its own item. | provisional — 2026-09-28 |

## Surge spend — defaults taken building fix.surge-spend (2026-09-28)

Ruled 2026-09-27 (Andrew, DECISIONS.md "Surge: a pool that pays 100 per Surge"): *"If it's used,
it should take away 100. If you have 150 surge, automatically you're going to have a surge
activation, and you're going to lose 100 and still have 50."* The Surge check (`src/core/battle.ts`,
COMBAT-SEQUENCE.md Surge check rung 2) now takes away `SURGE_COST` (100) instead of emptying the
amount. Probe: `test/surge-spend.test.ts`, on test-surge-labored (Surge 10) and test-surge-swift (20).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `surgeSpendFloorsAtZero` | A Surge that happens below 100 — take away 100 below zero, or stop at 0? | **Stop at 0** (Config switch, default `true`). Off: the amount goes below zero (a Surge at 30 leaves −70). | The ruling's example is 150 → 50; below 100 the old rule emptied the amount, and a lucky Surge becoming a 70-point debt is a new penalty nobody ruled. Floored, every sub-100 Surge is what it was — the control battles stay byte-identical. | **answered by Andrew 2026-09-28** (*"yes, surge should stop at zero if it goes negative"*, DECISIONS.md "a Surge below 100 stops at 0") |
| `surgeRelinkReadsLeftover` | Does a second Surge check in the same Activation check the leftover? | **Yes** (Config switch, default `true`): the next link adds Surge to what the Surge left and rolls against that — 150 surges, keeps 50, the next link rolls against 50 + Surge. Off: a further link rolls against Surge alone and leaves the amount for the next Activation. | "Lose 100 and still have 50" — the 50 is the amount, and the amount is what the check rolls against. | provisional — 2026-09-28 |
| `surgeAutomaticNoRoll` | "Automatically … a surge activation" — is a roll still drawn at 100 or more? | **No roll.** An amount at or above 100 surges without a draw; `surge.checked` logs `roll: null` and `automatic: true`. A constant reading, not a Config switch. | The ruling says automatically; a die that cannot miss is not a roll. Draws are keyed by what they are (Law 4), so skipping one moves no other. | provisional — 2026-09-28 |
| `surgeAmountEvents` | How do the events show the amount before and after? | **`before` and `after` on `surge.checked` and `surge.hit`**; `chance` stays the amount rolled against (before + Surge). `after` on a miss is `chance` — the amount persists. | The item's expect; `chance` keeps its meaning for the viewer (`../viewer/src/fold.js` reads it). | provisional — 2026-09-28 |

Not changed: the check's position (before the End of Activation ladder, ruled 2026-08-21) and
how much Surge a hero gains (still open — DECISIONS.md 2026-09-27, the questions inbox).

## Staff against bow — defaults taken measuring content.mage-staff (2026-09-28)

Ruled 2026-09-28 (Andrew, DECISIONS.md "the staff-vs-bow check runs against the Codex's armored
enemies"): *"One, yes."* Probe: `test/mage-staff.test.ts` — the standard six, strict, replicates
0..23, against four of one enemy row; the Air Mage (Lightning Staff, `attack.lightning-staff.bolt`,
magic) and the Dusk Hawk (Shortbow, physical) fight the same battles side by side.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `mageStaffYardstick` | What is "out-damages" measured as? | **Total damage each hero deals across the sweep (`damageDealtByType`, read from the log), with staff-vs-bow damage per swing as a second assertion.** Both heroes stay in the standard six, so the arms share every roll. | Angela: raw damage per swing is the wrong yardstick on its own; the hero's whole contribution is the one the design argues about, and swapping one hero out would change the fight around it. | provisional — 2026-09-28 |
| `mageStaffArmoredRow` | Which armored row? | **`unit.bruiser-demon` (armor 4, resist 1)**, with its armor overridden to 0 on the same dice as the proof that armor is the difference. Unarmored: `unit.zombie` (the standard horde). | The ruling names the Skeleton and the Bruiser Demon; the Skeleton does not show the split (below). | provisional — 2026-09-28 |

Measured 2026-09-28 (30 replicates, damage per battle, Mage vs Ranger), armor overridden on the
same row and dice:

| Row | armor 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Bruiser Demon | 7.2 vs 17.6 | 8.1 vs 14.6 | 8.9 vs 13.5 | 9.3 vs 9.3 | **9.0 vs 4.5** |
| Strong Zombie | 3.9 vs 6.5 | 3.9 vs 5.9 | 4.6 vs 5.4 | 4.7 vs 4.7 | **7.0 vs 3.4** |

The crossover is **armor 3**. Against the armor-1 rows (Skeleton 2.0 vs 3.3, Strong Zombie as it
stands) the bow still wins: the staff's Bolt is 3 + Precision magic at −20 Accuracy for 2 Stamina
against the Short Shot's 1 + Precision at +5 for 1, and one point of armor does not close that.

## The opening's six maps — defaults taken building map.opening-six (2026-09-28)

The source: DECISIONS.md 2026-09-28 "the opening's maps: whole size, the painted gate, ground
types by letter" and "cursed ground gives Weak; the cave mouth; bank boulders; which rivers are
deep"; the per-hex letters in `assets/battle-atlas/opening-ground-proposal-2026-09-28.json`
(checked on the Abbotown Ground Check). One compile path: `content/mkopeningmaps.mjs` →
`content/gen/opening-maps.json` → appended to the shipping lane by `assemble.mjs` → the pack.
`content/map-schema.mjs` now accepts the engine's glyphs `u n H W T`, low props on a full hex,
and the V2 `floor` mask. Probe: `test/opening-maps.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `openingDenseForest` | Dense forest (F) and a high obstacle (X) — one prop each, or the ground under them? | **The engine's `x` shorthand**: open ground plus a high material-3 prop (`prop.obstacle.<hex>`). | The legend says "a high obstruction" and "a high prop"; the shorthand is the one existing way to write that. | provisional — 2026-09-28 |
| `openingCoverMaterial` | What is each low cover (c) made of? | **Material 2 for every one** (`prop.cover.<hex>`, low, full hex). | The letter grid does not say whether a `c` is a fence (tier 1), a pew or a boulder (tier 3); the middle tier until a map says. | provisional — 2026-09-28 |
| `openingDeepWater` | Deep water (~): what is it in the engine? | **Water (`terrain.water`) with no floor** — the V2 floor mask: nobody stands in it or paths through it, flight cannot land in it, and it blocks no sight. | "Too deep to cross" is a walking rule; nothing ruled it blocks a shot. The floor mask is the existing "may not stand here" (movement.ts, props.ts). | provisional — 2026-09-28 |
| `openingCursedPaint` | Cursed ground (*) — the map's or the encounter's? | **The encounter's**: the map row carries open ground, and `gen/opening-maps.json` lists each map's cursed hexes under `cursed` for its encounter to paint as `layer.weak` at setup. | A map row carries no layers (AuthoredMap); an encounter's `paint` is how Rime paints frost (capability.ground-layers). | provisional — 2026-09-28 |
| `openingNoEntries` | Doors and stairs on the houses and walls (H, W)? | **None.** No house or wall on these maps has an entry side, so none is stood on. | The letter grid has no letter for a door or stairs; a door is the encounter's or a later map pass's. | provisional — 2026-09-28 |
| `openingPanelDeploy` | Which edges does a ROLLED battle on these maps deploy on (the panel, the control battles, the probe)? | **Gates and Cathedral: heroes south, enemies north** (walked south to north). **Lumberjack House: heroes south, enemies east** — its west edge holds five passable hexes and the standard six need six. The rest: the default, heroes west, enemies east. | The encounters place their own units ("hero start hexes are the encounters', not the map's"); these edges only make a rolled battle possible. | provisional — 2026-09-28 |

Measured: the 23 existing control battles are byte-identical; six new lines join `.state/baseline.hash`.
The control-battle run grows from ~43 s to ~85 s of CPU (the 40-wide maps' 8-enemy battles are long);
under this sandbox's outside load it took 138 s of the 178 s a Cowork call allows.

## Area falls — defaults taken building encounter.area-fall (2026-09-28)

The source: DECISIONS.md 2026-09-28 "a Turn 4 meteor fall", "the meteor fall is the Hunt's"
(seven 7-hex areas marked at the end of the Enemy Phase, landing after the next Player Phase —
burning ground, 2 fire damage and 2 Burn; "random, weighted to the middle, centre always a hex you
can move to"), and "Gates' curse strikes fall like the meteors" (3 Weak, cursed ground). The
prior art it extends: the encounter's ground painting (`paint`, the band — capability.ground-layers)
and COMBAT-SEQUENCE.md "Terrain events" (Scatter · Disk on the terrain-event cup, declared and never
drawn until now). Engine `src/core/encounter.ts` (`scatterAreas`, `fallCentres`, `markFalls`,
`landFalls`); an encounter row's `falls`. Probe: `test/area-fall.test.ts`, TEST rows
`test.fall.meteor` and `test.fall.curse` on `test.encounter.meteor-fall` / `test.encounter.curse-strike`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `areaFallIdKind` | What kind of id is a fall? | **`trigger.*`** (TEST: `test.*`), inline on the encounter row like its AI rules. | "A hook-and-effect pair attached to a row" (approved-kinds.json); no new kind. | provisional — 2026-09-28 |
| `areaFallWeight` | "Weighted to the middle" — what shape? | **Linear**: a centre's weight is (the farthest candidate's distance + 1) − its hex distance to the middle hex ((width−1)/2, (height−1)/2, rounded down). Drawn without replacement, ascending hex order. | The simplest weighting that is integer (Law 7) and never zero at the rim. Measured: 200 seeds on the 20×10 TEST board sit ≥10% nearer the middle than uniform. | provisional — 2026-09-28 |
| `areaFallCentre` | "A hex you can move to" — exactly? | **Passable (no high prop, a floor), not impassable ground, not a house or wall hex, and all six neighbours on the board** — so every area is seven hexes. | The ruling's "7-hex areas"; an edge centre would drop hexes off the board. | provisional — 2026-09-28 |
| `areaFallOverlap` | May areas overlap? | **Centres are distinct; the rings may overlap.** A hex in two areas is painted once. | The backlog note's default. | provisional — 2026-09-28 |
| `areaFallOncePerUnit` | A unit inside two overlapping areas? | **Struck once** by the fall. | "Every unit in an area" takes the fall's damage — one fall, one blow. | provisional — 2026-09-28 |
| `areaFallStanding` | Downed units inside? | **Only standing units are struck** — as the ground's hazard strikes only the standing. | The hazard precedent (ground.ts `applyGroundHazard`). | provisional — 2026-09-28 |
| `areaFallNoEntryBeat` | Does the freshly painted ground also give its entry status at the landing (as the band does)? | **No** — the landing deals the fall's own damage and statuses; the ground acts from then on. | "2 fire damage and 2 Burn" is the whole landing; the entry beat on top would make it 3 Burn. | provisional — 2026-09-28 |
| `areaFallOnce` | "From Turn 4" — does it repeat? | **Once**, on its turn. | DECISIONS.md 3179 reads the curse strikes as once, like the meteor fall. | provisional — 2026-09-28 |
| `areaFallAi` | Does the AI step out of a marked area? | **No AI change.** | AI-DESIGN.md is Angela's. | provisional — 2026-09-28 |
| `areaFallCup` | The roll's key? | **The terrain-event cup, keyed (the fall's index on the row, the area's index)** — what is rolled, never the turn (Law 4). | COMBAT-SEQUENCE.md: the terrain event picks where it lands. | provisional — 2026-09-28 |
| `areaFallLandingMoment` | "After the next Player Phase" — before or after that Phase's own end ladder? | **After**: the End of Phase ladder runs, then the fall lands, then the Enemy Phase's arrivals. | "After the Player Phase ends". | provisional — 2026-09-28 |

## Placed remains — defaults taken building capability.placed-remains (2026-09-28)

The source: DECISIONS.md 2026-09-28 "Gates is the Curse; the Cathedral has a Necromancer raising
the dead" (the Cathedral's remains are raisable corpses; "When the body is raised, the cursed ground
stays"). The prior art it extends: capability.corpses (the board objects, `createCorpse`) and the
content encounter shape `{ corpses: N, hexes }` already authored in `encounter.last-company` (a gap
until now). Engine `placeCorpse` (mutate.ts), `placeRemains` (encounter.ts), an encounter row's
`remains`. Probe: `test/placed-remains.test.ts`, TEST rows `test.remains.chapel` and `test.remains.yard`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `placedRemainsShape` | Where are placed remains authored? | **The setup entry content already wrote, `{ corpses: N, hexes: [{col,row}] }`, plus an `id` (trigger kind; TEST `test.*`) and `typeId` (whose body).** One without an id or typeId stays a named gap (`encounter.last-company`'s two entries do). | The shape existed; the pack only lacked what the engine needs to lay a body. | provisional — 2026-09-28 |
| `placedRemainsPaint` | Do the remains paint their own cursed ground? | **No — the row's `paint` does** (`layer.weak` on the same hexes), the one ground mechanism; so the ground outlives the body with no rule of its own. | "Follow the same structure that was planned for all the various ground effects" (DECISIONS.md 2026-09-28). The opening maps list the cursed hexes (`content/gen/opening-maps.json`). | provisional — 2026-09-28 |
| `placedRemainsOrder` | When, and with what identity? | **After the encounter's units, row by row, hex by hex**; each body takes the next unused uid, as an arrival does. `corpse.created` names the encounter as cause, `of: null`, and the remains id. | Laying bodies after the units moves no unit's identity. | provisional — 2026-09-28 |
| `placedRemainsSide` | Whose side is a placed body? | **Its unit row's.** | A body is its unit's; nothing reads more. | provisional — 2026-09-28 |
| `placedRemainsGround` | The Cathedral's 33 remains hexes — typed into the row? | **No — the row names its map's ground** (`"ground": "cursed"` on the remains entry and on the paint), read from `content/gen/opening-maps.json` `cursed` by `readGround()` (content/mkpaintedmaps.mjs, shared by assemble and mkenginepack). The entry keeps `corpses: 33` as a cross-check: a map whose cursed count changes fails the build loudly. | "Never type a number a file could hold" (DISPLAY-RULES 20); the caravan's paint already names `gen/painted-maps.json` ground the same way. | provisional — 2026-10-01 |

## Raise two — defaults taken building fix.raise-two (2026-09-28)

The source: DECISIONS.md 2026-09-28 "the Cathedral encounter" — Andrew: "Let's have the necromancer
raise two per turn." The Raise's `count` is on its Codex row (`content/gen/enemies-authored.json`,
the Necromancer's Raise effect, `count: 2`); mkenginepack compiles it; `corpse.raise` takes that many,
the nearest first. Probe: `test/raise-two.test.ts`; the second instance is TEST `test-raiser`
(`trigger.test-raise-one`, count 1) over `test.encounter.raise-one`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `raisePerActivation` | "Two per turn" — per Turn, or per activation? | **Per firing of the Raise**, which is End of Activation; the Necromancer activates once a Turn, so two per Turn. A Surge's second action does not re-run the End of Activation ladder (ruled 2026-08-21), so it cannot raise twice. | The backlog note's reading; nothing makes a Necromancer activate twice. | provisional — 2026-09-28 |
| `raiseCountDefault` | A Raise row with no count? | **One.** The row's sentence is "raise a corpse". A count that is not a whole number 1 or more is a named gap (`content: raise count`). | Every Raise before this ruling raised one; the reach is never defaulted (fix.raise-range), but "a corpse" states one. | provisional — 2026-09-28 |
| `raiseTwoOrder` | Which two? | **The nearest two in reach, ties by the lower corpse id** (`corpsesNear`'s order, Law 6) — the order bodies were laid or fell. | The existing tiebreak. | provisional — 2026-09-28 |

Noticed, changed with a written reason (Law 10): `test/raise-range.test.ts`'s "no compiled corpse.raise
carries a radius its row does not state" now checks a TEST raiser (test-*) against its own row
(`content/test/units.json`) instead of the Codex — lines added, none removed.

## The opening's units — defaults taken building content.opening-units (2026-09-28)

The source: DECISIONS.md 2026-09-28 "the Lumberjack's Wife and the Undead Soldier, dictated" and
"battle 2's Undead Soldier is the existing Soldier". The Wife is `hero.fixed.lumberjacks-wife`, a
civilian authored the way every new civilian is (`content/gen/civilian-rulings.json` newUnits +
statBlocks + levelTables; `build-heroes.mjs` regenerated `gen/heroes.json` against hell-tcg) and
confirmed in `gen/encounters.json` civilians so the pack fields her. `unit.soldier` is published as
an authored row (`gen/enemies-authored.json`) with its bestiary numbers. Probe: `test/opening-units.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `wifeId` | Her id? | **`hero.fixed.lumberjacks-wife`** — a new instance of `hero.fixed.*`. | A new instance may be proposed (GLOSSARY.md); the kind exists. | provisional — 2026-09-28 |
| `wifeUndictated` | Her numbers the dictation does not give? | **The row she was part of** (`cloneStatsOf: hero.fixed.lumberjack-and-wife`, the hell-tcg row before the Lumberjack's own block): Armor 0, Reach 2, Toughness 2, Item Slots 5, Crit 3, Luck 0, Vision 6, Stamina 5/1; her level table is the Lumberjack's, `civilian.farmer`. No survival reward, no art yet. | DECISIONS.md: "Anything not dictated … follows the civilian rows' existing defaults, not new numbers." | provisional — 2026-09-28 |
| `soldierAttackDamage` | The bestiary's Soldier attacks say damage `null` (Attack, Heavy Strike) or `melee` (Heavy Blow) with a modifier. What do they deal? | **Strength plus the modifier** (0 when none): Attack +0, Heavy Blow −2 with 3 Weak on hit, Heavy Strike +2; physical, one enemy in melee reach. Family `undead-army`, tier 1 (its rank). | Every hell-tcg enemy attack is its Strength with a modifier; the Codex holds no other number to copy. | provisional — 2026-09-28 |

Noticed, not changed: the kingdom's sandbox tests (`kingdom/test/sandbox-ui.test.ts`) refuse to build
while the shared viewer's metadata names an older engine commit ("Shared viewer metadata is stale or
dirty") — every engine landing moves that commit; the viewer's owning tools regenerate it.

## The Flaming series — defaults taken building content.flaming-longsword (2026-09-28)

The source: DECISIONS.md 2026-09-28 "custom weapons are series across base weapons" ("let's do a
flaming long sword, standard tier 3") and the Armory Ledger's Flaming row, approved for now ("Basic
attack, on hit: Burn 1 and 2 fire damage"). The prior art it extends: the tier-3 shape, base +
enchant (`content/gen/tier3-combinations.json`, 2-ACTIONS-SETTLED.md "the tier-3 combinations").
`enchant.flaming` in `content/gen/settled-items.json`; mkenginepack reads an enchant trigger's
`attack: 'basic'` and "deal N <type> damage". Probe: `test/flaming-longsword.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `flamingIds` | The ids? The Ledger names the series, not ids. | **The tier-3 shape's own: `item.<base>.flaming`** — `item.longsword.flaming` (Flaming Longsword) and `item.war-axe.flaming` (Flaming War Axe). The backlog's `item.flaming-longsword` was a placeholder. | One id shape for every tier-3 base + enchant row. | provisional — 2026-09-28 |
| `flamingSecondBase` | "Flaming Axe" — which axe? | **The War Axe**, the Codex's tier-1 axe (the Ledger's Wood Axe and Great Axe are not yet rows). | The one axe the Codex has at tier 1 today. | provisional — 2026-09-28 |
| `flamingBasicAttack` | Which attack is the basic attack? | **The base's first attack** (`grants[0]`): Slash on the Longsword, Chop on the War Axe. | The Ledger's rule: "the first attack listed". The Ledger's re-authored longsword (Str+1, 1 Stamina) is today's Slash. | provisional — 2026-09-28 |
| `flamingFireDamage` | The 2 fire damage — how is it dealt? | **A trigger `damage` effect, fire, 2**, after the hit's Burn and before the swing's own damage lands, through the one damage function (Fire Resist and Protection apply). | The existing trigger damage effect; "on hit" is the onHit hook. | provisional — 2026-09-28 |

## The opening's six encounters — defaults taken building encounter.opening.* (2026-09-28)

The source: DECISIONS.md 2026-09-28 (the six battles, ruled that night) and the Abbotown Ground
Check's markers (`assets/battle-atlas/opening-ground-proposal-2026-09-28.json`). Rows in
`content/gen/encounters.json` `authored`; each fielded as scenario `test.opening-<key>` with four Alpha
heroes (`src/content/scenarios.ts`). Probes: `test/opening-<key>.test.ts`, helpers in
`test/opening-helpers.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `openingHeroZones` | Where do the heroes start? (Not stated for any of the six.) | **A zone of radius 2 at Claude's reading of each map**: Orphanage (5,4), west bank by the ford. | "Hero start hexes are the encounters'"; nobody ruled them. Andrew checks them on the Ground Check. | provisional — 2026-09-28 |
| `openingEndOfEnemyPhase` | An arrival "at the end of Turn N's Enemy Phase" (Lumberjack House, the first Skeletal Archer)? | **It arrives as Turn N+1 begins** (`phase: N+1`) — the next moment the schedule has; it acts first in that Turn's Enemy Phase either way. | The schedule fires at Start of Turn or as an Enemy Phase begins; nothing acts between. | provisional — 2026-09-28 |
| `openingHeroZonesLumberjack` | The Lumberjack House heroes? | **(5,7) r2**, west of the clearing: the Turn 3 and Turn 5 arrivals come "from behind the heroes" at the west edge. | The markers place "behind the heroes" at (0,5) and (0,9). | provisional — 2026-09-28 |
| `openingHeroZonesCavern` | The Cavern Trail heroes? | **(5,6) r2**, the trail's west end: the Zombie Hounds come "behind the heroes" at the west edge. | The markers. | provisional — 2026-09-28 |
| `openingHeroZonesBridge` | The Bridge heroes? | **(3,10) r2**, the west bank at the bridge's approach (row 10 is the one land row joining the west bank to both branches). | The Imps are "on the far side"; the markers put them on the east bank, so the heroes start on the west. The reading encounter.opening.bridge took, kept by encounter.opening.bridge-ai. | provisional — 2026-09-30 |
| `openingHeroZonesGates` | The Gates heroes? | **(10,45) r2**, the southern approach below the broken gate (rows 39–49 open ground). | The ruling: "the heroes come up the approach from the south"; the bottom Turn 7 Imp at (10,49) is "behind the heroes". | provisional — 2026-10-01 |
| `openingHeroZonesCathedral` | The Cathedral heroes? | **(10,37) r2**, the nave's south end. | The Ground Check: "The roofless nave, entered from the south"; the map's deploy is hero south. | provisional — 2026-10-01 |
| `openingCathedralRemainsBody` | Whose bodies are the Cathedral's 33 remains? | **`unit.zombie`** — every one. | The scene's corpse tiles are villagers, but no villager row exists; the Necromancer's Raise makes a Zombie whatever the body was (`trigger.necromancer.raise`, `unit: unit.zombie`), and a body's side is its row's (placedRemainsSide), which nothing reads. | provisional — 2026-10-01 |
| `openingFallIds` | The real falls' ids? | **`trigger.<battle>.<fall>`**: `trigger.cavern-trail.meteor-fall` (and `trigger.gates.curse-strike`). | The trigger kind the area fall uses (`areaFallIdKind`). | provisional — 2026-09-28 |
| `openingCiviliansNoAi` | The civilians' AI? | **Their own rows' AI** — no `civilianAi` flight window (Supper's is its own ruling). | Not stated; "civilians dying is its own punishment" is about loss, not behaviour. | provisional — 2026-09-28 |

Noticed, not changed: with four Alpha heroes the Orphanage is cleared on Turn 3 in all three
replicates tried, before the Turn 4 and Turn 5 Zombies arrive — an early clear wins (ruled
2026-09-03, "victory can be achieved early"; `boardClearWaitsForSchedule` off). The probe turns the
switch on to see the arrivals. At the Lumberjack House both civilians died in all three replicates
tried (their rows' melee AI walks them into the Zombies); the heroes still won each time. The Bridge
never wins with four Alpha heroes (replicates 0-9: capped 8, wipe 2; an AI stall from Turn 12) —
`encounter.opening.bridge` is abandoned on that finding. The Cavern Trail is a real fight: 4 heroClear,
6 wipe over replicates 0-9. The Gates, authored as ruled (six defenders at the markers, the curse strike
`trigger.gates.curse-strike` on Turn 4, two Imps on Turn 7, heroes at (10,46) r2), wiped four Alpha heroes
in all of replicates 0-9 by Turn 4-7; `encounter.opening.gates` was not landed and stays pending.

## Campaign maps off the panel — fix.opening-maps-off-panel (2026-09-28)

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `mapPanelFalse` | How does a map stay registered but off the fixed control panel? | **`panel: false` on the map row** (content/map-schema.mjs accepts only false; the pack loader too). `MAP_PANEL` is every registered map without it; `MAPS`, `mapDef` and the encounters still read it. The six opening maps carry it (mkopeningmaps.mjs). | Campaign maps are fielded by their encounters; the control panel is the fixed set of shapes that matter (COMBAT-SEQUENCE.md "Maps are not random"), and the six doubled the control run. | provisional — 2026-09-28 |

Supersedes the map.opening-six "probeable from the map panel": the probe fields any registered map id
on its own map first (tools/probe.mts), on the panel or not.

## One exported vocabulary — plumbing.vocabulary-export (2026-09-28)

`src/core/vocabulary.ts` gathers the engine's lists (FOLDABLE, the resolvable stats, HOOKS, the attacker's
hooks, the three effect-kind lists, OUTCOMES, LIFE_STATES, EVENT_TYPES, the layers and the glyphs);
`tools/vocabulary.mts` writes it to `generated/vocabulary.json` for the content tools. `emit` takes only a
listed event type, so tsc refuses an unlisted one; `test/vocabulary.test.ts` refuses a stale JSON and a listed
event nothing emits.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `vocabularyStatuses` | content/audit.mjs's ENGINE_STATUSES — from the export? | **No: from settled.json's status rows**, the rows the pack publishes and the engine loads. The export carries no status list. | Statuses are content ("Codex owns the rows", approved-kinds 2026-09-02); a status list in the frozen JSON would go stale every time the content chat adds a row, before any engine change. | provisional — 2026-09-28 |
| `vocabularyStatMapWidens` | The converter's eight stat maps become one (C11). Clauses one map dropped and another accepted now compile — do they land with this item? | **Yes, and the item declares it changes the control battles.** Blinded's −4 Vision (the crit chart; its "no vision model" gap was stale since capability.vision, 2026-09-03) moves map.open, map.ridge, map.proving.copse, map.courtyard, map.floodplain, test.map.duel-8 and test.map.horde-24 — confirmed by re-running the controls with that one effect removed (byte-identical). Also compiling now: "+N health for the Battle" on the Ghoul, Vampire, Vampire Lord and Lieutenant Demon (statMod maxHp; the Lieutenant Demon's aura lends maxHp). | The review's verifier: "The map gaps are real"; Andrew ruled C11 "fix as proposed". Each clause is the Codex row's own text. statMod sites take only resolvable stats (surge and toughness stay gaps). | provisional — 2026-09-28 |
| `vocabularyUnitFields` | snapshot.ts's lists of the Unit record's integer fields (hp, stamina, bleedOut, surgeChance …) — a stat list to replace? | **No.** They validate the Unit record's fields, a superset of the stats with a different job; the vocabulary test matches FOLDABLE's own run of names only. | Not the stat vocabulary. | provisional — 2026-09-28 |

## One ground funnel — fix.ground-one-funnel (2026-09-28)

Andrew, 2026-09-28 (DECISIONS.md "the duplication review, ruled"): "The ground table is an engine rule." ·
"A push does apply ground statuses." `core/ground.ts` owns every way a unit meets the ground: `enterGround`
(a step, a sidestep, a push), `groundAtActivationEnd`, and `paintGround` (a layer painted under a standing
unit). Burning and poisoned ground are layers only: the glyphs `b`/`p` paint `layer.burning` /
`layer.poisoned` on open ground at setup, named for the map; `TERRAIN.BURNING` (7) and `POISONED` (8) are
retired. Lava's Burn is `appliesOnEnter`/`appliesOnActivationEnd`; its hazard is the 3 fire only.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `groundComesToYou` | A layer painted under a standing unit — does it get the layer's entry beat? | **Yes, whoever paints it**: the band, a trigger's `layer.paint`, the encounter's setup paint and a map's own `b`/`p` all go through `paintGround`, which gives each standing unit on a painted hex the entry beat of the ground it now stands on (a Burn/Frost cancel leaves bare ground: nothing). | The review's reading taken under "as proposed" (DECISIONS.md, E3): the band's rule, "the ground came to it", made the one rule. Setup and map paint land before anyone stands there, except heroes already placed under an encounter's setup paint. | provisional — 2026-09-28 |
| `pushGroundLandingHex` | A push that carries a unit several hexes — which hexes' ground does it meet? | **The hex it leaves the mover in, only** — every beat there, before any collision cost. The hexes it slides across are not entered. | §3.2 "Being knocked into lava is *entering* it" names the hex the push ends in; a slide is not a walk. The expect's "knocked through water" is read as knocked into it. | provisional — 2026-09-28 |
| `nightSparesBurning` | The darkness condition falls on a map with burning ground (now a layer) — does the night paint over it? | **No — burning ground stays burning and lit**; every other hex goes dark (a frost, poisoned or cursed hex still takes the night, as before). | COMBAT-DESIGN.md 261: "any hex with the burning status … is revealed regardless of range." Before, 'b' was terrain and survived the night by being a different field. | provisional — 2026-09-28 |
| `areaFallNoEntryBeat` (kept) | The area fall paints its layer as it lands — through `paintGround`? | **No, it stays outside the one rule**: the landing's own damage and statuses are the whole landing (the row above, 2026-09-28). | "3 Weak" and "2 fire damage and 2 Burn" are the rulings' totals; an entry beat on top would add one. | provisional — 2026-09-28 |

## The prior-art audit — tool.prior-art-audit (2026-09-28)

Andrew, 2026-09-28 (DECISIONS.md "the duplication review, ruled" — the review page's Prevention section,
"fine as proposed" — and "the opening is tested with the player's party": "we need to check features aren't
copying something the engine already has"). `tools/prior-art.mjs` inventories the four packages'
hand-written source; `tools/audit-all.mjs` writes `.state/inventory.json` and prints what is new since the
last run; the gate's flag "prior art — nothing new copies what exists" runs it on an item's uncommitted
changes and holds the landing for review unless the spec has a "Prior art:" line. The first three rows
are tooling questions, which DISPLAY-RULES 18 homes in GBH's SWITCHES.md; this chat cannot reach GBH,
so they are here until moved.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `priorArtSharedFloor` | "Overlapping by 75%" — of which list, and how few shared members count? | **75% of the smaller list, and at least 3 members shared.** | OUTCOMES (3) is a stale half of Outcome (6): measured on the larger it would pass unflagged. Two shared words ("hero", "enemy") match half the tree. | provisional — 2026-09-28 |
| `priorArtWhatIsAName` | "A function or constant" — which top-level names count for "same name, second home"? | **Every top-level function (3+ letters); every exported const/let/class/enum; and a module-level table (`[`, `{`, `new`, `Object.freeze`) whose name is a CONSTANT (4+ capitals).** An alias (`= a.b`), a `require` and a script's own `const OUT = …` do not count. | Taking every module-level const flagged `HERE`, `OUT` and `argv` in fourteen tools; taking only exports misses `HELD` and `fnv1a` (E13, K12), which were not exported. | provisional — 2026-09-28 |
| `priorArtClones` | jscpd — which version, what size of clone, and where installed? | **jscpd 4.3.0, its default minimum (50 tokens), exact clones, in `tools/jscpd/` with its own package.json** (`npm ci --prefix tools/jscpd`). A clone counts at the gate when a fragment sits on one of the item's added lines. | Its own folder, so installing it never re-resolves the engine's node_modules (the Windows install's platform binaries). jscpd is pure JavaScript. | provisional — 2026-09-28 |
| `priorArtFunnelPrimitives` | Which calls stand for each ruled funnel (`tools/prior-art-funnels.json`)? | **Entering a hex: `appliesOnEnterOf`, `stripsOnEnterOf`, `layerAppliesOnEnter` outside ground.ts/terrain.ts/maps.ts. Direct typed damage: `flatDamage`, `spendAbsorb`, `applyDamage` outside pipeline.ts/mitigation.ts/mutate.ts. Applying an effect: a `case`/`===` on one of `TriggerEffect`'s kinds outside trigger.ts. Counting hands: a read of `.hands` outside items.ts.** | The review's E1, E3 and E7 are exactly these calls; E5's second and third interpreters are exactly these dispatches. `fix.one-effect-vocabulary` and `fix.one-hero-assembly` will add `dealDirectDamage` and `handsOf`; the file names them when they land. | provisional — 2026-09-28 |
| `priorArtOtherPackages` | The gate reads the engine's diff — what of the content, kingdom and viewer halves of an item? | **Their uncommitted changes, per repository, go into the same check.** A half committed before the gate runs is caught by the next `audit-all` (the inventory diff), not by the gate. | The gate cannot know which earlier commits in another repository belong to the item. | provisional — 2026-09-28 |

## The wrong-home audit — tool.wrong-home-audit (2026-09-28)

Andrew, 2026-09-28 (DECISIONS.md "the opening is tested with the player's party …"): "…or that the engine
had something that was supposed to be somewhere else and we need to remove it from the engine."
`tools/wrong-home.mjs` writes the removal list, `generated/wrong-home.md`; the gate's flag "wrong home —
nothing another package owns" holds a landing that adds to it for review unless its spec has an
`Engine rule:` line.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `wrongHomeContentFamilies` | Which ids are content? | **A family the Codex authors** (every id family in `content/hbt-content.json` and `settled.json`, test excepted) **and not one of the engine's own names** (`generated/vocabulary.json`: events, effect kinds, hooks, outcomes, layers, terrain). A typed row counts even before its Codex row exists (the drake's attacks); a name read by core/ai/sim counts only when the Codex has the row (`rule.kite-step` is the AI's, not the Codex's). | "Codex owns the rows" (2026-09-02); an event `attack.declared` shares a family's word and is the engine's. | provisional — 2026-09-28 |
| `wrongHomeRuledEngine` | What is ruled the engine's own and never listed? | **`engine/src/content/terrain.ts`, the ground table** (DECISIONS 2026-09-28 C6). A file or its ids join `tools/wrong-home.json` only with the ruling quoted. | The only ground/rule ruling so far; the rest is for Andrew as the list is read. | provisional — 2026-09-28 |
| `wrongHomeKingdomKeys` | What is a kingdom fact in engine source? | **A number (or table) under `xp`, `xpByTier`, `gold`, `price`, `renown`, `upkeep`, `wage`.** None is in the engine today; the check is a guard. | The campaign's quantities (KINGDOM-DESIGN.md); nothing in the engine should hold one. | provisional — 2026-09-28 |
| `wrongHomeDisplay` | What is a viewer display fact in engine source? | **A colour literal (`#rgb`, `#rrggbb`, with alpha) outside `src/view`** — the engine's own text renderer may colour. | The viewer owns how a battle looks (VIEWER-CONSTITUTION.md). | provisional — 2026-09-28 |
| `wrongHomeMarker` | How does an item say a value is the engine's? | **A line `Engine rule:` in the spec naming the ruling.** | The prior-art flag's `Prior art:` pattern. | provisional — 2026-09-28 |

## The opening's party — fix.opening-party (2026-09-29)

Andrew, 2026-09-28 (DECISIONS.md "the opening is tested with the player's party, not the Alpha Team"):
"Opening battles should be tested with a party the player should have at that point." The rules are
`progression/OPENING-PARTY.json` (written by `progression/build-schedule.mjs`); the draw is
`src/content/opening-party.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `openingDraftPick` | Which of the three offers does the test draft, and who is offered? | **Both seeded: three not-yet-drafted pool rows sampled, one taken, on the `draft` stream keyed (draft ordinal, offer 0 / take 1) under a root seed from the replicate alone** — so a replicate's party at battle n extends its party at n-1, and replicates sample the parties a player could have. | The kingdom's draft (`kingdom/src/core/opening.ts` offerDraft) has the same shape; a player's pick is a choice, not a roll, and no "best pick" is ruled. | provisional — 2026-09-29 |
| `openingPool` | Which heroes can be drafted? | **The Eve-of-Ruin 24 base heroes (`content/gen/heroes.json`, `path: 'base'`), in that file's order**, each on its row's own kit (`defaultItems`). | The kingdom's campaign pool is five rows "pending its own draft migration" (`kingdom/src/content/heroes.ts`); the sandbox already offers the 24, and five cannot field the Gates' six. | provisional — 2026-09-29 |
| `openingPartyLevel` | What level are the drafted heroes through the opening? | **Level 1 at all six.** A level above 1 is refused by `openingPartyOf` rather than guessed (it would need drafted powers). | KINGDOM-V2-2026-09-07.md: "XP thresholds and exact eligibility are not settled" (first level-ups proposed after battle 3). | **overturned 2026-09-28** — Andrew: "They need to be leveling up"; the Orphanage pays 20 XP (DECISIONS.md). Built by fix.opening-first-level. |
| `openingCarriedHolder` | Who holds the Flaming Longsword from the Bridge on? | **The first drafted hero who can wield it** (the item's `classRestriction`, none for the longsword — so the first drafted hero). It takes the place of that hero's kit weapons; the kit's shield and armour stay; the replaced weapons are not stowed. | The backlog note's default. It can put a sword in a Ranger's or a Mage's hands; who equips it is the player's call, and nothing rules it. | **overturned 2026-09-28** — Andrew: "it only is going to help the paladin or the warrior" (DECISIONS.md). Built by fix.opening-levels: only a drafted Warrior or Paladin, nobody when neither. |
| `openingCivilians` | Are rescued civilians fielded in later opening battles? | **No — each battle fields only the encounter's own civilians, as the encounter places them.** | The backlog note's default; rescued civilians join the roster (DECISIONS 2026-09-28 "answers to the 22 questions"), but whether they deploy is the player's. | provisional — 2026-09-29 |
| `openingBetweenBattles` | Do wounds or item rewards carry between opening battles in the probe? | **No.** Every battle starts whole; the only carried reward is the Flaming Longsword. | Wounds (and the one-of-three item reward from battle 3) are the kingdom's (`kingdom.opening-loop`), not the probe's. | provisional — 2026-09-29 |
| `openingScheduleRegen` | Does rebuilding the opening regenerate the 20-battle schedule? | **No: `build-schedule.mjs --opening` writes only `OPENING-PARTY.json`.** | Re-run on today's `content/gen`, the 20-battle run no longer reproduces the 2026-09-03 file (battle 1 differs), and the hero-assembly oracle and the battle-20 cursor cases read that file. Re-deriving it is its own item. | provisional — 2026-09-29 |
| `openingScenarioReplicate` | How does a sweep over replicates of an opening scenario get each replicate's party? | **`scenarioOptions(s, replicate)`.** Spreading a different `replicate` over `scenarioOptions(s)` keeps the party drafted for the scenario's own replicate (0). | One resolution point; the probe and every existing caller are unchanged. | provisional — 2026-09-29 |
| `openingSpecialty` | Which specialty does a hero take at level 2 in the opening? (fix.opening-first-level) | **build-schedule.mjs's SPECIALTY per class** — Bloodrage, Bowmaster, Assassin, Fire Master, Shepherd, Sacred Shield — written to `OPENING-PARTY.json` `specialties`. | The specialty is the player's choice at the first level-up (levels.json rules); nothing rules which a player takes. The 20-battle schedule already made this choice. | provisional — 2026-09-29 |
| `openingLaterXp` | What XP do the battles after the Orphanage pay in the probe? (fix.opening-first-level) | **None yet** — only the Orphanage's ruled 20. The kingdom's per-battle XP is fix.opening-levels'. | The ruling fixed battle 1 only. | provisional — 2026-09-29 |
| `openingOrphanageLighter` | Which Orphanage Zombie goes at the start, and which later arrival? (fix.opening-orphanage-lighter) | **The (19,5) Zombie and Turn 5's from the left edge (0,6) go; (19,3) and Turn 4's from the bottom edge, left of the water (9,13), stay.** | Andrew, DECISIONS.md 2026-09-28: "Let's remove an early zombie and a later zombie." — which of each is not said. The backlog note's default: the kept arrival comes from the side the heroes face, and the later of the two is the one dropped. | provisional — 2026-09-29 |
| `openingOrphanageArrivals` | Where do the Orphanage's Turn 2 and Turn 3 Zombies arrive? (fix.opening-orphanage-arrivals) | **Turn 2's from the right edge at (19,5), where the removed starting Zombie stood; Turn 3's from the left edge, centre (0,6), where the removed Turn 5 arrival came in.** | Andrew, DECISIONS.md 2026-09-29: "Battle 1: Let's add a zombie on turn 2 and a zombie on turn 3." — where is not said; the two hexes already ruled for Orphanage Zombies. | provisional — 2026-09-29 |

## The opening's draft — fix.opening-draft (2026-09-29)

Andrew, 2026-09-28 (DECISIONS.md 'the first hero: Leadership ...', 'no Health minimum; ... the draft pick is
weighted', 'the draft never repeats a class until all six are drafted'). He gave the shape, not the numbers.
The rules are `progression/OPENING-PARTY.json` (`firstHero`, `crucible`, `draftScore`, `classes`, written by
`progression/build-schedule.mjs`, which reads the Crucible's files); the procedure is `src/content/opening-party.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `openingFirstHeroPick` | Which row is the first hero? | **One pool row drawn on the `draft` stream (any class), keyed by the replicate.** | "You're not drafting, you're just taking one. You don't get to see the stats." | provisional — 2026-09-29 |
| `openingPositiveBadge` | What is a "positive badge"? | **The Crucible's rollable badges in its favourable category** (`crucible/data/badges.json`), drawn by its rarity weights (`shim.js` RARITY_WEIGHT); never one the hero already has. | The backlog note's default. | provisional — 2026-09-29 |
| `openingLaterRolls` | How many badges and points does a later draft roll? | **The Crucible generator's own**: one of its six gain/loss shapes, a stat never twice, each change the stat's step (a Health point is 2 Health) held at its floor against the bare row; 1-3 badges at 55/33/12, the first favourable at 75% and unique against the party and the hand, the rest favourable at 62% (`crucible/index.html` generateCrucibleHero, read by the builder). | "we use the Crucible randomness". | provisional — 2026-09-29 |
| `openingDraftWeights` | How much is each stat point worth to each class? | **`build-schedule.mjs`'s W table**, per unit of the stat, with Armor and Resist raised to the class's own best weight. A rolled badge counts by its stat values. | "If you're a range class and you get precision, that's better. If you're a melee class and you get strength or health, that's better. Armor is always amazing. Resist is always amazing." | provisional — 2026-09-29 |
| `openingNoMeleeBonus` | How much more is a melee hero worth while the party has none? | **+4** — about one top-weight stat point, so a mage with two good points outscores a bare melee hero. | "It is better to get a tank early if you don't already have one, but ... it's not absolutely better." | provisional — 2026-09-29 |
| `openingMelee` | Which heroes are melee? | **`class.warrior` and `class.paladin`, and any hero whose kit has no ranged attack** (the kit's derived AI is `melee-aggressive`). | The backlog note's default. | provisional — 2026-09-29 |
| `openingCutBadges` | A badge the Crucible still rolls but the Codex has cut? | **Not rolled; named in `OPENING-PARTY.json` `crucible.badges.notInCodex`** (today `badge.brittle`, cut 2026-08-25). | The Codex owns the badges; the engine cannot field a badge it does not have. | provisional — 2026-09-29 |
| `openingRollUnfielded` | A rolled point no unit mod can take? | **Kept on the hero's record and named (`unfielded`), not fielded**: Item Slots (a kingdom quantity) and Toughness. | seam.unit-mods takes the engine's stat names only. | provisional — 2026-09-29 |
| `openingKingdomClasses` | The kingdom's pool has four of the six classes — when does its class rule lift? | **When every class the pool can offer has been drafted.** | The pool is short of the Rogue and the Mage "pending its own draft migration" (kingdom/src/content/heroes.ts); a class it cannot offer must not hold the draft shut. | provisional — 2026-09-29 |

## content.afflictions-revised — the four afflictions, 2026-09-29

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `afflictionCompanionsOnlyOnNewGrant` | A hero who already carries Vampirism is bitten and the roll succeeds — is Cold Heart granted? | **Only when the affliction itself is newly granted.** A hero already carrying it gains nothing (a badge is never granted twice either way). | "when the affliction of Vampirism happens, it grants both" — the affliction happening is the grant. | provisional — 2026-09-29 |
| `deathbedFightingPercentIsPoints` | Is "+15% to deathbed fighting" 15 points on the chance, or 15% of it? | **Points**: 20 + 5 × Toughness + 15. Named on the row as "+15 Deathbed Fighting"; the engine cannot yet read it (a gap). | The Deathbed chance is itself a percentage; the Glossary and audit carry `deathbedFighting` as a stat. | provisional — 2026-09-29 |
| `vampiricFlightName` | What is the flight power called? | **`power.flight-vampiric`, "Flight (Vampiric)"** — the flight ladder's fourth row: Movement + 1, 2 Stamina. | Named nothing in the ruling; the ladder's own naming (`power.flight-swift`, `power.flight-labored`). A new instance, free to rename. | provisional — 2026-09-29 |
| `coldHeartRarity` | Cold Heart's rarity? | **`acquired`** — added in game, never rolled; not `affliction`, which is "the family of four". | `_rarityTaxonomy` in content/gen/badges.json. | provisional — 2026-09-29 |

## rule.badge-immunity — immunity from badges, 2026-09-29

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `immunePoisonIsBoth` | "immune to poison" (Rotting Flesh) — the Poison status, poison damage, or both? | **Both**, as an element: the word names a damage type and a status. | "Fire and burn are the same thing ... immune to cold ... resists both frost status and cold damage" — the element reading, applied to the one other word that is both. | **retired 2026-09-29** — immunity is resistance (`rule.immunity-is-resistance`): "immune to poison" is +1 Poison Resist |
| `immunityGainedClearsStatus` | A unit gains an immunity mid-battle while it carries that status — does the status stay? | **Removed at once**, the badge the cause. | Immune means it does not have it. | **retired 2026-09-29** — a resist never refuses or removes a status (COMBAT-V2-DESIGN §8.2; `rule.immunity-is-resistance`) |
| `immuneNumberedRows` | "Immune Frost 1", "Immune poison 1", "immunen to fire 1", "immune weak" on an aura — compiled? | **No: named gaps.** A number after an immunity is not immunity (a resistance of 1? a stack cap?), and an aura's immunity is the allies'. | Never guess a number's meaning. | **answered 2026-09-29** (Andrew, DECISIONS.md: "Yes" — a resistance of 1): built by `content.immune-one-is-resist`; "Immune weak 1" and the aura rows stay named gaps |

## rule.cold-resist — Cold Resist, 2026-09-29

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `coldResistAndFrost` | Does Cold Resist lessen the Frost status (Frost adds damage to hits the unit takes)? | **No — Cold Resist mitigates cold damage only.** Immunity to Cold still refuses Frost. | Fire Resist lessens Burn because Burn's tick is fire damage; resistance "changes damage only, never the status clock" (V2 §8). Frost deals no damage of its own, so there is nothing of it for a resistance to take off. | **answered 2026-09-29** (Andrew, DECISIONS.md: "Every type of resistance should work the same") — COMBAT-V2-DESIGN §8.2, as built; "Immunity to Cold still refuses Frost" is retired with immunity |

## content.ghost — the Ghost, 2026-09-29

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `ghostAttackReadsStrength` | The bestiary's Ghost "Attack" has no damage number — what does it deal? | **Strength + 0, magic-typed** (the bestiary's damage type). | The bestiary's other plain melee attacks read Strength; its type is the row's. | provisional — 2026-09-29 |
| `ghostPossessReadsMagic` | Possess deals 0 in the bestiary; the engine's damage is always a stat plus a bonus. | **Magic + 0** — the Ghost's Magic is 0, so it deals exactly 0 while its Magic is 0. Its 25% fires **onHit** (onDamage never fires on 0). | Copy, don't invent: 0 is the authored number. | **retired 2026-09-29** — Possess dropped (`content.ghost-possess-on-attack`) |
| `ghostPhaseLeftOut` | Phase: "grant a stat for the Battle", value 2, no stat named. | **Left out**, named in the row's source. | The bestiary names no stat. | provisional — 2026-09-29 |
| `ghostPossessAi` | When does a Ghost choose Possess (0 damage) over Attack (4)? | **Never, as built** — the AI takes the damaging attack (40 battles: 53 Attacks, 0 Possess). No existing hint (`use: 'whenever'`, `belowHalfHp`, `minEnemiesStruck`) fits "sometimes". | A design choice — brought to Andrew. | **answered 2026-09-29** (Andrew, DECISIONS.md: "move it to a chance on attack ... 15%"): Possess dropped, the Attack possesses at 15% (`content.ghost-possess-on-attack`) |

## rule.primary-ends-activation — the activation that ends itself, 2026-09-29

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `primaryEndsBySlot` | Does a non-free action spent in the **movement** slot (an `either` attack taken as the movement action) end the activation, as a non-free primary does? | **No — only a spend of the primary slot ends it.** The movement-slot spend is the movement action; the activation stays open for the primary. As built: executeBattleCommand closes the cycle on `primaryUsed`, which only a non-free primary-slot spend sets (`spendAction`). | The ruling names "your primary action"; the slot law (DECISIONS.md 2026-09-04: "two actions in every activation: movement and primary") makes the slot, not the action's profile, what is primary. | provisional — 2026-09-29 |

## command.end-player-phase — End Turn, 2026-09-29

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `forgoneActivationRunsLadder` | Does a hero whose activation is forgone by End Turn still run its End of Activation ladder (ground, `onActivationEnd`, the status tick)? | **Yes — it begins, idles (`activation.idle`, reason `forgone`) and runs the ladder**, exactly as a blocked (stunned) unit does. No Surge check. | Statuses tick once per unit per Turn at its End of Activation (ruled 2026-08-26); skipping the ladder would let End Turn dodge Burn and Poison. | provisional — 2026-09-29 |
| `endPhaseMidActivation` | May End Turn be given while a hero is mid-activation (moved, primary unspent)? | **Yes — its cycle closes as `end-cycle` closes it** (the Surge check runs where the rules run it; a Surge reopens that hero's cycle), and every other unacted human hero forgoes. | The button is on screen while a hero acts; one command, not end-cycle then End Turn. The Surge belongs to the activation already under way. | provisional — 2026-09-29 |
| `endPhaseSparesAi` | Does End Turn also skip AI-controlled units still in the Phase queue (a hero outside the human policy, or one under an `aiControlled` status)? | **No — only human-controlled heroes forgo;** AI-controlled units take their activations in queue order. | The ruling is the player ending *their* turn; skipping a charmed hero's activation would make End Turn an escape from it. | provisional — 2026-09-29 |
| `yetToActSkipsBlocked` | Does the pop-up's list (`heroesYetToAct`) name a stunned or downed hero? | **No** — only standing heroes able to act, human-controlled, not yet begun. A stunned hero idles by itself either way. | "Units that have not acted" asks about choices the player is leaving unused; a stunned hero has none. | provisional — 2026-09-29 |
| `endPlayerPhaseAnyPhase` | Is `end-player-phase` refused outside the Hero Phase? | **No — it ends whichever Phase the human side is choosing in** (the cursor at a selection, or a human-controlled hero acting). In the opening battles that is always the Hero Phase. | The command reads the control policy, not the side; the cursor already only waits on the player in a Phase they act in. | provisional — 2026-09-29 |

## preview.from-planned-hex — the forecast from a planned hex, 2026-09-30

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `plannedHexProvokes` | What does the forecast do with an attack of opportunity on the planned path — roll it, assume it hits (the walk stops), or assume it misses? | **Record it and walk on as if it missed:** each provoke is listed (`at`, `from`, the holder's chosen `attackId` by the swing's own rule `aooChoice`, and that swing's `preview()` against the mover where it stands), and every number after it is read at the planned hex. The holder's reaction stamina is not spent on the fork. | Rolling it on the fork would show the player a future named-stream roll (Law 4); "the plan shows its costs before commit" (UI-BUILD-NOTES §5) asks for the provoke points and their odds, and the ghost's forecast is "if you arrive". | provisional — 2026-09-30 |
| `plannedHexWalk` | Is the planned hex placed, or walked? | **Walked** — the fork runs the real `executeAction` (the one step loop): points, stamina, the slot, ground entered on the way. A step that would down the mover (lava) or stop it (Root) forecasts `arrives: false` with the hex it would reach. | "Equals the preview taken after actually moving there, number for number" — only the real walk makes it equal by construction (Law 1). | provisional — 2026-09-30 |
| `threatQuery` | "Pointing at an enemy lights up where it can move and hit": moved with what budget, hit with which attacks, onto which hexes? | **Move:** every destination on THE action list of a fork where the unit's own next Activation has begun (`beginActivation` — Movement through the stat pipeline, Slow, Root; nothing else that would happen before it is projected). **Hit:** every hex one of its ready attacks reaches (canAttack's geometry, `attackReachesHex`: range, the ranged-adjacent ban, the line) from where it stands or from the forecast of any of those moves — whether or not a unit could stand there. A charge is left out of `hit`. Its own hex is in neither. | The ruling asks for the enemy's reach as the engine would judge it; the budget is the one its Activation would read. Standability and charges are the viewer's and a later item's refinements. | provisional — 2026-09-30 |

## encounter.opening.bridge-ai — why the Bridge never ended, 2026-09-30

The stall (encounter.opening.bridge, cut 2026-09-28): the kite's position ladder
(`src/content/ai-modes.ts` POSITION) put **safety strictly ahead of a shot**, "safe" being out of every
melee enemy's Movement + 1 (`meleeThreatens`). An Imp's Blast reaches 4; a walking hero threatens 5 or
6; so no hex is ever both safe and a shot. The Imps fly 7 and the heroes walk 5, so the Imps always
found a safe hex, never shot, and a melee hero could never catch them: nobody attacked for 14 Turns.
Neither the bridge deck nor the deep water was the cause — they only give a flier room to keep away.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `aiKiteAlone` | A kiter that can never be both safe and in a shot — what does it do? | **While a melee ally of its side stands, nothing changes. With none, the row's `positionAlone` ladder: a safe shot, then any shot, then height, then spacing — the shot read by canAttack's geometry (`clearShot`: reach, the ranged-adjacent ban, the line), not distance alone.** Rows `ranged-kite` and `support` carry it. | The kite's own comment: "the shot is the point". Holding back is right while someone else holds the line; with nobody holding it, a warband of kiters that never shoots can only stall. Scoped to the unscreened kiter so the control battles stay byte-identical; the battle-cursor cases where a kiter is left alone moved (Law 10, `test/fixtures/battle-cursor-kite-alone.json`). | provisional — 2026-09-30 |

Noticed, not changed:
- **`canShoot` ignores the line.** The screened ladder still reads a shot as distance against reach, so
  two shooters with a standing shaft or a drowned stone between them each read "a shot" where they stand
  and neither moves. The unscreened ladder reads `clearShot`; moving the screened one too changes six
  control maps (thicket, proving.ruin, dungeon-16x8, high-prop-single, high-prop-multi, well-shove) — its
  own item, declaring `changesBaseline`.
- **A melee hero closes by straight-line distance** (`meleeAggressive`'s fallback), so with its enemy
  across the river it walks to the water's edge and stands there. The Bridge still ends — the Imps come
  to it — but the heroes lose most seeds: of 100 replicates on the party drafted by battle 3, 99 wipe
  and 1 is won (on the 2026-09-30 deck map in the content working tree: 98 and 2). Whether the Bridge
  wants other numbers is Andrew's.
- **"out of stamina"** is the kiter's idle reason whenever stamina < 1 — always, for an enemy with no
  stamina pool — even when the truth is "no target in range".

## encounter.caravan-aftermath — 2026-10-01

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `caravanZones` | Where do the caravan's sides start? | **Heroes: a 4-hex zone within 2 of (1,5), the west end of the road (it enters the west edge at row 4). Foes: the Bloodhounds at (29,10) and (29,11) in front, the Imps at (31,9) and (31,11) behind them — the east end, where the road leaves at rows 10–11.** All on open ground, none on a fire or a corpse. | Ruled: "from the far end of the road … the heroes at the near end" (DECISIONS.md 2026-10-01); which end is near is the reading — the road runs west to east and heroes west is the carried default. | provisional — 2026-10-01 |
| `caravanBlocked` | The scene measures 13 obstructed hexes and 5 standing pockets walled off by wreckage. In the engine? | **All 18 are high obstacles ('x').** The engine has no wall along a hex edge, so a pocket the measure cut off would be walkable from its neighbours; marking it solid keeps the engine's map to what a body could reach in the scene. | The handoff: "Respect physical wreck obstructions"; measured usability is an authoring fact, the engine's own map is what is legal. | provisional — 2026-10-01 |
| `caravanGround` | The caravan's cursed corpses and ground fires — which engine ground? | **The corpses are cursed ground, layer.weak; the seven ground fires layer.burning; both painted by the encounter at setup from the map's own ground lists (content/gen/painted-maps.json `ground`, read through `"paint": [{"layer", "ground"}]`), never retyped.** The four cart-fire sites stand on wreck hexes and stay decorative. | DECISIONS.md 2026-09-28 "cursed ground is layer.weak"; the ruling 2026-10-01 ("ground fires burn, corpse hexes cursed (Weak)"); a visual effect never silently applies damage — the layer does, in the engine. | provisional — 2026-10-01 |

## fix.codex-numbers — 2026-10-01

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `enemyCritIsTotal` | Which authored enemy crit values are totals over the engine's base 3 (the item: "enemy crit values authored as totals are published the same way")? | **All of them: every authored enemy `crit` is the unit's whole crit chance before gear, and the pack carries crit − 3.** Fifteen rows change: Powerful Imp 5→2, Imp Master 10→7, Lieutenant Demon 5→2, Bloodhound, Hellhound, Zombie Hound, Demon Hound 10→7, Vampire 7→4, Vampire Lord 12→9, Doombringer 25→22, Dark Sniper 10→7, Nightstalker 10→7, Shadow Sorcerer 7→4, and the Iron Colossus and the Eyeblight 0→−3 (their crit chance is 0 before surplus). An enemy with no authored crit stays at the base. | The rows themselves read as totals: the Eyeblight's note "this thing has Crit 0, so the surplus is its only crit"; COMBAT-DESIGN "some enemies crit far above the base 3". The ruling (DECISIONS.md 2026-09-28): "Crit base 3 should be counted once." | provisional — 2026-10-01 |
| `dictatedBlockOverCompensation` | The Green Drake's dictated block (2026-08-20: Health 12, Strength 4, Precision 3) or the later Child compensation (2026-08-25: +1 Strength, +1 Precision, +4 Health on every Child-origin hero)? | **The dictated block, whole: Health 12, Strength 4, Precision 3.** The compensation was added to the ported block, which her dictation replaced. | DECISIONS.md 2026-08-20 "the Beast pen are PLAYER beasts": her blocks win over the ported ones; the item's expect: "the Codex beast rows match the dictated numbers". | provisional — 2026-10-01 |
| `deathbedBadgePoints` | A badge's Deathbed points ("Deathbed +40", Vampirism +15): a folded stat, like Toughness, or the badge's own field read at the roll? | **The badge's own field (`deathbedFighting` on the badge row), read at the roll, as rule.badge-deathbed-fighting built it.** The new foldable `deathbedFighting` stat carries every other source — a level pick ("+20 Deathbed Fighting", the Priest's level-5 option), an item (Enduring armour +10). The converter never folds a badge's Deathbed points as a stat, so they count once. | Read at the roll, a badge gained mid-battle (an affliction from a bite) counts from then on; a folded stat waits for the next fielding (fix.badge-surge-at-fielding). | provisional — 2026-10-01 |
| `bleedOutFloor` | A hero's bleed-out counter with enough negative bleedOutTurns to reach 0 or below? | **At least 1.** A counter that starts at 0 would kill on the same settle that downed the hero; no badge says that. Death Seeker alone gives 2. | The ruled 5 is a count of Hero Phases to live; 0 is no bleed-out at all, which only Wounded rules. | provisional — 2026-10-01 |
| `badgeClauseSentences` | Death Seeker's payload separates its clauses with full stops ("Turns to Bleed out -3.  Deathbed +40.   OTD: gain 2 stamina"). One clause or three? | **A full stop followed by a space ends a clause, like `·`, `;` and a comma.** Five badge rows split differently; only Death Seeker compiles more (its −3 bleed-out and +40 Deathbed); the others' gaps are only cut finer. | The payloads are prose from the workbook; the converter's clause splitter is the reading, never the row. | provisional — 2026-10-01 |
| `codexNumbersRefiled` | fix.codex-numbers was filed with no probeIds, so gate 1 probes an id that is not a content id and the kill switch disables nothing: it can never pass as filed. Land how? | **Park the work (git stash), abandon fix.codex-numbers with that reason, re-file it through tools/add-item.mjs as fix.codex-numbers-refiled with probeIds unit.bloodhound and hero.base.rogue-raven (two rows whose crit it changes), restore the work, land the re-filed item.** | Andrew's ruling for exactly this case, 2026-09-30 (DECISIONS.md "encounter.opening.bridge-ai: park, abandon, re-file": "Park, abandon, re-file"); the backlog is never hand-edited. Nothing `needs` fix.codex-numbers except kingdom.reads-engine, whose `needs` no tool can edit — left open, as with the bridge. | provisional — 2026-10-01 |

## content.afflictions-at-zero — 2026-10-01

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `fragileStacksAsGap` | Fragile "keeps stacking with no limit", but the engine holds a badge once (grantBadge: a badge held twice is once). How does the content half carry the stacking? | **The Codex row says `stacks: true`; the pack carries Fragile's −1 maximum Health as a stat and its stacking as a named gap on the compiled row (rule.afflictions-at-zero).** No new engine flag here: a badge that can be held many times is a mechanism, and the engine half owns it. | DECISIONS.md 2026-10-01 'the afflictions at 0 Health': "What the engine cannot yet do is a named gap on the row, never dropped" (the item's spec). | provisional — 2026-10-01 |
| `afflictionAtZeroRows` | How do the four affliction rows record what happens at 0 Health and which art the pop-up shows? | **Each row carries `atZero` (structured: Deathbed roll or not, what it transforms into or raises and on which side, what it gains, and the ruled text), `afflictionArt` (the key into each hero's `afflictionArt`, which build-heroes already records beside the hero's own `art` — the before and after), `popUp` (what the pop-up explains), and a `needsCapability` naming rule.afflictions-at-zero.** The converter names `atZero` as a gap on each compiled badge. | The ruling's bullets, transcribed; the art already exists on the hero rows (36 of 258 heroes have at least one affliction card, 26 all four), so the badge names the key, not a second copy of paths. | provisional — 2026-10-01 |
| `rottingFleshBleedOutPhrase` | "+5 to the bleed out timer" — which wording on the payload? | **"5 extra turns to bleed out"**, the Codex's own phrasing (Survivor, Thick Blooded), which the converter already compiles to bleedOutTurns +5. | One wording for one fact; no new parser clause. | provisional — 2026-10-01 |
| `rottingFleshBleedOutMidBattle` | Rotting Flesh inflicted mid-battle (a Zombie's Claw): does its +5 bleed-out count in that battle? | **Not until the next fielding**, like every stat the runtime never resolves (fix.badge-surge-at-fielding, 2026-09-29: "It can be loaded on load"); a hero fielded with it bleeds out over 10. Left for rule.afflictions-at-zero to rule otherwise. | The existing rule for badge stats gained mid-battle; the 2026-10-01 ruling does not say. | provisional — 2026-10-01 |
| `afflictionsRefiled` | content.afflictions-at-zero was filed without changesBaseline, but its own ruled content moves the control battles' log text (a Zombie-inflicted Rotting Flesh's badge.gained line lists its +5 bleed-out and its at-0-Health gap; state, RNG and results unchanged). Land how? | **Park, abandon with that reason, re-file through tools/add-item.mjs as content.afflictions-at-zero-refiled with changesBaseline true and the same probeIds, restore, land the re-filed item.** rule.afflictions-at-zero still `needs` the abandoned id; no tool edits an existing item's needs — left for Andrew, as with the Bridge. | DECISIONS.md 2026-09-30 "encounter.opening.bridge-ai: park, abandon, re-file"; the backlog is never hand-edited. | provisional — 2026-10-01 |

## fix.one-effect-vocabulary — 2026-10-01

The source: DECISIONS.md 2026-09-28 "the duplication review, ruled" — every finding not named there, "fix as
proposed"; this item carries E5–E8, C7, C13, C14 and C20. One Effect union (`types.ts`), one interpreter
(`trigger.ts applyEffect`, the prior art the item names as the survivor), one `dealDirectDamage` (`status.ts`),
one `planPackets` (`pipeline.ts`). Probe: `test/one-effect-vocabulary.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `effectDamageNames` | Flat damage and stat damage "stay two distinct kinds" — under which names? | **`damage` is flat** (a trigger's, and a power's cost to its caster — was `selfDamage`, now `damage` with `who: 'self'`); **`statDamage` is stat + bonus through the pipeline** (was the power's `damage`). | The trigger log names its effect kind (`trigger.fired … effect`), and the Flaming Longsword fires one in every opening battle from the Bridge on; no log names a power's effect kind, and only three TEST rows said stat `damage`. So the rename that moves no battle. Not `damage.stat`: the gate's naming check reads a quoted dotted word as an id of an undeclared kind (`damage`). | provisional — 2026-10-01 |
| `effectMutatorNames` | "One name per mutator" — which name survives? | **The dotted one:** `stamina.gain` (was also `gainStamina`), `stamina.drain` (`loseStamina`), `knockback` (`push`, its `hexes` now `value`), `status.apply` (the chart's `status`). A move rider's `stamina.gain` carries `who: 'self'`. | The trigger vocabulary's names; the others were the move riders' and the chart's private spellings. | provisional — 2026-10-01 |
| `statModEndOfActivation` | C20, "until the end of your Activation" — when? | **`endOfActivation`: the holder's current activation ordinal** — mid-Activation it goes when this one ends; a holder not acting goes when its next one ends (expiry reads `<=`). The Frenzy Potion (was read as the Turn, with a gap) and Charging Run (was a move gap) now compile to it; the bestiary trigger phrase does too (its one row, the Nightstalker's, stays a gap for its onAttack hook). | The words. | provisional — 2026-10-01 |
| `valueSpecOwnStat` | Block's "Protection equal to 4 + your Armor" as an effect? | **ValueSpec `{ scale: 'stat', stat, base, mult }`** — the acting unit's own effective stat. The retired selfGuard shape compiles to `status.apply` Protection with it and a battle-long Dodge `statMod`; no row carries it today (Knight Block retired 2026-09-23). | GAME-DESIGN §5: "every other stat scales off the acting unit alone." | provisional — 2026-10-01 |
| `aiSupportHealShape` | supportPower played the retired `heal` shape (the Holy Symbol's Heal) before the attack, ranked by the mode's heal tiers. Which effects-list powers does it play now? | **A heal-only power aimed at one ally that spends the primary** (`isSupportHeal`); effectsPower leaves exactly those to it. The Holy Symbol plays exactly as before; Greater Healing Potion and Lay on Hands share the shape and move to it from effectsPower (no battle-cursor case or control battle fields either). The selfGuard rule (rule.self-guard) is retired with its shape. | Keeps every fielded heal's decisions as they were; the shape is the data the retired field stood for. | provisional — 2026-10-01 |
| `healIncludesSelfEffects` | The healIncludesSelf switch read the retired `heal` shape — and now? | **A unit-aimed power with a heal effect** asks it: off, the caster may not aim it at itself. | Keeps the switch's meaning for the Holy Symbol. | provisional — 2026-10-01 |
| `creepingBlightAim` | Creeping Blight "a hex within 5 hexes and every hex adjacent to it" — painted how? | **Aimed at one unit; `layer.paint` `layer.poisoned`, radius 1, around it** — painted once, not once per unit in the area. The row is rewritten to the one ground shape (2026-09-03): "Those seven hexes become poisoned ground." The engine still centres on a unit, not a hex (the row's remaining gap). | The engine has no hex targeting; an area target would paint once per unit standing in it. | provisional — 2026-10-01 |

Noticed, changed with a written reason (Law 10): the Lieutenant Demon's "+1 Health" aura
(`trigger.lieutenant-demon.health-health`) was a Max Health stat modifier that nothing reads — inert since it was
compiled. Through the one interpreter a `statMod` on Max Health moves Max Health by its mutator, as a power's and a
badge's always did, so the aura now works: `showcase.prologue-enemies` moves (battle-cursor layer
`test/fixtures/battle-cursor-one-effect.json`).

## movement.inventory — every movement identified, 2026-10-01

The source: engine DECISIONS.md 2026-10-01 'the movements' (Andrew: "1. Identify all of the movements."). Identifying only:
`generated/movements.{json,md}`, written by `tools/movements.mts`; probe `test/movement-inventory.test.ts`. The findings of
movement.swap-and-shields are carried as missing: the swap's draw or stow (no clip, no ruling) and the six shield powers'
motion (ruled 2026-10-01 'a shield power plays a raise-the-shield motion', engine b91a3f7; filed as viewer.shield-guard-motion).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `movementWeaponClass` | What is a "weapon class"? | **A base weapon row (an item with no `base`); its tiered and enchanted variants fold into it, and a variant's own attack (`attack.war-axe.chop.heavy`) folds into its base attack's row** (counted as variants). Natural weapons (`class.beast`) are listed, noted as natural. | A variant swings the same weapon with other numbers; it moves the same way. | provisional — 2026-10-01 |
| `movementPlayerHolds` | Which actions can "a player unit hold"? | **Every action a non-test item grants, every class power, every badge grant, every attack, power and move on a non-test hero-side unit type (heroes, the Alpha Team, civilians, the player beasts), and every non-test movement power** — a movement power nothing grants today is listed with that note. | The ruling asks for every movement the content needs; a power in the pack is content whether or not a hero carries it yet. | provisional — 2026-10-01 |
| `movementMotionRule` | Which motion does an action play? | **The viewer's own rules today:** melee `attack`; ranged `ranged`, else the body strikes (`attack`, a stand-in); a walk `move`; a flight `flight`, else it walks (a stand-in); a power, a burst, a move in place and the swap play no body motion. Read on the hero bodies the drafted heroes wear (viewer CLASS_LOOKS: Oathblade, Archer). A row is played (every body has its word), partial (some body plays a stand-in), or missing. | viewer src/models.js strike and frame, src/fold.js power.used / burst.declared / loadout.swapped. No motion word is invented (a new one is Angela's). | provisional — 2026-10-01 |
| `movementSelectedFits` | Which selected performance is named for a row with no motion? | **By the use it was selected for (free-motion-study/selections.json, 2026-09-29): Consume ("Drink or consume") for an item use consumed on use aimed at the user or an ally; Stand up (LayToIdle) for a movement power that stands the unit up; the casting gesture (Spell_Simple_Shoot) for any other power or burst.** Named, never bound; shield powers carry their ruling instead. The evasive roll is named for nothing — its record says its action "is not yet decided". | The record's own words for each clip; binding is the viewer's and may need a motion word. | provisional — 2026-10-01 |
| `movementKitWords` | viewer.shield-guard-motion binds `guard` only on a body whose wearer's kit holds a shield, so the Oathblade body plays it for the Iron Dwarf and not for the Brawler. Is that "the same body playing different motions"? (2026-10-02, found when the home chat's combine ran the engine suite) | **No — a kit word.** `guard` is a word the viewer binds on a body only where its wearer holds a shield (viewer SWITCHES guardHolders); two heroes in one body may differ by it, never by any other word, and never by the clip a word plays. The body's row is the union. A shield power's motion is `guard` (was: none), so the six shield rows are **partial**: played on the five bodies a shield-holder wears (Lion of the Host, Dawnblade, Court Champion, Battle Chaplain, Oathblade), on no other. | A body is drawn per hero and each hero's kit decides what it holds; the inventory's per-body cell names what that body plays for the hero who can use the power. | provisional — 2026-10-02 |

## fix.one-hero-assembly-refiled — one assembler, one fold, one hands, one unit.enter, 2026-10-02

The source: engine DECISIONS.md 2026-09-28 'the duplication review, ruled' (findings E10–E14; Andrew: "There should be no
weapon that is zero-handed."). Probe `test/one-hero-assembly.test.ts`. Filed as fix.one-hero-assembly; re-filed (below).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `oneHeroAssemblyRefiled` | fix.one-hero-assembly was filed with changesBaseline true, but its work is byte-identical on every control battle (no control unit carries a natural weapon, an enemy-row badge, an unnamed row or a fixture fielding), so the consequence check could never pass. Land how? | **Park, abandon with that reason, re-file through tools/add-item.mjs as fix.one-hero-assembly-refiled (same spec, expect and needs; no declaration), repoint kingdom.reads-engine with `add-item --repoint`, restore, land the re-filed item.** | SWITCHES.md `afflictionsRefiled` (2026-10-01), the same shape the other way round; the backlog is never hand-edited. | provisional — 2026-10-02 |
| `fieldedDefSignature` | fieldedDef takes `{items, stowed, used, progress, badges, heroMods}` — what of the callers that pass `(typeId, items, progress)` (kingdom/src/ui/equip.ts, kingdom tests, 20-odd engine tests)? | **The positional form is kept as the same call** (`fieldedDef(t, items, progress)` = `fieldedDef(t, { items, progress })`); one assembler underneath. | No caller is rewritten by this item; kingdom.reads-engine moves the kingdom to the options form. | provisional — 2026-10-02 |
| `heroModsInPreview` | Does fieldedDef fold `heroMods` (set bonuses) into the def it returns? | **No — it checks them (Law 9), and the battle applies them to the unit as unit mods (one unit.modified per source), as before.** | Folding them into the def would count them twice in the battle, which applies them after fielding. The Equip card adds them itself until kingdom.reads-engine (K3). | provisional — 2026-10-02 |
| `arrivalKit` | An encounter's setup unit or scheduled arrival goes through the one assembler — with its row's Codex default kit, or authored whole as before? | **Authored whole, as before: its row and its own badges, no kit.** FINDING for Andrew: the opening's civilians placed by encounters (orphans and school children with the pile of rocks, the farmer with the pitchfork, the lumberjack and wife with the axe, the school teacher and the Supper's villagers with a dagger — 19 placements across prologue-1..3, supper, opening.orphanage, opening.lumberjack) carry a default kit they never field: they fight with Punch. | Giving them their kit moves every opening battle; the spec names createBattle and createCustomBattle, not arrivals. Asked, not decided. | provisional — 2026-10-02 |
| `netIsAPower` | The Net (`item.net`) is a weapon row with hands 0. "There should be no weapon that is zero-handed" (2026-09-28) meets "Net needs no hands. Net is just a power, and it's a one-time use." (2-ACTIONS-SETTLED.md; GEAR-DESIGN.md §4 "Net *(a power, no hands)*", 2026-09-02). Which? | **Both: the Net becomes a trinket with no hands, worked from its item slot like every other Waystation one-use row; it still grants attack.net.cast.** | The older is a dated record and names the Net; the newer names weapons. Read together, the Net is not a weapon. The kingdom had been putting it in a hand (Math.max(1, 0)). The spec's list of zero-hand rows did not name it. | provisional — 2026-10-02 |
| `naturalWeaponMasterwork` | The Forge's masterwork rule ("tier-1 two-handers, one-handers, shields and armor", 2026-09-25) kept the natural weapons out by their hands 0. With hands 1, do claws, fangs, horns, hooves and tail gain a masterwork row? | **No — a class.beast weapon is kept out by name** (content/mkenginepack.mjs, kingdom/tools/mk-items.mjs, test/fix-masterwork-scope.test.ts). No new item id. | "Beasts draw nothing — their weapons are their bodies" (kits, 2026-08-27); the hands change is not a reason to invent five Forge rows. | provisional — 2026-10-02 |
| `zeroHandsScope` | "The pack loader refuses hands 0" — every item, or the held ones? | **A weapon or shield with fewer than one hand is refused** (items, tier-3 enchanted and Forge rows alike); an item worn from its own slot (armor, trinket, relic, idol, bloodrune) takes 0 hands, read through core's `handsOf`. | Armor and trinkets take no hand by every ruling; the ruling names weapons. | provisional — 2026-10-02 |
| `foldWritesAuthored` | The three copies of the stat write-back left a row's authored optional stat (crit, luck, toughness, swapCost …) at its old value when a fold brought it back to its unfolded value. The one fold? | **Writes it: an optional stat the row authored is always written; one it did not author stays absent while it holds its unfolded value (0, or swapCost 1).** | The arithmetic is the arithmetic; no control battle moves. | provisional — 2026-10-02 |
| `unitLabel` | createBattle title-cased the whole typeId, an arrival only its last segment. Which label? | **The last segment, title-cased (`unitLabel`).** | The three rows with no name (spirit-snake, shadow-hound-puppy, green-drake) have undotted typeIds, so no name changes. | provisional — 2026-10-02 |
| `assemblyLogLines` | With one assembler and one announcement, an enemy row's own badges and a fixture hero's kit and badges get their unit.badged / unit.equipped lines. Keep the old silence? | **Every fielded unit says what was put on it (Law 12).** Two battle-cursor cases move by log lines and the event counter only, RNG and result unchanged: test.thorns and legacy-surge-cap (`test/fixtures/battle-cursor-one-hero-assembly.json`). | A fixture hero is the scenario hero (expect: "a fixture hero carries badge.hero"); one shape for every fielding. | provisional — 2026-10-02 |

Beast/enemy kits over two hands after the change: **none.** 52 engine rows checked (every enemy-side row and every
class.beast row in UNITS), 240 Codex bestiary rows and the four class.beast heroes: no beast or enemy carries a kit, no
enemy swings a weapon row's attacks, and no unit is handed a natural weapon.

## kingdom.reads-engine — what the engine opens to the kingdom, 2026-10-02

The kingdom's switches for this item are in `../kingdom/SWITCHES.md` (§ kingdom.reads-engine); these are the engine's.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `fieldedPreviewMods` | The Equip card must show the battle's numbers for a set-bonus hero (K3), and fieldedDef does not fold `heroMods` (`heroModsInPreview`). How does a preview read them? | **A second read, `fieldedPreview(typeId, opts)`: fieldedDef's def with each heroMods stat mod added by the one fold (foldStats) — the same sum the battle's applyUnitMods makes on the unit. fieldedDef is unchanged.** | Folding them into fieldedDef would count them twice in the battle, which applies them after fielding; a preview function keeps one def and one sum. | provisional — 2026-10-02 |
| `usesPerBattleMax` | An item's uses for the kingdom (K8) when its powers carry different counts? | **The most any of its powers has (`usesPerBattleOf`); none = permanent (null).** | itemUsesOf marks an instance spent only when every power is; the kingdom keeps one count per instance. No pack row has two such powers today. | provisional — 2026-10-02 |
| `netUsesOnAttack` | The Net (`netIsAPower`: a trinket) is one-use, but its only grant is an attack and it authors no active of its own. Where do its uses go? | **On the attack it grants (`attack.net.cast` uses 1) — content/mkenginepack.mjs, for any one-use row that grants an attack and has no stamina or targets of its own; refused if the attack already carries a different count.** | The engine reads an item's uses off the powers it grants (`itemUsesSource`); only item.net is such a row. | provisional — 2026-10-02 |

## fix.orphans-teacher-knife(-refiled) — the orphans and the school teacher field a knife wherever they are placed, 2026-10-02

The source: engine DECISIONS.md 2026-10-02 'the Net is a trinket with no hands; the orphans and the school teacher start
with a knife' ("The Orphanage, Orphanage, and the school teacher should start with a knife each." · "Dagger is fine.").
Probe `test/orphans-teacher-knife.test.ts`. `arrivalKit` (above) is settled by that ruling for these two rows only; it
stands for every other placed civilian. Filed as fix.orphans-teacher-knife; re-filed (below).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `placedWithKitFlag` | The ruling names two rows that field their kit when an encounter places them; the core may not name a content instance. How does the one assembler know? | **A Codex row field, `placedWithKit: true` (UnitDef), authored as a list in content `gen/civilian-rulings.json` `placedWithKit.ids`, set on the hero by build-heroes.mjs and carried onto the unit row by mkenginepack.mjs; `fieldArrival` assembles with the kit when it is set.** | The same opt-in shape as `heroBadge` (a civilian named in civilian-rulings.json); one assembler, no second kit path; the rest of the placed civilians keep `arrivalKit`. | provisional — 2026-10-02 |
| `placedWithKitEveryEncounter` | "wherever an encounter places them" — the Orphanage only, or the prologue rows too (prologue-1's orphans, prologue-3's teacher)? | **Every encounter: the field is on the row, so the prologue placements field the Dagger too.** | The spec says "wherever an encounter places them (setup units and arrivals)"; a per-encounter flag would be a second rule. | provisional — 2026-10-02 |
| `orphansKnifeRefiled` | fix.orphans-teacher-knife was filed with changesBaseline true ("the opening's control battles move"), but the gate's control battles (tools/baseline.mts, MAP_PANEL) field no Orphan Child, School Teacher or encounter-placed civilian, so they stay byte-identical and the consequence check can never pass. Land how? | **As `oneHeroAssemblyRefiled`: park, abandon with that reason, re-file through tools/add-item.mjs --first as fix.orphans-teacher-knife-refiled (same spec, needs and probeIds; no declaration; expect says the opening battles that field an Orphan Child move — test/battle-cursor.test.ts — and the control battles do not), restore, land the re-filed item.** No item needs the abandoned id, so nothing is repointed. | The precedent of the same day; the backlog is never hand-edited. | provisional — 2026-10-02 |

## fix.opening-levels — the opening's party levels up, the sword is a Warrior's or a Paladin's, the Bridge gives a reward, 2026-10-02

The source: engine DECISIONS.md 2026-09-28 'the opening's party levels up; the Flaming Longsword is a Warrior's or a
Paladin's; the Bridge gives a reward', 'levels by XP at 20, 50, 100, 170, 270, 400' and 'the Orphanage pays 20 XP no matter
what'. The carry: `kingdom/src/sim/opening-run.ts` (the kingdom's XP, curve and rewards) hands each battle's party to
`src/content/opening-party.ts` as an `OpeningCarry`. Probes `test/opening-levels.test.ts` and its kingdom half
`kingdom/test/opening-levels.test.ts`; the report is `kingdom/tools/opening-levels.mts`. `openingCarriedHolder` (above) is
overturned by the ruling.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `openingCarryHome` | The spec wants each hero's XP "by the kingdom's rule" and "never a second XP formula", and the engine imports nothing. Where is the opening carried? | **In the kingdom: `src/sim/opening-run.ts` runs the engine's opening scenarios and pays XP by `battleXpOf`/`mvpOf` (pulled out of `resolveReckoning`, which now reads them), levels by `levels.ts` `xpForLevel`, rewards by the reward rows and `resolveRewardDraw`; the engine's `openingPartyOf(position, replicate, carry)` fields the levels and items it is handed.** With no carry it fields the builder's fixed XP (the Orphanage's 20) as before. | Law 5 (the engine imports no sibling); DECISIONS.md 2026-09-28 "the XP rewards are in the kingdom, not the engine". The engine's opening scenarios stay what every engine probe runs. | provisional — 2026-10-02 |
| `openingCarryLostXp` | A lost battle is fought again: whose XP counts? | **Only the won fight's** (the backlog note's default). | The replays are the AI's sampling, not a player's battles. The kingdom itself pays a lost one (applyBattleResult; a lost Orphanage pays its 20 too), so a player who loses gains more than the probe shows — reported, not changed. | provisional — 2026-10-02 |
| `openingReplaySeed` | How is a lost battle fought again with the same party? | **On battle seed replicate + 1000 × attempt, the party still drafted on the replicate; up to 10 fights, then the run stops there.** The report (`kingdom/tools/opening-levels.mts`) presses on past a battle never won, with nothing paid for it. | The same seed would lose the same way; a stride keeps one replicate's fights apart from another's first fight. | provisional — 2026-10-02 |
| `openingCarryRewards` | The spec names the Bridge's reward; the kingdom's rows also pay a draw after the Cavern Trail and the Gates. Which are carried? | **Every row's offer, as the kingdom pays it** — the Lumberjack's sword, and the standing draw after the Bridge, the Cavern Trail and the Gates. | The rows are the kingdom's (kingdom.opening-run-six, 2026-10-01, newer than the item) — KINGDOM-V2 "item choice starts after battle 3". | provisional — 2026-10-02 |
| `openingRewardDraw` | The Bridge's three cards: the builder's reward stream (the backlog note) or the kingdom's draw? | **The kingdom's `resolveRewardDraw`** on `cup.reward` of a new Campaign seeded by the replicate, keyed by the encounter. | The draw the player sees; the odds are the same table (7-KINGDOM-SETTLED.md: 25/25/20/10/10/10, weapon and armour at tier 3). | provisional — 2026-10-02 |
| `openingRewardPick` | Which of three cards is kept, and who holds it? | **The (card, hero) pair whose class's draft weights (OPENING-PARTY.json `draftScore`) score the item's stat modifiers highest**; a tie to the earlier card, then the earlier hero. A hero may hold it when its class is allowed (`classRestriction`), a weapon attacks with the stat the hero's own weapon does (a weaponless Brawler takes any), and `fieldedDef` fields it. A weapon replaces the held weapons, an armour the armour, a shield the shields; anything else is added. | The backlog note's default (fix.opening-draft's weighted score); "as a player would" — a bow never to a sword hand. A weapon's damage is not scored: only its stat modifiers. | provisional — 2026-10-02 |
| `openingMvpCup` | The MVP's roll in the carry? | **`cup.mvp` of a new Campaign seeded by the replicate, keyed by the encounter id**, as the kingdom keys it by the Engagement. | The kingdom's own roll. | provisional — 2026-10-02 |
| `openingLevelFivePick` | A carried hero at level 5 must name the level-5 pick. Which? | **The row's first option** — the kingdom's autoplay default (`levelPick: 0`). | Unlikely in the opening (170 XP); nothing rules a player's pick. | provisional — 2026-10-02 |
| `openingLevelPowers` | From level 3 a hero "brings the first class power" (the old refusal). Which? | **None drafted** — the hero fields its class table's grants and its specialty only. | The kingdom's level-up grants no power (rewards.ts performLevelUp); fielding one would be a second level-up. | provisional — 2026-10-02 |
| `openingCarryDeaths` | A hero who dies in a won battle: does it field later? | **Yes** — the carry keeps the cadence's party; the death, wounds and fatigue are the Campaign's (fix.opening-party's default). A dead hero earns 0 for that battle. | The probe measures the opening's battles, not the roster's attrition. | provisional — 2026-10-02 |
| `openingTakersCopy` | The sword's takers live in the kingdom's reward row; the engine's no-carry fielding needs them too. | **OPENING-PARTY.json `takers` (build-schedule.mjs), with `kingdom/test/opening-levels.test.ts` holding the two equal.** | The engine cannot read the kingdom; one ruled fact in two places is checked, not trusted. | provisional — 2026-10-02 |

## rule.afflictions-at-zero — the afflictions at 0 Health, Fragile, bleed-out from the gain, 2026-10-02

The source: engine DECISIONS.md 2026-10-01 'the afflictions at 0 Health: Vampirism and Lycanthropy transform on a Luck roll,
Possession raises a Ghost, Rotting Flesh gains Fragile; the first-affliction pop-up' and 'bleed-out is a stat on every player
unit, 5; Rotting Flesh +5'. The rule: `src/core/settle.ts` atZero (before the Deathbed roll), `transformUnit` / `revertUnit`
(`src/core/mutate.ts`), the form made by `formOf` (`src/core/setup.ts`, the one assembler); the rows' `atZero` and `stacks`
compiled by content `mkenginepack.mjs`. Probes `test/afflictions-at-zero.test.ts` and `kingdom/test/afflictions-at-zero.test.ts`.
Landed as rule.afflictions-at-zero-refiled-2. Overturns `rottingFleshBleedOutMidBattle` and `fragileStacksAsGap` (content.afflictions-at-zero, above).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `afflictionsAtZeroRefiled` | rule.afflictions-at-zero was filed without changesBaseline, but its own ruled rule moves the control battles (map.highlands, map.thicket, the proving maps: a Zombie's Rotting Flesh hero taken to 0 gains Fragile and bleeds out over 10); and, as a rule item, without the two variants the generalization check demands. Land how? | **Park (git stash), abandon with that reason, re-file through tools/add-item.mjs, repoint viewer.affliction-pop-up with `add-item --repoint`, restore, land the re-filed item — done twice: rule.afflictions-at-zero-refiled (changesBaseline true; its gate attempt 1 then failed only on variants) and rule.afflictions-at-zero-refiled-2 (variants badge.vampirism and badge.lycanthropy: one transformation, two rows).** | DECISIONS.md 2026-09-30 "Park, abandon, re-file"; `afflictionsRefiled` and `oneHeroAssemblyRefiled`, the same shape. | provisional — 2026-10-02 |
| `atZeroFirstAffliction` | A hero carrying two afflictions with different 0-Health rules (Possession and Vampirism, or Possession and Rotting Flesh) — which one? | **Every carried rule's `gains` is granted (Fragile on every zero); the first badge in carry order whose rule skips the Deathbed roll decides (transform or go down); with none, the Deathbed rule runs.** | The ruling names one rule per affliction and none for two; carry order is the unit's own explicit order (Law 6). | provisional — 2026-10-02 |
| `afflictionBeforeWounded` | A Wounded hero with Vampirism, Lycanthropy or Possession at 0 — Wounded's "they just die", or the affliction's rule? And a Possessed unit without the Hero badge? | **The affliction's rule, before Wounded: it transforms, or goes down and bleeds out. Possession downs and bleeds out whatever badges the unit carries.** Rotting Flesh rolls "as normal", so a Wounded Rotting Flesh hero dies (and still gains Fragile). | "Replaces, for afflicted heroes only: 2026-09-04 'Deathbed Fighting, REVERSED'" — Wounded is that ruling's; "They just go down. They're bleeding out." | provisional — 2026-10-02 |
| `transformLuckCup` | The Luck roll: which number, which cup, which key? | **The Luck stat read through the pipeline (`effective`), clamped to 0..100; success when the d100 rolls at or under it (Luck 0 never succeeds — "always turns"). A new appended stream `transform`, keyed (uid, the unit's Deathbed ordinal — its count of goes to 0).** | "the luck stat is already a percentage, so it's just literally the percentage luck"; the roll replaces the Deathbed roll, so it counts on the same ordinal (Law 4: keyed by what the roll is). | provisional — 2026-10-02 |
| `transformInPlace` | Is the transformed hero the same unit or a new one? | **The same unit (id, uid, name, hex): its record becomes the form's — the row's stats, actions, riders, auras, AI, tags and badges, no loadout, no stored modifiers — with what it was kept whole on `transformed.original`; `typeId` becomes the form's. `unit.transformed` names both.** | "they're going to transform" — one body; the kingdom's result keys every row by uid, and a second unit would need a hero off the board (a life state nobody ruled). | provisional — 2026-10-02 |
| `transformKeepsStatuses` | The hero's statuses (Burn, Poison, Bleed …) when it transforms and when it falls back? | **Kept, both ways.** Its stored modifiers (gear, badges, a turn's −2) are the hero's and go with the hero's form. | Statuses are on the body, not the gear; dropping them would need a line per status nobody asked for. | provisional — 2026-10-02 |
| `transformEndsActivation` | A hero that transforms during its own Activation (an attack of opportunity on its walk, ground that burns it to 0)? | **The change takes what is left of that Activation (move and primary spent, no movement left).** Outside its Activation it changes nothing: the next one begins afresh. | A new body mid-plan would act on a plan made for the old one. | provisional — 2026-10-02 |
| `transformedMidPhase` | A unit that changed sides during a Phase it was queued for (a hero turned during the Player Phase)? | **It does not act in that Phase; the next Phase of its new side fields it.** The activation order is still taken at Phase start, unchanged for every other unit. | A Player Phase never activates an enemy unit. | provisional — 2026-10-02 |
| `transformedDeathReason` | A hero kept by its Luck roll, at 0 again — what does the log say? | **It falls back into its own form (`unit.reverted`, reason `fell`), then `life.dead` with reason `transformed`, and a corpse in the hero's form.** | "If they stay on your side ... they go to zero again. Character dies." A distinct reason keeps it apart from a failed Deathbed's `fell`. | provisional — 2026-10-02 |
| `turnedAtBattleEnd` | A hero still transformed when the battle ends — on the player's side, or still on the enemy's (its Luck failed, never beaten down; a lost or capped battle)? | **Both fall back into their own form standing at full Health before `battle.end` ("back to normal"); the kingdom's fold marks a hero that ended on the enemy side `turned`, which a wipe may have standing. ~~and the Reckoning gives it no wound of this battle~~ — overturned for that hero: a hero still turned when the battle is lost is lost — the Reckoning counts it dead (no XP, off the living roster; kingdom SWITCHES.md `turnedLostIsDead`, fix.turned-hero-lost).** The battle-end revert to its own form stands, and so does a hero on the player's side. | "They're back to their normal self" · "there are no negative consequences at the end of the battle" — only retreat is named as abandonment. | **overturned in part — 2026-10-02**, engine DECISIONS.md 2026-10-02 'a hero still turned when a battle is lost is lost' ("3 treated as lost."); the revert and the player's-side half stay provisional |
| `transformedRetreat` | "Retreat while transformed = abandoned." | **Not built: retreat is unreachable (skipped by ruling 2026-09-03, "We can skip retreat"; the `retreat` outcome is never set). Named here; the retreat item owns it.** | Nothing to act on; the kingdom has no abandoned state either. | provisional — 2026-10-02 |
| `ghostHex` | "summoned on their tile" — the downed hero's body holds its hex (one unit to a hex). Where does the Ghost stand? | **The arrival rule: the nearest free passable hex to the hero's, lower hex id on a tie; `unit.shunted` names the move.** | "It's going to stand up from their body"; the board holds one unit per hex, and the arrival rule is the one placement for a unit that enters mid-battle. | provisional — 2026-10-02 |
| `ghostImage` | "a ghost with their image" — how does the battle say whose image? | **`unit.raised` (the summon line corpse.raise already uses) names `image` (the hero's typeId) and `imageOf` (its uid); the Ghost's row, stats and name are the Ghost's ("Ghost 1").** The viewer draws the image (viewer.affliction-pop-up and after). | "It's going to have ghost stats." The image is presentation; the line carries it. | provisional — 2026-10-02 |
| `bleedOutMidBattle` | Rotting Flesh gained mid-battle (a Zombie's Claw): does its +5 bleed-out count in that battle? (content.afflictions-at-zero left this to this item: `rottingFleshBleedOutMidBattle`.) | **Yes, from the gain.** The bleed-out counter is read off the unit the moment it goes down, as a badge's Deathbed points are read at the roll (`deathbedBadgePoints`), so grantBadge folds `bleedOutTurns` onto the unit at once and its line names nothing as waiting. | "another stat, which is +5 to the bleed out timer" — a Rotting Flesh hero bleeds out over 10. Surge and Toughness still wait for the next fielding (fix.badge-surge-at-fielding). | provisional — 2026-10-02 |
| `stackingBadgeOnce` | Fragile stacks "with no limit" — what of a stacking badge folds per copy? | **Its stat modifiers, once per copy (at fielding and when gained); its grants and riders are held once.** A badge that does not stack is still held once. `badge.gained` names how many are `held`. | Fragile is −1 maximum Health and nothing else; a rider that fires twice for two copies is a rule nobody ruled. | provisional — 2026-10-02 |
| `fragileOnEveryZero` | When is Fragile gained — before or after the Deathbed roll, and on the zero that kills? | **Before the roll, on every zero (`badge.gained` with `atZeroOf`), the fatal one included.** | "every time you're taken down" — the zero, not the roll's verdict. A dead hero carries nothing home. | provisional — 2026-10-02 |
| `fragileCarry` | Which badges gained in a battle does the kingdom carry onto the roster? | **The badges an affliction's 0-Health rule gave a roster hero (`badge.gained` with `atZeroOf` — Fragile), one per gain; the fold names them `carried`, the Reckoning `badges`, the writer appends them.** Noticed, not changed: an affliction gained from a bite mid-battle is not carried today. | The item's kingdom half names Fragile only; carrying every gain would carry Wounded too, which the wound level already is. | provisional — 2026-10-02 |
| `afflictionPopUpEvents` | Which lines does the first-affliction pop-up read? | **An affliction gained for the first time: `badge.gained` carrying the row's `atZero` (only the four afflictions have one; a badge already carried is never gained). Transformed: `unit.transformed` (from, into, side, the roll). Ghost raised: `unit.raised` with `image`. Fragile gained: `badge.gained` with `atZeroOf` and `held`.** | One new pair of lines (`unit.transformed`, `unit.reverted`); everything else rides lines the viewer already folds. | provisional — 2026-10-02 |

## content.unfielded-tier0-weapons-cut — the fixtures that named a cut row, 2026-10-03

The source: engine DECISIONS.md 2026-10-03 'eleven tier 0 weapons nobody fields are cut: the nine the authoring pass invented, the
Fishing Net and the Slingshot' (Andrew: "Yeah, remove all of those 11."). The rows left content `gen/weapons.json` and
`gen/settled-items.json`; the ruling names the tests that used one as a fixture and says each "move to a row that stays" (Law 10),
without naming the rows. The test bestiary's Truebearer firing `attack.crossbow.bolt` is the item's own spec, not a switch.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `tier0CutFixtureRows` | Which staying row replaces each cut fixture? | **The Hand Axe becomes the War Axe (`item.hand-axe` → `item.war-axe`, `attack.hand-axe.chop` → `attack.war-axe.chop`) in engine `test/unit-mods.test.ts` and content `test/damage-packets.test.mjs`. The Pot Lid becomes the Dagger (`item.pot-lid` → `item.dagger`, `attack.pot-lid.bash` → `attack.dagger.stab`) in `test/unit-mods.test.ts`. The Cart Chain becomes the Club where it was an item the hero does not carry (`item.cart-chain` → `item.club`, `test/unit-mods.test.ts`) and the Boarding Hook where it was a chain item left in the stash (`item.cart-chain` → `item.boarding-hook`, kingdom `test/isc-062.test.ts`; kingdom SWITCHES.md `tier0CutChainFixture`).** | The War Axe is the axe that stays and its first attack is also Chop; the Dagger is a fielded tier 0 one-hander with one attack, so the two fit one pair of hands as the Hand Axe and the Pot Lid did; the Club is a staying tier 0 one-hander nobody in that test carries; the Boarding Hook is a staying one-handed weapon whose only tag is `chain`. No assertion changed its number. | provisional — 2026-10-03 |
| `handAxeRiderCaseDropped` | `test/damage-packets.test.ts` proved the authored critical rider on two rows, the Hand Axe's Chop (+4) and the Bane Blade's Banishing Blow (+6); `tools/compare-packet-transition.mts` lists the same two. No staying row but the Bane Blade's carries an authored rider. Where does the Hand Axe's case move? | **Nowhere: the case goes with its row, the Bane Blade's stays, and the tool's list holds the Bane Blade alone. No rider is authored onto another weapon to keep a second case.** `authoredCritPacketInterpretation` (above) now covers the Bane Blade only. | A rider written onto a staying weapon would be new content nobody ruled. The claim (the rider is physical and separately mitigated on a chart-only crit) is still proven on an authored row, and that amount and type are data is proven by the two TEST packet attacks in the same file. | provisional — 2026-10-03 |
| `staggerSourceNoteKept` | Content `settled.json`'s Stagger (`power.shieldbearer.bash`) carries a `source` note, "Bash belongs to attack.pot-lid.bash", so that string is still in `hbt-content.json` and the codex page; the item's expect says no cut id is left there, its spec says the note is history and stays unless the linter reads it. Which? | **The note stays as written.** The linter does not read it (`npm run check` and `ship` pass; audit findings 4). It is the one place a cut id is left in the assembled content. | A `source` note is the row's history ("A cut phrase legitimately survives in … a `source` note", content README); the spec says so for this note by line. | provisional — 2026-10-03 |
| `woodAxeWaits` | Andrew, 2026-10-03: a tier 0 axe "is supposed to" exist and be "in some kits"; asked which kits and whether the Lumberjack's is it: "I don't know, and I don't care … make a decision and clean these up." When is the Wood Axe built, which kits carry it, and does its card get a model now? | **Not now; none; not in this batch.** The Wood Axe stays a dictated weapon with no row (`V2-SHIELDS-AND-WEAPONS-2026-09-20.md`, sixth pass), as the Sickle, the Short Sword and the Grain Flail are, and is built when that pass's weapon families become rows. No kit carries it. The Lumberjack keeps `item.lumberjack-axe` (his word: "It's fine: two-handed lumberjack axe"). The Wood Axe card stays in the set; Codex's exclusion of it from model production, made at his direct word, is left as it is. | No kit needs a tier 0 one-handed axe: tier 0 comes from kits and the Waystation (`GEAR-DESIGN.md` §2), heroes start at tier 1 (the Warriors' axe is the War Axe), and the one civilian with an axe has his own. One row of a dictated family built ahead of the family is authored twice. "We're not in a balancing phase." Not taken: a Wood Axe row now in the Warriors' start pool (a tier 0 weapon in a tier 1 pool); the Lumberjack re-armed with it (ruled against); editing `crucible/data/kits.json`, whose civilian pool still lists `item.slingshot` (the Crucible is unbuilt and its kits were superseded 2026-08-27). | provisional — 2026-10-03 |

## fix.starting-kit-powers — three starting weapons' powers reach the engine, 2026-10-04

The source: engine DECISIONS.md 2026-10-03 'reported: the priest's Holy Texts has no heal in battle — three starting weapons lose
their power on the way into the engine' (Andrew: "Why doesn't he have the healing power? Why does he have an item that's supposed
to be a tier 1 that only has one thing in it?"). Content `mkenginepack.mjs` reads two more item-power sentences, each a second
instance of a shape the engine already speaks; no engine code changed. Probe `test/starting-kit-powers.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `mercyHalfRoundsDown` | Mercy heals "2 + half your Spirit" — which way does half an odd Spirit round, and whose Spirit is it? | **Down** (`div: 2, round: 'down'` on the heal's ValueSpec: Spirit 3 heals 3, Spirit 5 heals 4), **of the party's Spirit** (`partySpirit`, as the Holy Symbol's Heal reads it). | The Codex's two other halves say it in words — Benediction "2 + half your Spirit, rounded down", Heaven's Edge "half your Spirit, rounded down" (`../CODEX.md`); Mercy's row is the same sentence without the last two words. The party sum is GAME-DESIGN §5's law for every Spirit effect, not a choice. | provisional — 2026-10-04 |
| `staffBlastGroundFiled` | Flame Burst and Frost Nova deal their blast AND leave the seven hexes burning / frost; a burst (`src/core/burst.ts`) paints no ground and `layer.paint` measures from a unit, not from a burst's centre hex. Build the join in this item, or land the blast and file the ground? | **Land the blast; name the ground as a gap; file the capability.** Each staff's power is the Lightning Staff's Storm shape (a burst, radius 1, every unit, one Magic packet of 0). The clause "those seven hexes become burning / frost" is on the two item rows and in content `gen/enemy-pack-gaps.json` as `a burst paints no ground (capability.burst-paints-ground)`, and `capability.burst-paints-ground` is filed in the engine queue. | The item's own spec: "where the engine truly lacks the mechanism … land what can land, and file the rest as its own capability item"; a new field on the burst profile is a mechanism (two variants, the generalization check), not a data row. Until it lands the two staffs do half of what their card says: the damage, not the ground the card calls "the real payload". | provisional — 2026-10-04 |
| `staffBlastFromTheRow` | The blast's numbers: read from the sentence, or authored on the row? | **Authored on the row** (content `gen/settled-items.json`: a `burst` profile on `power.fire-staff.fireball` and `power.frost-staff.frost-nova`, as Storm's is), **and checked against the sentence** — the compiler refuses a row whose profile is not radius 1, every unit, one Magic packet of the sentence's bonus, magic damage. The descriptions are unchanged. | Storm's profile is authored on its row (the V2 burst migration, content `V2-BURSTS.md`); a profile derived from prose would be a second way to declare a burst. The check keeps the two from drifting. | provisional — 2026-10-04 |
| `startingKitPowersAi` | Does the AI play the three powers? | **Yes, with no AI change: it already plays both shapes** — `supportPower` plays a heal-only power aimed at one ally (the Holy Symbol's Heal; `aiSupportHealShape`), `burstIfUseful` plays any burst worth more than its best attack that harms no ally. So every battle that fields one of the six heroes moves (nineteen battle-cursor cases; `test/fixtures/battle-cursor-starting-kit-powers.json`), the opening's battles among them. The control battles do not move (the six are in none of them): no `changesBaseline`. | "The AI is not taught the new powers unless it already uses the shape." | provisional — 2026-10-04 |
| `clauseGapBesideCompiledPower` | `test/field-eve-24.test.ts` held "a kit's power is compiled or gapped, never both". A compiled burst now names a clause gap. | **The rule is kept for the power as a whole** (an `item power — …` gap never sits beside a compiled power; an uncompiled power is always gapped) **and a compiled power may name a clause gap**, which the test checks by its name. | A clause the engine cannot do must be named (compile or name the gap; never round), and the staffs' blast does compile. | provisional — 2026-10-04 |

## fix.fire-imp-burn-spares-self — the Fire Imp's end-of-Activation Burn spares the imp, 2026-10-04

The source: engine DECISIONS.md 2026-10-03 'the Fire Imp's burn does not hit the imp itself; an end-of-Activation area burn shows
an explosion of fire' (Andrew: "It should not hit him."). The row (content `gen/enemies-authored.json` `unit.fire-imp`) says
"every other unit within N hexes"; the one targeting vocabulary (`src/core/target.ts`) reads `excludeSelf` on an area; content
`mkenginepack.mjs` compiles the phrase to it. Probe `test/fire-imp-burn-spares-self.test.ts`. The explosion of fire is
`viewer.area-trigger-burst`, not this item.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `excludeSelfReturns` | The engine had one area shape for "everyone in reach" and it counts the owner; an `excludeSelf` flag had existed and was deleted on Angela's 2026-08-15 word ("I don't think we're ever gonna use exclude self"; `target.ts`, `COMBAT-SEQUENCE.md` Targeting, `test/target.test.ts`). How is "everyone but the imp" said? | **The deleted flag, by its own name, on the one vocabulary: `Targeting.excludeSelf?: true`, area only, validated at load (off an area, or anything but `true`, throws), read by `eligible` — so `resolveTargets` and `hasAnyTarget` agree and triggers, powers and any later caller share it.** Side still never excludes the actor; an ally-side area with it is "every other ally". `COMBAT-SEQUENCE.md` and the comments in `target.ts` say so with both rulings; the test that proved the flag had no effect is rewritten as the rule, the old lines quoted (Law 10). | The 2026-10-03 ruling is the newer one and names a row that needs it; the item's spec: "add the excluding-self form as a second instance of that shape in content's parser and the engine's resolver, never a Fire-Imp-only hook." The name is the one the engine already had (rule 21: no new name). | provisional — 2026-10-04 |
| `everyOtherUnitPhrase` | Which Codex words? The bestiary's trigger shapes are checked against the hero-side vocabulary (content `audit.mjs` R27, `gen/functions.json` shapes), which has "every unit within N hexes" and no excluding form. | **"every other unit within N hexes"** — read by `mkenginepack.mjs` (the same area, any side, `excludeSelf`) and held legal by `audit.mjs` exactly when "every unit within N hexes" is: the excluding-self form of that one shape, not a new shape in the vocabulary (`gen/functions.json` is unchanged). | "Do it in the Codex's words"; a second field beside `targets` would be a second way to say who is hit. A new locked-vocabulary shape is a naming decision nobody made. | provisional — 2026-10-04 |
| `fireImpBurnOthersOnly` | Who still burns? | **Every other standing unit within 2 hexes: heroes, Imps, and another Fire Imp (each burns the other; neither burns itself).** Only the Fire Imp's row changed. The same phrase still counts its owner on: the Poison Imp (`trigger.poison-imp.poison`, Poison 1, range 2 — its row's note says "same as Fire Imp with poison throughout"), the Balrog (`trigger.balrog.burn`, Burn 1, range 2), and four class powers aimed at "every unit within N hexes" from the caster (War Cry, Fel Rush, Holy Radiance, Warcry). Reported for Andrew, not changed. | "Read as: everyone else within 2 hexes still burns — other units of its own side included; only the imp is spared." / "report them for Andrew, change only the Fire Imp." | provisional — 2026-10-04 |
| `fireImpBurnBaseline` | Do the control battles move? | **No** — no control battle fields a Fire Imp (`tools/baseline.mts` identical, 23 hashes); no `changesBaseline`. Four battle-cursor cases that field one move (`test/fixtures/battle-cursor-fire-imp-burn.json`): showcase.kiln, showcase.prologue-enemies, test.opening-bridge, test.props-viewer-ranged-zoc. | The item's spec says "the Bridge's battles will" move — they do; the control battles are not the Bridge's. | provisional — 2026-10-04 |
