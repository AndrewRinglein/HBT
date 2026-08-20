# Questions — the Game Builder's inbox

Questions FOR ANGELA, in plain English, one per line under OPEN. Each one should
name the decision, not the machinery — if it can't be understood without opening
a source file, it isn't ready for this inbox. Move to ANSWERED with the answer
and date. Tool tasks and engine chores go in the backlog, never here.

## OPEN

- When a character stands in water, which effects should wash off at the end of their turn? Your design doc says burning and poison wash off. The effects document also lists regeneration — which would mean standing in water weakens your own healing too. Right now water removes all three (burning, poison, and regeneration). Keep all three, or should water leave regeneration alone?

## ANSWERED

- (2026-08-20) Codex counts as a published source — yes, before changes; rows may still change as we go. content-check now reads CODEX.md.
- (2026-08-20) Statuses are counters — they accumulate and tick down; pool stays reserved for spent-when-consumed (protection). SETTLED rows amended with a CHANGED entry.
- (2026-08-20) AoO −1 damage: struck. Final form — provoked unit chooses a legal attack (stamina paid, cooldowns respected) at −20.
- (2026-08-20) deathbedFighting modifiers: legitimate inputs to the calculated total rolled at zero health — not writes to a stored stat.
- (2026-08-20) Testing lane ruled: invent test enemies/abilities per mechanic under test, id kind `test`, in content/, marked, never ships.
- (2026-08-20) Does flight from inside a ZoC provoke? — Yes, once, leaving the first hex only.
- (2026-08-20) onDodge: any miss or dodge-caused? — Dodge-caused only; one roll, the dodge-sized band at the deep end.
