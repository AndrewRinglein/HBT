# V2 human activation choice — 2026-09-16

The engine now offers a trusted human selection boundary before beginActivation.
advanceBattle(ctx, policy) returns selecting with stable unit UIDs. The host sends
{kind:'select-activation', unitUid, expectedSeq} through executeBattleCommand;
activationChoices is a detached read-only list, not a host-owned queue. Engine
selection emits activation.selected, then the next advance begins that actor.
No begin hooks, resource resets or Surge rolls occur during selection.

The captured remaining phase queue owns eligibility. Standing, unblocked human
actors are selectable; dead, spent, wrong-phase or AI-owned actors are not.
Positive AI-control statuses override trusted UID policy. Mixed-control ordering,
blocked ladders and no-policy snapshot resume are specified in SWITCHES.md.
Surge keeps the selected actor. Default automatic battles emit no new event.

Twelve dedicated probes cover the strict command boundary, accessor rejection
without getter evaluation, exact atomicity, two roster sides and non-index UIDs,
mixed AI order, captured arrivals, ownership overrides, Surge, independent forks,
pending and selected snapshots, spent-queue rewind, and exact automatic
state/events/RNG/result parity. Human movement also equals the shared resolver.
The pre-change implementation failed eight meaningful behavior probes while the
automatic control passed (scratch/activation-choice-behavior-red.log). An initial
fixture typo failed before behavior and is retained separately, not counted as
red proof. A subsequent malformed-snapshot probe exposed a spent-actor rewind;
that red is retained and repaired. Initial focused verification passes 196 tests across
five files plus TypeScript, with no old test edits.

This session API is not registered content and automatic simulation intentionally
does not request human choices. The explicit unreachable exemption is structural:
its bundled content kill-switch is not applicable, and is NOT claimed passed.
Behavioral red and microbattle/parity/snapshot evidence supply the actual boundary
proof. This exemption and any other gate flags withhold a clean seal. Snapshot
rules are .16. Technical checks do not establish human/GPU visual acceptance.

Full gate, landing and batch audit results follow below.

Source review retained cursor-side snapshot validation: production has no Unit.side
mutation after construction. A twelfth probe restores/forks actual AI-control
status changes and rejects a forged allegiance change. Future allegiance mutation
requires a captured-side history contract, rather than silently relaxing validation.

Candidate full gate passes 1,373 tests and all 22 controls remain unchanged.
The gate explicitly reports the structural content probe/kill-switch as
inapplicable; it supplies no clean seal. Final focused verification passes
197 tests including the reachable ownership/snapshot review probe.
