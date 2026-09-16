# V2 authored low cover

Engine item `terrain.low-cover`, depends on `terrain.authored-geometry`.
The actual Atlas adapter needs both high physical geometry and low target-end cover;
this item provides the generic engine facts without importing assets or the renderer.

Initial red: 10 failed / 1 passed. Final 24 probes re-run against frozen pre-feature
f0aff17: 23 failed / 1 passed. The new mathematical leaves are supplied only so the
test module can load; no pre-feature setup or attack code imports them. Red utility
`tools/low-cover-red.mjs` preserves the active working tree. The historical malformed-height probe now uses unknown 'medium' instead of newly
supported 'low'; both existing loader/direct rejection assertions remain. This
explicit behavior extension remains flagged for review.

Focused current checks: typecheck and 24 low-cover tests pass, plus all 24 previous
geometry tests. Tests include an independent BigInt rational subdivision oracle
for every directed pair across four polygons in both windings, source-own exclusion,
long rotated walls, tangent and one-unit gaps, hex directions, cache edits/removal,
complete keys/dimensions, fork/restore/passive facts, overlapping edge costs,
command atomicity, seeded cover/dodge misses, preview/live/reaction agreement,
post-critical/pre-Protection station order, and legacy area/power exemptions.

Measured precomputed setup: 20×10 with 32 finite low edges, 47.2 ms, 3,620,096 work
units, 7,555 reverse entries and 54,194 retained bytes; 40×40 with 84 low edges,
545.7 ms, 80,641,952 units, 139,650 reverse entries and 928,730 retained bytes.
Bounds are unchanged from the declared conservative budget. These synthetic tests
do not certify every authored map or visual/GPU behavior.

First full Gauntlet check passes: typecheck, **1351 tests**, all **22 unchanged
controls**, live/generalization probes and kill-switch verification. No exemptions.
Candidate ruling matches, the preserved malformed-height test extension and two
unpublished TEST scenario IDs withhold the clean seal. The 72-line geometry leaf
is normalized from its prior CRLF form to LF; its original logic is unchanged.
Landing, committed-tree verification and separate batch audit remain pending. No human visual acceptance or clean seal is claimed. Actual Atlas scene
compilation, viewer binding and Kingdom mounting remain the following package work.


Final: source **db91771** landed and passed committed-tree tests/control hashes.
The gate printed its pre-amend SHA 7f8a86f; db91771 is the resulting source commit.
The separate batch audit passes typecheck, **1351 tests**, all **22 controls**,
and whole-core checks. No exemption or human review was used. The clean seal
remains withheld for the three recorded flag categories. Audit reports 34
historically unpublished IDs and 48 review-flagged landings across the whole tree.

Logs: scratch/low-cover-gate.log, scratch/low-cover-land.log and
scratch/low-cover-audit.log. The generated engine/root Game Builder copies match
SHA256 04B719B5D5632623642181F812B51FABA62D526DAB0036B1909DFA1F0ADD408A.
Their eight generated whitespace-only lines remain a distinct diagnostic, not a
functional pass claim. Source whitespace checks are clean. The final receipt
contains no post-audit combat source changes. Root DOCS/STATE publication belongs
to the coordinated parent task. Actual approved scene compilation and rendering
in game/replay are next; these engine prerequisites alone do not deliver them.
