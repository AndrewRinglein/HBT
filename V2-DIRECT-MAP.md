# Direct authored map input — implementation receipt

Item `board.direct-map-input`, base engine `240993d`, content `e8a9ebc`.
Root V2 documents own behavior; this receipt records the bounded implementation.

Production `createBattle` accepts optional `map`, a plain authored map row with
id, name, rows and optional board, format, note, deployment edges. The direct row
is authoritative. A supplied mapId and any encounter mapId/board must agree.
Both paths share strict validation and decoding. Unknown fields (including
unsupported props/layers/elevation) are rejected rather than silently dropped.
The prior 10,000-cell bound and known terrain glyphs remain. Metadata is detached
before creating context state; no map is inserted into MAPS or MAP_PANEL.

Direct-map `map.loaded` records exact initial numeric terrain in row-major order,
beside its existing dimensions and deployment facts. This array is a detached
initial fact, not an alias to mutable state. No-direct-input event shape and all
20 controls must remain exact. Existing viewer adoption is a later stage.
Snapshot rules advance to .10 for validated setup behavior; no V1 fallback.

Mixed explicit/rolled deployment currently fails to reserve the explicit side's
hexes. Tiny boards can also overlap two rolled sides. Reserve validated explicit
placements and the actual chosen heroes before rolling enemies, preserving
candidate ordering and RNG draws when there is no collision. Enemy spill may
skip a line exhausted by occupants, but physically impassable lines retain their
existing rejection and spill stops at the real board boundary. Encounter
arrivals retain their existing nearest-free shunt; hero zones must also exclude
explicit opposite-side positions. These are placement corrections, not AI rules.

Probes cover the two real published TEST variants, unknown IDs, same-ID isolated
boards, strict malformed data, identity conflicts, all glyphs, mixed and tiny
deployment, commands, automatic continuation, snapshots and JSON replay facts.
Initial red run: 35/35 failed. Correcting the command probe's API typing exposed
an incidental pass on the old default map (34 failed / 1 passed). Adding explicit
unknown-ID/dimension assertions restored 35 meaningful failures before
implementation; all three logs remain. No map/art or content
publication edits are planned. No atlas conversion, LOS, props, viewer or dungeon
persistence is included. Gate, audit, failures and final hashes follow below.

## Verification before the full gate

The first implementation passed all 35 original probes. Review identified two
boundary issues: an eager scenario map lookup could make an unrelated import
fail under a map kill switch, and row validation spread arrays before bounding
them. The repaired decoder bounds row count first and inspects dense own data
indices without invoking custom iterators/getters. Disabling a TEST map now
omits only its dependent direct scenario; unrelated scenarios still run.

The initial boundary-red attempt also triggered Vitest's source-map error
formatter, so it is retained as an infrastructure error, not four counted test
failures. Child process tests now assert exit status and output directly. The
guarded intermediate-source counterfactual then reproduced four clean failing
probes and restored the exact current source bytes. All 45 probes passed after
that repair, including actual CLI replay exports and source-isolation checks.

Ten additional saved-replay corruption probes failed on the former generic
event-header validation; one positive control already passed. Restore now checks
the new exact-terrain payload, identity and dimensions, reusing state terrain
validation without comparing initial terrain to current mutable terrain.
Final focused suite: 56/56 passed; typecheck passed.

The comparison extracts committed `240993d` into a guarded owned temporary tree.
Across 500 control battles and every one of its 30 registered scenarios, all
530 setup/final states, events, full RNG objects, cursors and results are exact.
The four hero-zone scenarios are explicitly included. The 20 baseline hashes
also match exactly. `sample()` uses pure deterministic scores and does not mutate
RNG/logs, so removing an unused zone-edge sample causes no hidden stream change.
A separate setup counterfactual proves the overlap correction: old zone hero and
rolled enemy occupy one distinct hex; the new setup occupies two. No historical
fixture or assertion is changed.

Full gate attempt 1 found two integration failures: the new non-encounter TEST
scenarios lacked explicit hero positions, and the first placement repair allowed
spilling past physically blocked entry edges. The fixtures now name hero hex 0;
separate probes retain rolled deployment coverage. Physical-edge/interior-line
rejection is preserved while occupancy exhaustion can spill without overlap.
The new wall-versus-occupied-edge probe was red before repair. Both historical
tests remain untouched. The failed gate and focused failure logs are retained;
the repaired rerun and final verification are recorded below.

The repaired focused integration run passed 108 tests (57 direct-map probes plus
the unchanged scenario/terrain suites), and typecheck passed. The repaired full
gate passed 1,200 tests, both live direct-map probes, the content kill switch,
all 20 unchanged controls and source/hardcode/naming checks. The two candidate
rulings were read: encounter termination/victory conditions and generated power
rankings do not change this map input contract. Their warning remains recorded;
it is not a human approval or a cleared seal. Final landing/audit results follow.
The final-source comparison was rerun after the physical-wall repair: all 530
battles and 20 controls still match exactly, with the same zone-overlap
counterfactual. Output: `scratch/direct-map-transition-final.log`.

## Final verification

Source landed as `24dfacf` (gate pre-amend receipt `e81fd26`). Full gate and
committed-tree verification passed 1,200 tests, typecheck and all 20 controls.
The separate `v2-direct-map-input` batch audit is clean with the same 1,200
tests and controls. Its ledger marker and `scratch/audit-direct-map.log` confirm
completion; the coordinating agent verified them after the implementation
subagent reached its usage limit. No audit was skipped or repeated as a substitute.

The seal remains withheld for one candidate-ruling warning category. No existing
test was edited and no manual exemption or human review verdict was recorded.
The audit reports 44 historical flagged landings and 30 grandfathered unpublished
IDs; those are distinct from this item's passing technical checks. Both generated
Game Builder copies are synchronized from the final audit. Content remains at
`e8a9ebc`, with unrelated preexisting work preserved. Viewer adoption, atlas
conversion, props/LOS and human visual acceptance remain later stages.
