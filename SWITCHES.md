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
- **`terrain.impassable` vs `terrain.obstacle`.** §1.1 names it `terrain.impassable`;
  MAP-01's legend calls it Obstruction with glyph `x`, and the engine uses
  `terrain.obstacle`. Two names, one thing — Angela's call, not mine.

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
| `shieldPowerNumbers` | What do the two powers per shield give, and at what cost? | Round: Turn Aside +10/+10 at 1 stamina, cd 2; Brace +5/+5 +1 Armor at 1, cd 3. Kite: Shield Wall +15 Block +1 Armor at 1, cd 3; Raise Guard +10/+10 at 1, cd 4. Tower: Cover +20/+20 +1 Armor at 2, cd 4; Stand Tall +25 Ranged Block +2 Armor at 2, cd 5. All until end of next activation. | provisional — Angela to correct |
| `towerShieldIdReuse` | Does the new Tower shield re-author `item.tower-shield` in place, or take a new id? | re-author in place; Kite and Round are new ids | provisional |
| `retiredShieldGrants` | What becomes of pot-lid's and holy-shield's non-Block grants (Armor, Accuracy, Resist, Health, aura), carried by no kit? | nothing yet — left in place until Angela rules | open, hers |

Reasons for the defaults: costs sit inside the ladder every one of the engine's 339 powers
already uses (stamina 0 to 2, cooldown 0 to 6), and against the shield powers being retired —
Knight Block 1 and 3, Tower Cover 1 and 3, Stand Tall 2 and 4. Ordering follows her words:
Round cheapest, Tower dearest and strongest, Kite between. Each shield's second power covers
its own gap, so Kite's Raise Guard buys back the ranged block its +5 lacks. Re-authoring
`item.tower-shield` keeps the name it still carries and matches R1's own instruction to
re-author Tower Cover rather than invent a kind; `power.knight-shield.block` and
`power.buckler.block-and-dodge` retire with the items that grant them.
