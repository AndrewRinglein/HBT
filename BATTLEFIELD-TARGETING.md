# Shared battlefield targeting input — 2026-09-17

The passive component accepts optional `onHexClick(hex)` at mount and exposes
`setTargeting({legalHexes, centre, hexes, shielded: [{hex, props}]} | null)`.
All four fields are required. Centre may be null. Hex arrays contain distinct
integer board indices; shielding rows carry exact hex and string prop IDs.
Plain objects/dense arrays are validated without reading accessors, then copied
before any mutation. Malformed payloads leave the prior overlay and callbacks
intact. This is presentation validation, not combat legality.

Legal centres are native transparent buttons with accessible names. Footprints,
centre and terrain shielding copy supplied POS/display-height facts, including
footprint cells outside legal centres. No radius, floor, occupancy, line-of-sight
or shielding calculation is added. Targeting lives outside folded battle state
and independently of durable replay BURST facts.

The host receives only supplied legal hexes. Only synchronous `true` consumes a
unit click; otherwise ordinary inspection remains. Unit callbacks read the
current folded UID position. No command executes here. Replacement (even the
same hex), null, seek and disposal invalidate retained overlay callbacks.
Disposed/faulted unit callbacks cannot fall through to inspection. Host callback
exceptions use the pump's fault/onError path. Faults clear targeting without
redrawing; onError may safely call setTargeting(null). Non-null targeting on a
faulted component is rejected, and repeat faults preserve the original error. A camera drag suppresses its pointer
release click; native keyboard activation (`detail === 0`) remains available.
A 4 screen-pixel threshold from pointerdown preserves click jitter and applies
the full initial pan delta; SELECT/INPUT/TEXTAREA keep their native arrow keys.
Keyboard focus is highlighted inside the clipped hex.
Camera movement/key bindings remain presentation-only. No host callback means
ordinary unit inspection remains available.

## Evidence

Published baseline: ce98450 (source 2ecbe39, engine 22c8c79).
Initial test setup read command-fixture units before setup folding; repaired the
helper to seek to its real burst declaration boundary. That setup rejection is
not behavioral evidence. Corrected reproof against the unchanged published page:
7 failures: six missing target-input API cases and the retained disposed unit
listener still inspecting. Current source passes those seven and an additional
neutral-footprint probe. Real movement fixture proves persistent unit position
changes from 85 to 84; no manufactured movement events.

Focused command: `node --test tools/targeting.test.mjs tools/bursts-player.test.mjs tools/bursts.test.mjs tools/clock.test.mjs`.
Full check/publication: `node tools/gate.mjs --fresh`, then after source commit
`node tools/gate.mjs --land --fresh`. Results recorded below before publication.

No engine, Kingdom, events, maps, assets or art changes. The existing 29 replay
inputs and three frozen Atlas bindings remain unchanged. This API does not yet
add Kingdom targeting controls. Fake DOM verifies actual registered callbacks,
button attributes, exact positioning and lifecycle; browser-native keyboard
activation/layout and GPU/human visual acceptance remain unclaimed because the
prior browser security rejection remains in force.

## Review repairs and verification

The first full fresh gate passed (26 source + 58 built + 12 direct-map tests,
29 complete fold/seek checks and 29 exact fresh histories). Review then added
three failing probes: click jitter suppression, SELECT arrow-key capture, and
recursive render failure when onError clears targeting. All three are repaired;
existing assertions remain. The focused set now contains 44 passing tests
(11 targeting, 21 burst, 12 clock). Final-source fresh gate passed: 26 source + 61 built + 12 direct-map tests
(99 total), 29 complete fold/seek checks, and 29 byte-identical fresh histories.
Both full check attempts passed; the second includes all three review repairs.
Clean publication is run after this source commit so the page stamps its exact
source SHA. Logs: `.build/targeting-gate1.log`, `.build/targeting-gate2.log`,
`.build/targeting-land.log` (publication).

## Reentrant host disposal follow-up

Initial source fdbd8fe and clean publication e2fc92f passed the full gate above.
A further real boundary probe disposes the component inside onHexClick and
returns false. It failed: the unit handler still set inspectId after disposal.
The handler now checks active state again after the host callback before any
inspection fallback. The retained callback is also inert. This adds one probe
(12 targeting / 45 focused total), without changing host consumption semantics.
The follow-up runs the same full fresh check and clean publication gates; logs
`.build/targeting-reentrant-gate.log` and `.build/targeting-reentrant-land.log`.

Follow-up fresh gate passed: 26 source + 62 built + 12 direct-map tests (100),
all 29 fold/seek checks and 29 byte-identical fresh histories. The additional
assertion is retained in both source and built-page verification. No gate was
skipped or weakened; the only failed checks were the documented red probes and
initial fixture setup attempt.

## Shared test DOM detachment repair — 2026-09-18

Kingdom's board-targeting lifecycle probe exposed a test-infrastructure defect:
innerHTML/textContent replacement discarded children without detaching their
parentNode links. Retained removed controls therefore incorrectly passed native
contains-style guards. Two focused probes failed before the repair, one for each
setter. The shared fake DOM now detaches direct subtree roots before clearing;
descendant identity/parent relationships within those removed subtrees remain
intact. Tests also verify querying, contains and later reattachment.

This is a tools-only repair, included in the normal source gate. No product
containment guard, renderer, engine event, map, asset or battle was changed to
accommodate the broken harness. The unchanged Kingdom candidate board-targeting
probe now passes its full empty/occupied click and stale-input lifecycle checks.
Kingdom's in-progress source remains separate and uncommitted during this stage.
Full fresh check and clean-source publication are required here; source and page
commits remain separate. Browser/GPU/human acceptance remains unclaimed.

Full fresh repair gate passed:28 source +66 built +12 direct-map tests (106),
29 complete fold/seek checks and29 byte-identical fresh battle histories against
clean engine22c8c79. No full gate failure occurred in this repair; the only reds
were its two deliberate pre-fix detachment probes. Clean publication repeats the
same gate after the source commit. Logs: .build/fakedom-detachment-gate.log and
.build/fakedom-detachment-land.log. Existing art, source maps and all29 stored
battle envelopes remain byte-identical.
