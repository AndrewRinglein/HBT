# Ordered damage packets — source receipt, 2026-09-16

Owner: COMBAT-V2-DESIGN sections 8, 15, 18; item `rule.damage-packets`.
This is one packet/resolver item, not block, bursts, prone or physical knockback.

The scalar attack is packet `base`, followed by eligible ordered `secondaryDamage`
rows `{id, when:'hit'|'crit', damageType, amount}`. A hit rider also runs on a
critical; critical eligibility uses the confirmed roll, including zero damage-head
chart branches, once per hit regardless of critical count. Secondary values do not
repeat stat, Power, outgoing modifiers, critical multiplier or cover subtraction.
The first eligible physical packet receives the hit's one Frost contribution.

`armorPenetration` applies to each physical packet's positive effective Armor:
`armor - min(pen, max(0, armor))`. It cannot produce negative Armor, erase existing
negative vulnerability, or affect elemental defense. This signed-defense detail is
provisional and covered by explicit zero/absent/positive/negative-defense probes.

Lifecycle preserves the specific COMBAT-SEQUENCE rungs and Aug15 ruling: resolve
the immutable packet plan, reserve its complete Protection budget, fire onHit,
then apply the planned damage against post-hook HP. Reservation before onHit is a
new provisional timing choice that prevents the same pool absorbing weapon and
hook damage twice. Added Protection does not revise the plan; healing changes the
available HP; hook damage uses only unreserved Protection. No mitigation or random
hooks are rerun between packets. Preview forks the same plan/reservation/HP mutator
without peeking at random hook results. Preview damage totals are resolved damage,
while its packet applied/overkill facts describe the no-hook fork, not promised
post-hook HP. Declared accuracy/roll behavior remains unchanged. Internal damage
conservation now compares a fork at the actual damage rung, after onAttack/onCrit;
the earlier user forecast cannot know randomized hook results. The mismatch
assertion remains, with its expectation captured at the correct lifecycle point.

One attack.hit carries detached plan facts; one damage.applied carries final packet
HP facts, total applied/overkill and physicalApplied. Each packet includes source,
local ID, type, raw, absorbed, signed defense/mitigationDelta, resisted,
floorAdjustment, resolved, applied, overkill and ledger. Exact conservation:
`raw - absorbed + mitigationDelta + floorAdjustment = resolved = applied + overkill`.
The base event ledger remains the base packet ledger; all-packet ledgers are explicit.
No earlier event object is subsequently rewritten.

All eligible packets resolve even if an earlier one is lethal, so their remaining
damage is attributed as overkill. Settlement is outside the hit; there is no death,
XP or pseudo-attack between packets. onHit/onDamage/onTakingDamage/onKill retain
their existing once-per-hit ownership. A hook that kills before packet HP gives
the attack zero applied HP; it does not synthesize a second onDamage/onKill. The
ordinary outer settlement owns that death. No nonlethal-damage mode is invented.

Metadata is strict plain data: at most 32 dense rows, local unique IDs (`base`
reserved), known types/eligibility and bounded nonnegative safe integers. Loader,
public attack planning/legality and snapshot runtime binding validate it. Snapshot
rules advance from .18 to .19; no V1 compatibility path.

Authored scope: Hand Axe +4 and Bane Blade +6 confirmed-critical riders. Their
original source wording remains verbatim in content/gen/weapons.json. Both
physical inheritance AND separate mitigation are provisional interpretations,
not user rulings. Armor affects base and rider separately. No shipping penetration
value was invented. Conditional/adjacent/badge/enchant rider gaps remain open.

## Meaningful red checkpoint

Before pipeline edits, the new behavioral probes ran with ordinary assertion
failures, not imports/setup errors:

* Shared Protection7 on base6 + fire4/Resist1: preview was **0**, required **2**.
* Confirmed chart-only crit with physical penetration2 and hit/crit riders: actual
  damage was **3**, required **11**.
* Reserved `base` secondary ID was silently dropped/accepted by the loader.
* Separate live reservation proof: physical base6 + onHit true3, Protection4,
  Armor0, HP100 ended **98**, required **95**. The green probe also requires one
  attack-owned absorption spend4, then hook damage3, then attack damage2.
* Content compiler's seven pre-change tests showed dropped valid metadata and
  silently accepted malformed metadata. No live generated files were touched.
* Extracted pre-change `6bb36dc` also proves the live double-absorption HP98 case
  and existing onAttack/onCrit Protection grants throwing preview/applied mismatch.
  New chart/damage-crit, spent/granted pool and Armor-grant probes cover the fix.

## Performance and preserved fixture comparison

The first implementation cloned a complete battle three times per preview: 41 old
fixtures measured 661ms before/1128ms after, and 200 previews 6.6ms/65.4ms. That was
material. The private application-only preview fork now clones the state envelope,
units array and complete target unit; it runs only Protection reservation and HP
mutators. It never runs hooks, RNG, settlement or geometry preparation. Frozen-live
graph and full-fork parity cover multiple pools/expiry, zero HP, overkill and
target=attacker. The follow-up measurement was 637ms/704ms for the old battles and
5.7ms/15.8ms for 200 previews; final run measurements are in runs/v2-packets.

All 41 original battle-cursor cases retain their input fixtures. The comparison
asserts their actual first raw difference is packet/confirmed-critical attack.hit
metadata. Thirteen first projected differences are the declared Protection
reservation before onHit; no result changes were observed. Metadata-only cases
retain old historical hash assertions after an explicit metadata projection, and
all current cases retain exact event/state/RNG/result hashes for both automatic
and suspended drivers. Historical golden files are never overwritten.

Verification, comparison, final gate/audit and publication results are recorded
below only after they run. Technical verification is not human/GPU acceptance.
