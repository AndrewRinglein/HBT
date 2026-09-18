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
