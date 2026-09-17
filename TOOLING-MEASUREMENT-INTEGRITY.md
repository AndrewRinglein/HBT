# Experimental measurement integrity — implementation receipt

Item `plumbing.measurement-integrity`, following engine baseline `37b6ffd`.
This is a tooling/content-boundary repair, not a combat or authored-content
change. Historical burst source `0c6fa07` and its withheld seal remain intact.

The failure was global: importing content with Storm disabled validated every
item against the already filtered action registries, so even an unrelated
warrior-versus-zombie battle failed before setup. Complete private attack,
ability, movement and burst definitions now own authored collision checks and
item/enchanted grant validation. Only exported live views are filtered. Unknown
grants still fail even when their misspelled ID is disabled; disabled malformed
or duplicate profiles still fail. Items are never cascade-disabled. Required
missing weapon grants still fail at actual fielding. A removed optional power
remains absent and cannot execute; no replacement action is invented.

The effect tool now clears only CF_DISABLE_IDS for its WITH arm, preserving
unrelated environment settings. WITHOUT explicitly selects the requested IDs.
Previously, a shell-level experiment silently contaminated WITH as well.

Game Builder uses `tools/measurement-label.mjs` to interpret recorded evidence.
An error verdict wins over contradictory output. Unavailable evidence, including
invalid battle arms, has a distinct label. A successful versioned measurement
contract may say measured; unclassified legacy text says status unverified.
Raw report text remains escaped, and neither historical ledger nor seals are
rewritten by presentation. This also corrects historical errors formerly
prefixed with the misleading word "measured".

## Red and focused verification

An initial child-script syntax mistake was fixed before counting behavior
evidence. The corrected preimplementation probe set had **14 failed assertions
and five passing controls** (`runs/measurement-integrity-behavior-red.txt`):
three disabled action kinds blocked unrelated battles, a real omitted power
could not be inspected because import failed, required-weapon failure occurred
at the wrong global boundary, two duplicate profiles escaped collision checks,
six Builder labels misreported their status, and inherited WITH contamination.
Controls retained unknown item/enchanted grant rejection, malformed disabled
burst rejection, and two already-valid measured labels.

After repair all **19 probes pass** (`runs/measurement-integrity-focused.txt`).
Fresh-process unrelated battles compare complete event/state/RNG/result hashes;
missing Storm execution is rejected atomically, and a missing required Hack
weapon action still produces its precise fielding error. Generated Builder
fixtures assert output labels, escaping and unchanged source ledger bytes.

## No-disable comparison

`TSX_DISABLE_CACHE=1 npx tsx tools/compare-measurement-integrity.mts` materializes
the exact prior source `37b6ffd` in a guarded temporary directory and asserts
all **42 cases match in events, state, RNG and result**. Nothing is regenerated
as an expected value. Recipe is tracked; summary and per-case hashes are in
`runs/measurement-integrity-comparison.txt` and
`runs/measurement-integrity/no-disable-comparison.json`.

## Fresh paired measurements after the repair

The exact prior failure command now completes with a valid measured contract:

```powershell
$env:TSX_DISABLE_CACHE='1'
$env:CF_DISABLE_IDS='attack.halberd.hack'
npx tsx tools/effect-size.mts attack.test-arc.sweep,power.lightning-staff.storm
```

Source baseline is 37b6ffd plus this repair (final owning commit below). The
inherited Hack omission deliberately exercises the clean WITH environment;
WITHOUT omits only the two command-line IDs. There are 22 maps x 25 paired
battles, no invalid arms. WITH totals 546 hero clears and WITHOUT totals 549;
the three-result difference occurs on test.map.dungeon-16x8 (21 versus 24).
Thirteen controls differ in the displayed wins/rounded mean turns: open, field,
thicket, proving.open/ridge/ford/copse, courtyard, test.showcase, dungeon-16x8,
horde-24, journey-20x10 and high-prop-multi. These are sample observations,
not a final balance verdict. The old burst error and withheld seal are unchanged.
Full output: runs/measurement-integrity-real-storm.txt.

The separate real command `npx tsx tools/effect-size.mts attack.halberd.hack`
reports all 22 maps unavailable: WITH 0/25 invalid and WITHOUT 25/25 invalid
on each map. Asserted the output has no heroWins or meanTurns aggregate lines;
550 valid WITH battles are never compared numerically with 550 invalid WITHOUT
setups. The focused fielding test identifies the missing weapon-grant error.
The versioned report remains unavailable, not zero impact. Output:
runs/measurement-integrity-real-missing-grant.txt.

Full gates and final independent audit are pending.
Two explicit offline-tool exemptions remain visible; no human review is implied.
