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

## OPEN — does the crit system switch ON, and what does a crit DO? (2026-08-27)

The last four Alpha Team gaps are the crit fields (dagger 5, javelin 3,
quick-shot 5, longsword stab 3). The engine has half a crit system behind
`critEnabled: false`: the roll exists, the surplus-accuracy formula exists,
onCrit fires — but the damage arm is +50%, which CODEX §12 bans ("a crit is
not a x2. Write onCrit: deal N crits"), COMBAT-DESIGN §183–199 wants the
Critical Injury Chart instead, the chart's rows are not authored anywhere I
can find, Luck has no UnitDef field, and `critChartSplit` (SWITCHES.md) is
another thread's open question on the same ground. Three decisions only you
can make: (1) does crit turn on for the prologue battles; (2) is the +50%
damage arm dead on arrival, or a temporary stand-in until the chart is
authored; (3) where do the chart rows get authored — a content session?
`station.crit` sits ready in the backlog behind these.
