# V2 elemental resistance and Protection verification

Work in progress, 2026-09-16. Authority: COMBAT-V2-DESIGN sections 8/18; one writer.

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

No seal or human/GPU acceptance is claimed. Final engine gates and batch audit
remain pending; Protection coverage will be its own item.

First full gate: 1,387 tests passed; generalized-variant scan correctly refused
Burn because an existing vision mechanism names it. The variant pair is now
Poison and Gash: both are data-only typed ticks, both run in real battles. Burn
remains an integration/kill-switch probe. No exemption or gate change was used.
