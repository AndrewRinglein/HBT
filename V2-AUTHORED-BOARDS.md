# V2 authored board dimensions — implementation receipt

Item: `board.authored-dimensions`. Engine base: `76cbd2e`. Authored content source:
`e8a9ebc`. Behavior remains owned by the root V2 design documents; this records
implementation choices and evidence, not a competing map design specification.

The four preset names and dimensions remain convenience labels. Authored boards
accept positive safe-integer dimensions with at most 10,000 cells. Validation
precedes geometry cache lookup and allocation, applies to content maps and
encounters, and checks loaded maps, setup, snapshots and export. Declared map
dimensions, format and deployment metadata must agree. Snapshot rules are .9.
The 10,000-cell ceiling is a provisional resource bound aligned with the atlas.

Two flat TEST maps and encounters prove 20×10 journey and 40×40 transport through
the normal publisher, real deployment/movement, deterministic simulation,
save/reload and JSON export. These technical open boards are not conversions of
user maps. No user map/art bytes changed. LOS, props, atlas conversion and inline
map setup remain later stages; visual acceptance is not claimed.

## Red probes and publication

- Initial engine probes: 14 failed / 14 passed. Initial content probes: 16 failed /
  16 passed. Corrected malformed-row parameterization was rerun before the loader
  implementation; all red logs remain in `scratch/authored-boards-*-red.log` and
  `scratch/authored-boards-red.log`.
- Subsequent red probes caught metadata coercion/missing names, missing TEST
  encounter transport, invalid encounter coordinates and null encounter boards.
- A coherent 10,100-cell snapshot was accepted under the counterfactual former
  1,000,000-cell ceiling and rejected by the new shared bound. The counterfactual
  restores the exact source bytes after the probe. Exact 10,000-cell acceptance
  is covered in content compilation and geometry without simulating a huge battle.
- Content full suite: 73/73 passed. Normal dry publication and publication passed
  the browser verifier (21 tabs, no page errors or failures), 102 fielded unit
  definitions and the engine smoke battle. Actual source commit is `e8a9ebc`.
- The initial dry run timed out in the existing browser click check; cause remains
  unconfirmed. Its log is retained. The unchanged retry passed; no timeout or
  assertion changed and no publication preceded that passing check.
- Before/after byte comparison of all 11 publisher outputs proves only engine
  `pack.ts` and `pack.stamp.json` changed. Unrelated preexisting content generated
  files and stale lock artifacts were preserved.

## Baseline and historical test findings

The first 18 map IDs are frozen explicitly and remain the registry prefix. Every
one of their control hashes exactly matches `76cbd2e`. The only added controls are
`test.map.journey-20x10` (`dc798a4e`) and `test.map.authored-40x40` (`3d7f4f24`).
The comparison requires unchanged order, exact old hashes and exactly those two
new keys; its script and output are retained in scratch.

The first focused run found the old universal four-format restriction. Its probe
now preserves the original 18 preset checks by frozen ID membership and verifies
bounded dimensions and exact terrain size for every map. The first full gate
then failed only the old universal `encounter.*` registry assertion. Shipping
entries still require `encounter.*`; TEST exceptions must both start with
`test.encounter.*` and belong to `UNIT_PACK.test.encounters`. The `battle.*` ban
remains explicit. Ground effects, early victory and other assertions are intact.
These intentional historical changes remain review flags; no human verdict or
seal is fabricated. The failed gate record is preserved.

The gate's two ruling candidates were read: the Militia deployment note does not
change board dimension legality, and the ban on procedural battle maps remains
respected by the two stable flat TEST fixtures. No ruling is being reopened.

After both repairs, focused tests passed 49/49 and typecheck passed. The repaired
full gate passed 1,139 tests, both live map probes, exact old controls plus only
the two declared additions, publication provenance, hardcode/naming checks and
the real content kill switch. The gate retains the two warning categories
(candidate rulings and intentional historical test edits), so a landing cannot
claim an unqualified seal.

## Final landing and audit

The gate landed the item as amended engine commit `589e01e` (its printed
pre-amend commit was `a9c2c4c`). Committed-tree tests and all 20 current controls
passed. The mandatory separate `audit-all.mjs --label v2-authored-boards` also
passed 1,139 tests, typecheck, all 20 golden controls, whole-core hardcode and
published-source checks. The audit's 30 grandfathered IDs and historical review
queue remain visible; this item does not relabel them as new failures or fixes.

Status is `done-needs-review`; seal withheld for candidate-ruling and historical
test-edit warnings. There were no manually requested exemptions or review
verdicts. Both failed attempts and passing logs remain committed. The root and
engine progress pages are rebuilt and synchronized after this receipt; their
final hashes are reported in the handoff. No further item is part of this stage.
