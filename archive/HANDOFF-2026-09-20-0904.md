# engine — handoff 2026-09-20 09:04

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next unit.archer, 153 of 186 landed · 57 await review · 13 sealed · 33 pending
Now: plumbing.gate-recovery — V2 R0. Tried: Codex's six files + three Law-10 test edits (effect-arm fixture is a real git repo; dazed-split 30 s and additions 120 s budgets) pass every gate on Angela's machine twice; two --land runs failed only on those timing budgets, since fixed. The Cowork shell of the 2026-09-04 chat is capped at 178 s per call, so the gate cannot run there. Next: from the engine folder run node tools/gate.mjs plumbing.gate-recovery --land && node tools/audit-all.mjs; the nine pending files are parked in ../.scratch-r0-pending/ (copy them back over engine/ first — the wrap could not commit them without bypassing the gate). Then Codex's aoo-step-facts worktree item, then R1 shields.
New chat with Heroes of Blight and Tragic + GBH — engine: copy .scratch-r0-pending back, land R0 on Angela's machine, then aoo-step-facts, then R1 shields
  start engine
Last landing: 2026-09-18 16:57 (rule.block). Previous chat ended: on a wrap, 2026-09-20 09:04
WRAP NOT COMMITTED: 2026-09-20 09:04 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: plumbing.gate-recovery — V2 R0. Tried: Codex's six files + three Law-10 test edits (effect-arm fixture is a real git repo; dazed-split 30 s and additions 120 s budgets) pass every gate on Angela's machine twice; two --land runs failed only on those timing budgets, since fixed. The Cowork shell of the 2026-09-04 chat is capped at 178 s per call, so the gate cannot run there. Next: from the engine folder run node tools/gate.mjs plumbing.gate-recovery --land && node tools/audit-all.mjs; the nine pending files are parked in ../.scratch-r0-pending/ (copy them back over engine/ first — the wrap could not commit them without bypassing the gate). Then Codex's aoo-step-facts worktree item, then R1 shields."
Yours: 57 flagged landing(s) await your verdict — look: GAME-BUILDER.html; node tools/review.mjs movement.zone-of-control --ok "<your words>" (--all for the queue); (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: unit.archer [unit · data], then unit.brute [unit · data], then ability.warrior.rally [ability · modifier] (+23 more)
Delegate: unit.archer [unit · data] — not yet gated; unit.brute [unit · data] — not yet gated; ability.warrior.rally [ability · modifier] — not yet gated; ability.ranger.volley [ability · data] — not yet gated; terrain.impassable-naming [naming · decision] — not yet gated; trigger.zombie.sap [content · trigger] — not yet gated; trigger.mage.kindle [content · trigger] — not yet gated; station.vs-target [engine · station] — not yet gated; move.actions [engine · rule] — not yet gated; fix.start-of-turn-victory [engine · plumbing] — not yet gated; fix.outcome-enum [engine · plumbing] — not yet gated; fix.phase-ladder-config [engine · plumbing] — not yet gated; fix.retired-stations [engine · plumbing] — not yet gated; crit.branch-and-injuries [engine · rule] — not yet gated; hook.on-enter [engine · plumbing] — not yet gated; tool.effect-size-rules [engine · plumbing] — not yet gated; viewer.hexvfx-path [engine · plumbing] — not yet gated; viewer.geometry [engine · plumbing] — 1 attempt(s); content.art-manifest [content · data] — not yet gated; viewer.styles [engine · plumbing] — not yet gated; sim.coverage [engine · plumbing] — not yet gated; seam.unit-mods [engine · plumbing] — not yet gated; seam.spare-weapons [engine · plumbing] — not yet gated; pack.derived-rows [content · data] — not yet gated; system.ai-modes [station · rule] — not yet gated; plumbing.gate-recovery [plumbing · plumbing] — 2 attempt(s)
Blocked: content.mage-staff needs unit.brute; viewer.build needs viewer.geometry, content.art-manifest; viewer.board needs viewer.build, viewer.geometry; viewer.tile-state needs viewer.board; viewer.panel needs viewer.build; viewer.pump needs viewer.board, viewer.panel; viewer.log-transport needs viewer.pump
Calls since last wrap: none
Stack for unit.archer:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming, post-land audit
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits (last 20; no committed wrap on record)

- e63e703 2026-09-18 10:00 Record audited Block landing and preserved recovery evidence
- efa87d1 2026-09-18 09:55 rule.block: V2 section6: independent Block/Ranged Block stats, first incoming-hit di
- 22c8c79 2026-09-17 16:56 Record audited measurement integrity and preserved historical verdicts
- c374358 2026-09-17 16:52 plumbing.measurement-integrity: Validate complete authored action profiles and item grants before experi
- 37b6ffd 2026-09-17 16:40 Distinguish initial burst plan from audited completion
- 5c00972 2026-09-17 16:39 Record clean burst and diagnostic batch audit with withheld seals
- 8df994a 2026-09-17 16:36 plumbing.command-diagnostics: Failed gate and independent audit test commands retain exact stdout, std
- 63701bc 2026-09-17 16:33 Record burst landing and unresolved periodic audit evidence
- 0c6fa07 2026-09-17 16:25 rule.bursts: V2 sections 4/7/15/18: hex-targeted bursts replace legacy arc/blast atta
- cfbcac4 2026-09-16 03:08 Record packet landing audit and measured limitations
- 1b4e623 2026-09-16 03:05 rule.damage-packets: V2 sections 8/15/18: each successful attack resolves its base packet the
- 6bb36dc 2026-09-16 02:24 Finalize elemental batch receipt current status
- bd82b94 2026-09-16 02:21 Record independent elemental and Protection batch audit
- b0245d3 2026-09-16 02:19 Record universal Protection landing and gate warnings
- 9d969c5 2026-09-16 02:17 rule.protection-universal: V2 section18: Protection absorbs all typed HP damage before defense, inc
- eb29f67 2026-09-16 02:12 Record elemental gate result and withheld seal
- 07964e6 2026-09-16 02:11 rule.elemental-resists: COMBAT-V2-DESIGN sections 8/18: six typed flat damage defenses across di
- 1723e63 2026-09-16 01:37 Record contact and activation selection batch audit
- 637b195 2026-09-16 01:35 plumbing.activation-choice: Trusted stable-UID human control policy can pause before beginActivation
- 8e0fdbc 2026-09-16 01:24 Record verified melee contact landing

## Next chat

New chat with Heroes of Blight and Tragic + GBH — engine: copy .scratch-r0-pending back, land R0 on Angela's machine, then aoo-step-facts, then R1 shields
```
start engine
```
