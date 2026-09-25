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
| `pushEntersGround` | A push that carries a unit into a hex — which ground beats run? | **The V2 hazard only, on the hex the push leaves it in**, before any collision cost. Water does not wash a pushed unit and burning ground does not sear it (unchanged). | §3.2 rules it for lava only: "Being knocked into lava is *entering* it, not a collision". Widening it to the v1 grounds would move battles on ford/field/floodplain on no ruling. | provisional — 2026-09-24 |
| `hazardDamageFirst` | Lava's two parts — which first? | **The 3 fire, then the 2 Burn.** At a step, after water/burning/the layer; at End of Activation, the last ground rung, before the `onActivationEnd` triggers and the status tick. | The order the row states them. | provisional — 2026-09-24 |
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

Not done here, on purpose: §18's retirement of "terrain as the cover system" (v1 forest +10
Dodge, rocky −5 Accuracy, hills +2 reach) — it needs rocky's numbers (§16 item 2a) and a
ruling on whether v1 forest becomes woodland. A finding, not a switch: a **sidestep** has never
run the painted layer's entry beat (a step does); kept exactly as it was.
