# Sandbox burst centre dropdown — 2026-09-18

Owning item: `v2.sandbox-burst-centres`, ISC069. Engine22c8c79 and
viewer13bdcfe are unchanged. This stage adds dropdown targeting only; shared
battlefield clicking/overlay integration is a separate stage.

## Boundary and presentation

The public engine door exports isBurst, burstCentres and previewBurst.
sandboxChoices enumerates the engine's cheap legal centres for each action slot,
validates each command through the same policy/expectedSeq boundary, and keeps
burst preview null. It never forecasts all centres or recipients. Ordinary
movement/attack/power behavior and previews remain intact.

previewSandboxChoice validates the complete unknown command first, requires a
burst centre command and forecasts exactly that selected centre. It does not
spend slots, events, RNG or HP. The UI calls it only for an idle, acting, selected
burst dropdown command. Busy, faulted, selecting, completed and replaced sessions
have no stale burst breakdown. Only movement choices display path text.

The headline copies per-recipient applied HP loss and healing. Collapsed details
copy centre/footprint, resolved damage versus applied HP, ordered typed packet
facts and exact engine ledger rows (including BURST_COVER), terrain-shielding and
low-prop IDs. Conditional onBurst reactions are explicit; previews do not run
future triggers or their dice. No host hit/crit/Block chance or combat formula is
introduced. Every details field is escaped; plain headline is escaped at mount.
The Kingdom outcome picker is unchanged.

## Evidence and setup repairs

Four new ISC069 probes were recorded red against the original source: no centre
choices. After payment assertions and the measured integration time budget were
added, final probe bytes were re-proven red against exact a6874fb core/door
sources, then those two owned files were restored byte-for-byte. The old
published page also failed the built centre81 assertion. Existing14 ISC069 probes
are retained. New probes cover lazy enumeration, one selected preview, exact
state/events/RNG purity, malformed/stale/enemy command rejection, empty cast
slot/payment, saved/restored command parity and exact replay event transport.

Real fixture: Priory, one authored hero.base.warrior-fearsome, one unit.zombie,
seed1. Empty centres81/100 are legal. Through normal commands, select the hero,
move85, end/reselect, move90, end/reselect, move72; then primary halberd.cleave at92
hits the actual zombie. Forecast and execution yield6 resolved damage,5 applied
HP and1 overkill. No unit position, stamina, action list or event was fabricated.
Built checks execute both an empty cast and this recipient cast, verify natural
playback drain, save/resume and import into the existing standalone replay host.

Three built-harness findings were repaired without changing production mechanics:
fakeDOM option attributes retain &quot; entities (explicit decode); the default
roster has four enemies, requiring remove-until-one and exact configuration
assertion; resolved damage differs from applied HP (now all6/5/1 asserted).
The coordinator took the bounded repair after two unexpected failures. The
presentation-only fixture initially omitted three required packet fields; those
were added, retaining strict typechecking. Its hostile strings/shield/ledger
values test display transport only and are not battle evidence.

Verification commands: npm test; npm run typecheck; tools/gate.mjs with check and
--land; independent tools/slice-gate.mjs; build-sandbox plus sandbox-bursts.verify,
sandbox.verify and sandbox-roster.verify; build-slice plus smoke-slice and
node --test tools/atlas-surface.verify.mjs. Scratch logs retain attempts.

No source art, maps, engine, content or viewer package edits. Technical fakeDOM
and recording-renderer checks do not grant GPU/browser or human acceptance;
the existing browser security block remains respected. Gate-owned historical
states and withheld seals are preserved.


## First full gate and bounded repair

The first full gate failed the new multi-turn route test under the parallel
suite and flagged existing engine-event names missing from the Kingdom read
registry. The focused criterion passed immediately; the all-P audit correctly
reused the failed full-suite report and recorded ISC069 regressed. Its history
is retained and closure will be restored by a passing landing.

The report kingdom-suite-26252.json records6465.7ms and STACK_TRACE_ERROR.
Coordinator inspection traced the misleading stack to Vitest's timeout wrapper
and its default5000ms limit; a forced1ms focused run explicitly reproduced the
timeout. Only this multi-turn integration probe now has a documented15000ms
budget. Assertions, dependencies and global timeout remain unchanged. This is
separate from the prior stage's unconfirmed ISC025 subprocess failure.

ENGINE_EVENTS now declares existing action.spent, stamina.spent, burst.declared
and attack.hit names consumed by the probes. No new gameplay namespace was made.
The empty cast asserts one actor0 primary action receipt/flags and exact actor0
stamina payment. An initial coordinator assertion mistakenly included subsequent
AI spending and phase-end regeneration; the repaired assertion observes the
actual payment event (2 spent, remaining3), rather than later regenerated4.
The full host lifecycle remains unchanged. Focused19 tests and typecheck pass;
final red was re-recorded before the full gate retry.


The full gate retry passes243 tests, typecheck and all62 P probes; original
existing-test assertions are untouched. Before landing, the short visible
headline was clarified to say forecast before burst reactions and to surface
conditional reactions when the engine flag is present. Detailed rows remain
collapsed; player copy uses plain “burst reactions” rather than API jargon.
The landing gate reruns all checks against this final source. The existing
candidate-ruling warning remains and does not imply human review or acceptance.
