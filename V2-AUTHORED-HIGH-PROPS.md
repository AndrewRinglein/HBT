# Static authored high props — terrain.authored-high-props

Implementation in progress; no landing or visual acceptance claimed here yet.
Base engine 038304f. Owning changes span engine, content, viewer and Kingdom.

## Contract and provisional choices

One canonical obstruction owner: `State.props`. Authored maps may contain high
props with map/battle-scoped `prop.*` IDs, material tier 1, 2 or 3, and a nonempty
full-hex footprint. Explicit props preserve their ground. Raw `x` decodes once
to OPEN plus `prop.obstacle.<hex>`, high, material 3. That material is a provisional
implementation choice, not a quoted user ruling. Reserved IDs reject at compiler,
pack and direct-map boundaries; validated canonical snapshots permit generated IDs.
IDs are unique, footprint cells are unique within each prop, and overlapping
different props share blockage by union. No low/edge/destruction fields are built.

There are at most 10,000 total footprint references including shorthand. Existing
10,000-cell board ceiling and LOS work/reverse/cache limits remain unchanged.
Plain canonical arrays are detached at decoding, map.loaded and save/restore.
Numeric OBSTACLE is forbidden in canonical current and initial ground. Initial
facts validate independently and need not equal later current prop state.

Movement, flight landing, placement, arrivals, knockback and LOS read the same
high-cell union. A prepared immutable membership view is captured once per
synchronous operation, keyed by full board dimensions and sorted occupied cells;
no mutable buffer escapes. Footprint mutation/replacement is observed at the next
operation. Forks own their state and WeakMap binding. Sidestep enumeration reuses
one view, sharing the same private planner with individual commands.

## Representation migration and evidence

Initial engine probes: 3 meaningful red failures in scratch/authored-props-red.log,
then 3 green. Compiler: 6 meaningful reds in content/test/props-red.log. Viewer:
2 reds in viewer/props-red.log; Kingdom: 1 red with 3 existing passes in
kingdom/props-red.log. Sidestep repeated-scan regression was separately red and
fixed. Expanded engine prop suite: 29 passed; typecheck passed. The first whole
engine run retained 51 failures / 1185 passes / 1 todo across 8 failing files.
The seven representation fixture files then passed all 214 tests. Subsequent
cursor migration and verification are recorded below.

Historical LOS probes retain their independent segment/edge oracle, every-pair
comparisons, cold/warm work equality, current/fork/reload/same-ID separation,
reaction/melee/resource/vision assertions. Their geometry edits now edit props.
Terrain path/simulation probes check footprint occupancy independently rather
than vacuously checking OPEN ground. Setup diagnostics name high props. Distinct
map layouts include ground, dimensions and props. The old unsupported `props: []`
direct-map probe now uses still-unsupported `edges: []`; explicit prop validation
has its own stronger boundary probes. Historical golden files remain untouched.

The 535-battle prior-source comparison passed before TEST publication, covering
all 20 old maps ×25, all 32 scenarios and three progression cases. The projection
first requires canonical shorthand IDs/material/footprints to equal exactly the
original obstacle cells, then restores ground only at those OPEN cells. Initial
census, optional exact terrain and props are checked before projection. It maps
only the exact diagnostic `impassable prop` back to `impassable terrain.obstacle`
on knockback.blocked.reason / knocked.stoppedBy (3 occurrences). All other event
fields, state, full RNG, cursor and results compare exactly. Script and JSON/log
are retained in scratch/compare-authored-props.mts and authored-props-transition.*.
This is test evidence, never runtime compatibility.

## Presentation scope

Engine field dumps carry canonical ground, props and resolved passability. Viewer
draws prop footprints in a separate layer, folding detached map.loaded props;
Kingdom draws props without replacing its outcome picker. Text boards consume
direct map facts, including unknown IDs. Existing viewer initialization still
requires pre-generated geometry: unknown direct IDs / changed dimensions and
direct ground overriding a registry field require the separately recorded viewer
follow-up. This stage does not claim that support or sandbox readiness. No atlas
or art bytes change. Browser visual acceptance is unverified; the existing Kingdom
SLICE URL security restriction remains in force. Fake-DOM verification is allowed.

## Publication and expanded verification checkpoint

Content source 66aec77 passed all 88 tests and the complete dry publication;
normal ship validated 102 fielded definitions and a smoke battle and changed only
engine pack.ts/stamp. Stamp names that real source commit. Publication log is
committed as e027a87. Preexisting content generated dirt and stale lock files were
preserved. The new maps append after the frozen prior 20. Both published variants
pass exact prop/ground transport, denied-then-legal human attack, expenditure and
initial-fact assertions plus actual field-geometry CLI output checks.

The first full engine repair run passed 1264 tests plus one existing todo. Final
expanded prop/cursor focused run passed 77 tests and typecheck (native fresh pack
and setup entry orders, readonly authored inputs, snapshots, cached geometry and
all historical/current cursor corpora). One post-publication Vitest import-cycle
initialization failure was retained, then repaired by initializing the pure prop
decoder before the trigger/movement/maps import cycle. Its native probes first
failed on JSON property order in the test; deep equality now tests actual values.

Final 535-battle comparison after publication again passed all exact projections,
with precisely two appended maps and three diagnostic-label changes. The dense
40×40/600-blocker comparison measured old/new setup 2962/2998 ms, 100 sidestep
enumerations 118/100 ms and 100 nonempty path enumerations 2.7/4.9 ms. Paths and
destinations matched. Both arms used 767,520,000 SAT tests, 12,548,301 reverse
entries and 50,396,736 estimated bytes. The first benchmark's empty path query is
retained separately and is not used as movement-performance evidence. Limits
were not widened; the small absolute path overhead is reported, not called equal.

Kingdom source f4240ee / page b96e971: 219 tests, typecheck, all 61 P-tier probes
and source/committed built-page fake-DOM smoke passed. The smoke actually reloads
the thicket map, checks canonical prop marks and uses the existing outcome picker.

Refreshing viewer exports exposed inherited action.spent adoption and lost replay
coverage. Authorized bounded repair copies authoritative flags and resets only on
real lifecycle events; two red probes became green. Actual Rime seed 1 exercises
badge.held and status.cancelled; a normal Lucius/Fire Imp TEST scenario exercises
aoo.skipped. The unexercised list shrinks rather than adding exceptions. Native
Windows door-path normalization has a positive/negative actual-gate probe.
Viewer full gate attempt 6 passed all 23 production battles, pure/pumped/seek
agreement, 22 maps in both dumps, typecheck and door/law checks. Viewer source
9f470f2 retains the six gate attempts and the red probes. Candidate exports are
explicitly marked as coming from the working engine; final committed provenance
and page publication follow the engine landing. Engine gauntlet/committed checks
and audit remain pending until their actual logs report success.

The gate's candidate-ruling warning cites COMBAT-DESIGN.md:477, the existing
Flight landing/ZoC rule. This item preserves that rule and changes only the
canonical obstruction facts consulted for landing. It does not redefine Flight.

Pre-land gate attempt 1 passed all 1,269 tests, typecheck, both live variants,
declared baseline changes, naming, hardcode scan and the real disabled-content
failure check. Its two warnings are the candidate ruling above and historical
test edits. The prior 20 controls change their representation hashes and two TEST
maps join the panel; the separate 535-battle projection proves preserved gameplay.
The generated Game Builder contains its generator's existing blank-line trailing
spaces; no generated HTML is hand-edited to clean them. Committed checks, seal
and separate batch audit are still pending at this source checkpoint.
