# Passive viewer runtime metadata — viewer.runtime-metadata

Nonlanding engine/viewer gates pass; landing and publication remain pending.
Base engine 1efb95e, viewer fcae3d2. Root STATE owns final cross-package hashes.

## Measured problem and boundary

The previous direct-map page was smaller overall (13,559,714 to 10,523,022
bytes), but its new readonly import retained 915,775 bytes of generated pack.
The field helper imported terrain functions from the eager map registry; the
viewer door also eagerly re-exported catalogs unused by its browser consumers.
Four local fake-DOM boots measured initialization at 114–143 ms before that
stage and 155–164 ms afterward. Instrumentation found 13,021 trigger validations
per boot, but no emit/damage/healing/stat-resolution calls. These are local
measurements, not browser visual acceptance or a general performance promise.

`content/terrain.ts` now owns the existing terrain/layer metadata and composition
verbatim, including its disable seam. `maps.ts` re-exports it for existing
consumers; no rule table is copied. The field helper imports the leaf. The same
viewer engine door exposes `readCatalog()` for static tools; its dynamic imports
retain all normal catalog validation when requested. No sideEffects metadata,
purity annotations, runtime fallback or gameplay changes are introduced.

The passive page build inspects actual emitted esbuild module contributions,
not merely parsed input files. Only types, geometry, canonical prop decoding,
terrain metadata, disable seam and field preparation may contribute engine code.
This is a renderer boundary, not a prohibition on a future sandbox host loading
its combat controller separately.

## Evidence checkpoint

Before extraction, the engine field-bundle probe failed on emitted generated
pack/rng/pack/maps modules, while two real published-map probes passed. The
actual viewer entry also failed its emitted-module probe. Both red logs remain.
After extraction, 26 focused engine tests pass, including the 22 frozen CLI byte
hashes and prior direct-map boundaries. Four viewer tooling probes pass: actual
browser bundle, emitted-versus-parsed guard behavior, normal generator equality,
and malformed catalog rejection with output byte preservation in an owned temp.
Both typechecks pass.

Engine gate attempt 1 passed 1,295 tests/controls/live/kill switch but failed
naming: accidental CRLF conversion made unchanged ASCII map rows look newly
added (`www`). Restoring original LF-only source removed that false addition;
no naming rule, map row or test was changed. Attempt 2 passes every hard check,
all 22 controls and existing tests untouched. One candidate-ruling warning
remains: THREE-PACKAGES-PLAN:188 (the honored readonly door) and COMBAT-DESIGN:477
(Flight, unchanged). No explicit exemptions or human seal are claimed.

Viewer gate attempt 1 rejected metadata diagnostic/fixture path literals under
the broad source-door scan. The guard now inspects path components from esbuild
data; the actual import scan is unchanged. Realistic generated-pack/mutator paths
with positive emitted bytes still reject. Attempt 2 passes all 23 replay cases,
12 direct-map probes and four tooling checks, plus door/law/type/22-map checks.
Both failures and repairs remain in owning-package logs.

The candidate page measures 9,561,850 bytes versus prior 10,523,022. Rebuilding
its exact script in memory (asserting byte equality) gives an actual emitted
engine contribution of 21,314 bytes across six allowed modules, with zero
catalog or mutator output. The previous generated pack alone contributed
915,775 bytes. These size facts do not claim browser performance. Final clean
provenance/publication measurement follows after engine landing and audit.

Existing snapshot .12, event payloads, controls, catalog publication and user
maps/art are unchanged. Human visual acceptance remains separate.
