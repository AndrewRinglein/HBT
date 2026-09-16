# V2 elemental resistance and Protection verification

Engine batch complete, 2026-09-16: both items landed and the independent audit
passed 1,429 tests with exact control goldens. Review warnings/seal limits remain
explicit below. Authority: COMBAT-V2-DESIGN sections 8/18; one writer. Viewer and
Kingdom adoption receipts live in their owning packages.

Initial meaningful engine probe: 7 failures / 1 pass. Physical/magic triggers
bypassed mitigation; elemental attacks used magic resistance; Burn was magic;
named stats were absent. Raw report: runs/v2-elemental/red.json. Baseline changes
were declared before implementation. Content probes exposed unsupported named
unit stats and accepted holy ticks. Two fixture mistakes (units key and sorted
array index) were corrected and meaningful reds rerun before claiming verification.

Existing generated content was preserved in content commit 5ecc07a; pre-existing
root Codex was preserved in root commit 13f03e0. Narrow files only; stale lock
archives untouched. Authored tuning and Shadow interpretation live in SWITCHES.md.

Publication first refused three new legacy audit findings. The V2 trinket exception
permits pure elemental resistance only; Poison Master's exact migrated four-stat
payload has a narrow exception. Mixed trinkets, extra specialty stats and changed
magnitude are negative-tested. Expected finding count remains four. A second dry
run exposed a native module cycle; moving the dependency-free type validator to
types.ts repaired it. Transactional publication passed 21 tabs, zero page errors,
102 fielded definitions and a combat smoke. Content tests: 93 passed; the expanded
seven elemental compiler probes also pass. Published content commits: 84ca066 and
be497df; generated root Codex: 520338d.

The comparison command tools/compare-elemental-transition.mts reconstructs the
actual 1723e63 runtime/content and runs all 41 immutable cursor case inputs against
both engines. Twenty cases change and 21 remain exact. Every changed first event
is Burn or Poison switching from magic to its named damage type; prior event
prefixes are asserted equal. Example: progression-surge-1, event 556, turn 3, hero
phase: magic-resisted Burn dealt zero HP before, now fire deals one HP. Historical
fixtures remain untouched. The separate elemental fixture checks exact current
full events, state, RNG and result with both automatic and suspended drivers.
Focused elemental and cursor tests: 61 passed. Changed historical status/flight
tests explicitly cite the superseding V2 ruling and retain exact decay assertions.

Historical pre-gate checkpoint: no seal or human/GPU acceptance was claimed.
At this point the engine gates and separate Protection item were still pending;
the completed results are recorded below.

First full gate: 1,387 tests passed; generalized-variant scan correctly refused
Burn because an existing vision mechanism names it. The variant pair is now
Poison and Gash: both are data-only typed ticks, both run in real battles. Burn
remains an integration/kill-switch probe. No exemption or gate change was used.

Elemental landing completed: source 07964e6, bookkeeping eb29f67. All hard checks
and committed-tree audit passed with 1,387 tests. The seal is withheld for recorded
warnings and unavailable effect measurement. The WITHOUT arm fails explicitly:
`unknown status 'status.burn' — statuses are an explicit registry`. Removing a
referenced row makes the setup/runtime invalid; this is not measured balance
impact and the content-disable test failure is not behavioral disappearance.
The pre-change behavioral reds and exact old/new comparison remain the evidence.
The first two gate attempts encountered the same variant scan; an initial
newline-sensitive replacement did not modify the variant field. The third run
used the verified Poison/Gash pair and passed. No checks were removed.

Protection red, on eb29f67: 27 failures / 1 passing non-damage control. Tick and
trigger damage with raw 8, combined pools 5 and defense 2 incorrectly lost 6 HP
instead of 1; true damage lost 8 instead of 3. Both sides and six types failed.
Signed-defense and authored Bleed checks also failed; self-damage preview omitted
its damage. Runtime now shares pure absorption; callers emit spending then HP.
The expanded 42 Protection tests include two successive self effects, actual
Eldritch Might, explicit source/target/type and consumed-pool events, overkill vs
actual HP loss, terrain, full decay, negative defenses and non-damage controls.
Together with 47 cursor probes, 89 pass before the full gate.

`tools/compare-protection-transition.mts` reconstructs eb29f67 and compares all
41 unchanged case inputs. Seven cases change, 34 remain exact. Every first
changed event is a same-cause/target Protection/ward reduction before typed HP
damage. New damage.absorbed equals emitted pool spending. Full current state,
events, RNG and result are frozen separately; all earlier fixtures remain intact.

Protection landed at 9d969c5; gate bookkeeping b0245d3. All hard checks and
committed-tree audit pass: 1,429 tests. Seal remains withheld for the ruling and
historical-test-edit warnings. The gate's 25-pair-per-map removal of the two TEST
ward/brace sources completes without invalid runs and reports zero outcome/turn
change; these are TEST cohort sources, so this is not a numerical estimate of the
universal Protection rule's balance impact. The separate old/new 41-case runtime
comparison finds seven changed cases, including one changed battle result.
Elemental comparison changed no battle results in that bounded corpus.

Independent batch audit: clean, 1,429 tests, all control goldens exact, whole-core
hardcode scan passes. There remain 34 grandfathered unpublished IDs and 52 flagged
landings awaiting human review. No human review or GPU acceptance was performed.
Host adoption now removes stale passive-viewer forecasts, retains current shield
counters and publishes the six typed damage/named-defense metadata honestly.
