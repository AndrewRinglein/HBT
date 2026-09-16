# Elemental and Protection display adoption — 2026-09-16

The viewer adopts clean engine 6bb36dc, including all 28 published replay
exports. Six damage types have distinct labels/colors, and authored Fire,
Poison and Shadow resistance values survive the passive sheet transport.
Current shields use published absorbing-status metadata and observed counters.

Unsupported numerical tick forecasts and future-death skulls were removed,
as was the guessed base-sheet mitigation number beside aim. Current HP,
statuses, actual Deathbed marks and engine-emitted hit/damage facts remain.
This removes incorrect predictions; it does not implement an engine forecast.

Three meaningful regression probes first failed on the old guessed aim field,
missing named defenses and the old forecast formula. They now pass. The first
full check also caught missing absorbing-status metadata in the builder's
explicit bundle object; correcting that transport made the built checks pass.

The full fresh check passed: 7 metadata/display tests, 26 renderer tests,
12 direct map/drop tests, built verification of all 28 battles (762 damaging
rows and 4,326 plain rows), and byte-identical fresh exports for all 28 entries.
Independent built fixtures check actual resistance labels/values, custom shield
metadata, and that a large Burn counter cannot invent future HP or death.
Publication passed the same full fresh gate after source commit a48cb9f. The
published page stamps that source and clean engine/sheets/fields 6bb36dc.

Human visual/GPU acceptance remains separate. No denied browser route was
bypassed. Maps, source art and combat resolution are unchanged by this adoption.
