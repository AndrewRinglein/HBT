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
| `multiAttackRetargets` | If the target dies, does hit 2 retarget or fizzle? | fizzle | open |
| `powerRollsToHit` | Do class powers roll to hit (and so crit)? | no — auto-hit | **not implemented** |
| `statusDecayRung` | Does a status decay at the tick rung, or at the later duration rung? | tick — act and decay in one pass | open |
| `absorbSpendOrder` | Which absorbing status pays first when several are held? | id order | open |
| `activationOrder` | Fixed by unit id, random, or best-first? | fixed | open |
| `terrain.forest.moveCost` | Is cover slow, or free? | 2 | open |
| `terrain.rocky.moveCost` | Rough ground: a tax, or just scenery? | 2 | open |
| `terrain.water.passable` | Is water a wall or a toll? | cost 3 | open |
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
