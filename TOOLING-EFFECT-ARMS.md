# Effect comparison arm integrity — landed and audited

Item plumbing.effect-arm-integrity follows audited terrain.high-cell-los.
LOS source e623d26 and evidence f5445df retain the historical withheld seal:
effect measurement errored plus one candidate-ruling warning. This repair
does not rerun or rewrite that verdict. The independent 535-battle comparison
remains the LOS consequence evidence, including 434 exact obstacle-free cases.

The defect: disabling authored maps removes them from MAP_PANEL, so the report
dereferenced an absent WITHOUT row. Separately, partial invalid battle arms
could contribute implicit zeroes to averages, and total invalid arms were
misrepresented as measurable presence. Aggregate rows lack paired-valid
replicate identities; they cannot support a repaired paired mean by subtraction.

The CLI now validates all control membership/totals before numeric reporting.
An explicitly disabled missing control is UNAVAILABLE/PRESENCE-ONLY. Unexpected
missing or extra controls are errors. Any partial/total invalid arm is UNAVAILABLE
with invalid counts and no numerical effect. Complete valid pairs retain their
existing numeric lines and measurable/no-measurable-effect conclusion.

Every comparison emits a final `EFFECT_RESULT` JSON record: version 1,
status measured with empty unavailable list (exit 0), or status unavailable
with nonempty per-map reasons (exit 2). Malformed inputs or child-process
errors fail technically. The gate requires matching process status and a valid
trailer for every result. Missing, malformed or contradictory metadata cannot
receive a clean seal. Unavailable evidence visibly withholds the seal separately
from infrastructure error. It is not successful numerical verification.

Offline-tool exemptions are explicit in the registered specification: battle
content cannot invoke/disable report-validation or gate-classification branches.
Actual CLI and actual gate fixtures replace only child command transport in
guarded temporary directories; they never invoke Git writes or touch live state.
These two exemptions must remain visible in the tooling seal.

Evidence:

- effect-arm-red.log: 8 meaningful failures, 1 preexisting valid arithmetic pass.
- effect-arm-protocol-red.log: same 8/1 with structured unavailable fixture.
- effect-arm-contradiction-red.log: exit 0 with unavailable status falsely sealed
  (1 failure, 13 passes), retained before repair.
- effect-arm-complete-protocol-red.log: 4 failures/13 passes while requiring
  complete results to carry the explicit protocol too.
- effect-arm-final-focused.log: all 17 probes pass; effect-arm-types.log passes.
  Fixtures prove known-disabled/missing/extra controls, exact numeric output,
  partial/total invalid arms and actual gate ledger/run-log/seal outcomes for
  valid, unavailable, malformed, missing and contradictory result protocols.

The original real command `npx tsx tools/effect-size.mts
map.thicket,map.proving.ruin` now completes with exit 2, 18 valid numerical rows,
two explicit UNAVAILABLE/PRESENCE-ONLY map rows and the versioned unavailable
trailer. No TypeError or imputed averages; retained in effect-arm-real.log.
Full tooling pre-land gate passed (effect-arm-gate-1.log): 1,233 tests,
typecheck and all 20 unchanged combat control hashes. The existing ruling
candidate warning and two offline-tool exemptions remain explicit; no historical
tests were edited. Source 0cb1730 (gate printed pre-amend 6fb1211) passed
committed-tree tests and control comparison. The separate audit in
audit-effect-arm.log passed 1,233 tests, typecheck and all 20 current hashes.
Whole-core checks pass; 30 grandfathered source IDs remain. The review queue
is now 45 items because this offline tooling item is explicitly flagged.

The tooling seal is withheld for exactly **one ruling warning and two offline
exemptions**; status done-needs-review. No technical checks failed at landing.
The previous LOS effect-tool error remains in its own history. Report and full
source file list are retained in effect-arm-report.log and effect-arm-source-files.txt.
No combat, content or map/art changes belong here.
