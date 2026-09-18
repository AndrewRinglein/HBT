# V2 Block / Ranged Block — 2026-09-18

Post-land recovery: the first committed suite timed out after 5,000ms in the
existing 200-battle attack-coverage test (1,611 passed; one timeout). The gate's
built-in reset returned HEAD to 22c8c79. Candidate bf729e0 preserves the exact
25 owned source/test/receipt files; those were recovered byte-for-byte, retaining
the reset-generated ledger/log, old baseline and Builder bytes. Re-registration
uses add-item, never a hand-edited verdict. The isolated unchanged test passed
in 3.21s. Only that test now has a bounded 15s allowance; every seed and assertion
remains. The diagnostic and source-recovery manifest remain in runs/v2-block
and runs/diagnostics. This is a timeout, not evidence of missing committed code;
the gate's generic rollback explanation is not the diagnosis. A fresh complete
landing and independent audit remain required.

Bounded engine item `rule.block`, base22c8c79. COMBAT-V2-DESIGN §6 owns behavior;
SWITCHES records provisional timing, zero/downed, RNG and preview policies.
Shield/class numeric adoption and display are separate follow-ups.

Initial meaningful red: all five block probes fail on the original source:
guaranteed Block still hits; preview lacks Block; onBlock is rejected; Stun has
no defense suppression fact; incoming hit ordinal/event is absent. Content's
three independent reds reject new stats or show Stun's missing flag.

The new incoming cup precedes onAttack; the result freezes before hooks. Ordered
block hooks are defender, attacker, attacker miss. Accuracy and critical cups,
packets and Protection spending are absent on a blocked weapon hit. Unconditional
onAttack effects remain. Generic blocksBlock is independently authored from
blocksAction. Preview exposes conditional hitChance and connectionChanceBps.

Multihit aggregate hit now means any connected hit, preserving the real movement
consumer's hit-stop rule even when the last swing is blocked. Each hit remains
in the result and every incoming cup has its own persistent ordinal. Snapshot
rules advance to .21; no old-save compatibility branch.

Preparation errors are not gameplay findings: several initial read commands
used guessed paths/PowerShell brace syntax. The initial typecheck exposed old
low-cover tests requiring explicit non-null accuracy-roll guards; every previous
assertion remains. The next typecheck exposed new fixture import/tuple/ItemDef
typing. Coordinator repaired those and corrected fixture fork-history/path
expectations against owning APIs; no production behavior changed for a fixture.
These preparation failures did not change production rules to suit fixtures.


Verification checkpoint
-----------------------
Content sourcea896b7f/publicationc27c855:125 tests,21 Codex tabs,108 fielded
bodies and combat smoke. Two TEST variants run actual statmod/Protection hooks;
Gauntlet disables these hook IDs rather than removing an entire scenario.
33 focused engine probes and50 cursor probes pass. One new wrong-slot fixture
initially assumed byProfile prohibited movement: actual slots default either;
the probe now explicitly authors primary-only, preserving its refusal assertion.

Initial592-battle comparison against22c8c79:42 old corpus inputs plus22 controls
×25 seeds. All592 raw event streams differ;13,224 null zero-chance checks were
added. Removing ONLY those checks/new declaration fields, normalizing seq and
removing incoming ordinals gives exact old events/state/RNG/results:0 semantic
or outcome changes. Old32.89s/current33.88s (concurrent content suite; no runtime
optimization inferred). Positive-Block behavior is proved separately.

Capture sequencing repair: initial new raw hashes preceded normal Stun content
publication. Exactly three cases each gained ONE suppressed:false→true field on
an already-zero/null/nonblocked check: alpha-team event566, movement-bonuses107,
authored-slots26. Coordinator reconstructed and hash-matched all original event
streams, with state/RNG/results unchanged for all42; only those three new candidate
hashes were refreshed. Original capture and evidence remain runs/v2-block/.
No old historical fixture was rewritten. No clean seal or human visual acceptance
is claimed.

Final comparison after content publication passed all592 cases and exact new fixture equality: old28.91s/current29.49s,13,224 null checks,0 semantic/outcome changes. The overflow probe rejects unsigned32 exhaustion before payment or mutation. A projector typecheck required retaining the input event element type; assertions and projection fields stayed unchanged.

Full check gate passed on its first attempt: 1,612 tests, typecheck, both live
reaction variants (33 fires and 11 state changes each), naming, hardcode scan,
published-source check and content kill switch. All 22 baseline hashes change
because the new event facts are deliberate; the comparison above proves the
zero-Block projection exactly. Existing-test edits remain flagged for review:
old cursor goldens are still checked through the narrow projection, alongside
new raw goldens; low-cover tests now explicitly narrow nullable accuracy rolls.
The candidate rulings were read: bursts still bypass Block and existing authored
onDodge prose does not establish a new hook in this item. Landing and the
independent committed audit follow this check.

The first landing attempt failed test discovery: a safety copy under ignored
`runs/v2-block/landing-backup` still contained discoverable `*.test.ts` files.
Three duplicate suites could not resolve imports from that partial backup.
Coordinator moved the exact backup outside the engine tree, verified all 28
file SHA256 values unchanged, and left product/test configuration untouched.
The failed diagnostic is retained; the normal landing gate is rerun afterward.

Limits: shield/class values and renderer adoption are separate stages. Existing
AI still ranks conditional damage rather than expected connection, including
against guaranteed Block. Downed/zero-chance/first-cup timing and reciprocal RNG
roles are recorded provisional decisions in SWITCHES. Prone interaction awaits
its own implementation. This engine stage provides no visual acceptance evidence.
