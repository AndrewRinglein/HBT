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
