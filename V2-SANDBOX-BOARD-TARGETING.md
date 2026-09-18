# Sandbox battlefield targeting — 2026-09-18

Owning item: v2.sandbox-board-targeting, ISC069. This stage adopts the already
landed shared viewer targeting API in Kingdom; it does not change combat rules.
Engine22c8c79 is unchanged. Shared viewer source40d682a/publicationdcb51d2 includes
the separately verified test-DOM repair described below.

## Boundary

The host reuses its one selected engine burst preview. sandboxTargetingOf copies
legal centres from that action/slot's validated choices and the exact preview
centre/footprint/shielded target prop IDs into detached arrays. No host radius,
visibility, LOS, shielding or damage computation is introduced; floor-void cells
in an engine footprint are not removed. The viewer draws its existing exact
projection and display heights. The setTargeting declaration now describes the
four required fact fields on the shared JavaScript component's TypeScript seam.

onHexClick captures the installation epoch and rejects old sessions, busy/faulted
or completed battles, non-acting/non-human actors, non-burst actions and commands
whose expected sequence or legality no longer validates through the engine.
A consumed click only selects the aim and refreshes the selected forecast.
Execute remains the sole action command; the dropdown remains usable. Ineligible
or non-burst unit clicks retain ordinary inspection. The help text is simply
Choose a hex, then Execute when an active burst can be selected.

controls clears old targeting before deriving current input, and only reinstalls
facts for an idle valid burst. Execution, playback, faults, selection, outcome,
replacement and seek clear facts. Skip seeks to current engine state and may
repopulate fresh current facts. A rendering fault can clear targeting without
recursing into the failed renderer.

Dynamic buttons and selects require native host.contains membership. Command
selects additionally check the appropriate acting/selecting phase and busy/fault
locks; disabled attributes alone are not the guard. Current mounted setup and
transfer controls remain valid across installs, while removed setup controls are
inert. Persistent viewer callbacks also have the installation-epoch fence.

## Red, verification and infrastructure repairs

The exact-facts ISC069 probe failed against a null projection, then passed the
implemented copy and verified that consuming/mutating output does not alias the
preview/choices or alter engine state/events/RNG. The old published page failed
the built probe because there was no legal centre81 board button.

Twenty focused tests passed. The first typecheck found the existing Kingdom
component declaration lacked setTargeting; its exact public signature was added.
The next built test showed stale detached controls passing contains because the
shared fake DOM's innerHTML setter retained removed parent links. Work paused
for the coordinator's bounded infrastructure repair. Native production guards
were not weakened or changed to accommodate the broken harness.

Viewer40d682a repairs innerHTML and textContent subtree detachment with two
meaningful red-to-green probes; clean publicationdcb51d2 passed both full fresh
gates (106 tests and29 exact replay histories). No runtime viewer, art, map or
battle envelope changed. After that repair the complete Kingdom board-targeting
candidate probe passes unchanged, including retained callbacks and controls.

The existing sandbox smoke's retained detached Execute assertion intentionally
changed: it still demands no event mutation and now requires the command/error
panel remain exactly unchanged, instead of expecting a new busy warning. This
is the required inert-listener behavior, not weaker command protection.

Built tests use real Priory hero.base.warrior-fearsome, one zombie, seed1. Empty
81→100 clicks and occupied enemy92 after legal85/90/72 movement select forecasts
without mutating engine state. Exact engine footprint/legal facts and authored
display heights are checked through the actual shared component. Tests cover
native keyboard click, drag suppression, click jitter, dropdown arrow ownership,
ordinary inspection, same-session stale controls, reset/resume callbacks,
persistent versus removed Reset, busy/selecting/outcome/fault locks and recovery.
Fault injection is a renderer exception; no fake combat event or unit-state edit
is used for the command route. Prior burst payment/save/replay checks remain.

Commands: tools/gate.mjs v2.sandbox-board-targeting (check and --land), independent
tools/slice-gate.mjs, build-sandbox plus sandbox-targeting.verify, sandbox-bursts.verify,
sandbox.verify and sandbox-roster.verify; build-slice plus smoke-slice and the
three atlas-surface.verify probes. Logs use scratch/board-targeting-*.log.

No source art, maps, content or engine edits. Human/browser/GPU acceptance remains
unverified; the browser security denial was not bypassed. Historical failures
and withheld seals remain distinct from technical gate results.

First Kingdom full gate passed244 tests, typecheck and all62 P probes. The red
probe hash is daa5d726c65f. There was no full gate failure for this item; the two
pre-gate findings were the recorded declaration and shared fakeDOM repairs.
The existing burst-policy candidate ruling remains a review flag. Landing and
independent committed audit follow, with the prior criteria/history preserved.

## Landing and independent audit

Source64fc35b and bookkeeping7d79d9a landed with244 tests, typecheck and all62
P probes passing. Independent committed-tree audit again passes62 probes with
zero regressions. Count:61 of69 closed,62 probed,1 accepted. No criterion state
or seal was manually edited; the existing candidate-ruling flag withholds the
seal. No human acceptance was recorded.

Both pages are rebuilt from the clean receipt checkpoint against engine22c8c79
and shared viewerdcb51d2/source40d682a. Publication requires all four built sandbox
checks (board targeting, burst dropdown, prior sandbox/replay,24hero roster),
retained campaign smoke and three Atlas lifecycle/CSS probes. Root checkpoint
records the final source/page hashes after these checks and the page commit.
