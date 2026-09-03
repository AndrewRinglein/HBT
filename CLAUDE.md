# The Kingdom — package instructions

The strategic altitude of *Heroes of Blight and Tragic*: the Week, the purse, the
map, Assignments, the Reckoning. A **sibling package to `engine/`, and its own
nested git repository** (ruled 2026-09-01). It imports the engine through one
door and never edits it.

**Read first, in this order:** the root `STATE.md` · the root `CLAUDE.md` (laws,
vocabulary) · `GLOSSARY.md` (the naming authority) · **`THIN-SLICE-IMPLEMENTATION.md`**
(what is true when the slice is done, what command proves each part, and in what
order it gets built — this package exists to close its criteria) ·
`GAME-ARCHITECTURE.md` §1, §2, §4 (the interfaces) · `KINGDOM-DESIGN.md` (the
rules). The engine's Constitution applies here in full — plain data, integers,
named streams, every mutation an event.

---

## Commands — all from `kingdom/`

There is **no install step**. The package runs on `../engine/node_modules`;
`npm test` and `npm run typecheck` point there. Nothing can be installed from the
sandbox; if a binary is missing, Andrew installs it on Windows per
`engine/HANDOFF.md` §0a.

```
node tools/next.mjs                  the next backlog item that is ready
node tools/gate.mjs <id>             the landing gate — check only, changes nothing
node tools/gate.mjs <id> --land      land it, only if every check passes
node tools/gate.mjs <id> --abandon   give up, revert the tree, record why
node tools/report.mjs                landed / abandoned / needs review · the slice count

node tools/slice-gate.mjs                    every P-tier criterion probe; exit 1 on a regression
node tools/slice-gate.mjs --isc 002          one criterion's probe
node tools/slice-gate.mjs --isc 002 --red    demand the probe FAILS now, and record the red
node tools/slice-gate.mjs --count            "N of M closed · K probed · J accepted"
python3 tools/prep-art.py [kingdom-art]      downscale the kingdom art into generated/art/ (Pillow; default ../../Autobattler/kingdom-art)
python3 tools/prep-mock.py [mock]           pull the Load Game mock's banners and faces into generated/art/ (after prep-art)
node tools/mk-items.mjs                      regenerate src/content/generated/items.ts from the codex (+ items-gaps.json)
node tools/build-slice.mjs                   SLICE.html, with generated/art/ inlined
node tools/smoke-slice.mjs SLICE.html        drive the built page headlessly
node tools/slice-gate.mjs --sync             write the count and every State: line into the doc

node tools/scan.mjs only-writer     ISC-014's static scan
npm test        npm run typecheck   (the engine's vitest and tsc)
```

**The gate takes minutes, and the Cowork sandbox kills a tool call at ~3.**
Every claimed probe is a vitest run, and "nothing regresses" runs every P probe
again, then the post-land audit runs them all a third time. From the sandbox,
run a landing detached and poll the log — `nohup node tools/gate.mjs <id> --land
> /tmp/land.log 2>&1 &` — never in the foreground. (Found 2026-09-01: the
reckoning.apply landing was killed after its commit and before its bookkeeping;
the tail was finished by hand and the ledger says so.)

**The gate decides whether an item passed, not you.** Never write `status` into
`.state/backlog.json` or `state` into `.state/isc.json` by hand.

## The loop — one criterion at a time

```
1.  node tools/next.mjs                       read the item: spec, expect, which ISCs it closes
2.  write the probe(s) — test/isc-NNN.test.ts, one per criterion
3.  node tools/slice-gate.mjs --isc NNN --red  the probe must FAIL before the feature exists
4.  implement — src/core for mechanisms, src/content for rows, src/engine.ts is the only engine import
5.  node tools/gate.mjs <id>                   check only
6.  FAIL?  fix, go to 5.  Max 4 attempts, then --abandon and say so.
7.  PASS?  node tools/gate.mjs <id> --land     commits, closes the ISCs, syncs the doc
```

A probe edited after its red must be seen red again (stash `src/`, `--red`, pop).
Where the criterion's block carries `Disable:`, the red is re-proven live through
`KINGDOM_DISABLE_IDS` — the kingdom's copy of the engine's kill-switch seam.

## Where things live

```
src/engine.ts    the ONE door to ../engine/src — nothing else imports an engine path
src/core         mechanisms. Names no content instance; may name an event (src/core/events.ts)
src/content      rows and registries — Stages, currencies, Territories, buildings, payouts
test/            isc-NNN.test.ts probes, plus ordinary unit tests
tools/           the gate, the ISC instrument, the scans, (later) the run and the probe
.state/          backlog.json · isc.json · ledger.md · gauntlet-log.jsonl
```

## Never

- Never edit `../engine/src`. A gap goes to `CONTENT-GAPS.md` or the engine's
  backlog, through the engine's own gate.
- Never invent a name. `GLOSSARY.md` decides; a new *kind* is Andrew's call.
- Never weaken an assertion to pass the gate (Law 10). A failing test is a finding.
- Never decide an ambiguity — write it into `SWITCHES.md` here (created with the
  first switch, declared in `DOCS.md` the same commit) with its question and default.
- Never make a dated backup copy of anything. This is a git repository.
