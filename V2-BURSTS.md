# V2 burst playback — 2026-09-17

Viewer-only adoption of engine `22c8c79` (burst source `0c6fa07`, measurement repair `c374358`; 1,575 engine tests). Kingdom publication and interactive burst targeting are separate stages. Technical verification does not grant human/GPU visual acceptance.

## Contract

The passive viewer copies `burst.declared` centre, origin, shape, exact hex list, numeric recipient UIDs, filters, prepared packet `value`/`ledger`, and healing. `causeId` identifies the action. Detached `BURST` state retains declarations and per-recipient summaries through seeking; the pump owns its separate visible lifetime. An ordinary action/activation/battle boundary clears it, including grouped movement folds. Recipient summaries and settlement do not clear it.

Only `damage.applied` and `heal.applied` change HP or create numeric damage/heal floats. `burst.struck` is a summary. `burst.shielded.props` and its hex produce **Terrain shielding**, distinct from attack Block. No accuracy, critical or Block cue is added to a burst, and declaration clears stale AIM/ATTACK/AOO/critical ownership. The engine supplies all footprint and shielding decisions; rendering only projects those supplied hexes at existing display heights. Out-of-board facts fail visibly instead of being silently omitted. Floor-void cells in a declared footprint are not trimmed.

Burst is a distinct action subtype, grouped in the existing powers column for presentation. Descriptors show ordered authored packet stat/amount/type, shape, side/tags, healing and uses. The long description has an escaped tooltip and constrained label; the bar shows TYPE BURST, placement range and stamina without an invented scalar damage total. Burst rows do not advertise ordinary attack hooks. Defender metadata names ON BURST and Burst damage percentage. All 549 current action rows were checked: none carries legacy `area`; only dead arc/blast1 display branches were removed. Ordinary radius target effects remain unchanged.

Visibility lasts a provisional 2,400 presentation-clock milliseconds from a declaration or matching burst/HP beat. Its remaining budget uses elapsed wall time, including speed changes; it does not use the inherited epoch-scaled `V.clock`. Seeking cancels callbacks and restores durable facts visibly. Generation guards reject callbacks retained across seeking/new declarations/disposal. Expiry redraw errors take the existing invalid/playing/onError path even after live drain; visual linger never holds the host completion barrier. The inherited global clock discontinuity on speed changes remains a separate repair, demonstrated by coordinator before this stage.

## Reproducible TEST facts

The mutating recipe is outside this passive package: [`tools/replay-fixtures/bursts.mts`](../tools/replay-fixtures/bursts.mts). From the project root:

```
node engine/node_modules/tsx/dist/cli.mjs tools/replay-fixtures/bursts.mts
```

It requires a clean engine and complete content, uses normal `createBattle`, `beginActivation`, `executeAction`, and validated direct-map props. Published TEST flame/ward profiles exercise empty centre, saves/reactive Protection, terrain shielding, healing, friendly fire and zero source payload. Exact options, source engine commit and overrides are stored in `tools/fixtures/bursts.json`. Friendly/zero clone only the burst recipient side to `any`; zero also sets the two authored packet amounts to 0. Healing first applies a real 10-HP setup injury through the engine. These are disclosed test setups, not campaign encounters or new showcase entries. Per-fixture expanded unit sheets and the action registry both receive the same exact override; runtime content is unchanged.

The five original histories contain 17/9/13/21/14 events. A separate complete movement sequence chooses the burst's legal movement slot, then performs an engine-validated path move in primary. It does not splice a movement tail onto an already-spent primary cycle. The initial attempted default-primary followup was correctly rejected by the engine and corrected by explicit legal slot choice, not by editing state.

## Evidence and attempts

- Before implementation: 9 probes, fixture contract passed, 8 meaningful failures (stale attack state, ordinary-power classification, absent durable BURST, absent log lines).
- Overlay/timing probes: 5 expected failures before overlay/timer implementation.
- Review probes reproduced 4 defects: grouped movement left a registered timer, and malformed footprint/centre/shielding hexes were silently dropped. All repaired without weakening stale callback guards.
- Two fixture descriptor probes reproduced expanded-sheet mismatch for deliberate friendly/zero overrides. Test setup now supplies matching expanded rows and registry data.
- Focused source verification: `node --test tools/bursts.test.mjs tools/bursts-player.test.mjs` — **21/21 pass**. Tests retain full BURST through pure/seek parity and compare cues at every burst event. The component probes also run against the built candidate.
- Full built verification additionally imports the five burst and two support TEST histories; they are not inserted into the 29-battle selector. Existing all-library art assertions remain unchanged. TEST-only bodies can use the honest pending standee.
- Infrastructure history is separate from those red probes: initial scratch fixture mistakes (prop prefix, `applyDamage` signature, invalid empty payload) were corrected and independently verified by coordinator; two shell cwd mistakes were independently rerun by coordinator (14/14 at that point). No setup error is reported as balance evidence. Original draft was preserved in root scratch. Canonical recipe is tracked at root.

## Publication verification

`npm run static` and `node tools/dump-fields.mjs` regenerated metadata from clean `22c8c79`: 22 maps, 106 unit sheets, 21 statuses, 549 actions, 209 badges. `node tools/refresh-battles.mjs` re-exported all 29 entries. Input seeds and all three frozen Atlas scene/setup bindings equal the previous publication. Nine histories changed: horde-24 seed3, test showcase seed0, flanks seed2, thicket seed0, field seed3, highlands seed1, item powers, arc variant and assembled party. This is engine V2 adoption, not an assertion of unchanged combat outcomes.

Gate attempt 1 completed in about 130 seconds. Its only failures were coverage for still-live `power.hit` and `heal.boosted`, which no longer occur in the refreshed showcase histories. The coordinator retained all handlers/assertions and added separate reproducible support imports: published `test-ordered-double` resolves its ordered power; Mercy receives a setup injury and Karma 2, producing an engine-stated heal of 9. A new support-presence probe failed before the extension and passes afterward. `UNEXERCISED` and the 29-entry selector were not expanded. The original five histories and separate movement sequence are preserved.

Full retry `node tools/gate.mjs --fresh` passed: 26 source tests, 38 built scene/presentation/component tests, 12 direct-map tests, full end-to-end fold/seek/icon/cue checks, and all 29 fresh event histories byte-identical to their regenerated exports. The passive runtime allowlist remains the same seven engine modules. `git diff --check` is clean. Source and generated page are separate commits; publication runs the same gate again with `--land --fresh` from the clean source commit. Exact final hashes are reported in the migration handoff/root checkpoint. Authored terrain/maps/art and engine/content/Kingdom source remain untouched by this stage.
