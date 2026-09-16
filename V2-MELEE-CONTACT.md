# Dumb-melee contact correction

Dumb melee still closes on its nearest target without pricing reaction risk.
For equal destination distance it now chooses the least actual movement cost,
then shortest returned path, then lowest hex ID. The movement planner exposes
pathCost from its existing Dijkstra result, including low-edge costs; non-path
plans report zero because they do not consume a walked path budget. No second
movement-cost formula, target selector or reaction rule is introduced.

## Evidence

Ten focused probes cover opposite open-board approaches, two existing unit rows,
weighted ground, equal-cost path length, deterministic hex tie, low-edge planner
cost and purity, exact pre-change Priory turn-five and Buried turn-four fieldings,
and the unchanged reaction on an explicitly continuing path. Nine probes failed
before implementation; the deliberate-continuation control already passed.
Pre-change captures retain full fielding/state/cursor/RNG and original events;
source maps/art are unchanged. Priory now selects 67 instead of 66 (3 vs 4 points),
and Buried selects 87 instead of 46 (1 vs 4), avoiding their needless continuation.

scratch/compare-contact-transition.mts extracts unmodified engine 4ff6e55 into a
checked temporary directory and compares 594 battles: 550 control instances,
41 cursor scenarios/progression cases, and three exact Atlas exports. 564 change,
30 remain fully identical; 286 results change. Every changed battle's first
activation divergence is independently proven to be a dumb-melee destination of
the same target distance and lower cost or equal cost with fewer path steps.
The actual first divergent move.begin must match both ranked destinations, actor,
origin and path lengths; all earlier activation events remain identical. The
--verify-report check re-proves this from all 564 retained event contexts.
All untouched events/state/full RNG/cursor/results are exact. The report retains
each first choice and event context. This deliberately changes control hashes;
changesBaseline is declared before implementation.

The first full suite found 21 old cursor hash expectations affected by those
choices; the comparison identified 22 changed cursor cases, one of which had no
historical frozen row. All old fixture files remain unchanged. A separate .15
contact fixture checks full events/state/RNG/results for every current case and
both automatic and suspended drivers; unchanged cases still run all historical
projections. This historical-test change is explicitly reviewable, not a weakened
assertion. The 57 focused contact/cursor checks and typecheck pass before the gate.

Snapshot rule version .15 invalidates snapshots with the old AI policy. The full
gate, landing and batch audit will record final status below. Technical evidence
does not establish human visual acceptance.

Candidate full gate passes 1,361 tests, typecheck, both live content probes and
the kill switch. All 22 control hashes intentionally change and are deferred for
blessing at landing. Existing ruling candidates and the explicitly documented
historical-test edit flag withhold the seal; no exemptions were taken.

Landed source is f8e2054 (the gate printed pre-amend 5009cf8). Full landing and
committed-tree tests/control checks passed: 1,361 tests and 22 intentionally
updated controls. The seal is withheld for two warning categories (ruling
candidates and documented historical test edits), with zero exemptions. The
two-item batch audit follows activation selection.

Two-item batch audit at selection source 637b195 passes 1,373 tests, typecheck,
all 22 newly blessed controls and whole-core/content checks. The contact item
retains its two documented warning categories; audit does not grant its seal.
