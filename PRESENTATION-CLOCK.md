# Presentation clock continuity — 2026-09-17

Viewer-only correction after burst publication `57e9448` (source `55f8e9f`). Engine remains clean `22c8c79`. No combat events, battle inputs, metadata, maps, terrain or art are changed.

The old clock was `now() * speed * .75`. At wall time 10,000ms, changing speed 1→4 moved its value from 7,500 to 30,000 without elapsed time. Existing action/trigger highlights and miss deadlines therefore expired immediately or gained unintended time.

The replacement starts at zero per mount and accumulates elapsed presentation-clock milliseconds. A speed change first settles elapsed time at the old rate, then applies the new rate. Default time comes from monotonic `performance.now()` with a `Date.now()` fallback; the injected clock remains available for hosts/tests. A retained wall high-water mark clamps rollback: 1000→900→1100 adds only 100 wall milliseconds, not 200. No consumer of `V.now` assumes an epoch. Burst remaining-budget rebasing now uses the same continuous clock; its cancellation/generation guards remain intact.

`speed(x)` accepts finite positive numbers only. Invalid values throw before changing clock/rate, state or timers. Pausing intentionally retains the existing wall-time visual decay. Seeking clears clock-stamped highlights through the existing fold contract; it does not reset the continuous clock or discard durable burst facts.

This is a clock/deadline correction. Already-queued next-event timeouts and running CSS/Web Animations keep their originally scheduled duration when speed changes. Subsequent beats use the new rate; burst visibility retains its existing explicit remaining-budget rescheduling. This stage does not redesign pause behavior or animation scheduling.

## Verification

Before implementation, mounted probes produced 10 meaningful failures and one preservation pass: mount-relative origin, real `attack.declared`/`trigger.fired`/`attack.miss` deadlines at both 1→4 and 4→1, rollback, invalid input, and the actual harness speed button. The prior pause/resume/seek behavior already passed. The deadline probes reproduced the 22,500ms jump exactly.

After implementation, `node --test tools/clock.test.mjs tools/bursts.test.mjs tools/bursts-player.test.mjs` passes **33/33**: 12 clock probes plus all 21 retained burst probes. Actual harness controls are exercised both paused and running, with cursor and already-queued next-beat timer preserved. The clock suite also runs against the built candidate through the normal build gate. No tests were weakened and no unexpected failure has occurred in this stage.

The first full `node tools/gate.mjs --fresh` passed: 26 source tests, 50 built scene/presentation/component tests, 12 direct-map tests, complete 29-battle fold/seek/cue verification and 29 exact fresh event comparisons. No gate repair was needed. Source and generated page are separate commits; the publication gate reruns from the clean source commit. Exact hashes are reported in the migration handoff/root checkpoint. Human/GPU visual acceptance remains separate and withheld; no browser workaround was used.
