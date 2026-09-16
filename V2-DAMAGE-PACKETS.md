# Ordered damage packet display — 2026-09-16

The passive component reads final nested packet facts from damage.applied. Each
damage float carries its exact packet index and field provenance; aggregate HP
still uses hpAfter. The log distinguishes a multi-type total from the base type
and prints supplied mitigation, absorption and overkill. It never calculates
defense or reuses the legacy base-only attack.hit ledger as the aggregate.

Critical emphasis uses the damage event's attackId/crit fact. An onHit trigger
arriving before weapon HP cannot steal the critical marker; confirmed chart-only
criticals (critHeads 0) remain critical. Scalar trigger/tick provenance is retained.
Action details show authored penetration and hit/critical packets. A multi-packet
attack waits for observed engine damageOnHit instead of displaying a base-only sum.

Four meaningful pre-change display assertions failed; the scalar provenance
control passed. Nine focused probes now cover these contracts. A separate timer
red proved that pre-seek callbacks decremented new packet float slots; registering
their timer handles fixes cancellation through the existing seek lifecycle.
The library keeps
its existing 28 entries and adds an explicitly labeled TEST packet encounter.
Its two synthetic bodies explicitly derive from test-oathblade and use that exact
unchanged body token/card, with a provenance assertion against authored content.
They are not new campaign enemies. Publication refreshes the original seeds
through the normal exporters; frozen Atlas layouts remain bound to exact map facts.

The actual TEST export contains 279 events, six multi-packet hits across physical,
fire, true, magic and shadow, and three confirmed chart-only criticals. It finishes
heroClear from clean engine cfbcac4. This is resolver/display evidence, not tuning.

Full gate and publication results are added after execution. Human/GPU acceptance
remains separate; no denied browser route is bypassed.

The first full gate caught the old one-numeral-per-critical limit. It now asserts
the exact count from critical damage.applied packet rows (scalar events still
count once), retaining critical ownership and the interleaved-hook probe. The
second gate passed all 29 complete folds but caught the synthetic enemy's pending
art. The coordinator retained the original all-library art assertion and added a
meaningful-red authored-body provenance test, then assigned the exact Oathblade
art. All 12 presentation/packet probes passed. An initial broad art generation
re-encoded existing outputs; only that attempt's generated changes were restored,
then the two mappings were regenerated narrowly. Every previously published image
remains byte-identical, and the new unused placeholder files were removed. These
two gate failures and repairs are not combat balance evidence.

The third complete --fresh gate passed all 29 end-to-end/pumped folds, 27 scene
and presentation tests, direct-map import tests and exact regenerated exports.
All 28 original seeds and the three frozen Atlas bindings/setups are unchanged.
Final source review then added two independent malformed-import reds: packet
numeric fields could inject log markup, and damage text could create an img in
the real float DOM. Joined packet text is now escaped and float numerals use
textContent. All 14 packet/presentation probes pass with exact valid-number and
timer assertions retained. The normal publication gate reruns from this final
source before replacing BATTLE-VIEWER.html.

Final publication: `node tools/gate.mjs --land --fresh` passed from clean viewer
source 06f6edf and engine cfbcac4, including all 29 exact refreshed exports,
16 runtime/packet/elemental probes, 27 scene/presentation probes and the complete
direct-map import checks. The generated page carries that source provenance.
