# Authored action slots — capability.authored-slots

An action's profile determines its effects; its authored slot determines which
opportunity may pay for it. Attack, power and movement use the same slot planner
through internal execution, public commands and every AI mode.

## Recorded choices

- Both policies enforce `movement | primary | either`; absent means `either`.
- `byProfile` prefers movement for displacement and primary for other profiles,
  falling back only to an open authored-compatible opportunity. `any` prefers
  movement first. The default remains `byProfile`; no flag swapping or alternate
  legacy legality path exists.
- An optional public `slot` selects `movement | primary`; incompatible requests
  reject without mutation. A paid primary closes earlier movement and the public
  action cycle. Internal `executeAction` stays driver-neutral.
- Free actions spend stamina/cooldown/uses but no slot. They may occur before
  primary, including after movement. Reactions ignore activation restrictions and
  order but retain readiness and resource costs.
- The AI retains existing modes and previews. Its transient decision context
  considers each free action ID once per cycle, continues after successful
  choices, and stops on an explicit idle decision, no progress, incapacity or a
  completed primary. A finite bound of two paid opportunities plus the registry's
  free IDs throws if violated; it never silently truncates an invalid battle.
  This once-per-cycle choice is an AI policy, not a human/core charge limit.
- Slot state and sampled movement allowance reuse existing unit/cursor fields.
  Surge reopens both opportunities within the same Activation. Snapshot rules
  advance to `v2-migration.7` without compatibility migration.

## Flat content and evidence

`content/mkenginepack.mjs` transports slots through real attack, movement,
class/item power and TEST routes. Invalid slot/free metadata fails before output.
All loader families validate the same metadata. Absence and explicit `free:false`
remain distinct. New TEST attack, power and movement variants are published through
the normal transactional publisher, with the actual content commit in the stamp.

Initial rule probes: 17 failed / 17 passed against the unimplemented baseline.
Compiler probes: 4 failed / 3 passed; expanded authored-free probes added two red
cases. Loader probes added four red cases for malformed free and lost false.
The fixed focused suite covers effects, costs, slot order, multihit/area spending,
reactions, resource exhaustion, all AI modes, human resolver parity and saved
continuation/Surge. Logs are retained in `scratch/authored-slot*` and
`scratch/action-slots-*`.

Broader verification exposed historical assumptions, retained in failure logs:
15 focused failures assumed profiles were restrictions or public primary left
the cursor acting. These now request the already-spent slot explicitly or model
the direct driver's cycle closure before exact snapshot comparisons. Three full
suite failures exposed direct-executor setup: an ungranted Swift Flight, repeated
Devotion in closed slots, and a legacy refusal event. Swift is explicitly granted;
each Devotion use begins a real activation and must succeed; unpaid Leap is an
exact state/event/RNG no-op. The original resource, floor and AoO assertions remain.
These intentional historical-test edits require the gate's review flag.

## Explicit next contract

Universal `action.spent` replay metadata is not implemented in this item. It is the
immediately following stage, requiring an explicit metadata-only control baseline
transition. This stage adds no conditional event fallback and does not claim that
a passive viewer can infer an explicit slot choice. Human visual acceptance is
also not claimed by technical tests.

The first full engine gate passed 1,070 tests, typecheck, both live attack variants,
all 18 control hashes, hardcode/naming checks and the content kill switch.
Content tests passed 19/19; ship:dry validated 102 fielded definitions and a smoke
battle, and ship published only pack.ts/stamp from content commit `750e59c`.
The old-loader counterfactual failed 21/22 probes before restoring the new loader.

The first gate's extra source warning classified its new `showcase.*` fixture as
unpublished gameplay content. The fixture is TEST-only; its name is now
`test.authored-slots`, the existing testing lane. The original warning remains in
the gate log. Historical-test/ruling warnings remain for human review.
The source landed as `9de978b` (the gate printed its pre-amend `c5d2861`).
The committed-tree test suite and all control hashes passed before the gate
finalized the landing. The required `v2-authored-slots` batch audit also passed:
1,070 tests, typecheck, all control hashes and whole-core hardcode/source checks.
See `scratch/land-authored-slots.log` and `scratch/audit-authored-slots.log`.
No exemption was taken. Two review flags remain (candidate prior rulings and the
documented historical-test edits); the landing stands and the Iron Gauntlet seal
is withheld. No human visual acceptance is claimed.
