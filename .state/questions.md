# Questions — the Game Builder's inbox

Questions FOR ANGELA, in plain English, one per line under OPEN. Each one should
name the decision, not the machinery — if it can't be understood without opening
a source file, it isn't ready for this inbox. Move to ANSWERED with the answer
and date. Tool tasks and engine chores go in the backlog, never here.

## OPEN

- (2026-08-27, reworded 2026-09-27) **The Bracer: can the same critical injury come up twice?**
  The Bracer makes a critical roll the Critical Injury Chart more than once (T1 twice, T2
  three times, T3 four times). The chart is short, so repeats happen. If a repeat stacks,
  four Blindeds is -16 Vision and -120 Accuracy. Does a repeat stack, or is a result that
  already came up re-rolled? (Today it stacks; the re-roll version is built and waiting.
  The same answer covers "do two criticals" / "do three criticals".)

- (2026-09-03, reworded 2026-09-27) **Five new id prefixes were approved without you.**
  Every thing in the game has an id that starts with its kind — unit.zombie, status.burn,
  attack.balrog.hurl. A new kind is yours to approve. During the unattended run on
  2026-09-03 you said "propose and record", so the chat approved five itself: `encounter`
  (a battle's setup — the six old battle.* rows were renamed to it), `aura` (a radius that
  lends stats to units standing inside it), `corpse` (a body left on the board), `layer`
  (something painted on the ground: darkness, frost, weakness), `stamina` (event names
  only). Keep these five names?

- (2026-09-03, narrowed 2026-09-27) **How much Surge does a hero gain each Turn?** The
  mechanics are ruled (DECISIONS.md 2026-09-27: a gain-per-Turn stat, an amount, a Surge
  takes away 100). Open is the stat itself: the Codex's hero rows say it equals the level
  (a level-5 hero gains 5 a Turn); the progression schedule gives 0 plus whatever the
  specialty adds (Bloodrage +1). The engine follows the Codex. Which is right?

- (2026-09-02) **Note, no action needed:** the crit chart's "loses access to class powers"
  applies a placeholder called `status.powers-locked` (Dazed is two things — your words).
  Rename whenever; one Codex row and one converter line. Answered 2026-09-02: "leave it
  as just a note."

## ANSWERED

- (2026-09-27) **The Necromancer's Raise range** — "Give the necromancer a raise of 10
  range." (Andrew). Codex row carries 10 (content fd2a8ee); queued fix.raise-range.

- (2026-09-27) **Surge mechanics** — "There is a stat which is surge gain per turn, then you
  have your amount of surge ... If it's used, it should take away 100. If you have 150
  surge, automatically you're going to have a surge activation, and you're going to lose
  100 and still have 50." (Andrew, verbatim in DECISIONS.md). Queued fix.surge-spend.

- (2026-09-27) **The schedule stows spare weapons in item slots** — already settled by
  COMBAT-V2-DESIGN-2026-09-07 §11.1 (ruled 2026-09-07): a weapon in an item slot grants
  nothing and is only there to swap into your hands (v2.loadout, v2.loadout-swap landed).
  The schedule is progression/PROGRESSION-SCHEDULE.md, a worked 20-battle campaign run that
  gives the simulator realistic parties.

- (2026-09-27) **Flagged landings** — "Okay, all of the flagged landings seemed fine."
  (Andrew). All 22 cleared via review.mjs.

- (2026-09-03) **The P11 encounter format** — "Approved as written" (Angela,
  from ENCOUNTERS-ENGINE-HANDOFF.md §1). encounter.runner landed; ten
  encounters ship; the 24 promised are 6 + 4 (E3 the dungeon skipped, E6–E8
  unsettled).

- (2026-09-03) **Vision** and **Surge** — built (Angela: "build them all").
  Vision 6 + stat 0, floored 1; fog would be 3 (no fog row yet). Surge per
  COMBAT-SEQUENCE; equals the level.

- (2026-09-03) **`move.*` approved 2026-09-02; `battle.*` approved by policy
  2026-09-03** — see OPEN for the retire question.

- (2026-09-02) **The standard test horde is a walkover — keep it or harden it?** — "Keep the
  zombies." Tests that need pressure field twelve to sixteen.

- (2026-09-02) **Approve the `move.*` kind (enemy special moves)?** — "Yes, I do want to have
  these special moves: charge, close, bite, clobber." Approved as a name; the mechanism is
  unbuilt and stays a named gap.

- (2026-09-02) **When do the three beasts get their Codex rows?** — "Later — leave them for
  now."

- (2026-09-02) **Build the six unbuilt statuses now?** — No: "I really want all the
  structure, everything to be correct. We don't need all of the features built." They
  stay named gaps; engine work is structure only.

- (2026-09-02) **May the Codex own the status rows?** — "Yes — Codex owns the rows."
  approved-kinds.json re-ruled (status: content); pack.statuses landed — ten rows read
  from settled.json, baseline-neutral. pack.moves the same day, also neutral.

- (2026-09-02) **Which is Dazed — the chart's powers-lock or the Codex's control loss?** —
  "It does two different things: there is a critical effect, and then there is a status
  effect… can you account for that?" Accounted for as two ids (fix.dazed-split).

- (2026-09-02) **Flip the standard battles to the Alpha Team?** — "Yes, proceed with
  step one." Landed as content.alpha-flip; all eight baselines re-blessed. The enemy
  side of the standard battle (three test-zombies + a burning one) is still the test
  cohort — flipping it to authored enemies is the next question, not yet asked.

- (2026-09-02) **Which attack should the AI choose?** — NOT a question for you: it is
  a switch (backlog ai.attack-choice). The flip showed four authored attacks never
  fire because the AI takes the first affordable one in declared order. A sweep
  will measure the policies; you get the data, not the decision.

- (2026-08-20) Water and regeneration — regeneration is NOT washed off by water. Water removes burning (on entry, and at end of activation) and poison (at end of activation) only. Fixed and landed (fix.water-regen).

- (2026-08-20) Codex counts as a published source — yes, before changes; rows may still change as we go. content-check now reads CODEX.md.
- (2026-08-20) Statuses are counters — they accumulate and tick down; pool stays reserved for spent-when-consumed (protection). SETTLED rows amended with a CHANGED entry.
- (2026-08-20) AoO −1 damage: struck. Final form — provoked unit chooses a legal attack (stamina paid, cooldowns respected) at −20.
- (2026-08-20) deathbedFighting modifiers: legitimate inputs to the calculated total rolled at zero health — not writes to a stored stat.
- (2026-08-20) Testing lane ruled: invent test enemies/abilities per mechanic under test, id kind `test`, in content/, marked, never ships.
- (2026-08-20) Does flight from inside a ZoC provoke? — Yes, once, leaving the first hex only.
- (2026-08-20) onDodge: any miss or dodge-caused? — Dodge-caused only; one roll, the dodge-sized band at the deep end.

## ANSWERED — the crit system (2026-08-27, same day)

Answered by the full Critical Injury Chart dictation: crits are ON; the +50%
damage arm is the HEADS branch (applied before Armor/Resist/Protection), the
chart is the TAILS branch — ten battle-only rows, ruled data in settled.json
critChart, never an injury.* badge. Landed as station.crit (d5c42f7). One
reconciliation left open below.

## ANSWERED — the branch flip is 50/50 for everyone (2026-08-27)

"It should be a 50% chance of just a damage boost and a 50% chance of one of
the effects" — and the per-side 25/50 is HELD OFF ("that is a different
concept"). Landed as fix.crit-branch-even (a0e811c); both share switches stay
sweepable at 50. The same message ruled every chart row genuinely reachable
(the dice keys widened — Winded fires in real battles now) and multiple
criticals ("do two criticals" / "do three criticals"), landed as
station.crit-count (8780794).

## From the kingdom session, 2026-09-03 (G9 seam.loadout)

- **ISC-003 red on engine HEAD (52c2ba8): the End of Activation ladder runs after `battle.end`.** In `test.seam.door` (map.open, oathblade + osric v two test zombies, seed 3) the axe kills the last zombie at seq 218, `battle.end` is seq 219, then `activation.end`, then `status.poison` deals `damage.applied` to unit 0 (seq 221) and regeneration heals it. The kingdom's fold holds that nothing is damaged after the battle has ended (corrected 2026-09-01, not weakened). Filed as `fix.post-end-ladder`. Every kingdom landing tonight fails "nothing regresses" on this alone.
- **`applyItems` refuses the ruled spare weapon** (`seam.spare-weapons`, filed): a hero fitted with longsword + knight-shield + dagger-in-the-item-slot is "more than two hands of weapons". The kingdom leaves the spare behind at fielding under `SWITCHES.spareWeapons` and names it on the battle screen.
- **203 kingdom-generated rows are not in ITEMS** (`pack.derived-rows`, filed): the 30 masterwork and 173 enchanted tier-2 rows the Forge sells.
