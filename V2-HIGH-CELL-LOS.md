# V2 high-cell line of sight — landed, effect-tool finding retained

Item: terrain.high-cell-los. Authority: ../COMBAT-V2-DESIGN-2026-09-07.md §4.

Existing authored x cells become high full-hex blockers for the shared attack
legality path, including reactions. Radius vision and auras remain unchanged.
Arbitrary prop footprints, edges, cover, destruction actions and burst spread
remain subsequent items; this stage does not claim they are implemented.

The geometry uses an exact integer affine image of the pointy odd-r grid:
centers (2*col + row%2, 3*row), vertices (0,-2), (1,-1), (1,1),
(0,2), (-1,1), (-1,-1). Closed intersections include tangencies. A division-free
separating-axis test avoids rounded cube interpolation and floating comparisons.
Tables cover every pair, independent of current units, weapons or range buffs.
Only pairs crossing a changed cell require re-evaluation. Derived geometry stays
outside serialized state and must remain isolated between preview forks.

Preflight measurement: 40×40 board, 64 blocker cells, 81,868,800 unordered
pair/cell tests took 2,936ms in the tool V8 runtime; 1,417,770 intersections would
require 5,671,080 bytes of Uint32 reverse entries. Independent segment/edge
intersection oracle agreed on 28,561 integer segments. This is feasibility
evidence, not an engine benchmark or a gate pass. Persist and rerun the benchmark
against the implemented engine before claiming performance validation.

Implementation uses one predicate in canAttack, immutable unordered-pair bitsets
and per-blocker sorted reverse lists. Setup and restore eagerly prepare tables;
queries scan current plain terrain for blocker changes. Only added blockers need
new SAT work; removed blockers re-evaluate their affected pairs using remaining
exact reverse lists. Shared tables key full dimensions and sorted blocker cells,
never map ID. Forks share immutable geometry with independent cache bindings.
Snapshots stay plain and use rules version .11; no derived arrays are serialized.

Provisional closed-contact and resource policies are recorded in SWITCHES.md.
The limits are 1,024,000,000 pair/cell tests, 16,000,000 reverse entries, and a
64 MiB estimated shared immutable cache. Live contexts can retain evicted tables;
the cache bound does not promise a whole-process heap ceiling. Open 100×100
boards use no pair bitset (80 estimated bytes); dense 10,000-cell maps are not
unconditionally supported. 21 blockers on 100×100 reject before allocation.
40×40/801 also exceeds the work bound. No blockers are silently omitted.

Real engine cold/warm-open measurements: 40×40/64 took 825/773 ms;
40×40/600 took 7,746/7,434 ms, with identical 767,520,000 SAT tests,
12,548,301 reverse entries and 50,396,736 estimated bytes. This demonstrates
why the original 128-million work proposal was too restrictive. Logs are
scratch/high-cell-los-benchmark-{first,dense,warm}.log; the benchmark source is
scratch/benchmark-high-cell-los.mts. These are synthetic benchmark tiles, not
an interpretation or modification of user atlas assets or void cells.

Evidence chronology:

- scratch/high-cell-los-red.log is an import error, not meaningful red.
- high-cell-los-red-corrected.log records three real baseline failures:
  ordinary/reaction legality, human command rejection, removal/fork isolation.
- high-cell-los-addition-red.log and high-cell-los-mixed-red.log record
  excessive repeat geometry work (one failing targeted probe each), repaired
  by ORing additions once and using reverse lists for removed-pair membership.
- high-cell-los-focused-incomplete.log contains only RUN after a process
  interruption. It has no pass/fail verdict and is retained separately.
- high-cell-los-focused-final.log: 16/16 pass; high-cell-los-types.log:
  typecheck passes. Exact segment/edge oracle covers every pair/cell on 4×3,
  3×4 and 5×5 boards, including symmetry, endpoints and closed tangency.
  Table answers also match an independent union oracle before/after mixed
  edits, full fork snapshot preservation, restore and same-ID different boards.
  Real published thicket/ruin shots reject then succeed after blocker removal;
  real reaction and long-reach melee paths, radius vision and aura behavior
  have positive/negative controls. Both cold and warmed final geometry agree.
- compare-high-cell-los-transition.mts extracts actual 4b5c53b source into a
  guarded owned temporary directory. high-cell-los-transition.{log,json}
  proves all 535 setups identical and all 434 obstacle-free battles exactly
  preserve complete events, state, RNG, cursor and result. 474 total battles
  remain exact; 61 obstacle-bearing control cases change intentionally.
  All 32 existing scenarios and three progression cases are unchanged, so
  historical cursor fixtures and assertions need no migration or weakening.

The map-disable gate probes establish live authored fixture presence, not the
LOS consequence by themselves. The baseline red probes and full old-source
comparison supply that separate proof.

Pre-land full gate (scratch/high-cell-los-gate-1.log) passed all 1,216 tests,
typecheck, live variants, generalization, naming/hardcode and kill switch. No
existing tests were edited and no exemptions were taken. One candidate-ruling
warning points to COMBAT-DESIGN.md:477 (Flight paragraph, read; it does not
override the explicit V2 LOS ruling). The eventual seal must retain that warning.

Exactly three of 20 control hashes change, as declared:
map.thicket 722010e7→5e40018d; map.proving.ruin 6b32d8f3→f3c6cbab;
test.map.dungeon-16x8 717a0446→9771e5ab. The other 17 are exact. The 61
changed individual battles split 11/25, 25/25 and 25/25 respectively.
Source commit: e623d26 (gate printed its pre-amend 725eb0e). Committed-tree
tests/baselines passed, and scratch/audit-high-cell-los.log records the separate
clean batch audit: 1,216 tests, typecheck, all 20 current control hashes and
whole-core checks. Existing audit debt is unchanged (30 grandfathered source
IDs and 44 prior review-flagged items). No map/art/content bytes were changed.

The landing seal is **withheld for two reasons**: effect measurement errored,
and one candidate-ruling flag warned. There were zero exemptions and no edited
historical tests. This item is tool-status done, not a human visual acceptance.
Preserved scratch/high-cell-los-land.log contains the actual failure: disabling
the two maps removes them from MAP_PANEL, but effect-size.mts dereferences the
missing WITHOUT arm. The tool repair is the immediately following separate
item; it must not rewrite this landing verdict or claim a numerical paired
effect for an unavailable arm.

The independent old-source comparison remains valid LOS consequence evidence:
61 complete paired battles change, 32 change duration, and one dungeon-map
battle changes outcome. That is distinct from disabling a map and cannot be
replaced by the broken tool's presence check. No broad balance conclusion is
claimed from this sample. The interrupted and failed probe logs remain intact.
