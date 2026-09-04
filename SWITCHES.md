# Switches

Ambiguity gets exposed, not decided. Each row is a question the simulation can
answer; the default is what runs today.

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
| `hazardOnDowned` | Does terrain reach a downed hero? | not modelled — downed carry no statuses | answered |
| `protectionStacking` | A pulse of 2 onto a hero holding 1 gives 3 or 2? | additive | answered |

## Notes

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

## zoneOfControl — are zones of control and attacks of opportunity live?
Added 2026-09-03 (movement.zone-of-control, movement.attack-of-opportunity).
Ruled by GAME-DESIGN §4 and Angela 2026-08-13, so the default is **on**; the
switch exists because it is the largest single change to every balance number
the engine has, and the paired sweep wants the pre-ZoC arm. The AI is blind to
both by the same ruling — that is not a switch.

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
The action carries `slot` (movement · primary · either; absent = either) and
the engine records it. **How the AI reads it is not built**: today the AI
spends movements from the movement action and attacks and powers from the
primary — `byProfile`, the default. `any` — a movement-slot attack, a
primary-slot walk — is the designed AI's path (system.ai-modes: "DESIGN FIRST,
with Angela") and has no code behind it yet; this entry exists so the question
is on the list and not decided by omission.
