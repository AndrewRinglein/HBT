# Standalone sandbox base roster — 2026-09-17

The sandbox derives all24 `hero.base.*` presets from authored engine UNITS names
and class tags, generated HERO_KITS and HERO_ITEM_SLOTS. Unit type equals the
canonical ID. Missing kit, slot, name or unambiguous class fails with the hero's
name/ID; no row is silently omitted. Presets use the existing level1 Hero defaults
and copy arrays. The default party remains three; limits stay1–6 heroes and
1–15 enemies. Campaign HERO_POOL and drafting retain the existing five rows and
Lucius/Osric aliases; only stale comments were corrected there.

ISC069 now fields every authored hero through the normal makeBattleState →
battleOptionsOf → createBattle seam on Priory. Names/classes/kits/slots are exact,
granted actions resolve, and the three actual burst-bearing kits are recorded:
paladin-dark and warrior-barbarian carry attack.greatsword.great-cleave;
warrior-fearsome carries attack.halberd.cleave. This stage does not offer burst
centre controls or claim those actions playable through the UI yet.

Additional probes retain all prior behavior and verify independently cloned
duplicates/distinct stable UIDs, deterministic setup, save/frozen Atlas identity,
unknown IDs and roster bounds. The built roster smoke selects all24 by their
actual dropdown names, starts actual engine sessions, and checks exact published
tokens/portraits. Existing built sandbox command/playback/fault/save/replay-import
and campaign outcome-picker smoke remain unchanged.

## Red and repair evidence

ISC069 red was recorded against the original five-row source, then re-proven
with final probe bytes against exact e5a86ca src/content/sandbox.ts. Only that
owned source was temporarily replaced and restored byte-for-byte. The built old
page also failed the new24-option assertion. No status or seal was hand-edited.

Two harness/type-boundary findings required the coordinator's bounded repair:
fielded engine names add the existing LETTERS suffix ('Emberwright A'), while
presets must retain the raw authored name; the probe now asserts both exactly.
The inherited action-label function assumed destination-or-target, but the
current engine union also has centre. Its exhaustive label now accepts centre
without adding centre choices or changing combat. Focused14 probes and typecheck
pass; existing assertions were retained. The final red was recorded again after
the probe repair.

Owning item: v2.sandbox-base-roster. Verification commands: tools/gate.mjs with
check and --land; independent tools/slice-gate.mjs from the committed tree;
build-sandbox.mjs plus sandbox-roster.verify.mjs and sandbox.verify.mjs;
build-slice.mjs plus smoke-slice.mjs and node --test tools/atlas-surface.verify.mjs.
Logs are under ignored scratch/roster-*.log.

Engine22c8c79, shared viewer source4a8e369/publication13bdcfe. Both generated
Kingdom pages will be rebuilt at the final clean source checkpoint. Source art,
maps, content package and engine are unchanged. Technical checks do not grant
GPU/native-browser or human acceptance; the existing browser block is respected.

First full gate:238 tests/typecheck/ISC069 passed, but the ISC025 subprocess
returned only its opening line and was recorded as a regression. The exact
cold-run command then completed successfully in about1 second, followed by the
owning ISC025 probe passing; no production change or weakened check was made.
The failure/history is retained as an apparent interrupted subprocess, not
balance evidence. A complete gate retry and committed audit follow; criterion
closure recovery must use the owning instrument rather than manual state edits.

The complete gate retry passed238 tests, typecheck and all62 P-tier probes.
The initial subprocess exit cause is unconfirmed. Its recorded regression will
be recovered only after committed audit via `slice-gate.mjs --close 025 --sha`
using the verified source, retaining the historical failure. Candidate-ruling
warnings were inspected: the burst policy remains engine-owned and the quest
ruling remains unchanged; no extra mechanics or human seal are claimed.

## Landing and independent audit

Source4d7395d and bookkeeping0dd175a landed with238 tests, typecheck and62 green
P probes. The candidate-ruling warning remains; the gate withholds its seal and
human/GPU acceptance is not manufactured. Independent committed audit again
passed62 probes with zero regressions. Owning `--close 025 --sha 4d7395d` reran
the recovered cold-start probe, verified its existing red and restored closure
while preserving the recorded failed attempt. Current count is61 of69 closed,
62 probed,1 accepted. The final source checkpoint includes this receipt and
instrument-owned closure; both pages are then rebuilt and all built smoke
commands repeated before publication. No gameplay change repaired ISC025.
