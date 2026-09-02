# Kingdom ledger

The landing record. `tools/gate.mjs` appends one section per landing, abandonment
or reverted landing, with every check's verdict verbatim; `tools/slice-gate.mjs`
keeps the criteria's state in `isc.json` beside this file. Nothing here is written
by hand below this line.

## the gate — committed by hand, 2026-09-01

The gate cannot gate itself. The first commit carries the package skeleton
(`package.json`, `tsconfig.json`, `.gitignore`, `CLAUDE.md`), the tools
(`gate.mjs`, `slice-gate.mjs`, `next.mjs`, `report.mjs`, `scan.mjs`), the event
vocabulary (`src/core/events.ts`) and this state directory with the nine-item
backlog. Everything after it lands through `node tools/gate.mjs <id> --land`.

## seam.run-engagement — LANDED `0f1db1a` **NEEDS REVIEW**
2026-09-02 03:42 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../CODEX.md:3257 · ../CODEX.md:944
  PASS  typecheck
  PASS  full test suite
  PASS  gate 1 — every claimed criterion holds — ISC-002 holds · ISC-003 holds
  PASS  brought its own tests — test/isc-002.test.ts, test/isc-003.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-002: red on record (2026-09-02 03:38 @ 1446df6, probe 5d7eec2b9fc4) · ISC-003: red on record (2026-09-02 03:40 @ 1446df6, probe e8da485534d8)
  PASS  nothing regresses — every P-tier probe — 3 P-tier probe(s): 2 green, 1 red, 0 regression(s). 0 of 25 closed · 3 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-002: CLOSED at 0f1db1a · ISC-003: CLOSED at 0f1db1a
slice: 2 of 25 closed · 3 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

## correction — 2026-09-01, by hand

The landing above was recorded as `3f9904b`; that sha was then amended away by
the gate's own bookkeeping step and never existed in history. The landing is
`0f1db1a` (seam + bookkeeping in one commit, as the amend left it). Every
reference in this directory was corrected to `0f1db1a`, and the gate now makes
its bookkeeping a second commit so a recorded sha is always one you can check out.

## campaign.state — LANDED `fb04ddf` **NEEDS REVIEW**
2026-09-02 04:02 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · COMBAT-FRAMEWORK.md:147
  PASS  typecheck
  PASS  full test suite
  PASS  gate 1 — every claimed criterion holds — ISC-004 holds
  PASS  brought its own tests — test/isc-004.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-004: red on record (2026-09-02 04:01 @ 443d2b4, probe fb6132dc7ee3)
  PASS  nothing regresses — every P-tier probe — 4 P-tier probe(s): 3 green, 1 red, 0 regression(s). 2 of 33 closed · 4 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  WARN  naming — no banned words invented — 'round' — say Turn — will land FLAGGED
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-004: CLOSED at fb04ddf
slice: 3 of 33 closed · 4 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 3 FLAG(S) WARNED
