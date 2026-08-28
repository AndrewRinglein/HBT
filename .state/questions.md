# Questions — the Game Builder's inbox

Questions FOR ANGELA, in plain English, one per line under OPEN. Each one should
name the decision, not the machinery — if it can't be understood without opening
a source file, it isn't ready for this inbox. Move to ANSWERED with the answer
and date. Tool tasks and engine chores go in the backlog, never here.

## OPEN

## ANSWERED

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

## OPEN — 'literally a coin' vs the 2026-08-22 critChartSplit answer (2026-08-27)

Today's dictation says the branch flip is 'literally a coin'; your dated
2026-08-22 answer was two numbers — chart share 25 against heroes, 50 against
enemies. The dated answer is what landed (both numbers are switches:
critChartShareVsHeroes / critChartShareVsEnemies). If today's coin was meant
to supersede it, say so and the switches move to 50/50.
