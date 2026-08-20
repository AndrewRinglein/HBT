---
name: visual-replay
description: Run a visual test of The Combat Framework — export a real battle, build the replay page with tokens and VFX, verify every new mechanic is visible on screen, and land the work as a Game Builder batch. Use when asked for a visual test, a replay, a simulation you can watch, or after landing mechanics that should be seen moving.
---

# Visual replay — watching the engine

A replay is **a seed, not a recording**. The page replays the battle from the
event log alone — if the log cannot show a mechanic, neither can any renderer,
and that is a finding about the LOG, not the viewer.

## The rig — three committed pieces + one fresh battle

```
tools/replay/prefix.html   page shell + hexVFX, verbatim       (never edit casually)
tools/replay/static.json   geometry, terrain table, tokens, art (add tokens here)
tools/replay/app.js        the viewer application               (THE file for new events)
tools/build-replay.mjs     assembles the four into one page
tools/export-battle.mts    runs a real battle, emits the log + engine commit
```

## The procedure

1. **Commit first.** The page's header shows the engine commit; exporting from a
   dirty tree makes the header a lie (README-REPLAY.md learned this the hard way).
2. **Scan for a seed that SHOWS the work.** Export a spread of replicates and
   count the events you need on screen:
   ```
   npx tsx tools/export-battle.mts <r> map.thicket 8 > /tmp/b.json
   ```
   Score by what this batch built — sear applications, heal.applied, water strips,
   resisted ticks. Rare events (AI avoids water) need a wide scan; if 100 seeds
   never show it, that is a finding about the AI, not bad luck.
3. **Teach the viewer anything new** — in `app.js`, four tables and one pump:
   - `DUR` — the event's screen time. An event with no entry plays at 0ms.
   - `STCOL` — roster pip colour per status id.
   - `STVFX` — engine status id → hexVFX style name (`regeneration` → `regen`;
     an unmapped name silently falls back to poison-green).
   - `buildLog()` — the log line. Every new event type gets a human sentence.
   - `apply()` — the pump: what moves, shakes, pops and plays when the event fires.
   New unit type? Its token MUST be in `static.json` or the unit is INVISIBLE —
   the draw loop skips unknown typeIds entirely. Reuse art + a runtime overlay
   (ember ring pattern) when the identity is behavioural.
4. **Build and verify with your eyes AND the DOM:**
   ```
   node tools/build-replay.mjs /tmp/b.json ../replay.html
   ```
   The log is built up-front, so `#log` textContent contains every line without
   playing — grep it for each new mechanic's sentence. Then screenshot start /
   mid / late with playwright and LOOK: pips, rings, pops, no invisible units.
5. **Land it through the gate** so it appears in the Game Builder:
   - tests live in `test/replay.test.ts` — the export runs the REAL engine in a
     child, so the kill-switch seam genuinely breaks them.
   - one item, one commit. Building two items' work before landing either sweeps
     both into the first commit and the second arrives empty-handed at
     "brought its own tests" (this happened; see viewer.replay-publish).
6. **Close the batch with its name:**
   ```
   node tools/audit-all.mjs --label "visual replay test"
   ```
   The label becomes the Game Builder bar's title.
7. **Ship** `replay.html` to the project root (beside README-REPLAY.md) and
   update that README's battle line.

## Traps already paid for

- The builder is deterministic and embeds NO timestamp — provenance is the
  engine commit, nothing else. Keep it that way; the byte-identity test guards it.
- `DUR` is the whole timing model. The engine has no idea this file exists.
- Terrain the engine models is the terrain the art shows — on map.thicket the
  water on screen is the water in the rules. Do not demo on a map whose art
  disagrees with the mechanics you're showing.
