# Hex-targeted bursts — implementation receipt

Engine/content landed at 0c6fa07; independent batch audit passed after the separate diagnostic repair, 2026-09-17. Authority: COMBAT-V2-DESIGN sections 4, 7, 15 and
18. Baseline engine cfbcac4. This replaces legacy area attacks in one coherent
item; block, physical burst KDB and destruction remain later dependencies.

## Initial plan and probe checkpoint (before implementation)

The following initial checkpoint records the plan and early red probes; the
landed result and final audit are recorded below.

Preflight found four live legacy area rows: Great Cleave, Halberd Cleave,
the TEST Arc Sweep, and Lightning Staff Storm. The three arcs preserve their
authored adjacent three-hex wedge. Storm preserves its radius-one disk and
range four. IDs, costs and stat-plus-one magnitudes are retained provisionally;
Great Cleave's older separate-roll wording is explicitly superseded by V2.

Planned shared boundary: an exclusive burst action profile, explicit side/tag
filters, an unambiguous centre-hex command, engine-owned hex visibility, geometry,
previews and execution. Ordinary radius auras retain their existing wall
penetration. Each distinct low prop crossed by a travelled centre-target ray
costs two damage; a zero-length ray costs zero. Exact polygons are retained.

Planned lifecycle: freeze declaration geometry and eligible identities; resolve
targets in stable UID order, excluding later summons. Defender onBurst executes
before final damage planning, and its authored percentage scaling rounds down.
Protection is planned and spent once after those hooks. Public forecasts never
peek at their future random rolls. Victim settlement/death and XP remain, while
attack hooks, hit/crit/block rolls and area-attack runtime branches are removed.

Verification begins with meaningful behavioral failures through the existing
command and simulation APIs, then adds exact geometry, lifecycle, content,
snapshot, AI and built-host probes. No technical pass or visual acceptance is
claimed at this checkpoint.

## Pre-landing baseline replacements

Before the full gate, legacy area-specific assertions will be replaced under V2 sections 4/7/15/18: ATTACKS/ABILITIES classification, unit targets, attack/power area event names, guaranteed attack roll numbers, and the global areaHitsAllies switch. Their replacement checks retain exact authored wedge/disk geometry, typed amounts, friendly-fire inclusion/exclusion through row-side metadata, action costs/charges, AI utility, deterministic complete runs, and atomic rejection. Old golden inputs remain unchanged; any full-battle expected-state changes require first-divergence attribution. This is a declared test edit, not a unchanged-baseline claim.

Initial four behavioral probes failed by assertion against cfbcac4, then passed after implementation/publication. Expanded first resolution set: 21 passing probes. Content transaction ship and all 102 preexisting content tests passed. Full engine gates remain pending.

## Provisional lifecycle and source policy

The source payload and eligible roster/geometry freeze at declaration. Resolve stable UIDs ascending; exclude later summons, retain original geometry after movement, skip recipients already dead or at zero HP when their rung begins, and continue a declared burst after the caster reaches zero. Damage then healing complete before settlement; a mixed payload may restore a still-standing zero-HP recipient before death resolution. Each packet is an independent source (its own declared stat/Power share and outgoing status adjustment), unlike flat attack secondary riders.

Each target pays one two-per-distinct-low-prop budget across damage packets in authored order. Never subtract cover from healing. Include endpoint footprints on a travelled ray; centre equals target crosses nothing. High props shield both damage and healing. Ordinary radius auras still ignore walls. Shared geometry is scanned exactly for frozen recipients; the measured 42-case cost did not justify adding a new cache in this item.

onBurst runs once for positive declared damage remaining after geometric attenuation, before save/Protection/defense. Healing-only, zero/negative payload and fully geometrically absorbed targets do not invoke it; later Frost or signed-defense vulnerability can still produce damage. Saves multiply the covered source by their authored percentage with floor rounding, in stable trigger order; Frost is a separate target vulnerability, once on the first physical packet, using the existing frostBeforeProtection switch. Public previews show current-state numbers and conditional hooks without rolling them.

Taunt constrains unit-target actions; bursts have no single enemy target and use ordinary legal centres. Powers Locked also blocks burst actions, including weapon arcs. Geometric zocHoldersAt still lists adjacent enemies; actual reaction selection excludes every burst, and a burst-only holder cannot provoke or stop movement with it. Existing mode-specific free/opening/support preparation remains ahead of burst choice.

Four old TEST Golem attack riders that named Sweep were rebound to existing ordinary Slam with effects/chances/hooks preserved and source notes. This keeps test instruments live; it grants no attack hooks or KDB to bursts. The original historical input fixtures remain untouched.

## Recorded comparison checkpoint

The cfbcac4 comparison ran 42 frozen input cases: 38 retained exact events, state, RNG and result. Four first differences are the former Sweep/Cleave/Storm declarations becoming burst.declared. Representative elapsed execution was 717 ms before and 778 ms after. The first comparison caught an unintended Alpha Team movement change because ready Storm disappeared from ranged planning when classified as burst; including ready burst ranges repaired that case to byte parity. Separate full current hashes retain both automatic and suspended-driver assertions. Initial whole suite: 21 failures, 1,481 passes, one preexisting todo; classified and repaired individually before the second full check.


## Coordinator repair after the second full check

The second suite had 1,515 passes, one preexisting todo and two timeouts (30-second all-map aggregation and a 5-second 200-battle audit). Per rule 33, writing transferred to the coordinator. Both files passed unchanged under one worker: 26/26 tests, 59.26 seconds total (58.31 seconds tests), identifying concurrent integration load. The coordinator split the all-map probe into one test per map, preserving every map, 40 seeds, assertions and the 30-second per-test budget. The 200-battle probe retains all samples/exact expectations with the adjacent integration probe's documented 30-second budget. This is an explicit test scheduling/budget change, not gameplay proof by raising a timeout. Writer ownership returned for full gate verification.

Three additional pre-fix compiler probes proved silent dropping of mixed effects/target, secondaryDamage and armorPenetration on burst rows. The compiler now rejects these incompatible profiles; 12 compiler probes pass. Defender save effect uses the closed burstScale discriminant, not a new content-ID namespace. Malformed/rewound snapshot ordinals and real published TEST payload/save/shield transport bring focused resolution coverage to 39 passing tests.

The final content suite passes 114/114. Gate attempt 1 passed every hard check except the 200-seed integration attack-coverage test while the CPU-heavy content transaction suite was running concurrently. The unchanged integration file passes 16/16 alone (12.34 seconds total; coverage probe 2.994 seconds). No timeout or expectation edit was made for that failure; heavy gates now run sequentially.

Gate attempt 2 ran alone and passed every hard check (1,541 tests). Before landing, coordinator review found three more live travelling class blasts in the older ability-effects compiler: Rain of Arrows, Fireball and Scorch. Six added behavior probes were red: empty-centre requests rejected malformed-target, and recipients behind high props lost 5/8/8 HP. Their explicit radius-one/any-side profiles retain Precision minus 1 physical or Magic plus 2 magic, original ranges/costs/cooldowns/warmups. Names alone do not retune the authored magic type to fire. Only the fulfilled unit-centre gap is removed; Burn consumption/ground painting remain named gaps. The compiler rejects target-origin area damage without an explicit burst and rejects disagreement with its authored base payload. Fifteen compiler probes pass.

Separate exact control-panel comparison used all 22 maps, 25 seeds each, enemyCount 8 (550 battles): every historical/current gate hash reproduced. 177 battles retained exact events/state/RNG/result; 373 changed, including 80 changed results. Earliest differences: 305 attack-to-burst declarations, one Storm power-to-burst declaration, and 67 changed AI stamina spends (52 Hack-to-Cleave, 14 Cleave-to-Hack, one Storm-to-Bolt). These are real action/behavior changes, not metadata-envelope changes. This panel is separate from the 42 cursor fixtures; that earlier checkpoint had 38 exact cases, and the final late-class conversion comparison below has 34. The tracked comparison recipe asserts identical event prefixes and that the first changed declaration/choice involves a migrated burst.

## Coordinator diagnosis after the final class conversions (2026-09-17)

The next two gate checks exposed two stale Fireball classification/event assertions,
then one failure named only as the existing integration kiting probe. The first two
were updated to require burst.declared and explicitly reject power.used for Fireball;
ordinary heal/buff and warmup assertions remain. The coordinator took ownership after
the second failed check. The unchanged integration file passed 16/16 alone (kiting
2,642 ms, kit coverage 2,830 ms). The unchanged full suite, with its configured four
workers and detailed output captured, then passed 1,552 tests across 137 files in
59.98 seconds; kiting took 3,451 ms. One preexisting todo remains.

The earlier gate summary discarded the underlying exception, so the exact cause of
that transient kiting failure is unconfirmed. No timeout, worker count, seed count or
assertion was changed for it. Diagnostic evidence is in runs/burst-kiting-coordinator-diagnostic.txt
and runs/burst-coordinator-full-diagnostic.txt. Six newly added CRLF lines in the
otherwise LF ability-effects test were normalized, and the obsolete live area-attack
section in COMBAT-SEQUENCE was replaced with a pointer to the V2 ladder. A complete
gate and committed-tree audit are still required before this stage is landed.

Recovery checkpoint, 2026-09-17: the late three class powers pass all six preconversion reds, plus three real fielding checks for warmup 1, stamina 2, unchanged range and cooldown. Progression drafted powers now resolve from the unified ACTIONS registry, still rejecting attacks/movement as power drafts. Final 42-case comparison has 34 exact cases and eight attributed declaration changes; the four added class-power cases first change Fireball power.used to burst.declared and keep the same final result. Existing historical inputs remain untouched; only the four newly affected current output hashes were regenerated by the guarded comparison tool. The 550-control counts remain 177 exact / 373 changed / 80 result changes. Engine/content landing is this checkpoint; passive viewer and playable Kingdom adoption remain separate required stages.

Final content verification passed 117/117 (77.67 seconds), publication receipt and outputs committed as 09fa41b. The next full engine gate found only two stale Fireball assertions in ability-effects.test.ts. Replaced the old ABILITIES lookup with BURSTS while retaining exact warmup fielding; real-battle coverage still demands Aegis and Circle power.used plus specifically Fireball burst.declared and no Fireball power.used. This is an explicit V2 classification/event replacement, not broadened event acceptance.

Final pre-landing gate passed every hard check with 1,552 tests. Candidate-ruling and historical-test-edit flags remain for review; no human review or seal is claimed. Source whitespace checks pass; generated Game Builder whitespace remains the previously recorded generator issue and was not hand-edited.

## Landing and audit finding (2026-09-17)

Normal landing and committed-tree suite passed all 1,552 tests plus exact current
control hashes. The gate printed source cb30b8c, then amended bookkeeping into
final engine commit 0c6fa07. Content is published at 09fa41b (117 tests passed).
Only engine/content are published; viewer and Kingdom bundles remain at packet
semantics until their separate host stages. No human visual acceptance is claimed.

The mandatory landing-130 periodic audit reported one failing test but discarded
its raw exception. The immediate detailed four-worker diagnostic passed all 1,552
tests in 50.92 seconds (kiting 2,801 ms). The original cause is unconfirmed; this
is not proof of a timeout. A separate narrow tooling item will preserve raw
command/exit/stdout/stderr/exception evidence on future gate and audit failures
before the final independent audit. No further timeout or assertion changes.

The WITHOUT measurement arm failed during authored item validation, before
simulation, so it provides no numerical balance evidence. Reproduce in PowerShell:

```powershell
$env:TSX_DISABLE_CACHE='1'
$env:CF_DISABLE_IDS='attack.test-arc.sweep,power.lightning-staff.storm'
npx tsx tools/effect-size.mts --arm
```

Exact error: `enchanted: 'item.lightning-staff.lightning' grants power
'power.lightning-staff.storm', not a pack ability` at src/content/pack.ts:435.
The content index validates item grants against already filtered actions. The
next separate loader item must validate complete authored registries before
experimental filtering, without accepting unknown grants or inventing missing
actions. Existing reporting protocol is documented in TOOLING-EFFECT-ARMS.md.
The burst seal stays withheld for this measurement error, periodic audit failure
and two review flags; later tooling fixes do not rewrite that history.

## Final engine/content checkpoint

Independent batch audit `node tools/audit-all.mjs --label "V2 bursts engine/content
and failure diagnostics"` passed: 1,556 tests (the 1,552 burst-tree tests plus
four reporting probes), typecheck, all 22 current control hashes and whole-core
scan. Log: runs/burst-final-batch-audit.txt. The diagnostic source landed separately
at 8df994a (gate initially printed 5a6addc), after normal candidate and committed-
tree checks. No further worker, timeout, assertion, seed or gameplay changes were
made. The prior periodic audit's exact cause is still unconfirmed; this later pass
does not rewrite that historical failure or the burst seal.

Current comparison is 34/42 exact historical cursor cases, eight attributed burst
changes; separate controls are 177/550 exact, 373 changed, 80 changed results.
Content remains 09fa41b with all 117 tests passing. Five preexisting lock archives
are preserved. The two Game Builder copies are synchronized through the generator
and file copy; their seals remain withheld and no human review is implied.

Next bounded work is measurement integrity: complete authored-registry validation
before experimental action filtering, then distinguish measurement error from
measured/unavailable results in Game Builder. The current Builder incorrectly
prefixes raw measurement errors with "measured:"; repair that presentation from
recorded verdicts without rewriting historical ledger entries. Viewer and Kingdom
burst adoption follow as separate host stages. Preserve viewer/tools/bursts.test.mjs
as an unfinished draft: its placeholder fields must be replaced with real engine
exports, not added as runtime aliases. Block, physical burst KDB and other remaining
V2 mechanisms are outside this completed burst item.
