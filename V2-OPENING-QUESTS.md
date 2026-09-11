# V2 opening quests stage

Owner: Kingdom. Authority: root KINGDOM-V2-2026-09-07.md sections 2.3 and 4.4 and 2026-09-10 user rulings. Fresh backlog item: v2.opening-quests. Historical quest and Week-spine verdicts remain unchanged. SWITCHES.md records encounter tuning, surviving combat XP versus fixed quest XP, unique rescued instances, paid-recruit cap exception, report acknowledgment and serial order.

Implemented scope: Rescue a Civilian and Recover Supplies before the retained Escort; explicit lead and escort staffing; saved run/outcome ownership; due Field report/battle continuation; fixed-party prep; outcome-picker combat; exactly-once authored payout; independent civilian instances with template portraits; serialized quest recap and separate quest reward receipt; report-earned levels; duplicate Reckoning hero rejection.

The same quest functions serve UI and autoplay. Only applyBattleResult consumes a combat result. Hero availability remains centralized. No engine/content/root source is changed, apart from the parent-authorized ISC-047 Truth/Disable block. The published item/kit/progress outputs are unchanged. The existing pool has three eligible civilian templates; all 8 current Kingdom pool entries field, while broader publication remains 38 fieldable engine rows out of 100 published kits.

## Probe history

- Initial 23-case ISC-047 run against pre-stage implementation: 18 failed, 5 pre-existing availability refusals passed. The failures include absent authored quests, staffing, deterministic outcomes, fixed rewards, unique rescue, fixed-party combat, reload and duplicate Reckoning XP application. Machine report: scratch/v2-quests-red.json (ignored local evidence); ISC instrument recorded red.
- First core implementation: 23/23 passed.
- Deeper checkpoint: 25 passed, 7 failed. Six corrupt-save cases were accepted and a reloaded recap lost XP/displayed no separate quest reward. Added structural/ownership validation and saved recap receipt.
- Independent parent review found caller-supplied engagement.kind could bypass quest ownership. Its additional red failed before repair (25 passed, 8 failed checkpoint). Resolution now finds the pending/cursor ownership independently of supplied kind; relabeling cannot reach mutations.
- Report-earned level presentation: 34 passed, 1 failed because a quest report entered the old battle-only level screen and showed Defeat/nobody deployed. It now shows eligible heroes and Experience earned. Serial report then battle, retreat and dead-lead cases already passed at their respective checkpoints.
- Two old Week-spine assertions failed at the expected automatic-report checkpoint. They now explicitly acknowledge the saved report and retain the same no-premature-release/no-double-payout assertions. Escort duration/Faith/exclusivity are preserved.
- Final focused set: 35 ISC-047 cases; 50 cases including Week-spine and after-battle UI. Full Kingdom suite: 214 passed, zero failed. Typecheck, one-writer and one-availability scans pass. Live kill-switch red refreshed against the final ISC-047 probe.
- Both declared variants are live across 27 simulated runs each. Probe harness uses real dispatched quests for fixed-roster encounters instead of fabricating unowned quest engagements.

## UI verification and remaining boundaries

Built SLICE.html and the non-browser fake-DOM smoke pass: existing opening/outcome-picker/reward flow, Field/City ordering, same-City repair and purchase, retained Escort dispatch, plus Rescue dispatch through the due report, save/reload, acknowledgment, unique reward and return to City. UI read-model tests cover explicit Supplies lead selection and report/level presentation. Combat remains the Kingdom outcome picker as authorized.

Browser visual acceptance is unverified. Parent's CUA attempt was blocked by URL security policy; no alternate browser, HTTP or indirect route was attempted. The fake-DOM smoke does not claim browser or human visual acceptance. Fatigue, expanded recovery/economy/recruitment, other quest outcome kinds and dungeon deferral remain subsequent V2 stages.

Gate and landing results are appended after verification. A passing technical gate is distinct from its warnings, withheld seal and human acceptance.

## Final review repair

The first check gate passed with 214 tests, all 61 P-tier probes, both live variants and no exemptions. It was not landed: independent review found that a malformed serialized rescued-Hero body could grant fixed XP before array copying threw, and an unknown unitType could enter the roster. Four fresh probes were red (35 passed/4 failed); three demonstrated state mutation before failure and the unknown unitType was not rejected. The outcome now saves only a strict instance/template identity pair, materializing the authored civilian at payout. Both loading and direct acknowledgment validate this shape before any write. All 39 ISC-047 cases now pass; final full gate follows this repair, not the earlier green checkpoint.

## Final technical verification

After the rescue-payload repair, `node tools/gate.mjs v2.opening-quests` passes: 218 tests; all 61 P-tier probes green with zero regressions; final ISC-047 red re-proven live with both new quest rows disabled; both authored variants live; typecheck, hardcode, naming and engine-door checks pass against clean engine ebc4cf6. No exemptions. Two warnings remain: older ruling candidates and intentional replacement of the old quest/report assertions. The seal remains withheld for review; this is not human visual acceptance.

Rebuilt SLICE.html; `node tools/smoke-slice.mjs SLICE.html` passes the existing flows plus both new quest controls: Rescue's complete saved-report/payout/reload loop and Supplies lead plus two escorts saved/reloaded exactly. Programmatic verification only; browser visual acceptance remains blocked/unverified as recorded above.

Landing completed as source commit `9d56fcc`, with gate bookkeeping `f683309`. Committed-tree typecheck and all 39 claimed ISC-047 cases passed; ISC-047 closed at the source commit. Final full landing suite: 218 passed; 61/61 P probes; two review warnings, no exemptions. The 36 pre-existing backlog records remain unchanged. After landing, SLICE.html was rebuilt with the landed bookkeeping version and the complete fake-DOM smoke passed again. Its source matches the verified quest stage; human/browser visual acceptance remains unverified.
