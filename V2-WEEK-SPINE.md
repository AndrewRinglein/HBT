# V2 Week spine stage

Owner: Kingdom. Authority: root KINGDOM-V2-2026-09-07.md and 2026-09-10 user rulings. Provisional choices are in SWITCHES.md. This stage owns Week flow, exclusive availability, report timing, Rest and ordinary-battle absence pulls. It preserves the outcome picker and the existing quest report reward.

Fresh backlog item: v2.week-spine. Historical week.machine and assignments.two-slots verdicts are preserved; V2 explicitly supersedes their old six-stage and two-slot truths. The parent updated the corresponding authoritative ISC blocks, leaving generated status/count fields to the instrument.

Verification checkpoints:

- Initial test/v2-week.test.ts: four meaningful failures before implementation (two-half registry/cursor, cross-activity exclusion, City recovery, due-Field return).
- Intermediate full suite after core migration: 155 passed/19 failed, reflecting the old V1 stage/slot/labour/return assertions plus callers that still used old stages. These were updated against the explicit V2 ruling, not reported green.
- Next checkpoint: 173 passed/1 failed, stale ISC012 stage-row target assertion; moved it to the active Field read model.
- ISC046 post-battle participant/duration probes: instrumented red before the new resolver and result-writer hook, then green.
- Rewritten ISC probes are also counterfactually re-proven with pre-stage committed sources and fixture before final verification. Only source/fixture paths are stashed and exactly restored; no unrelated work is reset.

All nine claimed ISC probes were re-seen red against the committed pre-stage source/fixture; the selective stash restored successfully. Source-free City transitions no longer roll absences. The prologue explicitly defers campaign absence pulls because the opening has no City recovery. New event vocabulary: `heroes.fielded` records the weekly participant set; `hero.badges-changed` records recovery badge changes. Final gate/test/build evidence is appended after verification. This is a staged migration, not a claim that fatigue, wound tiers, the two new quests, recruitment changes, training/rebuilding or dungeon deferral are finished.

- First fresh-item gate: 181 tests and 61/61 P probes passed; failed because the new machine item omitted variant declarations. Added the actual Field/City rows. Live probe already exercised both across 27 runs each.
- Windows generalization lookup used missing external grep; extracted its behavior for a regression (expected the literal dotted row, received no files), then replaced the dependency with direct filesystem reads. Matching remains literal, and row absence still fails the gate. No exemption was taken.

## Final check receipt

`node tools/gate.mjs v2.week-spine` exited 0: 182 tests passed; all nine claimed ISCs passed; all 61 P-tier probes green, zero regressions; fresh reds matched; Field/City variants live across 27 runs each; typecheck, hardcode, naming and single-engine-door checks passed. No exemptions were taken.

`node tools/build-slice.mjs` rebuilt SLICE.html; `node tools/smoke-slice.mjs SLICE.html` passed the opening/draft, outcome picker and result flow, Field order, same-City repair→buy, quest dispatch and roster. This is programmatic UI verification; human visual acceptance remains separate.

Warnings are retained: candidate older rulings, intentionally superseded V1 test expectations requiring review, and the parent's concurrent uncommitted engine identity regression (engine f1b1ca2). The stage does not claim an unqualified Gauntlet seal. Final landing/bookkeeping hashes and committed checks are owned by the gate ledger, not hand-authored here.

The authoritative 100-kit publication remains unchanged in this stage: 38/100 have fieldable engine unit rows, all 38 field, and all 8/8 current Kingdom hero-pool entries field. Extending the engine roster is separate from this Week migration.
