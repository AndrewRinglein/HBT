# Viewer direct-map initialization — viewer.direct-map-initialization

Engine landed and audited; final viewer publication is tracked by root STATE.md.
Base engine d872c34, viewer b465fe5. Root STATE.md owns final cross-package hashes.

## Contract

The readonly engine `src/view/field.ts` owns canonical field validation, board
space projection, terrain legend and exact geometry distance access. The CLI calls
that same projection. Raw authored rows remain optional CLI metadata because
canonical OPEN ground cannot reconstruct original x shorthand. Event-only fields
omit rows. All 22 registered CLI byte hashes are frozen and tested unchanged.

Mount requires initialEvents and seed facts before changing the host DOM. Harness
validates before disposing the previous viewer. Exact map.loaded terrain/props/
dimensions override any registry field, including reused IDs. Missing terrain may
use only an explicitly identity-bound, dimension-matching registry field. Explicit
null/undefined terrain never falls back. Current ordinary seed.mapId and proving
seed.map envelopes are accepted with conflict checks; the actual proving exporter
is exercised. Nonempty direct IDs and distinct deployment edges match the existing
authored-map boundary. Canonical event props permit generated shorthand IDs; raw
authored maps still reject that reserved prefix.

Every initial event remains in the stream. Push compares every field of the map
fact structurally, ignoring object key insertion order only, before appending an
incoming detached batch. Duplicate/contradictory facts reject atomically, allowing
a corrected retry. It examines only incoming events, not accumulated history.
Host edits cannot change prepared field data or stored events. No gameplay rule,
state, RNG, event payload or snapshot version changes; current rules remain .12.

Static N² Uint8 distance generation/decoding is removed. The engine's existing
exact accessor supplies distances; 1×300 yields 299 and 10,000-cell pure field
preparation succeeds. Source structure (linear field arrays and geometry adjacency,
no pair table) is the no-quadratic-allocation evidence; JSON size is a guard, not
an allocation benchmark. Historical table hashes remain test-only evidence for
all prior sizes. No DOM with 10,000 cells is constructed solely for this check.

## Evidence checkpoint

Four corrected meaningful red DOM/drop probes reject unknown maps, keep stale
dimensions/ground, or accept malformed terrain on the previous page. The first
red attempt had a fixture seed-envelope error and is retained separately. Two
more component reds prove missing initial facts and contradictory pushes were
accepted; a nested-key-reordering red guards structural equality. Cause identity
and authored-ID boundary reds are also retained.

Current focused checks: 23 engine tests plus typecheck; 12 viewer source-bundle
tests. They cover actual mounting/drop, distinctive water asset rendering, exact
stage/hex geometry/prop marks, same-ID isolation, input mutation, split live
streams, seek/step equality and actual proving export transport. Direct-map battle
fixtures use production createBattle/runBattle events with an explicitly assembled
export envelope; they are not described as CLI-produced files.

Candidate build 1 passed all 23 prior replays. Candidate build 2 exposed the old
synthetic drop probe changing mapId without changing causeId; both identity fields
are now changed coherently, retaining the actual drop and ART-PENDING checks.
The fake DOM's CSS parser splits semicolons in base64 URLs, so focused ground
tests supply a distinctive ordinary asset URL and assert the real draw recipe.
No product art or DOM assertions were removed. Historical field and distance
assertions are preserved as frozen byte hashes and all-pair test comparisons.

The custom-map timed pump drains and matches both manual stepping and seeking;
real setup unit.equipped and layer.painted events precede map.loaded and retain
their folded effects. Sparse array extension and nested-key-order regressions
have explicit red/green evidence. The thin DOM fixture is preparation-only; the
actual 1×300 and 10,000-cell geometry probes also run at the engine boundary.

Engine nonlanding gate attempt 1 passed all 1,292 tests, typecheck, every unchanged
control hash, both live maps and kill switch. No historical engine tests changed.
One warning names two candidate rulings: CODEX.md:981's aura commentary and
COMBAT-DESIGN.md:66's proposed encounter tail. Neither is redefined here. The
plumbing shape uses the gate's ordinary non-mechanism classification; no explicit
exemption fields are declared. Viewer nonlanding gate attempt 1 passed all 23
production replay checks and all 12 direct-map probes, with door/law/type checks
clean. Parent source review is complete. These were the pre-landing checkpoints;
the completed engine verification follows. Human visual
acceptance is unverified; existing browser security restrictions remain.

## Final engine verification

Landing attempt 1 passed and committed as 285bf12 (the gate printed c71919e
before its automatic seal-ledger amendment). The gate's committed-tree rerun
passed the full suite and unchanged controls. Separate batch audit
`node tools/audit-all.mjs --label v2-viewer-direct-map` passed: 1,292 tests,
typecheck, all 22 control hashes, whole-core hardcode and publication checks.
The landing and audit outputs are retained in scratch/viewer-direct-map-*.log.

The seal is withheld for exactly one candidate-ruling warning; no explicit
exemption fields or human verdict are claimed. The tool count is 141 of 173
landed, 46 awaiting review, 13 sealed and 32 pending. Existing LOS and tooling
verdicts are untouched. No gameplay, RNG, event payload or .12 rules changed.

Final viewer regeneration and `--land --fresh` verification use the clean engine
commit containing this receipt and audit evidence. Root STATE.md owns the final
engine bookkeeping and viewer publication hashes, avoiding a reciprocal hash
update. The earlier passing nonlanding viewer gate is not substituted for that
final provenance check.
